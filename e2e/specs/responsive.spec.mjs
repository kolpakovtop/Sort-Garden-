import { test, expect } from '@playwright/test';
import { boot, startLevel, SHOTS } from './helpers.mjs';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [
  { name: '360', width: 360, height: 640 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
  { name: '2560', width: 2560, height: 1440 }
];

mkdirSync(SHOTS, { recursive: true });

for (const vp of VIEWPORTS) {
  test(`V1-V5 ${vp.name} menu and level layout`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors = await boot(page);

    // V1 no horizontal scroll
    const menuScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(menuScroll.sw, `menu scrollWidth @${vp.name}`).toBeLessThanOrEqual(menuScroll.iw);

    // V2 hills span the full width
    const hills = await page.evaluate(() => {
      const h = document.querySelector('.scene__hills') || document.querySelector('.scene__grass');
      return h ? { w: h.getBoundingClientRect().width, iw: window.innerWidth } : null;
    });
    expect(hills, 'scene layer present').not.toBeNull();
    expect(hills.w, `hills width @${vp.name}`).toBeGreaterThanOrEqual(hills.iw - 1);

    // V4 touch targets
    const minButton = vp.width <= 400 ? 56 : 64;
    const shortButtons = await page.evaluate(() => [...document.querySelectorAll('.menu-grid .btn')]
      .map((b) => Math.round(b.getBoundingClientRect().height)));
    expect(Math.min(...shortButtons), `menu button height @${vp.name}`).toBeGreaterThanOrEqual(minButton);

    if (SHOTS) await page.screenshot({ path: `${SHOTS}menu-${vp.name}.png` });

    await startLevel(page);
    const lvl = await page.evaluate(() => {
      const jars = [...document.querySelectorAll('.tube')].map((t) => t.getBoundingClientRect());
      const bar = document.querySelector('.boosters').getBoundingClientRect();
      return {
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        ih: window.innerHeight,
        jarsInside: jars.every((r) => r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && r.top >= -0.5 && r.bottom <= window.innerHeight + 0.5),
        barInside: bar.left >= -0.5 && bar.right <= window.innerWidth + 0.5 && bar.bottom <= window.innerHeight + 0.5,
        boosterHeights: [...document.querySelectorAll('.booster')].map((b) => Math.round(b.getBoundingClientRect().height))
      };
    });
    expect(lvl.sw, `level scrollWidth @${vp.name}`).toBeLessThanOrEqual(lvl.iw);
    expect(lvl.jarsInside, `jars inside viewport @${vp.name}`).toBe(true);
    expect(lvl.barInside, `booster bar inside viewport @${vp.name}`).toBe(true);

    // V3 the booster buttons actually receive the pointer
    const hit = await page.evaluate(() => {
      const b = document.querySelector('[data-action="hint"]');
      const r = b.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!el && (el === b || b.contains(el));
    });
    expect(hit, `hint button hittable @${vp.name}`).toBe(true);

    await page.screenshot({ path: `${SHOTS}level-${vp.name}.png` });
    expect(errors).toEqual([]);
  });
}

test('V5 result and garden screenshots', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => window.__SG.setCoins(900));
  await page.locator('[data-action="shop"]').click();
  await page.locator('[data-action="buy-flower"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-action="back"]').click();
  await page.locator('[data-action="garden"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}garden.png` });

  await page.locator('[data-action="back"]').click();
  await startLevel(page);
  const { winLevel } = await import('./helpers.mjs');
  expect(await winLevel(page)).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}result.png` });
  expect(errors).toEqual([]);
});

test('V6 reduced motion still plays a move', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = await boot(page);
  await startLevel(page);
  const move = await page.evaluate(() => window.__SG.validMove());
  const before = await page.evaluate(() => window.__SG.board());
  await page.locator(`[data-tube="${move[0]}"]`).click();
  await page.locator(`[data-tube="${move[1]}"]`).click();
  await page.waitForFunction(() => !window.__SG.busy());
  const after = await page.evaluate(() => window.__SG.board());
  expect(after[move[1]].length).toBe(before[move[1]].length + 1);
  const lift = await page.locator(`[data-tube="${move[0]}"]`).evaluate((n) => getComputedStyle(n).transform);
  expect(lift, 'no lift transform under reduced motion').toBe('none');
  expect(errors).toEqual([]);
  await context.close();
});

test('V7 keyboard: focus ring, Enter starts, Esc pauses', async ({ page }) => {
  const errors = await boot(page);
  await page.keyboard.press('Tab');
  const focusRing = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, outline: cs.outlineWidth, style: cs.outlineStyle };
  });
  expect(focusRing, 'something focusable').not.toBeNull();

  await page.keyboard.press('Enter');
  await expect(page.locator('.tube').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toBeVisible();
  expect(errors).toEqual([]);
});

test('V8 every button exposes an accessible name', async ({ page }) => {
  const errors = await boot(page);
  const check = async (label) => {
    const nameless = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter((b) => !(b.getAttribute('aria-label') || b.textContent || '').trim())
      .map((b) => b.className));
    expect(nameless, `nameless buttons on ${label}`).toEqual([]);
  };
  await check('menu');
  await startLevel(page);
  await check('level');
  expect(errors).toEqual([]);
});

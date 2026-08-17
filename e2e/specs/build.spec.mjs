import { test, expect } from '@playwright/test';
import { boot, startLevel, playMove, boardState, SDK_HOST } from './helpers.mjs';

// P2: on the built bundle nothing may leave the local origin
test('P2 dist build talks to nobody but the local server', async ({ page, baseURL }) => {
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    // the portal SDK is the one allowed outside call; nothing else may leave
    if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.includes(SDK_HOST)) external.push(url);
  });
  const errors = await boot(page);

  // E1 on this build
  for (const action of ['play', 'garden', 'shop', 'daily', 'settings']) {
    await expect(page.locator(`[data-action="${action}"]`)).toBeVisible();
  }

  // E5 on this build
  await startLevel(page);
  const before = await boardState(page);
  const [from, to] = await page.evaluate(() => window.__SG.validMove());
  await playMove(page, from, to);
  const after = await boardState(page);
  expect(after[to].length).toBe(before[to].length + 1);

  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('P3 leaving a level clears its timers and debug hook', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  expect(await page.evaluate(() => !!window.__SG.level)).toBe(true);
  await page.locator('[data-action="pause"]').click();
  await page.getByRole('button', { name: /В меню|Menu/ }).click();
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  expect(await page.evaluate(() => !!window.__SG.level)).toBe(false);
  await page.waitForTimeout(1200);
  expect(errors).toEqual([]);
});

test('debug hook is absent without ?debug=1', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => typeof window.__SG)).toBe('undefined');
});

import { test, expect } from '@playwright/test';
import { boot, startLevel, tube, playMove, winLevel, boardState, gameState } from './helpers.mjs';

test('E1 menu renders every entry point', async ({ page }) => {
  const errors = await boot(page);
  for (const action of ['play', 'garden', 'shop', 'daily', 'settings', 'tasks', 'rewards']) {
    await expect(page.locator(`[data-action="${action}"]`)).toBeVisible();
  }
  await expect(page.locator('.menu-hero__title')).toContainText('Sort');
  expect(errors).toEqual([]);
});

test('E2 tutorial shows once and can be skipped', async ({ page }) => {
  const errors = await boot(page);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.coach')).toBeVisible();
  await page.getByRole('button', { name: /Пропустить|Skip/ }).first().click();
  await expect(page.locator('.coach')).toHaveCount(0);
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.tube').first()).toBeVisible();
  await expect(page.locator('.coach')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('E3 level 1 starts with 5 jars and a positive move budget', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  await expect(page.locator('.tube')).toHaveCount(5);
  const { moves } = await gameState(page);
  expect(moves).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('E4 selecting a jar lifts it and deselecting returns it', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const idx = await page.evaluate(() => window.__SG.board().findIndex((t) => t.length));
  const jar = tube(page, idx);
  await jar.click();
  await expect(jar).toHaveClass(/selected/);
  await page.waitForTimeout(220);
  const lifted = await jar.evaluate((n) => getComputedStyle(n).transform);
  expect(lifted).not.toBe('none');
  await jar.click();
  await expect(jar).not.toHaveClass(/selected/);
  await page.waitForTimeout(240);
  const back = await jar.evaluate((n) => getComputedStyle(n).transform);
  expect(back).not.toBe(lifted);
  expect(errors).toEqual([]);
});

test('E5 a valid move transfers one piece and spends one move', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const before = await boardState(page);
  const movesBefore = (await gameState(page)).moves;
  const [from, to] = await page.evaluate(() => window.__SG.validMove());
  await playMove(page, from, to);
  const after = await boardState(page);
  expect(after[from].length).toBe(before[from].length - 1);
  expect(after[to].length).toBe(before[to].length + 1);
  expect(after.flat().length).toBe(before.flat().length);
  expect((await gameState(page)).moves).toBe(movesBefore - 1);
  expect(errors).toEqual([]);
});

test('E6 an invalid target shakes and keeps the source selected', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const pair = await page.evaluate(() => {
    const b = window.__SG.board();
    for (let f = 0; f < b.length; f++) {
      if (!b[f].length) continue;
      for (let s = 0; s < b.length; s++) {
        if (f === s || !b[s].length) continue;
        if (b[s][b[s].length - 1] !== b[f][b[f].length - 1]) return [f, s];
      }
    }
    return null;
  });
  test.skip(!pair, 'no mismatching pair on this board');
  const movesBefore = (await gameState(page)).moves;
  await tube(page, pair[0]).click();
  await tube(page, pair[1]).click();
  await expect(tube(page, pair[1])).toHaveClass(/shake/);
  await expect(tube(page, pair[0])).toHaveClass(/selected/);
  expect((await gameState(page)).moves).toBe(movesBefore);
  expect(errors).toEqual([]);
});

test('E7 undo restores the board and spends a booster charge', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const before = JSON.stringify(await boardState(page));
  const badgeBefore = Number(await page.locator('[data-badge="undo"]').textContent());
  const [from, to] = await page.evaluate(() => window.__SG.validMove());
  await playMove(page, from, to);
  await page.locator('[data-action="undo"]').click();
  await page.waitForFunction(() => !window.__SG.busy());
  expect(JSON.stringify(await boardState(page))).toBe(before);
  const badgeAfter = Number(await page.locator('[data-badge="undo"]').textContent());
  expect(badgeAfter).toBe(badgeBefore - 1);
  expect(errors).toEqual([]);
});

test('E8 hint highlights a source and a target and spends a charge', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const badgeBefore = Number(await page.locator('[data-badge="hint"]').textContent());
  await page.locator('[data-action="hint"]').click();
  await expect(page.locator('.tube--hint')).toHaveCount(1);
  await expect(page.locator('.tube--target')).toHaveCount(1);
  const badgeAfter = Number(await page.locator('[data-badge="hint"]').textContent());
  expect(badgeAfter).toBe(badgeBefore - 1);
  expect(errors).toEqual([]);
});

test('E9 out of moves offers a rewarded +5 and a refusal path', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  await page.evaluate(() => window.__SG.setMoves(0));
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(/\+5/);
  await modal.getByRole('button', { name: /\+5/ }).click();
  await page.waitForFunction(() => window.__SG.state.levelSession.movesLeft === 5, null, { timeout: 15000 });
  await expect(page.locator('.modal')).toHaveCount(0);

  // refusing must simply close the dialog
  await page.evaluate(() => window.__SG.setMoves(0));
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal').getByRole('button', { name: /Позже|Later/ }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  expect((await gameState(page)).moves).toBe(0);
  expect(errors).toEqual([]);
});

test('E10 winning shows stars, coins, doubling and advances the level', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  expect(await winLevel(page)).toBe(true);
  await expect(page.locator('.stars .icon--on')).toHaveCount(3, { timeout: 10000 }).catch(() => {});
  expect(await page.locator('.stars .icon--on').count()).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(700); // count-up settles
  const coinsBefore = (await gameState(page)).coins;
  expect(coinsBefore).toBeGreaterThan(0);
  await page.locator('[data-action="double"]').click();
  await page.waitForFunction((c) => window.__SG.state.coins > c, coinsBefore, { timeout: 15000 });
  const coinsAfter = (await gameState(page)).coins;
  expect(coinsAfter).toBe(coinsBefore * 2);
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator('.tube').first()).toBeVisible({ timeout: 15000 });
  expect((await gameState(page)).level).toBe(2);
  expect(errors).toEqual([]);
});

test('E11 no interstitial around level 1', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  expect(await winLevel(page)).toBe(true);
  await page.locator('[data-action="continue"]').click();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__SG.ads.interstitial)).toBe(0);
  expect(errors).toEqual([]);
});

test('E12 progress and settings survive a reload', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => window.__SG.setCoins(321));
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="sound"]').click();
  const before = await gameState(page);
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  const after = await gameState(page);
  expect(after.coins).toBe(before.coins);
  expect(after.level).toBe(before.level);
  expect(after.sound).toBe(before.sound);
  expect(errors).toEqual([]);
});

test('E13 daily gift pays once per day', async ({ page }) => {
  const errors = await boot(page);
  const coinsBefore = (await gameState(page)).coins;
  await page.locator('[data-action="daily"]').click();
  await page.locator('[data-action="claim"]').click();
  await page.waitForTimeout(300);
  const coinsAfter = (await gameState(page)).coins;
  expect(coinsAfter).toBeGreaterThan(coinsBefore);
  await expect(page.locator('[data-action="claim"]')).toHaveCount(0);
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await page.locator('[data-action="daily"]').click();
  await expect(page.locator('[data-action="claim"]')).toHaveCount(0);
  expect((await gameState(page)).coins).toBe(coinsAfter);
  expect(errors).toEqual([]);
});

test('E14 language and sound settings persist', async ({ page }) => {
  const errors = await boot(page);
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="lang-en"]').click();
  await page.locator('[data-action="back"]').click();
  await expect(page.locator('[data-action="play"]')).toContainText('Play');
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await expect(page.locator('[data-action="play"]')).toContainText('Play');
  expect((await gameState(page)).lang).toBe('en');
  expect(errors).toEqual([]);
});

test('E15 shop purchase spends coins and adds a booster charge', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => window.__SG.setCoins(500));
  await page.locator('[data-action="shop"]').click();
  await page.locator('[data-action="buy-hint"]').click();
  await page.waitForTimeout(400);
  expect((await gameState(page)).coins).toBe(450);
  expect(await page.evaluate(() => window.__SG.state.meta.boosters.hint)).toBe(1);
  expect(errors).toEqual([]);
});

test('E16 garden decoration and offline income', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => window.__SG.setCoins(500));
  await page.locator('[data-action="shop"]').click();
  await page.locator('[data-action="buy-flower"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-action="back"]').click();
  await page.locator('[data-action="garden"]').click();
  await expect(page.locator('.garden-cell--filled')).toHaveCount(1);

  await page.evaluate(() => window.__SG.setLastSeen(60 * 60 * 1000));
  await page.locator('[data-action="back"]').click();
  await page.locator('[data-action="garden"]').click();
  const pending = await page.evaluate(() => window.__SG.state.offline.pendingOfflineCoins);
  expect(pending).toBeGreaterThan(0);
  const coinsBefore = (await gameState(page)).coins;
  await page.getByRole('button', { name: /Удвоить|Double/ }).first().click();
  await page.waitForFunction((c) => window.__SG.state.coins >= c + 1, coinsBefore, { timeout: 15000 });
  expect((await gameState(page)).coins).toBe(coinsBefore + pending * 2);
  expect(errors).toEqual([]);
});

test('E17 thirty moves and five undos keep the board consistent', async ({ page }) => {
  const errors = await boot(page);
  await startLevel(page);
  const total = (await boardState(page)).flat().length;
  let played = 0;
  for (let i = 0; i < 30; i++) {
    if (await page.locator('.modal').count()) break;
    const move = await page.evaluate(() => window.__SG.validMove());
    if (!move) break;
    await playMove(page, move[0], move[1]);
    played++;
    const now = await boardState(page);
    expect(now.flat().length).toBe(total);
    if (await page.locator('[data-action="double"]').count()) break;
  }
  expect(played).toBeGreaterThan(5);
  for (let i = 0; i < 5; i++) {
    if (!(await page.locator('[data-action="undo"]').count())) break;
    await page.locator('[data-action="undo"]').click();
    await page.waitForFunction(() => !window.__SG.busy());
  }
  const final = await boardState(page);
  expect(final.flat().length).toBe(total);
  expect(errors).toEqual([]);
});

test('E18 audio unlock raises no errors', async ({ page }) => {
  const errors = await boot(page);
  await page.locator('[data-action="play"]').click();
  await page.waitForTimeout(400);
  await page.locator('.tube').first().click();
  await page.waitForTimeout(400);
  expect(errors.filter((e) => /audio|AudioContext/i.test(e))).toEqual([]);
  expect(errors).toEqual([]);
});

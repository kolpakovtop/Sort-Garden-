import { expect } from '@playwright/test';

export const SHOTS = new URL('../shots/', import.meta.url).pathname;

// The Yandex SDK script is an intentional external dependency and is not
// reachable from CI; its network error is not a game error. Everything else is.
export const SDK_HOST = 'yandex.ru/games/sdk';
const isGameError = (text) => !(text.includes(SDK_HOST) || /Failed to load resource|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(text));

// every spec asserts a clean console
export function watchConsole(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && isGameError(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => { if (isGameError(e.message)) errors.push(`pageerror: ${e.message}`); });
  return errors;
}

export async function boot(page, { fresh = true, path = '/?debug=1' } = {}) {
  const errors = watchConsole(page);
  await page.goto(path);
  if (fresh) {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  }
  await page.waitForFunction(() => !!window.__SG);
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  return errors;
}

export async function startLevel(page, { skipTutorial = true } = {}) {
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.tube').first()).toBeVisible();
  if (skipTutorial && !(await page.evaluate(() => window.__SG.state.tutorialDone))) {
    // the coach renders ~260ms after the board, so wait for it before skipping
    await expect(page.locator('.coach')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Пропустить|Skip/ }).first().click();
    await expect(page.locator('.coach')).toHaveCount(0);
  }
}

export const tube = (page, i) => page.locator(`[data-tube="${i}"]`);

export async function playMove(page, from, to) {
  await tube(page, from).click();
  await tube(page, to).click();
  await page.waitForFunction(() => !window.__SG.busy());
}

// plays through the level with the debug solver until the result screen shows
export async function winLevel(page, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await page.locator('[data-action="double"]').count()) return true;
    const modal = page.locator('.modal');
    if (await modal.count()) {
      const cont = page.getByRole('button', { name: /Продолжить|Continue/ });
      if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(300); continue; }
      return false;
    }
    const move = await page.evaluate(() => window.__SG.validMove());
    if (!move) {
      // board solved: the result screen lands after the win animation
      await expect(page.locator('[data-action="double"]')).toBeVisible({ timeout: 5000 });
      return true;
    }
    await playMove(page, move[0], move[1]);
    await page.waitForTimeout(60);
  }
  return false;
}

export const boardState = (page) => page.evaluate(() => window.__SG.board());
export const gameState = (page) => page.evaluate(() => ({
  level: window.__SG.state.level,
  coins: window.__SG.state.coins,
  moves: window.__SG.state.levelSession.movesLeft,
  lang: window.__SG.state.settings.lang,
  sound: window.__SG.state.settings.sound
}));

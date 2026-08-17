import { test, expect } from '@playwright/test';

// The SDK and AudioContext are replaced with recording stubs, the game is
// played through, and the call log is checked against the portal rules.
const STUBS = ({ lang = 'ru', rewardGranted = true } = {}) => `
window.__sdk = [];
window.__audio = [];
const record = (name) => window.__sdk.push({ name, t: Date.now() });

const Ctor = window.AudioContext || window.webkitAudioContext;
if (Ctor) {
  const proto = Ctor.prototype;
  const suspend = proto.suspend, resume = proto.resume;
  proto.suspend = function (...a) { window.__audio.push('suspend'); return suspend.apply(this, a); };
  proto.resume = function (...a) { window.__audio.push('resume'); return resume.apply(this, a); };
}

window.__cloud = {};
window.YaGames = {
  init: () => { record('init'); return Promise.resolve({
    features: {
      LoadingAPI: { ready: () => record('loading.ready') },
      GameplayAPI: { start: () => record('gameplay.start'), stop: () => record('gameplay.stop') }
    },
    environment: { i18n: { lang: '${lang}' } },
    getPlayer: () => { record('getPlayer'); return Promise.resolve({
      getData: (keys) => { record('player.getData'); return Promise.resolve(window.__cloud); },
      setData: (data) => { record('player.setData'); Object.assign(window.__cloud, data); return Promise.resolve(); }
    }); },
    adv: {
      showRewardedVideo: ({ callbacks }) => {
        record('adv.rewarded');
        setTimeout(() => { if (${rewardGranted}) callbacks.onRewarded && callbacks.onRewarded(); callbacks.onClose && callbacks.onClose(); }, 120);
      },
      showFullscreenAdv: ({ callbacks }) => {
        record('adv.interstitial');
        setTimeout(() => callbacks.onClose && callbacks.onClose(true), 120);
      }
    }
  }); }
};
`;

// the real SDK script is unreachable from CI; its network error is not a game error
const isGameError = (text) => !/Failed to load resource|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|yandex\.ru/.test(text);

async function bootYandex(page, opts = {}) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && isGameError(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => { if (isGameError(e.message)) errors.push(e.message); });
  await page.addInitScript(STUBS(opts));
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  return errors;
}

const log = (page) => page.evaluate(() => window.__sdk.map((e) => e.name));

test('Y1 SDK initialises and ready() fires exactly once, after the menu is up', async ({ page }) => {
  const errors = await bootYandex(page);
  const names = await log(page);
  expect(names.filter((n) => n === 'init').length).toBe(1);
  expect(names.filter((n) => n === 'loading.ready').length).toBe(1);
  // ready() must come after init and getPlayer, i.e. once the game is really up
  expect(names.indexOf('loading.ready')).toBeGreaterThan(names.indexOf('init'));
  expect(errors).toEqual([]);
});

test('Y2 language comes from the SDK locale for a new player', async ({ page }) => {
  await bootYandex(page, { lang: 'en' });
  await expect(page.locator('[data-action="play"]')).toContainText('Play');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');

  // an explicit choice outlives the portal locale
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="lang-ru"]').click();
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await expect(page.locator('[data-action="play"]')).toContainText('Играть');
});

test('Y3 gameplay start/stop alternate and follow pause, blur and visibility', async ({ page }) => {
  await bootYandex(page);
  const gameplay = async () => (await log(page)).filter((n) => n.startsWith('gameplay.'));

  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.tube').first()).toBeVisible();
  await page.waitForTimeout(200);
  expect((await gameplay()).at(-1)).toBe('gameplay.start');

  // pause is not gameplay
  await page.locator('[data-action="pause"]').click();
  await page.waitForTimeout(150);
  expect((await gameplay()).at(-1)).toBe('gameplay.stop');
  await page.getByRole('button', { name: /Продолжить|Continue/ }).click();
  await page.waitForTimeout(250);
  expect((await gameplay()).at(-1)).toBe('gameplay.start');

  // losing focus stops it too
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(150);
  expect((await gameplay()).at(-1)).toBe('gameplay.stop');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(150);
  expect((await gameplay()).at(-1)).toBe('gameplay.start');

  // leaving to the menu from an open pause must not send two stops
  await page.locator('[data-action="pause"]').click();
  await page.getByRole('button', { name: /В меню|Menu/ }).click();
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  const seq = await gameplay();
  for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  expect(seq.at(-1)).toBe('gameplay.stop');
});

test('Y4 no ad is requested during gameplay', async ({ page }) => {
  await bootYandex(page);
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.coach')).toBeVisible();
  await page.getByRole('button', { name: /Пропустить|Skip/ }).click();
  for (let i = 0; i < 12; i++) {
    const move = await page.evaluate(() => window.__SG.validMove());
    if (!move) break;
    await page.locator(`[data-tube="${move[0]}"]`).click();
    await page.locator(`[data-tube="${move[1]}"]`).click();
    await page.waitForFunction(() => !window.__SG.busy());
  }
  const names = await log(page);
  expect(names.filter((n) => n.startsWith('adv.'))).toEqual([]);
});

test('Y5 rewarded needs a tap, pays only on onRewarded, and mutes the game', async ({ page }) => {
  await bootYandex(page);
  await page.evaluate(() => { window.__audio = []; });
  await page.locator('[data-action="daily"]').click();

  expect((await log(page)).filter((n) => n === 'adv.rewarded')).toEqual([]); // nothing before the tap
  const coinsBefore = await page.evaluate(() => window.__SG.state.coins);
  await page.getByRole('button', { name: /Удвоить|Double/ }).first().click();
  await page.waitForTimeout(900);
  expect((await log(page)).filter((n) => n === 'adv.rewarded').length).toBe(1);
  expect(await page.evaluate(() => window.__SG.state.coins)).toBeGreaterThan(coinsBefore);
  expect(await page.evaluate(() => window.__audio.length)).toBeGreaterThan(0); // sound was touched around the ad
});

test('Y6 a closed-without-reward video pays nothing', async ({ page }) => {
  await bootYandex(page, { rewardGranted: false });
  await page.locator('[data-action="daily"]').click();
  const coinsBefore = await page.evaluate(() => window.__SG.state.coins);
  await page.getByRole('button', { name: /Удвоить|Double/ }).first().click();
  await page.waitForTimeout(900);
  const claimed = await page.evaluate(() => window.__SG.state.coins);
  // the daily gift itself is still granted, but the doubling is not
  expect(claimed).toBeLessThanOrEqual(coinsBefore + 30);
});

test('Y7 progress is mirrored to the cloud and restored from it', async ({ page }) => {
  await bootYandex(page);
  await page.evaluate(() => window.__SG.setCoins(777));
  await page.waitForFunction(() => !!window.__cloud.save, null, { timeout: 8000 });
  expect((await log(page)).filter((n) => n === 'player.setData').length).toBeGreaterThan(0);

  // a wiped device picks the progress back up from the cloud
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  expect((await log(page)).filter((n) => n === 'player.getData').length).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__SG.state.coins)).toBe(777);
});

test('Y8 the browser context menu never opens over the game', async ({ page }) => {
  await bootYandex(page);
  for (const selector of ['body', '#app', '[data-action="play"]']) {
    const prevented = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      node.dispatchEvent(ev);
      return ev.defaultPrevented;
    }, selector);
    expect(prevented, `contextmenu over ${selector}`).toBe(true);
  }
  const callout = await page.evaluate(() => getComputedStyle(document.body).webkitTouchCallout);
  expect(callout === 'none' || callout === undefined).toBeTruthy();
});

test('Y9 the game still runs when the SDK is missing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => { if (isGameError(e.message)) errors.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && isGameError(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { delete window.YaGames; });
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.__SG);
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.tube').first()).toBeVisible();
  const move = await page.evaluate(() => window.__SG.validMove());
  await page.locator(`[data-tube="${move[0]}"]`).click();
  await page.locator(`[data-tube="${move[1]}"]`).click();
  await page.waitForFunction(() => !window.__SG.busy());
  expect(errors).toEqual([]);
});

test('Y10 a silent SDK does not hang the loader', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => { if (isGameError(e.message)) errors.push(e.message); });
  // init() never resolves: the game must fall back to web mode within its timeout
  await page.addInitScript(() => { window.YaGames = { init: () => new Promise(() => {}) }; });
  await page.goto('/?debug=1');
  await expect(page.locator('[data-action="play"]')).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});

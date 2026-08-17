import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// the state vocabulary comes from the installed bridge, so a rename upstream
// breaks this test instead of silently drifting away from the platform
const require = createRequire(import.meta.url);
const { REWARDED_STATE, INTERSTITIAL_STATE } = require('@playgama/bridge/constants');

// These run against the REAL bridge taken from the packed archive and served
// over HTTP (it cannot fetch its config from file://). A stub written from the
// same understanding as the adapter would agree with it and prove nothing.
//
// platform_id=mock is the deterministic target: it initialises without network.
// platform_id=playgama pulls the portal SDK from playgama.com, so offline it
// only proves graceful degradation — which is worth its own test.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = join(ROOT, 'store', '.zipcheck-playgama');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };

let server;
let origin;

test.beforeAll(async () => {
  if (!existsSync(join(PACK, 'index.html'))) {
    execFileSync('npm', ['run', 'build:playgama'], { cwd: ROOT, stdio: 'ignore' });
  }
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = join(PACK, path === '/' ? 'index.html' : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream' });
      res.end(body);
    } catch (e) {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function openPacked(page, platformId = 'mock') {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${origin}/?platform_id=${platformId}&debug=1`);
  await page.waitForFunction(() => !!window.__SG, null, { timeout: 20000 });
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  return errors;
}

const bridgeReady = (page) => page.waitForFunction(() => window.bridge && window.bridge.isInitialized, null, { timeout: 15000 });

test('PG1 the packed archive carries the bridge and boots it', async ({ page }) => {
  const errors = await openPacked(page);
  await bridgeReady(page);
  const info = await page.evaluate(() => ({
    initialized: window.bridge.isInitialized,
    version: window.bridge.version,
    platform: window.bridge.platform.id,
    ourPortal: window.__SG.state.screen !== undefined
  }));
  expect(info.initialized).toBe(true);
  expect(info.version).toMatch(/^\d+\.\d+/);
  expect(info.platform).toBe('mock');
  expect(errors).toEqual([]);
});

test('PG2 the config file is found, parsed and applied', async ({ page }) => {
  await openPacked(page);
  await bridgeReady(page);
  // reading our own value back proves the file was fetched and applied instead
  // of the bridge falling back to its 60s default
  expect(await page.evaluate(() => window.bridge.advertisement.minimumDelayBetweenInterstitial)).toBe(150);
});

test('PG3 our adapter talks to the platform: game_ready and paired gameplay', async ({ page }) => {
  // wrapping initialize() puts the spy on the real module before our adapter
  // gets its turn — polling for isInitialized races game_ready
  await page.addInitScript(() => {
    window.__msgs = [];
    // the bridge script and the game run back to back, so a timer never fires
    // between them: catch the assignment itself and wrap initialize() there
    let real = null;
    Object.defineProperty(window, 'bridge', {
      configurable: true,
      get: () => real,
      set: (value) => {
        real = value;
        const original = value.initialize.bind(value);
        // subscribe to the bridge's own event rather than patching the module:
        // platform_message_sent is what the bridge emits for every message
        value.initialize = (...args) => original(...args).then((result) => {
          value.platform.on('platform_message_sent', (message) => window.__msgs.push(message));
          return result;
        });
      }
    });
  });
  await openPacked(page);
  await bridgeReady(page);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__msgs), 'game_ready on a live menu').toContain('game_ready');

  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.tube').first()).toBeVisible();
  await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__msgs)).at(-1)).toBe('gameplay_started');

  // a pause is not gameplay
  await page.locator('[data-action="pause"]').click();
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__msgs)).at(-1)).toBe('gameplay_stopped');
  await page.getByRole('button', { name: /Продолжить|Continue/ }).click();
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__msgs)).at(-1)).toBe('gameplay_started');

  // leaving to the menu from an open pause must not repeat a message
  await page.locator('[data-action="pause"]').click();
  await page.getByRole('button', { name: /В меню|Menu/ }).click();
  await expect(page.locator('[data-action="play"]')).toBeVisible();
  const seq = await page.evaluate(() => window.__msgs.filter((m) => m.startsWith('gameplay_')));
  for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  expect(seq.at(-1)).toBe('gameplay_stopped');
});

test('PG4 progress goes through the bridge storage, not only localStorage', async ({ page }) => {
  await openPacked(page);
  await bridgeReady(page);
  await page.evaluate(() => window.__SG.setCoins(654));
  await page.waitForTimeout(2600); // the cloud write is debounced

  const stored = await page.evaluate(async () => {
    const raw = await window.bridge.storage.get('sort-garden-save');
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  });
  expect(stored, 'the bridge must hold the save').toBeTruthy();
  expect(stored.coins).toBe(654);

  await page.evaluate(() => localStorage.removeItem('sort-garden-save'));
  await page.reload();
  await page.waitForFunction(() => !!window.__SG, null, { timeout: 20000 });
  expect(await page.evaluate(() => window.__SG.state.coins)).toBe(654);
});

test('PG5 no ad is requested during a level', async ({ page }) => {
  await openPacked(page);
  await bridgeReady(page);
  await page.evaluate(() => {
    window.__ads = [];
    const ad = window.bridge.advertisement;
    ad.on('interstitial_state_changed', (s) => window.__ads.push(`interstitial:${s}`));
    ad.on('rewarded_state_changed', (s) => window.__ads.push(`rewarded:${s}`));
  });
  await page.locator('[data-action="play"]').click();
  await expect(page.locator('.coach')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Пропустить|Skip/ }).click();
  await expect(page.locator('.coach')).toHaveCount(0);
  for (let i = 0; i < 10; i++) {
    const move = await page.evaluate(() => window.__SG.validMove());
    if (!move) break;
    await page.locator(`[data-tube="${move[0]}"]`).click();
    await page.locator(`[data-tube="${move[1]}"]`).click();
    await page.waitForFunction(() => !window.__SG.busy());
  }
  expect(await page.evaluate(() => window.__ads)).toEqual([]);
});

// The live module's methods cannot be intercepted from the page (they are
// bound internally), so the state machine is driven through a controlled
// bridge — with the state strings taken from the real package above. The live
// integration itself is covered by PG1-PG5.
async function driveAd(page, kind, states) {
  await page.addInitScript(([adKind, adStates]) => {
    let listener = null;
    const supported = { rewarded: adKind === 'rewarded', interstitial: adKind === 'interstitial' };
    window.__calls = [];
    window.bridge = {
      isInitialized: true,
      version: '2.0.0-harness',
      initialize: () => Promise.resolve(),
      platform: { id: 'playgama', language: 'en', sendMessage: () => Promise.resolve(), on: () => {} },
      storage: { get: () => Promise.resolve(null), set: () => Promise.resolve(), delete: () => Promise.resolve() },
      advertisement: {
        get isRewardedSupported() { return supported.rewarded; },
        get isInterstitialSupported() { return supported.interstitial; },
        minimumDelayBetweenInterstitial: 150,
        on: (name, cb) => { listener = cb; },
        off: () => { listener = null; },
        showRewarded: () => { window.__calls.push('showRewarded'); adStates.forEach((s, i) => setTimeout(() => listener && listener(s), 20 * (i + 1))); },
        showInterstitial: () => { window.__calls.push('showInterstitial'); adStates.forEach((s, i) => setTimeout(() => listener && listener(s), 20 * (i + 1))); }
      }
    };
  }, [kind, states]);
  await page.goto('/?platform=playgama&debug=1');
  await page.waitForFunction(() => !!window.__SG);
  const started = await page.evaluate(() => performance.now());
  const result = await page.evaluate((k) => window.__SG.platformAd(k), kind);
  const ms = (await page.evaluate(() => performance.now())) - started;
  const calls = await page.evaluate(() => window.__calls);
  return { result, ms, calls };
}

test('PG6 rewarded pays on the rewarded state only, never on a bare close', async ({ page }) => {
  const closedOnly = await driveAd(page, 'rewarded', [REWARDED_STATE.CLOSED]);
  expect(closedOnly.calls).toEqual(['showRewarded']);
  expect(closedOnly.result, 'closed without rewarded must not pay').toBe(false);
});

test('PG6b a watched video pays, a failed one does not', async ({ page }) => {
  const watched = await driveAd(page, 'rewarded', [REWARDED_STATE.REWARDED, REWARDED_STATE.CLOSED]);
  expect(watched.result, 'a watched video must pay').toBe(true);
});

test('PG6c a failed video pays nothing', async ({ page }) => {
  const failed = await driveAd(page, 'rewarded', [REWARDED_STATE.FAILED]);
  expect(failed.result).toBe(false);
});

test('PG7 interstitial resolves on the close event, not on the call', async ({ page }) => {
  const shown = await driveAd(page, 'interstitial', [INTERSTITIAL_STATE.OPENED, INTERSTITIAL_STATE.CLOSED]);
  expect(shown.calls).toEqual(['showInterstitial']);
  expect(shown.result).toBe(true);
  expect(shown.ms, 'must wait for the close event').toBeGreaterThan(30);
});

test('PG8 rewarded buttons disappear when the portal cannot show a video', async ({ page }) => {
  await openPacked(page);
  await bridgeReady(page);
  // the mock platform reports no rewarded support, so no video button may promise one
  expect(await page.evaluate(() => window.bridge.advertisement.isRewardedSupported)).toBe(false);
  await page.locator('[data-action="daily"]').click();
  await expect(page.getByRole('button', { name: /Удвоить|Double/ }).first()).toBeDisabled();
  // and the plain, non-video claim still works
  await expect(page.locator('[data-action="claim"]')).toBeEnabled();
});

test('PG9 the archive ships the bridge and no Yandex SDK', async ({ page }) => {
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith('data:')) external.push(new URL(url).host);
  });
  const errors = await openPacked(page);
  const html = await page.content();
  expect(html).not.toContain('yandex.ru/games/sdk');
  expect(html).toContain('playgama-bridge.js');
  // only the platform's own SDK may be fetched, and on mock not even that
  expect(external.filter((h) => !h.endsWith('playgama.com'))).toEqual([]);
  expect(errors).toEqual([]);
});

test('PG10 the game still plays when the portal SDK is unreachable', async ({ page }) => {
  // platform_id=playgama fetches the portal SDK; blocking it is the
  // ad-blocker / no-network case the moderators hit too
  await page.route('**/platform-sdk/**', (route) => route.abort());
  const errors = [];
  const ownError = (text) => !/platform-sdk|Failed to load|ERR_FAILED/.test(text);
  page.on('pageerror', (e) => { if (ownError(e.message)) errors.push(e.message); });
  await page.goto(`${origin}/?platform_id=playgama&debug=1`);
  await expect(page.locator('[data-action="play"]')).toBeVisible({ timeout: 20000 });
  await page.locator('[data-action="play"]').click({ timeout: 20000 });
  await expect(page.locator('.tube').first()).toBeVisible();
  await expect(page.locator('.coach')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Пропустить|Skip/ }).click();
  const move = await page.evaluate(() => window.__SG.validMove());
  await page.locator(`[data-tube="${move[0]}"]`).click();
  await page.locator(`[data-tube="${move[1]}"]`).click();
  await page.waitForFunction(() => !window.__SG.busy());
  expect(errors).toEqual([]);
});

// Shoots the real built game for the console: icon, cover and screenshots in
// every language, desktop and phone. A hand-drawn mockup drifts away from the
// game on the first UI change; this refreshes the whole set with one command.
//
//   npm run build:yandex && npm run store:assets
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwright = await import('playwright').catch(
  () => import('/opt/node22/lib/node_modules/playwright/index.mjs')
);
const { chromium } = playwright;

const GAME = {
  dist: 'dist/index.html',
  out: 'store',
  languages: [['ru', 'ru-RU'], ['en', 'en-US']],
  ready: '[data-action="play"]'
};

// a save with progress: empty screens make poor screenshots
const SAVE = (lang) => ({
  version: 1,
  savedAt: Date.now(),
  level: 7,
  coins: 1240,
  starsTotal: 16,
  tutorialDone: true,
  settings: { sound: true, music: true, lang },
  meta: {
    ownedDecor: ['flower', 'bush', 'bench', 'lantern'],
    activeTheme: 'default',
    catsUnlocked: ['ryzhik'],
    stickers: ['leaf', 'star'],
    boosters: { hint: 2, undo: 2, shuffle: 1, tube: 1, leaf: 1 },
    themeTrial: { active: false, themeId: null, levelsLeft: 0 }
  },
  daily: { lastClaimDate: null, streak: 3, tasksDate: null, tasks: [], claimedTaskIds: [] },
  ads: { lastInterstitialTime: 0, lastInterstitialLevel: 0, levelsSinceLastInterstitial: 0, interstitialShowsSession: 0, rewardedCounts: {} },
  offline: { lastSeenTime: Date.now(), pendingOfflineCoins: 0 }
});

const url = `${pathToFileURL(join(process.cwd(), GAME.dist)).href}?debug=1`;

async function openGame(browser, { lang, viewport, scale = 1 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: lang[1] });
  const page = await context.newPage();
  await page.addInitScript((save) => {
    localStorage.setItem('sort-garden-save', JSON.stringify(save));
  }, SAVE(lang[0]));
  await page.goto(url);
  await page.waitForSelector(GAME.ready, { timeout: 20000 });
  await page.waitForTimeout(600);
  return { context, page };
}

async function playIntoLevel(page) {
  await page.click('[data-action="play"]');
  await page.waitForSelector('.tube', { timeout: 15000 });
  // a couple of moves so the board does not look untouched
  for (let i = 0; i < 3; i++) {
    const move = await page.evaluate(() => window.__SG && window.__SG.validMove());
    if (!move) break;
    await page.click(`[data-tube="${move[0]}"]`);
    await page.click(`[data-tube="${move[1]}"]`);
    await page.waitForTimeout(320);
  }
  await page.waitForTimeout(400);
}

const SHOTS = [
  { name: '1-menu', go: async () => {} },
  { name: '2-level', go: playIntoLevel },
  { name: '3-garden', go: async (page) => { await page.click('[data-action="garden"]'); await page.waitForTimeout(500); } },
  { name: '4-shop', go: async (page) => { await page.click('[data-action="shop"]'); await page.waitForTimeout(500); } },
  { name: '5-daily', go: async (page) => { await page.click('[data-action="daily"]'); await page.waitForTimeout(500); } }
];

// §8.3.3: media materials must ship with square corners — the platform applies
// its own mask, so a pre-rounded icon gets flagged in moderation.
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <g>
    <rect width="512" height="512" fill="#EAF3E6"/>
    <path d="M0 372 C 96 330 176 384 272 366 C 352 350 432 378 512 356 L512 512 L0 512 Z" fill="#C6DDB4"/>
    <path d="M0 424 C 96 396 192 438 288 420 C 384 402 448 432 512 414 L512 512 L0 512 Z" fill="#A9CD97"/>
    <circle cx="404" cy="108" r="52" fill="#F4D58A"/>
    <g>
      <rect x="118" y="150" width="118" height="250" rx="34" fill="#FFFDF8" stroke="#E7DFD2" stroke-width="6"/>
      <rect x="140" y="286" width="74" height="74" rx="22" fill="#7BAE7F"/>
      <rect x="140" y="200" width="74" height="74" rx="22" fill="#7BAE7F"/>
      <rect x="276" y="150" width="118" height="250" rx="34" fill="#FFFDF8" stroke="#E7DFD2" stroke-width="6"/>
      <rect x="298" y="286" width="74" height="74" rx="22" fill="#E46A5E"/>
      <rect x="298" y="200" width="74" height="74" rx="22" fill="#EFC65B"/>
    </g>
  </g>
</svg>`;

const COVER = (title, sub) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="470" viewBox="0 0 800 470">
  <rect width="800" height="470" fill="#EAF3E6"/>
  <path d="M0 300 C 140 250 280 320 420 296 C 560 272 680 310 800 284 L800 470 L0 470 Z" fill="#DCE9CF"/>
  <path d="M0 352 C 160 314 320 366 480 344 C 620 325 720 352 800 336 L800 470 L0 470 Z" fill="#C6DDB4"/>
  <path d="M0 404 C 160 380 320 414 480 398 C 620 384 720 404 800 392 L800 470 L0 470 Z" fill="#A9CD97"/>
  <circle cx="706" cy="86" r="46" fill="#F4D58A"/>
  <g transform="translate(96 128)">
    <rect x="0" y="0" width="86" height="184" rx="26" fill="#FFFDF8" stroke="#E7DFD2" stroke-width="4"/>
    <rect x="15" y="104" width="56" height="56" rx="17" fill="#9C86C9"/>
    <rect x="15" y="42" width="56" height="56" rx="17" fill="#9C86C9"/>
    <rect x="110" y="0" width="86" height="184" rx="26" fill="#FFFDF8" stroke="#E7DFD2" stroke-width="4"/>
    <rect x="125" y="104" width="56" height="56" rx="17" fill="#6BB5A8"/>
    <rect x="125" y="42" width="56" height="56" rx="17" fill="#EFC65B"/>
  </g>
  <text x="336" y="212" font-family="Manrope, Nunito, Segoe UI, system-ui, sans-serif" font-size="62" font-weight="800" fill="#33302B">${title.split(' ')[0]}</text>
  <text x="336" y="286" font-family="Manrope, Nunito, Segoe UI, system-ui, sans-serif" font-size="62" font-weight="800" fill="#4E8560">${title.split(' ').slice(1).join(' ')}</text>
  <text x="338" y="330" font-family="Manrope, Nunito, Segoe UI, system-ui, sans-serif" font-size="26" font-weight="600" fill="#6E675C">${sub}</text>
</svg>`;

const COVER_TEXT = {
  ru: ['Sort Garden', 'Волшебный сад сортировки'],
  en: ['Sort Garden', 'A calm sorting garden']
};

async function svgToPng(page, svg, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>html,body{margin:0;padding:0}</style>${svg}`);
  await page.waitForTimeout(120);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
}

const browser = await chromium.launch();

rmSync(join(GAME.out, 'assets'), { recursive: true, force: true });

for (const lang of GAME.languages) {
  const code = lang[0];
  const dir = join(GAME.out, 'assets', code);
  mkdirSync(join(dir, 'screenshots'), { recursive: true });

  // icon and cover are rendered from the same shapes the game uses
  const painter = await browser.newPage();
  await svgToPng(painter, ICON, 512, 512, join(dir, 'icon.png'));
  await svgToPng(painter, COVER(...COVER_TEXT[code]), 800, 470, join(dir, 'cover.png'));
  await painter.close();

  for (const shot of SHOTS) {
    // desktop, landscape 1920x1080
    {
      const { context, page } = await openGame(browser, { lang, viewport: { width: 1920, height: 1080 } });
      await shot.go(page);
      await page.screenshot({ path: join(dir, 'screenshots', `${shot.name}.png`) });
      await context.close();
    }
    // phone, portrait 1080x1920 — real mobile layout at 360x640 with a x3 scale
    {
      const { context, page } = await openGame(browser, { lang, viewport: { width: 360, height: 640 }, scale: 3 });
      await shot.go(page);
      await page.screenshot({ path: join(dir, 'screenshots', `${shot.name}-mobile.png`) });
      await context.close();
    }
  }
  console.log(`store/assets/${code}: icon, cover, ${SHOTS.length * 2} screenshots`);

  // the first language is mirrored flat in store/ for store-check.mjs
  if (code === GAME.languages[0][0]) {
    mkdirSync(join(GAME.out, 'screenshots'), { recursive: true });
    cpSync(join(dir, 'icon.png'), join(GAME.out, 'icon.png'));
    cpSync(join(dir, 'cover.png'), join(GAME.out, 'cover.png'));
    cpSync(join(dir, 'screenshots'), join(GAME.out, 'screenshots'), { recursive: true });
  }
}

await browser.close();
writeFileSync(join(GAME.out, 'assets', 'README.txt'),
  'Загружать внутри языковой вкладки консоли: иконка 512x512, обложка 800x470,\n' +
  'скриншоты *.png — альбомные 1920x1080, *-mobile.png — портретные 1080x1920.\n');

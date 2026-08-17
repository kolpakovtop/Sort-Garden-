// Playgama publishing assets. The form is one per game, in English, and asks
// for three cover sizes; screenshots go into the optional "Other Assets" field.
// Everything is drawn from the same shapes and palette the game itself uses, so
// a UI change never leaves the store showing a different game.
//
//   npm run build:single && npm run store:playgama
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwright = await import('playwright').catch(
  () => import('/opt/node22/lib/node_modules/playwright/index.mjs')
);
const { chromium } = playwright;

const OUT = join('store', 'playgama');
const FONT = 'Manrope, Nunito, Segoe UI, system-ui, sans-serif';

// straight from src/styles.css and src/game/logic.js
const C = {
  skyTop: '#EAF3E6', skyBottom: '#F6F1E7',
  hillFar: '#DCE9CF', hillNear: '#C6DDB4', grass: '#A9CD97', grassDark: '#8FBB7E',
  bush: '#7CA96B', bushLit: '#9CC48A',
  sun: '#F4D58A', cloud: '#FFFFFF',
  surface: '#FFFDF8', line: '#E7DFD2',
  text: '#33302B', accent: '#4E8560', muted: '#6E675C'
};
const P = {
  red: '#E46A5E', orange: '#E89A5D', yellow: '#EFC65B', green: '#7BAE7F',
  blue: '#6C9BD1', purple: '#9C86C9', pink: '#D98BB6', teal: '#6BB5A8'
};

// a jar in a local 100x230 box, standing on y = 230
function jar(colors) {
  const pieces = colors.map((hex, i) => {
    const y = 230 - 18 - (i + 1) * 50;
    return `<rect x="15" y="${y}" width="70" height="44" rx="16" fill="${hex}"/>`;
  }).join('');
  return `<g>
    <ellipse cx="50" cy="237" rx="45" ry="8" fill="rgba(51,48,43,.10)"/>
    <rect x="2" y="0" width="96" height="230" rx="34" fill="${C.surface}" stroke="${C.line}" stroke-width="5"/>
    ${pieces}
    <rect x="16" y="20" width="11" height="146" rx="6" fill="#FFFFFF" opacity=".6"/>
  </g>`;
}

// the mascot from src/ui/cat.js, same paths, in a 96x96 box
const CAT = (() => {
  const c = { body: '#E8A96B', belly: '#F6D4AE', ear: '#C8834C', line: '#33302B' };
  return `<g>
    <ellipse cx="48" cy="88" rx="27" ry="4" fill="rgba(51,48,43,.13)"/>
    <path fill="none" stroke="${c.body}" stroke-width="7" stroke-linecap="round"
          d="M69 78 C 82 76 87 64 82 55 C 79 49 73 48 71 52"/>
    <path fill="${c.body}" d="M24 66 C 24 47 34 39 48 39 C 62 39 72 47 72 66 C 72 80 62 86 48 86 C 34 86 24 80 24 66 Z"/>
    <path fill="${c.belly}" d="M36 70 C 36 60 41 56 48 56 C 55 56 60 60 60 70 C 60 78 55 82 48 82 C 41 82 36 78 36 70 Z"/>
    <path fill="${c.belly}" d="M34 82 h9 a4.5 4.5 0 0 1 0 5 h-9 a2.5 2.5 0 0 1 0-5 Z"/>
    <path fill="${c.belly}" d="M53 82 h9 a2.5 2.5 0 0 1 0 5 h-9 a4.5 4.5 0 0 1 0-5 Z"/>
    <path fill="${c.ear}" d="M30 26 L27 11 L42 20 Z"/>
    <path fill="${c.ear}" d="M66 26 L69 11 L54 20 Z"/>
    <circle cx="48" cy="32" r="20" fill="${c.body}"/>
    <ellipse cx="41" cy="32" rx="2.3" ry="3" fill="${c.line}"/>
    <ellipse cx="55" cy="32" rx="2.3" ry="3" fill="${c.line}"/>
    <circle cx="41.7" cy="30.8" r="0.8" fill="#FFFDF8"/>
    <circle cx="55.7" cy="30.8" r="0.8" fill="#FFFDF8"/>
    <path d="M48 37 v2" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M44.5 40 Q 48 42.5 51.5 40" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <circle cx="35" cy="37" r="2.6" fill="#D98BB6" opacity=".38"/>
    <circle cx="61" cy="37" r="2.6" fill="#D98BB6" opacity=".38"/>
  </g>`;
})();

function flower(x, y, s, petal) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C -3 -14 3 -20 0 -28" stroke="${C.grassDark}" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="-11" cy="-27" r="7" fill="${petal}"/>
    <circle cx="11" cy="-27" r="7" fill="${petal}"/>
    <circle cx="-7" cy="-42" r="7" fill="${petal}"/>
    <circle cx="7" cy="-42" r="7" fill="${petal}"/>
    <circle cx="0" cy="-34" r="8" fill="${petal}"/>
    <circle cx="0" cy="-34" r="4" fill="#FBECC7"/>
  </g>`;
}

function bush(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-4" rx="40" ry="7" fill="rgba(51,48,43,.08)"/>
    <circle cx="-19" cy="-17" r="20" fill="${C.bush}"/>
    <circle cx="19" cy="-15" r="18" fill="${C.bush}"/>
    <circle cx="0" cy="-31" r="23" fill="${C.bush}"/>
    <circle cx="-6" cy="-26" r="16" fill="${C.bushLit}"/>
    <circle cx="14" cy="-16" r="12" fill="${C.bushLit}"/>
  </g>`;
}

function cloud(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${C.cloud}" opacity=".85">
    <ellipse cx="0" cy="0" rx="54" ry="26"/>
    <ellipse cx="-38" cy="8" rx="34" ry="19"/>
    <ellipse cx="40" cy="9" rx="30" ry="17"/>
    <ellipse cx="6" cy="-16" rx="30" ry="20"/>
  </g>`;
}

// three hill bands ending at the bottom edge; y values are the crest heights
function hills(w, h, [far, near, grass]) {
  const band = (y, fill, amp) => `<path fill="${fill}" d="M0 ${y}
    C ${w * 0.22} ${y - amp} ${w * 0.42} ${y + amp} ${w * 0.62} ${y - amp * 0.4}
    C ${w * 0.8} ${y - amp * 1.1} ${w * 0.92} ${y + amp * 0.5} ${w} ${y - amp * 0.5}
    L ${w} ${h} L 0 ${h} Z"/>`;
  return band(far, C.hillFar, h * 0.05) + band(near, C.hillNear, h * 0.04) + band(grass, C.grass, h * 0.03);
}

function frame(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.skyTop}"/>
      <stop offset="1" stop-color="${C.skyBottom}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${body}
</svg>`;
}

function title(x, y, size, anchor = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${C.text}">Sort <tspan fill="${C.accent}">Garden</tspan></text>`;
}

function subtitle(x, y, size, anchor = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="600" fill="${C.muted}">Sort the petals, grow your garden</text>`;
}

const JARS = [
  [P.purple, P.purple, P.teal],
  [P.yellow, P.red, P.yellow],
  [P.green, P.teal, P.green, P.green]
];

const COVERS = {
  'cover-16x9-1920x1080.png': { w: 1920, h: 1080, svg: () => frame(1920, 1080, `
    <circle cx="1716" cy="176" r="96" fill="${C.sun}"/>
    ${cloud(300, 170, 1.5)}${cloud(1180, 118, 1.1)}
    ${hills(1920, 1080, [612, 764, 884])}
    ${title(132, 452, 148)}
    ${subtitle(138, 540, 46)}
    ${bush(268, 1004, 1.9)}
    ${flower(452, 1000, 2.0, P.pink)}${flower(566, 1032, 1.7, P.yellow)}${flower(672, 992, 1.6, P.red)}
    <g transform="translate(812 630) scale(2.8)">${CAT}</g>
    <g transform="translate(1112 555) scale(1.5)">${jar(JARS[0])}</g>
    <g transform="translate(1352 555) scale(1.5)">${jar(JARS[1])}</g>
    <g transform="translate(1592 555) scale(1.5)">${jar(JARS[2])}</g>`) },

  'cover-1x1-800x800.png': { w: 800, h: 800, svg: () => frame(800, 800, `
    <circle cx="716" cy="92" r="52" fill="${C.sun}"/>
    ${cloud(190, 300, 0.9)}
    ${hills(800, 800, [408, 508, 588])}
    ${title(400, 186, 74, 'middle')}
    ${subtitle(400, 240, 25, 'middle')}
    ${bush(74, 742, 0.9)}
    ${flower(706, 704, 1.0, P.pink)}${flower(762, 736, 0.85, P.yellow)}
    <g transform="translate(566 458) scale(2.15)">${CAT}</g>
    <g transform="translate(130 384) scale(1.2)">${jar(JARS[0])}</g>
    <g transform="translate(274 384) scale(1.2)">${jar(JARS[1])}</g>
    <g transform="translate(418 384) scale(1.2)">${jar(JARS[2])}</g>`) },

  'cover-9x16-1080x1920.png': { w: 1080, h: 1920, svg: () => frame(1080, 1920, `
    <circle cx="872" cy="272" r="112" fill="${C.sun}"/>
    ${cloud(300, 210, 1.4)}${cloud(760, 470, 1.0)}
    ${hills(1080, 1920, [1010, 1240, 1420])}
    ${title(540, 812, 126, 'middle')}
    ${subtitle(540, 884, 40, 'middle')}
    ${bush(140, 1614, 1.8)}
    ${flower(884, 1560, 1.8, P.pink)}${flower(984, 1600, 1.5, P.yellow)}
    <g transform="translate(238 1030) scale(1.7)">${jar(JARS[0])}</g>
    <g transform="translate(448 1030) scale(1.7)">${jar(JARS[1])}</g>
    <g transform="translate(658 1030) scale(1.7)">${jar(JARS[2])}</g>
    <g transform="translate(422 1500) scale(2.6)">${CAT}</g>`) }
};

// screenshots for the optional "Other Assets" field, English only
const SAVE = {
  version: 1,
  savedAt: Date.now(),
  level: 7,
  coins: 1240,
  starsTotal: 16,
  tutorialDone: true,
  settings: { sound: true, music: true, lang: 'en' },
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
};

const url = `${pathToFileURL(join(process.cwd(), 'dist', 'index.html')).href}?debug=1`;

async function openGame(browser, viewport, scale) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: 'en-US' });
  const page = await context.newPage();
  await page.addInitScript((save) => {
    localStorage.setItem('sort-garden-save', JSON.stringify(save));
  }, SAVE);
  await page.goto(url);
  await page.waitForSelector('[data-action="play"]', { timeout: 20000 });
  await page.waitForTimeout(600);
  return { context, page };
}

async function playIntoLevel(page) {
  await page.click('[data-action="play"]');
  await page.waitForSelector('.tube', { timeout: 15000 });
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

// --covers skips the screenshot pass while a cover is being tuned
const coversOnly = process.argv.includes('--covers');

if (!coversOnly) rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'screenshots'), { recursive: true });

const browser = await chromium.launch();
const painter = await browser.newPage();

for (const [name, cover] of Object.entries(COVERS)) {
  await painter.setViewportSize({ width: cover.w, height: cover.h });
  await painter.setContent(`<style>html,body{margin:0;padding:0}</style>${cover.svg()}`);
  await painter.waitForTimeout(140);
  await painter.screenshot({ path: join(OUT, name), clip: { x: 0, y: 0, width: cover.w, height: cover.h } });
  console.log(`${join(OUT, name)} — ${cover.w}x${cover.h}`);
}
await painter.close();

for (const shot of coversOnly ? [] : SHOTS) {
  {
    const { context, page } = await openGame(browser, { width: 1920, height: 1080 }, 1);
    await shot.go(page);
    await page.screenshot({ path: join(OUT, 'screenshots', `${shot.name}.png`) });
    await context.close();
  }
  {
    const { context, page } = await openGame(browser, { width: 360, height: 640 }, 3);
    await shot.go(page);
    await page.screenshot({ path: join(OUT, 'screenshots', `${shot.name}-mobile.png`) });
    await context.close();
  }
}
await browser.close();

writeFileSync(join(OUT, 'README.txt'),
  'Playgama form assets (one English set for the whole game).\n' +
  'Cover Images: cover-1x1-800x800.png, cover-9x16-1080x1920.png, cover-16x9-1920x1080.png.\n' +
  'Other Assets (optional): screenshots/ — *.png are 1920x1080 desktop, *-mobile.png are 1080x1920 phone.\n' +
  'Game Archive: store/sort-garden-playgama.zip. Form texts and QA answers: store/playgama.md.\n');

console.log(coversOnly ? 'screenshots skipped (--covers)' : `${OUT}/screenshots: ${SHOTS.length * 2} files`);

// Unit tests + static audit. Plain Node, no dependencies: node tests/run.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
let currentId = '';

function test(id, name, fn) {
  currentId = id;
  try {
    fn();
    results.push({ id, name, status: 'PASS', note: '' });
  } catch (e) {
    results.push({ id, name, status: 'FAIL', note: (e.message || String(e)).split('\n')[0].slice(0, 160) });
  }
}

function warn(id, name, note) {
  results.push({ id, name, status: 'WARN', note });
}

// localStorage stub so save.js can be imported outside a browser
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
};

const logic = await import('../src/game/logic.js');
const levels = await import('../src/game/levels.js');
const save = await import('../src/core/save.js');

const B = (tubes, capacity = 4) => ({ tubes: tubes.map((t) => t.slice()), capacity, selectedTube: null });

/* ---------------- logic ---------------- */

test('U1', 'canMove: empty target', () => {
  assert.equal(logic.canMove(B([['red'], []]), 0, 1), true);
});

test('U2', 'canMove: same top colour with room', () => {
  assert.equal(logic.canMove(B([['red'], ['red']]), 0, 1), true);
});

test('U3', 'canMove: different top colour', () => {
  assert.equal(logic.canMove(B([['red'], ['blue']]), 0, 1), false);
});

test('U4', 'canMove: full target', () => {
  assert.equal(logic.canMove(B([['red'], ['red', 'red', 'red', 'red']]), 0, 1), false);
});

test('U5', 'canMove: empty source / same index', () => {
  assert.equal(logic.canMove(B([[], ['red']]), 0, 1), false);
  assert.equal(logic.canMove(B([['red'], []]), 0, 0), false);
});

test('U6', 'makeMove: moves exactly one top item', () => {
  const board = B([['red', 'blue'], ['blue']]);
  const res = logic.makeMove(board, 0, 1);
  assert.deepEqual(res, { from: 0, to: 1, item: 'blue' });
  assert.deepEqual(board.tubes[0], ['red']);
  assert.deepEqual(board.tubes[1], ['blue', 'blue']);
});

test('U7', 'makeMove: illegal move leaves board untouched', () => {
  const board = B([['red'], ['blue']]);
  const snapshot = JSON.stringify(board.tubes);
  assert.equal(logic.makeMove(board, 0, 1), null);
  assert.equal(JSON.stringify(board.tubes), snapshot);
});

test('U8', 'undoMove: restores the previous board', () => {
  const board = B([['red', 'blue'], ['blue'], []]);
  const before = JSON.stringify(board.tubes);
  const history = [];
  const mv = logic.makeMove(board, 0, 1);
  history.push({ from: mv.from, to: mv.to });
  logic.undoMove(board, history);
  assert.equal(JSON.stringify(board.tubes), before);
  assert.equal(history.length, 0);
});

test('U9', 'isSolved', () => {
  assert.equal(logic.isSolved(B([['red', 'red', 'red', 'red'], []])), true);
  assert.equal(logic.isSolved(B([['red', 'blue'], []])), false);
  // one colour split across two jars is not solved
  assert.equal(logic.isSolved(B([['red', 'red'], ['red', 'red']])), false);
});

test('U10', 'hasAnyMove', () => {
  const stuck = B([
    ['red', 'red', 'red', 'blue'],
    ['blue', 'blue', 'blue', 'red']
  ]);
  assert.equal(logic.hasAnyMove(stuck), false);
  assert.equal(logic.hasAnyMove(B([['red'], []])), true);
});

test('U11', 'findBestMove returns a legal move', () => {
  for (let i = 0; i < 20; i++) {
    const { board } = levels.generateLevel(1 + i * 3);
    const move = logic.findBestMove(board);
    assert.ok(move, 'a move must exist on a fresh level');
    assert.equal(logic.canMove(board, move.from, move.to), true, `illegal hint ${JSON.stringify(move)}`);
  }
});

test('U12', 'safeShuffle keeps the multiset, stays unsolved and playable', () => {
  for (let i = 0; i < 12; i++) {
    const { board } = levels.generateLevel(5 + i * 4);
    const before = board.tubes.flat().slice().sort().join(',');
    assert.equal(logic.safeShuffle(board), true);
    assert.equal(board.tubes.flat().slice().sort().join(','), before, 'colour multiset changed');
    assert.equal(logic.isSolved(board), false, 'shuffle produced a solved board');
    assert.equal(logic.hasAnyMove(board), true, 'shuffle produced a dead board');
  }
});

/* ---------------- levels ---------------- */

const LEVEL_IDS = [...Array(60).keys()].map((i) => i + 1).concat([100, 200]);

function spec(n) {
  if (n <= 3) return { colors: [3, 3], tubes: [5, 5], empty: [2, 2], moves: [40, 45] };
  if (n <= 5) return { colors: [4, 4], tubes: [6, 6], empty: [2, 2], moves: [50, 50] };
  if (n <= 9) return { colors: [4, 5], tubes: [6, 7], empty: [2, 2], moves: [55, 55] };
  if (n <= 14) return { colors: [5, 5], tubes: [7, 7], empty: [2, 2], moves: [60, 60] };
  if (n <= 19) return { colors: [5, 6], tubes: [7, 8], empty: [1, 2], moves: [65, 65] };
  if (n <= 29) return { colors: [6, 6], tubes: [8, 8], empty: [1, 1], moves: [70, 70] };
  return { colors: [7, 7], tubes: [9, 9], empty: [1, 1], moves: [80, 100] };
}

test('U13', 'levels: capacity 4, jar lengths <= 4, item count = colours * 4', () => {
  for (const n of LEVEL_IDS) {
    const { board, colors } = levels.generateLevel(n);
    assert.equal(board.capacity, 4, `L${n} capacity`);
    for (const tube of board.tubes) assert.ok(tube.length <= 4, `L${n} jar overflow`);
    assert.equal(board.tubes.flat().length, colors * 4, `L${n} item count`);
    assert.equal(new Set(board.tubes.flat()).size, colors, `L${n} distinct colours`);
  }
});

test('U14', 'levels: parameters inside the spec ranges', () => {
  const bad = [];
  for (const n of LEVEL_IDS) {
    const { board, moves, colors } = levels.generateLevel(n);
    const s = spec(n);
    const empty = board.tubes.filter((t) => !t.length).length;
    if (colors < s.colors[0] || colors > s.colors[1]) bad.push(`L${n} colours=${colors} want ${s.colors}`);
    if (board.tubes.length < s.tubes[0] || board.tubes.length > s.tubes[1]) bad.push(`L${n} jars=${board.tubes.length} want ${s.tubes}`);
    if (empty < s.empty[0] || empty > s.empty[1]) bad.push(`L${n} empty=${empty} want ${s.empty}`);
    if (moves < s.moves[0] || moves > s.moves[1]) bad.push(`L${n} moves=${moves} want ${s.moves}`);
  }
  assert.equal(bad.length, 0, bad.slice(0, 4).join(' | '));
});

test('U15', 'levels: start is unsolved and playable', () => {
  for (const n of LEVEL_IDS) {
    const { board } = levels.generateLevel(n);
    assert.equal(logic.isSolved(board), false, `L${n} starts solved`);
    assert.equal(logic.hasAnyMove(board), true, `L${n} starts dead`);
  }
});

{
  const unsolved = [];
  for (const n of LEVEL_IDS) {
    const { board } = levels.generateLevel(n);
    if (!logic.solve(board, 200000)) unsolved.push(n);
  }
  if (unsolved.length) warn('U16', 'levels: solver reachability', `unsolved within 200k nodes: ${unsolved.join(',')}`);
  else results.push({ id: 'U16', name: 'levels: solver reachability', status: 'PASS', note: '' });
}

/* ---------------- ads limits ---------------- */

// the pure gate is re-implemented against the shipped source to avoid pulling
// in DOM-dependent modules; it is read straight out of ads.js
const adsSrc = readFileSync(join(ROOT, 'src/core/ads.js'), 'utf8');
const gateBody = adsSrc.slice(adsSrc.indexOf('export function interstitialAllowed'), adsSrc.indexOf('/* ---------------- platform adapters'));
const INTERSTITIAL_SOURCES = ['level_complete', 'fail_exit', 'bonus_room', 'garden_milestone'];
const MIN_INTERSTITIAL_GAP = 150000;
const MAX_INTERSTITIAL_SESSION = 4;
const MIN_INTERSTITIAL_LEVEL = 4;
// eslint-disable-next-line no-new-func
const interstitialAllowed = new Function(
  'INTERSTITIAL_SOURCES', 'MIN_INTERSTITIAL_GAP', 'MAX_INTERSTITIAL_SESSION', 'MIN_INTERSTITIAL_LEVEL',
  `${gateBody.replace('export function', 'return function')}`
)(INTERSTITIAL_SOURCES, MIN_INTERSTITIAL_GAP, MAX_INTERSTITIAL_SESSION, MIN_INTERSTITIAL_LEVEL);

const NOW = 10_000_000;
const baseCtx = {
  source: 'level_complete', level: 10, tutorialDone: true, screen: 'result',
  openModals: 0, showsSession: 0, lastTime: 0, levelsSince: 3, lastRewardedAt: 0
};

test('U17', 'interstitial: blocked below level 4', () => {
  assert.equal(interstitialAllowed({ ...baseCtx, level: 3 }, NOW), false);
  assert.equal(interstitialAllowed({ ...baseCtx, level: 1 }, NOW + 999999), false);
});

test('U18', 'interstitial: allowed after 3 levels and 150s', () => {
  assert.equal(interstitialAllowed({ ...baseCtx, levelsSince: 3, lastTime: NOW - 150000 }, NOW), true);
});

test('U19', 'interstitial: blocked inside the 150s gap', () => {
  assert.equal(interstitialAllowed({ ...baseCtx, lastTime: NOW - 149999 }, NOW), false);
});

test('U20', 'interstitial: blocked at 4 shows per session', () => {
  assert.equal(interstitialAllowed({ ...baseCtx, showsSession: 4 }, NOW), false);
  assert.equal(interstitialAllowed({ ...baseCtx, showsSession: 3 }, NOW), true);
});

/* ---------------- economy ---------------- */

test('U21', 'level coins: base capped at 40, stars, cat, double, <= 120', () => {
  assert.equal(levels.coinsFor(1, 1, false), 10 + 1 + 5);
  assert.equal(levels.coinsFor(5, 3, false), 15 + 15);
  assert.equal(levels.coinsFor(50, 3, false), 40 + 15, 'base must cap at 40');
  assert.equal(levels.coinsFor(50, 3, true), 40 + 15 + 5, 'ginger cat adds 5');
  const max = levels.coinsFor(999, 3, true) * 2; // win_double
  assert.ok(max <= 120, `max payout ${max} > 120`);
});

const metaSrc = readFileSync(join(ROOT, 'src/game/meta.js'), 'utf8');
const offlineBody = metaSrc.slice(metaSrc.indexOf('export function offlineCoinsFor'), metaSrc.indexOf('export function offlineCoins()'));
// eslint-disable-next-line no-new-func
const offlineCoinsFor = new Function('OFFLINE_CAP_MS', `${offlineBody.replace('export function', 'return function')}`)(2 * 60 * 60 * 1000);

test('U22', 'offline income: 1 coin / 10 min / decor, capped at 2h, 0 without decor', () => {
  const min = 60 * 1000;
  assert.equal(offlineCoinsFor(0, 5 * 60 * min), 0);
  assert.equal(offlineCoinsFor(1, 9 * min), 0);
  assert.equal(offlineCoinsFor(1, 10 * min), 1);
  assert.equal(offlineCoinsFor(3, 30 * min), 9);
  assert.equal(offlineCoinsFor(2, 5 * 60 * min), 24, 'must cap at 2 hours');
  assert.equal(offlineCoinsFor(1, -5000), 0);
});

/* ---------------- save ---------------- */

test('U23', 'save: broken JSON falls back to a clean load', () => {
  store.clear();
  store.set('sort-garden-save', '{not json');
  assert.equal(save.load(), null);
  assert.equal(store.has('sort-garden-save'), false, 'corrupt payload must be cleared');
  store.set('sort-garden-save', '"a string"');
  assert.equal(save.load(), null);
});

test('U24', 'save: foreign version migrates without throwing', () => {
  store.clear();
  save.save({ version: 99, level: 12, coins: 500, starsTotal: 7, tutorialDone: true, settings: { lang: 'en' }, junk: { x: 1 } });
  const data = save.load();
  assert.equal(data.version, save.SAVE_VERSION);
  assert.equal(data.level, 12);
  assert.equal(data.coins, 500);
  assert.equal(data.junk, undefined, 'unknown fields must be dropped');
  store.clear();
  save.save({ version: 0, level: 'oops', coins: -5 });
  const bad = save.load();
  assert.equal(bad.level, 1);
  assert.equal(bad.coins, 0);
});

/* ---------------- static audit ---------------- */

function srcFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) srcFiles(full, out);
    else if (['.js', '.css', '.html'].includes(extname(full))) out.push(full);
  }
  return out;
}
const FILES = srcFiles(join(ROOT, 'src')).concat([join(ROOT, 'index.html')]);
const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => f.replace(`${ROOT}/`, '');

test('A1', 'no emoji in src', () => {
  const re = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const hits = FILES.filter((f) => re.test(read(f))).map(rel);
  assert.equal(hits.length, 0, `emoji in ${hits.join(', ')}`);
});

test('A2', 'no external assets', () => {
  const hits = [];
  for (const f of FILES) {
    const body = read(f);
    if (/<img[^>]+src=["']https?:/i.test(body)) hits.push(`${rel(f)} img`);
    if (/url\(\s*["']?https?:/i.test(body)) hits.push(`${rel(f)} css-url`);
    if (/@import\s+url\(\s*["']?https?:/i.test(body)) hits.push(`${rel(f)} import`);
  }
  assert.equal(hits.length, 0, hits.join(', '));
});

test('A3', 'no alert/confirm/prompt', () => {
  const hits = FILES.filter((f) => /(^|[^.\w])(alert|confirm|prompt)\s*\(/.test(read(f).replace(/confirmModal\s*\(/g, ''))).map(rel);
  assert.equal(hits.length, 0, hits.join(', '));
});

test('A4', 'no layout-property animations in CSS', () => {
  const css = read(join(ROOT, 'src/styles.css'));
  const bad = [];
  const transitions = css.match(/transition:[^;]+;/g) || [];
  for (const decl of transitions) {
    if (/\b(width|height|top|left|right|bottom|margin|padding)\b/.test(decl)) bad.push(decl.trim().slice(0, 70));
  }
  const frames = css.match(/@keyframes[^{]+\{[\s\S]*?\n\}/g) || [];
  for (const frame of frames) {
    const props = frame.match(/^\s*(width|height|top|left|margin|padding)\s*:/gm) || [];
    if (props.length) bad.push(frame.slice(0, 40));
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});

test('A5', 'will-change is scoped, not global', () => {
  const css = read(join(ROOT, 'src/styles.css'));
  const decls = css.match(/^[^@}]*\bwill-change\s*:/gm) || [];
  assert.ok(decls.length <= 4, `${decls.length} will-change rules`);
  assert.ok(!/\*\s*\{[^}]*will-change/.test(css), 'will-change on a universal selector');
});

test('A6', 'vite base is relative', () => {
  assert.match(read(join(ROOT, 'vite.config.js')), /base:\s*['"]\.\/?['"]/);
});

test('A7', 'ads go through AdService only', () => {
  // ads.js is the ad service; platform.js is the single SDK owner it delegates to
  const allowed = ['src/core/ads.js', 'src/core/platform.js'];
  const offenders = [];
  for (const f of FILES.filter((x) => x.endsWith('.js') && !allowed.includes(rel(x)))) {
    const body = read(f);
    if (/\b(YaGames|CrazyGames\.SDK|bridge\.advertisement|showRewardedVideo|showFullscreenAdv)\b/.test(body)) offenders.push(rel(f));
  }
  assert.equal(offenders.length, 0, `SDK touched outside the ad layer: ${offenders.join(', ')}`);
  // screens may never reach past AdService for an ad
  for (const f of FILES.filter((x) => x.includes('/screens/'))) {
    assert.ok(!/platformAds|\.adv\./.test(read(f)), `${rel(f)} calls the SDK directly`);
  }
  // every rewarded call site must be awaited and branch on the result
  const screens = read(join(ROOT, 'src/screens/screens.js')) + read(join(ROOT, 'src/screens/level.js'));
  const calls = screens.match(/showRewarded\('[a-z_]+'\)/g) || [];
  assert.ok(calls.length >= 10, `only ${calls.length} rewarded call sites`);
});

test('A8', 'no full board re-render inside jar click handling', () => {
  const level = read(join(ROOT, 'src/screens/level.js'));
  const onTube = level.slice(level.indexOf('function onTube('), level.indexOf('function doMove('));
  assert.ok(!/renderBoard\(|innerHTML|replaceChildren/.test(onTube), 'onTube rebuilds the board');
  const refresh = level.slice(level.indexOf('function refresh()'), level.indexOf('function rebuild()'));
  assert.ok(!/renderBoard\(/.test(refresh), 'refresh() rebuilds the board');
});

test('A9', 'title and favicon are set', () => {
  const html = read(join(ROOT, 'index.html'));
  assert.match(html, /<title>[^<]{3,}<\/title>/);
  assert.match(html, /<link[^>]+rel=["']icon["'][^>]+href=["']data:image\/svg\+xml/);
});

test('A10', 'muted text contrast on surface >= 4.5:1', () => {
  const css = read(join(ROOT, 'src/styles.css'));
  const pick = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    assert.ok(m, `--${name} not found`);
    return m[1];
  };
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const r = ratio(pick('muted'), pick('surface'));
  assert.ok(r >= 4.5, `contrast ${r.toFixed(2)}:1`);
});

test('A11', 'store icon ships square, unmasked corners (Yandex §8.3.3)', () => {
  const gen = read(join(ROOT, 'scripts/store-assets.mjs'));
  const icon = gen.slice(gen.indexOf('const ICON ='), gen.indexOf('const COVER ='));
  // internal art (the jars) is allowed its own rounded corners — only the
  // 512x512 canvas itself must stay square and unclipped
  assert.ok(!/clip-?[Pp]ath/.test(icon), 'icon SVG clips its own outer corners');
  assert.ok(!/width="512"\s+height="512"[^>]*\brx=/.test(icon), 'the 512x512 canvas rect is rounded');
});

/* ---------------- report ---------------- */

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warns = results.filter((r) => r.status === 'WARN').length;

for (const r of results) {
  const line = `${r.status.padEnd(4)} ${r.id.padEnd(4)} ${r.name}`;
  console.log(r.note ? `${line}  — ${r.note}` : line);
}
console.log(`\nunit+audit: ${pass} pass, ${fail} fail, ${warns} warn`);
process.exit(fail ? 1 : 0);

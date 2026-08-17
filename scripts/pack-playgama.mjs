// Playgama wants the bridge inside the archive: the platform substitutes
// nothing. This builds a two-file package — the single-file game with a
// <script src="playgama-bridge.js"> tag ahead of it, the bridge itself copied
// from node_modules unchanged, and the config the bridge fetches at init.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT = 'dist-playgama';
const STORE = 'store';
const ZIP = join(STORE, 'sort-garden-playgama.zip');
const BRIDGE_SRC = 'node_modules/@playgama/bridge/dist/playgama-bridge.js';

for (const required of [join(DIST, 'index.html'), BRIDGE_SRC]) {
  if (!existsSync(required)) {
    console.error(`${required} is missing — run the build and npm i first`);
    process.exit(1);
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(STORE, { recursive: true });

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// the Yandex SDK has no business on a Playgama page
html = html.replace(/\s*<script[^>]*src="https:\/\/yandex\.ru\/games\/sdk\/v2"[^>]*><\/script>/g, '');

// the bridge must run before the game: a synchronous tag ahead of it means
// window.bridge already exists when main.js starts
const gameScript = html.lastIndexOf('<script type="module">');
if (gameScript === -1) {
  console.error('game script not found in dist/index.html — run the single-file build');
  process.exit(1);
}
html = `${html.slice(0, gameScript)}<script src="playgama-bridge.js"></script>\n${html.slice(gameScript)}`;

writeFileSync(join(OUT, 'index.html'), html);
copyFileSync(BRIDGE_SRC, join(OUT, 'playgama-bridge.js'));

// the bridge fetches ./playgama-bridge-config.json at init; the frequency here
// is the one the game itself already enforces (150s between interstitials)
writeFileSync(join(OUT, 'playgama-bridge-config.json'), `${JSON.stringify({
  advertisement: {
    minimumDelayBetweenInterstitial: 150,
    initialInterstitialDelay: 150
  }
}, null, 2)}\n`);

rmSync(ZIP, { force: true });
execFileSync('zip', ['-qr', join('..', ZIP), '.'], { cwd: OUT });

// verify the artefact that actually gets uploaded
const check = join(STORE, '.zipcheck-playgama');
rmSync(check, { recursive: true, force: true });
mkdirSync(check, { recursive: true });
execFileSync('unzip', ['-qo', join('..', '..', ZIP)], { cwd: check });

const rootFiles = readdirSync(check).sort();
const missing = ['index.html', 'playgama-bridge.js', 'playgama-bridge-config.json'].filter((f) => !rootFiles.includes(f));
if (missing.length) {
  console.error(`missing at the archive root: ${missing.join(', ')}`);
  process.exit(1);
}
if (!readFileSync(join(check, 'index.html'), 'utf8').includes('src="playgama-bridge.js"')) {
  console.error('index.html does not load the bridge');
  process.exit(1);
}

const bridgeVersion = JSON.parse(readFileSync('node_modules/@playgama/bridge/package.json', 'utf8')).version;
console.log(`${ZIP} — ${(statSync(ZIP).size / 1024).toFixed(1)} kB, root: ${rootFiles.join(', ')}`);
console.log(`bridge @playgama/bridge@${bridgeVersion}, unpacked copy: ${check}`);

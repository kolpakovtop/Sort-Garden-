// Builds the archive for the Yandex Games console and verifies the artefact
// that actually gets uploaded — index.html must sit at the archive root.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT = 'store';
const ZIP = join(OUT, 'sort-garden-yandex.zip');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html is missing — run the build first');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
rmSync(ZIP, { force: true });
execFileSync('zip', ['-qr', join('..', ZIP), '.'], { cwd: DIST });

// unpack and play from the unpacked copy: relative paths and ES modules break
// there, not in dist/
const check = join(OUT, '.zipcheck');
rmSync(check, { recursive: true, force: true });
mkdirSync(check, { recursive: true });
execFileSync('unzip', ['-qo', join('..', '..', ZIP)], { cwd: check });

const rootFiles = readdirSync(check);
if (!rootFiles.includes('index.html')) {
  console.error(`index.html is not at the archive root (found: ${rootFiles.join(', ')})`);
  process.exit(1);
}

const size = statSync(ZIP).size;
console.log(`${ZIP} — ${(size / 1024).toFixed(1)} kB, root: ${rootFiles.join(', ')}`);
console.log(`unpacked copy for a manual run: ${join(check, 'index.html')}`);

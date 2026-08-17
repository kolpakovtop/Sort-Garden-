import { readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const htmlPath = join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

// inline stylesheet
html = html.replace(/<link[^>]+href="([^"]+\.css)"[^>]*>/g, (_, href) => {
  const file = join(dist, href.replace(/^\.?\//, ''));
  const css = readFileSync(file, 'utf8');
  rmSync(file);
  return `<style>${css}</style>`;
});

// inline module script
html = html.replace(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (_, src) => {
  const file = join(dist, src.replace(/^\.?\//, ''));
  const js = readFileSync(file, 'utf8').replace(/<\/script>/gi, '<\\/script>');
  rmSync(file);
  return `<script type="module">${js}</script>`;
});

writeFileSync(htmlPath, html);

// clean empty asset dir
const assets = join(dist, 'assets');
try {
  if (statSync(assets).isDirectory() && !readdirSync(assets).length) rmSync(assets, { recursive: true });
} catch (e) { /* ignore */ }

console.log('inlined ->', htmlPath, `(${html.length} bytes)`);

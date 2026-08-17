// Fixed background scene behind the app. Hill/grass SVGs stretch edge to edge
// (preserveAspectRatio="none" + width:100%), clouds drift as separate nodes.

const SKY = '<div class="scene__sky"></div>';

const SUN = '<div class="scene__sun"><span class="scene__sun-core"></span></div>';

const CLOUD_SHAPE = `<svg viewBox="0 0 120 50" aria-hidden="true" focusable="false">
  <g fill="var(--cloud)">
    <ellipse cx="44" cy="30" rx="34" ry="15"/>
    <ellipse cx="72" cy="24" rx="24" ry="14"/>
    <ellipse cx="26" cy="26" rx="18" ry="11"/>
  </g>
</svg>`;

const CLOUDS = `<div class="scene__clouds">
  <div class="cloud" style="--y:6%;  --w:190px; --dur:96s;  --delay:-8s;  --op:.85"></div>
  <div class="cloud" style="--y:16%; --w:140px; --dur:126s; --delay:-52s; --op:.7"></div>
  <div class="cloud" style="--y:27%; --w:110px; --dur:154s; --delay:-96s; --op:.6"></div>
</div>`;

const HILLS = `<svg class="scene__hills" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path fill="var(--hill-far)" d="M0 118 C 220 52 420 128 660 106 C 900 84 1120 132 1440 92 L1440 260 L0 260 Z"/>
  <path fill="var(--hill-near)" d="M0 184 C 260 122 520 190 780 168 C 1040 146 1240 190 1440 160 L1440 260 L0 260 Z"/>
</svg>`;

const GRASS = `<svg class="scene__grass" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path fill="var(--grass)" d="M0 44 C 240 14 480 60 720 40 C 960 20 1200 58 1440 36 L1440 150 L0 150 Z"/>
  <path fill="var(--grass-dark)" opacity="0.55" d="M0 84 C 260 56 520 96 780 78 C 1040 60 1240 94 1440 74 L1440 150 L0 150 Z"/>
</svg>`;

const FLOWER_COLORS = ['#EFC65B', '#D98BB6', '#FFFDF8', '#9C86C9', '#E89A5D', '#EFC65B', '#D98BB6', '#FFFDF8'];

function flowers() {
  // spread across the full width, each swaying with its own delay
  const spots = [6, 18, 29, 41, 53, 64, 76, 88, 95];
  return `<div class="scene__flowers">${spots.map((left, i) => `
    <span class="flower" style="left:${left}%; --sway:${(3 + (i % 4) * 0.4).toFixed(1)}s; --delay:-${i * 0.7}s; --size:${16 + (i % 3) * 5}px">
      <svg viewBox="0 0 24 32" aria-hidden="true" focusable="false">
        <path d="M12 32 V 15" stroke="var(--grass-dark)" stroke-width="2" stroke-linecap="round" fill="none"/>
        <circle cx="12" cy="9" r="4.6" fill="${FLOWER_COLORS[i % FLOWER_COLORS.length]}"/>
        <circle cx="12" cy="9" r="1.7" fill="#E3A64B"/>
      </svg>
    </span>`).join('')}</div>`;
}

const FULL = SKY + SUN + CLOUDS + HILLS + GRASS + flowers();
const LIGHT = SKY + CLOUDS + GRASS + flowers();
const PLAIN = SKY + GRASS;

const MODES = {
  menu: FULL,
  garden: FULL,
  boot: FULL,
  result: SKY + SUN + CLOUDS + GRASS + flowers(),
  level: SKY + CLOUDS + GRASS,
  shop: LIGHT,
  daily: LIGHT,
  rewards: LIGHT,
  tasks: PLAIN,
  settings: PLAIN
};

let layer = null;
let currentMode = null;

export function mountScene(mode = 'boot') {
  if (!layer) {
    layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(layer, document.body.firstChild);
  }
  if (currentMode === mode) return;
  currentMode = mode;
  layer.className = `scene scene--${mode}`;
  layer.innerHTML = MODES[mode] || MODES.boot;
  layer.querySelectorAll('.cloud').forEach((node) => { node.innerHTML = CLOUD_SHAPE; });
}

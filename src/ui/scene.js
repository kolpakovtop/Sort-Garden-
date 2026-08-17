// A single fixed scene layer sits behind the app and adapts to each screen.
// Everything animates on transform/opacity only so it stays cheap on phones.

const HTML = {
  sky: '<div class="scene__sky"></div>',
  sun: `<svg class="scene__sun" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <circle class="sun__glow" cx="50" cy="50" r="46" fill="var(--sun)" opacity="0.18"/>
    <circle cx="50" cy="50" r="30" fill="var(--sun)"/>
  </svg>`,
  clouds: `<svg class="scene__clouds" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <g class="cloud cloud--a" fill="var(--cloud)" opacity="0.85">
      <ellipse cx="80" cy="70" rx="42" ry="18"/>
      <ellipse cx="118" cy="58" rx="28" ry="16"/>
      <ellipse cx="52" cy="64" rx="22" ry="14"/>
    </g>
    <g class="cloud cloud--b" fill="var(--cloud)" opacity="0.72">
      <ellipse cx="200" cy="120" rx="36" ry="15"/>
      <ellipse cx="232" cy="112" rx="22" ry="12"/>
    </g>
    <g class="cloud cloud--c" fill="var(--cloud)" opacity="0.78">
      <ellipse cx="60" cy="150" rx="30" ry="12"/>
      <ellipse cx="90" cy="146" rx="20" ry="10"/>
    </g>
  </svg>`,
  hills: `<svg class="scene__hills" viewBox="0 0 1000 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <path fill="var(--hill-far)" d="M0 180 Q 180 90 380 150 T 720 130 T 1000 150 L 1000 320 L 0 320 Z"/>
    <g fill="var(--hill-far)" opacity="0.85">
      <circle cx="220" cy="150" r="28"/>
      <rect x="216" y="150" width="8" height="18" rx="2"/>
      <circle cx="720" cy="140" r="34"/>
      <rect x="716" y="140" width="8" height="22" rx="2"/>
    </g>
    <path fill="var(--hill-near)" d="M0 240 Q 260 170 520 220 T 1000 200 L 1000 320 L 0 320 Z"/>
  </svg>`,
  grass: `<svg class="scene__grass" viewBox="0 0 1000 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <path fill="var(--grass)" d="M0 46 Q 120 18 240 42 T 480 42 T 720 40 T 1000 44 L 1000 140 L 0 140 Z"/>
    <path fill="var(--grass-dark)" opacity="0.65" d="M0 70 Q 160 46 320 66 T 640 66 T 1000 62 L 1000 140 L 0 140 Z"/>
    <g class="grass__flowers">
      <g transform="translate(140 58)"><circle r="4" fill="#EFC65B"/><circle r="1.6" fill="#E89A5D"/></g>
      <g transform="translate(360 62)"><circle r="4" fill="#D98BB6"/><circle r="1.6" fill="#E46A5E"/></g>
      <g transform="translate(560 58)"><circle r="4" fill="#FFFDF8"/><circle r="1.6" fill="#EFC65B"/></g>
      <g transform="translate(760 64)"><circle r="4" fill="#9C86C9"/><circle r="1.6" fill="#EFC65B"/></g>
      <g transform="translate(900 60)"><circle r="4" fill="#EFC65B"/><circle r="1.6" fill="#E89A5D"/></g>
    </g>
  </svg>`,
  butterfly: `<svg class="scene__butterfly" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <g class="butterfly">
      <ellipse cx="12" cy="12" rx="1" ry="4" fill="var(--text)"/>
      <path class="butterfly__wing butterfly__wing--l" fill="#D98BB6" opacity="0.85" d="M11 10 C 6 6 3 8 4 12 C 3 14 6 16 11 13 Z"/>
      <path class="butterfly__wing butterfly__wing--r" fill="#EFC65B" opacity="0.85" d="M13 10 C 18 6 21 8 20 12 C 21 14 18 16 13 13 Z"/>
    </g>
  </svg>`
};

const MODES = {
  menu:    HTML.sky + HTML.sun + HTML.clouds + HTML.hills + HTML.grass + HTML.butterfly,
  garden:  HTML.sky + HTML.sun + HTML.clouds + HTML.hills + HTML.grass + HTML.butterfly,
  level:   HTML.sky + HTML.clouds + HTML.grass,
  result:  HTML.sky + HTML.sun + HTML.clouds + HTML.grass,
  shop:    HTML.sky + HTML.clouds + HTML.grass,
  daily:   HTML.sky + HTML.clouds + HTML.grass,
  tasks:   HTML.sky + HTML.grass,
  rewards: HTML.sky + HTML.clouds + HTML.grass,
  settings:HTML.sky + HTML.grass,
  boot:    HTML.sky + HTML.sun + HTML.clouds + HTML.grass
};

let layer = null;

export function mountScene(mode = 'boot') {
  if (!layer) {
    layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  const html = MODES[mode] || MODES.boot;
  const cls = `scene scene--${mode}`;
  if (layer.className === cls && layer._mode === mode) return;
  layer._mode = mode;
  layer.className = cls;
  layer.innerHTML = html;
}

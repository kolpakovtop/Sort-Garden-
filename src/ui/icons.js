// One system: viewBox 0 0 24 24, stroke currentColor, width 2, round caps/joins.
// "Filled" icons carry a duotone backdrop: fill="currentColor" opacity=".14".

const DUO = 'fill="currentColor" opacity=".14" stroke="none"';

const P = {
  /* --- navigation --- */
  play: '<path d="M8.6 5.6a1.2 1.2 0 0 1 1.83-1.02l7.2 4.42a1.2 1.2 0 0 1 0 2.05l-7.2 4.42A1.2 1.2 0 0 1 8.6 14.4z" transform="translate(0 2)"/>',
  home: '<path d="M4 10.6 12 4.4l8 6.2"/><path d="M6.4 9.8v8.4a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4V9.8"/>',
  back: '<path d="M14.6 5.4 8.4 12l6.2 6.6"/>',
  close: '<path d="M6.6 6.6 17.4 17.4M17.4 6.6 6.6 17.4"/>',
  pause: '<path d="M9.4 5.6v12.8M14.6 5.6v12.8"/>',
  check: '<path d="M5.2 12.4 9.6 16.8 18.8 7.6"/>',
  plus: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><path d="M12 8.4v7.2M8.4 12h7.2"/>',
  info: '<circle cx="12" cy="12" r="8.2"/><path d="M12 11.2v5M12 7.9h.01"/>',
  help: '<circle cx="12" cy="12" r="8.2"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2-2.5 3.6"/><path d="M12 17.2h.01"/>',
  lock: '<rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2.8"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/>',

  /* --- settings: three sliders --- */
  settings: '<path d="M4 7.2h4.2M12.4 7.2H20M4 12h9.4M17.6 12H20M4 16.8h2.6M10.8 16.8H20"/><circle cx="10.4" cy="7.2" r="2.1"/><circle cx="15.6" cy="12" r="2.1"/><circle cx="8.8" cy="16.8" r="2.1"/>',

  /* --- counters --- */
  coin: `<circle cx="12" cy="12" r="8.2" ${DUO}/><circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9.9l.85 1.72 1.9.28-1.38 1.34.33 1.9L12 14.24l-1.7.9.33-1.9-1.38-1.34 1.9-.28z" ${DUO}/><path d="M12 9.9l.85 1.72 1.9.28-1.38 1.34.33 1.9L12 14.24l-1.7.9.33-1.9-1.38-1.34 1.9-.28z" stroke-width="1.4"/>`,
  moves: '<path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M17.4 2.9v3.6h-3.6M6.6 21.1v-3.6h3.6"/>',
  star: `<path d="M12 3.8l2.5 5.06 5.6.82-4.05 3.94.96 5.56L12 16.55l-5.01 2.63.96-5.56L3.9 9.68l5.6-.82z" ${DUO}/><path d="M12 3.8l2.5 5.06 5.6.82-4.05 3.94.96 5.56L12 16.55l-5.01 2.63.96-5.56L3.9 9.68l5.6-.82z"/>`,

  /* --- meta --- */
  garden: '<path d="M3.6 20.4h16.8"/><path d="M12 20.4v-7.6"/><path d="M12 13.2c0-3.1 2.1-5.2 5.2-5.2 0 3.1-2.1 5.2-5.2 5.2z"/><path d="M12 15.2c0-2.7-1.9-4.6-4.6-4.6 0 2.6 1.9 4.6 4.6 4.6z"/>',
  shop: `<path d="M5 8.4h14l-1.1 10.2a1.4 1.4 0 0 1-1.4 1.2H7.5a1.4 1.4 0 0 1-1.4-1.2z" ${DUO}/><path d="M5 8.4h14l-1.1 10.2a1.4 1.4 0 0 1-1.4 1.2H7.5a1.4 1.4 0 0 1-1.4-1.2z"/><path d="M9.2 8.4V6.7a2.8 2.8 0 0 1 5.6 0v1.7"/>`,
  gift: `<rect x="4.2" y="10.4" width="15.6" height="9.4" rx="1.6" ${DUO}/><rect x="4.2" y="10.4" width="15.6" height="9.4" rx="1.6"/><rect x="3.2" y="7" width="17.6" height="3.4" rx="1.2"/><path d="M12 7v12.8"/><path d="M12 7c-1.6 0-3.9-.5-3.9-2A1.9 1.9 0 0 1 10 3.2C11.5 3.2 12 5.4 12 7zM12 7c1.6 0 3.9-.5 3.9-2A1.9 1.9 0 0 0 14 3.2C12.5 3.2 12 5.4 12 7z"/>`,
  cat: `<path d="M5.6 10 5.2 4.9l4.2 2.5a8.6 8.6 0 0 1 5.2 0l4.2-2.5-.4 5.1" ${DUO}/><path d="M5.6 10 5.2 4.9l4.2 2.5a8.6 8.6 0 0 1 5.2 0l4.2-2.5-.4 5.1"/><path d="M5.2 12.2c0 4.1 3 6.9 6.8 6.9s6.8-2.8 6.8-6.9"/><path d="M9.7 12.6h.01M14.3 12.6h.01"/>`,
  chest: `<path d="M4.6 10.6 6.4 6h11.2l1.8 4.6" ${DUO}/><path d="M4.6 10.6 6.4 6h11.2l1.8 4.6"/><rect x="4.6" y="10.6" width="14.8" height="8.4" rx="1.4"/><path d="M10.6 10.6h2.8v3.2h-2.8z"/>`,
  daily: '<rect x="3.8" y="5.4" width="16.4" height="14.4" rx="2.8"/><path d="M3.8 10h16.4M8.6 3.6v3.4M15.4 3.6v3.4"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/>',
  task: '<path d="M10 7.4h9.4M10 12h9.4M10 16.6h6.4"/><path d="M4.2 6.6 5.4 7.8 7.6 5.4"/><path d="M4.6 12h2.4M4.6 16.6h2.4"/>',
  reward: '<rect x="3.4" y="5.8" width="17.2" height="12.4" rx="3.2"/><path d="M10.6 9.8 14.8 12l-4.2 2.2z"/>',
  rewards: `<circle cx="12" cy="14.6" r="5.2" ${DUO}/><circle cx="12" cy="14.6" r="5.2"/><path d="M8.6 9.8 6.4 3.8h11.2l-2.2 6"/><path d="M12 12.6l.8 1.6 1.8.26-1.3 1.26.3 1.78L12 16.66l-1.6.84.3-1.78-1.3-1.26 1.8-.26z" stroke-width="1.3"/>`,
  sticker: '<path d="M4.4 8.4a4 4 0 0 1 4-4h7.2a4 4 0 0 1 4 4v4.2l-7 7H8.4a4 4 0 0 1-4-4z"/><path d="M19.6 12.6h-3.4a3.4 3.4 0 0 0-3.4 3.4v3.6"/>',

  /* --- boosters --- */
  hint: '<path d="M8.4 13.2a4.6 4.6 0 1 1 7.2 0c-.8 1-1.3 1.8-1.5 2.6H9.9c-.2-.8-.7-1.6-1.5-2.6z"/><path d="M9.9 18h4.2M10.6 20.6h2.8"/>',
  undo: '<path d="M4.6 9.6h9.8a5.2 5.2 0 0 1 0 10.4H8.2"/><path d="M8.4 5 4.6 9.6l3.8 4.6"/>',
  shuffle: '<path d="M4 7.4h3.2l9.4 9.2H20"/><path d="M4 16.6h3.2l2.6-2.6M13.8 10.2l2.8-2.8H20"/><path d="M17.4 4.6 20 7.4l-2.6 2.8"/><path d="M17.4 13.8 20 16.6l-2.6 2.8"/>',
  leaf: '<path d="M5 19c0-7.4 5.2-12.4 14-13 1 9.2-4.2 14-11 14"/><path d="M8.2 16c2.4-3.2 5-5.2 8-6.6"/>',

  /* --- audio --- */
  'sound-on': '<path d="M4.6 9.4h3l4-3.2v11.6l-4-3.2h-3z"/><path d="M15 9.6a3.6 3.6 0 0 1 0 4.8M17.6 7a7.2 7.2 0 0 1 0 10"/>',
  'sound-off': '<path d="M4.6 9.4h3l4-3.2v11.6l-4-3.2h-3z"/><path d="M15.4 10.2l4.2 4.2M19.6 10.2l-4.2 4.2"/>',
  'music-on': '<path d="M9.4 17.4V6.6l8.4-1.6v10.6"/><ellipse cx="7.2" cy="17.6" rx="2.2" ry="1.9"/><ellipse cx="15.6" cy="15.6" rx="2.2" ry="1.9"/>',
  'music-off': '<path d="M9.4 17.4V6.6l8.4-1.6"/><ellipse cx="7.2" cy="17.6" rx="2.2" ry="1.9"/><path d="M14.4 8.6l5.2 5.2M19.6 8.6l-5.2 5.2"/>',

  /* --- decor --- */
  flower: '<circle cx="12" cy="8.6" r="2"/><circle cx="8.5" cy="6.6" r="1.9"/><circle cx="15.5" cy="6.6" r="1.9"/><circle cx="9.3" cy="10.8" r="1.9"/><circle cx="14.7" cy="10.8" r="1.9"/><path d="M12 13.4V20.4"/>',
  bush: '<path d="M4 17.6a3.9 3.9 0 0 1 3.4-3.9 4.3 4.3 0 0 1 8.4-.6 3.8 3.8 0 0 1 4.2 4.5z"/><path d="M4 17.6h16"/>',
  bench: '<path d="M4.6 12.6h14.8M4.6 16h14.8M7.2 8.8h9.6M7.2 8.8v10.8M16.8 8.8v10.8"/>',
  lantern: '<path d="M12 3.4v2.4"/><path d="M9.4 5.8h5.2l1.2 3.6-1 7.4H9.2l-1-7.4z"/><path d="M10 20.2h4M12 16.8v3.4"/>',
  path: '<rect x="4" y="15.4" width="7.4" height="4" rx="2"/><rect x="12.6" y="10" width="7.4" height="4" rx="2"/><rect x="6.4" y="4.6" width="7.4" height="4" rx="2"/>',
  fountain: '<path d="M4 19.8h16"/><path d="M6.6 19.8 8 13.4h8l1.4 6.4"/><path d="M12 13.4V8"/><path d="M12 8c0-1.6 1.3-2.9 2.9-2.9M12 8c0-1.6-1.3-2.9-2.9-2.9"/>',
  catHouse: '<path d="M4.4 11.4 12 5l7.6 6.4"/><path d="M6.4 10.2v9.4h11.2v-9.4"/><circle cx="12" cy="15" r="2.6"/>',
  tree: '<circle cx="12" cy="9.2" r="5.4"/><path d="M12 14.2V20.4M12 17.2 9 14.8M12 16.2l3-2.4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3.4v2.4M12 18.2v2.4M3.4 12h2.4M18.2 12h2.4M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7"/>',
  sparkle: '<path d="M12 4.4v4.4M12 15.2v4.4M4.4 12h4.4M15.2 12h4.4"/>',

  /* --- item symbols --- */
  sym_heart: '<path d="M12 19.4S4.6 15 4.6 9.9A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7.4 1.9c0 5.1-7.4 9.5-7.4 9.5z"/>',
  sym_leaf: '<path d="M5 19c0-7 5-12 14-13 1 9-4 14-11 14"/><path d="M8 16c2.5-3 5-5 8-6.5"/>',
  sym_star: '<path d="M12 4.4l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z"/>',
  sym_clover: '<circle cx="8.6" cy="10" r="3.2"/><circle cx="15.4" cy="10" r="3.2"/><circle cx="12" cy="15.4" r="3.2"/>',
  sym_drop: '<path d="M12 4.4s5.5 5.6 5.5 9a5.5 5.5 0 0 1-11 0c0-3.4 5.5-9 5.5-9z"/>',
  sym_diamond: '<path d="M12 3.8 20.2 12 12 20.2 3.8 12z"/>',
  sym_flower: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="6.6" r="2.6"/><circle cx="12" cy="17.4" r="2.6"/><circle cx="6.6" cy="12" r="2.6"/><circle cx="17.4" cy="12" r="2.6"/>',
  sym_wave: '<path d="M3.6 9.6c1.9-2.4 3.8-2.4 5.6 0s3.7 2.4 5.6 0 3.7-2.4 5.6 0"/><path d="M3.6 15c1.9-2.4 3.8-2.4 5.6 0s3.7 2.4 5.6 0 3.7-2.4 5.6 0"/>'
};

export function icon(name) {
  const body = P[name] || P.info;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function iconEl(name, cls = '') {
  const span = document.createElement('span');
  span.className = `icon ${cls}`.trim();
  span.innerHTML = icon(name);
  return span;
}

export function hasIcon(name) {
  return !!P[name];
}

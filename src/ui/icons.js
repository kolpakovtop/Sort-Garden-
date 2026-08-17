const P = {
  play: '<path d="M8 5.6v12.8L18.4 12z"/>',
  home: '<path d="M4 11 12 4.4l8 6.6"/><path d="M6.4 9.6V19.6h11.2V9.6"/>',
  garden: '<path d="M12 20.5v-7.6"/><path d="M12 12.9c0-3 2-5 5-5 0 3-2 5-5 5z"/><path d="M12 15c0-2.6-1.8-4.4-4.4-4.4 0 2.5 1.8 4.4 4.4 4.4z"/><path d="M4 20.5h16"/>',
  shop: '<path d="M5 8.2h14L17.9 19.6H6.1z"/><path d="M9.2 8.2V6.6a2.8 2.8 0 0 1 5.6 0v1.6"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6"/>',
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
  star: '<path d="M12 4.4l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z"/>',
  gift: '<path d="M4.6 10.6h14.8v9H4.6z"/><path d="M3.6 7h16.8v3.6H3.6z"/><path d="M12 7v12.6"/><path d="M12 7C10.6 7 8.2 6.7 8.2 5.3A1.8 1.8 0 0 1 10 3.5C11.5 3.5 12 5.6 12 7zM12 7c1.4 0 3.8-.3 3.8-1.7A1.8 1.8 0 0 0 14 3.5C12.5 3.5 12 5.6 12 7z"/>',
  cat: '<path d="M5 9.8 4.6 5.4 8.3 7.6a8.4 8.4 0 0 1 7.4 0l3.7-2.2-.4 4.4"/><path d="M5 11.8c0 4 3.1 6.8 7 6.8s7-2.8 7-6.8"/><path d="M9.6 12.4h.01M14.4 12.4h.01"/>',
  leaf: '<path d="M5 19c0-7 5-12 14-13 1 9-4 14-11 14"/><path d="M8 16c2.5-3 5-5 8-6.5"/>',
  hint: '<path d="M9.6 17.6h4.8M10.2 20.4h3.6"/><path d="M8 12.8a4.6 4.6 0 1 1 8 0c-.7 1-1.2 1.8-1.4 2.6H9.4c-.2-.8-.7-1.6-1.4-2.6z"/>',
  undo: '<path d="M4.6 9.6h9.6a5.2 5.2 0 0 1 0 10.4H8.4"/><path d="M8.2 5 4.6 9.6l3.6 4.6"/>',
  shuffle: '<path d="M4 7.2h3.4l9.2 9.6H20"/><path d="M4 16.8h3.4l2.8-2.9M13.8 10.1l2.8-2.9H20"/><path d="M17.4 4.4 20 7.2l-2.6 2.8"/><path d="M17.4 14 20 16.8l-2.6 2.8"/>',
  plus: '<path d="M12 5.4v13.2M5.4 12h13.2"/>',
  moves: '<path d="M4 18.4h4.4V14h4.4V9.6h6.6"/><path d="M16.8 6.8 19.8 9.6 16.8 12.4"/>',
  close: '<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>',
  back: '<path d="M14.6 5 8 12l6.6 7"/>',
  pause: '<path d="M9.4 5.6v12.8M14.6 5.6v12.8"/>',
  'sound-on': '<path d="M4.6 9.4h3l4-3.2v11.6l-4-3.2h-3z"/><path d="M15 9.6a3.6 3.6 0 0 1 0 4.8M17.6 7a7.2 7.2 0 0 1 0 10"/>',
  'sound-off': '<path d="M4.6 9.4h3l4-3.2v11.6l-4-3.2h-3z"/><path d="M15.4 10.2l4.2 4.2M19.6 10.2l-4.2 4.2"/>',
  'music-on': '<path d="M9.4 17.4V6.6l8.4-1.6v10.6"/><ellipse cx="7.2" cy="17.6" rx="2.2" ry="1.9"/><ellipse cx="15.6" cy="15.6" rx="2.2" ry="1.9"/>',
  'music-off': '<path d="M9.4 17.4V6.6l8.4-1.6"/><ellipse cx="7.2" cy="17.6" rx="2.2" ry="1.9"/><path d="M14.4 8.6l5.2 5.2M19.6 8.6l-5.2 5.2"/>',
  reward: '<rect x="3.4" y="6" width="17.2" height="12" rx="3.2"/><path d="M10.4 9.8 14.6 12l-4.2 2.2z"/>',
  chest: '<path d="M4.2 10.6 6.2 6h11.6l2 4.6"/><path d="M4.2 10.6h15.6V19H4.2z"/><path d="M10.4 10.6h3.2v3.4h-3.2z"/>',
  daily: '<rect x="4" y="5.6" width="16" height="14" rx="3.2"/><path d="M4 10.2h16M8.8 3.8v3.4M15.2 3.8v3.4"/>',
  task: '<path d="M9.6 7.2h10.2M9.6 12h10.2M9.6 16.8h7"/><path d="M4.2 6.6 5.4 7.8 7.2 5.8M4.2 11.4l1.2 1.2 1.8-2M4.2 16.2l1.2 1.2 1.8-2"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5.4M12 7.8h.01"/>',
  check: '<path d="M5 12.6 9.6 17.2 19 7.4"/>',
  lock: '<rect x="5" y="10.4" width="14" height="9.2" rx="2.8"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/>',
  sticker: '<path d="M4.4 8.4a4 4 0 0 1 4-4h7.2a4 4 0 0 1 4 4v4.2l-7 7H8.4a4 4 0 0 1-4-4z"/><path d="M19.6 12.6h-3.4a3.4 3.4 0 0 0-3.4 3.4v3.6"/>',

  flower: '<circle cx="12" cy="8.6" r="2"/><circle cx="8.5" cy="6.6" r="1.9"/><circle cx="15.5" cy="6.6" r="1.9"/><circle cx="9.3" cy="10.8" r="1.9"/><circle cx="14.7" cy="10.8" r="1.9"/><path d="M12 13.4V20.4"/>',
  bush: '<path d="M4 17.6a3.9 3.9 0 0 1 3.4-3.9 4.3 4.3 0 0 1 8.4-.6 3.8 3.8 0 0 1 4.2 4.5z"/><path d="M4 17.6h16"/>',
  bench: '<path d="M4.6 12.6h14.8M4.6 16h14.8M7.2 8.8h9.6M7.2 8.8v10.8M16.8 8.8v10.8"/>',
  lantern: '<path d="M12 3.4v2.4"/><path d="M9.4 5.8h5.2l1.2 3.6-1 7.4H9.2l-1-7.4z"/><path d="M10 20.2h4M12 16.8v3.4"/>',
  path: '<rect x="4" y="15.4" width="7.4" height="4" rx="2"/><rect x="12.6" y="10" width="7.4" height="4" rx="2"/><rect x="6.4" y="4.6" width="7.4" height="4" rx="2"/>',
  fountain: '<path d="M4 19.8h16"/><path d="M6.6 19.8 8 13.4h8l1.4 6.4"/><path d="M12 13.4V8"/><path d="M12 8c0-1.6 1.3-2.9 2.9-2.9M12 8c0-1.6-1.3-2.9-2.9-2.9"/>',
  catHouse: '<path d="M4.4 11.4 12 5l7.6 6.4"/><path d="M6.4 10.2v9.4h11.2v-9.4"/><circle cx="12" cy="15" r="2.6"/>',
  tree: '<circle cx="12" cy="9.2" r="5.4"/><path d="M12 14.2V20.4M12 17.2 9 14.8M12 16.2l3-2.4"/>',

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

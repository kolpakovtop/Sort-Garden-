export const SAVE_KEY = 'sort-garden-save';
export const SAVE_VERSION = 1;

let memoryRaw = null; // fallback when localStorage is unavailable
let lsOk = true;

function ls() {
  if (!lsOk) return null;
  try {
    const s = window.localStorage;
    s.setItem('__sg_probe__', '1');
    s.removeItem('__sg_probe__');
    return s;
  } catch (e) {
    lsOk = false;
    return null;
  }
}

export function storageAvailable() {
  return !!ls();
}

export function save(state) {
  let raw;
  try {
    state.savedAt = Date.now();
    raw = JSON.stringify(state);
  } catch (e) {
    return false;
  }
  const s = ls();
  if (s) {
    try {
      s.setItem(SAVE_KEY, raw);
      return true;
    } catch (e) {
      lsOk = false;
    }
  }
  memoryRaw = raw;
  return false;
}

export function load() {
  const s = ls();
  let raw = memoryRaw;
  if (s) {
    try { raw = s.getItem(SAVE_KEY); } catch (e) { raw = memoryRaw; }
  }
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch (e) { clear(); return null; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) { clear(); return null; }
  return migrate(data);
}

export function clear() {
  memoryRaw = null;
  const s = ls();
  if (s) { try { s.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
}

// Fields are merged over defaults by the state layer, so migration only has to
// drop data that cannot be trusted across versions.
export function migrate(data) {
  const v = Number(data.version) || 0;
  if (v !== SAVE_VERSION) {
    data = {
      version: SAVE_VERSION,
      level: Number(data.level) > 0 ? Number(data.level) : 1,
      coins: Number(data.coins) >= 0 ? Number(data.coins) : 0,
      starsTotal: Number(data.starsTotal) >= 0 ? Number(data.starsTotal) : 0,
      tutorialDone: !!data.tutorialDone,
      settings: typeof data.settings === 'object' && data.settings ? data.settings : undefined,
      meta: typeof data.meta === 'object' && data.meta ? data.meta : undefined
    };
  }
  data.version = SAVE_VERSION;
  return data;
}

// Cloud payloads go through the same validation as local ones.
export function parseCloud(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return migrate(data);
  } catch (e) {
    return null;
  }
}

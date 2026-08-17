import * as Save from './save.js';
import { track } from './analytics.js';
import { cloudSave, cloudLoad } from './platform.js';

export function defaultSession(levelNumber = 1) {
  return {
    levelNumber,
    movesStart: 0,
    movesLeft: 0,
    boostersUsed: 0,
    undoUsed: 0,
    hintsUsed: 0,
    extraMovesRewarded: 0,
    extraTubeUsed: false,
    shuffleUsed: false,
    autoMoveUsed: false,
    magicLeafUsed: false,
    catHelperActive: false,
    prelevelBooster: null,
    free: { hint: 3, undo: 3, tube: 1, shuffle: 1, auto: 1, leaf: 1 }
  };
}

export function defaultState() {
  return {
    version: Save.SAVE_VERSION,
    savedAt: 0,
    screen: 'boot',
    level: 1,
    coins: 0,
    starsTotal: 0,
    tutorialDone: false,
    tutorialStep: 0,
    settings: { sound: true, music: true, lang: 'ru' },
    board: null,
    levelSession: defaultSession(1),
    meta: {
      ownedDecor: [],
      activeTheme: 'default',
      catsUnlocked: [],
      stickers: [],
      boosters: { hint: 0, undo: 0, tube: 0, shuffle: 0, leaf: 0 },
      themeTrial: { active: false, themeId: null, levelsLeft: 0 }
    },
    daily: {
      lastClaimDate: null,
      streak: 0,
      tasksDate: null,
      tasks: [],
      claimedTaskIds: []
    },
    ads: {
      lastInterstitialTime: 0,
      lastInterstitialLevel: 0,
      levelsSinceLastInterstitial: 0,
      interstitialShowsSession: 0,
      rewardedCounts: {}
    },
    offline: { lastSeenTime: Date.now(), pendingOfflineCoins: 0 }
  };
}

export let state = defaultState();
export let hadSave = false;

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  listeners.forEach((fn) => fn(state));
}

let cloudTimer = null;

export function persist() {
  Save.save(state);
  // the cloud write is debounced: the portal quota is per-call, not per-byte
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudTimer = null;
    try { cloudSave(JSON.stringify(state)); } catch (e) { /* offline: local copy stands */ }
  }, 2000);
}

export function flushCloud() {
  if (cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; }
  try { return cloudSave(JSON.stringify(state)); } catch (e) { return Promise.resolve(false); }
}

// Cloud wins only when it is genuinely newer than the local copy.
export async function adoptCloudSave() {
  let raw = null;
  try { raw = await cloudLoad(); } catch (e) { return false; }
  const data = Save.parseCloud(raw);
  if (!data) return false;
  const localAt = Number(state.savedAt) || 0;
  const cloudAt = Number(data.savedAt) || 0;
  if (cloudAt <= localAt) return false;
  state = merge(defaultState(), data);
  state.board = null;
  state.levelSession = defaultSession(state.level);
  state.screen = 'boot';
  if (!Number.isFinite(state.level) || state.level < 1) state.level = 1;
  if (!Number.isFinite(state.coins) || state.coins < 0) state.coins = 0;
  emit();
  return true;
}

function isPlain(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, patch) {
  if (!isPlain(patch)) return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (val === undefined) continue;
    if (isPlain(base[key]) && isPlain(val)) out[key] = merge(base[key], val);
    else if (Array.isArray(base[key]) && Array.isArray(val)) out[key] = val.slice();
    else if (typeof base[key] === typeof val || base[key] === null) out[key] = val;
  }
  return out;
}

export function loadState() {
  let data = null;
  try { data = Save.load(); } catch (e) { data = null; }
  hadSave = !!data;
  state = data ? merge(defaultState(), data) : defaultState();
  // a running level is never restored — meta progress is what matters
  state.board = null;
  state.levelSession = defaultSession(state.level);
  state.screen = 'boot';
  state.ads.interstitialShowsSession = 0;
  state.ads.lastInterstitialTime = 0;
  if (!Number.isFinite(state.level) || state.level < 1) state.level = 1;
  if (!Number.isFinite(state.coins) || state.coins < 0) state.coins = 0;
  return state;
}

export function resetProgress() {
  const lang = state.settings.lang;
  Save.clear();
  state = defaultState();
  state.settings.lang = lang;
  persist();
  emit();
}

export function addCoins(n, reason = 'unknown') {
  const amount = Math.max(0, Math.round(n));
  if (!amount) return 0;
  state.coins += amount;
  track('coins_earned', { amount, reason });
  persist();
  emit();
  return amount;
}

export function spendCoins(n, reason = 'unknown') {
  const amount = Math.max(0, Math.round(n));
  if (state.coins < amount) return false;
  state.coins -= amount;
  track('coins_spent', { amount, reason });
  persist();
  emit();
  return true;
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

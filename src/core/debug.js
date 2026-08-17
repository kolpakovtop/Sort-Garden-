// Test hook. Without ?debug=1 nothing is exported to the page and every
// registration is a no-op, so production builds are untouched.

export const DEBUG = typeof location !== 'undefined' && /[?&]debug=1(&|$)/.test(location.search);

const hooks = {};

export function registerLevel(api) {
  if (DEBUG) hooks.level = api;
}

export function clearLevel() {
  if (DEBUG) delete hooks.level;
}

export function installDebug({ state, persist, ads, meta, router }) {
  if (!DEBUG || typeof window === 'undefined') return;
  window.__SG = {
    get state() { return state; },
    get level() { return hooks.level || null; },

    setMoves(n) { return hooks.level ? hooks.level.setMoves(n) : false; },
    setCoins(n) {
      state.coins = Math.max(0, Math.round(n));
      persist();
      if (hooks.level) hooks.level.refresh();
      return state.coins;
    },
    setBoard(tubes) { return hooks.level ? hooks.level.setBoard(tubes) : false; },
    validMove() { return hooks.level ? hooks.level.validMove() : null; },
    solveOne() { return hooks.level ? hooks.level.solveOne() : false; },
    board() { return hooks.level ? hooks.level.board() : null; },
    busy() { return hooks.level ? hooks.level.busy() : false; },

    ads: {
      get rewarded() { return ads.adShowCounts().rewarded; },
      get interstitial() { return ads.adShowCounts().interstitial; },
      reset() { ads.resetAdCounts(); }
    },
    canShowInterstitial(now) { return ads.canShowInterstitial('level_complete', now); },

    setLastSeen(deltaMs) {
      state.offline.lastSeenTime = Date.now() - deltaMs;
      state.offline.pendingOfflineCoins = 0;
      persist();
      return state.offline.lastSeenTime;
    },
    offlineCoins() { return meta.offlineCoins(); },
    go(screen) { router.go(screen); }
  };
}

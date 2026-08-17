// Portal bridge. The web implementation is the default and the Yandex adapter
// only overrides what the platform actually provides, so a missing or blocked
// SDK degrades to plain web behaviour instead of breaking the game.

const OVERRIDE = (() => {
  try { return new URLSearchParams(location.search).get('platform'); } catch (e) { return null; }
})();

// Ad timeouts guard against a silent SDK — they must outlive a real ad,
// otherwise they fire while the video is still on screen and eat the reward.
const AD_TIMEOUT = { interstitial: 60000, rewarded: 120000 };
const INIT_TIMEOUT = 4000;
const DATA_TIMEOUT = 4000;

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

const web = {
  name: 'web',
  async init() { return true; },
  ready() {},
  gameplayStart() {},
  gameplayStop() {},
  lang() { return null; },
  async cloudLoad() { return null; },
  async cloudSave() { return false; },
  rewarded: null,      // null = this platform has no ads, AdService uses its stub
  interstitial: null
};

// Playgama Bridge v2. The bridge ships inside the archive, so it exists as a
// global before the game runs; module getters must not be touched before
// initialize(), which is why detection only looks for the object itself.
const CLOUD_KEY = 'sort-garden-save';

const playgama = {
  name: 'playgama',
  bridge: null,

  async init() {
    const bridge = window.bridge || window.playgamaBridge;
    if (!bridge) return false;
    // Stay on this adapter even if initialize() is slow or fails: the bridge
    // owns the platform loader, and abandoning it leaves that overlay on top
    // of the game forever. Every call below is guarded instead.
    this.bridge = bridge;
    await withTimeout(
      Promise.resolve()
        .then(() => bridge.initialize())
        .then(() => true)
        .catch(() => false),
      INIT_TIMEOUT,
      false
    );
    return true;
  },

  live() {
    try { return !!(this.bridge && this.bridge.isInitialized); } catch (e) { return false; }
  },

  // The bridge owns a full-screen loader it only lifts once the platform
  // answers. If the portal SDK never loads (ad blocker, dead CDN) that overlay
  // would sit on top of a perfectly playable game, so it is cleared by hand.
  clearStuckLoader() {
    try {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.remove();
    } catch (e) { /* ignore */ }
  },

  // sendMessage returns a promise; an unhandled rejection lands in the console
  // the platform reads, so every call is caught
  send(message) {
    if (!this.live()) return;  // touching a module before init only logs noise
    try {
      const result = this.bridge.platform.sendMessage(message);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (e) { /* ignore */ }
  },

  // game_ready lifts the platform loader, so keep trying while the portal SDK
  // is still coming up rather than losing the signal to a slow network
  ready() {
    if (this.live()) { this.send('game_ready'); return; }
    let tries = 0;
    const timer = setInterval(() => {
      if (this.live()) { clearInterval(timer); this.send('game_ready'); return; }
      tries += 1;
      if (tries === 2) this.clearStuckLoader(); // ~1s without an answer: the game is already up
      if (tries > 40) clearInterval(timer);
    }, 500);
  },
  gameplayStart() { this.send('gameplay_started'); },
  gameplayStop() { this.send('gameplay_stopped'); },

  lang() {
    if (!this.live()) return null;
    try { return (this.bridge.platform.language || '').slice(0, 2).toLowerCase() || null; } catch (e) { return null; }
  },

  async cloudLoad() {
    if (!this.live()) return null;
    try {
      const value = await withTimeout(this.bridge.storage.get(CLOUD_KEY), DATA_TIMEOUT, null);
      return value || null;
    } catch (e) {
      return null;
    }
  },

  async cloudSave(payload) {
    if (!this.live()) return false;
    try {
      await withTimeout(this.bridge.storage.set(CLOUD_KEY, payload), DATA_TIMEOUT, false);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Both formats report completion through an event, never through the call.
  // Support flags are read at show time: the QA tool enables formats one by one.
  showAd(kind) {
    return new Promise((resolve) => {
      if (!this.live()) { resolve(false); return; }
      let ad;
      try { ad = this.bridge.advertisement; } catch (e) { resolve(false); return; }
      const rewarded = kind === 'rewarded';
      const supported = rewarded ? ad.isRewardedSupported : ad.isInterstitialSupported;
      if (!supported) { resolve(false); return; }

      const event = rewarded ? 'rewarded_state_changed' : 'interstitial_state_changed';
      let granted = false;
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        try { ad.off(event, onState); } catch (e) { /* ignore */ }
        resolve(value);
      };
      const onState = (state) => {
        if (state === 'rewarded') granted = true;        // the only signal that pays
        if (state === 'closed') finish(rewarded ? granted : true);
        if (state === 'failed') finish(false);
      };
      const guard = setTimeout(
        () => finish(rewarded ? granted : false),
        rewarded ? AD_TIMEOUT.rewarded : AD_TIMEOUT.interstitial
      );

      try {
        ad.on(event, onState);
        if (rewarded) ad.showRewarded();
        else ad.showInterstitial();
      } catch (e) {
        finish(false);
      }
    });
  },

  rewardedSupported() {
    if (!this.live()) return false;
    try { return !!this.bridge.advertisement.isRewardedSupported; } catch (e) { return false; }
  },

  rewarded() { return this.showAd('rewarded'); },
  interstitial() { return this.showAd('interstitial'); }
};

const yandex = {
  name: 'yandex',
  sdk: null,

  async init() {
    if (!window.YaGames) return false;
    const sdk = await withTimeout(window.YaGames.init(), INIT_TIMEOUT, null);
    if (!sdk) return false;
    this.sdk = sdk;
    try {
      this.player = await withTimeout(sdk.getPlayer({ scopes: false }), DATA_TIMEOUT, null);
    } catch (e) {
      this.player = null;
    }
    return true;
  },

  ready() {
    try { this.sdk.features.LoadingAPI.ready(); } catch (e) { /* older SDK */ }
  },

  gameplayStart() {
    try { this.sdk.features.GameplayAPI.start(); } catch (e) { /* older SDK */ }
  },

  gameplayStop() {
    try { this.sdk.features.GameplayAPI.stop(); } catch (e) { /* older SDK */ }
  },

  lang() {
    try { return (this.sdk.environment.i18n.lang || '').slice(0, 2).toLowerCase() || null; } catch (e) { return null; }
  },

  async cloudLoad() {
    if (!this.player) return null;
    try {
      const data = await withTimeout(this.player.getData(['save']), DATA_TIMEOUT, null);
      return data && data.save ? data.save : null;
    } catch (e) {
      return null;
    }
  },

  async cloudSave(payload) {
    if (!this.player) return false;
    try {
      await withTimeout(this.player.setData({ save: payload }, true), DATA_TIMEOUT, false);
      return true;
    } catch (e) {
      return false;
    }
  },

  rewarded() {
    return new Promise((resolve) => {
      let granted = false;
      let done = false;
      const finish = (value) => { if (!done) { done = true; resolve(value); } };
      const guard = setTimeout(() => finish(granted), AD_TIMEOUT.rewarded);
      try {
        this.sdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => { granted = true; },              // the reward is granted here and nowhere else
            onClose: () => { clearTimeout(guard); finish(granted); },
            onError: () => { clearTimeout(guard); finish(false); }
          }
        });
      } catch (e) {
        clearTimeout(guard);
        finish(false);
      }
    });
  },

  interstitial() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => { if (!done) { done = true; resolve(value); } };
      const guard = setTimeout(() => finish(false), AD_TIMEOUT.interstitial);
      try {
        this.sdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => { clearTimeout(guard); finish(!!wasShown); },
            onError: () => { clearTimeout(guard); finish(false); }
          }
        });
      } catch (e) {
        clearTimeout(guard);
        finish(false);
      }
    });
  }
};

let active = web;
let readyCalled = false;
let gameplayActive = false;

function detect() {
  if (OVERRIDE === 'web') return web;
  if (OVERRIDE === 'yandex') return yandex;
  if (OVERRIDE === 'playgama') return playgama;
  // object presence only — module getters complain before initialize()
  if (window.bridge || window.playgamaBridge) return playgama;
  if (window.YaGames) return yandex;
  return web;
}

export async function initPlatform() {
  const candidate = detect();
  let ok = false;
  try {
    ok = await candidate.init();
  } catch (e) {
    ok = false;
  }
  active = ok ? candidate : web;
  return active.name;
}

export function platformName() {
  return active.name;
}

// Called once, when the first screen is on screen and accepting input.
export function signalReady() {
  if (readyCalled) return;
  readyCalled = true;
  try { active.ready(); } catch (e) { /* ignore */ }
}

// Single funnel: the platform only hears about real changes, never two
// stops in a row (leaving to the menu from an open pause would send two).
export function reportGameplay(playing) {
  const next = !!playing;
  if (next === gameplayActive) return;
  gameplayActive = next;
  try {
    if (next) active.gameplayStart();
    else active.gameplayStop();
  } catch (e) { /* ignore */ }
}

export function isGameplayActive() {
  return gameplayActive;
}

export function platformLang() {
  try { return active.lang(); } catch (e) { return null; }
}

export function cloudLoad() {
  return active.cloudLoad();
}

export function cloudSave(payload) {
  return active.cloudSave(payload);
}

// Portals enable ad formats independently, so the answer is asked live rather
// than cached; without a portal the stub grants and the buttons stay usable.
export function rewardedSupported() {
  try { return active.rewardedSupported ? active.rewardedSupported() : true; } catch (e) { return true; }
}

export function platformAds() {
  return active.rewarded ? { rewarded: () => active.rewarded(), interstitial: () => active.interstitial() } : null;
}

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
  if (OVERRIDE === 'yandex' || window.YaGames) return yandex;
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

export function platformAds() {
  return active.rewarded ? { rewarded: () => active.rewarded(), interstitial: () => active.interstitial() } : null;
}

import { state, persist, todayKey } from './state.js';
import { track } from './analytics.js';
import { t } from './i18n.js';
import * as Sound from './audio.js';
import { toast, openModalsCount } from '../ui/components.js';
import { icon } from '../ui/icons.js';

/* ---------------- reward sources ---------------- */

export const REWARD_SOURCES = {
  prelevel_booster: { limit: 1, scope: 'level' },
  extra_tube: { limit: 1, scope: 'level' },
  extra_moves: { limit: 2, scope: 'level' },
  undo_pack: { limit: 1, scope: 'level' },
  hint_pack: { limit: 1, scope: 'level' },
  safe_shuffle: { limit: 1, scope: 'level' },
  auto_move: { limit: 1, scope: 'level' },
  magic_leaf: { limit: 1, scope: 'level' },
  win_double: { limit: 1, scope: 'level' },
  bonus_chest: { limit: 1, scope: 'level' },
  daily_double: { limit: 1, scope: 'day' },
  daily_extra: { limit: 1, scope: 'day' },
  cat_helper: { limit: 1, scope: 'level' },
  cosmetic_trial: { limit: 1, scope: 'cooldown', cooldownMs: 30 * 60 * 1000 },
  offline_double: { limit: 1, scope: 'day' },
  event_boost: { limit: 1, scope: 'day' },
  sticker_pack: { limit: 1, scope: 'day' },
  garden_gift: { limit: 1, scope: 'day' }
};

export const INTERSTITIAL_SOURCES = ['level_complete', 'fail_exit', 'bonus_room', 'garden_milestone'];

const MIN_INTERSTITIAL_GAP = 150000;
const MAX_INTERSTITIAL_SESSION = 4;
const MIN_INTERSTITIAL_LEVEL = 4;

let sessionShows = { garden_milestone: 0, bonus_room: 0 };
let busy = false;
let lastRewardedClose = 0;

/* ---------------- platform adapters ---------------- */

function detectPlatform() {
  try {
    if (window.YaGames) return 'yandex';
    if (window.CrazyGames && window.CrazyGames.SDK) return 'crazygames';
    if (window.bridge && window.bridge.advertisement) return 'playgama';
  } catch (e) { /* ignore */ }
  return 'fallback';
}

const stub = {
  name: 'fallback',
  async init() { return true; },
  // no SDK: the reward is granted so the game stays playable everywhere
  rewarded() { return wait(600 + Math.random() * 400).then(() => true); },
  interstitial() { return wait(800).then(() => true); }
};

const adapters = {
  yandex: {
    name: 'yandex',
    sdk: null,
    async init() {
      this.sdk = await window.YaGames.init();
      try { await this.sdk.features.LoadingAPI.ready(); } catch (e) { /* optional */ }
      return true;
    },
    rewarded() {
      return new Promise((resolve) => {
        let granted = false;
        try {
          this.sdk.adv.showRewardedVideo({
            callbacks: {
              onRewarded: () => { granted = true; },
              onClose: () => resolve(granted),
              onError: () => resolve(false)
            }
          });
        } catch (e) { resolve(false); }
      });
    },
    interstitial() {
      return new Promise((resolve) => {
        try {
          this.sdk.adv.showFullscreenAdv({
            callbacks: {
              onClose: (wasShown) => resolve(!!wasShown),
              onError: () => resolve(false)
            }
          });
        } catch (e) { resolve(false); }
      });
    }
  },

  crazygames: {
    name: 'crazygames',
    async init() {
      try { await window.CrazyGames.SDK.init(); } catch (e) { /* optional */ }
      return true;
    },
    rewarded() {
      return new Promise((resolve) => {
        try {
          window.CrazyGames.SDK.ad.requestAd('rewarded', {
            adFinished: () => resolve(true),
            adError: () => resolve(false)
          });
        } catch (e) { resolve(false); }
      });
    },
    interstitial() {
      return new Promise((resolve) => {
        try {
          window.CrazyGames.SDK.ad.requestAd('midgame', {
            adFinished: () => resolve(true),
            adError: () => resolve(false)
          });
        } catch (e) { resolve(false); }
      });
    }
  },

  playgama: {
    name: 'playgama',
    async init() {
      try { await window.bridge.initialize(); } catch (e) { /* optional */ }
      return true;
    },
    rewarded() {
      return new Promise((resolve) => {
        let granted = false;
        try {
          const br = window.bridge;
          const onState = (s) => {
            if (s === 'rewarded') granted = true;
            if (s === 'closed' || s === 'failed') {
              try { br.advertisement.off('rewarded_state_changed', onState); } catch (e) { /* ignore */ }
              resolve(granted);
            }
          };
          br.advertisement.on('rewarded_state_changed', onState);
          br.advertisement.showRewarded();
        } catch (e) { resolve(false); }
      });
    },
    interstitial() {
      return new Promise((resolve) => {
        try {
          const br = window.bridge;
          const onState = (s) => {
            if (s === 'closed' || s === 'failed') {
              try { br.advertisement.off('interstitial_state_changed', onState); } catch (e) { /* ignore */ }
              resolve(s === 'closed');
            }
          };
          br.advertisement.on('interstitial_state_changed', onState);
          br.advertisement.showInterstitial();
        } catch (e) { resolve(false); }
      });
    }
  },

  fallback: stub
};

let adapter = stub;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function init() {
  const name = detectPlatform();
  adapter = adapters[name] || stub;
  try {
    await adapter.init();
  } catch (e) {
    adapter = stub;
  }
  track('ads_init', { platform: adapter.name });
}

export function platformName() {
  return adapter.name;
}

/* ---------------- reward limits ---------------- */

function usage(source) {
  const store = state.ads.rewardedCounts;
  if (!store[source]) store[source] = { n: 0, day: null, level: null, t: 0 };
  return store[source];
}

export function canUseReward(source) {
  const cfg = REWARD_SOURCES[source];
  if (!cfg) return false;
  if (busy) return false;
  const u = usage(source);
  if (cfg.scope === 'level') {
    if (u.level !== state.levelSession.levelNumber) return true;
    return u.n < cfg.limit;
  }
  if (cfg.scope === 'day') {
    if (u.day !== todayKey()) return true;
    return u.n < cfg.limit;
  }
  if (cfg.scope === 'cooldown') return Date.now() - u.t >= cfg.cooldownMs;
  return u.n < cfg.limit;
}

function noteReward(source) {
  const cfg = REWARD_SOURCES[source];
  const u = usage(source);
  const day = todayKey();
  const level = state.levelSession.levelNumber;
  if (cfg.scope === 'level' && u.level !== level) u.n = 0;
  if (cfg.scope === 'day' && u.day !== day) u.n = 0;
  u.n += 1;
  u.day = day;
  u.level = level;
  u.t = Date.now();
  persist();
}

/* ---------------- overlay ---------------- */

function overlay(text) {
  const box = document.createElement('div');
  box.className = 'ad-overlay';
  box.setAttribute('role', 'status');
  box.innerHTML = `<span class="icon icon--xl">${icon('reward')}</span><div>${text}</div>` +
    '<div class="dots"><span></span><span></span><span></span></div>';
  document.body.appendChild(box);
  return () => box.remove();
}

/* ---------------- public api ---------------- */

export async function showRewarded(source) {
  if (!REWARD_SOURCES[source]) return false;
  if (!canUseReward(source)) { toast(t('reward.used')); return false; }
  busy = true;
  track('reward_request', { source });
  Sound.duck(true);
  const close = overlay(t('reward.title'));
  let ok = false;
  try {
    ok = await adapter.rewarded();
  } catch (e) {
    ok = false;
  }
  close();
  Sound.duck(false);
  busy = false;
  lastRewardedClose = Date.now();
  if (ok) {
    noteReward(source);
    Sound.play('reward');
    track('reward_success', { source });
    toast(t('reward.success'));
  } else {
    track('reward_fail', { source });
    toast(t('reward.fail'));
  }
  return ok;
}

export function canShowInterstitial(source) {
  if (busy) return false;
  if (!INTERSTITIAL_SOURCES.includes(source)) return false;
  if (!state.tutorialDone) return false;
  if (state.level < MIN_INTERSTITIAL_LEVEL) return false;
  if (state.screen === 'level') return false;
  if (openModalsCount() > 0) return false;
  if (state.ads.interstitialShowsSession >= MAX_INTERSTITIAL_SESSION) return false;
  if (Date.now() - state.ads.lastInterstitialTime < MIN_INTERSTITIAL_GAP) return false;
  if (Date.now() - lastRewardedClose < 20000) return false;
  if (source === 'level_complete' && state.ads.levelsSinceLastInterstitial < 3) return false;
  if (source === 'garden_milestone' && sessionShows.garden_milestone >= 1) return false;
  if (source === 'fail_exit' && state.ads.levelsSinceLastInterstitial < 1) return false;
  return true;
}

export async function showInterstitial(source) {
  track('interstitial_request', { source });
  if (!canShowInterstitial(source)) {
    track('interstitial_skip_or_fail', { source, reason: 'blocked' });
    return false;
  }
  busy = true;
  Sound.duck(true);
  const close = overlay(t('interstitial.pause'));
  let ok = false;
  try {
    ok = await adapter.interstitial();
  } catch (e) {
    ok = false;
  }
  close();
  Sound.duck(false);
  busy = false;
  if (ok) {
    state.ads.lastInterstitialTime = Date.now();
    state.ads.lastInterstitialLevel = state.level;
    state.ads.levelsSinceLastInterstitial = 0;
    state.ads.interstitialShowsSession += 1;
    if (sessionShows[source] !== undefined) sessionShows[source] += 1;
    persist();
    track('interstitial_show', { source });
  } else {
    track('interstitial_skip_or_fail', { source, reason: 'unavailable' });
  }
  return ok;
}

export function reportReward(source, success) {
  track(success ? 'reward_success' : 'reward_fail', { source, reported: true });
}

export function isBusy() {
  return busy;
}

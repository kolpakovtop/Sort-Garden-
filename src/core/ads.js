import { state, persist, todayKey } from './state.js';
import { track } from './analytics.js';
import { t } from './i18n.js';
import * as Sound from './audio.js';
import { toast, openModalsCount } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { platformAds, platformName as portalName, reportGameplay, isGameplayActive } from './platform.js';

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
const shows = { rewarded: 0, interstitial: 0 };

export function adShowCounts() {
  return { ...shows };
}

export function resetAdCounts() {
  shows.rewarded = 0;
  shows.interstitial = 0;
}

// Pure gate, so the limits can be unit-tested without a DOM or a live state.
export function interstitialAllowed(ctx, now = Date.now()) {
  const {
    source, level = 1, tutorialDone = false, screen = 'menu', openModals = 0,
    showsSession = 0, lastTime = 0, levelsSince = 0, lastRewardedAt = 0,
    gardenMilestoneShows = 0, busy: isBusy = false
  } = ctx || {};
  if (isBusy) return false;
  if (!INTERSTITIAL_SOURCES.includes(source)) return false;
  if (!tutorialDone) return false;
  if (level < MIN_INTERSTITIAL_LEVEL) return false;
  if (screen === 'level') return false;
  if (openModals > 0) return false;
  if (showsSession >= MAX_INTERSTITIAL_SESSION) return false;
  if (now - lastTime < MIN_INTERSTITIAL_GAP) return false;
  if (now - lastRewardedAt < 20000) return false;
  if (source === 'level_complete' && levelsSince < 3) return false;
  if (source === 'garden_milestone' && gardenMilestoneShows >= 1) return false;
  if (source === 'fail_exit' && levelsSince < 1) return false;
  return true;
}

/* ---------------- platform adapters ---------------- */

function detectPlatform() {
  try {
    if (portalName() === 'yandex') return 'yandex';
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
  // The Yandex SDK lives in platform.js: one owner for init, ready,
  // gameplay reporting, cloud saves and ads.
  yandex: {
    name: 'yandex',
    async init() { return true; },
    rewarded() { const ads = platformAds(); return ads ? ads.rewarded() : Promise.resolve(false); },
    interstitial() { const ads = platformAds(); return ads ? ads.interstitial() : Promise.resolve(false); }
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
  const wasPlaying = isGameplayActive();
  reportGameplay(false);
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
  if (wasPlaying) reportGameplay(true);
  busy = false;
  lastRewardedClose = Date.now();
  if (ok) {
    shows.rewarded += 1;
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

export function canShowInterstitial(source, now = Date.now()) {
  return interstitialAllowed({
    source,
    level: state.level,
    tutorialDone: state.tutorialDone,
    screen: state.screen,
    openModals: openModalsCount(),
    showsSession: state.ads.interstitialShowsSession,
    lastTime: state.ads.lastInterstitialTime,
    levelsSince: state.ads.levelsSinceLastInterstitial,
    lastRewardedAt: lastRewardedClose,
    gardenMilestoneShows: sessionShows.garden_milestone,
    busy
  }, now);
}

export async function showInterstitial(source) {
  track('interstitial_request', { source });
  if (!canShowInterstitial(source)) {
    track('interstitial_skip_or_fail', { source, reason: 'blocked' });
    return false;
  }
  busy = true;
  reportGameplay(false); // interstitials only run outside gameplay anyway
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
    shows.interstitial += 1;
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

import { state } from './state.js';

const VOL = { master: 0.22, sfx: 0.18, music: 0.08 };

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let musicTimer = null;
let ready = false;
let ducked = false;

function build() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = VOL.master;
    master.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = VOL.sfx;
    sfxBus.connect(master);

    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 900;
    musicBus = ctx.createGain();
    musicBus.gain.value = VOL.music;
    musicBus.connect(musicFilter);
    musicFilter.connect(master);
    return true;
  } catch (e) {
    ctx = null;
    return false;
  }
}

export function unlock() {
  if (!build()) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* ignore */ }
  ready = true;
  syncMusic();
}

export function isReady() {
  return ready && !!ctx;
}

function tone({ type = 'sine', freq = 440, to = null, dur = 0.12, gain = 0.6, attack = 0.005, delay = 0 }) {
  if (!ready || !ctx) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch (e) { /* ignore */ }
}

const SFX = {
  tap: () => tone({ type: 'sine', freq: 480, dur: 0.07, gain: 0.5, attack: 0.005 }),
  move: () => tone({ type: 'triangle', freq: 320, to: 260, dur: 0.1, gain: 0.55 }),
  invalid: () => tone({ type: 'sine', freq: 170, dur: 0.13, gain: 0.16 }),
  coin: () => {
    tone({ type: 'sine', freq: 880, dur: 0.08, gain: 0.32 });
    tone({ type: 'sine', freq: 1175, dur: 0.1, gain: 0.26, delay: 0.06 });
  },
  win: () => {
    [392, 494, 587].forEach((f, i) => tone({ type: 'sine', freq: f, dur: 0.5, gain: 0.34, attack: 0.03, delay: i * 0.12 }));
  },
  reward: () => {
    [659, 784, 988].forEach((f, i) => tone({ type: 'sine', freq: f, dur: 0.34, gain: 0.26, attack: 0.02, delay: i * 0.1 }));
  },
  open: () => tone({ type: 'sine', freq: 560, to: 660, dur: 0.1, gain: 0.32 })
};

export function play(name) {
  if (!ready || !ctx) return;
  if (!state.settings.sound) return;
  const fn = SFX[name];
  if (fn) fn();
}

/* --- generative background music: rare, soft pentatonic notes --- */

const SCALE = [220.0, 246.9, 293.7, 329.6, 392.0, 440.0, 587.3];
let lastNote = -1;

function musicNote() {
  if (!ctx || !musicBus) return;
  try {
    const t0 = ctx.currentTime + 0.05;
    let i = Math.floor(Math.random() * SCALE.length);
    if (i === lastNote) i = (i + 1) % SCALE.length;
    lastNote = i;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = Math.random() < 0.35 ? 'triangle' : 'sine';
    osc.frequency.value = SCALE[i];
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 1.1);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 3.6);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(t0);
    osc.stop(t0 + 3.8);
  } catch (e) { /* ignore */ }
}

function scheduleNext() {
  const delay = 1800 + Math.random() * 2600;
  musicTimer = setTimeout(() => {
    if (!musicOn()) { musicTimer = null; return; }
    musicNote();
    scheduleNext();
  }, delay);
}

function musicOn() {
  return ready && !!ctx && state.settings.music && !ducked && document.visibilityState !== 'hidden';
}

export function syncMusic() {
  if (musicOn()) {
    if (!musicTimer) { musicNote(); scheduleNext(); }
  } else if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (musicBus && ctx) {
    try {
      musicBus.gain.setTargetAtTime(state.settings.music ? VOL.music : 0, ctx.currentTime, 0.3);
    } catch (e) { /* ignore */ }
  }
}

// Used around ads: the portal requires the game to be silent for the video,
// so the context is suspended, not just turned down.
export function duck(on) {
  ducked = !!on;
  if (!ctx || !master) return;
  try {
    master.gain.setTargetAtTime(on ? 0.0001 : VOL.master, ctx.currentTime, 0.12);
  } catch (e) { /* ignore */ }
  if (on) pauseAll();
  else resumeAll();
  syncMusic();
}

export function pauseAll() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  if (!ctx) return;
  try { if (ctx.state === 'running') ctx.suspend(); } catch (e) { /* ignore */ }
}

export function resumeAll() {
  if (!ctx || !ready) return;
  try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* ignore */ }
  syncMusic();
}

import { state, persist, addCoins, todayKey } from '../core/state.js';
import { track } from '../core/analytics.js';
import { t } from '../core/i18n.js';

export const DECOR = [
  { id: 'flower', price: 120 },
  { id: 'bush', price: 180 },
  { id: 'bench', price: 240 },
  { id: 'lantern', price: 320 },
  { id: 'path', price: 420 },
  { id: 'fountain', price: 520 },
  { id: 'catHouse', price: 640 },
  { id: 'tree', price: 800 }
];

export const BOOSTER_SHOP = [
  { id: 'hint', price: 50, icon: 'hint' },
  { id: 'undo', price: 40, icon: 'undo' },
  { id: 'shuffle', price: 80, icon: 'shuffle' },
  { id: 'tube', price: 100, icon: 'plus' },
  { id: 'leaf', price: 120, icon: 'leaf' }
];

export const CATS = [
  { id: 'ryzhik', level: 5, nameKey: 'cats.ryzhik', bonusKey: 'cats.ryzhikBonus' },
  { id: 'luna', level: 10, nameKey: 'cats.luna', bonusKey: 'cats.lunaBonus' },
  { id: 'moma', level: 15, nameKey: 'cats.moma', bonusKey: 'cats.momaBonus' }
];

export const THEMES = ['default', 'dusk', 'sand'];

export const DAILY_COINS = [30, 40, 50, 60, 80, 100, 150];

export const TASKS = [
  { id: 'levels', goal: 3, labelKey: 'tasks.levels', reward: 20 },
  { id: 'booster', goal: 1, labelKey: 'tasks.booster', reward: 20 },
  { id: 'decor', goal: 1, labelKey: 'tasks.decor', reward: 20 }
];

export function hasCat(id) {
  return state.meta.catsUnlocked.includes(id);
}

export function checkCatUnlocks(level) {
  const unlocked = [];
  for (const cat of CATS) {
    if (level >= cat.level && !hasCat(cat.id)) {
      state.meta.catsUnlocked.push(cat.id);
      unlocked.push(cat);
    }
  }
  if (unlocked.length) persist();
  return unlocked;
}

/* ---------------- theme ---------------- */

export function activeThemeId() {
  const trial = state.meta.themeTrial;
  if (trial.active && trial.levelsLeft > 0 && trial.themeId) return trial.themeId;
  return state.meta.activeTheme || 'default';
}

export function applyTheme() {
  const id = activeThemeId();
  if (id === 'default') document.body.removeAttribute('data-theme');
  else document.body.setAttribute('data-theme', id);
}

export function startThemeTrial(themeId) {
  state.meta.themeTrial = { active: true, themeId, levelsLeft: 3 };
  persist();
  applyTheme();
}

export function tickThemeTrial() {
  const trial = state.meta.themeTrial;
  if (!trial.active) return;
  trial.levelsLeft -= 1;
  if (trial.levelsLeft <= 0) state.meta.themeTrial = { active: false, themeId: null, levelsLeft: 0 };
  persist();
  applyTheme();
}

/* ---------------- decor ---------------- */

export function ownsDecor(id) {
  return state.meta.ownedDecor.includes(id);
}

export function addDecor(id) {
  if (ownsDecor(id)) return false;
  state.meta.ownedDecor.push(id);
  taskProgress('decor', 1);
  track('decor_purchase', { id });
  persist();
  return true;
}

/* ---------------- daily tasks ---------------- */

export function ensureTasks() {
  const day = todayKey();
  if (state.daily.tasksDate !== day || !Array.isArray(state.daily.tasks) || !state.daily.tasks.length) {
    state.daily.tasksDate = day;
    state.daily.tasks = TASKS.map((task) => ({ id: task.id, goal: task.goal, progress: 0 }));
    state.daily.claimedTaskIds = [];
    persist();
  }
  return state.daily.tasks;
}

export function taskProgress(id, amount = 1) {
  ensureTasks();
  const task = state.daily.tasks.find((x) => x.id === id);
  if (!task) return;
  if (task.progress >= task.goal) return;
  task.progress = Math.min(task.goal, task.progress + amount);
  persist();
}

export function taskReady(id) {
  const task = state.daily.tasks.find((x) => x.id === id);
  return !!task && task.progress >= task.goal && !state.daily.claimedTaskIds.includes(id);
}

export function tasksReadyCount() {
  ensureTasks();
  return state.daily.tasks.filter((task) => taskReady(task.id)).length;
}

export function claimTask(id) {
  if (!taskReady(id)) return 0;
  const def = TASKS.find((x) => x.id === id);
  state.daily.claimedTaskIds.push(id);
  addCoins(def.reward, 'task');
  track('task_claim', { id });
  return def.reward;
}

/* ---------------- daily gift ---------------- */

function dayShift(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return todayKey(date);
}

export function dailyState() {
  const today = todayKey();
  const last = state.daily.lastClaimDate;
  const claimedToday = last === today;
  let streak = state.daily.streak || 0;
  if (!claimedToday && last && dayShift(last, 1) !== today) streak = 0; // missed a day: gentle restart
  const dayIndex = claimedToday ? Math.max(0, streak - 1) % 7 : streak % 7;
  return { claimedToday, streak, dayIndex, amount: DAILY_COINS[dayIndex] + (hasCat('moma') ? 10 : 0) };
}

export function claimDaily() {
  const info = dailyState();
  if (info.claimedToday) return 0;
  state.daily.streak = (info.streak % 7) + 1;
  state.daily.lastClaimDate = todayKey();
  addCoins(info.amount, 'daily');
  track('daily_claim', { amount: info.amount, streak: state.daily.streak });
  persist();
  return info.amount;
}

/* ---------------- offline income ---------------- */

const OFFLINE_CAP_MS = 2 * 60 * 60 * 1000;

export function offlineCoins() {
  const decor = state.meta.ownedDecor.length;
  if (!decor) return 0;
  const last = state.offline.lastSeenTime || Date.now();
  const elapsed = Math.min(OFFLINE_CAP_MS, Math.max(0, Date.now() - last));
  return Math.floor(elapsed / (10 * 60 * 1000)) * decor;
}

export function markSeen() {
  state.offline.lastSeenTime = Date.now();
  persist();
}

export function claimOffline(multiplier = 1) {
  const coins = state.offline.pendingOfflineCoins * multiplier;
  state.offline.pendingOfflineCoins = 0;
  markSeen();
  if (coins > 0) addCoins(coins, 'offline');
  return coins;
}

/* ---------------- stickers ---------------- */

const STICKER_NAMES = ['leaf', 'star', 'flower', 'cat', 'lantern', 'drop', 'tree', 'coin'];

export function addSticker() {
  const owned = state.meta.stickers;
  const next = STICKER_NAMES.find((name) => !owned.includes(name)) || STICKER_NAMES[owned.length % STICKER_NAMES.length];
  if (!owned.includes(next)) owned.push(next);
  persist();
  return next;
}

export function catName(id) {
  const cat = CATS.find((c) => c.id === id);
  return cat ? t(cat.nameKey) : id;
}

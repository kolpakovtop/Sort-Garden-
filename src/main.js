import './styles.css';
import { state, loadState, persist } from './core/state.js';
import { track } from './core/analytics.js';
import * as Sound from './core/audio.js';
import * as Ads from './core/ads.js';
import { initRouter, go, current } from './core/router.js';
import { mountScene } from './ui/scene.js';
import * as Meta from './game/meta.js';
import { applyTheme, ensureTasks, markSeen } from './game/meta.js';
import { installDebug } from './core/debug.js';
import { LevelScreen } from './screens/level.js';
import {
  BootScreen, MenuScreen, ResultScreen, GardenScreen,
  ShopScreen, DailyScreen, TasksScreen, RewardsScreen, SettingsScreen
} from './screens/screens.js';

loadState();
document.documentElement.lang = state.settings.lang;
applyTheme();
ensureTasks();

initRouter(document.getElementById('app'), {
  boot: BootScreen,
  menu: MenuScreen,
  level: LevelScreen,
  result: ResultScreen,
  garden: GardenScreen,
  shop: ShopScreen,
  daily: DailyScreen,
  tasks: TasksScreen,
  rewards: RewardsScreen,
  settings: SettingsScreen
});

installDebug({ state, persist, ads: Ads, meta: Meta, router: { go } });
track('app_start', { level: state.level, coins: state.coins });
go('boot');
Ads.init();
setTimeout(() => { if (current() === 'boot') go('menu'); }, 700);

// audio needs a user gesture before it can make a sound
function unlockAudio() {
  Sound.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
  window.removeEventListener('touchend', unlockAudio);
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchend', unlockAudio);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    markSeen();
    persist();
    Sound.pauseAll();
  } else {
    Sound.resumeAll();
  }
});

window.addEventListener('blur', () => Sound.pauseAll());
window.addEventListener('focus', () => Sound.resumeAll());
window.addEventListener('pagehide', () => { markSeen(); persist(); });

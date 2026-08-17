import './styles.css';
import { state, loadState, persist, adoptCloudSave, flushCloud } from './core/state.js';
import { track } from './core/analytics.js';
import * as Sound from './core/audio.js';
import * as Ads from './core/ads.js';
import { initRouter, go, current } from './core/router.js';
import { initPlatform, signalReady, reportGameplay, platformLang, platformName } from './core/platform.js';
import { mountScene } from './ui/scene.js';
import * as Meta from './game/meta.js';
import { applyTheme, ensureTasks, markSeen } from './game/meta.js';
import { installDebug } from './core/debug.js';
import { setLang } from './core/i18n.js';
import { LevelScreen } from './screens/level.js';
import {
  BootScreen, MenuScreen, ResultScreen, GardenScreen,
  ShopScreen, DailyScreen, TasksScreen, RewardsScreen, SettingsScreen
} from './screens/screens.js';

const SCREENS = {
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
};

// local save first so the game can start even if the portal never answers
loadState();
const hadLocalSave = !!state.savedAt;
document.documentElement.lang = state.settings.lang;
applyTheme();
initRouter(document.getElementById('app'), SCREENS);
go('boot');

async function bootstrap() {
  const portal = await initPlatform();

  // the portal locale is the default for a new player; an explicit choice wins
  if (!hadLocalSave) {
    const lang = platformLang();
    if (lang) setLang(lang);
  }
  document.documentElement.lang = state.settings.lang;

  await adoptCloudSave();
  ensureTasks();
  applyTheme();

  installDebug({ state, persist, ads: Ads, meta: Meta, router: { go } });
  await Ads.init();
  track('app_start', { level: state.level, coins: state.coins, portal });

  go('menu');
  // the platform loader is dismissed only once a screen is really interactive
  requestAnimationFrame(() => signalReady());
}

bootstrap();

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

// no browser context menu over the game (§1.6)
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reportGameplay(false);
    markSeen();
    persist();
    Sound.pauseAll();
  } else {
    Sound.resumeAll();
    if (current() === 'level' && !document.querySelector('.modal')) reportGameplay(true);
  }
});

window.addEventListener('blur', () => { reportGameplay(false); Sound.pauseAll(); });
window.addEventListener('focus', () => {
  Sound.resumeAll();
  if (current() === 'level' && !document.querySelector('.modal')) reportGameplay(true);
});
window.addEventListener('pagehide', () => {
  reportGameplay(false);
  markSeen();
  persist();
  flushCloud();
});

if (platformName() === 'yandex') document.body.classList.add('is-portal');

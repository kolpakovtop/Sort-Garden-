import { state, persist } from './state.js';

const ru = {
  'app.title': 'Sort Garden',
  'app.subtitle': 'Волшебный сад сортировки',
  'app.loading': 'Сад просыпается…',

  'button.play': 'Играть',
  'button.garden': 'Сад',
  'button.shop': 'Магазин',
  'button.daily': 'Подарки',
  'button.tasks': 'Задания',
  'button.rewards': 'Награды',
  'button.settings': 'Настройки',
  'button.settingsShort': 'Опции',
  'button.back': 'Назад',
  'button.close': 'Закрыть',
  'button.continue': 'Продолжить',
  'button.later': 'Позже',
  'button.skip': 'Пропустить',
  'button.collect': 'Забрать',
  'button.double': 'Удвоить монеты',
  'button.watchBonus': 'Бонусный сундук',
  'button.menu': 'В меню',
  'button.buy': 'Купить',
  'button.owned': 'Куплено',
  'button.help': 'Помощь',
  'button.yes': 'Да',
  'button.no': 'Нет',

  'level.title': 'Уровень',
  'level.moves': 'Ходы',
  'level.coins': 'Монеты',
  'level.completed': 'Уровень пройден',
  'level.movesOut': 'Ходы закончились',
  'level.movesOutText': 'Хочешь немного помочь?',
  'level.extraMoves': '+5 ходов',
  'level.stuck': 'Ходов больше нет',
  'level.stuckText': 'Можно аккуратно перемешать банки.',
  'level.pause': 'Пауза',
  'level.pauseText': 'Выйти в меню? Уровень начнётся заново.',
  'level.goal': 'Собери банки по цвету',
  'level.reward': 'Награда за уровень',
  'level.stars': 'Звёзды',

  'tutorial.step1': 'Нажми на банку, откуда взять предмет.',
  'tutorial.step2': 'Теперь нажми на банку, куда положить.',
  'tutorial.step3': 'Собери все банки по одному цвету.',
  'tutorial.reward': 'Маленький подарок за знакомство: 20 монет.',
  'tutorial.idle': 'Начни с подсвеченной банки.',

  'reward.title': 'Небольшой ролик',
  'reward.text': 'Посмотри короткое видео и получи награду.',
  'reward.success': 'Награда получена',
  'reward.fail': 'Бонус пока недоступен',
  'reward.used': 'Уже получено',
  'reward.watch': 'Смотреть',

  'interstitial.pause': 'Небольшая пауза',

  'garden.title': 'Сад',
  'garden.coins': 'Монеты',
  'garden.offline': 'Пока тебя не было',
  'garden.offlineText': 'Сад собрал {n} монет.',
  'garden.empty': 'Здесь пока пусто. Украшения ждут в магазине.',
  'garden.gift': 'Подарок для сада',
  'garden.giftText': 'Немного монет для новых украшений.',
  'garden.decor': 'Украшений: {n}',

  'shop.title': 'Магазин',
  'shop.boosters': 'Бустеры',
  'shop.decor': 'Украшения',
  'shop.free': 'Бесплатные монеты',
  'shop.freeText': 'Небольшая порция монет за ролик.',
  'shop.trial': 'Примерить тему',
  'shop.trialText': 'Новый цвет сада на 3 уровня.',
  'shop.notEnough': 'Пока не хватает монет',
  'shop.bought': 'Готово',
  'shop.trialOn': 'Тема включена',

  'daily.title': 'Ежедневный подарок',
  'daily.short': 'Подарки',
  'daily.streak': 'Дней подряд: {n}',
  'daily.claimed': 'Возвращайся завтра',
  'daily.day': 'День {n}',
  'daily.extra': 'Ещё монеты',
  'daily.take': 'Забрать {n}',

  'tasks.title': 'Задания дня',
  'tasks.levels': 'Пройти 3 уровня',
  'tasks.booster': 'Использовать 1 бустер',
  'tasks.decor': 'Разместить 1 украшение',
  'tasks.done': 'Выполнено',

  'rewards.title': 'Награды',
  'rewards.event': 'Бонус недели',
  'rewards.eventText': 'Немного монет для сада.',
  'rewards.sticker': 'Наклейка',
  'rewards.stickerText': 'Новая наклейка в коллекцию.',
  'rewards.stickers': 'Коллекция: {n}',
  'rewards.cats': 'Котики',
  'rewards.locked': 'Откроется на уровне {n}',
  'rewards.newSticker': 'Новая наклейка: {name}',

  'settings.title': 'Настройки',
  'settings.sound': 'Звук',
  'settings.music': 'Музыка',
  'settings.language': 'Язык',
  'settings.reset': 'Сбросить прогресс',
  'settings.resetConfirm': 'Точно сбросить весь прогресс?',
  'settings.resetDone': 'Прогресс сброшен',
  'settings.theme': 'Тема',

  'booster.hint': 'Подсказка',
  'booster.undo': 'Отмена',
  'booster.tube': 'Банка',
  'booster.leaf': 'Лист',
  'booster.shuffle': 'Перемешать',
  'booster.auto': 'Авто-ход',
  'booster.helpTitle': 'Чем помочь?',
  'booster.hintPack': '+3 подсказки',
  'booster.undoPack': '+3 отмены',
  'booster.none': 'Хороший ход не нашёлся',
  'booster.tubeAdded': 'Появилась новая банка',
  'booster.shuffled': 'Банки перемешаны',
  'booster.noUndo': 'Нечего отменять',

  'prelevel.title': 'Помощники',
  'prelevel.booster': 'Бустер перед уровнем',
  'prelevel.cat': 'Котик-помощник',
  'prelevel.catText': 'Подскажет ход на следующем уровне.',
  'prelevel.ready': 'Помощник готов к уровню',

  'cats.title': 'Котики',
  'cats.ryzhik': 'Рыжик',
  'cats.ryzhikBonus': '+5 монет за уровень',
  'cats.luna': 'Луна',
  'cats.lunaBonus': 'Первая подсказка бесплатно',
  'cats.moma': 'Мома',
  'cats.momaBonus': '+10 монет к подарку дня',
  'cats.new': 'Новый котик: {name}',

  'decor.flower': 'Цветок',
  'decor.bush': 'Кустик',
  'decor.bench': 'Скамейка',
  'decor.lantern': 'Фонарик',
  'decor.path': 'Дорожка',
  'decor.fountain': 'Фонтан',
  'decor.catHouse': 'Домик кота',
  'decor.tree': 'Дерево',

  'theme.default': 'Тёплая',
  'theme.dusk': 'Сумерки',
  'theme.sand': 'Песок'
};

const en = {
  'app.title': 'Sort Garden',
  'app.subtitle': 'A calm sorting garden',
  'app.loading': 'The garden is waking up…',

  'button.play': 'Play',
  'button.garden': 'Garden',
  'button.shop': 'Shop',
  'button.daily': 'Gifts',
  'button.tasks': 'Tasks',
  'button.rewards': 'Rewards',
  'button.settings': 'Settings',
  'button.settingsShort': 'Options',
  'button.back': 'Back',
  'button.close': 'Close',
  'button.continue': 'Continue',
  'button.later': 'Later',
  'button.skip': 'Skip',
  'button.collect': 'Collect',
  'button.double': 'Double coins',
  'button.watchBonus': 'Bonus chest',
  'button.menu': 'Menu',
  'button.buy': 'Buy',
  'button.owned': 'Owned',
  'button.help': 'Help',
  'button.yes': 'Yes',
  'button.no': 'No',

  'level.title': 'Level',
  'level.moves': 'Moves',
  'level.coins': 'Coins',
  'level.completed': 'Level complete',
  'level.movesOut': 'Out of moves',
  'level.movesOutText': 'Would you like a little help?',
  'level.extraMoves': '+5 moves',
  'level.stuck': 'No moves left',
  'level.stuckText': 'We can gently shuffle the jars.',
  'level.pause': 'Pause',
  'level.pauseText': 'Leave to the menu? The level restarts.',
  'level.goal': 'Sort the jars by colour',
  'level.reward': 'Level reward',
  'level.stars': 'Stars',

  'tutorial.step1': 'Tap a jar to pick up an item.',
  'tutorial.step2': 'Now tap a jar to place it.',
  'tutorial.step3': 'Collect every jar in one colour.',
  'tutorial.reward': 'A small welcome gift: 20 coins.',
  'tutorial.idle': 'Start with the highlighted jar.',

  'reward.title': 'Short video',
  'reward.text': 'Watch a short video and get the reward.',
  'reward.success': 'Reward received',
  'reward.fail': 'Bonus is not available yet',
  'reward.used': 'Already claimed',
  'reward.watch': 'Watch',

  'interstitial.pause': 'A short break',

  'garden.title': 'Garden',
  'garden.coins': 'Coins',
  'garden.offline': 'While you were away',
  'garden.offlineText': 'The garden collected {n} coins.',
  'garden.empty': 'Still empty here. Decorations wait in the shop.',
  'garden.gift': 'Garden gift',
  'garden.giftText': 'A few coins for new decorations.',
  'garden.decor': 'Decorations: {n}',

  'shop.title': 'Shop',
  'shop.boosters': 'Boosters',
  'shop.decor': 'Decorations',
  'shop.free': 'Free coins',
  'shop.freeText': 'A small handful of coins for a video.',
  'shop.trial': 'Try a theme',
  'shop.trialText': 'A new garden colour for 3 levels.',
  'shop.notEnough': 'Not enough coins yet',
  'shop.bought': 'Done',
  'shop.trialOn': 'Theme is on',

  'daily.title': 'Daily gift',
  'daily.short': 'Gifts',
  'daily.streak': 'Days in a row: {n}',
  'daily.claimed': 'Come back tomorrow',
  'daily.day': 'Day {n}',
  'daily.extra': 'Extra coins',
  'daily.take': 'Collect {n}',

  'tasks.title': 'Daily tasks',
  'tasks.levels': 'Finish 3 levels',
  'tasks.booster': 'Use 1 booster',
  'tasks.decor': 'Place 1 decoration',
  'tasks.done': 'Done',

  'rewards.title': 'Rewards',
  'rewards.event': 'Weekly bonus',
  'rewards.eventText': 'Some coins for the garden.',
  'rewards.sticker': 'Sticker',
  'rewards.stickerText': 'A new sticker for the collection.',
  'rewards.stickers': 'Collection: {n}',
  'rewards.cats': 'Cats',
  'rewards.locked': 'Unlocks at level {n}',
  'rewards.newSticker': 'New sticker: {name}',

  'settings.title': 'Settings',
  'settings.sound': 'Sound',
  'settings.music': 'Music',
  'settings.language': 'Language',
  'settings.reset': 'Reset progress',
  'settings.resetConfirm': 'Reset all progress?',
  'settings.resetDone': 'Progress reset',
  'settings.theme': 'Theme',

  'booster.hint': 'Hint',
  'booster.undo': 'Undo',
  'booster.tube': 'Jar',
  'booster.leaf': 'Leaf',
  'booster.shuffle': 'Shuffle',
  'booster.auto': 'Auto move',
  'booster.helpTitle': 'How can we help?',
  'booster.hintPack': '+3 hints',
  'booster.undoPack': '+3 undos',
  'booster.none': 'No good move found',
  'booster.tubeAdded': 'A new jar appeared',
  'booster.shuffled': 'Jars shuffled',
  'booster.noUndo': 'Nothing to undo',

  'prelevel.title': 'Helpers',
  'prelevel.booster': 'Booster before the level',
  'prelevel.cat': 'Cat helper',
  'prelevel.catText': 'Suggests a move on the next level.',
  'prelevel.ready': 'Helper is ready for the level',

  'cats.title': 'Cats',
  'cats.ryzhik': 'Ginger',
  'cats.ryzhikBonus': '+5 coins per level',
  'cats.luna': 'Luna',
  'cats.lunaBonus': 'First hint is free',
  'cats.moma': 'Moma',
  'cats.momaBonus': '+10 coins to the daily gift',
  'cats.new': 'New cat: {name}',

  'decor.flower': 'Flower',
  'decor.bush': 'Bush',
  'decor.bench': 'Bench',
  'decor.lantern': 'Lantern',
  'decor.path': 'Path',
  'decor.fountain': 'Fountain',
  'decor.catHouse': 'Cat house',
  'decor.tree': 'Tree',

  'theme.default': 'Warm',
  'theme.dusk': 'Dusk',
  'theme.sand': 'Sand'
};

const DICT = { ru, en };

export function t(key, params) {
  const lang = (state.settings && state.settings.lang) || 'ru';
  const str = (DICT[lang] && DICT[lang][key]) || ru[key] || key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
}

export function currentLang() {
  return (state.settings && state.settings.lang) || 'ru';
}

export function setLang(lang) {
  if (!DICT[lang]) return;
  state.settings.lang = lang;
  document.documentElement.lang = lang;
  persist();
}

export function detectLang() {
  try {
    const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return DICT[nav] ? nav : 'ru';
  } catch (e) {
    return 'ru';
  }
}

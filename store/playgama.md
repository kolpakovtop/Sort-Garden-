# Sort Garden — материалы для формы Playgama

Форма Playgama одна на всю игру и англоязычная: языковых вкладок нет, поэтому
тексты и обложки ниже — английские, а локализации перечислены отдельным полем.
Всё скопировать как есть.

Файлы: архив `store/sort-garden-playgama.zip`, обложки и скриншоты —
`store/playgama/` (пересобираются `npm run build:playgama` и
`npm run store:playgama`).

---

## Первый экран

| Поле | Значение |
| --- | --- |
| Title | `Sort Garden` |
| Game engine | **Plain JS** (Vite + ванильные ES-модули, движка нет) |

---

## Основной экран

### Game Archive

`store/sort-garden-playgama.zip` — 102 кБ, `index.html` в корне, рядом
`playgama-bridge.js` (@playgama/bridge 2.0.2, скопирован из npm без изменений)
и `playgama-bridge-config.json`. Мост подключён синхронным тегом до кода игры,
поэтому `window.bridge` существует к старту.

### Game description

```
Sort Garden is a calm sorting puzzle with a garden to grow. Pour coloured pieces from jar to jar until every jar holds a single colour, then spend the coins you earn on garden decorations, cat helpers and boosters.

Every level is generated on the fly and checked by a solver before you see it, so it is always solvable — and the move budget is set so you can finish without spending a single booster.

No timers, no lives, nothing to lose: any move can be undone, and running out of moves simply offers you a hand. Levels never run out either — the curve keeps going from three colours and five jars to seven colours and nine jars, and the garden keeps growing with them.
```

### How to play

```
Goal: collect pieces of one colour in every jar.

1. Tap a jar to pick up its top piece — the jar lifts.
2. Tap another jar to put the piece there: it flies over to its new place.
3. A piece can only land on a piece of the same colour or into an empty jar, and only while there is room — a jar holds four pieces.
4. Tap the lifted jar again to cancel the choice. An illegal move just wiggles the jar: nothing breaks and no move is spent.
5. The level is done when every non-empty jar holds a single colour. The fewer moves you spend, the more stars — three stars under 70% of the budget.

Controls: mouse or touch, everything is a single tap. Keyboard: Tab moves focus, Enter or Space activates the focused button, Esc opens the pause menu.

Stuck? The bottom bar carries a hint, an undo, an extra jar, a safe shuffle and the magic leaf that plays two good moves for you. Coins earned in levels buy boosters and garden decorations in the shop.
```

### Supported Devices

Desktop, iOS, Android — все три. Раскладка проверена от 320×568 до 1920×1080.

### Screen Orientation

Portrait **и** Landscape: раскладка перестраивается сама, поворот ничего не
ломает. Если форма требует одно значение — Portrait (телефонная раскладка
основная, на десктопе игра занимает окно целиком в любом случае).

### Game Features

Не отмечать ничего:

| Галка | Почему нет |
| --- | --- |
| In-Game Purchases | покупок за деньги нет, вся валюта игровая |
| Leaderboards | таблиц нет |
| Multiplayer | игра одиночная |
| Social Sharing | шеринга нет |

Реклама (interstitial + rewarded) в этот список не входит — она описывается
шагами QA-тула ниже.

### Game Languages

English, Russian. Язык берётся из площадки при первом запуске и дальше
переключается в настройках; выбор игрока всегда важнее языка площадки.

---

## Publishing

### Cover Images

| Формат | Размер | Файл |
| --- | --- | --- |
| Square 1:1 | 800×800 | `store/playgama/cover-1x1-800x800.png` |
| Portrait 9:16 | 1080×1920 | `store/playgama/cover-9x16-1080x1920.png` |
| Landscape 16:9 | 1920×1080 | `store/playgama/cover-16x9-1920x1080.png` |

Один комплект на игру, английский. Нарисованы теми же формами и палитрой, что
и сама игра, — обложка не разойдётся с экраном.

### Other Assets (необязательно)

`store/playgama/screenshots/` — 10 файлов, снятых с собранной игры на английском:
`*.png` — десктоп 1920×1080, `*-mobile.png` — телефон 1080×1920 (меню, уровень,
сад, магазин, ежедневные награды). Можно загрузить по одному или одним zip.

---

## Прохождение QA-тула (Test Game)

### Шаг Build Startup

Должно пройти без замечаний: мост лежит в архиве и инициализируется, конфиг
`playgama-bridge-config.json` — в корне рядом с `index.html`.

Если площадка всё же покажет «SDK initialization check failed» — значит
загрузился не тот архив: проверьте, что внутри есть `playgama-bridge.js`.

### Шаг Rewarded Ads

**«Does the game implement Rewarded Ads?» → Yes.**

Где показать: на экране результата их сразу две — «удвоить награду за уровень»
и «сундук +25 монет»; ещё есть +ходы на экране проигрыша, подарок в саду (+40),
удвоение ежедневной награды и бустеры, которых нет в наличии. Быстрее всего —
доиграть уровень и нажать кнопку на экране результата.

Тул попросит **закрыть ролик крестиком досрочно** и спросит
**«Was the reward granted?»**

> **Правильный ответ — `Not granted`.** Это проверка от обратного: игрок закрыл
> ролик, награды быть не должно. Игра начисляет награду только по состоянию
> `rewarded` и никогда по `closed` — монеты после досрочного закрытия не
> приходят, всплывает нейтральное сообщение, кнопка снова активна.

Второй заход обычно просят досмотреть до конца — там ответ `Granted`.

### Шаг Interstitial Ads

**«Does the game implement Interstitial Ads?» → Yes.**

Путь в игре: **закончить уровень → на экране результата нажать «Continue» →
полноэкранный ролик перед следующим уровнем**. Ограничения игры (они же в
конфиге моста): не раньше 4-го уровня, не чаще одного раза в 150 секунд, не
чаще чем раз в 3 уровня, максимум 4 за сессию, никогда поверх игрового поля и
никогда поверх открытого окна.

Поэтому при быстром повторном прогоне ролик может не появиться — **это
правильное поведение, а не сбой**: подождите 150 секунд или пройдите ещё пару
уровней. Второй путь, если ждать не хочется: магазин → купить украшение для
сада за 400+ монет.

На время ролика игра ставится на паузу, звук глушится (аудиоконтекст
приостанавливается целиком), а `gameplay_stopped` уходит площадке до показа.

### Шаг Authorization

**«Does the game use SDK methods for authorization?» → No.**

Входа в игре нет. Прогресс идёт через `bridge.storage` — он работает и для
анонимного игрока, модуль `player` не используется.

### Полезное про сам тул

- у каждого шага свой URL, между шагами игра перезапускается — счётчик
  «4 ролика за сессию» при этом обнуляется, а пауза в 150 секунд между
  interstitial сохраняется (она в сохранении);
- поддержку форматов тул сообщает мосту по одному, поэтому игра спрашивает
  `isRewardedSupported`/`isInterstitialSupported` в момент показа, а не при
  старте: на шаге, где включён только rewarded, кнопки роликов видны, а
  interstitial просто не показывается;
- локально (без родительской страницы площадки) `platform_id=qa_tool` сообщает,
  что рекламы нет вообще — это нормально. Локально проверять на
  `?platform_id=playgama`.

---

## Что нельзя решить за владельца

- **Distribution.** Галка «Playgama may distribute my game on any partner
  platform, where it is not already published» и исключения конкретных
  площадок — решение владельца игры.
- **«If your game is published elsewhere».** Ссылка на уже опубликованную
  версию (например, на Яндекс Играх) ускоряет проверку и подтверждает
  авторство. Заполнить, когда игра там выйдет.

---

## Техническая справка (на случай вопросов от QA)

| Что | Как сделано |
| --- | --- |
| SDK | `@playgama/bridge` 2.0.2, файл в архиве, копия из npm без правок |
| Инициализация | `bridge.initialize()` при старте, `game_ready` — когда меню уже принимает нажатия |
| Геймплей | `gameplay_started` / `gameplay_stopped` парно: уровень, пауза, сворачивание вкладки, реклама |
| Сохранения | `bridge.storage` по ключу `sort-garden-save`, локальная копия как фоллбэк; побеждает более свежая |
| Язык | `bridge.platform.language` — только для первого запуска |
| Rewarded | награда исключительно по состоянию `rewarded`, закрытие и ошибка не платят |
| Interstitial | продолжение только по `closed`/`failed`, никогда по факту вызова |
| Конфиг моста | `minimumDelayBetweenInterstitial: 150`, `initialInterstitialDelay: 150` — та же частота, что игра соблюдает сама |
| Без сети | если SDK площадки недоступен, игра остаётся играбельной, а загрузочный оверлей моста снимается сам |

---

## Файлы

```
store/sort-garden-playgama.zip          архив для поля Game Archive
store/playgama/cover-1x1-800x800.png    обложка 1:1
store/playgama/cover-9x16-1080x1920.png обложка 9:16
store/playgama/cover-16x9-1920x1080.png обложка 16:9
store/playgama/screenshots/             10 скриншотов для Other Assets
store/playgama/README.txt               куда что загружать
```

Пересборка: `npm run build:playgama` (архив) и `npm run store:playgama`
(обложки и скриншоты; `-- --covers` — только обложки).

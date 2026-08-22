import { state, persist, addCoins, spendCoins, resetProgress } from '../core/state.js';
import { t, setLang, currentLang } from '../core/i18n.js';
import { track } from '../core/analytics.js';
import * as Sound from '../core/audio.js';
import * as Ads from '../core/ads.js';
import { go, rerender, later, onLeave } from '../core/router.js';
import { el, Button, IconChip, Chip, Card, Toggle, toast, TopBar, BackBar, confirmModal } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { catMascot } from '../ui/cat.js';
import {
  DECOR, BOOSTER_SHOP, CATS, THEMES, DAILY_COINS, TASKS,
  hasCat, ownsDecor, addDecor, ensureTasks, taskReady, tasksReadyCount, claimTask,
  dailyState, claimDaily, offlineCoins, claimOffline, markSeen, addSticker,
  applyTheme, startThemeTrial, activeThemeId, catName
} from '../game/meta.js';
import { pendingHelpers } from './level.js';

/* ---------------- boot ---------------- */

export function BootScreen() {
  return el('div', { class: 'screen center', style: { justifyContent: 'center', alignItems: 'center', gap: '14px' } }, [
    el('div', { class: 'menu-hero__badge', html: `<span class="icon">${icon('leaf')}</span>` }),
    el('h1', { text: t('app.title') }),
    el('p', { text: t('app.loading') }),
    el('div', { class: 'dots', html: '<span></span><span></span><span></span>' })
  ]);
}

/* ---------------- menu ---------------- */

const TITLE_PARTS = { Sort: 'Sort', Garden: 'Garden' };

function menuTile({ label, sub, iconName, tone, onClick, action }) {
  return Button({
    action,
    label,
    sub,
    chip: { name: iconName, tone },
    variant: 'ghost',
    cls: 'btn--tile',
    center: false,
    onClick
  });
}

export function MenuScreen() {
  ensureTasks();
  const info = dailyState();
  const tasksReady = tasksReadyCount();

  const helpers = Card([
    el('h3', { text: t('prelevel.title') }),
    Button({
      label: t('prelevel.booster'),
      sub: pendingHelpers.booster ? t('prelevel.ready') : t('reward.watch'),
      chip: { name: 'reward', tone: 'green' },
      variant: 'ghost',
      cls: 'btn--tile',
      center: false,
      disabled: !Ads.canUseReward('prelevel_booster') || pendingHelpers.booster,
      onClick: async () => {
        const ok = await Ads.showRewarded('prelevel_booster');
        if (ok) { pendingHelpers.booster = true; rerender(); }
      }
    }),
    Button({
      label: t('prelevel.cat'),
      sub: pendingHelpers.cat ? t('prelevel.ready') : `${t('reward.watch')}: ${t('prelevel.catText')}`,
      chip: { name: 'cat', tone: 'warm' },
      variant: 'ghost',
      cls: 'btn--tile',
      center: false,
      disabled: !Ads.canUseReward('cat_helper') || pendingHelpers.cat,
      onClick: async () => {
        const ok = await Ads.showRewarded('cat_helper');
        if (ok) { pendingHelpers.cat = true; rerender(); }
      }
    })
  ]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !document.querySelector('.modal') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      go('level');
    }
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));

  return el('div', { class: 'screen scroll' }, [
    TopBar({ center: [
      Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' }),
      Chip({ iconName: 'star', value: state.starsTotal, cls: 'chip--star' })
    ] }),
    el('div', { class: 'menu-hero' }, [
      el('div', { class: 'menu-hero__cat' }, [catMascot({ size: 'md' })]),
      el('div', { class: 'menu-hero__logo' }, [
        el('div', { class: 'menu-hero__badge', html: `<span class="icon">${icon('leaf')}</span>` }),
        el('div', {}, [
          el('div', { class: 'menu-hero__title', html: `${TITLE_PARTS.Sort} <span>${TITLE_PARTS.Garden}</span>` }),
          el('div', { class: 'menu-hero__sub', text: t('app.subtitle') })
        ])
      ])
    ]),
    el('div', { class: 'menu-grid' }, [
      Button({
        label: t('button.play'),
        sub: `${t('level.title')} ${state.level}`,
        iconName: 'play',
        variant: 'primary',
        cls: 'btn--full',
        action: 'play',
        onClick: () => go('level')
      }),
      menuTile({ action: 'garden', label: t('button.garden'), iconName: 'garden', tone: 'green', onClick: () => go('garden') }),
      menuTile({ action: 'shop', label: t('button.shop'), iconName: 'shop', tone: 'gold', onClick: () => go('shop') }),
      menuTile({
        action: 'daily',
        label: t('button.daily'),
        sub: info.claimedToday ? undefined : t('daily.take', { n: info.amount }),
        iconName: 'gift',
        tone: 'pink',
        onClick: () => go('daily')
      }),
      menuTile({ action: 'settings', label: t('button.settings'), iconName: 'settings', tone: 'blue', onClick: () => go('settings') })
    ]),
    helpers,
    el('div', { class: 'row' }, [
      Button({
        action: 'tasks',
        label: t('button.tasks'),
        sub: tasksReady ? t('button.collect') : undefined,
        chip: { name: 'task', tone: 'blue', size: 'sm' },
        variant: 'ghost',
        cls: 'btn--tile',
        size: 'sm',
        center: false,
        onClick: () => go('tasks')
      }),
      Button({
        action: 'rewards',
        label: t('button.rewards'),
        chip: { name: 'chest', tone: 'gold', size: 'sm' },
        variant: 'ghost',
        cls: 'btn--tile',
        size: 'sm',
        center: false,
        onClick: () => go('rewards')
      })
    ])
  ]);
}

/* ---------------- result ---------------- */

const PETAL_COLORS = ['#D98BB6', '#EFC65B', '#7BAE7F', '#6C9BD1', '#E89A5D'];

function petalRain(host) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const petals = el('div', { class: 'petals' });
  host.appendChild(petals);
  const height = host.getBoundingClientRect().height + 60;
  for (let i = 0; i < 8; i++) {
    const petal = el('span', {
      class: 'petal',
      html: `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0c4 3 5.6 6 4 9.4C9.4 12.8 5 14 2.4 12 -.2 10 .6 5 7 0z" fill="${PETAL_COLORS[i % PETAL_COLORS.length]}"/></svg>`
    });
    petal.style.left = `${6 + Math.random() * 86}%`;
    petals.appendChild(petal);
    if (typeof petal.animate !== 'function') continue;
    const drift = (Math.random() - 0.5) * 90;
    const spin = (Math.random() - 0.5) * 520;
    const anim = petal.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
      { transform: `translate(${drift * 0.4}px, ${height * 0.35}px) rotate(${spin * 0.4}deg)`, opacity: 0.95, offset: 0.35 },
      { transform: `translate(${drift}px, ${height}px) rotate(${spin}deg)`, opacity: 0 }
    ], { duration: 900 + Math.random() * 320, delay: i * 90, easing: 'cubic-bezier(.4,0,.2,1)' });
    anim.onfinish = () => petal.remove();
  }
  setTimeout(() => petals.remove(), 2600);
}

// count-up on rAF, no timers left behind
function countUp(node, from, to, render, ms = 500) {
  if (from === to) { render(to); return; }
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    render(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && node.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function ResultScreen({ levelNumber = 1, stars = 1, coins = 0, newCats = [] }) {
  let earned = coins;
  addCoins(coins, 'level');
  Sound.play('coin');

  const coinsRow = el('span', { class: 'result__coins', html: `<span class="icon">${icon('coin')}</span><span>+${earned}</span>` });
  const actions = el('div', { class: 'col' });

  const setCoinLabel = (n) => {
    coinsRow.replaceChildren(
      el('span', { class: 'icon', html: icon('coin') }),
      el('span', { text: `+${n}` })
    );
  };
  const refreshCoins = (from) => countUp(coinsRow, from, earned, setCoinLabel);

  const doubleBtn = Button({
    action: 'double',
    label: t('button.double'),
    sub: t('reward.watch'),
    chip: { name: 'reward', tone: 'green' },
    variant: 'reward',
    center: false,
    disabled: !Ads.canUseReward('win_double'),
    onClick: async () => {
      const ok = await Ads.showRewarded('win_double');
      if (ok) {
        const before = earned;
        addCoins(earned, 'win_double');
        earned *= 2;
        refreshCoins(before);
        doubleBtn.disabled = true;
      }
    }
  });

  const chestBtn = Button({
    action: 'chest',
    label: `${t('button.watchBonus')} +25`,
    sub: t('reward.watch'),
    chip: { name: 'chest', tone: 'gold' },
    variant: 'reward',
    center: false,
    disabled: !Ads.canUseReward('bonus_chest'),
    onClick: async () => {
      const ok = await Ads.showRewarded('bonus_chest');
      if (ok) {
        addCoins(25, 'bonus_chest');
        chestBtn.disabled = true;
        rerenderTop();
      }
    }
  });

  actions.append(doubleBtn, chestBtn);

  const starsRow = el('div', { class: 'stars' }, [1, 2, 3].map((i) => el('span', {
    class: `icon${i <= stars ? ' icon--on' : ''}`,
    html: icon('star'),
    'aria-hidden': 'true'
  })));

  const totalChip = Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' });
  function rerenderTop() {
    totalChip.replaceChildren(
      el('span', { class: 'icon', html: icon('coin') }),
      el('span', { text: String(state.coins) })
    );
  }

  if (newCats && newCats.length) {
    later(() => toast(t('cats.new', { name: catName(newCats[0].id) })), 700);
  }

  const resultCard = el('div', { class: 'result' }, [
    el('div', { class: 'result__cat' }, [catMascot({ size: 'md', mood: 'happy' })]),
    el('h1', { text: t('level.completed') }),
    el('p', { text: `${t('level.title')} ${levelNumber}` }),
    starsRow,
    coinsRow
  ]);

  later(() => { petalRain(resultCard); countUp(coinsRow, 0, earned, setCoinLabel); }, 120);

  return el('div', { class: 'screen' }, [
    TopBar({ center: [totalChip] }),
    resultCard,
    el('div', { class: 'spacer' }),
    actions,
    Button({
      action: 'continue',
      label: t('button.continue'),
      iconName: 'play',
      variant: 'primary',
      onClick: async () => {
        await Ads.showInterstitial('level_complete');
        go('level');
      }
    }),
    el('div', { class: 'row' }, [
      Button({ label: t('button.garden'), chip: { name: 'garden', tone: 'green', size: 'sm' }, variant: 'ghost', cls: 'btn--tile', size: 'sm', center: false, onClick: () => go('garden') }),
      Button({ label: t('button.menu'), chip: { name: 'home', tone: 'blue', size: 'sm' }, variant: 'ghost', cls: 'btn--tile', size: 'sm', center: false, onClick: () => go('menu') })
    ])
  ]);
}

/* ---------------- garden ---------------- */

export function GardenScreen() {
  const pending = state.offline.pendingOfflineCoins || offlineCoins();
  state.offline.pendingOfflineCoins = pending;
  if (!pending) markSeen();

  const cells = el('div', { class: 'garden-grid' }, DECOR.map((d) => {
    const owned = ownsDecor(d.id);
    return el('div', {
      class: `garden-cell${owned ? ' garden-cell--filled' : ''}`,
      role: 'img',
      'aria-label': `${t(`decor.${d.id}`)}${owned ? '' : ' — ' + t('button.buy')}`,
      html: owned ? `<span class="icon">${icon(d.id)}</span>` : `<span class="icon">${icon('plus')}</span>`
    });
  }));

  const offlineCard = pending > 0 ? Card([
    el('div', { class: 'row' }, [
      IconChip({ name: 'coin', tone: 'gold' }),
      el('div', { class: 'grow' }, [
        el('h3', { text: t('garden.offline') }),
        el('p', { class: 'small', text: t('garden.offlineText', { n: pending }) })
      ])
    ]),
    Button({
      label: `${t('button.collect')} ${pending}`,
      iconName: 'coin',
      variant: 'primary',
      onClick: () => { claimOffline(1); toast(t('reward.success')); rerender(); }
    }),
    Button({
      label: t('button.double'),
      sub: t('reward.watch'),
      chip: { name: 'reward', tone: 'green' },
      variant: 'reward',
      center: false,
      disabled: !Ads.canUseReward('offline_double'),
      onClick: async () => {
        const ok = await Ads.showRewarded('offline_double');
        claimOffline(ok ? 2 : 1);
        rerender();
      }
    })
  ]) : null;

  const decorCard = Card([
    el('div', { class: 'row' }, [
      IconChip({ name: 'garden', tone: 'green' }),
      el('div', { class: 'grow' }, [
        el('h3', { text: t('garden.decor', { n: state.meta.ownedDecor.length }) }),
        el('span', { class: 'small muted', text: `${state.meta.ownedDecor.length}/${DECOR.length}` })
      ]),
      hasCat('ryzhik') ? catMascot({ size: 'sm', variant: 'ginger' }) : null
    ]),
    cells,
    state.meta.ownedDecor.length ? null : el('p', { class: 'small', text: t('garden.empty') })
  ]);

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('garden.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' })),
    offlineCard,
    decorCard,
    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'gift', tone: 'pink' }),
        el('div', { class: 'grow' }, [
          el('h3', { text: t('garden.gift') }),
          el('p', { class: 'small', text: t('garden.giftText') })
        ])
      ]),
      Button({
        label: `${t('button.collect')} 40`,
        sub: t('reward.watch'),
        chip: { name: 'reward', tone: 'green' },
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('garden_gift'),
        onClick: async () => {
          const ok = await Ads.showRewarded('garden_gift');
          if (ok) { addCoins(40, 'garden_gift'); rerender(); }
        }
      })
    ], 'card--quiet'),
    Button({ label: t('button.shop'), chip: { name: 'shop', tone: 'gold' }, variant: 'ghost', cls: 'btn--tile', center: false, onClick: () => go('shop') })
  ]);
}

/* ---------------- shop ---------------- */

function shopRow({ iconName, tone, title, sub, price, owned, onBuy, buyId }) {
  return el('div', { class: 'shop-item' }, [
    IconChip({ name: iconName, tone }),
    el('div', { class: 'grow' }, [
      el('div', { class: 'shop-item__title', text: title }),
      sub ? el('div', { class: 'shop-item__sub', text: sub }) : null
    ]),
    owned
      ? el('span', { class: 'tag', text: t('button.owned') })
      : Button({
        action: `buy-${buyId}`,
        label: String(price),
        iconName: 'coin',
        size: 'sm',
        wide: false,
        variant: state.coins >= price ? 'primary' : 'ghost',
        disabled: state.coins < price,
        onClick: onBuy
      })
  ]);
}

const BOOSTER_TONES = { hint: 'gold', undo: 'blue', shuffle: 'pink', tube: 'green', leaf: 'warm' };
const DECOR_TONES = { flower: 'pink', bush: 'green', bench: 'warm', lantern: 'gold', path: 'warm', fountain: 'blue', catHouse: 'warm', tree: 'green' };

export function ShopScreen() {
  const trialTheme = THEMES.find((id) => id !== activeThemeId()) || 'dusk';

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('shop.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' })),

    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'coin', tone: 'gold' }),
        el('div', { class: 'grow' }, [
          el('h3', { text: t('shop.free') }),
          el('p', { class: 'small', text: t('shop.freeText') })
        ])
      ]),
      Button({
        label: `${t('button.collect')} 60`,
        sub: t('reward.watch'),
        chip: { name: 'reward', tone: 'green' },
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('event_boost'),
        onClick: async () => {
          const ok = await Ads.showRewarded('event_boost');
          if (ok) { addCoins(60, 'shop_free'); rerender(); }
        }
      }),
      Button({
        label: t('shop.trial'),
        sub: `${t('reward.watch')}: ${t('shop.trialText')}`,
        chip: { name: 'settings', tone: 'blue' },
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('cosmetic_trial'),
        onClick: async () => {
          const ok = await Ads.showRewarded('cosmetic_trial');
          if (ok) { startThemeTrial(trialTheme); toast(t('shop.trialOn')); rerender(); }
        }
      })
    ]),

    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'hint', tone: 'gold' }),
        el('h3', { class: 'grow', text: t('shop.boosters') })
      ]),
      ...BOOSTER_SHOP.map((b) => shopRow({
        buyId: b.id,
        iconName: b.icon,
        tone: BOOSTER_TONES[b.id] || 'green',
        title: t(`booster.${b.id}`),
        sub: `${t('button.owned')}: ${state.meta.boosters[b.id] || 0}`,
        price: b.price,
        onBuy: () => {
          if (!spendCoins(b.price, `booster_${b.id}`)) { toast(t('shop.notEnough')); return; }
          state.meta.boosters[b.id] = (state.meta.boosters[b.id] || 0) + 1;
          persist();
          toast(t('shop.bought'));
          rerender();
        }
      }))
    ]),

    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'garden', tone: 'green' }),
        el('h3', { class: 'grow', text: t('shop.decor') })
      ]),
      ...DECOR.map((d) => shopRow({
        buyId: d.id,
        iconName: d.id,
        tone: DECOR_TONES[d.id] || 'green',
        title: t(`decor.${d.id}`),
        price: d.price,
        owned: ownsDecor(d.id),
        onBuy: async () => {
          if (!spendCoins(d.price, `decor_${d.id}`)) { toast(t('shop.notEnough')); return; }
          addDecor(d.id);
          Sound.play('coin');
          toast(t('shop.bought'));
          rerender();
          if (d.price >= 400) await Ads.showInterstitial('garden_milestone');
        }
      }))
    ])
  ]);
}

/* ---------------- daily ---------------- */

export function DailyScreen() {
  const info = dailyState();

  const days = el('div', { class: 'days' }, DAILY_COINS.map((amount, i) => {
    const done = info.claimedToday ? i <= info.dayIndex : i < info.dayIndex;
    const current = i === info.dayIndex && !info.claimedToday;
    return el('div', { class: `day${done ? ' day--done' : ''}${current ? ' day--current' : ''}` }, [
      el('div', { text: t('daily.day', { n: i + 1 }) }),
      el('div', { class: 'day__coins' }, [
        el('span', { class: 'icon', html: icon('coin') }),
        el('span', { text: String(amount) })
      ])
    ]);
  }));

  const body = el('div', { class: 'col' });

  if (info.claimedToday) {
    body.appendChild(el('p', { class: 'center', text: t('daily.claimed') }));
    body.appendChild(Button({
      label: t('daily.extra'),
      sub: t('reward.watch'),
      chip: { name: 'reward', tone: 'green' },
      variant: 'reward',
      center: false,
      disabled: !Ads.canUseReward('daily_extra'),
      onClick: async () => {
        const ok = await Ads.showRewarded('daily_extra');
        if (ok) { addCoins(30, 'daily_extra'); rerender(); }
      }
    }));
  } else {
    body.appendChild(Button({
      action: 'claim',
      label: t('daily.take', { n: info.amount }),
      iconName: 'gift',
      variant: 'primary',
      onClick: () => { claimDaily(); Sound.play('coin'); rerender(); }
    }));
    body.appendChild(Button({
      label: t('button.double'),
      sub: t('reward.watch'),
      chip: { name: 'reward', tone: 'green' },
      variant: 'reward',
      center: false,
      disabled: !Ads.canUseReward('daily_double'),
      onClick: async () => {
        const ok = await Ads.showRewarded('daily_double');
        const amount = claimDaily();
        if (ok && amount) addCoins(amount, 'daily_double');
        rerender();
      }
    }));
  }

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('daily.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' })),
    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'gift', tone: 'pink' }),
        el('p', { class: 'grow', text: t('daily.streak', { n: info.streak }) }),
        hasCat('moma') ? catMascot({ size: 'sm', variant: 'moma' }) : null
      ]),
      days,
      body
    ]),
    Button({ label: t('button.tasks'), chip: { name: 'task', tone: 'blue' }, variant: 'ghost', cls: 'btn--tile', center: false, onClick: () => go('tasks') })
  ]);
}

/* ---------------- tasks ---------------- */

const TASK_TONES = { levels: 'green', booster: 'gold', decor: 'pink' };

export function TasksScreen() {
  const tasks = ensureTasks();

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('tasks.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' })),
    ...tasks.map((task) => {
      const def = TASKS.find((x) => x.id === task.id);
      const claimed = state.daily.claimedTaskIds.includes(task.id);
      const ready = taskReady(task.id);
      return Card([
        el('div', { class: 'row' }, [
          IconChip({ name: task.id === 'decor' ? 'garden' : task.id === 'booster' ? 'hint' : 'check', tone: TASK_TONES[task.id] || 'green' }),
          el('div', { class: 'grow' }, [
            el('div', { text: t(def.labelKey), style: { fontWeight: '700' } }),
            el('div', { class: 'small muted', text: `${task.progress}/${task.goal}` })
          ]),
          claimed
            ? el('span', { class: 'tag', text: t('tasks.done') })
            : Button({
              label: ready ? t('button.collect') : `+${def.reward}`,
              iconName: ready ? 'check' : 'coin',
              size: 'sm',
              wide: false,
              variant: ready ? 'primary' : 'ghost',
              disabled: !ready,
              onClick: () => { claimTask(task.id); Sound.play('coin'); rerender(); }
            })
        ]),
        el('div', { class: 'progress' }, [
          el('div', { class: 'progress__fill', style: { transform: `scaleX(${Math.min(1, task.progress / task.goal)})` } })
        ])
      ]);
    })
  ]);
}

/* ---------------- rewards ---------------- */

const CAT_VARIANTS = { ryzhik: 'ginger', luna: 'luna', moma: 'moma' };

export function RewardsScreen() {
  const cats = CATS.map((cat) => {
    const owned = hasCat(cat.id);
    return el('div', { class: 'shop-item' }, [
      owned
        ? el('span', { style: { width: '52px', height: '52px', display: 'inline-flex' } }, [catMascot({ size: 'sm', variant: CAT_VARIANTS[cat.id] })])
        : IconChip({ name: 'lock', tone: 'blue' }),
      el('div', { class: 'grow' }, [
        el('div', { class: 'shop-item__title', text: t(cat.nameKey) }),
        el('div', { class: 'shop-item__sub', text: owned ? t(cat.bonusKey) : t('rewards.locked', { n: cat.level }) })
      ]),
      owned ? el('span', { class: 'tag', text: t('tasks.done') }) : null
    ]);
  });

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('rewards.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' })),
    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'chest', tone: 'gold' }),
        el('div', { class: 'grow' }, [
          el('h3', { text: t('rewards.event') }),
          el('p', { class: 'small', text: t('rewards.eventText') })
        ])
      ]),
      Button({
        label: `${t('button.collect')} 60`,
        sub: t('reward.watch'),
        chip: { name: 'reward', tone: 'green' },
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('event_boost'),
        onClick: async () => {
          const ok = await Ads.showRewarded('event_boost');
          if (ok) { addCoins(60, 'event_boost'); rerender(); }
        }
      })
    ]),
    Card([
      el('div', { class: 'row row--between' }, [
        el('div', { class: 'row' }, [
          IconChip({ name: 'sticker', tone: 'pink' }),
          el('h3', { text: t('rewards.sticker') })
        ]),
        el('span', { class: 'small muted', text: t('rewards.stickers', { n: state.meta.stickers.length }) })
      ]),
      el('p', { class: 'small', text: t('rewards.stickerText') }),
      state.meta.stickers.length
        ? el('div', { class: 'row row--wrap' }, state.meta.stickers.map((s) => Chip({ iconName: 'sticker', value: s, cls: 'chip--plain' })))
        : null,
      Button({
        label: t('rewards.sticker'),
        sub: t('reward.watch'),
        chip: { name: 'reward', tone: 'green' },
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('sticker_pack'),
        onClick: async () => {
          const ok = await Ads.showRewarded('sticker_pack');
          if (ok) { const name = addSticker(); toast(t('rewards.newSticker', { name })); rerender(); }
        }
      })
    ]),
    Card([
      el('div', { class: 'row' }, [
        IconChip({ name: 'cat', tone: 'warm' }),
        el('h3', { class: 'grow', text: t('rewards.cats') })
      ]),
      ...cats
    ])
  ]);
}

/* ---------------- settings ---------------- */

export function SettingsScreen() {
  const langRow = el('div', { class: 'row' }, ['ru', 'en'].map((lang) => Button({
    action: `lang-${lang}`,
    label: lang === 'ru' ? 'Русский' : 'English',
    size: 'sm',
    variant: currentLang() === lang ? 'primary' : 'ghost',
    onClick: () => { setLang(lang); track('settings_change', { lang }); rerender(); }
  })));

  const themeRow = el('div', { class: 'row row--wrap' }, THEMES.map((id) => Button({
    label: t(`theme.${id}`),
    size: 'sm',
    variant: state.meta.activeTheme === id ? 'primary' : 'ghost',
    onClick: () => {
      state.meta.activeTheme = id;
      state.meta.themeTrial = { active: false, themeId: null, levelsLeft: 0 };
      persist();
      applyTheme();
      track('settings_change', { theme: id });
      rerender();
    }
  })));

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('settings.title'), () => go('menu')),
    Card([
      Toggle({
        action: 'sound',
        label: t('settings.sound'),
        iconName: state.settings.sound ? 'sound-on' : 'sound-off',
        checked: state.settings.sound,
        onChange: (v) => { state.settings.sound = v; persist(); track('settings_change', { sound: v }); rerender(); }
      }),
      Toggle({
        action: 'music',
        label: t('settings.music'),
        iconName: state.settings.music ? 'music-on' : 'music-off',
        checked: state.settings.music,
        onChange: (v) => { state.settings.music = v; persist(); Sound.syncMusic(); track('settings_change', { music: v }); rerender(); }
      })
    ]),
    Card([
      el('div', { class: 'row' }, [IconChip({ name: 'info', tone: 'blue' }), el('h3', { text: t('settings.language') })]),
      langRow
    ]),
    Card([
      el('div', { class: 'row' }, [IconChip({ name: 'settings', tone: 'warm' }), el('h3', { text: t('settings.theme') })]),
      themeRow
    ]),
    Card([
      Button({
        action: 'reset',
        label: t('settings.reset'),
        iconName: 'close',
        variant: 'danger',
        onClick: () => confirmModal({
          title: t('settings.reset'),
          text: t('settings.resetConfirm'),
          onYes: () => { resetProgress(); applyTheme(); toast(t('settings.resetDone')); go('menu'); }
        })
      }),
      el('p', { class: 'small center', text: `${t('app.title')} · v1.0` })
    ], 'card--quiet')
  ]);
}

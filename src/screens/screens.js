import { state, persist, addCoins, spendCoins, resetProgress } from '../core/state.js';
import { t, setLang, currentLang } from '../core/i18n.js';
import { track } from '../core/analytics.js';
import * as Sound from '../core/audio.js';
import * as Ads from '../core/ads.js';
import { go, rerender, later } from '../core/router.js';
import { el, Button, Chip, Card, Toggle, toast, TopBar, BackBar, confirmModal } from '../ui/components.js';
import { icon } from '../ui/icons.js';
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
    el('span', { class: 'icon icon--xl', style: { color: 'var(--accent)' }, html: icon('leaf') }),
    el('h1', { text: t('app.title') }),
    el('p', { text: t('app.loading') }),
    el('div', { class: 'dots' , html: '<span></span><span></span><span></span>' })
  ]);
}

/* ---------------- menu ---------------- */

export function MenuScreen() {
  ensureTasks();
  const info = dailyState();
  const tasksReady = tasksReadyCount();

  const helpers = Card([
    el('h3', { text: t('prelevel.title') }),
    Button({
      label: t('prelevel.booster'),
      sub: pendingHelpers.booster ? t('prelevel.ready') : t('reward.watch'),
      iconName: 'reward',
      variant: 'reward',
      size: 'sm',
      center: false,
      disabled: !Ads.canUseReward('prelevel_booster') || pendingHelpers.booster,
      onClick: async () => {
        const ok = await Ads.showRewarded('prelevel_booster');
        if (ok) { pendingHelpers.booster = true; rerender(); }
      }
    }),
    Button({
      label: t('prelevel.cat'),
      sub: pendingHelpers.cat ? t('prelevel.ready') : t('prelevel.catText'),
      iconName: 'cat',
      variant: 'reward',
      size: 'sm',
      center: false,
      disabled: !Ads.canUseReward('cat_helper') || pendingHelpers.cat,
      onClick: async () => {
        const ok = await Ads.showRewarded('cat_helper');
        if (ok) { pendingHelpers.cat = true; rerender(); }
      }
    })
  ], 'card--quiet');

  return el('div', { class: 'screen scroll' }, [
    TopBar({
      left: Chip({ iconName: 'coin', value: state.coins }),
      title: '',
      right: Chip({ iconName: 'star', value: state.starsTotal, cls: 'chip--plain' })
    }),
    el('div', { class: 'menu-hero' }, [
      el('span', { class: 'icon icon--xl', html: icon('leaf') }),
      el('h1', { text: t('app.title') }),
      el('p', { text: t('app.subtitle') })
    ]),
    el('div', { class: 'menu-grid' }, [
      Button({
        label: t('button.play'),
        sub: `${t('level.title')} ${state.level}`,
        iconName: 'play',
        variant: 'primary',
        cls: 'btn--full',
        onClick: () => go('level')
      }),
      Button({ label: t('button.garden'), iconName: 'garden', onClick: () => go('garden') }),
      Button({ label: t('button.shop'), iconName: 'shop', onClick: () => go('shop') }),
      Button({
        label: t('button.daily'),
        sub: info.claimedToday ? undefined : t('daily.take', { n: info.amount }),
        iconName: 'gift',
        onClick: () => go('daily')
      }),
      Button({ label: t('button.settingsShort'), iconName: 'settings', onClick: () => go('settings') })
    ]),
    helpers,
    el('div', { class: 'row row--split' }, [
      Button({
        label: t('button.tasks'),
        sub: tasksReady ? t('button.collect') : undefined,
        iconName: 'task',
        size: 'sm',
        onClick: () => go('tasks')
      }),
      Button({ label: t('button.rewards'), iconName: 'chest', size: 'sm', onClick: () => go('rewards') })
    ])
  ]);
}

/* ---------------- result ---------------- */

export function ResultScreen({ levelNumber = 1, stars = 1, coins = 0, newCats = [] }) {
  let earned = coins;
  addCoins(coins, 'level');
  Sound.play('coin');

  const coinsRow = Chip({ iconName: 'coin', value: `+${earned}` });
  const actions = el('div', { class: 'col' });

  const refreshCoins = () => {
    coinsRow.replaceChildren(
      el('span', { class: 'icon', html: icon('coin') }),
      el('span', { text: `+${earned}` })
    );
  };

  const doubleBtn = Button({
    label: t('button.double'),
    sub: t('reward.watch'),
    iconName: 'reward',
    variant: 'reward',
    center: false,
    disabled: !Ads.canUseReward('win_double'),
    onClick: async () => {
      const ok = await Ads.showRewarded('win_double');
      if (ok) {
        addCoins(earned, 'win_double');
        earned *= 2;
        refreshCoins();
        doubleBtn.disabled = true;
      }
    }
  });

  const chestBtn = Button({
    label: t('button.watchBonus'),
    sub: '+25',
    iconName: 'chest',
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

  const totalChip = Chip({ iconName: 'coin', value: state.coins, cls: 'chip--plain' });
  function rerenderTop() {
    totalChip.replaceChildren(
      el('span', { class: 'icon', html: icon('coin') }),
      el('span', { text: String(state.coins) })
    );
  }

  if (newCats && newCats.length) {
    later(() => toast(t('cats.new', { name: catName(newCats[0].id) })), 700);
  }

  return el('div', { class: 'screen' }, [
    TopBar({ left: el('span', { style: { width: '56px' } }), title: '', right: totalChip }),
    el('div', { class: 'col center', style: { gap: '16px', marginTop: '10px' } }, [
      el('h1', { text: t('level.completed') }),
      el('p', { text: `${t('level.title')} ${levelNumber}` }),
      starsRow,
      el('div', { class: 'row', style: { justifyContent: 'center' } }, [coinsRow])
    ]),
    el('div', { class: 'spacer' }),
    actions,
    Button({
      label: t('button.continue'),
      iconName: 'play',
      variant: 'primary',
      onClick: async () => {
        await Ads.showInterstitial('level_complete');
        go('level');
      }
    }),
    el('div', { class: 'row row--split' }, [
      Button({ label: t('button.garden'), iconName: 'garden', size: 'sm', onClick: () => go('garden') }),
      Button({ label: t('button.menu'), iconName: 'home', size: 'sm', onClick: () => go('menu') })
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
    el('h3', { text: t('garden.offline') }),
    el('p', { text: t('garden.offlineText', { n: pending }) }),
    Button({
      label: `${t('button.collect')} ${pending}`,
      iconName: 'coin',
      variant: 'primary',
      onClick: () => { claimOffline(1); toast(t('reward.success')); rerender(); }
    }),
    Button({
      label: t('button.double'),
      sub: t('reward.watch'),
      iconName: 'reward',
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

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('garden.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins })),
    offlineCard,
    Card([
      el('div', { class: 'row row--between' }, [
        el('h3', { text: t('garden.decor', { n: state.meta.ownedDecor.length }) }),
        el('span', { class: 'small muted', text: `${state.meta.ownedDecor.length}/${DECOR.length}` })
      ]),
      cells,
      state.meta.ownedDecor.length ? null : el('p', { class: 'small', text: t('garden.empty') })
    ]),
    Card([
      el('h3', { text: t('garden.gift') }),
      el('p', { class: 'small', text: t('garden.giftText') }),
      Button({
        label: `${t('button.collect')} 40`,
        sub: t('reward.watch'),
        iconName: 'reward',
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('garden_gift'),
        onClick: async () => {
          const ok = await Ads.showRewarded('garden_gift');
          if (ok) { addCoins(40, 'garden_gift'); rerender(); }
        }
      })
    ], 'card--quiet'),
    Button({ label: t('button.shop'), iconName: 'shop', onClick: () => go('shop') })
  ]);
}

/* ---------------- shop ---------------- */

function buyRow({ iconName, title, sub, price, owned, onBuy }) {
  return el('div', { class: 'shop-item' }, [
    el('span', { class: 'icon icon--lg', html: icon(iconName) }),
    el('div', { class: 'grow' }, [
      el('div', { text: title, style: { fontWeight: '600' } }),
      sub ? el('div', { class: 'small muted', text: sub }) : null
    ]),
    owned
      ? el('span', { class: 'tag', text: t('button.owned') })
      : Button({
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

export function ShopScreen() {
  const trialTheme = THEMES.find((id) => id !== activeThemeId()) || 'dusk';

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('shop.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins })),

    Card([
      el('h3', { text: t('shop.free') }),
      el('p', { class: 'small', text: t('shop.freeText') }),
      Button({
        label: `${t('button.collect')} 60`,
        sub: t('reward.watch'),
        iconName: 'reward',
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
        sub: t('shop.trialText'),
        iconName: 'reward',
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
      el('h3', { text: t('shop.boosters') }),
      ...BOOSTER_SHOP.map((b) => buyRow({
        iconName: b.icon,
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
      el('h3', { text: t('shop.decor') }),
      ...DECOR.map((d) => buyRow({
        iconName: d.id,
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
        el('span', { class: 'icon', style: { width: '16px', height: '16px' }, html: icon('coin') }),
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
      iconName: 'reward',
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
      label: t('daily.take', { n: info.amount }),
      iconName: 'gift',
      variant: 'primary',
      onClick: () => { claimDaily(); Sound.play('coin'); rerender(); }
    }));
    body.appendChild(Button({
      label: t('button.double'),
      sub: t('reward.watch'),
      iconName: 'reward',
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
    BackBar(t('daily.short'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins })),
    Card([
      el('p', { text: t('daily.streak', { n: info.streak }) }),
      days,
      body
    ]),
    Button({ label: t('button.tasks'), iconName: 'task', onClick: () => go('tasks') })
  ]);
}

/* ---------------- tasks ---------------- */

export function TasksScreen() {
  const tasks = ensureTasks();

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('tasks.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins })),
    ...tasks.map((task) => {
      const def = TASKS.find((x) => x.id === task.id);
      const claimed = state.daily.claimedTaskIds.includes(task.id);
      const ready = taskReady(task.id);
      return Card([
        el('div', { class: 'row row--between', style: { gap: '10px' } }, [
          el('div', { class: 'grow', style: { minWidth: '0' } }, [
            el('div', { text: t(def.labelKey), style: { fontWeight: '600' } }),
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
          el('div', { class: 'progress__fill', style: { width: `${Math.round((task.progress / task.goal) * 100)}%` } })
        ])
      ]);
    })
  ]);
}

/* ---------------- rewards ---------------- */

export function RewardsScreen() {
  const cats = CATS.map((cat) => {
    const owned = hasCat(cat.id);
    return el('div', { class: 'shop-item' }, [
      el('span', { class: 'icon icon--lg', style: { color: owned ? 'var(--accent)' : 'var(--muted)' }, html: icon(owned ? 'cat' : 'lock') }),
      el('div', { class: 'grow' }, [
        el('div', { text: t(cat.nameKey), style: { fontWeight: '600' } }),
        el('div', { class: 'small muted', text: owned ? t(cat.bonusKey) : t('rewards.locked', { n: cat.level }) })
      ]),
      owned ? el('span', { class: 'tag', text: t('tasks.done') }) : null
    ]);
  });

  return el('div', { class: 'screen scroll' }, [
    BackBar(t('rewards.title'), () => go('menu'), Chip({ iconName: 'coin', value: state.coins })),
    Card([
      el('h3', { text: t('rewards.event') }),
      el('p', { class: 'small', text: t('rewards.eventText') }),
      Button({
        label: `${t('button.collect')} 60`,
        sub: t('reward.watch'),
        iconName: 'reward',
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
        el('h3', { text: t('rewards.sticker') }),
        el('span', { class: 'small muted', text: t('rewards.stickers', { n: state.meta.stickers.length }) })
      ]),
      el('p', { class: 'small', text: t('rewards.stickerText') }),
      el('div', { class: 'row', style: { flexWrap: 'wrap' } }, state.meta.stickers.map((s) => Chip({ iconName: 'sticker', value: s, cls: 'chip--plain' }))),
      Button({
        label: t('rewards.sticker'),
        sub: t('reward.watch'),
        iconName: 'reward',
        variant: 'reward',
        center: false,
        disabled: !Ads.canUseReward('sticker_pack'),
        onClick: async () => {
          const ok = await Ads.showRewarded('sticker_pack');
          if (ok) { const name = addSticker(); toast(t('rewards.newSticker', { name })); rerender(); }
        }
      })
    ]),
    Card([el('h3', { text: t('rewards.cats') }), ...cats])
  ]);
}

/* ---------------- settings ---------------- */

export function SettingsScreen() {
  const langRow = el('div', { class: 'row' }, ['ru', 'en'].map((lang) => Button({
    label: lang === 'ru' ? 'Русский' : 'English',
    size: 'sm',
    variant: currentLang() === lang ? 'primary' : 'ghost',
    onClick: () => { setLang(lang); track('settings_change', { lang }); rerender(); }
  })));

  const themeRow = el('div', { class: 'row' }, THEMES.map((id) => Button({
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
        label: t('settings.sound'),
        iconName: state.settings.sound ? 'sound-on' : 'sound-off',
        checked: state.settings.sound,
        onChange: (v) => { state.settings.sound = v; persist(); track('settings_change', { sound: v }); rerender(); }
      }),
      Toggle({
        label: t('settings.music'),
        iconName: state.settings.music ? 'music-on' : 'music-off',
        checked: state.settings.music,
        onChange: (v) => { state.settings.music = v; persist(); Sound.syncMusic(); track('settings_change', { music: v }); rerender(); }
      })
    ]),
    Card([el('h3', { text: t('settings.language') }), langRow]),
    Card([el('h3', { text: t('settings.theme') }), themeRow]),
    Card([
      Button({
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

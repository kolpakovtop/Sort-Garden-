import { state, persist, defaultSession, addCoins } from '../core/state.js';
import { t } from '../core/i18n.js';
import { track } from '../core/analytics.js';
import * as Sound from '../core/audio.js';
import * as Ads from '../core/ads.js';
import { go, later, every, cancel, onLeave, current } from '../core/router.js';
import { registerLevel, clearLevel } from '../core/debug.js';
import { reportGameplay } from '../core/platform.js';
import { el, Button, IconButton, Chip, Modal, toast, TopBar } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import {
  COLOR_BY_ID, canMove, makeMove, undoMove, isSolved, hasAnyMove,
  findBestMove, safeShuffle, addTube
} from '../game/logic.js';
import { generateLevel, starsFor, coinsFor } from '../game/levels.js';
import { hasCat, taskProgress, checkCatUnlocks, tickThemeTrial } from '../game/meta.js';

// helpers bought on the menu screen and applied to the next level start
export const pendingHelpers = { booster: false, cat: false };

const BOOSTER_KINDS = ['hint', 'undo', 'tube', 'shuffle', 'leaf'];

function boosterCount(kind) {
  const inv = state.meta.boosters[kind] || 0;
  return (state.levelSession.free[kind] || 0) + inv;
}

function spendBooster(kind) {
  const session = state.levelSession;
  if (session.free[kind] > 0) { session.free[kind] -= 1; return true; }
  if ((state.meta.boosters[kind] || 0) > 0) { state.meta.boosters[kind] -= 1; persist(); return true; }
  return false;
}

function noteBoosterUse(kind) {
  state.levelSession.boostersUsed += 1;
  taskProgress('booster', 1);
  track('booster_used', { kind, level: state.levelSession.levelNumber });
  persist();
}

function startLevel(levelNumber) {
  const gen = generateLevel(levelNumber);
  const session = defaultSession(levelNumber);
  session.movesStart = gen.moves;
  session.movesLeft = gen.moves;
  if (pendingHelpers.booster) {
    const kind = BOOSTER_KINDS[Math.floor(Math.random() * BOOSTER_KINDS.length)];
    session.free[kind] += 1;
    session.prelevelBooster = kind;
    pendingHelpers.booster = false;
  }
  if (pendingHelpers.cat) {
    session.catHelperActive = true;
    pendingHelpers.cat = false;
  }
  state.board = gen.board;
  state.levelSession = session;
  track('level_start', { level: levelNumber, moves: gen.moves, colors: gen.colors });
  persist();
}

export function LevelScreen() {
  const levelNumber = state.level;
  if (!state.board || state.levelSession.levelNumber !== levelNumber) startLevel(levelNumber);

  const board = state.board;
  const session = state.levelSession;
  const history = [];
  let busy = false;
  let finished = false;
  let hint = null;          // { from, to }
  let hintTimer = null;
  let idleTimer = null;
  let acted = false;
  let tutorialStep = state.tutorialDone ? -1 : 0;

  const root = el('div', { class: 'screen' });
  const movesChip = Chip({ iconName: 'moves', value: session.movesLeft });
  const coinsChip = Chip({ iconName: 'coin', value: state.coins, cls: 'chip--coin' });
  const boardEl = el('div', { class: 'board' });
  const shelfEl = el('div', { class: 'shelf' });
  const boardWrap = el('div', { class: 'board-wrap' }, [boardEl, shelfEl]);
  const coachHost = el('div');
  const boosterBar = el('div', { class: 'boosters' });

  root.appendChild(TopBar({
    left: IconButton({ name: 'pause', onClick: openPause, aria: t('level.pause'), action: 'pause' }),
    title: `${t('level.title')} ${levelNumber}`,
    right: el('div', { class: 'row' }, [movesChip, coinsChip])
  }));
  root.appendChild(coachHost);
  root.appendChild(boardWrap);
  root.appendChild(boosterBar);

  function onKey(e) {
    if (e.key === 'Escape' && !finished && !document.querySelector('.modal')) {
      e.preventDefault();
      openPause();
    }
  }
  document.addEventListener('keydown', onKey);

  reportGameplay(true);

  onLeave(() => {
    if (hintTimer) clearTimeout(hintTimer);
    document.removeEventListener('keydown', onKey);
    reportGameplay(false);
    clearLevel();
    state.board = null;
  });

  registerLevel({
    board: () => board.tubes.map((tube) => tube.slice()),
    busy: () => busy,
    refresh: () => refresh(),
    setMoves(n) {
      session.movesLeft = Math.max(0, Math.round(n));
      persist();
      renderTop();
      if (session.movesLeft <= 0 && !finished) outOfMoves();
      return session.movesLeft;
    },
    setBoard(tubes) {
      board.tubes = tubes.map((tube) => tube.slice());
      board.selectedTube = null;
      hint = null;
      rebuild();
      return true;
    },
    validMove() {
      if (finished) return null; // level is over: nothing left to play
      // the planned move first: "any legal pair" can ping-pong between two jars
      const best = findBestMove(board);
      if (best && canMove(board, best.from, best.to)) return [best.from, best.to];
      for (let f = 0; f < board.tubes.length; f++) {
        for (let s2 = 0; s2 < board.tubes.length; s2++) {
          if (canMove(board, f, s2)) return [f, s2];
        }
      }
      return null;
    },
    solveOne() {
      const move = findBestMove(board);
      if (!move || busy || finished) return false;
      doMove(move.from, move.to);
      return true;
    }
  });

  /* ---------------- rendering ---------------- */

  // Jar and piece nodes live for the whole level: moves reparent the real
  // element, everything else is a class toggle. Nothing here rebuilds the board.
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeItem(colorId) {
    const color = COLOR_BY_ID[colorId];
    return el('div', {
      class: 'item',
      'data-color': colorId,
      style: { background: color ? color.hex : '#ccc' },
      html: `<span class="icon">${icon(color ? color.sym : 'info')}</span>`
    });
  }

  const makeSlot = () => el('div', { class: 'tube__slot' });

  function tubeNode(items, index) {
    const node = el('button', { type: 'button', class: 'tube', 'data-tube': String(index) });
    items.forEach((colorId) => node.appendChild(makeItem(colorId)));
    for (let i = items.length; i < board.capacity; i++) node.appendChild(makeSlot());
    node.addEventListener('click', () => onTube(index));
    node.addEventListener('pointerdown', () => { if (!busy && !finished) node.classList.add('pressing'); });
    const release = () => node.classList.remove('pressing');
    node.addEventListener('pointerup', release);
    node.addEventListener('pointerleave', release);
    node.addEventListener('pointercancel', release);
    return node;
  }

  function itemsOf(node) { return node.querySelectorAll(':scope > .item'); }
  function slotsOf(node) { return node.querySelectorAll(':scope > .tube__slot'); }

  function isComplete(index) {
    const tube = board.tubes[index];
    return tube.length === board.capacity && tube.every((c) => c === tube[0]);
  }

  // classes only — never touches the node tree
  function syncTubes() {
    board.tubes.forEach((tube, i) => {
      const node = boardEl.children[i];
      if (!node) return;
      node.classList.toggle('selected', board.selectedTube === i);
      node.classList.toggle('tube--hint', !!hint && hint.from === i);
      node.classList.toggle('tube--target', !!hint && hint.to === i);
      const dim = (tutorialStep === 0 && hint && hint.from !== i && hint.to !== i)
        || (tutorialStep === 1 && hint && hint.to !== i && board.selectedTube !== i);
      node.classList.toggle('tube--dim', !!dim);
      if (isComplete(i) && !node.classList.contains('done')) {
        node.classList.add('done', 'settle');
        onceAnimationEnd(node, () => node.classList.remove('settle'));
      } else if (!isComplete(i)) {
        node.classList.remove('done');
      }
      node.setAttribute('aria-label', `${t('booster.tube')} ${i + 1}: ${tube.length}`);
    });
  }

  function onceAnimationEnd(node, fn) {
    const handler = (e) => {
      if (e.target !== node) return;
      node.removeEventListener('animationend', handler);
      fn();
    };
    node.addEventListener('animationend', handler);
    setTimeout(() => { node.removeEventListener('animationend', handler); fn(); }, 600);
  }

  function renderBoard() {
    boardEl.classList.toggle('board--tight', board.tubes.length > 7);
    boardEl.classList.toggle('board--dense', board.tubes.length > 9);
    boardEl.replaceChildren(...board.tubes.map((tube, i) => tubeNode(tube, i)));
    syncTubes();
    sizeShelf();
  }

  function sizeShelf() {
    requestAnimationFrame(() => {
      const first = boardEl.children[0];
      if (!first) return;
      const rows = new Map();
      [...boardEl.children].forEach((node) => {
        const top = Math.round(node.getBoundingClientRect().top);
        rows.set(top, (rows.get(top) || 0) + 1);
      });
      const widest = Math.max(...rows.values());
      const style = getComputedStyle(boardEl);
      const gap = parseFloat(style.columnGap) || 10;
      const tubeW = first.getBoundingClientRect().width;
      shelfEl.style.width = `${Math.round(widest * tubeW + (widest - 1) * gap + 20)}px`;
    });
  }

  const movesValue = el('span', { text: String(session.movesLeft) });
  const coinsValue = el('span', { text: String(state.coins) });
  movesChip.replaceChildren(el('span', { class: 'icon', html: icon('moves') }), movesValue);
  coinsChip.replaceChildren(el('span', { class: 'icon', html: icon('coin') }), coinsValue);

  function pulse(node) {
    node.classList.remove('chip--pulse');
    void node.offsetWidth;
    node.classList.add('chip--pulse');
    onceAnimationEnd(node, () => node.classList.remove('chip--pulse'));
  }

  function renderTop() {
    const moves = String(session.movesLeft);
    if (movesValue.textContent !== moves) { movesValue.textContent = moves; pulse(movesChip); }
    movesChip.classList.toggle('chip--warn', session.movesLeft <= 10 && session.movesLeft > 5);
    movesChip.classList.toggle('chip--danger', session.movesLeft <= 5);
    const coins = String(state.coins);
    if (coinsValue.textContent !== coins) { coinsValue.textContent = coins; pulse(coinsChip); }
  }

  function boosterButton({ kind, iconName, labelKey, onClick, count, reward, tone = 'green', action }) {
    const btn = el('button', {
      type: 'button',
      class: `booster booster--${tone}`,
      'data-action': action || kind,
      'aria-label': `${t(labelKey)}${count !== null ? `: ${count}` : ''}`
    }, [
      el('span', { class: 'booster__icon', html: `<span class="icon">${icon(iconName)}</span>` }),
      el('span', { class: 'booster__label', text: t(labelKey) })
    ]);
    if (count !== null && count > 0) btn.appendChild(el('span', { class: 'booster__count', 'data-badge': action || kind, text: String(count) }));
    else if (reward) btn.appendChild(el('span', { class: 'booster__reward', html: icon('reward') }));
    btn.addEventListener('click', () => { if (!btn.disabled) { Sound.play('tap'); onClick(); } });
    return btn;
  }

  function renderBoosters() {
    const canReward = (src) => Ads.canUseReward(src);
    boosterBar.replaceChildren(
      boosterButton({
        kind: 'hint', iconName: 'hint', action: 'hint', labelKey: 'booster.hint', tone: 'gold', count: boosterCount('hint'),
        reward: canReward('hint_pack'), onClick: useHint
      }),
      boosterButton({
        kind: 'undo', iconName: 'undo', action: 'undo', labelKey: 'booster.undo', tone: 'blue', count: boosterCount('undo'),
        reward: canReward('undo_pack'), onClick: useUndo
      }),
      boosterButton({
        kind: 'tube', iconName: 'plus', action: 'extra-tube', labelKey: 'booster.tube', tone: 'green', count: boosterCount('tube'),
        reward: canReward('extra_tube'), onClick: useExtraTube
      }),
      boosterButton({
        kind: 'leaf', iconName: 'leaf', action: 'leaf', labelKey: 'booster.leaf', tone: 'warm', count: boosterCount('leaf'),
        reward: canReward('magic_leaf'), onClick: useMagicLeaf
      }),
      boosterButton({
        kind: 'help', iconName: 'info', action: 'help', labelKey: 'button.help', tone: 'pink', count: null,
        reward: true, onClick: openHelp
      })
    );
  }

  // state-only update: no node is recreated, so CSS transitions survive
  function refresh() {
    renderTop();
    renderBoosters();
    syncTubes();
  }

  // structural change (level start, extra jar, shuffle) — rebuild is expected
  function rebuild() {
    renderTop();
    renderBoard();
    renderBoosters();
  }

  /* ---------------- coach / tutorial ---------------- */

  function showCoach(text, withSkip) {
    coachHost.replaceChildren(el('div', { class: 'coach' }, [
      el('div', { class: 'coach__row' }, [
        el('span', { class: 'icon icon--lg', style: { color: 'var(--accent)' }, html: icon('leaf') }),
        el('span', { class: 'coach__text', text })
      ]),
      withSkip ? Button({ label: t('button.skip'), variant: 'plain', size: 'sm', wide: false, cls: 'coach__skip', onClick: () => finishTutorial(false) }) : null
    ]));
  }

  function clearCoach() {
    coachHost.replaceChildren();
  }

  function tutorialTick() {
    if (tutorialStep < 0) return;
    if (tutorialStep === 0) {
      hint = findBestMove(board);
      showCoach(t('tutorial.step1'), true);
    } else if (tutorialStep === 1) {
      showCoach(t('tutorial.step2'), true);
    }
    syncTubes();
  }

  function finishTutorial(withReward) {
    const wasStep = tutorialStep;
    tutorialStep = -1;
    hint = null;
    state.tutorialDone = true;
    state.tutorialStep = 3;
    persist();
    clearCoach();
    syncTubes();
    track(withReward === true ? 'tutorial_complete' : 'tutorial_skip', { step: wasStep });
  }

  function tutorialFinale() {
    tutorialStep = 2;
    clearCoach();
    Modal({
      title: t('tutorial.step3'),
      text: t('tutorial.reward'),
      dismissable: false,
      actions: [{
        label: t('button.continue'),
        variant: 'primary',
        onClick: () => {
          addCoins(20, 'tutorial');
          Sound.play('coin');
          finishTutorial(true);
          renderTop();
        }
      }]
    });
  }

  /* ---------------- moves ---------------- */

  function invalid(index) {
    Sound.play('invalid');
    const node = boardEl.children[index];
    if (!node) return;
    node.classList.remove('shake');
    void node.offsetWidth; // restart the animation on the same node
    node.classList.add('shake');
    onceAnimationEnd(node, () => node.classList.remove('shake'));
  }

  function onTube(index) {
    if (busy || finished) return;
    acted = true;
    if (idleTimer) { cancel(idleTimer); idleTimer = null; }
    const selected = board.selectedTube;

    if (selected === null) {
      if (!board.tubes[index].length) { invalid(index); return; }
      board.selectedTube = index;
      Sound.play('tap');
      syncTubes();
      if (tutorialStep === 0) {
        tutorialStep = 1;
        const best = findBestMove(board);
        let to = best && best.from === index ? best.to : null;
        if (to === null) {
          for (let s = 0; s < board.tubes.length; s++) {
            if (canMove(board, index, s)) { to = s; break; }
          }
        }
        hint = to === null ? null : { from: index, to };
        tutorialTick();
        return;
      }
      return;
    }

    if (selected === index) {
      board.selectedTube = null;
      Sound.play('tap');
      syncTubes();
      return;
    }

    if (!canMove(board, selected, index)) { invalid(index); return; }
    doMove(selected, index);
  }

  // FLIP: the piece is reparented first, then animated from where it used to be
  // back to its new home. One WAAPI animation, no phase timers, no clones.
  function animateMove(from, to, onLanded) {
    const srcTube = boardEl.children[from];
    const dstTube = boardEl.children[to];
    if (!srcTube || !dstTube) { onLanded(); return; }
    const srcItems = itemsOf(srcTube);
    const item = srcItems[srcItems.length - 1];
    if (!item) { onLanded(); return; }

    const dstSlots = slotsOf(dstTube);
    const targetSlot = dstSlots[dstSlots.length - 1];
    dstTube.classList.add('target-hint'); // stays through the flight, unlike the slot itself

    // read first…
    const before = item.getBoundingClientRect();

    // …then write: the piece changes parent, jars swap a slot each
    const firstDstSlot = dstSlots[0];
    if (firstDstSlot) dstTube.insertBefore(item, firstDstSlot);
    else dstTube.appendChild(item);
    if (targetSlot) targetSlot.remove();
    srcTube.appendChild(makeSlot());

    const cleanup = () => {
      item.style.transform = '';
      item.classList.remove('animating');
      dstTube.classList.remove('target-hint');
      onLanded();
    };

    if (reduced() || typeof item.animate !== 'function') {
      item.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 120 });
      cleanup();
      return;
    }

    const after = item.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;

    item.classList.add('animating');
    item.style.transform = `translate(${dx}px, ${dy}px)`;

    requestAnimationFrame(() => {
      const anim = item.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, easing: 'cubic-bezier(.22,.9,.3,1)' },
        { transform: `translate(${dx}px, ${dy - 12}px) scale(1.06)`, offset: 0.3, easing: 'cubic-bezier(.4,0,.2,1)' },
        { transform: 'translate(0, -6px) scale(1.06)', offset: 0.75, easing: 'cubic-bezier(.34,1.56,.64,1)' },
        { transform: 'translate(0, 0) scale(1.06, .92)', offset: 0.88, easing: 'ease-out' },
        { transform: 'translate(0, 0) scale(1)' }
      ], { duration: 260 });
      anim.onfinish = cleanup;
      anim.oncancel = cleanup;
    });
  }

  function doMove(from, to) {
    if (busy) return;
    busy = true;
    // model updates immediately; the DOM piece animates into its new jar
    makeMove(board, from, to);
    history.push({ from, to });
    session.movesLeft -= 1;
    board.selectedTube = null;
    hint = null;
    renderTop();
    renderBoosters();
    syncTubes();

    animateMove(from, to, () => {
      Sound.play('move'); // sounds on landing, not on the tap
      syncTubes();
      busy = false;
      afterMove();
    });
  }

  function afterMove() {
    if (finished) return;
    if (isSolved(board)) { win(); return; }
    if (tutorialStep === 1) { tutorialFinale(); return; }
    if (session.movesLeft <= 0) { outOfMoves(); return; }
    if (!hasAnyMove(board)) { stuck(); return; }
  }

  /* ---------------- endings ---------------- */

  function win() {
    finished = true;
    reportGameplay(false);
    const stars = starsFor(session.movesLeft, session.movesStart);
    const coins = coinsFor(session.levelNumber, stars, hasCat('ryzhik'));
    state.starsTotal += stars;
    state.level = Math.max(state.level, session.levelNumber + 1);
    state.ads.levelsSinceLastInterstitial += 1;
    taskProgress('levels', 1);
    tickThemeTrial();
    const newCats = checkCatUnlocks(session.levelNumber);
    persist();
    Sound.play('win');
    track('level_complete', { level: session.levelNumber, stars, movesLeft: session.movesLeft });
    [...boardEl.children].forEach((node, i) => {
      if (!board.tubes[i].length) return;
      setTimeout(() => node.classList.add('tube--bounce'), 60 * i);
    });
    later(() => go('result', { levelNumber: session.levelNumber, stars, coins, newCats }), 640);
  }

  function outOfMoves() {
    track('level_moves_out', { level: session.levelNumber });
    reportGameplay(false);
    const modal = Modal({
      title: t('level.movesOut'),
      text: t('level.movesOutText'),
      dismissable: false,
      actions: [
        el('div', { class: 'col' }, [
          Button({
            label: t('level.extraMoves'),
            sub: t('reward.watch'),
            iconName: 'reward',
            variant: 'reward',
            disabled: !Ads.canUseReward('extra_moves'),
            onClick: async () => {
              const ok = await Ads.showRewarded('extra_moves');
              if (ok) {
                session.movesLeft += 5;
                session.extraMovesRewarded += 1;
                persist();
                modal.close();
                refresh();
              }
            }
          }),
          Button({
            label: t('button.later'),
            variant: 'ghost',
            onClick: () => modal.close()
          }),
          Button({
            label: t('button.menu'),
            variant: 'plain',
            onClick: () => {
              modal.close();
              go('menu');
              Ads.showInterstitial('fail_exit');
            }
          })
        ])
      ]
    });
  }

  function stuck() {
    reportGameplay(false);
    const modal = Modal({
      title: t('level.stuck'),
      text: t('level.stuckText'),
      dismissable: false,
      actions: [
        el('div', { class: 'col' }, [
          Button({
            label: t('booster.shuffle'),
            sub: t('reward.watch'),
            iconName: 'reward',
            variant: 'reward',
            disabled: !Ads.canUseReward('safe_shuffle'),
            onClick: async () => {
              const ok = await Ads.showRewarded('safe_shuffle');
              if (ok) { doShuffle(); modal.close(); }
            }
          }),
          history.length ? Button({
            label: t('booster.undo'),
            iconName: 'undo',
            variant: 'ghost',
            onClick: () => { modal.close(); doUndo(); }
          }) : null,
          Button({
            label: t('button.menu'),
            variant: 'plain',
            onClick: () => {
              modal.close();
              go('menu');
              Ads.showInterstitial('fail_exit');
            }
          })
        ])
      ]
    });
  }

  function openPause() {
    reportGameplay(false);
    const modal = Modal({
      title: t('level.pause'),
      text: t('level.pauseText'),
      onClose: () => { if (!finished && current() === 'level') reportGameplay(true); },
      actions: [
        { label: t('button.continue'), variant: 'primary' },
        { label: t('button.menu'), variant: 'ghost', onClick: () => go('menu') }
      ]
    });
    return modal;
  }

  /* ---------------- boosters ---------------- */

  function showHintMove(move) {
    hint = move;
    syncTubes();
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint = null; syncTubes(); }, 2600);
  }

  function useHint() {
    if (finished) return;
    const freeByCat = hasCat('luna') && session.hintsUsed === 0;
    if (!freeByCat && !spendBooster('hint')) {
      offerReward('hint_pack', () => { session.free.hint += 3; persist(); refresh(); useHint(); });
      return;
    }
    const move = findBestMove(board);
    if (!move) { toast(t('booster.none')); return; }
    session.hintsUsed += 1;
    if (!freeByCat) noteBoosterUse('hint');
    showHintMove(move);
    refresh();
  }

  function doUndo() {
    if (busy) return;
    if (!history.length) { toast(t('booster.noUndo')); return; }
    const last = history[history.length - 1];
    busy = true;
    undoMove(board, history);
    session.movesLeft += 1; // undo gives the move back
    session.undoUsed += 1;
    board.selectedTube = null;
    hint = null;
    renderTop();
    renderBoosters();
    syncTubes();
    animateMove(last.to, last.from, () => { syncTubes(); busy = false; });
  }

  function useUndo() {
    if (finished) return;
    if (!history.length) { toast(t('booster.noUndo')); return; }
    if (!spendBooster('undo')) {
      offerReward('undo_pack', () => { session.free.undo += 3; persist(); refresh(); useUndo(); });
      return;
    }
    noteBoosterUse('undo');
    doUndo();
  }

  function useExtraTube() {
    if (finished) return;
    if (session.extraTubeUsed) { toast(t('reward.used')); return; }
    if (!spendBooster('tube')) {
      offerReward('extra_tube', () => { session.free.tube += 1; persist(); useExtraTube(); });
      return;
    }
    session.extraTubeUsed = true;
    addTube(board);
    noteBoosterUse('tube');
    toast(t('booster.tubeAdded'));
    rebuild();
  }

  function doShuffle() {
    if (safeShuffle(board)) {
      session.shuffleUsed = true;
      board.selectedTube = null;
      hint = null;
      toast(t('booster.shuffled'));
      rebuild();
    } else {
      toast(t('reward.fail'));
    }
  }

  function useShuffle() {
    if (finished) return;
    if (!spendBooster('shuffle')) {
      offerReward('safe_shuffle', () => { noteBoosterUse('shuffle'); doShuffle(); });
      return;
    }
    noteBoosterUse('shuffle');
    doShuffle();
  }

  function autoStep() {
    const move = findBestMove(board);
    if (!move) { toast(t('booster.none')); return false; }
    doMove(move.from, move.to);
    return true;
  }

  function useAutoMove() {
    if (finished || session.autoMoveUsed) { toast(t('reward.used')); return; }
    offerReward('auto_move', () => {
      session.autoMoveUsed = true;
      noteBoosterUse('auto');
      autoStep();
    });
  }

  // Magic Leaf — a gentle two-step helper, safe by construction: it only plays
  // moves the solver suggests, so the level always stays solvable.
  function useMagicLeaf() {
    if (finished) return;
    if (session.magicLeafUsed) { toast(t('reward.used')); return; }
    const run = () => {
      session.magicLeafUsed = true;
      noteBoosterUse('leaf');
      if (autoStep()) later(() => { if (!finished) autoStep(); }, 320);
    };
    if (!spendBooster('leaf')) { offerReward('magic_leaf', run); return; }
    run();
  }

  function offerReward(source, grant) {
    if (!Ads.canUseReward(source)) { toast(t('reward.used')); return; }
    const modal = Modal({
      title: t('reward.title'),
      text: t('reward.text'),
      actions: [
        {
          label: t('reward.watch'),
          iconName: 'reward',
          variant: 'reward',
          onClick: async () => {
            const ok = await Ads.showRewarded(source);
            if (ok) grant();
            refresh();
          }
        },
        { label: t('button.later'), variant: 'ghost' }
      ]
    });
    return modal;
  }

  function openHelp() {
    const modal = Modal({
      title: t('booster.helpTitle'),
      content: el('div', { class: 'col' }, [
        Button({
          label: t('booster.shuffle'),
          sub: boosterCount('shuffle') > 0 ? `${boosterCount('shuffle')}` : t('reward.watch'),
          iconName: 'shuffle',
          variant: 'reward',
          center: false,
          onClick: () => { modal.close(); useShuffle(); }
        }),
        Button({
          label: t('booster.auto'),
          sub: t('reward.watch'),
          iconName: 'reward',
          variant: 'reward',
          center: false,
          disabled: session.autoMoveUsed || !Ads.canUseReward('auto_move'),
          onClick: () => { modal.close(); useAutoMove(); }
        }),
        Button({
          label: t('booster.hintPack'),
          sub: t('reward.watch'),
          iconName: 'hint',
          variant: 'reward',
          center: false,
          disabled: !Ads.canUseReward('hint_pack'),
          onClick: () => {
            modal.close();
            offerReward('hint_pack', () => { session.free.hint += 3; persist(); refresh(); });
          }
        }),
        Button({
          label: t('booster.undoPack'),
          sub: t('reward.watch'),
          iconName: 'undo',
          variant: 'reward',
          center: false,
          disabled: !Ads.canUseReward('undo_pack'),
          onClick: () => {
            modal.close();
            offerReward('undo_pack', () => { session.free.undo += 3; persist(); refresh(); });
          }
        })
      ]),
      actions: [{ label: t('button.close'), variant: 'ghost' }]
    });
  }

  /* ---------------- start ---------------- */

  rebuild();

  if (session.prelevelBooster) {
    toast(`${t('prelevel.ready')}: ${t(`booster.${session.prelevelBooster}`)}`);
    session.prelevelBooster = null;
  }

  if (tutorialStep === 0) {
    track('tutorial_start', {});
    later(tutorialTick, 260);
  } else if (levelNumber <= 2) {
    idleTimer = later(() => {
      if (acted || finished) return;
      const move = findBestMove(board);
      if (move) { showHintMove(move); toast(t('tutorial.idle')); }
    }, 9000);
  }

  if (session.catHelperActive) {
    every(() => {
      if (finished || busy || document.visibilityState === 'hidden') return;
      const move = findBestMove(board);
      if (move) showHintMove(move);
    }, 26000);
  }

  return root;
}

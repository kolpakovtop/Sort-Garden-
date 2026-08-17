import { state, persist, defaultSession, addCoins } from '../core/state.js';
import { t } from '../core/i18n.js';
import { track } from '../core/analytics.js';
import * as Sound from '../core/audio.js';
import * as Ads from '../core/ads.js';
import { go, later, every, cancel, onLeave } from '../core/router.js';
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
  const coinsChip = Chip({ iconName: 'coin', value: state.coins });
  const boardEl = el('div', { class: 'board' });
  const coachHost = el('div');
  const boosterBar = el('div', { class: 'boosters' });

  root.appendChild(TopBar({
    left: IconButton({ name: 'pause', onClick: openPause, aria: t('level.pause') }),
    title: `${t('level.title')} ${levelNumber}`,
    right: el('div', { class: 'row' }, [movesChip, coinsChip])
  }));
  root.appendChild(coachHost);
  root.appendChild(boardEl);
  root.appendChild(boosterBar);

  onLeave(() => {
    if (hintTimer) clearTimeout(hintTimer);
    state.board = null;
  });

  /* ---------------- rendering ---------------- */

  function tubeNode(items, index) {
    const node = el('button', {
      type: 'button',
      class: 'tube',
      'aria-label': `${t('booster.tube')} ${index + 1}: ${items.length}`
    });
    items.forEach((colorId, slot) => {
      const color = COLOR_BY_ID[colorId];
      const item = el('div', {
        class: 'item' + (slot === items.length - 1 && index === lastDropTube ? ' item--drop' : ''),
        style: { background: color ? color.hex : '#ccc' },
        html: `<span class="icon">${icon(color ? color.sym : 'info')}</span>`
      });
      node.appendChild(item);
    });
    for (let i = items.length; i < board.capacity; i++) {
      node.appendChild(el('div', { class: 'tube__slot' }));
    }
    if (board.selectedTube === index) node.classList.add('tube--selected');
    if (hint && hint.from === index) node.classList.add('tube--hint');
    if (hint && hint.to === index) node.classList.add('tube--target');
    if (tutorialStep === 0 && hint && hint.from !== index && hint.to !== index) node.classList.add('tube--dim');
    if (tutorialStep === 1 && hint && hint.to !== index && board.selectedTube !== index) node.classList.add('tube--dim');
    node.addEventListener('click', () => onTube(index));
    return node;
  }

  let lastDropTube = -1;

  function renderBoard() {
    boardEl.classList.toggle('board--tight', board.tubes.length > 7);
    boardEl.replaceChildren(...board.tubes.map((tube, i) => tubeNode(tube, i)));
  }

  function renderTop() {
    movesChip.replaceChildren(
      el('span', { class: 'icon', html: icon('moves') }),
      el('span', { text: String(session.movesLeft) })
    );
    movesChip.classList.toggle('chip--warn', session.movesLeft <= 5);
    coinsChip.replaceChildren(
      el('span', { class: 'icon', html: icon('coin') }),
      el('span', { text: String(state.coins) })
    );
  }

  function boosterButton({ kind, iconName, labelKey, onClick, count, reward }) {
    const btn = el('button', {
      type: 'button',
      class: 'booster',
      'aria-label': `${t(labelKey)}${count !== null ? `: ${count}` : ''}`
    }, [
      el('span', { class: 'icon', html: icon(iconName) }),
      el('span', { text: t(labelKey) })
    ]);
    if (count !== null && count > 0) btn.appendChild(el('span', { class: 'booster__count', text: String(count) }));
    else if (reward) btn.appendChild(el('span', { class: 'booster__reward', html: icon('reward') }));
    btn.addEventListener('click', () => { if (!btn.disabled) { Sound.play('tap'); onClick(); } });
    return btn;
  }

  function renderBoosters() {
    const canReward = (src) => Ads.canUseReward(src);
    boosterBar.replaceChildren(
      boosterButton({
        kind: 'hint', iconName: 'hint', labelKey: 'booster.hint', count: boosterCount('hint'),
        reward: canReward('hint_pack'), onClick: useHint
      }),
      boosterButton({
        kind: 'undo', iconName: 'undo', labelKey: 'booster.undo', count: boosterCount('undo'),
        reward: canReward('undo_pack'), onClick: useUndo
      }),
      boosterButton({
        kind: 'tube', iconName: 'plus', labelKey: 'booster.tube', count: boosterCount('tube'),
        reward: canReward('extra_tube'), onClick: useExtraTube
      }),
      boosterButton({
        kind: 'leaf', iconName: 'leaf', labelKey: 'booster.leaf', count: boosterCount('leaf'),
        reward: canReward('magic_leaf'), onClick: useMagicLeaf
      }),
      boosterButton({
        kind: 'help', iconName: 'info', labelKey: 'button.help', count: null,
        reward: true, onClick: openHelp
      })
    );
  }

  function refresh() {
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
    renderBoard();
  }

  function finishTutorial(withReward) {
    const wasStep = tutorialStep;
    tutorialStep = -1;
    hint = null;
    state.tutorialDone = true;
    state.tutorialStep = 3;
    persist();
    clearCoach();
    renderBoard();
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
    node.classList.remove('tube--shake');
    void node.offsetWidth;
    node.classList.add('tube--shake');
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
      renderBoard();
      return;
    }

    if (selected === index) {
      board.selectedTube = null;
      Sound.play('tap');
      renderBoard();
      return;
    }

    if (!canMove(board, selected, index)) { invalid(index); return; }
    doMove(selected, index);
  }

  function doMove(from, to) {
    busy = true;
    makeMove(board, from, to);
    history.push({ from, to });
    session.movesLeft -= 1;
    board.selectedTube = null;
    hint = null;
    lastDropTube = to;
    Sound.play('move');
    refresh();
    lastDropTube = -1;
    later(() => { busy = false; afterMove(); }, 170);
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
    later(() => go('result', { levelNumber: session.levelNumber, stars, coins, newCats }), 420);
  }

  function outOfMoves() {
    track('level_moves_out', { level: session.levelNumber });
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
    const modal = Modal({
      title: t('level.pause'),
      text: t('level.pauseText'),
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
    renderBoard();
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint = null; renderBoard(); }, 2600);
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
    if (!history.length) { toast(t('booster.noUndo')); return; }
    undoMove(board, history);
    session.movesLeft += 1; // undo gives the move back
    session.undoUsed += 1;
    board.selectedTube = null;
    hint = null;
    refresh();
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
    refresh();
  }

  function doShuffle() {
    if (safeShuffle(board)) {
      session.shuffleUsed = true;
      board.selectedTube = null;
      hint = null;
      toast(t('booster.shuffled'));
      refresh();
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

  refresh();

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

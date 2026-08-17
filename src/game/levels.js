import { COLORS, CAPACITY, distribute, isSolved, hasAnyMove, solve, shuffleArray } from './logic.js';

function pick(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function levelParams(n) {
  if (n <= 2) return { colors: 3, tubes: 5, empty: 2, moves: 45 };
  if (n === 3) return { colors: 3, tubes: 5, empty: 2, moves: 40 };
  if (n <= 5) return { colors: 4, tubes: 6, empty: 2, moves: 50 };
  if (n <= 9) return { colors: pick(4, 5), tubes: 0, empty: 2, moves: 55 };
  if (n <= 14) return { colors: 5, tubes: 7, empty: 2, moves: 60 };
  if (n <= 19) return { colors: pick(5, 6), tubes: 0, empty: 2, moves: 65 };
  if (n <= 29) return { colors: 6, tubes: 8, empty: 1, moves: 70 };
  const extra = Math.min(20, Math.floor((n - 30) / 10) * 5);
  return { colors: 7, tubes: 9, empty: 1, moves: Math.min(100, 80 + extra) };
}

function normalize(params) {
  const colors = Math.min(COLORS.length, Math.max(2, params.colors));
  // a jar per colour, plus the free (empty) jars the player starts with
  const tubes = params.tubes && params.tubes >= colors + params.empty
    ? params.tubes
    : colors + params.empty;
  return { colors, tubes, empty: Math.max(1, params.empty), moves: params.moves };
}

function buildBoard(colors, tubes, empty) {
  const palette = shuffleArray(COLORS).slice(0, colors).map((c) => c.id);
  const items = [];
  for (const id of palette) for (let i = 0; i < CAPACITY; i++) items.push(id);
  const used = Math.max(1, tubes - empty);
  return {
    tubes: distribute(items, tubes, used, CAPACITY),
    capacity: CAPACITY,
    selectedTube: null
  };
}

// Keep a comfortable gap between the optimal solution and the move budget, so
// an unhurried player still finishes without boosters.
function tryParams(params, attempts) {
  let best = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const board = buildBoard(params.colors, params.tubes, params.empty);
    if (isSolved(board) || !hasAnyMove(board)) continue;
    const path = solve(board, 45000);
    if (!path) continue;
    const cost = path.reduce((sum, move) => sum + move.count, 0);
    if (!best || cost < best.cost) best = { board, cost };
    if (cost <= params.moves * 0.62) return { board, moves: params.moves, colors: params.colors };
  }
  return best ? { board: best.board, moves: params.moves, colors: params.colors } : null;
}

export function generateLevel(levelNumber) {
  const params = normalize(levelParams(levelNumber));
  const level = tryParams(params, 10);
  if (level) return level;

  // simpler fallback: fewer colours, one more free jar, a bit more room
  const easy = normalize({
    colors: Math.max(2, params.colors - 1),
    tubes: 0,
    empty: params.empty + 1,
    moves: params.moves + 10
  });
  const easyLevel = tryParams(easy, 12);
  if (easyLevel) return easyLevel;

  return { board: buildBoard(3, 5, 2), moves: 60, colors: 3 };
}

export function starsFor(movesLeft, movesStart) {
  if (movesStart <= 0) return 1;
  const ratio = movesLeft / movesStart;
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.1) return 2;
  return 1;
}

export function coinsFor(levelNumber, stars, hasGingerCat) {
  const base = Math.min(40, 10 + levelNumber);
  return base + stars * 5 + (hasGingerCat ? 5 : 0);
}

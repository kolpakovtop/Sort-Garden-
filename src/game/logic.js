export const COLORS = [
  { id: 'red', hex: '#E46A5E', sym: 'sym_heart' },
  { id: 'orange', hex: '#E89A5D', sym: 'sym_leaf' },
  { id: 'yellow', hex: '#EFC65B', sym: 'sym_star' },
  { id: 'green', hex: '#7BAE7F', sym: 'sym_clover' },
  { id: 'blue', hex: '#6C9BD1', sym: 'sym_drop' },
  { id: 'purple', hex: '#9C86C9', sym: 'sym_diamond' },
  { id: 'pink', hex: '#D98BB6', sym: 'sym_flower' },
  { id: 'teal', hex: '#6BB5A8', sym: 'sym_wave' }
];

export const COLOR_BY_ID = COLORS.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

export const CAPACITY = 4;

export function createTube() {
  return [];
}

export function cloneBoard(board) {
  return {
    tubes: board.tubes.map((t) => t.slice()),
    capacity: board.capacity,
    selectedTube: null
  };
}

export function topOf(tube) {
  return tube.length ? tube[tube.length - 1] : null;
}

export function canMove(board, from, to) {
  if (from === to) return false;
  const src = board.tubes[from];
  const dst = board.tubes[to];
  if (!src || !dst) return false;
  if (!src.length) return false;
  if (dst.length >= board.capacity) return false;
  if (!dst.length) return true;
  return dst[dst.length - 1] === src[src.length - 1];
}

export function makeMove(board, from, to) {
  if (!canMove(board, from, to)) return null;
  const item = board.tubes[from].pop();
  board.tubes[to].push(item);
  return { from, to, item };
}

export function undoMove(board, history) {
  if (!history || !history.length) return null;
  const last = history.pop();
  const item = board.tubes[last.to].pop();
  if (item === undefined) return null;
  board.tubes[last.from].push(item);
  return last;
}

export function isSolved(board) {
  const seen = new Set();
  for (const tube of board.tubes) {
    if (!tube.length) continue;
    const color = tube[0];
    for (const item of tube) if (item !== color) return false;
    if (seen.has(color)) return false; // one colour must live in one jar
    seen.add(color);
  }
  return true;
}

export function hasAnyMove(board) {
  const n = board.tubes.length;
  for (let f = 0; f < n; f++) {
    if (!board.tubes[f].length) continue;
    for (let s = 0; s < n; s++) {
      if (canMove(board, f, s)) return true;
    }
  }
  return false;
}

export function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Spread items over `usedCount` jars as evenly as the capacity allows.
export function distribute(items, tubeCount, usedCount, capacity) {
  const used = Math.max(Math.ceil(items.length / capacity), Math.min(usedCount, tubeCount));
  const counts = new Array(used).fill(0);
  let left = items.length;
  let i = 0;
  while (left > 0) {
    if (counts[i % used] < capacity) { counts[i % used] += 1; left -= 1; }
    i += 1;
    if (i > used * capacity * 2) break;
  }
  const bag = shuffleArray(items);
  const tubes = [];
  let cursor = 0;
  for (const count of counts) {
    tubes.push(bag.slice(cursor, cursor + count));
    cursor += count;
  }
  while (tubes.length < tubeCount) tubes.push([]);
  return shuffleArray(tubes);
}

/* ---------------- solver ---------------- */

function boardKey(tubes) {
  return tubes.map((t) => t.join('.')).sort().join('|');
}

// index-sensitive: needed whenever jar positions matter, not just contents
function orderedKey(tubes) {
  return tubes.map((t) => t.join('.')).join('|');
}

function solvedTubes(tubes) {
  const seen = new Set();
  for (const tube of tubes) {
    if (!tube.length) continue;
    const color = tube[0];
    for (const item of tube) if (item !== color) return false;
    if (seen.has(color)) return false;
    seen.add(color);
  }
  return true;
}

// Whole-run pours. Every pour decomposes into legal single-item moves, so a
// solution found here is always reachable with the moves the player can make.
function pourMoves(tubes, capacity) {
  const moves = [];
  for (let f = 0; f < tubes.length; f++) {
    const src = tubes[f];
    if (!src.length) continue;
    const top = src[src.length - 1];
    let run = 1;
    while (run < src.length && src[src.length - 1 - run] === top) run += 1;
    const uniform = run === src.length;
    if (uniform && src.length === capacity) continue; // finished jar
    let emptyUsed = false;
    for (let s = 0; s < tubes.length; s++) {
      if (s === f) continue;
      const dst = tubes[s];
      const space = capacity - dst.length;
      if (space <= 0) continue;
      if (!dst.length) {
        if (uniform) continue; // pointless relocation
        if (emptyUsed) continue; // all empty jars are equivalent
        emptyUsed = true;
        moves.push({ from: f, to: s, count: Math.min(run, space), score: 1 });
      } else if (dst[dst.length - 1] === top) {
        const count = Math.min(run, space);
        moves.push({ from: f, to: s, count, score: dst.length + count === capacity ? 4 : 3 });
      }
    }
  }
  moves.sort((a, b) => b.score - a.score);
  return moves;
}

function applyPour(tubes, move) {
  const next = tubes.map((t) => t.slice());
  for (let i = 0; i < move.count; i++) next[move.to].push(next[move.from].pop());
  return next;
}

// `avoid` forbids the very first move from undoing a move already played
export function solve(board, budget = 45000, avoid = null) {
  const capacity = board.capacity;
  const seen = new Set();
  let nodes = 0;

  function dfs(tubes, depth, prev) {
    if (nodes++ > budget || depth > 260) return null;
    if (solvedTubes(tubes)) return [];
    const key = boardKey(tubes);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const move of pourMoves(tubes, capacity)) {
      // never undo the move we just made
      if (prev && move.from === prev.to && move.to === prev.from) continue;
      const rest = dfs(applyPour(tubes, move), depth + 1, move);
      if (rest) { rest.unshift(move); return rest; }
    }
    return null;
  }

  return dfs(board.tubes.map((t) => t.slice()), 0, avoid);
}

export function isSolvable(board, budget = 45000) {
  return !!solve(board, budget);
}

// The hint follows one plan: the solver's path is expanded into single moves
// and cached against the state it expects next, so consecutive hints keep
// moving forward instead of undoing each other.
let plan = { key: null, moves: [] };
let lastHint = null;

function moveScore(board, from, to) {
  const src = board.tubes[from];
  const dst = board.tubes[to];
  const color = src[src.length - 1];
  const uniformSrc = src.every((item) => item === color);
  if (!dst.length) return uniformSrc ? 0 : 2; // relocating a finished stack is pointless
  let score = 4;
  if (dst.length + 1 === board.capacity) score += 3;                // completes a jar
  if (src.length === 1) score += 2;                                 // frees a jar
  if (src.length > 1 && src[src.length - 2] !== color) score += 1;  // uncovers a new colour
  return score;
}

function greedyMove(board) {
  let best = null;
  for (let f = 0; f < board.tubes.length; f++) {
    for (let s = 0; s < board.tubes.length; s++) {
      if (!canMove(board, f, s)) continue;
      const score = moveScore(board, f, s);
      if (!best || score > best.score) best = { from: f, to: s, score };
    }
  }
  return best ? { from: best.from, to: best.to } : null;
}

export function findBestMove(board) {
  const key = orderedKey(board.tubes);

  // Plan cache: returning the same move for the same board is fine — the hint
  // is idempotent. As soon as the board advances, advance the plan too.
  if (plan.key === key && plan.moves.length && canMove(board, plan.moves[0].from, plan.moves[0].to)) {
    const head = plan.moves[0];
    const next = cloneBoard(board);
    makeMove(next, head.from, head.to);
    plan = { key: orderedKey(next.tubes), moves: plan.moves.slice(1) };
    lastHint = head;
    return head;
  }

  // a fresh plan must not open by undoing the move the player just made
  const path = solve(board, 30000, lastHint);
  if (path && path.length) {
    const moves = [];
    for (const pour of path) {
      for (let i = 0; i < pour.count; i++) moves.push({ from: pour.from, to: pour.to });
    }
    const head = moves[0];
    const next = cloneBoard(board);
    makeMove(next, head.from, head.to);
    plan = { key: orderedKey(next.tubes), moves: moves.slice(1) };
    lastHint = head;
    return head;
  }

  plan = { key: null, moves: [] };
  const fallback = greedyMove(board);
  lastHint = fallback;
  return fallback;
}

export function safeShuffle(board) {
  const items = board.tubes.flat();
  if (!items.length) return false;
  const emptyNow = board.tubes.filter((t) => !t.length).length;
  const used = Math.max(1, board.tubes.length - Math.max(1, emptyNow));
  let fallback = null;
  for (let attempt = 0; attempt < 24; attempt++) {
    const tubes = distribute(items, board.tubes.length, used, board.capacity);
    const candidate = { tubes, capacity: board.capacity, selectedTube: null };
    if (isSolved(candidate) || !hasAnyMove(candidate)) continue;
    if (!fallback) fallback = tubes;
    if (isSolvable(candidate, 25000)) {
      board.tubes = tubes;
      board.selectedTube = null;
      return true;
    }
  }
  if (fallback) {
    board.tubes = fallback;
    board.selectedTube = null;
    return true;
  }
  return false;
}

export function addTube(board) {
  board.tubes.push(createTube());
  return board.tubes.length - 1;
}

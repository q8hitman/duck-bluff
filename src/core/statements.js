// Statement kinds. A statement is { kind, params }; evaluate() says whether it
// is true about a world. Truthful speakers say true statements, liars false.
import { neighbors, distance, corners, opposite, boardLabel } from './board.js';

export const isEvilForCounting = slot => slot.evil && slot.impostorType !== 'shadow';
export const truthful = slot => !slot.evil && !slot.corrupted;

const others = (w, i) => w.cards.map((_, j) => j).filter(j => j !== i);
const rowCards = (w, row) => w.layout.rows[row];
const countEvil = (w, idx) => idx.filter(j => isEvilForCounting(w.cards[j])).length;
const evil = (w, j) => w.cards[j].evil;
const bools = (key, base = {}) => [{ ...base, [key]: true }, { ...base, [key]: false }];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

function pairs(list) {
  const out = [];
  for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) out.push([list[x], list[y]]);
  return out;
}
function triples(list) {
  const out = [];
  for (let x = 0; x < list.length; x++)
    for (let y = x + 1; y < list.length; y++)
      for (let z = y + 1; z < list.length; z++) out.push([list[x], list[y], list[z]]);
  return out;
}

function nearestFrom(w, i) {
  let best = 0; // 0 = no counted impostor anywhere
  for (const j of others(w, i)) {
    if (!isEvilForCounting(w.cards[j])) continue;
    const d = distance(w.layout, i, j);
    if (best === 0 || d < best) best = d;
  }
  return best;
}

const prev = (w, i) => (i - 1 + w.cards.length) % w.cards.length;
const next = (w, i) => (i + 1) % w.cards.length;

function compare(a, b) {
  return a > b ? 'more' : a < b ? 'less' : 'equal';
}
const CMP = [{ cmp: 'more' }, { cmp: 'less' }, { cmp: 'equal' }];

function halves(w) {
  const n = w.cards.length;
  const first = range(0, Math.floor(n / 2) - 1);
  const second = range(Math.ceil(n / 2), n - 1);
  return [countEvil(w, first), countEvil(w, second)];
}

const targetBool = key => ({
  candidates: (w, i) => others(w, i).flatMap(t => bools(key, { target: t })),
  answer: (w, i, [t]) => ({ target: t }),
});

export const STATEMENT_KINDS = {
  isInnocent: {
    ...targetBool('is'),
    evaluate: (w, i, p) => !evil(w, p.target) === p.is,
    answer: (w, i, [t]) => ({ target: t, is: !evil(w, t) }),
  },
  nameInnocent: {
    evaluate: (w, i, p) => !evil(w, p.target),
    candidates: (w, i) => others(w, i).map(target => ({ target })),
  },
  nameEvil: {
    evaluate: (w, i, p) => evil(w, p.target),
    candidates: (w, i) => others(w, i).map(target => ({ target })),
  },
  revealIdentity: {
    evaluate: (w, i, p) => {
      const s = w.cards[p.target];
      return s.evil === p.evil && (!s.evil || s.impostorType === p.impostorType);
    },
    answer: (w, i, [t]) => ({ target: t, evil: evil(w, t), impostorType: w.cards[t].impostorType }),
    lie: (w, p) => (p.evil ? { target: p.target, evil: false, impostorType: null } : { target: p.target, evil: true, impostorType: 'impostor' }),
  },
  rowEvilCount: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, rowCards(w, w.layout.rowOf[i])) === p.n,
    candidates: (w, i) => range(0, rowCards(w, w.layout.rowOf[i]).length).map(n => ({ n })),
  },
  rowEvilCountOf: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, rowCards(w, p.row)) === p.n,
    answer: (w, i, [row]) => ({ row, n: countEvil(w, rowCards(w, row)) }),
  },
  neighborEvilCount: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, neighbors(w.layout, i)) === p.n,
    candidates: (w, i) => range(0, neighbors(w.layout, i).length).map(n => ({ n })),
  },
  neighborEvilCountOf: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, neighbors(w.layout, p.target)) === p.n,
    answer: (w, i, [t]) => ({ target: t, n: countEvil(w, neighbors(w.layout, t)) }),
  },
  nearestEvil: {
    counting: true,
    evaluate: (w, i, p) => nearestFrom(w, i) === p.n,
    candidates: w => range(1, Math.floor(w.cards.length / 2)).map(n => ({ n })),
  },
  nearestEvilFrom: {
    counting: true,
    evaluate: (w, i, p) => nearestFrom(w, p.target) === p.n,
    answer: (w, i, [t]) => ({ target: t, n: nearestFrom(w, t) }),
  },
  sideCompare: {
    counting: true,
    evaluate: (w, i, p) => compare(countEvil(w, range(0, i - 1)), countEvil(w, range(i + 1, w.cards.length - 1))) === p.cmp,
    candidates: () => CMP,
  },
  halvesCompare: {
    counting: true,
    evaluate: (w, i, p) => compare(...halves(w)) === p.cmp,
    candidates: () => CMP,
  },
  oneOfThree: {
    evaluate: (w, i, p) => p.targets.some(t => evil(w, t)) === p.has,
    candidates: (w, i) => triples(others(w, i)).map(targets => ({ targets, has: true })),
    answer: (w, i, targets) => ({ targets, has: targets.some(t => evil(w, t)) }),
  },
  areaHasEvil: {
    evaluate: (w, i, p) => [p.target, ...neighbors(w.layout, p.target)].some(j => evil(w, j)) === p.has,
    answer: (w, i, [t]) => ({ target: t, has: [t, ...neighbors(w.layout, t)].some(j => evil(w, j)) }),
  },
  countAmong: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, [p.a, p.b]) === p.n,
    answer: (w, i, [a, b]) => ({ a, b, n: countEvil(w, [a, b]) }),
  },
  // Who it names depends on what is still on the table, so round.js picks the two.
  eureka: {
    evaluate: (w, i, p) => (evil(w, p.a) || evil(w, p.b)) === p.has,
    answer: (w, i, [a, b]) => ({ a, b, has: evil(w, a) || evil(w, b) }),
  },
  // One duck breaks at most: with two impostors chosen, the other keeps quiet.
  confession: {
    evaluate: (w, i, p) => (p.confessed === null ? !evil(w, p.a) && !evil(w, p.b) : evil(w, p.confessed)),
    answer: (w, i, [a, b]) => ({ a, b, confessed: [a, b].find(t => evil(w, t)) ?? null }),
    lie: (w, p) => {
      if (p.confessed === null) return { ...p, confessed: p.a };
      const other = p.confessed === p.a ? p.b : p.a;
      return { ...p, confessed: evil(w, other) ? null : other };
    },
  },
  oneOfTwoInnocent: {
    evaluate: (w, i, p) => !evil(w, p.a) || !evil(w, p.b),
    candidates: (w, i) => pairs(others(w, i)).map(([a, b]) => ({ a, b })),
  },
  sameTeam: {
    evaluate: (w, i, p) => (evil(w, p.a) === evil(w, p.b)) === p.same,
    candidates: (w, i) => pairs(others(w, i)).flatMap(([a, b]) => bools('same', { a, b })),
    answer: (w, i, [a, b]) => ({ a, b, same: evil(w, a) === evil(w, b) }),
  },
  isCorrupted: {
    ...targetBool('is'),
    evaluate: (w, i, p) => w.cards[p.target].corrupted === p.is,
    answer: (w, i, [t]) => ({ target: t, is: w.cards[t].corrupted }),
  },
  claimIsReal: {
    ...targetBool('is'),
    evaluate: (w, i, p) => !evil(w, p.target) === p.is,
    answer: (w, i, [t]) => ({ target: t, is: !evil(w, t) }),
  },
  statementTrue: {
    ...targetBool('is'),
    evaluate: (w, i, p) => truthful(w.cards[p.target]) === p.is,
    answer: (w, i, [t]) => ({ target: t, is: truthful(w.cards[t]) }),
  },
  statementFalse: {
    ...targetBool('is'),
    evaluate: (w, i, p) => !truthful(w.cards[p.target]) === p.is,
    candidates: (w, i) => others(w, i).map(target => ({ target, is: true })),
  },
  saboteurAdjacent: {
    ...targetBool('has'),
    evaluate: (w, i, p) => neighbors(w.layout, p.target).some(j => w.cards[j].impostorType === 'saboteur') === p.has,
    answer: (w, i, [t]) => ({ target: t, has: neighbors(w.layout, t).some(j => w.cards[j].impostorType === 'saboteur') }),
  },
  neighborsClean: {
    evaluate: (w, i) => neighbors(w.layout, i).every(j => !w.cards[j].corrupted),
    candidates: () => [{}],
  },
  neighborsTruthful: {
    evaluate: (w, i, p) => neighbors(w.layout, i).every(j => truthful(w.cards[j])) === p.truthful,
    candidates: () => bools('truthful'),
  },
  neighborHasEvil: {
    counting: true,
    evaluate: (w, i, p) => (countEvil(w, neighbors(w.layout, i)) > 0) === p.has,
    candidates: () => bools('has'),
  },
  selfAndNeighborsHaveEvil: {
    counting: true,
    evaluate: (w, i, p) => (countEvil(w, [i, ...neighbors(w.layout, i)]) > 0) === p.has,
    candidates: () => bools('has'),
  },
  prevInnocent: {
    evaluate: (w, i) => !evil(w, prev(w, i)),
    candidates: () => [{}],
  },
  prevTruthful: {
    evaluate: (w, i) => truthful(w.cards[prev(w, i)]),
    candidates: () => [{}],
  },
  nextIs: {
    evaluate: (w, i, p) => evil(w, next(w, i)) === p.evil,
    candidates: () => bools('evil'),
  },
  lastIs: {
    evaluate: (w, i, p) => evil(w, w.cards.length - 1) === p.evil,
    candidates: () => bools('evil'),
  },
  rowHasEvil: {
    counting: true,
    evaluate: (w, i, p) => countEvil(w, rowCards(w, p.row)) > 0,
    candidates: w => w.layout.rows.map((_, row) => ({ row })),
  },
  cornerHasEvil: {
    counting: true,
    evaluate: (w, i, p) => (countEvil(w, corners(w.layout)) > 0) === p.has,
    candidates: () => bools('has'),
  },
  evilParity: {
    counting: true,
    evaluate: (w, i, p) => {
      const sum = w.cards.map((_, j) => j).filter(j => isEvilForCounting(w.cards[j])).reduce((s, j) => s + boardLabel(j), 0);
      return (sum % 2 === 0) === p.even;
    },
    candidates: () => bools('even'),
  },
  twinInnocent: {
    evaluate: (w, i, p) => !evil(w, p.target),
    candidates: (w, i) => others(w, i).map(target => ({ target })),
  },
  selfAndTargetInnocent: {
    evaluate: (w, i, p) => !evil(w, i) && !evil(w, p.target),
    candidates: (w, i) => others(w, i).map(target => ({ target })),
  },
  oppositeInnocent: {
    evaluate: (w, i) => !evil(w, opposite(w.layout, i)),
    candidates: () => [{}],
  },
  otherNeighborIs: {
    evaluate: (w, i, p) => evil(w, p.target) === p.evil,
    candidates: (w, i) => neighbors(w.layout, i).flatMap(t => bools('evil', { target: t })),
  },
  // Two claims about single targets: a truthful speaker makes exactly one true;
  // a liar makes both false (checked in world.js).
  twoClaims: {
    evaluate: (w, i, p) => evaluate(w, i, p.first) !== evaluate(w, i, p.second),
    parts: (w, i, p) => [evaluate(w, i, p.first), evaluate(w, i, p.second)],
    candidates: (w, i) => pairs(others(w, i)).flatMap(([a, b]) => [
      { first: { kind: 'nameInnocent', params: { target: a } }, second: { kind: 'nameInnocent', params: { target: b } } },
      { first: { kind: 'nameEvil', params: { target: a } }, second: { kind: 'nameEvil', params: { target: b } } },
    ]),
  },
  // Delayed cards wrap any single-target statement.
  randomTargeted: {
    evaluate: (w, i, p) => evaluate(w, i, p.inner),
    candidates: (w, i) => others(w, i).flatMap(t => [
      { inner: { kind: 'isInnocent', params: { target: t, is: true } } },
      { inner: { kind: 'isInnocent', params: { target: t, is: false } } },
    ]),
  },
};

export function evaluate(world, i, statement) {
  return STATEMENT_KINDS[statement.kind].evaluate(world, i, statement.params);
}

function flipAnswer(world, kind, p) {
  const def = STATEMENT_KINDS[kind];
  if (def.lie) return def.lie(world, p);
  for (const key of ['is', 'has', 'same', 'evil', 'truthful']) if (key in p) return { ...p, [key]: !p[key] };
  if ('n' in p) return { ...p, n: p.n > 0 ? p.n - 1 : p.n + 1 };
  throw new Error(`no lie for ${kind}`);
}

// Answer to a player-targeted ability. Liars always give a false answer, so
// answers stay consistent with the solver's model for any targets chosen.
export function answerFor(world, i, kind, targets, liar) {
  const truth = STATEMENT_KINDS[kind].answer(world, i, targets);
  return liar ? flipAnswer(world, kind, truth) : truth;
}

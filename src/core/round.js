// Round state machine. Every reducer returns { state, events } and never
// mutates its input; actions during animations or after the end are ignored.
import { createRng } from './rng.js';
import { neighbors } from './board.js';
import { getCard } from './cards.js';
import { answerFor, truthful } from './statements.js';
import { chooseStatement } from './generator.js';

const noop = state => ({ state, events: [] });

export function createRound(generated, { feathers = 3, seed = 1 } = {}) {
  const n = generated.puzzle.shown.length;
  return {
    puzzle: generated.puzzle,
    truth: generated.truth,
    flipped: Array(n).fill(false),
    marks: Array(n).fill(null),
    expelled: Array(n).fill(false),
    used: Array(n).fill(false),
    clues: [],
    feathers,
    status: 'playing',
    busy: false,
    correctExpels: 0,
    expels: 0,
    shield: null,
    pending: [],
    spoken: Array(n).fill(false),
    seed,
    tick: 0,
  };
}

const playing = s => s.status === 'playing' && !s.busy;
const cardAt = (s, i) => getCard(s.puzzle.shown[i]);
const liar = (s, i) => !truthful(s.truth.cards[i]);

export function setBusy(state, busy) {
  return { ...state, busy };
}

export function flip(state, i) {
  if (!playing(state) || state.flipped[i]) return noop(state);
  const flipped = [...state.flipped];
  flipped[i] = true;
  return { state: { ...state, flipped }, events: [{ type: 'flipped', i }] };
}

export function mark(state, i, value) {
  const marks = [...state.marks];
  marks[i] = value;
  return { state: { ...state, marks }, events: [] };
}

function validTargets(state, i, ability, targets) {
  if (targets.length !== ability.targets) return false;
  if (ability.kind === 'rowEvilCountOf') return targets[0] >= 0 && targets[0] < state.puzzle.layout.rows.length;
  const n = state.puzzle.shown.length;
  return new Set(targets).size === targets.length && targets.every(t => Number.isInteger(t) && t >= 0 && t < n && t !== i);
}

export function useAbility(state, i, targets) {
  const ability = cardAt(state, i).ability;
  if (!playing(state) || !ability || !state.flipped[i] || state.expelled[i] || state.used[i]) return noop(state);
  if (!validTargets(state, i, ability, targets)) return noop(state);
  const used = [...state.used];
  used[i] = true;
  if (ability.kind === 'featherShield') {
    return { state: { ...state, used, shield: { by: i, works: !liar(state, i) } }, events: [{ type: 'shieldArmed', i }] };
  }
  if (ability.kind === 'delayedIdentity') {
    return { state: { ...state, used, pending: [...state.pending, { i, target: targets[0] }] }, events: [{ type: 'pending', i, target: targets[0] }] };
  }
  const statement = { kind: ability.kind, params: answerFor(state.truth, i, ability.kind, targets, liar(state, i)) };
  return {
    state: { ...state, used, clues: [...state.clues, { from: i, statement }] },
    events: [{ type: 'answer', i, targets, statement }],
  };
}

// Delayed cards speak once their trigger happens.
function delayedClues(state, trigger, expelledIndex) {
  const events = [];
  const clues = [];
  const spoken = [...state.spoken];
  const rng = createRng(state.seed * 31 + state.tick);
  state.truth.cards.forEach((slot, i) => {
    if (state.expelled[i] || spoken[i]) return;
    const card = getCard(state.puzzle.shown[i]);
    if (card.timing !== trigger) return;
    if (trigger === 'afterNeighborExpel' && !neighbors(state.puzzle.layout, i).includes(expelledIndex)) return;
    const st = chooseStatement(rng, state.truth, i, card.kind);
    if (trigger === 'afterNeighborExpel' && st && st.params.target === expelledIndex) {
      const others = neighbors(state.puzzle.layout, i).filter(j => j !== expelledIndex);
      if (!others.length) return;
      st.params = { target: others[0], evil: state.truth.cards[others[0]].evil };
      if (liar(state, i)) st.params.evil = !st.params.evil;
    }
    if (!st) return;
    spoken[i] = true;
    clues.push({ from: i, statement: st });
    events.push({ type: 'clue', i, statement: st });
  });
  return { spoken, clues, events };
}

export function expel(state, i) {
  if (!playing(state) || state.expelled[i] || !state.flipped[i]) return noop(state);
  const slot = state.truth.cards[i];
  let s = { ...state, expelled: [...state.expelled], tick: state.tick + 1, expels: state.expels + 1 };
  s.expelled[i] = true;
  const events = [];
  let featherLost = false;

  if (slot.evil) {
    s.correctExpels++;
    events.push({ type: 'expelledEvil', i, impostorType: slot.impostorType });
    if (slot.impostorType === 'saboteur') {
      neighbors(s.puzzle.layout, i).filter(j => s.truth.cards[j].corrupted).forEach(j => events.push({ type: 'scrambleFound', i: j }));
    }
    for (const p of s.pending) {
      const statement = { kind: 'revealIdentity', params: answerFor(s.truth, p.i, 'revealIdentity', [p.target], liar(s, p.i)) };
      s.clues = [...s.clues, { from: p.i, statement }];
      events.push({ type: 'answer', i: p.i, targets: [p.target], statement });
    }
    s.pending = [];
  } else {
    events.push({ type: 'expelledInnocent', i });
    if (s.shield) {
      events.push({ type: 'shield', works: s.shield.works });
      featherLost = !s.shield.works;
      s.shield = null;
    } else featherLost = true;
    if (featherLost) {
      s.feathers--;
      events.push({ type: 'featherLost', left: s.feathers });
    }
  }

  const triggers = [];
  if (s.expels === 1) triggers.push('afterFirstExpel');
  if (featherLost) triggers.push('afterFeatherLoss');
  triggers.push('afterNeighborExpel');
  for (const t of triggers) {
    const d = delayedClues(s, t, i);
    s = { ...s, spoken: d.spoken, clues: [...s.clues, ...d.clues] };
    events.push(...d.events);
  }

  const evilLeft = s.truth.cards.some((c, j) => c.evil && !s.expelled[j]);
  if (!evilLeft) { s.status = 'won'; events.push({ type: 'won' }); }
  else if (s.feathers <= 0) { s.status = 'lost'; events.push({ type: 'lost' }); }
  return { state: s, events };
}

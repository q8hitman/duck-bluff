// Round generator: deal a table, write every card's line, and keep only
// rounds whose impostors can be found by logic alone (exactly one answer).
import { createRng } from './rng.js';
import { makeLayout } from './board.js';
import { CARDS, IMPOSTORS, TIER_POINTS, getCard, tierRank } from './cards.js';
import { STATEMENT_KINDS, evaluate, answerFor, truthful } from './statements.js';
import { corruptionOptions } from './world.js';
import { solve } from './solver.js';
import { abilityUses, logicPlay } from './logic-player.js';

const ALL_TYPES = ['impostor', 'saboteur', 'mimic', 'concealer', 'shadow'];
export const CHAPTERS = [
  { id: 1, cards: [5, 6], impostors: [1, 1], types: ['impostor'], budget: [4, 10] },
  { id: 2, cards: [6, 7], impostors: [1, 2], types: ['impostor', 'saboteur'], budget: [5, 13] },
  { id: 3, cards: [7, 9], impostors: [2, 2], types: ['impostor', 'saboteur', 'mimic', 'concealer'], budget: [7, 16] },
  { id: 4, cards: [9, 11], impostors: [2, 3], types: ALL_TYPES, budget: [10, 22] },
  { id: 'endless', cards: [9, 11], impostors: [2, 3], types: ALL_TYPES, budget: [10, 22] },
];
const MAX_ATTEMPTS = 200;
const RELAX_AFTER = 120;
const FAIR_TRIALS = 10;
const UNFAIR_AFTER = 800; // last resort so a round always appears

export function unlockedThrough(chapter) {
  const n = chapter === 'endless' ? 4 : chapter;
  return [...CARDS, ...IMPOSTORS].filter(c => c.chapter <= n).map(c => c.id);
}

const isFlavor = id => getCard(id).tier === 'flavor';
// cards an impostor may wear: info cards whose line appears on flip
const disguisable = c => c.tier !== 'flavor' && c.timing === 'onFlip' && !c.pair;

function pickTypes(rng, spec, unlocked, k, withAbdullah) {
  const allowed = spec.types.filter(t => unlocked.includes(t));
  const weights = allowed.map(t => (t === 'impostor' ? 2 : t === 'mimic' && withAbdullah ? 2 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  return Array.from({ length: k }, () => {
    let r = rng.next() * total;
    for (let x = 0; x < allowed.length; x++) if ((r -= weights[x]) < 0) return allowed[x];
    return allowed[allowed.length - 1];
  });
}

function takeFrom(rng, pool, n, preferAvoid = []) {
  const shuffled = rng.shuffle(pool);
  const preferred = shuffled.filter(id => !preferAvoid.includes(id));
  const rest = shuffled.filter(id => preferAvoid.includes(id));
  return [...preferred, ...rest].slice(0, n);
}

export function chooseStatement(rng, world, i, kind) {
  const def = STATEMENT_KINDS[kind];
  const honest = truthful(world.cards[i]);
  let cands = def.candidates(world, i);
  if (kind === 'twinInnocent') {
    const partner = world.cards.findIndex((c, j) => j !== i && c.realId === getCard(world.cards[i].shownId).pair);
    if (partner >= 0) cands = cands.filter(p => p.target === partner);
  }
  const fitting = cands.filter(params => {
    if (kind === 'twoClaims') {
      const [a, b] = def.parts(world, i, params);
      return honest ? a !== b : !a && !b;
    }
    return evaluate(world, i, { kind, params }) === honest;
  });
  return fitting.length ? { kind, params: rng.pick(fitting) } : null;
}

function attempt(rng, spec, unlocked, recentClub, forceClub, relaxed, wantAbdullah, fair) {
  const count = rng.int(spec.cards[0], spec.cards[1]);
  const k = rng.int(spec.impostors[0], spec.impostors[1]);
  const innocentsN = count - k;
  const have = id => unlocked.includes(id);

  const withAbdullah = have('abdullah') && wantAbdullah;
  const types = pickTypes(rng, spec, unlocked, k, withAbdullah);

  const clubN = Math.max(1, Math.round(innocentsN * (0.3 + rng.next() * 0.15)));
  const flavorMax = Math.max(1, Math.floor(count * 0.25));
  const concealers = types.filter(t => t === 'concealer').length;
  const flavorN = Math.min(rng.int(1, flavorMax), flavorMax - concealers);
  if (flavorN < 1 && innocentsN - clubN > 0) return null;
  let guestN = innocentsN - clubN - Math.max(0, flavorN);
  if (guestN < 0) return null;

  const clubPool = CARDS.filter(c => c.group === 'club' && c.id !== 'abdullah' && have(c.id)).map(c => c.id);
  const forced = forceClub.filter(id => clubPool.includes(id));
  const club = withAbdullah ? ['abdullah'] : [];
  club.push(...rng.shuffle(forced).slice(0, Math.max(0, clubN - club.length)));
  club.push(...takeFrom(rng, clubPool.filter(id => !club.includes(id)), Math.max(0, clubN - club.length), recentClub));
  if (club.length !== clubN && clubN >= club.length) return null;

  const guestPool = CARDS.filter(c => c.group === 'guest' && c.tier !== 'flavor' && have(c.id) && !c.pair).map(c => c.id);
  const guests = [];
  if (guestN >= 2 && have('twinA') && rng.next() < 0.25) { guests.push('twinA', 'twinB'); guestN -= 2; }
  guests.push(...takeFrom(rng, guestPool, guestN));

  const flavorPool = CARDS.filter(c => c.tier === 'flavor' && have(c.id)).map(c => c.id);
  const flavors = takeFrom(rng, flavorPool, Math.max(0, flavorN));
  const innocentIds = [...club, ...guests, ...flavors];
  if (innocentIds.length !== innocentsN) return null;

  // disguises
  const strongest = innocentIds.reduce((best, id) => (tierRank(id) > tierRank(best) ? id : best), innocentIds[0]);
  const usedShown = new Set(innocentIds);
  const evilShown = [];
  for (const t of types) {
    let id;
    if (t === 'mimic') id = isFlavor(strongest) ? null : strongest;
    else {
      const pool = t === 'concealer'
        ? flavorPool.filter(x => !usedShown.has(x))
        : CARDS.filter(c => disguisable(c) && have(c.id) && !usedShown.has(c.id)).map(c => c.id);
      id = pool.length ? rng.pick(pool) : null;
      if (id) usedShown.add(id);
    }
    if (!id) return null;
    evilShown.push(id);
  }

  // placement
  const layout = makeLayout(count);
  const entries = [
    ...innocentIds.map(id => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false })),
    ...types.map((t, x) => ({ shownId: evilShown[x], realId: null, evil: true, impostorType: t, corrupted: false })),
  ];
  const cards = rng.shuffle(entries).map(c => ({ ...c }));
  const truth = { layout, cards };

  // scrambling
  const options = corruptionOptions(truth);
  rng.pick(options).forEach(i => { cards[i].corrupted = true; });

  // lines
  const statements = [];
  let infoPoints = 0;
  for (let i = 0; i < count; i++) {
    const card = getCard(cards[i].shownId);
    if (!card.kind || card.timing !== 'onFlip') { statements.push(null); continue; }
    const st = chooseStatement(rng, truth, i, card.kind);
    if (!st) return null;
    statements.push(st);
    infoPoints += TIER_POINTS[card.tier];
  }
  if (!relaxed && (infoPoints < spec.budget[0] || infoPoints > spec.budget[1])) return null;

  const intendedUses = abilityUses(rng, truth, cards.map(c => c.shownId));

  const shown = cards.map(c => c.shownId);
  const puzzle = { layout, shown, statements, extra: [], impostorTypes: [...types].sort() };
  const evilSet = cards.map((c, i) => (c.evil ? i : -1)).filter(i => i >= 0);
  const withAbilities = solve({ ...puzzle, extra: intendedUses }, { limit: 2 });
  if (withAbilities.evilSets.length !== 1 || withAbilities.evilSets[0].join() !== evilSet.join()) return null;
  if (!relaxed && intendedUses.length >= 2 && solve(puzzle, { limit: 2 }).evilSets.length === 1) return null;

  // Whatever cards the player happens to choose for abilities, logic should be enough.
  if (fair) for (let trial = 0; trial < FAIR_TRIALS; trial++) if (logicPlay({ puzzle, truth }, rng).guesses > 0) return null;

  return { puzzle, truth, meta: { infoPoints, intendedUses } };
}

export function generateRound({ chapter, seed, unlocked, recentClub = [], forceClub = [] }) {
  const spec = CHAPTERS.find(c => c.id === chapter);
  // decided once per round: rounds with him get rejected more, which would skew a per-try roll
  const wantAbdullah = createRng(seed * 31 + 7).next() < 0.25;
  for (let a = 0; a < MAX_ATTEMPTS * 5; a++) {
    const rng = createRng(seed * 7919 + a);
    const result = attempt(rng, spec, unlocked, recentClub, forceClub, a >= RELAX_AFTER, wantAbdullah, a < UNFAIR_AFTER);
    if (result) return { ...result, meta: { ...result.meta, attempts: a + 1 } };
  }
  throw new Error(`could not generate a round for chapter ${chapter} seed ${seed}`);
}

// Brute-force solver: tries every placement of the public impostor types and
// every legal scramble, and collects the impostor sets that fit all statements.
import { claimsAreLegal, corruptionOptions, statementsFit } from './world.js';
import { getCard } from './cards.js';

function combinations(items, k) {
  const out = [];
  const pick = (start, acc) => {
    if (acc.length === k) return out.push([...acc]);
    for (let i = start; i < items.length; i++) {
      acc.push(items[i]);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

function distinctPermutations(types) {
  const out = [];
  const counts = new Map();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  const walk = acc => {
    if (acc.length === types.length) return out.push([...acc]);
    for (const [t, n] of counts) {
      if (n === 0) continue;
      counts.set(t, n - 1);
      acc.push(t);
      walk(acc);
      acc.pop();
      counts.set(t, n);
    }
  };
  walk([]);
  return out;
}

export function solve(puzzle, { limit = 2, known = { evil: [], innocent: [] } } = {}) {
  const { layout, shown, statements, extra = [], impostorTypes } = puzzle;
  const isFlavor = shown.map(id => getCard(id).tier === 'flavor');
  const perms = distinctPermutations(impostorTypes);
  const evilSets = [];
  let worldsChecked = 0;

  for (const set of combinations(shown.map((_, i) => i), impostorTypes.length)) {
    if (known.evil.some(i => !set.includes(i)) || known.innocent.some(i => set.includes(i))) continue;
    let found = false;
    for (const perm of perms) {
      // concealers sit exactly on flavor faces; everyone else on info faces
      if (perm.some((t, k) => (t === 'concealer') !== isFlavor[set[k]])) continue;
      const cards = shown.map(id => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false }));
      set.forEach((i, k) => Object.assign(cards[i], { realId: null, evil: true, impostorType: perm[k] }));
      const world = { layout, cards };
      if (!claimsAreLegal(world)) continue;
      for (const corrupted of corruptionOptions(world)) {
        cards.forEach((c, i) => { c.corrupted = corrupted.includes(i); });
        worldsChecked++;
        if (statementsFit(world, statements, extra)) { found = true; break; }
      }
      if (found) break;
    }
    if (found) {
      evilSets.push(set);
      if (evilSets.length >= limit) break;
    }
  }
  return { evilSets, worldsChecked };
}

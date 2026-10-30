// A patient player: reads every line, uses every ability, expels only what logic
// proves. It lets us measure fairness, and the generator rejects unfair rounds.
import { getCard } from './cards.js';
import { answerFor, truthful } from './statements.js';
import { solve } from './solver.js';

const NO_INFO_ABILITIES = ['featherShield', 'delayedIdentity'];

export function randomTargets(rng, world, i, ability) {
  if (ability.kind === 'rowEvilCountOf') return [rng.int(0, world.layout.rows.length - 1)];
  const others = world.cards.map((_, j) => j).filter(j => j !== i);
  return rng.shuffle(others).slice(0, ability.targets);
}

export function abilityUses(rng, truth, shown) {
  const uses = [];
  shown.forEach((id, i) => {
    const ability = getCard(id).ability;
    if (!ability || NO_INFO_ABILITIES.includes(ability.kind)) return;
    const targets = randomTargets(rng, truth, i, ability);
    const params = answerFor(truth, i, ability.kind, targets, !truthful(truth.cards[i]));
    uses.push({ from: i, targets, statement: { kind: ability.kind, params } });
  });
  return uses;
}

export function logicPlay({ puzzle, truth }, rng) {
  const extra = abilityUses(rng, truth, puzzle.shown);
  const evil = [];
  const innocent = [];
  const total = puzzle.impostorTypes.length;
  let guesses = 0;

  while (evil.length < total) {
    const { evilSets } = solve({ ...puzzle, extra }, { limit: Infinity, known: { evil, innocent } });
    const sure = puzzle.shown.map((_, i) => i).filter(i => !evil.includes(i) && evilSets.every(set => set.includes(i)));
    if (sure.length) {
      evil.push(...sure);
      continue;
    }
    // Nothing is proven, so a person would have to guess: take the likeliest card.
    guesses++;
    const counts = puzzle.shown.map((_, i) => (evil.includes(i) || innocent.includes(i) ? -1 : evilSets.filter(set => set.includes(i)).length));
    const pick = counts.indexOf(Math.max(...counts));
    if (truth.cards[pick].evil) evil.push(pick);
    else innocent.push(pick);
  }
  return { guesses, abilityCount: extra.length };
}

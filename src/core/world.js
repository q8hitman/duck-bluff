// World rules: who may be scrambled, what impostors may pretend to be, and
// whether a set of statements fits a world.
import { neighbors } from './board.js';
import { getCard, tierRank } from './cards.js';
import { STATEMENT_KINDS, evaluate, truthful } from './statements.js';

export const statementShouldBeTrue = (world, i) => truthful(world.cards[i]);

const isRealRawan = slot => !slot.evil && slot.realId === 'rawan';

function legalVictims(world, s) {
  return neighbors(world.layout, s).filter(j => {
    const slot = world.cards[j];
    if (slot.evil || slot.realId === 'abdullah') return false;
    return !neighbors(world.layout, j).some(k => isRealRawan(world.cards[k]));
  });
}

// Every possible corrupted set: each saboteur with a legal neighbour picks one.
export function corruptionOptions(world) {
  const saboteurs = world.cards.map((c, i) => i).filter(i => world.cards[i].impostorType === 'saboteur');
  let sets = [[]];
  for (const s of saboteurs) {
    const victims = legalVictims(world, s);
    if (victims.length === 0) continue;
    sets = sets.flatMap(set => victims.map(v => (set.includes(v) ? set : [...set, v])));
  }
  const seen = new Set();
  return sets.map(s => s.sort((a, b) => a - b)).filter(s => {
    const key = s.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function corruptionIsLegal(world) {
  const actual = world.cards.map((c, i) => i).filter(i => world.cards[i].corrupted).join(',');
  return corruptionOptions(world).some(set => set.join(',') === actual);
}

export function claimsAreLegal(world) {
  const innocentIds = world.cards.filter(c => !c.evil).map(c => c.realId);
  const strongest = Math.max(...innocentIds.map(tierRank));
  const evilShown = [];
  for (const slot of world.cards) {
    if (!slot.evil) continue;
    const card = getCard(slot.shownId);
    if (!card) return false;
    if (slot.impostorType === 'mimic') {
      if (!innocentIds.includes(slot.shownId) || tierRank(slot.shownId) !== strongest) return false;
      continue;
    }
    if (innocentIds.includes(slot.shownId) || evilShown.includes(slot.shownId)) return false;
    evilShown.push(slot.shownId);
    const isFlavor = card.tier === 'flavor';
    if ((slot.impostorType === 'concealer') !== isFlavor) return false;
  }
  return true;
}

function fits(world, speaker, statement) {
  const honest = statementShouldBeTrue(world, speaker);
  if (statement.kind === 'twoClaims') {
    const [a, b] = STATEMENT_KINDS.twoClaims.parts(world, speaker, statement.params);
    return honest ? a !== b : !a && !b;
  }
  return evaluate(world, speaker, statement) === honest;
}

// statements[i] is what card i said (null = nothing yet); extra holds answers
// from abilities and delayed clues as { from, statement }.
export function statementsFit(world, statements, extra = []) {
  for (let i = 0; i < statements.length; i++) if (statements[i] && !fits(world, i, statements[i])) return false;
  for (const e of extra) if (!fits(world, e.from, e.statement)) return false;
  return true;
}

export function isConsistent(world, statements, extra = []) {
  return claimsAreLegal(world) && corruptionIsLegal(world) && statementsFit(world, statements, extra);
}

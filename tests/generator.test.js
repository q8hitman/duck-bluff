import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRound, CHAPTERS, unlockedThrough } from '../src/core/generator.js';
import { solve } from '../src/core/solver.js';
import { getCard } from '../src/core/cards.js';

const SEEDS = Number(process.env.GEN_SEEDS ?? 300);

for (const chapter of [1, 2, 3, 4]) {
  test(`chapter ${chapter}: ${SEEDS} rounds are unique and follow the composition rules`, () => {
    const unlocked = unlockedThrough(chapter);
    const spec = CHAPTERS.find(c => c.id === chapter);
    let abdullah = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { puzzle, truth, meta } = generateRound({ chapter, seed, unlocked, recentClub: [] });
      const evil = truth.cards.map((c, i) => (c.evil ? i : -1)).filter(i => i >= 0);
      const solved = solve({ ...puzzle, extra: meta.intendedUses }, { limit: 2 });
      assert.deepEqual(solved.evilSets, [evil], `seed ${seed}`);
      assert.ok(meta.attempts <= 200);

      const n = puzzle.shown.length;
      assert.ok(n >= spec.cards[0] && n <= spec.cards[1]);
      assert.ok(evil.length >= spec.impostors[0] && evil.length <= spec.impostors[1]);
      const innocents = truth.cards.filter(c => !c.evil).map(c => getCard(c.realId));
      const club = innocents.filter(c => c.group === 'club').length;
      const flavor = puzzle.shown.filter(id => getCard(id).tier === 'flavor').length;
      assert.ok(club >= 1, `seed ${seed} no club`);
      assert.ok(flavor >= 1 && flavor <= Math.max(1, Math.floor(n * 0.25)), `seed ${seed} flavor ${flavor}`);
      if (innocents.some(c => c.id === 'abdullah')) abdullah++;
      const ids = innocents.map(c => c.id);
      assert.equal(ids.includes('twinA'), ids.includes('twinB'));
    }
    assert.ok(abdullah / SEEDS > 0.1 && abdullah / SEEDS < 0.45, `abdullah rate ${abdullah / SEEDS}`);
  });
}

test('same seed gives the same round', () => {
  const a = generateRound({ chapter: 3, seed: 99, unlocked: unlockedThrough(3), recentClub: [] });
  const b = generateRound({ chapter: 3, seed: 99, unlocked: unlockedThrough(3), recentClub: [] });
  assert.deepEqual(a.puzzle, b.puzzle);
});

test('chapter 4 generation is fast on average', () => {
  const t = performance.now();
  for (let seed = 1; seed <= 20; seed++) generateRound({ chapter: 4, seed, unlocked: unlockedThrough(4), recentClub: [] });
  assert.ok((performance.now() - t) / 20 < 150, `avg ${(performance.now() - t) / 20}ms`);
});

test('forced club members appear', () => {
  const r = generateRound({ chapter: 2, seed: 5, unlocked: unlockedThrough(2), recentClub: [], forceClub: ['rawan'] });
  assert.ok(r.truth.cards.some(c => c.realId === 'rawan'));
});

test('more forced members than club slots still generates', () => {
  const forceClub = ['bassam', 'camel', 'ali', 'shouq', 'rawan', 'loujain', 'ruaa', 'zahraa', 'fayzah', 'motivator', 'ahmad', 'ritaj'];
  const r = generateRound({ chapter: 4, seed: 11, unlocked: unlockedThrough(4), recentClub: [], forceClub });
  assert.ok(r.truth.cards.some(c => forceClub.includes(c.realId)));
});

test('rounds never depend on an answer that only arrives after an expel', () => {
  for (const chapter of [4, 'endless']) for (let seed = 1; seed <= 150; seed++) {
    const r = generateRound({ chapter, seed, unlocked: unlockedThrough(chapter), recentClub: [] });
    for (const use of r.meta.intendedUses) assert.notEqual(getCard(r.puzzle.shown[use.from]).ability.kind, 'delayedIdentity');
  }
});

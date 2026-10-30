import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../src/core/solver.js';
import { logicPlay } from '../src/core/logic-player.js';
import { generateRound, unlockedThrough } from '../src/core/generator.js';
import { createRng } from '../src/core/rng.js';
import { createRound, flip, expel } from '../src/core/round.js';
import { roundScore, onRoundWon, defaultSave } from '../src/core/progress.js';
import { makeLayout } from '../src/core/board.js';

test('solver can use what expelling has already proved', () => {
  const puzzle = { layout: makeLayout(5), shown: ['bassam', 'camel', 'lab', 'ali', 'guard'], statements: [null, null, null, null, null], extra: [], impostorTypes: ['impostor', 'impostor'] };
  assert.ok(solve(puzzle, { limit: Infinity }).evilSets.length > 1);
  const known = solve(puzzle, { limit: Infinity, known: { evil: [1], innocent: [0, 2, 3] } });
  assert.deepEqual(known.evilSets, [[1, 4]]);
});

for (const chapter of [1, 2, 3, 4, 'endless']) {
  test(`chapter ${chapter}: a player reasoning alone rarely has to guess`, () => {
    let guesses = 0;
    const rounds = 60;
    for (let seed = 1; seed <= rounds; seed++) {
      const g = generateRound({ chapter, seed, unlocked: unlockedThrough(chapter), recentClub: [] });
      guesses += logicPlay(g, createRng(seed + 5000)).guesses > 0 ? 1 : 0;
    }
    assert.ok(guesses / rounds <= 0.1, `${guesses}/${rounds} rounds needed a guess`);
  });
}

test('generation stays quick', () => {
  const t = performance.now();
  for (let seed = 1; seed <= 20; seed++) generateRound({ chapter: 4, seed, unlocked: unlockedThrough(4), recentClub: [] });
  assert.ok((performance.now() - t) / 20 < 400, `avg ${(performance.now() - t) / 20}ms`);
});

const inn = (id, extra = {}) => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false, ...extra });
const bad = (shownId, impostorType) => ({ shownId, realId: null, evil: true, impostorType, corrupted: false });

function round(cards) {
  const layout = makeLayout(cards.length);
  let s = createRound({
    puzzle: { layout, shown: cards.map(c => c.shownId), statements: cards.map(() => null), extra: [], impostorTypes: [] },
    truth: { layout, cards },
    meta: {},
  }, { feathers: 3, seed: 1 });
  cards.forEach((_, i) => { s = flip(s, i).state; });
  return s;
}

test('catching a saboteur reveals who it scrambled', () => {
  const s = round([inn('camel'), bad('lab', 'saboteur'), inn('ali', { corrupted: true }), inn('bassam'), inn('guard')]);
  const found = expel(s, 1).events.find(e => e.type === 'scrambleFound');
  assert.equal(found?.i, 2);
});

test('score rewards feathers kept and abilities left unused', () => {
  const s = round([inn('camel'), bad('lab', 'impostor'), inn('ali')]);
  const won = expel(s, 1).state;
  const base = roundScore(won); // 3 feathers, 2 unused abilities (camel, ali)
  assert.equal(base, 100 + 3 * 30 + 2 * 25);
  assert.equal(onRoundWon(defaultSave(), { clubIds: [], score: base }).save.score, base);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../src/core/cards.js';
import { generateRound, unlockedThrough } from '../src/core/generator.js';
import { STATEMENT_KINDS } from '../src/core/statements.js';
import { setLang, statementText, cardDesc } from '../src/i18n/i18n.js';
import { makeLayout } from '../src/core/board.js';

test('every card has a clue kind', () => {
  for (const c of CARDS) assert.ok(STATEMENT_KINDS[c.kind], c.id);
});

test('on the table, only delayed cards start without a line', () => {
  for (const chapter of [1, 2, 3, 4]) for (let seed = 1; seed <= 60; seed++) {
    const { puzzle } = generateRound({ chapter, seed, unlocked: unlockedThrough(chapter), recentClub: [] });
    puzzle.shown.forEach((id, i) => {
      const delayed = CARDS.find(c => c.id === id).timing !== 'onFlip';
      assert.equal(puzzle.statements[i] === null, delayed, `${id} chapter ${chapter} seed ${seed}`);
    });
  }
});

test('light ducks say their clue in their own voice', () => {
  const slot = id => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false });
  const world = { layout: makeLayout(6), cards: ['camel', 'bassam', 'lab', 'zahraa', 'ali', 'guard'].map(slot) };
  for (const lang of ['ar', 'en']) {
    setLang(lang);
    for (const c of CARDS.filter(x => x.tier === 'flavor')) {
      const plain = STATEMENT_KINDS[c.kind].candidates(world, 1)[0];
      const voiced = statementText({ kind: c.kind, params: plain }, c.id);
      assert.notEqual(voiced, statementText({ kind: c.kind, params: plain }), `${lang} ${c.id} is not themed`);
      assert.ok(voiced.length > 8 && !/undefined|NaN/.test(voiced), `${lang} ${c.id}: ${voiced}`);
    }
  }
  setLang('ar');
  assert.match(statementText({ kind: 'nameEvil', params: { target: 2 } }, 'cafeteria'), /بطة 3/);
});

test('every card explains itself in both languages', () => {
  for (const lang of ['ar', 'en']) {
    setLang(lang);
    for (const c of CARDS) assert.ok(cardDesc(c.id)?.length > 15, `${lang} ${c.id}`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLang, statementText } from '../src/i18n/i18n.js';
import { makeLayout } from '../src/core/board.js';
import { referredCards } from '../src/core/refs.js';
import { STATEMENT_KINDS } from '../src/core/statements.js';
import { generateRound, unlockedThrough } from '../src/core/generator.js';
import { createRound, flip, expel } from '../src/core/round.js';
import { onRoundWon, onRunLost, defaultSave } from '../src/core/progress.js';
import { getCard } from '../src/core/cards.js';

const layout = makeLayout(9);

test('every line names the numbers of the cards it talks about', () => {
  for (const lang of ['ar', 'en']) {
    setLang(lang);
    for (const chapter of [1, 2, 3, 4]) for (let seed = 1; seed <= 25; seed++) {
      const { puzzle } = generateRound({ chapter, seed, unlocked: unlockedThrough(chapter) });
      puzzle.statements.forEach((st, i) => {
        if (!st || st.kind === 'twoClaims') return;
        const text = statementText(st, puzzle.shown[i], { self: i, layout: puzzle.layout });
        const numbers = (text.match(/\d+/g) ?? []).map(Number);
        for (const j of referredCards(puzzle.layout, i, st)) {
          assert.ok(numbers.includes(j + 1), `${lang} ${st.kind} misses ${j + 1}: ${text}`);
        }
      });
    }
  }
});

test('no line uses words a new player cannot place', () => {
  setLang('ar');
  const words = /جهة|جهتي|الجهات|جيراني|جنبي|قبلي|بعدي|مقابلي/;
  for (const kind of Object.keys(STATEMENT_KINDS)) {
    const def = STATEMENT_KINDS[kind];
    if (!def.candidates || kind === 'twoClaims' || kind === 'randomTargeted') continue;
    const text = statementText({ kind, params: def.candidates({ layout, cards: Array(9).fill({}) }, 1)[0] }, null, { self: 1, layout });
    const stripped = text.replace(/\(.*?\)/g, '');
    assert.ok(!/جهة|جهتي|الجهات/.test(text), `${kind}: ${text}`);
    if (words.test(stripped) && !/\d/.test(text)) assert.fail(`${kind} has no number: ${text}`);
  }
});

test('feathers refill every round and a lost round keeps your place', () => {
  const won = onRoundWon({ ...defaultSave(), feathers: 1 }, { clubIds: [], feathers: 1 }).save;
  assert.equal(won.feathers, 3);
  const lost = onRunLost({ ...defaultSave(), chapter: 2, roundInChapter: 3, feathers: 0 });
  assert.equal(lost.feathers, 3);
  assert.equal(lost.chapter, 2);
  assert.equal(lost.roundInChapter, 3);
});

const inn = id => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false });
const bad = id => ({ shownId: id, realId: null, evil: true, impostorType: 'impostor', corrupted: false });

function round(cards) {
  const l = makeLayout(cards.length);
  let s = createRound({ puzzle: { layout: l, shown: cards.map(c => c.shownId), statements: cards.map(() => null), extra: [], impostorTypes: [] }, truth: { layout: l, cards }, meta: {} }, { feathers: 3, seed: 1 });
  cards.forEach((_, i) => { s = flip(s, i).state; });
  return s;
}

test('expelling the innocent risky duck costs all your feathers', () => {
  const r = expel(round([inn('volatile'), bad('lab'), inn('camel'), inn('ali'), inn('guard')]), 0);
  assert.equal(r.state.feathers, 0);
  assert.equal(r.state.status, 'lost');
  assert.ok(r.events.some(e => e.type === 'blast'));
});

test('an impostor wearing the risky duck is safe to expel', () => {
  const r = expel(round([bad('volatile'), inn('lab'), inn('camel'), bad('ali'), inn('guard')]), 0);
  assert.equal(r.state.feathers, 3);
  assert.ok(!r.events.some(e => e.type === 'blast'));
});

test('the risky duck is a guest with a real clue', () => {
  const card = getCard('volatile');
  assert.equal(card.group, 'guest');
  assert.ok(STATEMENT_KINDS[card.kind]);
});

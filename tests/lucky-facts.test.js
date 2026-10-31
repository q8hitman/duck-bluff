import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLayout } from '../src/core/board.js';
import { createRound, flip, expel } from '../src/core/round.js';
import { generateRound, unlockedThrough } from '../src/core/generator.js';
import { onRoundWon, defaultSave, factForWin } from '../src/core/progress.js';
import facts from '../src/i18n/facts.js';

const inn = id => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false });
const bad = id => ({ shownId: id, realId: null, evil: true, impostorType: 'impostor', corrupted: false });

function round(cards, flipAll = true) {
  const l = makeLayout(cards.length);
  let s = createRound({ puzzle: { layout: l, shown: cards.map(c => c.shownId), statements: cards.map(() => null), extra: [], impostorTypes: [] }, truth: { layout: l, cards }, meta: {} }, { feathers: 3, seed: 1 });
  if (flipAll) cards.forEach((_, i) => { s = flip(s, i).state; });
  return s;
}

test('a flipped lucky duck gives back the first feather you lose', () => {
  const s = round([inn('lucky'), inn('lab'), inn('camel'), bad('ali'), inn('guard')]);
  const first = expel(s, 1);
  assert.equal(first.state.feathers, 3);
  assert.ok(first.events.some(e => e.type === 'luckyFeather'));
  const second = expel(first.state, 2);
  assert.equal(second.state.feathers, 2, 'only once');
});

test('it can save you from losing your last feather', () => {
  let s = round([inn('lucky'), inn('lab'), inn('camel'), bad('ali'), inn('guard')]);
  s = { ...s, feathers: 1 };
  const r = expel(s, 1);
  assert.equal(r.state.feathers, 1);
  assert.equal(r.state.status, 'playing');
});

test('a fake, expelled or unflipped lucky duck gives nothing', () => {
  const fake = expel(round([bad('lucky'), inn('lab'), inn('camel'), inn('ali'), inn('guard')]), 1);
  assert.equal(fake.state.feathers, 2);

  let s = round([inn('lucky'), inn('lab'), inn('camel'), bad('ali'), inn('guard')]);
  s = expel(s, 0).state; // expelling it costs a feather and it can't save itself
  assert.equal(s.feathers, 2);

  let hidden = round([inn('lucky'), inn('lab'), inn('camel'), bad('ali'), inn('guard')], false);
  hidden = flip(hidden, 1).state;
  assert.equal(expel(hidden, 1).state.feathers, 2);
});

test('it does not undo the risky duck', () => {
  const r = expel(round([inn('lucky'), inn('volatile'), inn('camel'), bad('ali'), inn('guard')]), 1);
  assert.equal(r.state.feathers, 0);
  assert.equal(r.state.status, 'lost');
});

test('the lucky duck is rare', () => {
  let seen = 0;
  const rounds = 300;
  for (let seed = 1; seed <= rounds; seed++) {
    const { puzzle } = generateRound({ chapter: 4, seed, unlocked: unlockedThrough(4) });
    if (puzzle.shown.includes('lucky')) seen++;
  }
  assert.ok(seen > 0 && seen / rounds < 0.2, `seen in ${seen}/${rounds}`);
});

test('facts are short and match in both languages', () => {
  assert.equal(facts.ar.length, facts.en.length);
  assert.ok(facts.ar.length >= 12);
  for (const f of facts.ar) assert.ok(f.length <= 85, f);
  for (const f of facts.en) assert.ok(f.length <= 95, f);
});

test('a fact appears only every other win, and never repeats until all are shown', () => {
  let save = defaultSave();
  const shown = [];
  for (let w = 0; w < facts.ar.length * 2; w++) {
    save = onRoundWon(save, { clubIds: [] }).save;
    const i = factForWin(save, facts.ar.length);
    assert.equal(i !== null, w % 2 === 1);
    if (i !== null) shown.push(i);
  }
  assert.equal(new Set(shown).size, facts.ar.length);
});

test('facts can be turned off', () => {
  let save = { ...defaultSave(), settings: { ...defaultSave().settings, facts: false } };
  save = onRoundWon(onRoundWon(save, { clubIds: [] }).save, { clubIds: [] }).save;
  assert.equal(factForWin(save, 10), null);
});

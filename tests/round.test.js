import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, flip, expel, useAbility, setBusy, mark } from '../src/core/round.js';
import { makeLayout } from '../src/core/board.js';
import { evaluate } from '../src/core/statements.js';

const inn = (id, extra = {}) => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false, ...extra });
const bad = (shownId, impostorType = 'impostor') => ({ shownId, realId: null, evil: true, impostorType, corrupted: false });

// 6 cards: 0 bassam, 1 motivator, 2 evil 'ali', 3 camel, 4 evil 'bassam'? (no: unique) 4 evil 'shouq', 5 shy
function round(cards = [inn('bassam'), inn('motivator'), bad('ali'), inn('camel'), bad('shouq'), inn('shy')], feathers = 3) {
  const layout = makeLayout(cards.length);
  const generated = {
    puzzle: { layout, shown: cards.map(c => c.shownId), statements: cards.map(() => null), extra: [], impostorTypes: cards.filter(c => c.evil).map(c => c.impostorType) },
    truth: { layout, cards },
    meta: {},
  };
  let state = createRound(generated, { feathers, seed: 1 });
  for (let i = 0; i < cards.length; i++) state = flip(state, i).state;
  return state;
}
const types = ev => ev.map(e => e.type);

test('expelling an innocent costs a feather; losing all feathers loses', () => {
  let s = round(undefined, 1);
  const r = expel(s, 0);
  assert.equal(r.state.feathers, 0);
  assert.ok(types(r.events).includes('featherLost'));
  assert.ok(types(r.events).includes('lost'));
  assert.equal(r.state.status, 'lost');
});

test('expelling every impostor wins', () => {
  let s = round();
  s = expel(s, 2).state;
  const r = expel(s, 4);
  assert.ok(types(r.events).includes('won'));
  assert.equal(r.state.status, 'won');
});

test('repeat expel, busy state and finished rounds are ignored', () => {
  let s = round();
  s = expel(s, 2).state;
  assert.deepEqual(expel(s, 2).events, []);
  const busy = setBusy(s, true);
  assert.deepEqual(expel(busy, 4).events, []);
  assert.equal(expel(busy, 4).state, busy);
});

test('abilities: once per card, right target count, never self', () => {
  let s = round();
  assert.deepEqual(useAbility(s, 0, [0]).events, []);
  assert.deepEqual(useAbility(s, 0, [1, 2]).events, []);
  const first = useAbility(s, 0, [2]);
  assert.equal(first.events[0].type, 'answer');
  assert.deepEqual(useAbility(first.state, 0, [3]).events, []);
  assert.deepEqual(useAbility(s, 3, [2]).events, [], 'only rows 0 and 1 exist');
  assert.equal(useAbility(s, 3, [1]).events[0].type, 'answer');
});

test('honest bassam tells the truth, a fake one lies', () => {
  const s = round();
  assert.deepEqual(useAbility(s, 0, [2]).events[0].statement.params, { target: 2, is: false });
  const fake = round([inn('camel'), bad('bassam'), inn('ali'), inn('lab'), inn('visitor'), inn('guard')]);
  assert.deepEqual(useAbility(fake, 1, [3]).events[0].statement.params, { target: 3, is: false });
});

test('motivator shield saves one feather only when real', () => {
  let s = useAbility(round(), 1, []).state;
  let r = expel(s, 0);
  assert.equal(r.state.feathers, 3);
  assert.ok(r.events.some(e => e.type === 'shield' && e.works));
  const fakeCards = [inn('bassam'), bad('motivator'), inn('ali'), inn('camel'), inn('lab'), inn('visitor')];
  s = useAbility(round(fakeCards), 1, []).state;
  r = expel(s, 0);
  assert.equal(r.state.feathers, 2);
  assert.ok(r.events.some(e => e.type === 'shield' && !e.works));
});

test('ahmad reveals his target after the next correct expel', () => {
  const cards = [inn('ahmad'), inn('camel'), bad('ali'), inn('lab'), bad('shouq'), inn('visitor')];
  let s = round(cards);
  const pend = useAbility(s, 0, [4]);
  assert.equal(pend.events[0].type, 'pending');
  const r = expel(pend.state, 2);
  const ans = r.events.find(e => e.type === 'answer');
  assert.ok(ans);
  assert.equal(evaluate(s.truth, 0, ans.statement), true);
});

test('shy duck speaks after the first expel, truthfully', () => {
  let s = round();
  const r = expel(s, 2);
  const clue = r.events.find(e => e.type === 'clue' && e.i === 5);
  assert.ok(clue);
  assert.equal(evaluate(s.truth, 5, clue.statement), true);
});

test('marks are stored', () => {
  const s = mark(round(), 3, 'suspect').state;
  assert.equal(s.marks[3], 'suspect');
});

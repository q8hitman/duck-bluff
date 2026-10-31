import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, flip, useAbility, EUREKA_NEEDS } from '../src/core/round.js';
import { evaluate, truthful } from '../src/core/statements.js';
import { makeLayout } from '../src/core/board.js';

const slot = (realId, extra = {}) => ({ realId, evil: false, corrupted: false, impostorType: null, ...extra });
const evilSlot = () => slot(null, { evil: true, impostorType: 'impostor' });

function round(cards, shown) {
  const layout = makeLayout(cards.length);
  return createRound({ puzzle: { layout, shown, statements: shown.map(() => null), impostorTypes: ['impostor'] }, truth: { layout, cards } }, { seed: 5 });
}
const flipAll = s => s.flipped.reduce((state, _, i) => flip(state, i).state, s);

test('eureka waits until enough other cards are flipped', () => {
  let s = round([slot('kiraz'), slot('camel'), evilSlot(), slot('ali'), slot('bassam')], ['kiraz', 'camel', 'lab', 'ali', 'bassam']);
  s = flip(s, 0).state;
  for (let j = 1; j < EUREKA_NEEDS; j++) s = flip(s, j).state;
  assert.equal(useAbility(s, 0, []).events.length, 0);
  s = flip(s, EUREKA_NEEDS).state;
  assert.equal(useAbility(s, 0, []).events[0].type, 'answer');
});

test('a truthful eureka names a real impostor and a false one names none', () => {
  for (let seed = 0; seed < 30; seed++) {
    for (const lying of [false, true]) {
      const speaker = lying ? slot('kiraz', { corrupted: true }) : slot('kiraz');
      let s = round([speaker, slot('camel'), evilSlot(), slot('ali'), slot('bassam'), evilSlot()], ['kiraz', 'camel', 'lab', 'ali', 'bassam', 'lab']);
      s = { ...flipAll(s), seed };
      const { state } = useAbility(s, 0, []);
      const { statement } = state.clues[0];
      assert.notEqual(statement.params.a, statement.params.b);
      assert.ok(![statement.params.a, statement.params.b].includes(0));
      assert.equal(evaluate(s.truth, 0, statement), truthful(speaker), `seed ${seed} lying ${lying}`);
    }
  }
});

test('eureka never names a duck already expelled', () => {
  let s = flipAll(round([slot('kiraz'), slot('camel'), evilSlot(), slot('ali'), evilSlot()], ['kiraz', 'camel', 'lab', 'ali', 'lab']));
  s = { ...s, expelled: [false, false, true, false, false] };
  const { state } = useAbility(s, 0, []);
  const { a, b } = state.clues[0].statement.params;
  assert.ok(![a, b].includes(2));
  assert.ok([a, b].includes(4));
});

test('the experiment counts impostors exactly, and a liar gets it wrong', () => {
  const cards = lying => [lying ? slot('muaili', { corrupted: true }) : slot('muaili'), evilSlot(), evilSlot(), slot('ali')];
  for (const lying of [false, true]) {
    const s = flipAll(round(cards(lying), ['muaili', 'lab', 'lab', 'ali']));
    const { statement } = useAbility(s, 0, [1, 2]).state.clues[0];
    assert.equal(statement.kind, 'countAmong');
    assert.equal(statement.params.n === 2, !lying);
    assert.equal(evaluate(s.truth, 0, statement), !lying);
  }
});

test('heavy teasing covers the chosen duck and both its neighbors, and a liar gets it wrong', () => {
  const cards = lying => [lying ? slot('turki', { corrupted: true }) : slot('turki'), slot('ali'), slot('camel'), slot('bassam'), evilSlot(), slot('ruaa')];
  const shown = ['turki', 'ali', 'camel', 'bassam', 'lab', 'ruaa'];
  for (const lying of [false, true]) {
    const s = flipAll(round(cards(lying), shown));
    for (const [target, has] of [[3, true], [4, true], [5, true], [1, false], [2, false]]) {
      const { statement } = useAbility(s, 0, [target]).state.clues[0];
      assert.equal(statement.params.has, lying ? !has : has, `target ${target} lying ${lying}`);
      assert.equal(evaluate(s.truth, 0, statement), !lying);
    }
  }
});

test('a confession waits for an audience', () => {
  let s = round([slot('hamada'), slot('camel'), evilSlot(), slot('ali'), slot('bassam')], ['hamada', 'camel', 'lab', 'ali', 'bassam']);
  s = flip(s, 0).state;
  for (let j = 1; j < EUREKA_NEEDS; j++) s = flip(s, j).state;
  assert.equal(useAbility(s, 0, [1, 2]).events.length, 0);
  s = flip(s, EUREKA_NEEDS).state;
  assert.equal(useAbility(s, 0, [1, 2]).events[0].type, 'answer');
});

test('only one duck confesses, and a liar always gets it wrong', () => {
  const shown = ['hamada', 'lab', 'lab', 'ali', 'bassam', 'camel'];
  const cards = lying => [lying ? slot('hamada', { corrupted: true }) : slot('hamada'), evilSlot(), evilSlot(), slot('ali'), slot('bassam'), slot('camel')];
  for (const [targets, truth] of [[[1, 2], 1], [[3, 1], 1], [[1, 3], 1], [[3, 4], null]]) {
    const honest = flipAll(round(cards(false), shown));
    const said = useAbility(honest, 0, targets).state.clues[0].statement;
    assert.equal(said.params.confessed, truth);
    assert.equal(evaluate(honest.truth, 0, said), true);
    const lying = flipAll(round(cards(true), shown));
    const lie = useAbility(lying, 0, targets).state.clues[0].statement;
    assert.notEqual(lie.params.confessed, truth);
    assert.equal(evaluate(lying.truth, 0, lie), false);
  }
});

test('an expelled impostor cannot take the confession from a live one', () => {
  let s = flipAll(round([slot('hamada'), evilSlot(), evilSlot(), slot('ali'), slot('bassam')], ['hamada', 'lab', 'lab', 'ali', 'bassam']));
  s = { ...s, expelled: [false, true, false, false, false] };
  assert.equal(useAbility(s, 0, [1, 2]).state.clues[0].statement.params.confessed, 2);
});

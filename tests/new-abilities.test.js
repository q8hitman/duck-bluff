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

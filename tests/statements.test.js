import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATEMENT_KINDS, evaluate, answerFor, isEvilForCounting } from '../src/core/statements.js';
import { CARDS } from '../src/core/cards.js';
import { makeLayout } from '../src/core/board.js';

// rows [0,1,2] [3,4,5]; 2 = shadow, 4 = impostor, 5 corrupted
function fixture() {
  const slot = (shownId, extra = {}) => ({ shownId, realId: shownId, evil: false, impostorType: null, corrupted: false, ...extra });
  return {
    layout: makeLayout(6),
    cards: [
      slot('camel'), slot('bassam'),
      slot('lab', { realId: null, evil: true, impostorType: 'shadow' }),
      slot('zahraa'),
      slot('ali', { realId: null, evil: true, impostorType: 'impostor' }),
      slot('guard', { corrupted: true }),
    ],
  };
}
const ev = (w, i, kind, params) => evaluate(w, i, { kind, params });

test('every catalog kind and ability kind is defined', () => {
  for (const c of CARDS) {
    if (c.kind) assert.ok(STATEMENT_KINDS[c.kind], c.kind);
    if (c.ability && !['featherShield', 'delayedIdentity'].includes(c.ability.kind)) assert.ok(STATEMENT_KINDS[c.ability.kind], c.ability.kind);
  }
});

test('shadow is evil but not counted', () => {
  const w = fixture();
  assert.equal(isEvilForCounting(w.cards[2]), false);
  assert.equal(isEvilForCounting(w.cards[4]), true);
  assert.equal(ev(w, 0, 'rowEvilCount', { n: 0 }), true);
  assert.equal(ev(w, 3, 'rowEvilCount', { n: 1 }), true);
  assert.equal(ev(w, 3, 'rowEvilCount', { n: 2 }), false);
});

test('named targets see shadow as evil', () => {
  const w = fixture();
  assert.equal(ev(w, 0, 'nameEvil', { target: 2 }), true);
  assert.equal(ev(w, 0, 'nameInnocent', { target: 2 }), false);
  assert.equal(ev(w, 0, 'sameTeam', { a: 2, b: 4, same: true }), true);
  assert.equal(ev(w, 0, 'isInnocent', { target: 1, is: true }), true);
});

test('corruption, parity and truthfulness', () => {
  const w = fixture();
  assert.equal(ev(w, 0, 'isCorrupted', { target: 5, is: true }), true);
  assert.equal(ev(w, 0, 'evilParity', { even: false }), true); // only label 5 counts
  assert.equal(ev(w, 0, 'statementTrue', { target: 5, is: false }), true);
  assert.equal(ev(w, 0, 'statementFalse', { target: 1, is: false }), true);
  assert.equal(ev(w, 3, 'neighborsClean', {}), true);
  assert.equal(ev(w, 4, 'neighborsClean', {}), false);
});

test('revealIdentity checks type too', () => {
  const w = fixture();
  assert.equal(ev(w, 0, 'revealIdentity', { target: 4, evil: true, impostorType: 'impostor' }), true);
  assert.equal(ev(w, 0, 'revealIdentity', { target: 4, evil: true, impostorType: 'shadow' }), false);
  assert.equal(ev(w, 0, 'revealIdentity', { target: 1, evil: false, impostorType: null }), true);
});

test('candidates never target self and include both truth values', () => {
  const w = fixture();
  for (const [kind, def] of Object.entries(STATEMENT_KINDS)) {
    if (!def.candidates) continue;
    const self = kind === 'prevInnocent' || kind === 'prevTruthful' ? 1 : 0;
    const cands = def.candidates(w, self);
    for (const p of cands) {
      for (const key of ['target', 'a', 'b']) if (key in p) assert.notEqual(p[key], self, `${kind} targets self`);
      if (p.targets) assert.ok(!p.targets.includes(self), kind);
    }
  }
  const vals = STATEMENT_KINDS.rowEvilCount.candidates(w, 3).map(p => ev(w, 3, 'rowEvilCount', p));
  assert.ok(vals.includes(true) && vals.includes(false));
});

test('answerFor tells the truth unless liar', () => {
  const w = fixture();
  assert.deepEqual(answerFor(w, 0, 'isInnocent', [4], false), { target: 4, is: false });
  assert.deepEqual(answerFor(w, 0, 'isInnocent', [4], true), { target: 4, is: true });
  const lie = answerFor(w, 0, 'rowEvilCountOf', [1], true);
  assert.equal(ev(w, 0, 'rowEvilCountOf', lie), false);
  const truth = answerFor(w, 0, 'nearestEvilFrom', [0], false);
  assert.equal(ev(w, 0, 'nearestEvilFrom', truth), true);
  for (const kind of ['sameTeam', 'oneOfThree', 'revealIdentity', 'saboteurAdjacent', 'statementTrue', 'claimIsReal', 'isCorrupted', 'neighborEvilCountOf']) {
    const n = { sameTeam: [1, 4], oneOfThree: [1, 3, 5] }[kind] ?? [4];
    assert.equal(ev(w, 0, kind, answerFor(w, 0, kind, n, false)), true, kind);
    assert.equal(ev(w, 0, kind, answerFor(w, 0, kind, n, true)), false, kind);
  }
});

test('counts include the speaker, so an impostor line about its own row is false when it reads false', () => {
  const w = fixture();
  assert.equal(ev(w, 4, 'rowEvilCount', { n: 1 }), true);
  assert.equal(ev(w, 4, 'rowHasEvil', { row: 1 }), true);
  assert.equal(ev(w, 4, 'rowEvilCountOf', { row: 1, n: 1 }), true);
  assert.equal(ev(w, 3, 'neighborEvilCountOf', { target: 5, n: 1 }), true);
  assert.equal(ev(w, 4, 'neighborEvilCountOf', { target: 5, n: 1 }), true);
  assert.equal(ev(w, 4, 'evilParity', { even: false }), true);
  assert.equal(ev(w, 4, 'halvesCompare', { cmp: 'less' }), true);
});

test('circle kinds: opposite card and wrap-around prev and next', () => {
  const w = fixture();
  assert.equal(ev(w, 1, 'oppositeInnocent', {}), false); // opposite of 1 is 4, the impostor
  assert.equal(ev(w, 0, 'oppositeInnocent', {}), true);
  assert.equal(ev(w, 0, 'prevInnocent', {}), true); // before 0 is 5
  assert.equal(ev(w, 5, 'nextIs', { evil: false }), true); // after 5 is 0
  assert.equal(ev(w, 0, 'nearestEvil', { n: 2 }), true); // 4 is two steps back; shadow at 2 not counted
});

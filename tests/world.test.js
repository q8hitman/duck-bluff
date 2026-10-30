import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corruptionIsLegal, claimsAreLegal, isConsistent, statementShouldBeTrue } from '../src/core/world.js';
import { makeLayout } from '../src/core/board.js';

const inn = (id, extra = {}) => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false, ...extra });
const bad = (shownId, impostorType) => ({ shownId, realId: null, evil: true, impostorType, corrupted: false });
const world = cards => ({ layout: makeLayout(cards.length), cards });

test('real abdullah can never be corrupted', () => {
  const w = world([inn('abdullah', { corrupted: true }), bad('lab', 'saboteur'), inn('camel')]);
  assert.equal(corruptionIsLegal(w), false);
});

test('real rawan protects her neighbours, a fake one does not', () => {
  const real = world([bad('lab', 'saboteur'), inn('camel', { corrupted: true }), inn('rawan')]);
  assert.equal(corruptionIsLegal(real), false);
  const fake = world([bad('lab', 'saboteur'), inn('camel', { corrupted: true }), bad('rawan', 'impostor')]);
  assert.equal(corruptionIsLegal(fake), true);
});

test('a saboteur corrupts exactly one neighbour', () => {
  assert.equal(corruptionIsLegal(world([inn('camel', { corrupted: true }), bad('lab', 'saboteur'), inn('ali', { corrupted: true })])), false);
  assert.equal(corruptionIsLegal(world([inn('camel'), bad('lab', 'saboteur'), inn('ali')])), false);
  assert.equal(corruptionIsLegal(world([inn('camel'), bad('lab', 'saboteur'), inn('ali', { corrupted: true })])), true);
  assert.equal(corruptionIsLegal(world([inn('camel', { corrupted: true }), inn('ali'), inn('bassam')])), false);
});

test('claim rules', () => {
  assert.equal(claimsAreLegal(world([inn('bassam'), bad('bassam', 'impostor'), inn('camel')])), false);
  assert.equal(claimsAreLegal(world([inn('abdullah'), bad('abdullah', 'mimic'), inn('camel')])), true);
  assert.equal(claimsAreLegal(world([inn('abdullah'), bad('camel', 'mimic'), inn('ali')])), false);
  assert.equal(claimsAreLegal(world([inn('ali'), bad('visitor', 'concealer'), inn('camel')])), true);
  assert.equal(claimsAreLegal(world([inn('ali'), bad('visitor', 'impostor'), inn('camel')])), false);
});

test('consistency follows truthfulness', () => {
  const w = world([inn('bassam'), bad('camel', 'impostor'), inn('ali')]);
  const good = [
    { kind: 'nameInnocent', params: { target: 2 } },
    { kind: 'rowEvilCount', params: { n: 0 } }, // the impostor lies: real count is 1, itself
    { kind: 'sameTeam', params: { a: 0, b: 1, same: false } },
  ];
  assert.equal(statementShouldBeTrue(w, 1), false);
  assert.equal(isConsistent(w, good), true);
  const broken = [...good];
  broken[1] = { kind: 'rowEvilCount', params: { n: 1 } };
  assert.equal(isConsistent(w, broken), false);
});

test('twoClaims: one true when honest, both false when lying', () => {
  const w = world([inn('chatter'), bad('camel', 'impostor'), inn('ali')]);
  const honest = { kind: 'twoClaims', params: { first: { kind: 'nameEvil', params: { target: 1 } }, second: { kind: 'nameEvil', params: { target: 2 } } } };
  assert.equal(isConsistent(w, [honest, null, null]), true);
  const both = { kind: 'twoClaims', params: { first: { kind: 'nameInnocent', params: { target: 2 } }, second: { kind: 'nameEvil', params: { target: 1 } } } };
  assert.equal(isConsistent(w, [both, null, null]), false);
});

test('extra answers are checked against their speaker', () => {
  const w = world([inn('bassam'), bad('camel', 'impostor'), inn('ali')]);
  const ok = [{ from: 0, statement: { kind: 'isInnocent', params: { target: 1, is: false } } }];
  const lie = [{ from: 1, statement: { kind: 'isInnocent', params: { target: 0, is: true } } }];
  assert.equal(isConsistent(w, [null, null, null], ok), true);
  assert.equal(isConsistent(w, [null, null, null], lie), false);
});

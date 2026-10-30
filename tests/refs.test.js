import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referredCards } from '../src/core/refs.js';
import { makeLayout } from '../src/core/board.js';

const layout = makeLayout(9); // sides [0,1,2] [3,4,5] [6,7,8]
const refs = (i, kind, params = {}) => referredCards(layout, i, { kind, params }).sort((a, b) => a - b);

test('named cards', () => {
  assert.deepEqual(refs(0, 'nameEvil', { target: 4 }), [4]);
  assert.deepEqual(refs(0, 'sameTeam', { a: 2, b: 7, same: true }), [2, 7]);
  assert.deepEqual(refs(0, 'oneOfThree', { targets: [1, 4, 8], has: true }), [1, 4, 8]);
  assert.deepEqual(refs(0, 'oneOfTwoInnocent', { a: 3, b: 5 }), [3, 5]);
  assert.deepEqual(refs(5, 'selfAndTargetInnocent', { target: 2 }), [2]);
});

test('cards by position around the circle', () => {
  assert.deepEqual(refs(0, 'prevInnocent'), [8]);
  assert.deepEqual(refs(8, 'nextIs', { evil: true }), [0]);
  assert.deepEqual(refs(0, 'oppositeInnocent'), [4]);
  assert.deepEqual(refs(1, 'lastIs', { evil: false }), [8]);
  assert.deepEqual(refs(4, 'neighborHasEvil', { has: true }), [3, 5]);
  assert.deepEqual(refs(4, 'selfAndNeighborsHaveEvil', { has: true }), [3, 5]);
});

test('sides, leaving out the speaker', () => {
  assert.deepEqual(refs(4, 'rowEvilCount', { n: 1 }), [3, 5]);
  assert.deepEqual(refs(0, 'rowHasEvil', { row: 2 }), [6, 7, 8]);
  assert.deepEqual(refs(0, 'cornerHasEvil', { has: true }), [3, 6]);
});

test('ability answers point at the chosen cards and their surroundings', () => {
  assert.deepEqual(refs(0, 'revealIdentity', { target: 3, evil: false, impostorType: null }), [3]);
  assert.deepEqual(refs(0, 'rowEvilCountOf', { row: 1, n: 0 }), [3, 4, 5]);
  assert.deepEqual(refs(0, 'neighborEvilCountOf', { target: 4, n: 0 }), [3, 4, 5]);
  assert.deepEqual(refs(0, 'nearestEvilFrom', { target: 4, n: 1 }), [4]);
});

test('claims wrapped inside other claims', () => {
  const nameEvil = target => ({ kind: 'nameEvil', params: { target } });
  assert.deepEqual(refs(0, 'twoClaims', { first: nameEvil(2), second: nameEvil(6) }), [2, 6]);
  assert.deepEqual(refs(0, 'randomTargeted', { inner: nameEvil(5) }), [5]);
});

test('lines about the whole table point at nobody', () => {
  assert.deepEqual(refs(0, 'evilParity', { even: true }), []);
  assert.deepEqual(refs(0, 'halvesCompare', { cmp: 'more' }), []);
  assert.deepEqual(refs(0, 'nearestEvil', { n: 2 }), []);
});

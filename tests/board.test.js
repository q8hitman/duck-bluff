import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLayout, neighbors, distance, corners, opposite, boardLabel } from '../src/core/board.js';

test('sides split the circle evenly', () => {
  assert.deepEqual(makeLayout(13).rows.map(r => r.length), [4, 3, 3, 3]);
  assert.deepEqual(makeLayout(5).rows, [[0, 1, 2], [3, 4]]);
  assert.deepEqual(makeLayout(6).rows.map(r => r.length), [3, 3]);
  assert.deepEqual(makeLayout(9).rows.map(r => r.length), [3, 3, 3]);
  const l = makeLayout(9);
  assert.equal(l.rowOf[4], 1);
  assert.equal(l.colOf[4], 1);
});

test('neighbors wrap around the circle', () => {
  const l = makeLayout(7);
  assert.deepEqual(neighbors(l, 0).sort((a, b) => a - b), [1, 6]);
  assert.deepEqual(neighbors(l, 6).sort((a, b) => a - b), [0, 5]);
  assert.deepEqual(neighbors(l, 3).sort((a, b) => a - b), [2, 4]);
});

test('distance takes the short way round', () => {
  const l = makeLayout(9);
  assert.equal(distance(l, 2, 7), 4);
  assert.equal(distance(l, 0, 8), 1);
  assert.equal(distance(l, 1, 3), 2);
});

test('side starts, opposite card and labels', () => {
  const l = makeLayout(9);
  assert.deepEqual(corners(l), [0, 3, 6]);
  assert.equal(opposite(l, 0), 4);
  assert.equal(opposite(makeLayout(6), 5), 2);
  assert.equal(boardLabel(0), 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../src/core/solver.js';
import { makeLayout } from '../src/core/board.js';

// 5 cards in one row; card 3 is the impostor (shown as 'ali').
function puzzle(statements) {
  return { layout: makeLayout(5), shown: ['bassam', 'camel', 'lab', 'ali', 'visitor'], statements, extra: [], impostorTypes: ['impostor'] };
}

test('clues pin down a single impostor', () => {
  const p = puzzle([
    { kind: 'nameInnocent', params: { target: 1 } },      // bassam: true
    { kind: 'rowEvilCount', params: { n: 0 } },           // camel: true, side 1 is clean
    { kind: 'neighborHasEvil', params: { has: true } },   // lab: neighbours 1,3 → true
    { kind: 'nameEvil', params: { target: 1 } },          // ali (impostor): false
    null,
  ]);
  const r = solve(p);
  assert.deepEqual(r.evilSets, [[3]]);
});

test('without clues there are many answers', () => {
  const r = solve(puzzle([null, null, null, null, null]), { limit: 2 });
  assert.equal(r.evilSets.length, 2);
});

test('13 cards with 4 impostors solves quickly', () => {
  const shown = ['abdullah', 'bassam', 'camel', 'ali', 'shouq', 'rawan', 'loujain', 'lab', 'guard', 'witness', 'visitor', 'sleepy', 'plants'];
  const p = { layout: makeLayout(13), shown, statements: shown.map(() => null), extra: [], impostorTypes: ['impostor', 'saboteur', 'concealer', 'shadow'] };
  const t = performance.now();
  solve(p, { limit: Infinity });
  assert.ok(performance.now() - t < 1500, `took ${performance.now() - t}ms`);
});

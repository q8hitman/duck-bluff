import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';

test('rng is deterministic per seed', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const va = Array.from({ length: 10 }, () => a.next());
  const vb = Array.from({ length: 10 }, () => b.next());
  const vc = Array.from({ length: 10 }, () => c.next());
  assert.deepEqual(va, vb);
  assert.notDeepEqual(va, vc);
  assert.ok(va.every(v => v >= 0 && v < 1));
});

test('int stays in range and covers it', () => {
  const r = createRng(7);
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const v = r.int(2, 5);
    assert.ok(v >= 2 && v <= 5);
    seen.add(v);
  }
  assert.equal(seen.size, 4);
});

test('shuffle returns a new permutation', () => {
  const r = createRng(1);
  const src = [1, 2, 3, 4, 5];
  const out = r.shuffle(src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

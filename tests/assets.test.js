import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CARDS, IMPOSTORS, impostorArt, frameOf } from '../src/core/cards.js';

test('every card portrait and frame exists', () => {
  for (const c of CARDS) {
    assert.ok(existsSync(c.portrait), c.portrait);
    assert.ok(existsSync(frameOf(c.id)), c.id);
  }
});

test('impostor art, frames and table exist', () => {
  for (const i of IMPOSTORS) assert.ok(existsSync(impostorArt(i.id)), i.id);
  for (const f of ['frame-impostor', 'card-back', 'table', 'logo', 'emblem']) assert.ok(existsSync(`assets/ui/${f}.webp`), f);
});

test('no card still uses placeholder art', () => {
  assert.deepEqual(CARDS.filter(c => c.portrait.endsWith('.svg')).map(c => c.id), []);
});

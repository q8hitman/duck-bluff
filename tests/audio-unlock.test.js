import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForAudio } from '../src/ui/audio-unlock.js';

const tick = () => new Promise(resolve => setImmediate(resolve));

function page(allowAfter) {
  const listeners = new Map();
  let tries = 0;
  const ctx = { state: 'suspended', resume: async () => { if (++tries >= allowAfter) ctx.state = 'running'; } };
  const target = {
    addEventListener: (g, fn) => listeners.set(g, fn),
    removeEventListener: g => listeners.delete(g),
  };
  return { ctx, target, listeners, tap: () => listeners.get('pointerdown')?.() };
}

test('sound starts on its own when the browser allows it', async () => {
  const p = page(1);
  let ready = 0;
  waitForAudio(p.target, () => p.ctx, () => { ready++; });
  await tick();
  assert.equal(ready, 1);
  assert.equal(p.listeners.size, 0);
});

test('a gesture the browser ignores does not end the wait', async () => {
  const p = page(3);
  let ready = 0;
  waitForAudio(p.target, () => p.ctx, () => { ready++; });
  await tick();
  p.tap();
  await tick();
  assert.equal(ready, 0);
  p.tap();
  await tick();
  assert.equal(ready, 1);
  assert.equal(p.listeners.size, 0);
});

test('a device without audio just keeps waiting quietly', async () => {
  const p = page(1);
  let ready = 0;
  waitForAudio(p.target, () => null, () => { ready++; });
  p.tap();
  await tick();
  assert.equal(ready, 0);
});

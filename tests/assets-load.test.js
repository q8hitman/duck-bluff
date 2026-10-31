import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { retryBrokenImages } from '../src/ui/image-retry.js';

// Runs the real sw.js against a small stand-in for the browser.
function worker(cached = {}) {
  const handlers = {};
  const fetched = [];
  const stored = new Map(Object.entries(cached));
  const added = [];
  const cache = {
    addAll: async files => { added.push(...files); },
    add: async f => { fetched.push(f); },
    match: async req => stored.get(new URL(req.url).pathname),
    put: async (req, res) => { stored.set(new URL(req.url).pathname, res); },
  };
  const self = { addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting: () => {}, clients: { claim: () => {} } };
  const context = {
    self, URL,
    caches: { open: async () => cache, keys: async () => [], match: async () => undefined },
    fetch: async req => { fetched.push(req.url ?? req); return { ok: true, clone() { return this; }, from: 'network' }; },
  };
  vm.runInNewContext(readFileSync('sw.js', 'utf8'), context);
  const request = url => new Promise(resolve => handlers.fetch({ request: { method: 'GET', url }, respondWith: resolve }));
  return { handlers, added, fetched, request };
}

test('installing never waits for the large songs', async () => {
  const sw = worker();
  let waited;
  sw.handlers.install({ waitUntil: p => { waited = p; } });
  await waited;
  assert.ok(sw.added.includes('assets/ducks/hamada.webp'));
  assert.ok(!sw.added.some(f => f.startsWith('assets/music/')));
});

test('art comes from the cache without touching the network', async () => {
  const hit = { from: 'cache' };
  const sw = worker({ '/duck-bluff/assets/ducks/turki.webp': hit });
  assert.equal(await (await sw.request('https://x.test/duck-bluff/assets/ducks/turki.webp')), hit);
  assert.equal(sw.fetched.length, 0);
});

test('art not cached yet still loads, and code always asks the network', async () => {
  const sw = worker();
  assert.equal((await sw.request('https://x.test/duck-bluff/assets/ducks/turki.webp')).from, 'network');
  assert.equal((await sw.request('https://x.test/duck-bluff/src/main.js')).from, 'network');
});

function brokenImage() {
  const waits = [];
  const later = (fn, ms) => waits.push({ fn, ms });
  let onError;
  retryBrokenImages({ addEventListener: (_, fn) => { onError = fn; } }, later);
  let src = 'a.webp';
  const img = { tagName: 'IMG', isConnected: true, loads: 0, getAttribute: () => src, set src(v) { src = v; this.loads++; }, get src() { return src; } };
  return { img, waits, fail: () => onError({ target: img }), swap: v => { src = v; } };
}

test('a broken picture tries again a few times, then stops', () => {
  const b = brokenImage();
  for (let n = 1; n <= 5; n++) {
    const before = b.waits.length;
    b.fail();
    if (b.waits.length > before) b.waits.at(-1).fn();
  }
  assert.equal(b.waits.length, 3);
  assert.equal(b.img.loads, 3);
});

test('a retry never overwrites a picture that changed meanwhile', () => {
  const b = brokenImage();
  b.fail();
  b.swap('b.webp');
  b.waits[0].fn();
  assert.equal(b.img.loads, 0);
  assert.equal(b.img.getAttribute(), 'b.webp');
});

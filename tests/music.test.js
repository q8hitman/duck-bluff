import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

test('the soundtrack ships and is small enough for phones', () => {
  for (const name of ['menu', 'table']) {
    const file = `assets/music/${name}.mp3`;
    assert.ok(existsSync(file), file);
    assert.ok(statSync(file).size < 1.6 * 1024 * 1024, `${file} is too big`);
  }
});

test('the music files are cached for offline play', () => {
  const sw = readFileSync('sw.js', 'utf8');
  assert.ok(sw.includes('assets/music/menu.mp3') && sw.includes('assets/music/table.mp3'));
});

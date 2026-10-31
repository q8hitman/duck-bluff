import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const TRACKS = ['home', 'sneak', 'lab-funk', 'midnight', 'chase'];

test('the soundtrack ships and is small enough for phones', () => {
  for (const name of TRACKS) {
    const file = `assets/music/${name}.mp3`;
    assert.ok(existsSync(file), file);
    assert.ok(statSync(file).size < 1.6 * 1024 * 1024, `${file} is too big`);
  }
});

test('the music files are cached for offline play', () => {
  const sw = readFileSync('sw.js', 'utf8');
  for (const name of TRACKS) assert.ok(sw.includes(`assets/music/${name}.mp3`), name);
});

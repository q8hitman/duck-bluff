import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A filter or opacity on the 3D element flattens it, and flipped cards then show their backs.
test('nothing flattens the flipping part of a card', () => {
  const css = readFileSync('styles/board.css', 'utf8');
  for (const [, selector, body] of css.matchAll(/([^{}]*\.card-inner[^{}]*)\{([^}]*)\}/g)) {
    assert.doesNotMatch(body, /(^|[;\s])(filter|opacity|mix-blend-mode)\s*:/, selector.trim());
  }
});

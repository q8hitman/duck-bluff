import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, IMPOSTORS, getCard, TIER_POINTS } from '../src/core/cards.js';
import ar from '../src/i18n/ar.js';
import en from '../src/i18n/en.js';

test('card ids are unique and groups have the right sizes', () => {
  const ids = CARDS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const club = CARDS.filter(c => c.group === 'club');
  assert.equal(club.length, 19);
  assert.equal(CARDS.filter(c => c.tier === 'flavor').length, 18);
});

test('every club card has an ability and no guest does', () => {
  for (const c of CARDS) {
    if (c.group === 'club') assert.ok(c.ability && c.ability.kind, c.id);
    else assert.equal(c.ability, null, c.id);
  }
});

test('every card and impostor has names in both languages', () => {
  for (const lang of [ar, en]) {
    for (const c of CARDS) {
      assert.ok(lang.cards[c.id]?.name, `${c.id} name`);
      if (c.tier === 'flavor') assert.ok(lang.cards[c.id].flavor, `${c.id} flavor`);
      if (c.ability) assert.ok(lang.cards[c.id].ability, `${c.id} ability`);
    }
    for (const imp of IMPOSTORS) assert.ok(lang.impostors[imp.id]?.name && lang.impostors[imp.id]?.desc, imp.id);
  }
});

test('abdullah is legendary and tier points are fixed', () => {
  assert.equal(getCard('abdullah').tier, 'legendary');
  assert.deepEqual(TIER_POINTS, { legendary: 4, strong: 3, medium: 2, weak: 1, flavor: 1 });
});

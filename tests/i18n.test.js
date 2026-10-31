import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLang, t, dir, statementText } from '../src/i18n/i18n.js';
import { STATEMENT_KINDS, answerFor } from '../src/core/statements.js';
import { makeLayout } from '../src/core/board.js';
import ar from '../src/i18n/ar.js';
import en from '../src/i18n/en.js';

const slot = (id, extra = {}) => ({ shownId: id, realId: id, evil: false, impostorType: null, corrupted: false, ...extra });
const world = { layout: makeLayout(6), cards: [slot('camel'), slot('bassam'), slot('lab', { evil: true, realId: null, impostorType: 'shadow' }), slot('zahraa'), slot('ali', { evil: true, realId: null, impostorType: 'impostor' }), slot('guard', { corrupted: true })] };

test('every statement kind renders in both languages', () => {
  for (const lang of ['ar', 'en']) {
    setLang(lang);
    for (const [kind, def] of Object.entries(STATEMENT_KINDS)) {
      const samples = def.candidates ? def.candidates(world, 1).slice(0, 6) : [];
      if (def.answer) samples.push(answerFor(world, 1, kind, ['sameTeam', 'countAmong', 'eureka'].includes(kind) ? [0, 2] : kind === 'oneOfThree' ? [0, 2, 3] : kind === 'rowEvilCountOf' ? [1] : [2], false));
      assert.ok(samples.length, kind);
      for (const params of samples) {
        const text = statementText({ kind, params });
        assert.equal(typeof text, 'string', `${lang} ${kind}`);
        assert.ok(text.length > 3 && !/undefined|NaN|\{|\}/.test(text), `${lang} ${kind}: ${text}`);
      }
    }
  }
});

test('arabic counts agree with the number', () => {
  setLang('ar');
  assert.match(statementText({ kind: 'rowEvilCount', params: { n: 1 } }), /متنكر واحد/);
  assert.match(statementText({ kind: 'rowEvilCount', params: { n: 2 } }), /متنكرين/);
  assert.match(statementText({ kind: 'rowEvilCount', params: { n: 0 } }), /ما في/);
  assert.match(statementText({ kind: 'nameInnocent', params: { target: 4 } }), /5/);
});

test('ui keys match across languages and direction follows language', () => {
  assert.deepEqual(Object.keys(ar.ui).sort(), Object.keys(en.ui).sort());
  setLang('ar'); assert.equal(dir(), 'rtl');
  setLang('en'); assert.equal(dir(), 'ltr');
  assert.equal(t('play'), en.ui.play);
  assert.match(t('roundOf', { n: 2, total: 4 }), /2/);
});

test('hidden rules are explained and chatter says exactly one is true', () => {
  for (const lang of ['ar', 'en']) {
    setLang(lang);
    assert.ok(t('rules').length > 120, lang);
    const st = { kind: 'twoClaims', params: { first: { kind: 'nameEvil', params: { target: 0 } }, second: { kind: 'nameEvil', params: { target: 1 } } } };
    assert.match(statementText(st), lang === 'ar' ? /وحدة بس/ : /Exactly one/);
  }
  setLang('ar');
  assert.match(statementText({ kind: 'nearestEvil', params: { n: 1 } }), /كرت واحد/);
});

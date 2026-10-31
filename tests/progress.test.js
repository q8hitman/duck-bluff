import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, defaultSave, onRoundWon, onRunLost, onFeatherLost, startChapter, resumeRun, forceClubFor, ROUNDS_PER_CHAPTER, albumSeen, awardBadges } from '../src/core/progress.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('storage that throws falls back to defaults', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const p = createProgress(broken);
  assert.deepEqual(p.load(), defaultSave());
  assert.doesNotThrow(() => p.save(defaultSave()));
});

test('corrupted JSON gives defaults; saves round-trip', () => {
  const store = memory();
  store.setItem('bsc-duck-save', '{nope');
  const p = createProgress(store);
  assert.deepEqual(p.load(), defaultSave());
  const s = { ...defaultSave(), feathers: 2 };
  p.save(s);
  assert.equal(p.load().feathers, 2);
});

test('finishing chapter 1 unlocks chapter 2 cards', () => {
  let s = defaultSave();
  let unlocked = [];
  for (let r = 0; r < ROUNDS_PER_CHAPTER; r++) ({ save: s, newlyUnlocked: unlocked } = onRoundWon(s, { clubIds: [] }));
  assert.equal(s.chapter, 2);
  assert.equal(s.roundInChapter, 1);
  for (const id of ['rawan', 'shouq', 'loujain', 'witness', 'corners', 'skeptic', 'squad', 'news', 'saboteur']) assert.ok(unlocked.includes(id), id);
});

test('after chapter 4 comes endless', () => {
  let s = { ...defaultSave(), chapter: 4, roundInChapter: ROUNDS_PER_CHAPTER };
  s = onRoundWon(s, { clubIds: [] }).save;
  assert.equal(s.chapter, 'endless');
});

test('rotation: last round forces club members not seen this chapter', () => {
  let s = defaultSave();
  s = onRoundWon(s, { clubIds: ['bassam', 'camel'] }).save;
  assert.deepEqual(s.recentClub, ['bassam', 'camel']);
  s = { ...s, roundInChapter: ROUNDS_PER_CHAPTER };
  const forced = forceClubFor(s);
  assert.ok(forced.includes('ali') && !forced.includes('bassam'));
});

test('reaching endless keeps it open after replaying an old chapter', () => {
  const s = onRoundWon({ ...defaultSave(), chapter: 4, roundInChapter: ROUNDS_PER_CHAPTER }, { clubIds: [] }).save;
  assert.equal(s.endlessOpen, true);
});

test('a lost feather is saved right away and leaving gives a new table', () => {
  const s = onFeatherLost(defaultSave(), 2);
  assert.equal(s.feathers, 2);
  assert.equal(s.nextSeed, 2);
});

test('replaying an old chapter keeps the real run', () => {
  const run = { ...defaultSave(), chapter: 4, roundInChapter: 3, feathers: 1, chapterClubSeen: ['ali'] };
  const replay = startChapter(run, 1);
  assert.equal(replay.chapter, 1);
  assert.equal(replay.feathers, 3);
  const back = resumeRun(replay);
  assert.equal(back.chapter, 4);
  assert.equal(back.roundInChapter, 3);
  assert.equal(back.feathers, 1);
  assert.deepEqual(back.chapterClubSeen, ['ali']);
  assert.equal(back.resume, null);
});

test('picking the current chapter does not refill feathers', () => {
  const run = { ...defaultSave(), chapter: 2, roundInChapter: 2, feathers: 1 };
  assert.deepEqual(startChapter(run, 2), run);
});

test('finishing a replayed chapter returns to the real run', () => {
  let s = startChapter({ ...defaultSave(), chapter: 3, roundInChapter: 2, feathers: 2 }, 1);
  s = { ...s, roundInChapter: ROUNDS_PER_CHAPTER };
  s = onRoundWon(s, { clubIds: [] }).save;
  assert.equal(s.chapter, 3);
  assert.equal(s.roundInChapter, 2);
  assert.equal(s.feathers, 2);
});

test('finishing the chapters reveals the whole album', () => {
  const save = { ...defaultSave(), seen: ['abdullah'] };
  assert.equal(albumSeen(save).has('lucky'), false);
  assert.equal(albumSeen({ ...save, endlessOpen: true }).has('lucky'), true);
  assert.equal(albumSeen({ ...save, endlessOpen: true }).has('shadow'), true);
});

test('endless counts a streak, keeps the best, and a loss resets only the streak', () => {
  let save = { ...defaultSave(), chapter: 'endless', endlessOpen: true };
  save = onRoundWon(save, { clubIds: [] }).save;
  save = onRoundWon(save, { clubIds: [] }).save;
  assert.equal(save.streak, 2);
  save = onRunLost(save);
  assert.equal(save.streak, 0);
  assert.equal(save.bestStreak, 2);
});

test('badges are given once and match how the round went', () => {
  const round = { feathers: 3, hadAbilities: true, usedAbility: false };
  const first = awardBadges(defaultSave(), round);
  assert.deepEqual(first.fresh.sort(), ['firstWin', 'flawless', 'pure']);
  assert.deepEqual(awardBadges(first.save, round).fresh, []);
  assert.ok(awardBadges(defaultSave(), { feathers: 1, hadAbilities: true, usedAbility: true }).fresh.includes('clutch'));
});

test('music volume starts at the level the game has always played at', () => {
  assert.equal(defaultSave().settings.musicVolume, 50);
});

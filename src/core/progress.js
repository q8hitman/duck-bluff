// Run progress, unlocks and club rotation, saved on the device.
import { CARDS, IMPOSTORS, getCard } from './cards.js';

const KEY = 'bsc-duck-save';
export const ROUNDS_PER_CHAPTER = 4;
const ROUND_FEATHERS = 3;
const all = [...CARDS, ...IMPOSTORS];
const idsOfChapter = n => all.filter(c => c.chapter === n).map(c => c.id);
const clubIds = () => CARDS.filter(c => c.group === 'club').map(c => c.id);

export const DEFAULT_MUSIC_VOLUME = 50;

export function defaultSave() {
  return {
    version: 1,
    chapter: 1,
    roundInChapter: 1,
    feathers: 3,
    unlocked: idsOfChapter(1),
    recentClub: [],
    chapterClubSeen: [],
    nextSeed: 1,
    score: 0,
    wins: 0,
    settings: { lang: 'ar', reduceMotion: null, sound: true, music: true, musicVolume: DEFAULT_MUSIC_VOLUME, facts: true },
  };
}

export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    s.setItem('__probe', '1');
    s.removeItem?.('__probe');
    return s;
  } catch {
    const m = new Map();
    return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
  }
}

export function createProgress(storage = safeStorage()) {
  return {
    load() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return defaultSave();
        const data = JSON.parse(raw);
        if (data?.version !== 1) return defaultSave();
        return { ...defaultSave(), ...data, settings: { ...defaultSave().settings, ...data.settings } };
      } catch {
        return defaultSave();
      }
    },
    save(s) {
      try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: keep playing */ }
    },
  };
}

// 100 for the round, plus a reward for mistakes avoided and abilities not needed.
export function roundScore(state) {
  const unused = state.puzzle.shown.filter((id, i) => getCard(id).ability && !state.used[i]).length;
  return 100 + state.feathers * 30 + unused * 25;
}

export const BADGES = ['firstWin', 'flawless', 'clutch', 'pure', 'graduate', 'streak5', 'streak10', 'score5000'];

// Badges earned by the save as it stands, plus how the round just went.
function earned(save, { feathers, hadAbilities, usedAbility }) {
  const rules = {
    firstWin: true,
    flawless: feathers === 3,
    clutch: feathers === 1,
    pure: hadAbilities && !usedAbility,
    graduate: Boolean(save.endlessOpen),
    streak5: (save.streak ?? 0) >= 5,
    streak10: (save.streak ?? 0) >= 10,
    score5000: (save.score ?? 0) >= 5000,
  };
  return BADGES.filter(id => rules[id]);
}

// Records the round in the save and returns the badges that are new.
export function awardBadges(save, round) {
  const have = save.badges ?? [];
  const fresh = earned(save, round).filter(id => !have.includes(id));
  return { save: { ...save, badges: [...have, ...fresh] }, fresh };
}

export function onRoundWon(save, { clubIds: played, score = 0 }) {
  const s = { ...save, wins: (save.wins ?? 0) + 1, feathers: ROUND_FEATHERS, score: (save.score ?? 0) + score, recentClub: [...played], chapterClubSeen: [...new Set([...save.chapterClubSeen, ...played])], nextSeed: save.nextSeed + 1 };
  if (s.chapter === 'endless') {
    const streak = (s.streak ?? 0) + 1;
    return { save: { ...s, streak, bestStreak: Math.max(s.bestStreak ?? 0, streak) }, newlyUnlocked: [] };
  }
  if (s.roundInChapter < ROUNDS_PER_CHAPTER) return { save: { ...s, roundInChapter: s.roundInChapter + 1 }, newlyUnlocked: [] };
  if (s.resume) return { save: resumeRun(s), newlyUnlocked: [] };
  const next = s.chapter + 1;
  if (next > 4) return { save: { ...s, chapter: 'endless', endlessOpen: true, roundInChapter: 1, chapterClubSeen: [] }, newlyUnlocked: [] };
  const newlyUnlocked = idsOfChapter(next).filter(id => !s.unlocked.includes(id));
  return {
    save: { ...s, chapter: next, roundInChapter: 1, chapterClubSeen: [], unlocked: [...s.unlocked, ...newlyUnlocked] },
    newlyUnlocked,
  };
}

// A fact shows on every other win, cycling through all of them, or never if turned off.
export function factForWin(save, total) {
  if (save.settings.facts === false || !save.wins || save.wins % 2) return null;
  return (save.wins / 2 - 1) % total;
}

export function onRunLost(save) {
  return { ...save, feathers: ROUND_FEATHERS, nextSeed: save.nextSeed + 1, streak: save.chapter === 'endless' ? 0 : save.streak };
}

// Saved at once, with a new table next time, so leaving a round can't undo a mistake.
export function onFeatherLost(save, left) {
  return { ...save, feathers: left, nextSeed: save.nextSeed + 1 };
}

// Replaying an old chapter parks the real run so nothing is lost.
export function startChapter(save, id) {
  if (id === save.chapter) return save;
  if (save.resume?.chapter === id) return resumeRun(save);
  const { chapter, roundInChapter, feathers, chapterClubSeen } = save;
  const resume = save.resume ?? { chapter, roundInChapter, feathers, chapterClubSeen };
  return { ...save, resume, chapter: id, roundInChapter: 1, feathers: 3, chapterClubSeen: [] };
}

export function resumeRun(save) {
  return save.resume ? { ...save, ...save.resume, resume: null } : save;
}

// On the chapter's last round, bring in unlocked club ducks not yet seen.
export function forceClubFor(save) {
  if (save.chapter === 'endless' || save.roundInChapter < ROUNDS_PER_CHAPTER) return [];
  return clubIds().filter(id => save.unlocked.includes(id) && id !== 'abdullah' && !save.chapterClubSeen.includes(id));
}

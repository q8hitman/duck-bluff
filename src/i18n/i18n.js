// Language state, UI strings and the text of every card line.
import ar from './ar.js';
import en from './en.js';
import descriptions from './descriptions.js';
import facts from './facts.js';
import { makeLayout, boardLabel, opposite } from '../core/board.js';
import { countedCards } from '../core/refs.js';

const LANGS = { ar, en };
let lang = 'ar';

export const setLang = l => { lang = LANGS[l] ? l : 'ar'; };
export const getLang = () => lang;
export const dir = () => (lang === 'ar' ? 'rtl' : 'ltr');
export const cardText = id => LANGS[lang].cards[id];
export const factText = i => facts[lang][i];
export const factCount = () => facts[lang].length;
export const cardDesc = id => descriptions[lang][id];
export const impostorText = id => LANGS[lang].impostors[id];

export function t(key, vars = {}) {
  const raw = LANGS[lang].ui[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const cardsAway = n => (n === 1 ? 'كرت واحد' : n === 2 ? 'كرتين' : `${n} كروت`);

// Every line spells out card numbers, so nobody has to work out who "my neighbors" are.
const AR = {
  isInnocent: (p, x) => `${x.c(p.target)} ${p.is ? 'بريئة' : 'متنكرة'}`,
  nameInnocent: (p, x) => `${x.c(p.target)} بريئة`,
  nameEvil: (p, x) => `${x.c(p.target)} متنكرة`,
  revealIdentity: (p, x) => (p.evil ? `${x.c(p.target)} هي ${x.imp(p.impostorType)}` : `${x.c(p.target)} بريئة`),
  rowEvilCount: (p, x) => `بين ${x.who}: ${x.count(p.n)}`,
  rowEvilCountOf: (p, x) => `بين ${x.who}: ${x.count(p.n)}`,
  neighborEvilCount: (p, x) => `بين ${x.who}: ${x.count(p.n)}`,
  neighborEvilCountOf: (p, x) => `جنب ${x.c(p.target)} (${x.whoRest}): ${x.count(p.n)}`,
  nearestEvil: p => `أقرب متنكر عني يبعد ${cardsAway(p.n)}`,
  nearestEvilFrom: (p, x) => (p.n === 0 ? `ما فيه متنكر غير ${x.c(p.target)}` : `أقرب متنكر من ${x.c(p.target)} يبعد ${cardsAway(p.n)}`),
  sideCompare: (p, x) => `عدد المتنكرين من ${x.below} ${x.cmp[p.cmp]} اللي من ${x.above}`,
  halvesCompare: (p, x) => `عدد المتنكرين من ${x.half1} ${x.cmp[p.cmp]} اللي من ${x.half2}`,
  oneOfThree: (p, x) => (p.has ? `بين ${x.who} فيه متنكر` : `ما فيه متنكر بين ${x.who}`),
  oneOfTwoInnocent: (p, x) => `على الأقل وحدة من ${x.who} بريئة`,
  sameTeam: (p, x) => `${x.c(p.a)} و${x.c(p.b)}: ${p.same ? 'الثنتين بريئات أو الثنتين متنكرات' : 'وحدة بريئة ووحدة متنكرة'}`,
  isCorrupted: (p, x) => (p.is ? `${x.c(p.target)} مخربطة 🌀: بريئة بس كلامها غلط` : `${x.c(p.target)} مو مخربطة`),
  claimIsReal: (p, x) => `${x.c(p.target)} ${p.is ? 'حقيقية' : 'مزيفة'}`,
  statementTrue: (p, x) => `كلام ${x.c(p.target)} ${p.is ? 'صح' : 'غلط'}`,
  statementFalse: (p, x) => `كلام ${x.c(p.target)} ${p.is ? 'غلط' : 'صح'}`,
  saboteurAdjacent: (p, x) => `${p.has ? 'فيه' : 'ما فيه'} مخرّب جنب ${x.c(p.target)}`,
  neighborsClean: (p, x) => `ما أحد خرّب البطات ${x.who}`,
  neighborsTruthful: (p, x) => (p.truthful ? `البطات ${x.who} صادقات` : `بين البطات ${x.who} فيه وحدة كذابة`),
  neighborHasEvil: (p, x) => (p.has ? `بين ${x.who} فيه متنكر` : `ما فيه متنكر بين ${x.who}`),
  selfAndNeighborsHaveEvil: (p, x) => (p.has ? `أنا و${x.who}: فينا متنكر` : `أنا و${x.who}: ما فينا متنكر`),
  prevInnocent: (p, x) => `${x.c(x.prev)} (اللي قبلي) بريئة`,
  prevTruthful: (p, x) => `كلام ${x.c(x.prev)} (اللي قبلي) صح`,
  nextIs: (p, x) => `${x.c(x.next)} (اللي بعدي) ${p.evil ? 'متنكرة' : 'بريئة'}`,
  lastIs: (p, x) => `${x.c(x.last)} (الأخيرة) ${p.evil ? 'متنكرة' : 'بريئة'}`,
  rowHasEvil: (p, x) => `بين ${x.who} فيه متنكر`,
  cornerHasEvil: (p, x) => (p.has ? `بين ${x.who} فيه متنكر` : `ما فيه متنكر بين ${x.who}`),
  evilParity: p => `مجموع أرقام المتنكرين ${p.even ? 'زوجي' : 'فردي'}`,
  twinInnocent: (p, x) => `توأمي ${x.c(p.target)}، وهي بريئة`,
  selfAndTargetInnocent: (p, x) => `أنا بريئة، و${x.c(p.target)} بريئة بعد`,
  oppositeInnocent: (p, x) => `${x.c(x.opposite)} (اللي مقابلي) بريئة`,
  otherNeighborIs: (p, x) => `${x.c(p.target)} ${p.evil ? 'متنكرة' : 'بريئة'}`,
  twoClaims: (p, x) => `وحدة بس صح: ${x.say(p.first)} / ${x.say(p.second)}`,
  randomTargeted: (p, x) => x.say(p.inner),
};

const EN = {
  isInnocent: (p, x) => `${x.c(p.target)} is ${p.is ? 'innocent' : 'an impostor'}`,
  nameInnocent: (p, x) => `${x.c(p.target)} is innocent`,
  nameEvil: (p, x) => `${x.c(p.target)} is an impostor`,
  revealIdentity: (p, x) => (p.evil ? `${x.c(p.target)} is the ${x.imp(p.impostorType)}` : `${x.c(p.target)} is innocent`),
  rowEvilCount: (p, x) => `Among ${x.who}: ${x.count(p.n)}`,
  rowEvilCountOf: (p, x) => `Among ${x.who}: ${x.count(p.n)}`,
  neighborEvilCount: (p, x) => `Among ${x.who}: ${x.count(p.n)}`,
  neighborEvilCountOf: (p, x) => `Beside ${x.c(p.target)} (${x.whoRest}): ${x.count(p.n)}`,
  nearestEvil: p => `The nearest impostor to me is ${p.n} card(s) away`,
  nearestEvilFrom: (p, x) => (p.n === 0 ? `No impostor other than ${x.c(p.target)}` : `The nearest impostor to ${x.c(p.target)} is ${p.n} card(s) away`),
  sideCompare: (p, x) => `Impostors in ${x.below}: ${x.cmp[p.cmp]} in ${x.above}`,
  halvesCompare: (p, x) => `Impostors in ${x.half1}: ${x.cmp[p.cmp]} in ${x.half2}`,
  oneOfThree: (p, x) => (p.has ? `An impostor is among ${x.who}` : `No impostor among ${x.who}`),
  oneOfTwoInnocent: (p, x) => `At least one of ${x.who} is innocent`,
  sameTeam: (p, x) => `${x.c(p.a)} and ${x.c(p.b)}: ${p.same ? 'both innocent or both impostors' : 'one innocent, one impostor'}`,
  isCorrupted: (p, x) => (p.is ? `${x.c(p.target)} is scrambled 🌀: innocent, but saying something false` : `${x.c(p.target)} is not scrambled`),
  claimIsReal: (p, x) => `${x.c(p.target)} is ${p.is ? 'real' : 'a fake'}`,
  statementTrue: (p, x) => `What ${x.c(p.target)} says is ${p.is ? 'true' : 'false'}`,
  statementFalse: (p, x) => `What ${x.c(p.target)} says is ${p.is ? 'false' : 'true'}`,
  saboteurAdjacent: (p, x) => `${p.has ? 'A saboteur is' : 'No saboteur is'} next to ${x.c(p.target)}`,
  neighborsClean: (p, x) => `Nobody scrambled ${x.who}`,
  neighborsTruthful: (p, x) => (p.truthful ? `${x.who} tell the truth` : `One of ${x.who} lies`),
  neighborHasEvil: (p, x) => (p.has ? `An impostor is among ${x.who}` : `No impostor among ${x.who}`),
  selfAndNeighborsHaveEvil: (p, x) => (p.has ? `Me and ${x.who}: one of us is an impostor` : `Me and ${x.who}: no impostor among us`),
  prevInnocent: (p, x) => `${x.c(x.prev)} (before me) is innocent`,
  prevTruthful: (p, x) => `What ${x.c(x.prev)} (before me) says is true`,
  nextIs: (p, x) => `${x.c(x.next)} (after me) is ${p.evil ? 'an impostor' : 'innocent'}`,
  lastIs: (p, x) => `${x.c(x.last)} (the last) is ${p.evil ? 'an impostor' : 'innocent'}`,
  rowHasEvil: (p, x) => `An impostor is among ${x.who}`,
  cornerHasEvil: (p, x) => (p.has ? `An impostor is among ${x.who}` : `No impostor among ${x.who}`),
  evilParity: p => `The impostor numbers add up to an ${p.even ? 'even' : 'odd'} number`,
  twinInnocent: (p, x) => `My twin is ${x.c(p.target)}, and she is innocent`,
  selfAndTargetInnocent: (p, x) => `I am innocent, and so is ${x.c(p.target)}`,
  oppositeInnocent: (p, x) => `${x.c(x.opposite)} (opposite me) is innocent`,
  otherNeighborIs: (p, x) => `${x.c(p.target)} is ${p.evil ? 'an impostor' : 'innocent'}`,
  twoClaims: (p, x) => `Exactly one is true: ${x.say(p.first)} / ${x.say(p.second)}`,
  randomTargeted: (p, x) => x.say(p.inner),
};

// Light ducks keep their personality: an emoji, or a line of their own.
const EMOJI = {
  visitor: '👀', sleepy: '😴', newbie: '🎒', attendance: '✍️', late: '🚗', snap: '🤳', homework: '📚',
  breakTime: '☕', hyped: '🎉', plants: '🌱', lost: '🗺️', graduate: '🎓', wifi: '📶', microwave: '⏲️',
  cameraOff: '🙈', organizer: '🗂️', volatile: '⚠️', lucky: '🍀',
};
const VOICE = {
  ar: {
    cafeteria: (p, x) => `${x.c(p.target)} أكلت كرواساني، متنكرة! 🥐`,
    photographer: (p, x) => `صورت ${x.c(p.target)}: بريئة 📸`,
  },
  en: {
    cafeteria: (p, x) => `${x.c(p.target)} ate my croissant: an impostor! 🥐`,
    photographer: (p, x) => `I filmed ${x.c(p.target)}: innocent 📸`,
  },
};

const span = (a, b, L) => (a > b ? L.st.none : a === b ? String(a) : L.st.range(a, b));

// ctx = { self: card index of the speaker, layout }.
export function statementText(statement, speakerId = null, ctx = null) {
  const L = LANGS[lang];
  const { self, layout } = ctx ?? { self: 0, layout: makeLayout(6) };
  const n = layout.count;
  const counted = countedCards(layout, self, statement).map(boardLabel).sort((a, b) => a - b);
  const x = {
    c: L.st.c,
    count: L.st.count,
    cmp: L.st.cmp,
    imp: id => L.impostors[id].name,
    who: L.st.list(counted),
    whoRest: L.st.list(countedCards(layout, self, statement).slice(1).map(boardLabel).sort((a, b) => a - b)),
    prev: (self - 1 + n) % n,
    next: (self + 1) % n,
    last: n - 1,
    opposite: opposite(layout, self),
    below: span(1, boardLabel(self) - 1, L),
    above: span(boardLabel(self) + 1, n, L),
    half1: span(1, Math.floor(n / 2), L),
    half2: span(Math.ceil(n / 2) + 1, n, L),
    say: inner => statementText(inner, null, { self, layout }),
  };
  const voice = VOICE[lang][speakerId];
  if (voice) return voice(statement.params, x);
  const line = (lang === 'ar' ? AR : EN)[statement.kind](statement.params, x);
  return EMOJI[speakerId] ? `${line} ${EMOJI[speakerId]}` : line;
}

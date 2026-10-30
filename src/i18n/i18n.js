// Language state, UI strings and the text of every card line.
import ar from './ar.js';
import en from './en.js';
import descriptions from './descriptions.js';

const LANGS = { ar, en };
let lang = 'ar';

export const setLang = l => { lang = LANGS[l] ? l : 'ar'; };
export const getLang = () => lang;
export const dir = () => (lang === 'ar' ? 'rtl' : 'ltr');
export const cardText = id => LANGS[lang].cards[id];
export const cardDesc = id => descriptions[lang][id];
export const impostorText = id => LANGS[lang].impostors[id];

export function t(key, vars = {}) {
  const raw = LANGS[lang].ui[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const cardsAway = n => (n === 1 ? 'كرت واحد' : n === 2 ? 'كرتين' : `${n} كروت`);

const AR = (c, count, cmp, imp) => ({
  isInnocent: p => (p.is ? `${c(p.target)} بريئة` : `${c(p.target)} متنكرة`),
  nameInnocent: p => `${c(p.target)} بريئة 🪶`,
  nameEvil: p => `سمعت إن ${c(p.target)} متنكرة`,
  revealIdentity: p => (p.evil ? `${c(p.target)} هي ${imp(p.impostorType)}` : `${c(p.target)} بريئة`),
  rowEvilCount: p => `في جهتي ${count(p.n)}`,
  rowEvilCountOf: p => `في الجهة ${p.row + 1} ${count(p.n)}`,
  neighborEvilCount: p => `بين جيراني ${count(p.n)}`,
  neighborEvilCountOf: p => `جنب ${c(p.target)} ${count(p.n)}`,
  nearestEvil: p => `أقرب متنكر لي يبعد ${cardsAway(p.n)}`,
  nearestEvilFrom: p => (p.n === 0 ? `ما في متنكر قريب من ${c(p.target)}` : `أقرب متنكر من ${c(p.target)} يبعد ${cardsAway(p.n)}`),
  sideCompare: p => `المتنكرين قبلي ${cmp[p.cmp]} بعدي`,
  halvesCompare: p => `النص الأول ${cmp[p.cmp]} الثاني بالمتنكرين`,
  oneOfThree: p => `${p.has ? 'بين' : 'ما في متنكر بين'} ${p.targets.map(x => x + 1).join(' و')}${p.has ? ' متنكر' : ''}`,
  oneOfTwoInnocent: p => `${c(p.a)} أو ${c(p.b)} بريئة`,
  sameTeam: p => `${c(p.a)} و${c(p.b)} ${p.same ? 'من نفس الفريق' : 'مو من نفس الفريق'}`,
  isCorrupted: p => `${c(p.target)} ${p.is ? 'مخربطة 🌀' : 'مو مخربطة'}`,
  claimIsReal: p => `${c(p.target)} ${p.is ? 'هي اللي تدّعيه' : 'مو اللي تدّعيه'}`,
  statementTrue: p => `جملة ${c(p.target)} ${p.is ? 'صح' : 'غلط'}`,
  statementFalse: p => `جملة ${c(p.target)} ${p.is ? 'غلط' : 'صح'}`,
  saboteurAdjacent: p => `${p.has ? 'فيه' : 'ما فيه'} مخرّب جنب ${c(p.target)}`,
  neighborsClean: () => 'ما أحد خرّب جيراني',
  neighborsTruthful: p => (p.truthful ? 'جيراني صادقين' : 'جيراني فيهم كذاب'),
  neighborHasEvil: p => (p.has ? 'فيه متنكر جنبي' : 'ما في متنكر جنبي'),
  selfAndNeighborsHaveEvil: p => (p.has ? 'أنا وجيراني فينا متنكر' : 'أنا وجيراني ما فينا متنكر'),
  prevInnocent: () => 'البطة اللي قبلي بريئة',
  prevTruthful: () => 'البطة اللي قبلي تقول الصدق',
  nextIs: p => `البطة اللي بعدي ${p.evil ? 'متنكرة' : 'بريئة'}`,
  lastIs: p => `آخر بطة بالطاولة ${p.evil ? 'متنكرة' : 'بريئة'}`,
  rowHasEvil: p => `الجهة ${p.row + 1} فيها متنكر`,
  cornerHasEvil: p => (p.has ? 'أول كرت بجهة متنكر' : 'أوائل الجهات أبرياء'),
  evilParity: p => `مجموع أرقام المتنكرين ${p.even ? 'زوجي' : 'فردي'}`,
  twinInnocent: p => `توأمي ${c(p.target)}، وهي بريئة`,
  selfAndTargetInnocent: p => `أنا بريئة، و${c(p.target)} بريئة بعد 😎`,
  oppositeInnocent: () => 'البطة اللي مقابلي بريئة',
  otherNeighborIs: p => `${c(p.target)} ${p.evil ? 'متنكرة' : 'بريئة'}`,
  twoClaims: p => `وحدة بس صح: ${statementText(p.first)} / ${statementText(p.second)}`,
  randomTargeted: p => statementText(p.inner),
});

const EN = (c, count, cmp, imp) => ({
  isInnocent: p => `${c(p.target)} is ${p.is ? 'innocent' : 'an impostor'}`,
  nameInnocent: p => `${c(p.target)} is innocent 🪶`,
  nameEvil: p => `I heard ${c(p.target)} is an impostor`,
  revealIdentity: p => (p.evil ? `${c(p.target)} is the ${imp(p.impostorType)}` : `${c(p.target)} is innocent`),
  rowEvilCount: p => `My side has ${count(p.n)}`,
  rowEvilCountOf: p => `Side ${p.row + 1} has ${count(p.n)}`,
  neighborEvilCount: p => `My neighbors include ${count(p.n)}`,
  neighborEvilCountOf: p => `Next to ${c(p.target)}: ${count(p.n)}`,
  nearestEvil: p => `The nearest impostor is ${p.n} card(s) away`,
  nearestEvilFrom: p => (p.n === 0 ? `No impostor near ${c(p.target)}` : `The nearest impostor to ${c(p.target)} is ${p.n} card(s) away`),
  sideCompare: p => `Impostors numbered below me: ${cmp[p.cmp]} numbered above me`,
  halvesCompare: p => `The first half of the table has ${cmp[p.cmp]} the second half in impostors`,
  oneOfThree: p => `${p.has ? 'At least one' : 'None'} of ducks ${p.targets.map(x => x + 1).join(', ')} ${p.has ? 'is an impostor' : 'are impostors'}`,
  oneOfTwoInnocent: p => `At least one of ${c(p.a)} and ${c(p.b)} is innocent`,
  sameTeam: p => `${c(p.a)} and ${c(p.b)} are ${p.same ? 'on the same team' : 'on different teams'}`,
  isCorrupted: p => `${c(p.target)} is ${p.is ? 'scrambled 🌀' : 'not scrambled'}`,
  claimIsReal: p => `${c(p.target)} ${p.is ? 'is who it claims' : 'is not who it claims'}`,
  statementTrue: p => `The line of ${c(p.target)} is ${p.is ? 'true' : 'false'}`,
  statementFalse: p => `The line of ${c(p.target)} is ${p.is ? 'false' : 'true'}`,
  saboteurAdjacent: p => `${p.has ? 'A saboteur sits' : 'No saboteur sits'} next to ${c(p.target)}`,
  neighborsClean: () => 'Nobody scrambled my neighbors',
  neighborsTruthful: p => (p.truthful ? 'My neighbors are truthful' : 'One of my neighbors lies'),
  neighborHasEvil: p => (p.has ? 'An impostor sits next to me' : 'No impostor sits next to me'),
  selfAndNeighborsHaveEvil: p => (p.has ? 'Among me and my neighbors is an impostor' : 'No impostor among me and my neighbors'),
  prevInnocent: () => 'The duck before me is innocent',
  prevTruthful: () => 'The duck before me tells the truth',
  nextIs: p => `The duck after me is ${p.evil ? 'an impostor' : 'innocent'}`,
  lastIs: p => `The last duck on the table is ${p.evil ? 'an impostor' : 'innocent'}`,
  rowHasEvil: p => `Side ${p.row + 1} has at least one impostor`,
  cornerHasEvil: p => (p.has ? 'An impostor is the first card of a side' : 'No impostor is the first card of a side'),
  evilParity: p => `The impostor numbers add up to an ${p.even ? 'even' : 'odd'} number`,
  twinInnocent: p => `My twin is ${c(p.target)}, and she is innocent`,
  selfAndTargetInnocent: p => `I am innocent, and so is ${c(p.target)} 😎`,
  oppositeInnocent: () => 'The duck opposite me is innocent',
  otherNeighborIs: p => `${c(p.target)} is ${p.evil ? 'an impostor' : 'innocent'}`,
  twoClaims: p => `Exactly one is true: ${statementText(p.first)} / ${statementText(p.second)}`,
  randomTargeted: p => statementText(p.inner),
});

// Light ducks say their clue in their own voice.
const VOICE_AR = (c, count, cmp) => ({
  visitor: p => (p.has ? 'شفت متنكر جنبي 👀' : 'ما شفت متنكر جنبي 👀'),
  cafeteria: p => `${c(p.target)} أكلت كرواساني، متنكرة! 🥐`,
  sleepy: () => 'زززز… اللي قبلي بريئة 😴',
  photographer: p => `صورت ${c(p.target)}: بريئة 📸`,
  newbie: p => `اللي بعدي ${p.evil ? 'متنكرة' : 'بريئة'}!`,
  attendance: p => `بالكشف: الجهة ${p.row + 1} فيها متنكر ✍️`,
  late: p => `آخر بطة ${p.evil ? 'متنكرة' : 'بريئة'} 🚗`,
  snap: p => `${c(p.a)} و${c(p.b)}: ${p.same ? 'نفس الفريق' : 'مو نفس الفريق'} 🤳`,
  homework: p => `مجموع أرقامهم ${p.even ? 'زوجي' : 'فردي'} 📚`,
  breakTime: p => `${c(p.a)} أو ${c(p.b)} بريئة ☕`,
  hyped: p => (p.truthful ? 'جيراني صادقين!! 🎉' : 'جيراني فيهم كذاب!! 🎉'),
  plants: () => 'اللي مقابلي بريئة 🌱',
  lost: p => (p.has ? 'أول كرت بجهة متنكر 🗺️' : 'أوائل الجهات أبرياء 🗺️'),
  graduate: p => `في جهتي ${count(p.n)} 🎓`,
  wifi: p => `أقرب متنكر يبعد ${cardsAway(p.n)} 📶`,
  microwave: () => 'اللي قبلي صادقة ⏲️',
  cameraOff: p => `بين جيراني ${count(p.n)} 🙈`,
  organizer: p => `النص الأول ${cmp[p.cmp]} الثاني 🗂️`,
});

const VOICE_EN = (c, count, cmp) => ({
  visitor: p => (p.has ? 'Just visiting… and I saw an impostor next to me 👀' : 'Just visiting… and no impostor is next to me 👀'),
  cafeteria: p => `${c(p.target)} ate my croissant, must be an impostor! 🥐`,
  sleepy: () => 'Zzzz… the duck before me is innocent, let me sleep 😴',
  photographer: p => `I filmed ${c(p.target)} all day: innocent 📸`,
  newbie: p => `My first day! The duck after me is ${p.evil ? 'an impostor' : 'innocent'}`,
  attendance: p => `The attendance sheet says Side ${p.row + 1} has at least one impostor ✍️`,
  late: p => `I arrived late and saw the last duck: ${p.evil ? 'an impostor' : 'innocent'} 🚗`,
  snap: p => `My story shows ${c(p.a)} and ${c(p.b)} ${p.same ? 'on the same team' : 'on different teams'} 🤳`,
  homework: p => `Homework done: the impostor numbers add up to an ${p.even ? 'even' : 'odd'} number 📚`,
  breakTime: p => `On break with ${c(p.a)} and ${c(p.b)}: at least one is innocent ☕`,
  hyped: p => (p.truthful ? 'My neighbors are truthful!! Let\u2019s go 🎉' : 'One of my neighbors lies!! Catch them 🎉'),
  plants: () => 'The duck opposite me waters my plant: innocent 🌱',
  lost: p => (p.has ? 'I got lost and found an impostor as the first card of a side 🗺️' : 'I got lost everywhere: no impostor is the first card of a side 🗺️'),
  graduate: p => `Before I graduate: my side has ${count(p.n)} 🎓`,
  wifi: p => `The signal says the nearest impostor is ${p.n} card(s) away 📶`,
  microwave: () => 'The duck before me in the microwave line tells the truth ⏲️',
  cameraOff: p => `Camera off, but I can hear: my neighbors include ${count(p.n)} 🙈`,
  organizer: p => `Files sorted: the first half has ${cmp[p.cmp]} the second in impostors 🗂️`,
});

export function statementText(statement, speakerId = null) {
  const L = LANGS[lang];
  if (speakerId) {
    const voice = (lang === 'ar' ? VOICE_AR : VOICE_EN)(L.st.c, L.st.count, L.st.cmp)[speakerId];
    if (voice) return voice(statement.params);
  }
  const imp = id => L.impostors[id].name;
  const table = (lang === 'ar' ? AR : EN)(L.st.c, L.st.count, L.st.cmp, imp);
  return table[statement.kind](statement.params);
}

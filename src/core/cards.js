// Card catalog: data only. Player-facing text lives in src/i18n.

export const TIER_POINTS = { legendary: 4, strong: 3, medium: 2, weak: 1, flavor: 1 };

// Portraits on a clean background.
const CLEAN_ART = ['zahraa', 'ritaj', 'camel', 'abdullah', 'ahmad', 'rawan', 'shouq', 'loujain', 'fayzah', 'bassam', 'ali', 'ruaa', 'motivator', 'dawoud', 'hora'];

const club = (id, chapter, kind, ability, targets, extra = {}) => ({
  id, group: 'club', tier: id === 'abdullah' ? 'legendary' : 'strong', chapter, kind,
  timing: 'onFlip', portrait: `assets/ducks/${id}.${CLEAN_ART.includes(id) ? 'webp' : 'png'}`, ability: { kind: ability, targets }, ...extra,
});

// Not in the art sheet yet, so they keep a drawn placeholder.
const PLACEHOLDER = ['hyped', 'cameraOff', 'volatile', 'lucky'];

const guest = (id, tier, chapter, kind, extra = {}) => ({
  id, group: 'guest', tier, chapter, kind, timing: 'onFlip',
  portrait: `assets/guests/${id}.${PLACEHOLDER.includes(id) ? 'svg' : 'webp'}`, ability: null, ...extra,
});

// Light guests: simple clues said in a fun voice (see src/i18n/i18n.js).
const flavor = ([id, kind, chapter]) => guest(id, 'flavor', chapter, kind);

export const CARDS = [
  club('abdullah', 1, 'isInnocent', 'revealIdentity', 1),
  club('bassam', 1, 'nameInnocent', 'isInnocent', 1),
  club('camel', 1, 'rowEvilCount', 'rowEvilCountOf', 1),
  club('ali', 1, 'oneOfThree', 'oneOfThree', 3),
  club('shouq', 2, 'isCorrupted', 'isCorrupted', 1),
  club('rawan', 2, 'neighborsClean', 'saboteurAdjacent', 1),
  club('loujain', 2, 'sameTeam', 'sameTeam', 2),
  club('ruaa', 3, 'claimIsReal', 'claimIsReal', 1),
  club('zahraa', 3, 'neighborEvilCount', 'neighborEvilCountOf', 1),
  club('fayzah', 3, 'nearestEvil', 'nearestEvilFrom', 1),
  club('dawoud', 3, 'neighborHasEvil', 'isCorrupted', 1),
  club('motivator', 4, 'sideCompare', 'featherShield', 0),
  club('ahmad', 4, 'oneOfTwoInnocent', 'delayedIdentity', 1),
  club('ritaj', 4, 'neighborsTruthful', 'statementTrue', 1),
  club('hora', 4, 'sameTeam', 'oneOfThree', 3),

  guest('lab', 'weak', 1, 'neighborHasEvil'),
  guest('guard', 'weak', 1, 'prevInnocent'),
  guest('echo', 'weak', 1, 'prevTruthful'),
  guest('queue', 'weak', 1, 'nextIs'),
  guest('volatile', 'medium', 3, 'neighborHasEvil'),
  guest('lucky', 'medium', 2, 'nameInnocent'),
  guest('witness', 'medium', 2, 'rowHasEvil'),
  guest('corners', 'weak', 2, 'cornerHasEvil'),
  guest('skeptic', 'medium', 2, 'statementFalse'),
  guest('squad', 'weak', 2, 'selfAndNeighborsHaveEvil'),
  guest('news', 'weak', 2, 'lastIs'),
  guest('chatter', 'medium', 3, 'twoClaims'),
  guest('twinA', 'medium', 3, 'twinInnocent', { pair: 'twinB' }),
  guest('twinB', 'medium', 3, 'twinInnocent', { pair: 'twinA' }),
  guest('shy', 'medium', 3, 'randomTargeted', { timing: 'afterFirstExpel' }),
  guest('confident', 'medium', 3, 'selfAndTargetInnocent'),
  guest('halves', 'medium', 3, 'halvesCompare'),
  guest('rumors', 'weak', 4, 'nameEvil'),
  guest('numbers', 'weak', 4, 'evilParity'),
  guest('fazaa', 'medium', 4, 'randomTargeted', { timing: 'afterFeatherLoss' }),
  guest('edge', 'weak', 4, 'oppositeInnocent'),
  guest('sensitive', 'weak', 4, 'otherNeighborIs', { timing: 'afterNeighborExpel' }),

  ...[
    ['visitor', 'neighborHasEvil', 1], ['cafeteria', 'nameEvil', 1], ['sleepy', 'prevInnocent', 1],
    ['photographer', 'nameInnocent', 1], ['newbie', 'nextIs', 1], ['late', 'lastIs', 1],
    ['plants', 'oppositeInnocent', 1], ['microwave', 'prevTruthful', 1],
    ['attendance', 'rowHasEvil', 2], ['snap', 'sameTeam', 2], ['breakTime', 'oneOfTwoInnocent', 2],
    ['graduate', 'rowEvilCount', 2], ['cameraOff', 'neighborEvilCount', 2],
    ['hyped', 'neighborsTruthful', 3], ['lost', 'cornerHasEvil', 3], ['wifi', 'nearestEvil', 3],
    ['homework', 'evilParity', 4], ['organizer', 'halvesCompare', 4],
  ].map(flavor),
];

export const IMPOSTORS = [
  { id: 'impostor', chapter: 1, claims: 'info' },
  { id: 'saboteur', chapter: 2, claims: 'info' },
  { id: 'mimic', chapter: 3, claims: 'strongest' },
  { id: 'concealer', chapter: 3, claims: 'flavor' },
  { id: 'shadow', chapter: 4, claims: 'info' },
];

const byId = new Map(CARDS.map(c => [c.id, c]));
export const getCard = id => byId.get(id);
export const getImpostor = id => IMPOSTORS.find(i => i.id === id);

export const frameOf = id => `assets/ui/frame-${getCard(id).group}.webp`;
export const impostorArt = id => `assets/impostors/${id}.webp`;

const TIER_ORDER = ['flavor', 'weak', 'medium', 'strong', 'legendary'];
export const tierRank = id => TIER_ORDER.indexOf(getCard(id).tier);

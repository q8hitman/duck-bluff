// Which cards a line is talking about, so the table can point at them.
import { neighbors, corners, opposite } from './board.js';

function collect(layout, i, { kind, params: p }) {
  const n = layout.count;
  switch (kind) {
    case 'twoClaims': return [...collect(layout, i, p.first), ...collect(layout, i, p.second)];
    case 'randomTargeted': return collect(layout, i, p.inner);
    case 'prevInnocent': case 'prevTruthful': return [(i - 1 + n) % n];
    case 'nextIs': return [(i + 1) % n];
    case 'lastIs': return [n - 1];
    case 'oppositeInnocent': return [opposite(layout, i)];
    case 'neighborHasEvil': case 'neighborEvilCount': case 'neighborsClean':
    case 'neighborsTruthful': case 'selfAndNeighborsHaveEvil': return neighbors(layout, i);
    case 'rowEvilCount': return layout.rows[layout.rowOf[i]];
    case 'rowEvilCountOf': case 'rowHasEvil': return layout.rows[p.row];
    case 'cornerHasEvil': return corners(layout);
    case 'neighborEvilCountOf': case 'saboteurAdjacent': return [p.target, ...neighbors(layout, p.target)];
    default:
      if (p.targets) return p.targets;
      if ('a' in p) return [p.a, p.b];
      return 'target' in p ? [p.target] : [];
  }
}

export function referredCards(layout, i, statement) {
  return [...new Set(collect(layout, i, statement))].filter(j => j !== i);
}

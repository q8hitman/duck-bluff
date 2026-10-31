// Places cards around the table: evenly spaced along an ellipse (by real distance,
// not by angle), at the largest size where no card touches another or the center.
export const CARD_RATIO = 1.4;
const GAP = 0.024;
const EDGE = 0.008;

function evenPoints(n, rx, ry) {
  const steps = 1440;
  const at = k => {
    const a = (2 * Math.PI * k) / steps - Math.PI / 2;
    return [rx * Math.cos(a), ry * Math.sin(a)];
  };
  const lengths = [0];
  for (let k = 1; k <= steps; k++) {
    const [x0, y0] = at(k - 1);
    const [x1, y1] = at(k);
    lengths[k] = lengths[k - 1] + Math.hypot(x1 - x0, y1 - y0);
  }
  const total = lengths[steps];
  const points = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const want = (total * i) / n;
    while (lengths[k] < want) k++;
    points.push(at(k));
  }
  return points;
}

function fit(n, w, { aspect, maxRx, maxRy, centerW, centerH }) {
  const h = w * CARD_RATIO;
  const rx = Math.min(maxRx, 0.5 - w / 2 - EDGE);
  const ry = Math.min(maxRy * aspect, aspect / 2 - h / 2 - EDGE);
  if (rx <= 0 || ry <= 0) return null;
  const points = evenPoints(n, rx, ry);
  for (let i = 0; i < n; i++) {
    const [x, y] = points[i];
    if (Math.abs(x) < (w + centerW) / 2 && Math.abs(y) < (h + centerH) / 2) return null;
    for (let j = i + 1; j < n; j++) {
      const [u, v] = points[j];
      if (Math.abs(x - u) < w + GAP && Math.abs(y - v) < h + GAP) return null;
    }
  }
  return points;
}

const hits = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

function bubbleRect(card, side, { w, h }, { gap, above }) {
  const mid = (card.l + card.r) / 2;
  if (side === 'top') return { l: mid - w / 2, r: mid + w / 2, t: card.b + gap, b: card.b + gap + h };
  if (side === 'bottom') return { l: mid - w / 2, r: mid + w / 2, t: card.t - above - h, b: card.t - above };
  const t = card.t + (card.b - card.t) * 0.18;
  if (side === 'right') return { l: card.r + gap, r: card.r + gap + w, t, b: t + h };
  return { l: card.l - gap - w, r: card.l - gap, t, b: t + h };
}

// Picks where each speech bubble goes, keeping it off the cards, their numbers, the
// other bubbles and anything in `blocks`. All values are pixels inside the table.
// Sides name the seat class: 'top' seats speak downward, 'bottom' seats upward.
// `first` is the duck in focus: it chooses first and always gets a bubble. The rest
// report clear: false when no side is free, and those lines wait for a tap.
export function placeBubbles({ cards, sizes, preferred, blocks, width, height, first = null, gap = 9, above = 20 }) {
  const solid = [...cards.map(c => ({ ...c, t: c.t - (above - gap) })), ...blocks];
  const placed = [];
  const result = cards.map((_, i) => ({ side: preferred[i], clear: true }));
  const turns = cards.map((_, i) => i).filter(i => i !== first);
  if (first !== null) turns.unshift(first);
  for (const i of turns) {
    if (!sizes[i]) continue;
    const card = cards[i];
    const order = [preferred[i], ...['top', 'bottom', 'right', 'left'].filter(s => s !== preferred[i])];
    let best = null;
    for (const side of order) {
      const rect = bubbleRect(card, side, sizes[i], { gap, above });
      const offTable = sizes[i].w * sizes[i].h - hits(rect, { l: 0, r: width, t: 0, b: height });
      const score = offTable + [...solid, ...placed].reduce((sum, o) => sum + hits(rect, o), 0);
      if (!best || score < best.score) best = { side, rect, score };
    }
    const clear = best.score === 0;
    if (clear || i === first) placed.push(best.rect);
    result[i] = { side: best.side, clear };
  }
  return result;
}

// All sizes are fractions of the table width; aspect is table height / width.
// Returned x and y are fractions of the table's width and height.
export function ringLayout({ n, aspect, maxCard, maxRx, maxRy, centerW, centerH }) {
  const shape = { aspect, maxRx, maxRy, centerW, centerH };
  for (let w = maxCard; w > 0.03; w -= 0.002) {
    const points = fit(n, w, shape);
    if (points) return { card: w, points: points.map(([x, y]) => ({ x: 0.5 + x, y: 0.5 + y / aspect })) };
  }
  throw new Error(`no ring layout for ${n} cards`);
}

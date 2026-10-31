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
// Each result says clear: false when no side was free.
export function placeBubbles({ cards, sizes, preferred, blocks, width, height, gap = 9, above = 20 }) {
  const solid = [...cards.map(c => ({ ...c, t: c.t - (above - gap) })), ...blocks];
  const placed = [];
  const result = cards.map((_, i) => ({ side: preferred[i], clear: true }));
  for (const [i, card] of cards.entries()) {
    if (!sizes[i]) continue;
    const order = [preferred[i], ...['top', 'bottom', 'right', 'left'].filter(s => s !== preferred[i])];
    let best = null;
    for (const side of order) {
      const rect = bubbleRect(card, side, sizes[i], { gap, above });
      const roomy = { l: rect.l - 4, r: rect.r + 4, t: rect.t - 4, b: rect.b + 4 }; // leaves air around it
      const offTable = sizes[i].w * sizes[i].h - hits(rect, { l: 0, r: width, t: 0, b: height });
      const score = offTable + [...solid, ...placed].reduce((sum, o) => sum + hits(roomy, o), 0);
      if (!best || score < best.score) best = { side, rect, score };
    }
    placed.push(best.rect);
    result[i] = { side: best.side, clear: best.score === 0 };
  }
  return result;
}

// The emptiest place for a floating panel, in pixels. It never prefers covering the duck
// it describes, then avoids the other cards, then `soft` things, and stays close by.
export function panelSpot({ size, area, target, cards, soft = [], step = 16 }) {
  const midX = (target.l + target.r) / 2;
  const midY = (target.t + target.b) / 2;
  let best = null;
  for (let t = area.t; t <= Math.max(area.t, area.b - size.h); t += step) {
    for (let l = area.l; l <= Math.max(area.l, area.r - size.w); l += step) {
      const rect = { l, t, r: l + size.w, b: t + size.h };
      const covered = hits(rect, target) * 1000
        + cards.reduce((sum, c) => sum + hits(rect, c), 0) * 20
        + soft.reduce((sum, c) => sum + hits(rect, c), 0) * 5;
      const score = covered + Math.hypot(l + size.w / 2 - midX, t + size.h / 2 - midY);
      if (!best || score < best.score) best = { l, t, score };
    }
  }
  return { l: best.l, t: best.t };
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

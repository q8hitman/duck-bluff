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

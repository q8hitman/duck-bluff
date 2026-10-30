// Table geometry: cards sit in a circle, numbered clockwise, split into sides
// (kept in layout.rows) that fill in number order.

function rowSizes(count) {
  if (count <= 5) return [Math.ceil(count / 2), Math.floor(count / 2)];
  const n = Math.ceil(count / 4);
  const base = Math.floor(count / n);
  const extra = count % n;
  return Array.from({ length: n }, (_, r) => base + (r < extra ? 1 : 0));
}

export function makeLayout(count) {
  const rows = [];
  const rowOf = [];
  const colOf = [];
  let i = 0;
  rowSizes(count).forEach((size, r) => {
    const row = [];
    for (let c = 0; c < size; c++, i++) {
      row.push(i);
      rowOf[i] = r;
      colOf[i] = c;
    }
    rows.push(row);
  });
  return { count, rows, rowOf, colOf };
}

export function neighbors(layout, i) {
  const n = layout.count;
  return [(i - 1 + n) % n, (i + 1) % n];
}

// Steps around the circle, the short way.
export function distance(layout, i, j) {
  const d = Math.abs(i - j);
  return Math.min(d, layout.count - d);
}

// The first card of each side.
export const corners = layout => layout.rows.map(row => row[0]);

export const opposite = (layout, i) => (i + Math.floor(layout.count / 2)) % layout.count;

export const boardLabel = i => i + 1;

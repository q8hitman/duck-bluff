import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringLayout, CARD_RATIO } from '../src/ui/ring.js';

const PHONE = { aspect: 4.6 / 3, maxCard: 0.28, maxRx: 0.46, maxRy: 0.7, centerW: 0.42, centerH: 0.55 };
const DESKTOP = { aspect: 9 / 16, maxCard: 0.125, maxRx: 0.33, maxRy: 0.4, centerW: 0.19, centerH: 0.3 };

function rects({ card, points }, aspect) {
  const h = card * CARD_RATIO;
  return points.map(p => ({ l: p.x - card / 2, r: p.x + card / 2, t: p.y * aspect - h / 2, b: p.y * aspect + h / 2 }));
}
const apart = (a, b, gap) => a.r + gap <= b.l || b.r + gap <= a.l || a.b + gap <= b.t || b.b + gap <= a.t;

for (const [name, shape] of [['phone', PHONE], ['desktop', DESKTOP]]) {
  for (let n = 5; n <= 11; n++) {
    test(`${name}, ${n} cards: none touch, all stay on the table`, () => {
      const layout = ringLayout({ n, ...shape });
      assert.equal(layout.points.length, n);
      const rs = rects(layout, shape.aspect);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) assert.ok(apart(rs[i], rs[j], 0.012), `${i} and ${j} are too close`);
        assert.ok(rs[i].l >= 0 && rs[i].r <= 1 && rs[i].t >= 0 && rs[i].b <= shape.aspect, `${i} leaves the table`);
      }
      const mid = { l: 0.5 - shape.centerW / 2, r: 0.5 + shape.centerW / 2, t: shape.aspect / 2 - shape.centerH / 2, b: shape.aspect / 2 + shape.centerH / 2 };
      rs.forEach((r, i) => assert.ok(apart(r, mid, 0), `${i} sits on the center`));
    });
  }

  test(`${name}: cards stay big enough to read`, () => {
    assert.ok(ringLayout({ n: 11, ...shape }).card >= (name === 'phone' ? 0.16 : 0.07));
    assert.ok(ringLayout({ n: 5, ...shape }).card > ringLayout({ n: 11, ...shape }).card);
  });
}

test('card 1 is on top and numbers run clockwise', () => {
  const { points } = ringLayout({ n: 8, ...DESKTOP });
  assert.ok(Math.abs(points[0].x - 0.5) < 0.01);
  assert.ok(points[0].y < 0.5);
  assert.ok(points[1].x > 0.5);
});

test('spacing between neighbours is even', () => {
  const { points } = ringLayout({ n: 10, ...DESKTOP });
  const a = 9 / 16;
  const gaps = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return Math.hypot(p.x - q.x, (p.y - q.y) * a);
  });
  assert.ok(Math.max(...gaps) / Math.min(...gaps) < 1.15, gaps.join());
});

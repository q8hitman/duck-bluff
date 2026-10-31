import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringLayout, placeBubbles, panelSpot, CARD_RATIO } from '../src/ui/ring.js';

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

test('a bubble moves off whatever blocks its usual side', () => {
  const card = { l: 450, r: 550, t: 400, b: 540 };
  const shared = { cards: [card], sizes: [{ w: 128, h: 50 }], preferred: ['bottom'], width: 1000, height: 600 };
  assert.equal(placeBubbles({ ...shared, blocks: [] })[0].side, 'bottom');
  const dish = { l: 400, r: 600, t: 200, b: 380 };
  assert.notEqual(placeBubbles({ ...shared, blocks: [dish] })[0].side, 'bottom');
});

test('bubbles avoid each other and hidden ones stay out of the way', () => {
  const a = { l: 100, r: 200, t: 100, b: 240 };
  const b = { l: 100, r: 200, t: 340, b: 480 };
  const size = { w: 128, h: 60 };
  const base = { cards: [a, b], preferred: ['top', 'bottom'], blocks: [], width: 1000, height: 600 };
  const both = placeBubbles({ ...base, sizes: [size, size] });
  assert.equal(both[0].side, 'top');
  assert.notEqual(both[1].side, 'bottom');
  assert.equal(placeBubbles({ ...base, sizes: [null, size] })[1].side, 'bottom');
});

test('a bubble with no free side reports it', () => {
  const card = { l: 10, r: 110, t: 10, b: 150 };
  const wall = { l: 0, r: 1000, t: 0, b: 600 };
  const size = { w: 128, h: 50 };
  assert.equal(placeBubbles({ cards: [card], sizes: [size], preferred: ['top'], blocks: [wall], width: 1000, height: 600 })[0].clear, false);
  assert.equal(placeBubbles({ cards: [card], sizes: [size], preferred: ['top'], blocks: [], width: 1000, height: 600 })[0].clear, true);
});

test('the details panel takes an empty spot and never covers its own duck', () => {
  const cards = [{ l: 400, r: 500, t: 40, b: 180 }, { l: 700, r: 800, t: 200, b: 340 }, { l: 400, r: 500, t: 500, b: 640 }, { l: 100, r: 200, t: 200, b: 340 }];
  const size = { w: 310, h: 300 };
  const area = { l: 8, r: 1100, t: 10, b: 700 };
  const spot = panelSpot({ size, area, target: cards[1], cards });
  const rect = { l: spot.l, r: spot.l + size.w, t: spot.t, b: spot.t + size.h };
  for (const c of cards) assert.ok(apart(rect, c, 0), JSON.stringify(rect));
  assert.ok(rect.l >= area.l && rect.r <= area.r && rect.t >= area.t && rect.b <= area.b);
});

test('a crowded table still leaves the described duck in view', () => {
  const target = { l: 60, r: 160, t: 60, b: 200 };
  const size = { w: 310, h: 400 };
  const spot = panelSpot({ size, area: { l: 0, r: 700, t: 0, b: 500 }, target, cards: [target, { l: 300, r: 700, t: 0, b: 500 }] });
  assert.ok(apart({ l: spot.l, r: spot.l + size.w, t: spot.t, b: spot.t + size.h }, target, 0));
});

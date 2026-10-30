// Motion and juice. Feedback is scaled by importance: a flip gets a small pop,
// catching an impostor gets the full bundle. It only moves visuals, never game state.
import { reduced, wait, h, MOTION } from './motion.js';

const gsap = globalThis.gsap;
const calm = () => reduced() || !gsap;
const layer = () => document.getElementById('fx');

export function deal(cards, table, onCard) {
  if (calm()) return;
  const box = table.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  cards.forEach((card, i) => {
    const r = card.getBoundingClientRect();
    gsap.from(card, {
      x: cx - (r.left + r.width / 2),
      y: cy - (r.top + r.height / 2),
      scale: 0.45,
      rotation: (i % 2 ? 1 : -1) * 16,
      opacity: 0,
      duration: 0.48,
      delay: 0.1 + i * (MOTION.dealStagger / 1000),
      ease: 'back.out(1.25)',
      onStart: () => onCard?.(i),
      clearProps: 'x,y,rotation,opacity,scale',
    });
  });
}

// Lift while the CSS flip runs, then settle.
export function flipPop(card) {
  if (calm()) return;
  gsap.fromTo(card, { scale: 1 }, { scale: 1.1, duration: MOTION.flip / 2000, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto' });
}

export function pop(el, delay = 0) {
  if (calm() || !el) return;
  gsap.fromTo(el, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, delay, ease: 'back.out(2)', clearProps: 'scale,opacity' });
}

export function hoverable(card) {
  if (calm() || !matchMedia('(hover: hover)').matches) return;
  card.addEventListener('pointerenter', () => gsap.to(card, { scale: 1.07, duration: 0.14, ease: 'power2.out' }));
  card.addEventListener('pointerleave', () => gsap.to(card, { scale: 1, duration: 0.18, ease: 'power2.out' }));
}

export function bob(card, i) {
  if (calm()) return;
  gsap.to(card, { y: -3, duration: 1.5 + (i % 4) * 0.25, delay: (i % 5) * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
}

export function stopBob(card) {
  if (!gsap) return;
  gsap.killTweensOf(card, 'y');
  gsap.set(card, { y: 0 });
}

// Smooth decaying shake (trauma squared), not random jitter. Visual only.
export function shake(el, trauma) {
  if (calm()) return;
  const s = { t: trauma };
  let time = 0;
  gsap.to(s, {
    t: 0,
    duration: 0.25 + trauma * 0.4,
    ease: 'none',
    onUpdate() {
      time += 0.9;
      const k = s.t * s.t;
      gsap.set(el, { x: 12 * k * Math.sin(time * 1.7), y: 8 * k * Math.sin(time * 2.3), rotation: 0.8 * k * Math.sin(time * 1.1) });
    },
    onComplete: () => gsap.set(el, { clearProps: 'x,y,rotation' }),
  });
}

// Tension before the truth: the card trembles harder and harder.
export async function suspense(card) {
  if (calm()) return wait(MOTION.revealPause);
  gsap.killTweensOf(card, 'x,rotation');
  gsap.to(card, { scale: 1.12, duration: MOTION.revealPause / 1000, ease: 'power2.in' });
  const s = { a: 0 };
  let time = 0;
  gsap.to(s, {
    a: 1,
    duration: MOTION.revealPause / 1000,
    ease: 'power1.in',
    onUpdate() {
      time += 1;
      gsap.set(card, { rotation: 3.2 * s.a * Math.sin(time * 1.6) });
    },
  });
  await wait(MOTION.revealPause);
}

// The target locks on: a crosshair closes in on the chosen card.
export async function lockOn(card) {
  if (calm()) return;
  const { x, y } = center(card);
  const size = card.getBoundingClientRect().width * 1.25;
  const ring = h('div', { class: 'lock-ring', style: `left:${x}px;top:${y}px;width:${size}px;height:${size}px` });
  layer().append(ring);
  const closing = gsap.fromTo(ring, { scale: 2.4, rotation: -60, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.28, ease: 'power3.in' });
  // never hold up the game if the tab stops drawing frames
  await Promise.race([closing, wait(320)]);
  gsap.to(ring, { scale: 1.25, opacity: 0, duration: 0.3, ease: 'power2.out', onComplete: () => ring.remove() });
}

function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function burst(el, { count = 14, colors = ['#f6e3b4', '#e8a33d', '#b5472f'], spread = 110 } = {}) {
  if (calm()) return;
  const { x, y } = center(el);
  for (let i = 0; i < count; i++) {
    const p = h('div', { class: 'particle', style: `left:${x}px;top:${y}px;background:${colors[i % colors.length]}` });
    layer().append(p);
    const angle = (i / count) * Math.PI * 2 + i;
    const dist = spread * (0.5 + ((i * 37) % 10) / 20);
    gsap.fromTo(p, { scale: 1 }, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + 24,
      scale: 0,
      rotation: 180 + i * 40,
      duration: 0.6 + (i % 4) * 0.08,
      ease: 'power2.out',
      onComplete: () => p.remove(),
    });
  }
}

function flash(cls) {
  if (calm()) return;
  const f = h('div', { class: `flash ${cls}` });
  layer().append(f);
  gsap.fromTo(f, { opacity: 0.8 }, { opacity: 0, duration: 0.42, ease: 'power2.out', onComplete: () => f.remove() });
}

// Large feedback: punch, burst, shake, then settle.
export function revealEvil(card, table) {
  if (calm()) return;
  stopBob(card);
  gsap.killTweensOf(card);
  gsap.fromTo(card, { scale: 1.34, rotation: -5 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.4)' });
  burst(card);
  flash('flash-gold');
  shake(table, 0.65);
}

// Medium feedback: the duck slumps, the room winces.
export function revealInnocent(card, table) {
  if (calm()) return;
  stopBob(card);
  gsap.killTweensOf(card);
  gsap.set(card, { rotation: 0 });
  gsap.to(card, { scale: 0.94, rotation: -5, y: 6, duration: 0.45, ease: 'bounce.out' });
  flash('flash-red');
  shake(table, 0.4);
}

// A feather leaves the counter and drifts away.
export function featherFall(feather) {
  if (calm() || !feather) return;
  const { x, y } = center(feather);
  const f = h('div', { class: 'feather-fall', style: `left:${x}px;top:${y}px` }, '🪶');
  layer().append(f);
  gsap.to(f, { y: 150, x: 34, rotation: 70, opacity: 0, duration: 1.2, ease: 'sine.in', onComplete: () => f.remove() });
}

// Small feedback: a spark travels from the speaker to what it looked at.
export async function beam(from, to) {
  if (calm() || !to) return;
  const a = center(from);
  const b = center(to);
  const s = h('div', { class: 'spark', style: `left:${a.x}px;top:${a.y}px` });
  layer().append(s);
  await gsap.to(s, { x: b.x - a.x, y: b.y - a.y, duration: 0.34, ease: 'power2.inOut' });
  s.remove();
  gsap.fromTo(to, { scale: 1.1 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
}

export function confetti() {
  if (calm()) return;
  const colors = ['#b78fd0', '#8fbf7a', '#7fc0d0', '#e8a33d', '#d06f8f', '#f6e3b4'];
  const w = innerWidth;
  for (let i = 0; i < 70; i++) {
    const p = h('div', { class: 'confetti', style: `left:${(i * 37) % w}px;background:${colors[i % colors.length]}` });
    layer().append(p);
    gsap.fromTo(p, { y: -20, rotation: i * 25 }, {
      y: innerHeight + 30,
      x: Math.sin(i) * 70,
      rotation: i * 25 + 540,
      duration: 1.5 + (i % 7) * 0.2,
      delay: (i % 11) * 0.06,
      ease: 'power1.in',
      onComplete: () => p.remove(),
    });
  }
}

export function hopWave(cards) {
  if (calm()) return;
  cards.forEach((card, i) => {
    stopBob(card);
    gsap.to(card, { y: -16, duration: 0.2, delay: i * 0.05, ease: 'power2.out', yoyo: true, repeat: 3 });
  });
}

export function droop(cards) {
  if (calm()) return;
  cards.forEach((card, i) => {
    stopBob(card);
    gsap.to(card, { y: 5, rotation: i % 2 ? 2.5 : -2.5, duration: 0.6, delay: i * 0.03, ease: 'power2.out' });
  });
}

// The duck says something as the truth comes out, then it drifts away.
export function react(card, text) {
  const r = card.getBoundingClientRect();
  const el = h('div', { class: 'react', style: `left:${r.left + r.width / 2}px;top:${r.top + 6}px` }, text);
  layer().append(el);
  if (calm()) { setTimeout(() => el.remove(), 1400); return; }
  gsap.fromTo(el, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.2)' });
  gsap.to(el, { y: -26, opacity: 0, duration: 0.5, delay: 1.1, ease: 'power1.in', onComplete: () => el.remove() });
}

export function menuIn(root) {
  if (calm()) return;
  root.querySelectorAll('.fan-card').forEach((card, i) => {
    gsap.from(card, { y: 60, scale: 0.6, opacity: 0, duration: 0.5, delay: i * 0.07, ease: 'back.out(1.6)', clearProps: 'scale,opacity' });
    gsap.to(card, { y: -6, duration: 1.9 + i * 0.2, delay: 0.7 + i * 0.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  gsap.from(root.querySelectorAll('.menu h1, .menu p, .menu-buttons .btn'), { y: 14, opacity: 0, duration: 0.36, stagger: 0.05, delay: 0.12, ease: 'power2.out', clearProps: 'all' });
}

export function killAll(root) {
  if (!gsap) return;
  gsap.killTweensOf(root.querySelectorAll('*'));
}

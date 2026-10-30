// The living lab behind every screen: bubbling flasks, a flickering lamp, steam,
// swaying leaves and microscope cells. Positions are percentages of the table art.
import { reduced, h } from './motion.js';

const gsap = globalThis.gsap;

const FLASKS = [
  { x: 83, y: 12, color: '#7fe0c8', n: 4, spread: 3.2 }, // round teal flask
  { x: 72.5, y: 17, color: '#f28ad0', n: 4, spread: 2.2 }, // pink flask
  { x: 12.5, y: 27, color: '#9be07a', n: 2, spread: 1 }, // test tube
  { x: 15.5, y: 27, color: '#ee8fc4', n: 2, spread: 1 }, // test tube
  { x: 22.5, y: 71, color: '#f07fd0', n: 2, spread: 1 }, // small vial
  { x: 10, y: 57, color: '#e8d060', n: 2, spread: 1.4 }, // yellow beaker
];

const LEAVES = [
  { x: 1, y: 8, size: 6, turn: 120 },
  { x: 57, y: 1, size: 4, turn: 180 },
  { x: 99.5, y: 55, size: 6, turn: -100 },
  { x: 99, y: 90, size: 8, turn: -40 },
  { x: 40, y: 99, size: 5, turn: -8 },
  { x: 66, y: 100, size: 6, turn: 14 },
];

const leafSvg = turn => `<svg viewBox="0 0 60 110" style="rotate:${turn}deg"><path d="M30 108 C 4 78 2 38 30 4 C 58 38 56 78 30 108Z" fill="#39592f" stroke="#141f10" stroke-width="3"/><path d="M30 104 V 16 M30 72 L14 54 M30 72 L46 54 M30 48 L18 34 M30 48 L42 34" fill="none" stroke="#17261a" stroke-width="2"/></svg>`;

const random = (a, b) => a + Math.random() * (b - a);

function bubbles(world) {
  for (const flask of FLASKS) {
    for (let i = 0; i < flask.n; i++) {
      const size = random(0.28, 0.6);
      const b = h('div', { class: 'bubble-dot', style: `left:${flask.x + random(-flask.spread, flask.spread)}%;top:${flask.y}%;width:${size}%;background:${flask.color}` });
      world.append(b);
      const d = random(2, 3.6);
      gsap.timeline({ delay: random(0, 4), repeat: -1, repeatDelay: random(0.4, 2.5) })
        .fromTo(b, { yPercent: 0, xPercent: 0, scale: 0.5 }, { yPercent: -random(600, 1100), xPercent: random(-100, 100), scale: 1.3, duration: d, ease: 'sine.in' }, 0)
        .fromTo(b, { opacity: 0 }, { opacity: 0.9, duration: 0.4 }, 0)
        .to(b, { opacity: 0, duration: 0.5 }, d - 0.5);
    }
  }
}

function steam(world) {
  for (let i = 0; i < 4; i++) {
    const s = h('div', { class: 'steam', style: 'left:89.5%;top:64%' });
    world.append(s);
    gsap.timeline({ delay: i * 0.9, repeat: -1 })
      .fromTo(s, { y: 0, x: 0, scale: 0.5 }, { y: -90, x: random(-16, 16), scale: 2.1, duration: 3.4, ease: 'sine.out' }, 0)
      .fromTo(s, { opacity: 0 }, { opacity: 0.32, duration: 1 }, 0)
      .to(s, { opacity: 0, duration: 1.8 }, 1.6);
  }
}

function lamp(world) {
  const glow = h('div', { class: 'lamp-glow' });
  world.append(glow);
  // a soft breathing light, with a small flicker every so often
  gsap.to(glow, { opacity: 0.72, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  const flicker = () => {
    gsap.timeline({ onComplete: () => gsap.delayedCall(random(6, 14), flicker) })
      .to(glow, { scale: 0.93, duration: 0.05 })
      .to(glow, { scale: 1.04, duration: 0.07 })
      .to(glow, { scale: 0.97, duration: 0.05 })
      .to(glow, { scale: 1, duration: 0.12 });
  };
  gsap.delayedCall(4, flicker);
}

function leaves(world) {
  for (const leaf of LEAVES) {
    const el = h('div', { class: 'leaf', style: `left:${leaf.x}%;top:${leaf.y}%;width:${leaf.size}%` });
    el.innerHTML = leafSvg(leaf.turn);
    world.append(el);
    gsap.to(el, { rotation: random(3, 5), duration: random(2.4, 3.8), delay: random(0, 2), ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
}

// Microscope cells drifting across the table: our own touch of biology.
function cells(world, count) {
  for (let i = 0; i < count; i++) {
    const size = random(1.4, 2.8);
    const c = h('div', { class: 'cell', style: `left:${random(15, 85)}%;top:${random(20, 80)}%;width:${size}%` }, h('i', {}));
    world.append(c);
    gsap.to(c, { x: random(-90, 90), y: random(-70, 70), rotation: random(-60, 60), duration: random(12, 22), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(c.firstChild, { x: random(-4, 4), y: random(-4, 4), duration: random(3, 5), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(c, { scale: 1.1, duration: random(2.4, 4), ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
}

function motes(world, count) {
  for (let i = 0; i < count; i++) {
    const m = h('div', { class: 'mote', style: `left:${random(4, 96)}%;top:${random(6, 94)}%` });
    world.append(m);
    gsap.to(m, { x: random(-40, 40), y: random(-80, -30), opacity: random(0.25, 0.8), duration: random(4.5, 9), delay: random(0, 5), ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
}

export function buildWorld(world) {
  world.append(h('div', { class: 'world-red' }));
  if (!gsap || reduced()) return;
  const small = innerWidth < 700;
  lamp(world);
  bubbles(world);
  steam(world);
  leaves(world);
  cells(world, small ? 3 : 5);
  motes(world, small ? 9 : 16);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) gsap.ticker.sleep();
    else gsap.ticker.wake();
  });
}

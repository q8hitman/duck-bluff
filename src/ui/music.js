// Plays our own soundtrack (assets/music), looping with a soft overlap so the seam
// doesn't show, and crossfading between the menu and the table.
import { audio } from './sound.js';

const TRACKS = { menu: 'assets/music/menu.mp3', table: 'assets/music/table.mp3' };
const VOLUME = 0.5;
const OVERLAP = 3; // seconds the end of a loop overlaps the next start
const FADE = 1.2;

let enabled = true;
let started = false;
let master = null;
let mood = 'menu';
let tension = false;
let playing = null; // { name, gain, sources, timer }
let beatTimer = null;
const buffers = {};

async function load(name) {
  const ctx = audio();
  buffers[name] ??= fetch(TRACKS[name]).then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data));
  return buffers[name];
}

function ensureGraph(ctx) {
  if (master) return;
  master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);
}

function fade(param, value, seconds) {
  const ctx = audio();
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, seconds / 3);
}

function stopPlaying() {
  if (!playing) return;
  const old = playing;
  playing = null;
  clearTimeout(old.timer);
  fade(old.gain.gain, 0, FADE);
  setTimeout(() => {
    old.sources.forEach(s => { try { s.stop(); } catch { /* already ended */ } });
    old.gain.disconnect();
  }, FADE * 1000 + 300);
}

function scheduleLoop(track, buffer, at) {
  const ctx = audio();
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  source.buffer = buffer;
  source.connect(amp).connect(track.gain);
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(1, at + OVERLAP);
  const end = at + buffer.duration;
  amp.gain.setValueAtTime(1, end - OVERLAP);
  amp.gain.linearRampToValueAtTime(0, end);
  source.start(at);
  track.sources = [...track.sources.slice(-1), source];
  const next = end - OVERLAP;
  track.timer = setTimeout(() => {
    if (playing === track) scheduleLoop(track, buffer, next);
  }, Math.max(0, (next - ctx.currentTime - 1) * 1000));
}

async function playMood() {
  const ctx = audio();
  if (!ctx || !enabled || !started) return;
  if (playing?.name === mood) return;
  const name = mood;
  ensureGraph(ctx);
  let buffer;
  try {
    buffer = await load(name);
  } catch {
    return; // no music rather than a broken game
  }
  if (name !== mood || !enabled || playing?.name === name) return;
  stopPlaying();
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(master);
  const track = { name, gain, sources: [], timer: null };
  playing = track;
  scheduleLoop(track, buffer, ctx.currentTime + 0.1);
}

// When you are down to your last feather, a quiet heartbeat joins in.
function heartbeat() {
  const ctx = audio();
  if (!ctx || !master || !tension || !enabled) return;
  [0, 0.28].forEach((delay, n) => {
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(n ? 52 : 60, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(0.55, at + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    osc.connect(amp).connect(master);
    osc.start(at);
    osc.stop(at + 0.26);
  });
}

// Browsers only allow audio after the first tap, so main.js calls this then.
export function startMusic() {
  started = true;
  playMood();
  beatTimer ??= setInterval(heartbeat, 1500);
}

export function setMusic(on) {
  enabled = on;
  if (on) playMood();
  else stopPlaying();
}

export function setMood(value) {
  mood = value;
  playMood();
}

export const setTension = value => { tension = value; };

// Dip under a big moment, then come back.
export function duckMusic(seconds = 1.6) {
  if (!master) return;
  fade(master.gain, VOLUME * 0.3, 0.2);
  setTimeout(() => { if (master) fade(master.gain, VOLUME, 1); }, seconds * 1000);
}

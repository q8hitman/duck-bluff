// Plays our own soundtrack (assets/music): each part of the game has its own playlist
// that moves to the next track with a soft overlap, and crossfades between parts.
import { audio } from './sound.js';

const music = name => `assets/music/${name}.mp3`;
const TRACKS = {
  menu: ['khaleeji2', 'morning'].map(music),
  chapter1: ['souq', 'firstday'].map(music),
  chapter2: ['sirr', 'detective'].map(music),
  chapter3: ['layl', 'hauntedlab'].map(music),
  chapter4: ['ard', 'finale'].map(music),
  chapterendless: ['khaleeji', 'ard', 'souq', 'layl', 'khaleeji2', 'sirr', 'finale', 'hauntedlab', 'detective', 'firstday', 'morning'].map(music),
  lastfeather: ['lastfeather'].map(music),
};
let volume = 0.5; // the player's choice, 0 to 1
const OVERLAP = 3; // seconds the end of a track overlaps the next start
const FADE = 1.2;
const RETRY_AFTER = 5000;

let enabled = true;
let started = false;
let master = null;
let mood = 'menu';
let tension = false;
let playing = null; // { name, gain, sources, timer }
let beatTimer = null;
let retryTimer = null;
const buffers = {};
const turn = Object.fromEntries(Object.keys(TRACKS).map(name => [name, 0]));

async function load(url) {
  const ctx = audio();
  buffers[url] ??= fetch(url).then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data)).catch(error => {
    delete buffers[url]; // a bad connection must not silence this track for good
    throw error;
  });
  return buffers[url];
}

const nextUrl = name => {
  const list = TRACKS[name];
  return list[turn[name]++ % list.length];
};
const peekUrl = name => TRACKS[name][turn[name] % TRACKS[name].length];

// A decoded track is large, so a phone only holds the ones about to play.
function keepOnly(...urls) {
  for (const url of Object.keys(buffers)) {
    if (!urls.includes(url)) delete buffers[url];
  }
}

function ensureGraph(ctx) {
  if (master) return;
  master = ctx.createGain();
  master.gain.value = volume;
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

function scheduleTrack(track, buffer, at) {
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
  keepOnly(peekUrl(track.name));
  load(peekUrl(track.name)).catch(() => {}); // ready before it's needed
  track.timer = setTimeout(async () => {
    if (playing !== track) return;
    const following = await load(nextUrl(track.name)).catch(() => buffer); // a bad file repeats this one
    if (playing === track) scheduleTrack(track, following, Math.max(next, ctx.currentTime + 0.05));
  }, Math.max(0, (next - ctx.currentTime - 1) * 1000));
}

// On the last feather the table plays its heavy version.
const currentMood = () => (tension && mood.startsWith('chapter') ? 'lastfeather' : mood);

async function playMood() {
  const ctx = audio();
  if (!ctx || !enabled || !started) return;
  const name = currentMood();
  if (playing?.name === name) return;
  ensureGraph(ctx);
  let buffer;
  try {
    buffer = await load(nextUrl(name));
  } catch {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(playMood, RETRY_AFTER);
    return; // no music rather than a broken game
  }
  if (name !== currentMood() || !enabled || playing?.name === name) return;
  stopPlaying();
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(master);
  const track = { name, gain, sources: [], timer: null };
  playing = track;
  scheduleTrack(track, buffer, ctx.currentTime + 0.1);
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

// percent is 0 to 100; heard at once, so the slider can be set by ear.
export function setMusicVolume(percent) {
  volume = Math.min(100, Math.max(0, percent)) / 100;
  if (master) fade(master.gain, volume, 0.15);
}

export function setMood(value) {
  mood = value;
  playMood();
}

export function setTension(value) {
  tension = value;
  playMood();
}

// Dip under a big moment, then come back.
export function duckMusic(seconds = 1.6) {
  if (!master) return;
  fade(master.gain, volume * 0.3, 0.2);
  setTimeout(() => { if (master) fade(master.gain, volume, 1); }, seconds * 1000);
}

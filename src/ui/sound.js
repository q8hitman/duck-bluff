// Sound effects built with Web Audio, so the game needs no audio files offline.
let ctx = null;
let enabled = true;

export const setSound = on => { enabled = on; };

export function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null; // no audio on this device
  }
}

function tone(freq, ms, gain = 0.05, type = 'sine', delay = 0, slideTo = null) {
  const c = enabled && audio();
  if (!c) return;
  const start = c.currentTime + delay;
  const end = start + ms / 1000;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, end);
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(amp).connect(c.destination);
  osc.start(start);
  osc.stop(end);
}

function noise(ms, gain, cutoff, delay = 0, type = 'bandpass') {
  const c = enabled && audio();
  if (!c) return;
  const samples = Math.floor(c.sampleRate * ms / 1000);
  const buffer = c.createBuffer(1, samples, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = cutoff;
  const amp = c.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(c.destination);
  src.start(c.currentTime + delay);
}

// A small cartoon quack: a nasal saw whose pitch falls through a formant.
function quack(pitch = 1, gain = 0.05) {
  const c = enabled && audio();
  if (!c) return;
  const start = c.currentTime;
  const osc = c.createOscillator();
  const formant = c.createBiquadFilter();
  const amp = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(330 * pitch, start);
  osc.frequency.exponentialRampToValueAtTime(190 * pitch, start + 0.13);
  formant.type = 'bandpass';
  formant.frequency.value = 1100;
  formant.Q.value = 3;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
  osc.connect(formant).connect(amp).connect(c.destination);
  osc.start(start);
  osc.stop(start + 0.16);
}

export const sounds = {
  tap: () => tone(620, 45, 0.02, 'triangle'),
  deal: () => noise(45, 0.035, 2600),
  flip: i => { noise(70, 0.04, 1800); quack(0.9 + ((i * 7) % 5) * 0.09, 0.035); },
  mark: () => tone(880, 50, 0.02, 'triangle'),
  ability: () => { [660, 880, 1175].forEach((f, n) => tone(f, 220, 0.025, 'sine', n * 0.06)); },
  answer: () => tone(990, 160, 0.03, 'sine', 0, 1320),
  whoosh: () => noise(320, 0.05, 900),
  lock: () => { tone(1400, 60, 0.03, 'square'); tone(1760, 90, 0.03, 'square', 0.08); },
  good: () => { noise(130, 0.08, 500, 0, 'lowpass'); tone(523, 130, 0.05, 'triangle', 0.02); tone(784, 240, 0.05, 'triangle', 0.12); quack(0.7, 0.05); },
  bad: () => { tone(170, 340, 0.08, 'triangle', 0, 80); noise(120, 0.05, 300, 0, 'lowpass'); quack(1.25, 0.03); },
  win: () => { [523, 659, 784, 1047].forEach((f, n) => tone(f, 300, 0.05, 'triangle', n * 0.12)); },
  lose: () => { [392, 330, 262].forEach((f, n) => tone(f, 380, 0.05, 'triangle', n * 0.2)); },
};

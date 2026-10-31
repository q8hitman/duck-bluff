# The BSC soundtrack, composed note by note and synthesized here, with no samples.
# One hook ("the duck motif") runs through every track, like a story theme. Around it:
# chip waves and sparse arrangements, syncopated funk bass with a tight snare, Gulf
# handclaps, and lab sounds (glass, bubbles, one duck) played as percussion.
# Run: python tools/compose.py [out_dir]
import sys
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

SR = 44100
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/ref/music/composed')
OUT.mkdir(parents=True, exist_ok=True)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def times(seconds):
    return np.arange(int(seconds * SR)) / SR


def ad(n, attack=0.004, decay=0.2, sustain=0.0):
    t = np.arange(n) / SR
    env = sustain + (1 - sustain) * np.exp(-t / max(decay, 1e-3))
    a = max(1, int(attack * SR))
    env[:a] *= np.linspace(0, 1, min(a, n))
    r = min(n, int(0.012 * SR))
    env[-r:] *= np.linspace(1, 0, r)
    return env


def band(x, low, high):
    return sosfilt(butter(2, [low, high], btype='band', fs=SR, output='sos'), x)


def lowpass(x, cut):
    return sosfilt(butter(2, cut, fs=SR, output='sos'), x)


def highpass(x, cut):
    return sosfilt(butter(2, cut, btype='high', fs=SR, output='sos'), x)


# Band-limited waves, so the chip sound stays soft on the ears.
def pulse(midi, dur, duty=0.5, decay=0.5, sustain=0.5, vibrato=0.0):
    f = hz(midi)
    t = times(dur)
    phase = 2 * np.pi * f * t + vibrato * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 3, 0, 1)
    x = np.zeros_like(t)
    for k in range(1, min(14, int(9000 / f)) + 1):
        x += np.sin(np.pi * k * duty) / k * np.sin(k * phase)
    return x * 0.7 * ad(len(t), 0.003, decay, sustain)


def triangle(midi, dur, decay=0.4, sustain=0.6):
    f = hz(midi)
    t = times(dur)
    x = sum(((-1) ** k) / (2 * k + 1) ** 2 * np.sin(2 * np.pi * (2 * k + 1) * f * t) for k in range(5))
    return x * 0.9 * ad(len(t), 0.004, decay, sustain)


def felt_piano(midi, dur):
    f = hz(midi)
    t = times(max(dur, 0.9))
    x = sum(a * np.sin(2 * np.pi * k * f * t * (1 + 0.0004 * k)) * np.exp(-t * (1.4 + k * 0.9))
            for k, a in zip(range(1, 7), [1, .45, .22, .1, .05, .03]))
    return x * 0.6 * ad(len(t), 0.006, 9, 0)


def funk_bass(midi, dur, pop=False):
    f = hz(midi)
    t = times(dur)
    x = sum((1 / k) * np.exp(-t * k * (2.2 if pop else 3.4)) * np.sin(2 * np.pi * k * f * t) for k in range(1, 11))
    return np.tanh(x * 1.5) * 0.7 * ad(len(t), 0.002, 0.3, 0.4)


def chk(midi):
    # a muted guitar stroke: a tuned noise burst, three notes at once
    n = int(0.07 * SR)
    t = times(0.07)
    x = sum(np.sin(2 * np.pi * hz(midi + i) * t) for i in (0, 7, 12))
    x = x * 0.4 + np.random.default_rng(midi).normal(0, .5, n)
    return band(x, 700, 4200) * np.exp(-t * 60) * 0.8


def stab(midis, dur=0.18):
    t = times(dur)
    x = np.zeros_like(t)
    for m in midis:
        for detune in (0.997, 1.003):
            x += sum(np.sin(2 * np.pi * k * hz(m) * detune * t) / k for k in range(1, 7))
    return lowpass(x, 3200) * 0.09 * ad(len(t), 0.004, 0.09, 0.15)


def kick():
    t = times(0.26)
    return np.sin(2 * np.pi * (48 * t + 16 * (1 - np.exp(-t * 34)))) * np.exp(-t * 15)


def snare():
    t = times(0.2)
    noise = highpass(np.random.default_rng(3).normal(0, 1, len(t)), 1200)
    return (noise * np.exp(-t * 20) * 0.5 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 34) * 0.5)


def clap(seed=4):
    t = times(0.16)
    x = band(np.random.default_rng(seed).normal(0, 1, len(t)), 800, 5200)
    env = sum(np.exp(-np.clip(t - d, 0, None) * (150 if d < 0.02 else 34)) * (t >= d) for d in (0, 0.009, 0.019))
    return x * env * 0.5


def snap():
    t = times(0.05)
    return band(np.random.default_rng(5).normal(0, 1, len(t)), 1800, 6500) * np.exp(-t * 130)


def hat(open_=False):
    t = times(0.14 if open_ else 0.035)
    return highpass(np.random.default_rng(6).normal(0, 1, len(t)), 7000) * np.exp(-t * (24 if open_ else 150)) * 0.5


def glass(midi=96):
    # a beaker tapped with a pen
    t = times(0.5)
    f = hz(midi)
    return sum(a * np.sin(2 * np.pi * r * f * t) * np.exp(-t * d)
               for r, a, d in [(1, 1, 9), (2.32, .5, 14), (3.86, .25, 22)]) * 0.5 * ad(len(t), 0.001, 9, 0)


def bubble(start=320):
    t = times(0.1)
    f = start * (1 + 1.9 * t / 0.1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.1) ** 2 * 0.8


def quack(midi=57):
    t = times(0.15)
    f = hz(midi) * (1 + 0.22 * np.sin(np.pi * t / 0.15))
    phase = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * phase) / k for k in range(1, 22))
    return (band(x, 750, 1500) + band(x, 1700, 3000) * 0.6) * np.sin(np.pi * t / 0.15) ** .6 * 0.9


class Song:
    def __init__(self, bpm, bars, seed, swing=0.0):
        self.step = 60 / bpm / 4
        self.swing = swing
        self.rng = np.random.default_rng(seed)
        size = int((bars * 16 + 16) * self.step * SR)
        self.dry = np.zeros((size, 2))
        self.wet = np.zeros((size, 2))
        self.bars = bars

    def at(self, step):
        t = step * self.step
        if int(round(step)) % 2:
            t += self.swing * self.step
        return t + self.rng.normal(0, 0.0015)

    def add(self, x, step, gain=1.0, pan=0.0, send=0.1):
        start = max(0, int(self.at(step) * SR))
        end = min(len(self.dry), start + len(x))
        if end <= start:
            return
        x = x[:end - start] * gain * (1 + self.rng.normal(0, 0.05))
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.dry[start:end, 0] += x * left
        self.dry[start:end, 1] += x * right
        if send:
            self.wet[start:end, 0] += x * left * send
            self.wet[start:end, 1] += x * right * send

    def pattern(self, bar, text, make, gain=1.0, pan=0.0, send=0.05):
        for i, c in enumerate(text):
            if c != '.':
                self.add(make(), bar * 16 + i, gain * (0.5 if c == 'o' else 1), pan, send)

    def render(self, name, room=1.4):
        t = times(room)
        rng = np.random.default_rng(11)
        ir = np.stack([rng.normal(0, 1, len(t)) * np.exp(-t * 5.5 / room) for _ in range(2)], axis=1)
        ir[:, 0], ir[:, 1] = highpass(ir[:, 0], 280), highpass(ir[:, 1], 280)
        ir /= np.sqrt((ir ** 2).sum(axis=0))
        wet = np.stack([fftconvolve(self.wet[:, c], ir[:, c])[:len(self.wet)] for c in range(2)], axis=1)
        mix = self.dry + wet
        mix = np.tanh(mix / (np.percentile(np.abs(mix), 99.7) + 1e-6) * 0.8)
        mix[-int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))[:, None]
        wavfile.write(OUT / f'{name}.wav', SR, (mix * 0.92 * 32767).astype(np.int16))
        print(name, f'{len(mix) / SR:.0f}s')


# The hook. Steps over two bars; pitches are in function, so each key colors it its own way.
MOTIF = [(0, 'r', 3), (3, 'm', 3), (6, 'f', 2), (10, 's', 2), (12, 'f', 2), (14, 'q', 2),
         (16, 'm', 3), (19, 'q', 1), (20, 'm', 2), (22, 'r', 4), (26, 't', 2), (28, 'r', 4)]
MINOR = {'r': 0, 't': -2, 'm': 3, 'q': 5, 'f': 7, 's': 10}
MAJOR = {'r': 0, 't': -3, 'm': 4, 'q': 5, 'f': 7, 's': 9}
HIJAZ = {'r': 0, 't': -2, 'm': 4, 'q': 5, 'f': 7, 's': 8}  # the augmented step is the Gulf color


def motif(song, bar, root, scale, make, gain=1.0, pan=0.0, send=0.25, tail=None):
    for step, degree, length in MOTIF:
        if tail is not None and step < tail:
            continue
        song.add(make(root + scale[degree], length * song.step * 1.4), bar * 16 + step, gain, pan, send)


def chord(root, kind):
    return [root + i for i in {'m': (0, 3, 7), 'M': (0, 4, 7), 'm7': (0, 3, 7, 10)}[kind]]


def home():
    # the menu: warm, slow to arrive, the motif plain as a lullaby
    s = Song(92, 28, 21, swing=0.12)
    progression = [(60, 'M'), (57, 'm'), (65, 'M'), (67, 'M')]
    for bar in range(28):
        root, kind = progression[bar % 4]
        for i, note in enumerate(chord(root, kind) + [root + 12]):
            s.add(felt_piano(note, 1.1), bar * 16 + i * 2 + (8 if bar % 2 else 0), 0.42, (i - 1.5) * 0.25, 0.35)
        if bar >= 4:
            s.add(triangle(root - 24, s.step * 7, 0.5, 0.5), bar * 16, 0.55, 0, 0.05)
            s.add(triangle(root - 24 + 7, s.step * 3), bar * 16 + 10, 0.45, 0, 0.05)
        if bar >= 8:
            s.pattern(bar, 'x...o...x...o.o.', hat, 0.16, 0.2, 0.02)
            s.pattern(bar, '....x.......x...', snap, 0.3, -0.2, 0.2)
    for bar in (4, 8, 12, 20, 24):
        make = (lambda m, d: pulse(m, d, 0.5, 0.4, 0.5, 0.12)) if bar >= 8 else felt_piano
        motif(s, bar, 72, MAJOR, make, 0.42 if bar >= 8 else 0.7, 0.1, 0.35)
    for bar in (16, 18):  # a turn upward before coming home
        for i, m in enumerate((76, 77, 79, 84, 83, 79)):
            s.add(pulse(m, s.step * 3, 0.25, 0.3, 0.4, 0.1), bar * 16 + i * 4, 0.34, -0.1, 0.35)
    for bar in range(3, 28, 4):
        s.add(glass(96), bar * 16 + 15, 0.13, 0.5, 0.5)
    s.render('home')


def sneak():
    # tiptoeing round the table: almost nothing playing, every note counts
    s = Song(78, 24, 22, swing=0.18)
    progression = [(57, 'm'), (57, 'm'), (53, 'M'), (52, 'M')]
    for bar in range(24):
        root, kind = progression[bar % 4]
        for step, off in ((0, 0), (3, 7), (6, 12), (10, 7), (12, 3 if kind == 'm' else 4), (14, 7)):
            s.add(triangle(root - 12 + off, s.step * 1.4, 0.09, 0), bar * 16 + step, 0.62, 0, 0.1)
        s.pattern(bar, '..x...x...x...x.', lambda: chk(root + 12), 0.1, 0.35, 0.2)
        if bar >= 4:
            s.pattern(bar, '....x.......x...', snap, 0.34, -0.3, 0.3)
        if bar % 3 == 2:
            s.add(bubble(280 + bar * 12), bar * 16 + 13, 0.16, -0.4, 0.5)
            s.add(bubble(420 + bar * 12), bar * 16 + 14.5, 0.12, 0.4, 0.5)
    pluck = lambda m, d: pulse(m, min(d, 0.3), 0.25, 0.12, 0.05)
    for bar in (4, 8, 16, 20):
        motif(s, bar, 69, MINOR, pluck, 0.6, -0.15, 0.4)
    for bar in (12, 14):
        for i, m in enumerate((81, 80, 79, 76)):
            s.add(glass(m + 12), bar * 16 + i * 6, 0.3, 0.3 * (-1) ** i, 0.5)
    s.render('sneak', room=2.0)


def groove(name, bpm, root, scale, seed, bass, gulf=False):
    # the shared skeleton of the funk tracks: bass and drums lock, everything else answers
    s = Song(bpm, 32, seed, swing=0.08)
    bars = [(0, 'm7'), (0, 'm7'), (-2, 'M'), (0, 'm7')]
    bridge = [(5, 'm'), (5, 'm'), (7, 'M'), (7, 'M')]
    for bar in range(32):
        section = 'intro' if bar < 4 else 'bridge' if 18 <= bar < 22 else 'break' if bar == 26 else 'main'
        off, kind = (bridge if section == 'bridge' else bars)[bar % 4]
        chord_root = root + off
        for i, c in enumerate(bass):
            if c == '.':
                continue
            pitch = chord_root - 24 + {'x': 0, 'o': 12, 'f': 7, 'b': 10 if kind != 'M' else 11}[c]
            s.add(funk_bass(pitch, s.step * 1.6, c == 'o'), bar * 16 + i, 0.95 if i % 4 == 0 else 0.72, 0, 0.0)
        if section != 'break':
            s.pattern(bar, 'x.....x...x.....' if bar % 4 != 3 else 'x.....x...x..x..', kick, 1.0, 0, 0)
        if section == 'main':
            s.pattern(bar, '....x.......x...', snare, 0.62, 0, 0.4)
            s.pattern(bar, '.......o.o......', snare, 0.1, 0, 0.05)
            s.pattern(bar, 'x.o.x.o.x.oox.o.', hat, 0.22, 0.25, 0.02)
            s.pattern(bar, '..x..x....x..x.x', lambda: chk(chord_root + 12), 0.22, -0.4, 0.1)
            s.pattern(bar, '....x...........' if bar % 2 else '...........x....',
                      lambda: stab(chord(chord_root + 12, kind)), 0.9, 0.3, 0.3)
        else:
            s.pattern(bar, '....x.......x...', snap, 0.42, 0.2, 0.4)
            s.pattern(bar, 'x...o...x...o...', hat, 0.14, 0.25, 0.02)
        if gulf and section in ('main', 'bridge'):
            s.pattern(bar, 'x..x..x.x..x..x.', lambda: clap(4 + bar % 3), 0.2, -0.35, 0.3)
        if bar % 8 == 7:
            s.add(quack(root - 3), bar * 16 + 15, 0.3, 0.45, 0.25)
        if bar % 4 == 1:
            s.add(glass(root + 36), bar * 16 + 7, 0.1, -0.5, 0.5)
    lead = lambda m, d: pulse(m, d, 0.25, 0.3, 0.45, 0.15)
    for bar in (4, 8, 12, 22, 28):
        motif(s, bar, root + 12, scale, lead, 0.34, 0.05, 0.3)
    for bar in (18, 20):  # the bridge answers the hook on piano, an octave down
        motif(s, bar, root + 5, scale, felt_piano, 0.62, -0.1, 0.35)
    for step, m in enumerate((0, 3, 7, 10, 12)):  # a run out of the break
        s.add(lead(root + 12 + m, s.step * 2), 27 * 16 + 6 + step * 2, 0.34, 0, 0.3)
    s.render(name)


def chase():
    # a last-feather pace: quick arpeggios and the motif at double speed
    s = Song(132, 36, 25)
    progression = [(62, 'm'), (58, 'M'), (60, 'M'), (57, 'M')]
    for bar in range(36):
        root, kind = progression[bar % 4]
        notes = chord(root, kind)
        for i in range(16):
            s.add(pulse(notes[i % 3] + 12 * (i % 6 > 2), s.step * 0.9, 0.5, 0.05, 0.1), bar * 16 + i, 0.2, 0.3 * (-1) ** i, 0.08)
        s.pattern(bar, 'x.x.x.x.x.x.xxx.', lambda: funk_bass(root - 24, s.step), 0.6, 0, 0)
        if bar >= 4:
            s.pattern(bar, 'x...x.x...x.x...', kick, 0.8, 0, 0)
            s.pattern(bar, '....x.......x...', snare, 0.48, 0, 0.3)
            s.pattern(bar, 'o.o.o.o.o.o.o.o.', hat, 0.2, -0.25, 0.02)
    lead = lambda m, d: pulse(m, d, 0.5, 0.2, 0.5, 0.1)
    for bar in (8, 10, 12, 14, 24, 26, 28, 30):
        motif(s, bar, 74, MINOR, lead, 0.38, 0, 0.2)
    s.render('chase', room=0.9)


home()
sneak()
groove('lab-funk', 112, 64, MINOR, 23, 'x..x..o.x.bx..f.')
groove('midnight', 104, 62, HIJAZ, 24, 'x.....ox..x.b.f.', gulf=True)
chase()

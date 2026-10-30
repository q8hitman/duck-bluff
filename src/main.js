// App shell: loads the save, applies settings and switches screens.
import { createProgress } from './core/progress.js';
import { setLang, dir, getLang, t } from './i18n/i18n.js';
import { h, wait, setReducedPreference } from './ui/motion.js';
import { setSound, audio } from './ui/sound.js';
import { startMusic, setMusic, setMood } from './ui/music.js';
import { buildWorld } from './ui/world.js';
import { roundScreen } from './ui/screens/round.js';
import { menuScreen, chaptersScreen, introScreen, albumScreen, settingsScreen } from './ui/screens/pages.js';

const SCREENS = { menu: menuScreen, chapters: chaptersScreen, round: roundScreen, intro: introScreen, album: albumScreen, settings: settingsScreen };
const host = document.getElementById('app');
const progress = createProgress();

let current = null;
let cleanup = null;
let token = 0;
let audioUnlocked = false;

const app = {
  save: progress.load(),
  persist() { progress.save(app.save); },
  applySettings() {
    const s = app.save.settings;
    setLang(s.lang);
    document.documentElement.lang = getLang();
    document.documentElement.dir = dir();
    document.title = t('appName');
    setReducedPreference(s.reduceMotion);
    setSound(s.sound);
    setMusic(s.music);
    if (s.music && audioUnlocked) startMusic();
  },
  async go(name, params = {}) {
    const mine = ++token;
    if (current) {
      current.classList.add('leaving');
      await wait(100);
      if (mine !== token) return;
    }
    cleanup?.();
    setMood(name === 'round' ? 'table' : 'menu');
    const screen = h('div', { class: 'screen' });
    host.replaceChildren(screen);
    current = screen;
    cleanup = SCREENS[name](screen, app, params) ?? null;
    window.scrollTo(0, 0);
  },
};

// A per-device salt so each player gets their own sequence of rounds.
if (app.save.salt === undefined) {
  app.save = { ...app.save, salt: Date.now() % 1000000 };
  app.persist();
}

// Browsers only allow sound after the first tap.
addEventListener('pointerdown', () => {
  audioUnlocked = true;
  if (app.save.settings.music) startMusic();
}, { once: true });

document.addEventListener('visibilitychange', () => {
  if (!audioUnlocked) return;
  if (document.hidden) audio()?.suspend();
  else audio()?.resume();
});

app.applySettings();
buildWorld(document.getElementById('world'));
app.go('menu');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* still playable online */ });
}

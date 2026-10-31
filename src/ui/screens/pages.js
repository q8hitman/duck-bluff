// Menu, chapter select, new-duck intro, album and settings.
import { h } from '../motion.js';
import * as fx from '../fx.js';
import { CARDS, IMPOSTORS, getCard, impostorArt } from '../../core/cards.js';
import { startChapter, resumeRun, BADGES, DEFAULT_MUSIC_VOLUME } from '../../core/progress.js';
import { setMusicVolume } from '../music.js';
import { t, cardText, cardDesc, impostorText } from '../../i18n/i18n.js';

const topBar = (app, title, to = 'menu') => h('div', { class: 'page-top' },
  h('button', { class: 'btn small', onclick: () => app.go(to) }, t('back')),
  h('h2', {}, title));

export function menuScreen(root, app) {
  const started = app.save.nextSeed > 1 || app.save.chapter !== 1;
  const howTo = (then = null) => {
    const back = h('div', { class: 'sheet-back', onclick: e => { if (e.target === back) back.remove(); } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
        h('h3', { style: 'margin-bottom:8px' }, t('howTo')),
        h('p', { style: 'margin:0 0 8px' }, t('howToText')),
        h('p', { style: 'margin:0 0 12px;font-size:14px' }, t('rules')),
        h('button', { class: 'btn primary', style: 'width:100%', onclick: () => { back.remove(); then?.(); } }, then ? t('play') : t('close'))));
    document.body.append(back);
  };
  root.append(h('img', { class: 'menu-logo', src: 'assets/ui/logo-full.webp', alt: 'Biological Sciences Club, Kuwait University' }), h('div', { class: 'menu' },
    h('img', { class: 'menu-emblem', src: 'assets/ui/emblem.webp', alt: '' }),
    h('h1', {}, t('appName')),
    h('p', {}, t('tagline')),
    h('div', { class: 'menu-buttons' },
      h('button', { class: 'btn primary', onclick: () => {
        app.save = resumeRun(app.save);
        if (app.save.seenHowTo) { app.persist(); app.go('round'); return; }
        // first time: explain the game, then start
        app.save = { ...app.save, seenHowTo: true };
        app.persist();
        howTo(() => app.go('round'));
      } }, started ? t('continue') : t('play')),
      h('button', { class: 'btn', onclick: () => app.go('chapters') }, t('chapters')),
      h('button', { class: 'btn', onclick: () => app.go('album') }, t('album')),
      h('button', { class: 'btn', onclick: () => howTo() }, t('howTo')),
      h('button', { class: 'btn', onclick: () => app.go('settings') }, t('settings')))));
  fx.menuIn(root);
}

// A chapter is open once its first card is unlocked.
const CHAPTER_KEY = { 1: 'abdullah', 2: 'rawan', 3: 'ruaa', 4: 'motivator' };

export function chaptersScreen(root, app) {
  const open = id => (id === 'endless' ? Boolean(app.save.endlessOpen) : app.save.unlocked.includes(CHAPTER_KEY[id]));
  const pick = id => {
    app.save = startChapter(app.save, id);
    app.persist();
    app.go('round');
  };
  root.classList.add('narrow');
  root.append(topBar(app, t('chapters')), h('div', { class: 'chapter-list' },
    [1, 2, 3, 4, 'endless'].map(id => h('button', { class: 'chapter', disabled: !open(id), onclick: () => pick(id) },
      h('span', { class: 'num' }, id === 'endless' ? '∞' : String(id)),
      h('strong', {}, t(`chapter${id}`)),
      open(id) ? null : h('span', {}, `🔒 ${t('locked')}`)))));
}

export function introScreen(root, app, { ids }) {
  const info = id => {
    const card = getCard(id);
    if (card) return { img: card.portrait, name: cardText(id).name, desc: cardDesc(id) };
    return { img: impostorArt(id), name: impostorText(id).name, desc: impostorText(id).desc };
  };
  root.append(
    h('div', { class: 'page-top' }, h('h2', {}, `${t('chapterDone')} ${t('newDucks')}`)),
    h('div', { class: 'intro-list' }, ids.map((id, n) => {
      const c = info(id);
      return h('div', { class: 'intro-item', style: `--i:${n}` },
        h('img', { src: c.img, alt: '' }),
        h('div', {}, h('strong', {}, c.name), c.desc ? h('p', {}, c.desc) : null));
    })),
    h('button', { class: 'btn primary', style: 'width:100%', onclick: () => app.go('round') }, t('nextRound')));
}

export function albumScreen(root, app) {
  const have = app.save.badges ?? [];
  const show = (id, img, name) => {
    const ability = getCard(id)?.ability ? cardText(id).ability : null;
    const back = h('div', { class: 'sheet-back', onclick: e => { if (e.target === back) back.remove(); } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'sheet-head' }, h('img', { src: img, alt: '' }), h('h3', {}, name)),
        h('p', { class: 'sheet-desc' }, cardDesc(id) ?? impostorText(id).desc),
        ability ? h('div', { class: 'sheet-ability' }, `✋ ${ability}`) : null,
        h('button', { class: 'btn primary', style: 'width:100%', onclick: () => back.remove() }, t('close'))));
    document.body.append(back);
  };
  const tile = (id, img, name) => h('button', { class: 'album-card', onclick: () => show(id, img, name) },
    h('img', { src: img, alt: '' }),
    h('span', {}, name));
  const group = (title, items) => h('section', { class: 'album-group' },
    h('h3', {}, `${title} (${items.length})`),
    h('div', { class: 'album-grid' }, items.map(x => tile(x.id, x.img, x.name))));
  const cards = CARDS.map(c => ({ id: c.id, img: c.portrait, name: cardText(c.id).name, group: c.group }));
  root.append(topBar(app, t('album')),
    h('section', { class: 'album-group' },
      h('h3', {}, `🏅 ${t('badges')} (${t('seenCount', { n: have.length, total: BADGES.length })})`),
      app.save.bestStreak ? h('p', { class: 'best-streak' }, t('bestStreak', { n: app.save.bestStreak })) : null,
      h('div', { class: 'badge-grid' }, BADGES.map(id => h('div', { class: `badge${have.includes(id) ? ' on' : ''}` },
        h('strong', {}, t(`badge_${id}`)),
        h('span', {}, t(`badgeDesc_${id}`)))))),
    group('BSC', cards.filter(c => c.group === 'club')),
    group('🦆', cards.filter(c => c.group === 'guest')),
    group('🎭', IMPOSTORS.map(i => ({ id: i.id, img: impostorArt(i.id), name: impostorText(i.id).name }))));
}

// Follows the finger live and saves on release; redrawing the page would drop the slider.
function musicVolumeRow(app) {
  const s = app.save.settings;
  const value = s.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  const label = h('output', { class: 'volume-value' }, `${value}%`);
  const slider = h('input', {
    class: 'volume',
    type: 'range',
    min: '0',
    max: '100',
    step: '5',
    value: String(value),
    'aria-label': t('musicVolume'),
  });
  if (!s.music) slider.disabled = true;
  slider.addEventListener('input', () => {
    label.textContent = `${slider.value}%`;
    setMusicVolume(Number(slider.value));
  });
  slider.addEventListener('change', () => {
    app.save = { ...app.save, settings: { ...app.save.settings, musicVolume: Number(slider.value) } };
    app.persist();
  });
  return h('div', { class: `setting${s.music ? '' : ' off'}` }, h('strong', {}, t('musicVolume')), h('div', { class: 'volume-row' }, slider, label));
}

export function settingsScreen(root, app) {
  const segmented = (options, current, onPick) => h('div', { class: 'segmented' },
    options.map(([value, label]) => h('button', { class: `btn${current === value ? ' on' : ''}`, onclick: () => onPick(value) }, label)));
  const change = patch => {
    app.save = { ...app.save, settings: { ...app.save.settings, ...patch } };
    app.persist();
    app.applySettings();
    app.go('settings');
  };
  const s = app.save.settings;
  root.classList.add('narrow');
  root.append(topBar(app, t('settings')),
    h('div', { class: 'setting' }, h('strong', {}, t('language')),
      segmented([['ar', 'العربية'], ['en', 'English']], s.lang, lang => change({ lang }))),
    h('div', { class: 'setting' }, h('strong', {}, t('reduceMotion')),
      segmented([[null, t('auto')], [true, t('on')], [false, t('off')]], s.reduceMotion, reduceMotion => change({ reduceMotion }))),
    h('div', { class: 'setting' }, h('strong', {}, t('sound')),
      segmented([[true, t('on')], [false, t('off')]], s.sound, sound => change({ sound }))),
    h('div', { class: 'setting' }, h('strong', {}, t('music')),
      segmented([[true, t('on')], [false, t('off')]], s.music, music => change({ music }))),
    musicVolumeRow(app),
    h('div', { class: 'setting' }, h('strong', {}, t('facts')),
      segmented([[true, t('on')], [false, t('off')]], s.facts, facts => change({ facts }))));
}

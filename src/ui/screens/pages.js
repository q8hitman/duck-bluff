// Menu, chapter select, new-duck intro, album and settings.
import { h } from '../motion.js';
import * as fx from '../fx.js';
import { CARDS, IMPOSTORS, getCard, impostorArt, frameOf } from '../../core/cards.js';
import { startChapter, resumeRun } from '../../core/progress.js';
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
  root.append(h('div', { class: 'menu' },
    h('div', { class: 'menu-fan', 'aria-hidden': 'true' }, ['camel', 'rawan', 'abdullah', 'loujain', 'ali'].map((id, n) => h('div', { class: 'fan-slot', style: `--n:${n - 2}` },
      h('div', { class: 'fan-card' }, h('img', { class: 'card-art', src: getCard(id).portrait, alt: '' }), h('img', { class: 'card-frame', src: frameOf(id), alt: '' }))))),
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
  const seen = new Set(app.save.seen);
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
  const tile = (id, img, name) => h('button', { class: `album-card${seen.has(id) ? '' : ' locked'}`, onclick: () => { if (seen.has(id)) show(id, img, name); } },
    h('img', { src: img, alt: '' }),
    h('span', {}, seen.has(id) ? name : t('unknownCard')));
  const group = (title, items) => h('section', { class: 'album-group' },
    h('h3', {}, `${title} (${t('seenCount', { n: items.filter(x => seen.has(x.id)).length, total: items.length })})`),
    h('div', { class: 'album-grid' }, items.map(x => tile(x.id, x.img, x.name))));
  const cards = CARDS.map(c => ({ id: c.id, img: c.portrait, name: cardText(c.id).name, group: c.group }));
  root.append(topBar(app, t('album')),
    group('BSC', cards.filter(c => c.group === 'club')),
    group('🦆', cards.filter(c => c.group === 'guest')),
    group('🎭', IMPOSTORS.map(i => ({ id: i.id, img: impostorArt(i.id), name: impostorText(i.id).name }))));
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
  root.append(topBar(app, t('settings')),
    h('div', { class: 'setting' }, h('strong', {}, t('language')),
      segmented([['ar', 'العربية'], ['en', 'English']], s.lang, lang => change({ lang }))),
    h('div', { class: 'setting' }, h('strong', {}, t('reduceMotion')),
      segmented([[null, t('auto')], [true, t('on')], [false, t('off')]], s.reduceMotion, reduceMotion => change({ reduceMotion }))),
    h('div', { class: 'setting' }, h('strong', {}, t('sound')),
      segmented([[true, t('on')], [false, t('off')]], s.sound, sound => change({ sound }))),
    h('div', { class: 'setting' }, h('strong', {}, t('music')),
      segmented([[true, t('on')], [false, t('off')]], s.music, music => change({ music }))),
    h('div', { class: 'setting' }, h('strong', {}, t('facts')),
      segmented([[true, t('on')], [false, t('off')]], s.facts, facts => change({ facts }))));
}

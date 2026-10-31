// One table card: a two-sided element whose classes drive the flip and reveal.
import { h } from './motion.js';
import { boardLabel } from '../core/board.js';
import { getCard, frameOf, impostorArt } from '../core/cards.js';
import { cardText } from '../i18n/i18n.js';

const MARK_ICON = { innocent: '✅', suspect: '❓', evil: '❌' };

export function createCardView(i, shownId, onTap) {
  const card = getCard(shownId);
  const portrait = h('img', { class: 'card-art', src: card.portrait, alt: '', draggable: 'false' });
  const frame = h('img', { class: 'card-frame', src: frameOf(shownId), alt: '', draggable: 'false' });
  const nameEl = h('div', { class: 'card-name' }, h('span', {}, cardText(shownId).name));
  const mark = h('span', { class: 'card-mark' });
  const tag = h('span', { class: 'card-tag', hidden: 'hidden' });
  const face = h('div', { class: 'card-side card-face' }, portrait, frame, nameEl, tag,
    card.ability ? h('span', { class: 'card-power' }, '✋') : shownId === 'volatile' ? h('span', { class: 'card-power' }, '💥') : null, mark);
  const back = h('div', { class: 'card-side card-back' }, h('img', { src: 'assets/ui/card-back.webp', alt: '', draggable: 'false' }));
  const el = h('button', {
    class: `card ${card.group}${shownId === 'abdullah' ? ' legend' : ''}`,
    onclick: () => onTap(i),
  }, h('div', { class: 'card-inner' }, back, face), h('span', { class: 'card-num' }, String(boardLabel(i))));

  return {
    el,
    update({ flipped, markValue, used, picking, chosen, selected, aimOn, aimOff }) {
      el.classList.toggle('flipped', flipped);
      el.classList.toggle('used', used);
      el.classList.toggle('picking', picking);
      el.classList.toggle('chosen', chosen);
      el.classList.toggle('selected', selected);
      el.classList.toggle('aim-on', aimOn);
      el.classList.toggle('aim-off', aimOff);
      mark.textContent = MARK_ICON[markValue] ?? '';
      el.setAttribute('aria-label', `${boardLabel(i)} ${flipped ? cardText(shownId).name : ''}`);
    },
    unmask(impostorType, name) {
      portrait.src = impostorArt(impostorType);
      frame.src = 'assets/ui/frame-impostor.webp';
      nameEl.firstChild.textContent = name;
    },
    showTag(text, calm = false) {
      tag.textContent = text;
      tag.classList.toggle('calm', calm);
      tag.removeAttribute('hidden');
    },
  };
}

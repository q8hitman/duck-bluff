// The table: flip cards, read lines, use abilities, expel impostors.
import { h, wait, toast, reduced, MOTION } from '../motion.js';
import { sounds } from '../sound.js';
import { setTension, duckMusic } from '../music.js';
import * as fx from '../fx.js';
import { createCardView } from '../card-view.js';
import { boardLabel } from '../../core/board.js';
import { referredCards } from '../../core/refs.js';
import { getCard, impostorArt } from '../../core/cards.js';
import { generateRound, unlockedThrough } from '../../core/generator.js';
import { createRound, flip, mark, expel, useAbility, setBusy } from '../../core/round.js';
import { forceClubFor, onRoundWon, onRunLost, onFeatherLost, roundScore, ROUNDS_PER_CHAPTER } from '../../core/progress.js';
import { t, getLang, cardText, cardDesc, impostorText, statementText } from '../../i18n/i18n.js';

export function roundScreen(root, app) {
  if (app.save.feathers <= 0) app.save = onRunLost(app.save);
  const save = app.save;
  const seed = (save.salt ?? 0) + save.nextSeed;
  const generated = generateRound({
    chapter: save.chapter,
    seed,
    unlocked: unlockedThrough(save.chapter),
    recentClub: save.recentClub,
    forceClub: forceClubFor(save),
  });
  let state = createRound(generated, { feathers: save.feathers, seed });
  let picking = null; // { i, ability, chosen: [] }
  let aiming = false; // the expel button is armed and the player is choosing
  let focus = null; // { i, statement, ability }: the chosen duck and the line being pointed out
  let hover = null;
  let sheet = null;
  const { layout, shown, statements, impostorTypes } = state.puzzle;
  const n = shown.length;

  const featherEl = h('div', { class: 'feathers', 'aria-label': t('feathers') });
  const pickBar = h('div', {});
  const logEl = h('ul', { class: 'log' });
  const logEmpty = h('div', { class: 'log-empty' }, t('tapToFlip'));
  const views = shown.map((id, i) => createCardView(i, id, onCardTap));

  const sizeClass = n <= 6 ? 0 : n <= 8 ? 1 : n <= 10 ? 2 : 3;
  const caughtEl = h('div', { class: 'table-caught' });
  const centerLine = h('div', { class: 'center-line' });
  const bubbles = [];

  // Clockwise from the top in both languages, so card numbers never flip.
  function seat(i) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // ducks at the top and bottom speak toward the middle, where there is room
    const side = sin < -0.7 ? 'top' : sin > 0.7 ? 'bottom' : cos > 0 ? 'right' : 'left';
    bubbles[i] = h('div', { class: 'bubble', hidden: 'hidden' });
    return h('div', {
      class: `seat ${side}`,
      style: `--cos:${cos.toFixed(4)};--sin:${sin.toFixed(4)}`,
    }, views[i].el, bubbles[i]);
  }

  const typeCounts = {};
  impostorTypes.forEach(type => { typeCounts[type] = (typeCounts[type] ?? 0) + 1; });

  const detailsBtn = h('button', { class: 'btn small details-btn', hidden: 'hidden', onclick: () => { if (focus) openSheet(focus.i); } }, t('details'));
  const aimLabel = h('span', {}, t('expel'));
  const aimButton = h('button', { class: 'aim-fab', onclick: () => setAiming(!aiming) }, h('span', { class: 'aim-icon' }, '🦆💨'), aimLabel);

  const tableEl = h('div', { class: `table size-${sizeClass}`, onclick: e => { if (e.target === tableEl) setFocus(null); } },
    h('div', { class: 'table-center' }, h('img', { src: 'assets/ui/table-center.svg', alt: '' }), caughtEl, centerLine, detailsBtn),
    shown.map((_, i) => seat(i)),
    aimButton);

  root.append(
    h('div', { class: 'round-top' },
      h('button', { class: 'btn small', onclick: () => app.go('menu') }, t('back')),
      h('div', { class: 'round-title' },
        h('strong', {}, t(`chapter${save.chapter}`)),
        save.chapter === 'endless' ? null : t('roundOf', { n: save.roundInChapter, total: ROUNDS_PER_CHAPTER })),
      h('div', { class: 'types' }, h('span', { class: 'types-label' }, t('impostorsHere')),
        Object.entries(typeCounts).map(([type, n]) => h('button', {
          class: 'chip',
          onclick: () => toast(`${impostorText(type).name}: ${impostorText(type).desc}`),
        }, `${n} × ${impostorText(type).name}`))),
      featherEl),
    h('div', { class: 'round-body' },
      h('div', {},
        pickBar,
        tableEl),
      h('div', { class: 'log-wrap' }, h('div', { class: 'log-title' }, `💬 ${t('clues')}`), logEmpty, logEl)),
  );
  render();
  setTension(state.feathers === 1);
  views.forEach((view, i) => {
    fx.hoverable(view.el);
    if (!matchMedia('(hover: hover)').matches) return;
    view.el.addEventListener('pointerenter', () => {
      if (!state.flipped[i] || aiming || picking) return;
      hover = { i, statement: baseStatement(i), ability: false };
      renderFocus();
    });
    view.el.addEventListener('pointerleave', () => { hover = null; renderFocus(); });
  });
  requestAnimationFrame(() => fx.deal(views.map(view => view.el), tableEl, () => sounds.deal()));

  function lineOf(i) {
    if (statements[i]) return statementText(statements[i], shown[i], { self: i, layout });
    const clue = state.clues.find(c => c.from === i && !isAbilityClue(c));
    return clue ? statementText(clue.statement, null, { self: i, layout }) : t('waitingLine');
  }

  function isAbilityClue(clue) {
    return Boolean(getCard(shown[clue.from]).ability);
  }

  function render() {
    featherEl.replaceChildren(...[0, 1, 2].map(n => h('span', { class: n < state.feathers ? '' : 'gone' }, '🪶')));
    views.forEach((view, i) => view.update({
      flipped: state.flipped[i],
      markValue: state.marks[i],
      used: state.used[i],
      picking: Boolean(picking) && i !== picking.i,
      chosen: Boolean(picking) && picking.chosen.includes(i),
      aimOn: aiming && state.flipped[i] && !state.expelled[i],
      aimOff: aiming && (!state.flipped[i] || state.expelled[i]),
    }));
    renderPickBar();
    renderLog();
    caughtEl.textContent = t('caught', { n: state.correctExpels, total: impostorTypes.length });
    bubbles.forEach((bubble, i) => {
      const show = state.flipped[i] && !state.expelled[i];
      bubble.hidden = !show;
      if (show) bubble.textContent = lineOf(i);
    });
    renderFocus();
  }

  function renderPickBar() {
    pickBar.replaceChildren();
    if (aiming) {
      pickBar.append(h('div', { class: 'pick-bar aim-bar' },
        h('span', { class: 'grow' }, t('aimHint')),
        h('button', { class: 'btn small', onclick: () => setAiming(false) }, t('cancel'))));
      return;
    }
    if (!picking) return;
    const rowPick = picking.ability.kind === 'rowEvilCountOf';
    pickBar.append(h('div', { class: 'pick-bar', style: 'margin-bottom:8px' },
      h('span', { class: 'grow' }, rowPick ? t('chooseRow') : t('chooseTargets', { n: picking.ability.targets })),
      rowPick ? layout.rows.map((_, r) => h('button', { class: 'btn small', onclick: () => applyAbility(picking.i, [r]) }, t('row', { n: layout.rows[r].map(boardLabel).join(getLang() === 'ar' ? ' و' : ', ') }))) : null,
      h('button', { class: 'btn small', onclick: () => { picking = null; render(); } }, t('cancel'))));
  }

  function renderLog() {
    const items = [];
    shown.forEach((id, i) => {
      if (!state.flipped[i]) return;
      items.push(logItem(i, lineOf(i), false));
    });
    state.clues.filter(isAbilityClue).forEach(c => items.push(logItem(c.from, statementText(c.statement, null, { self: c.from, layout }), true, c.statement)));
    logEl.replaceChildren(...items);
    logEmpty.hidden = items.length > 0;
  }

  function logItem(i, text, ability, statement = baseStatement(i)) {
    const open = () => {
      if (state.busy || aiming || picking) return;
      setFocus(i, statement, ability);
      if (tableEl.getBoundingClientRect().top < 0) tableEl.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
    };
    return h('li', { class: `log-item${ability ? ' ability' : ''}${state.expelled[i] ? ' gone' : ''}`, onclick: open },
      h('span', { class: 'log-thumb' },
        h('img', { src: getCard(shown[i]).portrait, alt: '' }),
        h('span', { class: 'log-num' }, String(boardLabel(i)))),
      h('span', {}, h('span', { class: 'log-who' }, `${cardText(shown[i]).name}${ability ? ' ✋' : ''}: `), text));
  }

  // Esc backs out of whatever is open, for keyboard players.
  const onKey = e => {
    if (e.key !== 'Escape') return;
    if (sheet) closeSheet();
    else if (focus) setFocus(null);
    else if (aiming) setAiming(false);
    else if (picking) { picking = null; render(); }
  };
  addEventListener('keydown', onKey);
  addEventListener('resize', renderFocus);

  function baseStatement(i) {
    return statements[i] ?? state.clues.find(c => c.from === i && !isAbilityClue(c))?.statement ?? null;
  }

  function setFocus(i, statement = baseStatement(i), ability = false) {
    focus = i === null ? null : { i, statement, ability };
    renderFocus();
  }

  // Point out the cards the chosen duck is talking about: rings plus connecting lines.
  function renderFocus() {
    const active = hover ?? focus;
    const refs = active?.statement ? referredCards(layout, active.i, active.statement) : [];
    views.forEach((view, i) => {
      view.el.classList.toggle('selected', active?.i === i);
      view.el.classList.toggle('ref', refs.includes(i));
    });
    tableEl?.classList.toggle('focusing', refs.length > 0);

    const shownFocus = focus && !aiming && state.status === 'playing' ? focus : null;
    centerLine.classList.toggle('hint', !shownFocus);
    centerLine.textContent = shownFocus
      ? `${boardLabel(shownFocus.i)}. ${shownFocus.ability ? statementText(shownFocus.statement, null, { self: shownFocus.i, layout }) : lineOf(shownFocus.i)}`
      : t(state.flipped.every(Boolean) ? 'tipExpel' : 'tapToFlip');
    detailsBtn.hidden = !shownFocus || state.expelled[shownFocus.i];
  }

  const isRisky = i => state.truth.cards[i].realId === 'volatile';

  function setAiming(value) {
    if (value && (state.busy || state.status !== 'playing')) return;
    aiming = value;
    if (value) { picking = null; focus = null; }
    sounds.tap();
    document.body.classList.toggle('aiming', value);
    aimButton.classList.toggle('armed', value);
    aimLabel.textContent = value ? t('cancel') : t('expel');
    render();
  }

  function onCardTap(i) {
    if (state.status !== 'playing' || state.busy) return;
    if (picking) return pickTarget(i);
    if (aiming) {
      if (!state.flipped[i]) return toast(t('flipFirst'));
      if (state.expelled[i]) return undefined;
      setAiming(false);
      return doExpel(i);
    }
    if (!state.flipped[i]) {
      state = flip(state, i).state;
      setFocus(i);
      sounds.flip(i);
      fx.flipPop(views[i].el);
      render();
      fx.pop(bubbles[i], 0.24);
      fx.pop(centerLine, 0.1);
      fx.bob(views[i].el, i);
      return;
    }
    if (focus?.i === i && !state.expelled[i]) return openSheet(i);
    setFocus(i);
    sounds.tap();
  }

  function pickTarget(i) {
    if (i === picking.i || picking.ability.kind === 'rowEvilCountOf') return;
    const chosen = picking.chosen;
    const at = chosen.indexOf(i);
    if (at >= 0) chosen.splice(at, 1);
    else chosen.push(i);
    if (chosen.length === picking.ability.targets) applyAbility(picking.i, [...chosen]);
    else render();
  }

  function applyAbility(i, targets) {
    picking = null;
    const result = useAbility(state, i, targets);
    if (!result.events.length) return render();
    sounds.ability();
    const rowPick = getCard(shown[i]).ability.kind === 'rowEvilCountOf';
    const target = rowPick ? tableEl.querySelector('.table-center') : targets[0] === undefined ? null : views[targets[0]].el;
    state = result.state;
    render();
    fx.beam(views[i].el, target).then(() => {
      sounds.answer();
      apply({ state, events: result.events });
    });
  }

  function apply(result) {
    state = result.state;
    for (const e of result.events) {
      if (e.type === 'answer') { toast(`${cardText(shown[e.i]).name}: ${statementText(e.statement, null, { self: e.i, layout })}`); setFocus(e.i, e.statement, true); }
      if (e.type === 'shieldArmed') toast(t('shieldArmed'));
      if (e.type === 'pending') toast(t('pendingReveal', { target: boardLabel(e.target) }));
      if (e.type === 'shield') toast(t(e.works ? 'shieldWorked' : 'shieldFailed'), !e.works);
    }
    render();
  }

  function closeSheet() {
    sheet?.remove();
    sheet = null;
    render();
  }

  function openSheet(i) {
    const id = shown[i];
    const card = getCard(id);
    const markButton = (value, label) => h('button', {
      class: `btn small${state.marks[i] === value ? ' primary' : ''}`,
      onclick: () => { state = mark(state, i, state.marks[i] === value ? null : value).state; sounds.mark(); closeSheet(); },
    }, label);
    sheet = h('div', { class: 'sheet-back', onclick: e => { if (e.target === sheet) closeSheet(); } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'sheet-head' },
          h('img', { src: card.portrait, alt: '' }),
          h('div', {}, h('h3', {}, `${boardLabel(i)}. ${cardText(id).name}`))),
        h('div', { class: 'sheet-line' }, h('small', {}, t('saysNow')), lineOf(i)),
        h('p', { class: 'sheet-desc' }, cardDesc(id)),
        card.ability ? h('div', { class: 'sheet-ability' }, `✋ ${cardText(id).ability}`) : null,
        h('p', { class: 'sheet-caveat' }, t('caveat')),
        h('div', { class: 'sheet-actions' },
          markButton('innocent', `✅ ${t('markInnocent')}`),
          markButton('suspect', `❓ ${t('markSuspect')}`),
          markButton('evil', `❌ ${t('markEvil')}`)),
        h('div', { class: 'sheet-actions' },
          card.ability ? h('button', {
            class: 'btn primary',
            disabled: state.used[i],
            onclick: () => startAbility(i),
          }, state.used[i] ? t('abilityUsed') : t('useAbility')) : null,
          h('button', { class: 'btn', onclick: closeSheet }, t('close')))));
    document.body.append(sheet);
    render();
  }

  function startAbility(i) {
    const ability = getCard(shown[i]).ability;
    closeSheet();
    if (ability.targets === 0) return applyAbility(i, []);
    setAiming(false);
    picking = { i, ability, chosen: [] };
    render();
  }

  async function doExpel(i) {
    closeSheet();
    if (state.busy || state.status !== 'playing' || state.expelled[i]) return;
    state = setBusy(state, true);
    const seatEl = views[i].el.parentElement;
    seatEl.classList.add('front');
    focus = null;
    hover = null;
    renderFocus();
    sounds.lock();
    await fx.lockOn(views[i].el);
    sounds.whoosh();
    await fx.suspense(views[i].el);

    const result = expel(setBusy(state, false), i);
    state = setBusy(result.state, true);
    const view = views[i];
    view.el.classList.add('out');
    for (const e of result.events) {
      if (e.type === 'expelledEvil') {
        view.el.classList.add('caught');
        view.unmask(e.impostorType, impostorText(e.impostorType).name);
        fx.revealEvil(view.el, tableEl);
        fx.react(view.el, t('reactEvil'));
        seatEl.classList.add('scar');
        toast(t('expelledEvil', { type: impostorText(e.impostorType).name }));
        sounds.good();
      }
      if (e.type === 'blast') {
        toast(t('blast'), true);
        fx.shake(tableEl, 1);
        fx.burst(view.el, { count: 26, colors: ['#ff6a2b', '#ffc93c', '#fbf1d8'], spread: 190 });
      }
      if (e.type === 'expelledInnocent') {
        view.el.classList.add('innocent-out');
        view.showTag(t('markInnocent'), true);
        fx.revealInnocent(view.el, tableEl);
        fx.react(view.el, t(isRisky(e.i) ? 'reactBlast' : 'reactInnocent'));
        toast(t('expelledInnocent'), true);
        sounds.bad();
      }
      if (e.type === 'answer') { toast(`${cardText(shown[e.i]).name}: ${statementText(e.statement, null, { self: e.i, layout })}`); setFocus(e.i, e.statement, true); }
      if (e.type === 'shield') toast(t(e.works ? 'shieldWorked' : 'shieldFailed'), !e.works);
      if (e.type === 'scrambleFound') {
        views[e.i].showTag('🌀', true);
        toast(t('scrambleFound', { n: boardLabel(e.i) }));
      }
      if (e.type === 'featherLost') {
        app.save = onFeatherLost(app.save, e.left);
        app.persist();
        fx.featherFall(featherEl.children[e.left]);
        setTension(e.left === 1);
      }
    }
    render();
    await wait(MOTION.settle);
    seatEl.classList.remove('front');
    state = setBusy(state, false);
    render();
    if (state.status !== 'playing') finish();
  }

  function finish() {
    // show the whole truth, including who was scrambled
    state.truth.cards.forEach((slot, i) => {
      if (!state.flipped[i]) views[i].el.classList.add('flipped');
      if (slot.evil && !state.expelled[i]) {
        views[i].unmask(slot.impostorType, impostorText(slot.impostorType).name);
        views[i].showTag(impostorText(slot.impostorType).name);
      } else if (slot.corrupted) views[i].showTag('🌀', true);
    });

    const seen = new Set(app.save.seen);
    state.truth.cards.forEach(slot => seen.add(slot.evil ? slot.impostorType : slot.realId));
    const clubIds = state.truth.cards.filter(c => !c.evil && getCard(c.realId).group === 'club').map(c => c.realId);
    const won = state.status === 'won';
    const allCards = views.map(view => view.el);
    focus = null;
    hover = null;
    renderFocus();
    aimButton.remove();
    duckMusic(2);
    setTension(false);
    if (won) { sounds.win(); fx.confetti(); fx.hopWave(allCards); } else { sounds.lose(); fx.droop(allCards); }

    const gained = won ? roundScore(state) : 0;
    let newlyUnlocked = [];
    if (won) {
      const next = onRoundWon({ ...app.save, seen: [...seen] }, { clubIds, feathers: state.feathers, score: gained });
      app.save = next.save;
      newlyUnlocked = next.newlyUnlocked;
    } else {
      app.save = onRunLost({ ...app.save, seen: [...seen] });
    }
    app.persist();

    const go = () => {
      resultEl.remove();
      if (newlyUnlocked.length) app.go('intro', { ids: newlyUnlocked });
      else app.go('round');
    };
    const resultEl = h('div', { class: 'sheet-back' },
      h('div', { class: 'sheet result', role: 'dialog', 'aria-modal': 'true' },
        h('img', { class: 'result-duck', src: won ? getCard(clubIds[0] ?? 'bassam').portrait : impostorArt(impostorTypes[0]), alt: '' }),
        h('h2', {}, won ? t('won') : t('lost')),
        won ? h('p', { class: 'result-score' }, t('scoreLine', { gained, total: app.save.score })) : null,
        won ? h('div', { class: 'result-feathers', 'aria-label': t('feathers') }, [0, 1, 2].map(n => h('span', { class: n < state.feathers ? '' : 'gone' }, '🪶'))) : null,
        h('div', { class: 'sheet-actions' },
          h('button', { class: 'btn primary', onclick: go }, won ? t('nextRound') : t('retry')),
          h('button', { class: 'btn', onclick: () => { resultEl.remove(); app.go('menu'); } }, t('toMenu')))));
    // let the moment land; if the player already left, the progress above is saved
    setTimeout(() => { if (root.isConnected) document.body.append(resultEl); }, reduced() ? 0 : 1000);
  }

  return () => { removeEventListener('keydown', onKey); removeEventListener('resize', renderFocus); sheet?.remove(); aimButton.remove(); document.body.classList.remove('aiming'); fx.killAll(root); };
}

// The table: flip cards, read lines, use abilities, expel impostors.
import { h, wait, toast, reduced, MOTION } from '../motion.js';
import { sounds } from '../sound.js';
import { setTension, duckMusic } from '../music.js';
import * as fx from '../fx.js';
import { createCardView } from '../card-view.js';
import { ringLayout, placeBubbles, panelSpot } from '../ring.js';
import { boardLabel } from '../../core/board.js';
import { referredCards } from '../../core/refs.js';
import { getCard, impostorArt } from '../../core/cards.js';
import { generateRound, unlockedThrough } from '../../core/generator.js';
import { createRound, flip, mark, expel, useAbility, setBusy, eurekaReady, EUREKA_NEEDS } from '../../core/round.js';
import { forceClubFor, onRoundWon, onRunLost, onFeatherLost, roundScore, factForWin, awardBadges, ROUNDS_PER_CHAPTER } from '../../core/progress.js';
import { t, getLang, factText, factCount, cardText, cardDesc, impostorText, statementText } from '../../i18n/i18n.js';

const PEEK_DELAY = 350; // long enough that sweeping across the table opens nothing
const PEEK_LINGER = 220; // time to reach the panel from the card
const RAIL_FROM = 1280; // matches the side rail in board.css
const SMALLEST_WITH_RAIL = 0.085; // of the table's width; smaller and the ducks are hard to see

export function roundScreen(root, app) {
  if (app.save.feathers <= 0) app.save = onRunLost(app.save);
  document.body.classList.add('at-table');
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
  let panel = null; // the floating details of one duck; the game stays playable around it
  let panelFor = null;
  let pinned = false; // opened on purpose, so moving the pointer away doesn't close it
  let peekTimer = 0;
  let hideTimer = 0;
  const { layout, shown, statements, impostorTypes } = state.puzzle;
  const n = shown.length;

  const featherEl = h('div', { class: 'feathers', 'aria-label': t('feathers') });
  const pickBar = h('div', {});
  const logEl = h('ul', { class: 'log' });
  const logEmpty = h('div', { class: 'log-empty' }, t('tapToFlip'));
  const views = shown.map((id, i) => createCardView(i, id, onCardTap, onInfoTap));

  const seats = [];
  const caughtEl = h('div', { class: 'table-caught', role: 'img' });
  const centerLine = h('div', { class: 'center-line' });
  const bubbles = [];

  // Clockwise from the top in both languages, so card numbers never flip.
  function seat(i) {
    bubbles[i] = h('div', { class: 'bubble', hidden: 'hidden' });
    seats[i] = h('div', { class: 'seat' }, views[i].el, bubbles[i]);
    return seats[i];
  }

  // Every bubble's real size, as if all the cards were already flipped.
  function bubbleSizes() {
    const probe = h('div', { class: 'bubble', style: 'visibility:hidden' });
    tableEl.append(probe);
    const sizes = shown.map((_, i) => {
      probe.textContent = lineOf(i);
      return { w: probe.offsetWidth, h: Math.max(probe.offsetHeight, statements[i] ? 0 : 48) };
    });
    probe.remove();
    return sizes;
  }

  // Ducks at the top and bottom speak toward the middle, where there is room.
  const restSide = (p, reach) => {
    const ny = (p.y - 0.5) / reach;
    return ny < -0.7 ? 'top' : ny > 0.7 ? 'bottom' : p.x > 0.5 ? 'right' : 'left';
  };

  // Cards never touch, and on a big screen they shrink until every line has its own
  // space. Sides stay fixed for the whole round, so bubbles never jump around.
  function placeSeats() {
    const box = tableEl.getBoundingClientRect();
    if (!box.width) return;
    const phone = innerWidth < 900;
    const dish = tableEl.querySelector('.dish').getBoundingClientRect();
    const shape = {
      n,
      aspect: box.height / box.width,
      maxRx: phone ? 0.46 : 0.43,
      maxRy: phone ? 0.5 : 0.41,
      centerW: (dish.width + 8) / box.width,
      centerH: (dish.height + (phone ? 80 : 44)) / box.width,
    };
    const layoutFor = maxCard => {
      const layout = ringLayout({ ...shape, maxCard });
      const reach = Math.max(...layout.points.map(p => Math.abs(p.y - 0.5)));
      return { ...layout, sides: layout.points.map(p => restSide(p, reach)) };
    };
    let chosen = layoutFor(phone ? 0.28 : 0.13);
    if (!phone) {
      const sizes = bubbleSizes();
      const middle = { l: dish.left - box.left, r: dish.right - box.left, t: dish.top - box.top, b: dish.bottom - box.top + 34 };
      const aim = aimButton.getBoundingClientRect();
      const blocks = [
        middle,
        { l: aim.left - box.left, r: aim.right - box.left, t: aim.top - box.top, b: aim.bottom - box.top },
      ];
      const rail = innerWidth >= RAIL_FROM;
      let fewest = Infinity;
      for (let maxCard = 0.13; maxCard >= (rail ? SMALLEST_WITH_RAIL : 0.065); maxCard -= 0.005) {
        const layout = layoutFor(maxCard);
        const w = layout.card * box.width;
        const cards = layout.points.map(p => ({ l: p.x * box.width - w / 2, r: p.x * box.width + w / 2, t: p.y * box.height - w * 0.7, b: p.y * box.height + w * 0.7 }));
        const places = placeBubbles({ cards, sizes, preferred: layout.sides, blocks, width: box.width, height: box.height, above: Math.max(26, w * 0.28) * 0.42 + 8 });
        // Biggest cards with every line clear; failing that, the least of them in the way.
        const blocked = places.reduce((sum, place) => sum + (place.score ?? 0), 0);
        if (blocked < fewest) {
          fewest = blocked;
          chosen = { ...layout, sides: places.map(place => place.side) };
        }
        if (!blocked) break;
      }
      // Too crowded to speak all at once: the rail already lists every line, so the cards
      // keep their size and only the duck you point at speaks on the table.
      const quiet = rail && fewest > 0;
      tableEl.classList.toggle('quiet', quiet);
      if (quiet) chosen = layoutFor(0.13);
    }
    const { card, points, sides } = chosen;
    tableEl.style.setProperty('--cw', `${(card * box.width).toFixed(1)}px`);
    views.forEach(view => view.sizeName(card * box.width));
    points.forEach((p, i) => {
      seats[i].classList.remove('top', 'bottom', 'left', 'right');
      seats[i].classList.add(sides[i]);
      seats[i].style.cssText = `left:${(p.x * 100).toFixed(2)}%;top:${(p.y * 100).toFixed(2)}%;width:${(card * 100).toFixed(2)}%`;
    });
    (phone ? tableEl.querySelector('.center-note') : tableEl).append(detailsBtn);
    renderFocus();
    if (panel) placePanel();
  }

  const typeCounts = {};
  impostorTypes.forEach(type => { typeCounts[type] = (typeCounts[type] ?? 0) + 1; });

  const detailsBtn = h('button', { class: 'btn small details-btn', hidden: 'hidden', onclick: () => { if (focus) showPanel(focus.i, true); } }, t('details'));
  const aimLabel = h('span', {}, t('expel'));
  const aimButton = h('button', { class: 'aim-fab', onclick: () => setAiming(!aiming) }, h('span', { class: 'aim-icon' }, '🦆💨'), aimLabel);

  const tableEl = h('div', { class: 'table', onclick: e => { if (e.target === tableEl) setFocus(null); } },
    h('div', { class: 'table-center' },
      h('div', { class: 'dish' }, h('i', { class: 'dish-ring' }), h('img', { class: 'dish-logo', src: 'assets/ui/logo.webp', alt: 'BSC' }), caughtEl),
      h('div', { class: 'center-note' }, centerLine, detailsBtn)),
    shown.map((_, i) => seat(i)),
    aimButton);

  root.append(
    h('div', { class: 'round-top' },
      h('button', { class: 'btn small', onclick: () => app.go('menu') }, t('back')),
      h('div', { class: 'round-title' },
        h('strong', {}, t(`chapter${save.chapter}`)),
        save.chapter === 'endless' ? t('streak', { n: save.streak ?? 0 }) : t('roundOf', { n: save.roundInChapter, total: ROUNDS_PER_CHAPTER })),
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
  placeSeats();
  render();
  setTension(state.feathers === 1);
  views.forEach((view, i) => {
    fx.hoverable(view.el);
    if (!matchMedia('(hover: hover)').matches) return;
    view.el.addEventListener('pointerenter', () => {
      if (!state.flipped[i] || aiming || picking) return;
      hover = { i, statement: baseStatement(i), ability: false };
      renderFocus();
      clearTimeout(hideTimer);
      clearTimeout(peekTimer);
      if (!pinned) peekTimer = setTimeout(() => { if (hover?.i === i) showPanel(i, false); }, PEEK_DELAY);
    });
    view.el.addEventListener('pointerleave', () => {
      hover = null;
      renderFocus();
      clearTimeout(peekTimer);
      hidePanelSoon();
    });
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
    caughtEl.setAttribute('aria-label', t('caught', { n: state.correctExpels, total: impostorTypes.length }));
    if (caughtEl.children.length !== impostorTypes.length) {
      caughtEl.replaceChildren(...impostorTypes.map(() => h('span', { class: 'pip' }, '🎭')));
    }
    [...caughtEl.children].forEach((pip, n) => {
      const was = pip.classList.contains('caught');
      pip.classList.toggle('caught', n < state.correctExpels);
      if (!was && n < state.correctExpels) fx.pop(pip);
    });
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
    if (panel) closePanel();
    else if (focus) setFocus(null);
    else if (aiming) setAiming(false);
    else if (picking) { picking = null; render(); }
  };
  addEventListener('keydown', onKey);
  // A tap on the empty table puts the details away; a tap on a card switches them.
  const onPointerDown = e => {
    if (panel && !e.target.closest('.duck-panel, .card, .details-btn')) closePanel();
  };
  addEventListener('pointerdown', onPointerDown);
  // follows the table itself, so turning a phone can't leave stale sizes behind
  const tableWatch = new ResizeObserver(() => placeSeats());
  tableWatch.observe(tableEl);

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
    if (value) { picking = null; focus = null; closePanel(); }
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
    sounds.tap();
    if (state.expelled[i]) return setFocus(i);
    if (panelFor === i && pinned) return closePanel();
    if (panelFor === i || focus?.i === i || panel) showPanel(i, true);
    setFocus(i);
  }

  function onInfoTap(i) {
    if (picking || aiming || !state.flipped[i]) return onCardTap(i);
    if (state.status !== 'playing' || state.busy) return undefined;
    sounds.tap();
    if (panelFor === i && pinned) return closePanel();
    setFocus(i);
    return showPanel(i, true);
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

  function closePanel() {
    clearTimeout(peekTimer);
    clearTimeout(hideTimer);
    panel?.remove();
    panel = null;
    panelFor = null;
    pinned = false;
  }

  function hidePanelSoon() {
    clearTimeout(hideTimer);
    if (panel && !pinned) hideTimer = setTimeout(closePanel, PEEK_LINGER);
  }

  function panelContent(i) {
    const id = shown[i];
    const card = getCard(id);
    const markButton = (value, icon, label) => h('button', {
      class: `btn small${state.marks[i] === value ? ' primary' : ''}`,
      title: label,
      'aria-label': label,
      onclick: () => {
        state = mark(state, i, state.marks[i] === value ? null : value).state;
        sounds.mark();
        pinned = true;
        render();
        panel.replaceChildren(...panelContent(i).filter(Boolean)); // unlike h(), this would print a null
      },
    }, icon, h('span', { class: 'mark-label' }, ` ${label}`));
    return [
      h('button', { class: 'panel-close', 'aria-label': t('close'), onclick: closePanel }, '×'),
      h('div', { class: 'sheet-head' },
        h('img', { src: card.portrait, alt: '' }),
        h('h3', {}, `${boardLabel(i)}. ${cardText(id).name}`)),
      h('div', { class: 'sheet-line' }, h('small', {}, t('saysNow')), lineOf(i)),
      h('p', { class: 'sheet-desc' }, cardDesc(id)),
      card.ability ? h('div', { class: 'sheet-ability' }, `✋ ${cardText(id).ability}`) : null,
      h('p', { class: 'sheet-caveat' }, t('caveat')),
      h('div', { class: 'sheet-actions' },
        markButton('innocent', '✅', t('markInnocent')),
        markButton('suspect', '❓', t('markSuspect')),
        markButton('evil', '❌', t('markEvil'))),
      card.ability ? h('button', {
        class: 'btn primary panel-ability',
        disabled: state.used[i],
        onclick: () => startAbility(i),
      }, state.used[i] ? t('abilityUsed') : t('useAbility')) : null,
    ];
  }

  // Phones get a strip along the bottom; a big screen uses the emptiest part of the table.
  function placePanel() {
    const phone = innerWidth < 900;
    const docked = innerWidth >= RAIL_FROM;
    panel.classList.toggle('phone', phone);
    panel.classList.toggle('docked', docked);
    panel.style.width = '';
    if (phone) { panel.style.left = panel.style.top = ''; return; }
    if (docked) {
      const rail = root.querySelector('.log-wrap').getBoundingClientRect();
      panel.style.width = `${rail.width}px`;
      panel.style.left = `${rail.left}px`;
      panel.style.top = `${rail.top}px`;
      return;
    }
    const rectOf = el => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom };
    };
    const seen = els => els.map(rectOf).filter(r => r.r > r.l);
    const top = root.querySelector('.round-top').getBoundingClientRect().bottom + 6;
    const spot = panelSpot({
      size: { w: panel.offsetWidth, h: panel.offsetHeight },
      area: { l: 8, r: innerWidth - 8, t: top, b: innerHeight - 8 },
      target: rectOf(views[panelFor].el),
      cards: seen(views.map(view => view.el)),
      soft: seen([...bubbles.filter(b => !b.hidden), aimButton, detailsBtn, tableEl.querySelector('.dish')]),
    });
    panel.style.left = `${spot.l}px`;
    panel.style.top = `${spot.t}px`;
  }

  function showPanel(i, pin) {
    if (state.status !== 'playing' || state.busy || aiming || picking || !state.flipped[i] || state.expelled[i]) return;
    clearTimeout(hideTimer);
    if (panelFor === i) { pinned ||= pin; return; }
    if (!pin && pinned) return;
    panel?.remove();
    panelFor = i;
    pinned = pin;
    panel = h('aside', { class: `duck-panel${reduced() ? ' calm' : ''}`, 'aria-label': cardText(shown[i]).name },
      panelContent(i));
    panel.addEventListener('pointerenter', () => clearTimeout(hideTimer));
    panel.addEventListener('pointerleave', hidePanelSoon);
    document.body.append(panel);
    placePanel();
  }

  function startAbility(i) {
    const ability = getCard(shown[i]).ability;
    if (ability.kind === 'eureka' && !eurekaReady(state, i)) return toast(t('eurekaEarly', { n: EUREKA_NEEDS }));
    if (ability.kind === 'confession' && !eurekaReady(state, i)) return toast(t('confessionEarly', { n: EUREKA_NEEDS }));
    closePanel();
    if (ability.targets === 0) return applyAbility(i, []);
    setAiming(false);
    picking = { i, ability, chosen: [] };
    render();
  }

  async function doExpel(i) {
    closePanel();
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
      if (e.type === 'luckyFeather') {
        toast(t('luckyFeather'));
        app.save = { ...app.save, feathers: e.left };
        app.persist();
        setTension(e.left === 1);
        sounds.good();
      }
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
    closePanel();
    tableEl.classList.add('over');
    // show the whole truth, including who was scrambled
    state.truth.cards.forEach((slot, i) => {
      if (!state.flipped[i]) views[i].el.classList.add('flipped');
      if (slot.evil && !state.expelled[i]) {
        views[i].unmask(slot.impostorType, impostorText(slot.impostorType).name);
        views[i].showTag(impostorText(slot.impostorType).name);
      } else if (slot.corrupted) views[i].showTag('🌀', true);
    });

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
      const next = onRoundWon(app.save, { clubIds, feathers: state.feathers, score: gained });
      app.save = next.save;
      newlyUnlocked = next.newlyUnlocked;
      const hadAbilities = shown.some(id => getCard(id).ability);
      const awarded = awardBadges(app.save, { feathers: state.feathers, hadAbilities, usedAbility: state.used.some(Boolean) });
      app.save = awarded.save;
      awarded.fresh.forEach((id, n) => setTimeout(() => { toast(t('newBadge', { name: t(`badge_${id}`) })); sounds.badge(); }, 900 + n * 1100));
      if (newlyUnlocked.length || (app.save.chapter === 'endless' && save.chapter !== 'endless')) sounds.fanfare();
    } else {
      app.save = onRunLost(app.save);
    }
    app.persist();

    const go = () => {
      resultEl.remove();
      if (newlyUnlocked.length) app.go('intro', { ids: newlyUnlocked });
      else app.go('round');
    };
    const factIndex = won ? factForWin(app.save, factCount()) : null;
    const factLine = factIndex === null ? null : h('p', { class: 'result-fact' }, h('strong', {}, `💡 ${t('didYouKnow')} `), factText(factIndex));
    const resultEl = h('div', { class: 'sheet-back' },
      h('div', { class: 'sheet result', role: 'dialog', 'aria-modal': 'true' },
        h('img', { class: 'result-duck', src: won ? getCard(clubIds[0] ?? 'bassam').portrait : impostorArt(impostorTypes[0]), alt: '' }),
        h('h2', {}, won ? t('won') : t('lost')),
        won ? h('p', { class: 'result-score' }, t('scoreLine', { gained, total: app.save.score })) : null,
        won ? h('div', { class: 'result-feathers', 'aria-label': t('feathers') }, [0, 1, 2].map(n => h('span', { class: n < state.feathers ? '' : 'gone' }, '🪶'))) : null,
        factLine,
        h('div', { class: 'sheet-actions' },
          h('button', { class: 'btn primary', onclick: go }, won ? t('nextRound') : t('retry')),
          h('button', { class: 'btn', onclick: () => { resultEl.remove(); app.go('menu'); } }, t('toMenu')))));
    // let the moment land; if the player already left, the progress above is saved
    setTimeout(() => { if (root.isConnected) document.body.append(resultEl); }, reduced() ? 0 : 1000);
  }

  return () => { document.body.classList.remove('at-table'); removeEventListener('keydown', onKey); tableWatch.disconnect(); removeEventListener('pointerdown', onPointerDown); closePanel(); aimButton.remove(); document.body.classList.remove('aiming'); fx.killAll(root); };
}

// Timing constants and small DOM helpers shared by the screens.
export const MOTION = { flip: 400, dealStagger: 70, press: 120, screen: 250, revealPause: 340, settle: 560 };

let preference = null; // true, false or null (follow the device)

export function setReducedPreference(value) {
  preference = value;
  document.documentElement.classList.toggle('reduce', reduced());
}

export function reduced() {
  if (preference !== null) return preference;
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key === 'style') el.style.cssText = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'disabled') el.disabled = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter(c => c !== null && c !== undefined));
  return el;
}

export function toast(text, bad = false) {
  const el = h('div', { class: bad ? 'toast bad' : 'toast' }, text);
  const host = document.getElementById('toasts');
  while (host.children.length >= 2) host.firstChild.remove();
  host.append(el);
  setTimeout(() => el.remove(), 2600);
}

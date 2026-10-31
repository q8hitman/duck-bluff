// A picture that failed on a bad connection tries again instead of staying blank.
const WAITS = [1000, 3000, 8000];

export function retryBrokenImages(target = document, later = setTimeout) {
  const tries = new WeakMap();
  target.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName !== 'IMG') return;
    const n = tries.get(img) ?? 0;
    if (n >= WAITS.length) return;
    tries.set(img, n + 1);
    const src = img.getAttribute('src');
    later(() => { if (img.isConnected && img.getAttribute('src') === src) img.src = src; }, WAITS[n]);
  }, true); // error events on images do not bubble
}

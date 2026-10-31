// Keeps asking for sound at every gesture until the browser really allows it: a touch's
// first pointerdown, for one, does not count, so a single try could leave the game silent.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

export function waitForAudio(target, getContext, onReady) {
  let done = false;
  const attempt = () => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.resume().then(() => {
      if (done || ctx.state !== 'running') return;
      done = true;
      GESTURES.forEach(g => target.removeEventListener(g, attempt, true));
      onReady();
    }).catch(() => {});
  };
  GESTURES.forEach(g => target.addEventListener(g, attempt, true));
  attempt(); // some browsers allow sound from the start
}

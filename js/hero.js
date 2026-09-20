/*
 * Subtle scroll-linked hero. `--hero-progress` runs 0 → 1 as the Cathedral
 * scrolls; the photograph lags slightly behind the text.
 */

import { prefersReducedMotion } from './util.js';

export function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  if (prefersReducedMotion()) return;

  let frame = 0;
  let lastValue = -1;

  function update() {
    frame = 0;
    const span = (hero.offsetHeight || 1) * 0.82;
    const progress = Math.min(1, Math.max(0, window.scrollY / span));
    const rounded = Math.round(progress * 500) / 500;
    if (rounded === lastValue) return;
    lastValue = rounded;
    hero.style.setProperty('--hero-progress', String(rounded));
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

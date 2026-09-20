/* Header state, mobile menu, and the scroll indicator for the People view. */

import { headerHeight } from './util.js';

/* Which navigation item each People-view section belongs to. */
const SPY_SECTIONS = [
  ['faculty', 'faculty'],
  ['affiliated', 'faculty'],
  ['students', 'students'],
  ['alumni', 'students']
];

export function initNav() {
  const header = document.getElementById('site-header');
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  const links = Array.from(nav.querySelectorAll('.nav__link'));

  let view = 'people';
  let routeKey = null;
  let frame = 0;

  /* ---- header background once the hero starts to scroll away ---- */

  function onScroll() {
    frame = 0;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    updateSpy();
  }

  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(onScroll);
  }, { passive: true });

  /* ---- mobile menu ---- */

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    setMenu(false);
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) setMenu(false);
  });

  /* ---- active item ---- */

  function paint(key) {
    links.forEach((link) => {
      if (link.dataset.nav === key) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  /*
   * In the People view the indicator follows the reader down the page; in the
   * Talks view it simply stays on "Talks".
   */
  function updateSpy() {
    if (view !== 'people') return;
    const line = window.scrollY + headerHeight() + 48;
    let active = null;
    for (const [id, key] of SPY_SECTIONS) {
      const section = document.getElementById(id);
      if (!section || section.hidden) continue;
      const head = section.querySelector('.section__head') || section;
      if (head.getBoundingClientRect().top + window.scrollY - 80 <= line) active = key;
    }
    paint(active);
  }

  onScroll();

  return {
    setView(next) {
      view = next;
      setMenu(false);
    },
    setActive(key) {
      routeKey = key;
      paint(key);
      updateSpy();
    },
    refresh() {
      if (view === 'people') updateSpy();
      else paint(routeKey);
    },
    closeMenu() {
      setMenu(false);
    }
  };
}

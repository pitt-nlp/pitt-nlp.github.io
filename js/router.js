/*
 * Hash routing. The header and the Cathedral hero stay put; only the content
 * region below them swaps between the People and Talks views, so every state
 * has a shareable URL.
 */

import { headerHeight, prefersReducedMotion } from './util.js';

const BASE_TITLE = 'Pitt NLP+CL';

const ROUTES = {
  '': { view: 'people', anchor: null, nav: null, title: BASE_TITLE },
  faculty: { view: 'people', anchor: 'faculty', nav: 'faculty', title: BASE_TITLE },
  students: { view: 'people', anchor: 'students', nav: 'students', title: BASE_TITLE },
  alumni: { view: 'people', anchor: 'alumni', nav: null, title: BASE_TITLE },
  classes: { view: 'classes', anchor: 'classes', nav: 'classes', title: BASE_TITLE },
  talks: { view: 'talks', anchor: 'talks', nav: 'talks', title: BASE_TITLE }
};

export function initRouter(nav) {
  const views = {
    people: document.getElementById('view-people'),
    classes: document.getElementById('view-classes'),
    talks: document.getElementById('view-talks')
  };

  let currentView = null;

  function resolve() {
    const key = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
      .replace(/\/+$/, '')
      .trim()
      .toLowerCase();
    return ROUTES[key] || ROUTES[''];
  }

  function scrollToRoute(route, animate) {
    const behavior = animate && !prefersReducedMotion() ? 'smooth' : 'auto';

    if (!route.anchor) {
      window.scrollTo({ top: 0, behavior });
      return;
    }

    const section = document.getElementById(route.anchor);
    if (!section) return;
    /* Sections carry a lot of leading whitespace, so aim at the heading. */
    const target = section.querySelector('.section__head') || section;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight() - 28;
    window.scrollTo({ top: Math.max(0, top), behavior });
  }

  function apply({ scroll = false, animate = true } = {}) {
    const route = resolve();
    const changed = currentView !== route.view;

    if (changed) {
      Object.entries(views).forEach(([key, element]) => {
        if (!element) return;
        element.hidden = key !== route.view;
        element.classList.remove('view--entering');
      });

      const entering = views[route.view];
      if (entering && currentView !== null && !prefersReducedMotion()) {
        /* Restart the entry animation. */
        void entering.offsetWidth;
        entering.classList.add('view--entering');
      }

      currentView = route.view;
      nav.setView(route.view);
    }

    document.title = route.title;
    nav.setActive(route.nav);
    if (scroll) scrollToRoute(route, animate);
    nav.refresh();
  }

  window.addEventListener('hashchange', () => apply({ scroll: true }));

  /* Re-selecting the current route should still move the reader. */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link) return;
    nav.closeMenu();
    if (link.getAttribute('href') === location.hash) {
      event.preventDefault();
      apply({ scroll: true });
    }
  });

  /* Deep links land in place rather than gliding down from the top. */
  apply({ scroll: Boolean(location.hash), animate: false });

  return {
    /* Called once the JSON data has rendered and section offsets are final. */
    refresh() {
      apply({ scroll: Boolean(location.hash), animate: false });
    }
  };
}

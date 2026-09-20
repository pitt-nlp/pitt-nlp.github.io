/* Entry point. */

import { loadNews, loadSiteData } from './data.js';
import { renderClasses, renderNews, renderPeople, renderTalks } from './render.js';
import { initHero } from './hero.js';
import { initNav } from './nav.js';
import { initRouter } from './router.js';
import { initSlider } from './slider.js';

initHero();
initSlider(document.getElementById('group-slider'));
const nav = initNav();
const router = initRouter(nav);

loadNews().then(renderNews).catch(() => {});

loadSiteData()
  .then((data) => {
    renderNews(data);
    renderPeople(data);
    renderClasses(data);
    renderTalks(data);
    router.refresh();
  })
  .catch(showDataError);

function showDataError(error) {
  const banner = document.getElementById('data-error');
  console.error('Pitt NLP+CL: could not load site data.', error);
  if (!banner) return;

  const local = location.protocol === 'file:';
  banner.hidden = false;
  banner.textContent = local
    ? 'The directory and seminar listings could not be loaded because the page was opened '
      + 'directly from disk, and browsers block local file requests. Start a small web server '
      + 'in the project folder \u2014 for example "python -m http.server 8000" \u2014 and open '
      + 'http://localhost:8000 instead.'
    : `The directory and seminar listings could not be loaded (${error.message}). `
      + 'Please check the JSON files in the data folder.';
}

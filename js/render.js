/* Builds the news panel, people directory, and talks listing from site data. */

import { esc, safeUrl, formatDate, isoDate, parseDate, paragraphs, initials } from './util.js';
import { areasOf } from './data.js';

const ALUMNI_VISIBLE = 8;
const NEWS_VISIBLE = 4;

/* ------------------------------- News ---------------------------------- */

function newsKey(items) {
  return items.slice(0, NEWS_VISIBLE)
    .map((item) => `${item.date}\t${item.category || ''}\t${item.title}\t${item.url || ''}`)
    .join('\n');
}

export function renderNews(data) {
  const list = document.getElementById('news-list');
  const panel = document.getElementById('news');
  if (!list || !panel) return;

  if (!data.news.length) {
    panel.hidden = true;
    list.innerHTML = '';
    delete list.dataset.newsKey;
    return;
  }

  const key = newsKey(data.news);
  panel.hidden = false;
  if (list.dataset.newsKey === key) return;
  list.dataset.newsKey = key;
  list.innerHTML = data.news.slice(0, NEWS_VISIBLE).map(newsItem).join('');
}

function newsItem(item) {
  const url = safeUrl(item.url);
  const title = esc(item.title);
  const text = url
    ? `<a class="news__link" href="${esc(url)}">${title}</a>`
    : title;

  const tag = item.category
    ? `<span class="news__tag">${esc(item.category)}</span>`
    : '';

  return `<li class="news__item">
      <p class="news__meta">
        <time datetime="${esc(isoDate(item.date))}">${esc(formatDate(item.date, 'monthYear'))}</time>
        ${tag}
      </p>
      <p class="news__text">${text}</p>
    </li>`;
}

/* ------------------------------ People --------------------------------- */

export function renderPeople(data) {
  const core = document.getElementById('core-faculty');
  const affiliated = document.getElementById('affiliated-faculty');
  const students = document.getElementById('students-grid');
  const alumni = document.getElementById('alumni-panel');

  if (core) {
    core.innerHTML = data.faculty.core
      .map((person) => personCard(person, data.departments, { photo: true }))
      .join('');
    hideEmptySection(core, data.faculty.core.length);
  }

  if (affiliated) {
    const people = data.faculty.affiliated;
    affiliated.classList.add('faculty-grid');
    affiliated.classList.remove('faculty-grid--compact', 'faculty-list');
    affiliated.innerHTML = people
      .map((person) => personCard(person, data.departments, { photo: true }))
      .join('');
    hideEmptySection(affiliated, people.length);
  }

  if (students) {
    const groups = data.studentGroups.filter((group) => group.people.length);
    const columns = packStudentColumns(groups, 2);
    students.innerHTML = columns
      .map((column) => `<div class="students-col">${column.map(studentGroup).join('')}</div>`)
      .join('');
    hideEmptySection(students, groups.length);
  }

  /* After the grid, so the first apply() can count names. */
  renderAreaFilter(data);

  if (alumni) {
    alumni.innerHTML = alumniTable(data.alumni);
    hideEmptySection(alumni, data.alumni.length);
    wireAlumniToggle(alumni);
  }
}

function department(person, departments) {
  const meta = departments[person.department] || {};
  return {
    name: person.department_name || meta.name || person.department || '',
    url: safeUrl(person.department_url || meta.url || '')
  };
}

function personCard(person, departments, { photo }) {
  const dept = department(person, departments);
  const site = safeUrl(person.website);
  const lab = safeUrl(person.lab_website);

  const name = site
    ? `<a href="${esc(site)}" data-cover>${esc(person.name)}</a>`
    : esc(person.name);

  const media = photo
    ? `<div class="person__media">${
        person.image
          ? `<img src="${esc(safeUrl(person.image))}" alt="${esc(person.alt || `Portrait of ${person.name}`)}" loading="lazy" decoding="async">`
          : `<span class="person__monogram" aria-hidden="true">${esc(initials(person.name))}</span>`
      }</div>`
    : '';

  const title = person.title ? `<p class="person__title">${esc(person.title)}</p>` : '';

  const affiliation = dept.name
    ? `<p class="person__dept">${
        dept.url ? `<a href="${esc(dept.url)}">${esc(dept.name)}</a>` : esc(dept.name)
      }</p>`
    : '';

  const labLink = lab
    ? `<p class="person__lab"><a href="${esc(lab)}">${esc(person.lab_name || 'Lab')}</a></p>`
    : '';

  return `<article class="person">
      ${media}
      <h3 class="person__name">${name}</h3>
      ${title}
      ${affiliation}
      ${labLink}
    </article>`;
}

function packStudentColumns(groups, count) {
  const columns = Array.from({ length: count }, () => ({ height: 0, groups: [] }));
  for (const group of groups) {
    const shortest = columns.reduce((best, column) =>
      column.height < best.height ? column : best);
    shortest.groups.push(group);
    shortest.height += 2 + group.people.length;
  }
  return columns.map((column) => column.groups).filter((column) => column.length);
}

function studentGroup(group) {
  const heading = group.url
    ? `<a href="${esc(group.url)}">${esc(group.label)}</a>`
    : esc(group.label);

  const rows = group.people
    .map((student) => {
      const url = safeUrl(student.website);
      const name = url
        ? `<a class="student-list__name" href="${esc(url)}">${esc(student.name)}</a>`
        : `<span class="student-list__name">${esc(student.name)}</span>`;
      const degree = student.title
        ? `<span class="student-list__degree">${esc(student.title)}</span>`
        : '';
      /* Pipe-separated because area names contain spaces and ampersands.
         Normalised through areasOf so these tokens match the chip labels. */
      const areas = areasOf(student).join('|');
      return `<li data-areas="${esc(areas)}">${name}${degree}</li>`;
    })
    .join('');

  return `<section class="student-group">
      <h3 class="student-group__heading">
        ${heading}
      </h3>
      <ul class="student-list">${rows}</ul>
    </section>`;
}

function alumniTable(alumni) {
  if (!alumni.length) return '';

  const rows = alumni
    .map((person, index) => {
      const url = safeUrl(person.website);
      const name = url
        ? `<a href="${esc(url)}">${esc(person.name)}</a>`
        : esc(person.name);

      const origin = [person.degree, person.year].filter(Boolean).join(' ');
      const programme = person.department ? esc(person.department) : '';
      const hidden = index >= ALUMNI_VISIBLE ? ' hidden data-extra' : '';
      const now = person.current
        ? `<p class="alumni__current">
            <svg class="alumni__to" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.5 12h15.5M14 6.5 20.5 12 14 17.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${esc(person.current)}</span>
          </p>`
        : '';

      return `<div class="alumni__row"${hidden}>
          <p class="alumni__name">${name}</p>
          <p class="alumni__origin">${esc([origin, programme].filter(Boolean).join(', '))}</p>
          ${now}
        </div>`;
    })
    .join('');

  const toggle = alumni.length > ALUMNI_VISIBLE
    ? `<button class="alumni__more" type="button" aria-expanded="false">
         View all ${alumni.length} alumni
       </button>`
    : '';

  return `<div class="alumni">${rows}</div>${toggle}`;
}

function wireAlumniToggle(container) {
  const button = container.querySelector('.alumni__more');
  if (!button) return;

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    container.querySelectorAll('[data-extra]').forEach((row) => {
      row.hidden = expanded;
    });
    button.setAttribute('aria-expanded', String(!expanded));
    button.textContent = expanded
      ? `View all ${container.querySelectorAll('.alumni__row').length} alumni`
      : 'Show fewer alumni';
  });
}

function hideEmptySection(container, count) {
  const section = container.closest('.section');
  if (section) section.hidden = count === 0;
}

/* ------------------ Students: research-area filter ---------------------- */

/*
 * A row of area chips between the Students heading and the names. Pressing
 * one keeps that area's students at full strength and fades everyone else;
 * pressing it again, clicking anywhere off the chips, or Escape restores the
 * list. One area at a time, so pressing a second chip simply moves the filter.
 *
 * The chips come from data.researchAreas, which is derived from the student
 * directory, so a new area in members.json appears here on its own.
 */

const areaState = { active: null, apply: () => {} };
let areaGlobalsWired = false;

function renderAreaFilter(data) {
  const host = document.getElementById('student-areas');
  const section = document.getElementById('students');
  if (!host) return;

  const areas = data.researchAreas || [];
  host.textContent = '';
  areaState.active = null;
  areaState.apply = () => {};
  if (section) section.classList.toggle('section--filtered', areas.length > 0);
  if (!areas.length) return;

  const group = document.createElement('div');
  group.className = 'area-filter';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', 'area-filter-label');

  const label = document.createElement('span');
  label.className = 'area-filter__label';
  label.id = 'area-filter-label';
  label.textContent = 'Filter by area';

  const track = document.createElement('div');
  track.className = 'area-filter__track';

  const scroller = document.createElement('div');
  scroller.className = 'area-filter__scroller';

  for (const area of areas) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'area-chip';
    chip.dataset.area = area.name;
    chip.setAttribute('aria-pressed', 'false');
    chip.textContent = area.name;
    scroller.append(chip);
  }

  track.append(scroller);
  group.append(label, track);

  /* Sighted users get the fade; this reports the same change to screen
     readers, which cannot see it. */
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  host.append(group, status);
  wireAreaFilter(group, status);
  wireAreaOverflow(track, scroller);
}

function wireAreaFilter(group, status) {
  const grid = document.getElementById('students-grid');
  if (!grid) return;

  const chips = [...group.querySelectorAll('.area-chip')];

  function apply() {
    const active = areaState.active;
    const rows = [...grid.querySelectorAll('.student-list li')];
    let shown = 0;

    for (const row of rows) {
      const areas = (row.getAttribute('data-areas') || '').split('|').filter(Boolean);
      const match = !active || areas.includes(active);
      row.classList.toggle('is-dimmed', !match);
      if (match) shown += 1;
    }

    /* A programme with nobody in the area fades its heading too, so the
       remaining names are easier to pick out. */
    for (const programme of grid.querySelectorAll('.student-group')) {
      const stillListed = programme.querySelector('.student-list li:not(.is-dimmed)');
      programme.classList.toggle('is-dimmed', !stillListed);
    }

    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(chip.dataset.area === active));
    }

    status.textContent = active
      ? `Showing ${shown} of ${rows.length} students working on ${active}.`
      : `Showing all ${rows.length} students.`;
  }

  areaState.apply = apply;

  group.addEventListener('click', (event) => {
    const chip = event.target.closest('.area-chip');
    if (!chip) return;
    const name = chip.dataset.area;
    areaState.active = areaState.active === name ? null : name;
    apply();
  });

  wireAreaGlobals();
  apply();
}

/* Edge fades on the chip row: right when there is more to the right, left
   once the strip has been scrolled. Desktop wrapping does not overflow, so
   both classes stay off. */
function wireAreaOverflow(track, scroller) {
  function update() {
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    track.classList.toggle('is-overflow-start', scroller.scrollLeft > 2);
    track.classList.toggle('is-overflow-end', max - scroller.scrollLeft > 2);
  }

  scroller.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(update).observe(scroller);
  }
  requestAnimationFrame(update);
}

/* Registered once, not per render, so repeat renders cannot stack listeners. */
function wireAreaGlobals() {
  if (areaGlobalsWired) return;
  areaGlobalsWired = true;

  document.addEventListener('click', (event) => {
    if (!areaState.active) return;
    if (event.target.closest('.area-filter')) return;
    areaState.active = null;
    areaState.apply();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !areaState.active) return;
    areaState.active = null;
    areaState.apply();
  });
}

/* ------------------------------ Classes -------------------------------- */

export function renderClasses(data) {
  const list = document.getElementById('classes-list');
  if (!list) return;

  const courses = data.classes || [];
  list.innerHTML = courses.map(classRow).join('');
  hideEmptySection(list, courses.length);
}

function classRow(course) {
  const url = safeUrl(course.url);
  const title = esc(course.title || 'Untitled course');
  const heading = url ? `<a href="${esc(url)}">${title}</a>` : title;

  const code = course.numbers ? `<p class="class__code">${esc(course.numbers)}</p>` : '';
  const level = course.level ? `<p class="class__level">${esc(course.level)}</p>` : '';
  const focus = course.focus ? `<p class="class__focus">${esc(course.focus)}</p>` : '';
  const note = course.note ? `<p class="class__note">${esc(course.note)}</p>` : '';

  return `<article class="class-row">
      <div class="class__ident">${code}${level}</div>
      <div class="class__body">
        <h3 class="class__title">${heading}</h3>
        ${focus}${note}
      </div>
    </article>`;
}

/* ------------------------------- Talks --------------------------------- */

export function renderTalks(data) {
  const list = document.getElementById('talks-list');
  const upcomingSection = document.getElementById('talks');
  const archive = document.getElementById('talks-archive');
  const archiveSection = document.getElementById('talks-archive-section');

  if (list && upcomingSection) {
    /* Keep the section visible so the seminar subscribe link stays on the page
       even when nothing is scheduled. */
    upcomingSection.hidden = false;
    list.hidden = data.talks.upcoming.length === 0;
    list.innerHTML = data.talks.upcoming
      .map((talk, index) => talkEntry(talk, index === 0))
      .join('');
  }

  if (archive && archiveSection) {
    archiveSection.hidden = data.talks.past.length === 0;
    archive.innerHTML = archiveByYear(data.talks.past);
  }
}

function talkEntry(talk, featured) {
  const speakerUrl = safeUrl(talk.speaker_url);
  const speaker = speakerUrl
    ? `<a href="${esc(speakerUrl)}">${esc(talk.speaker)}</a>`
    : esc(talk.speaker);

  const photo = talk.image
    ? `<figure class="talk__photo">
         <img src="${esc(safeUrl(talk.image))}"
              alt="${esc(talk.alt || `Portrait of ${talk.speaker}`)}"
              loading="lazy" decoding="async">
       </figure>`
    : '';

  const facts = featured
    ? [
        talk.date ? ['Date', `<time datetime="${esc(isoDate(talk.date))}">${esc(formatDate(talk.date, 'weekday'))}</time>`] : null,
        talk.time ? ['Time', esc(talk.time)] : null,
        talk.location ? ['Location', esc(talk.location)] : null
      ].filter(Boolean)
    : [];

  const factList = facts.length
    ? `<dl class="talk__facts">${facts
        .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`)
        .join('')}</dl>`
    : '';

  const aside = photo || factList
    ? `<div class="talk__aside">${photo}${factList}</div>`
    : '';

  const abstract = talk.abstract
    ? `<div class="talk__abstract">
         <p class="talk__abstract-label">Abstract</p>
         ${paragraphs(talk.abstract)}
       </div>`
    : '';

  const bio = talk.bio
    ? `<div class="talk__bio"><p class="talk__abstract-label">Speaker</p>${paragraphs(talk.bio)}</div>`
    : '';

  const external = safeUrl(talk.url)
    ? `<p class="talk__more"><a class="link-arrow" href="${esc(safeUrl(talk.url))}">Event details</a></p>`
    : '';

  /* The next talk shows its abstract straight away; later talks keep the list
     scannable and reveal theirs on request. */
  const detail = featured || !(abstract || bio)
    ? `${abstract}${bio}${external}`
    : `<details class="talk__disclose">
         <summary>Read abstract</summary>
         ${abstract}${bio}${external}
       </details>`;

  const badge = featured ? '<p class="talk__badge">Next talk</p>' : '';

  return `<article class="talk${featured ? ' talk--featured' : ''}${aside ? '' : ' talk--body-only'}">
      ${aside}
      <div class="talk__body">
        ${badge}
        <h3 class="talk__title">${esc(talk.title)}</h3>
        <p class="talk__speaker">${speaker}</p>
        <p class="talk__institution">${esc(talk.institution || '')}</p>
        ${detail}
      </div>
    </article>`;
}

function academicYear(value) {
  const date = parseDate(value);
  if (!date) return { key: 'undated', label: 'Undated' };
  const year = date.getFullYear();
  const start = date.getMonth() >= 7 ? year : year - 1;
  return { key: String(start), label: `${start}–${start + 1}` };
}

function archiveByYear(talks) {
  const groups = new Map();
  for (const talk of talks) {
    const { key, label } = academicYear(talk.date);
    if (!groups.has(key)) groups.set(key, { key, label, talks: [] });
    groups.get(key).talks.push(talk);
  }

  return [...groups.values()]
    .sort((a, b) => Number(b.key) - Number(a.key))
    .map((group) => {
      const rows = group.talks.map(archiveRow).join('');
      return `<details class="archive-year">
          <summary class="archive-year__summary">
            <span class="archive-year__label">${esc(group.label)}</span>
          </summary>
          <div class="archive-year__list">${rows}</div>
        </details>`;
    })
    .join('');
}

function archiveRow(talk) {
  const url = safeUrl(talk.url);
  const heading = talk.title
    ? (url ? `<a href="${esc(url)}">${esc(talk.title)}</a>` : esc(talk.title))
    : 'Untitled talk';

  return `<div class="archive__row">
      <p class="archive__date">
        <time datetime="${esc(isoDate(talk.date))}">${esc(formatDate(talk.date, 'medium'))}</time>
      </p>
      <div>
        <p class="archive__title">${heading}</p>
        <p class="archive__who">${esc([talk.speaker, talk.institution].filter(Boolean).join(' \u2014 '))}</p>
      </div>
    </div>`;
}

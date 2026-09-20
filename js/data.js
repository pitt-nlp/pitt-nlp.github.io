/* Loads and normalises the JSON files in /data. */

import { parseDate } from './util.js';

const SOURCES = {
  members: 'data/members.json',
  news: 'data/news.json',
  classes: 'data/classes.json',
  talks: 'data/talks/index.json'
};

/* Student groups appear in this order; anything else follows alphabetically. */
const PROGRAM_ORDER = ['CS', 'IS', 'ISP', 'LING'];

const FALLBACK_DEPARTMENTS = {
  CS: { name: 'Department of Computer Science', short: 'Computer Science', url: 'https://www.cs.pitt.edu/' },
  IS: { name: 'Department of Informatics and Networked Systems', short: 'Information Science', url: 'https://www.sci.pitt.edu/' },
  ISP: { name: 'Intelligent Systems Program', short: 'Intelligent Systems', url: 'https://www.isp.pitt.edu/' },
  LING: { name: 'Department of Linguistics', short: 'Linguistics', url: 'https://www.linguistics.pitt.edu/' }
};

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const text = (await response.text()).trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

function newsFrom(raw) {
  return asArray(raw.items ?? raw).sort(byDateDescending);
}

const newsRequest = fetchJson(SOURCES.news);

/** News only — do not wait for the directory or talks listings. */
export function loadNews() {
  return newsRequest.then((raw) => ({ news: newsFrom(raw) }));
}

export async function loadSiteData() {
  const [members, news, classes, talks] = await Promise.all([
    fetchJson(SOURCES.members),
    newsRequest,
    fetchJson(SOURCES.classes),
    loadTalks()
  ]);
  return normalise(members, news, classes, talks);
}

async function loadTalks() {
  const index = await fetchJson(SOURCES.talks);
  const years = Array.isArray(index.years)
    ? index.years.filter((year) => typeof year === 'string' && year.trim())
    : [];
  const files = await Promise.all(
    years.map((year) => fetchJson(`data/talks/${year.trim()}/talks.json`))
  );
  return {
    series: index.series || {},
    talks: files.flatMap(talksFrom)
  };
}

function talksFrom(raw) {
  return Array.isArray(raw) ? asArray(raw) : asArray(raw && raw.talks);
}

function normalise(members, news, classes, talks) {
  const departments = { ...FALLBACK_DEPARTMENTS, ...(members.departments || {}) };
  const studentGroups = orderGroups(members.students || {}, departments);

  return {
    departments,
    classes: asArray(classes.courses ?? classes),
    researchAreas: collectAreas(studentGroups),
    faculty: {
      core: asArray(members.faculty && members.faculty.core),
      affiliated: asArray(members.faculty && members.faculty.affiliated)
    },
    studentGroups,
    alumni: asArray(members.alumni).sort(byYearDescending),
    news: newsFrom(news),
    talks: {
      series: talks.series || {},
      ...splitTalks(asArray(talks.talks))
    }
  };
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

/** Trimmed, de-duplicated research areas for one person. */
export function areasOf(person) {
  const seen = new Set();
  for (const area of Array.isArray(person && person.areas) ? person.areas : []) {
    const name = String(area || '').trim();
    if (name) seen.add(name);
  }
  return [...seen];
}

/*
 * Every research area named anywhere in the student directory, busiest first
 * and alphabetical within a tie, so the filters that narrow the list most
 * usefully come first.
 *
 * Derived rather than configured: adding an area to a student in
 * members.json is all it takes for a new chip to appear.
 */

function collectAreas(studentGroups) {
  const counts = new Map();
  for (const group of studentGroups) {
    for (const person of group.people) {
      for (const name of areasOf(person)) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

/** `{ CS: [...] }` becomes `[{ key, label, url, people }]` in display order. */
function orderGroups(students, departments) {
  const keys = Object.keys(students).filter((key) => !key.startsWith('_'));
  keys.sort((a, b) => {
    const ai = PROGRAM_ORDER.indexOf(a);
    const bi = PROGRAM_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });

  return keys
    .map((key) => {
      const meta = departments[key] || {};
      return {
        key,
        label: meta.short || meta.name || key,
        url: meta.url || '',
        people: asArray(students[key])
      };
    })
    .filter((group) => group.people.length > 0);
}

function timestamp(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

const SEMINAR_TZ = 'America/New_York';

/** Calendar day in Pittsburgh, as `YYYY-MM-DD`. */
function seminarToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEMINAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function talkDay(talk) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(talk.date || '').trim());
  return match ? match[1] : '';
}

/**
 * A talk stays upcoming through its seminar day, then moves to past the next
 * calendar day. Upcoming is soonest-first; past is newest-first.
 */
function splitTalks(items, today = seminarToday()) {
  const upcoming = [];
  const past = [];
  for (const talk of items) {
    const day = talkDay(talk);
    if (day && day >= today) upcoming.push(talk);
    else past.push(talk);
  }
  upcoming.sort(byDateAscending);
  past.sort(byDateDescending);
  return { upcoming, past };
}

function byDateAscending(a, b) {
  return timestamp(a.date) - timestamp(b.date);
}

function byDateDescending(a, b) {
  return timestamp(b.date) - timestamp(a.date);
}

function byYearDescending(a, b) {
  return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
}

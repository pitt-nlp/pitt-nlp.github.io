/* Small shared helpers. */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Escape a value for interpolation into markup. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Reject URL schemes that could execute script. Relative paths, hashes,
 * http(s) and mailto are allowed.
 */
export function safeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  return url;
}

/** Parse `YYYY-MM-DD` in local time so dates never shift by a day. */
export function parseDate(value) {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const DATE_FORMATS = {
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  monthYear: { year: 'numeric', month: 'short' },
  weekday: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
};

export function formatDate(value, style = 'medium') {
  const date = parseDate(value);
  if (!date) return String(value || '');
  return new Intl.DateTimeFormat('en-US', DATE_FORMATS[style] || DATE_FORMATS.medium).format(date);
}

/** ISO date for a `<time datetime>` attribute. */
export function isoDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Turn blank-line-separated prose into escaped paragraphs. */
export function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean)
    .map((block) => `<p>${esc(block)}</p>`)
    .join('');
}

/** Fallback avatar text for people without a photograph. */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return (first + last).toUpperCase();
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Current fixed-header height, read from the CSS custom property. */
export function headerHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
  return parseFloat(raw) || 74;
}

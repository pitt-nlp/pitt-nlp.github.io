# Pitt NLP+CL — change notes

Three tasks: hero sizing, a Classes tab, and research-area filtering on the
Students list. `js/nav.js`, `js/hero.js`, `js/slider.js`, `js/util.js`,
`data/members.json` and `data/news.json` are untouched.

---

## 1. Hero sizing, photo cropping, news band

### Why faces were being cut off

`.slider` carried both `min-height: 0` and `overflow: hidden`, and `.hero` was
a fixed `height: 100svh`. Whenever the title, photo and news together needed
more room than the screen had, the hero grid was free to shrink the photo
frame below the photograph's own height, and the overflow rule then hid
whatever spilled out. The bottom edge is where the seated front row's faces
are, so they went first:

| Viewport | Frame | Visible | Cut |
| --- | --- | --- | --- |
| 1366 x 768 | 295.7px | 277.6px | 18px |
| 1280 x 720 | 278.5px | 206.8px | 72px |
| 844 x 390 (phone landscape) | 184.6px | 0px | the whole photograph |

### A second, separate problem

The two photographs came off different cameras — `group1.jpg` is 2.903:1,
`group2.jpeg` is 3.343:1 — but the frame was hardcoded to `3 / 1`. With
`object-fit: contain` that inset group1 by about 14px a side while leaving
group2 full width, so the two slides rendered at different sizes and neither
lined up with the news panel below it.

### What changed

- `.hero` is now `display: grid` with `min-height: 100svh` instead of a fixed
  height. It still fills a tall screen; on a short one it grows rather than
  cropping.
- The two clipping declarations are gone. Horizontal clipping for the carousel
  stays on `.slider__viewport`, which is the only place that needs it.
- `tools/prep-images.mjs` normalises both photographs to one frame ratio
  (`GROUP_RATIO`, mirrored by `--group-ratio` in the CSS). It centre-trims
  **width only** — in both photographs the back row's heads run to the top
  edge and the seated row's faces to the bottom, so trimming height would cost
  faces. group2 lost 531px of curtain on the left and wall on the right; no
  one is in the trimmed strips. group1 is untouched.
- A short-viewport block (`min-width: 901px and max-height: 820px`) eases the
  vertical rhythm so 1366x768 and 1280x720 still show the news band without
  shrinking the photograph.

Result: nothing is clipped at any size, and the photo's edges land within
0.4px of the news panel (was 14px out).

### News band

- Items run **across** the band instead of down it. `grid-auto-flow: column`
  makes exactly as many equal columns as there are items, so two items split
  the band in half and four split it in quarters — no empty tracks.
- Below 901px they pair up two across. Below 560px they stack: two columns
  there leave about nine characters a line, and a side-by-side row that had to
  be swiped would have hidden the second item.
- The panel is deeper, with a `min-height` floor so a single short item still
  reads as a band.

**Worth a second look:** "news aligned horizontally, and slightly longer" could
have meant the panel edges lining up with the photo, or the items sitting in a
row. Both are done. If you meant something more specific — more items visible,
or a wider panel — it's a small change.

---

## 2. Classes tab

Course data lives in **`data/classes.json`**, loaded through `js/data.js` the
same way members and talks are, so courses can be edited without touching
code. To add one, append an object to `courses`:

```json
{
  "numbers": "CS 1699",
  "title": "Course title",
  "url": "https://...",
  "level": "Graduate",
  "focus": "One sentence on what the course covers.",
  "note": "Optional small print, e.g. that a link is to a past syllabus."
}
```

`url` and `note` are optional. Everything else is required for a full row.

The tab is a nav link (`#/classes`, between Students and Talks), a route in
`js/router.js`, a view in `index.html`, and `renderClasses` in `js/render.js`.
Layout follows the existing alumni and archive listings: course number and
level in the narrow column, title and description in the wide one, no header
row. Under 560px each course stacks into reading order — number, title,
description, then level — using the same `display: contents` reordering the
talks list uses.

---

## 3. Research-area filters

A row of coloured pills between the Students heading and the names. Pressing
one keeps that area's students at full strength and fades everyone else to
light grey. Pressing it again, clicking anywhere off the chips, or pressing
Escape restores the list. One area at a time, so pressing a second chip moves
the filter rather than adding to it.

### Adding a research area

Nothing to edit but `data/members.json`. Add the area to a student's `areas`
array and a new chip appears on its own, coloured and working:

```json
{
  "name": "Student Name",
  "title": "PhD",
  "website": "https://...",
  "areas": ["NLP for Education", "Speech Processing"]
}
```

Chips are ordered by how many students work in each area (busiest first,
alphabetical within a tie), so the filters that narrow the list most usefully
come first. Verified with four new areas added at once: 19 chips rendered,
all filtering correctly, no code changes.

### Colours

Sixteen palette slots in `css/styles.css` (`.area-chip--c0` to `--c15`),
assigned by position in the derived list and cycling past sixteen. Every slot
was checked to clear **5:1 contrast** in both states — the ink on its own tint
when idle, and white on the ink when pressed — plus a neutral hairline so the
palest slots still read as a pill against the paper.

To add slots, add `.area-chip--cN` rules and raise `PALETTE_SLOTS` in
`js/data.js` to match.

Because chip order depends on student counts, adding a student can shift which
colour an area gets. The labels carry the meaning, so this is cosmetic.

### Notes

- Faded names stay clickable and return to full colour on hover or focus — a
  dimmed person is still worth a click.
- A programme whose students are all faded fades its heading too, so the
  remaining names are easier to pick out.
- A student with no listed areas fades under any filter. Currently that's
  Ziwei Quan — adding areas to that entry fixes it.
- Chips are keyboard reachable, use `aria-pressed`, and report the count to
  screen readers through a visually hidden live region.
- On phones the row becomes a single scrolling line. Fifteen areas wrap to
  eight rows at 390px, which pushed the names most of a screen down; one line
  keeps it to about 44px. The chip cut off at the right edge is what signals
  that it scrolls. If you'd rather see all of them wrapped on mobile, delete
  the `max-width: 700px` block near the end of the stylesheet.

---

## Verification

- 18 viewports (320px to 1920px, including phone landscape) x 5 routes:
  no horizontal overflow, no clipped photo, no console errors.
- 30 functional checks on the Classes tab and the filter.
- Mobile menu, reduced motion, and keyboard access checked separately.

Screenshots were taken in a sandbox without network access, so Google Fonts
fell back to system faces. Layout and behaviour are unaffected, but type
metrics on the live site will differ slightly from those captures.

`node_modules` is not in this archive — run `npm install` if you need the
`tools/` scripts. Re-run `node tools/prep-images.mjs` only if you replace a
group photograph; it rewrites the derivatives from the masters.

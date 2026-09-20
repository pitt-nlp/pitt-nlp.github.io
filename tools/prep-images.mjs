/*
 * Prepares hero photographs.
 *
 *   node tools/prep-images.mjs
 *
 * Cathedral: `images/cathy.png` is the full-resolution master. This trims
 * empty margin, punches leftover fringe alpha so the sky shows through
 * cleanly, and writes the responsive variants that index.html references.
 *
 * Group photos: writes compressed JPEG and WebP widths from group1.jpg and
 * group2.jpeg.
 */

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SOURCE = 'images/cathy.png';
const WIDTHS = [1200, 800, 480];
const ALPHA_CUTOFF = 22;

function punchFringe(raw, width, height) {
  const out = Buffer.from(raw);
  for (let i = 0; i < width * height; i += 1) {
    const a = out[i * 4 + 3];
    if (a < ALPHA_CUTOFF) {
      out[i * 4] = 0;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
      out[i * 4 + 3] = 0;
    }
  }
  return out;
}

function fromRaw(raw, width, height) {
  return sharp(raw, { raw: { width, height, channels: 4 } });
}

const master = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const punched = punchFringe(master.data, master.info.width, master.info.height);

const trimmed = await fromRaw(punched, master.info.width, master.info.height)
  .trim({ background: '#00000000', threshold: 8 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = trimmed.info;
const clean = punchFringe(trimmed.data, width, height);

console.log(`master  ${SOURCE}  ${master.info.width} x ${master.info.height}`);
console.log(`trimmed ${width} x ${height}  (aspect ${(width / height).toFixed(3)})`);

console.log('');
for (const w of WIDTHS) {
  const resized = await fromRaw(clean, width, height)
    .resize({ width: w, kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = punchFringe(resized.data, resized.info.width, resized.info.height);
  const image = fromRaw(cleaned, resized.info.width, resized.info.height);
  const png = await image.clone().png({ compressionLevel: 9, palette: false }).toBuffer();
  const webp = await image.clone().webp({ quality: 86, alphaQuality: 100 }).toBuffer();
  await writeFile(`images/cathedral-${w}.png`, png);
  await writeFile(`images/cathedral-${w}.webp`, webp);
  const h = resized.info.height;
  console.log(
    `cathedral-${w}  ${w} x ${h}   png ${(png.length / 1024).toFixed(0)} KB   ` +
      `webp ${(webp.length / 1024).toFixed(0)} KB`
  );
}

const GROUP_PHOTOS = [
  { source: 'images/group1.jpg', name: 'group1' },
  { source: 'images/group2.jpeg', name: 'group2' }
];
const GROUP_WIDTHS = [1200, 800];

/*
 * The group photographs are both letterboxed panoramas, but they came off
 * different cameras: group1 is 2.903:1 and group2 3.343:1. The slider shows
 * them in one frame, and a single frame cannot match both — `object-fit:
 * contain` was insetting group1 by ~14px a side while leaving group2 full
 * width, so the two slides rendered at different sizes and neither lined up
 * with the news panel underneath.
 *
 * GROUP_RATIO is that one frame, set to group1 as-shot so the more tightly
 * framed photograph is never touched. Anything wider is centre-trimmed to
 * fit. The trim only ever removes WIDTH: in both photographs the back row's
 * heads run to the top edge and the seated row's faces to the bottom, so
 * losing height would cost faces, whereas the extra width in group2 is
 * curtain on the left and wall on the right.
 *
 * Keep this in sync with --group-ratio in css/styles.css.
 */
const GROUP_RATIO = 4032 / 1389;

console.log('');
console.log(`group frame ratio ${GROUP_RATIO.toFixed(3)} : 1`);
for (const { source, name } of GROUP_PHOTOS) {
  const meta = await sharp(source).metadata();
  const ratio = meta.width / meta.height;
  console.log(`master  ${source}  ${meta.width} x ${meta.height}  (aspect ${ratio.toFixed(3)})`);

  /* Centre-trim to the frame. Computed per photo so a replacement photograph
     at any width normalises itself without editing this script. */
  let extract = null;
  if (ratio > GROUP_RATIO + 0.002) {
    const width = Math.round(meta.height * GROUP_RATIO);
    extract = { left: Math.round((meta.width - width) / 2), top: 0, width, height: meta.height };
    console.log(
      `        trimming ${meta.width - width}px of width ` +
        `(${extract.left}px left, ${meta.width - width - extract.left}px right)`
    );
  } else if (ratio < GROUP_RATIO - 0.002) {
    console.log(
      '        NOTE: this photograph is taller than the frame, so it will sit\n' +
        '        inside it with sky above and below. Either re-crop the master to\n' +
        `        ${GROUP_RATIO.toFixed(3)}:1 or lower GROUP_RATIO (and --group-ratio) to match.`
    );
  }

  for (const w of GROUP_WIDTHS) {
    let pipeline = sharp(source);
    if (extract) pipeline = pipeline.extract(extract);
    pipeline = pipeline.resize({ width: w, kernel: 'lanczos3' });
    const jpg = await pipeline.clone().jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    const webp = await pipeline.clone().webp({ quality: 78 }).toBuffer();
    await writeFile(`images/${name}-${w}.jpg`, jpg);
    await writeFile(`images/${name}-${w}.webp`, webp);
    const out = await sharp(jpg).metadata();
    console.log(
      `${name}-${w}  ${out.width} x ${out.height}   jpg ${(jpg.length / 1024).toFixed(0)} KB   ` +
        `webp ${(webp.length / 1024).toFixed(0)} KB`
    );
  }
}

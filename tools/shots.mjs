/* Development helper: capture screenshots of the site for visual review. */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://127.0.0.1:8123/';
const OUT = 'tools/shots';

const jobs = [
  { name: 'desktop-hero', width: 1440, height: 900, path: '', scrollTo: 0 },
  { name: 'desktop-fade', width: 1440, height: 900, path: '', scrollTo: 620 },
  { name: 'desktop-faculty', width: 1440, height: 900, path: '', scrollTo: 1150 },
  { name: 'desktop-students', width: 1440, height: 900, path: '#/students', scrollTo: null },
  { name: 'desktop-talks', width: 1440, height: 900, path: '#/talks', scrollTo: null },
  { name: 'desktop-full', width: 1440, height: 900, path: '', full: true },
  { name: 'tablet-full', width: 860, height: 1000, path: '', full: true },
  { name: 'mobile-hero', width: 390, height: 844, path: '', scrollTo: 0 },
  { name: 'mobile-full', width: 390, height: 844, path: '', full: true }
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

for (const job of jobs) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`[${job.name}] console: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    problems.push(`[${job.name}] failed request: ${req.url()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`[${job.name}] ${res.status()} ${res.url()}`);
  });

  await page.goto(BASE + job.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  if (job.scrollTo !== null && job.scrollTo !== undefined) {
    await page.evaluate((y) => window.scrollTo(0, y), job.scrollTo);
    await page.waitForTimeout(500);
  }

  await page.screenshot({
    path: `${OUT}/${job.name}.png`,
    fullPage: Boolean(job.full)
  });

  await context.close();
  console.log(`captured ${job.name}`);
}

await browser.close();

if (problems.length) {
  console.log('\n--- problems ---');
  problems.forEach((p) => console.log(p));
} else {
  console.log('\nno console errors or failed requests');
}

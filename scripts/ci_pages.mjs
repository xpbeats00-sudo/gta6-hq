// Opens the app's pages in WebKit (the engine behind the macOS and Linux windows) and fails
// if any page throws a script error or shows nothing. Used by .github/workflows/build.yml.
//
//   gta6-hq --serve --port 4611 &
//   node scripts/ci_pages.mjs http://127.0.0.1:4611 shots
//
// Needs the `playwright` package and its WebKit browser (npx playwright install webkit).
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright';

const [base, out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
page.on('requestfailed', (r) => { if (r.url().startsWith(base)) problems.push(`request failed: ${r.url()}`); });
page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400 && !r.url().includes('/tiles/')) problems.push(`${r.status()}: ${r.url()}`); });

await page.goto(base, { waitUntil: 'load' });
// The splash screen plays for a few seconds; wait for it to leave by itself, as a person would.
await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, { timeout: 30000 })
  .catch(() => problems.push('the splash screen never left'));
await page.waitForTimeout(1500);

const visit = async (hash, name, check) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(1800);
  const text = (await page.locator('#view').innerText()).trim();
  if (text.length < 40) problems.push(`${hash}: the page is almost empty`);
  if (check) await check();
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${hash}: ${text.length} characters`);
};

await visit('#/', 'home');
await visit('#/wiki', 'encyclopedia');
await visit('#/characters', 'characters');
await visit('#/map', 'map');
await visit('#/media', 'media');
await visit('#/manual', 'manual-contents');
const chapter = await page.locator('.manual a[href^="#/manual/"]').first().getAttribute('href');
await visit(chapter, 'manual-day', async () => {
  if (!(await page.locator('.m-skyswitch').count())) problems.push('the day and night switch is missing');
});
// Press the switch: the manual must turn to night, with or without the circle wipe.
await page.locator('.m-skyswitch').click();
await page.waitForTimeout(2200);
if (!(await page.locator('.manual.manual-night').count())) problems.push('the manual did not switch to night');
await page.screenshot({ path: `${out}/manual-night.png` });
await page.locator('.m-skyswitch').click();
await page.waitForTimeout(1500);
if (await page.locator('.manual.manual-night').count()) problems.push('the manual did not switch back to day');

// Search answers.
const hits = await page.evaluate(async () => (await (await fetch('/api/search?q=vice')).json()).total);
if (!(hits > 0)) problems.push('search for "vice" found nothing');

await browser.close();
if (problems.length) {
  console.log('\nPROBLEMS');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('\nEvery page opened without a script error.');

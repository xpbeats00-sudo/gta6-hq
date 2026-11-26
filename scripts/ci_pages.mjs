// Opens the app's pages in WebKit (the engine behind the macOS and Linux windows) and fails if any
// page throws a script error, logs a console error, or does not show its own heading and content.
// Used by .github/workflows/build.yml.
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
// Console errors fail the run. The one kind let through is the browser's own "Failed to load resource"
// line for a request this script already allows below: a map tile (fetched from the internet and
// missing offline) or a video that WebKit stops fetching part-way.
const ALLOWED_LOAD_FAILURE = /\/tiles\/|\.(mp4|webm)(\?|$)/;
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const where = m.location()?.url || '';
  if (/^Failed to load resource/.test(m.text()) && ALLOWED_LOAD_FAILURE.test(where)) {
    console.log(`allowed console error (${m.text()}): ${where}`);
    return;
  }
  problems.push(`console error: ${m.text()}${where ? ` (${where})` : ''}`);
});
// WebKit cancels and re-asks for parts of a video as it plays, which shows up here as a failed
// request; that is normal. Whether the video really plays is checked on Home below.
page.on('requestfailed', (r) => {
  if (!r.url().startsWith(base)) return;
  const why = r.failure()?.errorText || '';
  if (/\.(mp4|webm)(\?|$)/.test(r.url())) console.log(`video request ended early (${why}): ${r.url()}`);
  else problems.push(`request failed (${why}): ${r.url()}`);
});
page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400 && !r.url().includes('/tiles/')) problems.push(`${r.status()}: ${r.url()}`); });

await page.goto(base, { waitUntil: 'load' });
// A first opening asks which start-up intro to play, with both playing side by side. Pick one as a
// person would; the splash waits for the answer and then plays it.
const chooser = page.locator('.intro-pick');
if (await chooser.waitFor({ timeout: 15000 }).then(() => true, () => false)) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/intro-chooser.png` });
  await chooser.locator('[data-intro="classic"]').click();
  // The choice is saved in the background; give it a moment.
  const saved = await page.waitForFunction(async () => (await (await fetch('/api/settings')).json()).intro === 'classic', null, { timeout: 5000, polling: 250 }).then(() => true, () => false);
  const picked = saved ? 'classic' : await page.evaluate(async () => (await (await fetch('/api/settings')).json()).intro);
  if (picked !== 'classic') problems.push(`the start-up choice was not saved (got ${JSON.stringify(picked)})`);
} else {
  problems.push('a first opening did not ask which start-up intro to play');
}
// The splash screen plays for a few seconds; wait for it to leave by itself, as a person would.
await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, { timeout: 30000 })
  .catch(() => problems.push('the splash screen never left'));
await page.waitForTimeout(1500);

// A first opening asks about spoilers once. Answer it as a person would (it covers the page until
// then), and check that the answer was saved, so the next opening does not ask again.
const ask = page.locator('dialog.spoiler-ask');
if (await ask.count()) {
  await ask.screenshot({ path: `${out}/spoiler-warning.png` });
  await ask.locator('button').click();
  await page.waitForTimeout(600);
  if (await ask.count()) problems.push('the spoiler warning did not close');
  const saved = await page.evaluate(async () => (await fetch('/api/settings')).json());
  if (saved['spoiler-notice'] !== '1') problems.push('the answer to the spoiler warning was not saved');
} else {
  const saved = await page.evaluate(async () => (await fetch('/api/settings')).json());
  if (saved['spoiler-notice'] !== '1') problems.push('a first opening did not show the spoiler warning');
}

// Each page must show its own heading (`heading`: the exact text of #view h1, or null for a page
// whose heading is its entry's name) and an element only that page draws (`selector`). The not-found
// page ("Wasted") has a heading and text too, so neither alone proves the right page opened.
// Waits up to 15 s for both (a slow runner; the manual loads its own data).
const visit = async (hash, name, [heading, selector], check) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  const shown = await page.waitForFunction(([h, sel]) => {
    const title = (document.querySelector('#view h1')?.textContent || '').replace(/\s+/g, ' ').trim();
    return (h === null || title === h) && !!document.querySelector(sel);
  }, [heading, selector], { timeout: 15000 }).then(() => true, () => false);
  const title = await page.evaluate(() => (document.querySelector('#view h1')?.textContent || '').trim());
  if (!shown) problems.push(`${hash}: expected heading ${JSON.stringify(heading)} and ${selector}; got heading ${JSON.stringify(title)}`);
  if (check) await check();
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${hash}: ${shown ? 'shown' : 'NOT shown'} (${JSON.stringify(title)})`);
};

await visit('#/', 'home', ['Grand Theft Auto VI', 'section.hero .hero-title'], async () => {
  // The live wallpaper: report what the video element says, and fail only if it could not be fetched.
  const video = await page.evaluate(() => {
    const v = document.querySelector('.hero video, video.hero-video');
    return v ? { src: v.currentSrc, ready: v.readyState, time: v.currentTime, paused: v.paused, error: v.error && v.error.code } : null;
  });
  console.log('home video:', JSON.stringify(video));
  if (video && video.error === 2) problems.push('the home video could not be downloaded');
});
await visit('#/wiki', 'encyclopedia', ['Encyclopedia', '.index']);
await visit('#/characters', 'characters', ['Characters', '.grid-portrait a[href^="#/characters/"]']);
await visit('#/map', 'map', ['Leonida', '#leonida-map .leaflet-marker-icon']);
await visit('#/locations', 'locations', ['Locations', '.list a[href^="#/locations/"]']);
await visit('#/vehicles', 'vehicles', ['Vehicles', '.list a[href^="#/wiki/vehicles/"]']);
await visit('#/wiki/businesses', 'businesses', ['Businesses', '.list a[href^="#/wiki/businesses/"]']);
await visit('#/wiki/activities', 'activities', ['Activities', '.list a[href^="#/wiki/activities/"]']);
await visit('#/tracker', 'tracker', ['Collectible Tracker', '.tracker'], async () => {
  if (!(await page.locator('.tracker input[type="checkbox"]').count())) problems.push('the collectible tracker lists nothing');
});
await visit('#/saved', 'saved', ['Saved', '.saved-page']);
await visit('#/journal', 'journal', ['Discovery Journal', '.journal'], async () => {
  if (!(await page.locator('.journal-note textarea').count())) problems.push('the journal has no note box');
});
await visit('#/progress', 'progress', ['Progress', '.progress-page .stat-grid']);
await visit('#/settings', 'settings', ['Settings', 'form.settings-page fieldset'], async () => {
  // Each theme must apply to the page (the reader's choice is put back afterwards).
  for (const theme of ['light', 'dark', 'vice']) {
    await page.locator(`.settings-page [name="theme-app"][value="${theme}"]`).check({ force: true });
    await page.waitForTimeout(200);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme || 'vice');
    if (applied !== theme) problems.push(`the ${theme} theme did not apply (got ${applied})`);
  }
});
await visit('#/map?immersive=1', 'map-immersive', ['Leonida', '.map-page.is-immersive'], async () => {
  if (!(await page.evaluate(() => document.body.classList.contains('map-immersive')))) problems.push('immersive map mode did not open');
});
await visit('#/intel', 'intel', ['Intel', 'section.block.split']);
await visit('#/media', 'media', ['Media', '#view .chips button']);
// Entry pages and the not-found page.
const firstSlug = (section) => page.evaluate(async (s) => (await (await fetch('/api/wiki')).json())[s].find((e) => !e.spoiler && e.status !== 'draft').slug, section);
await visit(`#/characters/${await firstSlug('characters')}`, 'character', [null, 'article.profile h1']);
await visit(`#/locations/${await firstSlug('locations')}`, 'location', [null, 'article.place h1']);
await visit('#/no-such-page', 'not-found', ['Wasted', '#view a[href="#/"]']);
await visit('#/manual', 'manual-contents', ['Field Manual', '.manual a[href^="#/manual/"]']);
const chapter = await page.locator('.manual a[href^="#/manual/"]').first().getAttribute('href');
await visit(chapter, 'manual-open', [null, '.manual .m-book'], async () => {
  if (!(await page.locator('.m-skyswitch').count())) problems.push('the day and night switch is missing');
});
// Night reading is the default. Press the switch: the manual must change to the other look (with or
// without the circle wipe), then change back.
const nightAtFirst = (await page.locator('.manual.manual-night').count()) > 0;
await page.locator('.m-skyswitch').click();
await page.waitForTimeout(2200);
if ((await page.locator('.manual.manual-night').count() > 0) === nightAtFirst) problems.push(`the manual did not switch to ${nightAtFirst ? 'day' : 'night'}`);
await page.screenshot({ path: `${out}/manual-${nightAtFirst ? 'day' : 'night'}.png` });
await page.locator('.m-skyswitch').click();
await page.waitForTimeout(1500);
if ((await page.locator('.manual.manual-night').count() > 0) !== nightAtFirst) problems.push(`the manual did not switch back to ${nightAtFirst ? 'night' : 'day'}`);

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

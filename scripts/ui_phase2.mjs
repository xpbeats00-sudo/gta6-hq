// Phase 2 browser test: every page and navigation link, appearance settings (themes, accent,
// density, motion, map panels), Jason and Lucia profiles, the Discovery Journal, map overlays,
// the nearby-only filter, immersive mode, the 3D labels and route, and basic accessibility.
//
// Run it the same way as scripts/ui_features.mjs, after it or on its own, with throwaway data. Like
// that suite it resets the app's saved data and settings itself when it starts (scripts/suite_data.mjs):
//   node scripts/ui_phase2.mjs 9340 4655 [screenshot folder]
//
// Prints one line per check and exits 1 if any failed. Uses Node's built-in fetch and WebSocket (Node 22+).
import { writeFileSync, mkdirSync } from 'node:fs';
import { resetSaved } from './suite_data.mjs';

const [debugPort = '9340', appPort = '4655', shots = ''] = process.argv.slice(2);
const base = `http://127.0.0.1:${appPort}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (shots) mkdirSync(shots, { recursive: true });

let target;
for (let i = 0; i < 80 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  if (!target) await sleep(300);
}
if (!target) { console.error('No browser page on that debugging port.'); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
const problems = [];
const call = (method, params = {}) => new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (waiting.has(d.id)) { waiting.get(d.id)(d.result ?? { error: d.error }); waiting.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') {
    const why = d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text;
    problems.push(`exception: ${why}`);
    console.log(`      (script error: ${why.split(/\n/).slice(0, 6).join(' | ')})`);
  }
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') problems.push(`console: ${d.params.args.map((a) => a.value || a.description).join(' ')}`);
  if (d.method === 'Network.loadingFailed' && !d.params.canceled) problems.push(`request failed: ${d.params.errorText}`);
  if (d.method === 'Network.responseReceived' && d.params.response.status >= 400 && d.params.response.url.startsWith(base)) problems.push(`HTTP ${d.params.response.status}: ${d.params.response.url}`);
};
await call('Runtime.enable');
await call('Network.enable');
await call('Page.enable');
const run = async (expression) => {
  const r = await call('Runtime.evaluate', { expression: `{\n${expression}\n}`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
const key = (k, code = k, shift = false) => call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: shift ? 8 : 0, windowsVirtualKeyCode: { Tab: 9, Enter: 13, Escape: 27, ArrowRight: 39 }[k] || 0 })
  .then(() => call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: shift ? 8 : 0 }));
const shot = async (name) => { if (!shots) return; const s = await call('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); writeFileSync(`${shots}/p2-${name}.jpg`, Buffer.from(s.data, 'base64')); };
const go = async (hash, wait = 1500) => { await run(`location.hash = ${JSON.stringify(hash)}; true`); await sleep(wait); };
const user = () => run(`fetch('/api/userdata').then((r) => r.json())`);
// Poll the page until `expression` gives a truthy value, for at most `timeout` ms. Returns the last value
// (falsy on time-out), so the check that follows still decides pass or fail exactly as before.
const waitFor = async (expression, timeout = 10000) => {
  const end = Date.now() + timeout;
  let value;
  do {
    try { value = await run(expression); } catch { value = undefined; }
    if (value) return value;
    await sleep(100);
  } while (Date.now() < end);
  return value;
};
// Click a place button (`data-marker` in the lists, `data-to` on a card), then wait until the map has
// flown there and that place's card is open. The card it replaces fades out for a moment after the new
// one opens, so this also waits until only one card is left. A missing button throws, as the plain click did.
const openPin = async (selector, popup = '.leaflet-popup') => {
  const i = await run(`const b = document.querySelector(${JSON.stringify(selector)}); b.click(); b.dataset.marker ?? b.dataset.to`);
  return waitFor(`!!document.querySelector('${popup} .map-card[data-pin="${i}"]') && document.querySelectorAll('${popup}').length === 1`);
};
// The 3D view is drawn: MapLibre has its canvas, the loading note is gone and the style has loaded.
const READY_3D = `!!document.querySelector('.map3d canvas') && !document.querySelector('.map3d-loading') && !!state.map3d?.map?.isStyleLoaded()`;
const settings = () => run(`fetch('/api/settings').then((r) => r.json())`);
const setting = async (name, value) => { await run(`const i = document.querySelector('.settings-page [name="${name}"][value="${value}"]'); i.click(); true`); await sleep(250); };

let failed = 0;
async function check(name, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error('condition not met');
    console.log(`PASS  ${name}${typeof result === 'string' ? `  (${result})` : ''}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}  -> ${error.message.split('\n')[0]}`);
  }
}

// Contrast of two CSS colours (WCAG), measured in the page from the live tokens.
const CONTRAST = `
  const rgb = (c) => { const n = c.match(/[\\d.]+/g).map(Number); return c.startsWith('color(') ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3); };
  const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const probe = document.createElement('i'); document.body.append(probe);
  const colour = (v) => { probe.style.color = 'var(' + v + ')'; return getComputedStyle(probe).color; };
`;
const contrastReport = () => run(`${CONTRAST}
  const bg = colour('--bg-main'), panel = colour('--bg-panel');
  const out = { primary: ratio(colour('--text-primary'), bg), secondary: ratio(colour('--text-secondary'), panel), muted: ratio(colour('--text-muted'), bg), accent: ratio(colour('--accent-pink'), bg) };
  probe.remove(); JSON.stringify(out);`).then(JSON.parse);

await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// The suite clears its own saved data and settings through the app's API (see suite_data.mjs), with the
// spoiler notice already answered (ui_features.mjs walks the first opening itself).
try {
  const cleared = await resetSaved(base);
  console.log(`      (reset: ${cleared.parts} saved part(s) removed, ${cleared.settings} setting(s) put back)`);
} catch (error) { console.error(`Could not reset the saved data: ${error.message}`); process.exit(2); }
await call('Page.navigate', { url: `${base}/#/home` });
await sleep(1500);
await call('Page.reload', { ignoreCache: true });
await waitFor(`typeof state !== 'undefined' && !!state.wiki`, 20000);
await run(`document.getElementById('splash')?.remove(); document.body.classList.remove('is-loading'); window.confirm = () => true; true`);
await sleep(500);

// ---------- every page and every navigation link ----------
// Each page and what it must show: its own heading, and an element only that page draws. The
// not-found page ("Wasted") has a heading too, so a heading alone would not prove the page opened.
const PAGES = {
  '#/': ['Grand Theft Auto VI', 'section.hero .hero-title'],
  '#/wiki': ['Encyclopedia', '.index'],
  '#/characters': ['Characters', '.grid-portrait a[href^="#/characters/"]'],
  '#/locations': ['Locations', '.list a[href^="#/locations/"]'],
  '#/vehicles': ['Vehicles', '.list a[href^="#/wiki/vehicles/"]'],
  '#/map': ['Leonida', '#leonida-map .leaflet-marker-icon'],
  '#/manual': ['Field Manual', '.manual .m-book'],
  '#/tracker': ['Collectible Tracker', '.tracker input[type="checkbox"]'],
  '#/wiki/businesses': ['Businesses', '.list a[href^="#/wiki/businesses/"]'],
  '#/wiki/activities': ['Activities', '.list a[href^="#/wiki/activities/"]'],
  '#/wiki/collectibles': ['Collectibles', '.list a[href^="#/wiki/collectibles/"]'],
  '#/saved': ['Saved', '.saved-page'],
  '#/journal': ['Discovery Journal', '.journal-note textarea'],
  '#/progress': ['Progress', '.progress-page .stat-grid'],
  '#/media': ['Media', '#view .chips button'],
  '#/intel': ['Intel', 'section.block.split'],
  '#/settings': ['Settings', 'form.settings-page fieldset'],
  '#/search?q=Lucia': ['Search', 'form.search-big input'],
  '#/wiki/businesses/fleeca': ['Fleeca bank', 'article.profile'],
};
await check(`Every primary page shows its own heading and content (${Object.keys(PAGES).length} pages)`, async () => {
  const wrong = [];
  for (const [page, [heading, selector]] of Object.entries(PAGES)) {
    await go(page, 0);
    const ok = await waitFor(`document.querySelector('#view h1')?.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(heading)} && !!document.querySelector(${JSON.stringify(selector)})`, 10000);
    if (!ok) wrong.push(`${page} (heading "${await run(`document.querySelector('#view h1')?.textContent.trim() || ''`)}", ${selector} ${await run(`!!document.querySelector(${JSON.stringify(selector)})`) ? 'found' : 'missing'})`);
  }
  if (wrong.length) throw new Error(`wrong or empty: ${wrong.join(', ')}`);
  return true;
});
await check('Every top-bar and "More" link opens its page and marks it current', async () => {
  const links = await run(`JSON.stringify([...document.querySelectorAll('#nav a[data-route]')].map((a) => a.getAttribute('href')))`).then(JSON.parse);
  const bad = [];
  for (const href of links) {
    await go('#/home', 300);
    const inMore = await run(`!!document.querySelector('#nav-more-menu a[href="${href}"]')`);
    if (inMore) { await run(`document.querySelector('.nav-more-btn').click(); true`); await sleep(150); }
    await run(`document.querySelector('#nav a[href="${href}"]').click(); true`);
    await sleep(href === '#/manual' ? 1800 : 900);
    const ok = await run(`(() => { const a = document.querySelector('#nav a[href="${href}"]'); const h = location.hash || '#/'; return (h === '${href}' || h.startsWith('${href}?') || '${href}' === '#/' && h === '#/') && (a.classList.contains('is-active') || a.getAttribute('aria-current') === 'page' || ${inMore} && document.querySelector('.nav-more-btn').classList.contains('is-active')); })()`);
    if (!ok) bad.push(href);
  }
  if (bad.length) throw new Error(`not marked or not opened: ${bad.join(', ')}`);
  return `${links.length} links`;
});

// ---------- appearance ----------
await go('#/settings', 1000);
await check('Vice City, Dark and Light themes switch every token and pass contrast', async () => {
  const report = [];
  for (const theme of ['vice', 'dark', 'light']) {
    await setting('theme-app', theme);
    const attr = await run(`document.documentElement.dataset.theme || 'vice'`);
    const c = await contrastReport();
    if (attr !== theme) throw new Error(`${theme}: html says ${attr}`);
    if (c.primary < 7 || c.secondary < 4.5 || c.muted < 4.5 || c.accent < 4.5) throw new Error(`${theme}: ${JSON.stringify(c)}`);
    report.push(`${theme} text ${c.primary.toFixed(1)}, muted ${c.muted.toFixed(1)}, accent ${c.accent.toFixed(1)}`);
  }
  return report.join('; ');
});
await check('The chosen theme carries to the map, journal, tracker and manual', async () => {
  const bgs = [];
  for (const page of ['#/map', '#/journal', '#/tracker', '#/saved']) {
    await go(page, 1000);
    const lightish = await run(`${CONTRAST} const v = lum(getComputedStyle(document.body).backgroundColor) > 0.7; probe.remove(); v`);
    if (!lightish) throw new Error(`${page} is not light`);
    bgs.push(page);
  }
  await go('#/map', 1200);
  await shot('light-map');
  await go('#/journal', 800);
  await shot('light-journal');
  return bgs.join(', ');
});
await check('Every accent passes contrast on the light and dark themes', async () => {
  await go('#/settings', 900);
  const weak = [];
  for (const theme of ['light', 'dark', 'vice']) {
    await setting('theme-app', theme);
    const accents = await run(`JSON.stringify([...document.querySelectorAll('.settings-page [name="accent"]')].map((i) => i.value))`).then(JSON.parse);
    for (const a of accents) {
      await setting('accent', a);
      const c = await contrastReport();
      if (c.accent < 4.5) weak.push(`${theme} ${a || 'pink'} ${c.accent.toFixed(2)}`);
    }
  }
  if (weak.length) throw new Error(weak.join(', '));
  return true;
});
await check('A custom accent colour is saved and used', async () => {
  await run(`const i = document.querySelector('[name="accent-own"]'); i.value = '#33ccaa'; i.dispatchEvent(new Event('change', { bubbles: true })); true`); await sleep(300);
  const s = await settings();
  const used = await run(`getComputedStyle(document.documentElement).getPropertyValue('--accent-user').trim()`);
  await setting('accent', '');
  return s.accent === '#33ccaa' && used === '#33ccaa';
});
await check('Compact density tightens spacing; comfortable restores it', async () => {
  await setting('density', 'compact');
  const compact = await run(`getComputedStyle(document.documentElement).getPropertyValue('--s5').trim()`);
  await setting('density', 'comfortable');
  const normal = await run(`getComputedStyle(document.documentElement).getPropertyValue('--s5').trim()`);
  return compact === '18px' && normal === '24px' ? `${compact} -> ${normal}` : false;
});
await check('Animation intensity: gentle shortens, off stops it, full restores', async () => {
  // A system that asks for reduced motion always wins; test the setting on one that does not.
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await setting('motion-level', 'gentle');
  const gentle = await run(`document.documentElement.dataset.motion === 'gentle' && motionScale() === 0.5`);
  await setting('motion-level', 'off');
  const off = await run(`document.body.classList.contains('reduce-motion') && motionScale() === 0`);
  await setting('motion-level', 'full');
  const full = await run(`!document.body.classList.contains('reduce-motion') && motionScale() === 1`);
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const system = await run(`motionScale() === 0`);
  await call('Emulation.setEmulatedMedia', { features: [] });
  if (!system) throw new Error('the system reduced-motion preference was ignored');
  return gentle && off && full;
});
await check('Map panel transparency is saved and lets the map show through', async () => {
  await run(`const r = document.querySelector('[name="panel-see"]'); r.value = '40'; r.dispatchEvent(new Event('input', { bubbles: true })); true`); await sleep(300);
  const solid = await run(`getComputedStyle(document.documentElement).getPropertyValue('--panel-solid').trim()`);
  await go('#/map', 1500);
  const bg = await run(`getComputedStyle(document.querySelector('.map-tools')).backgroundColor`);
  const s = await settings();
  return solid === '60%' && s['panel-see'] === '40' && /(rgba|color)\(.*0?\.\d+\)$/.test(bg) ? bg : false;
});

// ---------- profiles ----------
await check('Profiles: Jason keeps his own favourites', async () => {
  const before = (await user()).favourites?.length || 0;
  await go('#/saved', 900);
  await run(`document.querySelector('button[data-profile="jason"]').click(); true`); await sleep(900);
  const on = await run(`document.querySelector('button[data-profile="jason"]').getAttribute('aria-pressed')`);
  await go('#/map', 1600);
  await run(`const f = document.querySelector('.map-filter'); f.value = 'Fleeca'; f.dispatchEvent(new Event('input')); true`); await sleep(400);
  await openPin('.map-lists [data-marker]');
  await run(`document.querySelector('.leaflet-popup [data-act="fav"]').click(); true`); await sleep(400);
  const u = await user();
  return on === 'true' && (u['jason-favourites'] || []).length === 1 && (u.favourites?.length || 0) === before;
});
await check('Profiles: Lucia from Settings has her own favourites; Shared comes back unchanged', async () => {
  await go('#/settings', 800);
  await setting('profile', 'lucia');
  await go('#/map', 1500);
  const luciaFavs = await run(`UserStore.get('favourites', []).length`);
  await go('#/settings', 800);
  await setting('profile', '');
  await go('#/progress', 900);
  const rows = await run(`document.querySelectorAll('.profile-compare tbody tr').length`);
  return luciaFavs === 0 && rows === 3;
});

// ---------- Discovery Journal ----------
await check('Journal records viewed entries, map cards and districts', async () => {
  await go('#/wiki/businesses/fleeca', 1300);
  await go('#/map', 1500);
  await run(`const f = document.querySelector('.map-filter'); f.value = 'Fleeca'; f.dispatchEvent(new Event('input')); true`); await sleep(400);
  await openPin('.map-lists [data-marker]');
  await sleep(500);
  await go('#/journal', 900);
  const kinds = await run(`[...new Set([...document.querySelectorAll('.journal-kind')].map((k) => k.textContent))].join(', ')`);
  const districts = await run(`document.querySelectorAll('.journal-districts .chip').length`);
  await shot('journal');
  return /Viewed/.test(kinds) && /Explored district/.test(kinds) && districts > 0 ? `${kinds}; ${districts} district(s)` : false;
});
await check('Journal: notes, search, type filter and oldest-first order', async () => {
  await run(`const t = document.querySelector('#journal-text'); t.value = 'Come back at night for the vault'; document.querySelector('.journal-note button').click(); true`); await sleep(400);
  const note = await run(`document.querySelectorAll('.journal-item.t-note').length`);
  await run(`const q = document.querySelector('.journal-q'); q.value = 'zzzz-nothing'; q.dispatchEvent(new Event('input')); true`); await sleep(200);
  const none = await run(`!!document.querySelector('.journal-list .empty-note')`);
  await run(`const q = document.querySelector('.journal-q'); q.value = ''; q.dispatchEvent(new Event('input')); const s = document.querySelector('.journal-type'); s.value = 'note'; s.dispatchEvent(new Event('change')); true`); await sleep(200);
  const onlyNotes = await run(`[...document.querySelectorAll('.journal-item')].every((i) => i.classList.contains('t-note'))`);
  await run(`const s = document.querySelector('.journal-type'); s.value = ''; s.dispatchEvent(new Event('change')); const o = document.querySelector('.journal-order'); o.value = 'old'; o.dispatchEvent(new Event('change')); true`); await sleep(200);
  const times = await run(`JSON.stringify([...document.querySelectorAll('.journal-item time')].map((t) => Date.parse(t.getAttribute('datetime'))))`).then(JSON.parse);
  const ascending = times.every((t, i) => i === 0 || t >= times[i - 1]);
  return note === 1 && none && onlyNotes && ascending;
});
await check('Journal: clearing the history keeps notes, favourites and progress', async () => {
  const before = await user();
  await run(`document.querySelector('[data-clear-history]').click(); true`); await sleep(300);
  await run(`document.querySelector('dialog.confirm-dialog [data-ok]').click(); true`); await sleep(400);
  const after = await user();
  const left = (after.journal || []).map((e) => e.t);
  return left.length === 1 && left[0] === 'note' && JSON.stringify(after.favourites) === JSON.stringify(before.favourites) ? true : false;
});

// ---------- map intelligence ----------
await check('Overlays: density, place names, position certainty with a legend', async () => {
  await go('#/map', 1600);
  await run(`document.querySelector('[data-layers]').click(); true`); await sleep(200);
  for (const k of ['density', 'names', 'certainty']) { await run(`const c = document.querySelector('[data-overlay="${k}"]'); if (!c.checked) c.click(); true`); await sleep(250); }
  const cells = await run(`document.querySelectorAll('.density-cell').length`);
  const names = await run(`document.querySelectorAll('.place-label').length`);
  const places = await run(`state.wiki.map.places.length`);
  const legend = await run(`!document.querySelector('.map-legend').hidden && /approximate/i.test(document.querySelector('.map-legend').textContent)`);
  const cls = await run(`document.getElementById('leonida-map').classList.contains('show-certainty')`);
  await shot('overlays');
  const saved = (await settings())['map-overlays'] || '';
  return cells > 10 && names === places && legend && cls && /density/.test(saved) ? `${cells} density cells, ${names} names` : false;
});
await check('Opening a pin with related entries draws lines to them and lists them on its card', async () => {
  const i = await run(`(() => { const pins = mapPins(); const refs = new Set(pins.map((p) => p.ref).filter(Boolean));
    return pins.findIndex((p) => !p.hidden && (p.target?.entry.related || []).some((r) => { const t = resolve(r); const ref = t && t.section + '/' + t.entry.slug; return ref && ref !== p.ref && refs.has(ref); })); })()`);
  if (i < 0) throw new Error('no pin with related places in the data');
  const name = await run(`mapPins()[${i}].name`);
  await run(`const f = document.querySelector('.map-filter'); f.value = ${JSON.stringify(name)}; f.dispatchEvent(new Event('input')); true`); await sleep(400);
  await openPin(`.map-lists [data-marker="${i}"]`);
  const lines = await run(`document.querySelectorAll('.rel-line').length`);
  const listed = await run(`document.querySelectorAll('.leaflet-popup .map-card-related li').length`);
  const certainty = await run(`document.querySelector('.leaflet-popup .pin-certainty')?.textContent || ''`);
  return lines > 0 && listed > 0 && /approximate/i.test(certainty) ? `${name}: ${lines} line(s)` : false;
});
await check('Nearby-only filter narrows the lists to places near the open pin', async () => {
  await run(`const f = document.querySelector('.map-filter'); f.value = ''; f.dispatchEvent(new Event('input')); true`); await sleep(300);
  await run(`document.querySelector('[data-near-only]').click(); true`); await sleep(300);
  const text = await run(`document.querySelector('.map-count').textContent`);
  const n = Number(text.split(' ')[0]);
  await run(`const s = document.querySelector('[data-near-radius]'); s.value = 'large'; s.dispatchEvent(new Event('change', { bubbles: true })); true`); await sleep(300);
  const wider = Number((await run(`document.querySelector('.map-count').textContent`)).split(' ')[0]);
  await run(`document.querySelector('[data-near-only]').click(); const s = document.querySelector('[data-near-radius]'); s.value = 'medium'; s.dispatchEvent(new Event('change', { bubbles: true })); true`); await sleep(300);
  return /nearby/.test(text) && n > 0 && n < 900 && wider >= n ? `${n} close, ${wider} wide` : false;
});
await check('Clusters show which kinds of place they hold', async () => {
  await run(`document.querySelector('.leaflet-popup-close-button')?.click(); document.querySelector('[data-reset]').click(); true`);
  await waitFor(`!!document.querySelector('.pin-cluster')`);
  const ring = await run(`[...document.querySelectorAll('.pin-cluster span')].some((s) => /conic-gradient/.test(s.getAttribute('style')))`);
  const title = await run(`document.querySelector('.pin-cluster')?.getAttribute('title') || ''`);
  return ring && /\(.+\)/.test(title) ? title : false;
});
await check('Hover previews say how the position was found', async () => {
  await run(`document.querySelector('.leaflet-control-zoom-in').click(); true`); await sleep(500);
  await run(`document.querySelector('.leaflet-control-zoom-in').click(); true`); await sleep(700);
  await run(`(() => { const m = [...document.querySelectorAll('#leonida-map .pin-icon')].find((e) => e.getBoundingClientRect().width); m.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return true; })()`); await sleep(300);
  return run(`/Approximate/.test(document.querySelector('.leaflet-tooltip.pin-hover')?.textContent || '')`);
});

// ---------- immersive mode ----------
await check('Immersive mode hides the bars, floats the controls and lists nearby places; Esc leaves', async () => {
  await run(`document.querySelector('.map-tools [data-immersive]').click(); true`); await sleep(900);
  const on = await run(`document.body.classList.contains('map-immersive') && getComputedStyle(document.querySelector('.topbar')).display === 'none' && getComputedStyle(document.querySelector('.map-side')).display === 'none'`);
  const hud = await run(`!document.querySelector('.immersive-hud').hidden && document.querySelectorAll('.hud-near li').length > 0`);
  const full = await run(`Math.abs(document.getElementById('leonida-map').getBoundingClientRect().width - innerWidth) < 4`);
  await shot('immersive');
  if (await run(`!!document.querySelector('.hud-near [data-marker]')`)) await openPin('.hud-near [data-marker]');
  const card = await run(`!!document.querySelector('.leaflet-popup .map-card')`);
  await key('Escape'); await sleep(300); // closes the popup first if focused there
  if (await run(`document.body.classList.contains('map-immersive')`)) { await key('Escape'); await sleep(400); }
  const off = await run(`!document.body.classList.contains('map-immersive') && getComputedStyle(document.querySelector('.topbar')).display !== 'none'`);
  return on && hud && full && card && off;
});
await check('The address ?immersive=1 opens it, and leaving the page restores the top bar', async () => {
  await go('#/map?immersive=1', 1500);
  const on = await run(`document.body.classList.contains('map-immersive')`);
  await go('#/home', 600);
  const off = await run(`!document.body.classList.contains('map-immersive')`);
  return on && off;
});

// ---------- 3D ----------
await check('3D: route stops numbered, place names and the open pin labelled, without a font server', async () => {
  await go('#/map', 1600);
  for (const q of ['Fleeca Bank (Downtown)', 'Ascot Paragon']) {
    await run(`const f = document.querySelector('.map-filter'); f.value = '${q}'; f.dispatchEvent(new Event('input')); true`); await sleep(400);
    await openPin('.map-lists [data-marker]');
    await run(`document.querySelector('.leaflet-popup [data-act="route"]').click(); true`); await sleep(300);
  }
  await run(`document.querySelector('[data-view="3d"]').click(); true`);
  await waitFor(READY_3D, 30000);
  await waitFor(`document.querySelectorAll('.map3d-stop').length === 2 && document.querySelectorAll('.map3d-label[class*="place-"]').length > 10 && !!document.querySelector('.map3d-label.is-selected')`, 5000);
  const stops = await run(`document.querySelectorAll('.map3d-stop').length`);
  const names = await run(`document.querySelectorAll('.map3d-label[class*="place-"]').length`);
  const selected = await run(`!!document.querySelector('.map3d-label.is-selected')`);
  const glyphs = await run(`!!state.map3d.map.getStyle().glyphs`);
  const heat = await run(`state.map3d.map.getLayoutProperty('pin-heat', 'visibility')`);
  await shot('3d-labels');
  return stops === 2 && names > 10 && selected && !glyphs && heat === 'visible' ? `${stops} stops, ${names} names` : false;
});
await check('3D: the tilt button looks straight down and back; it hides in 2D', async () => {
  const shown = await run(`!document.querySelector('[data-tilt]').hidden`);
  await run(`document.querySelector('[data-tilt]').click(); true`);
  await waitFor(`state.map3d.map.getPitch() < 2 && !state.map3d.map.isMoving()`, 5000);
  const flat = await run(`state.map3d.map.getPitch()`);
  await run(`document.querySelector('[data-tilt]').click(); true`);
  await waitFor(`state.map3d.map.getPitch() > 40 && !state.map3d.map.isMoving()`, 5000);
  const tilted = await run(`state.map3d.map.getPitch()`);
  await run(`document.querySelector('[data-view="2d"]').click(); true`);
  await waitFor(`document.querySelector('[data-tilt]').hidden`, 5000);
  const hidden = await run(`document.querySelector('[data-tilt]').hidden`);
  return shown && flat < 2 && tilted > 40 && hidden ? `pitch ${flat.toFixed(0)} -> ${tilted.toFixed(0)}` : false;
});

// ---------- accessibility ----------
await check('Every control on the new pages and map tools has an accessible name', async () => {
  const missing = [];
  for (const page of ['#/map', '#/journal', '#/settings', '#/saved', '#/tracker', '#/progress']) {
    await go(page, 1100);
    const bad = await run(`JSON.stringify([...document.querySelectorAll('#view button, #view input, #view select, #view textarea')].filter((el) => {
      if (el.type === 'hidden' || el.closest('[hidden]')) return false;
      const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.textContent.trim() || el.title;
      return !named;
    }).map((el) => el.outerHTML.slice(0, 80)))`).then(JSON.parse);
    bad.forEach((b) => missing.push(`${page}: ${b}`));
  }
  if (missing.length) throw new Error(missing.slice(0, 4).join(' | '));
  return true;
});
await check('Keyboard focus is visible on the map tools', async () => {
  await go('#/map', 1300);
  await run(`document.querySelector('.map-tools [data-view="2d"]').focus(); true`);
  let found = false;
  for (let i = 0; i < 80 && !found; i++) {
    await key('Tab'); await sleep(30);
    found = await run(`document.activeElement?.matches('.map-tools [data-layers]')`);
  }
  if (!found) throw new Error('Tab never reached the overlays button');
  // A focus ring is an outline or a box-shadow ring; either must be there.
  const style = await run(`(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' ? 'outline ' + s.outlineWidth : s.boxShadow !== 'none' ? 'ring ' + s.boxShadow : 'none'; })()`);
  return style !== 'none' ? style : false;
});
// ---------- organisation: grouped lists, jump bars, cross-links between entries ----------
await check('Entry text links the people, places, businesses and gangs it names, once each', async () => {
  // The page and many of the places it names are post-launch spoilers: show them for this check.
  await run(`setSpoilers(true); true`);
  await go('#/wiki/gameplay/gang-operations', 1200);
  const links = await run(`[...document.querySelectorAll('#view article p a')].map((a) => a.getAttribute('href'))`);
  await run(`setSpoilers(false); true`);
  const kinds = ['#/wiki/factions/', '#/wiki/businesses/', '#/locations/'].filter((k) => links.some((h) => h.startsWith(k)));
  const once = new Set(links).size === links.length;
  return kinds.length === 3 && once ? `${links.length} links` : false;
});

await check('News runs newest first wherever it is listed (it comes from several files)', async () => {
  const dates = await run(`state.wiki.news.map((n) => n.date || '')`);
  const sorted = dates.every((d, i) => i === 0 || !d || dates[i - 1] >= d);
  const newest = [...dates].filter(Boolean).sort().pop();
  return sorted && dates[0] === newest ? `newest ${newest}` : false;
});

await check('Intel: the timeline is grouped (month, week or day) with a jump bar, and no item is lost', async () => {
  await go('#/intel', 1300);
  return run(`(() => {
    const groups = [...document.querySelectorAll('.tl-group')];
    const counted = groups.reduce((n, g) => n + Number(g.querySelector('.type-count').textContent), 0);
    const items = document.querySelectorAll('.tl-group .timeline > li').length;
    const chips = document.querySelectorAll('.tl-jump [data-tl]').length;
    return groups.length > 1 && counted === items && items === state.wiki.news.length && chips === groups.length
      ? groups.length + ' groups, ' + items + ' items' : false;
  })()`);
});

await check('Missions: a chapter jump bar, one button per chapter, scrolls to that chapter', async () => {
  await go('#/wiki/missions', 1300);
  const n = await run(`document.querySelectorAll('.story-jump [data-story-ch]').length === document.querySelectorAll('.story-chapter').length ? document.querySelectorAll('.story-chapter').length : 0`);
  if (n < 2) return false;
  await run(`document.querySelector('.story-jump [data-story-ch="${n - 1}"]').click(); true`); await sleep(1200);
  const top = await run(`Math.round(document.getElementById('story-ch-${n - 1}').getBoundingClientRect().top)`);
  return top < 400 ? `${n} chapters` : false;
});

await check('Grouped views (by manufacturer, grade, lead, county and habitat) list every entry under a heading', async () => {
  const grouped = async (hash, key) => {
    await go(hash, 1200);
    return run(`(() => {
      const select = document.querySelector('.list-sort select');
      if (![...select.options].some((o) => o.value === '${key}')) return null;
      select.value = '${key}'; select.dispatchEvent(new Event('change', { bubbles: true }));
      return new Promise((r) => setTimeout(() => r([...document.querySelectorAll('.type-group .hub-title')]
        .map((h) => [h.firstChild.textContent.trim(), Number(h.querySelector('.type-count').textContent)])), 400));
    })()`);
  };
  const makers = await grouped('#/vehicles', 'maker');
  const grades = await grouped('#/wiki/achievements', 'grade');
  const vehicles = await run('state.wiki.vehicles.length');
  const achievements = await run('state.wiki.achievements.length');
  const sum = (g) => g.reduce((n, [, c]) => n + c, 0);
  const order = grades?.map(([t]) => t).filter((t) => ['Platinum', 'Gold', 'Silver', 'Bronze'].includes(t)).join(',');
  if (!makers || !grades) throw new Error('a grouped view is missing from the sort menu');
  if (sum(makers) !== vehicles || sum(grades) !== achievements) throw new Error(`counted ${sum(makers)}/${vehicles} vehicles, ${sum(grades)}/${achievements} achievements`);
  if (order !== 'Platinum,Gold,Silver,Bronze' || makers.at(-1)[0] !== 'Other or unlisted makers') return false;
  // Missions by lead, and businesses by county: every entry once, the unlisted group last.
  const leads = await grouped('#/wiki/missions', 'lead');
  const counties = await grouped('#/wiki/businesses', 'county');
  if (!leads || !counties) throw new Error('"By lead" or "By county" is missing');
  const habitats = await grouped('#/wiki/wildlife', 'habitat');
  if (!habitats) throw new Error('"By habitat" is missing');
  if (sum(leads) !== await run('state.wiki.missions.length') || sum(counties) !== await run('state.wiki.businesses.length')
    || sum(habitats) !== await run('state.wiki.wildlife.length')) throw new Error('a lead, county or habitat group lost entries');
  return leads[0][0] === 'Jason' && counties.at(-1)[0] === 'Place not listed' ? `${makers.length} makers, ${counties.length} county groups` : false;
});

await check('Characters and missions link both ways (Missions from, and the giver on a mission)', async () => {
  const pair = await run(`(() => {
    for (const c of state.wiki.characters) {
      // Spoiler pages stay blurred in this suite, but their links are still on the page, under the veil.
      const re = giverName(c);
      const m = re && state.wiki.missions.find((x) => typeof x.facts?.giver === 'string' && re.test(x.facts.giver));
      if (m) return [c.slug, m.slug];
    }
    return null;
  })()`);
  if (!pair) throw new Error('no character with a linked mission found');
  await go(`#/characters/${pair[0]}`, 1200);
  const listed = await run(`!!document.querySelector('.char-missions a[href$="/${pair[1]}"]')`);
  await go(`#/wiki/missions/${pair[1]}`, 1200);
  const back = await run(`!!document.querySelector('.fact-table a[href="#/characters/${pair[0]}"]')`);
  if (!listed || !back) throw new Error(`${pair.join(' / ')}: listed on the character page ${listed}, giver linked back ${back}`);
  return pair.join(' <-> ');
});

await check('Place pages: "Missions here", and a collectible family opens the tracker with the same count', async () => {
  const slug = await run(`(state.wiki.locations.find((l) => !isHidden('locations', l) && missionsHere(l) && /Collectibles here/.test(placeContents(l))) || {}).slug`);
  if (!slug) return false;
  await go(`#/locations/${slug}`, 1300);
  const chip = await run(`(() => {
    const a = [...document.querySelectorAll('.maker-more')].find((s) => /Collectibles here/.test(s.textContent))?.querySelector('a');
    return a ? [a.getAttribute('href'), Number(a.querySelector('.chip-count').textContent)] : null;
  })()`);
  const missions = await run(`[...document.querySelectorAll('.maker-more h2, .maker-more h3')].some((h) => /Missions here/.test(h.textContent))`);
  if (!chip || !missions || !chip[0].includes('place=')) return false;
  await go(chip[0], 1300);
  const rows = await run(`document.querySelectorAll('.tracker-list li').length`);
  return rows === chip[1] ? `${slug}: ${rows} in the tracker` : false;
});

await check('Search filters show counts that add up, and pressing one keeps focus', async () => {
  await go('#/search?q=vice', 1500);
  const sums = await run(`(() => {
    const n = (b) => Number(b.querySelector('.chip-count').textContent);
    const buttons = [...document.querySelectorAll('#search-filter [data-section]')];
    return [n(buttons[0]), buttons.slice(1).reduce((s, b) => s + n(b), 0)];
  })()`);
  // Sections with nothing for the search drop out of the row.
  const emptyHidden = await run(`[...document.querySelectorAll('#search-filter [data-section]')].slice(1).every((b) => (Number(b.querySelector('.chip-count').textContent) === 0) === b.hidden)`);
  if (!emptyHidden) throw new Error('a filter with no results is still shown, or one with results is hidden');
  await run(`(() => { const b = document.querySelector('#search-filter [data-section="vehicles"]'); b.focus(); b.click(); })(); true`); await sleep(1200);
  const kept = await run(`document.activeElement?.dataset.section === 'vehicles' && document.activeElement.getAttribute('aria-pressed') === 'true'`);
  return sums[0] > 0 && sums[0] === sums[1] && kept ? `${sums[0]} results` : false;
});

await check('Map panel: groups list their kinds with found counts; a kind opens its places, hides from the map, and the 100% filter narrows', async () => {
  await go('#/map', 2500);
  const kinds = await run(`document.querySelectorAll('.map-kind').length`);
  const listedAtStart = await run(`document.querySelectorAll('.map-lists [data-marker]').length`);
  const counts = await run(`[...document.querySelectorAll('.map-kind-n')].every((n) => /^[0-9]+([/][0-9]+)?$/.test(n.textContent.trim()))`);
  const key = 'crime::Gang Operations';
  await run(`document.querySelector('[data-kind-open="${key}"]').click(); true`); await sleep(300);
  const listed = await run(`document.querySelectorAll('.map-kind[data-kind="${key}"] [data-marker]').length`);
  await run(`document.querySelector('[data-kind-toggle="${key}"]').click(); true`); await sleep(300);
  const hidden = await run(`document.querySelectorAll('.leaflet-marker-icon.is-filtered').length`);
  await run(`document.querySelector('[data-kind-toggle="${key}"]').click(); document.querySelector('[data-kind-open="${key}"]').click(); true`); await sleep(300);
  await run(`document.querySelector('[data-hundred]').click(); true`); await sleep(300);
  const only = await run(`document.querySelector('.map-count').textContent`);
  await run(`document.querySelector('[data-hundred]').click(); true`); await sleep(300);
  await run(`document.querySelector('[data-fold="food"]').click(); true`); await sleep(300);
  const folded = await run(`document.querySelector('.map-group[data-category="food"]').classList.contains('is-folded')`);
  await run(`document.querySelector('[data-fold="food"]').click(); true`); await sleep(300);
  await run(`(() => { const s = document.querySelector('.map-filter'); s.value = 'bank'; s.dispatchEvent(new Event('input', { bubbles: true })); })(); true`); await sleep(800);
  const held = await run(`document.querySelectorAll('.map-group.is-folded').length === 0 && [...document.querySelectorAll('.map-fold')].every((b) => b.disabled) && document.querySelectorAll('.map-lists [data-marker]').length > 0`);
  await run(`(() => { const s = document.querySelector('.map-filter'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })(); true`); await sleep(500);
  return kinds > 20 && listedAtStart === 0 && counts && listed === 40 && hidden >= 40 && /100% objectives only/.test(only) && folded && held ? `${kinds} kinds, ${listed} gang operations, "${only}"` : false;
});

await check('Routes: a planned run is drawn along the roads (routing grid), not as straight lines', async () => {
  await go('#/map', 2500);
  await run(`(() => { const plan = document.querySelector('.heist-plan'); plan.open = true; plan.querySelector('[data-plan-type]').value = 'big-banks'; plan.querySelector('[data-plan-go]').click(); })(); true`);
  const drawn = await waitFor(`document.querySelectorAll('path.route-road, path.route-water').length > 0 && document.querySelectorAll('.map-route li').length`, 10000);
  if (!drawn) throw new Error('no routed legs were drawn');
  // Each leg runs along several bends of road, so the run has far more points than stops.
  const shape = await run(`(() => {
    const stops = document.querySelectorAll('.map-route li').length;
    const bends = [...document.querySelectorAll('path.route-road, path.route-water')].reduce((n, p) => n + (p.getAttribute('d').match(/L/g) || []).length, 0);
    return [stops, bends];
  })()`);
  await run(`document.querySelector('[data-stop-clear]')?.click(); true`); await sleep(300);
  return shape[1] > shape[0] * 2 ? `${shape[0]} stops, ${shape[1]} bends` : false;
});

await check('Phone width: no sideways scrolling on the journal, settings, progress and immersive map (light theme)', async () => {
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const wide = [];
  for (const page of ['#/journal', '#/settings', '#/progress', '#/saved', '#/map?immersive=1']) {
    await go(page, 1300);
    const over = await run(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    if (over > 2) wide.push(`${page} +${over}px`);
  }
  await shot('phone-immersive');
  await go('#/home', 500);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (wide.length) throw new Error(wide.join(', '));
  return true;
});

// Put the look back, so the next run (and the other test) starts from the original theme.
await go('#/settings', 900);
await run(`document.querySelector('[data-reset="prefs"]').click(); true`); await sleep(400);
await check('Resetting settings brings back the Vice City look', async () => run(`!document.documentElement.dataset.theme && !document.documentElement.dataset.density && getComputedStyle(document.documentElement).getPropertyValue('--panel-solid').trim() === '100%'`));

await check('No script errors, console errors or failed requests', async () => {
  if (problems.length) throw new Error(problems.slice(0, 5).join(' | '));
  return true;
});

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
ws.close();
process.exit(failed ? 1 : 0);

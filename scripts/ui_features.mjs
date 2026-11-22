// Feature test for the map, Street Explorer and the reader's own pages, in a real browser.
//
//   1. Start the app on a spare port with throwaway settings, e.g. (PowerShell):
//        $env:GTA6_HQ_SETTINGS="$env:TEMP\hq-test\settings.json"; $env:GTA6_HQ_USERDATA="$env:TEMP\hq-test\userdata.json"
//        .\target\release\gta6-hq.exe --serve --port 4655
//   2. Start Edge or Chrome headless with a debugging port:
//        msedge --headless=new --remote-debugging-port=9340 --user-data-dir=%TEMP%\hq-test\browser about:blank
//   3. node scripts/ui_features.mjs 9340 4655 [screenshot folder]
//
// The suite resets the app's saved data and settings itself when it starts (scripts/suite_data.mjs),
// so it can be run again straight away. That erases them: never point it at an app using real files.
// It starts as a first opening would, and checks the intro and the spoiler notice.
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
    console.log(`      (script error during the check above or below: ${why.split(/\n/).slice(0, 9).join(' | ')})`);
  }
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') problems.push(`console: ${d.params.args.map((a) => a.value || a.description).join(' ')}`);
  if (d.method === 'Network.loadingFailed' && !d.params.canceled) problems.push(`request failed: ${d.params.errorText}`);
  if (d.method === 'Network.responseReceived' && d.params.response.status >= 400 && d.params.response.url.startsWith(base)) problems.push(`HTTP ${d.params.response.status}: ${d.params.response.url}`);
};
await call('Runtime.enable');
await call('Network.enable');
await call('Page.enable');
const run = async (expression) => {
  // Each check runs in its own block, so names declared in one do not clash with the next.
  const r = await call('Runtime.evaluate', { expression: `{
${expression}
}`, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
const mouse = (type, x, y) => call('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = (k, code = k) => call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: { ArrowDown: 40, Enter: 13, Escape: 27, ArrowRight: 39, Home: 36 }[k] || 0 })
  .then(() => call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }));
const shot = async (name) => { if (!shots) return; const s = await call('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); writeFileSync(`${shots}/${name}.jpg`, Buffer.from(s.data, 'base64')); };
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

await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
// Start from nothing saved, as a first opening would: the suite clears its own saved data and settings
// through the app's API (see suite_data.mjs), so it can be run again without deleting files by hand.
try {
  const cleared = await resetSaved(base, { firstLaunch: true });
  console.log(`      (reset: ${cleared.parts} saved part(s) removed, ${cleared.settings} setting(s) put back)`);
} catch (error) { console.error(`Could not reset the saved data: ${error.message}`); process.exit(2); }
// Through a blank page: if the tab is still on the app (an earlier run), a new hash alone would not reload it.
await call('Page.navigate', { url: 'about:blank' });
await call('Page.navigate', { url: `${base}/#/home` });
// The intro has finished (or been skipped) and the app behind it has its data.
const ARRIVED = `typeof state !== 'undefined' && !!state.wiki && !document.getElementById('splash')`;
const skipIntro = async () => {
  await waitFor(`typeof state !== 'undefined' && !!state.wiki`, 20000);
  await run(`document.getElementById('splash-skip')?.click(); true`);
  return waitFor(ARRIVED, 10000);
};

// ---------- first launch ----------
await check('First launch: after the intro the spoiler notice asks once, and the answer is saved', async () => {
  // A person can skip the intro; the notice must still follow it, with spoilers off unless ticked.
  if (!(await skipIntro())) throw new Error('the intro never gave way to the app');
  const asked = await waitFor(`!!document.querySelector('dialog.spoiler-ask[open]')`, 5000);
  if (!asked) throw new Error('no spoiler notice on a first opening');
  const title = await run(`document.querySelector('dialog.spoiler-ask h2')?.textContent || ''`);
  const unticked = await run(`!document.querySelector('dialog.spoiler-ask input[type="checkbox"]').checked`);
  await shot('first-launch-spoiler-notice');
  await run(`document.querySelector('dialog.spoiler-ask form button').click(); true`);
  const closed = await waitFor(`!document.querySelector('dialog.spoiler-ask')`, 5000);
  const saved = await waitFor(`fetch('/api/settings').then((r) => r.json()).then((s) => s['spoiler-notice'] === '1' && s['show-spoilers'] === '0')`, 5000);
  const blurred = await run(`showSpoilers === false`);
  // The next opening does not ask again.
  await call('Page.reload', { ignoreCache: true });
  if (!(await skipIntro())) throw new Error('the intro never gave way to the app on the second opening');
  await sleep(800);
  const again = await run(`!!document.querySelector('dialog.spoiler-ask')`);
  if (!/spoiler/i.test(title)) throw new Error(`unexpected notice title "${title}"`);
  return unticked && closed && saved && blurred && !again ? 'asked once; spoilers hidden; not asked again' : false;
});
// Whatever happened above, the rest of the suite starts with the notice answered and the app open.
await resetSaved(base);
await call('Page.reload', { ignoreCache: true });
await skipIntro();
await run(`document.getElementById('splash')?.remove(); document.querySelector('dialog.spoiler-ask')?.remove(); document.body.classList.remove('is-loading'); location.hash = '#/home'; true`);
await sleep(600);
await go('#/map', 0);
await waitFor(`document.querySelectorAll('#leonida-map .leaflet-marker-icon').length > 20 && !!document.querySelector('#leonida-map .leaflet-image-layer')`, 15000);

// ---------- 2D map ----------
await check('2D map draws the official map and its pins', async () => {
  const n = await run(`document.querySelectorAll('#leonida-map .leaflet-marker-icon').length`);
  const img = await run(`!!document.querySelector('#leonida-map .leaflet-image-layer')`);
  return n > 20 && img ? `${n} markers on screen` : false;
});
await check('Pins gather into counted clusters when zoomed out', async () => {
  const n = await run(`document.querySelectorAll('.pin-cluster').length`);
  return n > 0 ? `${n} clusters` : false;
});
await check('Zooming in breaks clusters back into pins', async () => {
  await run(`document.querySelector('.leaflet-control-zoom-in').click(); true`); await sleep(500);
  await run(`document.querySelector('.leaflet-control-zoom-in').click(); true`); await sleep(700);
  const c = await run(`document.querySelectorAll('.pin-cluster').length`);
  const clustered = await run(`document.getElementById('leonida-map').classList.contains('is-clustered')`);
  return c === 0 && !clustered;
});
await check('Hovering a pin shows its preview', async () => {
  await run(`(() => { const m = [...document.querySelectorAll('#leonida-map .pin-icon')].find((e) => e.getBoundingClientRect().width); m.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); return true; })()`);
  await sleep(300);
  return run(`!!document.querySelector('.leaflet-tooltip.pin-hover')`);
});
await check('Text filter narrows the list and hides other pins on the map', async () => {
  await run(`const f = document.querySelector('.map-filter'); f.value = 'Fleeca'; f.dispatchEvent(new Event('input')); true`);
  await sleep(500);
  const count = await run(`document.querySelector('.map-count').textContent`);
  const hidden = await run(`document.querySelectorAll('.leaflet-marker-icon.is-filtered').length`);
  return /of/.test(count) && hidden > 0 ? `${count}, ${hidden} hidden` : false;
});
await check('Clear filter brings every pin back', async () => {
  await run(`document.querySelector('[data-clear]').click(); true`); await sleep(300);
  return run(`document.querySelectorAll('.leaflet-marker-icon.is-filtered').length === 0`);
});
await check('Hide all / Show all switch every category', async () => {
  await run(`document.querySelector('[data-all="off"]').click(); true`); await sleep(300);
  const none = await run(`[...document.querySelectorAll('[data-toggle]')].every((c) => !c.checked)`);
  await run(`document.querySelector('[data-all="on"]').click(); true`); await sleep(300);
  const all = await run(`[...document.querySelectorAll('[data-toggle]')].every((c) => c.checked)`);
  return none && all;
});
await check('Choosing a place flies to it and opens its card with actions and nearby places', async () => {
  await run(`const f = document.querySelector('.map-filter'); f.value = 'Fleeca Bank (Downtown)'; f.dispatchEvent(new Event('input')); true`); await sleep(400);
  await openPin('[data-marker]');
  const acts = await run(`document.querySelectorAll('.leaflet-popup .map-card [data-act]').length`);
  const near = await run(`document.querySelectorAll('.leaflet-popup .map-card-near li').length`);
  await shot('card-2d');
  return acts >= 5 ? `${acts} actions, ${near} nearby` : false;
});
await check('Favourite on a card is saved', async () => {
  await run(`document.querySelector('.leaflet-popup [data-act="fav"]').click(); true`); await sleep(500);
  const u = await user();
  return (u.favourites || []).length === 1;
});
await check('Mark discovered on a card is saved', async () => {
  await run(`document.querySelector('.leaflet-popup [data-act="found"]').click(); true`); await sleep(500);
  return ((await user()).discovered || []).length === 1;
});
await check('Route planner: two stops, reorder, save', async () => {
  await run(`document.querySelector('.leaflet-popup [data-act="route"]').click(); true`); await sleep(200);
  await openPin('.leaflet-popup [data-act="go"]');
  await run(`document.querySelector('.leaflet-popup [data-act="route"]').click(); true`); await sleep(300);
  const stops = await run(`document.querySelectorAll('.map-route li').length`);
  const first = await run(`document.querySelector('.map-route .route-name').textContent`);
  await run(`document.querySelector('[data-stop-down="0"]').click(); true`); await sleep(200);
  const swapped = await run(`document.querySelector('.map-route .route-name').textContent`);
  const line = await run(`!!document.querySelector('#leonida-map path.leaflet-interactive, #leonida-map svg path')`);
  await run(`const f = document.querySelector('.route-save'); f.elements.name.value = 'Test route'; f.requestSubmit(); true`); await sleep(500);
  const saved = (await user()).routes || [];
  return stops === 2 && first !== swapped && line && saved.length === 1 ? `${stops} stops, saved "${saved[0].name}"` : false;
});
await check('Save view stores the camera', async () => {
  await run(`document.querySelector('[data-saveview]').click(); true`); await sleep(500);
  return ((await user())['map-views'] || []).length === 1;
});
await check('Reset view returns to the whole map', async () => {
  await run(`document.querySelector('[data-reset]').click(); true`);
  await waitFor(`!!document.querySelector('.pin-cluster')`);
  return run(`!!document.querySelector('.pin-cluster')`);
});

// ---------- 3D ----------
await check('3D map loads MapLibre and draws', async () => {
  await run(`document.querySelector('[data-view="3d"]').click(); true`);
  await waitFor(READY_3D, 30000);
  const canvas = await run(`!!document.querySelector('.map3d canvas')`);
  const loading = await run(`!!document.querySelector('.map3d-loading')`);
  await shot('map-3d');
  return canvas && !loading;
});
await check('Choosing a place in 3D highlights it and opens its card', async () => {
  await run(`const f = document.querySelector('.map-filter'); f.value = 'Fleeca Bank (Downtown)'; f.dispatchEvent(new Event('input')); true`); await sleep(400);
  await openPin('[data-marker]', '.map3d-popup');
  await shot('card-3d');
  return run(`!!document.querySelector('.map3d-popup .map-card [data-act]')`);
});
await check('Switching back to 2D keeps the chosen place open', async () => {
  await run(`document.querySelector('[data-view="2d"]').click(); true`);
  await waitFor(`/Fleeca Bank \\(Downtown\\)/.test(document.querySelector('.leaflet-popup .map-card h3')?.textContent || '')`);
  const title = await run(`document.querySelector('.leaflet-popup .map-card h3')?.textContent || ''`);
  return /Fleeca Bank \(Downtown\)/.test(title) ? title : false;
});

// ---------- Street Explorer ----------
await check('Dragging the walker onto the 2D map opens Street Explorer', async () => {
  await run(`document.querySelector('.leaflet-popup-close-button')?.click(); true`);
  await sleep(300);
  await run(`window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click']) document.addEventListener(t, (e) => window.__ev.push(t + ':' + (e.target.className || e.target.tagName)), true); true`);
  const w = JSON.parse(await run(`JSON.stringify(document.querySelector('[data-walker]').getBoundingClientRect())`));
  const sx = w.x + w.width / 2, sy = w.y + w.height / 2;
  await mouse('mousePressed', sx, sy);
  for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', sx - k * 50, sy - k * 32); await sleep(30); }
  await mouse('mouseReleased', sx - 500, sy - 320);
  await waitFor(`document.querySelector('.sv-where')?.textContent`);
  await shot('street');
  const where = await run(`document.querySelector('.sv-where')?.textContent || ''`);
  if (!where) throw new Error(`no Street Explorer; events: ${await run('JSON.stringify(window.__ev.slice(-6))')}`);
  return where;
});
await check('Street Explorer: next, thumbnail, back to start, keyboard', async () => {
  const first = await run(`document.querySelector('.sv-photo img').getAttribute('src')`);
  await run(`document.querySelector('.sv-next').click(); true`); await sleep(400);
  const second = await run(`document.querySelector('.sv-photo img').getAttribute('src')`);
  await run(`document.querySelector('[data-go="3"]').click(); true`); await sleep(400);
  const third = await run(`document.querySelector('.sv-strip .is-on')?.dataset.go`);
  await key('Home'); await sleep(300);
  const back = await run(`document.querySelector('.sv-photo img').getAttribute('src')`);
  await key('ArrowRight'); await sleep(300);
  const arrow = await run(`document.querySelector('.sv-photo img').getAttribute('src')`);
  return first !== second && third === '3' && back === first && arrow === second;
});
await check('Street Explorer: precision label and mini-map', async () => {
  const caption = await run(`document.querySelector('.sv-caption').textContent`);
  const mini = await run(`!!document.querySelector('.sv-mini').style.backgroundImage`);
  return /(Exact|Approximate)/.test(caption) && mini ? caption.match(/(Exact|Approximate)[^·]*/)[0].trim() : false;
});
await check('Street Explorer: switch character and save the spot', async () => {
  // Two portrait badges; the one walking is checked (pink ring). Press the other one.
  const before = await run(`document.querySelector('.sv-badge[aria-checked="true"]').dataset.who`);
  await run(`document.querySelector('.sv-badge[aria-checked="false"]').click(); true`); await sleep(200);
  const after = await run(`document.querySelector('.sv-badge[aria-checked="true"]').dataset.who`);
  await run(`document.querySelector('[data-save]').click(); true`); await sleep(500);
  const starts = (await user())['street-starts'] || [];
  return before !== after && starts.length === 1 ? `${before} -> ${after}` : false;
});
await check('Escape closes Street Explorer', async () => {
  await key('Escape'); await sleep(300);
  return run(`!document.querySelector('.sv')`);
});
await check('Press-then-click places the walker', async () => {
  await run(`document.querySelector('[data-walker]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 })); document.querySelector('[data-walker]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 })); true`);
  await sleep(200);
  const armed = await run(`document.querySelector('.map-wrap').classList.contains('is-armed')`);
  const r = JSON.parse(await run(`JSON.stringify(document.getElementById('leonida-map').getBoundingClientRect())`));
  await mouse('mousePressed', r.x + r.width * 0.55, r.y + r.height * 0.5);
  await mouse('mouseReleased', r.x + r.width * 0.55, r.y + r.height * 0.5);
  await sleep(1200);
  const open = await run(`!!document.querySelector('.sv')`);
  await key('Escape'); await sleep(200);
  return armed && open;
});
await check('Dragging the walker onto the 3D map opens Street Explorer', async () => {
  await run(`document.querySelector('[data-view="3d"]').click(); true`);
  await waitFor(READY_3D, 30000);
  const w = JSON.parse(await run(`JSON.stringify(document.querySelector('[data-walker]').getBoundingClientRect())`));
  const sx = w.x + w.width / 2, sy = w.y + w.height / 2;
  await mouse('mousePressed', sx, sy);
  for (let k = 1; k <= 10; k++) { await mouse('mouseMoved', sx - k * 50, sy - k * 32); await sleep(30); }
  await mouse('mouseReleased', sx - 500, sy - 320);
  await waitFor(`document.querySelector('.sv-where')?.textContent`);
  const where = await run(`document.querySelector('.sv-where')?.textContent || ''`);
  await key('Escape'); await sleep(200);
  await run(`document.querySelector('[data-view="2d"]').click(); true`);
  return where || false;
});

// ---------- entry pages ----------
await check('Entry page has actions and nearby places', async () => {
  await go('#/wiki/businesses/fleeca', 1500);
  const acts = await run(`document.querySelectorAll('.entry-acts .chip-btn').length`);
  const near = await run(`document.querySelectorAll('.entry-near li').length`);
  await shot('entry');
  return acts >= 3 ? `${acts} actions, ${near} nearby` : false;
});
await check('Collections: add from an entry page', async () => {
  await run(`document.querySelector('[data-entry-act="collect"]').click(); true`); await sleep(300);
  await run(`const d = document.querySelector('dialog.picker'); d.querySelector('input[name="name"]').value = 'Banks to rob'; d.querySelector('[data-make]').click(); true`); await sleep(400);
  await run(`document.querySelector('dialog.picker').close(); true`);
  const cols = (await user()).collections || [];
  return cols.length === 1 && cols[0].items.length === 1 ? cols[0].name : false;
});

// ---------- Saved ----------
await check('Saved page lists favourites, collections, routes, views and spots', async () => {
  await go('#/saved', 1200);
  const groups = await run(`[...document.querySelectorAll('.saved-group h2')].map((h) => h.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')`);
  await shot('saved');
  return /Favourites 1/.test(groups) && /Collections 1/.test(groups) && /Routes 1/.test(groups) && /Map views 1/.test(groups) && /Street Explorer spots 1/.test(groups) ? groups : false;
});
await check('Saved: notes are kept and search filters', async () => {
  await run(`const t = document.querySelector('.col-notes'); t.value = 'Do these at night'; t.dispatchEvent(new Event('change', { bubbles: true })); true`); await sleep(400);
  const notes = ((await user()).collections || [])[0]?.notes;
  await run(`const f = document.querySelector('.saved-filter'); f.value = 'zzzz'; f.dispatchEvent(new Event('input')); true`); await sleep(200);
  const filtered = await run(`document.querySelectorAll('.saved-item').length`);
  return notes === 'Do these at night' && filtered === 0;
});
await check('A saved route reopens on the map', async () => {
  const r = ((await user()).routes || [])[0];
  await go(`#/map?route=${r.id}`, 0);
  await waitFor(`document.querySelectorAll('.map-route li').length === ${r.stops.length}`);
  // The page starts its flight to the route 300 ms after it opens; leaving before then makes that
  // flight run on a map that is already gone (a script error the last check would report).
  await sleep(400);
  return run(`document.querySelectorAll('.map-route li').length === ${r.stops.length}`);
});

// ---------- Collectible Tracker and Progress ----------
await check('Collectible Tracker lists items and ticks them', async () => {
  await go('#/tracker', 0);
  await waitFor(`document.querySelectorAll('[data-tick]').length > 500`);
  const items = await run(`document.querySelectorAll('[data-tick]').length`);
  await run(`const c = document.querySelector('[data-tick]'); c.click(); true`);
  await waitFor(`/^1 of/.test(document.querySelector('.tracker-summary b')?.textContent || '')`, 5000);
  const summary = await run(`document.querySelector('.tracker-summary b').textContent`);
  await shot('tracker');
  return items > 500 && /^1 of/.test(summary) ? `${items} items, ${summary}` : false;
});
await check('Tracker filters: family and "found" only', async () => {
  await run(`const s = document.querySelector('.tracker-show'); s.value = 'done'; s.dispatchEvent(new Event('change', { bubbles: true })); true`); await sleep(300);
  const shown = await run(`document.querySelectorAll('[data-tick]').length`);
  return shown === 1;
});
await check('Progress counts what was ticked and discovered', async () => {
  await go('#/progress', 1200);
  const text = await run(`document.querySelector('.stat-grid').textContent.replace(/\\s+/g, ' ')`);
  await shot('progress');
  return /1 \/ \d+\s*Collectibles ticked/.test(text) && /1 \/ \d+\s*Locations and businesses discovered/.test(text) ? text.slice(0, 80) : false;
});
await check('100% Guide checklist ticks are saved in user data', async () => {
  await go('#/manual/g100-route/13', 1800);
  await run(`document.querySelector('input[data-check]').click(); true`); await sleep(400);
  return Object.keys((await user())['guide-checks'] || {}).length === 1;
});

// ---------- Settings ----------
await check('Settings: map mode and walker are saved and used', async () => {
  await go('#/settings', 1000);
  await run(`document.querySelector('input[name="walker"][value="lucia"]').click(); true`); await sleep(300);
  const saved = await run(`fetch('/api/settings').then((r) => r.json()).then((s) => s.walker)`);
  await go('#/map', 1500);
  const src = await run(`document.querySelector('[data-walker] img').getAttribute('src')`);
  return saved === 'lucia' && /lucia/.test(src);
});
await check('Settings: reduced motion switches the whole app', async () => {
  await go('#/settings', 900);
  await run(`document.querySelector('input[name="reduced-motion"]').click(); true`); await sleep(300);
  const on = await run(`document.body.classList.contains('reduce-motion')`);
  await run(`document.querySelector('input[name="reduced-motion"]').click(); true`); await sleep(300);
  const off = await run(`!document.body.classList.contains('reduce-motion')`);
  return on && off;
});
await check('Settings: reset progress asks first, then clears', async () => {
  // The app asks in its own dialog: Cancel keeps everything, then the red button resets.
  await run(`document.querySelector('[data-reset="progress"]').click(); true`); await sleep(300);
  const asked = await run(`!!document.querySelector('dialog.confirm-dialog[open]')`);
  await run(`document.querySelector('dialog.confirm-dialog [data-cancel]').click(); true`); await sleep(300);
  const kept = Object.keys((await user())['collectible-ticks'] || {}).length;
  await run(`document.querySelector('[data-reset="progress"]').click(); true`); await sleep(300);
  await run(`document.querySelector('dialog.confirm-dialog [data-ok]').click(); true`); await sleep(500);
  if (!asked) throw new Error('no confirmation dialog was shown');
  const u = await user();
  return kept === 1 && !u['collectible-ticks'] && !u.discovered && !u['guide-checks'];
});

// ---------- top bar ----------
await check('Search suggestions: type, arrow down, Enter opens the entry', async () => {
  await go('#/home', 800);
  await run(`const i = document.querySelector('#nav-search input'); i.focus(); i.value = 'fleeca'; i.dispatchEvent(new Event('input')); true`); await sleep(300);
  const n = await run(`document.querySelectorAll('#suggest-list [role="option"]').length`);
  await key('ArrowDown'); await key('Enter'); await sleep(1200);
  const page = await run(`location.hash`);
  const recent = (await user()).searches || [];
  return n > 1 && page.startsWith('#/wiki/') && recent[0] === 'fleeca' ? `${n} suggestions -> ${page}` : false;
});
await check('Recent searches show on an empty box and can be cleared', async () => {
  await run(`const i = document.querySelector('#nav-search input'); i.value = ''; i.focus(); i.dispatchEvent(new Event('focus')); true`); await sleep(300);
  const recent = await run(`[...document.querySelectorAll('#suggest-list em')].some((e) => e.textContent === 'Recent search')`);
  await run(`document.querySelector('[data-clear-recent]').click(); true`); await sleep(400);
  return recent && !((await user()).searches);
});
await check('"More" menu opens and highlights the current section', async () => {
  // The tracker has its own place in the bar (Collectibles); the journal lives in "More".
  await go('#/journal', 900);
  await run(`document.querySelector('.nav-more-btn').click(); true`); await sleep(200);
  const open = await run(`getComputedStyle(document.querySelector('.nav-more-menu')).display !== 'none'`);
  const active = await run(`document.querySelector('.nav-more-menu a.is-active')?.textContent.trim()`);
  await key('Escape');
  return open && active === 'Discovery Journal';
});

// ---------- entry pages, the not-found page, spoilers, updates ----------
// The first entry of a section that isn't a spoiler, and the first that is.
const pick = (section, spoiler) => run(`(state.wiki[${JSON.stringify(section)}] || []).find((e) => e.status !== 'draft' && !!e.spoiler === ${spoiler})?.slug || ''`);
await check('Character page: name, portrait or text, and the way back', async () => {
  const slug = await pick('characters', false);
  const name = await run(`state.wiki.characters.find((e) => e.slug === ${JSON.stringify(slug)}).name`);
  await go(`#/characters/${slug}`, 0);
  const ok = await waitFor(`document.querySelector('#view article.profile h1')?.textContent.trim() === ${JSON.stringify(name)}`, 8000);
  const back = await run(`!!document.querySelector('#view article.profile a.back[href="#/characters"]')`);
  const title = await run(`document.title`);
  return ok && back && title.startsWith(name) ? `${name}: "${title}"` : false;
});
await check('Location page: name, region and the way back', async () => {
  const slug = await pick('locations', false);
  const name = await run(`state.wiki.locations.find((e) => e.slug === ${JSON.stringify(slug)}).name`);
  await go(`#/locations/${slug}`, 0);
  const ok = await waitFor(`document.querySelector('#view article.place h1')?.textContent.trim() === ${JSON.stringify(name)}`, 8000);
  const back = await run(`!!document.querySelector('#view article.place a.back[href="#/locations"]')`);
  return ok && back ? name : false;
});
await check('Not-found page for an unknown page, character and location', async () => {
  const bad = [];
  for (const hash of ['#/no-such-page', '#/characters/no-such-person', '#/locations/no-such-place']) {
    await go(hash, 0);
    const wasted = await waitFor(`document.querySelector('#view h1')?.textContent.trim() === 'Wasted' && !!document.querySelector('#view a[href="#/"]')`, 5000);
    if (!wasted) bad.push(hash);
  }
  if (bad.length) throw new Error(`no not-found page for ${bad.join(', ')}`);
  return true;
});
await check('Spoilers: blurred, one revealed by its eye, all shown and hidden again by the top-bar switch', async () => {
  const slug = await pick('characters', true);
  if (!slug) throw new Error('no character is marked as a spoiler');
  const page = `#/characters/${slug}`;
  await go(page, 0);
  const veiled = await waitFor(`!!document.querySelector('#view .veil .veil-eye')`, 5000);
  await run(`document.querySelector('#view .veil .veil-eye').click(); true`);
  const revealed = await waitFor(`!document.querySelector('#view .veil')`, 3000);
  const stillHidden = await run(`fetch('/api/settings').then((r) => r.json()).then((s) => s['show-spoilers'])`);
  // The top-bar switch: on shows every spoiler and is saved; off hides them all again, the revealed one too.
  await run(`document.getElementById('spoiler-switch').click(); true`);
  const on = await waitFor(`showSpoilers === true && document.getElementById('spoiler-switch').dataset.spoilers === 'off'`, 3000);
  const savedOn = await waitFor(`fetch('/api/settings').then((r) => r.json()).then((s) => s['show-spoilers'] === '1')`, 3000);
  await run(`document.getElementById('spoiler-switch').click(); true`);
  const off = await waitFor(`showSpoilers === false && document.getElementById('spoiler-switch').dataset.spoilers === 'on'`, 3000);
  const savedOff = await waitFor(`fetch('/api/settings').then((r) => r.json()).then((s) => s['show-spoilers'] === '0')`, 3000);
  await go(page, 0);
  const veiledAgain = await waitFor(`!!document.querySelector('#view .veil')`, 5000);
  return veiled && revealed && stillHidden === '0' && on && savedOn && off && savedOff && veiledAgain ? slug : false;
});
await check('Update notice: none when up to date, offered when newer, dismissal remembered (offline)', async () => {
  // The page's own checkForUpdate, fed made-up answers in place of /api/update, so GitHub is never asked.
  const result = await run(`(async () => {
    const real = window.fetch;
    const answer = (status) => { window.fetch = (url, options) => String(url).endsWith('/api/update')
      ? Promise.resolve(new Response(JSON.stringify(status), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : real(url, options); };
    const out = {};
    try {
      document.querySelector('.update-toast')?.remove();
      updateOffered = '';
      answer({ available: false, current: '0.2.34', latest: '0.2.34', url: 'https://example.invalid/release' });
      await checkForUpdate();
      out.upToDate = !document.querySelector('.update-toast');
      answer({ available: true, current: '0.2.34', latest: '9.9.9', url: 'https://example.invalid/release', can_install: false });
      await checkForUpdate();
      const toast = document.querySelector('.update-toast');
      out.offered = !!toast && /Version 9\\.9\\.9 is available/.test(toast.textContent) && /You have 0\\.2\\.34/.test(toast.textContent);
      out.link = !!toast?.querySelector('a[target="_blank"][href="https://example.invalid/release"]') && !toast?.querySelector('[data-update]');
      toast?.querySelector('button[aria-label]')?.click();
      out.dismissed = !document.querySelector('.update-toast') && hqPrefs.get('update-dismissed') === '9.9.9';
      await checkForUpdate();
      out.notAgain = !document.querySelector('.update-toast');
      answer({ available: true, current: '0.2.34', latest: '9.9.10', url: 'https://example.invalid/release', can_install: true });
      await checkForUpdate();
      out.installButton = !!document.querySelector('.update-toast [data-update]');
    } finally {
      window.fetch = real;
      document.querySelector('.update-toast')?.remove();
      updateOffered = '';
    }
    return JSON.stringify(out);
  })()`).then(JSON.parse);
  const saved = await waitFor(`fetch('/api/settings').then((r) => r.json()).then((s) => s['update-dismissed'] === '9.9.9')`, 3000);
  const failedParts = Object.entries(result).filter(([, v]) => !v).map(([k]) => k);
  if (!saved) failedParts.push('dismissal not saved');
  if (failedParts.length) throw new Error(failedParts.join(', '));
  return true;
});

// ---------- phone width ----------
await check('Phone width: no sideways scrolling on the map, tracker and saved pages', async () => {
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const wide = [];
  for (const page of ['#/map', '#/tracker', '#/saved', '#/progress', '#/settings']) {
    await go(page, 1200);
    const over = await run(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    if (over > 2) wide.push(`${page} +${over}px`);
  }
  await go('#/map', 1200);
  await shot('phone-map');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  return wide.length ? (() => { throw new Error(wide.join(', ')); })() : true;
});

await check('No script errors, console errors or failed requests', async () => {
  if (problems.length) throw new Error(problems.slice(0, 5).join(' | '));
  return true;
});

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
ws.close();
process.exit(failed ? 1 : 0);

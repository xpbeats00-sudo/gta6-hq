// Browser test of the hosted GTA 6 HQ site (site/, built by scripts/build_site.py): the app's own
// pages running without the desktop server. A Discord map link opens the app's map at the places
// it names; the map can be dragged, zoomed and reset; search, entries, the Field Manual and saving
// work; nothing fails to load.
//
//   python scripts/build_site.py
//   python -m http.server 4680 --bind 127.0.0.1 --directory site
//   msedge --headless=new --remote-debugging-port=9341 about:blank
//   node scripts/web_map_check.mjs 9341 http://127.0.0.1:4680
//
// The site address may include a folder (http://127.0.0.1:4681/site), as on GitHub Pages.
// Prints one line per check and exits 1 if any failed. Node 22+ (built-in fetch and WebSocket).
const [debugPort = '9341', site = 'http://127.0.0.1:4680'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  if (d.method === 'Runtime.exceptionThrown') problems.push(`exception: ${d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text}`);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') problems.push(`console: ${d.params.args.map((a) => a.value || a.description).join(' ')}`);
  // The detail tiles stop at the edge of the community set: a missing tile there is expected.
  if (d.method === 'Network.responseReceived' && d.params.response.status >= 400 && !d.params.response.url.includes('/tiles/')) {
    problems.push(`HTTP ${d.params.response.status}: ${d.params.response.url}`);
  }
};
await call('Runtime.enable');
await call('Network.enable');
await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
const run = async (expression) => {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
const waitFor = async (expression, timeout = 10000) => {
  const end = Date.now() + timeout;
  let value;
  do { try { value = await run(expression); } catch { value = undefined; } if (value) return value; await sleep(150); } while (Date.now() < end);
  return value;
};
const COUNT = `[...document.querySelectorAll('.map-side *')].find((e) => /pins match/.test(e.textContent) && !e.children.length)?.textContent || ''`;
const count = () => waitFor(COUNT, 5000);
/** Open an address and wait until the app has drawn that page (the splash gone, the map made). */
const open = async (path, ready = 'state.map && !document.getElementById("splash")') => {
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: site + path });
  await sleep(400);
  return waitFor(ready, 20000);
};
const mouse = (type, x, y) => call('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const view = () => run('JSON.stringify({ c: state.map.getCenter(), z: state.map.getZoom() })').then(JSON.parse);

let failed = 0;
const check = async (name, fn) => {
  let ok, detail = '';
  try { const got = await fn(); ok = got !== false && got != null && got !== ''; if (typeof got === 'string') detail = got; } catch (e) { ok = false; detail = e.message; }
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// The data the site was built with, read the way the page reads it.
const wiki = await (await fetch(`${site}/api/wiki.json`)).json();
const markers = wiki.map.markers;
const byKind = {};
markers.forEach((p) => { (byKind[p.kind] ||= []).push(p); });
const gang = (byKind['Gang Operations'] || []).length;
const [kindA, kindB] = Object.keys(byKind).filter((k) => k && k !== 'Gang Operations' && byKind[k].length >= 3 && byKind[k].length <= 12);
const three = byKind[kindA].slice(0, 3);
const named = markers.find((p) => !p.spoiler && p.name && markers.filter((q) => q.name === p.name).length === 1 && p.name.length > 8);

// The first visit's spoiler question is answered once, as a reader would.
await open('/', '!!state.wiki');
await run(`localStorage.setItem('gta6hq-settings', JSON.stringify({ 'spoiler-notice': '1' })); true`);

await check('An old /map/ link opens the app\'s own map straight away, at that kind', async () => {
  if (!await open('/map/?kind=Gang+Operations')) return false;
  const at = await run('location.hash');
  const text = await count();
  return at.startsWith('#/map') && text.startsWith(`${gang} of`) ? text : `${at} ${text}`;
});
await check('A link with two kinds shows the pins of both', async () => {
  if (!await open(`/#/map?kind=${encodeURIComponent(`${kindA}|${kindB}`)}`)) return false;
  await sleep(500);
  const want = byKind[kindA].length + byKind[kindB].length;
  const text = await count();
  return text.startsWith(`${want} of`) ? `${kindA} + ${kindB}: ${text}` : false;
});
await check('A link with map positions shows exactly those places', async () => {
  const at = three.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(';');
  if (!await open(`/#/map?at=${at}`)) return false;
  await sleep(500);
  const text = await count();
  return text.startsWith('3 of') ? text : false;
});
await check('A link to one place opens its card', async () => {
  if (!await open(`/#/map?focus=${encodeURIComponent(named.name)}`)) return false;
  const card = await waitFor(`document.querySelector('.leaflet-popup')?.textContent || ''`, 6000);
  return card.toLowerCase().includes(named.name.toLowerCase()) ? named.name : false;
});
await check('Dragging moves the map', async () => {
  await run('state.map.closePopup(); true');
  await sleep(1200);
  const before = await view();
  await mouse('mousePressed', 800, 450);
  for (let i = 1; i <= 10; i++) await mouse('mouseMoved', 800 - i * 20, 450 - i * 12);
  await mouse('mouseReleased', 600, 330);
  await sleep(500);
  const after = await view();
  return Math.hypot(after.c.lat - before.c.lat, after.c.lng - before.c.lng) > 20 ? 'moved' : false;
});
await check('The scroll wheel zooms in and out', async () => {
  const z0 = (await view()).z;
  await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 800, y: 450, deltaX: 0, deltaY: -400 });
  await sleep(900);
  const z1 = (await view()).z;
  await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 800, y: 450, deltaX: 0, deltaY: 400 });
  await sleep(900);
  const z2 = (await view()).z;
  return z1 > z0 && z2 < z1 ? `${z0.toFixed(2)} → ${z1.toFixed(2)} → ${z2.toFixed(2)}` : false;
});
await check('The + and − buttons zoom, and Reset shows the whole map', async () => {
  const z0 = (await view()).z;
  await run(`document.querySelector('.leaflet-control-zoom-in').click(); true`); await sleep(700);
  const z1 = (await view()).z;
  await run(`document.querySelector('.leaflet-control-zoom-out').click(); true`); await sleep(700);
  const z2 = (await view()).z;
  await run(`document.querySelector('.map-tool[data-reset]').click(); true`); await sleep(1500);
  const whole = await run(`(() => { const b = state.map.getBounds(); const c = state.map.getCenter(); return state.map.getZoom() <= ${z0} + 0.01 && b.contains(c); })()`);
  if (!(z1 > z0 && z2 < z1 && whole)) throw new Error(JSON.stringify({ z0, z1, z2, whole }));
  return 'zoomed in, out and reset';
});
await check('The full screen button asks for full screen', async () => {
  // A headless browser never really enters full screen, so the request itself is what is checked.
  await run(`window.__askedFull = null; Element.prototype.requestFullscreen = function () { window.__askedFull = this.className; return Promise.resolve(); }; true`);
  await run(`document.querySelector('.map-tool[data-full]').click(); true`);
  await sleep(300);
  const asked = await run('window.__askedFull');
  return asked && asked.includes('map-page') ? 'the map page asked for full screen' : false;
});
await check('Search finds entries without the desktop server', async () => {
  if (!await open('/#/search?q=infernus', '!document.getElementById("splash") && /result/.test(document.querySelector("#view")?.textContent || "")')) return false;
  return run(`(document.querySelector('#view').textContent.match(/\\d+ results?/) || [''])[0]`);
});
await check('An encyclopedia entry opens with its picture', async () => {
  const v = wiki.vehicles.find((e) => e.image && !e.spoiler);
  if (!await open(`/#/wiki/vehicles/${v.slug}`, `!document.getElementById("splash") && !!document.querySelector('#view h1')`)) return false;
  await sleep(800);
  const shown = await run(`[...document.querySelectorAll('#view img')].some((i) => i.complete && i.naturalWidth > 0)`);
  return shown ? v.name : false;
});
await check('A Field Manual page opens from a Discord guide link', async () => {
  if (!await open('/#/manual/g100-robberies/4', `!document.getElementById("splash") && /Stick/.test(document.title)`)) return false;
  return run('document.title');
});
await check('Saved data is kept in the browser and read back after a reload', async () => {
  await run(`UserStore.set('favourites', [...UserStore.get('favourites', []), 'web-check']); true`);
  await sleep(500);
  if (!await open('/#/saved', '!!state.wiki && !document.getElementById("splash")')) return false;
  return run(`UserStore.has('favourites', 'web-check')`);
});
await check('No script errors, console errors or failed requests', async () => (problems.length ? false : 'none'));
if (problems.length) console.log('      ' + problems.slice(0, 8).join('\n      '));
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);

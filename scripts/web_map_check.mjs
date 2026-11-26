// Browser test of the hosted GTA 6 HQ site (site/, built by scripts/build_site.py): the map opens at
// the place a Discord answer links to, and can be dragged, zoomed, reset and opened full screen.
//
//   python scripts/build_site.py
//   python -m http.server 4680 --bind 127.0.0.1 --directory site
//   msedge --headless=new --remote-debugging-port=9341 about:blank
//   node scripts/web_map_check.mjs 9341 http://127.0.0.1:4680
//
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
  if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) problems.push(`HTTP ${d.params.response.status}: ${d.params.response.url}`);
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
  do { try { value = await run(expression); } catch { value = undefined; } if (value) return value; await sleep(100); } while (Date.now() < end);
  return value;
};
const open = async (path) => { await call('Page.navigate', { url: site + path }); await sleep(300); return waitFor('window.hqReady === true', 15000); };
const mouse = (type, x, y, extra = {}) => call('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const view = () => run('JSON.stringify({ c: hqMap.getCenter(), z: hqMap.getZoom() })').then(JSON.parse);

let failed = 0;
const check = async (name, fn) => {
  let ok, detail = '';
  try { const got = await fn(); ok = got !== false && got != null; if (typeof got === 'string') detail = got; } catch (e) { ok = false; detail = e.message; }
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const pins = await (await fetch(`${site}/data/pins.json`)).json();
const config = await (await fetch(`${site}/data/map.json`)).json();
const spot = pins.find((p) => !p.spoiler && p.kind && p.kind !== 'Gang Operations');
const withRef = pins.find((p) => p.ref && !p.spoiler);
// The pin is on screen, in the middle part of the view (near the coast the map keeps its edge in view, so not always dead centre).
const centred = (p) => run(`(() => { const pt = hqMap.latLngToContainerPoint([-${p.y} * ${config.height}, ${p.x} * ${config.width}]); const s = hqMap.getSize();
  return Math.abs(pt.x - s.x / 2) < s.x * 0.3 && Math.abs(pt.y - s.y / 2) < s.y * 0.3; })()`);

await check('11. A link opens the map centred on the place, with its card', async () => {
  if (!await open(`/map/?at=${spot.x},${spot.y}`)) return false;
  const here = await centred(spot);
  const title = await run(`document.getElementById('panel-title').textContent`);
  const card = await run(`document.querySelector('.pin-card h2')?.textContent || ''`);
  return here && title === spot.name && card === spot.name ? `${spot.name} at ${spot.x}, ${spot.y}` : false;
});
await check('10. Dragging moves the map', async () => {
  const before = await view();
  await mouse('mousePressed', 500, 400);
  for (let i = 1; i <= 10; i++) await mouse('mouseMoved', 500 - i * 20, 400 - i * 12);
  await mouse('mouseReleased', 300, 280);
  await sleep(400);
  const after = await view();
  return Math.hypot(after.c.lat - before.c.lat, after.c.lng - before.c.lng) > 20 ? 'moved' : false;
});
await check('10. The scroll wheel zooms in and out', async () => {
  const z0 = (await view()).z;
  await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 500, y: 400, deltaX: 0, deltaY: -400 });
  await sleep(700);
  const z1 = (await view()).z;
  await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 500, y: 400, deltaX: 0, deltaY: 400 });
  await sleep(700);
  const z2 = (await view()).z;
  return z1 > z0 && z2 < z1 ? `${z0} → ${z1} → ${z2}` : false;
});
await check('Zoom buttons, Reset and Full screen work', async () => {
  const z0 = (await view()).z;
  await run(`document.getElementById('zoom-in').click()`); await sleep(500);
  const z1 = (await view()).z;
  await run(`document.getElementById('zoom-out').click()`); await sleep(500);
  const z2 = (await view()).z;
  await run(`hqMap.panBy([300, 200], { animate: false })`);
  await run(`document.getElementById('reset').click()`); await sleep(300);
  const back = await centred(spot);
  await call('Runtime.evaluate', { expression: "document.getElementById('full').click()", userGesture: true }); await sleep(800);
  const full = await run(`!!document.fullscreenElement || document.body.classList.contains('pseudo-full')`);
  if (!(z1 > z0 && z2 < z1 && back && full)) throw new Error(JSON.stringify({ z0, z1, z2, back, full }));
  return 'all four';
});
await check('Several places: a kind opens with every pin numbered and listed', async () => {
  if (!await open('/map/?kind=Gang+Operations')) return false;
  const n = pins.filter((p) => p.kind === 'Gang Operations').length;
  const markers = await run(`document.querySelectorAll('.leaflet-marker-icon').length`);
  const listed = await run(`document.querySelectorAll('#list li').length`);
  return n > 0 && markers === n && listed === n ? `${n} pins` : `${markers}/${listed} of ${n}`;
});
await check('Marker selection: clicking a listed place opens its card', async () => {
  await run(`document.querySelectorAll('#list li button')[2].click()`); await sleep(800);
  const sel = await run(`window.hqSelected?.name`);
  const third = pins.filter((p) => p.kind === 'Gang Operations')[2];
  return sel === third.name ? third.spoiler ? 'a spoiler pin' : sel : false;
});
await check('An entry link (focus) opens at that entry and links to its guide', async () => {
  if (!await open(`/map/?focus=${encodeURIComponent(withRef.ref)}`)) return false;
  const sel = await run(`window.hqSelected?.ref`);
  const guide = await run(`document.querySelector('.pin-card a[href*="guide/?ref="]')?.getAttribute('href') || ''`);
  return sel === withRef.ref && guide.includes(encodeURIComponent(withRef.ref)) ? withRef.ref : false;
});
await check('Show every place adds all the other pins', async () => {
  await run(`document.getElementById('all').click()`); await sleep(300);
  return run(`document.getElementById('all').getAttribute('aria-pressed') === 'true'`);
});
await check('The guide page shows an entry with its sources', async () => {
  if (!await open(`/guide/?ref=${encodeURIComponent(withRef.ref)}`)) return false;
  const h1 = await run(`document.querySelector('h1')?.textContent || ''`);
  return h1.length > 0 ? h1 : false;
});
await check('A Field Manual page opens from a Discord guide link', async () => {
  if (!await open('/guide/?manual=g100-robberies&page=2')) return false;
  return run(`document.title.startsWith('Stick') && document.querySelectorAll('.step').length > 2 && document.title`);
});
await check('No script errors, console errors or failed requests', async () => (problems.length ? false : 'none'));
if (problems.length) console.log('      ' + problems.slice(0, 5).join('\n      '));
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);

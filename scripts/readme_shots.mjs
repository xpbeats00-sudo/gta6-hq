// Screenshots for the README, taken from the running app in a headless browser.
//   msedge --headless=new --remote-debugging-port=9340 --window-size=1440,900 about:blank
//   gta6-hq --serve --port 4655   (with a fresh settings file: {"intro": "classic", "spoiler-notice": "1"})
//   node scripts/readme_shots.mjs 9340 4655
// Opens the app once (skipping the intro and closing the first-run spoiler box), then moves
// between pages without reloading and writes docs/media/<name>.jpg at 1440x900.
// Uses Node's built-in fetch and WebSocket (Node 22+).
import { writeFileSync } from 'node:fs';

const [debugPort = '9340', appPort = '4655'] = process.argv.slice(2);
const base = `http://127.0.0.1:${appPort}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
const call = (method, params = {}) => new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (waiting.has(d.id)) { waiting.get(d.id)(d.result ?? {}); waiting.delete(d.id); } };
const run = (expression) => call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value);
const key = (k, code, vk) => call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }).then(() => call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }));
await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// Open once: skip the intro, then answer the first-run spoiler box (spoilers stay hidden).
await call('Page.navigate', { url: `${base}/#/` });
await sleep(3000);
for (let i = 0; i < 20; i++) {
  const state = await run(`(() => {
    if (document.getElementById('splash')) return 'splash';
    const b = document.querySelector('dialog.spoiler-ask[open] button');
    if (b) { b.click(); return 'dialog'; }
    return 'ready';
  })()`);
  if (state === 'ready') break;
  if (state === 'splash') await key('Escape', 'Escape', 27);
  await sleep(800);
}

const shoot = async (name, hash, prepare = '', wait = 1800) => {
  await run(`location.hash = ${JSON.stringify(hash)}; 1`);
  await sleep(1600);
  await run(`(async () => { ${prepare} })()`);
  await sleep(wait);
  const shot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
  writeFileSync(`docs/media/${name}.jpg`, Buffer.from(shot.data, 'base64'));
  console.log('wrote', name);
};

await shoot('map', '#/map', `document.querySelector('[data-kind-open="crime::Gang Operations"]')?.click();
  await new Promise((r) => setTimeout(r, 400));
  const i = mapPins().findIndex((p) => p.kind === 'Gang Operations' && !p.hidden && p.name.includes('La Cascara'));
  document.querySelector('[data-marker="' + i + '"]')?.click();`, 3000);
await shoot('tools-garage', '#/garage', `const li = [...document.querySelectorAll('.gm-list li')].find((l) => /Ganado/.test(l.textContent)); li?.scrollIntoView({ block: 'center' }); li?.click(); window.scrollTo(0, 0);`);
await shoot('tools-cheats', '#/cheats', `document.querySelector('.veil button, [data-reveal]')?.click();`);
await shoot('tools-cards', '#/cards');
await shoot('tools-trophies', '#/trophies/master-of-none', `document.querySelector('.gm-detail [data-reveal]')?.click();`);
ws.close();

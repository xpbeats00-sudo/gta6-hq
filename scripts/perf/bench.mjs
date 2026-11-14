// Benchmarks the real desktop app (the release build) by driving its own page over the Chrome
// DevTools Protocol, the way video/tools/capture_cdp.py films it. Nothing is clicked on the desktop.
//
//   node scripts/perf/bench.mjs launch  <outDir> [runs]      launch times and clean shutdown
//   node scripts/perf/bench.mjs session <outDir>             idle, wallpaper, navigation, search, manual, map, media
//   node scripts/perf/bench.mjs soak    <outDir> [minutes]   mixed use for a long time
//
// CPU, memory and GPU are sampled beside it by scripts/perf/sample.ps1 into <outDir>/<mode>-samples.csv,
// labelled with the scenario that was running. Results go to <outDir>/<mode>.json.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [mode, outDir, extra] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const EXE = 'target/release/gta6-hq.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const labelFile = `${outDir}/${mode}-label.txt`;
let closing = false, currentLabel = '';
const label = (text) => { currentLabel = text; writeFileSync(labelFile, text); console.log(`[${new Date().toLocaleTimeString()}] ${text}`); };
const stats = (xs) => {
  const s = [...xs].filter((x) => x >= 0).sort((a, b) => a - b);
  if (!s.length) return null;
  const at = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const r = (x) => Math.round(x * 10) / 10;
  return { n: s.length, min: r(s[0]), median: r(at(0.5)), p95: r(at(0.95)), max: r(s[s.length - 1]) };
};

async function start(port) {
  const t0 = Date.now();
  const child = spawn(EXE, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: 'ignore' });
  // If the app goes away before the run asks it to (someone closed the window, or it crashed), say so
  // and keep what was measured so far, instead of waiting for ever on an answer that cannot come.
  child.once('exit', (code) => {
    if (closing) return;
    console.log(`THE APP EXITED EARLY (code ${code}) during: ${currentLabel}`);
    writeFileSync(`${outDir}/${mode}-partial.json`, JSON.stringify({ exitedEarlyDuring: currentLabel, ...(globalThis.results || {}) }, null, 1));
    process.exit(2);
  });
  let target;
  while (!target && Date.now() - t0 < 30000) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page' && t.url.startsWith('http://127.0.0.1')); } catch { /* not up yet */ }
    if (!target) await sleep(25);
  }
  if (!target) throw new Error('the app window never appeared');
  const tWindow = Date.now() - t0;
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const waiting = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (waiting.has(d.id)) { waiting.get(d.id)(d.result); waiting.delete(d.id); } };
  const call = (method, params = {}) => new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const run = async (expression) => (await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
  const until = async (expression, limit = 30000) => { const s = Date.now(); while (Date.now() - s < limit) { if (await run(expression)) return Date.now() - t0; await sleep(20); } return -1; };
  return { child, t0, tWindow, run, until, ws };
}

/** Everything the app process started, as process ids. */
const descendants = (pid) => execFileSync('powershell', ['-NoProfile', '-Command',
  `$all = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId; $ids = @(${pid}); $new = $ids; while ($new) { $new = @($all | Where-Object { $new -contains $_.ParentProcessId } | ForEach-Object { $_.ProcessId }); $ids += $new }; $ids -join ','`]).toString().trim().split(',').map(Number);
const alive = (pids) => execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue | Measure-Object).Count`]).toString().trim();

async function close(app) {
  closing = true;
  const pids = descendants(app.child.pid);
  const t = Date.now();
  const exited = new Promise((r) => app.child.once('exit', () => r(Date.now() - t)));
  await app.run(`document.querySelector('[data-window="close"]').click()`).catch(() => {});
  const ms = await Promise.race([exited, sleep(10000).then(() => -1)]);
  if (ms < 0) app.child.kill();
  await sleep(3000);
  return { closeMs: ms, processesBefore: pids.length, stillAliveAfter3s: Number(alive(pids)) };
}

const sampler = (pid) => spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/perf/sample.ps1', '-RootPid', String(pid), '-OutCsv', `${outDir}/${mode}-samples.csv`, '-LabelFile', labelFile], { stdio: 'ignore' });

// Runs in the page: go to a place and time how long until the page has changed and been drawn twice.
const NAV = `(hash, deep) => new Promise((done) => {
  const view = document.getElementById('view'); const t = performance.now();
  const mo = new MutationObserver(() => { mo.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t))); });
  mo.observe(view, { childList: true, subtree: !!deep });
  setTimeout(() => { mo.disconnect(); done(-1); }, 6000);
  location.hash = hash;
})`;
const SNAP = `JSON.stringify({ heapMb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
  nodes: document.getElementsByTagName('*').length, videos: document.querySelectorAll('video').length,
  playing: [...document.querySelectorAll('video')].filter((v) => !v.paused && !v.ended).length,
  longTasks: (window.__long || []).length, longestTaskMs: Math.round(Math.max(0, ...(window.__long || []))) })`;
const snap = async (app) => JSON.parse(await app.run(SNAP));

async function ready(app, skipIntro = true) {
  await app.until(`typeof state !== 'undefined' && !!state.wiki`);
  await app.run(`window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] }); 1`);
  if (skipIntro) { await app.run(`document.getElementById('splash-skip')?.click(); 1`); await app.until(`!document.getElementById('splash')`); }
}

if (mode === 'launch') {
  const runs = Number(extra) || 6; const rows = [];
  for (let i = 0; i < runs; i++) {
    const app = await start(9400 + i);
    const tLoaded = await app.until(`document.readyState === 'complete'`);
    const tData = await app.until(`typeof state !== 'undefined' && !!state.wiki`);
    await app.run(`document.getElementById('splash-skip')?.click(); 1`);
    const tUsable = await app.until(`!document.getElementById('splash')`);
    const shutdown = await close(app);
    closing = false;
    rows.push({ run: i, warmUp: i === 0, windowMs: app.tWindow, pageLoadedMs: tLoaded, dataReadyMs: tData, usableAfterSkipMs: tUsable, ...shutdown });
    console.log(JSON.stringify(rows[rows.length - 1]));
    await sleep(1500);
  }
  const measured = rows.filter((r) => !r.warmUp);
  const out = { rows, summary: Object.fromEntries(['windowMs', 'pageLoadedMs', 'dataReadyMs', 'usableAfterSkipMs', 'closeMs'].map((k) => [k, stats(measured.map((r) => r[k]))])) };
  // One more launch left alone, to time the intro as people see it.
  const app = await start(9399);
  await app.until(`typeof state !== 'undefined' && !!state.wiki`);
  out.introUnskippedMs = await app.until(`!document.getElementById('splash')`, 40000);
  out.lastShutdown = await close(app);
  writeFileSync(`${outDir}/launch.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.summary), out.introUnskippedMs);
}

if (mode === 'session') {
  const out = {}; globalThis.results = out;
  label('starting');
  const app = await start(9450);
  const samp = sampler(app.child.pid);
  await ready(app);
  await app.run(`location.hash = '#/'; 1`); await sleep(3000);

  label('B04 home, live wallpaper playing'); out.homeStart = await snap(app); await sleep(300000); out.homeEnd = await snap(app);
  label('B05 home, wallpaper paused'); await app.run(`document.querySelector('.hero-pause')?.click(); 1`); await sleep(90000); out.homePaused = await snap(app);
  await app.run(`document.querySelector('.hero-pause')?.click(); 1`);
  label('B03 idle on another page (Encyclopedia)'); await app.run(`location.hash = '#/wiki'; 1`); await sleep(90000); out.idleOtherPage = await snap(app);

  label('B06 navigation');
  const places = ['#/', '#/wiki', '#/characters', '#/characters/jason-duval', '#/locations', '#/locations/vice-city', '#/vehicles', '#/wiki/businesses', '#/intel', '#/media', '#/wiki/weapons', '#/wiki/music'];
  const nav = {};
  for (let round = 0; round < 6; round++) for (const p of places) { const ms = await app.run(`(${NAV})(${JSON.stringify(p)})`); if (round) (nav[p] ||= []).push(ms); await sleep(350); }
  out.navigation = { perPlace: Object.fromEntries(Object.entries(nav).map(([k, v]) => [k, stats(v)])), all: stats(Object.values(nav).flat()), after: await snap(app) };

  label('B07 search');
  const search = {};
  for (const q of ['vi', 'jason', 'vice city', 'radio', 'zzzzqq']) {
    const r = JSON.parse(await app.run(`(async () => { const ms = []; let count = 0; for (let i = 0; i < 31; i++) { const t = performance.now(); const res = await fetch('/api/search?q=' + encodeURIComponent(${JSON.stringify(q)})); const body = await res.json(); const d = performance.now() - t; if (i) ms.push(d); count = Array.isArray(body) ? body.length : (body.results || body.hits || []).length; } return JSON.stringify({ ms, count }); })()`));
    search[q] = { results: r.count, ...stats(r.ms) };
  }
  out.searchApi = search;
  const routes = {};
  for (const path of ['/api/wiki', '/api/media', '/api/manual', '/api/health', '/app.js', '/styles.css']) {
    const r = JSON.parse(await app.run(`(async () => { const ms = []; let bytes = 0; for (let i = 0; i < 16; i++) { const t = performance.now(); const res = await fetch(${JSON.stringify(path)}, { cache: 'no-store' }); bytes = (await res.arrayBuffer()).byteLength; if (i) ms.push(performance.now() - t); } return JSON.stringify({ ms, bytes }); })()`));
    routes[path] = { bytes: r.bytes, ...stats(r.ms) };
  }
  out.routes = routes;
  // The search page itself: type a query and time until the results are drawn.
  const typed = [];
  for (const q of ['jason', 'vice', 'radio', 'boat', 'lucia']) typed.push(await app.run(`(${NAV})(${JSON.stringify('#/search?q=' + q)}, true)`)), await sleep(400);
  out.searchPage = stats(typed);

  label('B09 field manual');
  out.manualOpenMs = await app.run(`(${NAV})('#/manual')`); await sleep(1500);
  const turns = [];
  for (let i = 0; i < 12; i++) { turns.push(await app.run(`new Promise((done) => { const view = document.getElementById('view'); const t = performance.now(); const mo = new MutationObserver(() => { mo.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t))); }); mo.observe(view, { childList: true, subtree: true }); setTimeout(() => { mo.disconnect(); done(-1); }, 4000); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); })`)); await sleep(500); }
  out.manualPageTurn = stats(turns);
  const theme = [];
  for (let i = 0; i < 6; i++) { theme.push(await app.run(`new Promise((done) => { const t = performance.now(); document.querySelector('[data-action="theme"]')?.click(); requestAnimationFrame(() => requestAnimationFrame(() => done(performance.now() - t))); })`)); await sleep(700); }
  out.manualNightSwitch = stats(theme); out.manualAfter = await snap(app);

  const mapVisit = async () => JSON.parse(await app.run(`(async () => { performance.clearResourceTimings(); const t = performance.now(); location.hash = '#/map'; let last = -1, stable = 0, n = 0; while (performance.now() - t < 20000) { await new Promise((r) => setTimeout(r, 150)); n = document.querySelectorAll('.leaflet-tile-loaded').length; const total = document.querySelectorAll('.leaflet-tile').length; if (n && n === total && n === last) { if (++stable >= 5) break; } else stable = 0; last = n; } const tiles = performance.getEntriesByType('resource').filter((e) => e.name.includes('/tiles/')); return JSON.stringify({ settledMs: Math.round(performance.now() - t - 750), tilesShown: n, tileRequests: tiles.length, tileBytes: tiles.reduce((s, e) => s + (e.transferSize || 0), 0), slowestTileMs: Math.round(Math.max(0, ...tiles.map((e) => e.duration))) }); })()`));
  label('B10 map, first visit this session'); out.mapFirst = await mapVisit(); await sleep(1500);
  label('B11 map, revisit'); await app.run(`location.hash = '#/wiki'; 1`); await sleep(1200); out.mapRevisit = await mapVisit(); out.mapAfter = await snap(app);

  label('B12 media gallery');
  out.mediaOpenMs = await app.run(`(${NAV})('#/media')`); await sleep(2500);
  out.mediaStart = { ...(await snap(app)), ...JSON.parse(await app.run(`JSON.stringify({ pictures: document.querySelectorAll('#view img').length, loaded: [...document.querySelectorAll('#view img')].filter((i) => i.complete && i.naturalWidth).length, lazy: document.querySelectorAll('#view img[loading="lazy"]').length })`)) };
  await app.run(`(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); })()`);
  await sleep(1500); out.mediaScrolled = { ...(await snap(app)), loaded: await app.run(`[...document.querySelectorAll('#view img')].filter((i) => i.complete && i.naturalWidth).length`) };
  const viewer = [];
  for (let i = 0; i < 20; i++) viewer.push(await app.run(`new Promise((done) => { const tiles = document.querySelectorAll('#view .tile'); const t = performance.now(); tiles[${i} % tiles.length]?.click(); requestAnimationFrame(() => requestAnimationFrame(() => { const ms = performance.now() - t; setTimeout(() => { document.querySelector('#lightbox .lightbox-close')?.click(); setTimeout(() => done(ms), 150); }, 250); })); })`));
  out.mediaViewerOpen = stats(viewer); out.mediaAfterViewer = await snap(app);

  label('closing'); out.shutdown = await close(app);
  writeFileSync(`${outDir}/session.json`, JSON.stringify(out, null, 1));
  console.log('session done');
  samp.kill();
}

if (mode === 'soak') {
  const minutes = Number(extra) || 30; const out = { minutes, checkpoints: [] }; globalThis.results = out;
  const app = await start(9460); const samp = sampler(app.child.pid);
  await ready(app);
  const places = ['#/', '#/wiki', '#/characters', '#/characters/lucia-caminos', '#/locations/leonida-keys', '#/vehicles', '#/map', '#/media', '#/manual', '#/intel', '#/search?q=vice', '#/wiki/businesses'];
  const end = Date.now() + minutes * 60000; let i = 0, next = 0;
  while (Date.now() < end) {
    const p = places[i++ % places.length];
    label(`B13 soak, minute ${Math.floor((minutes * 60000 - (end - Date.now())) / 60000)}`);
    await app.run(`location.hash = ${JSON.stringify(p)}; 1`);
    await sleep(p === '#/' ? 9000 : 4000);
    if (p === '#/media') await app.run(`(async () => { const t = document.querySelectorAll('#view .tile'); t[${i} % Math.max(1, t.length)]?.click(); await new Promise((r) => setTimeout(r, 600)); document.querySelector('#lightbox .lightbox-close')?.click(); })()`);
    if (p === '#/manual') await app.run(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); 1`);
    if (Date.now() >= next) { out.checkpoints.push({ minute: Math.round((minutes * 60000 - (end - Date.now())) / 6000) / 10, ...(await snap(app)) }); next = Date.now() + 120000; writeFileSync(`${outDir}/soak.json`, JSON.stringify(out, null, 1)); }
  }
  out.checkpoints.push({ minute: minutes, ...(await snap(app)) });
  out.pagesVisited = i; out.shutdown = await close(app);
  writeFileSync(`${outDir}/soak.json`, JSON.stringify(out, null, 1));
  console.log('soak done');
  samp.kill();
}
process.exit(0);

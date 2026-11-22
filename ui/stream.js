// Stream mode: open the app with ?stream=1 (for example as an OBS Browser Source) and it tours
// itself for as long as it is left running, with a banner saying where to download it.
// Without ?stream in the address this file does nothing.
//
//   ?stream=1            start the tour
//   &pace=1.5            go faster (2 = twice as fast, 0.5 = half as fast)
//   &banner=0            tour without the download banner
(() => {
  const params = new URLSearchParams(location.search);
  if (!params.has('stream')) return;

  const DOWNLOAD = 'github.com/xpbeats00-sudo/gta6-hq';
  const DISCORD = 'discord.gg/YhMHr8N4an';
  const pace = Math.min(20, Math.max(0.25, Number(params.get('pace')) || 1));
  const SCROLL_SPEED = 70 * pace;   // pixels a second
  const LONGEST_SCROLL = 80 / pace; // seconds; longer pages scroll faster to fit
  const HOLD_TOP = 4000 / pace;            // time to read the top of a page before it moves
  const HOLD_BOTTOM = 2500 / pace;
  const HOLD_STILL = 16000 / pace;         // pages that do not scroll (the map)

  document.documentElement.classList.add('is-stream');
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  // ---------- the banner ----------
  // The second line changes every 12 seconds; the address stays put so it can always be read.
  const LINES = [
    'Free for Windows, Mac and Linux',
    `Join the Discord: ${DISCORD}`,
    'Encyclopedia, interactive map and Field Manual',
    'Unofficial fan project. Not affiliated with Rockstar Games.',
  ];
  if (params.get('banner') !== '0') {
    const banner = document.createElement('aside');
    banner.className = 'stream-banner';
    banner.setAttribute('aria-label', 'Where to download GTA 6 HQ');
    banner.innerHTML = `
      <div class="stream-plate">
        <span class="stream-get">Free download</span>
        <b class="stream-url">${DOWNLOAD}</b>
        <span class="stream-line" id="stream-line">${LINES[0]}</span>
      </div>
      <div class="stream-now"><span>Now showing</span><b id="stream-now">GTA 6 HQ</b></div>
      <i class="stream-progress" id="stream-progress"></i>`;
    document.body.append(banner);
    let line = 0;
    setInterval(() => {
      const el = document.getElementById('stream-line');
      el.classList.add('is-changing');
      setTimeout(() => {
        line = (line + 1) % LINES.length;
        el.textContent = LINES[line];
        el.classList.remove('is-changing');
      }, 450);
    }, 12000);
  }
  const setNow = (text) => { const el = document.getElementById('stream-now'); if (el) el.textContent = text; };
  const setProgress = (part) => {
    const el = document.getElementById('stream-progress');
    if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, part))})`;
  };

  // ---------- the tour ----------
  /** Every stop of one lap: the section pages, then each entry the encyclopedia has. */
  function stops() {
    const wiki = (typeof state !== 'undefined' && state.wiki) || {};
    const entries = (key, limit) => (wiki[key] || []).filter((e) => e.slug).slice(0, limit)
      .map((e) => ({ hash: `#/${key}/${e.slug}`, label: e.name }));
    return [
      { hash: '#/', label: 'Home' },
      { hash: '#/characters', label: 'Characters' },
      ...entries('characters', 12),
      { hash: '#/locations', label: 'Locations' },
      ...entries('locations', 8),
      { hash: '#/map', label: 'Interactive map of Leonida', still: true },
      { hash: '#/vehicles', label: 'Vehicles' },
      ...entries('vehicles', 6),
      { hash: '#/intel', label: 'Intel: news and questions' },
      { hash: '#/media', label: 'Media gallery' },
      { hash: '#/wiki', label: 'Encyclopedia' },
      { hash: '#/manual', label: 'Field Manual' },
    ];
  }

  /** Scroll the page from top to bottom at reading speed; resolves at the bottom. */
  function scrollDown() {
    return new Promise((done) => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      if (distance < 40) { done(); return; }
      const seconds = Math.min(LONGEST_SCROLL, distance / SCROLL_SPEED);
      const started = performance.now();
      const step = (now) => {
        const part = Math.min(1, (now - started) / (seconds * 1000));
        // Ease in and out so the page does not jerk into motion.
        const eased = part < 0.5 ? 2 * part * part : 1 - ((-2 * part + 2) ** 2) / 2;
        const from = 0.04, to = 0.96; // keep most of the run at a steady speed
        const mixed = part < from || part > to ? eased : eased * 0.15 + part * 0.85;
        window.scrollTo(0, distance * mixed);
        if (part < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
  }

  async function show(stop, index, total) {
    setNow(stop.label);
    setProgress(index / total);
    if (location.hash !== stop.hash) location.hash = stop.hash;
    await wait(1200);                 // the page fades over
    window.scrollTo(0, 0);
    if (stop.still) { await wait(HOLD_STILL); return; }
    await wait(HOLD_TOP);
    await scrollDown();
    await wait(HOLD_BOTTOM);
  }

  async function tour() {
    // Wait for the intro to finish and the data to arrive.
    while (document.getElementById('splash') || typeof state === 'undefined' || !state.wiki) await wait(500);
    await wait(1500);
    const list = stops();
    for (let i = 0; i < list.length; i++) {
      try { await show(list[i], i, list.length); } catch { /* skip a page that fails; keep the stream going */ }
    }
    setProgress(1);
    // A fresh start each lap replays the intro and keeps a long stream from slowing down.
    location.hash = '#/';
    location.reload();
  }

  // Nothing on screen should need a click during a stream.
  window.addEventListener('load', () => { tour(); });
})();

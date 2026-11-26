// GTA 6 HQ — menus drawn like the game's own:
//   the pause menu   Esc (or the menu button in the top bar) over a blurred page: the VI mark, a
//                    list on the left and, for the highlighted item, its pages on the right
//   #/controls       Settings / Control scheme: a controller with each action pointed at its button,
//                    for PlayStation or Xbox, Default or Classic, one group of controls at a time
//   #/help           Help: the Field Manual's chapters as tabs, each topic on the left, its text on the right
//
// Every button and every line of help comes from the encyclopedia's controls entry and the Field
// Manual (data/wiki, data/manual.json). The controller drawing is our own.
// Loaded after research.js; uses its helpers (window.ResearchTools) and app.js globals.

(function () {
  const RT = window.ResearchTools;
  const { plain, shell, wireTabs, listDetail } = RT;

  // ---------- button glyphs ----------

  const PS_FACE = { Cross: '✕', Circle: '○', Square: '□', Triangle: '△' };
  const XB_FACE = { A: '#5fbf3f', B: '#e0453a', X: '#3a7be0', Y: '#f2c02e' };
  /** "Hold D-pad Right, then R1" → the same words with each button drawn as a glyph. */
  function glyphs(text, pad) {
    let html = esc(plain(text));
    html = html.replace(/D-pad (Up|Down|Left|Right)/g, (m, d) => RT.dpad(d));
    if (pad === 'ps') {
      html = html.replace(/\b(Cross|Circle|Square|Triangle)\b/g, (m, b) => `<kbd class="gl gl-face" title="${b}">${PS_FACE[b]}</kbd>`)
        .replace(/\b([LR][123])\b/g, '<kbd class="gl gl-bump">$1</kbd>')
        .replace(/\b(Touch Pad|Options|Create)\b/g, '<kbd class="gl gl-wide">$1</kbd>');
    } else {
      html = html.replace(/\b(LB|RB|LT|RT|LS|RS|View|Menu)\b/g, '<kbd class="gl gl-bump">$1</kbd>')
        .replace(/(^|[^\w>])([ABXY])(?![\w<])/g, (m, pre, b) => `${pre}<kbd class="gl gl-xb" style="--c:${XB_FACE[b]}" title="${b}">${b}</kbd>`);
    }
    return html.replace(/\b(Left stick|Right stick)\b/gi, (m) => `<kbd class="gl gl-stick">${m.toLowerCase().startsWith('left') ? 'L' : 'R'}</kbd>`);
  }

  /** A plain controller, our own drawing: the face buttons follow the chosen platform. */
  const controllerSvg = (pad) => `<svg class="pad-art" viewBox="0 0 320 210" aria-hidden="true">
    <path class="pad-body" d="M70 40h180c30 0 50 24 58 62l10 60c5 28-18 44-38 32l-42-30c-8-6-16-8-26-8h-104c-10 0-18 2-26 8l-42 30c-20 12-43-4-38-32l10-60c8-38 28-62 58-62z"/>
    <rect class="pad-dark" x="122" y="54" width="76" height="40" rx="8"/>
    <circle class="pad-stick" cx="${pad === 'ps' ? 118 : 88}" cy="${pad === 'ps' ? 128 : 90}" r="21"/><circle class="pad-stick" cx="${pad === 'ps' ? 202 : 200}" cy="128" r="21"/>
    <g class="pad-dpad" transform="translate(${pad === 'ps' ? 74 : 112} ${pad === 'ps' ? 90 : 128})"><path d="M-6-20h12v14h14v12h-14v14h-12v-14h-14v-12h14z"/></g>
    <g transform="translate(246 90)">${pad === 'ps'
      ? `<circle class="pad-btn" cx="0" cy="-18" r="9"/><circle class="pad-btn" cx="18" cy="0" r="9"/><circle class="pad-btn" cx="0" cy="18" r="9"/><circle class="pad-btn" cx="-18" cy="0" r="9"/>
         <text x="0" y="-14" class="pad-sym">△</text><text x="18" y="4.5" class="pad-sym">○</text><text x="0" y="22.5" class="pad-sym">✕</text><text x="-18" y="4.5" class="pad-sym">□</text>`
      : `<circle cx="0" cy="-18" r="9" fill="${XB_FACE.Y}"/><circle cx="18" cy="0" r="9" fill="${XB_FACE.B}"/><circle cx="0" cy="18" r="9" fill="${XB_FACE.A}"/><circle cx="-18" cy="0" r="9" fill="${XB_FACE.X}"/>
         <text x="0" y="-14" class="pad-sym is-dark">Y</text><text x="18" y="4" class="pad-sym is-dark">B</text><text x="0" y="22" class="pad-sym is-dark">A</text><text x="-18" y="4" class="pad-sym is-dark">X</text>`}</g>
  </svg>`;

  // ---------- the controls, read from the encyclopedia's controls entry ----------

  /** Lines "Group — Action: PlayStation / Xbox" and "Scheme — Name: text". */
  function readControls() {
    const g = state.wiki.gameplay || [];
    const entries = ['controls', 'assist-toggles-and-control-options'].map((s) => g.find((e) => e.slug === s)).filter(Boolean);
    const groups = new Map();
    const schemes = [];
    const notes = [];
    for (const e of entries) {
      for (const raw of e.body || []) {
        const line = plain(raw);
        const sc = /^Scheme — ([^:]+): (.+)$/.exec(line);
        const m = /^(.+?) — (.+?): (.+?) \/ (.+)$/.exec(line);
        if (sc) schemes.push({ name: sc[1], text: sc[2] });
        else if (m) { if (!groups.has(m[1])) groups.set(m[1], []); groups.get(m[1]).push({ action: m[2], ps: m[3], xbox: m[4] }); } else notes.push(line);
      }
    }
    return { entries, groups, schemes, notes };
  }
  /** The Classic scheme, as its entry describes it: on foot only, four actions move (Run, Jump/Climb, Melee, Crouch). */
  function classic(rows, group) {
    if (!/on foot/i.test(group)) return rows;
    const swap = [[/^(run|sprint)/i, 'Cross', 'A'], [/^(jump|climb)/i, 'Square', 'X'], [/^melee/i, 'Circle', 'B'], [/^crouch/i, 'L3', 'LS']];
    return rows.map((r) => { const s = swap.find(([re]) => re.test(r.action)); return s ? { ...r, ps: s[1], xbox: s[2], changed: true } : r; });
  }

  EXTRA_PAGES.controls = function renderControls() {
    const { entries, groups, schemes, notes } = readControls();
    const names = [...groups.keys()];
    const schemeNames = ['Default', 'Classic', 'Left-Handed'];
    let scheme = 0;
    let pad = prefs.get('pad') === 'xbox' ? 'xbox' : 'ps';
    let sel = 0;
    view.innerHTML = shell({ crumbs: ['Settings'], tabs: ['Control scheme', 'Schemes and options'], theme: 'settings', body: '<div class="gm-pane"></div>' });
    const root = view.querySelector('.gm');
    const pane = root.querySelector('.gm-pane');
    const picker = (label, value, i, n, key) => `<div class="cs-pick"><span class="cs-pick-label">${esc(label)}</span><div class="cs-pick-row"><span>${esc(value)}</span><em>${i + 1} / ${n}</em>
      <button type="button" data-step="${key}" data-by="-1" aria-label="Previous ${esc(label)}">‹</button><button type="button" data-step="${key}" data-by="1" aria-label="Next ${esc(label)}">›</button></div></div>`;
    const drawScheme = () => {
      const group = names[sel];
      let rows = groups.get(group) || [];
      if (scheme === 1) rows = classic(rows, group);
      const left = rows.slice(0, Math.ceil(rows.length / 2));
      const right = rows.slice(Math.ceil(rows.length / 2));
      const side = (list, cls) => `<ul class="cs-col ${cls}">${list.map((r) => `<li class="${r.changed ? 'is-changed' : ''}"><span class="cs-act">${esc(r.action)}</span><span class="cs-btn">${glyphs(pad === 'ps' ? r.ps : r.xbox, pad)}</span></li>`).join('')}</ul>`;
      pane.innerHTML = `<div class="cs">
        <div class="cs-left">
          <h2 class="cs-h">Control scheme</h2>
          ${picker('Scheme', schemeNames[scheme], scheme, schemeNames.length, 'scheme')}
          ${picker('Controller', pad === 'ps' ? 'PlayStation' : 'Xbox', pad === 'ps' ? 0 : 1, 2, 'pad')}
          <h2 class="cs-h">Preview</h2>
          <ul class="cs-groups" role="listbox" aria-label="Group of controls" tabindex="0">${names.map((n, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}"><span>${esc(n)}</span><i aria-hidden="true"></i></li>`).join('')}</ul>
          <p class="gm-count"><b>${sel + 1}</b> / ${names.length}</p>
        </div>
        <div class="cs-main">
          <h2 class="cs-title">${esc(group || '')}</h2>
          ${scheme === 2 ? `<p class="gm-locked">${esc(schemes.find((x) => x.name === 'Left-Handed')?.text || 'No source we use spells out the Left-Handed layout yet.')}</p>` : `
          <div class="cs-board">${side(left, 'is-left')}<div class="cs-pad">${controllerSvg(pad)}</div>${side(right, 'is-right')}</div>
          ${scheme === 1 ? `<p class="gm-note">${esc(schemes.find((x) => x.name === 'Classic')?.text || '')}</p>` : ''}
          <p class="gm-note">A "?" means no source we use gives that button yet. <a href="${entryLink('gameplay', 'controls')}">Sources</a></p>`}
        </div></div>`;
    };
    const drawOptions = () => {
      pane.innerHTML = `<div class="gm-split"><div class="gm-left"><ul class="gm-list">${schemes.map((s) => `<li><span>${esc(s.name)}</span></li>`).join('')}</ul></div>
        <section class="gm-detail"><h2 class="gm-title">Schemes and options</h2>${schemes.map((s) => `<p><span class="gm-label">${esc(s.name)}</span>${esc(s.text)}</p>`).join('')}${notes.map((n) => `<p>${esc(n)}</p>`).join('')}
        <p class="gm-note">${entries.map((e) => `<a href="${entryLink('gameplay', e.slug)}">${esc(e.name)}: sources</a>`).join(' · ')}</p></section></div>`;
    };
    let tab = 0;
    const draw = () => (tab === 0 ? drawScheme() : drawOptions());
    wireTabs(root, 2, (t) => { tab = t; draw(); });
    draw();
    pane.addEventListener('click', (e) => {
      const li = e.target.closest('.cs-groups [data-i]');
      if (li) { sel = Number(li.dataset.i); draw(); pane.querySelector('.cs-groups')?.focus(); return; }
      const b = e.target.closest('[data-step]');
      if (!b) return;
      const by = Number(b.dataset.by);
      if (b.dataset.step === 'scheme') scheme = (scheme + by + schemeNames.length) % schemeNames.length;
      else { pad = pad === 'ps' ? 'xbox' : 'ps'; prefs.set('pad', pad); }
      draw();
      pane.querySelector(`[data-step="${b.dataset.step}"][data-by="${by}"]`)?.focus();
    });
    pane.addEventListener('keydown', (e) => {
      if (!e.target.closest('.cs-groups') || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      sel = Math.min(names.length - 1, Math.max(0, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      draw();
      pane.querySelector('.cs-groups')?.focus();
    });
  };

  // ---------- Help: the Field Manual as the game's Help menu ----------

  let manualData = null;
  const loadManual = () => manualData || (manualData = fetch('/api/manual').then((r) => r.json()));
  const SKIP_CHAPTERS = /how to read|reference/i;

  EXTRA_PAGES.help = async function renderHelp(chapterId) {
    view.innerHTML = shell({ crumbs: ['Help'], theme: 'help', body: '<p class="gm-note">Opening the Field Manual…</p>' });
    let manual;
    try { manual = await loadManual(); } catch { view.querySelector('.gm-body').innerHTML = '<p class="gm-locked">The Field Manual could not be read.</p>'; return; }
    if (!view.querySelector('.gm-help')) { /* still this page */ }
    const chapters = manual.chapters.filter((c) => !SKIP_CHAPTERS.test(c.title));
    const start = Math.max(0, chapters.findIndex((c) => c.id === chapterId));
    view.innerHTML = shell({ crumbs: ['Help'], tabs: chapters.map((c) => c.title), active: start, theme: 'help', body: '<div class="gm-pane"></div>' });
    const root = view.querySelector('.gm');
    const pane = root.querySelector('.gm-pane');
    const show = (t) => {
      const ch = chapters[t];
      // Topics: each numbered block (a titled point) under its page's heading, as the game groups its help.
      const items = [];
      for (const page of ch.pages || []) {
        const topics = (page.blocks || []).filter((b) => b.type === 'numbered' && b.title);
        if (!topics.length) continue;
        items.push({ head: page.title });
        for (const b of topics) items.push({ topic: b, page });
      }
      const topics = items.filter((x) => x.topic);
      if (!topics.length) { pane.innerHTML = `<p class="gm-locked">This chapter has no short help topics. <a href="#/manual/${esc(ch.id)}">Read it in the Field Manual</a>.</p>`; return; }
      const rows = topics.map((x) => ({ html: esc(plain(x.topic.title)) }));
      listDetail(pane, rows, (i) => {
        const { topic, page } = topics[i];
        const spoiler = /\|\|/.test(topic.text || '') && !showSpoilers;
        return `<h2 class="gm-title">${esc(plain(topic.title))}</h2>
          ${spoiler ? '<p class="gm-locked">A post-launch discovery: switch spoilers on (the eye in the top bar) to read it.</p>' : `<p>${esc(plain(topic.text))}</p>`}
          <p class="gm-note">From the Field Manual, ${esc(ch.title)}: ${esc(plain(page.title))}. <a href="#/manual/${esc(ch.id)}">Read the whole chapter</a></p>`;
      });
      // Section names above their topics, like the game's Help lists.
      const list = pane.querySelector('.gm-list');
      const heads = new Map();
      let n = 0;
      for (const x of items) { if (x.head) heads.set(n, x.head); else n += 1; }
      const label = () => list.querySelectorAll('li[data-i]').forEach((li) => {
        const h = heads.get(Number(li.dataset.i));
        if (h && !(li.previousElementSibling?.classList.contains('gm-sect'))) li.insertAdjacentHTML('beforebegin', `<li class="gm-sect" role="presentation">${esc(plain(h))}</li>`);
      });
      label();
      new MutationObserver(label).observe(list, { childList: true });
    };
    wireTabs(root, chapters.length, show);
    show(start);
  };

  // ---------- the pause menu ----------

  const PAUSE = [
    ['Map', 'map', [['Open the map', '#/map'], ['Plan a gang operations run', '#/map?plan=gang-operations'], ['Collectible Tracker', '#/tracker']]],
    ['Encyclopedia', 'book', [['All sections', '#/wiki'], ['Characters', '#/characters'], ['Locations', '#/locations'], ['Vehicles', '#/vehicles'], ['Missions', '#/wiki/missions'], ['Businesses', '#/wiki/businesses']]],
    ['Progress', 'trophy', [['Progress', '#/progress'], ['100% Checklist', '#/hundred'], ['Card Collections', '#/cards'], ['Trophy Guides', '#/trophies'], ['Cheats', '#/cheats'], ['Discovery Journal', '#/journal']]],
    ['Garage and locker', 'car', [['Garage', '#/garage'], ['Weapon Locker', '#/arsenal'], ['Saved places', '#/saved']]],
    ['Field Manual', 'guide', [['Open the Field Manual', '#/manual'], ['Help topics', '#/help']]],
    ['Help', 'compass', [['Help', '#/help'], ['Controls', '#/controls'], ['Questions', '#/wiki/faq']]],
    ['Settings', 'settings', [['Settings', '#/settings'], ['Control scheme', '#/controls']]],
  ];
  let pauseEl = null;
  let returnFocus = null;
  function closePause() {
    if (!pauseEl) return;
    pauseEl.remove();
    pauseEl = null;
    document.body.classList.remove('is-paused');
    returnFocus?.focus?.();
  }
  function openPause() {
    if (pauseEl) return;
    returnFocus = document.activeElement;
    const where = (document.title.split(' | ')[0] || 'GTA 6 HQ').replace(/ \/ .*/, '');
    let sel = 0;
    pauseEl = document.createElement('div');
    pauseEl.className = 'pause';
    pauseEl.setAttribute('role', 'dialog');
    pauseEl.setAttribute('aria-modal', 'true');
    pauseEl.setAttribute('aria-label', 'Pause menu');
    pauseEl.innerHTML = `<div class="pause-side">
        <span class="pause-logo" aria-hidden="true">VI</span>
        <ul class="pause-list" role="menu" aria-label="Menu">${PAUSE.map(([label, ic], i) => `<li role="none"><button type="button" role="menuitem" data-i="${i}" aria-current="${i === sel}">${icon(ic)}<span>${esc(label)}</span></button></li>`).join('')}</ul>
      </div>
      <div class="pause-right"><h2 class="pause-where">${esc(where)}</h2><ul class="pause-sub" role="menu" aria-label="Pages"></ul></div>
      <div class="pause-hints" aria-hidden="true"><span>Select <kbd>Enter</kbd></span><span>Back <kbd>Esc</kbd></span></div>`;
    const sub = pauseEl.querySelector('.pause-sub');
    const drawSub = () => {
      pauseEl.querySelectorAll('.pause-list [data-i]').forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.i) === sel)));
      sub.innerHTML = PAUSE[sel][2].map(([label, href]) => `<li role="none"><a role="menuitem" href="${href}">${esc(label)}</a></li>`).join('');
    };
    drawSub();
    document.body.append(pauseEl);
    document.body.classList.add('is-paused');
    pauseEl.querySelector('.pause-list [data-i="0"]').focus();
    pauseEl.addEventListener('click', (e) => {
      const b = e.target.closest('.pause-list [data-i]');
      if (b) { sel = Number(b.dataset.i); drawSub(); sub.querySelector('a')?.focus(); return; }
      if (e.target.closest('.pause-sub a')) closePause();
      else if (e.target === pauseEl) closePause();
    });
    pauseEl.addEventListener('focusin', (e) => {
      const b = e.target.closest('.pause-list [data-i]');
      if (b && Number(b.dataset.i) !== sel) { sel = Number(b.dataset.i); drawSub(); }
    });
    pauseEl.addEventListener('keydown', (e) => {
      const inList = e.target.closest('.pause-list');
      const inSub = e.target.closest('.pause-sub');
      const move = (container, sel2, by) => { const items = [...container.querySelectorAll('[role="menuitem"]')]; const i = items.indexOf(e.target); items[(i + by + items.length) % items.length]?.focus(); };
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (inSub) pauseEl.querySelector(`.pause-list [data-i="${sel}"]`).focus(); else closePause(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(inList ? pauseEl.querySelector('.pause-list') : sub, sel, e.key === 'ArrowDown' ? 1 : -1); return; }
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && inList) { e.preventDefault(); sub.querySelector('a')?.focus(); return; }
      if (e.key === 'ArrowLeft' && inSub) { e.preventDefault(); pauseEl.querySelector(`.pause-list [data-i="${sel}"]`).focus(); return; }
      if (e.key === 'Tab') { // keep focus inside the menu
        const all = [...pauseEl.querySelectorAll('[role="menuitem"]')];
        const i = all.indexOf(e.target);
        if (e.shiftKey && i === 0) { e.preventDefault(); all[all.length - 1].focus(); } else if (!e.shiftKey && i === all.length - 1) { e.preventDefault(); all[0].focus(); }
      }
    });
  }
  window.PauseMenu = { open: openPause, close: closePause };
  // Esc opens it, unless something else on the page is using Esc (a dialog, a card, the intro, a field).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || pauseEl || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const busy = [...document.querySelectorAll('dialog[open], .leaflet-popup, .maplibregl-popup, .splash, .intro-pick, .map-page.is-immersive, .lightbox, .m-zoom, .confirm, .picker[open]')]
      .some((el) => !el.hidden && el.getClientRects().length > 0); // only what is actually on screen
    if (busy) return;
    e.preventDefault();
    openPause();
  });
  document.addEventListener('click', (e) => { if (e.target.closest('#pause-open')) openPause(); });
  window.addEventListener('hashchange', closePause);
})();

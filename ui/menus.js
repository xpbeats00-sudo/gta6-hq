// GTA 6 HQ — menus drawn like the game's own:
//   the pause menu   Esc (or the menu button in the top bar) over a blurred page: the VI mark, a
//                    list on the left and, for the highlighted item, its pages on the right
//   #/controls       Settings / Control scheme: a controller with each action pointed at its button,
//                    for PlayStation or Xbox, Default or Classic, one group of controls at a time
//   #/help           Help: the Field Manual's chapters as tabs, each topic on the left, its text on the right
//
// Every button and every line of help comes from the encyclopedia's controls entry and the Field
// Manual (data/wiki, data/manual.json). The controller drawings (DualSense, Xbox Series) are our own.
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

  /*
   * The controllers, front on as the game's control screen shows them: a DualSense (PlayStation 5) and an
   * Xbox Series controller. Our own drawings of each pad's shape and button layout (no maker artwork), in
   * a 600 x 400 box. ANCHOR gives where each button sits, so every action can draw a line to its button.
   */
  const ANCHOR = {
    ps: {
      L2: [128, 34], L1: [140, 62], R1: [460, 62], R2: [472, 34], LS: [222, 246], RS: [378, 246],
      Up: [106, 141], Down: [106, 191], Left: [81, 166], Right: [131, 166],
      Triangle: [494, 133], Circle: [527, 166], Cross: [494, 199], Square: [461, 166],
      TouchPad: [300, 104], Create: [203, 96], Options: [397, 96], PS: [300, 252],
    },
    xbox: {
      LT: [128, 34], LB: [140, 64], RB: [460, 64], RT: [472, 34], LS: [180, 156], RS: [372, 238],
      Up: [228, 210], Down: [228, 266], Left: [200, 238], Right: [256, 238],
      Y: [428, 120], B: [462, 154], A: [428, 188], X: [394, 154],
      View: [262, 156], Menu: [338, 156], Share: [300, 192], Xbox: [300, 104],
    },
  };
  const stick = (x, y, label) => `<g class="pad-stick" transform="translate(${x} ${y})"><circle r="33" class="pad-well"/><circle r="27" class="pad-cap"/><circle r="19" class="pad-cap-top"/><text y="5" class="pad-mark">${label}</text></g>`;
  const dualsense = () => `<svg class="pad-art" viewBox="0 0 600 400" aria-hidden="true">
    <defs><linearGradient id="ds-shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#eceaf0"/><stop offset="1" stop-color="#d9d6de"/></linearGradient>
      <linearGradient id="ds-core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2a31"/><stop offset="1" stop-color="#16151a"/></linearGradient></defs>
    <path class="pad-trigger" d="M92 52 C100 28 140 18 176 22 L188 44 C150 42 118 48 102 62 Z"/>
    <path class="pad-trigger" d="M508 52 C500 28 460 18 424 22 L412 44 C450 42 482 48 498 62 Z"/>
    <path class="pad-bumper" d="M98 74 C114 54 168 46 206 50 L210 62 C170 60 128 68 108 84 Z"/>
    <path class="pad-bumper" d="M502 74 C486 54 432 46 394 50 L390 62 C430 60 472 68 492 84 Z"/>
    <path fill="url(#ds-shell)" class="pad-edge" d="M150 66 C200 54 250 52 300 52 C350 52 400 54 450 66 C502 78 532 108 550 160 C570 216 586 282 589 322 C593 364 560 388 528 374 C502 362 488 336 468 308 C452 288 438 280 416 280 L184 280 C162 280 148 288 132 308 C112 336 98 362 72 374 C40 388 7 364 11 322 C14 282 30 216 50 160 C68 108 98 78 150 66 Z"/>
    <path fill="url(#ds-core)" d="M176 128 C210 116 390 116 424 128 C440 134 446 152 448 174 L452 280 L148 280 L152 174 C154 152 160 134 176 128 Z"/>
    <path class="pad-light" d="M214 70 C206 104 204 132 206 156"/><path class="pad-light" d="M386 70 C394 104 396 132 394 156"/>
    <rect x="216" y="64" width="168" height="88" rx="16" class="pad-touch"/>
    <rect x="190" y="88" width="10" height="20" rx="5" class="pad-small" transform="rotate(-12 195 98)"/>
    <rect x="400" y="88" width="10" height="20" rx="5" class="pad-small" transform="rotate(12 405 98)"/>
    <g class="pad-dpad-ps" transform="translate(106 166) scale(0.82)">
      <path d="M-11 -44 h22 v20 l-11 12 l-11 -12 z"/><path d="M-11 44 h22 v-20 l-11 -12 l-11 12 z"/>
      <path d="M-44 -11 v22 h20 l12 -11 l-12 -11 z"/><path d="M44 -11 v22 h-20 l-12 -11 l12 -11 z"/></g>
    <g transform="translate(494 166) scale(0.92)" class="pad-face-ps">
      <circle cy="-36" r="17"/><circle cx="36" r="17"/><circle cy="36" r="17"/><circle cx="-36" r="17"/>
      <path d="M-7 -31 L0 -43 L7 -31 Z"/><circle cx="36" r="7"/><path d="M-6 30 L6 42 M6 30 L-6 42"/><rect x="-42" y="-6" width="12" height="12"/></g>
    ${stick(222, 246, 'L')}${stick(378, 246, 'R')}
    <g transform="translate(300 252)" class="pad-home"><circle r="13"/><circle r="8"/></g>
    <rect x="290" y="270" width="20" height="5" rx="2.5" class="pad-small"/>
  </svg>`;
  const xboxPad = () => `<svg class="pad-art" viewBox="0 0 600 400" aria-hidden="true">
    <defs><linearGradient id="xb-shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.65" stop-color="#ebeaee"/><stop offset="1" stop-color="#d4d2d8"/></linearGradient></defs>
    <path class="pad-trigger" d="M96 56 C104 30 142 20 178 24 L190 48 C152 46 122 52 106 66 Z"/>
    <path class="pad-trigger" d="M504 56 C496 30 458 20 422 24 L410 48 C448 46 478 52 494 66 Z"/>
    <path class="pad-bumper" d="M100 80 C120 58 176 50 214 56 L218 70 C176 66 132 74 112 90 Z"/>
    <path class="pad-bumper" d="M500 80 C480 58 424 50 386 56 L382 70 C424 66 468 74 488 90 Z"/>
    <path fill="url(#xb-shell)" class="pad-edge" d="M168 74 C214 66 250 72 300 72 C350 72 386 66 432 74 C492 84 528 118 548 172 C568 228 584 292 584 330 C584 370 548 392 516 374 C492 360 476 330 454 306 C436 288 418 282 396 282 L204 282 C182 282 164 288 146 306 C124 330 108 360 84 374 C52 392 16 370 16 330 C16 292 32 228 52 172 C72 118 108 84 168 74 Z"/>
    <circle cx="300" cy="104" r="20" class="pad-guide"/><path class="pad-guide-x" d="M290 94 L310 114 M310 94 L290 114"/>
    <circle cx="262" cy="156" r="9" class="pad-small"/><path class="pad-glyph" d="M257 153 h6 v5 h-6 z M260 151 h6 v5"/>
    <circle cx="338" cy="156" r="9" class="pad-small"/><path class="pad-glyph" d="M334 152 h8 M334 156 h8 M334 160 h8"/>
    <rect x="291" y="186" width="18" height="11" rx="5.5" class="pad-small"/>
    ${stick(180, 156, 'L')}
    <g transform="translate(228 238)"><circle r="34" class="pad-well"/><path class="pad-dpad-xb" d="M-9 -28 h18 v19 h19 v18 h-19 v19 h-18 v-19 h-19 v-18 h19 z"/></g>
    ${stick(372, 238, 'R')}
    <g transform="translate(428 154)" class="pad-face-xb">
      <circle cy="-34" r="16"/><circle cx="34" r="16"/><circle cy="34" r="16"/><circle cx="-34" r="16"/>
      <text y="-28" fill="${XB_FACE.Y}">Y</text><text x="34" y="6" fill="${XB_FACE.B}">B</text><text y="40" fill="${XB_FACE.A}">A</text><text x="-34" y="6" fill="${XB_FACE.X}">X</text></g>
  </svg>`;
  const controllerSvg = (pad) => (pad === 'ps' ? dualsense() : xboxPad());

  /** Which button a control's text names first, as a key into ANCHOR (null if it names none we draw). */
  function anchorOf(text, pad) {
    const t = plain(text);
    const d = /D-pad (Up|Down|Left|Right)/.exec(t);
    const words = pad === 'ps'
      ? [[/\bL3\b|left stick/i, 'LS'], [/\bR3\b|right stick|^R\b/i, 'RS'], [/\bL2\b/, 'L2'], [/\bL1\b/, 'L1'], [/\bR2\b/, 'R2'], [/\bR1\b/, 'R1'],
          [/\bCross\b/, 'Cross'], [/\bCircle\b/, 'Circle'], [/\bSquare\b/, 'Square'], [/\bTriangle\b/, 'Triangle'], [/Touch Pad/i, 'TouchPad'], [/\bOptions\b/, 'Options'], [/\bCreate\b/, 'Create']]
      : [[/\bLS\b|left stick/i, 'LS'], [/\bRS\b|right stick/i, 'RS'], [/\bLT\b/, 'LT'], [/\bLB\b/, 'LB'], [/\bRT\b/, 'RT'], [/\bRB\b/, 'RB'], [/\bView\b/, 'View'], [/\bMenu\b/, 'Menu'],
          [/(^|[^\w])A(?!\w)/, 'A'], [/(^|[^\w])B(?!\w)/, 'B'], [/(^|[^\w])X(?!\w)/, 'X'], [/(^|[^\w])Y(?!\w)/, 'Y']];
    // The button named first in the text wins (so "Hold L2, then R3" points at L2).
    let best = null;
    for (const [re, key] of words) { const m = re.exec(t); if (m && (!best || m.index < best.i)) best = { i: m.index, key }; }
    if (d && (!best || d.index < best.i)) return d[1];
    return best ? best.key : null;
  }

  /** Draw a leader line from each action to its button, over the board; redrawn when the board resizes. */
  function drawLeaders(board, pad) {
    const art = board.querySelector('.pad-art');
    if (!art) return;
    let layer = board.querySelector('.cs-leaders');
    if (!layer) { layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); layer.setAttribute('class', 'cs-leaders'); layer.setAttribute('aria-hidden', 'true'); board.appendChild(layer); }
    const draw = () => {
      if (!board.isConnected) return;
      const b = board.getBoundingClientRect();
      const a = art.getBoundingClientRect();
      layer.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
      const sx = a.width / 600, sy = a.height / 400;
      layer.innerHTML = [...board.querySelectorAll('li[data-anchor]')].map((li) => {
        const pt = ANCHOR[pad][li.dataset.anchor];
        if (!pt) return '';
        const end = [a.left - b.left + pt[0] * sx, a.top - b.top + pt[1] * sy];
        const r = li.querySelector('.cs-btn').getBoundingClientRect();
        const left = li.closest('.is-left');
        const start = [left ? r.right - b.left + 8 : r.left - b.left - 8, r.top - b.top + r.height / 2];
        const elbow = left ? Math.max(start[0] + 10, a.left - b.left + 10) : Math.min(start[0] - 10, a.right - b.left - 10);
        return `<polyline points="${start.join(',')} ${elbow},${start[1]} ${end.join(',')}"/><circle cx="${end[0]}" cy="${end[1]}" r="3.5"/>`;
      }).join('');
    };
    draw();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { if (!board.isConnected) { ro.disconnect(); return; } draw(); });
      ro.observe(board);
    }
  }

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
      // Each action sits on the side of the pad its button is on (as the game lays it out), top to bottom in
      // the order its buttons sit; centre buttons and actions with no drawn button fill the shorter side.
      const placed = rows.map((r) => { const key = anchorOf(pad === 'ps' ? r.ps : r.xbox, pad); return { ...r, key, pt: key ? ANCHOR[pad][key] : null }; });
      const left = [], right = [], middle = [];
      placed.forEach((r) => (!r.pt || (r.pt[0] > 270 && r.pt[0] < 330) ? middle : r.pt[0] < 300 ? left : right).push(r));
      middle.forEach((r) => (left.length <= right.length ? left : right).push(r));
      const byHeight = (x, y) => (x.pt ? x.pt[1] : 999) - (y.pt ? y.pt[1] : 999);
      left.sort(byHeight); right.sort(byHeight);
      const side = (list, cls) => `<ul class="cs-col ${cls}">${list.map((r) => `<li class="${r.changed ? 'is-changed' : ''}"${r.key ? ` data-anchor="${r.key}"` : ''}><span class="cs-act">${esc(r.action)}</span><span class="cs-btn">${glyphs(pad === 'ps' ? r.ps : r.xbox, pad)}</span></li>`).join('')}</ul>`;
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
      const board = pane.querySelector('.cs-board');
      if (board) requestAnimationFrame(() => drawLeaders(board, pad));
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

// GTA 6 HQ — research tools built on the encyclopedia's own entries, drawn like the game's own menus
// (a purple Progress screen for cheats, cards and trophies; the dark weapon locker and garage):
//   #/cards     Card Collections: the 18 card sets, each card with a tick (shared with the Collectible Tracker)
//   #/cheats    Cheats and Controls: every cheat with its D-pad code and unlock, and the control layout
//   #/arsenal   Weapon Locker: every weapon with its stat bars, side-by-side compare and an owned list
//   #/garage    Garage: every vehicle with its stat bars, compare and a personal garage
//   #/trophies  Trophy Guides: each trophy as a step-by-step guide with pictures
//
// Nothing here is a figure of this file's own: every number, code and step comes from an entry
// (data/wiki/*.json), and each page links back to the entries and their sources. The menu look
// (colours, the D-pad glyph, the BuckMe and cash marks) is drawn here. The only game artwork is the
// card art cropped from in-game menu captures (see CARD_FACES below; records in data/media.json).
// Loaded after app.js and explore.js; uses their globals (state, view, esc, icon, entryLink,
// isHidden, veil, resolve, showSpoilers, UserStore, EXTRA_PAGES).

(function () {
  const plain = (s) => String(s || '').replace(/\|\|/g, '').trim();
  const slugify = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const open = (section) => (state.wiki[section] || []).filter((e) => !isHidden(section, e));
  const num = (v) => (typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null));
  const LOCK = '<svg class="i gm-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  const TICK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /** The D-pad glyph with one arm lit, like the game's cheat codes. */
  const dpad = (dir) => {
    const lit = { Up: 'M9.5 2h5v6.5h-5z', Down: 'M9.5 15.5h5V22h-5z', Left: 'M2 9.5h6.5v5H2z', Right: 'M15.5 9.5H22v5h-6.5z' }[dir];
    return `<svg class="gm-dpad" viewBox="0 0 24 24" role="img" aria-label="${dir}"><path class="gm-dpad-base" d="M9.5 2h5v7.5H22v5h-7.5V22h-5v-7.5H2v-5h7.5z"/>${lit ? `<path class="gm-dpad-lit" d="${lit}"/>` : ''}</svg>`;
  };

  /**
   * The menu frame: a breadcrumb title ("PROGRESS / CHEATS"), an optional tab row between L1 and R1
   * badges (Q and E, or [ and ], switch tabs from the keyboard), then the page.
   */
  function shell({ crumbs, tabs = [], active = 0, theme = 'progress', stacked = false, body }) {
    // stacked: the parent on its own small line above the title ("COLLECTIONS /" over the set's name), as in a set's own screen.
    return `<div class="gm gm-${theme}">
      <header class="gm-head">
        <h1 class="gm-crumbs${stacked ? ' is-stacked' : ''}">${crumbs.slice(0, -1).map((c) => `<span>${esc(c)} / </span>`).join('')}${stacked ? `<b>${esc(crumbs[crumbs.length - 1])}</b>` : esc(crumbs[crumbs.length - 1])}</h1>
        ${tabs.length ? `<div class="gm-tabs" role="tablist" aria-label="Sections">
          <kbd class="gm-bumper" title="Q or [ for the previous tab">L1</kbd>
          ${tabs.map((t, i) => `<button type="button" role="tab" data-tab="${i}" aria-selected="${i === active}" tabindex="${i === active ? 0 : -1}">${esc(t)}</button>`).join('')}
          <kbd class="gm-bumper" title="E or ] for the next tab">R1</kbd></div>` : ''}
      </header>
      <div class="gm-body">${body}</div>
    </div>`;
  }
  /** Tab switching for a shell: clicks, arrow keys on the tabs, and Q/E or [ ] anywhere on the page. */
  function wireTabs(root, count, onTab) {
    let current = Number(root.querySelector('[role="tab"][aria-selected="true"]')?.dataset.tab || 0);
    const go = (i) => {
      current = (i + count) % count;
      root.querySelectorAll('[role="tab"]').forEach((t) => { const on = Number(t.dataset.tab) === current; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      onTab(current);
    };
    root.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) go(Number(t.dataset.tab)); });
    const onKey = (e) => {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'q' || e.key === '[') { e.preventDefault(); go(current - 1); }
      if (e.key === 'e' || e.key === ']') { e.preventDefault(); go(current + 1); }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('[role="tab"]')) {
        e.preventDefault(); go(current + (e.key === 'ArrowRight' ? 1 : -1)); root.querySelector('[role="tab"][aria-selected="true"]')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
  }
  /**
   * A list on the left and the chosen item's detail on the right, as the game's menus do.
   * rows: [{ html, locked }]; detail(i) → html. Up and Down move through the list.
   */
  function listDetail(host, rows, detail, start = 0, onSelect = () => {}) {
    let sel = Math.min(Math.max(0, start), Math.max(0, rows.length - 1));
    host.innerHTML = `<div class="gm-split"><div class="gm-left"><ul class="gm-list" role="listbox" aria-label="Items" tabindex="0"></ul><p class="gm-count"></p></div><section class="gm-detail" aria-live="polite"></section></div>`;
    const list = host.querySelector('.gm-list');
    const draw = (scroll = false) => {
      list.innerHTML = rows.map((r, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}" class="${r.locked ? 'is-locked' : ''}${r.done ? ' is-done' : ''}">${r.locked ? LOCK : ''}<span>${r.html}</span>${r.done ? `<i class="gm-row-tick">${TICK}</i>` : ''}</li>`).join('') || '<li class="gm-empty">Nothing here.</li>';
      host.querySelector('.gm-count').innerHTML = rows.length ? `<b>${sel + 1}</b> / ${rows.length}` : '';
      host.querySelector('.gm-detail').innerHTML = rows.length ? detail(sel) : '';
      if (scroll) list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      onSelect(sel);
    };
    list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) { sel = Number(li.dataset.i); draw(); } });
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      sel = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      draw(true);
    });
    draw(true);
    return { redraw: (r) => { if (r) rows = r; sel = Math.min(sel, Math.max(0, rows.length - 1)); draw(); }, get selected() { return sel; } };
  }
  const meter = (n, of) => `<span class="gm-meter" aria-hidden="true"><i style="width:${of ? Math.min(100, Math.round((n / of) * 100)) : 0}%"></i></span>`;

  // ---------- Card Collections ----------

  const VARIANT = {
    bronze: '#b5763d', silver: '#c3c7d0', gold: '#e6b93d', standard: '#9b93b4', pink: '#f27bb8', purple: '#9b6be0',
    'deep red': '#b3263c', 'light blue': '#7cc8f0', orange: '#f28a2e', blue: '#3a7be0', maroon: '#7d2338', 'navy blue': '#26407a',
    'bright orange': '#ff7a1a', yellow: '#f2d23a', green: '#3fbf6a', teal: '#2bb3a6', 'dusty pink': '#d79aa8', red: '#e0393e', white: '#f1f1f4',
  };
  /** Set covers: a colour pair per set. Our own design: the set's name, no team or club logos. */
  const COVERS = [
    ['#f06fb0', '#7fd3ef'], ['#1d9fd8', '#7be0f2'], ['#0f7a5c', '#41c79a'], ['#6fd4d1', '#e8f6f4'], ['#8a8f99', '#d8dbe1'], ['#f28a2e', '#ffc074'],
    ['#2b2f6b', '#d33a4a'], ['#b8262f', '#f0d2d4'], ['#5b3fa8', '#f06fb0'], ['#d9346b', '#ffb0cf'], ['#151026', '#8d4fd9'], ['#2a1d4a', '#f2c94c'],
    ['#ff6fb5', '#ffd1e6'], ['#1c1033', '#d13a8a'], ['#1d1a3a', '#46c3f2'], ['#141414', '#f2d23a'], ['#1d3f8a', '#e0393e'], ['#0f4a3f', '#f2a33a'],
  ];
  const CARD_TYPE = /^Collectible card \((.+)\)$/;
  /*
   * Real card art, cropped from captures of the in-game menu (the owner's and PowerPyx's; records in data/media.json):
   * a set's cover is its "Card set" entry's picture (images/collectibles/card-set-<slug>.jpg); a card's
   * face is its entry's facts.menu_picture only (never its entry picture, which mostly shows where the card lies).
   * Sets without a capture yet keep the drawn cover.
   */
  // A card's real face is its entry's facts.menu_picture (cut from a capture of the set's own screen).
  // Card-set entries whose slug is not "card-set-" plus the set's name.
  const SET_ENTRY = { 'B.A.M. Backyard Wrestling': 'card-set-backyard-wrestling', 'Ed Universe': 'card-set-ed-comics-universe', 'Legends of Ratface': 'card-set-the-legends-of-ratface', 'Liberty Swingers': 'card-set-liberty-city-swingers' };
  /*
   * The 18 sets as the game's Progress > Collections > Collectible Cards menu shows them: in its order, with
   * its name and description for each (read from the menu captures credited in data/media.json). Keys are
   * the set names our card entries use.
   */
  const GAME_SETS = [
    ['Vice City Flamingos', 'Vice City Flamingos', 'A set of collectible baseball cards picturing the Vice City Flamingos.'],
    ['Vice City Narcos', 'Vice City Narcos', 'A set of collectible basketball cards picturing the Vice City Narcos.'],
    ['Vice City Manatees', 'Vice City Manatees', 'A set of collectible football cards picturing the Vice City Manatees.'],
    ['Vice City Club de Futbol', 'Vice City Club de Fútbol', 'A set of collectible soccer cards picturing Vice City Club de Fútbol.'],
    ['Liberty Swingers', 'Liberty City Swingers', 'A set of collectible baseball cards picturing the Liberty City Swingers.'],
    ['Liberty City Penetrators', 'Liberty City Penetrators', 'A set of collectible basketball cards picturing the Liberty City Penetrators.'],
    ['Liberty City Wrath', 'Liberty City Wrath', 'A set of collectible football cards picturing the Liberty City Wrath.'],
    ['Los Santos Corkers', 'Los Santos Corkers', 'A set of collectible baseball cards picturing the Los Santos Corkers.'],
    ['Los Santos Panic', 'Los Santos Panic', 'A set of collectible basketball cards picturing the Los Santos Panic.'],
    ['Los Santos Pounders', 'Los Santos Pounders', 'A set of collectible football cards picturing the Los Santos Pounders.'],
    ['B.A.M. Backyard Wrestling', 'Backyard Wrestling', 'A set of collectible sports cards picturing wrestlers from Backyard American Mania.'],
    ["America's Next Top Hooker", "America's Next Top Hooker", "A set of collectible cards picturing winners from America's Next Top Hooker."],
    ['Delights Dancers', 'Delights Dancers', 'A set of collectible cards picturing dancers from Delights Cabaret in Port Gellhorn.'],
    ['Jack of Hearts Dancers', 'Jack of Hearts Dancers', 'A set of collectible cards picturing dancers from the Jack of Hearts in Crosstown.'],
    ['Nine1Nine Dancers', 'Nine1Nine Dancers', 'A set of collectible cards picturing dancers from NINE1NINE in Downtown.'],
    ['Legends of Ratface', 'The Legends of Ratface', 'A set of collectible cards picturing characters from the comic book The Legends of Ratface.'],
    ["Right Wing: America's Hero", "Right Wing: America's Hero", "A set of collectible cards picturing characters from the TV show Right Wing: America's Hero."],
    ['Ed Universe', 'ED Comics Universe', 'A set of collectible cards picturing characters from the ED Comics Universe.'],
  ];
  const GAME_ORDER = new Map(GAME_SETS.map(([key, name, about], i) => [key, { i, name, about }]));
  function cardSets() {
    const sets = new Map();
    // Every card is listed, as in the Collectible Tracker; a card whose entry is a hidden spoiler
    // keeps its tick box but not its name (shown with spoilers on).
    for (const e of state.wiki.collectibles || []) {
      const m = CARD_TYPE.exec(e.facts?.type || '');
      if (!m) continue;
      if (!sets.has(m[1])) sets.set(m[1], { name: m[1], slug: slugify(m[1]), total: 0, cards: [] });
      const set = sets.get(m[1]);
      set.cards.push(e);
      if (typeof e.facts.total === 'number') set.total = Math.max(set.total, e.facts.total);
    }
    const entries = new Map((state.wiki.collectibles || []).filter((e) => e.facts?.type === 'Card set').map((e) => [e.slug, e]));
    const rank = (s) => GAME_ORDER.get(s.name)?.i ?? 99;
    return [...sets.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).map((s, i) => {
      const entry = entries.get(SET_ENTRY[s.name] || `card-set-${slugify(s.name.replace(/'/g, ''))}`);
      const game = GAME_ORDER.get(s.name);
      return { ...s, cover: COVERS[i % COVERS.length], total: s.total || s.cards.length, entry, art: entry?.image || '', title: game?.name || s.name, about: game?.about || '' };
    });
  }
  const cardParts = (e) => {
    const m = /^(.*) \(([^)]+)\) card$/.exec(e.name);
    return m ? { person: m[1], variant: m[2] } : { person: e.name.replace(/ card$/, ''), variant: '' };
  };
  const ticked = () => UserStore.get('collectible-ticks', {});
  // The menu's "set" mark in a cover's top-right corner: two stacked cards.
  const STACK = '<svg class="gm-stack" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="2" width="8.5" height="8.5" rx="1.2"/><path d="M3.5 5.5H2v8.5h8.5v-1.5"/></svg>';
  // With art, the drawn cover's colours and name ride along, shown only if the picture fails to load (see onArtError).
  const cover = (set, cls = '') => set.art
    ? `<span class="gm-cover has-art ${cls}" style="--a:${set.cover[0]};--b:${set.cover[1]}" aria-hidden="true"><img src="${esc(set.art)}" alt="" loading="lazy" decoding="async"><span>${esc(set.name)}</span>${cls.includes('is-back') ? '' : STACK}</span>`
    : `<span class="gm-cover ${cls}" style="--a:${set.cover[0]};--b:${set.cover[1]}" aria-hidden="true"><span>${esc(set.name)}</span>${cls.includes('is-back') ? '' : STACK}</span>`;
  // The game's button prompts in the bottom-right corner (Enter and Backspace on the keyboard).
  const PROMPT = { select: '<svg class="gm-glyph" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6"/><path d="M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4"/></svg>', back: '<svg class="gm-glyph" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6"/><circle cx="10" cy="10" r="4.2"/></svg>' };
  /** A card picture that will not load falls back to the drawn cover or face under it, never a broken-image box. */
  const onArtError = (root) => root.addEventListener('error', (e) => {
    const box = e.target.tagName === 'IMG' && e.target.closest('.has-art');
    if (box) box.classList.add('is-broken');
  }, true);
  const prompts = (items) => `<nav class="gm-prompts" aria-label="Buttons">${items.map(([label, glyph, attrs]) => `<button type="button" class="gm-prompt" ${attrs}>${esc(label)}${PROMPT[glyph]}</button>`).join('')}</nav>`;

  EXTRA_PAGES.cards = function renderCards(setSlug) {
    const sets = cardSets();
    const found = (s, t = ticked()) => s.cards.filter((c) => t[c.slug]).length;
    const set = setSlug && sets.find((s) => s.slug === setSlug);
    const overview = state.wiki.collectibles?.find((e) => e.slug === 'collectible-cards');
    if (!set) {
      let sel = 0;
      view.innerHTML = shell({ crumbs: ['Progress', 'Collections'], tabs: ['Collectible cards'], theme: 'cards', body: `<div class="gm-split gm-split-wide gm-collections">
          <div class="gm-left"><ul class="gm-cover-grid" role="listbox" aria-label="Card sets" tabindex="0"></ul><p class="gm-count"></p></div>
          <section class="gm-detail gm-cards-detail" aria-live="polite"></section></div>
          ${prompts([['Select', 'select', 'data-act="select"'], ['Back', 'back', 'data-act="back"']])}` });
      const grid = view.querySelector('.gm-cover-grid');
      onArtError(view.querySelector('.gm'));
      const draw = () => {
        const t = ticked();
        grid.innerHTML = sets.map((s, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}" class="${found(s, t) >= s.total ? 'is-done' : ''}">${cover(s)}</li>`).join('');
        view.querySelector('.gm-count').innerHTML = `<b>${sel + 1}</b> / ${sets.length}`;
        const s = sets[sel];
        const f = found(s, t);
        const done = sets.filter((x) => found(x, t) >= x.total).length;
        view.querySelector('.gm-cards-detail').innerHTML = `<h2 class="gm-title">${esc(s.title)}</h2>
          <p>${s.about ? `${esc(s.about)} It has ${s.total} cards` : `A set of ${s.total} collectible cards`}${s.cards.length < s.total ? `, ${s.cards.length} of them listed one by one so far` : ''}.</p>
          <p><a class="gm-btn" href="#/cards/${s.slug}">Open the set</a></p>
          <p class="gm-note">${done} of ${sets.length} sets complete. The 100% checklist asks for 15; a trophy comes at 3.${overview ? ` <a href="${entryLink('collectibles', overview.slug)}">How cards work</a>` : ''}</p>
          <div class="gm-foot"><span>Cards found</span><b>${f} / ${s.total}</b></div>`;
      };
      draw();
      grid.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (!li) return; const i = Number(li.dataset.i); if (i === sel) location.hash = `#/cards/${sets[i].slug}`; else { sel = i; draw(); } });
      grid.addEventListener('dblclick', (e) => { const li = e.target.closest('[data-i]'); if (li) location.hash = `#/cards/${sets[Number(li.dataset.i)].slug}`; });
      grid.addEventListener('keydown', (e) => {
        const cols = Math.max(1, Math.round(grid.clientWidth / (grid.firstElementChild?.offsetWidth || 1)));
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
        if (e.key === 'Enter') { location.hash = `#/cards/${sets[sel].slug}`; return; }
        if (!step) return;
        e.preventDefault(); sel = Math.min(sets.length - 1, Math.max(0, sel + step)); draw();
        grid.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      });
      view.querySelector('.gm-prompts').addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'select') location.hash = `#/cards/${sets[sel].slug}`;
        if (act === 'back') location.hash = '#/progress';
      });
      wireTabs(view.querySelector('.gm'), 1, () => {});
      return;
    }

    const anyHidden = set.cards.some((c) => isHidden('collectibles', c));
    let sel = 0;
    let flipped = false; // the big card's side: face (false) or the set's back (true), as the game's R stick turns it
    view.innerHTML = shell({ crumbs: ['Collections', set.title], stacked: true, theme: 'cards', body: `${anyHidden ? '<p class="gm-back"><span class="gm-note">Card names and places are post-launch discoveries: switch spoilers on (the eye in the top bar) to see them.</span></p>' : ''}
        <div class="gm-set">
          <div class="gm-left"><ul class="gm-card-grid" role="listbox" aria-label="Cards" tabindex="0"></ul><p class="gm-count"></p></div>
          <div class="gm-card-show"></div>
          <section class="gm-detail gm-card-detail" aria-live="polite"></section></div>
        ${prompts([['Back', 'back', 'data-act="back"']])}` });
    const grid = view.querySelector('.gm-card-grid');
    const face = (c, t, big = false) => {
      const hidden = isHidden('collectibles', c);
      const { person, variant } = cardParts(c);
      const color = VARIANT[variant.toLowerCase()] || '#9b93b4';
      const art = !hidden && c.facts?.menu_picture ? c.facts.menu_picture : '';
      // A card with a real front shows it, found or not, with a tick once found. Without one: the set's
      // back until found (as in the game), then a drawn face framed in its variant's colour.
      if (art) return `<span class="gm-card has-art${t[c.slug] ? ' is-found' : ''}${big ? ' is-big' : ''}"><img src="${art}" alt="" loading="lazy" decoding="async">${t[c.slug] && !big ? `<i class="gm-card-tick" aria-hidden="true">${TICK}</i>` : ''}</span>`;
      if (!(t[c.slug] || big)) return cover(set, 'is-back');
      return `<span class="gm-card${t[c.slug] ? '' : ' is-missing'}${big ? ' is-big' : ''}" style="--a:${set.cover[0]};--b:${set.cover[1]};--v:${color}"><b>${esc(hidden ? 'Spoiler hidden' : person)}</b><em>${esc(variant)}</em></span>`;
    };
    const draw = (scroll = false) => {
      const t = ticked();
      grid.innerHTML = set.cards.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}" aria-label="${esc(isHidden('collectibles', c) ? `${cardParts(c).variant} card` : c.name)}${t[c.slug] ? ', found' : ''}">${face(c, t)}</li>`).join('');
      view.querySelector('.gm-count').innerHTML = `<b>${sel + 1}</b> / ${set.cards.length}${set.cards.length < set.total ? ` <span class="gm-note">(${set.total} in the set)</span>` : ''}`;
      const c = set.cards[sel];
      const hidden = isHidden('collectibles', c);
      const { person, variant } = cardParts(c);
      const where = hidden ? '' : plain((c.body || [])[1] || '');
      view.querySelector('.gm-card-show').innerHTML = `<button type="button" class="gm-flip" title="Turn the card over (R)" aria-label="Turn the card over">${flipped ? cover(set, 'is-back is-big') : face(c, t, true)}</button>
        <p class="gm-pager" aria-hidden="true"><kbd class="gm-key">R</kbd><i class="${flipped ? '' : 'on'}"></i><i class="${flipped ? 'on' : ''}"></i></p>`;
      view.querySelector('.gm-card-detail').innerHTML = `<h2 class="gm-title">${esc(hidden ? 'Spoiler hidden' : person)}</h2>
          <p>${!hidden && c.facts?.menu_text ? esc(c.facts.menu_text) : `${variant ? `A ${esc(variant.toLowerCase())} card` : 'A card'}${hidden ? '' : ` featuring ${esc(person)}`}, from ${esc(set.title)}.`}</p>
          ${where ? `<p>${esc(where)}</p>` : ''}
          ${c.facts?.region && !hidden ? `<p class="gm-note">${icon('pin')} ${esc(c.facts.region)}</p>` : ''}
          <p><a href="${entryLink('collectibles', c.slug)}">Open the entry and its sources</a></p>
          <label class="gm-foot gm-check"><span>Found</span><input type="checkbox" data-tick="${esc(c.slug)}" ${t[c.slug] ? 'checked' : ''}><i>${TICK}</i></label>
          <p class="gm-foot"><span>Cards found</span><b>${found(set, t)} / ${set.total}</b></p>`;
      if (scroll) grid.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    };
    draw();
    const pick = (i) => { if (i !== sel) flipped = false; sel = i; draw(true); };
    grid.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) pick(Number(li.dataset.i)); });
    grid.addEventListener('keydown', (e) => {
      const cols = Math.max(1, Math.round(grid.clientWidth / (grid.firstElementChild?.offsetWidth || 1)));
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const c = set.cards[sel]; UserStore.tick('collectible-ticks', c.slug, !ticked()[c.slug]); draw(); return; }
      if (!step) return;
      e.preventDefault(); pick(Math.min(set.cards.length - 1, Math.max(0, sel + step)));
    });
    const root = view.querySelector('.gm');
    onArtError(root);
    root.addEventListener('click', (e) => {
      if (e.target.closest('.gm-flip')) { flipped = !flipped; draw(); return; }
      if (e.target.closest('[data-act="back"]')) location.hash = '#/cards';
    });
    const onKey = (e) => {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); flipped = !flipped; draw(); }
      if (e.key === 'Backspace') { e.preventDefault(); location.hash = '#/cards'; }
    };
    document.addEventListener('keydown', onKey);
    root.addEventListener('change', (e) => {
      if (!e.target.dataset.tick) return;
      UserStore.tick('collectible-ticks', e.target.dataset.tick, e.target.checked);
      draw();
    });
  };

  // ---------- Cheats and Controls ----------

  const CHEAT_GROUPS = [
    ['cheats-player', 'Player'], ['cheats-combat', 'Combat'], ['cheats-spawn-vehicle', 'Spawn vehicle'],
    ['cheats-environment', 'Environment'], ['cheats-screen-filters', 'Screen filters'],
  ];
  const NOTE_START = /^(Per |Disagreement|PlayStation|Game8|Insider|Polygon|Push Square|The |Across|No guide|As of|Five |Six |On a |Codes)/;
  /**
   * The cheats in one group entry. Each line: "Name: Up, Down, …; how it unlocks (sources)." or
   * "Name: no code published yet; how it unlocks.", optionally ending "Does: what it does."
   */
  function parseCheats(entry) {
    const rows = [];
    for (const raw of entry.body || []) {
      const line = plain(raw);
      const m = /^([^:]{2,80}): (.+)$/.exec(line);
      if (!m || NOTE_START.test(line)) continue;
      let rest = m[2];
      let effect = '';
      const dm = /\s*Does: (.+)$/.exec(rest);
      if (dm) { effect = dm[1].replace(/\.$/, ''); rest = rest.slice(0, dm.index); }
      let code = null;
      const cm = /^((?:Up|Down|Left|Right)(?:, (?:Up|Down|Left|Right))+)(.*)$/.exec(rest);
      if (cm) { code = cm[1].split(', '); rest = cm[2]; } else if (/^no code published yet/i.test(rest)) rest = rest.replace(/^no code published yet[;,.]?\s*/i, '');
      else continue;
      rest = rest.replace(/^\s*(\([^)]*\))?\s*[;,]?\s*/, (s, p) => (p ? `${p} ` : '')).trim();
      rows.push({ name: m[1], code, unlock: rest.replace(/\.$/, ''), effect });
    }
    return rows;
  }

  EXTRA_PAGES.cheats = function renderCheats() {
    const g = state.wiki.gameplay || [];
    const find = (slug) => g.find((e) => e.slug === slug);
    const groups = CHEAT_GROUPS.map(([slug, label]) => ({ slug, label, entry: find(slug) })).filter((x) => x.entry).map((x) => ({ ...x, rows: parseCheats(x.entry) }));
    const controls = ['controls', 'assist-toggles-and-control-options'].map(find).filter(Boolean);
    const tabs = [...groups.map((x) => x.label), 'Controls'];
    // The rules the guides agree on, before any code: cheats come after the story, and cost trophies and saving.
    const rules = `<div class="gm-rules" role="note"><b>Before you use a cheat</b>
      <span>Cheats work only after the story is finished and each one's unlock condition is met.</span>
      <span>The same codes work on PlayStation 5 and Xbox Series X|S: hold L1 + R1 (PlayStation) or LB + RB (Xbox) on the phone.</span>
      <span>While a cheat is on, trophies and achievements are switched off and the game will not save until you reload.</span></div>`;
    view.innerHTML = shell({ crumbs: ['Progress', 'Cheats'], tabs, body: `${rules}<div class="gm-pane"></div>` });
    const pane = view.querySelector('.gm-pane');
    const done = () => UserStore.get('cheats-done', {});
    const show = (t) => {
      if (t === groups.length) {
        // Lines "Group — Action: PlayStation / Xbox" become one table per group; "Scheme — Name: text" the schemes.
        const sections = new Map();
        const schemes = [];
        const other = [];
        for (const e of controls) {
          for (const raw of e.body || []) {
            const line = plain(raw);
            const sc = /^Scheme — ([^:]+): (.+)$/.exec(line);
            const m = /^(.+?) — (.+?): (.+?) \/ (.+)$/.exec(line);
            if (sc) schemes.push([sc[1], sc[2]]);
            else if (m) { if (!sections.has(m[1])) sections.set(m[1], []); sections.get(m[1]).push(m.slice(2)); } else other.push(line);
          }
        }
        const names = [...sections.keys()];
        const rowsOf = (n) => sections.get(n) || [];
        if (!names.length) {
          pane.innerHTML = `<section class="gm-detail"><ul>${other.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></section>`;
          return;
        }
        listDetail(pane, [...names.map((n) => ({ html: esc(n) })), ...(schemes.length || other.length ? [{ html: 'Control schemes and options' }] : [])], (i) => {
          if (i >= names.length) {
            return `<h2 class="gm-title">Control schemes and options</h2>${schemes.map(([n, txt]) => `<p><span class="gm-label">${esc(n)}</span>${esc(txt)}</p>`).join('')}${other.map((b) => `<p>${esc(b)}</p>`).join('')}
              <p class="gm-note">${controls.map((e) => `<a href="${entryLink('gameplay', e.slug)}">${esc(e.name)}: sources</a>`).join(' · ')}</p>`;
          }
          return `<h2 class="gm-title">${esc(names[i])}</h2>
            <table class="gm-ctable"><thead><tr><th scope="col">Action</th><th scope="col">PlayStation</th><th scope="col">Xbox</th></tr></thead>
            <tbody>${rowsOf(names[i]).map(([a, ps, xb]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(ps)}</td><td>${esc(xb)}</td></tr>`).join('')}</tbody></table>
            <p class="gm-note">A "?" means no source we use gives that button yet.</p>`;
        });
        return;
      }
      const grp = groups[t];
      if (isHidden('gameplay', grp.entry)) {
        pane.innerHTML = veil('gameplay', grp.entry, `<div class="gm-split"><div class="gm-left"><ul class="gm-list">${grp.rows.map((r) => `<li>${esc(r.name)}</li>`).join('')}</ul></div><section class="gm-detail"></section></div>`);
        return;
      }
      const rows = () => grp.rows.map((r) => ({ html: esc(r.name), locked: !r.code, done: Boolean(done()[`${grp.slug}:${r.name}`]) }));
      const ld = listDetail(pane, rows(), (i) => {
        const r = grp.rows[i];
        const key = `${grp.slug}:${r.name}`;
        return `<h2 class="gm-title">${esc(r.name)}</h2>
          ${r.effect ? `<p>${esc(r.effect)}</p>` : ''}
          ${r.code ? `<p>To activate, press ${dpad('Up')} to use your phone, then hold <kbd class="gm-key">L1</kbd> + <kbd class="gm-key">R1</kbd> on PlayStation, or <kbd class="gm-key">LB</kbd> + <kbd class="gm-key">RB</kbd> on Xbox, and press:</p>
            <p class="gm-code" aria-label="${esc(r.code.join(', '))}">${r.code.map(dpad).join('')}</p>
            <p class="gm-note">${r.code.join(', ')}</p>`
          : '<p class="gm-locked">No code has been published for this cheat yet.</p>'}
          <p><span class="gm-label">Unlocks</span> ${esc(r.unlock || 'Not yet known')}</p>
          <p class="gm-note">Using a cheat switches off trophies and saving until you reload. <a href="${entryLink('gameplay', grp.slug)}">Sources</a></p>
          <label class="gm-foot gm-check"><span>Completed</span><input type="checkbox" data-done="${esc(key)}" ${done()[key] ? 'checked' : ''}><i>${TICK}</i></label>`;
      });
      pane.onchange = (e) => {
        if (!e.target.dataset.done) return;
        UserStore.tick('cheats-done', e.target.dataset.done, e.target.checked);
        ld.redraw(rows());
      };
    };
    wireTabs(view.querySelector('.gm'), tabs.length, show);
    show(0);
  };

  // ---------- Weapon Locker and Garage ----------

  // ---------- prices: the full amount, with the game's marks for how it is paid ----------

  /** The BuckMe mark (the game's phone bank): a purple "b" with a bar through its stem. Drawn to match. */
  const BUCKME = '<svg class="gm-money gm-buckme" viewBox="0 0 24 24" role="img" aria-label="BuckMe"><title>BuckMe</title><path d="M6.2 2.5h3.6v6.1a6 6 0 1 1-3.6 5.5zm6.1 9a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z" fill="#a65bf0"/><rect x="3.4" y="5.1" width="9.2" height="2.6" rx="1.3" fill="#a65bf0"/></svg>';
  /** The cash mark: a green banknote. Drawn to match. */
  const CASH = '<svg class="gm-money gm-cash" viewBox="0 0 24 24" role="img" aria-label="Cash"><title>Cash</title><rect x="1.8" y="5.5" width="20.4" height="13" rx="2.2" fill="#3cb85c"/><rect x="3.6" y="7.3" width="16.8" height="9.4" rx="1.2" fill="none" stroke="#bff0c8" stroke-width="1.1"/><circle cx="12" cy="12" r="2.6" fill="#bff0c8"/></svg>';
  const MARK = { buckme: BUCKME, cash: CASH };
  /**
   * A price as the game shows it: the payment mark(s) and the full amount, with any note after it.
   * paidWith is "BuckMe", "Cash" or both ("BuckMe, Cash"); without it no mark is drawn.
   */
  function priceHtml(price, paidWith, big = false) {
    const text = plain(String(price || ''));
    if (!text) return '';
    const m = /\$\s?[\d,]+(?:\.\d+)?/.exec(text);
    const marks = String(paidWith || '').toLowerCase().split(/[,/]| and /).map((x) => MARK[x.trim()]).filter(Boolean).join('');
    if (!m) return `<span class="gm-price${big ? ' is-big' : ''}">${marks}<span>${esc(text)}</span></span>`;
    const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/^\s*[-,;:]?\s*/, '').trim();
    return `<span class="gm-price${big ? ' is-big' : ''}">${marks}<b>${esc(m[0].replace(/\s/g, ''))}</b>${rest ? `<em>${esc(rest)}</em>` : ''}</span>`;
  }

  const statPanel = (e, stats, head) => {
    const rows = stats.map(([k, label]) => {
      const v = num(e.facts?.[k]);
      return `<div class="gm-stat${v === null ? ' is-unknown' : ''}"><span>${esc(label)}</span><span class="gm-stat-bar"><i style="width:${v === null ? 0 : v * 10}%"></i></span><b>${v === null ? '–' : v.toFixed(1)}</b></div>`;
    }).join('');
    const known = stats.some(([k]) => num(e.facts?.[k]) !== null);
    return `<div class="gm-statpanel">${head}${rows}${known ? '' : '<p class="gm-note">No source has published these bars yet.</p>'}</div>`;
  };

  /** A locker: type tabs, a list of names, and the chosen item's picture, stat panel and details. */
  function locker(o) {
    // Every entry is listed; one that is a hidden spoiler shows as "Spoiler hidden", with its detail
    // behind the usual veil (its eye shows it).
    const items = (state.wiki[o.section] || []).filter(o.include);
    const hid = (e) => isHidden(o.section, e);
    const tabNames = o.tabs(items);
    const chosen = new Set();
    const owned = () => UserStore.get(o.ownPart, {});
    // Extra pickers (the Garage's Class and Standout set) and a sort, each optional.
    const pickers = (o.pickers || []).map((p) => ({ ...p, choices: p.choices(items) }));
    const picked = pickers.map(() => '');
    let sortBy = 'name';
    const pickerHtml = pickers.map((p, i) => `<label class="gm-pick"><span>${esc(p.label)}</span><select data-picker="${i}">${[['', p.all], ...p.choices].map(([v, l, n]) => `<option value="${esc(v)}">${esc(l)}${n !== undefined ? ` (${n})` : ''}</option>`).join('')}</select></label>`).join('');
    const sortHtml = o.sorts ? `<label class="gm-pick"><span>Sort</span><select data-sort>${o.sorts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>` : '';
    view.innerHTML = shell({ crumbs: [o.title], tabs: tabNames.map((t) => t[0]), theme: o.theme, body: `<div class="gm-locker-tools">
        <div class="field-search">${icon('search')}<input type="search" class="gm-q" placeholder="${esc(o.search)}" aria-label="${esc(o.search)}"></div>${pickerHtml}${sortHtml}
        <label class="gm-switch"><input type="checkbox" data-stats-only><span>Only with stat bars</span></label>
        <label class="gm-switch"><input type="checkbox" data-owned-only><span>Only ${esc(o.ownShort)}</span></label>
        <span class="gm-owned-n"></span></div>
      <div class="gm-pane"></div>
      <div class="gm-tray" hidden><span class="gm-tray-items"></span><button type="button" class="gm-btn" data-compare-open>Compare</button><button type="button" class="gm-link" data-compare-clear>Clear</button></div>
      <section class="gm-compare" hidden aria-label="Comparison"></section>` });
    const root = view.querySelector('.gm');
    const pane = root.querySelector('.gm-pane');
    let tab = 0;
    let q = '';
    let statsOnly = false;
    let ownedOnly = false;
    let ld = null;
    const list = () => {
      const own = owned();
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const sorter = (o.sorts || []).find(([v]) => v === sortBy)?.[2] || ((a, b) => a.name.localeCompare(b.name));
      return items.filter((e) => tabNames[tab][1](e) && (!q || !hid(e)) && (!statsOnly || o.stats.some(([k]) => num(e.facts?.[k]) !== null)) && (!ownedOnly || own[e.slug])
        && pickers.every((p, i) => !picked[i] || p.test(e, picked[i]))
        && words.every((w) => `${e.name} ${Object.values(e.facts || {}).join(' ')}`.toLowerCase().includes(w))).sort(sorter);
    };
    let current = [];
    const tray = () => {
      const t = root.querySelector('.gm-tray');
      t.hidden = !chosen.size;
      t.querySelector('.gm-tray-items').innerHTML = [...chosen].map((s) => `<span>${esc(items.find((e) => e.slug === s)?.name || s)}</span>`).join('') + `<em>${chosen.size} of 3</em>`;
      const n = items.filter((e) => owned()[e.slug]).length;
      root.querySelector('.gm-owned-n').textContent = `${n} of ${items.length} ${o.ownShort === 'my locker' ? 'in your locker' : 'in your garage'}`;
    };
    const draw = () => {
      current = list();
      const own = owned();
      const rows = current.map((e) => ({ html: `${own[e.slug] ? '<i class="gm-diamond" aria-label="Owned"></i>' : ''}${hid(e) ? '<em>Spoiler hidden</em>' : esc(e.name)}`, locked: hid(e) }));
      ld = listDetail(pane, rows, (i) => {
        const e = current[i];
        // The game's own menu picture first (a studio shot from Progress > Vehicles), then the entry's picture.
        const pic = e.facts?.menu_picture || e.image;
        const html = `<div class="gm-show${e.facts?.menu_picture ? ' is-menu' : ''}">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy">` : `<span class="gm-show-ph">${icon(o.icon)}</span>`}</div>
          ${e.facts?.menu_text ? `<p class="gm-menu-text">${esc(e.facts.menu_text)}</p>` : ''}
          ${e.facts?.price ? `<p class="gm-price-line">${priceHtml(e.facts.price, e.facts.paid_with, true)}${e.facts.paid_with ? `<span class="gm-paid">Paid with ${esc(e.facts.paid_with)}</span>` : ''}</p>` : ''}
          ${statPanel(e, o.stats, o.head(e))}
          <dl class="gm-facts">${o.facts.map(([k, l]) => (e.facts?.[k] !== undefined && e.facts[k] !== null && e.facts[k] !== '' ? `<div><dt>${esc(l)}</dt><dd>${k === 'price' || k === 'sell_value' ? priceHtml(e.facts[k], k === 'price' ? e.facts.paid_with : '') : esc(plain(String(e.facts[k])))}</dd></div>` : '')).join('')}</dl>
          <div class="gm-actions">
            <button type="button" class="gm-btn${own[e.slug] ? ' is-on' : ''}" data-own="${esc(e.slug)}" aria-pressed="${Boolean(own[e.slug])}">${own[e.slug] ? esc(o.ownedWord) : esc(o.ownVerb)}</button>
            <label class="gm-switch"><input type="checkbox" data-pick="${esc(e.slug)}" ${chosen.has(e.slug) ? 'checked' : ''} ${!chosen.has(e.slug) && chosen.size >= 3 ? 'disabled' : ''}><span>Compare</span></label>
            <a class="gm-link" href="${entryLink(o.section, e.slug)}">Entry and sources</a>
          </div>`;
        return hid(e) ? veil(o.section, e, html) : html;
      }, ld ? ld.selected : 0);
      tray();
    };
    const compare = () => {
      const picked = [...chosen].map((s) => items.find((e) => e.slug === s)).filter(Boolean);
      const panel = root.querySelector('.gm-compare');
      if (picked.length < 2) { panel.hidden = true; return; }
      const best = (k) => Math.max(...picked.map((e) => num(e.facts?.[k]) ?? -1));
      panel.innerHTML = `<div class="gm-compare-head"><h2 class="gm-title">Side by side</h2><button type="button" class="gm-link" data-compare-close>Close</button></div>
        <div class="gm-compare-grid" style="--n:${picked.length}">${picked.map((e) => `<div class="gm-compare-col">
          <div class="gm-show${e.facts?.menu_picture ? ' is-menu' : ''}">${e.facts?.menu_picture || e.image ? `<img src="${esc(e.facts?.menu_picture || e.image)}" alt="" loading="lazy">` : `<span class="gm-show-ph">${icon(o.icon)}</span>`}</div>
          ${statPanel(e, o.stats, o.head(e)).replace(/<div class="gm-stat( is-unknown)?"><span>([^<]+)<\/span>/g, (m, u, label) => m)}
          <dl class="gm-facts">${o.facts.map(([k, l]) => `<div><dt>${esc(l)}</dt><dd>${(k === 'price' || k === 'sell_value') && e.facts?.[k] ? priceHtml(e.facts[k], k === 'price' ? e.facts.paid_with : '') : esc(plain(String(e.facts?.[k] ?? ''))) || '–'}</dd></div>`).join('')}</dl></div>`).join('')}</div>
        <p class="gm-note">Highest of each bar: ${o.stats.map(([k, l]) => { const b = best(k); const who = picked.filter((e) => num(e.facts?.[k]) === b && b >= 0).map((e) => e.name); return who.length && who.length < picked.length ? `${esc(l)}: ${esc(who.join(', '))}` : ''; }).filter(Boolean).join(' · ') || 'not enough published bars to compare'}.</p>`;
      panel.hidden = false;
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    wireTabs(root, tabNames.length, (t) => { tab = t; ld = null; draw(); });
    draw();
    root.addEventListener('input', (e) => { if (e.target.classList.contains('gm-q')) { q = e.target.value; ld = null; draw(); } });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.picker !== undefined) { picked[Number(t.dataset.picker)] = t.value; ld = null; draw(); return; }
      if (t.dataset.sort !== undefined) { sortBy = t.value; ld = null; draw(); return; }
      if (t.dataset.statsOnly !== undefined) { statsOnly = t.checked; ld = null; draw(); } else if (t.dataset.ownedOnly !== undefined) { ownedOnly = t.checked; ld = null; draw(); } else if (t.dataset.pick) {
        if (t.checked && chosen.size < 3) chosen.add(t.dataset.pick); else chosen.delete(t.dataset.pick);
        draw();
      }
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.own) { UserStore.tick(o.ownPart, b.dataset.own, !owned()[b.dataset.own]); draw(); }
      if (b.dataset.compareOpen !== undefined) compare();
      if (b.dataset.compareClear !== undefined) { chosen.clear(); root.querySelector('.gm-compare').hidden = true; draw(); }
      if (b.dataset.compareClose !== undefined) root.querySelector('.gm-compare').hidden = true;
    });
  }

  /** Weapon tabs as the game's locker groups them, matched on the entry's type and slot. */
  const WEAPON_TABS = [
    ['Pistols', /pistol|sidearm/i], ['Revolvers', /revolver/i], ['Submachine guns', /submachine|smg|machine pistol/i], ['Shotguns', /shotgun/i],
    ['Assault rifles', /assault|carbine|rifle(?!.*(sniper|marksman))/i], ['Sniper rifles', /sniper|marksman/i], ['Heavy', /launcher|minigun|heavy|machine gun|lmg/i],
    ['Melee', /melee|knife|bat|club|machete|hammer|crowbar/i], ['Throwables and gear', /throw|grenade|molotov|explosive|flash|gear|equipment|tool|parachute/i],
  ];
  const WEAPON_STATS = [['damage', 'Damage'], ['accuracy', 'Accuracy'], ['handling', 'Handling'], ['range', 'Range']];
  EXTRA_PAGES.arsenal = function renderArsenal() {
    const text = (e) => `${e.facts?.weapon_class || ''} ${e.facts?.type || ''} ${e.facts?.slot || ''} ${e.name}`;
    locker({
      section: 'weapons', title: 'Weapon Locker', theme: 'locker', icon: 'target', ownPart: 'weapon-locker',
      include: (e) => e.facts && (e.facts.type || e.facts.slot),
      tabs: (items) => {
        const tabs = WEAPON_TABS.filter(([, re]) => items.some((e) => re.test(text(e)))).map(([n, re]) => [n, (e) => re.test(text(e))]);
        const other = (e) => !WEAPON_TABS.some(([, re]) => re.test(text(e)));
        return [['All', () => true], ...tabs, ...(items.some(other) ? [['Other', other]] : [])];
      },
      search: 'Search weapons', ownShort: 'my locker', ownVerb: 'Add to locker', ownedWord: 'In my locker',
      stats: WEAPON_STATS,
      head: (e) => `<p class="gm-stat-name">${esc(e.name)}</p><p class="gm-stat-class">${esc(plain(e.facts?.weapon_class || e.facts?.type || ''))}</p>`,
      facts: [['slot', 'Slot'], ['manufacturer', 'Maker'], ['magazine', 'Magazine'], ['ammo', 'Ammunition'], ['fire_mode', 'Fire mode'], ['price', 'Price'], ['mods', 'Mods'], ['where', 'Where to get it'], ['availability', 'Availability']],
    });
  };

  const VEHICLE_TABS = [
    ['Sports', /sport|super/i], ['Muscle', /muscle/i], ['Sedans and coupes', /sedan|coupe|compact/i], ['SUVs and trucks', /suv|truck|pickup|van/i],
    ['Off-road', /off-?road/i], ['Motorcycles', /motorcycle|bike|scooter|moped|cycle/i], ['Aircraft', /aircraft|plane|helicopter|jet/i], ['Boats', /boat|ship|watercraft|jet ski|yacht/i],
    ['Emergency and service', /emergency|police|service|commercial|industrial|utility|military/i],
  ];
  // A standout vehicle: a custom version of a regular one with its own livery and stats, in one of 25 sets.
  const isStandout = (e) => Boolean(e.facts?.standout_set) || /standout/i.test(e.facts?.class || '');
  // The 20 classes as GTABase and the game's menu group them; older entries spell classes many ways.
  const CLASSES = [['Super', /super/i], ['Sports', /sport/i], ['Muscle', /muscle/i], ['Coupes', /coupe/i], ['Sedans', /sedan|saloon|compact/i],
    ['SUVs', /suv/i], ['Pickups', /pickup/i], ['Vans', /\bvans?\b|minivan|motorhome/i], ['Off-Road', /off-?road|buggy|atv/i], ['Motorcycles', /motorcycle|motorbike|scooter|moped|\bbikes?\b/i],
    ['Cycles', /cycle|bmx|bicycle/i], ['Planes', /plane|jet|aircraft/i], ['Helicopters', /helicopter/i], ['Boats', /boat|watercraft|yacht|jet ski|kayak/i],
    ['Emergency', /emergency|police|ambulance|fire/i], ['Military', /military/i], ['Commercial', /commercial|truck/i], ['Industrial', /industrial/i],
    ['Utility', /utility/i], ['Service', /service|taxi|bus/i]];
  const vClass = (e) => { const c = String(e.facts?.class || '').split(',')[0].trim(); return (CLASSES.find(([, re]) => re.test(c)) || [c])[0]; };
  window.vClass = vClass; // Compare Vehicles (more.js) groups by the same 20 classes
  const priceOf = (e) => { const m = /\$([\d,]+)/.exec(e.facts?.price || ''); return m ? Number(m[1].replace(/,/g, '')) : -1; };
  const VEHICLE_STATS = [['speed', 'Speed'], ['acceleration', 'Acceleration'], ['asphalt_handling', 'Asphalt handling'], ['offroad_handling', 'Off-road handling'], ['strength', 'Strength']];
  EXTRA_PAGES.garage = function renderGarage() {
    const text = (e) => `${e.facts?.class || ''} ${e.name}`;
    locker({
      section: 'vehicles', title: 'Garage', theme: 'garage', icon: 'car', ownPart: 'garage',
      include: (e) => e.facts && (e.facts.class || e.facts.manufacturer),
      tabs: (items) => {
        const tabs = VEHICLE_TABS.filter(([, re]) => items.some((e) => re.test(text(e)))).map(([n, re]) => [n, (e) => re.test(text(e))]);
        const other = (e) => !VEHICLE_TABS.some(([, re]) => re.test(text(e)));
        return [['All', () => true], ...tabs, ...(items.some(other) ? [['Other', other]] : [])];
      },
      search: 'Search vehicles', ownShort: 'my garage', ownVerb: 'Add to garage', ownedWord: 'In my garage',
      stats: VEHICLE_STATS,
      pickers: [
        { label: 'Class', all: 'All classes', test: (e, v) => vClass(e) === v,
          choices: (items) => { const n = {}; items.forEach((e) => { const c = vClass(e); if (CLASSES.some(([k]) => k === c)) n[c] = (n[c] || 0) + 1; }); return Object.keys(n).sort().map((c) => [c, c, n[c]]); } },
        { label: 'Standout set', all: 'All vehicles',
          test: (e, v) => (v === '__hide' ? !isStandout(e) : v === '__only' ? isStandout(e) : e.facts?.standout_set === v),
          choices: (items) => { const n = {}; items.forEach((e) => { const s = e.facts?.standout_set; if (s) n[s] = (n[s] || 0) + 1; });
            return [['__hide', 'Hide standout vehicles', items.filter((e) => !isStandout(e)).length], ['__only', 'Standout vehicles only', items.filter(isStandout).length],
              ...Object.keys(n).sort().map((s) => [s, s, n[s]])]; } },
      ],
      sorts: [['name', 'Name'], ['speed', 'Speed', (a, b) => (num(b.facts?.speed) ?? -1) - (num(a.facts?.speed) ?? -1) || a.name.localeCompare(b.name)],
        ['price', 'Cost, high to low', (a, b) => priceOf(b) - priceOf(a) || a.name.localeCompare(b.name)]],
      head: (e) => `<p class="gm-stat-class">${esc(plain(e.facts?.manufacturer || ''))}${isStandout(e) ? ' <span class="gm-standout">★ Standout</span>' : ''}</p><p class="gm-stat-name">${esc(e.name)}</p>`,
      facts: [['class', 'Class'], ['standout_set', 'Standout set'], ['based_on', 'Based on'], ['style', 'Style'], ['era', 'Era'], ['specialist', 'Mod shop specialist'], ['rating', 'Rating'], ['price', 'Price'], ['sell_value', 'Sells for'], ['seats', 'Seats'], ['drivetrain', 'Drivetrain'], ['where', 'Where to find it'], ['customise', 'Where to modify it'], ['availability', 'Availability']],
    });
  };

  // ---------- Trophy Guides ----------

  const GRADE_ORDER = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  EXTRA_PAGES.trophies = function renderTrophies(slug) {
    const all = (state.wiki.achievements || []).slice().sort((a, b) => GRADE_ORDER.indexOf(a.facts?.grade) - GRADE_ORDER.indexOf(b.facts?.grade) || a.name.localeCompare(b.name));
    const earned = () => UserStore.get('trophies-earned', {});
    const tabs = ['All', ...GRADE_ORDER.filter((g) => all.some((e) => e.facts?.grade === g))];
    view.innerHTML = shell({ crumbs: ['Progress', 'Trophies'], tabs, body: '<p class="gm-summary"></p><div class="gm-pane"></div>' });
    const root = view.querySelector('.gm');
    const pane = root.querySelector('.gm-pane');
    let shown = all;
    let ld = null;
    const summary = () => {
      const n = all.filter((e) => earned()[e.slug]).length;
      const guided = all.filter((e) => Array.isArray(e.steps) && e.steps.length).length;
      root.querySelector('.gm-summary').innerHTML = `<b>${n} / ${all.length}</b> earned ${meter(n, all.length)} <span class="gm-note">${guided} with a step-by-step guide</span>`;
    };
    const rows = () => shown.map((e) => ({ html: `<i class="gm-grade g-${esc((e.facts?.grade || 'bronze').toLowerCase())}" aria-hidden="true"></i>${esc(e.name)}`, done: Boolean(earned()[e.slug]) }));
    const detail = (i) => {
      const e = shown[i];
      const hidden = isHidden('achievements', e);
      const steps = Array.isArray(e.steps) ? e.steps : [];
      const inner = `<h2 class="gm-title"><i class="gm-grade g-${esc((e.facts?.grade || 'bronze').toLowerCase())}" aria-hidden="true"></i>${esc(e.name)}</h2>
        <p>${esc(e.summary)}</p>
        <p class="gm-tags">${e.facts?.grade ? `<span>${esc(e.facts.grade)}</span>` : ''}${e.facts?.gamerscore !== undefined ? `<span>${esc(e.facts.gamerscore)}G</span>` : ''}${e.facts?.secret === 'Yes' ? '<span>Secret</span>' : ''}</p>
        ${(e.body || []).map((b) => `<p>${esc(plain(b))}</p>`).join('')}
        ${steps.length ? `<h3 class="gm-sub">Step by step</h3><ol class="gm-steps">${steps.map((st, n) => {
          const body = `<div class="gm-step-pic">${st.picture ? `<img src="${esc(st.picture)}" alt="" loading="lazy">` : `<span>${icon('trophy')}</span>`}</div><div><span class="gm-step-n">Step ${n + 1}</span><p>${esc(plain(st.text))}</p></div>`;
          return `<li class="gm-step">${st.spoiler && !showSpoilers ? veil('achievements', e, body) : body}</li>`;
        }).join('')}</ol>` : '<p class="gm-locked">No step-by-step guide yet: the sources we use do not describe one.</p>'}
        <p class="gm-note">Written in our own words from the sources on the <a href="${entryLink('achievements', e.slug)}">entry</a>.</p>
        <label class="gm-foot gm-check"><span>Earned</span><input type="checkbox" data-earn="${esc(e.slug)}" ${earned()[e.slug] ? 'checked' : ''}><i>${TICK}</i></label>`;
      return hidden ? veil('achievements', e, inner) : inner;
    };
    const show = (t) => {
      shown = t ? all.filter((e) => e.facts?.grade === tabs[t]) : all;
      const start = slug && !ld ? Math.max(0, shown.findIndex((e) => e.slug === slug)) : 0;
      // The address follows the reader's own choice (not the first trophy shown), so it can be shared.
      let first = true;
      ld = listDetail(pane, rows(), detail, start, (i) => { if (first) { first = false; return; } const s = shown[i]?.slug; if (s && location.hash !== `#/trophies/${s}`) history.replaceState(null, '', `#/trophies/${s}`); });
      summary();
    };
    wireTabs(root, tabs.length, show);
    show(0);
    pane.addEventListener('change', (e) => {
      if (!e.target.dataset.earn) return;
      UserStore.tick('trophies-earned', e.target.dataset.earn, e.target.checked);
      ld.redraw(rows());
      summary();
    });
  };

  window.ResearchTools = { cardSets, cardParts, plain, slugify, open, parseCheats, dpad, priceHtml, shell, wireTabs, listDetail, TICK };
})();

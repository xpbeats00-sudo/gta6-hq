// GTA 6 HQ — the reader's own layer on top of the encyclopedia and the map:
// Saved places and collections, the Collectible Tracker, the Progress dashboard, Settings,
// actions on every entry page (favourite, discovered, collection, map, nearby),
// the "More" menu and search suggestions in the top bar.
//
// Loaded after app.js and uses its helpers (state, esc, resolve, entryLink, pageHead, mapPins,
// nearbyPins, pinKey, prefs, UserStore). All personal data goes through UserStore: it is saved in
// the user's settings folder by the app (see src/userdata.rs). Nothing here invents game facts:
// every list is built from the encyclopedia's own entries and the map's own pins.

(function () {
  // ---------- shared helpers ----------

  /** Every entry in every section, once. */
  function everyEntry() {
    const keys = [...state.wiki.categories.map((c) => c.key)];
    return keys.flatMap((section) => (state.wiki[section] || []).map((entry) => ({ section, entry, ref: `${section}/${entry.slug}` })));
  }
  const titleCase = (s) => s.replace(/^./, (c) => c.toUpperCase());
  const when = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const bar = (done, total) => {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${pct}% complete"><span style="width:${pct}%"></span></div>`;
  };
  const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
  /** A saved item's label and address: an entry, or a map pin without one. */
  function describe(key) {
    if (key.startsWith('e:')) {
      const target = resolve(key.slice(2));
      if (!target) return null;
      // A spoiler entry the reader hasn't opened is listed as "Spoiler", like its pin on the map.
      const hidden = isHidden(target.section, target.entry);
      return { name: hidden ? 'Spoiler' : target.entry.name, href: entryLink(target.section, target.entry.slug), kind: sectionLabel(target.section), map: `#/map?focus=${encodeURIComponent(key.slice(2))}`, image: target.entry.image, hidden };
    }
    const pin = UserStore.get('favourite-pins', {})[key];
    if (!pin) return null;
    // A saved spoiler pin keeps its real name, shown only while spoilers are shown.
    const veiled = pin.spoiler === true && !showSpoilers;
    return { name: veiled ? 'Spoiler' : pin.name, href: `#/map?focus=${encodeURIComponent(key)}`, kind: pin.kind || 'Map pin', map: `#/map?focus=${encodeURIComponent(key)}`, image: '', hidden: veiled };
  }

  window.describeSaved = describe;

  // ---------- collections: a small dialog to put a place into a named collection ----------

  window.openCollectionPicker = function openCollectionPicker(item) {
    const box = document.createElement('dialog');
    box.className = 'picker';
    const draw = () => {
      const all = UserStore.get('collections', []);
      box.innerHTML = `<form method="dialog" class="picker-body">
        <h2>Add to a collection</h2>
        <p class="muted">${esc(item.label ?? item.name)}</p>
        ${all.length ? `<ul class="picker-list">${all.map((c) => {
          const inside = c.items.some((it) => it.key === item.key);
          return `<li><button type="button" class="picker-item${inside ? ' is-on' : ''}" data-col="${esc(c.id)}" aria-pressed="${inside}">${icon(inside ? 'check' : 'plus')}${esc(c.name)} <span class="muted">${c.items.length}</span></button></li>`;
        }).join('')}</ul>` : '<p class="muted">You have no collections yet.</p>'}
        <label class="picker-new"><span>New collection</span><input name="name" maxlength="60" placeholder="e.g. Places to visit" autocomplete="off"></label>
        <div class="picker-foot"><button type="button" class="btn btn-primary btn-small" data-make>${icon('plus')}Create and add</button><button class="btn btn-small btn-outline">Done</button></div>
      </form>`;
    };
    draw();
    // Enter in the name field creates the collection (the form's own Enter would press "Done").
    box.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.name !== 'name') return;
      e.preventDefault();
      if (e.target.value.trim()) box.querySelector('[data-make]').click();
    });
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-col], [data-make]');
      if (!b) return;
      const all = UserStore.get('collections', []);
      if (b.dataset.col) {
        const next = all.map((c) => (c.id !== b.dataset.col ? c : {
          ...c,
          items: c.items.some((it) => it.key === item.key) ? c.items.filter((it) => it.key !== item.key) : [...c.items, { key: item.key, note: '', at: Date.now() }],
        }));
        UserStore.set('collections', next);
      } else {
        const name = box.querySelector('input[name="name"]').value.trim();
        if (!name) { box.querySelector('input[name="name"]').focus(); return; }
        UserStore.set('collections', [...all, { id: id(), name, notes: '', at: Date.now(), items: [{ key: item.key, note: '', at: Date.now() }] }]);
      }
      // A pin without an entry is remembered by name and place, so the collection can show it later.
      if (item.key.startsWith('p:')) UserStore.set('favourite-pins', { ...UserStore.get('favourite-pins', {}), [item.key]: { name: item.name, ...(item.spoiler ? { spoiler: true } : {}), x: item.x, y: item.y, ref: '', kind: 'Map pin' } });
      draw();
    });
    box.addEventListener('close', () => box.remove());
    document.body.append(box);
    box.showModal();
  };

  // ---------- entry pages: actions and nearby places ----------

  AFTER_RENDER.push((page, a, b) => {
    let section = null, slug = null;
    if (page === 'wiki' && a && b) [section, slug] = [a, b];
    else if ((page === 'locations' || page === 'characters') && a) [section, slug] = [page, a];
    if (!section) return;
    const target = resolve(`${section}/${slug}`);
    if (!target || isHidden(section, target.entry)) return;
    const body = view.querySelector('.profile-body, .place-body > div');
    if (!body) return;
    const ref = `${section}/${slug}`;
    const pins = mapPins();
    const own = pins.findIndex((p) => p.ref === ref);
    const pin = own >= 0 ? pins[own] : null;
    const fav = UserStore.has('favourites', `e:${ref}`);
    const found = UserStore.has('discovered', ref);
    const near = pin ? nearbyPins(pins, pin.x, pin.y, 6, own) : [];
    const lede = body.querySelector('.lede');
    const acts = document.createElement('div');
    acts.className = 'entry-acts';
    acts.innerHTML = `
      ${pin ? `<a class="btn btn-primary btn-small" href="#/map?focus=${encodeURIComponent(ref)}">${icon('map')}Show on map</a>` : ''}
      <button type="button" class="chip-btn${fav ? ' is-on' : ''}" data-entry-act="fav" aria-pressed="${fav}">${favLabel(fav)}</button>
      <button type="button" class="chip-btn${found ? ' is-on' : ''}" data-entry-act="found" aria-pressed="${found}">${foundLabel(found)}</button>
      <button type="button" class="chip-btn" data-entry-act="collect">${icon('collection')}Collection</button>`;
    (lede || body.querySelector('h1'))?.after(acts);
    // The action row has the one map button; the page's own "View on the map" would repeat it.
    if (pin) {
      view.querySelectorAll('a.btn[href^="#/map?focus="]').forEach((a) => {
        if (acts.contains(a)) return;
        // A paragraph holding only this button goes with it; a button in a panel goes alone.
        const holder = a.parentElement.tagName === 'P' && a.parentElement.children.length === 1 ? a.parentElement : a;
        holder.remove();
      });
    }
    acts.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-entry-act]');
      if (!btn) return;
      if (btn.dataset.entryAct === 'fav') {
        const on = UserStore.toggle('favourites', `e:${ref}`);
        btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', String(on)); btn.innerHTML = favLabel(on);
      } else if (btn.dataset.entryAct === 'found') {
        const on = UserStore.toggle('discovered', ref);
        btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', String(on)); btn.innerHTML = foundLabel(on);
      } else {
        openCollectionPicker({ key: `e:${ref}`, name: target.entry.name, x: pin?.x ?? 0, y: pin?.y ?? 0, ref });
      }
    });
    if (near.length) {
      const box = document.createElement('section');
      box.className = 'entry-near';
      box.innerHTML = `<h2>Nearby on the map</h2><ul class="near-list">${near.map((n) => {
        const p = pins[n.i];
        const href = p.target ? entryLink(p.target.section, p.target.entry.slug) : `#/map?focus=${encodeURIComponent(pinKey(p))}`;
        return `<li><a href="${esc(href)}"><b>${esc(p.name)}</b><span>${esc(p.kind || sectionLabel(p.category) || '')}</span></a></li>`;
      }).join('')}</ul><p class="muted">Within the nearby distance set in Settings. Most pin positions are approximate.</p>`;
      // On a page with a side column, nearby places sit there, above Related.
      const side = body.querySelector('.entry-side');
      // Before the whole Related section (heading and all), never between its heading and its links.
      const before = (side || body).querySelector('.related')?.closest('section') || (side ? null : body.querySelector('.provenance'));
      if (before) before.before(box); else (side || body).append(box);
    }
  });

  // ---------- Saved ----------

  /** Favourites, kind by kind (Characters, Locations, a kind of map pin…) once there is more than one
      kind: the biggest group first, each with its count. One kind stays a single list. */
  function favGroups(favs, place) {
    const kinds = new Map();
    favs.forEach((f) => { const k = f.kind || 'Other'; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(f); });
    if (kinds.size < 2) return `<ul class="saved-list">${favs.map(place).join('')}</ul>`;
    return [...kinds].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([kind, list]) => `<h3 class="saved-kind">${esc(kind)} <span class="type-count">${list.length}</span></h3>
        <ul class="saved-list">${list.map(place).join('')}</ul>`).join('');
  }

  EXTRA_PAGES.saved = function renderSaved() {
    const draw = () => {
      const q = (view.querySelector('.saved-filter')?.value || '').toLowerCase();
      const sort = view.querySelector('.saved-sort')?.value || 'new';
      const match = (text) => !q || text.toLowerCase().includes(q);
      const order = (list) => [...list].sort(sort === 'name' ? (a, b) => (a.name || '').localeCompare(b.name || '') : (a, b) => (b.at || 0) - (a.at || 0));
      const favs = UserStore.get('favourites', []).map((key) => ({ key, ...describe(key) })).filter((f) => f.name && match(f.name));
      const cols = order(UserStore.get('collections', [])).filter((c) => match(c.name) || c.items.some((it) => match(describe(it.key)?.name || '')));
      const routes = order(UserStore.get('routes', [])).filter((r) => match(r.name));
      const views = order(UserStore.get('map-views', [])).filter((v) => match(v.name));
      const empty = !UserStore.get('favourites', []).length && !UserStore.get('collections', []).length && !UserStore.get('routes', []).length
        && !UserStore.get('map-views', []).length;
      const place = (f) => `<li class="saved-item">
        ${f.image && !f.hidden ? `<img src="${esc(f.image)}" alt="" loading="lazy">` : '<span class="saved-ph" aria-hidden="true"></span>'}
        <div><a href="${esc(f.href)}">${esc(f.name)}</a><span class="muted">${esc(f.kind || '')}</span></div>
        <div class="saved-btns"><a class="chip-btn" href="${esc(f.map)}">Map</a><button type="button" class="chip-btn" data-unfav="${esc(f.key)}" aria-label="Remove ${esc(f.name)} from favourites">Remove</button></div></li>`;
      // Nothing saved at all: no search or sort to offer, just how to start.
    view.querySelector('.saved-tools').hidden = empty;
    view.querySelector('.saved-body').innerHTML = empty
        ? `<div class="empty-state"><h2>Nothing saved yet</h2><p>Press <b>Favourite</b> or <b>Collection</b> on any entry or map pin, or save a map view with the bookmark on the map. It all appears here, kept on this computer.</p><a class="btn btn-primary" href="#/map">Open the map</a></div>`
        : `
        <section class="saved-group"><h2>Favourites <span class="muted">${favs.length}</span></h2>
          ${favs.length ? favGroups(favs, place) : '<p class="muted">No favourites match.</p>'}</section>
        <section class="saved-group"><div class="saved-head"><h2>Collections <span class="muted">${cols.length}</span></h2>
          <form class="saved-new"><input name="name" maxlength="60" placeholder="New collection name" aria-label="New collection name" required><button class="btn btn-small">Create</button></form></div>
          ${cols.map((c) => `<article class="collection" data-col="${esc(c.id)}">
            <header><input class="col-name" value="${esc(c.name)}" aria-label="Collection name" maxlength="60"><span class="muted">${c.items.length} ${c.items.length === 1 ? 'place' : 'places'} · ${esc(when(c.at))}</span>
              <button type="button" class="chip-btn" data-col-del="${esc(c.id)}">Delete</button></header>
            <textarea class="col-notes" placeholder="Notes for this collection" aria-label="Notes for ${esc(c.name)}" maxlength="2000">${esc(c.notes || '')}</textarea>
            ${c.items.length ? `<ul class="saved-list">${c.items.map((it) => { const d = describe(it.key); return d ? `<li class="saved-item">
              ${d.image && !d.hidden ? `<img src="${esc(d.image)}" alt="" loading="lazy">` : '<span class="saved-ph" aria-hidden="true"></span>'}
              <div><a href="${esc(d.href)}">${esc(d.name)}</a><input class="item-note" data-item="${esc(it.key)}" value="${esc(it.note || '')}" placeholder="Add a note" aria-label="Note for ${esc(d.name)}" maxlength="300"></div>
              <div class="saved-btns"><a class="chip-btn" href="${esc(d.map)}">Map</a><button type="button" class="chip-btn" data-item-del="${esc(it.key)}" aria-label="Remove ${esc(d.name)} from ${esc(c.name)}">Remove</button></div></li>` : ''; }).join('')}</ul>` : '<p class="muted">Empty. Use + Collection on an entry or a map pin.</p>'}
          </article>`).join('') || '<p class="muted">No collections match.</p>'}</section>
        <section class="saved-group"><h2>Routes <span class="muted">${routes.length}</span></h2>
          ${routes.length ? `<ul class="saved-list">${routes.map((r) => `<li class="saved-item"><span class="saved-ph saved-ph-route" aria-hidden="true"></span>
            <div><a href="#/map?route=${esc(r.id)}">${esc(r.name)}</a><span class="muted">${r.stops.map((s) => esc(s.name)).join(' → ')}</span></div>
            <div class="saved-btns"><button type="button" class="chip-btn" data-del="routes" data-id="${esc(r.id)}">Delete</button></div></li>`).join('')}</ul>` : '<p class="muted">Add stops with + Route on map pins, then save the route.</p>'}</section>
        <section class="saved-group"><h2>Map views <span class="muted">${views.length}</span></h2>
          ${views.length ? `<ul class="saved-list">${views.map((v) => `<li class="saved-item"><span class="saved-ph saved-ph-view" aria-hidden="true"></span>
            <div><a href="#/map?view=${esc(v.id)}">${esc(v.name)}</a><span class="muted">${esc(when(v.at))}</span></div>
            <div class="saved-btns"><button type="button" class="chip-btn" data-del="map-views" data-id="${esc(v.id)}">Delete</button></div></li>`).join('')}</ul>` : '<p class="muted">Use the bookmark button on the map to save where you are looking.</p>'}</section>
`;
    };
    view.innerHTML = `${pageHead('Saved', 'Your favourite places, collections with notes, routes and map views. Kept on this computer, no account needed.')}${window.profileBar?.() || ''}
      <div class="block saved-page">
        <div class="saved-tools"><div class="field-search saved-search">${icon('search')}<input type="search" class="saved-filter" placeholder="Search your saved places" aria-label="Search your saved places"></div>
          <label class="list-sort"><span>Sort</span> <select class="saved-sort" aria-label="Sort"><option value="new">Newest first</option><option value="name">Name A–Z</option></select></label></div>
        <div class="saved-body"></div>
      </div>`;
    draw();
    const page = view.querySelector('.saved-page');
    page.querySelector('.saved-filter').addEventListener('input', draw);
    page.querySelector('.saved-sort').addEventListener('change', draw);
    page.addEventListener('submit', (e) => {
      if (!e.target.closest('.saved-new')) return;
      e.preventDefault();
      const name = e.target.elements.name.value.trim();
      if (!name) return;
      UserStore.set('collections', [...UserStore.get('collections', []), { id: id(), name, notes: '', at: Date.now(), items: [] }]);
      draw();
    });
    page.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.unfav) { UserStore.set('favourites', UserStore.get('favourites', []).filter((k) => k !== b.dataset.unfav)); draw(); }
      if (b.dataset.del) { UserStore.set(b.dataset.del, UserStore.get(b.dataset.del, []).filter((x) => x.id !== b.dataset.id)); draw(); }
      if (b.dataset.colDel && await hqConfirm({ title: 'Delete this collection?', text: 'The collection and its notes are removed. The places in it stay in the encyclopedia.', ok: 'Delete collection', danger: true })) {
        UserStore.set('collections', UserStore.get('collections', []).filter((c) => c.id !== b.dataset.colDel)); draw();
      }
      if (b.dataset.itemDel) {
        const col = b.closest('[data-col]').dataset.col;
        UserStore.set('collections', UserStore.get('collections', []).map((c) => (c.id !== col ? c : { ...c, items: c.items.filter((it) => it.key !== b.dataset.itemDel) })));
        draw();
      }
    });
    // Names and notes save when you leave the field.
    page.addEventListener('change', (e) => {
      const col = e.target.closest('[data-col]')?.dataset.col;
      if (!col) return;
      UserStore.set('collections', UserStore.get('collections', []).map((c) => {
        if (c.id !== col) return c;
        if (e.target.classList.contains('col-name')) return { ...c, name: e.target.value.trim() || c.name };
        if (e.target.classList.contains('col-notes')) return { ...c, notes: e.target.value };
        if (e.target.classList.contains('item-note')) return { ...c, items: c.items.map((it) => (it.key === e.target.dataset.item ? { ...it, note: e.target.value } : it)) };
        return c;
      }));
    });
  };

  // ---------- Collectible Tracker ----------

  /** Summary entries that describe a whole kind of collectible rather than one item to find. */
  const OVERVIEW_TYPES = new Set(['card set', 'waink scan group', 'stunt jumps by county', 'stunts', 'style group', 'scan group',
    'checklist', 'cards', 'scans', 'destructibles', 'spots', 'reading', 'treasure sets', 'underwater treasure', 'wrecks',
    'discoveries', 'hunting tasks', 'styles', 'vehicles', 'meteorite chunk']);
  /** Families the tracker groups types into (by the start of the type's name). */
  const FAMILIES = [
    [/^collectible card/i, 'Collectible cards'], [/^under the bridge/i, 'Under the Bridge'], [/^stunt jump/i, 'Stunt jumps'],
    [/^knife flight/i, 'Knife flights'], [/^base jump/i, 'Base jumps'], [/^wainK/i, 'WAiNK scans'], [/^ahol/i, 'AHOL street art'],
    [/kenton|underwater discovery/i, "Kenton's treasure"], [/magazine, book|book swap|^magazine$|^book/i, 'Reading'],
    [/style|tattoo/i, 'Styles and tattoos'], [/meditation/i, 'Meditation spots'], [/playlist/i, 'Unique playlists'], [/flamingo/i, 'Cocaine flamingos'],
  ];
  const familyOf = (type) => (FAMILIES.find(([re]) => re.test(type)) || [null, 'Other finds'])[1];
  /** The game's map blip for a family (from its first item's type), shown beside the family's name. */
  const familyBlip = (it) => {
    const kind = it && familyKind(it.entry);
    return kind ? `<img class="tracker-family-blip" src="${blipOf({ kind, category: '' })}" alt="">` : '';
  };

  function trackerItems() {
    return (state.wiki.collectibles || [])
      .filter((e) => e.facts?.type && !OVERVIEW_TYPES.has(e.facts.type.toLowerCase()))
      .map((e) => ({ entry: e, type: e.facts.type.replace(/^(\w)/, (c) => c.toUpperCase()), family: familyOf(e.facts.type) }));
  }

  window.trackerItems = trackerItems; // the 100% page (hundred.js) counts ticks by family

  /** The families in A–Z order, with "Other finds" last. */
  const familyList = (items) => [...new Set(items.map((it) => it.family))]
    .sort((a, b) => (a === 'Other finds') - (b === 'Other finds') || a.localeCompare(b, 'en', { sensitivity: 'base' }));

  EXTRA_PAGES.tracker = function renderTracker(a, b, params) {
    const items = trackerItems();
    const families = familyList(items);
    // Each collectible's county, from its region (the same rule as the encyclopedia's "By county").
    const countyIs = new Map(items.map((it) => [it, countyFor(it.entry.facts.region)]));
    const counties = COUNTY_ORDER.filter((c) => [...countyIs.values()].includes(c));
    const ticks = () => UserStore.get('collectible-ticks', {});
    view.innerHTML = `${pageHead('Collectible Tracker', `Tick off the ${items.length} individual collectibles the encyclopedia lists, family by family. Counts come from the entries themselves; where guides give a different total, both are shown.`, 'collectibles')}
      <div class="block tracker">
        <div class="tracker-summary"></div>
        <div class="tracker-tools">
          <div class="field-search tracker-search">${icon('search')}<input type="search" class="tracker-filter" placeholder="Search collectibles" aria-label="Search collectibles"></div>
          <label class="list-sort"><span>Show</span> <select class="tracker-show" aria-label="Show"><option value="all">All</option><option value="todo">Still to find</option><option value="done">Found</option></select></label>
          ${counties.length > 1 ? `<label class="list-sort"><span>County</span> <select class="tracker-county" aria-label="County"><option value="">Every county</option>${counties.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="tracker-families" role="group" aria-label="Collectible families"></div>
        <p class="tracker-place muted" hidden></p>
        <div class="tracker-body"></div>
      </div>`;
    // One family control (the chips). Each family is a group that opens on demand, so the page
    // is a short list of families, not every collectible at once.
    // ?family=Knife%20flights&show=todo opens one family, as the 100% page links do.
    let fam = families.includes(params?.get('family')) ? params.get('family') : '';
    if (['todo', 'done'].includes(params?.get('show'))) view.querySelector('.tracker-show').value = params.get('show');
    // ?q=Ocean%20Beach starts with that search, as the place pages link ("Collectibles here").
    if (params?.get('q')) view.querySelector('.tracker-filter').value = params.get('q');
    // ?place=ocean-beach keeps the collectibles whose region names that place (the place pages link this way).
    const place = (state.wiki.locations || []).find((l) => l.slug === params?.get('place'));
    const atPlace = (it) => !place || placesIn(it.entry.facts.region || '').some((h) => h.l.slug === place.slug);
    if (place) {
      const note = view.querySelector('.tracker-place');
      note.hidden = false;
      note.innerHTML = `Only collectibles in <a href="${esc(entryLink('locations', place.slug))}">${esc(place.name)}</a>. <a href="#/tracker">Show every place</a>`;
    }
    const opened = new Set();
    const draw = () => {
      const t = ticks();
      const q = view.querySelector('.tracker-filter').value.toLowerCase();

      const show = view.querySelector('.tracker-show').value;
      const county = view.querySelector('.tracker-county')?.value || '';
      const inCounty = (it) => !county || countyIs.get(it) === county;
      const done = items.filter((it) => t[it.entry.slug]).length;
      view.querySelector('.tracker-summary').innerHTML = `<div class="stat-card stat-wide"><b>${done} of ${items.length}</b><span>collectibles ticked (${pct(done, items.length)}%)</span>${bar(done, items.length)}</div>`;
      // Family chips: the same choice as the Family list, one press each, with what is ticked.
      view.querySelector('.tracker-families').innerHTML = ['', ...families].map((f) => {
        const mine = f ? items.filter((it) => it.family === f) : items;
        const got = mine.filter((it) => t[it.entry.slug]).length;
        return `<button type="button" class="chip-btn${fam === f ? ' is-on' : ''}" data-family="${esc(f)}" aria-pressed="${fam === f}">${esc(f || 'All families')} <b>${got}/${mine.length}</b></button>`;
      }).join('');
      const shown = items.filter((it) => (!fam || it.family === fam)
        && (!q || `${it.entry.name} ${it.type} ${it.entry.facts.region || ''}`.toLowerCase().includes(q))
        && (show === 'all' || (show === 'done') === Boolean(t[it.entry.slug])) && atPlace(it) && inCounty(it));
      view.querySelector('.tracker-body').innerHTML = families.filter((f) => !fam || f === fam).map((f) => {
        const mine = items.filter((it) => it.family === f);
        const list = shown.filter((it) => it.family === f);
        if (!list.length && (q || show !== 'all' || place || county)) return '';
        const got = mine.filter((it) => t[it.entry.slug]).length;
        const types = [...new Set(mine.map((it) => it.type.toLowerCase()))]; // "WAiNK Sculpture" and "WAiNK sculpture" are one type
        // What the guides say the full count is, when the entries carry it (most common "total").
        const totals = mine.map((it) => it.entry.facts.total).filter((n) => typeof n === 'number');
        const common = totals.length ? totals.sort((a, b) => totals.filter((v) => v === b).length - totals.filter((v) => v === a).length)[0] : null;
        const guideTotal = types.length === 1 && common && common !== mine.length ? `<span class="muted"> · guides count ${common}; the encyclopedia lists ${mine.length}</span>` : '';
        const open = Boolean(fam || q || show !== 'all' || place || county || opened.has(f));
        return `<details class="tracker-family-box" data-box="${esc(f)}"${open ? ' open' : ''}>
          <summary><h2>${familyBlip(mine[0])}${esc(f)} <span class="muted">${got} / ${mine.length}</span>${guideTotal}</h2>${bar(got, mine.length)}</summary>
          <ul class="tracker-list">${list.map((it) => {
            const hidden = isHidden('collectibles', it.entry);
            const on = Boolean(t[it.entry.slug]);
            return `<li class="${on ? 'is-done' : ''}"><label><input type="checkbox" data-tick="${esc(it.entry.slug)}" ${on ? 'checked' : ''}>
              ${hidden ? '<span class="tracker-thumb" aria-hidden="true"></span>'
    : it.entry.image ? `<img class="tracker-thumb" src="${esc(it.entry.image)}" alt="" loading="lazy">`
      : `<span class="tracker-thumb tracker-thumb-art" aria-hidden="true">${autoArt('collectibles', it.entry)}</span>`}
              <span>${hidden ? '<em>Spoiler hidden</em>' : esc(it.entry.name)}</span></label>
              <span class="tracker-meta">${esc(types.length > 1 ? it.type : '')}${it.entry.facts.region && !hidden ? ` · ${esc(it.entry.facts.region)}` : ''}</span>
              <span class="conf conf-${esc(it.entry.confidence || 'unknown')}" title="${esc((CONFIDENCE[it.entry.confidence] || CONFIDENCE.unknown)[1])}">${esc((CONFIDENCE[it.entry.confidence] || CONFIDENCE.unknown)[0])}</span>
              <a class="tracker-open" href="${esc(entryLink('collectibles', it.entry.slug))}" aria-label="Open ${hidden ? 'entry' : esc(it.entry.name)}">Open</a></li>`;
          }).join('')}</ul>
        </details>`;
      }).join('') || '<div class="empty-state"><h2>Nothing matches</h2><p>Clear the search or choose another family.</p></div>';
    };
    draw();
    const box = view.querySelector('.tracker');
    let timer;
    box.querySelector('.tracker-filter').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(draw, 120); });
    // Remember which groups the reader opened, so ticking an item doesn't close them.
    box.addEventListener('toggle', (e) => {
      const f = e.target.dataset?.box;
      if (!f) return;
      if (e.target.open) opened.add(f); else opened.delete(f);
    }, true);
    box.querySelector('.tracker-families').addEventListener('click', (e) => {
      const b = e.target.closest('[data-family]');
      if (!b) return;
      fam = b.dataset.family;
      draw();
    });
    box.querySelector('.tracker-show').addEventListener('change', draw);
    box.querySelector('.tracker-county')?.addEventListener('change', draw);
    box.addEventListener('change', (e) => {
      const slug = e.target.dataset.tick;
      if (!slug) return;
      UserStore.tick('collectible-ticks', slug, e.target.checked);
      draw();
    });
  };

  // ---------- Progress ----------

  EXTRA_PAGES.progress = function renderProgress() {
    const items = trackerItems();
    const t = UserStore.get('collectible-ticks', {});
    const collected = items.filter((it) => t[it.entry.slug]).length;
    const discovered = UserStore.get('discovered', []);
    const places = everyEntry().filter((e) => ['locations', 'businesses'].includes(e.section));
    const placesFound = places.filter((p) => discovered.includes(p.ref)).length;
    const guideTicks = Object.keys(UserStore.get('guide-checks', {})).length;
    const guideTotal = (window.__guideChecklistTotal || 0);
    const favs = UserStore.get('favourites', []).length;
    const cols = UserStore.get('collections', []).length;
    // Map pins with no entry ("p:…" keys) belong to no section.
    const explored = new Set(discovered.filter((r) => !r.startsWith('p:')).map((r) => r.split('/')[0]));
    const sections = state.wiki.categories.map((c) => c.key).filter((k) => (state.wiki[k] || []).length);
    // Overall: the average of the parts that can be measured here, each from your own ticks.
    // The research tools' trackers (ui/research.js): trophies earned, garage, weapon locker, cheats, card sets.
    const trophies = state.wiki.achievements || [];
    const earned = Object.keys(UserStore.get('trophies-earned', {})).filter((s) => trophies.some((e) => e.slug === s)).length;
    const vehicles = (state.wiki.vehicles || []).filter((e) => e.facts && (e.facts.class || e.facts.manufacturer));
    const weapons = (state.wiki.weapons || []).filter((e) => e.facts && (e.facts.type || e.facts.slot));
    const garageN = Object.keys(UserStore.get('garage', {})).length;
    const lockerN = Object.keys(UserStore.get('weapon-locker', {})).length;
    const cheatsN = Object.keys(UserStore.get('cheats-done', {})).length;
    const sets = window.ResearchTools ? window.ResearchTools.cardSets() : [];
    const setsDone = sets.filter((s) => s.cards.filter((c) => t[c.slug]).length >= s.total).length;
    const parts = [[collected, items.length], [placesFound, places.length], ...(guideTotal ? [[guideTicks, guideTotal]] : []), ...(trophies.length ? [[earned, trophies.length]] : [])];
    const overall = Math.round(parts.reduce((s, [d, n]) => s + pct(d, n), 0) / parts.length);
    view.innerHTML = `${pageHead('Progress', 'Your own exploration, counted from what you have ticked, marked discovered and saved in this app. Nothing here is read from the game itself.')}
      <div class="block progress-page">
        <div class="stat-grid">
          <div class="stat-card stat-wide"><b>${overall}%</b><span>Overall: the average of collectibles ticked, places discovered${guideTotal ? ', 100% Guide checklist rows ticked' : ''}${trophies.length ? ' and trophies earned' : ''}</span>${bar(overall, 100)}</div>
        </div>
        <h2 class="hub-title">Completion</h2>
        <div class="stat-grid">
          <div class="stat-card"><b>${collected} / ${items.length}</b><span>Collectibles ticked · ${items.length - collected} left</span>${bar(collected, items.length)}<a href="#/tracker">Open the tracker</a></div>
          <div class="stat-card"><b>${placesFound} / ${places.length}</b><span>Locations and businesses discovered · ${places.length - placesFound} left</span>${bar(placesFound, places.length)}<a href="#/locations">Browse locations</a></div>
          ${guideTotal ? `<div class="stat-card"><b>${guideTicks} / ${guideTotal}</b><span>100% Guide checklist rows ticked · ${guideTotal - guideTicks} left</span>${bar(guideTicks, guideTotal)}<a href="#/manual/g100-route">Open the guide</a></div>` : ''}
          <a class="stat-card stat-link" href="#/hundred"><b>${icon('check-circle')}100% Checklist</b><span>The game's own checklist, line by line, with your counts and what to do next</span><em>Open the checklist</em></a>
        </div>
        <h2 class="hub-title">Trophies, collections and tools</h2>
        <div class="stat-grid">
          ${trophies.length ? `<div class="stat-card"><b>${earned} / ${trophies.length}</b><span>Trophies earned · ${trophies.length - earned} left</span>${bar(earned, trophies.length)}<a href="#/trophies">Trophy Guides</a></div>` : ''}
          ${sets.length ? `<div class="stat-card"><b>${setsDone} / ${sets.length}</b><span>Card sets complete (15 count for 100%, 3 earn a trophy)</span>${bar(setsDone, sets.length)}<a href="#/cards">Card Collections</a></div>` : ''}
          <div class="stat-card"><b>${garageN} / ${vehicles.length}</b><span>Vehicles in your garage</span>${bar(garageN, vehicles.length)}<a href="#/garage">Garage</a></div>
          <div class="stat-card"><b>${lockerN} / ${weapons.length}</b><span>Weapons in your locker</span>${bar(lockerN, weapons.length)}<a href="#/arsenal">Weapon Locker</a></div>
          <div class="stat-card"><b>${cheatsN}</b><span>Cheats marked completed</span><a href="#/cheats">Cheats</a></div>
        </div>
        <h2 class="hub-title">Saved and explored</h2>
        <div class="stat-grid">
          <div class="stat-card"><b>${favs}</b><span>Favourites</span><a href="#/saved">Saved</a></div>
          <div class="stat-card"><b>${cols}</b><span>Collections</span><a href="#/saved">Saved</a></div>
          <div class="stat-card"><b>${explored.size} / ${sections.length}</b><span>Encyclopedia sections with something discovered</span>${bar(explored.size, sections.length)}</div>
        </div>
        <h2 class="hub-title">Profiles side by side</h2>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Profiles side by side"><table class="profile-compare"><thead><tr><th scope="col">Profile</th><th scope="col">Collectibles</th><th scope="col">Discovered</th><th scope="col">Guide rows</th><th scope="col">Trophies</th><th scope="col">Favourites</th><th scope="col">Journal records</th></tr></thead><tbody>
        ${[['', 'Shared'], ['jason', 'Jason'], ['lucia', 'Lucia']].map(([pf, label]) => {
          const raw = (part, d) => UserStore.data[pf ? `${pf}-${part}` : part] ?? d;
          const here = pf === UserStore.profile();
          return `<tr${here ? ' class="is-here"' : ''}><th scope="row">${label}${here ? ' <span class="muted">(in use)</span>' : ''}</th><td>${Object.keys(raw('collectible-ticks', {})).length}</td><td>${raw('discovered', []).length}</td><td>${Object.keys(raw('guide-checks', {})).length}</td><td>${Object.keys(raw('trophies-earned', {})).length}</td><td>${raw('favourites', []).length}</td><td>${raw('journal', []).length}</td></tr>`;
        }).join('')}</tbody></table></div>
        <h2 class="hub-title">Collectibles by family</h2>
        <ul class="family-bars">${familyList(items).map((f) => {
          const mine = items.filter((it) => it.family === f);
          const got = mine.filter((it) => t[it.entry.slug]).length;
          return `<li><span>${esc(f)}</span><b>${got} / ${mine.length}</b>${bar(got, mine.length)}</li>`;
        }).join('')}</ul>
      </div>`;
  };

  // The 100% Guide's checklist size, for Progress (read once from the manual).
  fetch('/api/manual').then((r) => r.json()).then((m) => {
    window.__guideChecklistTotal = m.chapters.flatMap((c) => c.pages || []).flatMap((p) => p.blocks).filter((b) => b.type === 'checklist').reduce((s, b) => s + (b.items || []).length, 0);
  }).catch(() => {});

  // ---------- Settings ----------

  const applyMotion = () => window.Appearance?.apply();

  /** "120 collectible ticks, 14 discovered places, …" across every profile in a saved-data document. */
  function backupSummary(data) {
    const sum = (part, size) => Object.entries(data || {})
      .filter(([k]) => k === part || k === `jason-${part}` || k === `lucia-${part}`)
      .reduce((n, [, v]) => n + size(v), 0);
    const len = (v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);
    const parts = [
      [sum('collectible-ticks', len), 'collectible tick', 'collectible ticks'],
      [sum('discovered', len), 'discovered place', 'discovered places'],
      [sum('guide-checks', len), 'guide tick', 'guide ticks'],
      [sum('hundred-counts', len), '100% count', '100% counts'],
      [sum('favourites', len), 'favourite', 'favourites'],
      [sum('collections', len), 'collection', 'collections'],
      [sum('routes', len), 'route', 'routes'],
      [sum('journal', len), 'journal record', 'journal records'],
      [sum('trophies-earned', len), 'trophy earned', 'trophies earned'],
      [sum('garage', len), 'vehicle in the garage', 'vehicles in the garage'],
      [sum('weapon-locker', len), 'weapon in the locker', 'weapons in the locker'],
      [sum('cheats-done', len), 'cheat completed', 'cheats completed'],
      [sum('map-markers', len), 'map marker', 'map markers'],
    ].filter(([n]) => n).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
    return parts.length ? parts.join(', ') : 'nothing saved yet';
  }

  /** Writes a backup of everything saved and every setting; resolves with the file's path. */
  async function writeBackup() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const body = {
      app: 'GTA 6 HQ', kind: 'backup', format: 1,
      saved: d.toISOString(),
      stamp: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`,
      userdata: UserStore.data,
      settings: prefs.saved,
    };
    const answer = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!answer.ok) throw new Error(await answer.text() || `The app answered ${answer.status}.`);
    return (await answer.json()).path;
  }

  EXTRA_PAGES.settings = function renderSettings() {
    const v = (k, d) => prefs.get(k) || d;
    const radio = (name, options, value) => options.map(([val, label]) => `<label class="opt"><input type="radio" name="${name}" value="${val}" ${value === val ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('');
    view.innerHTML = `${pageHead('Settings', 'How the app behaves for you. Saved on this computer and kept after updates.')}
      <form class="block settings-page" novalidate>
        <fieldset><legend>Profile</legend>
          <p class="muted">Keep separate favourites, collections, routes, saved views, progress and journal for each character. "Shared" is the one you have used so far.</p>
          ${radio('profile', [['', 'Shared'], ['jason', 'Jason'], ['lucia', 'Lucia']], v('profile', ''))}
        </fieldset>
        <fieldset class="appearance"><legend>Appearance</legend>
          <p class="muted">Theme. Every page follows it; the Field Manual keeps its own day and night reading switch.</p>
          <div class="theme-picks">${[['vice', 'Vice City', 'The original sunset violet'], ['dark', 'Dark', 'Neutral greys'], ['light', 'Light', 'Paper white']].map(([val, label, note]) => `<label class="theme-pick theme-${val}"><input type="radio" name="theme-app" value="${val}" ${v('theme-app', 'vice') === val ? 'checked' : ''}><span class="theme-swatch" aria-hidden="true"><i></i><i></i><i></i></span><b>${label}</b><small>${note}</small></label>`).join('')}</div>
          <p class="muted">Accent colour, for links, buttons and highlights.</p>
          <div class="accent-picks">${window.Appearance.ACCENTS.map(([hex, label]) => `<label class="accent-pick" title="${esc(label)}"><input type="radio" name="accent" value="${hex}" ${(prefs.get('accent') || '') === hex ? 'checked' : ''}><span style="--sw:${hex || '#f3a0bc'}" aria-hidden="true"></span><span class="sr-only">${esc(label)}</span></label>`).join('')}
            <label class="accent-own">Your own <input type="color" name="accent-own" value="${window.Appearance.HEX.test(prefs.get('accent') || '') ? prefs.get('accent') : '#f3a0bc'}" aria-label="Pick your own accent colour"></label></div>
          <p class="muted">Interface density.</p>${radio('density', [['comfortable', 'Comfortable'], ['compact', 'Compact (more on screen)']], v('density', 'comfortable'))}
          <p class="muted">Map panels: how much of the map shows through cards and floating controls.</p>
          <label class="range-row"><input type="range" name="panel-see" min="0" max="60" step="10" value="${window.Appearance.seeThrough()}" aria-label="Map panel transparency, per cent"><output>${window.Appearance.seeThrough()}%</output></label>
        </fieldset>
        <fieldset><legend>Motion</legend>
          <p class="muted">Animation intensity.</p>${radio('motion-level', [['full', 'Full'], ['gentle', 'Gentle (shorter, no pulsing)'], ['off', 'Off']], v('motion-level', 'full'))}
          <label class="opt"><input type="checkbox" name="reduced-motion" ${prefs.get('reduced-motion') === '1' ? 'checked' : ''}><span>Reduce motion across the app (page fades, map flights, pulsing pins). Overrides the choice above.</span></label>
        </fieldset>
        ${STORE ? '' : `<fieldset><legend>Start-up</legend>
          <p class="muted">Which intro plays when the app opens. Skip it any time with Esc or Enter.</p>${radio('intro', [['classic', 'Classic (the character clips and the VI logo)'], ['official', 'Official (the game’s own start-up, with music)']], v('intro', 'classic'))}
        </fieldset>`}
        <fieldset><legend>Map</legend>
          <p class="muted">Which view the map opens in.</p>${radio('map-mode', [['2d', '2D (fastest)'], ['3d', '3D (tilted, loads the 3D engine)']], v('map-mode', '2d'))}
          <p class="muted">Camera movement when flying to a place.</p>${radio('map-motion', [['on', 'Smooth flights'], ['off', 'Jump straight there']], v('map-motion', 'on'))}
          <p class="muted">What counts as "nearby" on cards and entry pages.</p>${radio('near-radius', [['small', 'Close'], ['medium', 'Medium'], ['large', 'Wide']], v('near-radius', 'medium'))}
        </fieldset>
        <fieldset><legend>Your data</legend>
          <p class="muted">Back up everything you have saved, for every profile, to a file in your Downloads folder: collectible ticks, 100% counts, discovered places, guide ticks, favourites, collections, routes, saved views, your journal and these settings. Restore reads a backup back in, on this computer or another one.</p>
          <div class="settings-btns">
            <button type="button" class="btn btn-small" data-backup>Back up my progress</button>
            <button type="button" class="btn btn-small" data-restore>Restore from a backup…</button>
            <input type="file" accept=".json,application/json" data-restore-file hidden>
          </div>
          <p class="backup-status muted" role="status"></p>
          <div class="settings-btns">
            <button type="button" class="btn btn-small" data-reset="searches">Clear recent searches</button>
            <button type="button" class="btn btn-small" data-reset="prefs">Reset these settings</button>
            <button type="button" class="btn btn-small btn-danger" data-reset="progress">Reset exploration progress…</button>
          </div>
          <p class="muted">Resetting progress clears collectible ticks, discovered places and 100% Guide ticks. Favourites, collections, routes and saved views are kept.</p>
          <p class="settings-status muted" role="status"></p>
        </fieldset>
      </form>`;
    const form = view.querySelector('.settings-page');
    // A list of the sections beside them on a wide window, so a long page can be crossed in one click.
    const sets = [...form.querySelectorAll(':scope > fieldset')];
    sets.forEach((set, i) => { set.id = `settings-${i}`; });
    const toc = document.createElement('nav');
    toc.className = 'settings-toc';
    toc.setAttribute('aria-label', 'Settings sections');
    toc.style.gridRow = `1 / span ${sets.length}`;
    toc.innerHTML = `<b>On this page</b><ul>${sets.map((set) => `<li><a href="#/settings" data-to="${set.id}">${esc(set.querySelector('legend')?.textContent || '')}</a></li>`).join('')}</ul>`;
    toc.addEventListener('click', (e) => {
      const to = e.target.closest('[data-to]');
      if (!to) return;
      e.preventDefault();
      document.getElementById(to.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    form.prepend(toc);
    const status = (text) => { form.querySelector('.settings-status').textContent = text; };
    form.addEventListener('change', (e) => {
      const { name, value, type, checked } = e.target;
      if (!name) return;
      if (name === 'accent-own') { prefs.set('accent', value); form.querySelectorAll('[name="accent"]').forEach((r) => { r.checked = false; }); window.Appearance.apply(); status('Saved.'); return; }
      prefs.set(name, type === 'checkbox' ? (checked ? '1' : '0') : value);
      if (['reduced-motion', 'theme-app', 'accent', 'density', 'motion-level', 'panel-see'].includes(name)) window.Appearance.apply();
      if (name === 'profile') UserStore.switched();
      status(name === 'profile' ? `Now using the ${value ? value[0].toUpperCase() + value.slice(1) : 'Shared'} profile.` : 'Saved.');
    });
    form.addEventListener('input', (e) => {
      if (e.target.name !== 'panel-see') return;
      e.target.nextElementSibling.textContent = `${e.target.value}%`;
      prefs.set('panel-see', e.target.value);
      window.Appearance.apply();
    });
    // ---------- backup and restore ----------
    const backupStatus = (text) => { form.querySelector('.backup-status').textContent = text; };
    const restored = (() => { try { const t = sessionStorage.getItem('hq-restored'); sessionStorage.removeItem('hq-restored'); return t; } catch { return null; } })();
    if (restored) backupStatus(restored);
    form.querySelector('[data-backup]').addEventListener('click', async () => {
      backupStatus('Saving a backup…');
      try { backupStatus(`Saved: ${await writeBackup()}. ${backupSummary(UserStore.data)}.`); } catch (err) { backupStatus(`The backup could not be saved. ${err.message}`); }
    });
    const picker = form.querySelector('[data-restore-file]');
    form.querySelector('[data-restore]').addEventListener('click', () => picker.click());
    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      picker.value = '';
      if (!file) return;
      let backup;
      try { backup = JSON.parse(await file.text()); } catch { backupStatus(`${file.name} is not a backup file (it could not be read as one).`); return; }
      if (!backup || backup.app !== 'GTA 6 HQ' || backup.kind !== 'backup' || typeof backup.userdata !== 'object' || Array.isArray(backup.userdata) || !backup.userdata) {
        backupStatus(`${file.name} is not a GTA 6 HQ backup.`);
        return;
      }
      const from = backup.saved ? new Date(backup.saved).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'an unknown date';
      if (!await hqConfirm({
        title: 'Restore this backup?',
        text: `Backup from ${from}: ${backupSummary(backup.userdata)}. It replaces everything saved in this app, for every profile, and its settings. Your progress as it is now is saved to your Downloads folder first, so you can go back.`,
        ok: 'Restore',
      })) return;
      backupStatus('Saving your current progress first…');
      let safety;
      try { safety = await writeBackup(); } catch (err) { backupStatus(`Nothing was restored: your current progress could not be backed up first. ${err.message}`); return; }
      // Every saved part is replaced: parts only in the old data are removed.
      const changes = {};
      Object.keys(UserStore.data).forEach((k) => { changes[k] = null; });
      Object.assign(changes, backup.userdata);
      try {
        const answer = await fetch('/api/userdata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
        if (!answer.ok) throw new Error(await answer.text());
        const settings = Object.fromEntries(Object.entries(backup.settings || {}).filter(([, v]) => typeof v === 'string'));
        if (Object.keys(settings).length) {
          const sent = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
          if (!sent.ok) throw new Error(await sent.text());
        }
      } catch (err) {
        backupStatus(`The backup could not be restored (${err.message}). Your progress before the attempt is in ${safety}.`);
        return;
      }
      try { sessionStorage.setItem('hq-restored', `Restored the backup from ${from}. Your progress from before is in ${safety}.`); } catch { /* the message is only a courtesy */ }
      location.hash = '#/settings';
      location.reload();
    });

    form.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-reset]');
      if (!b) return;
      if (b.dataset.reset === 'searches') { UserStore.set('searches', null); status('Recent searches cleared.'); }
      if (b.dataset.reset === 'prefs') {
        prefs.save({ 'map-mode': '2d', 'map-motion': 'on', 'near-radius': 'medium', 'reduced-motion': '0', 'theme-app': 'vice', accent: '', density: 'comfortable', 'motion-level': 'full', 'panel-see': '0' });
        applyMotion();
        EXTRA_PAGES.settings();
        view.querySelector('.settings-status').textContent = 'Settings reset.';
      }
      if (b.dataset.reset === 'progress') {
        if (!await hqConfirm({ title: 'Reset your progress?', text: 'This clears collectible ticks, discovered places, 100% Guide ticks, trophies earned and cheats marked completed for this profile. Favourites, collections, routes, saved views and your garage and weapon locker are kept. It cannot be undone.', ok: 'Reset progress', danger: true })) return;
        UserStore.set('collectible-ticks', null);
        UserStore.set('discovered', null);
        UserStore.set('guide-checks', null);
        UserStore.set('trophies-earned', null);
        UserStore.set('cheats-done', null);
        status('Progress reset.');
      }
    });
  };

  // ---------- the top bar: "More" menu, active section, search suggestions ----------

  // The "More" menu: which of its pages is open (the encyclopedia's own sections count as
  // Encyclopedia, except Vehicles and Collectibles, which have their own place in the bar).
  AFTER_RENDER.push((page, a) => {
    const more = document.getElementById('nav-more');
    if (!more) return;
    const links = [...more.querySelectorAll('.nav-more-menu a')];
    const routes = links.map((l) => l.dataset.route);
    let current = null;
    if (page === 'wiki') current = a && routes.includes(`wiki/${a}`) ? `wiki/${a}` : (a === 'vehicles' || a === 'collectibles') ? null : 'wiki';
    else if (routes.includes(page)) current = page;
    more.querySelector('.nav-more-btn').classList.toggle('is-active', Boolean(current));
    links.forEach((link) => {
      const active = link.dataset.route === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    more.querySelector('.nav-more-btn').setAttribute('aria-expanded', 'false');
    more.classList.remove('is-open');
  });
  document.addEventListener('click', (e) => {
    const more = document.getElementById('nav-more');
    if (!more) return;
    const btn = e.target.closest('.nav-more-btn');
    if (btn) {
      const open = !more.classList.contains('is-open');
      more.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!e.target.closest('#nav-more')) { more.classList.remove('is-open'); more.querySelector('.nav-more-btn').setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const more = document.getElementById('nav-more');
    if (more?.classList.contains('is-open')) { more.classList.remove('is-open'); more.querySelector('.nav-more-btn').focus(); }
  });

  // Search suggestions: entry names, map places and your recent searches, as you type.
  const form = document.getElementById('nav-search');
  const input = form?.elements.q;
  if (input) {
    const list = document.createElement('ul');
    list.className = 'suggest';
    list.id = 'suggest-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    form.append(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'suggest-list');
    input.setAttribute('aria-expanded', 'false');
    let index = null, active = -1, options = [];
    const build = () => {
      if (index) return index;
      const pins = mapPins();
      const pinned = new Set(pins.map((p) => p.ref).filter(Boolean));
      index = [
        ...everyEntry().filter((e) => !isHidden(e.section, e.entry)).map((e) => ({
          label: e.entry.name, kind: sectionLabel(e.section), href: entryLink(e.section, e.entry.slug), map: pinned.has(e.ref) ? `#/map?focus=${encodeURIComponent(e.ref)}` : '',
          text: `${e.entry.name} ${e.entry.facts?.region || ''} ${e.entry.facts?.district || ''} ${e.entry.facts?.type || ''}`.toLowerCase(),
        })),
        ...pins.filter((p) => !p.ref && !p.hidden).map((p) => ({ label: p.name, kind: p.kind || 'Map pin', href: `#/map?focus=${encodeURIComponent(pinKey(p))}`, map: '', text: `${p.name} ${p.kind}`.toLowerCase() })),
      ];
      return index;
    };
    const remember = (q) => {
      const term = q.trim();
      if (!term) return;
      UserStore.set('searches', [term, ...UserStore.get('searches', []).filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 12));
    };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!state.wiki) return;
      if (!q) {
        const recent = UserStore.get('searches', []);
        options = recent.map((s) => ({ label: s, kind: 'Recent search', href: `#/search?q=${encodeURIComponent(s)}`, recent: true }));
        list.innerHTML = recent.length ? `${options.map((o, i) => `<li role="option" id="sg-${i}" data-i="${i}"><span>${esc(o.label)}</span><em>${esc(o.kind)}</em></li>`).join('')}<li class="suggest-clear"><button type="button" data-clear-recent>Clear recent searches</button></li>` : '';
      } else {
        const words = q.split(/\s+/);
        const scored = build().filter((o) => words.every((w) => o.text.includes(w)))
          .map((o) => ({ o, s: o.label.toLowerCase().startsWith(q) ? 0 : o.label.toLowerCase().includes(q) ? 1 : 2 }))
          .sort((a, b) => a.s - b.s || a.o.label.length - b.o.label.length).slice(0, 8).map((x) => x.o);
        options = [...scored, { label: `Search everything for “${input.value.trim()}”`, kind: '', href: `#/search?q=${encodeURIComponent(input.value.trim())}`, all: true }];
        list.innerHTML = options.map((o, i) => `<li role="option" id="sg-${i}" data-i="${i}" class="${o.all ? 'suggest-all' : ''}"><span>${esc(o.label)}</span>${o.kind ? `<em>${esc(o.kind)}</em>` : ''}${o.map ? `<a class="suggest-map" href="${esc(o.map)}" tabindex="-1">On map</a>` : ''}</li>`).join('');
      }
      list.hidden = !list.innerHTML;
      input.setAttribute('aria-expanded', String(!list.hidden));
    };
    const go = (i) => {
      const o = options[i];
      if (!o) return;
      remember(o.recent ? o.label : input.value);
      close();
      input.value = '';
      location.hash = o.href;
    };
    input.addEventListener('input', () => { active = -1; render(); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        list.querySelectorAll('[role="option"]').forEach((li, i) => li.classList.toggle('is-active', i === active));
        input.setAttribute('aria-activedescendant', `sg-${active}`);
      } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); e.stopPropagation(); go(active); }
      else if (e.key === 'Escape') close();
    });
    form.addEventListener('submit', () => { remember(input.value); close(); }, true);
    list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the box while clicking
    list.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear-recent]')) { UserStore.set('searches', null); render(); input.focus(); return; }
      if (e.target.closest('.suggest-map')) { close(); input.value = ''; return; }
      const li = e.target.closest('[data-i]');
      if (li) go(Number(li.dataset.i));
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    // The index is rebuilt when spoilers are shown or hidden.
    document.addEventListener('click', (e) => { if (e.target.closest('[data-spoilers], [data-reveal]')) index = null; });
  }

  applyMotion();
  // Settings are read before the first page; apply reduced motion as soon as they are.
  const waitPrefs = setInterval(() => { if (state.wiki) { applyMotion(); clearInterval(waitPrefs); } }, 200);
})();

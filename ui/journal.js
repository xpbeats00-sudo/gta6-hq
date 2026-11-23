// GTA 6 HQ: the Discovery Journal and the character profile switch.
// The journal is a dated list of what the reader did in the app: places and entries viewed,
// things saved, collectibles ticked, places marked discovered, Street Explorer pictures looked at,
// the districts those were in, and the reader's own notes. One part of user data ("journal"),
// kept per profile like the rest. Loaded after explore.js; uses app.js globals.
(function () {
  const MAX_EVENTS = 1500;
  const QUIET_MS = 30 * 60 * 1000; // the same view within half an hour is one visit
  const TYPES = {
    viewed: 'Viewed',
    district: 'Explored district',
    street: 'Street Explorer picture',
    saved: 'Saved',
    discovered: 'Marked discovered',
    collected: 'Collectible ticked',
    note: 'Note',
  };
  const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  /** The district, town or area nearest a map spot (x, y from 0 to 1), by the map's own proportions. */
  function districtAt(x, y) {
    const map = state.wiki?.map;
    if (!map || typeof x !== 'number') return '';
    const best = (map.places || []).filter((p) => p.kind !== 'landmark').reduce((b, p) => {
      const d = Math.hypot((p.x - x) * map.width, (p.y - y) * map.height);
      return !b || d < b.d ? { d, name: p.name } : b;
    }, null);
    return best && best.d < map.width * 0.12 ? best.name : '';
  }

  // The journal writes through the original set, so its own saving is not logged again.
  const rawSet = UserStore.set.bind(UserStore);
  const events = () => UserStore.get('journal', []);
  function log(t, item = {}) {
    const list = events();
    const key = item.key || item.ref || item.name || '';
    const now = Date.now();
    if (['viewed', 'street', 'district'].includes(t) && list.some((e) => e.t === t && (e.key || e.ref || e.name) === key && now - e.at < QUIET_MS)) return;
    const entry = { id: id(), t, at: now };
    for (const f of ['key', 'ref', 'name', 'x', 'y', 'where', 'text', 'detail']) if (item[f] !== undefined && item[f] !== '') entry[f] = item[f];
    const notes = list.filter((e) => e.t === 'note');
    const rest = [entry, ...list.filter((e) => e.t !== 'note')].slice(0, MAX_EVENTS - notes.length);
    rawSet('journal', [...rest, ...notes].sort((a, b) => b.at - a.at));
    if (typeof item.x === 'number' && t !== 'district') {
      const where = districtAt(item.x, item.y);
      if (where) log('district', { name: where, key: `district:${where}`, x: item.x, y: item.y });
    }
  }

  const nameOf = (key) => window.describeSaved?.(key)?.name || key.replace(/^[ep]:/, '').replace(/@.*/, '');
  const placeOf = (ref) => {
    const pin = typeof mapPins === 'function' ? mapPins().find((p) => p.ref === ref) : null;
    return pin ? { x: pin.x, y: pin.y } : {};
  };

  // ---------- what gets logged ----------

  // Saving, discovering and ticking: watch the store's own helpers, so every page is covered.
  const toggle = UserStore.toggle.bind(UserStore);
  UserStore.toggle = (part, key) => {
    const on = toggle(part, key);
    if (on && part === 'favourites') log('saved', { key, name: nameOf(key), detail: 'Favourite', ...(key.startsWith('e:') ? placeOf(key.slice(2)) : {}) });
    if (on && part === 'discovered') {
      // A map pin with no entry is kept as "p:name@x,y" (foundKey in app.js): its name and place are in the key.
      const at = key.startsWith('p:') ? key.split('@').pop().split(',').map(Number) : null;
      const t = at ? null : resolve(key);
      // The pin's name as the map shows it now, so a spoiler pin is logged as "Spoiler", not by its real name.
      const pin = at && typeof mapPins === 'function' ? mapPins().find((p) => pinKey(p) === key) : null;
      log('discovered', { ref: key, name: at ? (pin ? pin.name : nameOf(key)) : (t ? (isHidden(t.section, t.entry) ? 'Spoiler' : t.entry.name) : key), ...(at ? { x: at[0], y: at[1] } : placeOf(key)) });
    }
    return on;
  };
  const tick = UserStore.tick.bind(UserStore);
  UserStore.tick = (part, key, on) => {
    tick(part, key, on);
    if (on && part === 'collectible-ticks') {
      const item = resolve(`collectibles/${key}`);
      log('collected', { key: `c:${key}`, ref: item ? `collectibles/${key}` : undefined, name: item?.entry.name || key.replace(/[-_]/g, ' ') });
    }
  };
  UserStore.set = (part, value) => {
    const before = UserStore.get(part, []);
    rawSet(part, value);
    if (!Array.isArray(value) || !Array.isArray(before)) return;
    if (['routes', 'map-views', 'street-starts'].includes(part) && value.length > before.length) {
      const added = value.find((v) => !before.some((b) => b.id === v.id));
      if (added) log('saved', { key: `${part}:${added.id}`, name: added.name, detail: { routes: 'Route', 'map-views': 'Map view', 'street-starts': 'Street Explorer spot' }[part], x: added.x ?? added.stops?.[0]?.x, y: added.y ?? added.stops?.[0]?.y });
    }
    if (part === 'collections') {
      const had = new Set(before.flatMap((c) => c.items.map((it) => `${c.id}|${it.key}`)));
      for (const c of value) {
        const isNew = !before.some((b) => b.id === c.id);
        if (isNew && !c.items.length) log('saved', { key: `col:${c.id}`, name: c.name, detail: 'New collection' });
        for (const it of c.items) if (!had.has(`${c.id}|${it.key}`)) log('saved', { key: it.key, name: nameOf(it.key), detail: `Added to "${c.name}"` });
      }
    }
  };

  // Entry pages opened.
  AFTER_RENDER.push((page, a, b) => {
    let section = null, slug = null;
    if (page === 'wiki' && a && b) [section, slug] = [a, b];
    else if ((page === 'locations' || page === 'characters') && a) [section, slug] = [page, a];
    if (!section) return;
    const target = resolve(`${section}/${slug}`);
    if (!target || isHidden(section, target.entry)) return;
    log('viewed', { ref: `${section}/${slug}`, key: `e:${section}/${slug}`, name: target.entry.name, ...placeOf(`${section}/${slug}`) });
  });
  // Map cards opened, and Street Explorer pictures shown (events sent by app.js).
  document.addEventListener('hq:pin-open', (e) => {
    const pin = e.detail;
    if (pin && !pin.hidden) log('viewed', { key: pinKey(pin), ref: pin.ref || undefined, name: pin.name, x: pin.x, y: pin.y, detail: 'Map card' });
  });
  document.addEventListener('hq:street-photo', (e) => {
    const p = e.detail;
    if (p) log('street', { key: `s:${p.src}`, name: p.title, ref: p.ref || undefined, x: p.x, y: p.y, detail: p.at || '' });
  });

  // ---------- the profile switch, shown on the personal pages ----------

  const PROFILES = [['', 'Shared'], ['jason', 'Jason'], ['lucia', 'Lucia']];
  window.profileBar = () => {
    const p = UserStore.profile();
    return `<div class="profile-bar" role="group" aria-label="Profile">
      <span class="muted">Profile</span>${PROFILES.map(([v, l]) => `<button type="button" class="chip-btn${p === v ? ' is-on' : ''}" data-profile="${v}" aria-pressed="${p === v}">${v ? `<img src="${esc(walkerPicture(v))}" alt="">` : ''}${l}</button>`).join('')}
      <span class="muted profile-note">Each profile keeps its own favourites, collections, routes, views, street spots, progress and journal.</span>
    </div>`;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-profile]');
    if (!b) return;
    prefs.set('profile', b.dataset.profile);
    UserStore.switched();
    route();
  });
  /** The profile button in the top bar: the character's portrait, or a plain figure for Shared. */
  function syncNavProfile() {
    const el = document.getElementById('nav-profile');
    if (!el) return;
    const p = UserStore.profile();
    const label = `Profile: ${p ? p[0].toUpperCase() + p.slice(1) : 'Shared'}. Profile and settings`;
    el.innerHTML = p ? `<img src="${esc(walkerPicture(p))}" alt="">` : icon('user');
    el.setAttribute('aria-label', label);
    el.dataset.tip = label;
  }
  UserStore.onChange((part) => { if (part === '*') syncNavProfile(); });
  document.documentElement.dataset.hqProfile = 'shared';
  const waitProfile = setInterval(() => { if (state.wiki) { document.documentElement.dataset.hqProfile = UserStore.profile() || 'shared'; syncNavProfile(); clearInterval(waitProfile); } }, 200);

  // ---------- the journal page ----------

  const day = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  function linkOf(e) {
    if (e.ref) { const t = resolve(e.ref); if (t) return entryLink(t.section, t.entry.slug); }
    if (e.t === 'street' && typeof e.x === 'number') return `#/map?street=${e.x.toFixed(4)},${e.y.toFixed(4)}`;
    if (e.t === 'district') return `#/map?q=${encodeURIComponent(e.name)}`;
    if (e.key?.startsWith('routes:')) return `#/map?route=${encodeURIComponent(e.key.slice(7))}`;
    if (e.key?.startsWith('map-views:')) return `#/map?view=${encodeURIComponent(e.key.slice(10))}`;
    if (e.key?.startsWith('p:') && e.name) return `#/map?focus=${encodeURIComponent(e.key)}`;
    if (e.key?.startsWith('c:')) return '#/tracker';
    return '';
  }

  /** A picture for a record: the Street Explorer screenshot, or its entry's own picture. */
  const KIND_ICON = { viewed: 'eye', district: 'map', street: 'walk', saved: 'bookmark', discovered: 'check-circle', collected: 'gem', note: 'note' };
  function thumbOf(e) {
    if (e.key?.startsWith('s:')) return e.key.slice(2);
    const t = e.ref && resolve(e.ref);
    return t && !isHidden(t.section, t.entry) && t.entry.image ? t.entry.image : '';
  }

  EXTRA_PAGES.journal = function renderJournal() {
    let query = '';
    let type = '';
    let order = 'new';
    view.innerHTML = `${pageHead('Discovery Journal', 'Your personal record of exploring Leonida: what you viewed, saved, ticked and walked through, the districts it was in, and your own notes. Kept on this computer.')}
      <div class="journal">
        <form class="journal-note block" autocomplete="off">
          <label for="journal-text"><b>Add a note</b></label>
          <textarea id="journal-text" name="text" rows="2" maxlength="600" placeholder="A route that worked, where a safe code was, what to come back for…"></textarea>
          <div class="journal-note-row"><span class="muted">Notes are kept when you clear the history.</span><button class="btn btn-primary btn-small">${icon('plus')}Add note</button></div>
        </form>
        <section class="journal-districts" aria-labelledby="jd-h"></section>
        <div class="journal-tools">
          <div class="field-search journal-search">${icon('search')}<input type="search" class="journal-q" placeholder="Search the journal" aria-label="Search the journal"></div>
          <label><span class="sr-only">Show</span><select class="journal-type" aria-label="Show only">
            <option value="">Everything</option>${Object.entries(TYPES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
          <label><span class="sr-only">Order</span><select class="journal-order" aria-label="Order"><option value="new">Newest first</option><option value="old">Oldest first</option></select></label>
          <span class="journal-count muted" role="status"></span>
        </div>
        <div class="journal-list" aria-live="polite"></div>
        <div class="journal-clear">
          <button type="button" class="btn btn-small btn-outline" data-clear-history>${icon('reset')}Clear history…</button>
          <button type="button" class="btn btn-small btn-danger" data-clear-notes>${icon('trash')}Delete all notes…</button>
          <p class="muted">Clearing the history keeps your notes, favourites, collections, routes, saved views and progress.</p>
        </div>
      </div>`;
    const root = view.querySelector('.journal');
    const list = root.querySelector('.journal-list');

    function drawDistricts() {
      const seen = new Map();
      for (const e of events()) if (e.t === 'district' && !seen.has(e.name)) seen.set(e.name, e.at);
      const box = root.querySelector('.journal-districts');
      box.innerHTML = seen.size ? `<h2 id="jd-h">Recently explored</h2><ul class="chip-row">${[...seen].slice(0, 10).map(([name, at]) => `<li><a class="chip" href="#/map?q=${encodeURIComponent(name)}" title="Last there ${esc(day(at))}">${esc(name)}</a></li>`).join('')}</ul>` : '';
    }
    function draw() {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      let all = events().filter((e) => (!type || e.t === type) && words.every((w) => `${e.name || ''} ${e.text || ''} ${e.detail || ''} ${e.where || ''} ${TYPES[e.t] || ''}`.toLowerCase().includes(w)));
      all = all.sort((a, b) => (order === 'new' ? b.at - a.at : a.at - b.at));
      const total = events().length;
      root.querySelector('.journal-count').textContent = all.length === total ? `${total} ${total === 1 ? 'record' : 'records'}` : `${all.length} of ${total}`;
      if (!all.length) {
        list.innerHTML = `<p class="empty-note">${total ? 'Nothing matches that.' : 'Nothing here yet. Open places on the map, walk through Street Explorer, save favourites or tick collectibles, and they appear here with the date.'}</p>`;
        drawDistricts();
        return;
      }
      const groups = [];
      for (const e of all.slice(0, 400)) {
        const d = day(e.at);
        if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, items: [] });
        groups[groups.length - 1].items.push(e);
      }
      list.innerHTML = groups.map((g) => `<section class="journal-day"><h2>${esc(g.d)}</h2><ol>${g.items.map((e) => {
        const href = linkOf(e);
        const title = e.t === 'note' ? `<p class="journal-text">${esc(e.text)}</p>` : (href ? `<a href="${esc(href)}">${esc(e.name || '')}</a>` : `<b>${esc(e.name || '')}</b>`);
        const pic = thumbOf(e);
        return `<li class="journal-item t-${e.t}"><time datetime="${new Date(e.at).toISOString()}">${esc(time(e.at))}</time>
          ${pic ? `<img class="journal-thumb" src="${esc(pic)}" alt="" loading="lazy">` : `<span class="journal-thumb" aria-hidden="true">${icon(KIND_ICON[e.t] || 'pin')}</span>`}
          <div class="journal-what"><span class="journal-kind">${esc(TYPES[e.t] || e.t)}</span>${title}${e.detail ? `<span class="muted">${esc(e.detail)}</span>` : ''}</div>
          ${e.t === 'note' ? `<button type="button" class="link-btn" data-del-note="${esc(e.id)}" aria-label="Delete this note">Delete</button>` : ''}</li>`;
      }).join('')}</ol></section>`).join('') + (all.length > 400 ? `<p class="muted">Showing the first 400 of ${all.length}. Search or filter to narrow it down.</p>` : '');
      drawDistricts();
    }
    draw();
    root.querySelector('.journal-q').addEventListener('input', (e) => { query = e.target.value; draw(); });
    root.querySelector('.journal-type').addEventListener('change', (e) => { type = e.target.value; draw(); });
    root.querySelector('.journal-order').addEventListener('change', (e) => { order = e.target.value; draw(); });
    root.querySelector('.journal-note').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = e.target.elements.text.value.trim();
      if (!text) return;
      log('note', { text, name: text.slice(0, 60) });
      e.target.reset();
      draw();
    });
    root.addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del-note]');
      if (del) { rawSet('journal', events().filter((x) => x.id !== del.dataset.delNote)); draw(); return; }
      if (e.target.closest('[data-clear-history]')) {
        if (!await hqConfirm({ title: 'Clear your history?', text: 'The dated record of what you viewed and did is cleared. Your notes, favourites, collections, routes, saved views and progress are kept.', ok: 'Clear history', danger: true })) return;
        rawSet('journal', events().filter((x) => x.t === 'note'));
        draw();
      }
      if (e.target.closest('[data-clear-notes]')) {
        if (!await hqConfirm({ title: 'Delete all notes?', text: 'Every note in this profile’s journal is deleted. This cannot be undone.', ok: 'Delete notes', danger: true })) return;
        rawSet('journal', events().filter((x) => x.t !== 'note'));
        draw();
      }
    });
  };

  window.Journal = { log, districtAt, events };
}());

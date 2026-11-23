// GTA 6 HQ front end: splash screen, hash router, and one render function per page.
// All content comes from the Rust server (/api/wiki, /api/search, /api/media, /api/health).

/** The Microsoft Store edition ships none of the game's pictures or clips and draws its own
    (store-art.js). scripts/package_store.py marks the page; everywhere else this is false. */
const STORE = document.documentElement.dataset.edition === 'store';

/** The walker's picture: the character's cut-out in the full edition. Editions without the game's
    pictures (Microsoft Store, public GitHub build) draw their own: a coloured disc with a figure
    and the character's initial. */
function walkerPicture(who) {
  if (!STORE) return `/images/map/walker-${who}.png`;
  const [from, to, letter] = who === 'lucia' ? ['#f17ab5', '#b93b8f', 'L'] : ['#4fd1e8', '#2f7fae', 'J'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`
    + '<circle cx="48" cy="48" r="46" fill="url(#g)"/><circle cx="48" cy="34" r="13" fill="#190d27" opacity=".85"/>'
    + '<path d="M22 80c3-16 13-25 26-25s23 9 26 25" fill="#190d27" opacity=".85"/>'
    + `<text x="48" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="15" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
window.walkerPicture = walkerPicture;

const view = document.getElementById('view');
const state = { wiki: null, map: null };

const FIXED_LABELS = { news: 'News', editions: 'Edition', faq: 'FAQ' };
const CONFIDENCE = {
  official: ['Official', 'Stated by Rockstar Games in its own published material'],
  corroborated: ['Community', 'From guides, reviews and other published reporting, not from Rockstar itself'],
  community: ['Community', 'Community research, not confirmed by Rockstar'],
  rumor: ['Rumor', 'Unconfirmed rumor'],
  unknown: ['Unverified', 'No source has been recorded for this yet'],
};

// ---------- helpers ----------

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const category = (key) => state.wiki.categories.find((c) => c.key === key);
const sectionLabel = (key) => category(key)?.label || FIXED_LABELS[key] || key;

/** Sends saved changes to the app one request at a time, so an older save can never land after a
    newer one. Changes that arrive while a save is on its way wait and go together in the next
    request, newest value per name. A request on its way is kept (`sending`) until the app confirms
    it, so if the window closes first, the last send carries it too. That last send uses keepalive,
    which browsers allow only up to 64 KB, so it is measured in bytes; ordinary saves don't use
    keepalive and have no such limit. A failed save is kept and tried again on a timer and with the
    next change, and the reader is told. `gate` holds every send until it resolves (saved data is
    never written before it has been read). */
function makeSaver(url, what, gate = Promise.resolve()) {
  const waiting = new Map();
  let sending = {};
  let busy = false;
  let retry = null;
  let delay = 2000;
  let open = false;
  gate.then(() => { open = true; });
  async function pump() {
    if (busy) return;
    busy = true;
    await gate;
    clearTimeout(retry);
    while (waiting.size) {
      sending = Object.fromEntries(waiting);
      waiting.clear();
      try {
        const answer = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sending) });
        if (!answer.ok) throw new Error(await answer.text().catch(() => '') || `HTTP ${answer.status}`);
        sending = {};
        delay = 2000;
        saveTrouble(what, '');
      } catch (e) {
        for (const [k, v] of Object.entries(sending)) if (!waiting.has(k)) waiting.set(k, v);
        sending = {};
        saveTrouble(what, e.message || 'the app did not answer');
        // Tried again with the next change, or on its own after a short wait (longer each time).
        retry = setTimeout(pump, delay);
        delay = Math.min(delay * 2, 60000);
        break;
      }
    }
    busy = false;
  }
  addEventListener('pagehide', () => {
    if (!open) return; // the saved data was never read: sending now could overwrite it
    const all = { ...sending, ...Object.fromEntries(waiting) };
    if (!Object.keys(all).length) return;
    const body = JSON.stringify(all);
    if (new TextEncoder().encode(body).length < 60000) fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  });
  return (changes) => { for (const [k, v] of Object.entries(changes)) waiting.set(k, v); pump(); };
}

/** Notices about saving, one per kind ("settings", "saved data", a damaged or unreadable file), so
    one kind working again never hides a problem with another. Each can be dismissed. A failure
    notice goes away by itself once that kind saves again; the others stay until dismissed. */
function saveTrouble(kind, reason, lasting = false) {
  const show = () => {
    let note = document.querySelector(`.save-note[data-kind="${kind}"]`);
    if (!reason) { if (note && !note.dataset.lasting) note.remove(); return; }
    let stack = document.querySelector('.save-notes');
    if (!stack) { stack = document.createElement('div'); stack.className = 'save-notes'; document.body.append(stack); }
    if (!note) {
      note = document.createElement('div');
      note.className = 'save-note';
      note.dataset.kind = kind;
      note.setAttribute('role', 'alert');
      stack.append(note);
    }
    if (lasting) note.dataset.lasting = '1';
    note.innerHTML = `${lasting
      ? `<p>${esc(reason)}.</p>`
      : `<p><strong>Your ${esc(kind)} could not be saved.</strong> ${esc(String(reason).slice(0, 160))}. It is kept until the app closes and saving is tried again.</p>`}
      <button type="button" class="btn btn-small btn-outline">Dismiss</button>`;
    note.querySelector('button').addEventListener('click', () => note.remove());
  };
  if (document.body) show(); else addEventListener('DOMContentLoaded', show, { once: true });
}

/** The reader's own choices. The app keeps them in a file in the user's settings folder
    (/api/settings), so they are still there after a restart or an update. The web view's own
    storage would not do: the window opens on a different port each time, and it forgets with it. */
const prefs = {
  saved: {},
  /** Read once, before the first page is drawn. */
  async load() { try { this.saved = await getJson('/api/settings'); } catch { /* start with none */ } },
  get(key) { return Object.hasOwn(this.saved, key) ? this.saved[key] : null; },
  set(key, value) { this.save({ [key]: String(value) }); },
  send: makeSaver('/api/settings', 'settings'),
  save(changes) {
    Object.assign(this.saved, changes);
    this.send(changes);
  },
};
window.hqPrefs = prefs; // the Field Manual keeps its theme and last page here too

/** The reader's collections: favourites, named collections, ticked collectibles, places marked
    as discovered, saved routes, map views and street starts, recent searches. One JSON document
    in the user's settings folder (/api/userdata), read once at start and saved a part at a time.
    Everything goes through get/set here, so another backing store (a sync service) could replace
    the fetch calls without touching the pages. */
/** Parts kept separately for Jason and for Lucia when the reader picks a character profile
    (Settings). The "Shared" profile keeps the plain names, so nothing saved earlier moves. */
const PROFILE_PARTS = new Set(['favourites', 'favourite-pins', 'collections', 'discovered', 'collectible-ticks',
  'guide-checks', 'routes', 'map-views', 'street-starts', 'journal']);
const UserStore = {
  data: {},
  listeners: new Set(),
  /** Read once, before the first page is drawn. If the app can't read the file (it is locked by
      antivirus or another program, say), it is asked again a few times. If it still can't, nothing
      is saved this session: saving a part over data that was never read would replace it. */
  async load() {
    for (const wait of [0, 500, 1500, 3000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      try {
        const answer = await fetch('/api/userdata', { cache: 'no-store' });
        if (!answer.ok) continue;
        this.data = await answer.json();
        const aside = answer.headers.get('x-userdata-set-aside');
        if (aside) saveTrouble('damaged', `Your saved data could not be read: the file was damaged, so it was kept as ${aside} in your settings folder and the app started with nothing saved`, true);
        this.opened();
        return;
      } catch { /* asked again */ }
    }
    saveTrouble('unreadable', 'Your saved data could not be read, so nothing you change will be saved until the app is restarted (saving now could overwrite it)', true);
  },
  // Sends wait until the saved data has been read (load() opens the gate).
  gate: null,
  opened: null,
  send: null,
  /** '' (shared), 'jason' or 'lucia'. */
  profile() { const p = prefs.get('profile'); return p === 'jason' || p === 'lucia' ? p : ''; },
  /** The stored name of a part for the current profile: "favourites" or "jason-favourites". */
  key(part) { const p = this.profile(); return p && PROFILE_PARTS.has(part) ? `${p}-${part}` : part; },
  get(part, fallback) { const k = this.key(part); return Object.hasOwn(this.data, k) ? this.data[k] : fallback; },
  set(part, value) {
    const k = this.key(part);
    if (value === null || value === undefined) delete this.data[k]; else this.data[k] = value;
    this.send({ [k]: value ?? null });
    this.listeners.forEach((fn) => fn(part));
  },
  /** After the profile changes: everything listening redraws from the other profile's parts. */
  switched() { this.listeners.forEach((fn) => fn('*')); document.documentElement.dataset.hqProfile = this.profile() || 'shared'; },
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  // Small helpers for the common shapes: a list of keys (favourites, discovered) and a set of ticks.
  has(part, key) { return this.get(part, []).includes(key); },
  toggle(part, key) {
    const list = this.get(part, []);
    const on = !list.includes(key);
    this.set(part, on ? [...list, key] : list.filter((k) => k !== key));
    return on;
  },
  ticked(part, key) { return this.get(part, {})[key] === 1; },
  tick(part, key, on) {
    const ticks = { ...this.get(part, {}) };
    if (on) ticks[key] = 1; else delete ticks[key];
    this.set(part, ticks);
  },
};
UserStore.gate = new Promise((resolve) => { UserStore.opened = resolve; });
UserStore.send = makeSaver('/api/userdata', 'saved data', UserStore.gate);
window.UserStore = UserStore;

/**
 * Ask before something that cannot be undone, in the app's own dialog (not the browser's).
 * Resolves true when the reader confirms. hqConfirm({ title, text, ok: 'Delete', danger: true }).
 */
function hqConfirm({ title, text, ok = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.innerHTML = `<div class="confirm-body"><h2 id="confirm-title">${esc(title)}</h2><p>${esc(text)}</p></div>
      <div class="confirm-foot"><button type="button" class="btn btn-small btn-outline" data-cancel>${esc(cancel)}</button>
      <button type="button" class="btn btn-small ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`;
    document.body.append(dialog);
    const done = (answer) => { dialog.close(); dialog.remove(); resolve(answer); };
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-ok]')) done(true);
      else if (e.target.closest('[data-cancel]') || e.target === dialog) done(false);
    });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    dialog.showModal();
    dialog.querySelector('[data-cancel]').focus();
  });
}
window.hqConfirm = hqConfirm;

/** Pages added by ui/explore.js (saved places, the collectible tracker, progress, settings). */
const EXTRA_PAGES = {};
/** Called after every page is drawn, with (page, a, b, params): ui/explore.js adds entry actions here. */
const AFTER_RENDER = [];

// ---------- spoilers ----------

// Entries marked `spoiler` stay blurred until the reader presses the eye on them: one at a
// time (for this session) or all at once with the remembered switch in the top bar. On first
// opening, the app says so and asks which the reader wants (askAboutSpoilers).
let showSpoilers = false; // set from the saved choice at boot
const revealed = new Set();
const SPOILER_HINT = 'Spoiler hidden. Open the entry and press the eye to show it.';

const isHidden = (section, entry) => entry.spoiler === true && !showSpoilers && !revealed.has(`${section}/${entry.slug}`);
const hasSpoilers = () => [...state.wiki.categories.map((c) => c.key), ...Object.keys(FIXED_LABELS)]
  .some((key) => (state.wiki[key] || []).some((e) => e.spoiler === true));
const spoilerLabel = '<span class="conf conf-spoiler" title="Contains story or late-game details">Spoiler</span>';
const EYE = '<svg class="eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12S5.8 5.6 12 5.6 21.8 12 21.8 12 18.2 18.4 12 18.4 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3.1"/></svg>';
const EYE_SHUT = EYE.replace('</svg>', '<path d="M4.2 3.8l15.6 16.4"/></svg>');

/** The global switch. Shown only once the wiki actually holds spoiler entries. */
const spoilerToggle = () => (hasSpoilers()
  ? `<button type="button" class="toggle${showSpoilers ? ' is-active' : ''}" data-spoilers="${showSpoilers ? 'off' : 'on'}" aria-pressed="${showSpoilers}">Spoilers: ${showSpoilers ? 'shown' : 'hidden'}</button>`
  : '');

/** The eye in the top bar: open when spoilers are shown, struck through when they are blurred. */
function syncSpoilerSwitch() {
  const button = document.getElementById('spoiler-switch');
  if (!button) return;
  const label = showSpoilers ? 'Spoilers are shown. Press to blur them.' : 'Spoilers are blurred. Press to show them.';
  button.dataset.spoilers = showSpoilers ? 'off' : 'on';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.classList.toggle('is-active', showSpoilers);
  button.innerHTML = showSpoilers ? EYE : EYE_SHUT;
  button.hidden = false;
}

/** Show or blur every spoiler, and remember it. */
function setSpoilers(on, alsoSave = {}) {
  showSpoilers = on;
  if (!on) revealed.clear();
  prefs.save({ 'show-spoilers': on ? '1' : '0', ...alsoSave });
  syncSpoilerSwitch();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-spoilers], [data-reveal]');
  if (!button || !state.wiki) return;
  if (button.dataset.reveal) revealed.add(button.dataset.reveal);
  else setSpoilers(button.dataset.spoilers === 'on');
  const top = window.scrollY;
  route();
  window.scrollTo(0, top);
});

/** A closed spoiler: what would be shown, blurred and out of reach, under an eye that opens it. */
function veil(section, entry, html, kind = '') {
  return `<div class="veil${kind ? ` veil-${kind}` : ''}">
    <div class="veil-content" inert aria-hidden="true">${html}</div>
    <button type="button" class="veil-eye" data-reveal="${esc(`${section}/${entry.slug}`)}" title="Contains story or late-game details">${EYE}<span>Show spoiler</span></button>
  </div>`;
}

/** `html` as it is, or blurred under an eye while the entry is a closed spoiler. */
const closable = (section, entry, html) => (isHidden(section, entry) ? veil(section, entry, html) : html);

/** Asked once, the first time the app is opened. The answer is saved, so an update does not ask again. */
function askAboutSpoilers() {
  const box = document.createElement('dialog');
  box.className = 'spoiler-ask';
  box.setAttribute('aria-labelledby', 'spoiler-ask-title');
  // The Store edition carries none of the game's pictures, so there the box is text only.
  box.innerHTML = `${STORE ? '' : '<img class="spoiler-ask-art" src="/images/vice-city-sunset.jpg" alt="">'}<form method="dialog">
    <h2 id="spoiler-ask-title">This app can contain spoilers</h2>
    <p>It covers the story, people and places of Grand Theft Auto VI. Anything marked as a spoiler is blurred, with an eye on it. Press the eye to show it.</p>
    <label class="spoiler-ask-check"><input type="checkbox"><span>I don't mind spoilers. Show everything.</span></label>
    <p class="muted">You can change this at any time with the eye in the top bar.</p>
    <button class="btn btn-primary">Continue</button>
  </form>`;
  // Closing it any way (the button, Enter, Escape) is an answer: spoilers stay blurred unless the box is ticked.
  box.addEventListener('close', () => {
    setSpoilers(box.querySelector('input').checked, { 'spoiler-notice': '1' });
    box.remove();
    const top = window.scrollY;
    route();
    window.scrollTo(0, top);
  });
  document.body.append(box);
  box.showModal();
}

/** The line above an open spoiler entry, with the way to close it again. */
const spoilerNote = (entry) => (entry.spoiler === true
  ? `<p class="spoiler-note">${spoilerLabel} <button type="button" class="toggle" data-spoilers="off">Hide spoilers</button></p>`
  : '');

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/** Where an entry lives in the app. */
function entryLink(section, slug) {
  if (section === 'characters' || section === 'locations') return `#/${section}/${slug}`;
  if (section in FIXED_LABELS) return '#/intel';
  return `#/wiki/${section}/${slug}`;
}

/** "characters/jason-duval" -> { section, entry } (or null if it does not exist). */
function resolve(ref) {
  const [section, slug] = String(ref).split('/');
  const entry = (state.wiki[section] || []).find((e) => e.slug === slug);
  return entry ? { section, entry } : null;
}

function artKind(section, entry) {
  if (section === 'characters') return 'portrait';
  return entry.art || category(section)?.art || 'city';
}

/** A wallpaper as a tile. With a poster on file the video itself is not fetched until it is played;
    without one, its own frame four seconds in stands as the picture. */
function videoTile(item, extra = '') {
  return item.poster
    ? `<video src="${esc(item.src)}" poster="${esc(item.poster)}" muted ${extra} playsinline preload="none" aria-hidden="true"></video>`
    : `<video src="${esc(item.src)}#t=4" muted ${extra} playsinline preload="metadata" aria-hidden="true"></video>`;
}

/** A photo if the entry has one, otherwise the "no artwork on file" panel. */
function picture(entry, kind) {
  if (entry.image) {
    return `<img src="${esc(entry.image)}" alt="" loading="lazy" data-fallback="${esc(entry.slug || entry.name)}|${esc(kind)}">`;
  }
  return postcard(entry.slug || entry.name, kind);
}

/** The R and star of the top evidence tag, drawn as a single mark. The star's outline is the tag's own colour. */
const R_STAR = '<svg viewBox="0 0 20 16" aria-hidden="true"><text x="0.5" y="13.2" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15.5" fill="currentColor">R</text><polygon points="14,5.6 15.3,9.2 19.1,9.3 16.1,11.7 17.2,15.4 14,13.2 10.8,15.4 11.9,11.7 8.9,9.3 12.7,9.2" fill="currentColor" stroke="#b79df0" stroke-width="1.3" stroke-linejoin="round" paint-order="stroke"/></svg>';

function badge(confidence) {
  const key = confidence in CONFIDENCE ? confidence : 'unknown';
  const [label, meaning] = CONFIDENCE[key];
  // The top label reads "R★ Verified": an R with a star set into its corner, drawn here as one mark.
  const mark = key === 'official' && !STORE ? `<b class="conf-mark">${R_STAR}</b><span class="sr-only">Rockstar </span>` : '';
  return `<span class="conf conf-${key}" title="${esc(meaning)}">${mark}${label}</span>`;
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Entries that lead with a picture: anything with artwork, and all people and places. */
const illustrated = (section, entry) => section !== 'achievements' && Boolean(entry.image);

/** FeatureTile: image-led card, or a text-only note when there is no artwork to lead with. */
function card(section, entry, kicker) {
  const tile = cardTile(section, entry, kicker);
  return isHidden(section, entry) ? veil(section, entry, tile) : tile;
}

/** A trophy: its icon beside its grade, name and requirement. Without the icon (the Store edition
    carries none) a plain disc in the grade's colour stands in. */
function trophyTile(entry) {
  const grade = String(entry.facts?.grade || 'Trophy');
  return `<a class="trophy trophy-${esc(grade.toLowerCase())}" href="${entryLink('achievements', entry.slug)}">
    ${entry.image && !STORE ? `<img src="${esc(entry.image)}" alt="" loading="lazy" width="64" height="64">` : '<span class="trophy-disc" aria-hidden="true"></span>'}
    <div><span class="kicker">${esc(grade)}${entry.facts?.secret === 'Yes' ? ', secret' : ''}${entry.facts?.gamerscore ? `, ${esc(entry.facts.gamerscore)}G` : ''}</span>
      <h3>${esc(entry.name)}</h3><p>${esc(entry.summary)}</p></div>
  </a>`;
}

function cardTile(section, entry, kicker) {
  if (section === 'achievements') return trophyTile(entry);
  if (!illustrated(section, entry)) {
    return `<a class="note" href="${entryLink(section, entry.slug)}">
      <div class="card-meta"><span class="kicker">${esc(kicker || sectionLabel(section))}</span>${badge(entry.confidence)}</div>
      <h3>${esc(entry.name)}</h3>
      <p>${esc(entry.summary)}</p>
    </a>`;
  }
  return `<a class="card" href="${entryLink(section, entry.slug)}">
    <div class="card-media">${picture(entry, artKind(section, entry))}
      <div class="card-over">${kicker ? `<span class="kicker">${esc(kicker)}</span>` : ''}<h3>${esc(entry.name)}</h3></div>
    </div>
    <div class="card-body"><p>${esc(entry.summary)}</p>${badge(entry.confidence)}</div>
  </a>`;
}

/** Image-led entries first in a feature grid, then the rest as text notes. */
function entryGrid(section, entries, kicker, gridClass) {
  const leads = (e) => illustrated(section, e);
  const lead = entries.filter(leads);
  const rest = entries.filter((e) => !leads(e));
  return `${lead.length ? `<div class="grid ${gridClass}">${lead.map((e) => card(section, e, kicker(e))).join('')}</div>` : ''}
    ${rest.length ? `<div class="grid grid-notes"${lead.length ? ' style="margin-top: var(--s7)"' : ''}>${rest.map((e) => card(section, e, kicker(e))).join('')}</div>` : ''}`;
}

/** Pictures for a page header's cards: the section's own entries first, then the rest of the encyclopedia. */
function headPool(section) {
  const wiki = state.wiki;
  if (!wiki?.categories) return [];
  const of = (key) => (wiki[key] || []).filter((e) => e.image && !isHidden(key, e)).map((e) => e.image);
  const own = section ? of(section) : [];
  // Without a section, take the categories in turn so the cards mix people, places and things.
  const lists = wiki.categories.map((c) => of(c.key)).filter((l) => l.length);
  const mixed = [];
  for (let i = 0; lists.some((l) => i < l.length); i += 1) lists.forEach((l) => { if (i < l.length) mixed.push(l[i]); });
  return [...new Set([...own, ...mixed])].slice(0, Math.max(own.length, 12));
}

/** A strip of three picture panels divided by slanted cuts, for the empty side of a page header. Decorative. */
function headCards(section) {
  const pool = headPool(section);
  if (pool.length < 3) return '';
  return `<div class="head-cards" aria-hidden="true" data-pool="${esc(JSON.stringify(pool))}" data-next="3">
    <div class="head-strip">${pool.slice(0, 3).map((src) => `<div class="head-card"><img class="is-on" src="${esc(src)}" alt=""><img alt=""></div>`).join('')}</div>
  </div>`;
}

const pageHead = (title, lede, section) => `<header class="page-head">
  <div class="page-head-text"><h1>${esc(title)}</h1>${lede ? `<p>${esc(lede)}</p>` : ''}</div>
</header>`; // a title and one line: the picture collage is kept for Home

// The header panels are live: every few seconds the next picture slides down into one of them.
setInterval(() => {
  const cards = document.querySelector('.head-cards');
  if (!cards || document.hidden) return;
  let pool;
  try { pool = JSON.parse(cards.dataset.pool); } catch { return; }
  if (pool.length <= 3) return;
  const panels = cards.querySelectorAll('.head-card');
  const turn = Number(cards.dataset.turn || 0);
  const next = Number(cards.dataset.next || 3);
  const card = panels[turn % panels.length];
  const first = card.children[0], second = card.children[1];
  const shown = first.classList.contains('is-on') ? first : second;
  const waiting = shown === first ? second : first;
  waiting.onload = () => {
    // Park the incoming picture above the panel without animating, then let both slide down.
    waiting.classList.remove('is-out');
    waiting.classList.add('is-above');
    void waiting.offsetWidth;
    waiting.classList.remove('is-above');
    waiting.classList.add('is-on');
    shown.classList.remove('is-on');
    shown.classList.add('is-out');
  };
  waiting.src = pool[next % pool.length];
  cards.dataset.turn = String(turn + 1);
  cards.dataset.next = String((next + 1) % pool.length);
}, 3600);

/** The section whose pictures suit the page that is open, from its address. */
function railSection() {
  const [first, second] = location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
  if (first === 'wiki') return second || '';
  return ['characters', 'locations', 'vehicles'].includes(first) ? first : '';
}

/** Fill the two side columns with cut-edge picture cards that slide slowly down the margins. */
function syncRails() {
  const pool = headPool(railSection());
  const key = pool.join('|');
  document.querySelectorAll('.rail').forEach((rail, side) => {
    if (rail.dataset.key === key) return;
    rail.dataset.key = key;
    if (pool.length < 4) { rail.innerHTML = ''; return; }
    // The right column starts half-way through the pool so the two sides never match.
    const order = side ? [...pool.slice(Math.ceil(pool.length / 2)), ...pool.slice(0, Math.ceil(pool.length / 2))] : pool;
    const cards = order.map((src) => `<div class="rail-card"><img src="${esc(src)}" alt="" loading="lazy"></div>`).join('');
    // The list is written twice so the loop has no seam.
    rail.innerHTML = `<div class="rail-track" style="--rail-time: ${order.length * 9}s">${cards}${cards}</div>`;
  });
}
window.addEventListener('hashchange', () => setTimeout(syncRails, 0));

// Home and the location pages open on a full-width picture with their title on it. The side columns
// stay hidden until that picture has scrolled out from under them, so they never cover it.
function markPastHero() {
  const hero = document.querySelector('#view .hero, #view .place-hero');
  const bar = document.querySelector('.topbar');
  document.body.classList.toggle('has-hero', Boolean(hero));
  document.body.classList.toggle('past-hero', !hero || hero.getBoundingClientRect().bottom <= (bar ? bar.getBoundingClientRect().bottom : 0) + 24);
}
// Scrolling fires many events a frame; the check reads layout, so it runs at most once a frame.
let pastHeroQueued = false;
window.addEventListener('scroll', () => {
  if (pastHeroQueued) return;
  pastHeroQueued = true;
  requestAnimationFrame(() => { pastHeroQueued = false; markPastHero(); });
}, { passive: true });
window.addEventListener('resize', markPastHero);


/** Confidence, sources and last-checked date for an entry. */
function provenance(entry) {
  const sources = (entry.sources || []).map((id) => state.wiki.sources?.[id]).filter(Boolean);
  const key = entry.confidence in CONFIDENCE ? entry.confidence : 'unknown';
  return `<section class="provenance">
    <h2>Sources</h2>
    <p>${badge(entry.confidence)} <span class="muted">${esc(CONFIDENCE[key][1])}.${entry.verified ? ` Last checked ${esc(formatDate(entry.verified))}.` : ''}</span></p>
    ${sources.length
      ? `<ul>${sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>
          <span class="muted">${esc(s.publisher)} · ${esc(s.type)}</span></li>`).join('')}</ul>`
      : '<p class="muted">No source has been recorded for this entry yet, so treat it as unverified.</p>'}
  </section>`;
}

function related(entry) {
  // Spoiler entries the reader hasn't opened are left out; with none left there is no section at all.
  const links = (entry.related || []).map(resolve).filter(Boolean).filter(({ section, entry: e }) => !isHidden(section, e));
  if (!links.length) return '';
  return `<section><h2>Related</h2><div class="related">
    ${links.map(({ section, entry: e }) => `<a href="${entryLink(section, e.slug)}"><span class="kicker">${esc(sectionLabel(section))}</span>${esc(e.name)}</a>`).join('')}
  </div></section>`;
}

const tags = (entry) => (entry.tags?.length
  ? `<div class="tags">${entry.tags.map((t) => `<a href="#/search?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>`
  : '');

const paragraphs = (entry) => (entry.body || []).map((p) => `<p>${esc(p)}</p>`).join('');

/** The label above a card or entry title: its class or type, where one is recorded. */
const kickerOf = (entry) => entry.class || entry.facts?.class || entry.facts?.type || '';

function factValue(field, value) {
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'list') return esc(value.join(', '));
  if (field.type === 'entry') {
    const target = resolve(value);
    return target ? `<a href="${entryLink(target.section, target.entry.slug)}">${esc(target.entry.name)}</a>` : esc(value);
  }
  return esc(value);
}

/** The facts table: the fields the entry's category declares, where a value is recorded. */
function facts(section, entry) {
  const known = (value) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);
  const rows = (category(section)?.fields || [])
    .filter((field) => known(entry.facts?.[field.key]) && (field.type === 'list') === Array.isArray(entry.facts[field.key]));
  if (!rows.length) return '';
  return `<section><h2>Facts</h2><dl class="fact-table">
    ${rows.map((field) => `<div><dt>${esc(field.label || field.key)}</dt><dd>${factValue(field, entry.facts[field.key])}</dd></div>`).join('')}
  </dl></section>`;
}

// ---------- long lists: filter, sort, show more ----------

const LIST_PAGE = 60;
/** Lists this short are shown whole, without the filter and sort controls. */
const LIST_TOOLS_FROM = 12;
const CONFIDENCE_ORDER = Object.keys(CONFIDENCE);
const sortName = (entry) => String(entry.name || '').replace(/^[^\p{L}\p{N}]+/u, '');
const byName = (a, b) => sortName(a).localeCompare(sortName(b), 'en', { numeric: true, sensitivity: 'base' });
const confidenceRank = (entry) => {
  const rank = CONFIDENCE_ORDER.indexOf(entry.confidence);
  return rank < 0 ? CONFIDENCE_ORDER.length : rank;
};
const ENTRY_SORTS = [
  { key: 'default', label: 'Featured' },
  { key: 'name', label: 'Name A–Z', compare: byName },
  { key: 'name-desc', label: 'Name Z–A', compare: (a, b) => byName(b, a) },
  { key: 'confidence', label: 'Best sourced', compare: (a, b) => confidenceRank(a) - confidenceRank(b) || byName(a, b) },
  { key: 'verified', label: 'Recently checked', compare: (a, b) => String(b.verified || '').localeCompare(String(a.verified || '')) || byName(a, b) },
];

/** Lower-case text an entry can be filtered by. A closed spoiler is findable by its title and tags only. */
function filterText(section, entry) {
  const open = !isHidden(section, entry);
  return [
    entry.name, ...(entry.aliases || []), ...(entry.tags || []), sectionLabel(section),
    ...(open ? [entry.summary, entry.class, entry.role, entry.region,
      ...Object.values(entry.facts || {}).flat().filter((v) => typeof v === 'string')] : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

const listShell = (label) => `<div class="list" data-list>
  <div class="list-tools" hidden>
    <div class="field-search list-search">${icon('search')}<input type="search" class="list-filter" placeholder="Filter ${esc(label.toLowerCase())}" aria-label="Filter ${esc(label.toLowerCase())}" autocomplete="off"></div>
    <label class="list-sort"><span>Sort</span> <select aria-label="Sort ${esc(label)}"></select></label>
    ${spoilerToggle()}
    <span class="list-count muted" role="status"></span>
  </div>
  <div class="list-body"></div>
  <button type="button" class="btn list-more" hidden></button>
</div>`;

/**
 * Drive one list: filter as you type, sort, and render a page at a time so a
 * category with thousands of entries stays quick.
 *   items   everything in the list
 *   text    (item) => lower-case text the filter box searches
 *   sorts   [{ key, label, compare? }]; the first is the starting order
 *   render  (visibleItems, sortKey) => HTML
 * Returns { show(predicate) } to bring a particular item onto the page.
 */
/** "Official only": kept while the app is open, so it carries from list to list. */
let officialOnly = false;
function mountList(root, { items, text, sorts, render, page = LIST_PAGE, official = null }) {
  const tools = root.querySelector('.list-tools');
  const input = root.querySelector('.list-filter');
  const select = root.querySelector('.list-sort select');
  const count = root.querySelector('.list-count');
  const body = root.querySelector('.list-body');
  const more = root.querySelector('.list-more');
  const haystack = new Map(items.map((item) => [item, text(item)]));
  let shown = page;
  let current = items;

  // A short list needs no filter or sort, but keeps the spoiler switch if there is one.
  const short = items.length <= LIST_TOOLS_FROM;
  tools.hidden = short && !tools.querySelector('.toggle');
  input.hidden = short;
  count.hidden = short;
  select.innerHTML = sorts.map((s) => `<option value="${esc(s.key)}">${esc(s.label)}</option>`).join('');
  root.querySelector('.list-sort').hidden = short || sorts.length < 2;
  // "Official only": just what Rockstar itself has published. Offered where a list has any.
  const officialCount = official ? items.filter(official).length : 0;
  let officialBtn = null;
  if (officialCount) {
    officialBtn = document.createElement('button');
    officialBtn.type = 'button';
    officialBtn.className = 'toggle official-toggle';
    officialBtn.title = 'Show only what Rockstar Games itself has published';
    const sync = () => { officialBtn.setAttribute('aria-pressed', String(officialOnly)); officialBtn.classList.toggle('is-on', officialOnly); officialBtn.textContent = `Official only (${officialCount})`; };
    officialBtn.addEventListener('click', () => { officialOnly = !officialOnly; sync(); shown = page; draw(); });
    sync();
    count.before(officialBtn);
    tools.hidden = false;
  }

  const draw = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const pool = officialBtn && officialOnly ? items.filter(official) : items;
    current = words.length ? pool.filter((item) => words.every((w) => haystack.get(item).includes(w))) : pool.slice();
    const sort = sorts.find((s) => s.key === select.value) || sorts[0];
    if (sort.compare) current.sort(sort.compare);
    const visible = current.slice(0, shown);
    body.innerHTML = current.length
      ? render(visible, sort.key)
      : `<p class="muted">${input.value.trim() ? `Nothing here matches “${esc(input.value.trim())}”.` : 'Nothing here.'}</p>`;
    count.textContent = current.length === items.length && visible.length === items.length
      ? `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`
      : `Showing ${visible.length} of ${current.length}${current.length === items.length ? '' : ` (${items.length} in all)`}`;
    const left = current.length - visible.length;
    more.hidden = left <= 0;
    more.textContent = `Show ${Math.min(page, left)} more (${left} left)`;
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { shown = page; draw(); }, 120);
  });
  select.addEventListener('change', () => { shown = page; draw(); });
  more.addEventListener('click', () => { shown += page; draw(); });
  draw();

  return {
    show(predicate) {
      const index = current.findIndex(predicate);
      if (index >= shown) {
        shown = (Math.floor(index / page) + 1) * page;
        draw();
      }
      return index >= 0;
    },
  };
}

/** A grid of entry cards with the list controls. */
function mountEntryList(root, section, entries, kicker, gridClass) {
  // Missions open in story order, chapter by chapter, shown whole.
  const story = section === 'missions';
  return mountList(root, {
    items: entries,
    text: (entry) => filterText(section, entry),
    sorts: story ? [{ key: 'story', label: 'Story order', compare: storyCompare }, ...ENTRY_SORTS.filter((s) => s.key !== 'default')] : ENTRY_SORTS,
    page: story ? 1000 : LIST_PAGE,
    official: (entry) => entry.confidence === 'official',
    // The large "feature" tiles only make sense in the curated order.
    render: (visible, sort) => (sort === 'story' ? missionStory(visible) : entryGrid(section, visible, kicker, sort === 'default' ? gridClass : '')),
  });
}

// A picture that fails to load is swapped for generated art instead of a broken icon.
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallback) {
    const [seed, kind, label] = img.dataset.fallback.split('|');
    img.outerHTML = postcard(seed, kind, label);
  } else if (img.closest('.tile, .lightbox-stage, .media-teaser, .map-card')) {
    img.replaceWith(Object.assign(document.createElement('span'), { className: 'broken', textContent: 'Image unavailable' }));
  }
}, true);

// Nothing should keep decoding video while the window is hidden or minimised.
document.addEventListener('visibilitychange', () => {
  document.querySelectorAll('video').forEach((video) => {
    if (document.hidden) {
      video.dataset.resume = video.paused ? '' : '1';
      video.pause();
    } else if (video.dataset.resume) {
      video.play().catch(() => {});
    }
  });
});

// Pictures on cards drift slowly (the owner's choice). One that is off screen has nothing to show,
// so its drift rests until it scrolls back; a long page was animating every picture on it all the time.
const driftWatch = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.target.classList.toggle('is-resting', !entry.isIntersecting));
}, { rootMargin: '200px' });
let driftQueued = false;
function watchDrift() {
  driftWatch.disconnect();
  document.querySelectorAll('.card-media img, .topic-media img, .tile img, .place-hero > img, .profile-portrait img').forEach((img) => driftWatch.observe(img));
}
new MutationObserver(() => {
  if (driftQueued) return;
  driftQueued = true;
  setTimeout(() => { driftQueued = false; watchDrift(); }, 250);
}).observe(document.getElementById('view'), { childList: true, subtree: true });

// ---------- splash ----------

// How long the intro runs before the app opens: the montage, the clips inside the logo, nine panels,
// then a short hold on the finished picture. Keep in step with the delays in styles.css.
// The Store edition's own intro is short; built with the GitHub edition's intro it runs the full length.
const SPLASH_MS = STORE && document.documentElement.dataset.intro !== 'game' ? 4200 : 10600;

function runSplash(ready) {
  const splash = document.getElementById('splash');
  const percent = document.getElementById('splash-percent');
  const ring = document.getElementById('splash-ring');
  const RING = 2 * Math.PI * 46; // the ring's circumference, in its own units
  const fill = (done) => { percent.textContent = `${Math.round(done * 100)}%`; ring.style.strokeDashoffset = String(RING * (1 - done)); };
  const tip = document.getElementById('splash-tip');
  const tips = ['Loading Leonida…', 'Warming up the engines…', 'Checking the Coast Guard radio…', 'Welcome to Vice City'];
  let finished = false;
  /** How long the splash takes to dissolve into the app. The stylesheet uses the same time. */
  const SPLASH_FADE_MS = 1200;

  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') finish(true); };
  const finish = async (skipped) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey);
    // Skipping shows the whole picture at once instead of leaving it half built while it fades.
    if (skipped === true) splash.classList.add('is-skipped');
    await ready;
    fill(1);
    // The splash dissolves while the app behind it eases in, instead of cutting from one to the other.
    splash.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-arriving');
    document.dispatchEvent(new Event('app-arrived'));
    setTimeout(() => { montages.forEach((video) => video.pause()); splash.remove(); document.body.classList.remove('is-arriving'); }, SPLASH_FADE_MS + 150);
  };

  // The montage plays in two layers at once (see styles.css). Without it the logo still fades in on
  // time: the clips are an extra, not a requirement.
  const montages = [...splash.querySelectorAll('.splash-montage')];
  montages.forEach((video) => {
    video.addEventListener('error', () => video.parentElement.remove());
    video.play().catch(() => {});
  });

  // The percentage follows the intro's own clock, counted every frame so it climbs smoothly.
  const started = performance.now();
  const everyFrame = (now) => {
    if (finished) return;
    const done = Math.min(1, (now - started) / SPLASH_MS);
    fill(done);
    tip.textContent = tips[Math.min(tips.length - 1, Math.floor(done * tips.length))];
    if (done >= 1) finish(); else requestAnimationFrame(everyFrame);
  };
  requestAnimationFrame(everyFrame);
  // A window that is not being drawn gets no frames; the timer still ends the intro.
  setTimeout(finish, SPLASH_MS + 500);
  document.getElementById('splash-skip').addEventListener('click', () => finish(true));
  // Stays attached until the splash ends, so pressing some other key first
  // does not disable Enter and Esc.
  window.addEventListener('keydown', onKey);
}

// ---------- home ----------

function renderHome() {
  const { game, characters, locations, vehicles, news } = state.wiki;
  const leads = characters.filter((c) => c.group === 'main');
  const supporting = characters.filter((c) => c.group !== 'main');
  const lead = locations.find((l) => l.image && !isHidden('locations', l)) || locations.find((l) => !isHidden('locations', l)) || locations[0];
  const rides = vehicles.filter((v) => v.image).slice(0, 3);

  view.innerHTML = `
    <section class="hero" aria-label="${esc(game.title)}">
      ${STORE ? heroScene() : `<video class="hero-video is-on" src="${HERO_WALLPAPERS[0]}"
        poster="/images/muscle-car-pastel-palms.jpg" muted playsinline preload="metadata" aria-hidden="true"></video>
      <video class="hero-video" muted playsinline preload="none" aria-hidden="true"></video>`}
      <div class="hero-shade"></div>
      <div class="hero-content">
        <span class="kicker">Unofficial fan encyclopedia</span>
        <h1 class="hero-title">${esc(game.title)}</h1>
        <p class="hero-tagline">${esc(game.tagline)}</p>
        <div id="countdown" class="countdown" role="timer" aria-live="off"></div>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/map">Explore the map</a>
          <a class="btn" href="#/wiki">Open the encyclopedia</a>
          <a class="btn" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">Join the Discord</a>
        </div>
      </div>
      <button class="hero-pause" type="button" aria-pressed="false" aria-label="${STORE ? 'Pause the moving picture' : 'Pause background video'}">${icon('pause')}</button>
      <a class="scroll-cue" href="#/">Scroll</a>
    </section>

    <dl class="facts" id="facts">
      ${game.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
    </dl>

    <aside class="promo" aria-label="Community">
      <div class="promo-walls" aria-hidden="true">
        ${STORE ? '' : `<img class="is-on" src="${PROMO_WALLS[0]}" alt=""><img src="${PROMO_WALLS[1]}" alt="">`}
      </div>
      <img class="promo-server" src="${STORE ? '/brand.png' : '/images/community/server-icon.png'}" alt="">
      <div class="promo-copy">
        <span class="kicker">${DISCORD_MARK} Discord community</span>
        <h2>Grand Theft Auto VI HQ</h2>
        <p>News and trailers as they land, new versions of this app announced the moment they are out, and other players to talk Leonida with.</p>
      </div>
      <a class="btn btn-discord" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">${DISCORD_MARK} Join the server</a>
    </aside>

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">People</span>
        <h2>The Cast</h2>
        <p>The two leads and the supporting characters Rockstar introduced before launch. The full cast is in the encyclopedia.</p>
        <a class="more" href="#/characters">All characters${icon('next')}</a>
      </header>
      <div class="cast">
        ${leads.map((c) => card('characters', c, c.role)).join('')}
        <div class="roster">
          ${supporting.filter((c) => c.image && !isHidden('characters', c)).slice(0, 9).map((c) => `<a href="#/characters/${c.slug}"><b>${esc(c.name)}</b><span>${esc(c.role)}</span><i aria-hidden="true">${icon('next')}</i></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Places</span>
        <h2>Vice City and Beyond</h2>
        <p>The regions of the State of Leonida. Open any of them, or find them on the map.</p>
        <a class="more" href="#/map">Open the map${icon('next')}</a>
      </header>
      <div class="feature">
        <a class="feature-media" href="#/locations/${lead.slug}">
          ${picture(lead, artKind('locations', lead))}
          <span><span class="kicker">${esc(lead.region)}</span><h3>${esc(lead.name)}</h3></span>
        </a>
        <div class="roster">
          ${locations.filter((l) => l.image && !isHidden('locations', l)).slice(0, 9).map((l) => `<a href="#/locations/${l.slug}"><b>${esc(l.name)}</b><span>${esc(l.region)}</span><i aria-hidden="true">${icon('next')}</i></a>`).join('')}
        </div>
      </div>
    </section>

    ${rides.length ? `<section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Garage</span>
        <h2>Vehicles</h2>
        <p>Vehicle types seen in official material. Model names are listed only where Rockstar has published them.</p>
        <a class="more" href="#/vehicles">All vehicles${icon('next')}</a>
      </header>
      <div class="trio">${rides.map((v) => card('vehicles', v, kickerOf(v))).join('')}</div>
    </section>` : ''}

    ${STORE ? '' : `<section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Gallery</span>
        <h2>Media</h2>
        <p>Artwork and live wallpapers, each with its origin and rights status.</p>
        <a class="more" href="#/media">Open the gallery${icon('next')}</a>
      </header>
      <div class="trio" id="home-media"></div>
    </section>`}

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Intel</span>
        <h2>Latest</h2>
        <p>Dated announcements, each labelled with how well it is sourced.</p>
        <a class="more" href="#/intel">Full timeline${icon('next')}</a>
      </header>
      <ol class="timeline">${news.slice(0, 4).map(timelineItem).join('')}</ol>
    </section>`;

  startCountdown(game.launchedAt || game.releaseDate);

  // Hero: every live wallpaper in turn, for as long as the page is open. Two video layers sit on
  // top of each other; shortly before one clip ends the next starts underneath and they cross-fade,
  // so there is never a cut or a black frame.
  const pause = view.querySelector('.hero-pause');
  if (STORE) {
    // The drawn scene has no clips to load: the button just holds it still.
    const scene = view.querySelector('.hero-scene');
    pause.addEventListener('click', () => {
      const paused = scene.classList.toggle('is-paused');
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? 'Play the moving picture' : 'Pause the moving picture');
      pause.innerHTML = icon(paused ? 'play' : 'pause');
    });
  }
  const layers = STORE ? [] : [...view.querySelectorAll('.hero-video')];
  if (!STORE) {
  let front = 0;     // which layer is showing
  let playing = 0;   // which wallpaper it is playing
  let switching = false;
  const upNext = () => {
    if (!layers[0].isConnected) return; // the page has been left; load nothing more
    const next = layers[1 - front];
    // Loaded and ready, but not playing until its turn.
    next.autoplay = false;
    next.src = HERO_WALLPAPERS[(playing + 1) % HERO_WALLPAPERS.length];
    next.load();
  };
  const crossFade = () => {
    if (switching || !layers[0].isConnected) return;
    switching = true;
    const from = layers[front], to = layers[1 - front];
    to.currentTime = 0;
    to.play().catch(() => {});
    to.classList.add('is-on');
    from.classList.remove('is-on');
    front = 1 - front;
    playing = (playing + 1) % HERO_WALLPAPERS.length;
    setTimeout(() => { from.pause(); switching = false; upNext(); }, HERO_FADE_MS + 100);
  };
  layers.forEach((layer) => {
    layer.addEventListener('timeupdate', () => {
      if (layer === layers[front] && layer.duration && layer.duration - layer.currentTime <= HERO_FADE_MS / 1000 + 0.3) crossFade();
    });
    layer.addEventListener('ended', () => { if (layer === layers[front]) crossFade(); });
    // A wallpaper that will not play is skipped, never left as a black screen.
    layer.addEventListener('error', () => { if (layer === layers[front]) crossFade(); });
  });
  // The wallpaper starts once the intro is over, not underneath it, where it would decode unseen
  // beside the intro's own clips.
  const begin = () => { if (!layers[0].isConnected) return; layers[front].play().catch(() => {}); upNext(); };
  if (document.body.classList.contains('is-loading')) document.addEventListener('app-arrived', begin, { once: true });
  else begin();
  // Scrolled out of sight, the wallpaper stops decoding; it picks up again when it comes back,
  // unless the reader paused it themselves.
  const heroEl = view.querySelector('.hero');
  let away = false;
  new IntersectionObserver(([entry]) => {
    if (!layers[0].isConnected) return;
    const video = layers[front];
    if (!entry.isIntersecting) { away = !video.paused; if (away) video.pause(); }
    else if (away && !document.hidden) { away = false; video.play().catch(() => {}); }
  }, { threshold: 0.02 }).observe(heroEl);
  const setPaused = (paused) => {
    const video = layers[front];
    if (paused) video.pause(); else video.play().catch(() => {});
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    pause.innerHTML = icon(paused ? 'play' : 'pause');
  };
  // The live wallpapers always play on arrival (the owner's choice); the
  // button is how anyone who prefers a still picture stops them.
  pause.addEventListener('click', () => setPaused(!layers[front].paused));
  }
  startPromoWalls(view.querySelector('.promo'));
  mountUpdateStage(view);
  view.querySelector('.scroll-cue').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('facts').scrollIntoView({ behavior: 'smooth' });
  });

  getJson('/api/media').then((media) => {
    const strip = document.getElementById('home-media');
    if (!strip) return;
    strip.innerHTML = media.videos.slice(0, 3).map((v) => `
      <a class="tile tile-video" href="#/media" aria-label="${esc(v.title)}, in the gallery">
        ${videoTile(v)}
        <span class="play" aria-hidden="true"></span><span class="tile-title">${esc(v.title)}</span>
      </a>`).join('');
  }).catch(() => {});
}

function timelineItem(item, full = false) {
  // The Intel page passes full = true to show the further detail under each item.
  const more = full === true ? (item.body || []).map((line) => `<p>${esc(line)}</p>`).join('') : '';
  return `<li>${closable('news', item, `<time datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time> ${badge(item.confidence)}
    <h3>${esc(item.name)}</h3><p>${esc(item.summary)}</p>${full === true && item.image && !STORE ? `<img class="timeline-pic" src="${esc(item.image)}" alt="" loading="lazy">` : ''}${more}`)}</li>`;
}

let countdownTimer;
function startCountdown(releaseDate) {
  clearInterval(countdownTimer);
  // Midnight at the start of release day, in this computer's time zone.
  const target = new Date(String(releaseDate).includes('T') ? releaseDate : `${releaseDate}T00:00:00`).getTime();
  const tick = () => {
    const el = document.getElementById('countdown');
    if (!el) return clearInterval(countdownTimer);
    if (Number.isNaN(target)) { // no usable release date configured: show nothing rather than nonsense
      el.hidden = true;
      return clearInterval(countdownTimer);
    }
    const left = target - Date.now();
    if (left <= 0) {
      el.innerHTML = '<strong class="out-now">Out now</strong>';
      return clearInterval(countdownTimer);
    }
    const parts = [
      [Math.floor(left / 86400000), 'days'],
      [Math.floor(left / 3600000) % 24, 'hours'],
      [Math.floor(left / 60000) % 60, 'min'],
      [Math.floor(left / 1000) % 60, 'sec'],
    ];
    el.innerHTML = parts.map(([n, label]) => `<div><b>${String(n).padStart(2, '0')}</b><span>${label}</span></div>`).join('');
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

// ---------- encyclopedia ----------

const AZ_PAGE = 200;
/** The heading an entry is filed under in the A–Z list: its first letter, or # for digits and symbols. */
const letterOf = (entry) => {
  const first = sortName(entry).charAt(0).toUpperCase();
  return /\p{L}/u.test(first) ? first : '#';
};

function renderEncyclopedia() {
  const { categories } = state.wiki;
  const all = categories.flatMap((c) => (state.wiki[c.key] || []).map((entry) => ({ section: c.key, entry })));
  const order = new Map(categories.map((c, i) => [c.key, i]));
  const nameOrder = (a, b) => byName(a.entry, b.entry);
  const sorts = [
    { key: 'name', label: 'Name A–Z', compare: nameOrder, group: ({ entry }) => letterOf(entry) },
    { key: 'category', label: 'Category', compare: (a, b) => order.get(a.section) - order.get(b.section) || nameOrder(a, b), group: ({ section }) => sectionLabel(section) },
    { key: 'verified', label: 'Recently checked', compare: (a, b) => String(b.entry.verified || '').localeCompare(String(a.entry.verified || '')) || nameOrder(a, b), group: ({ entry }) => (entry.verified ? formatDate(entry.verified) : 'Not checked') },
  ];
  const letters = [...new Set(all.slice().sort(nameOrder).map(({ entry }) => letterOf(entry)))];

  view.innerHTML = `
    ${pageHead('Encyclopedia', `${all.length} entries in ${categories.length} categories. Every entry carries a confidence label and its sources.`)}
    <section class="block">
      <div class="index">
        ${categories.map((c) => {
          const count = (state.wiki[c.key] || []).length;
          const href = ['characters', 'locations', 'vehicles'].includes(c.key) ? `#/${c.key}` : `#/wiki/${c.key}`;
          // The cover is the first entry in the category that has a picture and is not hidden.
          // The cover is the category's own picture if it names one, else its first entry with a picture.
          const cover = c.key === 'characters' && !STORE ? { image: '/images/manual/jason-and-lucia-waterfront.jpg' }
            : c.image && !STORE ? { image: c.image }
            : (state.wiki[c.key] || []).find((e) => e.image && !isHidden(c.key, e));
          return `<a class="topic${count ? '' : ' is-bare'}" href="${href}">
            <div class="topic-media">${cover ? `<img src="${esc(cover.image)}" alt="" loading="lazy">` : postcard(c.key, c.art || 'city')}</div>
            <h3>${esc(c.label)}</h3><p>${esc(c.blurb)}</p>
            <span class="kicker${count ? '' : ' is-empty'}">${count ? `${count} ${count === 1 ? 'entry' : 'entries'}` : 'Not yet documented'}</span></a>`;
        }).join('')}
      </div>
    </section>
    <section class="block" id="az">
      <div class="block-head"><h2>A–Z</h2></div>
      <nav class="letters" aria-label="Jump to letter">${letters.map((l) => `<a href="#/wiki" data-letter="${esc(l)}">${esc(l)}</a>`).join('')}</nav>
      ${listShell('all entries')}
    </section>
    <section class="block"><div class="block-head"><h2>Data health</h2></div><div id="health" class="panel muted">Checking the data…</div></section>`;

  const lettersNav = view.querySelector('.letters');
  const list = mountList(view.querySelector('#az [data-list]'), {
    items: all,
    text: ({ section, entry }) => filterText(section, entry),
    sorts,
    page: AZ_PAGE,
    render: (visible, sortKey) => {
      const { group } = sorts.find((s) => s.key === sortKey);
      // The letter links only make sense while the list is in name order.
      lettersNav.hidden = sortKey !== 'name';
      const groups = [];
      for (const item of visible) {
        const title = group(item);
        if (groups.at(-1)?.title !== title) groups.push({ title, items: [] });
        groups.at(-1).items.push(item);
      }
      return `<div class="az">${groups.map(({ title, items }) => `<section data-group="${esc(title)}"><h3>${esc(title)}</h3><ul>
        ${items.map(({ section, entry }) => `
          <li>${entry.image && !isHidden(section, entry) ? `<img class="az-thumb" src="${esc(entry.image)}" alt="" loading="lazy">` : '<span class="az-thumb" aria-hidden="true"></span>'}<a href="${entryLink(section, entry.slug)}">${esc(entry.name)}</a>
            <span class="muted">${esc(sectionLabel(section))}</span> ${isHidden(section, entry) ? spoilerLabel : badge(entry.confidence)}</li>`).join('')}
      </ul></section>`).join('')}</div>`;
    },
  });

  lettersNav.addEventListener('click', (e) => {
    const letter = e.target.dataset.letter;
    if (!letter) return;
    e.preventDefault();
    // The letter may be further down than what is rendered so far (or filtered out).
    list.show(({ entry }) => letterOf(entry) === letter);
    [...view.querySelectorAll('.az section')].find((el) => el.dataset.group === letter)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  getJson('/api/health').then((report) => {
    const el = document.getElementById('health');
    if (!el) return;
    const shown = report.issues.filter((i) => i.severity !== 'info');
    const drafts = report.issues.filter((i) => i.code === 'draft').length;
    el.classList.remove('muted');
    el.innerHTML = `<p><strong>${report.errors} errors, ${report.warnings} warnings</strong>
        across ${report.entries} entries and ${report.media_files} media files.${drafts
          ? ` ${drafts} ${drafts === 1 ? 'entry is a draft' : 'entries are drafts'} and not shown.` : ''}</p>
      ${shown.length ? `<details><summary>Show details</summary><ul class="issues">
        ${shown.map((i) => `<li class="issue-${i.severity}"><code>${esc(i.code)}</code> <b>${esc(i.subject)}</b> ${esc(i.message)}</li>`).join('')}
      </ul></details>` : ''}`;
  }).catch(() => {
    const el = document.getElementById('health');
    if (el) el.textContent = 'The data check could not be run.';
  });
}

// ---------- missions in story order ----------
// Chapter by chapter, each mission numbered in the order PowerPyx's walkthrough plays them (the
// "order" fact), optional missions in their place, and each chapter's Strangers and Freaks jobs
// after the story, strand by strand.

const chapterRank = (chapter) => {
  if (chapter === 'Prologue') return 0;
  const m = /^Chapter (\d+)/.exec(chapter || '');
  return m ? Number(m[1]) : 99;
};
/** 0: the chapter's own list or overview, 1: the story (with optional missions), 2: strangers and side jobs. */
const missionPart = (entry) => {
  const type = entry.facts?.type || '';
  if (/list|overview/i.test(type)) return 0;
  if (/stranger|side mission/i.test(type)) return 2;
  return 1;
};
const orderOf = (entry) => (Number.isFinite(Number(entry.facts?.order)) && entry.facts?.order !== undefined ? Number(entry.facts.order) : Infinity);
function storyCompare(a, b) {
  return chapterRank(a.facts?.chapter) - chapterRank(b.facts?.chapter)
    || missionPart(a) - missionPart(b)
    || (missionPart(a) === 2 ? String(a.facts?.giver || '').localeCompare(String(b.facts?.giver || '')) : 0)
    || orderOf(a) - orderOf(b)
    || byName(a, b);
}

/** The main story from the Prologue to the last mission, optional missions left out: for Previous and Next. */
function storyLine() {
  return (state.wiki.missions || []).filter((e) => missionPart(e) === 1 && chapterRank(e.facts?.chapter) < 99
    && /main/i.test(e.facts?.type || '') && orderOf(e) !== Infinity).sort(storyCompare);
}

const PART_TITLES = ['About this chapter', 'The story, in order', 'Strangers and Freaks, side jobs'];
function missionStory(entries) {
  const chapters = [];
  for (const entry of entries.slice().sort(storyCompare)) {
    const title = chapterRank(entry.facts?.chapter) < 99 ? entry.facts.chapter : 'Across the game';
    let ch = chapters[chapters.length - 1];
    if (!ch || ch.title !== title) chapters.push(ch = { title, parts: [[], [], []] });
    ch.parts[missionPart(entry)].push(entry);
  }
  const row = (entry, n, kicker) => `<li class="story-row">
      <span class="story-n" aria-hidden="true">${n}</span>
      ${closable('missions', entry, `<a class="story-link${entry.image && !STORE ? ' has-thumb' : ''}" href="${entryLink('missions', entry.slug)}">
        ${entry.image && !STORE ? `<img class="story-thumb" src="${esc(entry.image)}" alt="" loading="lazy">` : ''}
        <span class="story-text"><span class="kicker">${esc(kicker)}</span><b>${esc(entry.name)}</b><span class="story-sum">${esc(entry.summary)}</span></span></a>`)}
    </li>`;
  return chapters.map((ch) => `<section class="story-chapter">
    <h2>${esc(ch.title)}</h2>
    ${ch.parts.map((items, part) => {
      if (!items.length) return '';
      let n = 0;
      return `<h3 class="story-part">${PART_TITLES[part]}</h3><ol class="story-list">${items.map((e) => {
        const type = e.facts?.type || 'Mission';
        if (part === 1) { n += 1; return row(e, orderOf(e) === Infinity ? '·' : n, type); }
        if (part === 2) return row(e, orderOf(e) === Infinity ? '·' : orderOf(e), [e.facts?.giver, type].filter(Boolean).join(', '));
        return row(e, '·', type);
      }).join('')}</ol>`;
    }).join('')}
  </section>`).join('');
}

/** Previous and next story missions, for a mission's own page. */
function storyNav(entry) {
  const line = storyLine();
  const i = line.findIndex((e) => e.slug === entry.slug);
  if (i < 0) return '';
  const link = (e, label) => (e ? `<a class="story-step" href="${entryLink('missions', e.slug)}"><span class="kicker">${label}${e.facts?.chapter !== entry.facts?.chapter ? `, ${esc(e.facts.chapter)}` : ''}</span><b>${esc(isHidden('missions', e) ? 'Spoiler' : e.name)}</b></a>` : '<span></span>');
  return `<nav class="story-nav" aria-label="Story order">${link(line[i - 1], 'Previous mission')}
    <span class="story-at muted">Story mission ${i + 1} of ${line.length}</span>${link(line[i + 1], 'Next mission')}</nav>`;
}

function renderCategory(key) {
  const cat = category(key);
  if (!cat) return renderNotFound();
  const entries = state.wiki[key] || [];
  view.innerHTML = `
    ${pageHead(cat.label, cat.blurb, key)}
    <section class="block">
      <a class="back" href="#/wiki">${icon('back')}Encyclopedia</a>
      ${entries.length
        ? listShell(cat.label)
        : `<div class="panel empty"><h3>Not yet documented</h3>
            <p class="muted">Nothing in this category has been checked against a source yet, so nothing is listed.
            Entries are added to the data files once there is evidence for them.</p></div>`}
    </section>`;
  if (entries.length) mountEntryList(view.querySelector('[data-list]'), key, entries, kickerOf, '');
}

/** "View on the map" for an entry that has a pin, either its own position or a marker pointing at it. */
function mapLink(section, entry) {
  const ref = `${section}/${entry.slug}`;
  const pinned = mapPins().some((pin) => pin.ref === ref);
  return pinned ? `<p><a class="btn" href="#/map?focus=${encodeURIComponent(ref)}">View on the map</a></p>` : '';
}

function renderEntry(key, slug) {
  const cat = category(key);
  const entry = (state.wiki[key] || []).find((e) => e.slug === slug);
  if (!cat || !entry) return renderNotFound();
  const lead = illustrated(key, entry);
  const page = `
    <article class="profile ${lead ? 'profile-wide' : 'profile-text'}">
      ${lead ? `<a class="back back-top" href="${key === 'vehicles' ? '#/vehicles' : `#/wiki/${key}`}">${icon('back')}${esc(cat.label)}</a><div class="profile-portrait">${picture(entry, artKind(key, entry))}</div>` : ''}
      <div class="profile-body">
        <a class="back${lead ? ' back-side' : ''}" href="${key === 'vehicles' ? '#/vehicles' : `#/wiki/${key}`}">${icon('back')}${esc(cat.label)}</a>
        ${key === 'achievements' && entry.image && !STORE ? `<img class="trophy-icon" src="${esc(entry.image)}" alt="" width="96" height="96">` : ''}
        <span class="kicker">${esc(kickerOf(entry) || cat.label)}</span>
        <h1>${esc(entry.name)}</h1>
        ${spoilerNote(entry)}
        <p class="lede">${esc(entry.summary)}</p>
        ${paragraphs(entry)}
        ${facts(key, entry)}
        ${key === 'missions' ? storyNav(entry) : ''}
        ${mapLink(key, entry)}
        ${guideSlot(`#/wiki/${key}/${slug}`)}
        ${related(entry)}
        ${provenance(entry)}
        ${tags(entry)}
      </div>
    </article>`;
  view.innerHTML = isHidden(key, entry) ? veil(key, entry, page, 'page') : page;
  fillGuideLinks();
}

// "In the 100% Guide": the Field Manual pages that walk through this entry, filled in once the
// manual has been read (it loads on first use and is kept).
const guideSlot = (href) => `<div class="guide-links" data-guide="${esc(href)}" hidden></div>`;
function fillGuideLinks() {
  if (typeof Manual === 'undefined' || !Manual.guideLinks) return;
  for (const slot of view.querySelectorAll('[data-guide]')) {
    Manual.guideLinks(slot.dataset.guide, state.wiki).then((found) => {
      if (!found.length || !slot.isConnected) return;
      slot.innerHTML = `<h2>In the 100% Guide</h2><ul class="guide-list">${found.slice(0, 6).map((f) => `<li><a href="${esc(f.href)}"><span>${esc(f.title)}</span><em>${esc(f.chapter)} · p. ${esc(f.number)}</em></a></li>`).join('')}</ul>`;
      slot.hidden = false;
    });
  }
}

// ---------- characters, locations, vehicles ----------

function renderCharacters() {
  const { characters } = state.wiki;
  const leads = characters.filter((c) => c.group === 'main');
  const others = characters.filter((c) => c.group !== 'main');
  view.innerHTML = `
    ${pageHead('Characters', 'The confirmed cast of Grand Theft Auto VI, from both leads to the supporting players.', 'characters')}
    <section class="block"><div class="block-head"><h2>Protagonists</h2></div>
      <div class="grid grid-portrait grid-lead">${leads.map((c) => card('characters', c, c.role)).join('')}</div>
    </section>
    <section class="block"><div class="block-head"><h2>Supporting cast</h2></div>
      ${listShell('characters')}
    </section>`;
  mountList(view.querySelector('[data-list]'), {
    items: others,
    text: (c) => filterText('characters', c),
    sorts: ENTRY_SORTS,
    render: (visible) => entryGrid('characters', visible, (c) => c.role, 'grid-portrait'),
  });
}

function renderCharacter(slug) {
  const { characters } = state.wiki;
  const c = characters.find((x) => x.slug === slug);
  if (!c) return renderNotFound();
  const others = characters.filter((x) => x.slug !== slug).slice(0, 4);
  const page = `
    <article class="profile${c.image ? '' : ' profile-text'}">
      ${c.image ? `<a class="back back-top" href="#/characters">${icon('back')}Characters</a><div class="profile-portrait">${picture(c, 'portrait')}</div>` : ''}
      <div class="profile-body">
        <a class="back${c.image ? ' back-side' : ''}" href="#/characters">${icon('back')}Characters</a>
        <span class="kicker">${esc(c.role)}</span>
        <h1>${esc(c.name)}</h1>
        ${spoilerNote(c)}
        <p class="lede">${esc(c.summary)}</p>
        ${paragraphs(c)}
        ${c.ties?.length ? `<h2>Known ties</h2>
        <ul class="ties">${c.ties.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${facts('characters', c)}
        ${guideSlot(`#/characters/${slug}`)}
        ${related(c)}
        ${provenance(c)}
        ${tags(c)}
      </div>
    </article>`;
  view.innerHTML = `
    ${isHidden('characters', c) ? veil('characters', c, page, 'page') : page}
    <section class="block"><div class="block-head"><h2>More characters</h2></div>
      ${entryGrid('characters', others, (o) => o.role, 'grid-portrait')}
    </section>`;
  fillGuideLinks();
}

function renderLocations() {
  view.innerHTML = `
    ${pageHead('Locations', 'Vice City and the wider State of Leonida, region by region.', 'locations')}
    <section class="block">${listShell('locations')}</section>`;
  mountList(view.querySelector('[data-list]'), {
    items: state.wiki.locations,
    text: (l) => filterText('locations', l),
    sorts: ENTRY_SORTS,
    render: (visible, sort) => entryGrid('locations', visible, (l) => l.region, sort === 'default' ? 'grid-feature' : ''),
  });
}

function renderLocation(slug) {
  const l = state.wiki.locations.find((x) => x.slug === slug);
  if (!l) return renderNotFound();
  const ref = `locations/${slug}`;
  const onMap = mapPins().some((pin) => pin.ref === ref);
  const page = `
    <article class="place">
      <div class="place-hero${l.image ? '' : ' is-bare'}">${l.image ? `${picture(l, artKind('locations', l))}<div class="hero-shade"></div>` : ''}
        <div class="place-title">
          <a class="back" href="#/locations">${icon('back')}Locations</a>
          <span class="kicker">${esc(l.region)}</span>
          <h1>${esc(l.name)}</h1>
        </div>
      </div>
      <div class="place-body">
        <div>
          ${spoilerNote(l)}
          <p class="lede">${esc(l.summary)}</p>
          ${paragraphs(l)}
          ${facts('locations', l)}
          ${guideSlot(`#/locations/${slug}`)}
          ${related(l)}
          ${provenance(l)}
          ${tags(l)}
        </div>
        <aside class="panel">
          <dl>
            ${l.region ? `<dt>Region</dt><dd>${esc(l.region)}</dd>` : ''}
            ${l.basedOn ? `<dt>Based on</dt><dd>${esc(l.basedOn)}</dd>` : ''}
          </dl>
          ${onMap ? `<a class="btn btn-primary" href="#/map?focus=${encodeURIComponent(ref)}">View on the map</a>` : ''}
        </aside>
      </div>
    </article>`;
  view.innerHTML = isHidden('locations', l) ? veil('locations', l, page, 'page') : page;
  fillGuideLinks();
}

function renderVehicles() {
  const cat = category('vehicles');
  view.innerHTML = `
    ${pageHead('Vehicles', cat?.blurb, 'vehicles')}
    <section class="block">${listShell('vehicles')}</section>`;
  mountEntryList(view.querySelector('[data-list]'), 'vehicles', state.wiki.vehicles, kickerOf, 'grid-feature by-three');
}

function renderIntel() {
  const { news, editions, faq } = state.wiki;
  view.innerHTML = `
    ${pageHead('Intel', 'Release timeline, editions and the questions people ask most.')}
    <section class="block split">
      <div>
        <div class="block-head"><h2>Timeline</h2></div>
        <ol class="timeline">${news.map((item) => timelineItem(item, true)).join('')}</ol>
      </div>
      <div>
        <div class="block-head"><h2>Editions</h2></div>
        <div class="editions">${editions.map((e) => closable('editions', e, `
          <div class="panel">${e.image && !STORE ? `<img class="edition-cover" src="${esc(e.image)}" alt="${esc(e.name)} cover art" loading="lazy">` : ''}<span class="price">${esc(e.price)}</span><h3>${esc(e.name)}</h3>
            <p>${esc(e.summary)}</p><p class="muted">${esc((e.body || []).join(' '))}</p>${badge(e.confidence)}</div>`)).join('')}
        </div>
        <div class="block-head"><h2>FAQ</h2></div>
        <div class="faq">${faq.map((q) => closable('faq', q, `<details><summary>${esc(q.name)}</summary><p>${esc(q.summary)} ${badge(q.confidence)}</p></details>`)).join('')}</div>
      </div>
    </section>`;
}

// ---------- media ----------

const RIGHTS = {
  approved: 'Rights confirmed',
  permission_required: 'Permission needed',
  unknown: 'Rights not confirmed',
  unreviewed: 'Not reviewed',
};

/** Where a picture comes from, in two plain labels (and what each means). */
const ORIGIN = {
  official: ['Official', "From Rockstar Games' own site or accounts"],
  'official-via': ['Official', "Rockstar Games' own picture, as published by another site"],
  community: ['Community', 'Captured or made by another site, not by Rockstar'],
  owner: ['Community', "Added by this app's maker; its source is not recorded"],
};
const isOfficialPicture = (item) => item.origin === 'official' || item.origin === 'official-via';
const originLabel = (item) => {
  const o = ORIGIN[item.origin];
  return o ? `<span class="conf ${isOfficialPicture(item) ? 'conf-official' : 'conf-community'}" title="${esc(o[1])}">${o[0]}</span>` : '';
};

async function renderMedia() {
  view.innerHTML = `${pageHead('Media', "Artwork and live wallpapers. Each one is labelled Official (Rockstar's own) or Community, with where it came from.")}
    <div class="chips" id="media-filter"></div><div class="gallery" id="gallery"><p class="muted">Loading the gallery…</p></div>`;
  const filter = document.getElementById('media-filter');
  const gallery = document.getElementById('gallery');

  let media;
  try {
    media = await getJson('/api/media');
  } catch {
    gallery.innerHTML = '<p class="muted">The gallery could not be loaded. Try again in a moment.</p>';
    return;
  }
  if (!gallery.isConnected) return; // navigated away while loading

  const items = [
    ...media.videos.map((v) => ({ ...v, type: 'video', group: 'wallpapers' })),
    // Pictures taken from guide pages illustrate their entries only. They stay out of the gallery:
    // they are not artwork, and many show what the spoiler rule keeps covered.
    ...media.images.filter((i) => i.group !== 'web').map((i) => ({ ...i, type: 'image', group: i.group || 'artwork' })),
  ];
  const groups = ['all', ...new Set(items.map((i) => i.group))];

  let group = 'all';
  const draw = (active) => {
    group = active;
    const officialCount = items.filter(isOfficialPicture).length;
    filter.innerHTML = groups.map((g) => `<button type="button" aria-pressed="${g === active}" class="${g === active ? 'is-active' : ''}" data-group="${esc(g)}">${esc(g)}</button>`).join('')
      + `<button type="button" class="toggle official-toggle${officialOnly ? ' is-on' : ''}" data-official aria-pressed="${officialOnly}" title="Show only Rockstar Games' own pictures">Official only (${officialCount})</button>`;
    const shown = items.filter((i) => (active === 'all' || i.group === active) && (!officialOnly || isOfficialPicture(i)));
    gallery.innerHTML = shown.map((item) => `
      <button type="button" class="tile ${item.type === 'video' ? 'tile-video' : ''}" data-index="${items.indexOf(item)}" aria-label="Open ${esc(item.title)}">
        ${item.type === 'video'
          ? `${videoTile(item, 'loop')}<span class="play" aria-hidden="true"></span>`
          : `<img src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy">`}
        <span class="tile-title">${esc(item.title)}</span>${isOfficialPicture(item) ? '<span class="tile-origin">Official</span>' : ''}
      </button>`).join('') || '<p class="muted">Nothing here yet.</p>';
  };
  draw('all');

  filter.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.official !== undefined) { officialOnly = !officialOnly; draw(group); return; }
    if (button.dataset.group) draw(button.dataset.group);
  });
  gallery.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (tile) openLightbox(items[Number(tile.dataset.index)], tile);
  });
  // Live wallpapers play only while hovered or focused.
  const preview = (on) => (e) => {
    const video = e.target.closest?.('.tile-video')?.querySelector('video');
    if (!video) return;
    if (on) video.play().catch(() => {}); else video.pause();
  };
  gallery.addEventListener('mouseover', preview(true));
  gallery.addEventListener('focusin', preview(true));
  gallery.addEventListener('mouseout', preview(false));
  gallery.addEventListener('focusout', preview(false));
}

const lightbox = document.getElementById('lightbox');
let lightboxOpener = null;
function openLightbox(item, opener) {
  lightboxOpener = opener || null;
  lightbox.querySelector('.lightbox-stage').innerHTML = item.type === 'video'
    ? `<video src="${esc(item.src)}" autoplay loop muted controls playsinline aria-label="${esc(item.alt)}"></video>`
    : `<img src="${esc(item.src)}" alt="${esc(item.alt)}">`;
  const links = (item.related || []).map(resolve).filter(Boolean);
  lightbox.querySelector('.lightbox-caption').innerHTML = `
    <b>${esc(item.title)}</b>
    ${originLabel(item)}
    <span class="rights rights-${esc(item.rights)}">${esc(RIGHTS[item.rights] || item.rights)}</span>
    ${item.credit ? `<span class="muted">${esc(item.credit)}</span>` : ''}
    ${links.map(({ section, entry }) => `<a href="${entryLink(section, entry.slug)}">${esc(entry.name)}</a>`).join('')}`;
  lightbox.hidden = false;
  lightbox.querySelector('.lightbox-close').focus();
}
function closeLightbox() {
  if (lightbox.hidden) return;
  lightbox.hidden = true;
  lightbox.querySelector('.lightbox-stage').innerHTML = ''; // also stops the video
  lightboxOpener?.focus();
}
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.closest('.lightbox-close') || e.target.closest('.lightbox-caption a')) closeLightbox();
});
window.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'Tab') {
    // Keep keyboard focus inside the open lightbox.
    const stops = [...lightbox.querySelectorAll('button, a[href], video[controls]')];
    const next = stops.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1);
    e.preventDefault();
    stops[(next + stops.length) % stops.length].focus();
  }
});

// ---------- map ----------

// Pin categories come from `map.categories` in the data; these three are the
// fallback for a data file that does not declare any.
const DEFAULT_PIN_CATEGORIES = [
  { key: 'regions', label: 'Regions', color: 'accent-pink-strong', zoom: 2.5 },
  { key: 'districts', label: 'Vice City districts', color: 'text-primary' },
  { key: 'landmarks', label: 'Landmarks', color: 'accent-yellow' },
];
/** Pins listed per category before "Show all". */
const MAP_LIST_PAGE = 40;

const validPosition = (m) => [m.x, m.y].every((v) => typeof v === 'number' && v >= 0 && v <= 1);

/**
 * Every pin on the map: the markers listed under `map.markers`, plus any
 * entry that has its own `x`/`y` (unless a marker already points at it).
 * Closed spoiler entries get no pin.
 */
function mapPins() {
  const markers = (state.wiki.map?.markers || []).filter(validPosition).map((m) => {
    const target = resolve(m.location ? `locations/${m.location}` : m.entry);
    // A hand-placed marker stays, but shows nothing from a closed spoiler entry. A marker marked
    // as a spoiler itself (a mission found after launch) keeps its place but not its name.
    const open = target && !isHidden(target.section, target.entry);
    const hidden = (Boolean(target) && !open) || (m.spoiler === true && !showSpoilers);
    return {
      name: hidden ? 'Spoiler' : m.name, keyName: m.name, spoilerMarker: m.spoiler === true, category: m.category || 'landmarks', x: m.x, y: m.y, target, kind: m.kind || '', via: m.via || '', guide: m.guide || null,
      summary: hidden ? '' : m.summary || (open ? target.entry.summary : ''),
      ref: target ? `${target.section}/${target.entry.slug}` : null,
      image: open && !hidden ? target.entry.image : null,
      hidden,
    };
  });
  const taken = new Set(markers.map((m) => m.ref).filter(Boolean));
  const fromEntries = state.wiki.categories.flatMap((c) => (state.wiki[c.key] || [])
    .filter((entry) => validPosition(entry) && !taken.has(`${c.key}/${entry.slug}`) && !isHidden(c.key, entry))
    .map((entry) => ({
      name: entry.name, category: entry.pin || c.key, x: entry.x, y: entry.y, summary: entry.summary,
      target: { section: c.key, entry }, ref: `${c.key}/${entry.slug}`, image: entry.image,
    })));
  return [...markers, ...fromEntries];
}

/** Robbery runs: each kind of target on the map, which pins it covers, and its Robbery Planner page. */
const ROBBERY_TYPES = [
  { key: 'small-banks', label: 'Small banks', page: 3, test: (p) => p.kind === 'Bank Jobs' },
  { key: 'big-banks', label: 'Big banks (vaults)', page: 4, test: (p) => p.kind === 'Big Bank Jobs' },
  { key: 'pawn-shops', label: 'Pawn shops', page: 5, test: (p) => p.kind === 'Smash and Grabs' && /pawn/i.test(p.keyName || p.name) },
  { key: 'jewelry-stores', label: 'Jewelry stores', page: 6, test: (p) => p.kind === 'Smash and Grabs' && !/pawn/i.test(p.keyName || p.name) },
  { key: 'payday-loans', label: 'Payday loan stores', page: 7, test: (p) => p.kind === 'Payday Loan Stores' },
  { key: 'atms', label: 'ATMs', page: 8, test: (p) => p.kind === 'ATMs' },
  { key: 'gang-operations', label: 'Gang operations', page: 10, test: (p) => p.kind === 'Gang Operations' },
];
window.ROBBERY_TYPES = ROBBERY_TYPES;

/**
 * A short order to visit every spot once, starting from `start` ({x, y}): nearest first, then
 * improved by reversing any stretch that makes the line shorter (2-opt). Straight lines on the map,
 * in map proportions; pin positions are approximate, so this is a sensible order, not a road route.
 */
function shortRun(spots, start, width, height) {
  const d = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  const left = spots.slice();
  const order = [];
  let at = start;
  while (left.length) {
    let best = 0;
    for (let k = 1; k < left.length; k++) if (d(at, left[k]) < d(at, left[best])) best = k;
    at = left.splice(best, 1)[0];
    order.push(at);
  }
  const path = [start, ...order];
  for (let improved = true, rounds = 0; improved && rounds < 50; rounds++) {
    improved = false;
    for (let i = 1; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const before = d(path[i - 1], path[i]) + (j + 1 < path.length ? d(path[j], path[j + 1]) : 0);
        const after = d(path[i - 1], path[j]) + (j + 1 < path.length ? d(path[i], path[j + 1]) : 0);
        if (after + 1e-9 < before) { path.splice(i, j - i + 1, ...path.slice(i, j + 1).reverse()); improved = true; }
      }
    }
  }
  return path.slice(1);
}

/** A stable name for a pin, for favourites and collections: its entry, or its name and place. */
const pinKey = (pin) => (pin.ref ? `e:${pin.ref}` : `p:${pin.keyName || pin.name}@${pin.x.toFixed(3)},${pin.y.toFixed(3)}`);
/** What "Mark discovered" saves for a pin: its entry (shared with the entry page), or the pin itself. */
const foundKey = (pin) => pin.ref || pinKey(pin);

/** How near counts as "nearby", from the Settings page (map widths: about 2%, 4% or 7%). */
const NEAR_RADIUS = { small: 0.02, medium: 0.04, large: 0.07 };
const nearRadius = () => NEAR_RADIUS[prefs.get('near-radius')] || NEAR_RADIUS.medium;

/** Up to `limit` other pins within the nearby radius of a spot, nearest first (map proportions kept). */
function nearbyPins(pins, x, y, limit = 5, skip = -1) {
  const { width, height } = state.wiki.map;
  const r = nearRadius() * width;
  return pins.map((pin, i) => ({ i, d: Math.hypot((pin.x - x) * width, (pin.y - y) * height) }))
    .filter((n) => n.i !== skip && n.d <= r && !pins[n.i].hidden)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit);
}

/** Labels of the two toggles on a card (and their icons), so redrawing them keeps the same look. */
const favLabel = (on) => `${icon(on ? 'star-fill' : 'star')}Favourite`;
const foundLabel = (on) => `${icon(on ? 'check-circle' : 'pin')}${on ? 'Discovered' : 'Mark discovered'}`;

/** The card a map pin opens: picture, what it is, its entry, actions, nearby pins and the 100% Guide pages about it. */
function pinCard(pin, categoryLabel, extra = {}) {
  const { target } = pin;
  const link = target && !pin.hidden ? entryLink(target.section, target.entry.slug) : '';
  const key = pinKey(pin);
  const fav = UserStore.has('favourites', key);
  const found = UserStore.has('discovered', foundKey(pin));
  const i = extra.index ?? -1;
  const near = extra.nearby || [];
  const related = extra.related || [];
  return `<div class="map-card${pin.image ? ' has-image' : ''}" data-pin="${i}">
    ${pin.image ? `<a class="map-card-pic"${link ? ` href="${link}"` : ''}><img src="${esc(pin.image)}" alt="" loading="lazy"></a>` : ''}
    <div class="map-card-body">
      <span class="kicker">${esc(pin.kind || categoryLabel)}</span>
      <h3>${link ? `<a href="${link}">${esc(pin.name)}</a>` : esc(pin.name)}</h3>
      ${pin.hidden ? '<p class="muted">A spoiler: show spoilers to read about it.</p>' : (pin.summary ? `<p>${esc(pin.summary)}</p>` : '')}
      ${i >= 0 ? `<div class="map-card-acts" role="group" aria-label="Actions">
        ${link ? `<a class="btn btn-primary btn-small" href="${link}">${icon('book')}Open the entry</a>` : ''}
        <button type="button" class="chip-btn${fav ? ' is-on' : ''}" data-act="fav" aria-pressed="${fav}" title="${fav ? 'Remove from' : 'Add to'} favourites">${favLabel(fav)}</button>
        <button type="button" class="chip-btn${found ? ' is-on' : ''}" data-act="found" aria-pressed="${Boolean(found)}" title="Mark as a place you have found in the game">${foundLabel(found)}</button>
        <button type="button" class="chip-btn" data-act="collect" title="Add to one of your collections">${icon('collection')}Collection</button>
        <button type="button" class="chip-btn" data-act="route" title="Add as a stop on your route">${icon('route')}Route</button>
        <button type="button" class="chip-btn" data-act="street" title="Open Street Explorer at this pin">${icon('walk')}Street Explorer</button>
      </div>
      ${(extra.places || 1) > 1 && target && !pin.hidden ? `<p class="map-card-shared muted">Favourite, Discovered and Collection apply to the ${esc(target.entry.name)} entry, which has ${extra.places} places on the map.</p>` : ''}` : ''}
      <div class="map-card-guides" hidden></div>
      ${related.length ? `<div class="map-card-near map-card-related"><b>Related on the map</b><ul>${related.map((n) => `<li><button type="button" data-act="go" data-to="${n.i}">${esc(n.name)}</button></li>`).join('')}</ul></div>` : ''}
      ${near.length ? `<div class="map-card-near"><b>Nearby</b><ul>${near.map((n) => `<li><button type="button" data-act="go" data-to="${n.i}">${esc(n.name)}</button></li>`).join('')}</ul></div>` : ''}
      <div class="map-card-foot">
        ${link && i < 0 ? `<a class="btn btn-small" href="${link}">Open the entry</a>` : ''}
        <span class="muted pin-certainty" title="${esc(PIN_CERTAINTY_NOTE)}">${esc(pinCertainty(pin))}</span>
      </div>
    </div>
  </div>`;
}

/** How a pin's position was found. None is surveyed in the game, so none is called exact. */
const pinCertainty = (pin) => (pin.via === 'gamersky' ? 'Position: approximate, from Gamersky\'s map' : 'Position: approximate, placed by hand on Rockstar\'s map');
const PIN_CERTAINTY_NOTE = 'No pin position in this app is a surveyed in-game coordinate, so the app gives no distances.';

async function fillPinGuides(root, pin) {
  const slot = root?.querySelector('.map-card-guides');
  if (!slot || pin.hidden || typeof Manual === 'undefined' || !Manual.guideLinks) return;
  const found = [];
  // The guide page for this kind of place (every bank, every stunt jump…), then pages about the entry.
  if (pin.guide) {
    const page = await Manual.pageLink(pin.guide[0], pin.guide[1], state.wiki);
    if (page) found.push(page);
    const card = slot.closest('.map-card');
    if (page?.picture && card && !card.querySelector('.map-card-pic')) {
      card.insertAdjacentHTML('afterbegin', `<a class="map-card-pic" href="${esc(page.href)}"><img src="${esc(page.picture)}" alt="" loading="lazy"><span>From the guide: ${esc(page.title)}</span></a>`);
    }
  }
  if (pin.target) {
    for (const f of await Manual.guideLinks(entryLink(pin.target.section, pin.target.entry.slug), state.wiki)) {
      if (!found.some((g) => g.href === f.href)) found.push(f);
    }
  }
  if (!found.length || !slot.isConnected) return;
  slot.innerHTML = `<b>In the 100% Guide</b><ul>${found.slice(0, 4).map((f) => `<li><a href="${esc(f.href)}">${esc(f.title)}</a> <em>p. ${esc(f.number)}</em></li>`).join('')}</ul>`;
  slot.hidden = false;
}

/** The pin categories in use, declared ones first, each with a safe CSS colour. */
function pinCategories(pins) {
  const declared = state.wiki.map?.categories?.length ? state.wiki.map.categories : DEFAULT_PIN_CATEGORIES;
  const used = [...new Set(pins.map((pin) => pin.category))];
  const extra = used.filter((key) => !declared.some((c) => c.key === key))
    .map((key) => ({ key, label: category(key)?.label || key.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) }));
  return [...declared, ...extra].filter((c) => used.includes(c.key)).map((c) => ({
    key: c.key,
    label: c.label || c.key,
    zoom: typeof c.zoom === 'number' ? c.zoom : 4,
    color: /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c.color || '') ? c.color
      : /^[a-z-]+$/.test(c.color || '') ? `var(--${c.color})` : 'var(--text-secondary)',
  }));
}

/** Whether the reader asked for less motion (Settings) or the system does. */
const calmMotion = () => prefs.get('reduced-motion') === '1' || prefs.get('map-motion') === 'off'
  || matchMedia('(prefers-reduced-motion: reduce)').matches || window.Appearance?.scale() === 0;
/** Camera moves at full length (1), shortened for "gentle" animation (0.5), or none (0). */
const motionScale = () => (calmMotion() ? 0 : window.Appearance?.scale() ?? 1);

function renderMap(params) {
  const { map: config } = state.wiki;
  const pins = mapPins();
  const categories = pinCategories(pins);
  const categoryOf = new Map(categories.map((c) => [c.key, c]));
  // The game's own map icons (Rockstar's, as GTABase cut them out) for the kinds that have one;
  // other pins keep their category's coloured dot. Files are in images/map-icons/.
  const KIND_ICON = {
    // Fences and drop-offs use the game's green fence icon.
    'Fences': 'fence',
    'Vehicle Fences': 'fence',
    'Drop-Off Points': 'fence',
    "Bank Jobs": 'bank',
    "Big Bank Jobs": 'bank',
    "ATMs": 'towable-atm',
    "Payday Loan Stores": 'payday-loan',
    "Smash and Grabs": 'smash-n-grab',
    "Pawn Shops": 'smash-n-grab',
    "Gang Operations": 'gang-operation',
    "Kitty Litter Lab Raids": 'gang-operation',
    "Dunn's Robbery Tips": 'safe',
    "Garages": 'garage',
    "Safehouses": 'safehouse',
    "Standard Gun Shops": 'ammu-nation',
    "High-End Gun Shops": 'ammu-nation',
    "Custom Weapons": 'ammu-nation',
    "Mod Shops": 'mod-shop',
    "Paint Shops": 'pay-n-spray',
    "Barbers and Salons": 'haircut',
    "Tattoo Parlors": 'tattoo',
    "Gas Stations": 'gas-station',
    "Convenience Stores": 'convenience-store',
    "Liquor Stores": 'liquor-store',
    "Bars": 'bar',
    "Street Food": 'street-food',
    "Cafés and Takeout": 'cafe',
    "Fast Food": 'fast-food',
    "Train Stations": 'train-station',
    "Bus Stops": 'bus-stop',
    "Electronics": 'electronics',
    "EV Chargers": 'ev-charger',
    "Streetwear": 'clothing',
    "Sportswear": 'clothing',
    "Formalwear": 'clothing',
    "Souvenirs and Swimwear": 'clothing',
    "Thrift Shops": 'clothing',
    "Shoe Shops": 'footwear',
    "High Heels": 'footwear',
    "Races": 'race',
    "Stunt Jumps": 'stunt-jump',
    "BASE Jumps": 'base-jump',
    "Fitness": 'gym',
    "Shooting Range Challenges": 'shooting-range',
    "Hunting Spots": 'hunting',
    "Fishing Spots": 'fishing',
    "Randy's Wish List": 'vehicle-request',
    "Vehicle Thefts for Moses": 'vehicle-request',
    "919": 'nightclub',
    "Car Washes": 'car-wash',
    "Drones": 'drone-race',
    "Golf": 'golf',
    "Vehicle Rentals": 'vehicle-rental',
    "Kenton's Treasure": 'treasure',
    "Basketball Hoops": 'basketball',
    "Comics": 'magazine',
    "Sculptures": 'waink-sculpture',
    "Special Vehicles": 'standout-vehicle',
    "Hunting Supply Shops": 'hunting',
  };
  const blipOf = (pin) => (pin.kind && KIND_ICON[pin.kind] ? `/images/map-icons/${KIND_ICON[pin.kind]}.webp` : '');
  const dot = (pin, extra = '') => {
    const blip = blipOf(pin);
    if (blip) return `<img class="pin-blip${extra ? ' pin-blip-map' : ''}" src="${blip}" alt="" draggable="false">`;
    return `<i class="pin${extra}" style="background:${categoryOf.get(pin.category).color}"></i>`;
  };
  const off = new Set(); // pin categories switched off
  const expanded = new Set(); // pin categories listed in full
  let hideFound = prefs.get('map-hide-found') === '1'; // hide pins marked discovered (kept between visits)
  const isFound = (i) => UserStore.has('discovered', foundKey(pins[i]));
  const explore = params.get('explore') === '1';

  view.innerHTML = `
    <div class="map-page${explore ? ' is-explore' : ''}">
      <aside class="map-side" id="map-side">
        <button type="button" class="btn btn-icon btn-small map-side-close" data-side aria-label="Close the places panel">${icon('close')}</button>
        <h1>${explore ? 'Street Explorer' : 'Leonida'}</h1>
        <p class="muted">${explore
    ? 'Drag Jason or Lucia onto the map, or press the figure and click a spot, to walk through the real in-game pictures nearest that place. Blue dots mark where pictures are.'
    : config.image
      ? 'Click a pin for its card, or a name to fly there. The map is Rockstar\'s own; most pin positions come from Gamersky\'s map and are placed approximately.'
      : 'Click a pin for its card, or a name to fly there. The map is drawn by the GTA VI mapping community; most pin positions come from Gamersky\'s map and are placed approximately.'}</p>
        ${explore ? '' : `<details class="heist-plan">
          <summary>${icon('route')}Plan a robbery run</summary>
          <label class="heist-field"><span>Target</span><select data-plan-type>${ROBBERY_TYPES.map((t) => `<option value="${t.key}">${esc(t.label)}</option>`).join('')}</select></label>
          <div class="heist-acts"><button type="button" class="btn btn-primary btn-small" data-plan-go>Plan the run</button>
            <a class="link-btn" data-plan-guide href="#/manual/robbery-planner/2">Step-by-step guide</a></div>
          <p class="muted heist-note">Puts every target of that kind in a short order, starting from the open pin or the middle of the view. Straight lines between approximate pins, not roads: check the guide for each stop.</p>
        </details>`}
        <div class="map-route" hidden></div>
        <div class="field-search">${icon('search')}
          <input type="search" class="map-filter" placeholder="Search the map" aria-label="Filter pins" autocomplete="off">
          <button type="button" class="field-clear" data-clear hidden aria-label="Clear filter" data-tip="Clear">${icon('close')}</button>
        </div>
        <div class="map-filter-tools">
          <p class="map-count muted" role="status"></p>
          <button type="button" class="link-btn" data-all="on">Show all</button>
          <button type="button" class="link-btn" data-all="off">Hide all</button>
        </div>
        <div class="map-near-filter">
          <label class="opt"><input type="checkbox" data-hide-found ${hideFound ? 'checked' : ''}><span>Hide places I have marked discovered</span></label>
          <label class="opt"><input type="checkbox" data-near-only><span>Only places near the open pin (or the centre of the view)</span></label>
          <label class="list-sort"><span>Nearby means</span> <select data-near-radius aria-label="How near counts as nearby">
            ${[['small', 'Close'], ['medium', 'Medium'], ['large', 'Wide']].map(([v, l]) => `<option value="${v}" ${(prefs.get('near-radius') || 'medium') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="map-lists"></div>
      </aside>
      <div class="map-wrap">
        <div id="leonida-map" aria-label="Zoomable map of Leonida"></div>
        <div id="leonida-3d" class="map3d" aria-label="3D map of Leonida" hidden></div>
        <button type="button" class="btn btn-small map-side-toggle" data-side aria-expanded="false" aria-controls="map-side">${icon('pin')}Places</button>
        <div class="map-tools" role="toolbar" aria-label="Map controls">
          <div class="map-seg" role="group" aria-label="Map view">
            <button type="button" data-view="2d" aria-pressed="true">2D</button>
            <button type="button" data-view="3d" aria-pressed="false">3D</button>
          </div>
          <span class="map-sep" aria-hidden="true"></span>
          <button type="button" class="map-street" data-street aria-pressed="false" title="Show where Street Explorer pictures are">${icon('camera')}Street view</button>
          <span class="map-sep" aria-hidden="true"></span>
          <button type="button" class="map-tool" data-reset data-tip="Reset the view" aria-label="Reset the view">${icon('reset')}</button>
          <button type="button" class="map-tool" data-full data-tip="Full screen" aria-label="Full screen">${icon('expand')}</button>
          <button type="button" class="map-tool" data-saveview data-tip="Save this view" aria-label="Save this view">${icon('bookmark')}</button>
          <button type="button" class="map-tool" data-layers aria-expanded="false" aria-controls="map-layers" data-tip="Map overlays" aria-label="Map overlays">${icon('layers')}</button>
          <button type="button" class="map-tool" data-tilt hidden data-tip="Look straight down or tilt" aria-label="Look straight down or tilt the 3D map">${icon('tilt')}</button>
          <button type="button" class="map-tool" data-immersive aria-pressed="false" data-tip="Immersive mode (Esc leaves)" aria-label="Immersive mode">${icon('eye')}</button>
        </div>
        <div id="map-layers" class="map-layers-panel" hidden>
          <b>Overlays</b>
          <label class="opt"><input type="checkbox" data-overlay="density"><span>Density of places</span></label>
          <label class="opt"><input type="checkbox" data-overlay="names"><span>District and town names</span></label>
          <label class="opt"><input type="checkbox" data-overlay="links"><span>Lines to related places</span></label>
          <label class="opt"><input type="checkbox" data-overlay="certainty"><span>How each position was found</span></label>
          ${config.image && config.tileFit ? '<label class="opt"><input type="checkbox" data-detail><span>Sharp detail when zoomed in (community map)</span></label>' : ''}
          <p class="muted">Density counts only the pins shown, after filters.</p>
        </div>
        <div class="map-legend" hidden></div>
        <section class="immersive-hud" aria-label="Immersive map panel" hidden>
          <div class="hud-head"><b>${explore ? 'Street Explorer' : 'Leonida'}</b><button type="button" class="btn btn-small" data-immersive>Leave (Esc)</button></div>
          <input type="search" class="hud-filter" placeholder="Filter pins" aria-label="Filter pins" autocomplete="off">
          <h2>Nearby</h2>
          <ul class="hud-near"></ul>
          <p class="muted hud-note">Nearest pins to the open pin or the centre of the view, by their place on Rockstar's map. Positions are approximate, so no distances are given.</p>
        </section>
        <div class="walker-dock">
          <button type="button" class="walker" data-walker title="Drag onto the map to look around (or press, then click the map)" aria-label="Street Explorer figure: drag onto the map"><img src="${esc(walkerPicture('jason'))}" alt=""></button>
          <button type="button" class="walker-swap" data-swap>Lucia</button>
        </div>
        <p id="map-notice" class="map-notice" role="status" hidden></p>
      </div>
    </div>`;

  // With the detail layer, two steps past the official map's full size (it stays sharp there).
  const map = L.map('leonida-map', { crs: L.CRS.Simple, zoomSnap: 0.25, minZoom: 0, maxZoom: config.maxZoom + (config.image && config.tileFit ? 2 : 1), maxBoundsViscosity: 0.7 });
  state.map = map;
  map.attributionControl.setPrefix(false);
  /** A layer of 256-pixel tiles, each drawn from the community tiles that cover the same ground. */
  function detailLayer(tf) {
    const M = config.maxZoom;
    const cache = new Map();
    const tileImage = (z, y, x) => {
      const key = `${z}/${y}/${x}`;
      if (!cache.has(key)) {
        if (cache.size >= 300) cache.delete(cache.keys().next().value); // keep memory bounded: drop the oldest
        cache.set(key, new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = `/tiles/${key}.webp`;
        }));
      }
      return cache.get(key);
    };
    const Detail = L.GridLayer.extend({
      createTile(coords, done) {
        const size = this.getTileSize();
        const canvas = document.createElement('canvas');
        canvas.width = size.x; canvas.height = size.y;
        const ctx = canvas.getContext('2d');
        const per = 2 ** (M - coords.z); // official-map pixels per screen pixel at this zoom
        // The community zoom whose pixels are at least as fine as the screen's (the set goes to 5).
        const zc = Math.min(5, tf.zoom + Math.max(0, Math.ceil(Math.log2(1 / (tf.scale * per)))));
        const up = 2 ** (zc - tf.zoom);
        const x0 = (tf.x + tf.scale * coords.x * size.x * per) * up;
        const y0 = (tf.y + tf.scale * coords.y * size.y * per) * up;
        const span = tf.scale * size.x * per * up;
        const k = size.x / span;
        const jobs = [];
        for (let ty = Math.floor(y0 / 512); ty * 512 < y0 + span; ty++) {
          for (let tx = Math.floor(x0 / 512); tx * 512 < x0 + span; tx++) {
            if (tx < 0 || ty < 0 || tx * 512 >= tf.tilesWidth * up || ty * 512 >= tf.tilesHeight * up) continue; // open sea
            jobs.push(tileImage(zc, ty, tx).then((img) => {
              // Whole pixels and a 1-pixel overlap, so no seam shows where tiles meet.
              if (img) ctx.drawImage(img, Math.floor((tx * 512 - x0) * k), Math.floor((ty * 512 - y0) * k), Math.ceil(512 * k) + 1, Math.ceil(512 * k) + 1);
            }));
          }
        }
        Promise.all(jobs).then(() => done(null, canvas));
        return canvas;
      },
    });
    const layer = new Detail({ tileSize: 256, minZoom: M + 0.5, bounds, className: 'map-detail', pane: 'mapDetail' });
    // Its credit is shown only while the detail is on screen (zoomed in past the official map).
    const credit = 'Zoomed-in detail: GTA VI mapping community via gtadb.org (CC BY 4.0)';
    let credited = false;
    const syncCredit = () => {
      const want = map.hasLayer(layer) && map.getZoom() >= M + 0.5;
      if (want === credited || !map.attributionControl) return;
      if (want) map.attributionControl.addAttribution(credit); else map.attributionControl.removeAttribution(credit);
      credited = want;
    };
    map.on('zoomend', syncCredit);
    layer.on('add remove', () => setTimeout(syncCredit));
    return layer;
  }

  // Positions (x, y from 0 to 1) are on the official map. Without its picture the map shows the
  // community tiles, which draw the island at another scale and place: map.tileFit says how the two
  // line up, so every pin, route and click is moved onto the tiles, and back.
  const fit = !config.image && config.tileFit ? config.tileFit : { scale: 1, x: 0, y: 0, zoom: config.maxZoom };
  const k = fit.scale * 2 ** (config.maxZoom - fit.zoom);
  const ox = fit.x * 2 ** (config.maxZoom - fit.zoom), oy = fit.y * 2 ** (config.maxZoom - fit.zoom);
  const point = (x, y) => map.unproject([ox + k * x * config.width, oy + k * y * config.height], config.maxZoom);
  const toXY = (ll) => { const at = map.project(ll, config.maxZoom); return [(at.x - ox) / (k * config.width), (at.y - oy) / (k * config.height)]; };
  const bounds = L.latLngBounds(point(0, 1), point(1, 0));
  const flyMs = (seconds) => seconds * motionScale();

  const notice = document.getElementById('map-notice');
  const say = (text) => { notice.textContent = text; notice.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { notice.hidden = true; }, 3200); };
  let detail = null;
  if (config.image) {
    // One picture: Rockstar's official map, shipped with the app, so it works offline.
    // Their own layers, so the detail sits over the official map and both stay under lines and pins.
    map.createPane('mapBase').style.zIndex = 250;
    map.createPane('mapDetail').style.zIndex = 260;
    L.imageOverlay(config.image, bounds, { attribution: esc(config.attribution), pane: 'mapBase' }).addTo(map);
    // Past the official map's own full size it would only be enlarged (and blur), so from there the
    // sharper community tiles are drawn over it, lined up through map.tileFit. Where a tile can't be
    // loaded (offline) the official map shows through. Switch: "Sharp detail when zoomed in".
    if (config.tileFit) {
      detail = detailLayer(config.tileFit);
      if (prefs.get('map-detail') !== '0') detail.addTo(map);
    }
  } else {
    // Only where the tile set has tiles: beyond its edge is open sea, and asking for tiles there
    // would only fail (and wrongly say the connection is down).
    const scaleUp = 2 ** (config.maxZoom - fit.zoom);
    const tileBounds = fit.tilesWidth
      ? L.latLngBounds(map.unproject([0, fit.tilesHeight * scaleUp], config.maxZoom), map.unproject([fit.tilesWidth * scaleUp, 0], config.maxZoom))
      : bounds;
    const tiles = L.tileLayer('/tiles/{z}/{y}/{x}.webp', {
      tileSize: 512, minNativeZoom: 0, maxNativeZoom: config.maxZoom,
      minZoom: -2, maxZoom: config.maxZoom + 1, bounds: tileBounds, noWrap: true, attribution: esc(config.tileAttribution || config.attribution),
    }).addTo(map);
    // Tiles are fetched once and cached; if that fails, say why the map is blank.
    tiles.on('tileerror', () => {
      notice.textContent = 'Some map tiles could not be loaded. Areas you have viewed before still work offline; the rest need an internet connection.';
      notice.hidden = false;
    });
    tiles.on('load', () => { if (!document.querySelector('.leaflet-tile-error')) notice.hidden = true; });
    tiles.on('tileerror', (e) => e.tile.classList.add('leaflet-tile-error'));
  }

  // Pins shrink when zoomed out, so a thousand of them still leave the map readable.
  // "Far" and "mid" are measured from the zoom that fits the whole map, whatever the window size.
  map.setMaxBounds(bounds.pad(0.25));
  map.fitBounds(bounds);
  map.setMinZoom(map.getZoom() - 0.5);
  const homeZoom = map.getZoom();
  const isFar = () => map.getZoom() < homeZoom + 0.6;
  const zoomClass = () => { map.getContainer().dataset.zoom = isFar() ? 'far' : map.getZoom() < homeZoom + 1.6 ? 'mid' : 'near'; };
  map.on('zoomend', zoomClass);
  zoomClass();

  // ---------- pins, cards and their actions ----------
  let selected = -1;
  let runOnly = null; // pin indexes of a planned robbery run (the lists and map show only those), or null
  const layers = {};
  const cardFor = (i) => {
    const node = document.createElement('div');
    node.innerHTML = pinCard(pins[i], categoryOf.get(pins[i].category).label, {
      index: i,
      nearby: nearbyPins(pins, pins[i].x, pins[i].y, 5, i).map((n) => ({ i: n.i, name: pins[n.i].name })),
      related: relatedOf(i).slice(0, 6).map((j) => ({ i: j, name: pins[j].name })),
      places: pins[i].ref ? pins.filter((p) => p.ref === pins[i].ref).length : 1,
    });
    return node;
  };
  // Cards open clear of the toolbar and the top bar: the space they take is measured, and Leaflet
  // reads this same array each time it pans a card into view. The card's height is capped to the
  // space that is left (--card-max), and its content scrolls inside.
  const cardPadTop = [12, 12];
  function fitCards() {
    // Whichever map is showing: in 3D the 2D map is hidden and would measure as nothing.
    const shown = [map.getContainer(), view.querySelector('#leonida-3d')].find((el) => el && !el.hidden && el.offsetParent !== null);
    if (!shown) return;
    const box = shown.getBoundingClientRect();
    if (!box.height) return;
    const covers = [view.querySelector('.map-tools'), view.querySelector('.map-side-toggle'), document.querySelector('.topbar')]
      .filter((el) => el && el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.bottom > box.top && r.top < box.top + box.height / 2);
    const top = Math.max(0, ...covers.map((r) => r.bottom - box.top));
    cardPadTop[1] = Math.round(top + 12);
    map.getContainer().style.setProperty('--card-max', `${Math.max(180, Math.round(box.height - top - 60))}px`);
  }
  const markers = pins.map((pin, i) => {
    const marker = L.marker(point(pin.x, pin.y), {
      title: pin.name,
      alt: pin.name,
      icon: blipOf(pin)
        // A map icon is a pin with a tail: its tip, not its middle, sits on the place.
        ? L.divIcon({ className: `pin-icon pin-small pin-has-blip pin-src-${pin.via === 'gamersky' ? 'gs' : 'hand'}`, html: dot(pin, ' pin-map'), iconSize: [28, 32], iconAnchor: [14, 32] })
        : L.divIcon({ className: `pin-icon pin-${pin.category === 'regions' || pin.category === 'districts' ? 'big' : 'small'} pin-src-${pin.via === 'gamersky' ? 'gs' : 'hand'}`, html: dot(pin, ' pin-map'), iconSize: [26, 26], iconAnchor: [13, 13] }),
    });
    // Hover: the name, its kind and (when there is one) its picture, before clicking.
    marker.bindTooltip(() => {
      const marks = [UserStore.has('favourites', pinKey(pin)) ? 'Favourite' : '', UserStore.has('discovered', foundKey(pin)) ? 'Discovered' : ''].filter(Boolean).join(' · ');
      return `${pin.image && !pin.hidden ? `<img src="${esc(pin.image)}" alt="" loading="lazy">` : ''}<b>${esc(pin.name)}</b><span>${esc(pin.kind || categoryOf.get(pin.category).label)}${marks ? ` · ${marks}` : ''}</span><span class="pin-hover-src">${pin.via === 'gamersky' ? 'Approximate (Gamersky map)' : 'Approximate (placed by hand)'}</span>`;
    },
      { direction: 'top', offset: [0, -10], className: 'pin-hover', opacity: 1 });
    // The card is built once, when the pin is first opened, then filled with its guide pages and picture.
    let card = null;
    marker.bindPopup(() => {
      if (!card) {
        card = cardFor(i);
        fillPinGuides(card, pin).then(() => marker.getPopup()?.update());
      }
      return card;
    }, { maxWidth: 340, minWidth: 270, className: 'map-popup', autoPanPaddingTopLeft: cardPadTop, autoPanPadding: [12, 12] });
    marker.on('popupopen', () => { selected = i; marker.getElement()?.classList.add('is-selected'); pinOpened(i); });
    marker.on('popupclose', () => {
      marker.getElement()?.classList.remove('is-selected');
      linkLayer.clearLayers();
      // Closed by the reader (not replaced by another card): nothing is chosen any more.
      if (selected === i && mode === '2d') { selected = -1; view.querySelectorAll('.map-lists [data-marker].is-selected').forEach((b) => b.classList.remove('is-selected')); }
      if (hideFound && selected === -1 && isFound(i)) drawLists(); // a pin just marked discovered now hides
    });
    (layers[pin.category] ||= L.layerGroup().addTo(map)).addLayer(marker);
    return marker;
  });

  fitCards();
  map.on('resize', fitCards);
  const onResize = () => { if (state.map === map) fitCards(); };
  addEventListener('resize', onResize);
  onLeave(() => removeEventListener('resize', onResize));

  // ---------- clustering: far out, crowded small pins gather into counted bubbles ----------
  const clusterLayer = L.layerGroup().addTo(map);
  let filtered = null; // indexes matching the text filter, or null
  // A discovered pin hides while "Hide discovered" is on, except the one whose card is open.
  const doneHidden = (i) => hideFound && i !== selected && isFound(i);
  const visible = (i) => !off.has(pins[i].category) && (!filtered || filtered.has(i)) && !doneHidden(i);
  function drawClusters() {
    if (state.map !== map) return; // a flight still finishing after the page changed
    clusterLayer.clearLayers();
    const far = isFar();
    map.getContainer().classList.toggle('is-clustered', far);
    if (!far) return;
    const cell = map.getZoom() < homeZoom ? 58 : 46;
    const bins = new Map();
    pins.forEach((pin, i) => {
      if (!visible(i) || pin.category === 'regions' || pin.category === 'districts') return;
      const p = map.latLngToContainerPoint(point(pin.x, pin.y));
      const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
      (bins.get(key) || bins.set(key, []).get(key)).push(i);
    });
    for (const members of bins.values()) {
      const cx = members.reduce((s, i) => s + pins[i].x, 0) / members.length;
      const cy = members.reduce((s, i) => s + pins[i].y, 0) / members.length;
      const counts = new Map();
      members.forEach((i) => counts.set(pins[i].category, (counts.get(pins[i].category) || 0) + 1));
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const top = ranked[0][0];
      const size = members.length > 30 ? 42 : members.length > 9 ? 36 : 30;
      // The ring: one arc per kind of place, in proportion.
      let at = 0;
      const ring = ranked.map(([key, n]) => { const from = at; at += (n / members.length) * 360; return `${categoryOf.get(key).color} ${from}deg ${at}deg`; }).join(', ');
      const breakdown = ranked.slice(0, 4).map(([key, n]) => `${n} ${categoryOf.get(key).label}`).join(', ') + (ranked.length > 4 ? ', more' : '');
      L.marker(point(cx, cy), {
        icon: L.divIcon({ className: 'pin-cluster', html: `<span style="--c:${categoryOf.get(top).color};--ring:conic-gradient(${ring})">${members.length}</span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        title: `${members.length} places here (${breakdown}): zoom in`,
        alt: `${members.length} places here: ${breakdown}`,
        keyboard: true,
      }).bindTooltip(`<b>${members.length} places</b><span>${esc(breakdown)}</span>`, { direction: 'top', offset: [0, -size / 2], className: 'pin-hover' })
        .on('click', () => map.flyTo(point(cx, cy), Math.max(1, map.getZoom() + 1.25), { duration: flyMs(0.7) })).addTo(clusterLayer);
    }
  }
  map.on('zoomend moveend', drawClusters);
  drawClusters();

  /** Apply the text filter to the map itself (not only the lists), in 2D and 3D. */
  function applyFilterToMap() {
    markers.forEach((m, i) => m.getElement()?.classList.toggle('is-filtered', (Boolean(filtered) && !filtered.has(i)) || doneHidden(i)));
    three?.filter(filtered || off.size || hideFound ? pins.map((_, i) => i).filter(visible) : null);
    drawClusters();
    drawDensity();
    drawHud();
  }
  map.on('layeradd', () => { if (filtered || hideFound) markers.forEach((m, i) => m.getElement()?.classList.toggle('is-filtered', (Boolean(filtered) && !filtered.has(i)) || doneHidden(i))); });

  // ---------- 3D view and Street Explorer ----------
  const wrap = view.querySelector('.map-wrap');
  const box3d = view.querySelector('#leonida-3d');
  let three = null; // the 3D map, once opened
  let mode = '2d';
  const photos = (config.photos || []).filter((p) => {
    const target = resolve(p.ref);
    return !target || !isHidden(target.section, target.entry);
  });
  const photoLayer = L.layerGroup(photos.map((p) => L.circleMarker(point(p.x, p.y), {
    radius: 5, color: '#ffffff', weight: 1.5, fillColor: '#3d9bff', fillOpacity: 0.9, className: 'photo-dot',
  }).bindTooltip(esc(p.title), { direction: 'top', className: 'pin-hover' }).on('click', () => openStreet(p.x, p.y))));
  let showingPhotos = false;
  const setPhotos = (on) => {
    showingPhotos = on;
    view.querySelector('[data-street]').setAttribute('aria-pressed', String(on));
    if (on) photoLayer.addTo(map); else map.removeLayer(photoLayer);
    three?.showPhotos(on);
  };
  // A character profile (Settings) picks its own walker; otherwise the saved choice.
  let walker = UserStore.profile() || (prefs.get('walker') === 'lucia' ? 'lucia' : 'jason');
  const walkerSrc = () => walkerPicture(walker);
  const syncWalker = () => {
    view.querySelector('[data-walker] img').src = walkerSrc();
    // The label names who walks now; the button switches to the other one (said in its name and tip).
    const now = walker === 'jason' ? 'Jason' : 'Lucia';
    const other = walker === 'jason' ? 'Lucia' : 'Jason';
    const swap = view.querySelector('[data-swap]');
    swap.textContent = now;
    swap.setAttribute('aria-label', `Walking as ${now}. Switch to ${other}`);
    swap.title = `Switch to ${other}`;
  };
  syncWalker();
  let walkerMark = null;
  function openStreet(x, y) {
    if (walkerMark) map.removeLayer(walkerMark);
    walkerMark = L.marker(point(x, y), { icon: L.divIcon({ className: 'walker-mark', html: `<img src="${walkerSrc()}" alt="">`, iconSize: [44, 56], iconAnchor: [22, 56] }), interactive: false }).addTo(map);
    StreetView.open({
      x, y, photos, config, walker: walkerSrc(), who: walker, places: config.places || [],
      focusAfter: () => view.querySelector('[data-walker]'),
      link: (ref) => { const target = resolve(ref); return target ? entryLink(target.section, target.entry.slug) : ''; },
      onSave: (sx, sy, where) => {
        const starts = UserStore.get('street-starts', []);
        UserStore.set('street-starts', [...starts, { id: Date.now().toString(36), name: `Near ${where}`, x: sx, y: sy, walker, at: Date.now() }]);
      },
      onSwap: () => { walker = walker === 'jason' ? 'lucia' : 'jason'; syncWalker(); return walkerSrc(); },
      onPhoto: (p) => document.dispatchEvent(new CustomEvent('hq:street-photo', { detail: p })),
    });
  }

  const pinColors = pins.map((pin) => ({ ...pin, color: categoryOf.get(pin.category).color }));
  // One 3D card at a time: choosing another place replaces it. Closing it clears the selection,
  // so a closed card does not come back on a 2D/3D switch or in immersive mode.
  let card3d = null;
  function openCard3d(i) {
    if (!three) return;
    const old = card3d;
    card3d = null;
    old?.remove();
    selected = i;
    three.select(i);
    const node = cardFor(i);
    const popup = three.popup(three.toLngLat(pins[i].x, pins[i].y), node);
    card3d = popup;
    popup.on('close', () => {
      if (card3d !== popup) return; // replaced by the next card, not closed by the reader
      card3d = null;
      selected = -1;
      three?.select(-1);
      three?.links([]);
      view.querySelectorAll('.map-lists [data-marker].is-selected').forEach((b) => b.classList.remove('is-selected'));
      if (hideFound && isFound(i)) drawLists();
    });
    fillPinGuides(node, pins[i]).then?.(() => keepCard3dInView(popup));
    pinOpened(i);
    requestAnimationFrame(() => keepCard3dInView(popup));
  }
  /** Moves the 3D map so the whole card is in view, below the toolbar. */
  function keepCard3dInView(popup) {
    if (!three || card3d !== popup) return;
    const el = popup.getElement?.();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const c = box3d.getBoundingClientRect();
    const top = c.top + cardPadTop[1];
    let dy = 0, dx = 0;
    if (r.top < top) dy = r.top - top;
    else if (r.bottom > c.bottom - 12) dy = Math.min(r.bottom - (c.bottom - 12), r.top - top);
    if (r.left < c.left + 12) dx = r.left - (c.left + 12);
    else if (r.right > c.right - 12) dx = r.right - (c.right - 12);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) three.map.panBy([dx, dy], { duration: calmMotion() ? 0 : 300 * motionScale() });
  }
  /** Where the 2D map is looking, as the 3D map's camera (and back), so switching keeps your place. */
  const view2d = () => { const [x, y] = toXY(map.getCenter()); return { x, y, zoom: 9.2 + (map.getZoom() - homeZoom) * 0.95 }; };
  let building3d = null;
  async function show3d() {
    mode = '3d';
    view.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === '3d')));
    const from2d = view2d();
    const keep = map.getZoom() > homeZoom + 0.2;
    box3d.hidden = false;
    view.querySelector('#leonida-map').hidden = true;
    if (!three) {
      // One build at a time; pressing 3D again while it builds waits for the same one.
      if (building3d) {
        try { await building3d; } catch { return; } // the first press shows the failure
        if (state.map === map && mode === '3d' && three) finish3d(from2d, keep);
        return;
      }
      box3d.innerHTML = '<p class="map3d-loading"><span class="spinner" aria-hidden="true"></span>Building the 3D map…</p>';
      try {
        building3d = Map3D.create(box3d, config, pinColors, photos, {
          onPin: (i) => openCard3d(i),
          onStreet: (x, y) => openStreet(x, y),
          calm: calmMotion,
          scale: motionScale,
        });
        const made = await building3d;
        building3d = null;
        // The reader left the map while it was building: let go of it (and its WebGL context) now.
        if (state.map !== map) { try { made.destroy(); } catch { /* already gone */ } return; }
        three = made;
        state.map3d = three;
        box3d.querySelector('.map3d-loading')?.remove();
        three.showPhotos(showingPhotos);
        three.route(stops);
        three.map.on('moveend', drawHud);
        applyFilterToMap();
        applyOverlays();
      } catch (error) {
        building3d = null;
        if (state.map !== map) return;
        box3d.innerHTML = `<p class="map3d-loading">${esc(error.message)} <button type="button" class="link-btn" data-view="2d">Back to 2D</button></p>`;
        return;
      }
      // Back in 2D before it finished: keep the 3D map for later, but show none of its controls.
      if (mode !== '3d') return;
    }
    finish3d(from2d, keep);
  }
  function finish3d(from2d, keep) {
    three.map.resize();
    fitCards();
    view.querySelector('[data-tilt]').hidden = false;
    if (keep) three.setView(from2d, false);
    if (selected >= 0) { const keepOpen = selected; map.closePopup(); openCard3d(keepOpen); }
  }
  function show2d() {
    mode = '2d';
    view.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === '2d')));
    box3d.hidden = true;
    view.querySelector('#leonida-map').hidden = false;
    view.querySelector('[data-tilt]').hidden = true;
    map.invalidateSize();
    fitCards();
    if (three) {
      const v = three.view();
      map.setView(point(v.x, v.y), Math.max(map.getMinZoom(), homeZoom + (v.zoom - 9.2) / 0.95), { animate: false });
      const keepOpen = selected;
      const old = card3d;
      card3d = null; // removed for the switch, not closed by the reader
      old?.remove();
      three.select(-1);
      document.querySelectorAll('.map3d-popup').forEach((p) => p.remove());
      selected = keepOpen;
    }
    if (selected >= 0) markers[selected].openPopup();
  }
  function resetView() {
    if (mode === '3d' && three) three.reset();
    else map.flyToBounds(bounds, { duration: flyMs(0.8) });
  }
  function toggleFullscreen() {
    const page = view.querySelector('.map-page');
    if (document.fullscreenElement) document.exitFullscreen?.();
    else page.requestFullscreen?.().catch(() => say('Full screen is not available here.'));
  }
  function saveView() {
    const v = mode === '3d' && three ? { mode: '3d', ...three.view() } : { mode: '2d', ...(() => { const [x, y] = toXY(map.getCenter()); return { x, y, zoom: map.getZoom() }; })() };
    const near = (config.places || []).reduce((best, pl) => {
      const d = Math.hypot(pl.x - v.x, pl.y - v.y);
      return !best || d < best.d ? { d, name: pl.name } : best;
    }, null);
    const views = UserStore.get('map-views', []);
    UserStore.set('map-views', [...views, { id: Date.now().toString(36), name: `${v.mode.toUpperCase()} view${near ? ` near ${near.name}` : ''}`, ...v, at: Date.now() }]);
    say('View saved. Find it under Saved.');
  }
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view], [data-street], [data-swap], [data-reset], [data-full], [data-saveview], [data-layers], [data-immersive], [data-tilt]');
    if (!b || b.closest('.map-card')) return;
    if (b.dataset.layers !== undefined) {
      layersPanel.hidden = !layersPanel.hidden;
      b.setAttribute('aria-expanded', String(!layersPanel.hidden));
      if (!layersPanel.hidden) layersPanel.querySelector('input')?.focus();
      return;
    }
    if (b.dataset.immersive !== undefined) { setImmersive(!immersive); return; }
    if (b.dataset.tilt !== undefined) { const tilted = three?.tilt(); b.setAttribute('aria-pressed', String(!tilted)); return; }
    if (b.dataset.view === '3d') show3d();
    else if (b.dataset.view === '2d') show2d();
    else if (b.dataset.street !== undefined) setPhotos(!showingPhotos);
    else if (b.dataset.reset !== undefined) resetView();
    else if (b.dataset.full !== undefined) toggleFullscreen();
    else if (b.dataset.saveview !== undefined) saveView();
    else { walker = walker === 'jason' ? 'lucia' : 'jason'; syncWalker(); }
  });

  // The walker: drag it onto the map (or press it, then click a spot) to open Street Explorer there.
  const walkerButton = view.querySelector('[data-walker]');
  let ghost = null;
  let armed = false;
  const spotAt = (e) => {
    if (mode === '3d' && three) return three.xyAt(e.clientX, e.clientY);
    return toXY(map.mouseEventToLatLng(e));
  };
  const overMap = (e) => {
    const r = (mode === '3d' ? box3d : view.querySelector('#leonida-map')).getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  const arm = (on) => {
    armed = on;
    wrap.classList.toggle('is-armed', on);
    if (on) say(`Click a spot on the map to drop ${walker === 'jason' ? 'Jason' : 'Lucia'} there. Press Escape or the walker again to cancel.`);
    else if (wasArmed) say('Cancelled.');
  };
  let wasArmed = false;
  // Escape puts the walker back (before immersive mode sees the key).
  const onWalkerKey = (e) => { if (e.key === 'Escape' && armed) { e.preventDefault(); e.stopPropagation(); wasArmed = true; arm(false); wasArmed = false; } };
  document.addEventListener('keydown', onWalkerKey, true);
  onLeave(() => document.removeEventListener('keydown', onWalkerKey, true));
  walkerButton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    walkerButton.setPointerCapture(e.pointerId);
    ghost = document.createElement('img');
    ghost.className = 'walker-ghost';
    ghost.src = walkerSrc();
    ghost.alt = '';
    ghost.dataset.x = String(e.clientX);
    ghost.dataset.y = String(e.clientY);
    document.body.append(ghost);
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    wrap.classList.add('is-walking');
    if (!showingPhotos) { setPhotos(true); ghost.dataset.temp = '1'; }
  });
  walkerButton.addEventListener('pointermove', (e) => {
    if (!ghost) return;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
  });
  const endDrag = (e) => {
    if (!ghost) return;
    const moved = Math.hypot(e.clientX - Number(ghost.dataset.x), e.clientY - Number(ghost.dataset.y)) > 12;
    const temp = ghost.dataset.temp && !explore;
    ghost.remove();
    ghost = null;
    wrap.classList.remove('is-walking');
    if (moved && overMap(e)) {
      const [x, y] = spotAt(e);
      if (temp) setPhotos(false);
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) openStreet(x, y);
    } else if (!moved) {
      // A press without a drag (or Enter on the keyboard): the next click on the map drops the walker
      // there. Pressing it again while it waits puts it back.
      if (armed) { wasArmed = true; arm(false); wasArmed = false; if (temp) setPhotos(false); } else arm(true);
    } else if (temp) setPhotos(false);
  };
  walkerButton.addEventListener('pointerup', endDrag);
  walkerButton.addEventListener('pointercancel', endDrag);
  walkerButton.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (armed) { wasArmed = true; arm(false); wasArmed = false; } else { setPhotos(true); arm(true); }
  });
  wrap.addEventListener('click', (e) => {
    if (!armed || !overMap(e) || e.target.closest('.walker-dock, .map-tools')) return;
    arm(false);
    const [x, y] = spotAt(e);
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) { e.stopPropagation(); e.preventDefault(); openStreet(x, y); }
  }, true);

  // Each flight has a number; a card opens only for the latest one, so a flight cut short by the
  // next choice never opens the earlier place's card.
  let flight = 0;
  const flyTo = (index) => {
    const pin = pins[index];
    if (!pin) return;
    if (off.has(pin.category)) { off.delete(pin.category); map.addLayer(layers[pin.category]); drawLists(); applyFilterToMap(); }
    selected = index;
    const ticket = ++flight;
    if (mode === '3d' && three) {
      three.flyTo(pin.x, pin.y);
      // With reduced or no motion the camera jumps at once and its moveend has already fired.
      if (three.map.isMoving()) three.map.once('moveend', () => { if (ticket === flight) openCard3d(index); });
      else openCard3d(index);
      return;
    }
    map.flyTo(point(pin.x, pin.y), Math.max(map.getZoom(), categoryOf.get(pin.category).zoom), { duration: flyMs(1.1) });
    map.once('moveend', () => { if (ticket === flight) markers[index].openPopup(); });
  };

  // ---------- route planner: numbered stops joined by straight lines (not roads) ----------
  let stops = [];
  const routeBox = view.querySelector('.map-route');
  const routeLayer = L.layerGroup().addTo(map);
  function drawRoute() {
    routeLayer.clearLayers();
    if (stops.length > 1) L.polyline(stops.map((s) => point(s.x, s.y)), { color: '#ffd166', weight: 4, dashArray: '8 8', interactive: false }).addTo(routeLayer);
    stops.forEach((s, k) => L.marker(point(s.x, s.y), { icon: L.divIcon({ className: 'route-stop', html: `<span>${k + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }), interactive: false }).addTo(routeLayer));
    three?.route(stops);
    routeBox.hidden = !stops.length;
    routeBox.innerHTML = stops.length ? `<h2>Route <span class="muted">${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}</span></h2>
      <ol>${stops.map((s, k) => `<li><span class="route-n">${k + 1}</span><span class="route-name">${esc(s.name)}</span>
        <span class="route-btns"><button type="button" data-stop-up="${k}" aria-label="Move ${esc(s.name)} up" ${k === 0 ? 'disabled' : ''}>${icon('chevron-down', 'flip')}</button><button type="button" data-stop-down="${k}" aria-label="Move ${esc(s.name)} down" ${k === stops.length - 1 ? 'disabled' : ''}>${icon('chevron-down')}</button><button type="button" data-stop-del="${k}" aria-label="Remove ${esc(s.name)}">${icon('close')}</button></span></li>`).join('')}</ol>
      <p class="muted route-note">An approximate map route: straight lines between the stops on Rockstar's map, not roads. No distance or travel time is given, because pin positions are approximate.</p>
      <form class="route-save"><input name="name" placeholder="Name this route" aria-label="Route name" maxlength="60" required><button class="btn btn-small">Save route</button><button type="button" class="link-btn" data-stop-clear>Clear</button></form>` : '';
  }
  // Editing the route by hand ends a planned run's narrowing of the lists and map.
  const endRun = () => { if (runOnly) { runOnly = null; drawLists(); applyFilterToMap(); } };
  const addStop = (s) => { endRun(); stops = [...stops, s]; drawRoute(); say(`${s.name} added to the route (stop ${stops.length}).`); };
  routeBox.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = Number(b.dataset.stopUp ?? b.dataset.stopDown ?? b.dataset.stopDel);
    if (b.dataset.stopUp !== undefined) [stops[k - 1], stops[k]] = [stops[k], stops[k - 1]];
    else if (b.dataset.stopDown !== undefined) [stops[k + 1], stops[k]] = [stops[k], stops[k + 1]];
    else if (b.dataset.stopDel !== undefined) { stops.splice(k, 1); endRun(); }
    else if (b.dataset.stopClear !== undefined) { stops = []; endRun(); }
    else return;
    drawRoute();
  });
  // Robbery runs: every target of one kind, in a short order, as the route above.
  const plan = view.querySelector('.heist-plan');
  function planRun(key) {
    const type = ROBBERY_TYPES.find((t) => t.key === key);
    if (!type) { say('That robbery type is not on the list.'); return; }
    const targets = pins.filter(type.test);
    if (!targets.length) { say('No pins of that kind are on the map.'); return; }
    const start = selected >= 0 ? pins[selected] : (() => { const [x, y] = toXY(map.getCenter()); return { x, y }; })();
    const run = shortRun(targets, start, state.wiki.map.width, state.wiki.map.height);
    stops = run.map((p) => ({ name: p.name, x: p.x, y: p.y, ref: p.ref || '' }));
    drawRoute();
    runOnly = new Set(targets.map((p) => pins.indexOf(p)));
    filter.value = '';
    drawLists();
    applyFilterToMap();
    if (plan) {
      plan.querySelector('[data-plan-type]').value = type.key;
      plan.querySelector('[data-plan-guide]').href = `#/manual/robbery-planner/${type.page}`;
    }
    map.flyToBounds(L.latLngBounds(stops.map((st) => point(st.x, st.y))).pad(0.2), { duration: flyMs(0.9), maxZoom: 3 });
    say(`${type.label}: ${stops.length} stops in a short order. Reorder or save it below.`);
  }
  plan?.addEventListener('click', (e) => { if (e.target.closest('[data-plan-go]')) planRun(plan.querySelector('[data-plan-type]').value); });
  plan?.addEventListener('change', (e) => {
    if (!e.target.matches('[data-plan-type]')) return;
    const type = ROBBERY_TYPES.find((t) => t.key === e.target.value);
    if (type) plan.querySelector('[data-plan-guide]').href = `#/manual/robbery-planner/${type.page}`;
  });
  routeBox.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value.trim() || 'My route';
    UserStore.set('routes', [...UserStore.get('routes', []), { id: Date.now().toString(36), name, stops, at: Date.now() }]);
    say(`Route "${name}" saved. Find it under Saved.`);
  });

  // Card buttons (both maps' cards live inside the map area).
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('.map-card [data-act]');
    if (!b) return;
    const i = Number(b.closest('.map-card').dataset.pin);
    const pin = pins[i];
    if (!pin) return;
    const act = b.dataset.act;
    if (act === 'fav') {
      const on = UserStore.toggle('favourites', pinKey(pin));
      UserStore.set('favourite-pins', { ...UserStore.get('favourite-pins', {}), [pinKey(pin)]: { name: pin.keyName || pin.name, ...(pin.spoilerMarker ? { spoiler: true } : {}), x: pin.x, y: pin.y, ref: pin.ref || '', kind: pin.kind || categoryOf.get(pin.category).label } });
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.innerHTML = favLabel(on);
    } else if (act === 'found') {
      const on = UserStore.toggle('discovered', foundKey(pin));
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.innerHTML = foundLabel(on);
      drawLists(); // the tick in the lists and the category's count (the open pin stays until its card closes)
    } else if (act === 'collect') {
      // Kept under its real name, marked as a spoiler; shown under the name the map shows now.
      openCollectionPicker({ key: pinKey(pin), name: pin.keyName || pin.name, label: pin.name, spoiler: pin.spoilerMarker, x: pin.x, y: pin.y, ref: pin.ref || '' });
    } else if (act === 'route') {
      addStop({ name: pin.name, x: pin.x, y: pin.y, ref: pin.ref || '' });
    } else if (act === 'street') {
      openStreet(pin.x, pin.y);
    } else if (act === 'go') {
      flyTo(Number(b.dataset.to));
    }
  });

  // ---------- map intelligence: overlays, related places, the nearby-only filter ----------
  function relatedOf(i) {
    const entry = pins[i]?.target?.entry;
    if (!entry || pins[i].hidden) return [];
    const refs = new Set((entry.related || []).map(resolve).filter(Boolean).map((t) => `${t.section}/${t.entry.slug}`));
    if (!refs.size) return [];
    // An entry with several places (a bank's branches) is shown once, at its branch nearest this pin.
    const { width, height } = state.wiki.map;
    const far = (j) => Math.hypot((pins[j].x - pins[i].x) * width, (pins[j].y - pins[i].y) * height);
    const best = new Map();
    pins.forEach((p, j) => {
      if (j === i || !p.ref || !refs.has(p.ref) || p.hidden) return;
      const had = best.get(p.ref);
      if (had === undefined || far(j) < far(had)) best.set(p.ref, j);
    });
    return [...best.values()];
  }
  const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent-pink-strong').trim() || '#ff6f9e';
  const OVERLAY_KEYS = ['density', 'names', 'links', 'certainty'];
  const overlays = new Set((prefs.get('map-overlays') ?? 'links').split(',').filter((k) => OVERLAY_KEYS.includes(k)));
  const layersPanel = view.querySelector('.map-layers-panel');
  const legend = view.querySelector('.map-legend');
  const densityLayer = L.layerGroup().addTo(map);
  const linkLayer = L.layerGroup().addTo(map);
  const namesLayer = L.layerGroup((config.places || []).map((pl) => L.marker(point(pl.x, pl.y), {
    icon: L.divIcon({ className: `place-label place-${pl.kind}`, html: `<span>${esc(pl.name)}</span>`, iconSize: [0, 0] }), interactive: false, keyboard: false,
  })));
  const shownPins = () => pins.map((_, i) => i).filter((i) => visible(i) && !pins[i].hidden && pins[i].category !== 'regions' && pins[i].category !== 'districts');
  function drawDensity() {
    densityLayer.clearLayers();
    const on = overlays.has('density');
    three?.density(on);
    if (!on) return;
    const cols = 30;
    const rows = Math.round((cols * config.height) / config.width);
    const grid = new Map();
    for (const i of shownPins()) {
      const k = `${Math.min(cols - 1, Math.floor(pins[i].x * cols))},${Math.min(rows - 1, Math.floor(pins[i].y * rows))}`;
      grid.set(k, (grid.get(k) || 0) + 1);
    }
    const most = Math.max(1, ...grid.values());
    const colour = accentColor();
    for (const [k, n] of grid) {
      const [cx, cy] = k.split(',').map(Number);
      L.rectangle(L.latLngBounds(point(cx / cols, (cy + 1) / rows), point((cx + 1) / cols, cy / rows)), {
        stroke: false, fillColor: colour, fillOpacity: 0.1 + 0.5 * (n / most), interactive: false, className: 'density-cell',
      }).addTo(densityLayer);
    }
  }
  function drawLinks(i) {
    linkLayer.clearLayers();
    three?.links([]);
    if (i < 0 || !overlays.has('links')) return;
    const rel = relatedOf(i);
    const colour = accentColor();
    rel.forEach((j) => L.polyline([point(pins[i].x, pins[i].y), point(pins[j].x, pins[j].y)], { color: colour, weight: 2.5, dashArray: '2 7', lineCap: 'round', interactive: false, className: 'rel-line' }).addTo(linkLayer));
    three?.links(rel.map((j) => [pins[i], pins[j]]));
  }
  function drawLegend() {
    const parts = [];
    if (overlays.has('certainty')) parts.push('<div><i class="lg-gs"></i>From Gamersky\'s map</div><div><i class="lg-hand"></i>Placed by hand on Rockstar\'s map</div><p>All positions are approximate; none is a surveyed in-game coordinate.</p>');
    if (overlays.has('density')) parts.push('<div><i class="lg-heat"></i>More places close together</div>');
    if (overlays.has('links')) parts.push('<div><i class="lg-link"></i>Related to the open pin</div>');
    legend.innerHTML = parts.join('');
    legend.hidden = !parts.length;
  }
  function applyOverlays() {
    if (overlays.has('names')) namesLayer.addTo(map); else map.removeLayer(namesLayer);
    three?.names(overlays.has('names'), config.places || []);
    map.getContainer().classList.toggle('show-certainty', overlays.has('certainty'));
    drawDensity();
    drawLinks(selected);
    drawLegend();
    layersPanel.querySelectorAll('[data-overlay]').forEach((c) => { c.checked = overlays.has(c.dataset.overlay); });
  }
  const detailBox = layersPanel.querySelector('[data-detail]');
  if (detailBox) detailBox.checked = prefs.get('map-detail') !== '0';
  layersPanel.addEventListener('change', (e) => {
    if (e.target.dataset.detail !== undefined && detail) {
      prefs.set('map-detail', e.target.checked ? '1' : '0');
      if (e.target.checked) detail.addTo(map); else map.removeLayer(detail);
      return;
    }
    const key = e.target.dataset.overlay;
    if (!key) return;
    if (e.target.checked) overlays.add(key); else overlays.delete(key);
    prefs.set('map-overlays', [...overlays].join(','));
    applyOverlays();
  });
  let nearOnly = false;
  const nearCentre = () => {
    if (selected >= 0) return [pins[selected].x, pins[selected].y];
    if (mode === '3d' && three) { const v = three.view(); return [v.x, v.y]; }
    return toXY(map.getCenter());
  };
  function pinOpened(i) {
    document.dispatchEvent(new CustomEvent('hq:pin-open', { detail: pins[i] }));
    view.querySelectorAll('.map-lists [data-marker]').forEach((b) => b.classList.toggle('is-selected', Number(b.dataset.marker) === i));
    drawLinks(i);
    if (nearOnly) drawLists();
    drawHud();
  }

  // ---------- immersive mode: the map alone, with floating controls ----------
  const page = view.querySelector('.map-page');
  const hud = view.querySelector('.immersive-hud');
  let immersive = false;
  function drawHud() {
    if (!immersive || state.map !== map) return;
    const [cx, cy] = nearCentre();
    // The same place can be pinned from two sections (a shop and its chain): list it once.
    const named = new Set();
    const near = nearbyPins(pins, cx, cy, 40).filter((n) => visible(n.i) && n.i !== selected && !named.has(pins[n.i].name) && named.add(pins[n.i].name)).slice(0, 8);
    hud.querySelector('.hud-near').innerHTML = near.length
      ? near.map((n) => `<li><button type="button" data-marker="${n.i}">${dot(pins[n.i])}<span>${esc(pins[n.i].name)}</span><small>${esc(pins[n.i].kind || categoryOf.get(pins[n.i].category).label)}</small></button></li>`).join('')
      : '<li class="muted">No pins near here. Move the map or pick a wider "nearby" in Settings.</li>';
  }
  function setImmersive(on) {
    immersive = on;
    page.classList.toggle('is-immersive', on);
    document.body.classList.toggle('map-immersive', on);
    hud.hidden = !on;
    view.querySelectorAll('.map-tools [data-immersive]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    setTimeout(() => {
      map.invalidateSize({ animate: false });
      three?.map.resize();
      if (on && selected >= 0) flyTo(selected);
      drawHud();
    }, 80);
    if (on) hud.querySelector('.hud-filter').focus();
    else view.querySelector('.map-tools [data-immersive]')?.focus();
  }
  const onImmersiveKey = (e) => {
    if (!page.isConnected) { document.removeEventListener('keydown', onImmersiveKey); return; }
    if (e.key === 'Escape' && immersive && !document.querySelector('.sv') && !e.defaultPrevented) { e.preventDefault(); setImmersive(false); }
  };
  document.addEventListener('keydown', onImmersiveKey);
  onLeave(() => document.removeEventListener('keydown', onImmersiveKey));
  hud.addEventListener('click', (e) => {
    const b = e.target.closest('[data-marker]');
    if (b) flyTo(Number(b.dataset.marker));
  });
  hud.querySelector('.hud-filter').addEventListener('input', (e) => {
    filter.value = e.target.value;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(drawLists, 120);
  });
  map.on('moveend', drawHud);
  applyOverlays();

  // ---------- sidebar: one list per category with its count; the filter narrows every list and the map ----------
  const side = view.querySelector('.map-side');
  const lists = side.querySelector('.map-lists');
  const filter = side.querySelector('.map-filter');
  const names = pins.map((pin) => `${pin.name} ${pin.kind} ${categoryOf.get(pin.category).label}`.toLowerCase());
  // The count is of pins actually on the map: categories switched off are left out, and said so.
  let lastCount = null;
  function drawCount() {
    if (!lastCount) return;
    const { matches, narrowed } = lastCount;
    const shownCount = matches.filter((i) => !off.has(pins[i].category) && !doneHidden(i)).length;
    const onMap = pins.filter((p, i) => !off.has(p.category) && !doneHidden(i)).length;
    const doneN = hideFound ? pins.filter((p, i) => !off.has(p.category) && doneHidden(i)).length : 0;
    const notes = [off.size ? `${off.size} ${off.size === 1 ? 'category' : 'categories'} hidden` : '', doneN ? `${doneN} discovered hidden` : ''].filter(Boolean);
    const hiddenNote = notes.length ? ` (${notes.join(', ')})` : '';
    side.querySelector('.map-count').textContent = narrowed
      ? `${shownCount} of ${onMap} pins ${nearOnly ? 'nearby' : 'match'}${hiddenNote}`
      : `${onMap} ${onMap === 1 ? 'pin' : 'pins'}${notes.length ? ` of ${pins.length}${hiddenNote}` : ''}`;
  }
  function drawLists() {
    const words = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
    let matches = pins.map((_, i) => i).filter((i) => words.every((w) => names[i].includes(w)));
    // A planned robbery run narrows the lists and the map to its own stops (typing clears it).
    if (runOnly && !words.length) matches = matches.filter((i) => runOnly.has(i));
    const narrowed = Boolean(words.length || nearOnly || (runOnly && !words.length));
    if (nearOnly) {
      const [cx, cy] = nearCentre();
      const close = new Set(nearbyPins(pins, cx, cy, pins.length).map((n) => n.i));
      if (selected >= 0) close.add(selected);
      matches = matches.filter((i) => close.has(i));
    }
    filtered = narrowed ? new Set(matches) : null;
    side.querySelector('[data-clear]').hidden = !words.length;
    lastCount = { matches, narrowed };
    drawCount();
    lists.innerHTML = categories.map((c) => {
      const all = pins.filter((pin) => pin.category === c.key).length;
      const foundN = pins.reduce((n, pin, i) => n + (pin.category === c.key && isFound(i) ? 1 : 0), 0);
      const mine = matches.filter((i) => pins[i].category === c.key && !doneHidden(i));
      const trackable = c.key !== 'regions' && c.key !== 'districts';
      // While filtering, show every match; otherwise a page, then "Show all".
      const listed = narrowed || expanded.has(c.key) ? mine : mine.slice(0, MAP_LIST_PAGE);
      if (narrowed && !mine.length) return '';
      return `<section data-category="${esc(c.key)}">
        <div class="map-cat-head">
          <label class="map-toggle"><input type="checkbox" ${off.has(c.key) ? '' : 'checked'} data-toggle="${esc(c.key)}">
            <span>${esc(c.label)}</span>
            <b class="map-n">${words.length ? `${mine.length}/${all}` : all}</b></label>
          ${trackable && foundN ? `<span class="map-found" title="${foundN} of ${all} marked discovered">${icon('check-circle')}${foundN}/${all}</span>` : ''}
          <span class="map-cat-tools">
            <button type="button" class="link-btn" data-only="${esc(c.key)}" aria-label="Show only ${esc(c.label)}" data-tip="Show only this kind">Only</button>
            ${trackable ? `<button type="button" class="link-btn" data-next="${esc(c.key)}" aria-label="Next ${esc(c.label)} not yet discovered" data-tip="Fly to the next one you have not marked discovered">Next</button>` : ''}
          </span>
        </div>
        <ul class="${off.has(c.key) ? 'is-off' : ''}">${listed.map((i) => `<li><button type="button" data-marker="${i}" class="${i === selected ? 'is-selected' : ''}" title="${esc(pins[i].name)}${pins[i].kind ? ` (${esc(pins[i].kind)})` : ''}">${dot(pins[i])}<span class="row-name">${esc(pins[i].name)}</span>${isFound(i) ? `<span class="found-mark" title="Discovered">${icon('check-circle')}</span>` : ''}${UserStore.has('favourites', pinKey(pins[i])) ? `<span class="fav-star" title="Favourite">${icon('star-fill')}</span>` : ''}${pins[i].kind && pins[i].kind !== c.label ? `<small>${esc(pins[i].kind)}</small>` : ''}</button></li>`).join('')}</ul>
        ${listed.length < mine.length ? `<button type="button" class="map-more" data-expand="${esc(c.key)}">Show all ${mine.length}</button>` : ''}
      </section>`;
    }).join('') || `<p class="muted">${nearOnly ? 'No pins near here. Pick a wider "nearby" or move the map.' : words.length ? 'No pin matches that.' : 'No pins yet.'}</p>`;
    applyFilterToMap();
  }
  drawLists();

  /** Flies to the next pin of a kind not yet marked discovered, after the open one, going round. */
  function nextUnfound(key) {
    const label = categoryOf.get(key)?.label || key;
    const pool = pins.map((_, i) => i).filter((i) => pins[i].category === key && !isFound(i) && (!filtered || filtered.has(i)));
    if (!pool.length) {
      side.querySelector('.map-count').textContent = `Every ${label} pin${filtered ? ' that matches' : ''} is marked discovered.`;
      return;
    }
    if (off.has(key)) { setCategory(key, true); drawLists(); }
    const inKind = pins[selected]?.category === key;
    const i = (inKind ? pool.find((n) => n > selected) : undefined) ?? pool[0];
    if (narrow()) setSide(false);
    flyTo(i);
  }

  let filterTimer;
  filter.addEventListener('input', () => {
    runOnly = null; // typing a search replaces a planned run's narrowing
    clearTimeout(filterTimer);
    filterTimer = setTimeout(drawLists, 120);
  });
  const setCategory = (key, on) => {
    if (!layers[key]) return;
    if (on) { off.delete(key); map.addLayer(layers[key]); } else { off.add(key); map.removeLayer(layers[key]); }
  };
  const pageEl = view.querySelector('.map-page');
  const setSide = (open) => {
    pageEl.classList.toggle('is-side-open', open);
    view.querySelector('.map-side-toggle').setAttribute('aria-expanded', String(open));
    if (open) side.querySelector('.map-filter').focus();
  };
  view.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => setSide(!pageEl.classList.contains('is-side-open'))));
  const narrow = () => matchMedia('(max-width: 900px)').matches;
  side.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.marker !== undefined && narrow()) setSide(false);
    if (button.dataset.marker !== undefined) flyTo(Number(button.dataset.marker));
    if (button.dataset.expand) { expanded.add(button.dataset.expand); drawLists(); }
    if (button.dataset.all) { categories.forEach((c) => setCategory(c.key, button.dataset.all === 'on')); drawLists(); }
    if (button.dataset.only) {
      // Pressed again while it is already the only kind shown: everything comes back.
      const key = button.dataset.only;
      const already = !off.has(key) && categories.every((c) => c.key === key || off.has(c.key));
      categories.forEach((c) => setCategory(c.key, already || c.key === key));
      drawLists();
      side.querySelector(`[data-only="${CSS.escape(key)}"]`)?.focus();
    }
    if (button.dataset.next) nextUnfound(button.dataset.next);
    if (button.dataset.clear !== undefined) { filter.value = ''; drawLists(); filter.focus(); }
  });
  side.addEventListener('change', (e) => {
    if (e.target.dataset.nearOnly !== undefined) { nearOnly = e.target.checked; drawLists(); return; }
    if (e.target.dataset.hideFound !== undefined) { hideFound = e.target.checked; prefs.set('map-hide-found', hideFound ? '1' : '0'); drawLists(); return; }
    if (e.target.dataset.nearRadius !== undefined) { prefs.set('near-radius', e.target.value); drawLists(); return; }
    const key = e.target.dataset.toggle;
    if (!key) return;
    setCategory(key, e.target.checked);
    side.querySelector(`[data-category="${CSS.escape(key)}"] ul`)?.classList.toggle('is-off', !e.target.checked);
    applyFilterToMap();
    drawCount();
  });

  // Right-click anywhere to read off a position, ready to paste into an entry as "x" and "y".
  map.on('contextmenu', (e) => {
    const [x, y] = toXY(e.latlng);
    if (![x, y].every((v) => v >= 0 && v <= 1)) return;
    L.popup({ maxWidth: 280 }).setLatLng(e.latlng).setContent(`<div class="map-card">
        <span class="kicker">Map position</span>
        <p><code>"x": ${x.toFixed(3)}, "y": ${y.toFixed(3)}</code></p>
        <p>Add these to an entry in the data files to pin it here.</p>
      </div>`).openOn(map);
  });

  // ---------- what the address asks for ----------
  // `?focus=` takes a pin name (as before) or an entry reference such as businesses/fleeca.
  const focus = params.get('focus');
  const focusIndex = focus ? pins.findIndex((pin) => pin.name === focus || pin.ref === focus || pinKey(pin) === focus) : -1;
  if (focusIndex >= 0) setTimeout(() => { if (state.map === map) flyTo(focusIndex); }, 300); // not after the page has changed
  // `?kind=` (from a 100% Guide page) lists one kind of place and frames all of its pins.
  const kind = params.get('kind');
  const ofKind = kind ? pins.filter((pin) => pin.kind === kind) : [];
  if (ofKind.length) {
    filter.value = kind;
    drawLists();
    setTimeout(() => state.map === map && map.flyToBounds(L.latLngBounds(ofKind.map((pin) => point(pin.x, pin.y))).pad(0.2), { duration: flyMs(0.9), maxZoom: 3 }), 300);
  }
  if (params.get('q')) { filter.value = params.get('q'); drawLists(); }
  if (params.get('plan') && plan && !params.get('q')) { plan.open = true; setTimeout(() => { if (state.map === map) planRun(params.get('plan')); }, 350); }
  // `?route=`, `?view=` and `?street=` reopen something saved.
  const savedRoute = UserStore.get('routes', []).find((r) => r.id === params.get('route'));
  if (savedRoute) {
    stops = savedRoute.stops.map((s) => ({ ...s }));
    drawRoute();
    if (stops.length) setTimeout(() => state.map === map && map.flyToBounds(L.latLngBounds(stops.map((s) => point(s.x, s.y))).pad(0.3), { duration: flyMs(0.9), maxZoom: 3 }), 300);
  }
  const savedView = UserStore.get('map-views', []).find((v) => v.id === params.get('view'));
  const startMode = savedView?.mode || params.get('mode') || prefs.get('map-mode');
  if (startMode === '3d' && !explore) {
    show3d().then(() => { if (savedView && three) three.setView(savedView, false); });
  } else if (savedView) {
    map.setView(point(savedView.x, savedView.y), savedView.zoom, { animate: false });
  }
  const street = (params.get('street') || '').split(',').map(Number);
  if (street.length === 2 && street.every((v) => v >= 0 && v <= 1)) {
    if (params.get('walker') === 'lucia' || params.get('walker') === 'jason') { walker = params.get('walker'); syncWalker(); }
    setTimeout(() => openStreet(street[0], street[1]), 350);
  }
  if (explore) { setPhotos(true); }
  if (params.get('immersive') === '1') setImmersive(true);
}

// ---------- search ----------

const SEARCH_PAGE = 50;
let searchTimer;
function renderSearch(params) {
  const query = params.get('q') || '';
  let section = params.get('in') || '';
  const searchable = [...state.wiki.categories.map((c) => c.key), ...Object.keys(FIXED_LABELS)]
    .filter((key) => (state.wiki[key] || []).length);

  view.innerHTML = `
    ${pageHead('Search', 'Search every category at once, or pick one.')}
    <form class="search-big field-search" role="search">${icon('search')}<input type="search" value="${esc(query)}" placeholder="Try “Lucia”, “Keys” or “release date”" aria-label="Search" autofocus></form>
    <div class="chips" id="search-filter"></div>
    <div id="results" class="results">
      <div class="list-tools" hidden>
        <label class="list-sort"><span>Sort</span> <select aria-label="Sort results">
          <option value="">Best match</option><option value="name">Name A–Z</option></select></label>
        ${spoilerToggle()}
        <span class="list-count muted" role="status" aria-live="polite"></span>
      </div>
      <div class="list-body" aria-live="polite"></div>
      <button type="button" class="btn list-more" hidden></button>
    </div>`;
  const input = view.querySelector('.search-big input');
  const results = document.getElementById('results');
  const filter = document.getElementById('search-filter');
  const tools = results.querySelector('.list-tools');
  const sort = results.querySelector('select');
  const count = results.querySelector('.list-count');
  const body = results.querySelector('.list-body');
  const more = results.querySelector('.list-more');
  let loaded = 0; // results on the page for the current search

  const drawFilter = () => {
    filter.innerHTML = ['', ...searchable].map((key) => `<button type="button" aria-pressed="${key === section}" class="${key === section ? 'is-active' : ''}" data-section="${esc(key)}">${esc(key ? sectionLabel(key) : 'Everything')}</button>`).join('');
  };

  const row = (hit) => {
    const closed = hit.spoiler && !showSpoilers;
    return `<a class="result${hit.image ? ' has-thumb' : ''}" href="${entryLink(hit.section, hit.slug)}">
      ${hit.image ? `<div class="result-thumb"><img src="${esc(hit.image)}" alt="" loading="lazy"></div>` : ''}
      <div><div class="card-meta"><span class="kicker">${esc(sectionLabel(hit.section))}</span>${closed ? spoilerLabel : badge(hit.confidence)}</div>
        <h3>${esc(hit.name)}</h3><p>${closed ? SPOILER_HINT : esc(hit.summary)}</p></div>
    </a>`;
  };

  /** Fetch one page of results; `append` adds to what is already shown. */
  const run = async (append = false) => {
    const q = input.value;
    history.replaceState(null, '', `#/search?q=${encodeURIComponent(q)}${section ? `&in=${encodeURIComponent(section)}` : ''}`);
    if (!q.trim()) {
      tools.hidden = true;
      more.hidden = true;
      body.innerHTML = '<p class="muted">Start typing to search the whole wiki.</p>';
      return;
    }
    const offset = append ? loaded : 0;
    let page;
    try {
      page = await getJson(`/api/search?q=${encodeURIComponent(q)}&section=${encodeURIComponent(section)}`
        + `&limit=${SEARCH_PAGE}&offset=${offset}${sort.value ? `&sort=${sort.value}` : ''}${showSpoilers ? '&spoilers=true' : ''}`);
    } catch {
      tools.hidden = true;
      more.hidden = true;
      body.innerHTML = '<p class="muted">Search is not responding. Try again in a moment.</p>';
      return;
    }
    if (input.value !== q || !results.isConnected) return; // a newer search is already on its way
    loaded = offset + page.hits.length;
    tools.hidden = page.total === 0;
    more.hidden = loaded >= page.total || page.hits.length === 0;
    more.textContent = `Show ${Math.min(SEARCH_PAGE, page.total - loaded)} more (${page.total - loaded} left)`;
    count.textContent = loaded < page.total
      ? `Showing ${loaded} of ${page.total} results`
      : `${page.total} ${page.total === 1 ? 'result' : 'results'}`;
    // No entry had every word, so these match all but one: say so rather than pass them off as exact.
    if (page.partial) count.textContent += ' · close matches (no entry has every word you typed)';
    if (append) {
      body.insertAdjacentHTML('beforeend', page.hits.map(row).join(''));
    } else {
      body.innerHTML = page.total
        ? page.hits.map(row).join('')
        : `<p class="muted">Nothing found for “${esc(q)}”${section ? ` in ${esc(sectionLabel(section))}` : ''}.
          Try a character, a place or “price”${section ? ', or search everything' : ''}.</p>`;
      if (!section) showGuides(q);
    }
  };

  /** Field Manual pages that answer the search ("how to rob a bank"), shown above the entries. */
  const showGuides = async (q) => {
    if (!window.Manual?.findPages) return;
    let found = [];
    try { found = await window.Manual.findPages(q, state.wiki); } catch { return; }
    if (input.value !== q || !results.isConnected || section || !found.length) return;
    body.querySelector('.search-guides')?.remove();
    body.insertAdjacentHTML('afterbegin', `<section class="search-guides" aria-label="Field Manual pages">
      <h2>In the Field Manual</h2>
      <ul>${found.map((g) => `<li><a href="${esc(g.href)}"><b>${esc(g.title)}</b><span>${esc(g.chapter)} · page ${g.number}</span></a></li>`).join('')}</ul>
    </section>`);
  };

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(run, 150);
  });
  filter.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    section = button.dataset.section;
    drawFilter();
    run();
  });
  sort.addEventListener('change', () => run());
  more.addEventListener('click', () => run(true));
  view.querySelector('.search-big').addEventListener('submit', (e) => e.preventDefault());
  drawFilter();
  run();
  input.setSelectionRange(query.length, query.length);
}

function renderNotFound() {
  view.innerHTML = `${pageHead('Wasted', 'That page does not exist.')}<p class="block"><a class="btn btn-primary" href="#/">Back to HQ</a></p>`;
}

// ---------- router ----------

/** The window's title follows the page (its main heading), so the page is named for screen readers,
    the taskbar and history. Some pages finish drawing a moment later, so it is read again then. */
function nameWindow(page) {
  const apply = () => {
    const heading = page === 'home' ? '' : (view.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
    document.title = heading ? `${heading} | GTA 6 HQ` : 'GTA 6 HQ';
  };
  apply();
  const at = location.hash;
  setTimeout(() => { if (location.hash === at) apply(); }, 700);
}

/** Things a page set up outside its own elements (key listeners, timers), undone when the page changes. */
const leaving = [];
const onLeave = (fn) => leaving.push(fn);

function route() {
  leaving.splice(0).forEach((fn) => { try { fn(); } catch { /* the page is going anyway */ } });
  document.body.classList.remove('map-immersive');
  if (state.map) { state.map.remove(); state.map = null; }
  if (state.map3d) { try { state.map3d.destroy(); } catch { /* already gone */ } state.map3d = null; }
  const [path, queryString] = location.hash.replace(/^#\/?/, '').split('?');
  const [section, a, b] = path.split('/').map(decodeURIComponent);
  const params = new URLSearchParams(queryString || '');
  const name = section || 'home';

  document.body.dataset.page = name;
  const navName = name === 'wiki' && a === 'vehicles' ? 'vehicles' : name === 'wiki' && a === 'collectibles' ? 'tracker' : name;
  document.querySelectorAll('#nav a').forEach((link) => {
    const active = link.dataset.route === navName;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });

  const pages = {
    home: renderHome,
    wiki: () => (b ? renderEntry(a, b) : a ? renderCategory(a) : renderEncyclopedia()),
    characters: () => (a ? renderCharacter(a) : renderCharacters()),
    locations: () => (a ? renderLocation(a) : renderLocations()),
    vehicles: renderVehicles,
    media: renderMedia,
    map: () => renderMap(params),
    intel: renderIntel,
    search: () => renderSearch(params),
    // The Field Manual is its own reader (ui/manual.js).
    manual: () => Manual.render(view, a, b, params, state.wiki),
  };
  (pages[name] || (EXTRA_PAGES[name] && (() => EXTRA_PAGES[name](a, b, params))) || renderNotFound)();
  AFTER_RENDER.forEach((fn) => fn(name, a, b, params));
  nameWindow(name);

  if (state.wiki._loadError) {
    view.insertAdjacentHTML('afterbegin', `<p class="load-error" role="alert">${esc(state.wiki._loadError)}</p>`);
  }
  if (name !== 'search') window.scrollTo(0, 0);
  reportPresence(name);
}

const LEAVE_MS = 190;
let navigation = 0;
let shownSection = null;

/** Start the new page faded out and slightly raised, then let it settle into place. */
function enterView() {
  shownSection = document.body.dataset.page;
  markPastHero();
  view.classList.remove('is-leaving');
  view.classList.add('is-entering');
  // Reading a layout value makes the browser apply the starting state now, so removing the class
  // animates from it. This does not wait for a frame, so the page can never be left invisible.
  void view.offsetWidth;
  view.classList.remove('is-entering');
}

/** Change page with a fade: the old page fades out, the new one is drawn, then fades in. */
function navigate() {
  const next = location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0] || 'home';
  // Typing in Search and moving around the Map redraw the same page; fading those would flicker.
  if (next === shownSection && (next === 'search' || next === 'map')) { route(); return; }
  const mine = ++navigation;
  view.classList.add('is-leaving');
  setTimeout(() => {
    // A newer click has taken over: let that one draw the page.
    if (mine !== navigation) return;
    route();
    enterView();
  }, LEAVE_MS);
}

const PRESENCE_SECTIONS = {
  home: 'Home', wiki: 'Encyclopedia', characters: 'Characters', locations: 'Locations', vehicles: 'Vehicles',
  map: 'Interactive map', media: 'Media gallery', intel: 'Intel', search: 'Search', manual: 'Field Manual',
};

/** Tell the app which page is open, for Discord Rich Presence. Search terms are never sent. */
function reportPresence(name) {
  const section = PRESENCE_SECTIONS[name] || 'Encyclopedia';
  const title = view.querySelector('h1')?.textContent.trim() || '';
  let details = `Browsing ${section}`;
  if (name === 'home') details = 'On the home page';
  else if (name === 'search') details = 'Searching the wiki';
  else if (name === 'map') details = 'Exploring the map of Leonida';
  else if (title && title.toLowerCase() !== section.toLowerCase()) details = `Reading: ${title}`;
  fetch('/api/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ details, state: section }),
  }).catch(() => {});
}

document.getElementById('nav-search').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.elements.q;
  location.hash = `#/search?q=${encodeURIComponent(input.value)}`;
  input.value = '';
});

// ---------- shell: announcement bar and menu ----------

/** One line above the header, derived from the configured release date (never hard-coded). */
// The live wallpapers shown on Home, in the order they play.
const HERO_WALLPAPERS = [
  '/wallpapers/gta-vi-couple-on-muscle-car-pastel-palms.mp4',
  '/wallpapers/jason-and-lucia-vice-city-sunset-gta-vi.mp4',
  '/wallpapers/gta-vi-pier-showdown-jason-lucia.mp4',
  '/wallpapers/gta-6-dawn-of-the-heist.mp4',
  '/wallpapers/gta-vi-pink-neon-logo-reflection.mp4',
  '/wallpapers/gta-vi-jason-lucia-gas-station.mp4',
  '/wallpapers/gta-vi-cal-hampton-boat.mp4',
  '/wallpapers/gta-vi-boobie-ike-club.mp4',
  '/wallpapers/gta-vi-drequan-priest-jack-of-hearts.mp4',
  '/wallpapers/gta-vi-real-dimez-ocean-view.mp4',
  '/wallpapers/gta-vi-raul-bautista-duffel.mp4',
  '/wallpapers/gta-vi-brian-heder-boat-yard.mp4',
  '/wallpapers/gta-vi-jason-lucia-nightclub.mp4',
  '/wallpapers/gta-vi-jason-lucia-bank-robbery.mp4',
  '/wallpapers/gta-vi-hilltop-sunset.mp4',
  '/wallpapers/gta-vi-jason-lucia-car-window.mp4',
  '/wallpapers/gta-vi-rusty-anchor-bar.mp4',
  '/wallpapers/gta-vi-lucia-shootout-convertible.mp4',
  '/wallpapers/gta-vi-jason-lucia-convertible-night.mp4',
  '/wallpapers/gta-vi-jason-motorbike-police.mp4',
  '/wallpapers/gta-vi-jason-biker-standoff.mp4',
  '/wallpapers/gta-vi-dirt-bikes-hallway.mp4',
  '/wallpapers/gta-vi-canal-police-raid.mp4',
  '/wallpapers/gta-vi-dancer-money.mp4',
  '/wallpapers/gta-vi-dog-and-owner.mp4',
  '/wallpapers/gta-vi-trap-house-crew.mp4',
  '/wallpapers/gta-vi-tattooed-crew.mp4',
  '/wallpapers/gta-vi-ricardo-gas-station.mp4',
  '/wallpapers/gta-vi-dressing-room.mp4',
  '/wallpapers/gta-vi-car-meet-selfie.mp4',
  '/wallpapers/gta-vi-club-vip.mp4',
  '/wallpapers/gta-vi-vice-city-skyline-night.mp4',
  '/wallpapers/gta-vi-delights-cabaret.mp4',
];
const HERO_FADE_MS = 1400;
// ---------- inline spoilers ----------
// Whole entries marked `spoiler` are handled at the top of this file. This covers single
// phrases. Any text in the data files written as ||like this|| is a spoiler: it is covered until the
// reader clicks it (or presses Enter or Space on it), and a second click covers it again.
// It works wherever the text appears, because it is applied to whatever the page draws.
const SPOILER = /\|\|([^|]+?)\|\|/g;
function hideSpoilers(root) {
  if (root.closest && root.closest('.spoiler')) return; // the cover's own parts, just added
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.includes('||') && !node.parentElement.closest('.spoiler, script, style, textarea, input')) found.push(node);
  }
  for (const node of found) {
    const parts = node.nodeValue.split(SPOILER);
    if (parts.length < 3) continue;
    const piece = document.createDocumentFragment();
    parts.forEach((text, i) => {
      // With spoilers switched on the phrase is ordinary text.
      if (i % 2 === 0 || showSpoilers) { piece.append(text); return; }
      const cover = document.createElement('span');
      cover.className = 'spoiler';
      cover.tabIndex = 0;
      cover.setAttribute('role', 'button');
      cover.setAttribute('aria-label', 'Spoiler, hidden. Activate to show.');
      cover.innerHTML = `${EYE}<span class="spoiler-text"></span>`;
      cover.lastChild.textContent = text;
      piece.append(cover);
    });
    node.replaceWith(piece);
  }
}
const toggleSpoiler = (e) => {
  const cover = e.target.closest && e.target.closest('.spoiler');
  if (!cover || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  e.stopPropagation();
  const open = cover.classList.toggle('is-open');
  cover.setAttribute('aria-label', open ? 'Spoiler, shown. Activate to hide.' : 'Spoiler, hidden. Activate to show.');
};
document.addEventListener('click', toggleSpoiler, true);
document.addEventListener('keydown', toggleSpoiler, true);
new MutationObserver((changes) => {
  for (const change of changes) for (const node of change.addedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) hideSpoilers(node);
    else if (node.nodeType === Node.TEXT_NODE && node.parentElement && node.nodeValue.includes('||')) hideSpoilers(node.parentElement);
  }
}).observe(document.body, { childList: true, subtree: true });

/** Discord's logo mark, and the wallpapers that take turns behind the invitation on Home. */
const DISCORD_MARK = '<svg class="discord-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';
const PROMO_WALLS = ['/images/vice-city-sunset.jpg', '/images/muscle-car-pastel-palms.jpg', '/images/pier-showdown.jpg',
  '/images/dawn-of-the-heist.jpg', '/images/pink-neon-logo.jpg'];
const PROMO_EVERY_MS = 7000;
/** Cross-fade the invitation's wallpaper to the next one, for as long as the card is on the page. */
function startPromoWalls(card) {
  if (!card) return;
  const layers = [...card.querySelectorAll('.promo-walls img')];
  if (layers.length < 2) return; // the Store edition has a drawn background instead
  let front = 0, showing = 0;
  const timer = setInterval(() => {
    if (!card.isConnected) { clearInterval(timer); return; }
    showing = (showing + 1) % PROMO_WALLS.length;
    const next = layers[1 - front];
    next.src = PROMO_WALLS[showing];
    next.decode().catch(() => {}).then(() => {
      next.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
    });
  }, PROMO_EVERY_MS);
}

/** The community server's permanent invite. Also written in index.html (top bar and footer). */
const DISCORD_INVITE = 'https://discord.gg/YhMHr8N4an';

/** The version the notice on screen offers, or 'busy' once an update has started. */
let updateOffered = '';
/** How often an open app asks again. The app itself asks GitHub at most once every half hour. */
const UPDATE_RECHECK_MS = 30 * 60 * 1000;

/** Offer a newer release if GitHub has one. Dismissing it is remembered for that version. */
async function checkForUpdate() {
  if (updateOffered === 'busy') return;
  let status;
  try { status = await getJson('/api/update'); } catch { return; }
  const link = status.url || status.download;
  if (!status.available || !link) return;
  const key = 'update-dismissed';
  if (prefs.get(key) === status.latest) return;
  // Asked again while the app stays open: keep the notice that is already up, replace an older one.
  if (updateOffered === status.latest && document.querySelector('.update-toast')) return;
  document.querySelector('.update-toast')?.remove();
  updateOffered = status.latest;
  const toast = document.createElement('aside');
  toast.className = 'update-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<div><strong>Version ${esc(status.latest)} is available</strong>
      <span>You have ${esc(status.current)}.</span></div>
    ${status.can_install
      ? '<button type="button" class="btn btn-primary" data-update>Update now</button>'
      : `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Get the update</a>`}
    <button type="button" aria-label="Dismiss update notice">${icon('close')}</button>`;
  toast.querySelector('button[aria-label]').addEventListener('click', () => {
    prefs.set(key, status.latest);
    toast.remove();
  });
  toast.querySelector('[data-update]')?.addEventListener('click', () => { toast.remove(); updateOffered = 'busy'; beginUpdate(status); });
  document.body.append(toast);
}

// ---------- updating ----------
// Two parts. The core (`updater`) does the work and knows nothing about the page: it asks
// the app to download the new version's setup program from the release on GitHub, follows
// the download, and then asks the app to hand over to Setup, which closes the app, replaces
// it and opens it again. The stage (`mountUpdateStage`) is how Home shows it: the hero's
// own wallpaper stays and its title and countdown give way to the progress ring.
const megabytes = (bytes) => (bytes / 1048576).toFixed(1);
async function postJson(url) {
  const response = await fetch(url, { method: 'POST' });
  return response.json();
}

const updater = {
  /** idle, downloading, checking, ready or failed. */
  phase: 'idle',
  /** How far along, from 0 to 1. The download is the first 92%; checking and handing over are the rest. */
  share: 0,
  text: '',
  status: null,
  listeners: new Set(),
  get active() { return this.phase !== 'idle'; },
  /** Call `listener(updater)` on every change. Returns a function that stops it. */
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); },
  set(change) { Object.assign(this, change); this.listeners.forEach((listener) => listener(this)); },
  fail(reason) { this.set({ phase: 'failed', text: reason || 'The update could not be downloaded.' }); },
  /** Put the update aside. A download already running in the app is left to finish quietly. */
  dismiss() { this.set({ phase: 'idle', share: 0, text: '' }); },
  async start(status) {
    if (this.phase === 'downloading' || this.phase === 'checking' || this.phase === 'ready') return;
    this.set({ status, phase: 'downloading', share: 0, text: 'Starting the download…' });
    let now;
    try { now = await postJson('/api/update/download'); } catch { this.fail('The app stopped answering.'); return; }
    if (now.state === 'failed') { this.fail(now.error); return; }
    this.follow();
  },
  async follow() {
    while (this.active && this.phase !== 'failed') {
      let now;
      try { now = await getJson('/api/update/progress'); } catch { this.fail('The app stopped answering.'); return; }
      if (now.state === 'failed') { this.fail(now.error); return; }
      if (now.state === 'downloading') {
        this.set({
          phase: 'downloading',
          share: now.total ? 0.92 * now.received / now.total : 0,
          text: now.total ? `Downloading: ${megabytes(now.received)} of ${megabytes(now.total)} MB` : 'Downloading…',
        });
      } else if (now.state === 'checking') {
        this.set({ phase: 'checking', share: 0.96, text: 'Checking the download against the release…' });
      } else if (now.state === 'ready') {
        this.set({ phase: 'ready', share: 1, text: 'Ready. The app will close, update and open again.' });
        await new Promise((r) => setTimeout(r, 1200));
        if (this.phase !== 'ready') return;
        let started;
        try { started = await postJson('/api/update/install'); } catch { started = { started: true }; }
        if (started.started === false) this.fail(started.error);
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  },
};

// Police lights down both sides of the window for as long as an update is running, as if the
// cops are on you. There is nothing to see but the light itself, as a background: red and blue
// thrown in from each side, by turns, each flashing about 1.4 times a second (the 1 to 2 Hz
// that SAE recommends for emergency lamps) and washing over the page beside it. They belong to the update, not to Home, so they stay on whichever page
// is open, and go out when it finishes, fails or is put aside.
const policeLights = document.createElement('div');
policeLights.className = 'police-lights';
policeLights.setAttribute('aria-hidden', 'true');
policeLights.innerHTML = ['left', 'right'].map((side) => `<div class="copside copside-${side}">
    <i class="wash wash-a"></i><i class="wash wash-b"></i>
    <i class="edge edge-a"></i><i class="edge edge-b"></i>
  </div>`).join('');
document.body.append(policeLights);
updater.subscribe((now) => {
  document.body.classList.toggle('is-wanted', ['downloading', 'checking', 'ready'].includes(now.phase));
});

/** Begin an update and show it where it lives: on Home. */
function beginUpdate(status) {
  updater.start(status);
  if (location.hash === '#/' || location.hash === '' || location.hash === '#') navigate();
  else location.hash = '#/';
}

/** Home's hero as the update stage. Does nothing unless an update is under way. */
function mountUpdateStage(view) {
  const hero = view.querySelector('.hero');
  if (!hero || !updater.active) return;
  const status = updater.status || {};
  const RING = 2 * Math.PI * 46;
  hero.classList.add('is-updating');
  hero.querySelector('.hero-content').innerHTML = `
    <div class="update-stage" role="status" aria-live="polite">
      <div class="update-dial">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs><linearGradient id="update-sunset" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffc46b"/><stop offset="0.55" stop-color="#ee3f7c"/><stop offset="1" stop-color="#8b3fd9"/>
          </linearGradient></defs>
          <circle class="ring-track" cx="50" cy="50" r="46"/>
          <circle class="update-ring" cx="50" cy="50" r="46"/>
        </svg>
        <div class="update-coin"><img src="/images/gta6.png" alt=""><img src="/images/gta6.png" alt=""></div>
      </div>
      <div class="update-copy">
        <span class="kicker">Version ${esc(status.current || '')} to ${esc(status.latest || '')}</span>
        <h1 class="hero-title">Updating GTA 6 HQ</h1>
        <p class="update-percent">0%</p>
        <p class="update-step"></p>
        <div class="hero-actions update-actions"></div>
      </div>
    </div>`;
  const cue = hero.querySelector('.scroll-cue');
  if (cue) cue.hidden = true;
  const ring = hero.querySelector('.update-ring');
  const percent = hero.querySelector('.update-percent');
  const step = hero.querySelector('.update-step');
  const actions = hero.querySelector('.update-actions');
  ring.style.strokeDasharray = RING;
  let shown = '';
  const draw = () => {
    if (!hero.isConnected) { stop(); return; }
    if (!updater.active) { stop(); navigate(); return; }  // put aside: Home returns to normal
    ring.style.strokeDashoffset = RING * (1 - updater.share);
    percent.textContent = Math.round(updater.share * 100) + '%';
    step.textContent = updater.text;
    hero.classList.toggle('is-failed', updater.phase === 'failed');
    // The buttons change only when the phase does, so a click is never lost to a redraw.
    if (shown === updater.phase) return;
    shown = updater.phase;
    const link = status.url || status.download;
    actions.innerHTML = updater.phase === 'failed'
      ? `${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open the release page</a>` : ''}
         <button type="button" class="btn" data-dismiss>Back to Home</button>`
      : updater.phase === 'ready' ? '' : '<button type="button" class="btn" data-dismiss>Not now</button>';
    actions.querySelector('[data-dismiss]')?.addEventListener('click', () => updater.dismiss());
  };
  const stop = updater.subscribe(draw);
  draw();
}

function setupAnnouncement(game) {
  const bar = document.getElementById('announce');
  if (!bar) return; // the simpler top has no announcement strip
  // Out once the first region has launched (launchedAt); before that, this computer's own midnight.
  const release = new Date(game.launchedAt || `${game.releaseDate}T00:00:00`);
  if (Number.isNaN(release.getTime()) && !game.announcement) return;
  // "GTA VI • Leonida • Vice City", then the release state the data supports (date or "out now").
  const status = Number.isNaN(release.getTime()) ? '' : Date.now() < release ? `Coming ${formatDate(game.releaseDate)}` : 'Out now';
  const text = game.announcement || ['GTA VI', 'Leonida', 'Vice City', status].filter(Boolean).join('  •  ');

  let dismissed = false;
  try { dismissed = sessionStorage.getItem('announce-dismissed') === text; } catch { /* storage unavailable */ }
  const show = (visible) => {
    bar.hidden = !visible;
    document.documentElement.style.setProperty('--announce', `${visible ? bar.offsetHeight : 0}px`);
  };
  document.getElementById('announce-text').textContent = text;
  show(!dismissed);
  document.getElementById('announce-close').addEventListener('click', () => {
    try { sessionStorage.setItem('announce-dismissed', text); } catch { /* storage unavailable */ }
    show(false);
  });
}

// ---------- the desktop window ----------
// The desktop app has no title bar: these are its buttons, and the bars are what you drag.
// In a browser there is no `window.ipc`, so none of this is switched on.
// On macOS the window keeps the system's own buttons and edges, so only dragging is ours.
if (window.ipc?.postMessage) {
  const send = (message) => window.ipc.postMessage(message);
  const mac = window.__OS__ === 'macos';
  const controls = document.getElementById('window-controls');
  controls.hidden = mac;
  document.documentElement.classList.add('is-desktop');
  document.documentElement.dataset.os = window.__OS__ || 'windows';
  controls.addEventListener('click', (e) => {
    const button = e.target.closest('[data-window]');
    if (button) send(button.dataset.window);
  });

  // Drag the window by any empty part of the two bars, or anywhere on the splash screen while it
  // is showing (it covers the bars); double-click to maximise or restore.
  const onBar = (e) => e.target.closest('.topbar, .announce, #splash') && !e.target.closest('a, button, input, form, .window-controls');
  document.addEventListener('mousedown', (e) => { if (e.button === 0 && e.detail === 1 && onBar(e)) send('drag'); });
  document.addEventListener('dblclick', (e) => { if (onBar(e)) send('maximize'); });

  // Thin strips along the edges and corners stand in for the frame you would normally resize by.
  for (const edge of mac ? [] : ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
    const strip = document.createElement('div');
    strip.className = `resize-edge resize-${edge}`;
    strip.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); send(`resize:${edge}`); } });
    document.body.append(strip);
  }

  // Called by the app whenever the window changes size.
  window.setWindowState = (maximized) => {
    document.documentElement.classList.toggle('is-maximized', maximized);
    const button = controls.querySelector('[data-window="maximize"]');
    button.setAttribute('aria-label', maximized ? 'Restore' : 'Maximise');
    button.title = maximized ? 'Restore' : 'Maximise';
  };
}

const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav');
const setMenu = (open) => {
  nav.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
};
menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
});

// ---------- boot ----------

const ready = Promise.all([getJson('/api/wiki'), prefs.load(), UserStore.load()])
  .then(([wiki]) => {
    showSpoilers = prefs.get('show-spoilers') === '1';
    window.Appearance?.apply();
    syncSpoilerSwitch();
    wiki.categories ||= [
      { key: 'characters', label: 'Characters', blurb: '', art: 'portrait' },
      { key: 'locations', label: 'Locations', blurb: '', art: 'city' },
      { key: 'vehicles', label: 'Vehicles', blurb: '', art: 'port' },
    ];
    state.wiki = wiki;
    setupAnnouncement(wiki.game);
    checkForUpdate();
    // Keep asking while the app stays open, and when its window comes back into view, so a
    // release published in the meantime is offered without closing and reopening the app.
    setInterval(checkForUpdate, UPDATE_RECHECK_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
    syncRails();
    window.addEventListener('hashchange', navigate);
    route();
    enterView();
    // First opening: say that there are spoilers and ask. It waits for the intro to finish.
    if (prefs.get('spoiler-notice') !== '1') {
      if (document.getElementById('splash')) document.addEventListener('app-arrived', askAboutSpoilers, { once: true });
      else askAboutSpoilers();
    }
  })
  .catch((error) => {
    view.innerHTML = `${pageHead('Busted', 'The wiki data could not be loaded.')}<p class="block muted">${esc(error.message)}</p>`;
  });

// `?nosplash` opens straight on the app (used for screenshots and testing).
if (new URLSearchParams(location.search).has('nosplash')) {
  document.getElementById('splash').remove();
  document.body.classList.remove('is-loading');
} else {
  runSplash(ready);
}

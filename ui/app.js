// GTA 6 HQ front end: splash screen, hash router, and one render function per page.
// All content comes from the Rust server (/api/wiki, /api/search, /api/media, /api/health).

const view = document.getElementById('view');
const state = { wiki: null, map: null };

const FIXED_LABELS = { news: 'News', editions: 'Edition', faq: 'FAQ' };
const CONFIDENCE = {
  official: ['Official', 'Stated by Rockstar Games'],
  corroborated: ['Corroborated', 'Reported by a secondary source citing official material'],
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

/** Small per-computer preferences. Private windows and blocked storage simply forget them. */
const prefs = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
};

// ---------- spoilers ----------

// Entries marked `spoiler` stay closed until the reader opens them: one at a
// time (for this session) or all at once with the remembered "show spoilers" switch.
let showSpoilers = prefs.get('show-spoilers') === '1';
const revealed = new Set();
const SPOILER_HINT = 'Spoiler hidden. Open the entry to reveal it.';

const isHidden = (section, entry) => entry.spoiler === true && !showSpoilers && !revealed.has(`${section}/${entry.slug}`);
const summaryOf = (section, entry) => (isHidden(section, entry) ? SPOILER_HINT : entry.summary);
const hasSpoilers = () => [...state.wiki.categories.map((c) => c.key), ...Object.keys(FIXED_LABELS)]
  .some((key) => (state.wiki[key] || []).some((e) => e.spoiler === true));
const spoilerLabel = '<span class="conf conf-spoiler" title="Contains story or late-game details">Spoiler</span>';

/** The global switch. Shown only once the wiki actually holds spoiler entries. */
const spoilerToggle = () => (hasSpoilers()
  ? `<button type="button" class="toggle${showSpoilers ? ' is-active' : ''}" data-spoilers="${showSpoilers ? 'off' : 'on'}" aria-pressed="${showSpoilers}">Spoilers: ${showSpoilers ? 'shown' : 'hidden'}</button>`
  : '');

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-spoilers], [data-reveal]');
  if (!button) return;
  if (button.dataset.reveal) {
    revealed.add(button.dataset.reveal);
  } else {
    showSpoilers = button.dataset.spoilers === 'on';
    if (!showSpoilers) revealed.clear();
    prefs.set('show-spoilers', showSpoilers ? '1' : '0');
  }
  const top = window.scrollY;
  route();
  window.scrollTo(0, top);
});

/** What a closed spoiler entry shows instead of its text. */
function spoilerGate(section, entry) {
  return `<div class="panel spoiler-gate">
    <h2>${spoilerLabel} Hidden</h2>
    <p class="muted">This entry gives away story or late-game details, so its text, facts and picture are closed.</p>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" data-reveal="${esc(`${section}/${entry.slug}`)}">Reveal this entry</button>
      <button type="button" class="btn" data-spoilers="on">Always show spoilers</button>
    </div>
  </div>`;
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

/** A photo if the entry has one, otherwise the "no artwork on file" panel. */
function picture(entry, kind) {
  if (entry.image) {
    return `<img src="${esc(entry.image)}" alt="" loading="lazy" data-fallback="${esc(entry.slug || entry.name)}|${esc(kind)}">`;
  }
  return postcard(entry.slug || entry.name, kind);
}

function badge(confidence) {
  const key = confidence in CONFIDENCE ? confidence : 'unknown';
  const [label, meaning] = CONFIDENCE[key];
  return `<span class="conf conf-${key}" title="${esc(meaning)}">${label}</span>`;
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Entries that lead with a picture: anything with artwork, and all people and places. */
const illustrated = (section, entry) => Boolean(entry.image) || section === 'characters' || section === 'locations';

/** FeatureTile: image-led card, or a text-only note when there is no artwork to lead with. */
function card(section, entry, kicker) {
  if (isHidden(section, entry)) {
    return `<a class="note" href="${entryLink(section, entry.slug)}">
      <div class="card-meta"><span class="kicker">${esc(sectionLabel(section))}</span>${spoilerLabel}</div>
      <h3>${esc(entry.name)}</h3>
      <p>${SPOILER_HINT}</p>
    </a>`;
  }
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
  const leads = (e) => illustrated(section, e) && !isHidden(section, e);
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
  ${headCards(section)}
</header>`;

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
window.addEventListener('scroll', markPastHero, { passive: true });
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
  const links = (entry.related || []).map(resolve).filter(Boolean);
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
    <input type="search" class="list-filter" placeholder="Filter ${esc(label)}" aria-label="Filter ${esc(label)}" autocomplete="off">
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
function mountList(root, { items, text, sorts, render, page = LIST_PAGE }) {
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

  const draw = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    current = words.length ? items.filter((item) => words.every((w) => haystack.get(item).includes(w))) : items.slice();
    const sort = sorts.find((s) => s.key === select.value) || sorts[0];
    if (sort.compare) current.sort(sort.compare);
    const visible = current.slice(0, shown);
    body.innerHTML = current.length
      ? render(visible, sort.key)
      : `<p class="muted">Nothing here matches “${esc(input.value.trim())}”.</p>`;
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
  return mountList(root, {
    items: entries,
    text: (entry) => filterText(section, entry),
    sorts: ENTRY_SORTS,
    // The large "feature" tiles only make sense in the curated order.
    render: (visible, sort) => entryGrid(section, visible, kicker, sort === 'default' ? gridClass : ''),
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

// ---------- splash ----------

// Seconds of the splash video to skip: its opening is a near-black outline
// that reads as a stalled screen. Keep in step with `#t=` in index.html.
const SPLASH_START = 2;
// The clip is made to loop: its last quarter-second is its opening again. Stop on the finished logo, before that.
const SPLASH_END = 9.3;

function runSplash(ready) {
  const splash = document.getElementById('splash');
  const video = document.getElementById('splash-video');
  const percent = document.getElementById('splash-percent');
  const ring = document.getElementById('splash-ring');
  const RING = 2 * Math.PI * 46; // the ring's circumference, in its own units
  const fill = (done) => { percent.textContent = `${Math.round(done * 100)}%`; ring.style.strokeDashoffset = String(RING * (1 - done)); };
  const tip = document.getElementById('splash-tip');
  const tips = ['Loading Leonida…', 'Warming up the engines…', 'Checking the Coast Guard radio…', 'Welcome to Vice City'];
  let finished = false;

  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') finish(); };
  const finish = async () => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey);
    await ready;
    fill(1);
    splash.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => { video.pause(); splash.remove(); }, 900);
  };

  const update = () => {
    if (!video.duration) return;
    const end = Math.min(SPLASH_END, video.duration);
    // Hold the finished logo on screen while the splash fades out.
    if (video.currentTime >= end) { video.pause(); finish(); }
    const done = Math.min(1, Math.max(0, (video.currentTime - SPLASH_START) / (end - SPLASH_START)));
    fill(done);
    tip.textContent = tips[Math.min(tips.length - 1, Math.floor(done * tips.length))];
  };
  video.addEventListener('timeupdate', update);
  // Count every frame while the window is being drawn, so the percentage climbs smoothly.
  const everyFrame = () => { if (!finished) { update(); requestAnimationFrame(everyFrame); } };
  requestAnimationFrame(everyFrame);
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  document.getElementById('splash-skip').addEventListener('click', finish);
  // Stays attached until the splash ends, so pressing some other key first
  // does not disable Enter and Esc.
  window.addEventListener('keydown', onKey);

  // If the video cannot autoplay, don't leave people on a black screen.
  video.play().catch(() => setTimeout(finish, 1500));
  setTimeout(() => { if (video.currentTime <= SPLASH_START) finish(); }, 4000);
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
      <video class="hero-video is-on" src="${HERO_WALLPAPERS[0]}"
        poster="/images/muscle-car-pastel-palms.jpg" autoplay muted playsinline aria-hidden="true"></video>
      <video class="hero-video" muted playsinline preload="auto" aria-hidden="true"></video>
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
      <button class="hero-pause" type="button" aria-pressed="false" aria-label="Pause background video">❚❚</button>
      <a class="scroll-cue" href="#/">Scroll</a>
    </section>

    <dl class="facts" id="facts">
      ${game.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
    </dl>

    <aside class="promo" aria-label="Community">
      <div class="promo-walls" aria-hidden="true">
        <img class="is-on" src="${PROMO_WALLS[0]}" alt=""><img src="${PROMO_WALLS[1]}" alt="">
      </div>
      <img class="promo-server" src="/images/community/server-icon.png" alt="">
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
        <p>Two leads and the six supporting characters Rockstar has named so far.</p>
        <a class="more" href="#/characters">All characters →</a>
      </header>
      <div class="cast">
        ${leads.map((c) => card('characters', c, c.role)).join('')}
        <div class="roster">
          ${supporting.map((c) => `<a href="#/characters/${c.slug}"><b>${esc(c.name)}</b><span>${esc(c.role)}</span><i aria-hidden="true">→</i></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Places</span>
        <h2>Vice City and Beyond</h2>
        <p>Six regions make up the State of Leonida. Open any of them, or find them on the map.</p>
        <a class="more" href="#/map">Open the map →</a>
      </header>
      <div class="feature">
        <a class="feature-media" href="#/locations/${lead.slug}">
          ${picture(lead, artKind('locations', lead))}
          <span><span class="kicker">${esc(lead.region)}</span><h3>${esc(lead.name)}</h3></span>
        </a>
        <div class="roster">
          ${locations.map((l) => `<a href="#/locations/${l.slug}"><b>${esc(l.name)}</b><span>${esc(l.region)}</span><i aria-hidden="true">→</i></a>`).join('')}
        </div>
      </div>
    </section>

    ${rides.length ? `<section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Garage</span>
        <h2>Vehicles</h2>
        <p>Vehicle types seen in official material. Model names are listed only where Rockstar has published them.</p>
        <a class="more" href="#/vehicles">All vehicles →</a>
      </header>
      <div class="trio">${rides.map((v) => card('vehicles', v, kickerOf(v))).join('')}</div>
    </section>` : ''}

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Gallery</span>
        <h2>Media</h2>
        <p>Artwork and live wallpapers, each with its origin and rights status.</p>
        <a class="more" href="#/media">Open the gallery →</a>
      </header>
      <div class="trio" id="home-media"></div>
    </section>

    <section class="editorial">
      <header class="editorial-head">
        <span class="kicker">Intel</span>
        <h2>Latest</h2>
        <p>Dated announcements, each labelled with how well it is sourced.</p>
        <a class="more" href="#/intel">Full timeline →</a>
      </header>
      <ol class="timeline">${news.slice(0, 4).map(timelineItem).join('')}</ol>
    </section>`;

  startCountdown(game.releaseDate);

  // Hero: every live wallpaper in turn, for as long as the page is open. Two video layers sit on
  // top of each other; shortly before one clip ends the next starts underneath and they cross-fade,
  // so there is never a cut or a black frame.
  const layers = [...view.querySelectorAll('.hero-video')];
  const pause = view.querySelector('.hero-pause');
  let front = 0;     // which layer is showing
  let playing = 0;   // which wallpaper it is playing
  let switching = false;
  const upNext = () => {
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
  upNext();
  const setPaused = (paused) => {
    const video = layers[front];
    if (paused) video.pause(); else video.play().catch(() => {});
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    pause.textContent = paused ? '▶' : '❚❚';
  };
  // The live wallpapers always play on arrival (the owner's choice); the
  // button is how anyone who prefers a still picture stops them.
  pause.addEventListener('click', () => setPaused(!layers[front].paused));
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
        <video src="${esc(v.src)}#t=4" muted playsinline preload="metadata" aria-hidden="true"></video>
        <span class="play" aria-hidden="true"></span><span class="tile-title">${esc(v.title)}</span>
      </a>`).join('');
  }).catch(() => {});
}

function timelineItem(item) {
  return `<li><time datetime="${esc(item.date)}">${esc(formatDate(item.date))}</time> ${badge(item.confidence)}
    <h3>${esc(item.name)}</h3><p>${esc(summaryOf('news', item))}</p></li>`;
}

let countdownTimer;
function startCountdown(releaseDate) {
  clearInterval(countdownTimer);
  // Midnight at the start of release day, in this computer's time zone.
  const target = new Date(releaseDate + 'T00:00:00').getTime();
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
          const cover = c.key === 'characters' ? { image: '/images/manual/jason-and-lucia-waterfront.jpg' }
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

function renderCategory(key) {
  const cat = category(key);
  if (!cat) return renderNotFound();
  const entries = state.wiki[key] || [];
  view.innerHTML = `
    ${pageHead(cat.label, cat.blurb, key)}
    <section class="block">
      <a class="back" href="#/wiki">← Encyclopedia</a>
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
  const closed = isHidden(key, entry);
  const lead = illustrated(key, entry) && !closed;
  view.innerHTML = `
    <article class="profile ${lead ? 'profile-wide' : 'profile-text'}">
      ${lead ? `<div class="profile-portrait">${picture(entry, artKind(key, entry))}</div>` : ''}
      <div class="profile-body">
        <a class="back" href="${key === 'vehicles' ? '#/vehicles' : `#/wiki/${key}`}">← ${esc(cat.label)}</a>
        <span class="kicker">${esc((!closed && kickerOf(entry)) || cat.label)}</span>
        <h1>${esc(entry.name)}</h1>
        ${closed ? spoilerGate(key, entry) : `
        ${spoilerNote(entry)}
        <p class="lede">${esc(entry.summary)}</p>
        ${paragraphs(entry)}
        ${facts(key, entry)}
        ${mapLink(key, entry)}
        ${related(entry)}
        ${provenance(entry)}
        ${tags(entry)}`}
      </div>
    </article>`;
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
    render: (visible) => `<div class="grid grid-portrait">${visible.map((c) => card('characters', c, c.role)).join('')}</div>`,
  });
}

function renderCharacter(slug) {
  const { characters } = state.wiki;
  const c = characters.find((x) => x.slug === slug);
  if (!c) return renderNotFound();
  const others = characters.filter((x) => x.slug !== slug).slice(0, 4);
  const closed = isHidden('characters', c);
  view.innerHTML = `
    <article class="profile${closed ? ' profile-text' : ''}">
      ${closed ? '' : `<div class="profile-portrait">${picture(c, 'portrait')}</div>`}
      <div class="profile-body">
        <a class="back" href="#/characters">← Characters</a>
        <span class="kicker">${esc(closed ? 'Characters' : c.role)}</span>
        <h1>${esc(c.name)}</h1>
        ${closed ? spoilerGate('characters', c) : `
        ${spoilerNote(c)}
        <p class="lede">${esc(c.summary)}</p>
        ${paragraphs(c)}
        ${c.ties?.length ? `<h2>Known ties</h2>
        <ul class="ties">${c.ties.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${facts('characters', c)}
        ${related(c)}
        ${provenance(c)}
        ${tags(c)}`}
      </div>
    </article>
    <section class="block"><div class="block-head"><h2>More characters</h2></div>
      <div class="grid grid-portrait">${others.map((o) => card('characters', o, o.role)).join('')}</div>
    </section>`;
}

function renderLocations() {
  view.innerHTML = `
    ${pageHead('Locations', 'Vice City and the wider State of Leonida, region by region.', 'locations')}
    <section class="block">${listShell('locations')}</section>`;
  mountList(view.querySelector('[data-list]'), {
    items: state.wiki.locations,
    text: (l) => filterText('locations', l),
    sorts: ENTRY_SORTS,
    render: (visible, sort) => `<div class="grid${sort === 'default' ? ' grid-feature' : ''}">${visible.map((l) => card('locations', l, l.region)).join('')}</div>`,
  });
}

function renderLocation(slug) {
  const l = state.wiki.locations.find((x) => x.slug === slug);
  if (!l) return renderNotFound();
  if (isHidden('locations', l)) {
    view.innerHTML = `
      <article class="profile profile-text"><div class="profile-body">
        <a class="back" href="#/locations">← Locations</a>
        <span class="kicker">Locations</span>
        <h1>${esc(l.name)}</h1>
        ${spoilerGate('locations', l)}
      </div></article>`;
    return;
  }
  const ref = `locations/${slug}`;
  const onMap = mapPins().some((pin) => pin.ref === ref);
  view.innerHTML = `
    <article class="place">
      <div class="place-hero">${picture(l, artKind('locations', l))}<div class="hero-shade"></div>
        <div class="place-title">
          <a class="back" href="#/locations">← Locations</a>
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
        <ol class="timeline">${news.map(timelineItem).join('')}</ol>
      </div>
      <div>
        <div class="block-head"><h2>Editions</h2></div>
        <div class="editions">${editions.map((e) => `
          <div class="panel"><span class="price">${esc(e.price)}</span><h3>${esc(e.name)}</h3>
            <p>${esc(summaryOf('editions', e))}</p><p class="muted">${esc(isHidden('editions', e) ? '' : (e.body || []).join(' '))}</p>${badge(e.confidence)}</div>`).join('')}
        </div>
        <div class="block-head"><h2>FAQ</h2></div>
        <div class="faq">${faq.map((q) => `<details><summary>${esc(q.name)}</summary><p>${esc(summaryOf('faq', q))} ${badge(q.confidence)}</p></details>`).join('')}</div>
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

async function renderMedia() {
  view.innerHTML = `${pageHead('Media', 'Artwork and live wallpapers. Each item shows where it came from and whether its rights have been confirmed.')}
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
    ...media.images.map((i) => ({ ...i, type: 'image', group: i.group || 'artwork' })),
  ];
  const groups = ['all', ...new Set(items.map((i) => i.group))];

  const draw = (active) => {
    filter.innerHTML = groups.map((g) => `<button type="button" aria-pressed="${g === active}" class="${g === active ? 'is-active' : ''}" data-group="${esc(g)}">${esc(g)}</button>`).join('');
    const shown = items.filter((i) => active === 'all' || i.group === active);
    gallery.innerHTML = shown.map((item) => `
      <button type="button" class="tile ${item.type === 'video' ? 'tile-video' : ''}" data-index="${items.indexOf(item)}" aria-label="Open ${esc(item.title)}">
        ${item.type === 'video'
          ? `<video src="${esc(item.src)}#t=4" muted loop playsinline preload="metadata" aria-hidden="true"></video><span class="play" aria-hidden="true"></span>`
          : `<img src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy">`}
        <span class="tile-title">${esc(item.title)}</span>
      </button>`).join('') || '<p class="muted">Nothing here yet.</p>';
  };
  draw('all');

  filter.addEventListener('click', (e) => {
    const group = e.target.closest('button')?.dataset.group;
    if (group) draw(group);
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
    // A hand-placed marker stays, but shows nothing from a closed spoiler entry.
    const open = target && !isHidden(target.section, target.entry);
    return {
      name: m.name, category: m.category || 'landmarks', x: m.x, y: m.y, target,
      summary: m.summary || (open ? target.entry.summary : ''),
      ref: target ? `${target.section}/${target.entry.slug}` : null,
      image: m.location && open ? target.entry.image : null,
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

function renderMap(params) {
  const { map: config } = state.wiki;
  const pins = mapPins();
  const categories = pinCategories(pins);
  const categoryOf = new Map(categories.map((c) => [c.key, c]));
  const dot = (pin, extra = '') => `<i class="pin${extra}" style="background:${categoryOf.get(pin.category).color}"></i>`;
  const off = new Set(); // pin categories switched off
  const expanded = new Set(); // pin categories listed in full

  view.innerHTML = `
    <div class="map-page">
      <aside class="map-side">
        <h1>Leonida</h1>
        <p class="muted">Click a place to fly there. Pin positions come from the community map, not from Rockstar.</p>
        <input type="search" class="map-filter" placeholder="Filter pins" aria-label="Filter pins" autocomplete="off">
        <p class="map-count muted" role="status"></p>
        <div class="map-lists"></div>
      </aside>
      <div class="map-wrap">
        <div id="leonida-map" aria-label="Zoomable map of Leonida"></div>
        <p id="map-notice" class="map-notice" role="status" hidden></p>
      </div>
    </div>`;

  const map = L.map('leonida-map', { crs: L.CRS.Simple, zoomSnap: 0.25, minZoom: 0, maxZoom: config.maxZoom + 1, maxBoundsViscosity: 0.7 });
  state.map = map;
  map.attributionControl.setPrefix(false);
  const point = (x, y) => map.unproject([x * config.width, y * config.height], config.maxZoom);
  const bounds = L.latLngBounds(point(0, 1), point(1, 0));

  const tiles = L.tileLayer('/tiles/{z}/{y}/{x}.webp', {
    tileSize: 512, minNativeZoom: 0, maxNativeZoom: config.maxZoom,
    minZoom: -2, maxZoom: config.maxZoom + 1, bounds, noWrap: true, attribution: esc(config.attribution),
  }).addTo(map);
  // Tiles are fetched once and cached; if that fails, say why the map is blank.
  const notice = document.getElementById('map-notice');
  tiles.on('tileerror', () => {
    notice.textContent = 'Some map tiles could not be loaded. Areas you have viewed before still work offline; the rest need an internet connection.';
    notice.hidden = false;
  });
  tiles.on('load', () => { if (!document.querySelector('.leaflet-tile-error')) notice.hidden = true; });
  tiles.on('tileerror', (e) => e.tile.classList.add('leaflet-tile-error'));

  map.setMaxBounds(bounds.pad(0.25));
  map.fitBounds(bounds);
  map.setMinZoom(map.getZoom() - 0.5);

  const layers = {};
  const markers = pins.map((pin) => {
    const { target } = pin;
    const marker = L.marker(point(pin.x, pin.y), {
      title: pin.name,
      alt: pin.name,
      icon: L.divIcon({ className: '', html: dot(pin, ' pin-map'), iconSize: [26, 26], iconAnchor: [13, 13] }),
      // Built when the pin is opened, so hundreds of pins cost nothing up front.
    }).bindPopup(() => `<div class="map-card">
        ${pin.image ? `<img src="${esc(pin.image)}" alt="">` : ''}
        <span class="kicker">${esc(categoryOf.get(pin.category).label)}</span>
        <h3>${esc(pin.name)}</h3>
        <p>${esc(pin.summary || '')}</p>
        ${target ? `<a href="${entryLink(target.section, target.entry.slug)}">Open ${esc(target.entry.name)} →</a>` : ''}
      </div>`, { maxWidth: 280, minWidth: 220 });
    (layers[pin.category] ||= L.layerGroup().addTo(map)).addLayer(marker);
    return marker;
  });

  const flyTo = (index) => {
    const pin = pins[index];
    if (!pin || off.has(pin.category)) return;
    map.flyTo(point(pin.x, pin.y), categoryOf.get(pin.category).zoom, { duration: 0.9 });
    map.once('moveend', () => markers[index].openPopup());
  };

  // Sidebar: one list per category with its count; the filter narrows every list.
  const side = view.querySelector('.map-side');
  const lists = side.querySelector('.map-lists');
  const filter = side.querySelector('.map-filter');
  const names = pins.map((pin) => `${pin.name} ${categoryOf.get(pin.category).label}`.toLowerCase());
  const drawLists = () => {
    const words = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = pins.map((_, i) => i).filter((i) => words.every((w) => names[i].includes(w)));
    side.querySelector('.map-count').textContent = words.length
      ? `${matches.length} of ${pins.length} pins match`
      : `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'}`;
    lists.innerHTML = categories.map((c) => {
      const all = pins.filter((pin) => pin.category === c.key).length;
      const mine = matches.filter((i) => pins[i].category === c.key);
      // While filtering, show every match; otherwise a page, then "Show all".
      const listed = words.length || expanded.has(c.key) ? mine : mine.slice(0, MAP_LIST_PAGE);
      if (words.length && !mine.length) return '';
      return `<section data-category="${esc(c.key)}">
        <label class="map-toggle"><input type="checkbox" ${off.has(c.key) ? '' : 'checked'} data-toggle="${esc(c.key)}">
          <span>${esc(c.label)}</span>
          <b class="map-n">${words.length ? `${mine.length}/${all}` : all}</b></label>
        <ul class="${off.has(c.key) ? 'is-off' : ''}">${listed.map((i) => `<li><button type="button" data-marker="${i}">${dot(pins[i])}${esc(pins[i].name)}</button></li>`).join('')}</ul>
        ${listed.length < mine.length ? `<button type="button" class="map-more" data-expand="${esc(c.key)}">Show all ${mine.length}</button>` : ''}
      </section>`;
    }).join('') || `<p class="muted">${words.length ? 'No pin matches that.' : 'No pins yet.'}</p>`;
  };
  drawLists();

  let filterTimer;
  filter.addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(drawLists, 120);
  });
  side.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.marker !== undefined) flyTo(Number(button.dataset.marker));
    if (button.dataset.expand) { expanded.add(button.dataset.expand); drawLists(); }
  });
  side.addEventListener('change', (e) => {
    const key = e.target.dataset.toggle;
    if (!key || !layers[key]) return;
    if (e.target.checked) { off.delete(key); map.addLayer(layers[key]); } else { off.add(key); map.removeLayer(layers[key]); }
    side.querySelector(`[data-category="${CSS.escape(key)}"] ul`).classList.toggle('is-off', !e.target.checked);
  });

  // Right-click anywhere to read off a position, ready to paste into an entry as "x" and "y".
  map.on('contextmenu', (e) => {
    const at = map.project(e.latlng, config.maxZoom);
    const [x, y] = [at.x / config.width, at.y / config.height];
    if (![x, y].every((v) => v >= 0 && v <= 1)) return;
    L.popup({ maxWidth: 280 }).setLatLng(e.latlng).setContent(`<div class="map-card">
        <span class="kicker">Map position</span>
        <p><code>"x": ${x.toFixed(3)}, "y": ${y.toFixed(3)}</code></p>
        <p>Add these to an entry in the data files to pin it here.</p>
      </div>`).openOn(map);
  });

  // `?focus=` takes a pin name (as before) or an entry reference such as businesses/fleeca.
  const focus = params.get('focus');
  const focusIndex = focus ? pins.findIndex((pin) => pin.name === focus || pin.ref === focus) : -1;
  if (focusIndex >= 0) setTimeout(() => flyTo(focusIndex), 300);
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
    <form class="search-big" role="search"><input type="search" value="${esc(query)}" placeholder="Try “Lucia”, “Keys” or “release date”" aria-label="Search" autofocus></form>
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
    if (append) {
      body.insertAdjacentHTML('beforeend', page.hits.map(row).join(''));
    } else {
      body.innerHTML = page.total
        ? page.hits.map(row).join('')
        : `<p class="muted">Nothing found for “${esc(q)}”${section ? ` in ${esc(sectionLabel(section))}` : ''}.
          Try a character, a place or “price”${section ? ', or search everything' : ''}.</p>`;
    }
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

function route() {
  if (state.map) { state.map.remove(); state.map = null; }
  const [path, queryString] = location.hash.replace(/^#\/?/, '').split('?');
  const [section, a, b] = path.split('/').map(decodeURIComponent);
  const params = new URLSearchParams(queryString || '');
  const name = section || 'home';

  document.body.dataset.page = name;
  const navName = name === 'wiki' && a === 'vehicles' ? 'vehicles' : name;
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
  (pages[name] || renderNotFound)();

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
];
const HERO_FADE_MS = 1400;
// ---------- inline spoilers ----------
// Whole entries marked `spoiler` are handled at the top of this file. This covers single
// phrases. Any text in the data files written as ||like this|| is a spoiler: it is covered until the
// reader clicks it (or presses Enter or Space on it), and a second click covers it again.
// It works wherever the text appears, because it is applied to whatever the page draws.
const SPOILER = /\|\|([^|]+?)\|\|/g;
function hideSpoilers(root) {
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
      if (i % 2 === 0) { piece.append(text); return; }
      const cover = document.createElement('span');
      cover.className = 'spoiler';
      cover.tabIndex = 0;
      cover.setAttribute('role', 'button');
      cover.setAttribute('aria-label', 'Spoiler, hidden. Activate to show.');
      cover.textContent = text;
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

/** Offer a newer release if GitHub has one. Dismissing it is remembered for that version. */
async function checkForUpdate() {
  let status;
  try { status = await getJson('/api/update'); } catch { return; }
  const link = status.url || status.download;
  if (!status.available || !link) return;
  const key = 'update-dismissed';
  try { if (localStorage.getItem(key) === status.latest) return; } catch { /* storage unavailable */ }
  const toast = document.createElement('aside');
  toast.className = 'update-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<div><strong>Version ${esc(status.latest)} is available</strong>
      <span>You have ${esc(status.current)}.</span></div>
    ${status.can_install
      ? '<button type="button" class="btn btn-primary" data-update>Update now</button>'
      : `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Get the update</a>`}
    <button type="button" aria-label="Dismiss update notice">×</button>`;
  toast.querySelector('button[aria-label]').addEventListener('click', () => {
    try { localStorage.setItem(key, status.latest); } catch { /* storage unavailable */ }
    toast.remove();
  });
  toast.querySelector('[data-update]')?.addEventListener('click', () => { toast.remove(); beginUpdate(status); });
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
// thrown in from each side, by turns, bursting three times at the very edge and washing over
// the page beside it. They belong to the update, not to Home, so they stay on whichever page
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
  const release = new Date(game.releaseDate + 'T00:00:00');
  if (Number.isNaN(release.getTime()) && !game.announcement) return;
  const platforms = (game.facts || []).find((f) => f.label === 'Platforms')?.value;
  const text = game.announcement
    || `${Date.now() < release ? `Coming ${formatDate(game.releaseDate)}` : 'Out now'}${platforms ? ` · ${platforms}` : ''}`;

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
// The desktop app has no Windows title bar: these are its buttons, and the bars are what you drag.
// In a browser there is no `window.ipc`, so none of this is switched on.
if (window.ipc?.postMessage) {
  const send = (message) => window.ipc.postMessage(message);
  const controls = document.getElementById('window-controls');
  controls.hidden = false;
  document.documentElement.classList.add('is-desktop');
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
  for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
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

const ready = getJson('/api/wiki')
  .then((wiki) => {
    wiki.categories ||= [
      { key: 'characters', label: 'Characters', blurb: '', art: 'portrait' },
      { key: 'locations', label: 'Locations', blurb: '', art: 'city' },
      { key: 'vehicles', label: 'Vehicles', blurb: '', art: 'port' },
    ];
    state.wiki = wiki;
    setupAnnouncement(wiki.game);
    checkForUpdate();
    syncRails();
    window.addEventListener('hashchange', navigate);
    route();
    enterView();
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

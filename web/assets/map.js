/* The hosted Leonida map. Opens at what the link names:
 *   ?focus=<section/slug>   the pins of one GTA 6 HQ entry
 *   ?kind=<kind>[|<kind>]   every pin of a kind (Gang Operations, Bank Jobs…)
 *   ?at=x,y[;x,y…]          spots by map position (0 to 1 across and down), each matched to its pin
 *   ?q=<words>              pins whose name has these words
 *   ?spoilers=1             spoiler names shown at once
 * Drag to move, scroll or pinch to zoom, the buttons zoom, reset, go full screen and show every place.
 */
'use strict';
(async () => {
  const params = new URLSearchParams(location.search);
  const note = document.getElementById('panel-note');
  let config, pins;
  try {
    [config, pins] = await Promise.all([HQ.load('map'), HQ.load('pins')]);
  } catch (error) {
    note.textContent = `The map data could not be loaded (${error.message}). Try again in a moment.`;
    return;
  }
  const W = config.width, H = config.height;
  const ll = (p) => L.latLng(-p.y * H, p.x * W);
  const bounds = L.latLngBounds([[-H, 0], [0, W]]);
  const map = L.map('map', {
    crs: L.CRS.Simple, zoomControl: false, preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90, maxBounds: bounds.pad(0.15), maxBoundsViscosity: 0.8, attributionControl: true, minZoom: -6, maxZoom: 3,
  });
  window.hqMap = map; // for the page test
  map.attributionControl.setPrefix(false);
  L.imageOverlay(config.image, bounds, { attribution: HQ.esc(config.attribution) }).addTo(map);
  map.fitBounds(bounds);
  // Zoom 0 is the official map at its own size; 2.5 is as far in as it stays readable.
  map.setMinZoom(map.getZoom() - 0.5); map.setMaxZoom(2.5);
  document.getElementById('credit').textContent = config.attribution;

  // ---- which pins the link asks for ----
  const near = (p, x, y) => Math.abs(p.x - x) < 0.0006 && Math.abs(p.y - y) < 0.0006;
  let chosen = [];
  let heading = 'Leonida';
  const focus = params.get('focus');
  const kinds = (params.get('kind') || '').split('|').filter(Boolean);
  const at = (params.get('at') || '').split(';').map((s) => s.split(',').map(Number)).filter((a) => a.length === 2 && a.every((n) => n >= 0 && n <= 1));
  const query = (params.get('q') || '').trim().toLowerCase();
  if (focus) {
    chosen.push(...pins.filter((p) => p.ref === focus));
    heading = chosen[0]?.name || heading;
  }
  if (kinds.length) {
    chosen.push(...pins.filter((p) => kinds.includes(p.kind)));
    heading = kinds.join(' and ');
  }
  for (const [x, y] of at) {
    const pin = pins.find((p) => near(p, x, y));
    chosen.push(pin || { name: 'Marked spot', x, y, category: '', kind: '', summary: '', ref: null, spoiler: false, spot: true });
  }
  if (at.length && !focus && !kinds.length) heading = at.length === 1 ? (chosen[0].name || 'Marked spot') : `${at.length} places`;
  if (query) {
    const words = query.split(/\s+/);
    chosen.push(...pins.filter((p) => words.every((w) => HQ.plain(p.name).toLowerCase().includes(w))));
    heading = `“${params.get('q')}”`;
  }
  chosen = [...new Set(chosen)];

  // ---- markers ----
  const label = (p) => (p.spoiler && !HQ.spoilers ? 'Spoiler' : HQ.plain(p.name));
  const faint = L.layerGroup();
  const strong = L.layerGroup().addTo(map);
  const markerOf = new Map();
  const colour = (p) => config.colours[p.category] || '#7fb3ff';
  for (const p of pins) {
    if (chosen.includes(p)) continue;
    const m = L.circleMarker(ll(p), { radius: 4, weight: 1, color: '#0b1630', fillColor: colour(p), fillOpacity: 0.85 });
    m.on('click', () => select(p));
    m.bindTooltip(() => HQ.esc(label(p)), { direction: 'top', offset: [0, -4] });
    markerOf.set(p, m);
    faint.addLayer(m);
  }
  chosen.forEach((p, i) => {
    const icon = L.divIcon({ className: 'pin', html: `<span class="pin-dot${i === 0 && focus ? ' main' : ''}">${chosen.length > 1 ? i + 1 : ''}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    const m = L.marker(ll(p), { icon, keyboard: true, title: label(p), riseOnHover: true });
    m.on('click', () => select(p));
    markerOf.set(p, m);
    strong.addLayer(m);
  });

  // ---- the opening view, and reset ----
  // On a phone the panel covers the lower part of the map: keep the places above it.
  const covered = () => (window.innerWidth <= 640 ? document.getElementById('panel').offsetHeight + 10 : 0);
  const home = () => {
    const below = covered();
    if (chosen.length === 1) {
      map.setView(ll(chosen[0]), 0.75, { animate: false });
      if (below) map.panBy([0, below / 2], { animate: false });
    } else if (chosen.length) {
      map.fitBounds(L.latLngBounds(chosen.map(ll)), { maxZoom: 1, animate: false,
        paddingTopLeft: [60, 30], paddingBottomRight: [window.innerWidth > 640 ? 390 : 20, below + 20] });
    } else map.fitBounds(bounds, { animate: false });
  };
  if (!chosen.length) { faint.addTo(map); document.getElementById('all').setAttribute('aria-pressed', 'true'); }

  // ---- the panel ----
  const card = document.getElementById('card');
  const list = document.getElementById('list');
  document.getElementById('panel-title').textContent = chosen.length && chosen.every((p) => p.spoiler) && !HQ.spoilers ? 'Spoiler' : HQ.plain(heading);
  function select(p) {
    const area = HQ.areaOf(pins, p.x, p.y);
    const hidden = p.spoiler && !HQ.spoilers;
    card.innerHTML = `<article class="pin-card">
      <h2>${hidden ? '<span class="spoiler" tabindex="0" role="button">' + HQ.esc(HQ.plain(p.name)) + '</span>' : HQ.esc(HQ.plain(p.name))}</h2>
      <p class="meta">${[p.kind, config.labels[p.category]].filter(Boolean).map(HQ.esc).join(' · ')}</p>
      <dl>
        ${area ? `<dt>Area</dt><dd>${HQ.esc(area)}</dd>` : ''}
        <dt>Map position</dt><dd>${(p.x * 100).toFixed(1)}% across, ${(p.y * 100).toFixed(1)}% down <span class="muted">(approximate)</span></dd>
      </dl>
      ${p.summary ? `<p>${hidden ? `<span class="spoiler" tabindex="0" role="button">${HQ.rich(HQ.plain(p.summary))}</span>` : HQ.rich(p.summary)}</p>` : ''}
      ${p.ref ? `<p><a class="btn" href="../guide/?ref=${encodeURIComponent(p.ref)}">Open the guide</a></p>` : ''}
      ${p.guide ? `<p><a class="btn btn-ghost" href="../guide/?manual=${encodeURIComponent(p.guide[0])}&title=${encodeURIComponent(p.guide[1])}">Field Manual: ${HQ.esc(p.guide[1])}</a></p>` : ''}
    </article>`;
    for (const li of list.children) li.classList.toggle('on', li.dataset.i === String(chosen.indexOf(p)));
    const m = markerOf.get(p);
    if (m && !map.getBounds().contains(ll(p))) map.panTo(ll(p));
    window.hqSelected = p;
  }
  if (chosen.length) {
    note.textContent = chosen.length === 1 ? 'Drag to move around, scroll to zoom.' : `${chosen.length} places. Drag to move around, scroll to zoom.`;
    list.innerHTML = chosen.slice(0, 200).map((p, i) => `<li data-i="${i}"><button type="button"><span class="num">${i + 1}</span>${HQ.esc(label(p))}<small>${HQ.esc(HQ.areaOf(pins, p.x, p.y))}</small></button></li>`).join('');
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const p = chosen[Number(li.dataset.i)];
      map.flyTo(ll(p), Math.max(map.getZoom(), 0.75), { duration: 0.6 });
      select(p);
    });
    select(chosen[0]);
  } else {
    note.textContent = focus || kinds.length || at.length || query
      ? 'Nothing on the map matches this link. It may have moved; every place is shown instead.'
      : 'Every place GTA 6 HQ has on the map. Drag to move, scroll to zoom, click a dot for details.';
  }

  // ---- tools ----
  document.getElementById('zoom-in').onclick = () => map.zoomIn(0.5);
  document.getElementById('zoom-out').onclick = () => map.zoomOut(0.5);
  document.getElementById('reset').onclick = home;
  // Full screen: the map fills the window at once (the top bar folds away), and the browser's own
  // full screen is asked for too where it is allowed (inside Discord's in-app browser it may not be).
  const fullBtn = document.getElementById('full');
  const setFull = (on) => {
    document.body.classList.toggle('pseudo-full', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.title = on ? 'Leave full screen' : 'Full screen';
    setTimeout(() => map.invalidateSize(), 150);
  };
  fullBtn.onclick = () => {
    const on = !document.body.classList.contains('pseudo-full');
    setFull(on);
    const el = document.documentElement;
    if (on && el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('pseudo-full')) setFull(false); });
  const allBtn = document.getElementById('all');
  allBtn.onclick = () => {
    const on = !map.hasLayer(faint);
    if (on) faint.addTo(map); else faint.remove();
    allBtn.setAttribute('aria-pressed', String(on));
  };
  const fold = document.getElementById('fold');
  fold.onclick = () => {
    const open = fold.getAttribute('aria-expanded') !== 'true';
    fold.setAttribute('aria-expanded', String(open));
    fold.textContent = open ? 'Hide' : 'Show';
    document.getElementById('panel-body').hidden = !open;
  };
  const spoilerBox = document.getElementById('spoilers');
  spoilerBox.checked = HQ.spoilers;
  spoilerBox.onchange = () => { HQ.setSpoilers(spoilerBox.checked); location.reload(); };
  document.getElementById('find').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('find-q').value.trim();
    if (q) location.search = `?q=${encodeURIComponent(q)}`;
  });
  home(); // after the panel is filled, so a phone's view can leave room for it
  window.hqReady = true;
})();

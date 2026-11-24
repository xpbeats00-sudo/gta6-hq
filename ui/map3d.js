// GTA 6 HQ — the map's 3D view and its street view.
// Map3D: the official Leonida map laid flat on the ground in MapLibre GL (loaded on first use),
// tilted and turnable, with each pin standing up as a coloured column. The map itself stays a
// flat picture: there is no terrain or building data, and the 3D view does not pretend otherwise.
// StreetView: drop the walker anywhere and look through the real in-game pictures nearest that spot,
// one at a time, like walking a street. They are screenshots, not 360° captures; each says how
// exactly it is placed (at its own pin, or only at the town, district or region its entry names).
//
// Entry points: Map3D.create(element, config, pins, photos, handlers), StreetView.open(options)

(function () {
  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const reducedMotion = () => document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- loading MapLibre (about 1 MB) only when the 3D view is first opened ----------
  let loading = null;
  function load() {
    if (window.maplibregl) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/vendor/maplibre-gl.css';
      document.head.append(css);
      const script = document.createElement('script');
      script.src = '/vendor/maplibre-gl.js';
      // The CSP build runs its worker from a file, so the app's content security policy can stay strict.
      script.onload = () => { window.maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.js'); resolve(); };
      script.onerror = () => { loading = null; reject(new Error('The 3D map could not be loaded.')); };
      document.head.append(script);
    });
    return loading;
  }

  // The map picture is laid over a small, flat patch of the globe near 0°, 0° (no real place):
  // x and y (0 to 1 across the picture) map straight onto longitude and latitude.
  const SPAN = 0.6;
  const geo = (config) => {
    const height = (SPAN * config.height) / config.width;
    return {
      height,
      toLngLat: (x, y) => [-SPAN / 2 + x * SPAN, height / 2 - y * height],
      toXY: (lng, lat) => [(lng + SPAN / 2) / SPAN, (height / 2 - lat) / height],
      corners: [[-SPAN / 2, height / 2], [SPAN / 2, height / 2], [SPAN / 2, -height / 2], [-SPAN / 2, -height / 2]],
    };
  };

  /** A CSS colour as MapLibre needs it: custom properties resolved against the page. */
  // MapLibre reads only plain colours, not color-mix() (the Light theme with a custom accent) or
  // other newer forms, so the browser paints the colour on one pixel and the pixel's RGB is used.
  const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function solid(color) {
    const m = /^var\((--[a-z-]+)\)$/.exec(color || '');
    const value = (m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : color) || '#c9c3e6';
    if (/^#[0-9a-f]{3,8}$/i.test(value) || !paint) return value;
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = '#c9c3e6';
    paint.fillStyle = value; // left as the fallback when the browser can't read it either
    paint.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  }

  const HOME = { pitch: 58, bearing: -14 };

  /**
   * The map's surface for editions that don't ship the official map picture: the same tiles the
   * 2D map shows (downloaded once, then cached), drawn onto one canvas where map.tileFit says they
   * belong. A tile that can't be loaded leaves the sea showing.
   */
  async function posterFromTiles(config) {
    // The canvas has the official map's shape (at half size), so it sits where that picture would,
    // and every position needs no conversion in 3D. map.tileFit says where each tile goes on it.
    const fit = config.tileFit || { scale: 1, x: 0, y: 0, zoom: config.maxZoom };
    const half = 0.5;
    const w = Math.round(config.width * half), h = Math.round(config.height * half);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#142338';
    ctx.fillRect(0, 0, w, h);
    const z = fit.zoom; // the fit's own zoom: sharper than the half-size canvas needs, and 20 tiles
    const toFit = 2 ** (fit.zoom - z);
    const size = 512 * toFit;             // a tile's size in fit pixels
    const n = 2 ** z;
    const jobs = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        // The tile's corner on the official map (in its pixels), then on the half-size canvas.
        const left = ((x * size - fit.x) / fit.scale) * half;
        const top = ((y * size - fit.y) / fit.scale) * half;
        const side = (size / fit.scale) * half;
        if (left > w || top > h || left + side < 0 || top + side < 0) continue;
        if (fit.tilesWidth && (x * size >= fit.tilesWidth || y * size >= fit.tilesHeight)) continue; // open sea: no tile
        const img = new Image();
        img.src = `/tiles/${z}/${y}/${x}.webp`;
        jobs.push(img.decode().then(() => ctx.drawImage(img, left, top, side, side)).catch(() => { /* sea shows */ }));
      }
    }
    await Promise.all(jobs);
    return canvas;
  }

  async function create(element, config, pins, photos, handlers = {}) {
    await load();
    const g = geo(config);
    const poster = config.image
      ? { type: 'image', url: config.image, coordinates: g.corners }
      : { type: 'canvas', canvas: await posterFromTiles(config), coordinates: g.corners, animate: false };
    const map = new window.maplibregl.Map({
      container: element,
      style: {
        version: 8,
        sources: { poster },
        layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': '#142338' } },
          { id: 'poster', type: 'raster', source: 'poster', paint: { 'raster-fade-duration': 0 } },
        ],
      },
      center: [0, 0], zoom: 9, pitch: HOME.pitch, bearing: HOME.bearing, maxPitch: 78,
      attributionControl: false, renderWorldCopies: false, dragRotate: true, touchPitch: true,
    });
    map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.addControl(new window.maplibregl.AttributionControl({ customAttribution: esc(config.image ? config.attribution : (config.tileAttribution || config.attribution)) }), 'bottom-right');

    const square = (x, y, half) => {
      const [lng, lat] = g.toLngLat(x, y);
      return [[[lng - half, lat - half], [lng + half, lat - half], [lng + half, lat + half], [lng - half, lat + half], [lng - half, lat - half]]];
    };
    const big = (pin) => pin.category === 'regions' || pin.category === 'districts';
    const pinData = {
      type: 'FeatureCollection',
      features: pins.map((pin, i) => ({
        type: 'Feature', id: i,
        properties: { i, color: solid(pin.color), h: big(pin) ? 2600 : 900 + (i % 5) * 120, name: pin.name },
        geometry: { type: 'Polygon', coordinates: square(pin.x, pin.y, big(pin) ? 0.0016 : 0.0007) },
      })),
    };
    const dotData = {
      type: 'FeatureCollection',
      features: pins.map((pin, i) => ({ type: 'Feature', id: i, properties: { i, color: solid(pin.color) }, geometry: { type: 'Point', coordinates: g.toLngLat(pin.x, pin.y) } })),
    };
    const photoData = {
      type: 'FeatureCollection',
      features: photos.map((p, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: g.toLngLat(p.x, p.y) } })),
    };
    const empty = { type: 'FeatureCollection', features: [] };

    await new Promise((resolve) => map.on('load', resolve));
    map.addSource('pins', { type: 'geojson', data: pinData });
    map.addSource('dots', { type: 'geojson', data: dotData });
    map.addSource('photos', { type: 'geojson', data: photoData });
    map.addSource('route', { type: 'geojson', data: empty });
    map.addSource('selected', { type: 'geojson', data: empty });
    map.addSource('links', { type: 'geojson', data: empty });
    // Density: where pins crowd together (only the pins currently shown), off until asked for.
    map.addLayer({ id: 'pin-heat', type: 'heatmap', source: 'dots', layout: { visibility: 'none' },
      paint: { 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 14, 12, 46], 'heatmap-opacity': 0.72, 'heatmap-intensity': 0.9,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(91,60,214,0.45)', 0.5, 'rgba(238,63,124,0.7)', 1, 'rgba(255,209,102,0.95)'] } });
    map.addLayer({ id: 'pin-dots', type: 'circle', source: 'dots', maxzoom: 11,
      paint: { 'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 10, 5.5], 'circle-stroke-color': '#0b0a17', 'circle-stroke-width': 1.5, 'circle-pitch-alignment': 'map' } });
    map.addLayer({ id: 'pin-columns', type: 'fill-extrusion', source: 'pins', minzoom: 9.6,
      paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.92, 'fill-extrusion-vertical-gradient': true } });
    // The chosen pin: a white column a little taller than the rest, with a ring on the ground.
    map.addLayer({ id: 'pin-selected', type: 'fill-extrusion', source: 'pins', filter: ['==', ['get', 'i'], -1],
      paint: { 'fill-extrusion-color': '#ffffff', 'fill-extrusion-height': ['*', ['get', 'h'], 1.35], 'fill-extrusion-opacity': 0.95 } });
    map.addLayer({ id: 'selected-ring', type: 'circle', source: 'selected',
      paint: { 'circle-color': 'rgba(255,255,255,0)', 'circle-radius': 16, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5, 'circle-pitch-alignment': 'map' } });
    // Lines from the opened pin to the places its entry names as related.
    map.addLayer({ id: 'rel-lines', type: 'line', source: 'links', layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#ff6f9e', 'line-width': 2.5, 'line-dasharray': [0.4, 2], 'line-opacity': 0.95 } });
    // The route: a dark casing under a bright dashed line, so it reads over any part of the poster.
    map.addLayer({ id: 'route-casing', type: 'line', source: 'route', filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#120a1c', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 12, 11], 'line-opacity': 0.85 } });
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffd166', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6], 'line-dasharray': [1.5, 1.2] } });
    map.addLayer({ id: 'route-stops', type: 'circle', source: 'route', filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-color': '#ffd166', 'circle-radius': 11, 'circle-stroke-color': '#120a1c', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'viewport' } });
    map.addLayer({ id: 'photo-dots', type: 'circle', source: 'photos', layout: { visibility: 'none' },
      paint: { 'circle-color': '#3d9bff', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 7], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5, 'circle-opacity': 0.9 } });

    const onPin = (e) => handlers.onPin?.(e.features[0].properties.i, e.lngLat);
    const pointer = () => { map.getCanvas().style.cursor = 'pointer'; };
    const plain = () => { map.getCanvas().style.cursor = ''; };
    for (const layer of ['pin-columns', 'pin-dots', 'pin-selected']) {
      map.on('click', layer, onPin);
      map.on('mouseenter', layer, pointer);
      map.on('mouseleave', layer, plain);
    }
    // Hover: the pin's name in a small label (the 2D map's tooltip, in 3D).
    const hover = new window.maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map3d-hover', offset: 10 });
    for (const layer of ['pin-columns', 'pin-dots']) {
      map.on('mousemove', layer, (e) => {
        const pin = pins[e.features[0].properties.i];
        hover.setLngLat(e.lngLat).setHTML(`<b>${esc(pin.name)}</b>${pin.kind ? `<span>${esc(pin.kind)}</span>` : ''}`).addTo(map);
      });
      map.on('mouseleave', layer, () => hover.remove());
    }
    map.on('click', 'photo-dots', (e) => {
      const [x, y] = g.toXY(e.lngLat.lng, e.lngLat.lat);
      handlers.onStreet?.(x, y);
    });
    map.fitBounds([g.corners[3], g.corners[1]], { padding: 24, pitch: HOME.pitch, bearing: HOME.bearing, duration: 0 });
    // Open a little closer than the whole sheet, on the island itself.
    map.jumpTo({ center: g.toLngLat(0.6, 0.52), zoom: map.getZoom() + 0.9 });
    const home = { center: map.getCenter(), zoom: map.getZoom(), ...HOME };
    const ms = (normal) => (reducedMotion() || handlers.calm?.() ? 0 : normal * (handlers.scale?.() ?? 1));

    // Text on the 3D map is drawn as small page elements pinned to the map (MapLibre's own text
    // needs a font server; these use the app's fonts and work offline).
    const label = (lngLat, className, html, anchor = 'center') => {
      const el = document.createElement('div');
      el.className = className;
      el.innerHTML = html;
      return new window.maplibregl.Marker({ element: el, anchor }).setLngLat(lngLat).addTo(map);
    };
    let stopLabels = [];
    let placeLabels = [];
    let selectedLabel = null;
    let ringTimer = 0;
    let gone = false; // after destroy(), late calls (a popup closing as the page changes) do nothing
    return {
      map,
      toXY: (lng, lat) => g.toXY(lng, lat),
      toLngLat: (x, y) => g.toLngLat(x, y),
      /** The map position under a point on the screen, as x and y from 0 to 1. */
      xyAt(clientX, clientY) {
        const box = element.getBoundingClientRect();
        const ll = map.unproject([clientX - box.left, clientY - box.top]);
        return g.toXY(ll.lng, ll.lat);
      },
      showPhotos(on) { if (gone) return; if (map.getLayer('photo-dots')) map.setLayoutProperty('photo-dots', 'visibility', on ? 'visible' : 'none'); },
      flyTo(x, y, zoom = 11.5) { map.flyTo({ center: g.toLngLat(x, y), zoom, pitch: 62, duration: ms(1400), curve: 1.6 }); },
      /** Highlight one pin (or none, with -1); the ring pulses briefly unless motion is reduced. */
      select(i) { if (gone) return;
        map.setFilter('pin-selected', ['==', ['get', 'i'], i]);
        clearInterval(ringTimer);
        const pin = pins[i];
        selectedLabel?.remove();
        selectedLabel = pin ? label(g.toLngLat(pin.x, pin.y), 'map3d-label is-selected', `<span>${esc(pin.name)}</span>`, 'bottom') : null;
        map.getSource('selected').setData(pin ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: g.toLngLat(pin.x, pin.y) } }] } : empty);
        if (pin && !reducedMotion()) {
          let t = 0;
          if (handlers.scale?.() === 0.5) return; // "gentle" motion: a still ring
          ringTimer = setInterval(() => {
            t += 1;
            map.setPaintProperty('selected-ring', 'circle-radius', 14 + 8 * Math.abs(Math.sin(t / 6)));
            if (t > 60) { clearInterval(ringTimer); map.setPaintProperty('selected-ring', 'circle-radius', 16); }
          }, 50);
        }
      },
      /** Show only these pins (indexes), or all of them with null. */
      filter(indexes) { if (gone) return;
        const f = indexes ? ['in', ['get', 'i'], ['literal', indexes]] : null;
        map.setFilter('pin-columns', f);
        map.setFilter('pin-dots', f);
        map.setFilter('pin-heat', f);
      },
      /** The density overlay on or off. */
      density(on) { if (gone) return; map.setLayoutProperty('pin-heat', 'visibility', on ? 'visible' : 'none'); },
      /** District, town and area names on or off (places: {name, x, y, kind}). */
      names(on, places = []) { if (gone) return;
        placeLabels.forEach((m) => m.remove());
        placeLabels = on ? places.map((pl) => label(g.toLngLat(pl.x, pl.y), `map3d-label place-${pl.kind}`, `<span>${esc(pl.name)}</span>`)) : [];
      },
      /** Lines between pairs of pins: [[from, to], ...] with x, y from 0 to 1. */
      links(pairs) { if (gone) return;
        map.getSource('links').setData({ type: 'FeatureCollection', features: pairs.map(([a, b]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [g.toLngLat(a.x, a.y), g.toLngLat(b.x, b.y)] } })) });
      },
      /** Flat (looking straight down) or tilted; returns whether it is now tilted. */
      tilt() { if (gone) return false; const flat = map.getPitch() > 5; map.easeTo({ pitch: flat ? 0 : HOME.pitch, duration: ms(700) }); return !flat; },
      /** Draw a route: numbered stops (x, y from 0 to 1), joined along `path` when given, else straight. */
      route(stops, path) { if (gone) return;
        const coords = stops.map((s) => g.toLngLat(s.x, s.y));
        const line = path?.length > 1 ? path.map((p) => g.toLngLat(p.x, p.y)) : coords;
        map.getSource('route').setData({
          type: 'FeatureCollection',
          features: [
            ...(coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }] : []),
            ...coords.map((c, k) => ({ type: 'Feature', properties: { n: k + 1 }, geometry: { type: 'Point', coordinates: c } })),
          ],
        });
        stopLabels.forEach((m) => m.remove());
        stopLabels = coords.map((c, k) => label(c, 'map3d-stop', `<span>${k + 1}</span>`));
        stopLabels.forEach((m, k) => m.getElement().setAttribute('title', stops[k].name || `Stop ${k + 1}`));
      },
      /** Back to the opening view: the island, tilted, north up-ish. */
      reset() { map.flyTo({ ...home, duration: ms(1200) }); },
      /** The camera, as plain numbers (x, y from 0 to 1), for saving and for the 2D map to follow. */
      view() {
        const c = map.getCenter();
        const [x, y] = g.toXY(c.lng, c.lat);
        return { x, y, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
      },
      setView(v, animate = true) {
        const camera = { center: g.toLngLat(v.x, v.y), zoom: v.zoom ?? map.getZoom(), pitch: v.pitch ?? HOME.pitch, bearing: v.bearing ?? HOME.bearing };
        if (animate) map.flyTo({ ...camera, duration: ms(1200) }); else map.jumpTo(camera);
      },
      popup(lngLat, node) {
        return new window.maplibregl.Popup({ maxWidth: '340px', className: 'map-popup map3d-popup', offset: 14 }).setLngLat(lngLat).setDOMContent(node).addTo(map);
      },
      destroy() { gone = true; clearInterval(ringTimer); hover.remove(); [...stopLabels, ...placeLabels, selectedLabel].forEach((m) => m?.remove()); map.remove(); },
    };
  }

  // ---------- street view ----------

  const PRECISION = {
    // The pins themselves are approximate (placed by hand or from a guide map), so no picture is "exact".
    pin: 'At its entry’s pin (the pin is approximate)',
    town: 'Approximate: placed at its town',
    district: 'Approximate: placed at its district',
    region: 'Approximate: placed at its region',
    landmark: 'Approximate: placed at a landmark nearby',
    area: 'Approximate: placed at the area its entry names',
  };
  const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

  /**
   * Open the street view at a spot. options: { x, y, photos (each {src,x,y,title,ref,credit,at,precision}),
   *   config (the map), walker (picture URL), places, link(ref) → entry URL,
   *   onSave(x, y, where), onSwap() → new walker URL, onClose }
   */
  function open(options) {
    const { config } = options;
    const W = config.width, H = config.height;
    const near = options.photos
      .map((p) => ({ p, d: Math.hypot((p.x - options.x) * W, (p.y - options.y) * H) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 30);
    // The town or district nearest the spot where the walker landed names the view.
    const where = (options.places || []).reduce((best, pl) => {
      const d = Math.hypot((pl.x - options.x) * W, (pl.y - options.y) * H);
      return !best || d < best.d ? { d, name: pl.name } : best;
    }, null)?.name || near[0]?.p.at || 'here';
    const opener = document.activeElement;
    const root = document.createElement('div');
    root.className = 'sv';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Street Explorer near ${where}`);
    document.body.append(root);
    let index = 0;
    let walker = options.walker;
    let who = options.who || (/lucia/.test(walker) ? 'lucia' : 'jason');
    const ic = (name) => (window.icon ? window.icon(name) : '');
    // Jason and Lucia as two portrait badges; the one walking has the pink ring.
    const cast = () => (options.onSwap ? `<div class="sv-cast" role="radiogroup" aria-label="Walk as">${['jason', 'lucia'].map((w) => `<button type="button" class="sv-badge" role="radio" aria-checked="${w === who}" data-who="${w}"><img src="${esc(window.walkerPicture ? window.walkerPicture(w) : `/images/map/walker-${w}.png`)}" alt=""><span>${w === 'jason' ? 'Jason' : 'Lucia'}</span></button>`).join('')}</div>`
      : `<span class="sv-badge" aria-hidden="true"><img src="${esc(walker)}" alt=""></span>`);

    if (!near.length) {
      root.innerHTML = `<div class="sv-empty"><img src="${esc(walker)}" alt=""><h2>No pictures here yet</h2>
        <p>None of the app's in-game pictures is tied to a place on the map.</p><button type="button" class="btn" data-close>Back to the map</button></div>`;
    } else {
      root.innerHTML = `
        <div class="sv-photo"><div class="sv-backdrop" aria-hidden="true"></div><img alt="" draggable="false" decoding="async"><div class="sv-shade"></div></div>
        <header class="sv-top">
          ${cast()}
          <div><span class="kicker">Street Explorer</span><h2 class="sv-where">Near ${esc(where)}</h2>
            <p class="sv-note">Real in-game screenshots, nearest first. They are single pictures, not 360° views: drag one to look across it, use the arrows to walk on.</p></div>
          <div class="sv-actions">
            <button type="button" class="sv-act" data-home aria-label="Back to start" title="Back to the picture nearest where you dropped in (Home)">${ic('reset')}<span>Back to start</span></button>
            ${options.onSave ? `<button type="button" class="sv-act" data-save aria-label="Save this spot">${ic('bookmark')}<span>Save this spot</span></button>` : ''}
            <button type="button" class="btn btn-primary btn-small sv-close" data-close aria-label="Close Street Explorer and return to the map">${ic('back')}<span>Back to map</span></button>
          </div>
        </header>
        <button type="button" class="sv-nav sv-prev" data-step="-1" aria-label="Previous picture">${ic('chevron-left')}</button>
        <button type="button" class="sv-nav sv-next" data-step="1" aria-label="Next picture">${ic('chevron-right')}</button>
        <div class="sv-mini" aria-hidden="true"><svg class="sv-mini-line"><line></line></svg><i class="sv-mini-you"></i><i class="sv-mini-here"></i><i class="sv-mini-next"></i></div>
        <footer class="sv-bottom">
          <div class="sv-caption"></div>
          <ol class="sv-strip">${near.map(({ p }, i) => `<li><button type="button" data-go="${i}" aria-label="${esc(p.title)}"><img src="${esc(p.src)}" alt="" loading="lazy"></button></li>`).join('')}</ol>
        </footer>`;
    }

    let img = root.querySelector('.sv-photo img');
    let pan = 50, zoom = 1, maxZoom = 1.8;
    const place = () => { if (img) { img.style.objectPosition = `${pan}% 50%`; img.style.transform = `scale(${zoom})`; } };
    // Sharpness first: a picture is never shown much bigger than it really is. One that would have
    // to be enlarged more than 1.6 times to fill the screen is shown whole, at up to 1.6 times its
    // own size, over a soft blurred copy of itself; leaning in (the wheel) stops at 1.5 times.
    const SOFT = 1.6;
    function fit(el) {
      const box = root.querySelector('.sv-photo');
      const W2 = box.clientWidth || innerWidth, H2 = box.clientHeight || innerHeight;
      const nw = el.naturalWidth || W2, nh = el.naturalHeight || H2;
      const cover = Math.max(W2 / nw, H2 / nh);
      const whole = cover > SOFT;
      el.classList.toggle('is-whole', whole);
      el.style.setProperty('--sv-w', `${Math.round(nw * SOFT)}px`);
      el.style.setProperty('--sv-h', `${Math.round(nh * SOFT)}px`);
      box.classList.toggle('has-backdrop', whole);
      maxZoom = whole ? 1 : Math.max(1, Math.min(1.8, 1.5 / cover));
      zoom = Math.min(zoom, maxZoom);
    }
    // The pictures either side are fetched ahead, so stepping on shows the next one at once.
    const ahead = new Map();
    const preload = (src) => { if (src && !ahead.has(src)) { const im = new Image(); im.decoding = 'async'; im.src = src; ahead.set(src, im); } };
    let showing = 0;
    const mini = root.querySelector('.sv-mini');
    const scale = 0.42; // mini-map: the official map at 42%, centred on the picture's place

    function show(i) {
      if (!near.length) return;
      index = (i + near.length) % near.length;
      const { p } = near[index];
      options.onPhoto?.(p);
      const next = near[(index + 1) % near.length].p;
      pan = 50; zoom = 1;
      // Cross-fade: the new picture is decoded first, then fades in over the one on screen, so
      // stepping never blinks to black.
      const ticket = ++showing;
      const incoming = img.cloneNode(false);
      incoming.classList.remove('is-in', 'is-whole');
      incoming.src = p.src;
      const ready = incoming.decode ? incoming.decode().catch(() => {}) : Promise.resolve();
      ready.then(() => {
        if (ticket !== showing || !root.isConnected) return;
        const old = img;
        fit(incoming);
        root.querySelector('.sv-backdrop').style.backgroundImage = `url("${p.src}")`;
        old.after(incoming);
        img = incoming;
        place();
        requestAnimationFrame(() => incoming.classList.add('is-in'));
        old.classList.remove('is-in');
        setTimeout(() => old.remove(), 450);
      });
      preload(next.src);
      preload(near[(index - 1 + near.length) % near.length].p.src);
      const link = options.link(p.ref);
      // Which way the next picture lies from this one, on the map (only when they are apart).
      const dx = (next.x - p.x) * W, dy = (next.y - p.y) * H;
      const apart = Math.hypot(dx, dy) > 6;
      const heading = apart ? COMPASS[Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360 / 45) % 8] : '';
      root.querySelector('.sv-caption').innerHTML = `${link ? `<a href="${esc(link)}" data-close>${esc(p.title)}</a>` : `<b>${esc(p.title)}</b>`}
        <span>${esc(p.credit)} · ${esc(PRECISION[p.precision] || PRECISION.area)}${p.precision !== 'pin' ? ` (${esc(p.at)})` : ''} · ${index + 1} of ${near.length}</span>
        <span class="sv-next-hint">Next: ${esc(next.title)}${apart ? ` · roughly ${heading} of this one (both places are approximate)` : ' · placed at the same spot'}</span>`;
      root.querySelector('.sv-next').title = `Next: ${next.title}`;
      root.querySelectorAll('.sv-strip button').forEach((b, k) => b.classList.toggle('is-on', k === index));
      root.querySelector(`.sv-strip [data-go="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
      const box = mini.clientWidth || 180;
      mini.style.backgroundImage = `url("${config.image}")`;
      mini.style.backgroundSize = `${W * scale}px ${H * scale}px`;
      mini.style.backgroundPosition = `${box / 2 - p.x * W * scale}px ${box / 2 - p.y * H * scale}px`;
      const at = (q) => [box / 2 + (q.x - p.x) * W * scale, box / 2 + (q.y - p.y) * H * scale];
      const [yx, yy] = at({ x: options.x, y: options.y });
      const you = mini.querySelector('.sv-mini-you');
      you.style.left = `${yx}px`;
      you.style.top = `${yy}px`;
      you.style.backgroundImage = `url("${walker}")`;
      const [nx, ny] = at(next);
      const dot = mini.querySelector('.sv-mini-next');
      dot.style.left = `${nx}px`;
      dot.style.top = `${ny}px`;
      dot.hidden = !apart;
      const line = mini.querySelector('line');
      line.setAttribute('x1', box / 2); line.setAttribute('y1', box / 2);
      line.setAttribute('x2', nx); line.setAttribute('y2', ny);
      line.style.display = apart ? '' : 'none';
    }

    // Look around: drag sideways to pan across the picture, wheel to lean in.
    let drag = null;
    const photo = root.querySelector('.sv-photo');
    photo?.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, pan }; photo.setPointerCapture(e.pointerId); });
    photo?.addEventListener('pointermove', (e) => {
      if (!drag) return;
      pan = Math.max(0, Math.min(100, drag.pan - ((e.clientX - drag.x) / root.clientWidth) * 140));
      place();
    });
    photo?.addEventListener('pointerup', () => { drag = null; });
    photo?.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(1, Math.min(maxZoom, zoom - e.deltaY * 0.0012)); place(); }, { passive: false });
    // A window resized while open re-fits the picture on screen.
    const onResize = () => { if (img?.complete) { fit(img); place(); } };
    addEventListener('resize', onResize);

    function close() {
      removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('hashchange', close);
      root.remove();
      // Back to whatever opened it; when that is gone (a closed card) or was the page itself (a click
      // on the map), to the control the page names instead.
      const back = opener && opener !== document.body && opener.isConnected ? opener : options.focusAfter?.();
      back?.focus?.({ preventScroll: true });
      options.onClose?.();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
      if (e.key === 'Home') { e.preventDefault(); show(0); }
    }
    document.addEventListener('keydown', onKey, true);
    // Leaving the page (a link, the back button) closes it, so nothing is left listening.
    window.addEventListener('hashchange', close);
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-close], [data-step], [data-go], [data-home], [data-save], [data-who]');
      if (!t) return;
      if (t.dataset.step) show(index + Number(t.dataset.step));
      else if (t.dataset.go !== undefined) show(Number(t.dataset.go));
      else if (t.dataset.home !== undefined) show(0);
      else if (t.dataset.save !== undefined) {
        options.onSave(options.x, options.y, where);
        t.innerHTML = `${ic('check')}<span>Saved</span>`; t.setAttribute('aria-label', 'Saved');
        t.disabled = true;
      } else if (t.dataset.who !== undefined) {
        if (!options.onSwap || t.dataset.who === who) return;
        walker = options.onSwap();
        who = t.dataset.who;
        root.querySelectorAll('.sv-badge[data-who]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.who === who)));
        show(index);
      } else close();
    });
    show(0);
    root.querySelector('.sv-close, [data-close]')?.focus();
    return { close };
  }

  window.Map3D = { create };
  window.StreetView = { open };
})();

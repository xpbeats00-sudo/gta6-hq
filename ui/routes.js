// GTA 6 HQ: route legs that follow the map instead of crossing it in a straight line.
// The grids (built by scripts/build_route_grid.py from the detailed community map the app shows when
// zoomed in) mark each cell as road, track, land or sea: images/map/leonida-roads.png has one cell per
// 2 x 2 pixels of Rockstar's official map and is what legs are drawn on; images/map/leonida-routes.png
// (6 x 6) is for putting stops in order quickly. A leg is the cheapest way across the grid, so it keeps
// to the streets, highways and bridges, takes dirt tracks next, crosses open land only for the last
// stretch to a pin off the road, and water only where nothing else gets there (an island with no
// bridge): those stretches are marked.
// Positions are x, y from 0 to 1 on the official map, as everywhere else. Loaded before app.js.
(function () {
  const FINE = '/images/map/leonida-roads.png';
  const COARSE = '/images/map/leonida-routes.png';
  const SEA = 0, LAND = 96, TRACK = 176, ROAD = 255;
  // What a step into each kind of cell costs. Roads are the way to go, tracks nearly as good; open
  // land is far slower, so a leg leaves the road only to reach a pin that is off it; water is a last
  // resort, so a route only crosses it where the map shows no other way.
  const COST = { [ROAD]: 1, [TRACK]: 2.5, [LAND]: 14, [SEA]: 120 };
  const loading = {};

  /** A grid, read once: { w, h, kind, cost } (null when it can't be loaded: lines stay straight). */
  function load(url = FINE) {
    loading[url] ||= fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0);
        const px = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
        const kind = new Uint8Array(bitmap.width * bitmap.height);
        for (let i = 0; i < kind.length; i++) {
          const v = px[i * 4];
          kind[i] = v > 215 ? ROAD : v > 136 ? TRACK : v > 48 ? LAND : SEA;
        }
        const n = bitmap.width * bitmap.height;
        // Work arrays for the search, made once per grid and reset for each leg.
        const work = { g: new Float32Array(n), from: new Int32Array(n), done: new Uint8Array(n) };
        return { w: bitmap.width, h: bitmap.height, kind, cost: Float32Array.from(kind, (k) => COST[k]), work };
      })
      .catch(() => null);
    return loading[url];
  }

  /** A binary heap of cell indexes ordered by priority (smallest first). */
  function heap() {
    const items = [];
    const prio = [];
    return {
      get size() { return items.length; },
      push(item, p) {
        items.push(item); prio.push(p);
        let i = items.length - 1;
        while (i > 0) {
          const up = (i - 1) >> 1;
          if (prio[up] <= prio[i]) break;
          [items[up], items[i]] = [items[i], items[up]]; [prio[up], prio[i]] = [prio[i], prio[up]];
          i = up;
        }
      },
      pop() {
        const top = items[0];
        const lastItem = items.pop(); const lastPrio = prio.pop();
        if (items.length) {
          items[0] = lastItem; prio[0] = lastPrio;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < items.length && prio[l] < prio[m]) m = l;
            if (r < items.length && prio[r] < prio[m]) m = r;
            if (m === i) break;
            [items[m], items[i]] = [items[i], items[m]]; [prio[m], prio[i]] = [prio[i], prio[m]];
            i = m;
          }
        }
        return top;
      },
    };
  }

  const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

  /** The cheapest cells from a to b (A*, eight directions). Returns cell indexes, a first. */
  function cells(grid, a, b) {
    const { w, h, cost } = grid;
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return []; // a stop without a usable position
    const clamp = (v, n) => Math.min(n - 1, Math.max(0, Math.floor(v)));
    const ax = clamp(a.x * w, w), ay = clamp(a.y * h, h), bx = clamp(b.x * w, w), by = clamp(b.y * h, h);
    const start = ay * w + ax, goal = by * w + bx;
    if (start === goal) return [start];
    const { g, from, done } = grid.work;
    g.fill(Infinity); from.fill(-1); done.fill(0);
    const guess = (x, y) => { const dx = Math.abs(x - bx), dy = Math.abs(y - by); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
    const open = heap();
    g[start] = 0;
    open.push(start, guess(ax, ay));
    while (open.size) {
      const at = open.pop();
      if (at === goal) break;
      if (done[at]) continue;
      done[at] = 1;
      const x = at % w, y = (at - x) / w;
      for (const [dx, dy, len] of STEPS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const next = ny * w + nx;
        if (done[next]) continue;
        const step = g[at] + len * (cost[next] + cost[at]) / 2;
        if (step < g[next]) { g[next] = step; from[next] = at; open.push(next, step + guess(nx, ny)); }
      }
    }
    if (!(from[goal] >= 0)) return [start, goal];
    const path = [];
    for (let at = goal; at !== -1; at = from[at]) path.push(at);
    return path.reverse();
  }

  /** Drop points that lie on a nearly straight line (Douglas–Peucker, tolerance in cells). */
  function simplify(points, tol) {
    if (points.length < 3) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop();
      const [x1, y1] = points[s], [x2, y2] = points[e];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      let worst = 0, at = -1;
      for (let i = s + 1; i < e; i++) {
        const d = Math.abs((y2 - y1) * points[i][0] - (x2 - x1) * points[i][1] + x2 * y1 - y2 * x1) / len;
        if (d > worst) { worst = d; at = i; }
      }
      if (worst > tol) { keep[at] = 1; stack.push([s, at], [at, e]); }
    }
    return points.filter((_, i) => keep[i]);
  }

  /**
   * One leg, a to b: stretches of { water, points: [{x, y}] }, each starting where the last ended.
   * `water` is true where the leg crosses the sea (no road or land joins the two places on the map).
   */
  function leg(grid, a, b) {
    const path = cells(grid, a, b);
    const { w, h, kind } = grid;
    // Runs of water and of road or land; each run starts at the last point of the one before.
    let runs = [];
    for (const c of path) {
      const water = kind[c] === SEA;
      const p = [(c % w) + 0.5, Math.floor(c / w) + 0.5];
      const last = runs.at(-1);
      if (last && last.water === water) last.cells.push(p);
      else runs.push({ water, cells: last ? [last.cells.at(-1), p] : [p] });
    }
    // A few cells of water are not a crossing: a pin a little offshore, or a canal under a road the
    // grid is too coarse to show. Those count as land, and runs of the same kind are joined again.
    runs = runs.map((r, i) => ({ ...r, water: r.water && r.cells.length - (i ? 1 : 0) > 15 }));
    runs = runs.reduce((all, r) => {
      const last = all.at(-1);
      if (last && last.water === r.water) last.cells.push(...r.cells.slice(1));
      else all.push(r);
      return all;
    }, []);
    const out = runs.map((r) => ({ water: r.water, points: simplify(r.cells, 0.6).map(([x, y]) => ({ x: x / w, y: y / h })) }));
    if (out.length) {
      out[0].points[0] = { x: a.x, y: a.y };
      const end = out.at(-1).points;
      // Two stops in the same cell still get a line between them.
      if (end.length === 1) end.push({ x: b.x, y: b.y });
      else end[end.length - 1] = { x: b.x, y: b.y };
    }
    return out;
  }

  /** What it costs to reach each of `targets` from `src` (Dijkstra, stopping once all are reached). */
  function costsFrom(grid, src, targets) {
    const { w, h, cost } = grid;
    const cell = (p) => Math.min(h - 1, Math.max(0, Math.floor(p.y * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(p.x * w)));
    const want = new Map();
    targets.forEach((t, k) => { const c = cell(t); if (!want.has(c)) want.set(c, []); want.get(c).push(k); });
    const out = new Array(targets.length).fill(Infinity);
    const g = new Float32Array(w * h).fill(Infinity);
    const done = new Uint8Array(w * h);
    const open = heap();
    const s = cell(src);
    g[s] = 0;
    open.push(s, 0);
    let left = want.size;
    while (open.size && left) {
      const at = open.pop();
      if (done[at]) continue;
      done[at] = 1;
      if (want.has(at)) { want.get(at).forEach((k) => { out[k] = g[at]; }); left -= 1; }
      const x = at % w, y = (at - x) / w;
      for (const [dx, dy, len] of STEPS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const next = ny * w + nx;
        if (done[next]) continue;
        const step = g[at] + len * (cost[next] + cost[at]) / 2;
        if (step < g[next]) { g[next] = step; open.push(next, step); }
      }
    }
    return out;
  }

  /**
   * Travel costs between every two of `points` along the grid (the same costs the legs use), as a
   * square table: m[i][j]. For putting a run in order by the way you would go, not as the crow flies.
   * Null when the grid can't be loaded.
   */
  async function matrix(points, isStale = () => false) {
    const grid = await load(COARSE);
    if (!grid) return null;
    const m = [];
    for (const p of points) {
      if (isStale()) return null; // a newer request (or another page) took over: stop working
      m.push(costsFrom(grid, p, points));
      await new Promise((r) => setTimeout(r)); // between frames, so the map stays responsive
    }
    // The costs are the same both ways; average away any rounding so the table is exactly symmetric.
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { const v = (m[i][j] + m[j][i]) / 2; m[i][j] = m[j][i] = v; }
    return m;
  }

  const cache = new Map();
  /** Every leg of a route, stop to stop, from the cache where it has been worked out before. */
  async function route(stops, isStale = () => false) {
    const grid = await load();
    if (!grid) return null;
    const legs = [];
    for (let k = 1; k < stops.length; k++) {
      if (isStale()) return null; // the route changed, or the map was left: stop working
      const key = `${stops[k - 1].x},${stops[k - 1].y}>${stops[k].x},${stops[k].y}`;
      if (!cache.has(key)) {
        cache.set(key, leg(grid, stops[k - 1], stops[k]));
        if (cache.size > 2000) cache.delete(cache.keys().next().value);
        await new Promise((r) => setTimeout(r)); // a long run is worked out between frames, not in one block
      }
      legs.push(cache.get(key));
    }
    return legs;
  }

  window.MapRoutes = { load, route, matrix };
}());

// GTA 6 HQ on the web: the app's own pages, run without the desktop app's server.
// The desktop window talks to the app's local server (/api/...). On the hosted site there is no
// server, so this file stands in for it before app.js loads:
//   - the data (/api/wiki, /api/manual, /api/media, /api/health, /api/storage) comes from the
//     files that scripts/build_site.py exported from the app's own server at build time;
//   - saved data and settings (/api/userdata, /api/settings) are kept in this browser
//     (localStorage), merged a part at a time exactly as the server does;
//   - search (/api/search) runs here over the same wiki;
//   - desktop-only things (updates, Discord status, presence) answer "not here".
// Built by scripts/build_site.py; nothing in ui/ is changed for the web.
(function () {
  'use strict';
  const realFetch = window.fetch.bind(window);
  const FILES = { '/api/wiki': 'api/wiki.json', '/api/manual': 'api/manual.json', '/api/media': 'api/media.json',
    '/api/health': 'api/health.json', '/api/storage': 'api/storage.json' };
  const STORES = { '/api/userdata': 'gta6hq-userdata', '/api/settings': 'gta6hq-settings' };
  window.GTA6HQ_WEB = true;
  document.documentElement.dataset.hqWeb = '1';

  const json = (value, status = 200) => new Response(value === undefined ? null : JSON.stringify(value),
    { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

  let wikiLoading = null;
  const wiki = () => (wikiLoading ||= realFetch(FILES['/api/wiki']).then((r) => r.json()));

  // ---- search: every word must appear (name, other names, summary); else all but one ----
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = (s) => fold(s).split(/[^a-z0-9$]+/).filter(Boolean);
  async function search(params) {
    const data = await wiki();
    const q = words(params.get('q'));
    const only = params.get('section') || '';
    const spoilers = params.get('spoilers') === 'true';
    const limit = Math.min(200, Number(params.get('limit')) || 50);
    const offset = Number(params.get('offset')) || 0;
    const rows = [];
    for (const c of data.categories || []) {
      for (const e of data[c.key] || []) {
        if (!e || !e.slug) continue;
        const name = words(e.name);
        const also = words((e.aliases || []).join(' '));
        const rest = words(`${e.summary || ''} ${(e.tags || []).join(' ')}`);
        let found = 0, score = 0;
        for (const w of q) {
          const hit = (list) => list.some((t) => t === w || (w.length > 2 && t.startsWith(w)));
          if (hit(name)) { found++; score += name.includes(w) ? 30 : 20; } else if (hit(also)) { found++; score += 15; } else if (hit(rest)) { found++; score += 4; }
        }
        if (!found) continue;
        if (fold(e.name) === q.join(' ')) score += 100;
        rows.push({ c, e, found, score });
      }
    }
    let partial = false;
    let matches = rows.filter((r) => r.found === q.length);
    if (!matches.length && q.length > 1) { matches = rows.filter((r) => r.found === q.length - 1); partial = matches.length > 0; }
    const sections = {};
    matches.forEach((r) => { sections[r.c.key] = (sections[r.c.key] || 0) + 1; });
    if (only) matches = matches.filter((r) => r.c.key === only);
    matches.sort(params.get('sort') === 'name'
      ? (a, b) => a.e.name.localeCompare(b.e.name)
      : (a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
    const hits = matches.slice(offset, offset + limit).map(({ c, e, score }) => {
      const hide = e.spoiler === true && !spoilers;
      return { section: c.key, slug: e.slug, name: e.name, summary: hide ? '' : (e.summary || ''), image: e.image || null,
        art: e.art || null, confidence: e.confidence || '', spoiler: e.spoiler === true, score };
    });
    return { total: matches.length, offset, limit, partial, sections, hits };
  }

  async function answer(path, params, init) {
    const method = (init && init.method || 'GET').toUpperCase();
    if (FILES[path] && method === 'GET') return realFetch(FILES[path]);
    if (STORES[path]) {
      const saved = read(STORES[path]);
      if (method === 'GET') return json(saved);
      let changes;
      try { changes = JSON.parse(init.body || '{}'); } catch { return new Response('Not valid JSON', { status: 400 }); }
      for (const [k, v] of Object.entries(changes || {})) { if (v === null) delete saved[k]; else saved[k] = v; }
      if (!write(STORES[path], saved)) return new Response('This browser is not letting the page save (private window or storage full).', { status: 500 });
      return path === '/api/settings' ? json(saved) : new Response(null, { status: 204 });
    }
    if (path === '/api/search') return json(await search(params));
    if (path === '/api/backup' && method === 'POST') {
      // A file download instead of a file in the Downloads folder written by the app.
      let body = {};
      try { body = JSON.parse(init.body || '{}'); } catch { /* empty backup */ }
      const name = `gta6-hq-backup-${body.stamp || Date.now()}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }));
      a.download = name;
      document.body.append(a); a.click(); a.remove();
      return json({ path: name });
    }
    if (path === '/api/presence') return json({ connected: false, web: true });
    // Updates and anything else desktop-only: not available on the web.
    return new Response('Not available on the web version', { status: 404 });
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const [path, query = ''] = url.split('?');
      return answer(path, new URLSearchParams(query), init || (typeof input === 'object' ? { method: input.method } : {}));
    }
    return realFetch(input, init);
  };
}());

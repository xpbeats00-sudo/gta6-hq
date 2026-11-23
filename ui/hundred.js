// GTA 6 HQ — the 100% Checklist: every line the game counts toward 100%, with what each one
// needs, how much it weighs, where the guide explains it, and the reader's own count.
//
// Lines, counts and pages come from the Field Manual's Master Checklist and weights from its
// Full Checklist table (both in data/manual.json), so nothing here is a figure of this page's own.
// Counts are the reader's: typed in from the game's own checklist screen, or taken from the ticks
// in the Collectible Tracker. A line that reaches its target also ticks the same row in the
// Field Manual's checklist, so the guide, Progress and this page agree.

(function () {
  const STORE = 'hundred-counts';
  /** Lines whose items the Collectible Tracker lists one by one: the tracker families that make them up. */
  const FAMILIES = {
    'g100-route-stunts': ['Stunt jumps', 'Knife flights', 'Base jumps', 'Under the Bridge'],
    'g100-route-waink-locations': ['WAiNK scans'],
    'g100-route-cocaine-flamingos': ['Cocaine flamingos'],
    'g100-route-meditation-spots': ['Meditation spots'],
    'g100-route-magazines-books-and-comics': ['Reading'],
    'g100-route-unique-playlists': ['Unique playlists'],
    'g100-route-discovered-styles': ['Styles and tattoos'],
    'g100-route-collectible-card-sets': ['Collectible cards'],
    'g100-route-kenton-sets': ["Kenton's treasure"],
    'g100-route-underwater-discoveries': ["Kenton's treasure"],
  };
  /** Lines counted by the tracker's ticks one for one (the tracker lists at least as many as the game needs). */
  const TICK_COUNTED = new Set(['g100-route-stunts', 'g100-route-waink-locations', 'g100-route-unique-playlists']);

  const plain = (s) => String(s || '').replace(/\|\|/g, '').trim();
  let lines = null; // built once from /api/manual

  /** "39 of 39" → 39, "100" → 100, "$250,000" → 250000 (money), "All main missions" → 5 chapters. */
  function target(count) {
    const text = plain(count);
    if (/^\$/.test(text)) return { need: Number(text.replace(/[^0-9]/g, '')), money: true };
    const n = text.match(/^(\d+)/);
    if (n) return { need: Number(n[1]), money: false };
    return { need: 5, money: false, unit: 'chapters' };
  }

  function build(manual) {
    const chapters = manual.chapters;
    const route = chapters.find((c) => c.id === 'g100-route');
    if (!route) return [];
    const pagesOf = (c) => c.pages || [];
    const list = pagesOf(route).flatMap((p) => p.blocks).find((b) => b.type === 'checklist' && b.items?.[0]?.key?.startsWith('g100-route-'));
    const table = pagesOf(route).flatMap((p) => p.blocks).find((b) => b.type === 'table' && b.columns.includes('Weight'));
    const weightOf = new Map((table?.rows || []).map((r) => [plain(r[0]).toLowerCase(), Number(plain(r[2]).replace('%', '')) || 1]));
    /** The guide page that explains a line, as the manual reader numbers it (a chapter's title page is page 1). */
    const href = (chapterId, title) => {
      const c = chapters.find((x) => x.id === chapterId);
      if (!c) return '#/manual/g100-route';
      const i = pagesOf(c).findIndex((p) => p.title === title);
      const offset = c.cover && c.status !== 'in-development' ? 1 : 0;
      return `#/manual/${c.id}/${(i >= 0 ? i : 0) + 1 + offset}`;
    };
    return (list?.items || []).map((it) => ({
      key: it.key,
      name: it.item,
      count: plain(it.count),
      ...target(it.count),
      weight: weightOf.get(it.item.toLowerCase()) ?? 1,
      guide: href(it.chapter || 'g100-route', it.page),
      families: FAMILIES[it.key] || [],
      ticks: TICK_COUNTED.has(it.key),
    }));
  }

  const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  const show = (line, n) => (line.money ? money(n) : String(n));

  /** Ticks in the Collectible Tracker for a set of families: { got, listed, byFamily }. */
  function tracked(families) {
    if (!families.length || !window.trackerItems) return null;
    const t = UserStore.get('collectible-ticks', {});
    const items = window.trackerItems().filter((it) => families.includes(it.family));
    const byFamily = families.map((f) => {
      const mine = items.filter((it) => it.family === f);
      return { family: f, got: mine.filter((it) => t[it.entry.slug]).length, listed: mine.length };
    }).filter((f) => f.listed);
    return { got: byFamily.reduce((s, f) => s + f.got, 0), listed: items.length, byFamily };
  }

  function countOf(line, counts, guideTicks) {
    if (line.ticks) return tracked(line.families)?.got ?? 0;
    if (typeof counts[line.key] === 'number') return counts[line.key];
    // Ticked in the Field Manual before this page existed: count it as done.
    return guideTicks[`check-${line.key}`] ? line.need : 0;
  }

  /** Keep the Field Manual's checklist row in step with this line. */
  function syncGuide(line, n) {
    const done = n >= line.need;
    if (UserStore.ticked('guide-checks', `check-${line.key}`) !== done) UserStore.tick('guide-checks', `check-${line.key}`, done);
  }

  function meter(done, need) {
    const pct = need ? Math.min(100, Math.round((done / need) * 100)) : 0;
    return `<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${pct}% done"><span style="width:${pct}%"></span></div>`;
  }

  EXTRA_PAGES.hundred = function renderHundred() {
    view.innerHTML = `${pageHead('100% Checklist', 'Every line the game counts toward 100%, with what each needs, how much it is worth and where the guide explains it. Type in the numbers from the game\'s own checklist, or let the Collectible Tracker count them for you.')}
      <div class="block hundred"><p class="muted">Loading the checklist…</p></div>`;
    const box = view.querySelector('.hundred');
    const ready = lines ? Promise.resolve(lines) : fetch('/api/manual').then((r) => r.json()).then((m) => (lines = build(m)));
    ready.then((all) => {
      if (!view.contains(box)) return;
      if (!all.length) { box.innerHTML = '<p class="muted">The checklist could not be read from the guide.</p>'; return; }
      let hideDone = false;
      const draw = () => {
        const counts = UserStore.get(STORE, {});
        const guideTicks = UserStore.get('guide-checks', {});
        const rows = all.map((line) => ({ line, n: countOf(line, counts, guideTicks) }));
        const totalWeight = all.reduce((s, l) => s + l.weight, 0);
        const score = rows.reduce((s, { line, n }) => s + line.weight * Math.min(1, n / line.need), 0);
        const overall = totalWeight ? Math.floor((score / totalWeight) * 1000) / 10 : 0;
        const finished = rows.filter(({ line, n }) => n >= line.need).length;
        // Biggest wins first: what is left of each line, times what the line is worth.
        const next = rows.filter(({ line, n }) => n < line.need)
          .sort((a, b) => b.line.weight * (1 - b.n / b.line.need) - a.line.weight * (1 - a.n / a.line.need)).slice(0, 4);
        box.innerHTML = `
          <div class="stat-grid hundred-top">
            <div class="stat-card stat-wide"><b>${overall}%</b><span>Your 100%, weighted the way the game counts it (GTABase's weights). The story alone is half.</span>${meter(score, totalWeight)}</div>
            <div class="stat-card"><b>${finished} / ${all.length}</b><span>Lines finished</span>${meter(finished, all.length)}</div>
          </div>
          ${next.length ? `<section class="hundred-next"><h2>Worth doing next</h2><ol>${next.map(({ line, n }) => `<li><a href="#hl-${esc(line.key)}">${esc(line.name)}</a> <span class="muted">${esc(show(line, n))} of ${esc(show(line, line.need))} · worth ${line.weight}%</span></li>`).join('')}</ol></section>` : '<section class="hundred-next"><h2>Every line is finished</h2><p>That is 100% by this checklist.</p></section>'}
          <div class="hundred-tools"><label class="hundred-hide"><input type="checkbox" data-hide${hideDone ? ' checked' : ''}> Hide finished lines</label>
            <a class="chip-btn" href="#/tracker">Open the Collectible Tracker</a><a class="chip-btn" href="#/manual/g100-route">Open the 100% guide</a></div>
          <ol class="hundred-list">${rows.filter(({ line, n }) => !hideDone || n < line.need).map(({ line, n }) => {
            const done = n >= line.need;
            const t = tracked(line.families);
            const step = line.money ? 1000 : 1;
            return `<li class="hundred-line${done ? ' is-done' : ''}" id="hl-${esc(line.key)}" data-line="${esc(line.key)}">
              <div class="hundred-name"><h3>${esc(line.name)}</h3><span class="muted">Needs ${line.unit ? 'the whole story (5 chapters)' : esc(line.count)} · worth ${line.weight}%</span></div>
              <div class="hundred-count">${line.ticks
                ? `<b>${esc(show(line, n))}</b><span class="muted"> / ${esc(show(line, line.need))}</span>`
                : `<button type="button" class="chip-btn" data-step="-${step}" aria-label="One less ${esc(line.name)}">−</button>
                  <input type="number" inputmode="numeric" min="0" step="${step}" value="${n}" data-count aria-label="${esc(line.name)}: your count">
                  <button type="button" class="chip-btn" data-step="${step}" aria-label="One more ${esc(line.name)}">+</button>
                  <span class="muted">/ ${esc(show(line, line.need))}</span>
                  <button type="button" class="chip-btn" data-max>${done ? 'Done' : 'Mark done'}</button>`}</div>
              ${meter(n, line.need)}
              <div class="hundred-links"><a href="${esc(line.guide)}">How to do it</a>
                ${t ? t.byFamily.map((f) => `<a href="#/tracker?family=${encodeURIComponent(f.family)}&show=todo">${esc(f.family)} <b>${f.got}/${f.listed}</b></a>`).join('') : ''}
                ${t && line.ticks ? '<span class="muted">Counted from your ticks in the tracker.</span>' : ''}
                ${t && !line.ticks && t.got ? `<span class="muted">${t.got} ticked in the tracker.</span>` : ''}</div>
            </li>`;
          }).join('')}</ol>
          <p class="muted hundred-note">Lines and targets are from PowerPyx's and Push Square's 100% lists, weights from GTABase, as the guide's Full Checklist gives them. Counts are kept on this computer, per profile.</p>`;
      };
      const save = (key, value) => {
        const line = all.find((l) => l.key === key);
        const n = Math.max(0, Math.min(line.money ? 1e9 : 100000, Math.round(Number(value) || 0)));
        UserStore.set(STORE, { ...UserStore.get(STORE, {}), [key]: n });
        syncGuide(line, n);
      };
      draw();
      box.addEventListener('click', (e) => {
        const li = e.target.closest('[data-line]');
        const btn = e.target.closest('[data-step], [data-max]');
        if (!li || !btn) return;
        const line = all.find((l) => l.key === li.dataset.line);
        const now = countOf(line, UserStore.get(STORE, {}), UserStore.get('guide-checks', {}));
        save(line.key, btn.dataset.max !== undefined ? (now >= line.need ? 0 : line.need) : now + Number(btn.dataset.step));
        draw();
        box.querySelector(`[data-line="${CSS.escape(line.key)}"] ${btn.dataset.max !== undefined ? '[data-max]' : `[data-step="${btn.dataset.step}"]`}`)?.focus();
      });
      box.addEventListener('change', (e) => {
        if (e.target.matches('[data-hide]')) { hideDone = e.target.checked; draw(); return; }
        const li = e.target.closest('[data-line]');
        if (!li || !e.target.matches('[data-count]')) return;
        save(li.dataset.line, e.target.value);
        draw();
      });
      // Ticks made elsewhere (the tracker, another window) show up here too.
      const off = UserStore.onChange((part) => { if (view.contains(box) && ['*', 'collectible-ticks'].includes(part)) draw(); });
      onLeave(off);
    }).catch(() => { box.innerHTML = '<p class="muted">The checklist could not be loaded. Try again in a moment.</p>'; });
  };
})();

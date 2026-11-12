// GTA 6 HQ — Field Manual reader.
// A printed-manual reading experience inside the app: cover, contents, two-page
// spreads, numbered entries, evidence labels, footnoted sources, search.
// Content is data (data/manual.json, served at /api/manual); this file only lays it out.
//
// Entry point: Manual.render(view, chapterId, pageInChapter, params, wiki)

(function () {
  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const EVIDENCE = {
    demonstrated: ['Demonstrated', 'Visible in official Rockstar footage or other official material.'],
    'developer-described': ['Developer-described', 'Described by a Rockstar developer in an interview.'],
    'preview-reported': ['Preview-reported', 'Reported by journalists or creators who saw a preview build.'],
    interpretation: ['Interpretation', 'A reasonable reading of footage or reporting, not a confirmed rule.'],
    unknown: ['Unknown', 'Not established by the sources available.'],
    'verified-after-release': ['Verified after release', 'Checked against the released game.'],
  };
  const CONFIDENCE = { official: 'Official', corroborated: 'Corroborated', community: 'Community', rumor: 'Rumor' };
  const WIDE = matchMedia('(min-width: 1180px)');
  const store = {
    get(key) { try { return localStorage.getItem(`gta6hq-manual-${key}`); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(`gta6hq-manual-${key}`, value); } catch { /* storage unavailable */ } },
  };

  let manual = null;   // the loaded data
  let pages = [];      // every page of the book, in order; pages[0] is page 2 (the cover is page 1)
  let current = null;  // what is on screen: { view, chapterId, pageInChapter, params, wiki }

  // ---------- building the book ----------

  const entryLink = (section, slug) => (
    section === 'characters' || section === 'locations' ? `#/${section}/${slug}` : `#/wiki/${section}/${slug}`
  );
  const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

  function buildPages(wiki) {
    pages = [];
    for (const chapter of manual.chapters) {
      const start = pages.length;
      const add = (title, blocks) => pages.push({ chapter, title, blocks });
      const heading = chapter.heading || { text: chapter.title.replace(chapter.accent, '').trim(), accent: chapter.accent };

      if (chapter.status === 'in-development') {
        add(chapter.title, [{ type: 'heading', ...heading }, ...(chapter.image ? [{ type: 'image', ...chapter.image }] : []), { type: 'development', text: chapter.note }]);
      } else if (chapter.wiki) {
        const entries = (wiki[chapter.wiki.section] || []).filter((e) => e.status !== 'draft' && !e.spoiler);
        chunk(entries, chapter.wiki.perPage || 3).forEach((group, pageIndex) => {
          const blocks = pageIndex === 0 ? [{ type: 'heading', ...heading }, { type: 'intro', text: chapter.intro }, ...(chapter.image ? [{ type: 'image', ...chapter.image }] : [])] : [];
          group.forEach((entry, i) => {
            if (i > 0) blocks.push({ type: 'rule' });
            blocks.push({
              type: 'numbered', n: pageIndex * (chapter.wiki.perPage || 3) + i + 1, title: entry.name, text: entry.summary,
              meta: entry[chapter.wiki.meta] || '', image: entry.image, confidence: entry.confidence,
              link: entryLink(chapter.wiki.section, entry.slug),
            });
          });
          add(chapter.title, blocks);
          pages[pages.length - 1].gallery = true;
        });
        if (!entries.length) add(chapter.title, [{ type: 'heading', ...heading }, { type: 'development', text: 'Nothing has been documented for this chapter yet.' }]);
      } else if (chapter.sourcesChapter) {
        const all = Object.entries(manual.sources);
        chunk(all, 3).forEach((group, pageIndex) => {
          const blocks = pageIndex === 0
            ? [{ type: 'heading', text: 'Reference:', accent: 'sources' }, { type: 'intro', text: 'Everything the manual relies on, with the date each source was last read. These are press and preview coverage, not a substitute for testing the released game.' }]
            : [];
          group.forEach(([id, source], i) => {
            if (i > 0) blocks.push({ type: 'rule' });
            blocks.push({ type: 'source', id, source, n: pageIndex * 3 + i + 1 });
          });
          add(chapter.title, blocks);
        });
        if ((manual.uncheckedSources || []).length) {
          add(chapter.title, [{ type: 'subheading', text: 'Listed but not checked' },
            ...manual.uncheckedSources.map((source) => ({ type: 'source', source, unchecked: true }))]);
        }
      } else {
        for (const page of chapter.pages) add(page.title, page.blocks);
      }
      chapter.firstPage = start;
      chapter.pageCount = pages.length - start;
    }
    pages.forEach((page, i) => {
      page.number = i + 2;
      page.inChapter = i - page.chapter.firstPage + 1;
      page.href = `#/manual/${page.chapter.id}/${page.inChapter}`;
    });
  }

  // ---------- blocks ----------

  function badge(evidence) {
    if (!evidence) return '';
    const [label, meaning] = EVIDENCE[evidence] || EVIDENCE.unknown;
    return `<span class="m-badge m-badge-${esc(evidence)}" title="${esc(meaning)}">${esc(label)}</span>`;
  }

  /** Footnote markers for a block's sources; `notes` collects the page's sources in order. */
  function refs(sources, notes) {
    if (!sources?.length) return '';
    return `<sup class="m-refs">${sources.map((id) => {
      if (!notes.includes(id)) notes.push(id);
      return notes.indexOf(id) + 1;
    }).join(', ')}</sup>`;
  }

  function stars() {
    const star = (x) => {
      const points = Array.from({ length: 10 }, (_, i) => {
        const radius = i % 2 ? 9 : 21, angle = (Math.PI / 5) * i - Math.PI / 2;
        return `${(x + radius * Math.cos(angle)).toFixed(1)},${(26 + radius * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${points}"/>`;
    };
    return `<svg class="m-stars" viewBox="0 0 330 62" role="img" aria-label="Six outlined stars in a row">
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">${[30, 84, 138, 192, 246, 300].map(star).join('')}</g>
      <g font-size="9" text-anchor="middle" fill="currentColor">${[30, 84, 138, 192, 246, 300].map((x, i) => `<text x="${x}" y="60">${i + 1}</text>`).join('')}</g>
    </svg>`;
  }

  function block(b, notes) {
    switch (b.type) {
      case 'heading':
        return `<h2 class="m-heading">${esc(b.text)} <span>${esc(b.accent || '')}</span></h2>${b.sub ? `<p class="m-sub">${esc(b.sub)}</p>` : ''}`;
      case 'subheading':
        return `<h3 class="m-subheading">${esc(b.text)}</h3>`;
      case 'intro':
        return `<p class="m-intro">${esc(b.text)}</p>`;
      case 'paragraph':
        return `<p class="m-para">${badge(b.evidence)} ${esc(b.text)}${refs(b.sources, notes)}</p>`;
      case 'numbered':
        return `<section class="m-entry${b.image ? ' has-image' : ''}">
          ${b.image ? `<figure class="m-figure"><a href="${esc(b.link || '#/manual')}" tabindex="-1" aria-hidden="true"><img src="${esc(b.image)}" alt="" loading="lazy"></a></figure>` : ''}
          <span class="m-numeral" aria-hidden="true">${esc(b.n)}</span>
          <div class="m-entry-body">
            <h3>${b.link ? `<a href="${esc(b.link)}">${esc(b.title)}</a>` : esc(b.title)}</h3>
            ${b.frame ? `<figure class="m-frame m-frame-entry"><img src="${esc(b.frame)}" alt="${esc(b.frameAlt || '')}" loading="lazy">${b.frameCredit ? `<figcaption><span>${esc(b.frameCredit)}.</span></figcaption>` : ''}</figure>` : ''}
            <p>${esc(b.text)}${refs(b.sources, notes)}</p>
            ${b.meta ? `<p class="m-meta">— ${esc(b.meta)}</p>` : ''}
            <p class="m-entry-foot">${badge(b.evidence)}${b.confidence ? `<span class="m-badge">${esc(CONFIDENCE[b.confidence] || 'Unverified')}</span>` : ''}
              ${b.link ? `<a class="m-more" href="${esc(b.link)}">Open the full entry</a>` : ''}</p>
          </div>
        </section>`;
      case 'image':
        return `<figure class="m-figure m-figure-wide"><img src="${esc(b.src)}" alt="${esc(b.caption)}" loading="lazy">
          <figcaption>${esc(b.caption)}${b.credit ? ` <span>${esc(b.credit)}.</span>` : ''}</figcaption></figure>`;
      case 'frame':
        return `<figure class="m-frame"><img src="${esc(b.src)}" alt="${esc(b.caption)}" loading="lazy">
          <figcaption>${esc(b.caption)}${b.credit ? ` <span>${esc(b.credit)}.</span>` : ''}</figcaption></figure>`;
      case 'pair':
        return `<figure class="m-frame m-pair">${b.frames.map((f) => `<div><img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy"><span>${esc(f.label)}</span></div>`).join('')}
          <figcaption><span>${esc(b.credit)}.</span></figcaption></figure>`;
      case 'callout':
        return `<blockquote class="m-callout">${esc(b.text)}</blockquote>`;
      case 'table':
        return `<table class="m-table">
          <caption>${badge(b.evidence)} ${esc(b.caption)}${refs(b.sources, notes)}</caption>
          <thead><tr>${b.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${b.rows.map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join('')}</tr>`).join('')}</tbody>
        </table>`;
      case 'diagram':
        return `<figure class="m-diagram">
          ${b.kind === 'stars' ? stars() : `<ol class="m-flow">${b.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>`}
          <figcaption>${badge(b.evidence)}${esc(b.caption)}</figcaption></figure>`;
      case 'warning':
        return `<aside class="m-box"><h4>${esc(b.title)}</h4><ul>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></aside>`;
      case 'unknown':
        return `<aside class="m-box m-box-unknown"><h4>Unknown / to verify</h4><ul>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></aside>`;
      case 'legend':
        return `<dl class="m-legend">${Object.entries(EVIDENCE).map(([key, [, meaning]]) => `<dt>${badge(key)}</dt><dd>${esc(meaning)}</dd>`).join('')}</dl>`;
      case 'development':
        return `<aside class="m-box m-box-unknown"><h4>In development</h4><p>${esc(b.text || 'This chapter has not been written yet.')}</p></aside>`;
      case 'source': {
        const s = b.source;
        return `<section class="m-entry m-source">
          <span class="m-numeral" aria-hidden="true">${b.unchecked ? '?' : esc(b.n)}</span>
          <div class="m-entry-body">
            <h3><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></h3>
            <p class="m-meta">${esc([s.publisher, s.author, s.sourceType].filter(Boolean).join(' · '))}</p>
            <p>${esc(s.notes || '')}</p>
            ${b.unchecked ? '' : `<p class="m-entry-foot">Published ${esc(s.publishedAt)} · Last read ${esc(s.lastCheckedAt)}</p>`}
          </div></section>`;
      }
      case 'rule':
        return '<hr class="m-dotted">';
      default:
        return '';
    }
  }

  function pageHtml(page) {
    if (!page) return '<article class="m-page m-page-blank" aria-hidden="true"></article>';
    const notes = [];
    let body;
    if (page.gallery) {
      // Heading and intro first, then the numbered entries as a two-column picture grid.
      const entries = page.blocks.filter((b) => b.type === 'numbered');
      const lead = page.blocks.filter((b) => b.type !== 'numbered' && b.type !== 'rule');
      body = `${lead.map((b) => block(b, notes)).join('')}
        <div class="m-gallery${entries.length % 2 ? ' has-lead' : ''}">${entries.map((b) => block(b, notes)).join('')}</div>`;
    } else {
      body = page.blocks.map((b) => block(b, notes)).join('');
    }
    const even = page.number % 2 === 0;
    const opener = page.inChapter === 1;
    return `<article class="m-page ${even ? 'm-left' : 'm-right'}${opener ? ' m-opener' : ''}" aria-label="Page ${page.number}: ${esc(page.title)}">
      <header class="m-running"><span><b class="m-chip">${esc(page.chapter.number)}</b>${esc(page.chapter.kicker || page.chapter.title)}</span><span>${esc(page.title)}</span></header>
      <div class="m-body">${opener ? `<span class="m-chapmark" aria-hidden="true">${esc(page.chapter.number)}</span>` : ''}${body}</div>
      ${notes.length ? `<ol class="m-notes">${notes.map((id) => {
        const s = manual.sources[id];
        return s ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)}, “${esc(s.title)}”</a> (${esc(s.publishedAt)})</li>` : `<li>${esc(id)}</li>`;
      }).join('')}</ol>` : ''}
      <footer class="m-foot"><span class="m-pageno">${page.number}</span><span>GTA VI Field Manual · unofficial</span></footer>
    </article>`;
  }

  // ---------- screens ----------

  function toolbar(query) {
    const night = store.get('theme') === 'night';
    return `<div class="m-toolbar">
      <a class="m-tool" href="#/manual">Contents</a>
      <form class="m-search" role="search"><input type="search" name="q" value="${esc(query || '')}" placeholder="Search the manual" aria-label="Search the manual" autocomplete="off"></form>
      <button class="m-tool" type="button" data-action="theme" aria-pressed="${night}">${night ? 'Paper view' : 'Night reading'}</button>
      <button class="m-tool" type="button" data-action="copy">Copy link</button>
    </div>`;
  }

  function landing() {
    const last = store.get('last');
    const lastPage = last && pages.find((p) => p.href === last);
    const cover = `<article class="m-page m-cover" style="--cover: url('${esc(manual.cover)}')">
      <div class="m-cover-top">
        <img class="m-cover-logo" src="/images/gta6.png" alt="${esc(manual.title)}">
        <span class="m-cover-flag">Unofficial fan manual</span>
      </div>
      <div class="m-cover-text">
        <p class="m-cover-kicker">${esc(manual.title)}</p>
        <h1>${esc(manual.subtitle)}</h1>
        <p class="m-cover-tag">${esc(manual.tagline)}</p>
        <div class="m-cover-actions">
          <a class="m-button" href="${lastPage ? lastPage.href : pages[0].href}">${lastPage ? `Continue reading · page ${lastPage.number}` : 'Start reading'}</a>
        </div>
      </div>
      <p class="m-cover-notice">${esc(manual.notice)}</p>
    </article>`;
    const contents = `<article class="m-page m-right">
      <header class="m-running"><span>Contents</span><span>Research snapshot ${esc(manual.snapshot)}</span></header>
      <div class="m-body">
        <h2 class="m-heading">In this <span>manual</span></h2>
        <ol class="m-contents">
          ${manual.chapters.map((c) => `<li${c.status === 'in-development' ? ' class="is-dev"' : ''}>
            <a href="${pages[c.firstPage].href}"><span class="m-chapno">${esc(c.number)}</span><span class="m-chaptitle">${esc(c.title)}</span>
            <span class="m-chapstate">${c.status === 'in-development' ? 'In development' : `page ${pages[c.firstPage].number}`}</span></a></li>`).join('')}
        </ol>
      </div>
      <footer class="m-foot"><span class="m-pageno">1</span><span>GTA VI Field Manual · unofficial</span></footer>
    </article>`;
    return `<div class="m-spread m-spread-landing">${cover}${contents}</div>`;
  }

  function reader(page) {
    const wide = WIDE.matches;
    const index = pages.indexOf(page);
    let shown, previous, next;
    if (wide) {
      const leftIndex = page.number % 2 === 0 ? index : index - 1;
      shown = [pages[leftIndex], pages[leftIndex + 1]];
      previous = pages[leftIndex - 1];
      next = pages[leftIndex + 2];
    } else {
      shown = [page];
      previous = pages[index - 1];
      next = pages[index + 1];
    }
    const label = shown.filter(Boolean).map((p) => p.number).join('–');
    return `<div class="m-spread${wide ? '' : ' m-single'}">${shown.map(pageHtml).join('')}</div>
      <nav class="m-nav" aria-label="Manual pages">
        ${previous ? `<a class="m-turn" rel="prev" href="${previous.href}" data-turn="prev">← Previous</a>` : `<a class="m-turn" href="#/manual" data-turn="prev">← Contents</a>`}
        <span class="m-where">Page ${label} of ${pages.length + 1}</span>
        ${next ? `<a class="m-turn" rel="next" href="${next.href}" data-turn="next">Next →</a>` : '<span class="m-turn is-off">End</span>'}
      </nav>`;
  }

  function searchResults(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const text = (page) => `${page.title} ${page.chapter.title} ${page.blocks.map((b) => [b.text, b.accent, b.title, b.caption, b.meta, ...(b.items || []), ...(b.steps || []), ...((b.frames || []).map((f) => f.label)), ...((b.rows || []).flat())].filter(Boolean).join(' ')).join(' ')}`;
    const hits = terms.length ? pages.filter((page) => { const hay = text(page).toLowerCase(); return terms.every((t) => hay.includes(t)); }) : [];
    const snippet = (page) => {
      const full = text(page), at = Math.max(0, full.toLowerCase().indexOf(terms[0]) - 60);
      return `${at > 0 ? '…' : ''}${full.slice(at, at + 200)}…`;
    };
    return `<div class="m-spread m-single"><article class="m-page m-right">
      <header class="m-running"><span>Search</span><span>${hits.length} ${hits.length === 1 ? 'page' : 'pages'}</span></header>
      <div class="m-body">
        <h2 class="m-heading">Search: <span>${esc(query)}</span></h2>
        ${hits.length ? `<ol class="m-results">${hits.map((page) => `<li><a href="${page.href}">
            <span class="m-chapno">${page.number}</span><span><b>${esc(page.title)}</b><em>${esc(page.chapter.title)}</em><span>${esc(snippet(page))}</span></span></a></li>`).join('')}</ol>`
          : `<p class="m-intro">Nothing in the manual matches “${esc(query)}”. Try “heat”, “focus” or a place name.</p>`}
      </div>
      <footer class="m-foot"><span class="m-pageno"></span><span>GTA VI Field Manual · unofficial</span></footer>
    </article></div>`;
  }

  // ---------- entry point ----------

  function draw() {
    const { view, chapterId, pageInChapter, params } = current;
    const query = chapterId === 'search' ? (params.get('q') || '') : '';
    let content;
    if (!chapterId) content = landing();
    else if (chapterId === 'search') content = searchResults(query);
    else {
      const chapter = manual.chapters.find((c) => c.id === chapterId);
      const page = chapter && pages[chapter.firstPage + Math.min(Math.max(Number(pageInChapter) || 1, 1), chapter.pageCount) - 1];
      if (!page) {
        content = `<div class="m-spread m-single"><article class="m-page"><div class="m-body"><h2 class="m-heading">Page <span>not found</span></h2>
          <p class="m-intro">That chapter is not in the manual. <a href="#/manual">Back to the contents.</a></p></div></article></div>`;
      } else {
        store.set('last', page.href);
        content = reader(page);
      }
    }
    view.innerHTML = `<div class="manual${store.get('theme') === 'night' ? ' manual-night' : ''}">${toolbar(query)}${content}</div>`;

    const root = view.querySelector('.manual');
    root.querySelector('.m-search').addEventListener('submit', (e) => {
      e.preventDefault();
      location.hash = `#/manual/search?q=${encodeURIComponent(e.target.elements.q.value)}`;
    });
    root.querySelector('[data-action="theme"]').addEventListener('click', () => {
      store.set('theme', store.get('theme') === 'night' ? 'paper' : 'night');
      draw();
    });
    // Click any picture on a page to see it full screen. On an entry's picture this replaces
    // following its link; the entry's title and "Open the full entry" still go to the entry.
    root.addEventListener('click', (e) => {
      const img = e.target.closest('.m-page img');
      if (!img || typeof openLightbox !== 'function') return;
      e.preventDefault();
      const figure = img.closest('figure');
      const entry = img.closest('.m-entry');
      const caption = figure?.querySelector('figcaption');
      const credit = caption?.querySelector('span')?.textContent.trim() || '';
      const label = img.closest('.m-pair div')?.querySelector('span')?.textContent.trim();
      const title = label || entry?.querySelector('h3')?.textContent.trim()
        || (caption ? caption.textContent.replace(credit, '').trim() : '') || img.alt || 'Picture';
      openLightbox({ type: 'image', src: img.getAttribute('src'), alt: img.alt || title, title, rights: '', credit }, null);
      // Small crops of the game's display are enlarged so they can be read, but never beyond what
      // fits the window, and always to the picture's own shape so its frame hugs it.
      const shown = document.querySelector('#lightbox .lightbox-stage img');
      const size = () => {
        const w = shown.naturalWidth, h = shown.naturalHeight;
        if (!w || !h) return;
        const fit = Math.min((window.innerWidth * 0.86) / w, (window.innerHeight - 150) / h);
        const scale = Math.min(fit, w < 900 ? 2.4 : 1);
        shown.style.width = `${Math.round(w * scale)}px`;
        shown.style.height = `${Math.round(h * scale)}px`;
      };
      if (shown.complete) size(); else shown.addEventListener('load', size, { once: true });
    });
    root.querySelector('[data-action="copy"]').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy failed'; }
      setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
    });
  }

  async function render(view, chapterId, pageInChapter, params, wiki) {
    current = { view, chapterId, pageInChapter, params, wiki };
    if (!manual) {
      view.innerHTML = '<div class="manual"><p class="m-loading">Opening the manual…</p></div>';
      try {
        const response = await fetch('/api/manual');
        if (!response.ok) throw new Error(String(response.status));
        manual = await response.json();
      } catch {
        view.innerHTML = '<div class="manual"><p class="m-loading">The manual could not be loaded.</p></div>';
        return;
      }
      if (current.view !== view || !view.isConnected) return;
    }
    buildPages(wiki);
    draw();
  }

  // Two pages on a wide window, one on a narrow one: redraw when that changes.
  WIDE.addEventListener('change', () => { if (current && document.body.dataset.page === 'manual') draw(); });

  // Page turning by keyboard, only while the manual is open and nothing that
  // needs the keys itself (a field, a control) has focus.
  window.addEventListener('keydown', (e) => {
    if (document.body.dataset.page !== 'manual' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
    const turn = { ArrowLeft: 'prev', PageUp: 'prev', ArrowRight: 'next', PageDown: 'next' }[e.key];
    const link = turn && document.querySelector(`.m-turn[data-turn="${turn}"]`);
    if (link) { e.preventDefault(); link.click(); }
  });

  window.Manual = { render };
})();

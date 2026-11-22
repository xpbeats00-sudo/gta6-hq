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
    demonstrated: ['Official', 'Visible in official Rockstar footage or other official material.'],
    'developer-described': ['Developer-described', 'Described by a Rockstar developer in an interview.'],
    'preview-reported': ['Preview-reported', 'Reported by journalists or creators who saw a preview build.'],
    interpretation: ['Interpretation', 'A reasonable reading of footage or reporting, not a confirmed rule.'],
    unknown: ['Unknown', 'Not established by the sources available.'],
    'verified-after-release': ['Verified after release', 'Checked against the released game.'],
    'launch-reported': ['Reported at launch', 'Reported by reviews or guides written from the released game. Not checked in play by this app.'],
  };
  // The same two names as the rest of the app: Official (Rockstar's own) and Community.
  const CONFIDENCE = { official: 'Official', corroborated: 'Community', community: 'Community', rumor: 'Rumor' };
  /** The R and star in front of the top label, drawn as a single mark. */
  const STORE_EDITION = document.documentElement.dataset.edition === 'store'; // no Rockstar mark or logo there
  const MARK = STORE_EDITION ? '' : '<b class="m-badge-mark"><svg viewBox="0 0 20 16" aria-hidden="true"><text x="0.5" y="13.2" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="15.5" fill="currentColor">R</text><polygon points="14,5.6 15.3,9.2 19.1,9.3 16.1,11.7 17.2,15.4 14,13.2 10.8,15.4 11.9,11.7 8.9,9.3 12.7,9.2" fill="currentColor" stroke="#b79df0" stroke-width="1.3" stroke-linejoin="round" paint-order="stroke"/></svg></b><span class="sr-only">Rockstar </span>';
  const WIDE = matchMedia('(min-width: 1180px)');
  const store = {
    // Kept with the app's other saved choices (app.js), so they survive a restart and an update.
    // Checklist ticks (hundreds of them) live in the larger user-data store as one set of ticks;
    // the few reading choices (theme, last page) stay in the settings file.
    get(key) {
      if (key.startsWith('check-') && window.UserStore) return window.UserStore.ticked('guide-checks', key) ? true : null;
      return window.hqPrefs ? window.hqPrefs.get(`manual-${key}`) : null;
    },
    set(key, value) {
      if (key.startsWith('check-') && window.UserStore) { window.UserStore.tick('guide-checks', key, value === true); return; }
      if (window.hqPrefs) window.hqPrefs.set(`manual-${key}`, value);
    },
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
      // A chapter with a cover picture opens on a title page of its own, like a printed manual's divider.
      if (chapter.cover && chapter.status !== 'in-development') pages.push({ chapter, title: chapter.title, blocks: [], titlePage: true });

      if (chapter.status === 'in-development') {
        add(chapter.title, [{ type: 'heading', ...heading }, ...(chapter.image ? [{ type: 'image', ...chapter.image }] : []), { type: 'development', text: chapter.note }]);
      } else if (chapter.wiki) {
        // Written pages first (if the chapter has any), then the encyclopedia's entries, a few to a page.
        const written = chapter.pages || [];
        for (const page of written) add(page.title, page.blocks);
        const entries = (wiki[chapter.wiki.section] || []).filter((e) => e.status !== 'draft' && !e.spoiler);
        const listTitle = chapter.listTitle || `Every ${(chapter.kicker || chapter.title).toLowerCase()}`;
        const listHead = written.length
          ? [{ type: 'heading', text: listTitle.split(' ')[0], accent: listTitle.split(' ').slice(1).join(' ') }, { type: 'intro', text: `The ${entries.length} entries the Encyclopedia holds for this chapter that are not spoilers. Each opens its full entry.` }]
          : [{ type: 'heading', ...heading }, { type: 'intro', text: chapter.intro }, ...(chapter.image ? [{ type: 'image', ...chapter.image }] : [])];
        chunk(entries, chapter.wiki.perPage || 3).forEach((group, pageIndex) => {
          const blocks = pageIndex === 0 ? [...listHead] : [];
          group.forEach((entry, i) => {
            if (i > 0) blocks.push({ type: 'rule' });
            blocks.push({
              type: 'numbered', n: pageIndex * (chapter.wiki.perPage || 3) + i + 1, title: entry.name, text: entry.summary,
              meta: entry[chapter.wiki.meta] || '', image: entry.image, confidence: entry.confidence,
              link: entryLink(chapter.wiki.section, entry.slug),
            });
          });
          add(written.length ? listTitle : chapter.title, blocks);
          pages[pages.length - 1].gallery = true;
        });
        if (!entries.length) add(chapter.title, [{ type: 'heading', ...heading }, { type: 'development', text: 'Nothing has been documented for this chapter yet.' }]);
      } else if (chapter.sourcesChapter) {
        const all = Object.entries(manual.sources);
        chunk(all, 3).forEach((group, pageIndex) => {
          const blocks = pageIndex === 0
            ? [{ type: 'heading', text: 'Reference:', accent: 'sources' }, { type: 'intro', text: 'Everything the manual relies on, with the date each source was last read. They are press, preview and launch-guide coverage, not play by this app.' }]
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
      page.opener = !page.titlePage && (page.inChapter === 1 || pages[i - 1].titlePage);
      page.href = `#/manual/${page.chapter.id}/${page.inChapter}`;
    });
    // Checklist rows name the page that explains them; give each its address and page number.
    for (const page of pages) {
      for (const b of page.blocks) {
        if (b.type !== 'checklist') continue;
        for (const it of b.items || []) {
          const target = pages.find((p) => p.chapter.id === (it.chapter || page.chapter.id) && p.title === it.page && !p.titlePage)
            || (it.chapter && pages.find((p) => p.chapter.id === it.chapter && !p.titlePage));
          it.href = target ? target.href : '';
          it.pageNumber = target ? target.number : '';
        }
      }
    }
  }

  // ---------- blocks ----------

  function badge(evidence) {
    if (!evidence) return '';
    const [label, meaning] = EVIDENCE[evidence] || EVIDENCE.unknown;
    return `<span class="m-badge m-badge-${esc(evidence)}" title="${esc(meaning)}">${evidence === 'demonstrated' ? MARK : ''}${esc(label)}</span>`;
  }

  /** Footnote markers for a block's sources; `notes` collects the page's sources in order. */
  function refs(sources, notes) {
    if (!sources?.length) return '';
    return `<sup class="m-refs">${sources.map((id) => {
      if (!notes.includes(id)) notes.push(id);
      return notes.indexOf(id) + 1;
    }).join(', ')}</sup>`;
  }

  // A picture marked as a spoiler stays blurred under an eye until it is pressed, unless the reader
  // chose to see spoilers (the app's own setting, app.js). Pressing the eye again covers it.
  const EYE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12S5.8 5.6 12 5.6 21.8 12 21.8 12 18.2 18.4 12 18.4 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3.1"/></svg>';
  // eslint-disable-next-line no-undef
  const spoilersShown = () => typeof showSpoilers !== 'undefined' && showSpoilers === true;
  function hush(html, b) {
    if (!b.spoiler || spoilersShown()) return html;
    return `<div class="m-hush">${html}<button type="button" class="m-hush-eye" aria-expanded="false">${EYE_ICON}<span>Show spoiler picture</span></button></div>`;
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
        return `<section class="m-entry${b.image ? ' has-image' : ''}${b.frame ? ' has-frame' : ''}">
          ${b.image ? hush(`<figure class="m-figure"><img src="${esc(b.image)}" alt="${esc(b.title)}" loading="lazy"></figure>`, b) : ''}
          <span class="m-numeral" aria-hidden="true">${esc(b.n)}</span>
          <div class="m-entry-body">
            <h3>${b.link ? `<a href="${esc(b.link)}">${esc(b.title)}</a>` : esc(b.title)}</h3>
            ${b.frame ? hush(`<figure class="m-frame m-frame-entry"><img src="${esc(b.frame)}" alt="${esc(b.frameAlt || b.title || '')}" loading="lazy">${b.frameCredit ? `<figcaption><span>${esc(b.frameCredit)}.</span></figcaption>` : ''}</figure>`, b) : ''}
            <p>${esc(b.text)}${refs(b.sources, notes)}</p>
            ${b.meta ? `<p class="m-meta">— ${esc(b.meta)}</p>` : ''}
            <p class="m-entry-foot">${badge(b.evidence)}${b.confidence ? `<span class="m-badge m-badge-conf-${esc(b.confidence)}">${b.confidence === 'official' ? MARK : ''}${esc(CONFIDENCE[b.confidence] || 'Unverified')}</span>` : ''}
              ${b.link ? `<a class="m-more" href="${esc(b.link)}">Open the full entry</a>` : ''}</p>
          </div>
        </section>`;
      case 'image':
        return hush(`<figure class="m-figure m-figure-wide"><img src="${esc(b.src)}" alt="${esc(b.caption)}" loading="lazy">
          <figcaption>${esc(b.caption)}${b.credit ? ` <span>${esc(b.credit)}.</span>` : ''}</figcaption></figure>`, b);
      case 'frame':
        return hush(`<figure class="m-frame"><img src="${esc(b.src)}" alt="${esc(b.caption)}" loading="lazy">
          <figcaption>${esc(b.caption)}${b.credit ? ` <span>${esc(b.credit)}.</span>` : ''}</figcaption></figure>`, b);
      case 'pair':
        return hush(`<figure class="m-frame m-pair">${b.frames.map((f) => `<div><img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy"><span>${esc(f.label)}</span></div>`).join('')}
          <figcaption><span>${esc(b.credit)}.</span></figcaption></figure>`, b);
      case 'tip':
        return `<aside class="m-tip"><b class="m-tip-tab">Tip</b><div>${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<p>${esc(b.text)}${refs(b.sources, notes)}</p></div></aside>`;
      case 'callout':
        return `<blockquote class="m-callout">${esc(b.text)}</blockquote>`;
      case 'table':
        return `<table class="m-table">
          <caption>${badge(b.evidence)} ${esc(b.caption)}${refs(b.sources, notes)}</caption>
          <thead><tr>${b.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${b.rows.map((row, r) => `<tr>${row.map((cell, i) => (i === 0
            ? `<th scope="row">${b.rowLinks?.[r] ? `<a href="${esc(b.rowLinks[r])}">${esc(cell)}</a>` : esc(cell)}</th>`
            : `<td>${esc(cell)}</td>`)).join('')}</tr>`).join('')}</tbody>
        </table>`;
      case 'checklist':
        return checklist(b, notes);
      case 'maplink':
        // `plan` opens a planned robbery run on the map; `kind` lists one kind of place.
        return `<p class="m-maplink"><a href="${b.plan ? `#/map?plan=${encodeURIComponent(b.plan)}` : `#/map?kind=${encodeURIComponent(b.kind)}`}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"/></svg>${esc(b.text)}</a></p>`;
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

  /** The name of an encyclopedia entry from its link, for checklist links. */
  function entryName(href) {
    const m = /^#\/(?:wiki\/)?([^/]+)\/(.+)$/.exec(href || '');
    const list = m && current?.wiki?.[m[1]];
    return (list && list.find((e) => e.slug === m[2])?.name) || '';
  }

  // A 100% checklist: one row per thing the game counts, with a tick box that is saved with the
  // app's other choices, the count, the guide page that explains it and the entries it covers.
  function checklist(b, notes) {
    const rows = (b.items || []).map((it) => {
      const key = `check-${it.key}`;
      const done = store.get(key) === true;
      const entries = (it.links || []).map((href) => ({ href, name: entryName(href) })).filter((e) => e.name);
      return `<li class="m-check${done ? ' is-done' : ''}">
        <label><input type="checkbox" data-check="${esc(key)}"${done ? ' checked' : ''}><span>${esc(it.item)}${refs(it.sources, notes)}</span></label>
        ${it.count ? `<b class="m-check-count">${esc(it.count)}</b>` : ''}
        <span class="m-check-links">${it.href ? `<a href="${esc(it.href)}">Guide, p. ${esc(it.pageNumber)}</a>` : ''}${entries.slice(0, 4).map((e) => `<a href="${esc(e.href)}">${esc(e.name)}</a>`).join('')}${entries.length > 4 ? `<em>+${entries.length - 4} more</em>` : ''}</span>
      </li>`;
    });
    return `<section class="m-checklist">${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<ol>${rows.join('')}</ol>
      <p class="m-check-note">Ticks are saved on this computer only.</p></section>`;
  }

  /** Every manual page that links to one encyclopedia entry ("#/wiki/x/y"), for the entry's own page. */
  async function guideLinks(href, wiki) {
    if (!manual) {
      try {
        const response = await fetch('/api/manual');
        if (!response.ok) return [];
        manual = await response.json();
      } catch { return []; }
    }
    if (!pages.length) { current = current || { wiki }; buildPages(wiki); }
    const found = [];
    for (const page of pages) {
      const hit = page.blocks.some((b) => b.link === href || (b.rowLinks || []).includes(href)
        || (b.items || []).some((it) => (it.links || []).includes(href)));
      if (hit && !page.gallery && !found.some((f) => f.href === page.href)) {
        found.push({ href: page.href, title: page.title, chapter: page.chapter.title, number: page.number });
      }
    }
    return found;
  }

  /** Manual pages whose title, chapter, headings or opening line match a search, best first, for the
      main search page. Spoiler-covered text (between ||) is never searched, so results cannot give
      it away. Filler words ("how to", "a") are skipped; every other word must start a word there. */
  const FILLER = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'how', 'do', 'does', 'i', 'is', 'are', 'where', 'what', 'which', 'can', 'you', 'my', 'me', 'find', 'with', 'gta', '6', 'vi']);
  const wordsOf = (text) => String(text || '').replace(/\|\|[\s\S]*?\|\|/g, ' ').toLowerCase().replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const root = (w) => (w.length > 4 ? w.replace(/(ies|ing|es|s|e|y)$/, '') : w);
  async function findPages(query, wiki, limit = 4) {
    if (!(await guideLinks('', wiki))) return [];
    const all = wordsOf(query);
    const terms = all.filter((w) => !FILLER.has(w));
    const want = terms.length ? terms : all;
    if (!want.length) return [];
    const hits = new Map();
    for (const page of pages) {
      if (page.titlePage || page.gallery) continue;
      const title = wordsOf(`${page.title} ${page.chapter.title}`);
      const text = wordsOf(page.blocks.filter((b) => ['heading', 'subheading', 'intro'].includes(b.type)).map((b) => `${b.text || ''} ${b.accent || ''}`).join(' '));
      let score = 0;
      const ok = want.every((t) => {
        const r = root(t);
        const has = (list) => list.some((w) => w.startsWith(t) || (r.length >= 3 && root(w) === r) || (t.length >= 3 && t.startsWith(w) && w.length >= 3));
        if (has(title)) { score += 3; return true; }
        if (has(text)) { score += 1; return true; }
        return false;
      });
      if (ok && !hits.has(page.href)) hits.set(page.href, { href: page.href, title: page.title, chapter: page.chapter.title, number: page.number, score });
    }
    return [...hits.values()].sort((a, b) => b.score - a.score || a.number - b.number).slice(0, limit);
  }

  /** One manual page by chapter id and title, e.g. for a map pin's "how to" link. */
  async function pageLink(chapterId, title, wiki) {
    if (!(await guideLinks('', wiki))) return null; // loads the manual and builds the pages once
    const page = pages.find((p) => p.chapter.id === chapterId && p.title === title && !p.titlePage);
    if (!page) return null;
    // The page's first picture, for cards that have none of their own (not a spoiler picture).
    const pic = page.blocks.map((b) => (b.spoiler ? null : b.frame || b.image || (['image', 'frame'].includes(b.type) && b.src) || b.frames?.[0]?.src)).find(Boolean) || '';
    return { href: page.href, title: page.title, chapter: page.chapter.title, number: page.number, picture: pic };
  }

  document.addEventListener('change', (e) => {
    const box = e.target.closest?.('input[data-check]');
    if (!box) return;
    store.set(box.dataset.check, box.checked);
    box.closest('.m-check')?.classList.toggle('is-done', box.checked);
  });

  /** What a chapter holds, for its title page: written pages one by one, the entry list as one line. */
  function chapterContents(chapter) {
    const own = pages.slice(chapter.firstPage, chapter.firstPage + chapter.pageCount).filter((p) => !p.titlePage);
    const items = [];
    for (const p of own) {
      if (p.gallery || p.blocks.some((b) => b.type === 'source')) {
        const last = items[items.length - 1];
        if (last && last.list) { last.count += 1; continue; }
        items.push({ list: true, count: 1, page: p, title: p.gallery ? (chapter.listTitle || `The ${(chapter.kicker || chapter.title).toLowerCase()}, entry by entry`) : 'Every source, with its date' });
      } else items.push({ page: p, title: p.title });
    }
    return items;
  }

  function titlePageHtml(page) {
    const c = page.chapter;
    const even = page.number % 2 === 0;
    const words = c.title.replace(c.accent, '').trim();
    const items = chapterContents(c);
    return `<article class="m-page m-titlepage ${even ? 'm-left' : 'm-right'}" style="--cover: url('${esc(c.cover.src)}')" aria-label="Page ${page.number}: chapter ${esc(c.number)}, ${esc(c.title)}">
      <div class="m-tp-art" role="img" aria-label="${esc(c.cover.caption || '')}"><span class="m-tp-no" aria-hidden="true">${esc(c.number)}</span></div>
      <div class="m-tp-text">
        <p class="m-tp-kicker">Chapter ${esc(c.number)}</p>
        <h2 class="m-heading">${words ? `${esc(words)} ` : ''}<span>${esc(c.accent || '')}</span></h2>
        ${c.intro ? `<p class="m-tp-intro">${esc(c.intro)}</p>` : ''}
        <ol class="m-tp-list">${items.map((it) => `<li><a href="${it.page.href}"><span>${esc(it.title)}${it.list && it.count > 1 ? ` <em>${it.count} pages</em>` : ''}</span><b>${it.page.number}</b></a></li>`).join('')}</ol>
      </div>
      <footer class="m-foot"><span class="m-pageno">${page.number}</span><span>${esc(c.cover.credit || '')}</span></footer>
    </article>`;
  }

  /** Thumb tabs down the edge of the book, one per chapter, shaded along the sunset like printed index tabs. */
  function chapterTabs(here) {
    const stops = [[255, 223, 128], [244, 113, 124], [233, 99, 199]]; // Rockstar's VI gradient: gold, coral, pink
    const shade = (t) => {
      const [a, b, f] = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
      return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;
    };
    const n = manual.chapters.length;
    return `<nav class="m-tabs" aria-label="Chapters">${manual.chapters.map((c, i) => {
      const first = pages[c.firstPage];
      return first ? `<a href="${first.href}" style="--tab:${shade(n > 1 ? i / (n - 1) : 0)}"${c === here ? ' class="is-here" aria-current="true"' : ''} title="${esc(c.number)} · ${esc(c.title)}"><b>${esc(c.number)}</b><span>${esc(c.kicker || c.title)}</span></a>` : '';
    }).join('')}</nav>`;
  }

  function pageHtml(page) {
    if (!page) return '<article class="m-page m-page-blank" aria-hidden="true"></article>';
    if (page.titlePage) return titlePageHtml(page);
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
    const opener = page.opener;
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
    const night = store.get('theme') !== 'paper';
    return `<div class="m-toolbar">
      <a class="m-tool" href="#/manual">Contents</a>
      <form class="m-search" role="search"><input type="search" name="q" value="${esc(query || '')}" placeholder="Search the manual" aria-label="Search the manual" autocomplete="off"></form>
      <button class="m-skyswitch" type="button" role="switch" data-action="theme" aria-checked="${night}" aria-label="Night reading" title="Switch between day and night reading">
        <span class="m-sky" aria-hidden="true">
          <svg viewBox="0 0 128 44" width="128" height="44">
            <defs>
              <linearGradient id="m-sky-day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aaed2"/><stop offset=".42" stop-color="#9fdcd6"/><stop offset=".72" stop-color="#ffd9b3"/><stop offset=".86" stop-color="#ffa6c2"/></linearGradient>
              <linearGradient id="m-sky-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2fc0"/><stop offset=".5" stop-color="#ee3f7c"/><stop offset=".86" stop-color="#ffab4a"/></linearGradient>
              <linearGradient id="m-sky-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060212"/><stop offset=".5" stop-color="#27105a"/><stop offset=".76" stop-color="#7d2a8d"/><stop offset=".86" stop-color="#ff4f9a"/></linearGradient>
              <linearGradient id="m-sea-day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63cdd3"/><stop offset="1" stop-color="#2b86b4"/></linearGradient>
              <linearGradient id="m-sea-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1466"/><stop offset="1" stop-color="#0a0418"/></linearGradient>
              <radialGradient id="m-sun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd76a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient>
              <radialGradient id="m-halo"><stop offset="0" stop-color="#fff2c0" stop-opacity=".75"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></radialGradient>
              <g id="m-palm" fill="none" stroke-linecap="round"><path stroke-width="1.3" d="M0 0q1.6-8-.6-16"/><path stroke-width="1.1" d="M-.6-16q-4-3.5-8.5-.5M-.6-16q-3.5-5.5-8-4.5M-.6-16q-.5-5.5 3-7.5M-.6-16q4-5 8.5-3M-.6-16q5-2 8 2.5M-.6-16q-3 .5-5 5M-.6-16q2.5 1 3.5 5.5"/></g>
            </defs>
            <rect width="128" height="44" fill="url(#m-sky-day)"/>
            <rect class="m-dusk" width="128" height="44" fill="url(#m-sky-dusk)"/>
            <rect class="m-night" width="128" height="44" fill="url(#m-sky-night)"/>
            <g class="m-stars" fill="#fff"><circle cx="14" cy="7" r=".6"/><circle cx="27" cy="13" r=".45"/><circle cx="41" cy="5" r=".7"/><circle cx="58" cy="4" r=".45"/><circle cx="68" cy="10" r=".55"/><circle cx="82" cy="5" r=".45"/><circle cx="112" cy="8" r=".6"/><circle cx="120" cy="16" r=".45"/><circle cx="6" cy="17" r=".45"/><circle cx="74" cy="15" r=".4" fill="#ffc4e4"/><circle cx="35" cy="9" r=".4" fill="#c9b6ff"/></g>
            <g class="m-sun"><circle cx="38" cy="17" r="15" fill="url(#m-halo)"/><circle cx="38" cy="17" r="7" fill="url(#m-sun)"/></g>
            <g class="m-moon"><circle cx="97" cy="12" r="10" fill="url(#m-halo)" opacity=".5"/><path fill="#fff3d2" d="M99.5 5.2a7 7 0 1 0 4.4 11.2a5.6 5.6 0 0 1-4.4-11.2z"/></g>
            <path class="m-far" d="M0 37V29h4v-3h5v3h9v-6h4v6h7v-9h5v9h12v-4h4v-4h5v8h14v-7h6v7h9v-5h5v5h13v-8h5v8h8v-4h6v4h3v8z"/>
            <g class="m-near"><rect class="m-b-pe" x="8" y="24" width="12" height="13"/><rect class="m-b-pe" x="10" y="22" width="8" height="2"/><rect class="m-b-li" x="22" y="15" width="8" height="22"/><rect class="m-b-li" x="25.6" y="11" width="0.8" height="4"/><rect class="m-b-pk" x="33" y="27" width="14" height="10"/><rect class="m-b-pk" x="50" y="12" width="10" height="25"/><rect class="m-b-pk" x="52" y="10" width="6" height="2"/><rect class="m-b-pk" x="54.6" y="6" width="0.8" height="4"/><rect class="m-b-pe" x="63" y="21" width="11" height="16"/><rect class="m-b-pe" x="65" y="19" width="7" height="2"/><rect class="m-b-li" x="77" y="17" width="7" height="20"/><rect class="m-b-li" x="80.1" y="14" width="0.8" height="3"/><rect class="m-b-pk" x="88" y="26" width="14" height="11"/><rect class="m-b-pe" x="105" y="19" width="9" height="18"/><rect class="m-b-pe" x="107" y="17" width="5" height="2"/></g>
            <g class="m-shade"><rect x="15.4" y="24" width="4.6" height="13"/><rect x="27.0" y="15" width="3.0" height="22"/><rect x="41.7" y="27" width="5.3" height="10"/><rect x="56.2" y="12" width="3.8" height="25"/><rect x="69.8" y="21" width="4.2" height="16"/><rect x="81.3" y="17" width="2.7" height="20"/><rect x="96.7" y="26" width="5.3" height="11"/><rect x="110.6" y="19" width="3.4" height="18"/></g>
            <g class="m-windows"><rect class="m-w" x="16" y="26" width="1.3" height="1.3"/><rect class="m-wc" x="10" y="29" width="1.3" height="1.3"/><rect class="m-w" x="13" y="29" width="1.3" height="1.3"/><rect class="m-w" x="16" y="29" width="1.3" height="1.3"/><rect class="m-w" x="10" y="32" width="1.3" height="1.3"/><rect class="m-wc" x="24" y="17" width="1.3" height="1.3"/><rect class="m-w" x="27" y="17" width="1.3" height="1.3"/><rect class="m-w" x="24" y="20" width="1.3" height="1.3"/><rect class="m-w" x="27" y="20" width="1.3" height="1.3"/><rect class="m-wp" x="24" y="23" width="1.3" height="1.3"/><rect class="m-w" x="27" y="29" width="1.3" height="1.3"/><rect class="m-wp" x="24" y="32" width="1.3" height="1.3"/><rect class="m-w" x="27" y="32" width="1.3" height="1.3"/><rect class="m-w" x="41" y="29" width="1.3" height="1.3"/><rect class="m-w" x="44" y="29" width="1.3" height="1.3"/><rect class="m-wp" x="35" y="32" width="1.3" height="1.3"/><rect class="m-w" x="38" y="32" width="1.3" height="1.3"/><rect class="m-w" x="52" y="14" width="1.3" height="1.3"/><rect class="m-w" x="55" y="14" width="1.3" height="1.3"/><rect class="m-wp" x="52" y="17" width="1.3" height="1.3"/><rect class="m-w" x="55" y="23" width="1.3" height="1.3"/><rect class="m-wp" x="52" y="26" width="1.3" height="1.3"/><rect class="m-w" x="55" y="26" width="1.3" height="1.3"/><rect class="m-wc" x="52" y="29" width="1.3" height="1.3"/><rect class="m-w" x="55" y="29" width="1.3" height="1.3"/><rect class="m-w" x="52" y="32" width="1.3" height="1.3"/><rect class="m-wp" x="65" y="23" width="1.3" height="1.3"/><rect class="m-w" x="68" y="26" width="1.3" height="1.3"/><rect class="m-w" x="71" y="26" width="1.3" height="1.3"/><rect class="m-wp" x="65" y="29" width="1.3" height="1.3"/><rect class="m-w" x="68" y="29" width="1.3" height="1.3"/><rect class="m-w" x="71" y="32" width="1.3" height="1.3"/><rect class="m-wp" x="79" y="19" width="1.3" height="1.3"/><rect class="m-w" x="79" y="22" width="1.3" height="1.3"/><rect class="m-wc" x="79" y="25" width="1.3" height="1.3"/><rect class="m-w" x="79" y="28" width="1.3" height="1.3"/><rect class="m-w" x="79" y="31" width="1.3" height="1.3"/><rect class="m-w" x="79" y="34" width="1.3" height="1.3"/><rect class="m-wp" x="90" y="28" width="1.3" height="1.3"/><rect class="m-w" x="93" y="28" width="1.3" height="1.3"/><rect class="m-wc" x="96" y="28" width="1.3" height="1.3"/><rect class="m-wp" x="96" y="31" width="1.3" height="1.3"/><rect class="m-w" x="99" y="31" width="1.3" height="1.3"/><rect class="m-wc" x="90" y="34" width="1.3" height="1.3"/><rect class="m-w" x="93" y="34" width="1.3" height="1.3"/><rect class="m-wp" x="107" y="21" width="1.3" height="1.3"/><rect class="m-w" x="110" y="21" width="1.3" height="1.3"/><rect class="m-wc" x="107" y="24" width="1.3" height="1.3"/><rect class="m-w" x="110" y="30" width="1.3" height="1.3"/><rect class="m-wc" x="107" y="33" width="1.3" height="1.3"/><rect class="m-w" x="110" y="33" width="1.3" height="1.3"/></g>
            <g class="m-neon"><rect x="33" y="26.2" width="14" height="1" fill="#ff4fa0"/><rect x="88" y="25.2" width="14" height="1" fill="#57e6ff"/><rect x="55.6" y="14" width="1" height="9" fill="#ff4fa0"/><rect x="8" y="23.2" width="12" height=".8" fill="#ffb347"/></g>
            <rect width="128" height="7" y="37" fill="url(#m-sea-day)"/>
            <rect class="m-night" width="128" height="7" y="37" fill="url(#m-sea-night)"/>
            <g class="m-glint" fill="#fff1c9"><rect x="33" y="38.4" width="10" height=".7"/><rect x="35" y="40" width="6" height=".7"/><rect x="36.5" y="41.6" width="3" height=".7"/></g>
            <g class="m-neon m-wake"><rect x="35" y="38.2" width="10" height=".8" fill="#ff4fa0"/><rect x="37" y="40" width="6" height=".7" fill="#ff4fa0"/><rect x="90" y="38.2" width="10" height=".8" fill="#57e6ff"/><rect x="92" y="40" width="6" height=".7" fill="#57e6ff"/><rect x="94" y="41.6" width="7" height=".7" fill="#fff3d2"/><rect x="12" y="38.6" width="6" height=".7" fill="#ffb347"/></g>
            <g class="m-palms"><use href="#m-palm" transform="translate(7 46) scale(1.35)"/><use href="#m-palm" transform="translate(17 45) scale(.85 .95)"/><use href="#m-palm" transform="translate(120 46) scale(-1.4 1.4)"/><use href="#m-palm" transform="translate(110 45) scale(.8 .9)"/><use href="#m-palm" transform="translate(70 45) scale(-.7 .78)"/></g>
          </svg>
        </span>
        <span class="m-sky-word">${night ? 'Night' : 'Day'}</span>
      </button>
      <button class="m-tool" type="button" data-action="copy">Copy link</button>
    </div>`;
  }

  function landing() {
    const last = store.get('last');
    const lastPage = last && pages.find((p) => p.href === last);
    const cover = `<article class="m-page m-cover" style="--cover: url('${esc(manual.cover || '')}')">
      <div class="m-cover-top">
        <img class="m-cover-logo" src="${STORE_EDITION ? '/brand.png' : '/images/gta6.png'}" alt="${esc(manual.title)}">
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
            <a href="${pages[c.firstPage].href}"><span class="m-chapno">${esc(c.number)}</span>
            <span class="m-chaptitle">${esc(c.title)}<small>${c.pageCount} ${c.pageCount === 1 ? 'page' : 'pages'}</small></span>
            ${c.cover ? `<img class="m-chapthumb" src="${esc(c.cover.src)}" alt="" loading="lazy">` : '<span class="m-chapthumb" aria-hidden="true"></span>'}
            <span class="m-chapstate">${c.status === 'in-development' ? 'In development' : `p. ${pages[c.firstPage].number}`}</span></a></li>`).join('')}
        </ol>
      </div>
      <footer class="m-foot"><span class="m-pageno">1</span><span>GTA VI Field Manual · unofficial</span></footer>
    </article>`;
    return `<div class="m-book"><div class="m-spread m-spread-landing">${cover}${contents}</div>${chapterTabs(null)}</div>`;
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
    const last = Math.max(...shown.filter(Boolean).map((p) => p.number));
    const progress = Math.round((last / (pages.length + 1)) * 100);
    return `<div class="m-book"><div class="m-spread${wide ? '' : ' m-single'}">${shown.map(pageHtml).join('')}</div>${chapterTabs(page.chapter)}</div>
      <nav class="m-nav" aria-label="Manual pages">
        ${previous ? `<a class="m-turn" rel="prev" href="${previous.href}" data-turn="prev">${icon('back')}Previous</a>` : `<a class="m-turn" href="#/manual" data-turn="prev">${icon('back')}Contents</a>`}
        <span class="m-where">Page ${label} of ${pages.length + 1}<span class="m-progress" role="progressbar" aria-label="How far through the manual" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></span></span>
        ${next ? `<a class="m-turn" rel="next" href="${next.href}" data-turn="next">Next${icon('next')}</a>` : '<span class="m-turn is-off">End</span>'}
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
    let title = ''; // one main heading per screen for screen readers (WCAG 1.3.1); the landing page has its own
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
        title = `Field Manual: ${chapter.title}${page.title && page.title !== chapter.title ? `, ${page.title}` : ''}`;
      }
    }
    if (chapterId === 'search') title = `Field Manual search: ${query}`;
    view.innerHTML = `<div class="manual${store.get('theme') !== 'paper' ? ' manual-night' : ''}">${title ? `<h1 class="sr-only">${esc(title)}</h1>` : ''}${toolbar(query)}${content}</div>`;

    const root = view.querySelector('.manual');
    root.querySelector('.m-search').addEventListener('submit', (e) => {
      e.preventDefault();
      location.hash = `#/manual/search?q=${encodeURIComponent(e.target.elements.q.value)}`;
    });
    // Day and night reading. The switch is a small sky: the sun sets and the moon rises over the
    // skyline, and the new look spreads across the whole page in a circle from the switch itself.
    const sky = root.querySelector('[data-action="theme"]');
    sky.addEventListener('click', () => {
      const night = store.get('theme') === 'paper'; // switching from Day to Night, or back
      store.set('theme', night ? 'night' : 'paper');
      const apply = () => {
        root.classList.toggle('manual-night', night);
        sky.setAttribute('aria-checked', String(night));
        sky.querySelector('.m-sky-word').textContent = night ? 'Night' : 'Day';
        sky.classList.remove('is-turning');
        void sky.offsetWidth; // so the dusk glow plays again on a second press
        sky.classList.add('is-turning');
      };
      if (!document.startViewTransition) { apply(); return; }
      const box = sky.querySelector('.m-sky').getBoundingClientRect();
      const x = box.left + box.width / 2, y = box.top + box.height / 2;
      const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const html = document.documentElement;
      html.classList.add('m-sky-turn');
      const turn = document.startViewTransition(apply);
      turn.ready.then(() => html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${Math.ceil(reach)}px at ${x}px ${y}px)`] },
        { duration: 950, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )).catch(() => {});
      turn.finished.finally(() => html.classList.remove('m-sky-turn'));
    });
    // Every picture can also be reached with Tab and opened with Enter or Space.
    root.querySelectorAll('.m-page img').forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `View full screen: ${img.alt || 'picture'}`);
    });
    // A blurred spoiler picture: out of reach until its eye is pressed; the eye covers it again.
    const hushPicture = (box, open) => {
      box.classList.toggle('is-open', open);
      const eye = box.querySelector('.m-hush-eye');
      eye.setAttribute('aria-expanded', String(open));
      eye.querySelector('span').textContent = open ? 'Hide spoiler picture' : 'Show spoiler picture';
      box.querySelectorAll('img').forEach((img) => { img.tabIndex = open ? 0 : -1; img.setAttribute('aria-hidden', String(!open)); });
    };
    root.querySelectorAll('.m-hush').forEach((box) => hushPicture(box, false));
    root.addEventListener('click', (e) => {
      const eye = e.target.closest('.m-hush-eye');
      if (eye) { e.preventDefault(); hushPicture(eye.closest('.m-hush'), !eye.closest('.m-hush').classList.contains('is-open')); }
    });
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.m-page img')) { e.preventDefault(); e.target.click(); }
    });

    // Click any picture on a page to see it full screen. On an entry's picture this replaces
    // following its link; the entry's title and "Open the full entry" still go to the entry.
    root.addEventListener('click', (e) => {
      const img = e.target.closest('.m-page img');
      if (!img || typeof openLightbox !== 'function' || img.closest('.m-hush:not(.is-open)')) return;
      e.preventDefault();
      const figure = img.closest('figure');
      const entry = img.closest('.m-entry');
      const caption = figure?.querySelector('figcaption');
      const credit = caption?.querySelector('span')?.textContent.trim() || '';
      const label = img.closest('.m-pair div')?.querySelector('span')?.textContent.trim();
      const title = label || entry?.querySelector('h3')?.textContent.trim()
        || (caption ? caption.textContent.replace(credit, '').trim() : '') || img.alt || 'Picture';
      openLightbox({ type: 'image', src: img.getAttribute('src'), alt: img.alt || title, title, rights: '', credit }, img);
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
  WIDE.addEventListener('change', () => { if (current && manual && pages.length && document.body.dataset.page === 'manual') draw(); });

  // Page turning by keyboard, only while the manual is open and nothing that
  // needs the keys itself (a field, a control) has focus.
  window.addEventListener('keydown', (e) => {
    if (document.body.dataset.page !== 'manual' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
    const turn = { ArrowLeft: 'prev', PageUp: 'prev', ArrowRight: 'next', PageDown: 'next' }[e.key];
    const link = turn && document.querySelector(`.m-turn[data-turn="${turn}"]`);
    if (link) { e.preventDefault(); link.click(); }
  });

  window.Manual = { render, guideLinks, pageLink, findPages };
})();

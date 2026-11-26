/* The hosted guide page: one encyclopedia entry (?ref=section/slug), one Field Manual page
 * (?manual=<chapter>&page=<n> or &title=<page title>), or a search (?q=words). */
'use strict';
(async () => {
  const params = new URLSearchParams(location.search);
  const main = document.getElementById('page');
  const { esc, rich, plain } = HQ;
  const box = document.getElementById('spoilers');
  box.checked = HQ.spoilers;
  box.onchange = () => HQ.setSpoilers(box.checked);
  document.getElementById('find-q').value = params.get('q') || '';
  const fail = (text) => { main.innerHTML = `<h1>Not found</h1><p>${esc(text)}</p><p><a class="btn" href="./">All guides</a></p>`; };
  const sourcesHtml = (list) => (list?.length ? `<section class="sources"><h2>Sources</h2><ul>${list.map((s) =>
    `<li>${/^https?:/.test(s.url || "") ? `<a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.name)}</a>` : esc(s.name)}${s.type ? ` <small>${esc(s.type)}</small>` : ''}</li>`).join('')}</ul></section>` : '');
  const wikiLink = (href) => (href?.startsWith('#/wiki/') ? `./?ref=${encodeURIComponent(href.slice(7))}` : null);

  let entries, manual;
  try {
    [entries, manual] = await Promise.all([HQ.load('entries'), HQ.load('manual')]);
  } catch (error) {
    main.innerHTML = `<p>The guides could not be loaded (${esc(error.message)}). Try again in a moment.</p>`;
    return;
  }
  const byRef = new Map(entries.map((e) => [e.ref, e]));
  const veiled = (e, html) => (e.spoiler && !HQ.spoilers
    ? `<div class="veil"><p>This entry has story or late-game details.</p><button type="button" class="btn" data-show>Show it</button><div class="veil-body" hidden>${html}</div></div>`
    : html);
  main.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-show]');
    if (b) { b.parentElement.querySelector('.veil-body').hidden = false; b.previousElementSibling.remove(); b.remove(); }
  });

  function showEntry(e) {
    document.title = `${e.spoiler && !HQ.spoilers ? 'Spoiler' : plain(e.name)} · GTA 6 HQ`;
    const facts = (e.facts || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${rich(v)}</dd>`).join('');
    const html = `
      <p class="crumbs"><a href="./?q=">Guides</a> › ${esc(e.section_label)}</p>
      <h1>${rich(e.name)}</h1>
      ${e.summary ? `<p class="lede">${rich(e.summary)}</p>` : ''}
      ${e.on_map ? `<p><a class="btn" href="../map/?focus=${encodeURIComponent(e.ref)}">Show on the map</a></p>` : ''}
      ${facts ? `<dl class="facts">${facts}</dl>` : ''}
      ${(e.steps || []).length ? `<h2>Steps</h2><ol class="steps">${e.steps.map((s) => `<li>${rich(s)}</li>`).join('')}</ol>` : ''}
      ${(e.body || []).map((p) => `<p>${rich(p)}</p>`).join('')}
      ${e.confidence ? `<p class="muted">Confidence: ${esc(e.confidence)}${e.verified ? ` · last checked ${esc(e.verified)}` : ''}</p>` : ''}
      ${sourcesHtml(e.sources)}`;
    main.innerHTML = veiled(e, html);
  }

  function block(b) {
    const t = b.type;
    const link = wikiLink(b.link);
    if (t === 'heading') return `<h1>${rich(b.text)}${b.accent ? ` <span class="accent">${rich(b.accent)}</span>` : ''}</h1>`;
    if (t === 'subheading') return `<h2>${rich(b.text || b.title || '')}</h2>`;
    if (t === 'intro') return `<p class="lede">${rich(b.text)}</p>`;
    if (t === 'paragraph') return `<p>${rich(b.text)}</p>`;
    if (t === 'numbered') return `<section class="step"><h3><span class="num">${esc(b.n ?? '')}</span>${rich(b.title || '')}</h3><p>${rich(b.text || '')}</p>${link ? `<p><a href="${link}">More in the encyclopedia</a></p>` : ''}</section>`;
    if (t === 'tip' || t === 'warning' || t === 'callout') return `<aside class="tip tip-${esc(t)}"><b>${esc(b.title || (t === 'warning' ? 'Careful' : 'Tip'))}</b> ${rich(b.text || '')}</aside>`;
    if (t === 'table') return `<div class="table-wrap"><table>${b.caption ? `<caption>${rich(b.caption)}</caption>` : ''}<thead><tr>${(b.columns || []).map((c) => `<th>${rich(c)}</th>`).join('')}</tr></thead><tbody>${(b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (t === 'unknown') return `<aside class="tip tip-unknown"><b>Not known yet</b><ul>${(b.items || []).map((i) => `<li>${rich(i)}</li>`).join('')}</ul></aside>`;
    if (t === 'checklist') return `<ul class="checklist">${(b.items || []).map((i) => `<li>${rich(typeof i === 'string' ? i : i.text || i.label || '')}</li>`).join('')}</ul>`;
    if (t === 'maplink' && b.kind) return `<p><a class="btn" href="../map/?kind=${encodeURIComponent(b.kind)}">${rich(b.text || 'Show on the map')}</a></p>`;
    if (t === 'rule') return '<hr>';
    return '';
  }

  function showPage(ch, i) {
    const page = ch.pages[i];
    document.title = `${plain(page.title)} · GTA 6 HQ`;
    const ids = new Set();
    for (const b of page.blocks || []) for (const s of b.sources || []) ids.add(s);
    const src = [...ids].map((id) => manual.sources[id]).filter(Boolean);
    const prev = i > 0 ? `<a href="./?manual=${encodeURIComponent(ch.id)}&page=${i - 1}">‹ ${esc(plain(ch.pages[i - 1].title))}</a>` : '<span></span>';
    const next = i < ch.pages.length - 1 ? `<a href="./?manual=${encodeURIComponent(ch.id)}&page=${i + 1}">${esc(plain(ch.pages[i + 1].title))} ›</a>` : '<span></span>';
    main.innerHTML = `<p class="crumbs"><a href="./?q=">Field Manual</a> › ${esc(ch.title)}</p>
      ${(page.blocks || [])[0]?.type === 'heading' ? '' : `<h1>${rich(page.title)}</h1>`}
      ${(page.blocks || []).map(block).join('')}
      ${sourcesHtml(src)}
      <nav class="pager">${prev}${next}</nav>`;
  }

  function showIndex(q) {
    const words = (q || '').toLowerCase().split(/\s+/).filter(Boolean);
    const match = (text) => words.every((w) => plain(text).toLowerCase().includes(w));
    const label = (e) => (e.spoiler && !HQ.spoilers ? `<span class="spoiler" tabindex="0" role="button">${esc(plain(e.name))}</span>` : esc(plain(e.name)));
    const found = words.length ? entries.filter((e) => match(e.name) || (e.aliases || []).some(match)).slice(0, 80) : [];
    const pages = [];
    manual.chapters.forEach((ch) => (ch.pages || []).forEach((p, i) => { if (!words.length || match(p.title)) pages.push([ch, i, p]); }));
    main.innerHTML = `<h1>${words.length ? `Results for “${esc(q)}”` : 'Guides'}</h1>
      ${words.length ? `<h2>Encyclopedia</h2>${found.length ? `<ul class="results">${found.map((e) => `<li><a href="./?ref=${encodeURIComponent(e.ref)}">${label(e)}</a> <small>${esc(e.section_label)}</small></li>`).join('')}</ul>` : '<p class="muted">No entries match.</p>'}` : ''}
      <h2>Field Manual</h2>
      ${words.length ? (pages.length ? `<ul class="results">${pages.slice(0, 60).map(([ch, i, p]) => `<li><a href="./?manual=${encodeURIComponent(ch.id)}&page=${i}">${rich(p.title)}</a> <small>${esc(ch.title)}</small></li>`).join('')}</ul>` : '<p class="muted">No guide pages match.</p>')
        : manual.chapters.filter((ch) => (ch.pages || []).length).map((ch) => `<details><summary>${esc(ch.title)}</summary><ul class="results">${ch.pages.map((p, i) => `<li><a href="./?manual=${encodeURIComponent(ch.id)}&page=${i}">${rich(p.title)}</a></li>`).join('')}</ul></details>`).join('')}`;
  }

  const ref = params.get('ref');
  const chId = params.get('manual');
  if (ref) {
    const e = byRef.get(ref);
    if (e) showEntry(e); else fail('That entry is not in GTA 6 HQ, or it has moved.');
  } else if (chId) {
    const ch = manual.chapters.find((c) => c.id === chId && (c.pages || []).length);
    if (!ch) { fail('That guide is not in the Field Manual.'); return; }
    let i = Number(params.get('page'));
    if (params.get('title')) i = ch.pages.findIndex((p) => plain(p.title) === params.get('title'));
    if (!(i >= 0 && i < ch.pages.length)) i = 0;
    showPage(ch, i);
  } else {
    showIndex(params.get('q'));
  }
  window.hqReady = true;
})();

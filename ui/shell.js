// GTA 6 HQ: the application shell. A grouped sidebar down the left of the window and a title bar
// with the search in the middle, in place of five links and a "More" menu along the top.
//
// The sidebar is built from the links the page already has (the top bar's own and the More menu's,
// with their icons), so there is one list of destinations and nothing here names a route twice.
// It runs before app.js and more.js, while that markup is still as index.html wrote it. On a narrow
// window the sidebar is not shown and the original top-bar menu works as before (shell.css).
(function () {
  const nav = document.getElementById('nav');
  // Stream mode (stream.js, switched on by ?stream in the address) shows the pages alone: no sidebar.
  // stream.js loads after this file, so the address is read here rather than the class it sets.
  if (!nav || new URLSearchParams(location.search).has('stream')) return;

  // Which destinations sit together, by the route each link already carries. Anything the menu
  // gains later that is not listed here lands in "More", so no destination can go missing.
  const GROUPS = [
    ['', ['home', 'map', 'wiki', 'manual', 'saved']],
    ['Browse', ['characters', 'locations', 'vehicles', 'wiki/businesses', 'wiki/activities', 'intel', 'media']],
    ['Track', ['tracker', 'hundred', 'progress', 'journal']],
    ['Game menus', ['garage', 'arsenal', 'cards', 'trophies', 'cheats', 'controls']],
  ];
  const FOOT = ['help', 'settings'];
  // Shorter names where the menu's own would wrap in the sidebar.
  const LABEL = { manual: 'Field Manual', cheats: 'Cheats', hundred: '100% Checklist', wiki: 'Encyclopedia' };

  const links = new Map();
  for (const a of nav.querySelectorAll('a[data-route]')) {
    if (links.has(a.dataset.route)) continue;
    const svg = a.querySelector('svg');
    links.set(a.dataset.route, { href: a.getAttribute('href'), label: LABEL[a.dataset.route] || a.textContent.trim(), icon: svg ? svg.outerHTML.replace(/class="[^"]*"/, 'class="i side-ico"') : '' });
  }
  const item = (route) => {
    const l = links.get(route);
    if (!l) return '';
    links.delete(route);
    return `<a href="${l.href}" data-route="${route}" title="${l.label}">${l.icon}<span>${l.label}</span></a>`;
  };
  const groups = GROUPS.map(([title, routes]) => [title, routes.map(item).join('')]);
  const foot = FOOT.map(item).join('');
  const rest = [...links.keys()].map(item).join('');
  if (rest) groups.push(['More', rest]);

  const side = document.createElement('aside');
  side.id = 'sidebar';
  side.className = 'sidebar';
  side.setAttribute('aria-label', 'Sections');
  side.innerHTML = `<nav class="side-scroll">${groups.filter(([, html]) => html).map(([title, html]) =>
    `<div class="side-group">${title ? `<h2 class="side-title">${title}</h2>` : ''}${html}</div>`).join('')}</nav>
    <div class="side-foot">${foot}
      <button type="button" class="side-collapse" aria-label="Collapse the sidebar" title="Collapse the sidebar" aria-pressed="false">
        <svg class="i side-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/></svg><span>Collapse</span></button>
    </div>`;
  document.querySelector('.topbar').after(side);
  document.body.classList.add('has-sidebar');

  // Collapsed to icons, by choice or because the window is narrow (shell.css). The choice is kept with
  // the app's other preferences (app.js prefs), which outlast the window; they are read once loaded.
  const button = side.querySelector('.side-collapse');
  const setCollapsed = (on) => {
    document.body.classList.toggle('side-collapsed', on);
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? 'Expand the sidebar' : 'Collapse the sidebar';
    button.setAttribute('aria-label', button.title);
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof prefsReady === 'undefined') return;
    prefsReady.then(() => setCollapsed(prefs.get('sidebar') === 'collapsed')).catch(() => {});
  });
  button.addEventListener('click', () => {
    const on = !document.body.classList.contains('side-collapsed');
    setCollapsed(on);
    if (typeof prefs !== 'undefined') prefs.set('sidebar', on ? 'collapsed' : 'open');
  });

  // The search field in the title bar: Ctrl+K (or /) puts the cursor in it from anywhere.
  const search = document.querySelector('#nav-search input');
  if (search) {
    search.placeholder = 'Search';
    const hint = document.createElement('kbd');
    hint.className = 'search-hint';
    hint.textContent = 'Ctrl K';
    hint.setAttribute('aria-hidden', 'true');
    search.after(hint);
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey) && !e.altKey) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        if (document.querySelector('#splash, .pause')) return;
        e.preventDefault();
        search.focus();
        search.select();
      }
    });
  }
}());

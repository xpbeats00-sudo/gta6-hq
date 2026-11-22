// GTA 6 HQ: the reader's appearance choices (theme, accent, density, animation, map panels).
// Saved with the other settings (/api/settings, through window.hqPrefs) and applied as attributes
// on <html>, which ui/themes.css reads. Loaded after app.js, before explore.js.
(function () {
  const ACCENTS = [
    ['', 'Vice pink (the original)'],
    ['#ff9f45', 'Sunset orange'],
    ['#4fd1e8', 'Ocean blue'],
    ['#5fd68a', 'Palm green'],
    ['#f2c44e', 'Gold'],
    ['#b48cff', 'Neon violet'],
  ];
  const HEX = /^#[0-9a-f]{6}$/i;
  const prefsOf = () => window.hqPrefs;
  const read = (key, fallback) => prefsOf()?.get(key) || fallback;

  /** The theme to use: the saved one, or Vice City. */
  const theme = () => ({ vice: 'vice', dark: 'dark', light: 'light' }[read('theme-app', 'vice')] || 'vice');
  /** 'full', 'gentle' or 'off'. The older "Reduce motion" switch counts as off. */
  const motion = () => (read('reduced-motion', '0') === '1' ? 'off' : ({ full: 'full', gentle: 'gentle', off: 'off' }[read('motion-level', 'full')] || 'full'));
  /** How much of the map shows through its panels, 0 to 60 (per cent). */
  const seeThrough = () => Math.max(0, Math.min(60, Number(read('panel-see', '0')) || 0));

  function apply() {
    const root = document.documentElement;
    const t = theme();
    if (t === 'vice') delete root.dataset.theme; else root.dataset.theme = t;
    const accent = read('accent', '');
    if (HEX.test(accent)) { root.dataset.accent = ''; root.style.setProperty('--accent-user', accent); } else { delete root.dataset.accent; root.style.removeProperty('--accent-user'); }
    const density = read('density', 'comfortable');
    if (density === 'compact') root.dataset.density = 'compact'; else delete root.dataset.density;
    const m = motion();
    if (m === 'gentle') root.dataset.motion = 'gentle'; else delete root.dataset.motion;
    document.body?.classList.toggle('reduce-motion', m === 'off');
    const see = seeThrough();
    root.style.setProperty('--panel-solid', `${100 - see}%`);
    if (see === 0) root.dataset.panels = 'solid'; else delete root.dataset.panels;
    // The window's own colour (the strip behind the title bar on some systems).
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg-header').trim() || '#171426');
  }

  /** How fast camera moves run: 1 normally, 0.5 for "gentle", 0 when motion is off or reduced. */
  function scale() {
    const m = motion();
    if (m === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    return m === 'gentle' ? 0.5 : 1;
  }

  window.Appearance = { apply, scale, theme, motion, seeThrough, ACCENTS, HEX };
  // app.js applies it once the saved settings are read, before the first page is drawn.
}());

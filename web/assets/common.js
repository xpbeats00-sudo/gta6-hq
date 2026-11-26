/* Shared by the hosted map and guide pages. Data comes from ../data/, exported from the GTA 6 HQ app. */
'use strict';
const HQ = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cache = {};
  const load = (name) => (cache[name] ||= fetch(`../data/${name}.json`, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`${name}.json: ${r.status}`);
    return r.json();
  }));
  let spoilers = false;
  try { spoilers = localStorage.getItem('hq-spoilers') === '1'; } catch { /* private window */ }
  if (new URLSearchParams(location.search).get('spoilers') === '1') spoilers = true;
  const setSpoilers = (on) => {
    spoilers = on;
    try { localStorage.setItem('hq-spoilers', on ? '1' : '0'); } catch { /* ignore */ }
    document.body.classList.toggle('show-spoilers', on);
  };
  document.addEventListener('DOMContentLoaded', () => document.body.classList.toggle('show-spoilers', spoilers));
  /** Text with the app's ||spoiler|| bars as click-to-reveal spans, and **bold**. */
  const rich = (text) => esc(text)
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" tabindex="0" role="button" title="Spoiler: click to show">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const plain = (text) => String(text ?? '').replace(/\|\|/g, '');
  document.addEventListener('click', (e) => {
    const s = e.target.closest('.spoiler');
    if (s) s.classList.add('shown');
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('spoiler')) { e.preventDefault(); e.target.classList.add('shown'); }
  });
  /** The closest region and district markers to a spot (the same rule as the Discord assistant). */
  const areaOf = (pins, x, y) => {
    const best = {};
    for (const p of pins) {
      if (p.category !== 'regions' && p.category !== 'districts') continue;
      const d = Math.hypot(p.x - x, (p.y - y) * 1.37);
      if (!best[p.category] || d < best[p.category][0]) best[p.category] = [d, p.name];
    }
    const region = best.regions ? best.regions[1] : '';
    const district = best.districts && best.districts[0] < 0.06 ? best.districts[1] : '';
    return district && district !== region ? `${region} (near ${district})` : region;
  };
  return { esc, load, rich, plain, areaOf, get spoilers() { return spoilers; }, setSpoilers };
})();

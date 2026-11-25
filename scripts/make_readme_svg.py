"""Draw the README's animated artwork as SVG (docs/media/readme/*.svg).

    python scripts/make_readme_svg.py

GitHub shows SVG pictures with their CSS animations, but cannot load fonts into them, so every word
is drawn as outlines from Windows' Bahnschrift (the app's display face) with fontTools. Each picture
carries its own dark background, so it reads on GitHub's light and dark themes, and each stops
moving for readers who ask for less motion.

  stats.svg       four counts from the live data, rising in one after another
  h-<name>.svg    one plate per section heading, with a light running along its sunset rule
  rule.svg        a thin sunset line with the same running light

Needs fontTools (pip install fonttools) and C:/Windows/Fonts/bahnschrift.ttf.
"""
import json
import os
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'media', 'readme')
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'
W = 860  # shown width on GitHub

_faces = {}
def face(wght, wdth):
    key = (wght, wdth)
    if key not in _faces:
        f = TTFont(FONT)
        _faces[key] = instancer.instantiateVariableFont(f, {'wght': wght, 'wdth': wdth})
    return _faces[key]

def text_path(text, size, wght=700, wdth=75, track=0.0):
    """Outline of `text` at `size` px, top-left at 0,0 of the cap line. Returns (d, width, cap height)."""
    f = face(wght, wdth)
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    upm = f['head'].unitsPerEm
    scale = size / upm
    cap = (getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7) * scale
    pen = SVGPathPen(gs)
    x = 0.0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            x += size * 0.3
            continue
        tp = TransformPen(pen, (scale, 0, 0, -scale, x, cap))
        gs[g].draw(tp)
        x += gs[g].width * scale + track * size
    return pen.getCommands(), x - track * size, cap

def placed(text, size, x, y, anchor='start', **kw):
    """A <path d> for text placed with its cap top at y; anchor start, middle or end."""
    d, w, cap = text_path(text, size, **kw)
    if anchor == 'middle':
        x -= w / 2
    elif anchor == 'end':
        x -= w
    return f'<path transform="translate({x:.1f} {y:.1f})" d="{d}"/>', w, cap

REDUCED = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }'
SUNSET = '<stop offset="0" stop-color="#ffc46b"/><stop offset=".55" stop-color="#ee3f7c"/><stop offset="1" stop-color="#8b3fd9"/>'

def svg(w, h, body, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{label}">'
            f'<title>{label}</title>{body}</svg>\n')

def write(name, text):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)
    print(name, f'{len(text) / 1024:.0f} KB')

def stats(items):
    w, h = W, 112
    gap, tile_w = 12, (W - 3 * 12) / 4
    tiles = []
    for i, (num, label) in enumerate(items):
        x = i * (tile_w + gap)
        n, _, ncap = placed(num, 34, x + 20, 24, wght=700, wdth=75, track=0.02)
        l, _, _ = placed(label.upper(), 11, x + 20, 24 + ncap + 16, wght=600, wdth=100, track=0.14)
        tiles.append(f'''<g class="up" style="animation-delay:{.15 + i * .18:.2f}s">
  <rect x="{x:.1f}" y="1" width="{tile_w:.1f}" height="{h - 2}" rx="14" fill="#160a2e" stroke="#3a2160"/>
  <rect x="{x:.1f}" y="1" width="4" height="{h - 2}" rx="2" fill="url(#ink)"/>
  <g fill="url(#ink)">{n}</g><g fill="#cdbfe0">{l}</g>
</g>''')
    body = f'''<defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">{SUNSET}</linearGradient></defs>
<style>
  .up {{ opacity: 0; animation: up .9s cubic-bezier(.2,.8,.2,1) forwards; }}
  @keyframes up {{ from {{ opacity: 0; transform: translateY(14px); }} to {{ opacity: 1; transform: none; }} }}
  @media (prefers-reduced-motion: reduce) {{ .up {{ opacity: 1; animation: none; }} }}
</style>
{''.join(tiles)}'''
    write('stats.svg', svg(w, h, body, ', '.join(f'{n} {l}' for n, l in items)))

def heading(name, text):
    w, h = W, 70
    t, tw, tcap = placed(text.upper(), 30, 30, 16, wght=700, wdth=75, track=0.05)
    rule_y = 16 + tcap + 14
    body = f'''<defs>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="0">{SUNSET}</linearGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="line"><rect x="30" y="{rule_y}" width="{w - 60}" height="3" rx="1.5"/></clipPath>
</defs>
<style>
  .run {{ animation: run 4.5s ease-in-out infinite; }}
  @keyframes run {{ 0% {{ transform: translateX(-180px); }} 55%, 100% {{ transform: translateX({w + 40}px); }} }}
  {REDUCED}
</style>
<path d="M0,12 Q0,0 12,0 H{w - 28} L{w},28 V{h - 12} Q{w},{h} {w - 12},{h} H12 Q0,{h} 0,{h - 12} Z" fill="#160a2e"/>
<rect x="0" y="0" width="5" height="{h}" fill="url(#ink)"/>
<g fill="#f6eefa">{t}</g>
<rect x="30" y="{rule_y}" width="{w - 60}" height="3" rx="1.5" fill="url(#ink)" opacity=".9"/>
<g clip-path="url(#line)"><rect class="run" x="0" y="{rule_y - 2}" width="160" height="7" fill="url(#shine)"/></g>'''
    write(f'h-{name}.svg', svg(w, h, body, text))

def rule():
    w, h = W, 6
    body = f'''<defs>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffc46b" stop-opacity="0"/><stop offset=".2" stop-color="#ffc46b"/><stop offset=".55" stop-color="#ee3f7c"/><stop offset=".8" stop-color="#8b3fd9"/><stop offset="1" stop-color="#8b3fd9" stop-opacity="0"/></linearGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="c"><rect x="0" y="2" width="{w}" height="2" rx="1"/></clipPath>
</defs>
<style>.run {{ animation: run 5s ease-in-out infinite; }} @keyframes run {{ 0% {{ transform: translateX(-160px); }} 60%, 100% {{ transform: translateX({w + 20}px); }} }} {REDUCED}</style>
<rect x="0" y="2" width="{w}" height="2" rx="1" fill="url(#ink)"/>
<g clip-path="url(#c)"><rect class="run" x="0" y="0" width="140" height="{h}" fill="url(#shine)"/></g>'''
    write('rule.svg', svg(w, h, body, ''))

def counts():
    """Rounded counts from the live data, so the strip never claims more than is there."""
    wiki = json.load(open(os.path.join(ROOT, 'data', 'wiki.json'), encoding='utf-8'))
    entries, pictures = 0, 0
    wikidir = os.path.join(ROOT, 'data', 'wiki')
    cats = list(wiki.get('categories', []))
    for name in os.listdir(wikidir):
        if name.startswith('categories.'):
            cats += json.load(open(os.path.join(wikidir, name), encoding='utf-8'))
    sections = {c['key'] for c in cats}
    shown = len(sections)
    sections |= {'news', 'editions', 'faq'}
    for name in sorted(os.listdir(wikidir)):
        key = name.split('.')[0]
        if key in sections and name.endswith('.json'):
            entries += len(json.load(open(os.path.join(wikidir, name), encoding='utf-8')))
    entries += sum(len(wiki.get(k, [])) for k in sections)
    for sec in sections:
        folder = os.path.join(ROOT, 'images', sec)
        if os.path.isdir(folder):
            pictures += len([f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
    manual = json.load(open(os.path.join(ROOT, 'data', 'manual.json'), encoding='utf-8'))
    pages = sum(len(c.get('pages', [])) for c in manual['chapters'])
    down = lambda n, step: f'{n // step * step:,}+'
    return [(down(entries, 100), 'encyclopedia entries'), (str(shown), 'sections'),
            (down(pictures, 100), 'sourced pictures'), (str(pages), 'Field Manual pages')]

if __name__ == '__main__':
    stats(counts())
    for name, text in [('inside', "What's inside"), ('intro', 'Pick your start-up'), ('manual', 'The Field Manual'), ('install', 'Install'),
                       ('new', "What's new"), ('creators', 'Creators welcome'), ('questions', 'Questions'), ('trust', 'How far to trust it'),
                       ('privacy', 'Privacy'), ('credits', 'Credits and rights'), ('developers', 'For developers')]:
        heading(name, text)
    rule()

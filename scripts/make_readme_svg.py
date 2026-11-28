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

# Moving parts stop for readers who ask for less motion; fades and glows carry on.
REDUCED = '@media (prefers-reduced-motion: reduce) { .run, .up { animation: none !important; } .up { opacity: 1 !important; } }'
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

def heading(name, text, number=None):
    """A section plate: a numbered neon tag, the title with a soft glow, a striped sunset sun on the
    right, and a light running along the sunset rule. It flickers on like a neon sign as it loads."""
    w, h = W, 76
    tx = 30 if number is None else 96
    t, tw, tcap = placed(text.upper(), 30, tx, 18, wght=700, wdth=75, track=0.05)
    rule_y = 18 + tcap + 14
    tag = ''
    if number is not None:
        n, nw, ncap = placed(f'{number:02d}', 22, 0, 0, wght=700, wdth=75, track=0.06)
        tag = (f'<rect x="28" y="{18 + tcap / 2 - 17:.1f}" width="50" height="34" rx="8" fill="none" stroke="#5ef2ff" stroke-width="2" opacity=".9"/>'
               f'<g fill="#5ef2ff" transform="translate({53 - nw / 2:.1f} {18 + tcap / 2 - ncap / 2:.1f})">{n}</g>')
    sx, sy, sr = w - 92, 44, 26
    gaps = ''.join(f'<rect x="{sx - sr}" y="{sy - 2 + k * 7}" width="{sr * 2}" height="{1 + k * .6:.1f}" fill="#000"/>' for k in range(5))
    body = f'''<defs>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="0">{SUNSET}</linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc46b"/><stop offset="1" stop-color="#ee3f7c"/></linearGradient>
  <linearGradient id="plate" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b0c36"/><stop offset=".7" stop-color="#160a2e"/><stop offset="1" stop-color="#2a0f4a"/></linearGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="glow" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
  <clipPath id="line"><rect x="{tx}" y="{rule_y}" width="{w - tx - 150}" height="3" rx="1.5"/></clipPath>
  <mask id="sm"><circle cx="{sx}" cy="{sy}" r="{sr}" fill="#fff"/><rect x="{sx - sr}" y="{sy + 14}" width="{sr * 2}" height="20" fill="#000"/>{gaps}</mask>
</defs>
<style>
  .run {{ animation: run 4.5s ease-in-out infinite; }}
  @keyframes run {{ 0% {{ transform: translateX(-180px); }} 55%, 100% {{ transform: translateX({w + 40}px); }} }}
  .on {{ animation: on 1.4s linear both; }}
  @keyframes on {{ 0% {{ opacity: 0; }} 10% {{ opacity: .8; }} 14% {{ opacity: .1; }} 22% {{ opacity: 1; }} 26% {{ opacity: .4; }} 34%, 100% {{ opacity: 1; }} }}
  .breathe {{ animation: breathe 4s ease-in-out infinite alternate; }} @keyframes breathe {{ from {{ opacity: .35; }} to {{ opacity: .8; }} }}
  {REDUCED}
</style>
<path d="M0,14 Q0,0 14,0 H{w - 30} L{w},30 V{h - 14} Q{w},{h} {w - 14},{h} H14 Q0,{h} 0,{h - 14} Z" fill="url(#plate)"/>
<path d="M0,14 Q0,0 14,0 H{w - 30} L{w},30 V{h - 14} Q{w},{h} {w - 14},{h} H14 Q0,{h} 0,{h - 14} Z" fill="none" stroke="#ff6fb5" stroke-opacity=".28" stroke-width="1.5"/>
<rect x="0" y="0" width="5" height="{h}" fill="url(#ink)"/>
<circle class="breathe" cx="{sx}" cy="{sy}" r="{sr + 8}" fill="#ff6f7d" filter="url(#glow)"/>
<rect x="{sx - sr}" y="{sy - sr}" width="{sr * 2}" height="{sr * 2}" fill="url(#sun)" mask="url(#sm)"/>
<rect x="{sx - 44}" y="{sy + 14}" width="88" height="1.5" fill="#ffb3a0" opacity=".7"/>
<g class="on">{tag}<g fill="#ff4fa3" opacity=".55" filter="url(#glow)">{t}</g><g fill="#f6eefa">{t}</g></g>
<rect x="{tx}" y="{rule_y}" width="{w - tx - 150}" height="3" rx="1.5" fill="url(#ink)" opacity=".9"/>
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
    done = []
    for name, text in [('inside', "What's inside"), ('intro', 'Pick your start-up'), ('manual', 'The Field Manual'), ('install', 'Install'),
                       ('new', "What's new"), ('creators', 'Creators welcome'), ('questions', 'Questions'), ('trust', 'How far to trust it'),
                       ('privacy', 'Privacy'), ('credits', 'Credits and rights'), ('developers', 'For developers')]:
        heading(name, text, number=len(done) + 1)
        done.append(name)
    rule()

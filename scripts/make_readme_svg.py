"""Draw the README's animated artwork as SVG (docs/media/readme/*.svg).

    python scripts/make_readme_svg.py

GitHub shows SVG pictures with their CSS animations, but cannot load fonts into them, so every word
is drawn as outlines from Windows' Bahnschrift (the app's display face) with fontTools. Each picture
carries its own dark background, so it reads on GitHub's light and dark themes, and each stops
moving for readers who ask for less motion.

  hero.svg        title scene: a sunset with moving bands, a grid floor running to the horizon,
                  palms, twinkling stars and the title glowing
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

def palm(x, base, h, flip=1):
    """A palm silhouette: a leaning trunk and eight fronds."""
    top_x, top_y = x + 26 * flip, base - h
    trunk = f'<path d="M{x - 6},{base} C{x - 2},{base - h * .45} {top_x - 8 * flip},{top_y + h * .25} {top_x},{top_y} L{top_x + 5 * flip},{top_y + 3} C{top_x - 2 * flip},{top_y + h * .3} {x + 6},{base - h * .4} {x + 8},{base} Z"/>'
    fronds = []
    for ang, length in [(-160, 70), (-135, 82), (-105, 66), (-70, 64), (-40, 84), (-15, 72), (15, 58), (-185, 56)]:
        a = ang if flip == 1 else 180 - ang
        fronds.append(f'<path transform="translate({top_x} {top_y}) rotate({a})" d="M0,0 C{length * .35},-14 {length * .75},-10 {length},8 C{length * .7},0 {length * .35},2 0,4 Z"/>')
    return trunk + ''.join(fronds)

def hero():
    w, h, horizon = W, 360, 236
    title, tw, tcap = placed('GTA 6 HQ', 92, w / 2, 34, 'middle', wght=700, wdth=75, track=0.04)
    sub, _, _ = placed('THE UNOFFICIAL GRAND THEFT AUTO VI ENCYCLOPEDIA, MAP AND FIELD MANUAL', 13, w / 2, 34 + tcap + 20, 'middle', wght=600, wdth=100, track=0.18)
    stars = ''.join(
        f'<circle cx="{x}" cy="{y}" r="{r}" class="tw" style="animation-delay:{d}s"/>'
        for x, y, r, d in [(70, 40, 1.4, 0), (150, 92, 1, 1.2), (240, 28, 1.2, 2.1), (330, 120, .9, .6), (560, 34, 1.3, 1.7), (640, 96, 1, .3),
                           (720, 48, 1.5, 2.6), (800, 112, 1, 1.1), (110, 150, .9, 2.3), (780, 168, .9, .9), (470, 22, 1, 1.5), (40, 196, .8, .4)])
    # Sun: bands slide down through it, the classic synthwave sunset.
    bands = ''.join(f'<rect x="320" y="{horizon - 92 + i * 14}" width="220" height="{2 + i * .55:.1f}"/>' for i in range(10))
    # Floor: lines from the vanishing point, and cross lines that run towards the viewer.
    vx = w / 2
    rays = ''.join(f'<line x1="{vx}" y1="{horizon}" x2="{x}" y2="{h}"/>' for x in range(-900, w + 900, 70))
    cross = ''.join(f'<line x1="0" y1="{horizon + (i / 9) ** 2 * (h - horizon) + 1:.1f}" x2="{w}" y2="{horizon + (i / 9) ** 2 * (h - horizon) + 1:.1f}"/>' for i in range(1, 10))
    body = f'''<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090614"/><stop offset=".45" stop-color="#1d0b3a"/><stop offset=".72" stop-color="#5a1a5e"/><stop offset="1" stop-color="#a8326e"/></linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#ff7a9c"/><stop offset="1" stop-color="#c03bd6"/></linearGradient>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">{SUNSET}</linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0c3e"/><stop offset="1" stop-color="#0b0716"/></linearGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <mask id="floorfade"><rect x="0" y="{horizon}" width="{w}" height="{h - horizon}" fill="url(#fade)"/></mask>
  <mask id="cut"><rect width="{w}" height="{h}" fill="#fff"/><g class="bands" fill="#000">{bands}</g></mask>
  <clipPath id="frame"><rect width="{w}" height="{h}" rx="18"/></clipPath>
  <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="shadow" x="-5%" y="-100%" width="110%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<style>
  .tw {{ fill: #fff; animation: tw 3.2s ease-in-out infinite; }}
  @keyframes tw {{ 0%, 100% {{ opacity: .15; }} 50% {{ opacity: 1; }} }}
  .bands {{ animation: bands 3s linear infinite; }}
  @keyframes bands {{ from {{ transform: translateY(0); }} to {{ transform: translateY(14px); }} }}
  .cross {{ animation: run 1.6s linear infinite; }}
  @keyframes run {{ from {{ transform: translateY(0); }} to {{ transform: translateY(14px); }} }}
  .halo {{ animation: halo 4s ease-in-out infinite; }}
  @keyframes halo {{ 0%, 100% {{ opacity: .45; }} 50% {{ opacity: .9; }} }}
  .flick {{ animation: flick 7s steps(1) infinite; }}
  @keyframes flick {{ 0%, 41%, 44%, 100% {{ opacity: 1; }} 42%, 43.5% {{ opacity: .55; }} }}
  .sweep {{ animation: sweep 6s ease-in-out infinite; }}
  @keyframes sweep {{ 0% {{ transform: translateX(-260px); }} 60%, 100% {{ transform: translateX({w + 260}px); }} }}
  {REDUCED}
</style>
<g clip-path="url(#frame)">
  <rect width="{w}" height="{h}" fill="url(#sky)"/>
  {stars}
  <circle cx="{vx}" cy="{horizon - 20}" r="130" fill="#ff5f9e" opacity=".25" filter="url(#soft)" class="halo"/>
  <circle cx="{vx}" cy="{horizon + 6}" r="96" fill="url(#sun)" mask="url(#cut)"/>
  <rect y="{horizon}" width="{w}" height="{h - horizon}" fill="url(#floor)"/>
  <g mask="url(#floorfade)" stroke="#ff5fa8" stroke-width="1.2" opacity=".55">
    <g>{rays}</g>
    <g class="cross">{cross}</g>
  </g>
  <line x1="0" y1="{horizon}" x2="{w}" y2="{horizon}" stroke="#ffb3d1" stroke-width="1.5" opacity=".8"/>
  <g fill="#0b0614">{palm(46, h, 250)}{palm(128, h + 6, 190)}{palm(w - 40, h, 270, -1)}{palm(w - 132, h + 8, 175, -1)}</g>
  <g class="halo" fill="#ee3f7c" filter="url(#glow)">{title}</g>
  <g class="flick" fill="url(#ink)">{title}</g>
  <g fill="#0b0614" opacity=".85" filter="url(#shadow)">{sub}</g>
  <g fill="#f6eefa">{sub}</g>
  <rect class="sweep" x="0" y="0" width="120" height="{h}" fill="#fff" opacity=".05" transform="skewX(-18)"/>
</g>'''
    write('hero.svg', svg(w, h, body, 'GTA 6 HQ: the unofficial Grand Theft Auto VI encyclopedia, map and field manual'))

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
    hero()
    stats(counts())
    for name, text in [('inside', "What's inside"), ('intro', 'Pick your start-up'), ('manual', 'The Field Manual'), ('install', 'Install'),
                       ('new', "What's new"), ('creators', 'Creators welcome'), ('questions', 'Questions'), ('trust', 'How far to trust it'),
                       ('privacy', 'Privacy'), ('credits', 'Credits and rights'), ('developers', 'For developers')]:
        heading(name, text)
    rule()

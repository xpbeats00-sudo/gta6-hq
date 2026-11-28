"""Draw the README's live banners as animated SVG (docs/media/readme/).

    python scripts/make_readme_banners.py

The banners are built around the app's own live wallpapers (Rockstar footage in wallpapers/*.mp4,
recorded in data/media.json). The overlays are drawn here and use no Rockstar logo.

  hero.svg          the top banner: six wallpaper scenes crossfading with a slow zoom, a caption
                    and progress bar for each, the GTA 6 HQ wordmark with a chrome sweep, a neon
                    script line, a swaying palm and a wanted level lighting up
  ticker.svg        a seamless scrolling strip of what is inside
  btn-*.svg         neon buttons (download, browser, Discord, Mac and Linux)
  footer.svg        Vice City's skyline at night, signed off in neon

Frames come from the videos through imageio-ffmpeg (pip install imageio-ffmpeg) and are embedded
as WebP, since a picture on GitHub cannot load other files.

Like make_readme_svg.py, every word is drawn as outlines, because GitHub cannot load fonts into an
SVG picture. Every picture carries its own background and holds still for readers who ask for less
motion. The randomness is seeded, so running it again gives the same pictures.

Needs fontTools, C:/Windows/Fonts/bahnschrift.ttf and C:/Windows/Fonts/BRUSHSCI.TTF.
"""
import base64
import io
import math
import os
import random
import subprocess
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

from make_readme_svg import ROOT, face, svg, write

SCRIPT_FONT = 'C:/Windows/Fonts/BRUSHSCI.TTF'
_script = None

PINK, HOT, ORANGE, GOLD, PURPLE, TEAL, INK = '#ff4fa3', '#ee3f7c', '#f58a2e', '#ffc46b', '#8b3fd9', '#5ef2ff', '#160a2e'
# For readers who ask for less motion, everything that moves stops; fades (the wallpaper crossfade,
# captions, twinkles, the wanted level, glows) carry on, since they do not move anything.
MOVING = '.kb, .sweep, .sway, .leaf, .leak, .roll, .rise, .shim, .glint, .run, .up'
REDUCED = '@media (prefers-reduced-motion: reduce) { ' + MOVING + ' { animation: none !important; } .rise, .up { opacity: 1 !important; } }'


def outline(f, text, size, track=0.0):
    """Outline of text at size px, cap top at 0. Returns (d, width, cap height)."""
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    upm = f['head'].unitsPerEm
    s = size / upm
    cap = (getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7) * s
    pen = SVGPathPen(gs)
    x = 0.0
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            x += size * 0.3
            continue
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, cap)))
        x += gs[g].width * s + track * size
    return pen.getCommands(), x - track * size, cap


def words(text, size, x, y, anchor='start', wght=700, wdth=75, track=0.0, script=False, extra=''):
    """A <path> of text with its cap top at y. Returns (element, width, cap)."""
    global _script
    if script:
        _script = _script or TTFont(SCRIPT_FONT)
        f = _script
    else:
        f = face(wght, wdth)
    d, w, cap = outline(f, text, size, track)
    if anchor == 'middle':
        x -= w / 2
    elif anchor == 'end':
        x -= w
    return f'<path transform="translate({x:.1f} {y:.1f})"{extra} d="{d}"/>', w, cap


def pts(points):
    return ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)


# ---------------------------------------------------------------- scenery

def frond(cx, cy, ang, length, width, droop):
    """One palm frond as a filled outline with jagged leaflets, from the crown at cx,cy."""
    p0, p1, p2 = (0, 0), (length * .5, -length * .22), (length, length * droop)
    n, top, bot = 18, [], []
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
        dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
        m = math.hypot(dx, dy) or 1
        nx, ny = -dy / m, dx / m
        w = width * math.sin(math.pi * t) ** .6 * (1 - .4 * t) * (1 if i % 2 else .45)
        for side, lst in ((1, top), (-1, bot)):
            px, py = x + nx * w * side, y + ny * w * side
            lst.append((cx + px * ca - py * sa, cy + px * sa + py * ca))
    return f'<polygon points="{pts(top + bot[::-1])}"/>'


def palm(x, base, height, lean, s, fill, cls, delay=0.0, flip=False):
    """A palm tree: a tapered curved trunk and a crown of fronds, swaying from its foot."""
    crown = (x + lean, base - height)
    ctrl = (x + lean * .15, base - height * .55)
    left, right = [], []
    for i in range(13):
        t = i / 12
        px = (1 - t) ** 2 * x + 2 * (1 - t) * t * ctrl[0] + t * t * crown[0]
        py = (1 - t) ** 2 * base + 2 * (1 - t) * t * ctrl[1] + t * t * crown[1]
        w = (9 - 5 * t) * s
        left.append((px - w, py))
        right.append((px + w, py))
    trunk = f'<polygon points="{pts(left + right[::-1])}"/>'
    rings = ''.join(f'<line x1="{l[0]:.1f}" y1="{l[1]:.1f}" x2="{r[0]:.1f}" y2="{r[1] + 2:.1f}"/>'
                    for l, r in list(zip(left, right))[1:-1])
    angs = [(-178, 1.0, .45), (-150, 1.05, .32), (-122, .8, .2), (-95, .6, .1), (-62, .82, .2),
            (-32, 1.05, .32), (-4, 1.0, .45), (-108, .7, .16), (-78, .7, .16)]
    if flip:
        angs = [(-180 - a, l, d) for a, l, d in angs]
    fronds = ''.join(frond(crown[0], crown[1], a, 78 * s * l, 9 * s, d) for a, l, d in angs)
    nuts = ''.join(f'<circle cx="{crown[0] + dx * s:.1f}" cy="{crown[1] + 5 * s:.1f}" r="{3.6 * s:.1f}"/>' for dx in (-4, 3, -1))
    return (f'<g class="{cls}" style="transform-origin:{x:.0f}px {base:.0f}px;animation-delay:{delay}s" fill="{fill}">'
            f'{trunk}<g stroke="#000" stroke-opacity=".25" stroke-width="1">{rings}</g>'
            f'<g class="leaf" style="transform-origin:{crown[0]:.0f}px {crown[1]:.0f}px;animation-delay:{delay + .4}s">{fronds}{nuts}</g></g>')


def stars(rng, n, w, top, bottom, cls='tw'):
    out = []
    for _ in range(n):
        x, y, r = rng.uniform(0, w), rng.uniform(top, bottom), rng.choice([.6, .8, 1, 1.2, 1.6])
        out.append(f'<circle class="{cls}" cx="{x:.1f}" cy="{y:.1f}" r="{r}" '
                   f'style="animation-duration:{rng.uniform(2.2, 5.5):.1f}s;animation-delay:-{rng.uniform(0, 5):.1f}s"/>')
    return ''.join(out)


STAR5 = 'M0,-10 L2.9,-3.1 10,-3.1 4.3,1.2 6.5,8.1 0,4 -6.5,8.1 -4.3,1.2 -10,-3.1 -2.9,-3.1 Z'

FILTERS = '''
  <filter id="neon" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="c"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".16"/></pattern>'''


# ---------------------------------------------------------------- wallpapers

# (wallpaper video, second to take the frame from, how far down to centre the crop, caption)
SLIDES = [
    ('gta-vi-vice-city-skyline-night', 4, .45, 'VICE CITY  •  DOWNTOWN AFTER DARK'),
    ('gta-vi-jason-lucia-car-window', 4, .02, 'JASON AND LUCIA'),
    ('gta-vi-jason-motorbike-police', 4, .42, 'JASON  •  ON THE RUN'),
    ('gta-vi-canal-police-raid', 4, .5, 'VICE CITY  •  CANAL RAID'),
    ('gta-vi-cal-hampton-boat', 4, .15, 'CAL HAMPTON  •  OUT ON THE WATER'),
    ('gta-vi-hilltop-sunset', 4, .6, 'LEONIDA  •  HILLTOP SUNSET'),
]


def frame(video, second, focus, w, h, quality=66):
    """A frame of a wallpaper video, cropped to w:h around `focus` (0 top, 1 bottom), as a WebP data URI."""
    import imageio_ffmpeg
    from PIL import Image, ImageEnhance
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-loglevel', 'error', '-ss', str(second), '-i',
                          os.path.join(ROOT, 'wallpapers', video + '.mp4'), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
                         capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    ch = round(im.width * h / w)
    top = max(0, min(im.height - ch, round((im.height - ch) * focus)))
    im = im.crop((0, top, im.width, top + ch)).resize((w, h), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(1.12)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------- hero

def hero():
    W, H = 1200, 440
    n, hold, fade = len(SLIDES), 5.0, 1.5
    cycle = n * hold
    pin, pout = fade / cycle * 100, (hold + fade) / cycle * 100
    seg_end = hold / cycle * 100
    origins = ['30% 40%', '70% 30%', '60% 50%', '40% 60%', '65% 35%', '50% 70%']

    slides, caps, segs = [], [], []
    cap_x = W - 40
    for i, (video, sec, focus, caption) in enumerate(SLIDES):
        uri = frame(video, sec, focus, 1600, round(1600 * H / W))
        delay = i * hold
        img = f'<image href="{uri}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/>'
        if i == 0:
            slides.append(f'<g id="first">{img}</g>')  # underneath while the first fade runs
        slides.append(f'<g class="slide" style="animation-delay:{delay}s"><g class="kb" style="animation-delay:{delay}s;transform-origin:{origins[i]}">'
                      + ('<use href="#first"/>' if i == 0 else img) + '</g></g>')
        c, _, _ = words(caption, 13, cap_x, H - 50, anchor='end', wght=600, wdth=100, track=.22)
        caps.append(f'<g class="slide" style="animation-delay:{delay}s" fill="#fff">{c}</g>')
        sx = cap_x - (n - i) * 34 + 6
        segs.append(f'<rect x="{sx}" y="{H - 28}" width="28" height="3" rx="1.5" fill="#fff" opacity=".3"/>'
                    f'<rect class="seg" style="animation-delay:{delay + fade}s;transform-origin:{sx}px 0" x="{sx}" y="{H - 28}" width="28" height="3" rx="1.5" fill="{PINK}"/>')
    now, _, _ = words('NOW SHOWING  •  LIVE WALLPAPERS FROM THE APP', 10, cap_x, H - 70, anchor='end', wght=600, wdth=100, track=.3)

    kicker, _, _ = words('THE UNOFFICIAL COMPANION FOR LEONIDA', 15, 70, 96, wght=600, wdth=100, track=.28)
    mark, mw, mcap = words('GTA 6 HQ', 132, 64, 122, wght=700, wdth=75, track=.02)
    script, _, _ = words('Welcome to Vice City', 66, 0, 0, script=True)
    tag, _, _ = words('ENCYCLOPEDIA   •   MAP OF LEONIDA   •   FIELD MANUAL   •   COLLECTIBLES', 13, 70, 384, wght=600, wdth=100, track=.24)
    sy = 122 + mcap + 22
    wanted = ''.join(f'<g transform="translate({W - 50 - i * 30} 44)"><path d="{STAR5}" fill="#000" fill-opacity=".35" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>'
                     f'<path class="want" style="animation-delay:{(4 - i) * .55:.2f}s" d="{STAR5}" fill="{GOLD}"/></g>' for i in range(5))

    css = (f'''
  .slide {{ opacity: 0; animation: slide {cycle}s linear infinite both; }}
  @keyframes slide {{ 0% {{ opacity: 0; }} {pin:.2f}% {{ opacity: 1; }} {pout - pin:.2f}% {{ opacity: 1; }} {pout:.2f}% {{ opacity: 0; }} 100% {{ opacity: 0; }} }}
  .kb {{ animation: kb {cycle}s linear infinite both; }}
  @keyframes kb {{ 0% {{ transform: scale(1.02); }} {pout:.2f}% {{ transform: scale(1.13); }} 100% {{ transform: scale(1.13); }} }}
  .seg {{ transform: scaleX(0); animation: seg {cycle}s linear infinite both; }}
  @keyframes seg {{ 0% {{ transform: scaleX(0); }} {seg_end:.2f}% {{ transform: scaleX(1); }} {seg_end + .01:.2f}%, 100% {{ transform: scaleX(0); }} }}
''' + '''
  .sway { animation: sway 5.5s ease-in-out infinite alternate; } @keyframes sway { from { transform: rotate(-1.6deg); } to { transform: rotate(1.4deg); } }
  .leaf { animation: leaf 3.1s ease-in-out infinite alternate; } @keyframes leaf { from { transform: rotate(-3deg); } to { transform: rotate(3.5deg); } }
  .sweep { animation: sweep 5.5s cubic-bezier(.5,0,.3,1) infinite; } @keyframes sweep { 0% { transform: translateX(-260px) skewX(-20deg); } 45%, 100% { transform: translateX(760px) skewX(-20deg); } }
  .flick { animation: flick 7s linear infinite; } @keyframes flick { 0%, 7%, 9%, 11%, 60%, 61.5%, 100% { opacity: 1; } 8%, 10%, 61% { opacity: .35; } }
  .rise { opacity: 0; animation: rise 1.1s cubic-bezier(.2,.8,.2,1) forwards; } @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .want { opacity: 0; animation: want 6s ease-in-out infinite; } @keyframes want { 0%, 8% { opacity: 0; } 12%, 80% { opacity: 1; } 84%, 100% { opacity: 0; } }
  .leak { animation: leak 11s ease-in-out infinite alternate; } @keyframes leak { from { transform: translateX(-120px); opacity: .25; } to { transform: translateX(160px); opacity: .55; } }
  .edge { animation: edge 3.5s ease-in-out infinite alternate; } @keyframes edge { from { stroke-opacity: .25; } to { stroke-opacity: .7; } }
  ''' + REDUCED)

    body = f'''<defs>{FILTERS}
  <clipPath id="frame"><rect width="{W}" height="{H}" rx="20"/></clipPath>
  <linearGradient id="grade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0c52" stop-opacity=".55"/><stop offset=".55" stop-color="#7a1f7a" stop-opacity=".12"/><stop offset="1" stop-color="#ee3f7c" stop-opacity=".28"/></linearGradient>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b0320" stop-opacity=".92"/><stop offset=".36" stop-color="#0b0320" stop-opacity=".6"/><stop offset=".62" stop-color="#0b0320" stop-opacity="0"/></linearGradient>
  <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#07021a" stop-opacity="0"/><stop offset="1" stop-color="#07021a" stop-opacity=".85"/></linearGradient>
  <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="{mcap:.0f}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ffe2b0"/><stop offset=".49" stop-color="{GOLD}"/><stop offset=".5" stop-color="#ff5f8f"/><stop offset=".75" stop-color="{HOT}"/><stop offset="1" stop-color="{PURPLE}"/></linearGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="leakg"><stop offset="0" stop-color="#ff7aa8" stop-opacity=".7"/><stop offset="1" stop-color="#ff7aa8" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
  <clipPath id="markclip">{mark}</clipPath>
</defs>
<style>{css}</style>
<g clip-path="url(#frame)">
  <rect width="{W}" height="{H}" fill="#12062a"/>
  {''.join(slides)}
  <rect width="{W}" height="{H}" fill="url(#grade)"/>
  <ellipse class="leak" cx="{W * .62:.0f}" cy="40" rx="320" ry="140" fill="url(#leakg)"/>
  <rect width="{W}" height="{H}" fill="url(#shade)"/>
  <rect width="{W}" height="{H}" fill="url(#foot)"/>
  {palm(18, H + 10, 330, 58, 1.3, '#07010f', 'sway', -2.4, flip=True)}
  <g class="rise" style="animation-delay:.1s"><g fill="{TEAL}">{kicker}</g></g>
  <g class="rise" style="animation-delay:.25s">
    <g transform="translate(5 7)" fill="#12031f" opacity=".85">{mark}</g>
    <g fill="none" stroke="#2b0b4f" stroke-width="7" stroke-linejoin="round">{mark}</g>
    <g fill="url(#chrome)">{mark}</g>
    <g clip-path="url(#markclip)"><rect class="sweep" x="0" y="104" width="120" height="{mcap + 40:.0f}" fill="url(#band)"/></g>
  </g>
  <g class="rise" style="animation-delay:.55s"><g transform="translate(78 {sy:.0f}) rotate(-5)"><g class="flick" filter="url(#neon)" fill="{PINK}">{script}</g><g fill="#ffe0f0" opacity=".92">{script}</g></g></g>
  <g class="rise" style="animation-delay:.8s"><rect x="70" y="364" width="64" height="3" rx="1.5" fill="{HOT}"/><g fill="#f6eefa" opacity=".9">{tag}</g></g>
  <g fill="{TEAL}" opacity=".9">{now}</g>
  {''.join(caps)}
  {''.join(segs)}
  {wanted}
  <rect width="{W}" height="{H}" fill="url(#scan)" opacity=".7"/>
  <rect width="{W}" height="{H}" fill="url(#vig)"/>
</g>
<rect class="edge" x="1" y="1" width="{W - 2}" height="{H - 2}" rx="19" fill="none" stroke="#ff6fb5" stroke-width="2"/>'''
    write('hero.svg', svg(W, H, body, 'GTA 6 HQ: the unofficial companion for Leonida. Live wallpapers from the app behind the title; encyclopedia, map of Leonida, Field Manual and collectibles.'))


# ---------------------------------------------------------------- ticker

def ticker(items):
    W, H = 1200, 56
    parts, x = [], 0
    for i, item in enumerate(items):
        p, w, cap = words(item.upper(), 17, x, (H - 12) / 2, wght=600, wdth=100, track=.2)
        parts.append(f'<g fill="{"#f6eefa" if i % 2 == 0 else TEAL}">{p}</g>')
        x += w + 26
        parts.append(f'<path transform="translate({x:.1f} {H / 2:.1f}) scale(.6)" d="{STAR5}" fill="{PINK}"/>')
        x += 32
    seq = x
    strip = ''.join(parts)
    dur = seq / 55
    body = f'''<defs>
  <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".07" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="m"><rect width="{W}" height="{H}" fill="url(#fade)"/></mask>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{GOLD}"/><stop offset=".55" stop-color="{HOT}"/><stop offset="1" stop-color="{PURPLE}"/></linearGradient>
</defs>
<style>.roll {{ animation: roll {dur:.1f}s linear infinite; }} @keyframes roll {{ to {{ transform: translateX(-{seq:.1f}px); }} }} {REDUCED}</style>
<rect width="{W}" height="{H}" rx="12" fill="{INK}"/>
<rect y="0" width="{W}" height="2" fill="url(#edge)"/><rect y="{H - 2}" width="{W}" height="2" fill="url(#edge)" opacity=".6"/>
<g mask="url(#m)"><g class="roll"><g id="s" transform="translate(24 0)">{strip}</g><use href="#s" x="{seq:.1f}"/><use href="#s" x="{2 * seq:.1f}"/></g></g>'''
    write('ticker.svg', svg(W, H, body, ' \u00b7 '.join(items)))


# ---------------------------------------------------------------- buttons

ICONS = {
    'windows': '<path d="M0 2 L11 .5 V11 H0 Z M13 .2 L26 -1.6 V11 H13 Z M0 13 H11 V23.5 L0 22 Z M13 13 H26 V25.6 L13 23.8 Z"/>',
    'globe': '<g fill="none" stroke-width="2.4"><circle cx="12" cy="12" r="11"/><ellipse cx="12" cy="12" rx="5" ry="11"/><path d="M1 12 H23 M3 6 H21 M3 18 H21"/></g>',
    'chat': '<path d="M2 3 H24 Q26 3 26 5 V17 Q26 19 24 19 H11 L5 24 V19 H2 Q0 19 0 17 V5 Q0 3 2 3 Z"/><circle cx="7" cy="11" r="2" fill="#160a2e"/><circle cx="13" cy="11" r="2" fill="#160a2e"/><circle cx="19" cy="11" r="2" fill="#160a2e"/>',
    'laptop': '<path d="M4 2 H22 Q24 2 24 4 V16 H2 V4 Q2 2 4 2 Z M5 5 V13 H21 V5 Z" fill-rule="evenodd"/><path d="M-1 18 H27 L25 22 H1 Z"/>',
}


def button(name, label, sub, icon, c1, c2, solid):
    W, H, P = 420, 112, 10
    bw, bh = W - 2 * P, H - 2 * P
    l, lw, lcap = words(label, 30, P + 84, P + 26, wght=700, wdth=75, track=.06)
    s, _, _ = words(sub, 15, P + 85, P + 26 + lcap + 12, wght=600, wdth=100, track=.22)
    text_fill = INK if solid else '#ffffff'
    sub_fill = '#2a0b40' if solid else c1
    plate = (f'<rect x="{P}" y="{P}" width="{bw}" height="{bh}" rx="18" fill="url(#g)"/>' if solid else
             f'<rect x="{P}" y="{P}" width="{bw}" height="{bh}" rx="18" fill="{INK}"/><rect x="{P + 1.5}" y="{P + 1.5}" width="{bw - 3}" height="{bh - 3}" rx="16.5" fill="none" stroke="url(#g)" stroke-width="3"/>')
    icon_fill = INK if solid else c1
    body = f'''<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="{.55 if solid else .22}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <clipPath id="c"><rect x="{P}" y="{P}" width="{bw}" height="{bh}" rx="18"/></clipPath>
</defs>
<style>
  .pulse {{ animation: pulse 2.8s ease-in-out infinite; }} @keyframes pulse {{ 0%, 100% {{ opacity: .35; }} 50% {{ opacity: .85; }} }}
  .sweep {{ animation: sweep 4.2s cubic-bezier(.5,0,.3,1) infinite; }} @keyframes sweep {{ 0% {{ transform: translateX(-140px) skewX(-20deg); }} 50%, 100% {{ transform: translateX({W + 40}px) skewX(-20deg); }} }}
  {REDUCED}
</style>
<rect class="pulse" x="{P + 6}" y="{P + 8}" width="{bw - 12}" height="{bh - 10}" rx="18" fill="url(#g)" filter="url(#glow)"/>
{plate}
<g transform="translate({P + 30} {P + bh / 2 - 12})" fill="{icon_fill}" stroke="{icon_fill}">{ICONS[icon]}</g>
<g fill="{text_fill}">{l}</g><g fill="{sub_fill}">{s}</g>
<g clip-path="url(#c)"><rect class="sweep" x="0" y="0" width="90" height="{H}" fill="url(#band)"/></g>'''
    write(f'btn-{name}.svg', svg(W, H, body, f'{label} {sub}'.title().replace('&', 'and')))


# ---------------------------------------------------------------- footer

def footer():
    W, H, HZ = 1200, 260, 176
    rng = random.Random(9)
    refl = ""
    line, lw, lcap = words('See you in Leonida', 64, W / 2, 62, anchor='middle', script=True)
    small, _, _ = words('UNOFFICIAL FAN PROJECT  \u2022  NOT AFFILIATED WITH ROCKSTAR GAMES OR TAKE-TWO', 12, W / 2, 196, anchor='middle', wght=600, wdth=100, track=.24)
    css = '''
  .tw { animation: tw ease-in-out infinite alternate; } @keyframes tw { from { opacity: .15; } to { opacity: 1; } }
  .sway { animation: sway 5.5s ease-in-out infinite alternate; } @keyframes sway { from { transform: rotate(-1.6deg); } to { transform: rotate(1.4deg); } }
  .leaf { animation: leaf 3.1s ease-in-out infinite alternate; } @keyframes leaf { from { transform: rotate(-3deg); } to { transform: rotate(3.5deg); } }
  .shim { transform-box: fill-box; transform-origin: center; animation: shim 2.6s ease-in-out infinite alternate; } @keyframes shim { from { transform: scaleX(.8); } to { transform: scaleX(1.1); } }
  .flick { animation: flick 8s linear infinite; } @keyframes flick { 0%, 30%, 31.5%, 33%, 100% { opacity: 1; } 31%, 32.5% { opacity: .3; } }
  .kb { transform-origin: 50% 60%; animation: kb 24s ease-in-out infinite alternate; } @keyframes kb { from { transform: scale(1.02) translateX(-12px); } to { transform: scale(1.12) translateX(12px); } }
  ''' + REDUCED
    body = f'''<defs>{FILTERS}
  <clipPath id="frame"><rect width="{W}" height="{H}" rx="20"/></clipPath>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07021a"/><stop offset=".7" stop-color="#1f0b45"/><stop offset="1" stop-color="#3b1666"/></linearGradient>
  <radialGradient id="dim" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#0b0320" stop-opacity=".78"/><stop offset=".6" stop-color="#1a0838" stop-opacity=".5"/><stop offset="1" stop-color="#07021a" stop-opacity=".85"/></radialGradient>
</defs>
<style>{css}</style>
<g clip-path="url(#frame)">
  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  <g class="kb"><image href="{frame('gta-vi-vice-city-skyline-night', 8, .55, 1600, round(1600 * H / W), 64)}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/></g>
  <rect width="{W}" height="{H}" fill="url(#dim)"/>
  <g fill="#fff">{stars(rng, 40, W, 4, 70)}</g>
  {palm(70, H + 6, 200, 40, .95, '#030008', 'sway', -1.2, flip=True)}
  {palm(150, H + 10, 150, -10, .7, '#0a0318', 'sway', -2.6)}
  {palm(1140, H + 6, 210, -46, 1.0, '#030008', 'sway', -3.1)}
  <g class="flick" filter="url(#neon)" fill="{PINK}">{line}</g><g fill="#ffe0f0" opacity=".92">{line}</g>
  <rect x="{W / 2 - 40}" y="{62 + lcap + 26:.0f}" width="80" height="3" rx="1.5" fill="{TEAL}"/>
  <g fill="#cdbfe0" opacity=".85">{small}</g>
  <rect width="{W}" height="{H}" fill="url(#scan)"/>
</g>
<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="19" fill="none" stroke="#8f7cff" stroke-opacity=".35" stroke-width="2"/>'''
    write('footer.svg', svg(W, H, body, 'See you in Leonida. Unofficial fan project, not affiliated with Rockstar Games or Take-Two Interactive.'))


if __name__ == '__main__':
    hero()
    ticker(['Map of Leonida', '3,200+ sourced entries', '229-page Field Manual', '480 collectible cards', '594 vehicles with stat bars',
            '100% checklist', 'Robbery planner', 'Cheats for PS5 and Xbox', 'Trophy guides', 'Live wallpapers', 'Discord assistant'])
    button('windows', 'DOWNLOAD', 'FOR WINDOWS 10 & 11', 'windows', '#ffc46b', '#ee3f7c', True)
    button('web', 'OPEN IN BROWSER', 'WEB MAP & WIKI', 'globe', '#5ef2ff', '#8b3fd9', False)
    button('discord', 'JOIN THE SERVER', 'ASK THE HQ BOT', 'chat', '#c69bff', '#ee3f7c', False)
    button('unix', 'MAC & LINUX', 'PREVIEW BUILDS', 'laptop', '#ffc46b', '#f58a2e', False)
    footer()

"""Drawing helpers in the GTA 6 HQ look: sunset gradients, cut-edge cards, wrapped text."""
import functools
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .config import SUNSET, THEME


# ---------- easing ----------
def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 4 * x * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ramp(t, start, length):
    """0 before `start`, 1 after `start + length`, linear between."""
    return clamp((t - start) / length) if length > 0 else (1.0 if t >= start else 0.0)


# ---------- fonts and text ----------
@functools.lru_cache(maxsize=256)
def font(size, weight=700, width=100, family='display'):
    size = max(6, int(round(size)))
    if family == 'display':
        f = ImageFont.truetype(THEME['font_display'], size)
        f.set_variation_by_axes([weight, width])
        return f
    return ImageFont.truetype(THEME['font_body_bold' if weight >= 600 else 'font_body'], size)


def wrap(text, fnt, max_w, tracking=0):
    lines = []
    for para in str(text).split('\n'):
        words, line = para.split(), ''
        for word in words:
            trial = (line + ' ' + word).strip()
            if text_width(trial, fnt, tracking) <= max_w or not line:
                line = trial
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def text_width(text, fnt, tracking=0):
    return fnt.getlength(text) + tracking * max(0, len(text) - 1)


@functools.lru_cache(maxsize=512)
def text_img(text, size, color=THEME['text'], weight=700, width=100, family='display', max_w=10000,
             align='left', line_gap=1.12, tracking=0, upper=False):
    """Render wrapped text to a tight RGBA image. Cached, so animating its position or opacity is cheap."""
    if upper:
        text = text.upper()
    fnt = font(size, weight, width, family)
    lines = wrap(text, fnt, max_w, tracking)
    ascent, descent = fnt.getmetrics()
    line_h = int(round((ascent + descent) * line_gap))
    w = int(math.ceil(max(text_width(l, fnt, tracking) for l in lines))) + 4
    h = line_h * len(lines) + 4
    img = Image.new('RGBA', (max(w, 1), max(h, 1)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        lw = text_width(line, fnt, tracking)
        x = {'left': 0, 'center': (w - lw) / 2, 'right': w - lw}[align]
        y = i * line_h
        if tracking:
            for ch in line:
                d.text((x, y), ch, font=fnt, fill=color)
                x += fnt.getlength(ch) + tracking
        else:
            d.text((x, y), line, font=fnt, fill=color)
    return img


# ---------- gradients and shapes ----------
def _lerp_stops(stops, x):
    x = np.clip(x, 0, 1)
    out = np.zeros(x.shape + (3,), dtype=np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (x >= p0) & (x <= p1)
        f = ((x - p0) / max(p1 - p0, 1e-6))[..., None]
        seg = np.array(c0, dtype=np.float32) * (1 - f) + np.array(c1, dtype=np.float32) * f
        out[m] = seg[m]
    return out


@functools.lru_cache(maxsize=64)
def gradient(w, h, angle=0.0, stops=tuple(SUNSET)):
    """Linear gradient image; angle in degrees, 0 = left to right."""
    w, h = max(1, int(w)), max(1, int(h))
    a = math.radians(angle)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    proj = xs * math.cos(a) + ys * math.sin(a)
    span = abs(w * math.cos(a)) + abs(h * math.sin(a))
    lo = min(0, w * math.cos(a)) + min(0, h * math.sin(a))
    rgb = _lerp_stops(list(stops), (proj - lo) / max(span, 1))
    arr = np.dstack([rgb, np.full((h, w), 255, dtype=np.float32)]).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


@functools.lru_cache(maxsize=32)
def glow(size, color, strength=0.55):
    """Soft round glow used to build the moving background."""
    size = max(8, int(size))
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
    r = np.hypot(xs - size / 2, ys - size / 2) / (size / 2)
    a = np.clip(1 - r, 0, 1) ** 2 * 255 * strength
    arr = np.zeros((size, size, 4), dtype=np.uint8)
    arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3] = color[0], color[1], color[2], a.astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def cut_polygon(w, h, cut):
    """The app's cut-edge card: top-right and bottom-left corners sliced off."""
    return [(0, 0), (w - cut, 0), (w, cut), (w, h), (cut, h), (0, h - cut)]


@functools.lru_cache(maxsize=64)
def cut_card(w, h, cut, fill=THEME['bg_panel'] + (235,), bar=4, tint=True):
    """Cut-edge panel with the sunset rule along the top, as on the app's promo cards."""
    w, h, cut = int(w), int(h), int(cut)
    ss = 2
    mask = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(mask).polygon([(x * ss, y * ss) for x, y in cut_polygon(w, h, cut)], fill=255)
    mask = mask.resize((w, h), Image.LANCZOS)
    card = Image.new('RGBA', (w, h), fill)
    if tint:
        wash = gradient(w, h, 10).copy()
        wash.putalpha(46)
        card.alpha_composite(wash)
    if bar:
        card.alpha_composite(gradient(w, bar, 0), (0, 0))
    card.putalpha(Image.composite(card.getchannel('A'), Image.new('L', (w, h), 0), mask))
    return card


@functools.lru_cache(maxsize=32)
def slant_plate(w, h, slant=0.09, fill=THEME['bg_panel'] + (255,)):
    """Slanted plate like the app's cast rail cards."""
    w, h = int(w), int(h)
    ss = 2
    mask = Image.new('L', (w * ss, h * ss), 0)
    s = h * slant * ss
    ImageDraw.Draw(mask).polygon([(0, s), (w * ss, 0), (w * ss, h * ss - s), (0, h * ss)], fill=255)
    plate = Image.new('RGBA', (w, h), fill)
    plate.putalpha(mask.resize((w, h), Image.LANCZOS))
    return plate


def with_opacity(img, opacity):
    if opacity >= 0.999:
        return img
    out = img.copy()
    out.putalpha(out.getchannel('A').point(lambda v: int(v * clamp(opacity))))
    return out


def paste(canvas, img, xy, opacity=1.0):
    """Alpha-composite `img` at xy, clipping to the canvas. Returns the visible box or None."""
    if opacity <= 0.003:
        return None
    x, y = int(round(xy[0])), int(round(xy[1]))
    cw, ch = canvas.size
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + img.width, cw), min(y + img.height, ch)
    if x1 <= x0 or y1 <= y0:
        return None
    if (x0, y0, x1, y1) != (x, y, x + img.width, y + img.height):
        img = img.crop((x0 - x, y0 - y, x1 - x, y1 - y))
    canvas.alpha_composite(with_opacity(img, opacity), (x0, y0))
    return (x0, y0, x1, y1)


def shadow(w, h, radius, opacity=150):
    pad = radius * 3
    img = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(img).rectangle((pad, pad, pad + w, pad + h), fill=(0, 0, 0, opacity))
    return img.filter(ImageFilter.GaussianBlur(radius)), pad


shadow = functools.lru_cache(maxsize=16)(shadow)


def background(w, h, t, seed=0.0):
    """The studio's moving backdrop: deep night with drifting sunset glows and a faint diagonal sheen."""
    base = Image.new('RGBA', (w, h), THEME['bg_main'] + (255,))
    m = max(w, h)
    spots = [(THEME['violet'], 1.25, 0.18, 0.30, 0.050, 0.0), (THEME['pink'], 1.0, 0.82, 0.72, 0.041, 2.1),
             (THEME['sun'], 0.8, 0.70, 0.12, 0.033, 4.0)]
    for color, size, cx, cy, speed, phase in spots:
        g = glow(int(m * size), color, 0.42)
        dx = math.sin(t * speed * 2 * math.pi + phase + seed) * 0.07 * w
        dy = math.cos(t * speed * 2 * math.pi * 0.8 + phase + seed) * 0.06 * h
        paste(base, g, (cx * w + dx - g.width / 2, cy * h + dy - g.height / 2))
    return base

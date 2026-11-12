"""Draw the installer's artwork from the app's own pictures.

    python scripts/make_installer_art.py [--width PX --height PX]

Writes into installer/:
  wizard-back.png    the whole-window background: a dark sunset field with a row of
                     slanted, cut-edge picture cards across the top, like the app's page headers
  wizard-side.png    the tall picture beside the last page
  wizard-small.png   the logo in the corner of each page
  gta6-hq.ico        the icon, in every size Windows asks for

--width and --height are the setup window's inside size in pixels at 100% scaling; the
background is drawn at twice that so it stays sharp on high-DPI screens. Needs Pillow.
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'installer')
INK, DEEP = (21, 10, 46), (11, 10, 22)
SUNSET = [(255, 196, 107), (238, 63, 124), (139, 63, 217)]
BAND_CARDS = ['images/vice-city-sunset.jpg', 'images/muscle-car-pastel-palms.jpg', 'images/pier-showdown.jpg',
              'images/dawn-of-the-heist.jpg', 'images/locations/vice-city.jpg', 'images/locations/leonida-keys.jpg']
SIDE_CARDS = ['images/vice-city-sunset.jpg', 'images/pier-showdown.jpg', 'images/muscle-car-pastel-palms.jpg']

ap = argparse.ArgumentParser()
ap.add_argument('--width', type=int, default=646)
ap.add_argument('--height', type=int, default=468)
ap.add_argument('--band', type=int, default=60, help='height of the picture band at the top, at 100% scaling')
a = ap.parse_args()
S = 2  # drawn at twice the size


def mix(a_, b_, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a_, b_))


def sunset(t):
    return mix(SUNSET[0], SUNSET[1], t / 0.55) if t < 0.55 else mix(SUNSET[1], SUNSET[2], (t - 0.55) / 0.45)


def field(w, h):
    """The dark background: violet at the top, near-black below, with a soft pink glow low on the right."""
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(INK, DEEP, min(1, y / (h * 0.7))))
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse([w * 0.55, h * 0.62, w * 1.25, h * 1.45], fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(w // 9))
    img.paste(Image.new('RGB', (w, h), (238, 63, 124)), (0, 0), glow)
    return img


def cover(path, w, h, focus=0.35):
    """The picture scaled and cropped to fill w x h; `focus` is how far down the kept part sits."""
    src = Image.open(os.path.join(ROOT, path)).convert('RGB')
    scale = max(w / src.width, h / src.height)
    src = src.resize((max(w, round(src.width * scale)), max(h, round(src.height * scale))), Image.LANCZOS)
    left, top = (src.width - w) // 2, round((src.height - h) * focus)
    return src.crop((left, top, left + w, top + h))


def slanted(base, path, x, y, w, h, lean, focus=0.35):
    """Paste a picture as a parallelogram leaning right by `lean` pixels, with a thin sunset edge."""
    shape = [(x + lean, y), (x + w + lean, y), (x + w, y + h), (x, y + h)]
    box = (x, y, x + w + lean, y + h)
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).polygon(shape, fill=255)
    layer = Image.new('RGB', base.size)
    layer.paste(cover(path, box[2] - box[0], h, focus), (x, y))
    base.paste(layer, (0, 0), mask)
    ImageDraw.Draw(base).line(shape + [shape[0]], fill=sunset((x / base.width) % 1), width=S)


def sunset_rule(img, y, thick):
    d = ImageDraw.Draw(img)
    for x in range(img.width):
        d.line([(x, y), (x, y + thick - 1)], fill=sunset(x / img.width))


def back():
    w, h, band = a.width * S, a.height * S, a.band * S
    img = field(w, h)
    # The row of cards fills the right part of the band; the left is kept dark for the page title.
    # They stop short of the right edge, where the logo sits.
    start, gap, lean = round(w * 0.47), 4 * S, round(band * 0.36)
    each = (w - 62 * S - start) // len(BAND_CARDS)
    for i, path in enumerate(BAND_CARDS):
        slanted(img, path, start + i * each, 0, each - gap, band - 4 * S, lean, 0.3)
    # Fade the cards into the dark on the left, and dim them a little overall so text stays readable.
    shade = Image.new('L', (w, band), 0)
    d = ImageDraw.Draw(shade)
    for x in range(w):
        t = (x - start) / (w * 0.16)
        d.line([(x, 0), (x, band)], fill=round(255 * (1 - max(0, min(1, t))) * 0.95 + 12))
    img.paste(Image.new('RGB', (w, band), INK), (0, 0), shade)
    sunset_rule(img, band - 3 * S, 3 * S)
    img.save(os.path.join(OUT, 'wizard-back.png'))


def side():
    w, h = 164 * S * 2, 314 * S * 2  # Inno's side picture is 164 x 314 at 100%; drawn at four times
    img = field(w, h)
    gap, lean, rows = 14, 70, len(SIDE_CARDS)
    top, each = 150, (h - 150 - 60) // rows
    for i, path in enumerate(SIDE_CARDS):
        slanted(img, path, 34, top + i * each, w - 68 - lean, each - gap, lean, 0.25)
    logo = Image.open(os.path.join(ROOT, 'images', 'gta6.png')).convert('RGBA')
    logo.thumbnail((150, 120), Image.LANCZOS)
    img.paste(logo, ((w - logo.width) // 2, 18), logo)
    d = ImageDraw.Draw(img)
    for y in range(h):  # a sunset line down the right edge, where the picture meets the page
        d.line([(w - 6, y), (w - 1, y)], fill=sunset(y / h))
    img.save(os.path.join(OUT, 'wizard-side.png'))


def logo_and_icon():
    logo = Image.open(os.path.join(ROOT, 'images', 'gta6.png')).convert('RGBA')
    size = max(logo.size)
    square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    square.paste(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    square.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, 'gta6-hq.ico'),
                                                  sizes=[(s, s) for s in (16, 20, 24, 32, 40, 48, 64, 128, 256)])
    square.resize((220, 220), Image.LANCZOS).save(os.path.join(OUT, 'wizard-small.png'))


back(); side(); logo_and_icon()
print(f'installer art written for a {a.width} x {a.height} window')


def shell_assets():
    """Pictures carried by the setup window (installer/shell): the sliding cards and its window icon."""
    out = os.path.join(OUT, 'shell', 'assets')
    os.makedirs(os.path.join(out, 'cards'), exist_ok=True)
    extra = ['images/locations/grassrivers.jpg', 'images/locations/port-gellhorn.jpg',
             'images/locations/ambrosia.jpg', 'images/locations/mount-kalaga-national-park.jpg']
    for i, path in enumerate(BAND_CARDS + extra):
        cover(path, 300, 392, 0.3).save(os.path.join(out, 'cards', f'{i:02d}-{os.path.basename(path)}'), quality=82)
    logo = Image.open(os.path.join(ROOT, 'images', 'gta6.png')).convert('RGBA')
    size = max(logo.size)
    square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    square.paste(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    open(os.path.join(out, 'icon.rgba'), 'wb').write(square.resize((128, 128), Image.LANCZOS).tobytes())


shell_assets()

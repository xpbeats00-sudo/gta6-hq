"""Draw the README's artwork in the app's look (docs/media/readme/).

    python scripts/make_readme_art.py

GitHub does not let a repository restyle its page, so the look comes from pictures:
  banner.png        the title plate at the top, with a row of slanted picture cards
  h-<name>.png      one plate per section heading: dark violet, a cut right edge, a sunset rule
  rule.png          a thin sunset line used as a divider
Every plate carries its own dark background, so it reads on GitHub's light and dark themes.
Needs Pillow and the Windows fonts Bahnschrift and Segoe UI.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'media', 'readme')
S = 2  # drawn at twice the shown size
INK, DEEP = (40, 16, 82), (11, 10, 22)
SUNSET = [(255, 196, 107), (238, 63, 124), (139, 63, 217)]
PAPER, GOLD = (246, 240, 250), (255, 196, 107)

HEADINGS = {
    'systems': 'Windows, Mac and Linux', 'install': 'Install', 'inside': "What's inside", 'manual': 'The Field Manual', 'new': "What's new",
    'creators': 'Creators welcome', 'questions': 'Questions', 'trust': 'How far to trust it',
    'privacy': 'Privacy', 'credits': 'Credits and rights', 'developers': 'For developers',
}
# (picture, x and y in the picture of the point to keep in the middle of the card)
CARDS = [
    ('images/vice-city-sunset.jpg', 770, 330), ('images/muscle-car-pastel-palms.jpg', 985, 520),
    ('images/dawn-of-the-heist.jpg', 765, 300), ('images/locations/vice-city.jpg', 960, 540),
    ('images/locations/leonida-keys.jpg', 960, 540),
]


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def sunset(t):
    return mix(SUNSET[0], SUNSET[1], t / 0.55) if t < 0.55 else mix(SUNSET[1], SUNSET[2], (t - 0.55) / 0.45)


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', name), round(size * S))
    if weight:
        f.set_variation_by_axes([weight, 100])  # Bahnschrift: weight, width
    return f


def spaced(d, xy, text, f, fill, track):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track * S
    return x - track * S


def field(w, h):
    """The app's dark background: violet falling to near-black, with a pink glow low on the right."""
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(INK, DEEP, y / (h * 0.7)))
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse([w * 0.45, h * 0.5, w * 1.2, h * 1.7], fill=50)
    img.paste(Image.new('RGB', (w, h), SUNSET[1]), (0, 0), glow.filter(ImageFilter.GaussianBlur(w // 9)))
    return img


def card(base, path, fx, fy, x, y, w, h, lean, edge):
    """One picture as a parallelogram leaning right, cropped so (fx, fy) sits in its middle."""
    src = Image.open(os.path.join(ROOT, path)).convert('RGB')
    box_w = w + lean
    scale = max(box_w / src.width, h / src.height)
    src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    top = min(max(0, round(fy * scale - h / 2)), src.height - h)
    middle = lean * (1 - (fy * scale - top) / h) + w / 2
    left = min(max(0, round(fx * scale - middle)), src.width - box_w)
    shape = [(x + lean, y), (x + w + lean, y), (x + w, y + h), (x, y + h)]
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).polygon(shape, fill=255)
    layer = Image.new('RGB', base.size)
    layer.paste(src.crop((left, top, left + box_w, top + h)), (x, y))
    base.paste(layer, (0, 0), mask)
    ImageDraw.Draw(base).line(shape + [shape[0]], fill=edge, width=2 * S, joint='curve')


def save(img, shape_mask, name, size):
    img = img.convert('RGBA')
    img.putalpha(shape_mask)
    img.resize(size, Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)


def banner():
    W, H = 860, 300
    w, h = W * S, H * S
    img = field(w, h)
    d = ImageDraw.Draw(img)
    for x in range(w):
        d.line([(x, 0), (x, 6 * S - 1)], fill=sunset(x / w))
    row_l, row_r, top, bottom, lean, gap = 432, 836, 34, 270, 42, 10
    each = (row_r - row_l - lean - gap * (len(CARDS) - 1)) // len(CARDS)
    for i, (path, fx, fy) in enumerate(CARDS):
        card(img, path, fx, fy, (row_l + i * (each + gap)) * S, top * S, each * S, (bottom - top) * S, lean * S,
             sunset(i / (len(CARDS) - 1)))
    d = ImageDraw.Draw(img)
    left = 40 * S
    spaced(d, (left, 62 * S), 'UNOFFICIAL FAN PROJECT', font('bahnschrift.ttf', 14, 600), GOLD, 3.5)
    spaced(d, (left - 3 * S, 84 * S), 'GTA 6 HQ', font('bahnschrift.ttf', 78, 700), PAPER, 8)
    body = font('segoeui.ttf', 19)
    d.text((left, 182 * S), 'The Grand Theft Auto VI encyclopedia, map', font=body, fill=(206, 198, 224))
    d.text((left, 210 * S), 'and field manual for Windows, Mac and Linux.', font=body, fill=(206, 198, 224))
    d.text((left, 256 * S), 'Not affiliated with Rockstar Games or Take-Two Interactive.',
           font=font('segoeui.ttf', 11.5), fill=(140, 132, 162))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=12 * S, fill=255)
    save(img, mask, 'banner.png', (W * 2, H * 2))  # kept at twice the shown size, for sharp screens


def heading(name, text):
    W, H, cut = 860, 64, 24
    w, h = W * S * 2, H * S * 2  # four times, scaled to two
    k = S * 2
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix((34, 14, 70), (16, 10, 32), y / h))
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse([w * 0.5, -h, w * 1.1, h * 1.6], fill=60)
    img.paste(Image.new('RGB', (w, h), SUNSET[1]), (0, 0), glow.filter(ImageFilter.GaussianBlur(w // 12)))
    d = ImageDraw.Draw(img)
    # A slanted sunset chip before the title, and three slanted strokes at the far end.
    d.polygon([(24 * k, 16 * k), (33 * k, 16 * k), (26 * k, 48 * k), (17 * k, 48 * k)], fill=SUNSET[1])
    d.polygon([(24 * k, 16 * k), (33 * k, 16 * k), (30 * k, 30 * k), (21 * k, 30 * k)], fill=SUNSET[0])
    for i in range(3):
        x = (W - 96 + i * 17) * k
        d.polygon([(x + 9 * k, 18 * k), (x + 19 * k, 18 * k), (x + 10 * k, 46 * k), (x, 46 * k)], fill=sunset(i / 2))
    f = ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', 'bahnschrift.ttf'), 27 * k)
    f.set_variation_by_axes([700, 100])
    x = 50 * k
    for ch in text.upper():
        d.text((x, 17 * k), ch, font=f, fill=PAPER)
        x += d.textlength(ch, font=f) + 4 * k
    for x in range(w):
        d.line([(x, h - 3 * k), (x, h - 1)], fill=sunset(x / w))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).polygon([(0, 0), (w, 0), (w - cut * k, h), (0, h)], fill=255)
    save(img, mask, f'h-{name}.png', (W * 2, H * 2))


def rule():
    W, H = 860, 3
    img = Image.new('RGB', (W * 2, H * 2))
    d = ImageDraw.Draw(img)
    for x in range(W * 2):
        d.line([(x, 0), (x, H * 2)], fill=sunset(x / (W * 2)))
    img.save(os.path.join(OUT, 'rule.png'), optimize=True)


os.makedirs(OUT, exist_ok=True)
banner()
for key, title in HEADINGS.items():
    heading(key, title)
rule()
print('wrote', len(HEADINGS) + 2, 'pictures to docs/media/readme')

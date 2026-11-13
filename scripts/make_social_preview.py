"""Draw the link card shown when the repository is shared (docs/press/social-preview.png).

    python scripts/make_social_preview.py

1280 x 640, the size GitHub asks for. The words sit on the left; on the right is a row of
slanted, cut-edge picture cards like the app's page headers. Each card names the point in
its picture that must stay in view (a face, not a shoulder), and the whole row stays inside
the frame. Needs Pillow and the Windows fonts Bahnschrift and Segoe UI.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'press', 'social-preview.png')
W, H, S = 1280, 640, 2  # drawn at twice the size, then scaled down for smooth edges
INK, DEEP = (40, 16, 82), (11, 10, 22)
SUNSET = [(255, 196, 107), (238, 63, 124), (139, 63, 217)]
PAPER, MUTED, GOLD, PINK = (246, 240, 250), (176, 168, 196), (255, 196, 107), (244, 160, 196)

# (picture, x and y in the picture of the point to keep in the middle of the card, zoom)
CARDS = [
    ('images/vice-city-sunset.jpg', 770, 330, 1.0),
    ('images/muscle-car-pastel-palms.jpg', 985, 520, 1.0),
    ('images/dawn-of-the-heist.jpg', 765, 300, 1.0),
    ('images/locations/leonida-keys.jpg', 960, 540, 1.0),
]
ROW_LEFT, ROW_RIGHT, ROW_TOP, ROW_BOTTOM, LEAN, GAP = 632, 1236, 64, 576, 76, 14


def mix(a, b, t):
    t = max(0, min(1, t))
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def sunset(t):
    return mix(SUNSET[0], SUNSET[1], t / 0.55) if t < 0.55 else mix(SUNSET[1], SUNSET[2], (t - 0.55) / 0.45)


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', name), size * S)
    if weight:
        f.set_variation_by_axes([weight, 100])  # Bahnschrift: weight, width
    return f


def spaced(d, xy, text, f, fill, track):
    """Text with extra space between letters; returns the x where it ends."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track * S
    return x - track * S


def card(base, path, fx, fy, zoom, x, y, w, h, lean):
    """One picture as a parallelogram leaning right, cropped so (fx, fy) sits in its middle."""
    src = Image.open(os.path.join(ROOT, path)).convert('RGB')
    box_w = w + lean
    scale = max(box_w / src.width, h / src.height) * zoom
    src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    top = min(max(0, round(fy * scale - h / 2)), src.height - h)
    row = fy * scale - top                      # how far down the card the point lands
    middle = lean * (1 - row / h) + w / 2       # the middle of the slanted card at that height
    left = min(max(0, round(fx * scale - middle)), src.width - box_w)
    shape = [(x + lean, y), (x + w + lean, y), (x + w, y + h), (x, y + h)]
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).polygon(shape, fill=255)
    layer = Image.new('RGB', base.size)
    layer.paste(src.crop((left, top, left + box_w, top + h)), (x, y))
    base.paste(layer, (0, 0), mask)
    ImageDraw.Draw(base).line(shape + [shape[0]], fill=sunset((x - ROW_LEFT * S) / ((ROW_RIGHT - ROW_LEFT) * S)),
                              width=3 * S, joint='curve')


def main():
    w, h = W * S, H * S
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(INK, DEEP, y / (h * 0.62)))
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse([w * 0.45, h * 0.55, w * 1.2, h * 1.5], fill=46)
    img.paste(Image.new('RGB', (w, h), SUNSET[1]), (0, 0), glow.filter(ImageFilter.GaussianBlur(w // 9)))
    d = ImageDraw.Draw(img)
    for x in range(w):
        d.line([(x, 0), (x, 8 * S - 1)], fill=sunset(x / w))

    n = len(CARDS)
    each = (ROW_RIGHT - ROW_LEFT - LEAN - GAP * (n - 1)) // n
    for i, (path, fx, fy, zoom) in enumerate(CARDS):
        card(img, path, fx, fy, zoom, (ROW_LEFT + i * (each + GAP)) * S, ROW_TOP * S,
             each * S, (ROW_BOTTOM - ROW_TOP) * S, LEAN * S)

    d = ImageDraw.Draw(img)
    left = 70 * S
    spaced(d, (left, 148 * S), 'UNOFFICIAL FAN PROJECT', font('bahnschrift.ttf', 22, 600), GOLD, 5)
    spaced(d, (left - 4 * S, 186 * S), 'GTA 6 HQ', font('bahnschrift.ttf', 112, 700), PAPER, 12)
    body = font('segoeui.ttf', 26)
    d.text((left, 342 * S), 'The Grand Theft Auto VI encyclopedia, map', font=body, fill=(206, 198, 224))
    d.text((left, 386 * S), 'and field manual for Windows, Mac and Linux.', font=body, fill=(206, 198, 224))
    d.rounded_rectangle([left, 470 * S, left + 260 * S, 526 * S], radius=28 * S, fill=PINK)
    label = font('bahnschrift.ttf', 21, 700)
    end = spaced(d, (0, -200 * S), 'FREE DOWNLOAD', label, PINK, 3)  # measured off the canvas
    spaced(d, (left + (260 * S - end) // 2, 486 * S), 'FREE DOWNLOAD', label, (24, 10, 40), 3)
    d.text((left, 570 * S), 'Not affiliated with Rockstar Games or Take-Two Interactive.',
           font=font('segoeui.ttf', 17), fill=(140, 132, 162))
    img.resize((W, H), Image.LANCZOS).save(OUT, optimize=True)
    print('wrote', os.path.relpath(OUT, ROOT))


main()

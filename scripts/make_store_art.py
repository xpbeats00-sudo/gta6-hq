"""Draw the Microsoft Store edition's own mark and every logo size the package and listing need.

    python scripts/make_store_art.py

Writes store/ui/brand.png (used inside the app), store/app.ico (the program's icon),
store/assets/*.png (the package's tiles) and store/listing/*.png (the listing's logos).
Everything is drawn here; nothing is taken from the game's artwork. Needs Pillow.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store')
FONT = r'C:\Windows\Fonts\bahnschrift.ttf'
SKY = [(0.0, (21, 12, 51)), (0.45, (63, 26, 107)), (0.8, (179, 50, 127)), (1.0, (255, 125, 94))]
SUN = [(0.0, (255, 240, 176)), (0.55, (255, 159, 90)), (1.0, (238, 63, 124))]


def ramp(stops, t):
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b:
            k = (t - a) / (b - a)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))
    return stops[-1][1]


def gradient(width, height, stops):
    column = Image.new('RGB', (1, height))
    for y in range(height):
        column.putpixel((0, y), ramp(stops, y / max(1, height - 1)))
    return column.resize((width, height))


def scene(width, height, mark_size, text=True):
    """The mark's picture on a canvas of any shape: sky, a slatted sun and the letters HQ."""
    s = 4  # drawn large, then reduced, for smooth edges
    W, H, m = width * s, height * s, mark_size * s
    img = gradient(W, H, SKY).convert('RGBA')
    cx, cy, r = W // 2, H // 2 - round(m * 0.03), round(m * 0.33)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - r * 1.5, cy - r * 1.5, cx + r * 1.5, cy + r * 1.5], fill=(255, 210, 122, 90))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(r * 0.35)))
    sun = gradient(2 * r, 2 * r, SUN).convert('RGBA')
    mask = Image.new('L', (2 * r, 2 * r), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, 2 * r - 1, 2 * r - 1], fill=255)
    y, i = r * 1.05, 0
    while y < 2 * r:  # the slats: gaps that widen towards the bottom
        gap = r * (0.035 + 0.022 * i)
        d.rectangle([0, y, 2 * r, y + gap], fill=0)
        y += gap + r * 0.14
        i += 1
    img.paste(sun, (cx - r, cy - r), mask)
    if text:
        font = ImageFont.truetype(FONT, round(m * 0.42))
        try:
            font.set_variation_by_name('Bold')
        except Exception:
            pass
        draw = ImageDraw.Draw(img)
        box = draw.textbbox((0, 0), 'HQ', font=font)
        tx, ty = cx - (box[2] + box[0]) / 2, cy + r * 0.2 - (box[3] + box[1]) / 2 + m * 0.1
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).text((tx, ty + m * 0.012), 'HQ', font=font, fill=(20, 8, 40, 190))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(m * 0.012)))
        draw.text((tx, ty), 'HQ', font=font, fill=(255, 255, 255, 255))
    return img.resize((width, height), Image.LANCZOS)


def xbox_splash(width=1920, height=1080):
    """The full-screen picture an Xbox shows while the app starts. Everything that matters sits
    in the middle of the screen, well inside the area a television may crop."""
    import random
    rng = random.Random(6)
    s = 2
    W, H = width * s, height * s
    sky = [(0.0, (11, 7, 22)), (0.5, (42, 18, 80)), (0.8, (122, 36, 112)), (1.0, (238, 100, 110))]
    img = gradient(W, H, sky).convert('RGBA')
    draw = ImageDraw.Draw(img)
    for _ in range(160):  # stars, in the upper half only
        x, y, r = rng.random() * W, rng.random() * H * 0.5, rng.choice((1, 1, 2, 3))
        draw.ellipse([x, y, x + r, y + r], fill=(255, 255, 255, rng.randint(70, 200)))
    base = round(H * 0.86)
    for colour, low, high, step in (((90, 36, 118, 255), 0.03, 0.13, 70), ((24, 13, 50, 255), 0.015, 0.085, 52)):
        x = -20
        while x < W:
            w = step * (0.6 + rng.random() * 0.9)
            h = H * (low + rng.random() * (high - low))
            draw.rectangle([x, base - h, x + w, base], fill=colour)
            x += w + 6 + rng.random() * 16
    draw.rectangle([0, base, W, H], fill=(15, 9, 33, 255))
    mark = rounded(scene(640, 640, 640))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W / 2 - 620, H * 0.36 - 620, W / 2 + 620, H * 0.36 + 620], fill=(238, 63, 124, 70))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(220)))
    img.alpha_composite(mark, (W // 2 - 320, round(H * 0.36) - 320))
    name = ImageFont.truetype(FONT, 150)
    sub = ImageFont.truetype(FONT, 46)
    for font in (name, sub):
        try:
            font.set_variation_by_name('Bold')
        except Exception:
            pass

    def spaced(text, font, y, gap, fill):
        widths = [draw.textlength(ch, font=font) for ch in text]
        x = W / 2 - (sum(widths) + gap * (len(text) - 1)) / 2
        for ch, w in zip(text, widths):
            draw.text((x, y), ch, font=font, fill=fill)
            x += w + gap

    spaced('HQ GUIDE', name, H * 0.36 + 380, 46, (255, 255, 255, 255))
    spaced('UNOFFICIAL FAN GUIDE TO GRAND THEFT AUTO VI', sub, H * 0.36 + 590, 12, (214, 196, 232, 255))
    return img.resize((width, height), Image.LANCZOS).convert('RGB')


def rounded(img, radius_share=0.22):
    w, h = img.size
    s = 4
    mask = Image.new('L', (w * s, h * s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * s - 1, h * s - 1], radius=round(min(w, h) * s * radius_share), fill=255)
    out = img.copy()
    out.putalpha(mask.resize((w, h), Image.LANCZOS))
    return out


def save(img, *parts):
    path = os.path.join(OUT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return path


def main():
    master = scene(1024, 1024, 1024)
    save(rounded(master).resize((256, 256), Image.LANCZOS), 'ui', 'brand.png')
    icon = rounded(master)
    icon.save(os.path.join(OUT, 'app.ico'), sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])

    # Package tiles. Names follow the Windows resource rules: <name>.scale-<n>.png and
    # <name>.targetsize-<n>[_altform-unplated].png; makepri indexes them.
    for scale in (100, 200, 400):
        k = scale / 100
        px = lambda n: round(n * k)
        save(master.resize((px(44), px(44)), Image.LANCZOS), 'assets', f'Square44x44Logo.scale-{scale}.png')
        save(master.resize((px(71), px(71)), Image.LANCZOS), 'assets', f'SmallTile.scale-{scale}.png')
        save(master.resize((px(150), px(150)), Image.LANCZOS), 'assets', f'Square150x150Logo.scale-{scale}.png')
        save(master.resize((px(310), px(310)), Image.LANCZOS), 'assets', f'LargeTile.scale-{scale}.png')
        save(scene(px(310), px(150), px(150)), 'assets', f'Wide310x150Logo.scale-{scale}.png')
        save(master.resize((px(50), px(50)), Image.LANCZOS), 'assets', f'StoreLogo.scale-{scale}.png')
        save(scene(px(620), px(300), px(240)), 'assets', f'SplashScreen.scale-{scale}.png')
    for size in (16, 24, 32, 48, 256):
        small = rounded(master).resize((size, size), Image.LANCZOS)
        save(small, 'assets', f'Square44x44Logo.targetsize-{size}.png')
        save(small, 'assets', f'Square44x44Logo.targetsize-{size}_altform-unplated.png')

    # Listing logos (Partner Center > Store listing > Store logos).
    save(master.resize((300, 300), Image.LANCZOS), 'listing', 'logo-1x1-300.png')
    save(master.resize((1080, 1080), Image.LANCZOS), 'listing', 'logo-1x1-1080.png')
    save(scene(720, 1080, 720), 'listing', 'poster-2x3-720x1080.png')
    # Xbox: a full-screen start-up picture (1920 x 1080), for the Xbox build when there is one.
    save(xbox_splash(), 'xbox', 'SplashScreen-1920x1080.png')
    print('Wrote the mark, the icon,', len(os.listdir(os.path.join(OUT, 'assets'))), 'package tiles and 3 listing logos.')


if __name__ == '__main__':
    main()

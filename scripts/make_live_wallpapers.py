"""Turn still pictures into looping "living picture" videos for the Home page.

    python scripts/make_live_wallpapers.py [name ...] [--preview] [--out DIR]

No AI video model is involved and nothing in the picture is redrawn: every frame is the original
picture, moved. Each picture gets a depth map (the people stand nearer than the scenery), a slow
camera move that loops, and effects placed by hand for that picture: swaying palms and hair, water
that ripples, neon that pulses, police lights, muzzle flash, smoke, dust, and small things (a plane,
birds) lifted out and flown across. Every motion repeats exactly after LOOP seconds, so the video
loops without a jump. Needs numpy, OpenCV and ffmpeg.

Coordinates in SCENES are pixels of the 2000 x 1125 source pictures.
"""
import argparse
import math
import os
import subprocess

import cv2
import numpy as np

SRC_DIR = 'images/artwork'
OUT_DIR = 'wallpapers'
W, H = 1920, 1080
FPS, LOOP = 30, 10
TAU = 2 * math.pi
rng = np.random.default_rng(6)


# ---------- building blocks ----------
def soft_box(shape, box, feather):
    """A mask that is 1 inside the box and fades out over `feather` pixels."""
    h, w = shape
    x0, y0, x1, y1 = box
    m = np.zeros((h, w), np.float32)
    m[max(0, y0):min(h, y1), max(0, x0):min(w, x1)] = 1
    k = int(feather) | 1
    return cv2.GaussianBlur(m, (0, 0), feather / 2) if feather > 0 else m


def soft_poly(shape, pts, feather):
    m = np.zeros(shape, np.float32)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    return cv2.GaussianBlur(m, (0, 0), feather / 2) if feather > 0 else m


def subject_mask(img, rects):
    """Cut the people out of the scenery with GrabCut, started from hand-drawn boxes."""
    small = cv2.resize(img, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    total = np.zeros(small.shape[:2], np.float32)
    for x0, y0, x1, y1 in rects:
        r = (max(1, x0 // 4), max(1, y0 // 4), max(2, (x1 - x0) // 4 - 2), max(2, (y1 - y0) // 4 - 2))
        r = (r[0], r[1], min(r[2], small.shape[1] - r[0] - 1), min(r[3], small.shape[0] - r[1] - 1))
        mask = np.zeros(small.shape[:2], np.uint8)
        try:
            cv2.grabCut(small, mask, r, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_RECT)
            cut = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.float32)
        except cv2.error:
            cut = np.zeros(small.shape[:2], np.float32)
        # If the cut found almost nothing or almost everything, fall back to a soft oval in the box.
        share = cut[r[1]:r[1] + r[3], r[0]:r[0] + r[2]].mean()
        if share < 0.12 or share > 0.93:
            cut = np.zeros(small.shape[:2], np.float32)
            cv2.ellipse(cut, (r[0] + r[2] // 2, r[1] + r[3] // 2), (r[2] // 2, r[3] // 2), 0, 0, 360, 1, -1)
        total = np.maximum(total, cut)
    total = cv2.morphologyEx(total, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    return cv2.resize(total, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)


def depth_map(img, scene):
    """0 is far, 1 is near. Ground rises toward the viewer; people and hand-marked near things stand out."""
    h, w = img.shape[:2]
    depth = np.tile(np.linspace(scene.get('far', 0.12), scene.get('ground', 0.42), h, dtype=np.float32)[:, None], (1, w))
    if scene.get('subjects'):
        depth = np.maximum(depth, 0.8 * subject_mask(img, scene['subjects']))
    for box, value in scene.get('near', []):
        depth = np.maximum(depth, value * soft_box((h, w), box, 150))
    return cv2.GaussianBlur(depth, (0, 0), scene.get('depth_blur', 14))


def glow_layer(img, boxes=None, value=0.72, sat=0.32):
    """The bright, saturated parts of the picture (neon, lamps, screens), blurred into a glow."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32) / 255
    mask = ((hsv[..., 2] > value) & (hsv[..., 1] > sat)).astype(np.float32)
    if boxes:
        keep = np.zeros(mask.shape, np.float32)
        for b in boxes:
            keep = np.maximum(keep, soft_box(mask.shape, b, 40))
        mask *= keep
    lit = img.astype(np.float32) * cv2.GaussianBlur(mask, (0, 0), 3)[..., None]
    return cv2.GaussianBlur(lit, (0, 0), 22) * 1.0 + cv2.GaussianBlur(lit, (0, 0), 6) * 0.5


def tile_noise(size, cells, seed):
    """Smooth noise that wraps left-to-right and top-to-bottom, for smoke and haze."""
    r = np.random.default_rng(seed)
    grid = r.random((cells, cells)).astype(np.float32)
    grid = np.tile(grid, (3, 3))
    big = cv2.resize(grid, (size * 3, size * 3), interpolation=cv2.INTER_CUBIC)
    return big[size:2 * size, size:2 * size]


class Particles:
    """Dust, sparks or soft discs of light that drift on closed paths, so they loop."""

    def __init__(self, kind, count, seed):
        r = np.random.default_rng(seed)
        self.kind = kind
        self.x, self.y = r.random(count) * W, r.random(count) * H
        self.ax, self.ay = r.normal(0, 26, count), r.normal(0, 16, count)
        self.phase, self.tw = r.random(count) * TAU, r.random(count) * TAU
        self.rise = r.integers(0, 2, count) if kind in ('embers', 'bills') else np.zeros(count, int)
        big = kind == 'bokeh'
        self.size = r.uniform(7, 26, count) if big else r.uniform(0.8, 2.6, count)
        self.alpha = r.uniform(0.05, 0.2, count) if big else r.uniform(0.25, 0.8, count)
        self.color = np.array({'dust': (200, 225, 255), 'bokeh': (255, 170, 230), 'embers': (90, 170, 255), 'pollen': (170, 235, 255)}.get(kind, (255, 255, 255)), np.float32)

    def draw(self, t):
        layer = np.zeros((H, W, 3), np.float32)
        a = TAU * t
        xs = (self.x + self.ax * np.sin(a + self.phase)) % W
        ys = (self.y + self.ay * np.sin(2 * a + self.phase) - self.rise * H * t) % H
        tw = 0.55 + 0.45 * np.sin(2 * a + self.tw)
        for x, y, s, al, k in zip(xs, ys, self.size, self.alpha, tw):
            cv2.circle(layer, (int(x), int(y)), max(1, int(s)), tuple(float(c) for c in self.color * al * k), -1, cv2.LINE_AA)
        return cv2.GaussianBlur(layer, (0, 0), 6 if self.kind == 'bokeh' else 1.1)


class Sprite:
    """Something small lifted out of the picture (a plane, a bird) and flown along a line. Where it
    sat is painted over from its surroundings, so there is only ever one of it."""

    def __init__(self, img, box, path, cycles=1, thresh=None, bob=0):
        x0, y0, x1, y1 = box
        patch = img[y0:y1, x0:x1].copy()
        # The thing is whatever in the box differs from the box's own border colour.
        border = np.concatenate([patch[0], patch[-1], patch[:, 0], patch[:, -1]]).astype(np.float32).mean(axis=0)
        diff = np.abs(patch.astype(np.float32) - border).sum(axis=2)
        alpha = np.clip((diff - (thresh or 38)) / 40, 0, 1)
        alpha = cv2.GaussianBlur(cv2.dilate(alpha, np.ones((3, 3))), (0, 0), 0.8)
        self.hole = np.zeros(img.shape[:2], np.uint8)
        self.hole[y0:y1, x0:x1] = (cv2.dilate(alpha, np.ones((9, 9))) > 0.05).astype(np.uint8) * 255
        self.patch, self.alpha, self.box, self.path, self.cycles, self.bob = patch.astype(np.float32), alpha[..., None], box, path, cycles, bob

    def place(self, canvas, t):
        (ax, ay), (bx, by) = self.path
        p = (t * self.cycles) % 1
        x = ax + (bx - ax) * p
        y = ay + (by - ay) * p + self.bob * math.sin(TAU * 3 * t)
        # Fade in and out at the ends of the line so the jump back is never seen.
        fade = min(1, p / 0.08, (1 - p) / 0.08)
        h, w = self.patch.shape[:2]
        x0, y0 = int(round(x)), int(round(y))
        cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(canvas.shape[1], x0 + w), min(canvas.shape[0], y0 + h)
        if cx1 <= cx0 or cy1 <= cy0:
            return
        a = self.alpha[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] * fade
        canvas[cy0:cy1, cx0:cx1] = canvas[cy0:cy1, cx0:cx1] * (1 - a) + self.patch[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] * a


# ---------- one picture ----------
def render(name, scene, out_path, preview=False):
    img = cv2.imread(os.path.join(SRC_DIR, scene['file']), cv2.IMREAD_COLOR)
    assert img is not None, scene['file']
    sh, sw = img.shape[:2]
    depth = depth_map(img, scene)

    sprites = [Sprite(img, **s) for s in scene.get('sprites', [])]
    base = img
    if sprites:  # paint over every place a sprite was lifted from, in one pass
        holes = np.zeros(img.shape[:2], np.uint8)
        for s in sprites:
            holes |= s.hole
        base = cv2.inpaint(img, holes, 5, cv2.INPAINT_TELEA)
    base = base.astype(np.float32)

    glow = glow_layer(img, scene['neon'].get('boxes')) if scene.get('neon') else None
    strobes = [(soft_box((sh, sw), b, 90)[..., None], np.array(c, np.float32)) for b, c in scene.get('strobe', [])]
    flickers = [soft_box((sh, sw), b, f)[..., None] for b, f in scene.get('flicker', [])]
    flick_curve = np.clip(rng.normal(0.5, 0.35, FPS * LOOP), 0, 1)
    sways = [(soft_box((sh, sw), b, 70) if len(b) == 4 else soft_poly((sh, sw), b, 50), amp, lam, speed) for b, amp, lam, speed in scene.get('sway', [])]
    waters = [(soft_poly((sh, sw), pts, 40), amp) for pts, amp in scene.get('water', [])]
    smoke = None
    if scene.get('smoke'):
        sm = scene['smoke']
        smoke = (tile_noise(1024, 6, 3), tile_noise(1024, 11, 4), soft_box((sh, sw), sm['box'], 160), np.array(sm.get('color', (235, 235, 235)), np.float32), sm.get('amount', 0.22))
    suns = scene.get('sun', [])
    parts = [Particles(kind, count, i + 11) for i, (kind, count) in enumerate(scene.get('particles', []))]
    cam = {'zoom': 1.06, 'push': 0.035, 'pan': (10, 5), 'parallax': (16, 7), **scene.get('camera', {})}

    # Output pixels as positions in the source picture, before any motion.
    fit = max(W / sw, H / sh)
    u, v = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
    vignette = 1 - 0.32 * np.clip((((u - W / 2) / (W / 2)) ** 2 + ((v - H / 2) / (H / 2)) ** 2) - 0.55, 0, 1)[..., None]

    frames = range(0, FPS * LOOP, FPS * LOOP // 4) if preview else range(FPS * LOOP)
    proc = None
    if not preview:
        proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                 '-c:v', 'libx264', '-preset', 'slow', '-crf', str(scene.get('crf', 24)), '-pix_fmt', 'yuv420p', '-g', '60', '-movflags', '+faststart', '-an', out_path],
                                stdin=subprocess.PIPE)
    shots = []
    for f in frames:
        t = f / (FPS * LOOP)
        a = TAU * t
        src = base.copy()
        for s in sprites:
            s.place(src, t)
        if glow is not None:
            n = scene['neon']
            pulse = n.get('base', 0.16) + n.get('swing', 0.14) * (0.5 + 0.5 * math.sin(a * n.get('beats', 3))) + n.get('buzz', 0.05) * flick_curve[f]
            src += glow * pulse
        for i, (mask, color) in enumerate(strobes):
            on = 1.0 if math.sin(a * 12 + i * math.pi) > 0.2 else 0.12
            src += mask * color * 0.5 * on
        for mask in flickers:
            src *= 1 + mask * (0.55 * flick_curve[(f * 3) % len(flick_curve)] - 0.15)
        if suns:
            for (sx, sy, radius, color) in suns:
                d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2) / radius
                src += np.exp(-d * d * 2.2)[..., None] * np.array(color, np.float32) * (0.22 + 0.1 * math.sin(a * 2))
        if smoke is not None:
            n1, n2, region, color, amount = smoke
            ox, oy = int(1024 * t), int(1024 * t * 0)
            cloud = np.roll(n1, (oy, ox), (0, 1)) * 0.6 + np.roll(n2, (0, -2 * ox), (0, 1)) * 0.4
            cloud = cv2.resize(cloud, (sw, sh), interpolation=cv2.INTER_LINEAR)
            alpha = (np.clip(cloud - 0.42, 0, 1) * 2.2 * region * amount)[..., None]
            src = src * (1 - alpha) + color * alpha

        # Camera: a slow push in and back out, a small drift, and near things sliding against far ones.
        zoom = fit * cam['zoom'] * (1 + cam['push'] * (0.5 - 0.5 * math.cos(a)))
        mx = sw / 2 + (u - W / 2) / zoom + cam['pan'][0] * math.sin(a)
        my = sh / 2 + (v - H / 2) / zoom + cam['pan'][1] * math.sin(2 * a)
        dmap = cv2.remap(depth, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        mx -= cam['parallax'][0] * math.sin(a) * (dmap - 0.4)
        my -= cam['parallax'][1] * math.cos(a) * (dmap - 0.4)
        for mask, amp, lam, speed in sways:
            m = cv2.remap(mask, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            mx += m * amp * np.sin(a * speed + my / lam)
            my += m * amp * 0.25 * np.sin(a * speed * 2 + mx / lam)
        for mask, amp in waters:
            m = cv2.remap(mask, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            mx += m * amp * np.sin(a * 4 + my / 9.0) + m * amp * 0.5 * np.sin(-a * 3 + my / 23.0 + mx / 61.0)
            my += m * amp * 0.35 * np.sin(a * 5 + mx / 37.0)
        out = cv2.remap(src, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)

        for p in parts:
            out += p.draw(t)
        out *= vignette
        frame = np.clip(out, 0, 255).astype(np.uint8)
        if preview:
            shots.append(cv2.resize(frame, (480, 270), interpolation=cv2.INTER_AREA))
        else:
            proc.stdin.write(frame.tobytes())
    if preview:
        shots.append(cv2.resize((np.clip(depth, 0, 1) * 255).astype(np.uint8), (480, 270))[..., None].repeat(3, 2))
        sheet = np.concatenate([np.concatenate(shots[:3], 1), np.concatenate((shots[3:] + [shots[0]] * 3)[:3], 1)], 0)
        cv2.imwrite(out_path, sheet, [cv2.IMWRITE_JPEG_QUALITY, 82])
    else:
        proc.stdin.close()
        proc.wait()
        print(f'{out_path}: {os.path.getsize(out_path) / 1048576:.1f} MB')


# ---------- the pictures ----------
PALM = 34.0
SCENES = {}

if __name__ == '__main__':
    from live_wallpaper_scenes import SCENES as LOADED
    SCENES.update(LOADED)
    ap = argparse.ArgumentParser()
    ap.add_argument('names', nargs='*')
    ap.add_argument('--preview', action='store_true', help='write a contact sheet (four frames and the depth map) instead of a video')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    for name in a.names or SCENES:
        scene = SCENES[name]
        folder = a.out or (OUT_DIR if not a.preview else '.')
        os.makedirs(folder, exist_ok=True)
        render(name, scene, os.path.join(folder, f'{name}-sheet.jpg' if a.preview else f'gta-vi-{name}.mp4'), a.preview)

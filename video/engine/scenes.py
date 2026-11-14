"""Scene types. Each scene draws one RGBA frame for a local time t (seconds from its own start).

Every piece of text a scene draws is reported through ctx.log_text so the visual and caption
audits can check it against the safe area of the output format.
"""
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

from . import draw
from .config import SAFE, THEME
from .draw import ease_in_out, ease_out, paste, ramp, text_img


class Context:
    def __init__(self, width, height, fps, fmt, production):
        self.w, self.h, self.fps, self.fmt, self.production = width, height, fps, fmt, production
        self.u = min(width, height) / 1080.0          # layout unit: 1 at 1080 pixels on the short side
        l, t, r, b = SAFE[fmt]
        self.safe = (int(width * l), int(height * t), int(width * (1 - r)), int(height * (1 - b)))
        self.badge_room = 0 if fmt == '16x9' else int(round(70 * self.u))   # headings start below the corner badge
        self.text_boxes = {}                           # (scene, role) -> union box and worst-case flags
        self.warnings = []
        self.scene_id = None

    def px(self, v):
        return int(round(v * self.u))

    def log_text(self, role, box):
        if not box:
            return
        key = (self.scene_id, role)
        old = self.text_boxes.get(key)
        self.text_boxes[key] = box if not old else (min(old[0], box[0]), min(old[1], box[1]), max(old[2], box[2]), max(old[3], box[3]))

    def path(self, rel):
        return rel if os.path.isabs(rel) else os.path.join(self.production, rel)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


class Scene:
    def __init__(self, spec, ctx):
        self.spec, self.ctx = spec, ctx
        self.id = spec['id']
        self.duration = float(spec['duration'])

    def frame(self, t, n):
        raise NotImplementedError

    def close(self):
        pass

    # shared pieces -----------------------------------------------------
    def put_text(self, canvas, role, text, size, xy, opacity=1.0, anchor='left', **kw):
        """Draw text and report its box. xy is the top-left, top-centre or top-right by `anchor`."""
        ctx = self.ctx
        img = text_img(text, ctx.px(size), **kw)
        x = {'left': xy[0], 'center': xy[0] - img.width / 2, 'right': xy[0] - img.width}[anchor]
        box = paste(canvas, img, (x, xy[1]), opacity)
        if opacity > 0.5:
            ctx.log_text(role, box)
        return img

    def lower_third(self, canvas, t, spec):
        """Cut-edge card in the lower left, above the caption zone."""
        ctx = self.ctx
        start = spec.get('at', 0.5)
        end = spec.get('until', self.duration - 0.6)
        a = ease_out(ramp(t, start, 0.45)) * (1 - ease_out(ramp(t, end, 0.35)))
        if a <= 0:
            return
        pad = ctx.px(26)
        max_w = min(ctx.px(820), ctx.safe[2] - ctx.safe[0] - pad * 2)
        title = text_img(spec['title'], ctx.px(46), weight=700, width=85, max_w=max_w, upper=True)
        body = text_img(spec['text'], ctx.px(27), color=THEME['muted'], family='body', weight=400, max_w=max_w) if spec.get('text') else None
        w = max(title.width, body.width if body else 0) + pad * 2
        h = title.height + (body.height + ctx.px(6) if body else 0) + pad * 2
        card = draw.cut_card(w, h, ctx.px(22))
        x = ctx.safe[0] - (1 - a) * ctx.px(60)
        y = ctx.safe[3] - ctx.px(spec.get('lift', 150)) - h
        paste(canvas, card, (x, y), a)
        box = paste(canvas, title, (x + pad, y + pad), a)
        if a > 0.98:                                   # report the resting position, not the slide-in
            ctx.log_text('lower-third', box)
        if body:
            box = paste(canvas, body, (x + pad, y + pad + title.height + ctx.px(6)), a)
            if a > 0.98:
                ctx.log_text('lower-third-text', box)

    def badge(self, canvas, text, opacity=1.0):
        """Small persistent label, used for the 'unofficial fan project' notice. Drawn by the renderer
        on top of the finished frame, so it holds still through transitions."""
        ctx = self.ctx
        img = text_img(text, ctx.px(20), color=THEME['text'], family='body', weight=700, tracking=ctx.px(1.5), upper=True)
        pad = ctx.px(10)
        plate = Image.new('RGBA', (img.width + pad * 2, img.height + pad), (8, 7, 19, 170))
        x, y = ctx.safe[2] - plate.width, ctx.safe[1]
        paste(canvas, plate, (x, y), opacity)
        ctx.log_text('badge', paste(canvas, img, (x + pad, y + pad // 2), opacity))


class Title(Scene):
    """Opening or section title: kicker, big Bahnschrift title, sunset rule, subtitle."""

    def __init__(self, spec, ctx):
        super().__init__(spec, ctx)
        self.bg = None
        if spec.get('bg_image'):
            img = Image.open(ctx.path(spec['bg_image'])).convert('RGBA')
            self.bg = cover(img, ctx.w, ctx.h).filter(ImageFilter.GaussianBlur(ctx.px(spec.get('bg_blur', 6))))
            self.bg = Image.blend(self.bg, Image.new('RGBA', self.bg.size, THEME['bg_deep'] + (255,)), spec.get('bg_dim', 0.62))

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        canvas = self.bg.copy() if self.bg else draw.background(ctx.w, ctx.h, t, seed=len(self.id))
        cx = ctx.w / 2
        max_w = ctx.safe[2] - ctx.safe[0]
        title = text_img(s['title'], ctx.px(s.get('size', 150)), weight=700, width=78, max_w=max_w, align='center', upper=True, line_gap=1.0)
        sub = text_img(s['subtitle'], ctx.px(40), color=THEME['soft'], family='body', weight=400, max_w=int(max_w * 0.86), align='center') if s.get('subtitle') else None
        kick = text_img(s['kicker'], ctx.px(28), color=THEME['sun'], weight=600, width=100, tracking=ctx.px(7), upper=True, max_w=max_w, align='center') if s.get('kicker') else None
        gap = ctx.px(26)
        total = (kick.height + gap if kick else 0) + title.height + gap + ctx.px(6) + (gap + sub.height if sub else 0)
        y = (ctx.h - total) / 2
        out = 1 - ease_in_out(ramp(t, self.duration - 0.35, 0.35)) * 0.0   # titles hold; the transition does the exit
        if kick:
            a = ease_out(ramp(t, 0.15, 0.5)) * out
            box = paste(canvas, kick, (cx - kick.width / 2, y + (1 - a) * ctx.px(14)), a)
            if a > 0.5:
                ctx.log_text('kicker', box)
            y += kick.height + gap
        a = ease_out(ramp(t, 0.3, 0.7)) * out
        box = paste(canvas, title, (cx - title.width / 2, y + (1 - a) * ctx.px(40)), a)
        if a > 0.5:
            ctx.log_text('title', box)
        y += title.height + gap
        bar_w = int(min(title.width, max_w) * ease_in_out(ramp(t, 0.55, 0.8)))
        if bar_w > 2:
            paste(canvas, draw.gradient(bar_w, ctx.px(6), 0), (cx - bar_w / 2, y))
        y += ctx.px(6) + gap
        if sub:
            a = ease_out(ramp(t, 0.9, 0.6)) * out
            box = paste(canvas, sub, (cx - sub.width / 2, y + (1 - a) * ctx.px(18)), a)
            if a > 0.5:
                ctx.log_text('subtitle', box)
        return canvas


def cover(img, w, h):
    """Scale and centre-crop to fill w x h."""
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(w, int(math.ceil(img.width * scale))), max(h, int(math.ceil(img.height * scale)))), Image.BILINEAR)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


class Footage(Scene):
    """A video clip, either full frame or as a framed window on the studio backdrop.

    full   : fills the frame (cropped to cover). Used when source and output shapes match.
    window : the clip sits in a bordered window with a heading above it; works in every format.
    """

    def __init__(self, spec, ctx):
        super().__init__(spec, ctx)
        self.src = ctx.path(spec['src'])
        if not os.path.exists(self.src):
            raise FileNotFoundError(f'scene {self.id}: missing footage {self.src}')
        info = probe(self.src)
        v = next(s for s in info['streams'] if s['codec_type'] == 'video')
        self.sw, self.sh = int(v['width']), int(v['height'])
        self.crop = spec.get('crop')                      # [x, y, width, height] in source pixels
        if self.crop:
            self.sw, self.sh = int(self.crop[2]), int(self.crop[3])
        self.src_duration = float(info['format']['duration'])
        self.mode = spec.get('mode', 'full')
        if self.mode == 'full':
            self.bw, self.bh = ctx.w, ctx.h
        else:
            l, t, r, b = ctx.safe
            head = (ctx.px(150) + ctx.badge_room) if spec.get('heading') else 0
            foot = ctx.px(180)
            avail_w, avail_h = (r - l), (b - t) - head - foot
            scale = min(avail_w / self.sw, avail_h / self.sh)
            self.bw, self.bh = int(self.sw * scale) // 2 * 2, int(self.sh * scale) // 2 * 2
            self.bx, self.by = (ctx.w - self.bw) // 2, t + head + (avail_h - self.bh) // 2
        scale = max(self.bw / self.sw, self.bh / self.sh)
        self.upscale = scale
        start = float(spec.get('start', 0))
        need = start + self.duration * float(spec.get('speed', 1.0))
        if need > self.src_duration + 0.05:
            ctx.warnings.append(f'scene {self.id}: needs {need:.2f}s of {os.path.basename(self.src)} but it is {self.src_duration:.2f}s long; last frame will be held')
        vf = []
        if self.crop:
            vf.append(f'crop={self.crop[2]}:{self.crop[3]}:{self.crop[0]}:{self.crop[1]}')
        if spec.get('speed', 1.0) != 1.0:
            vf.append(f"setpts=PTS/{float(spec['speed'])}")
        vf += [f'fps={ctx.fps}', f'scale={self.bw}:{self.bh}:force_original_aspect_ratio=increase:flags=lanczos', f'crop={self.bw}:{self.bh}']
        self.proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-i', self.src, '-an', '-vf', ','.join(vf),
                                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.size = self.bw * self.bh * 3
        self.last = None
        self.read_n = -1
        self.held = 0

    def _read(self, n):
        while self.read_n < n:
            buf = self.proc.stdout.read(self.size)
            if len(buf) < self.size:
                self.held += 1
                break
            self.last = Image.frombuffer('RGB', (self.bw, self.bh), buf, 'raw', 'RGB', 0, 1).convert('RGBA')
            self.read_n += 1
        if self.last is None:
            raise RuntimeError(f'scene {self.id}: no frames decoded from {self.src}')
        return self.last

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        clip = self._read(n)
        zoom = s.get('zoom')
        if zoom:
            z = zoom[0] + (zoom[1] - zoom[0]) * (t / self.duration)
            zw, zh = int(self.bw / z), int(self.bh / z)
            fx, fy = s.get('focus', [0.5, 0.5])
            x0, y0 = int((self.bw - zw) * fx), int((self.bh - zh) * fy)
            clip = clip.crop((x0, y0, x0 + zw, y0 + zh)).resize((self.bw, self.bh), Image.BILINEAR)
        if self.mode == 'full':
            canvas = clip.copy()
            if s.get('shade', True):
                canvas.alpha_composite(bottom_shade(ctx.w, ctx.h))
        else:
            canvas = draw.background(ctx.w, ctx.h, t, seed=len(self.id))
            a = ease_out(ramp(t, 0.0, 0.5))
            sh, pad = draw.shadow(self.bw, self.bh, ctx.px(22))
            y = self.by + (1 - a) * ctx.px(30)
            paste(canvas, sh, (self.bx - pad, y - pad + ctx.px(14)), a)
            b = ctx.px(4)
            paste(canvas, draw.gradient(self.bw + b * 2, self.bh + b * 2, 20), (self.bx - b, y - b), a)
            paste(canvas, clip, (self.bx, y), a)
            if s.get('heading'):
                ha = ease_out(ramp(t, 0.1, 0.5))
                img = text_img(s['heading'], ctx.px(70), weight=700, width=80, upper=True, max_w=ctx.safe[2] - ctx.safe[0], align='center')
                box = paste(canvas, img, (ctx.w / 2 - img.width / 2, ctx.safe[1] + ctx.badge_room + ctx.px(20) + (1 - ha) * ctx.px(-16)), ha)
                if ha > 0.5:
                    ctx.log_text('heading', box)
        if s.get('lower_third'):
            self.lower_third(canvas, t, s['lower_third'])
        return canvas

    def close(self):
        if self.held > 1:
            self.ctx.warnings.append(f'scene {self.id}: footage ran out, last frame held for {self.held} frames')
        try:
            self.proc.stdout.close()
            self.proc.kill()
        except Exception:
            pass


_shade_cache = {}


def bottom_shade(w, h):
    """Darkens the lower part of full-frame footage so cards and captions stay readable."""
    if (w, h) not in _shade_cache:
        a = (np.clip((np.linspace(0, 1, h) - 0.55) / 0.45, 0, 1) ** 1.5 * 200).astype(np.uint8)
        arr = np.zeros((h, w, 4), dtype=np.uint8)
        arr[..., 0], arr[..., 1], arr[..., 2] = THEME['bg_deep']
        arr[..., 3] = a[:, None]
        _shade_cache[(w, h)] = Image.fromarray(arr, 'RGBA')
    return _shade_cache[(w, h)]


class Still(Scene):
    """A still picture with a slow push-in (documentary and explainer scenes)."""

    def __init__(self, spec, ctx):
        super().__init__(spec, ctx)
        path = ctx.path(spec['src'])
        if not os.path.exists(path):
            raise FileNotFoundError(f'scene {self.id}: missing image {path}')
        self.img = Image.open(path).convert('RGBA')
        self.upscale = max(ctx.w / self.img.width, ctx.h / self.img.height)

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        z0, z1 = s.get('zoom', [1.0, 1.08])
        z = z0 + (z1 - z0) * t / self.duration
        base = cover(self.img, int(ctx.w * z), int(ctx.h * z))
        x, y = (base.width - ctx.w) // 2, (base.height - ctx.h) // 2
        canvas = base.crop((x, y, x + ctx.w, y + ctx.h))
        canvas.alpha_composite(bottom_shade(ctx.w, ctx.h))
        if s.get('lower_third'):
            self.lower_third(canvas, t, s['lower_third'])
        return canvas


class Card(Scene):
    """Heading and a staggered list on a cut-edge card (tutorial steps, feature lists)."""

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        canvas = draw.background(ctx.w, ctx.h, t, seed=len(self.id))
        l, top, r, b = ctx.safe
        w = min(r - l, ctx.px(1500))
        pad = ctx.px(56)
        head = text_img(s['heading'], ctx.px(76), weight=700, width=80, upper=True, max_w=w - pad * 2)
        items = [text_img(i, ctx.px(42), family='body', weight=400, max_w=w - pad * 2 - ctx.px(50)) for i in s.get('items', [])]
        w = min(w, max([head.width] + [i.width + ctx.px(50) for i in items]) + pad * 2 + ctx.px(60))   # fit the card to its text
        gap = ctx.px(22)
        h = pad * 2 + head.height + ctx.px(24) + sum(i.height + gap for i in items)
        x, y = (ctx.w - w) / 2, (ctx.h - h) / 2
        a = ease_out(ramp(t, 0, 0.5))
        paste(canvas, draw.cut_card(w, h, ctx.px(34), bar=ctx.px(5)), (x, y + (1 - a) * ctx.px(30)), a)
        ha = ease_out(ramp(t, 0.2, 0.5))
        box = paste(canvas, head, (x + pad, y + pad), ha)
        if ha > 0.5:
            ctx.log_text('heading', box)
        cy = y + pad + head.height + ctx.px(24)
        for i, img in enumerate(items):
            ia = ease_out(ramp(t, 0.6 + i * s.get('stagger', 0.45), 0.45))
            dot = draw.gradient(ctx.px(18), ctx.px(18), 45)
            paste(canvas, dot, (x + pad, cy + img.height / 2 - ctx.px(9)), ia)
            box = paste(canvas, img, (x + pad + ctx.px(50) - (1 - ia) * ctx.px(24), cy), ia)
            if ia > 0.5:
                ctx.log_text(f'item-{i + 1}', box)
            cy += img.height + gap
        return canvas


class Stats(Scene):
    """Animated infographic: counters that run up to their value, with growing sunset bars."""

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        canvas = draw.background(ctx.w, ctx.h, t, seed=len(self.id))
        l, top, r, b = ctx.safe
        stats = s['stats']
        y = top + ctx.px(60) + ctx.badge_room
        if s.get('heading'):
            ha = ease_out(ramp(t, 0.1, 0.5))
            img = text_img(s['heading'], ctx.px(72), weight=700, width=80, upper=True, max_w=r - l, align='center')
            box = paste(canvas, img, (ctx.w / 2 - img.width / 2, y), ha)
            if ha > 0.5:
                ctx.log_text('heading', box)
            y += img.height + ctx.px(50)
        vertical = ctx.w < ctx.h * 1.2
        cols = len(stats) if not vertical else (1 if ctx.h > ctx.w * 1.2 else 2)     # wide: a row; tall: a column; square: two columns
        rows = -(-len(stats) // cols)
        gap = ctx.px(36)
        cw = ((r - l) - gap * (cols - 1)) / cols
        chh = min(ctx.px(300), ((b - ctx.px(230)) - y - gap * (rows - 1)) / rows)     # leaves room for the source line and captions
        if not vertical:
            y += max(0, ((b - ctx.px(230)) - y - chh) / 2)
        peak = max(float(st['value']) for st in stats) or 1.0
        for i, st in enumerate(stats):
            cx = l + (i % cols) * (cw + gap)
            cy = y + (i // cols) * (chh + gap)
            a = ease_out(ramp(t, 0.4 + i * 0.3, 0.5))
            paste(canvas, draw.cut_card(int(cw), int(chh), ctx.px(26), bar=ctx.px(4)), (cx, cy + (1 - a) * ctx.px(30)), a)
            grow = ease_in_out(ramp(t, 0.7 + i * 0.3, 1.3))
            shown = f"{float(st['value']):,.0f}{st.get('suffix', '')}"
            k = max(0.5, min(1.0, chh / ctx.px(300)))        # shrink the type when the cards are short
            pad = ctx.px(30 * k)
            num = text_img(shown, ctx.px(118 * k), weight=700, width=80)
            pop = ease_out(ramp(t, 0.55 + i * 0.3, 0.45))
            box = paste(canvas, num, (cx + pad, cy + pad - ctx.px(8) + (1 - pop) * ctx.px(26)), pop)
            if pop > 0.5:
                ctx.log_text(f'stat-{i + 1}', box)
            lab = text_img(st['label'], ctx.px(30 * max(k, 0.8)), color=THEME['muted'], family='body', weight=400, max_w=int(cw - pad * 2))
            box = paste(canvas, lab, (cx + pad, cy + pad + num.height), a)
            if a > 0.5:
                ctx.log_text(f'stat-label-{i + 1}', box)
            bw = int((cw - pad * 2) * (float(st['value']) / peak) * grow)
            if bw > 2:
                paste(canvas, draw.gradient(bw, ctx.px(10), 0), (cx + pad, cy + chh - pad - ctx.px(10)), a)
        if s.get('source'):
            img = text_img(s['source'], ctx.px(28), color=THEME['soft'], family='body', weight=400, max_w=r - l, align='center')
            ctx.log_text('source', paste(canvas, img, (ctx.w / 2 - img.width / 2, b - ctx.px(170) - img.height), ease_out(ramp(t, 1.0, 0.5))))
        return canvas


class Credits(Scene):
    """Ending credits: heading, then lines fading in, with the notice held at the bottom."""

    def frame(self, t, n):
        ctx, s = self.ctx, self.spec
        canvas = draw.background(ctx.w, ctx.h, t, seed=3.0)
        l, top, r, b = ctx.safe
        max_w = r - l
        blocks = []
        if s.get('heading'):
            blocks.append(('heading', text_img(s['heading'], ctx.px(84), weight=700, width=80, upper=True, max_w=max_w, align='center'), ctx.px(56)))
        for i, line in enumerate(s.get('lines', [])):
            if isinstance(line, list):
                img = credit_pair(line[0], line[1], ctx, max_w)
            else:
                img = text_img(line, ctx.px(32), family='body', weight=400, max_w=int(max_w * 0.9), align='center')
            blocks.append((f'line-{i + 1}', img, ctx.px(20)))
        notice = text_img(s['notice'], ctx.px(26), color=THEME['sun'], family='body', weight=700, max_w=int(max_w * 0.92), align='center') if s.get('notice') else None
        total = sum(img.height + g for _, img, g in blocks) + (notice.height + ctx.px(30) if notice else 0)
        y = top + max(0, ((b - top) - total) / 2)
        for i, (role, img, g) in enumerate(blocks):
            a = ease_out(ramp(t, 0.15 + i * 0.12, 0.4))
            box = paste(canvas, img, (ctx.w / 2 - img.width / 2, y + (1 - a) * ctx.px(16)), a)
            if a > 0.5:
                ctx.log_text(role, box)
            y += img.height + g
            if role == 'heading':
                bw = int(min(img.width, max_w) * ease_in_out(ramp(t, 0.4, 0.7)))
                if bw > 2:
                    paste(canvas, draw.gradient(bw, ctx.px(5), 0), (ctx.w / 2 - bw / 2, y - g / 2))
        if notice:
            a = ease_out(ramp(t, 0.4, 0.5))
            box = paste(canvas, notice, (ctx.w / 2 - notice.width / 2, y + ctx.px(30)), a)
            if a > 0.5:
                ctx.log_text('notice', box)
        return canvas


def credit_pair(role, name, ctx, max_w):
    """A credit line: the role small, spaced and muted, the name in white, so the two read apart."""
    r = text_img(role, ctx.px(27), color=THEME['sun'], weight=600, tracking=ctx.px(3), upper=True)
    n = text_img(name, ctx.px(36), family='body', weight=700, max_w=max_w, align='center')
    gap = ctx.px(4)
    img = Image.new('RGBA', (max(r.width, n.width), r.height + gap + n.height), (0, 0, 0, 0))
    img.alpha_composite(r, ((img.width - r.width) // 2, 0))
    img.alpha_composite(n, ((img.width - n.width) // 2, r.height + gap))
    return img


TYPES = {'title': Title, 'footage': Footage, 'still': Still, 'card': Card, 'stats': Stats, 'credits': Credits}


def build(spec, ctx):
    if spec['type'] not in TYPES:
        raise ValueError(f"scene {spec.get('id')}: unknown type {spec['type']}; use one of {sorted(TYPES)}")
    return TYPES[spec['type']](spec, ctx)

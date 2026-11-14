"""Renderer: draws every frame with Pillow and pipes it to ffmpeg, with transitions and burned-in captions."""
import json
import os
import subprocess
import time

import numpy as np
from PIL import Image, ImageDraw

from . import draw, scenes, timeline
from .config import FORMATS, RENDER, SUNSET, THEME
from .draw import ease_in_out, paste, text_img


# ---------- transitions: (outgoing frame, incoming frame, progress 0..1) -> frame ----------
def t_crossfade(a, b, p, ctx):
    return Image.blend(a, b, ease_in_out(p))


def t_flash(a, b, p, ctx):
    """Dip through the sunset pink."""
    color = Image.new('RGBA', a.size, THEME['pink'] + (255,))
    mid = Image.blend(a, b, ease_in_out(p))                      # the pictures cross underneath the colour
    return Image.blend(mid, color, 0.72 * (1 - abs(p * 2 - 1)) ** 0.8)


def t_push(a, b, p, ctx):
    e = ease_in_out(p)
    out = Image.new('RGBA', a.size, THEME['bg_deep'] + (255,))
    out.paste(a, (-int(ctx.w * e), 0))
    out.paste(b, (ctx.w - int(ctx.w * e), 0))
    return out


def t_slant(a, b, p, ctx):
    """Diagonal wipe with a sunset band on its leading edge, echoing the app's slanted cards."""
    e = ease_in_out(p)
    lean = ctx.h * 0.28
    band = ctx.px(70)
    x = -lean - band + (ctx.w + lean + band * 2) * e
    mask = Image.new('L', a.size, 0)
    ImageDraw.Draw(mask).polygon([(-10, -10), (x + lean, -10), (x, ctx.h + 10), (-10, ctx.h + 10)], fill=255)
    out = Image.composite(b, a, mask)
    edge = Image.new('L', a.size, 0)
    ImageDraw.Draw(edge).polygon([(x + lean, -10), (x + lean + band, -10), (x + band, ctx.h + 10), (x, ctx.h + 10)], fill=255)
    out.paste(draw.gradient(ctx.w, ctx.h, 90), (0, 0), edge)
    return out


TRANSITIONS = {'crossfade': t_crossfade, 'flash': t_flash, 'push': t_push, 'slant': t_slant}


# ---------- captions ----------
def caption_layout(text, ctx):
    """Burned-in caption: white Segoe UI on a dark plate, centred at the bottom of the safe area."""
    max_w = int((ctx.safe[2] - ctx.safe[0]) * 0.86)
    from .captions import split_lines
    img = text_img('\n'.join(split_lines(text)), ctx.px(38), family='body', weight=700, max_w=max_w, align='center', line_gap=1.2)
    pad_x, pad_y = ctx.px(22), ctx.px(10)
    plate = Image.new('RGBA', (img.width + pad_x * 2, img.height + pad_y * 2), (8, 7, 19, 205))
    plate.alpha_composite(img, (pad_x, pad_y))
    return plate, ((ctx.w - plate.width) // 2, ctx.safe[3] - plate.height)


def render(slug, mode='preview', fmt=None, burn_captions=None, out_path=None, quiet=False):
    project = timeline.load(slug)
    pdir = project['_dir']
    meta = project['meta']
    fmt = fmt or meta.get('format', '16x9')
    cfg = RENDER[mode]
    fw, fh = FORMATS[fmt]
    w, h = int(fw * cfg['scale']) // 2 * 2, int(fh * cfg['scale']) // 2 * 2
    fps = cfg['fps'] if mode == 'preview' else int(meta.get('fps', cfg['fps']))
    ctx = scenes.Context(w, h, fps, fmt, pdir)
    sched = timeline.schedule(project)
    total = sched[-1]['end']
    frames = int(round(total * fps))
    cues = timeline.captions(project)
    burn = project.get('captions', {}).get('burn_in', True) if burn_captions is None else burn_captions
    for s in project['scenes']:                      # so the audit can tell a hard-coded format from a flexible one
        s['_fmt'] = fmt

    os.makedirs(os.path.join(pdir, 'renders'), exist_ok=True)
    name = f"{slug}-{fmt}-{mode}"
    out_path = out_path or os.path.join(pdir, 'renders', name + '.mp4')
    audio = project.get('audio', {}).get('mix', 'audio/mix.wav') if project.get('audio') else None
    audio_path = os.path.join(pdir, audio) if audio else None
    if audio_path and not os.path.exists(audio_path):
        raise FileNotFoundError(f'audio mix {audio_path} is missing; run: python video/studio.py audio {slug}')

    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-']
    if audio_path:
        cmd += ['-i', audio_path]
    cmd += ['-c:v', 'libx264', '-preset', cfg['preset'], '-crf', str(cfg['crf']), '-pix_fmt', 'yuv420p',
            '-profile:v', 'high', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
            '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p']
    if audio_path:
        cmd += ['-c:a', 'aac', '-b:a', cfg['audio_bitrate'], '-ar', '48000']
    cmd += ['-t', f'{frames / fps:.4f}', '-movflags', '+faststart', out_path]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    live = {}                                        # index -> Scene, built when first needed
    fade_in, fade_out = float(meta.get('fade_in', 0.4)), float(meta.get('fade_out', 0.6))
    black = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    started = time.time()
    caption_boxes = []
    upscales = {}
    try:
        for n in range(frames):
            t = n / fps
            active = [s for s in sched if s['start'] <= t < s['end']] or [sched[-1]]
            imgs = []
            for s in active[:2]:
                i = s['index']
                if i not in live:
                    ctx.scene_id = s['id']
                    live[i] = scenes.build(project['scenes'][i], ctx)
                    if hasattr(live[i], 'upscale'):
                        upscales[s['id']] = round(live[i].upscale, 3)
                ctx.scene_id = s['id']
                local = t - s['start']
                imgs.append(live[i].frame(local, int(round(local * fps))))
            if len(imgs) == 2:
                a = active[0]
                p = (t - active[1]['start']) / max(a['transition_duration'], 1e-6)
                frame = TRANSITIONS.get(a['transition'], t_crossfade)(imgs[0], imgs[1], draw.clamp(p), ctx)
            else:
                frame = imgs[0]
            has = [project['scenes'][s['index']].get('badge') for s in active[:2]]
            if any(has):
                weight = 1.0 if len(has) == 1 else draw.clamp(p)
                opacity = 1.0 if all(has) else (1 - weight if has[0] else weight)
                ctx.scene_id = active[0]['id'] if has[0] else active[1]['id']
                live[active[0]['index']].badge(frame, has[0] or has[1], opacity if len(has) == 2 else 1.0)
            for i in [i for i in live if sched[i]['end'] <= t]:
                live.pop(i).close()
            if burn:
                for c in cues:
                    if c['start'] <= t < c['end']:
                        plate, pos = caption_layout(c['text'], ctx)
                        a = min(draw.ramp(t, c['start'], 0.12), 1 - draw.ramp(t, c['end'] - 0.12, 0.12))
                        box = paste(frame, plate, pos, max(a, 0.01))
                        if box and (c['start'], box) not in caption_boxes:
                            caption_boxes.append((c['start'], box))
            if fade_in and t < fade_in:
                frame = Image.blend(black, frame, t / fade_in)
            if fade_out and t > total - fade_out:
                frame = Image.blend(black, frame, max(0.0, (total - t) / fade_out))
            enc.stdin.write(frame.convert('RGB').tobytes())
            if not quiet and n % (fps * 5) == 0:
                print(f'  {t:6.1f}s / {total:.1f}s', flush=True)
    finally:
        for sc in live.values():
            sc.close()
        enc.stdin.close()
        code = enc.wait()
    if code != 0:
        raise RuntimeError(f'ffmpeg exited with code {code}')

    layout = {
        'file': os.path.relpath(out_path, pdir).replace('\\', '/'), 'mode': mode, 'format': fmt, 'width': w, 'height': h, 'fps': fps,
        'frames': frames, 'duration': frames / fps, 'safe': ctx.safe, 'captions_burned': bool(burn),
        'schedule': sched, 'warnings': ctx.warnings,
        'text': [{'scene': k[0], 'role': k[1], 'box': v} for k, v in ctx.text_boxes.items()],
        'caption_boxes': [{'start': s, 'box': b} for s, b in caption_boxes],
        'footage': [{'scene': k, 'upscale': v} for k, v in upscales.items()],
        'render_seconds': round(time.time() - started, 1),
    }
    with open(os.path.splitext(out_path)[0] + '.layout.json', 'w', encoding='utf-8') as f:
        json.dump(layout, f, indent=1)
    if not quiet:
        print(f'{out_path}: {w}x{h}, {fps} fps, {frames / fps:.2f}s, rendered in {layout["render_seconds"]}s')
        for wmsg in ctx.warnings:
            print('  WARNING:', wmsg)
    return out_path

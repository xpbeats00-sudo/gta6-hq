"""Automated audits. Each returns a list of checks and writes a Markdown report plus a JSON result.

A check is {name, status, detail}; status is PASS, FAIL, WARN (needs a human decision) or SKIP
(could not be run here, with the reason). Nothing is reported as passed unless it was measured.
"""
import datetime
import glob
import hashlib
import json
import os
import re
import subprocess

import numpy as np
from PIL import Image

from . import captions as cap
from . import timeline
from .config import FORBIDDEN_MARKS, FORMATS, QA, REPO_DIR, VIDEO_DIR

REPORTS = {
    'facts': 'RESEARCH-AND-FACT-CHECK.md', 'script': 'SCRIPT-AUDIT.md', 'storyboard': 'STORYBOARD-AUDIT.md',
    'licence': 'ASSET-LICENSE-AUDIT.md', 'audio': 'AUDIO-AUDIT.md', 'captions': 'CAPTION-AUDIT.md',
    'technical': 'VIDEO-TECHNICAL-AUDIT.md', 'visual': 'VISUAL-QUALITY-AUDIT.md',
}
ORDER = ['facts', 'script', 'storyboard', 'licence', 'technical', 'visual', 'audio', 'captions']


class Checks(list):
    def add(self, name, status, detail=''):
        self.append({'name': name, 'status': status, 'detail': str(detail)})

    def ok(self, name, passed, detail='', fail='FAIL'):
        self.add(name, 'PASS' if passed else fail, detail)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def words(text):
    return re.findall(r"[a-z0-9']+", text.lower().replace('’', "'"))


def scene_texts(scene):
    """All words a viewer reads or hears in a scene: (role, text)."""
    out = []
    for key in ('kicker', 'title', 'subtitle', 'heading', 'caption', 'narration', 'notice', 'source', 'badge'):
        if scene.get(key):
            out.append((key, scene[key]))
    lt = scene.get('lower_third') or {}
    out += [('lower_third.' + k, lt[k]) for k in ('title', 'text') if lt.get(k)]
    out += [(f'item {i + 1}', t) for i, t in enumerate(scene.get('items', []))]
    out += [(f'caption {i + 1}', c['text']) for i, c in enumerate(scene.get('captions', []))]
    for i, st in enumerate(scene.get('stats', [])):
        out.append((f'stat {i + 1}', f"{st['value']}{st.get('suffix', '')} {st['label']}"))
    for i, line in enumerate(scene.get('lines', [])):
        out.append((f'line {i + 1}', ' '.join(line) if isinstance(line, list) else line))
    return out


def target_file(project, file=None):
    """The render to inspect: an explicit file, else the newest final render, else the newest preview."""
    if file:
        return file
    rdir = os.path.join(project['_dir'], 'renders')
    for mode in ('final', 'preview'):
        found = sorted(glob.glob(os.path.join(rdir, f'*-{mode}.mp4')), key=os.path.getmtime)
        if found:
            return found[-1]
    return None


def layout_for(path):
    lp = os.path.splitext(path)[0] + '.layout.json'
    if os.path.exists(lp):
        with open(lp, encoding='utf-8') as f:
            return json.load(f)
    return None


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path]).stdout)


def grab(path, t, size=(320, 180)):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t):.3f}', '-i', path, '-frames:v', '1', '-vf', f'scale={size[0]}:{size[1]}',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    if len(r.stdout) != size[0] * size[1] * 3:
        return None
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(size[1], size[0], 3).astype(np.float32)


# ---------- technical ----------
def technical(project, file=None):
    c = Checks()
    path = target_file(project, file)
    if not path or not os.path.exists(path):
        c.add('Render file exists', 'FAIL', 'no render found; run the render command first')
        return c, {}
    lay = layout_for(path)
    info = probe(path)
    v = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
    size = os.path.getsize(path)
    c.ok('Render file exists', size > 10000, f'{os.path.basename(path)}, {size / 1048576:.2f} MB')
    c.ok('Container is MP4', 'mp4' in info['format']['format_name'], info['format']['format_name'])
    c.ok('Video stream present', v is not None)
    if not v:
        return c, {'file': path}
    c.ok('Video codec is H.264', v['codec_name'] == 'h264', f"{v['codec_name']} ({v.get('profile')})")
    c.ok('Pixel format is yuv420p', v['pix_fmt'] == 'yuv420p', v['pix_fmt'])
    num, den = [int(x) for x in v['r_frame_rate'].split('/')]
    fps = num / den
    if lay:
        c.ok('Resolution matches the render plan', (v['width'], v['height']) == (lay['width'], lay['height']), f"{v['width']}x{v['height']}, planned {lay['width']}x{lay['height']}")
        c.ok('Frame rate matches the render plan', abs(fps - lay['fps']) < 0.01, f"{fps:g} fps, planned {lay['fps']}")
        dur = float(info['format']['duration'])
        c.ok('Duration matches the timeline', abs(dur - lay['duration']) <= QA['duration_tolerance_s'], f"{dur:.3f}s, planned {lay['duration']:.3f}s")
        if lay['mode'] == 'final':
            fw, fh = FORMATS[lay['format']]
            c.ok('Final render is full resolution', (v['width'], v['height']) == (fw, fh), f"{v['width']}x{v['height']} for {lay['format']}")
    else:
        c.add('Render plan (layout.json) found', 'WARN', 'not rendered by this studio; plan comparisons skipped')
    fw, fh = (lay['width'], lay['height']) if lay else (v['width'], v['height'])
    c.ok('Square pixels', v.get('sample_aspect_ratio', '1:1') in ('1:1', 'N/A'), v.get('sample_aspect_ratio', 'not stated'))
    has_audio_plan = bool(project.get('audio'))
    if a:
        c.ok('Audio codec is AAC', a['codec_name'] == 'aac', f"{a['codec_name']}, {a.get('sample_rate')} Hz, {a.get('channels')} ch")
        c.ok('Audio sample rate is 48 kHz', a.get('sample_rate') == '48000', a.get('sample_rate'))
        vd, ad = float(v.get('duration', 0)), float(a.get('duration', 0))
        c.ok('Audio and video lengths agree', abs(vd - ad) <= QA['av_sync_max_s'], f'video {vd:.3f}s, audio {ad:.3f}s, difference {abs(vd - ad):.3f}s')
        vs, as_ = float(v.get('start_time', 0)), float(a.get('start_time', 0))
        c.ok('Audio and video start together', abs(vs - as_) <= 0.05, f'video starts {vs:.3f}s, audio {as_:.3f}s')
    else:
        c.add('Audio stream present', 'FAIL' if has_audio_plan else 'WARN', 'no audio stream' + ('' if has_audio_plan else ' (the project defines no audio)'))
    r = run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'null', '-'])
    c.ok('Whole file decodes without errors', r.returncode == 0 and not r.stderr.strip(), r.stderr.strip()[:300] or 'ffmpeg decoded every frame and sample, no messages')
    r = run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', path])
    counted = int(r.stdout.strip().split(',')[0] or 0)
    if lay:
        c.ok('Decoded frame count matches', counted == lay['frames'], f"{counted} frames decoded, {lay['frames']} planned")
    with open(path, 'rb') as f:
        head = f.read(1 << 16)
    moov, mdat = head.find(b'moov'), head.find(b'mdat')
    c.ok('Fast start (index before media data)', moov != -1 and (mdat == -1 or moov < mdat), 'moov atom is at the front' if moov != -1 else 'moov atom not in the first 64 KB')
    facts = {'file': path, 'size_bytes': size, 'sha256': sha256(path), 'width': v['width'], 'height': v['height'], 'fps': fps,
             'duration': float(info['format']['duration']), 'video_codec': v['codec_name'], 'audio_codec': a['codec_name'] if a else None,
             'bit_rate': int(info['format'].get('bit_rate', 0)), 'mode': lay['mode'] if lay else 'unknown'}
    return c, facts


# ---------- visual ----------
def visual(project, file=None):
    c = Checks()
    path = target_file(project, file)
    if not path or not os.path.exists(path):
        c.add('Render file exists', 'FAIL', 'no render found')
        return c, {}
    lay = layout_for(path)
    pdir = project['_dir']
    info = probe(path)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    dur = float(info['format']['duration'])

    missing = [f for f in timeline.referenced_files(project) if not os.path.exists(os.path.join(pdir, f))]
    c.ok('Every referenced asset exists', not missing, ', '.join(missing) or f'{len(timeline.referenced_files(project))} files checked')

    marks = FORBIDDEN_MARKS + project['meta'].get('forbidden_marks', [])
    if marks:
        hits, examined, note = find_marks(path, marks, v['width'], v['height']) if v['width'] >= 1280 else ([], 0, '')
        if hits is None:
            c.add('No forbidden logo in the picture', 'SKIP', note)
        elif v['width'] < 1280:
            c.add('No forbidden logo in the picture', 'SKIP' if not hits else 'FAIL',
                  '; '.join(hits[:6]) or 'previews are too small for a reliable search; it runs on final renders')
        else:
            c.ok('No forbidden logo in the picture', not hits, '; '.join(hits[:6]) + (f' (and {len(hits) - 6} more)' if len(hits) > 6 else '') if hits else
                 f"searched {examined} frames (2 a second) for: {', '.join(m['name'] for m in marks)}. Finds the whole mark at 12 px wide or more; a partly hidden or very small mark needs a person")
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vf', f"blackdetect=d={QA['black_min_s']}:pix_th=0.10", '-an', '-f', 'null', '-'])
    blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', r.stderr)
    c.ok('No black stretches', not blacks, '; '.join(f'{float(a):.2f}-{float(b):.2f}s' for a, b in blacks) or f"none of {QA['black_min_s']}s or longer")

    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-vf', f"freezedetect=n=0.001:d={QA['freeze_min_s']}", '-an', '-f', 'null', '-'])
    starts = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', r.stderr)] + [dur]
    sched = lay['schedule'] if lay else timeline.schedule(project)
    allowed = {s['id'] for s in project['scenes'] if s.get('allow_static')}
    bad = []
    for st, en in zip(starts, ends):
        inside = [s['id'] for s in sched if s['start'] <= st and en <= s['end'] + 0.1]
        if not (inside and inside[0] in allowed):
            bad.append(f'{st:.2f}-{en:.2f}s')
    c.ok('No frozen picture', not bad, '; '.join(bad) or (f'{len(starts)} still stretch(es), all in scenes marked allow_static' if starts else f"no freeze of {QA['freeze_min_s']}s or longer"))

    if lay:
        fw, fh = FORMATS[lay['format']]
        c.ok('Aspect ratio matches the format', abs(v['width'] / v['height'] - fw / fh) < 0.01, f"{v['width']}x{v['height']} for {lay['format']}")
        c.ok('No renderer warnings (missing or short footage)', not lay['warnings'], '; '.join(lay['warnings']) or 'none')
        l, t, r_, b = lay['safe']
        outside = [f"{x['scene']} {x['role']} {x['box']}" for x in lay['text'] if x['box'][0] < l - 1 or x['box'][1] < t - 1 or x['box'][2] > r_ + 1 or x['box'][3] > b + 1]
        c.ok('All on-screen text inside the safe area', not outside, '; '.join(outside) or f"{len(lay['text'])} text blocks inside {lay['safe']}")
        tol = lay['height'] * 0.012
        clash = []
        for i, x in enumerate(lay['text']):
            for y_ in lay['text'][i + 1:]:
                if x['scene'] == y_['scene']:
                    ow = min(x['box'][2], y_['box'][2]) - max(x['box'][0], y_['box'][0])
                    oh = min(x['box'][3], y_['box'][3]) - max(x['box'][1], y_['box'][1])
                    if ow > tol and oh > tol:
                        clash.append(f"{x['scene']}: {x['role']} over {y_['role']}")
        c.ok('Text blocks do not overlap each other', not clash, '; '.join(clash) or 'no title, label, badge, card line or credit overlaps another in the same scene')
        if lay['mode'] == 'final':
            soft = [f"{x['scene']} x{x['upscale']}" for x in lay['footage'] if x['upscale'] and x['upscale'] > QA['upscale_warn']]
            c.ok('Footage is not enlarged beyond its resolution', not soft, '; '.join(soft) or 'largest enlargement ' + (f"x{max([x['upscale'] or 0 for x in lay['footage']] or [0]):.2f}"), fail='WARN')
        else:
            c.add('Footage is not enlarged beyond its resolution', 'SKIP', 'measured on final renders only')
        broken = []
        for s in sched:
            if s['transition_duration'] > 0:
                t0, t1 = s['end'] - s['transition_duration'], s['end']
                fa, fm, fb = grab(path, t0 - 0.25), grab(path, (t0 + t1) / 2), grab(path, t1 + 0.25)
                if fa is None or fm is None or fb is None:
                    broken.append(f"{s['id']}: could not read frames")
                elif fm.mean() < 6:
                    broken.append(f"{s['id']}: black in the middle of the {s['transition']}")
                elif np.abs(fb - fa).mean() < 1.0:
                    broken.append(f"{s['id']}: picture is the same before and after")
        n_tr = sum(1 for s in sched if s['transition_duration'] > 0)
        c.ok('Transitions change the picture and never go black', not broken, '; '.join(broken) or f'{n_tr} transitions sampled before, during and after')
        # contact sheet and per-scene brightness
        thumbs, dark = [], []
        for s in sched:
            mid = min(dur - 0.05, (s['start'] + s['end']) / 2)
            f = grab(path, mid, (480, int(480 * v['height'] / v['width']) // 2 * 2))
            if f is None:
                continue
            if f.mean() < 12:
                dark.append(f"{s['id']} (mean level {f.mean():.0f}/255)")
            thumbs.append(Image.fromarray(f.astype(np.uint8)))
        c.ok('No scene is nearly black at its midpoint', not dark, '; '.join(dark) or f'{len(thumbs)} scenes sampled')
        if thumbs:
            cols = min(4, len(thumbs))
            rows = (len(thumbs) + cols - 1) // cols
            tw, th = thumbs[0].size
            sheet = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0))
            for i, im in enumerate(thumbs):
                sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
            sheet_path = os.path.join(pdir, 'reports', f"contact-sheet-{lay['format']}-{lay['mode']}.jpg")
            sheet.save(sheet_path, quality=85)
            c.add('Contact sheet written', 'PASS', os.path.relpath(sheet_path, pdir).replace('\\', '/') + ' (one frame per scene, for the human or QA agent to look at)')
    else:
        c.add('Render plan (layout.json) found', 'WARN', 'safe-area, transition and enlargement checks need a render made by this studio')
    return c, {'file': path}


def find_marks(path, marks, width, height, every=0.5):
    """Search the render for forbidden marks. Two stages on full-size frames: a grey-scale template
    search at about thirty sizes (12 to 125 pixels wide) finds candidates, then each candidate is
    compared in colour, which tells the mark from white-on-dark text. Brightness does not matter,
    so a dimmed mark is still found. Returns (hits, frames_examined, note). Needs OpenCV."""
    try:
        import cv2
    except ImportError:
        return None, 0, 'OpenCV (opencv-python) is not installed'
    templates = []
    for m in marks:
        src = os.path.join(REPO_DIR, m['file'])
        if not os.path.exists(src):
            return None, 0, f"reference picture {m['file']} is missing"
        x, y, w, h = m['box']
        ref = cv2.cvtColor(np.array(Image.open(src).convert('RGB').crop((x, y, x + w, y + h))), cv2.COLOR_RGB2BGR)
        sizes, px = [], 12.0
        while px <= 125:
            tw, th = int(px), max(4, int(px * h / w))
            colour = cv2.resize(ref, (tw, th), interpolation=cv2.INTER_AREA)
            half = cv2.cvtColor(cv2.resize(ref, (tw // 2, th // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY) if tw >= 40 else None
            sizes.append((colour, cv2.cvtColor(colour, cv2.COLOR_BGR2GRAY), half))
            px *= 1.08
        templates.append((m, sizes))
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={1 / every:.4f}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    size, n, hits = width * height * 3, 0, []
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        frame = np.frombuffer(buf, dtype=np.uint8).reshape(height, width, 3)
        t = n * every
        n += 1
        grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if grey.std() < 4:                                       # a flat frame (fade) has nothing to match
            continue
        small = cv2.resize(grey, (width // 2, height // 2), interpolation=cv2.INTER_AREA)
        for m, sizes in templates:
            best = (0.0, None, 0)
            for colour, g, half in sizes:
                if half is not None:                             # larger sizes are searched at half resolution
                    _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(small, half, cv2.TM_CCOEFF_NORMED))
                    loc = (loc[0] * 2, loc[1] * 2)
                else:
                    _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(grey, g, cv2.TM_CCOEFF_NORMED))
                if score < 0.55:
                    continue
                th, tw = colour.shape[:2]
                x0, y0 = max(0, loc[0] - 3), max(0, loc[1] - 3)
                patch = frame[y0:y0 + th + 6, x0:x0 + tw + 6]
                if patch.shape[0] < th or patch.shape[1] < tw:
                    continue
                _, cscore, _, cloc = cv2.minMaxLoc(cv2.matchTemplate(patch, colour, cv2.TM_CCOEFF_NORMED))
                if cscore > best[0]:
                    best = (cscore, (x0 + cloc[0], y0 + cloc[1]), tw)
            if best[0] >= m.get('threshold', 0.7):
                hits.append(f"{m['name']} at {t:.2f}s, x={best[1][0]} y={best[1][1]}, {best[2]} px wide (match {best[0]:.2f})")
    proc.stdout.close()
    proc.wait()
    return hits, n, ''


# ---------- audio ----------
def audio(project, file=None):
    c = Checks()
    path = target_file(project, file)
    if not path or not os.path.exists(path):
        c.add('Render file exists', 'FAIL', 'no render found')
        return c, {}
    pdir = project['_dir']
    info = probe(path)
    a = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
    if not a:
        c.add('Audio stream present', 'FAIL' if project.get('audio') else 'WARN', 'the file has no audio')
        return c, {}
    c.add('Audio stream present', 'PASS', f"{a['codec_name']}, {a.get('channels')} channels")
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', '48000', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    clipped = int(np.sum(np.abs(x) >= 0.999))
    c.ok('No clipped samples', clipped == 0, f'{clipped} samples at full scale; sample peak {20 * np.log10(peak + 1e-9):.2f} dBFS')
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    summary = r.stderr[r.stderr.rfind('Summary:'):]
    m_i = re.search(r'I:\s+(-?[\d.]+) LUFS', summary)
    m_tp = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summary)
    m_lra = re.search(r'LRA:\s+([\d.]+) LU', summary)
    facts = {}
    if m_i:
        lufs = float(m_i.group(1))
        facts['lufs'] = lufs
        c.ok('Programme loudness on target', abs(lufs - QA['loudness_target_lufs']) <= QA['loudness_tolerance'],
             f"{lufs:.1f} LUFS integrated; target {QA['loudness_target_lufs']} within {QA['loudness_tolerance']} LU" + (f", loudness range {m_lra.group(1)} LU" if m_lra else ''))
    else:
        c.add('Programme loudness on target', 'FAIL', 'could not measure loudness (is the audio silent?)')
    if m_tp:
        tp = float(m_tp.group(1))
        facts['true_peak'] = tp
        c.ok('True peak below the ceiling', tp <= QA['true_peak_max_db'], f"{tp:.1f} dBTP; ceiling {QA['true_peak_max_db']} dBTP")
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', f"silencedetect=noise={QA['silence_db']}dB:d={QA['silence_max_s']}", '-f', 'null', '-'])
    sil = re.findall(r'silence_start: (-?[\d.]+)', r.stderr)
    c.ok('No long silence', not sil, ('silence starts at ' + ', '.join(f'{float(s):.2f}s' for s in sil)) if sil else f"none of {QA['silence_max_s']}s or longer below {QA['silence_db']} dB")

    plan_path = os.path.join(pdir, 'audio', 'mix-plan.json')
    if not os.path.exists(plan_path):
        c.add('Mix plan found', 'WARN', 'audio/mix-plan.json missing; narration and music balance checks skipped')
        return c, facts
    with open(plan_path, encoding='utf-8') as f:
        plan = json.load(f)
    vid = float(info['format']['duration'])
    c.ok('Mix length matches the video', abs(plan['duration'] - vid) <= QA['duration_tolerance_s'], f"mix {plan['duration']:.2f}s, video {vid:.2f}s")
    grid = project['meta'].get('beat')
    if grid:
        from . import beat
        sched_b = timeline.schedule(project)
        bar = 240.0 / grid['bpm']
        first = float(grid.get('first_bar_at', 0))
        fps_v = eval(next(s for s in info['streams'] if s['codec_type'] == 'video')['r_frame_rate'])
        off = [f"{sid} at {t:.3f}s ({abs((t - first) / bar - round((t - first) / bar)) * bar * 1000:.0f} ms off)" for sid, t in beat.cuts(project, sched_b)
               if abs((t - first) / bar - round((t - first) / bar)) * bar > 1.0 / fps_v]
        c.ok('Every cut lands on a bar line', not off, '; '.join(off) or f"{len(sched_b) - 1} cuts, each within one frame of a bar line at {grid['bpm']} BPM")
        stem = os.path.join(pdir, plan['stems']['music']) if 'music' in plan.get('stems', {}) else None
        m = beat.analyse(stem, hint=grid['bpm']) if stem else None
        if m:
            beat_len = 60.0 / m['bpm']
            d = (m['phase'] - first) % beat_len
            d = min(d, beat_len - d)
            c.ok('Measured music tempo matches the beat grid', abs(m['bpm'] - grid['bpm']) <= 0.3, f"measured {m['bpm']} BPM in the music stem, grid uses {grid['bpm']}")
            c.ok('Measured beats line up with the grid', d <= 0.07, f"beats in the music fall {d * 1000:.0f} ms from the grid (limit 70 ms, under two frames)")
        else:
            c.add('Measured music tempo matches the beat grid', 'SKIP', 'no music stem to measure')
    narr = plan.get('narration', [])
    if not narr:
        c.add('Narration timing', 'SKIP', 'this production has no narration')
        c.add('Music stays under narration', 'SKIP', 'this production has no narration')
    else:
        from .audio import read_audio, SR
        stem = read_audio(os.path.join(pdir, plan['stems']['narration'])).max(axis=1)
        music = read_audio(os.path.join(pdir, plan['stems']['music'])) if 'music' in plan['stems'] else None
        sched = {s['id']: s for s in timeline.schedule(project)}
        late, over, overlap, loud = [], [], [], []
        for i, line in enumerate(narr):
            seg = np.abs(stem[int(max(0, line['start'] - 0.5) * SR):int((line['start'] + 2) * SR)])
            hit = np.where(seg > 0.02)[0]
            onset = max(0, line['start'] - 0.5) + (hit[0] / SR if len(hit) else 99)
            if abs(onset - line['start']) > QA['caption_sync_max_s']:
                late.append(f"{line['scene']}: planned {line['start']:.2f}s, heard {onset:.2f}s")
            if line['end'] > sched[line['scene']]['end'] + 0.05:
                over.append(f"{line['scene']}: narration ends {line['end']:.2f}s, scene ends {sched[line['scene']]['end']:.2f}s")
            if i and line['start'] < narr[i - 1]['end']:
                overlap.append(f"{narr[i - 1]['scene']} runs into {line['scene']}")
            if music is not None:
                a0, a1 = int(line['start'] * SR), int(line['end'] * SR)
                n_rms = np.sqrt(np.mean(stem[a0:a1] ** 2) + 1e-12)
                m_rms = np.sqrt(np.mean(music[a0:a1] ** 2) + 1e-12)
                gap = 20 * np.log10(n_rms / m_rms)
                if gap < QA['music_under_narration_db']:
                    loud.append(f"{line['scene']}: narration only {gap:.1f} dB above the music")
        c.ok('Narration starts where planned', not late, '; '.join(late) or f"{len(narr)} lines within {QA['caption_sync_max_s']}s of plan")
        c.ok('Narration fits inside its scene', not over, '; '.join(over) or 'every line ends before its scene does')
        c.ok('Narration lines do not overlap', not overlap, '; '.join(overlap) or 'no overlaps')
        if music is not None:
            c.ok('Music stays under narration', not loud, '; '.join(loud) or f"narration at least {QA['music_under_narration_db']} dB above the music in every line")
        else:
            c.add('Music stays under narration', 'SKIP', 'no music stem')
        engines = sorted({l['engine'] for l in narr})
        if set(engines) & {'sapi', 'flite'}:
            c.add('Narration voice', 'WARN', f"synthetic TEST narration ({', '.join(engines)}); label it as test audio, do not present it as a real voice-over")
    return c, facts


# ---------- captions ----------
def captions(project, file=None):
    c = Checks()
    pdir = project['_dir']
    slug = project['_slug']
    srt = os.path.join(pdir, 'captions', slug + '.srt')
    if not os.path.exists(srt):
        c.add('Caption file exists', 'FAIL', f'captions/{slug}.srt missing; run the captions command')
        return c, {}
    cues = cap.parse_srt(srt)
    planned = timeline.captions(project)
    total = timeline.total_duration(project)
    c.ok('Caption file exists', len(cues) > 0, f'{len(cues)} cues in captions/{slug}.srt; WebVTT ' + ('present' if os.path.exists(srt[:-4] + '.vtt') else 'MISSING'))
    c.ok('Caption file matches the project', len(cues) == len(planned) and all(abs(a['start'] - b['start']) < 0.01 and words(a['text']) == words(b['text']) for a, b in zip(cues, planned)),
         f'{len(cues)} cues in the file, {len(planned)} in the project (re-run the captions command after editing the project)')
    bad_order = [f'cue {i + 1}' for i in range(1, len(cues)) if cues[i]['start'] < cues[i - 1]['end'] - 0.001]
    c.ok('Cues are in order and do not overlap', not bad_order, ', '.join(bad_order) or 'ordered')
    short = [f"cue {i + 1} ({q['end'] - q['start']:.2f}s)" for i, q in enumerate(cues) if not QA['caption_min_s'] <= q['end'] - q['start'] <= QA['caption_max_s']]
    c.ok('Each cue stays up long enough, and not too long', not short, ', '.join(short) or f"all between {QA['caption_min_s']}s and {QA['caption_max_s']}s")
    fast = [f"cue {i + 1} ({len(q['text']) / (q['end'] - q['start']):.1f} cps)" for i, q in enumerate(cues) if len(q['text']) / max(q['end'] - q['start'], 0.01) > QA['caption_cps_max']]
    c.ok('Reading speed', not fast, ', '.join(fast) or f"all at or under {QA['caption_cps_max']:.0f} characters a second")
    shape = [f'cue {i + 1}' for i, q in enumerate(cues) if len(q['lines']) > QA['caption_max_lines'] or any(len(l) > QA['caption_max_chars'] for l in q['lines'])]
    c.ok('Line count and line length', not shape, ', '.join(shape) or f"at most {QA['caption_max_lines']} lines of {QA['caption_max_chars']} characters")
    c.ok('Cues are inside the video', all(q['end'] <= total + 0.05 for q in cues), f'last cue ends {max([q["end"] for q in cues] or [0]):.2f}s, video is {total:.2f}s')

    narr = timeline.narration(project)
    plan_path = os.path.join(pdir, 'audio', 'mix-plan.json')
    spoken = []
    if os.path.exists(plan_path):
        with open(plan_path, encoding='utf-8') as f:
            spoken = json.load(f).get('narration', [])
    if narr and spoken:
        missing, off = [], []
        for line in spoken:
            near = [q for q in cues if q['end'] > line['start'] - 0.6 and q['start'] < line['end'] + 0.6]
            have = set(w for q in near for w in words(q['text']))
            need = words(line['text'])
            cover = sum(1 for w in need if w in have) / max(len(need), 1)
            if cover < 0.9:
                missing.append(f"{line['scene']}: {cover:.0%} of the spoken words are captioned")
            if near and abs(near[0]['start'] - line['start']) > QA['caption_sync_max_s']:
                off.append(f"{line['scene']}: caption at {near[0]['start']:.2f}s, speech at {line['start']:.2f}s")
            if near and near[-1]['end'] < line['end'] - 0.6:
                off.append(f"{line['scene']}: caption leaves at {near[-1]['end']:.2f}s, speech ends {line['end']:.2f}s")
        c.ok('Every spoken line is captioned', not missing, '; '.join(missing) or f'{len(spoken)} narration lines covered')
        c.ok('Captions are in sync with speech', not off, '; '.join(off) or f"within {QA['caption_sync_max_s']}s of each line")
    elif narr:
        c.add('Every spoken line is captioned', 'SKIP', 'narration is written but the audio has not been built')
    else:
        c.add('Every spoken line is captioned', 'SKIP', 'no narration: captions carry the message on their own')

    script_path = os.path.join(pdir, 'script.md')
    issues = []
    for i, q in enumerate(cues):
        ws = q['text'].split()
        if '  ' in q['text'] or any(a.lower() == b.lower() for a, b in zip(ws, ws[1:])):
            issues.append(f'cue {i + 1}: doubled word or space')
    if os.path.exists(script_path):
        with open(script_path, encoding='utf-8') as f:
            approved = set(words(f.read()))
        for i, q in enumerate(cues):
            unknown = [w for w in words(q['text']) if w not in approved]
            if unknown:
                issues.append(f"cue {i + 1}: not in the approved script: {', '.join(unknown)}")
        c.ok('Caption wording matches the approved script', not issues, '; '.join(issues) or 'every caption word appears in script.md; no doubled words')
    else:
        c.add('Caption wording matches the approved script', 'FAIL', 'script.md missing')
    c.add('Dictionary spell check', 'SKIP', 'no spelling dictionary is installed; wording is checked against the approved script instead, so the script itself needs a human read')

    path = target_file(project, file)
    lay = layout_for(path) if path else None
    if lay and lay.get('captions_burned'):
        l, t, r_, b = lay['safe']
        out = [f"cue at {x['start']:.2f}s {x['box']}" for x in lay['caption_boxes'] if x['box'][0] < l or x['box'][2] > r_ or x['box'][3] > b + 1 or x['box'][1] < lay['height'] * 0.5]
        c.ok('Burned-in captions sit in the lower safe area', not out, '; '.join(out) or f"{len(lay['caption_boxes'])} caption boxes checked")
        sched = lay['schedule']
        clash = []
        for x in lay['caption_boxes']:
            scene = next((s['id'] for s in sched if s['start'] <= x['start'] < s['end']), None)
            for tb in lay['text']:
                if tb['scene'] == scene and not (tb['box'][2] <= x['box'][0] or tb['box'][0] >= x['box'][2] or tb['box'][3] <= x['box'][1] or tb['box'][1] >= x['box'][3]):
                    clash.append(f"{scene}: caption at {x['start']:.2f}s covers {tb['role']}")
        heights = sorted({x['box'][3] - x['box'][1] for x in lay['caption_boxes']})
        line_h = heights[0] if heights else 0
        tall = [f"cue at {x['start']:.2f}s" for x in lay['caption_boxes'] if line_h and (x['box'][3] - x['box'][1]) > line_h * 2.4]
        wide = [f"cue at {x['start']:.2f}s ({x['box'][2] - x['box'][0]} px)" for x in lay['caption_boxes'] if (x['box'][2] - x['box'][0]) > (r_ - l) * 0.86 + 60]
        c.ok('Burned-in captions keep to two lines and the caption width', not tall and not wide, '; '.join(tall + wide) or 'measured on the boxes the renderer drew, which break lines where the .srt does')
        c.ok('Captions do not cover other text', not clash, '; '.join(sorted(set(clash))) or 'no overlaps with titles, cards or credits')
    else:
        c.add('Burned-in caption position', 'SKIP', 'captions are not burned into this render (sidecar files only)')

    model = sorted(glob.glob(os.path.join(VIDEO_DIR, 'models', 'ggml-*.bin')))
    if not model:
        c.add('Speech recognition cross-check (Whisper)', 'SKIP', 'no Whisper model in video/models; see the installation guide')
    elif not spoken or not path:
        c.add('Speech recognition cross-check (Whisper)', 'SKIP', 'nothing spoken to transcribe')
    else:
        out_txt = os.path.join(pdir, 'reports', 'whisper-transcript.txt')
        rel_model = os.path.relpath(model[-1]).replace('\\', '/')
        rel_out = os.path.relpath(out_txt).replace('\\', '/')
        r = run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-af', f'whisper=model={rel_model}:language=en:queue=10:destination={rel_out}:format=text', '-f', 'null', '-'])
        if r.returncode != 0 or not os.path.exists(out_txt):
            c.add('Speech recognition cross-check (Whisper)', 'WARN', 'whisper filter failed: ' + r.stderr.strip()[:200])
        else:
            with open(out_txt, encoding='utf-8', errors='replace') as f:
                heard = set(words(f.read()))
            need = [w for l in spoken for w in words(l['text'])]
            cover = sum(1 for w in need if w in heard) / max(len(need), 1)
            c.ok('Speech recognition cross-check (Whisper)', cover >= 0.8, f'{cover:.0%} of the scripted words were recognised in the audio', fail='WARN')
    return c, {'cues': len(cues)}


# ---------- facts ----------
PRODUCT_NAMES = ['gta 6 hq', 'gta 6', 'gta vi', 'grand theft auto vi', 'webview2', '16:9', '9:16', '1:1']


def load_claims(pdir):
    path = os.path.join(pdir, 'claims.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f).get('claims', [])


def verify_evidence(ev, pdir):
    """Re-check a claim against the repository. Returns (ok, detail)."""
    kind = ev.get('type')
    path = os.path.join(REPO_DIR, ev.get('file', ''))
    if kind in ('file_exists', 'text_in_file', 'json_count') and not os.path.exists(path):
        return False, f"{ev.get('file')} does not exist"
    if kind == 'file_exists':
        return True, f"{ev['file']} exists"
    if kind == 'text_in_file':
        with open(path, encoding='utf-8', errors='replace') as f:
            found = ev['needle'].lower() in f.read().lower()
        return found, f"\"{ev['needle']}\" {'found' if found else 'NOT found'} in {ev['file']}"
    if kind == 'json_count':
        with open(path, encoding='utf-8') as f:
            node = json.load(f)
        for key in [k for k in ev.get('path', '').split('.') if k]:
            node = node[int(key)] if isinstance(node, list) else node[key]
        if ev.get('where'):
            k, val = ev['where']
            node = [x for x in (node.values() if isinstance(node, dict) else node) if x.get(k) == val]
        n = len(node)
        ok = n >= ev['at_least'] if 'at_least' in ev else n == ev['equals']
        return ok, f"{ev['file']} {ev.get('path', '')}: counted {n}, claim needs {'at least ' + str(ev['at_least']) if 'at_least' in ev else ev['equals']}"
    if kind == 'observed':
        return True, 'observed directly: ' + ev.get('note', '')
    return False, f'unknown evidence type {kind}'


def facts(project, file=None):
    c = Checks()
    pdir = project['_dir']
    claims = load_claims(pdir)
    c.ok('Research notes exist', os.path.exists(os.path.join(pdir, 'research.md')), 'research.md')
    if claims is None:
        c.add('Claims register exists', 'FAIL', 'claims.json missing')
        return c, {}
    c.add('Claims register exists', 'PASS', f'{len(claims)} claims')
    ids = {cl['id'] for cl in claims}
    incomplete = [cl.get('id', '?') for cl in claims if not all(cl.get(k) for k in ('id', 'text', 'kind', 'source'))]
    c.ok('Every claim has text, kind and source', not incomplete, ', '.join(incomplete) or 'complete')
    kinds = [cl['id'] for cl in claims if cl.get('kind') not in ('fact', 'speculation', 'opinion', 'quote')]
    c.ok('Every claim is marked fact, speculation, opinion or quote', not kinds, ', '.join(kinds) or 'marked')
    failed, rows = [], []
    for cl in claims:
        if cl.get('kind') == 'fact':
            if not cl.get('evidence'):
                failed.append(f"{cl['id']}: a fact with no evidence to re-check")
                rows.append((cl, 'no evidence'))
                continue
            ok, detail = verify_evidence(cl['evidence'], pdir)
            rows.append((cl, detail))
            if not ok:
                failed.append(f"{cl['id']}: {detail}")
        else:
            rows.append((cl, 'not a fact; must not be stated as one'))
    weak = [cl['id'] for cl in claims if cl.get('kind') == 'fact' and (cl.get('evidence') or {}).get('type') in ('file_exists', 'observed')]
    n_facts = sum(1 for cl in claims if cl.get('kind') == 'fact')
    c.ok('Every fact re-checked against its source', not failed, '; '.join(failed) or f"{n_facts - len(weak)} of {n_facts} facts verified now by wording or count, against the files in this repository")
    if weak:
        c.add('Facts whose wording was not machine-checked', 'WARN', ', '.join(weak) + ': evidence is only that a file exists or that someone observed it; a person must confirm these')
    by_id = {cl['id']: cl for cl in claims}
    unsourced, spec_used, bad_numbers, quotes, unknown = [], [], [], [], []
    for s in project['scenes']:
        texts = scene_texts(s)
        refs = s.get('claims', [])
        unknown += [f"{s['id']}: {r}" for r in refs if r not in ids]
        if texts and not refs and not s.get('no_claims'):
            unsourced.append(s['id'])
        spec_used += [f"{s['id']}: {r}" for r in refs if r in by_id and by_id[r]['kind'] == 'speculation' and not s.get('labelled_speculation')]
        support = ' '.join(by_id[r]['text'] + ' ' + json.dumps(by_id[r].get('evidence', {})) for r in refs if r in by_id).lower()
        for role, text in texts:
            low = text.lower()
            for name in PRODUCT_NAMES:
                low = low.replace(name, ' ')
            for num in re.findall(r'\d[\d,]*', low):
                if num.replace(',', '') not in support.replace(',', ''):
                    bad_numbers.append(f"{s['id']} {role}: {num}")
            for q in re.findall(r'[“"]([^”"]{12,})[”"]', text):
                if not any(by_id[r]['kind'] == 'quote' for r in refs if r in by_id):
                    quotes.append(f"{s['id']} {role}: {q[:40]}")
    c.ok('Scenes cite only claims that exist', not unknown, ', '.join(unknown) or 'all references resolve')
    c.ok('Every scene with wording cites its claims', not unsourced, ', '.join(unsourced) or 'each scene lists claims, or is marked no_claims (branding or credits only)')
    c.ok('Speculation is never shown as fact', not spec_used, ', '.join(spec_used) or 'no speculation used on screen')
    c.ok('Every number on screen is backed by a cited claim', not bad_numbers, '; '.join(bad_numbers) or 'all numbers trace to a claim')
    c.ok('No unsourced quotations', not quotes, '; '.join(quotes) or 'no quotations used')
    return c, {'rows': rows}


# ---------- script ----------
def script(project, file=None):
    c = Checks()
    pdir = project['_dir']
    path = os.path.join(pdir, 'script.md')
    if not os.path.exists(path):
        c.add('Script exists', 'FAIL', 'script.md missing')
        return c, {}
    with open(path, encoding='utf-8') as f:
        text = f.read()
    c.add('Script exists', 'PASS', f'{len(words(text))} words')
    flat = ' '.join(words(text))
    missing = [s['id'] for s in project['scenes'] if not re.search(r'\b' + re.escape(s['id']) + r'\b', text)]
    c.ok('Script covers every scene', not missing, ', '.join(missing) or f"{len(project['scenes'])} scenes")
    drift = []
    for s in project['scenes']:
        for role, t in scene_texts(s):
            if role.startswith('stat') or role == 'badge':
                continue
            if ' '.join(words(t)) not in flat:
                drift.append(f"{s['id']} {role}")
    c.ok('On-screen and spoken wording is the approved script wording', not drift, ', '.join(drift) or 'every title, caption, card and narration line appears in script.md')
    sched = {s['id']: s for s in timeline.schedule(project)}
    fast, crowded = [], []
    for s in project['scenes']:
        dur = float(s['duration'])
        if s.get('narration'):
            wpm = len(words(s['narration'])) / max(dur - float(s.get('narration_at', 0.5)), 0.1) * 60
            if wpm > QA['narration_wpm_max']:
                fast.append(f"{s['id']}: {wpm:.0f} words a minute")
        read = sum(len(words(t)) for role, t in scene_texts(s) if role not in ('narration', 'badge') and not role.startswith('caption'))
        clear = dur
        if s['type'] == 'credits':                       # only the time the credits are fully on screen counts
            clear = dur - 1.0 - (float(project['meta'].get('fade_out', 0.6)) if s is project['scenes'][-1] else 0)
        if read / max(clear, 0.1) > (5.5 if s['type'] == 'credits' else 4.0):
            crowded.append(f"{s['id']}: {read} words in {clear:.1f}s of clear screen time")
    c.ok('Narration pace', not fast, '; '.join(fast) or f"no line needs more than {QA['narration_wpm_max']} words a minute")
    c.ok('On-screen text can be read in the time given', not crowded, '; '.join(crowded) or 'at most 4 words a second in every scene; credits at most 5.5 a second, counting only the time they are fully on screen')
    meta = project['meta']
    shown = ' '.join(t for s in project['scenes'] for _, t in scene_texts(s)).lower()
    for phrase in meta.get('must_say', []):
        c.ok(f'Says "{phrase}"', phrase.lower() in shown, 'present on screen or in narration' if phrase.lower() in shown else 'MISSING from the video')
    banned = [p for p in meta.get('must_not_say', []) if p.lower() in shown]
    c.ok('No banned wording', not banned, ', '.join(banned) or (', '.join(meta.get('must_not_say', [])) + ' absent' if meta.get('must_not_say') else 'no banned list set'))
    return c, {}


# ---------- storyboard ----------
def storyboard(project, file=None):
    c = Checks()
    pdir = project['_dir']
    path = os.path.join(pdir, 'storyboard.md')
    if not os.path.exists(path):
        c.add('Storyboard exists', 'FAIL', 'storyboard.md missing')
        return c, {}
    with open(path, encoding='utf-8') as f:
        text = f.read()
    rows = {}
    for line in text.split('\n'):
        cells = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(cells) >= 3 and re.fullmatch(r's\d+[a-z]?', cells[0]):
            rows[cells[0]] = cells
    ids = [s['id'] for s in project['scenes']]
    c.add('Storyboard exists', 'PASS', f'{len(rows)} shots')
    c.ok('Every scene has a storyboard row', not [i for i in ids if i not in rows], ', '.join(i for i in ids if i not in rows) or 'all present')
    c.ok('No storyboard row without a scene', not [i for i in rows if i not in ids], ', '.join(i for i in rows if i not in ids) or 'none')
    order = [i for i in rows if i in ids]
    c.ok('Shots are in the same order as the edit', order == [i for i in ids if i in rows], 'same order' if order == [i for i in ids if i in rows] else 'order differs')
    wrong = []
    for s in project['scenes']:
        cells = rows.get(s['id'])
        if cells:
            nums = [float(x) for cell in cells[1:] for x in re.findall(r'(\d+(?:\.\d+)?)\s*s\b', cell)]
            if not nums or abs(nums[0] - float(s['duration'])) > 0.05:
                wrong.append(f"{s['id']}: storyboard {nums[0] if nums else 'no time'}, edit {float(s['duration'])}")
            if s.get('src') and os.path.basename(s['src']) not in ' '.join(cells):
                wrong.append(f"{s['id']}: storyboard does not name {os.path.basename(s['src'])}")
    c.ok('Durations and footage match the edit', not wrong, '; '.join(wrong) or 'each row gives the scene length and names its footage')
    m = re.search(r'Total running time:\s*([\d.]+)\s*s', text)
    total = timeline.total_duration(project)
    c.ok('Stated running time matches', bool(m) and abs(float(m.group(1)) - total) <= 0.1, f"storyboard says {m.group(1) if m else 'nothing'}, edit runs {total:.2f}s")
    return c, {}


# ---------- licences ----------
FIELDS = ['file', 'kind', 'source', 'creator', 'licence', 'attribution', 'permission', 'commercial_use', 'rights_status']
STATUSES = {'owned': 'made for this project; the owner holds the rights', 'licensed': 'used under a stated licence',
            'permission': 'used with recorded permission', 'system': 'part of the operating system or a tool, used under its licence',
            'uncleared': 'third-party material with no licence or permission'}


def licence(project, file=None):
    c = Checks()
    pdir = project['_dir']
    path = os.path.join(pdir, 'assets.json')
    if not os.path.exists(path):
        c.add('Asset register exists', 'FAIL', 'assets.json missing')
        return c, {}
    with open(path, encoding='utf-8') as f:
        assets = json.load(f).get('assets', [])
    c.add('Asset register exists', 'PASS', f'{len(assets)} assets')
    listed = {a.get('file', '').replace('\\', '/') for a in assets}
    used = set(f.replace('\\', '/') for f in timeline.referenced_files(project))
    for sub in ('footage', 'audio', 'images'):
        for p in glob.glob(os.path.join(pdir, sub, '*')):
            if os.path.isfile(p) and not p.endswith(('.json', '.ps1', '.txt')):
                used.add(os.path.relpath(p, pdir).replace('\\', '/'))
    unlisted = sorted(used - listed)
    c.ok('Every file used is in the register', not unlisted, ', '.join(unlisted) or f'{len(used)} files used, all registered')
    blank = [a.get('file', '?') for a in assets if any(not str(a.get(k, '')).strip() or 'TODO' in str(a.get(k, '')) for k in FIELDS)]
    c.ok('Every record is complete', not blank, ', '.join(blank) or 'source, creator, licence, attribution, permission, commercial limits and status all filled in')
    bad_status = [a['file'] for a in assets if a.get('rights_status') not in STATUSES]
    c.ok('Every record has a recognised rights status', not bad_status, ', '.join(bad_status) or ', '.join(STATUSES))
    stale = []
    for a in assets:
        p = os.path.join(pdir, a['file'])
        if a.get('sha256') and os.path.exists(p) and sha256(p) != a['sha256']:
            stale.append(a['file'])
        elif not os.path.isabs(a['file']) and not a['file'].startswith('(') and not os.path.exists(p):
            stale.append(a['file'] + ' (file missing)')
    c.ok('Recorded checksums match the files', not stale, ', '.join(stale) or 'all match')
    uncleared = [a['file'] for a in assets if a.get('rights_status') == 'uncleared']
    if uncleared:
        c.add('Third-party rights', 'WARN', f"{len(uncleared)} asset(s) contain third-party material with no licence or permission: {', '.join(uncleared)}. "
              'The video is not cleared for public or commercial release until the owner decides; nothing here is legal advice.')
    else:
        c.add('Third-party rights', 'PASS', 'no uncleared third-party material')
    confirm = [f"{a['file']}: {a['confirm']}" for a in assets if a.get('confirm')]
    if confirm:
        c.add('Points the owner must confirm', 'WARN', ' / '.join(confirm))
    return c, {'assets': assets}


AUDITS = {'facts': facts, 'script': script, 'storyboard': storyboard, 'licence': licence,
          'technical': technical, 'visual': visual, 'audio': audio, 'captions': captions}
TITLES = {'facts': 'Research and fact check', 'script': 'Script audit', 'storyboard': 'Storyboard audit', 'licence': 'Asset licence audit',
          'technical': 'Video technical audit', 'visual': 'Visual quality audit', 'audio': 'Audio audit', 'captions': 'Caption audit'}


def verdict(checks):
    statuses = {c['status'] for c in checks}
    return 'FAIL' if 'FAIL' in statuses else 'PASS WITH WARNINGS' if 'WARN' in statuses else 'PASS'


def write_report(project, name, checks, extra):
    pdir = project['_dir']
    rdir = os.path.join(pdir, 'reports')
    os.makedirs(rdir, exist_ok=True)
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    lines = [f'# {TITLES[name]}: {project["meta"]["title"]}', '',
             f'Generated {now} by `python video/studio.py audit {project["_slug"]} --only {name}`. Do not edit by hand.', '',
             f'**Result: {verdict(checks)}** ({sum(1 for c in checks if c["status"] == "PASS")} passed, {sum(1 for c in checks if c["status"] == "FAIL")} failed, '
             f'{sum(1 for c in checks if c["status"] == "WARN")} warnings, {sum(1 for c in checks if c["status"] == "SKIP")} not run)', '']
    if extra.get('file'):
        lines += [f"File inspected: `{os.path.relpath(extra['file'], pdir).replace(chr(92), '/')}`", '']
    lines += ['| Check | Result | Detail |', '|---|---|---|']
    lines += [f"| {c['name']} | {c['status']} | {c['detail'].replace('|', '/').replace(chr(10), ' ')} |" for c in checks]
    if name == 'facts' and extra.get('rows'):
        lines += ['', '## Claims', '', '| Id | Kind | Claim | Source | Re-check |', '|---|---|---|---|---|']
        lines += [f"| {cl['id']} | {cl.get('kind')} | {cl.get('text')} | {cl.get('source')} | {d.replace('|', '/')} |" for cl, d in extra['rows']]
        lines += ['', 'Facts are re-checked by this script every time it runs. Speculation and opinion are listed so they are never mistaken for facts.']
    if name == 'licence' and extra.get('assets'):
        lines += ['', '## Assets', '', '| File | Kind | Source | Creator | Licence | Attribution | Permission | Commercial use | Status |', '|---|---|---|---|---|---|---|---|---|']
        lines += ['| ' + ' | '.join(str(a.get(k, '')).replace('|', '/') for k in FIELDS) + ' |' for a in extra['assets']]
        lines += ['', '## Status meanings', ''] + [f'- `{k}`: {v}' for k, v in STATUSES.items()]
    if name == 'technical' and extra.get('sha256'):
        lines += ['', '## File facts', '', f"- Size: {extra['size_bytes']:,} bytes", f"- SHA-256: `{extra['sha256']}`",
                  f"- {extra['width']}x{extra['height']}, {extra['fps']:g} fps, {extra['duration']:.3f}s, {extra['video_codec']} + {extra['audio_codec']}, {extra['bit_rate'] // 1000} kb/s"]
    with open(os.path.join(rdir, REPORTS[name]), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    result = {'audit': name, 'verdict': verdict(checks), 'generated': now, 'checks': checks,
              'facts': {k: v for k, v in extra.items() if k not in ('rows', 'assets')}}
    with open(os.path.join(rdir, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=1)
    return result


def run_audits(slug, only=None, file=None, quiet=False):
    project = timeline.load(slug)
    results = {}
    for name in ORDER:
        if only and name not in only:
            continue
        checks, extra = AUDITS[name](project, file)
        results[name] = write_report(project, name, checks, extra)
        if not quiet:
            print(f"{name:<11} {results[name]['verdict']}")
            for ch in checks:
                if ch['status'] != 'PASS':
                    print(f"    {ch['status']}: {ch['name']}: {ch['detail'][:220]}")
    return results


def deliver(slug, quiet=False):
    """Run every audit on the final render and write FINAL-DELIVERY-REPORT.md. Delivery passes only with no FAIL."""
    project = timeline.load(slug)
    pdir = project['_dir']
    finals = sorted(glob.glob(os.path.join(pdir, 'renders', '*-final.mp4')), key=os.path.getmtime)
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    lines = [f'# Final delivery report: {project["meta"]["title"]}', '', f'Generated {now} by `python video/studio.py deliver {slug}`. Do not edit by hand.', '']
    if not finals:
        lines += ['**Result: NOT DELIVERED.** There is no final render; only previews exist.']
        ok = False
    else:
        results = run_audits(slug, file=finals[-1], quiet=True)
        ok = all(r['verdict'] != 'FAIL' for r in results.values())
        tech = results['technical']['facts']
        lines += [f"**Result: {'DELIVERED' if ok else 'NOT DELIVERED'}**" + ('' if ok else ' (at least one audit failed)'), '',
                  '## The file', '', f"- `{os.path.relpath(finals[-1], pdir).replace(chr(92), '/')}`",
                  f"- {tech.get('width')}x{tech.get('height')}, {tech.get('fps', 0):g} fps, {tech.get('duration', 0):.2f}s, {tech.get('video_codec')} + {tech.get('audio_codec')}",
                  f"- {tech.get('size_bytes', 0):,} bytes, SHA-256 `{tech.get('sha256')}`", '',
                  '## Audits', '', '| Audit | Result | Passed | Failed | Warnings | Not run | Report |', '|---|---|---|---|---|---|---|']
        for name in ORDER:
            r = results[name]
            n = lambda s: sum(1 for ch in r['checks'] if ch['status'] == s)
            lines.append(f"| {TITLES[name]} | {r['verdict']} | {n('PASS')} | {n('FAIL')} | {n('WARN')} | {n('SKIP')} | `reports/{REPORTS[name]}` |")
        for status, title in (('FAIL', 'Failures'), ('WARN', 'Warnings that need a human decision'), ('SKIP', 'Checks that could not be run')):
            items = [f"- **{TITLES[name]}**, {ch['name']}: {ch['detail']}" for name in ORDER for ch in results[name]['checks'] if ch['status'] == status]
            lines += ['', f'## {title}', ''] + (items or ['None.'])
        others = [f for f in finals[:-1]]
        if others:
            lines += ['', '## Other final renders in the folder', ''] + [f"- `{os.path.relpath(f, pdir).replace(chr(92), '/')}` (audit it with `--file`)" for f in others]
        extras = sorted(glob.glob(os.path.join(pdir, 'captions', '*')))
        lines += ['', '## Delivered with it', ''] + [f"- `{os.path.relpath(f, pdir).replace(chr(92), '/')}`" for f in extras]
        lines += ['', 'What these audits cannot judge: whether the video is good, whether the music suits it, and whether colours and motion feel right. A person should watch it once before it is published.']
    os.makedirs(os.path.join(pdir, 'reports'), exist_ok=True)
    with open(os.path.join(pdir, 'reports', 'FINAL-DELIVERY-REPORT.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    if not quiet:
        print(('DELIVERED' if ok else 'NOT DELIVERED') + f': see {os.path.join(pdir, "reports", "FINAL-DELIVERY-REPORT.md")}')
    return ok

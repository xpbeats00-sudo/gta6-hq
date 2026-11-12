"""Command line for the studio. Run `python video/studio.py <command> --help`."""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys

from . import timeline
from .config import FORMATS, KINDS, PRODUCTIONS, TEMPLATES, VIDEO_DIR, production_dir


def cmd_doctor(a):
    """Report what is installed and connected. Prints facts only; never claims a tool that is absent."""
    rows = []

    def tool(name, args, need=True):
        exe = shutil.which(args[0])
        if not exe:
            rows.append((name, 'MISSING' if need else 'not installed', ''))
            return False
        out = subprocess.run(args, capture_output=True, text=True).stdout.strip().split('\n')[0]
        rows.append((name, 'ok', out[:70]))
        return True

    tool('ffmpeg', ['ffmpeg', '-version'])
    tool('ffprobe', ['ffprobe', '-version'])
    tool('node', ['node', '--version'])
    tool('python', [sys.executable, '--version'])
    tool('gh (GitHub CLI)', ['gh', '--version'], need=False)
    enc = subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True).stdout
    fil = subprocess.run(['ffmpeg', '-hide_banner', '-filters'], capture_output=True, text=True).stdout
    rows.append(('ffmpeg libx264', 'ok' if 'libx264' in enc else 'MISSING', ''))
    rows.append(('ffmpeg h264_nvenc (GPU)', 'listed' if 'h264_nvenc' in enc else 'not available', 'test it with a real encode before relying on it'))
    for f in ('loudnorm', 'ebur128', 'blackdetect', 'freezedetect', 'silencedetect', 'whisper', 'flite'):
        rows.append((f'ffmpeg filter {f}', 'ok' if f' {f} ' in fil else 'MISSING', ''))
    for mod in ('PIL', 'numpy'):
        try:
            __import__(mod)
            rows.append((f'python {mod}', 'ok', ''))
        except ImportError:
            rows.append((f'python {mod}', 'MISSING', 'required by the renderer'))
    try:
        __import__('websockets')
        rows.append(('python websockets', 'ok', 'needed only to film the app'))
    except ImportError:
        rows.append(('python websockets', 'not installed', 'needed only to film the app'))
    for font in (r'C:\Windows\Fonts\bahnschrift.ttf', r'C:\Windows\Fonts\segoeui.ttf'):
        rows.append((os.path.basename(font), 'ok' if os.path.exists(font) else 'MISSING', ''))
    rows.append(('Remotion', 'installed' if os.path.isdir(os.path.join(VIDEO_DIR, 'remotion', 'node_modules', 'remotion')) else 'not installed',
                 'optional second renderer; scaffold in video/remotion'))
    rows.append(('Whisper model', 'present' if glob.glob(os.path.join(VIDEO_DIR, 'models', 'ggml-*.bin')) else 'not downloaded', 'video/models/ggml-base.en.bin'))
    env = {}
    env_path = os.path.join(VIDEO_DIR, '.env')
    if os.path.exists(env_path):
        with open(env_path, encoding='utf-8') as f:
            env = dict(l.strip().split('=', 1) for l in f if '=' in l and not l.lstrip().startswith('#'))
    for key, what in (('ELEVENLABS_API_KEY', 'ElevenLabs voice'), ('RUNWAYML_API_SECRET', 'Runway AI footage')):
        have = bool(os.environ.get(key) or env.get(key, '').strip())
        rows.append((what, 'key set (not tested)' if have else 'not connected', f'{key} in video/.env'))
    free = shutil.disk_usage(VIDEO_DIR).free / 1e9
    rows.append(('free disk space', 'ok' if free > 5 else 'LOW', f'{free:.0f} GB'))
    w = max(len(r[0]) for r in rows)
    for name, state, note in rows:
        print(f'{name:<{w}}  {state:<20} {note}')
    return 1 if any(s == 'MISSING' for _, s, _ in rows) else 0


def cmd_templates(a):
    from . import templates
    os.makedirs(TEMPLATES, exist_ok=True)
    for kind in KINDS:
        for fmt in FORMATS:
            with open(os.path.join(TEMPLATES, f'{kind}.{fmt}.json'), 'w', encoding='utf-8') as f:
                json.dump(templates.make(kind, f'{kind.replace("-", " ").title()} template', fmt), f, indent=1)
    print(f'{len(KINDS) * len(FORMATS)} templates written to {TEMPLATES}')


def cmd_new(a):
    from . import templates
    pdir = production_dir(a.slug)
    if os.path.exists(pdir):
        print(f'{pdir} already exists; choose another name')
        return 1
    project = templates.make(a.kind, a.title or a.slug.replace('-', ' ').title(), a.format)
    for sub in ('footage', 'audio', 'captions', 'renders', 'reports', 'images'):
        os.makedirs(os.path.join(pdir, sub))
    with open(os.path.join(pdir, 'project.json'), 'w', encoding='utf-8') as f:
        json.dump({k: v for k, v in project.items() if k != 'audio'}, f, indent=1)
    with open(os.path.join(pdir, 'audio.json'), 'w', encoding='utf-8') as f:
        json.dump(project.get('audio', {}), f, indent=1)
    project['_dir'] = pdir
    sched = timeline.schedule(project)
    sections, rows = [], []
    for s, sc in zip(project['scenes'], sched):
        from .audits import scene_texts
        lines = [t for role, t in scene_texts(s) if role != 'badge']
        sections.append(f"## {s['id']} ({s['type']}, {s['duration']} s)\n\n" + '\n'.join(f'- {t}' for t in lines) + '\n')
        rows.append(f"| {s['id']} | {s['type']} | {float(s['duration'])} s | {lines[0] if lines else ''} | {sc['transition']} |")
    for name, body in templates.STARTERS.items():
        with open(os.path.join(pdir, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(body.format(title=project['meta']['title'], script_sections='\n'.join(sections), storyboard_rows='\n'.join(rows), total=f'{sched[-1]["end"]:.1f}'))
    print(f'new {a.kind} production at {pdir}\nnext: python video/studio.py audio {a.slug}  then  python video/studio.py render {a.slug} --preview')


def refresh_checksums(slug):
    """Update the checksum of files already in assets.json (never adds or changes any other field)."""
    from .audits import sha256
    path = os.path.join(production_dir(slug), 'assets.json')
    if not os.path.exists(path):
        return
    data = json.load(open(path, encoding='utf-8'))
    changed = 0
    for x in data.get('assets', []):
        p = os.path.join(production_dir(slug), x['file'])
        if os.path.isfile(p) and x.get('sha256') and sha256(p) != x['sha256']:
            x['sha256'] = sha256(p)
            changed += 1
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=1)
        print(f'assets.json: {changed} checksum(s) updated for rebuilt files')


def cmd_audio(a):
    from . import audio
    audio.build(a.slug)
    refresh_checksums(a.slug)


def cmd_captions(a):
    from . import captions
    captions.write(a.slug)


def cmd_render(a):
    from . import render
    mode = 'final' if a.final else 'preview'
    if mode == 'final' and not a.force:
        project = timeline.load(a.slug)
        fmt = a.format or project['meta'].get('format', '16x9')
        if not glob.glob(os.path.join(project['_dir'], 'renders', f'{a.slug}-{fmt}-preview.mp4')):
            print(f'no {fmt} preview render yet. Render and check a preview first (--preview), or pass --force.')
            return 1
    render.render(a.slug, mode=mode, fmt=a.format, burn_captions=False if a.no_captions else None)


def cmd_audit(a):
    from . import audits
    results = audits.run_audits(a.slug, only=a.only.split(',') if a.only else None, file=a.file)
    return 1 if any(r['verdict'] == 'FAIL' for r in results.values()) else 0


def cmd_deliver(a):
    from . import audits
    return 0 if audits.deliver(a.slug) else 1


def cmd_assets(a):
    """Add any used but unregistered file to assets.json with TODO fields, and refresh checksums."""
    from .audits import sha256
    project = timeline.load(a.slug)
    pdir = project['_dir']
    path = os.path.join(pdir, 'assets.json')
    data = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {'assets': []}
    known = {x['file'] for x in data['assets']}
    used = set(timeline.referenced_files(project))
    for sub in ('footage', 'audio', 'images'):
        used |= {os.path.relpath(p, pdir).replace('\\', '/') for p in glob.glob(os.path.join(pdir, sub, '*')) if os.path.isfile(p) and not p.endswith(('.json', '.ps1', '.txt'))}
    added = 0
    for f in sorted(used - known):
        data['assets'].append({'file': f, 'kind': 'TODO', 'source': 'TODO', 'creator': 'TODO', 'licence': 'TODO', 'attribution': 'TODO',
                               'permission': 'TODO', 'commercial_use': 'TODO', 'rights_status': 'TODO'})
        added += 1
    for x in data['assets']:
        p = os.path.join(pdir, x['file'])
        if os.path.isfile(p):
            x['sha256'] = sha256(p)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1)
    print(f'{added} file(s) added with TODO fields; {len(data["assets"])} records, checksums refreshed')


def cmd_beat(a):
    from . import beat
    m = beat.analyse(a.file, start=a.start, duration=a.duration, hint=a.bpm_hint)
    if not m:
        print('too short to analyse')
        return 1
    bar = 240 / m['bpm']
    print(f"tempo {m['bpm']} BPM, first beat {m['phase']:.3f}s after the start point, bar length {bar:.4f}s (analysed {m['seconds_analysed']}s)")
    print('bar lines: ' + ', '.join(f'{m["phase"] % (60 / m["bpm"]) + i * bar:.2f}' for i in range(12)) + ' ...')


PLATFORMS = {
    # name: (format, video bitrate cap or None to copy, max file MB or None, note)
    'youtube': ('16x9', None, None, 'upload the final render as is; attach the .srt as captions'),
    'youtube-shorts': ('9x16', None, None, 'vertical, 3 minutes or less'),
    'instagram-reels': ('9x16', '8M', None, 'vertical'),
    'tiktok': ('9x16', '8M', None, 'vertical'),
    'instagram-feed': ('1x1', '6M', None, 'square'),
    'x': ('16x9', '8M', None, 'landscape'),
    'discord': ('16x9', None, 9.5, 'squeezed under the 10 MB free upload limit'),
    'github-readme': ('16x9', None, 9.5, 'GitHub accepts short mp4 files dragged into a README or issue, 10 MB on free plans'),
}


def cmd_export(a):
    project = timeline.load(a.slug)
    pdir = project['_dir']
    fmt, cap, max_mb, note = PLATFORMS[a.platform]
    src = os.path.join(pdir, 'renders', f'{a.slug}-{fmt}-final.mp4')
    if not os.path.exists(src):
        print(f'{a.platform} needs the {fmt} final render, which does not exist: python video/studio.py render {a.slug} --final --format {fmt}')
        return 1
    os.makedirs(os.path.join(pdir, 'exports'), exist_ok=True)
    dst = os.path.join(pdir, 'exports', f'{a.slug}-{a.platform}.mp4')
    if max_mb:
        dur = timeline.total_duration(project)
        total_kbps = int(max_mb * 8192 / dur)
        v_kbps = max(300, total_kbps - 128 - 20)
        base = ['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{v_kbps}k', '-pix_fmt', 'yuv420p']
        log = os.path.join(pdir, 'exports', 'pass')
        subprocess.run(base + ['-pass', '1', '-passlogfile', log, '-an', '-f', 'null', os.devnull], check=True)
        subprocess.run(base + ['-pass', '2', '-passlogfile', log, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', dst], check=True)
        for f in glob.glob(log + '*'):
            os.remove(f)
    elif cap:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', cap, '-bufsize', cap,
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', dst], check=True)
    else:
        shutil.copyfile(src, dst)
    print(f'{dst}: {os.path.getsize(dst) / 1048576:.2f} MB ({note})\ncheck it: python video/studio.py audit {a.slug} --only technical,audio --file "{dst}"')


def main(argv=None):
    ap = argparse.ArgumentParser(prog='studio.py', description='GTA 6 HQ video studio')
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('doctor', help='list what is installed and connected').set_defaults(fn=cmd_doctor)
    sub.add_parser('templates', help='write the starter templates to video/templates').set_defaults(fn=cmd_templates)
    p = sub.add_parser('new', help='start a production from a template')
    p.add_argument('slug'); p.add_argument('--kind', choices=KINDS, default='game-trailer'); p.add_argument('--format', choices=list(FORMATS), default='16x9'); p.add_argument('--title')
    p.set_defaults(fn=cmd_new)
    for name, fn, text in (('audio', cmd_audio, 'build music, narration, effects and the mix'), ('captions', cmd_captions, 'write the .srt and .vtt files'),
                           ('deliver', cmd_deliver, 'audit the final render and write the delivery report'), ('assets', cmd_assets, 'register used files in assets.json')):
        p = sub.add_parser(name, help=text); p.add_argument('slug'); p.set_defaults(fn=fn)
    p = sub.add_parser('render', help='render a preview (default) or the final file')
    p.add_argument('slug'); p.add_argument('--final', action='store_true'); p.add_argument('--preview', action='store_true')
    p.add_argument('--format', choices=list(FORMATS)); p.add_argument('--no-captions', action='store_true'); p.add_argument('--force', action='store_true', help='final render without a preview')
    p.set_defaults(fn=cmd_render)
    p = sub.add_parser('audit', help='run the audits and write the reports')
    p.add_argument('slug'); p.add_argument('--only', help='comma list: facts,script,storyboard,licence,technical,visual,audio,captions'); p.add_argument('--file', help='inspect this file instead of the newest render')
    p.set_defaults(fn=cmd_audit)
    p = sub.add_parser('beat', help='measure the tempo and beat phase of a music file')
    p.add_argument('file'); p.add_argument('--start', type=float, default=0.0); p.add_argument('--duration', type=float); p.add_argument('--bpm-hint', type=float)
    p.set_defaults(fn=cmd_beat)
    p = sub.add_parser('export', help='make a platform copy of a final render')
    p.add_argument('slug'); p.add_argument('--platform', choices=list(PLATFORMS), required=True); p.set_defaults(fn=cmd_export)
    a = ap.parse_args(argv)
    return a.fn(a) or 0

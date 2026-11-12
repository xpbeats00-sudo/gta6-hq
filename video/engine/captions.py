"""Caption files (SRT and WebVTT) written from the project's own timing, and an SRT parser for the audit."""
import os
import re

from . import timeline


def stamp(t, sep=','):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}{sep}{ms % 1000:03d}'


def split_lines(text, max_chars=42):
    """Break a caption into at most two balanced lines."""
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        score = abs(len(a) - len(b)) + (1000 if max(len(a), len(b)) > max_chars else 0)
        if best is None or score < best[0]:
            best = (score, [a, b])
    return best[1]


def write(slug, quiet=False):
    project = timeline.load(slug)
    cues = timeline.captions(project)
    cdir = os.path.join(project['_dir'], 'captions')
    os.makedirs(cdir, exist_ok=True)
    srt, vtt = [], ['WEBVTT', '']
    for i, c in enumerate(cues, 1):
        body = '\n'.join(split_lines(c['text']))
        srt += [str(i), f"{stamp(c['start'])} --> {stamp(c['end'])}", body, '']
        vtt += [f"{stamp(c['start'], '.')} --> {stamp(c['end'], '.')}", body, '']
    paths = []
    for name, lines in ((f'{slug}.srt', srt), (f'{slug}.vtt', vtt)):
        path = os.path.join(cdir, name)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(lines))
        paths.append(path)
    if not quiet:
        print(f'{len(cues)} captions -> {paths[0]} and .vtt')
    return paths


def parse_srt(path):
    with open(path, encoding='utf-8') as f:
        blocks = re.split(r'\n\s*\n', f.read().strip())
    cues = []
    for b in blocks:
        lines = b.strip().split('\n')
        if len(lines) < 2:
            continue
        m = re.match(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', lines[1])
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        cues.append({'start': g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000, 'end': g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000,
                     'lines': lines[2:], 'text': ' '.join(lines[2:])})
    return cues

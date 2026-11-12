"""Project loading and timing: where each scene, transition and caption falls on the clock."""
import json
import os
import re

from .config import production_dir


def load(slug):
    path = os.path.join(production_dir(slug), 'project.json')
    with open(path, encoding='utf-8') as f:
        project = json.load(f)
    audio = os.path.join(production_dir(slug), 'audio.json')     # the audio engineer's own file
    if os.path.exists(audio):
        with open(audio, encoding='utf-8') as f:
            project['audio'] = json.load(f)
    from . import beat
    beat.apply_grid(project)                                    # until_bar -> duration
    project['_dir'] = production_dir(slug)
    project['_slug'] = slug
    return project


def schedule(project):
    """Return scenes with absolute start/end. A scene's `transition` is how it hands over to the next
    scene; the two overlap for the transition's duration (so transitions shorten the total)."""
    out, clock = [], 0.0
    scenes = project['scenes']
    for i, s in enumerate(scenes):
        tr = s.get('transition') or {'type': 'cut', 'duration': 0}
        dur_tr = float(tr.get('duration', 0)) if tr.get('type', 'cut') != 'cut' and i < len(scenes) - 1 else 0.0
        out.append({'id': s['id'], 'index': i, 'start': clock, 'end': clock + float(s['duration']),
                    'transition': tr.get('type', 'cut') if dur_tr else 'cut', 'transition_duration': dur_tr})
        clock += float(s['duration']) - dur_tr
    return out


def total_duration(project):
    return schedule(project)[-1]['end']


def _chunks(text, limit=80):
    """Split narration into caption-sized pieces at punctuation, then at spaces."""
    parts, cur = [], ''
    for piece in re.findall(r'[^,;.!?]+[,;.!?]*\s*', text):
        for word in ([piece] if len(piece) <= limit else [w + ' ' for w in piece.split()]):
            if len((cur + word).strip()) > limit and cur.strip():
                parts.append(cur.strip())
                cur = ''
            cur += word
    if cur.strip():
        parts.append(cur.strip())
    return parts


def captions(project):
    """Captions with absolute times. A scene may carry `captions: [{at, duration, text}]`
    (times from the scene's start) or a single `caption` shown for most of the scene.
    A narrated scene with neither is captioned from its narration, timed to the recorded
    line when the audio has been built (audio/mix-plan.json) and estimated otherwise."""
    cues = []
    times = {s['id']: s for s in schedule(project)}
    spoken = {}
    plan = os.path.join(project.get('_dir', ''), 'audio', 'mix-plan.json')
    if os.path.exists(plan):
        with open(plan, encoding='utf-8') as f:
            spoken = {n['scene']: n for n in json.load(f).get('narration', [])}
    for s in project['scenes']:
        sch = times[s['id']]
        items = list(s.get('captions', []))
        if s.get('caption'):
            lead = 0.4 if sch['index'] else 0.3
            items.append({'at': lead, 'duration': float(s['duration']) - lead - max(0.3, sch['transition_duration']), 'text': s['caption']})
        if s.get('narration') and not items:
            at = float(s.get('narration_at', 0.5))
            line = spoken.get(s['id'])
            length = (line['end'] - line['start']) if line and line['text'] == s['narration'] else len(s['narration'].split()) / 2.6
            parts = _chunks(s['narration'])
            total_chars = sum(len(p) for p in parts)
            clock = at
            for i, p in enumerate(parts):
                d = length * len(p) / total_chars
                last = i == len(parts) - 1
                items.append({'at': clock, 'duration': max(1.0, d + (0.5 if last else 0)) if last else d, 'text': p})
                clock += d
        for c in items:
            start = sch['start'] + float(c['at'])
            cues.append({'scene': s['id'], 'start': round(start, 3), 'end': round(start + float(c['duration']), 3), 'text': c['text'].strip()})
    cues.sort(key=lambda c: c['start'])
    return cues


def narration(project):
    """Narration lines with their planned absolute start times."""
    lines = []
    times = {s['id']: s for s in schedule(project)}
    for s in project['scenes']:
        if s.get('narration'):
            lines.append({'scene': s['id'], 'start': round(times[s['id']]['start'] + float(s.get('narration_at', 0.5)), 3), 'text': s['narration']})
    return lines


def referenced_files(project):
    """Every file the project points at, relative to the production folder."""
    files = []
    for s in project['scenes']:
        for key in ('src', 'bg_image'):
            if s.get(key):
                files.append(s[key])
    audio = project.get('audio', {})
    if (audio.get('music') or {}).get('file'):
        files.append(audio['music']['file'])
    if audio:
        files.append(audio.get('mix', 'audio/mix.wav'))
    return files

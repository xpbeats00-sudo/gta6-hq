"""Beat analysis: measure a track's tempo and beat phase so cuts can be placed on bar lines.

    python video/studio.py beat <audio file> [--bpm-hint 135]

A project opts in with  "meta": {"beat": {"bpm": 135, "first_bar_at": 0.0}}  and gives scenes
"until_bar": N  instead of a fixed duration: the middle of that scene's outgoing transition
then lands exactly on bar N (bars are counted from first_bar_at in video time, four beats each).
"""
import subprocess

import numpy as np

SR = 22050
HOP = 110
WIN = 1024


def onset_envelope(path, start=0.0, duration=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start)]
    if duration:
        cmd += ['-t', str(duration)]
    raw = subprocess.run(cmd + ['-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    if len(x) < SR * 4:
        return None, 0
    idx = np.arange(0, len(x) - WIN, HOP)
    spec = np.abs(np.fft.rfft(np.stack([x[i:i + WIN] for i in idx]) * np.hanning(WIN), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(spec * 50), axis=0)).sum(axis=1)
    return (flux - flux.mean()) / (flux.std() + 1e-9), len(x) / SR


def analyse(path, start=0.0, duration=None, lo=70.0, hi=190.0, hint=None):
    """Return {bpm, phase, score}: phase is the time of the first beat after `start`, in seconds from `start`."""
    flux, length = onset_envelope(path, start, duration)
    if flux is None:
        return None
    fps = SR / HOP

    def score(bpm, phase):
        pos = ((np.arange(phase, length - 0.5, 60 / bpm) - WIN / 2 / SR) * fps).astype(int)
        pos = pos[(pos >= 0) & (pos < len(flux))]
        return float(flux[pos].mean()) if len(pos) else -9

    candidates = np.arange(hint - 1.5, hint + 1.5, 0.01) if hint else np.arange(lo, hi, 0.05)
    best = (-9, 0, 0)
    for bpm in candidates:
        for phase in np.arange(0, 60 / bpm, 0.01):
            v = score(bpm, phase)
            if v > best[0]:
                best = (v, float(bpm), float(phase))
    return {'bpm': round(best[1], 2), 'phase': round(best[2], 3), 'score': round(best[0], 2), 'seconds_analysed': round(length, 1)}


def apply_grid(project):
    """Turn each scene's `until_bar` into a duration so its outgoing cut is centred on that bar line."""
    beat = project.get('meta', {}).get('beat')
    if not beat:
        return
    bar = 240.0 / float(beat['bpm'])
    first = float(beat.get('first_bar_at', 0.0))
    clock = 0.0                                   # start of the current scene
    scenes = project['scenes']
    for i, s in enumerate(scenes):
        tr = s.get('transition') or {}
        tau = float(tr.get('duration', 0)) if tr.get('type', 'cut') != 'cut' and i < len(scenes) - 1 else 0.0
        if 'until_bar' in s:
            cut = first + float(s['until_bar']) * bar
            s['duration'] = round(cut + tau / 2 - clock, 4)
            if s['duration'] <= 0:
                raise ValueError(f"scene {s['id']}: until_bar {s['until_bar']} is before the scene starts")
        clock += float(s['duration']) - tau


def cuts(project, schedule):
    """Cut points in video time: the middle of each transition (or the hard cut)."""
    return [(s['id'], s['end'] - s['transition_duration'] / 2) for s in schedule[:-1]]

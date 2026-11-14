"""Shared constants: paths, output formats, the GTA 6 HQ look, quality thresholds."""
import os

VIDEO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.dirname(VIDEO_DIR)
PRODUCTIONS = os.path.join(VIDEO_DIR, 'productions')
TEMPLATES = os.path.join(VIDEO_DIR, 'templates')

# name -> (width, height). Final renders use these; previews are half size.
FORMATS = {'16x9': (1920, 1080), '9x16': (1080, 1920), '1x1': (1080, 1080)}

KINDS = ['cinematic-trailer', 'documentary', 'game-trailer', 'tutorial', 'explainer',
         'promotional', 'animated-infographic']

# Safe areas as fractions of the frame: (left, top, right, bottom) margins.
# 9x16 keeps clear of the caption and button overlays that short-video apps draw.
SAFE = {'16x9': (0.05, 0.05, 0.05, 0.05), '9x16': (0.06, 0.10, 0.06, 0.16), '1x1': (0.06, 0.06, 0.06, 0.06)}

THEME = {
    'bg_main': (11, 10, 22), 'bg_deep': (8, 7, 19), 'bg_panel': (23, 16, 42), 'bg_raised': (33, 20, 56),
    'sun': (247, 161, 60), 'pink': (238, 63, 124), 'violet': (124, 63, 214),
    'text': (245, 240, 250), 'muted': (176, 166, 198), 'soft': (214, 206, 230),
    'font_display': r'C:\Windows\Fonts\bahnschrift.ttf',
    'font_body': r'C:\Windows\Fonts\segoeui.ttf',
    'font_body_bold': r'C:\Windows\Fonts\segoeuib.ttf',
}
SUNSET = [(0.0, THEME['sun']), (0.52, THEME['pink']), (1.0, THEME['violet'])]

RENDER = {
    'final': {'scale': 1.0, 'fps': 30, 'crf': 18, 'preset': 'medium', 'audio_bitrate': '256k'},
    'preview': {'scale': 0.5, 'fps': 15, 'crf': 28, 'preset': 'veryfast', 'audio_bitrate': '192k'},
}

# Audit thresholds, documented in video/docs/VIDEO-STUDIO-QA-STANDARDS.md.
QA = {
    'loudness_target_lufs': -14.0, 'loudness_tolerance': 1.5, 'true_peak_max_db': -1.0,
    'silence_db': -50, 'silence_max_s': 2.0,
    'black_min_s': 0.5, 'freeze_min_s': 2.0,
    'av_sync_max_s': 0.10, 'duration_tolerance_s': 0.25,
    'caption_min_s': 1.0, 'caption_max_s': 7.0, 'caption_cps_max': 20.0,
    'caption_max_lines': 2, 'caption_max_chars': 42, 'caption_sync_max_s': 0.35,
    'narration_wpm_max': 175, 'music_under_narration_db': 8.0,
    'upscale_warn': 1.3,
}


# Marks that must never appear in a video. Each is cut from a picture already in the repository
# (file relative to the repository root, box = x, y, width, height) and searched for in the render.
FORBIDDEN_MARKS = [
    {'name': 'Rockstar Games logo', 'file': 'images/pier-showdown.jpg', 'box': [1792, 957, 112, 108], 'threshold': 0.64},
]


def production_dir(slug):
    return os.path.join(PRODUCTIONS, slug)

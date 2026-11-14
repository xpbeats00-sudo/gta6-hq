"""Make a still poster for every live wallpaper: wallpapers/posters/<name>.jpg.

    python scripts/make_posters.py

The Media page and Home show the poster and fetch the video only when it is played, instead of
asking every video for its opening frames just to draw a tile. Run this after adding a wallpaper;
a wallpaper without a poster still works, the old way. Needs ffmpeg.
"""
import glob
import os
import subprocess

os.makedirs('wallpapers/posters', exist_ok=True)
made = 0
for video in sorted(glob.glob('wallpapers/*.mp4') + glob.glob('wallpapers/*.webm') + glob.glob('wallpapers/*.mov')):
    out = os.path.join('wallpapers', 'posters', os.path.splitext(os.path.basename(video))[0] + '.jpg')
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(video):
        continue
    # Four seconds in, where the tile used to show the video's own frame; earlier for short clips.
    length = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout or 0)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(min(4, length / 2)), '-i', video, '-frames:v', '1', '-vf', 'scale=640:-2:flags=lanczos', '-q:v', '4', out], check=True)
    made += 1
print(f'{made} posters made, {len(glob.glob("wallpapers/posters/*.jpg"))} in all')

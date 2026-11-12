"""Turn a screen recording into an animated WebP for the GitHub page.

    python scripts/make_animation.py <video> <out.webp> [--start S] [--length S] [--fps N] [--width PX] [--quality Q] [--mask X,Y,W,H]

GitHub pauses GIFs for visitors whose system has animation effects turned off, and shows a
play button. It does not do that to animated WebP, which is also several times smaller, so
the page's animations play for everyone. Needs ffmpeg built with libwebp. Standard library only.
"""
import argparse, os, subprocess

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out')
ap.add_argument('--start', type=float, default=0); ap.add_argument('--length', type=float, default=10)
ap.add_argument('--fps', type=float, default=20); ap.add_argument('--width', type=int, default=860)
ap.add_argument('--quality', type=int, default=68, help='0 smallest file, 100 best picture')
ap.add_argument('--mask', default='', help='black out a rectangle of the source, as X,Y,W,H')
a = ap.parse_args()

mask = ''
if a.mask:
    x, y, w, h = a.mask.split(',')
    mask = f'drawbox=x={x}:y={y}:w={w}:h={h}:color=black:t=fill,'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a.start), '-t', str(a.length), '-i', a.video,
                '-vf', f'{mask}fps={a.fps},scale={a.width}:-2:flags=lanczos',
                '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', str(a.quality), '-compression_level', '5', '-loop', '0', '-an', a.out], check=True)
print(f'{a.out}: {a.length:g} s at {a.fps:g} frames a second, {os.path.getsize(a.out) / 1048576:.1f} MB')

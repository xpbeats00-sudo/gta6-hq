"""Turn a screen recording into an animated SVG for the GitHub page.

    python scripts/make_animation.py <video> <out.svg> [--start S] [--length S] [--fps N] [--width PX] [--mask X,Y,W,H]

GitHub pauses GIFs for visitors whose system has animation effects turned off. An SVG that
steps through a strip of frames is not paused, so it plays for everyone. The frames are one
JPEG embedded in the file; nothing is loaded from elsewhere. Needs ffmpeg. Standard library only.
"""
import argparse, base64, os, subprocess, sys, tempfile

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out')
ap.add_argument('--start', type=float, default=0); ap.add_argument('--length', type=float, default=10)
ap.add_argument('--fps', type=float, default=6); ap.add_argument('--width', type=int, default=800)
ap.add_argument('--quality', type=int, default=7, help='ffmpeg JPEG scale: 2 best, 31 worst')
ap.add_argument('--mask', default='', help='black out a rectangle of the source, as X,Y,W,H')
a = ap.parse_args()

probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', a.video],
                       capture_output=True, text=True, check=True).stdout.strip().split(',')
src_w, src_h = int(probe[0]), int(probe[1])
height = round(a.width * src_h / src_w / 2) * 2
frames = int(a.length * a.fps)
if frames * height > 65000:
    sys.exit(f'{frames} frames of {height}px is taller than a JPEG allows; lower --fps, --length or --width')

mask = ''
if a.mask:
    x, y, w, h = a.mask.split(',')
    mask = f'drawbox=x={x}:y={y}:w={w}:h={h}:color=black:t=fill,'
strip = os.path.join(tempfile.gettempdir(), 'gta6hq-strip.jpg')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a.start), '-t', str(a.length), '-i', a.video,
                '-vf', f'{mask}fps={a.fps},scale={a.width}:{height}:flags=lanczos,tile=1x{frames}', '-frames:v', '1', '-q:v', str(a.quality), strip], check=True)
data = base64.b64encode(open(strip, 'rb').read()).decode('ascii')
os.remove(strip)

total = frames * height
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {a.width} {height}" width="{a.width}" height="{height}">
<style>
@keyframes play {{ to {{ transform: translateY(-{total}px); }} }}
.strip {{ animation: play {frames / a.fps:.2f}s steps({frames}) infinite; }}
</style>
<rect width="{a.width}" height="{height}" fill="#0b0a16"/>
<image class="strip" width="{a.width}" height="{total}" preserveAspectRatio="none" href="data:image/jpeg;base64,{data}"/>
</svg>
'''
open(a.out, 'w', encoding='ascii', newline='\n').write(svg)
print(f'{a.out}: {frames} frames at {a.fps:g} per second, {a.width}x{height}, {os.path.getsize(a.out) / 1048576:.1f} MB')

"""Film a WebView2 app without touching the mouse, over the Chrome DevTools Protocol.

    python video/tools/capture_cdp.py --exe target/release/gta6-hq.exe --plan plan.json --out footage/raw [--port 9333]
        [--args "--demo"] [--width 1920 --height 1080] [--dpr 2]

The app is started with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=N, the page is
recorded with Page.startScreencast, and the plan drives it with JavaScript. Nothing is clicked on the desktop.

Plan: {"clips": [{"name": "home", "steps": [ ... ]}]}. Each clip becomes <out>/<name>.mp4 (30 fps, constant).
A clip with "stepped": true is filmed frame by frame on the page's own clock (virtual time): every frame is
distinct and evenly spaced, so scrolling is smooth. Use it for pages without video; a playing <video> needs
the default real-time capture.
Steps:
  {"wait": 2.5}                        let the page run
  {"hash": "#/wiki"}                   change page inside the app
  {"eval": "document.title"}           run JavaScript
  {"reload": true}                     reload the page (replays the splash)
  {"scroll": 900, "over": 3.0}         smooth scroll to a pixel offset
  {"scroll_to": ".selector", "over": 2}  smooth scroll to an element
  {"record": false} / {"record": true} pause or resume keeping frames (to skip loading)
"""
import argparse
import asyncio
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websockets

SCROLL_JS = """
(() => { const target = %s; const ms = %d; const start = window.scrollY; const t0 = performance.now();
  const el = document.scrollingElement;
  function step() { const p = Math.min(1, (performance.now() - t0) / ms); const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;
    window.scrollTo(0, start + (target - start) * e); if (p < 1) requestAnimationFrame(step); }
  requestAnimationFrame(step); return target; })()
"""


TIMER_SCROLL_JS = """
(() => { const target = %s; const ms = %d; const start = window.scrollY; const t0 = performance.now();
  function step() { const p = Math.min(1, (performance.now() - t0) / ms); const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;
    window.scrollTo(0, start + (target - start) * e); if (p < 1) setTimeout(step, 4); }
  step(); return target; })()
"""


class Session:
    def __init__(self, ws):
        self.ws, self.next_id, self.pending = ws, 0, {}
        self.frames = []            # (timestamp, jpeg bytes)
        self.recording = False
        self.tick = None            # resolved when a virtual-time budget runs out (stepped clips)

    async def send(self, method, **params):
        self.next_id += 1
        fut = asyncio.get_event_loop().create_future()
        self.pending[self.next_id] = fut
        await self.ws.send(json.dumps({'id': self.next_id, 'method': method, 'params': params}))
        return await asyncio.wait_for(fut, 30)

    async def pump(self):
        async for raw in self.ws:
            msg = json.loads(raw)
            if 'id' in msg and msg['id'] in self.pending:
                self.pending.pop(msg['id']).set_result(msg.get('result', msg.get('error')))
            elif msg.get('method') == 'Emulation.virtualTimeBudgetExpired':
                if self.tick and not self.tick.done():
                    self.tick.set_result(True)
            elif msg.get('method') == 'Page.screencastFrame':
                p = msg['params']
                if self.recording:
                    self.frames.append((p['metadata']['timestamp'], base64.b64decode(p['data'])))
                self.next_id += 1
                await self.ws.send(json.dumps({'id': self.next_id, 'method': 'Page.screencastFrameAck', 'params': {'sessionId': p['sessionId']}}))

    async def step_frames(self, seconds, fps=30):
        """Stepped capture: advance the page's clock by exactly one frame, take a picture, repeat.
        Every frame is distinct and evenly spaced, however slow the machine is. For pages without video."""
        for _ in range(int(round(seconds * fps))):
            self.tick = asyncio.get_event_loop().create_future()
            await self.send('Emulation.setVirtualTimePolicy', policy='pauseIfNetworkFetchesPending', budget=1000.0 / fps)
            await asyncio.wait_for(self.tick, 20)
            shot = await self.send('Page.captureScreenshot', format='jpeg', quality=93)
            if self.recording:
                self.frames.append((len(self.frames) / fps, base64.b64decode(shot['data'])))

    async def step_scroll(self, target_expr, seconds, fps=30):
        """Stepped scroll: a timer in the page (not requestAnimationFrame, which follows the real
        display) moves the scroll position from the page's own clock, so each stepped frame differs."""
        await self.js(TIMER_SCROLL_JS % (target_expr, int(seconds * 1000)))
        await self.step_frames(seconds, fps)

    async def js(self, expr):
        r = await self.send('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
        return (r.get('result') or {}).get('value')


def find_target(port, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=2) as r:
                pages = [t for t in json.load(r) if t.get('type') == 'page' and t.get('webSocketDebuggerUrl')]
            if pages:
                return pages[0]
        except Exception:
            pass
        time.sleep(0.4)
    raise SystemExit(f'no DevTools page on port {port}: is the app already running, or another WebView2 using its data folder?')


def jpeg_size(data):
    import io
    from PIL import Image
    return Image.open(io.BytesIO(data)).size


def write_clip(frames, path, fps=30, tail=0.2, size=None):
    """Assemble variable-rate screencast frames into a constant-rate mp4, keeping real timing.
    Frames of another size (sent before the viewport override settles) are dropped."""
    if size and frames:
        sizes = [jpeg_size(f[1]) for f in frames]
        if tuple(size) not in sizes:                      # the window could not give the size asked for
            size = max(set(sizes), key=sizes.count)
            print(f'  note: frames arrived at {size[0]}x{size[1]}, not the size requested')
        frames = [f for f, sz in zip(frames, sizes) if sz == tuple(size)]
    if len(frames) < 2:
        raise SystemExit(f'{path}: only {len(frames)} frame(s) captured')
    # Lay the frames on an exact 30-a-second grid ourselves: for each output frame, the newest
    # captured frame at or before its time. (Feeding stills to ffmpeg with per-file durations
    # snaps them to its 25-a-second image clock first, which repeats one frame in six.)
    t0, end = frames[0][0], frames[-1][0] + tail
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-',
                            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                            '-r', str(fps), path], stdin=subprocess.PIPE)
    i, n = 0, 0
    while t0 + n / fps < end:
        t = t0 + n / fps + 1e-6
        while i + 1 < len(frames) and frames[i + 1][0] <= t:
            i += 1
        enc.stdin.write(frames[i][1])
        n += 1
    enc.stdin.close()
    if enc.wait() != 0:
        raise SystemExit(f'{path}: ffmpeg failed')
    span = frames[-1][0] - frames[0][0]
    return span, len(frames) / max(span, 0.001)


async def run(a, plan):
    target = find_target(a.port)
    async with websockets.connect(target['webSocketDebuggerUrl'], max_size=64 * 1024 * 1024) as ws:
        s = Session(ws)
        pump = asyncio.create_task(s.pump())
        await s.send('Page.enable')
        await s.send('Runtime.enable')
        if a.width:
            await s.send('Emulation.setDeviceMetricsOverride', width=a.width, height=a.height, deviceScaleFactor=a.dpr, mobile=False)
        report = {'url': target.get('url'), 'clips': []}
        for clip in plan['clips']:
            if a.only and clip.get('save', True) and clip['name'] not in a.only.split(','):
                continue
            s.frames, s.recording = [], clip.get('record', True)
            stepped = clip.get('stepped', False)
            if not stepped:
                await s.send('Page.startScreencast', format='jpeg', quality=92, everyNthFrame=1, maxWidth=int(a.width * a.dpr) or 3840, maxHeight=int(a.height * a.dpr) or 2160)
            else:
                await s.send('Emulation.setVirtualTimePolicy', policy='pause')

            async def run_for(seconds):
                await (s.step_frames(seconds) if stepped else asyncio.sleep(seconds))

            for step in clip['steps']:
                if 'wait' in step:
                    await run_for(step['wait'])
                elif 'hash' in step:
                    await s.js(f"location.hash = {json.dumps(step['hash'])}")
                elif 'eval' in step:
                    out = await s.js(step['eval'])
                    if step.get('print'):
                        print(f"  eval -> {json.dumps(out)[:2000]}")
                elif 'reload' in step:
                    await s.send('Page.reload')
                elif 'scroll' in step:
                    if stepped:
                        await s.step_scroll(json.dumps(step['scroll']), step.get('over', 2))
                    else:
                        await s.js(SCROLL_JS % (json.dumps(step['scroll']), int(step.get('over', 2) * 1000)))
                        await asyncio.sleep(step.get('over', 2))
                elif 'scroll_to' in step:
                    expr = f"(document.querySelector({json.dumps(step['scroll_to'])})?.getBoundingClientRect().top ?? 0) + window.scrollY - {step.get('offset', 90)}"
                    if stepped:
                        await s.step_scroll(expr, step.get('over', 2))
                    else:
                        await s.js(SCROLL_JS % (expr, int(step.get('over', 2) * 1000)))
                        await asyncio.sleep(step.get('over', 2))
                elif 'record' in step:
                    s.recording = step['record']
            if stepped:
                await s.send('Emulation.setVirtualTimePolicy', policy='advance')
            else:
                await s.send('Page.stopScreencast')
            await asyncio.sleep(0.2)
            if clip.get('save', True):
                path = os.path.join(a.out, clip['name'] + '.mp4')
                span, rate = write_clip(s.frames, path, size=(int(a.width * a.dpr), int(a.height * a.dpr)) if a.width else None)
                print(f"{clip['name']}: {len(s.frames)} frames over {span:.1f}s ({rate:.0f} a second) -> {path}")
                report['clips'].append({'name': clip['name'], 'frames': len(s.frames), 'seconds': round(span, 2), 'captured_fps': round(rate, 1)})
        pump.cancel()
        return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--exe', required=True); ap.add_argument('--plan', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--args', default=''); ap.add_argument('--port', type=int, default=9333)
    ap.add_argument('--width', type=int, default=1920); ap.add_argument('--height', type=int, default=1080)
    ap.add_argument('--dpr', type=float, default=1.0, help='device pixel ratio: 2 films a small window at twice its size')
    ap.add_argument('--only', default='', help='comma list of clip names to film; warm-up clips always run')
    ap.add_argument('--keep-open', action='store_true')
    a = ap.parse_args()
    with open(a.plan, encoding='utf-8') as f:
        plan = json.load(f)
    os.makedirs(a.out, exist_ok=True)
    env = dict(os.environ, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=f'--remote-debugging-port={a.port} --autoplay-policy=no-user-gesture-required')
    proc = subprocess.Popen([os.path.abspath(a.exe)] + a.args.split(), env=env)
    try:
        report = asyncio.run(run(a, plan))
        report.update(exe=a.exe.replace('\\', '/'), args=a.args, width=a.width, height=a.height, captured=time.strftime('%Y-%m-%d %H:%M'))
        with open(os.path.join(a.out, os.path.splitext(os.path.basename(a.plan))[0] + '.capture.json'), 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=1)
    finally:
        if not a.keep_open:
            proc.terminate()


if __name__ == '__main__':
    sys.exit(main())

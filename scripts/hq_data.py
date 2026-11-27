"""GTA 6 HQ data for tools outside the app (the Discord assistant, the hosted map's build).

There is one source of truth: the app. This module does not read or merge the data files itself.
It asks the app's own server for them, the same `/api/wiki`, `/api/search` and `/api/manual`
answers the desktop window gets, so the merging of `data/wiki/*.json`, drafts, entry pictures and
search (stemming, typo tolerance) are exactly the app's.

    data = HQData.start()          # runs a private copy of the app in server mode, on loopback
    data = HQData('http://127.0.0.1:4600')   # or use a server that is already running
    data.wiki(); data.search('pegasi'); data.manual(); data.pins()

Started this way, the app runs from a copy of the program kept in the bot's own folder (so a
rebuild of target/release is never blocked by a running bot), with its own settings and saved-data
files, so the reader's own app settings and progress are never touched. Standard library only.
"""
import json, os, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = 'gta6-hq.exe' if os.name == 'nt' else 'gta6-hq'
#: How long a fetched copy of the wiki is used before the server is asked whether it changed.
FRESH_SECONDS = 60


def private_dir():
    base = os.environ.get('LOCALAPPDATA') or os.path.join(os.path.expanduser('~'), '.local', 'share')
    path = os.path.join(base, 'GTA6HQ', 'bot', 'data-server')
    os.makedirs(path, exist_ok=True)
    return path


def find_program():
    """The app program to run: GTA6_HQ_EXE, else this checkout's release build, else its debug build."""
    named = os.environ.get('GTA6_HQ_EXE')
    if named:
        return named if os.path.isfile(named) else None
    for build in ('release', 'debug'):
        path = os.path.join(ROOT, 'target', build, EXE)
        if os.path.isfile(path):
            return path
    return None


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class HQData:
    def __init__(self, url, process=None):
        self.url = url.rstrip('/')
        self.process = process
        self.lock = threading.Lock()
        self._wiki = self._manual = self._pins = None
        self._etag = None
        self._checked = 0.0
        self.version = 0  # goes up each time the wiki changes, so callers can drop their own caches

    # ---- starting a private server ----
    @classmethod
    def start(cls, program=None, root=ROOT, wait=60):
        program = program or find_program()
        if not program:
            raise RuntimeError('No GTA 6 HQ program found: build it (cargo build --release) or set GTA6_HQ_EXE.')
        here = private_dir()
        run = program
        if os.path.commonpath([os.path.abspath(program), ROOT]) == ROOT:
            # A copy, refreshed when the build is newer, so the build itself is never held open.
            run = os.path.join(here, EXE)
            if not os.path.isfile(run) or os.path.getmtime(program) > os.path.getmtime(run) + 1:
                try:
                    shutil.copy2(program, run)
                except OSError:
                    if not os.path.isfile(run):
                        run = program
        port = free_port()
        env = dict(os.environ, GTA6_HQ_ROOT=root,
                   GTA6_HQ_SETTINGS=os.path.join(here, 'settings.json'),
                   GTA6_HQ_USERDATA=os.path.join(here, 'userdata.json'),
                   GTA6_HQ_CACHE=os.path.join(here, 'cache'))
        flags = 0x08000000 if os.name == 'nt' else 0  # CREATE_NO_WINDOW
        process = subprocess.Popen([run, '--serve', '--port', str(port)], env=env, cwd=root,
                                   stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   creationflags=flags)
        data = cls(f'http://127.0.0.1:{port}', process)
        until = time.time() + wait
        while time.time() < until:
            if process.poll() is not None:
                raise RuntimeError(f'The GTA 6 HQ server stopped at once (exit code {process.returncode}).')
            try:
                data.get('/api/health')
                return data
            except OSError:
                time.sleep(0.3)
        data.stop()
        raise RuntimeError('The GTA 6 HQ server did not answer within a minute.')

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(5)
            except subprocess.TimeoutExpired:
                self.process.kill()

    def alive(self):
        return self.process is None or self.process.poll() is None

    # ---- reading ----
    def get(self, path, etag=None):
        """GET a path; returns (status, etag, decoded JSON or None when unchanged)."""
        request = urllib.request.Request(self.url + path, headers={'If-None-Match': etag} if etag else {})
        try:
            with urllib.request.urlopen(request, timeout=30) as answer:
                return answer.status, answer.headers.get('ETag'), json.loads(answer.read())
        except urllib.error.HTTPError as error:
            if error.code == 304:
                return 304, etag, None
            raise

    def wiki(self):
        """The merged, published wiki, as the app serves it. Re-checked at most once a minute."""
        with self.lock:
            if self._wiki is None or time.time() - self._checked > FRESH_SECONDS:
                status, etag, body = self.get('/api/wiki', self._etag)
                self._checked = time.time()
                if status != 304 and body is not None:
                    self._wiki, self._etag, self._pins = body, etag, None
                    self._manual = None
                    self.version += 1
            return self._wiki

    def manual(self):
        self.wiki()
        with self.lock:
            if self._manual is None:
                self._manual = self.get('/api/manual')[2]
            return self._manual

    def search(self, text, section=None, limit=10, spoilers=True):
        query = {'q': text[:200], 'limit': limit, 'spoilers': 'true' if spoilers else 'false', 'rumors': 'true'}
        if section:
            query['section'] = section
        return self.get('/api/search?' + urllib.parse.urlencode(query))[2]

    # ---- derived views ----
    def sections(self):
        return [c['key'] for c in self.wiki().get('categories', [])]

    def entry(self, ref):
        """The entry for 'section/slug', or None."""
        section, _, slug = (ref or '').partition('/')
        for e in self.wiki().get(section, []) if section else []:
            if e.get('slug') == slug:
                return e
        return None

    def pins(self):
        """Every pin on the map, built the way the app's map builds them (mapPins in ui/app.js):
        the hand-placed markers, plus each entry with its own x/y that no marker already points at.
        Spoiler status is kept on each pin for the caller to veil; nothing is dropped."""
        wiki = self.wiki()
        with self.lock:
            if self._pins is not None:
                return self._pins
        valid = lambda m: all(isinstance(m.get(k), (int, float)) and 0 <= m[k] <= 1 for k in ('x', 'y'))
        pins = []
        for m in wiki.get('map', {}).get('markers', []):
            if not valid(m):
                continue
            ref = f"locations/{m['location']}" if m.get('location') else m.get('entry')
            target = self.entry(ref) if ref else None
            pins.append({
                'name': m['name'], 'category': m.get('category') or 'landmarks', 'kind': m.get('kind') or '',
                'x': m['x'], 'y': m['y'], 'ref': ref if target else None,
                'summary': m.get('summary') or (target or {}).get('summary', ''),
                'spoiler': m.get('spoiler') is True or bool(target and target.get('spoiler')),
                'guide': m.get('guide'), 'via': m.get('via') or '',
            })
        taken = {p['ref'] for p in pins if p['ref']}
        for c in wiki.get('categories', []):
            for e in wiki.get(c['key'], []):
                ref = f"{c['key']}/{e.get('slug')}"
                if valid(e) and ref not in taken:
                    pins.append({'name': e['name'], 'category': e.get('pin') or c['key'], 'kind': '',
                                 'x': e['x'], 'y': e['y'], 'ref': ref, 'summary': e.get('summary', ''),
                                 'spoiler': bool(e.get('spoiler')), 'guide': None, 'via': ''})
        with self.lock:
            self._pins = pins
        return pins


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    d = HQData(sys.argv[1]) if len(sys.argv) > 1 else HQData.start()
    try:
        w = d.wiki()
        print('sections:', {s: len(w.get(s, [])) for s in d.sections()})
        print('pins:', len(d.pins()))
        print('search pegasi:', [(h['section'], h['slug']) for h in d.search('pegasi', limit=3)['hits']])
    finally:
        d.stop()

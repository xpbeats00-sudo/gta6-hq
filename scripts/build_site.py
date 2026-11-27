"""Build the hosted GTA 6 HQ site into site/: the app itself, running in a browser.

    python scripts/build_site.py                 run a private copy of the app for the data
    python scripts/build_site.py --url URL       use an app server that is already running
    python scripts/build_site.py --out DIR       write somewhere else (default: site/)
    python scripts/build_site.py --no-tiles      leave out the map's detail tiles (tests)

The site is the desktop app's own pages (ui/) with its pictures, so the map, encyclopedia and
Field Manual look and work exactly as in the app. What the app's local server answers is exported
from that server once, here, into api/*.json (through scripts/hq_data.py, the same source the
Discord assistant uses), and web/static-host.js answers the app's /api/ calls from those files and
keeps saved data in the browser. The map's detail tiles are fetched through the server's own tile
cache. Absolute paths (/images/..., /vendor/...) are made relative, because GitHub Pages serves the
site from a sub-folder. Published by .github/workflows/pages.yml. Standard library only.
"""
import argparse, json, os, re, shutil, sys, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hq_data import HQData, ROOT  # noqa: E402

#: What the app's server answers that the pages read, saved as files.
EXPORTS = ('wiki', 'manual', 'media', 'health', 'storage')
#: Folders served beside the pages.
MEDIA = ('images', 'wallpapers')
#: Leading slashes to drop: the folders and the pages' own files, as the server serves them.
ABSOLUTE = re.compile(r'''(?<=["'`(=\s])/(?=(?:images|wallpapers|fonts|vendor|tiles)/|[\w.-]+\.(?:css|js|png|ico|webmanifest)\b)''')
#: The same inside the exported data: "/images/...".
DATA_PATHS = re.compile(r'"/(images|wallpapers)/')


def relative(text):
    return ABSOLUTE.sub('', text)


def tiles(data, out, wiki):
    """The community detail tiles the map draws over the official map, from the server's cache
    (each is fetched from the provider at most once, ever). Returns how many were saved."""
    fit = (wiki.get('map') or {}).get('tileFit') or {}
    if not fit.get('tilesWidth'):
        return 0
    wanted = []
    for z in range(0, 6):
        scale = 2 ** (z - fit.get('zoom', 3))
        cols = max(1, -(-int(fit['tilesWidth'] * scale) // 512))
        rows = max(1, -(-int(fit['tilesHeight'] * scale) // 512))
        wanted += [(z, y, x) for y in range(rows) for x in range(cols)]

    def one(zyx):
        z, y, x = zyx
        try:
            with urllib.request.urlopen(f'{data.url}/tiles/{z}/{y}/{x}.webp', timeout=60) as r:
                body = r.read()
        except (urllib.error.URLError, OSError):
            return 0
        path = os.path.join(out, 'tiles', str(z), str(y), f'{x}.webp')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(body)
        return 1

    with ThreadPoolExecutor(4) as pool:  # gentle on the provider when the cache is cold
        return sum(pool.map(one, wanted))


def build(data, out, with_tiles=True):
    if os.path.isdir(out):
        shutil.rmtree(out)
    shutil.copytree(os.path.join(ROOT, 'ui'), out)
    for folder in MEDIA:
        shutil.copytree(os.path.join(ROOT, folder), os.path.join(out, folder))
    shutil.copytree(os.path.join(ROOT, 'web'), out, dirs_exist_ok=True)

    # The server's answers, as files, with their paths made relative too.
    os.makedirs(os.path.join(out, 'api'), exist_ok=True)
    for name in EXPORTS:
        with urllib.request.urlopen(f'{data.url}/api/{name}', timeout=60) as r:
            body = r.read()
        with open(os.path.join(out, 'api', f'{name}.json'), 'w', encoding='utf-8') as f:
            f.write(DATA_PATHS.sub(r'"\1/', body.decode('utf-8')))

    # Pages, scripts and styles: relative paths, and the stand-in server loaded before anything else.
    for base, _, files in os.walk(out):
        if os.path.relpath(base, out).split(os.sep)[0] in MEDIA + ('api', 'tiles'):
            continue
        for name in files:
            if name.endswith(('.html', '.js', '.css')):
                path = os.path.join(base, name)
                with open(path, encoding='utf-8') as f:
                    text = f.read()
                fixed = relative(text)
                if fixed != text:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(fixed)
    index = os.path.join(out, 'index.html')
    with open(index, encoding='utf-8') as f:
        page = f.read()
    if 'static-host.js' not in page:
        page = page.replace('<head>', '<head>\n  <script src="static-host.js"></script>', 1)
    with open(index, 'w', encoding='utf-8') as f:
        f.write(page)

    with open(os.path.join(out, 'api', 'wiki.json'), encoding='utf-8') as f:
        wiki = json.load(f)
    saved = tiles(data, out, wiki) if with_tiles else 0
    open(os.path.join(out, '.nojekyll'), 'w').close()
    manual = json.load(open(os.path.join(out, 'api', 'manual.json'), encoding='utf-8'))
    return {'pins': len((wiki.get('map') or {}).get('markers', [])),
            'entries': sum(len(wiki.get(c['key'], [])) for c in wiki.get('categories', [])),
            'chapters': len(manual.get('chapters', [])), 'tiles': saved}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser()
    ap.add_argument('--url')
    ap.add_argument('--out', default=os.path.join(ROOT, 'site'))
    ap.add_argument('--no-tiles', action='store_true', help='leave out the map detail tiles (for tests)')
    args = ap.parse_args()
    data = HQData(args.url) if args.url else HQData.start()
    try:
        print('built', args.out, build(data, args.out, with_tiles=not args.no_tiles))
    finally:
        data.stop()

"""Build the Microsoft Store edition: the same app with none of the game's pictures or clips.

    python scripts/make_store_art.py      (once, or after changing the mark)
    python scripts/package_store.py                    (no pictures from the game at all)
    python scripts/package_store.py --official-media   (adds Rockstar's published screenshots and artwork)

With --official-media the edition also carries the still pictures recorded in data/media.json as
Rockstar's own published screenshots, artwork and trailer frames, each shown with its credit. It
still leaves out every clip and live wallpaper, the cover art, the game's logo and anything whose
origin is not recorded. Those pictures are Rockstar's and no licence is recorded for them: whether
to ship them is the owner's decision.

What it does:
  1. Builds the program under the Store edition's own name and icon (target/store).
  2. Assembles dist/store/app: the program, ui/ plus the Store edition's own artwork and styles,
     and data/ with every picture reference removed. No images/, no wallpapers/, no update
     check (the Store delivers updates) and no Discord presence settings.
  3. Checks that nothing in that folder refers to images/ or wallpapers/, and runs the app's
     own data check on it.
  4. Packs dist/store/<Name>-<version>.msix with the Windows SDK, when the SDK is installed.

The package is not signed: the Store signs it after submission. The identity in
store/identity.json must match Partner Center (Product management > Product identity).

Standard library only.
"""
import glob, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
identity = json.load(open('store/identity.json', encoding='utf-8'))
NAME = identity['app_name']                # the name on the window and in the app
EXE = identity['executable']               # the program's file name inside the package
cargo_version = re.search(r'^version\s*=\s*"([^"]+)"', open('Cargo.toml', encoding='utf-8').read(), re.M).group(1)
# The Store refuses versions that start with 0 and keeps the fourth part for itself.
major, minor, patch = (int(n) for n in cargo_version.split('.'))
VERSION = f'{max(1, major)}.{minor}.{patch}.0'
OUT = os.path.join('dist', 'store')
APP = os.path.join(OUT, 'app')
MEDIA = ('/images/', '/wallpapers/', 'images/', 'wallpapers/')
OFFICIAL = '--official-media' in sys.argv


def allowed_pictures():
    """Still pictures under images/ that the media record credits to Rockstar's published material."""
    if not OFFICIAL:
        return {}
    keep = {}
    for asset in json.load(open('data/media.json', encoding='utf-8'))['assets']:
        file = asset['file']
        published = asset['license'].startswith('Copyright Rockstar Games.') and asset['creator'] == 'Rockstar Games'
        if published and file.startswith('images/') and not file.startswith('images/splash/') and os.path.exists(file):
            keep[file] = asset
    return keep


KEEP = allowed_pictures()


def build():
    env = dict(os.environ, GTA6_HQ_APP_NAME=NAME, GTA6_HQ_APP_ICON='store/app.ico')
    done = subprocess.run(['cargo', 'build', '--release', '--target-dir', 'target/store'], env=env)
    if done.returncode != 0:
        sys.exit('The build failed.')
    return os.path.join('target', 'store', 'release', 'gta6-hq.exe')


def is_media(value):
    """A reference to a picture or clip this edition does not carry."""
    return isinstance(value, str) and value.startswith(MEDIA) and value.lstrip('/') not in KEEP


def strip(node):
    """Remove every reference to a picture or clip, and the blocks that exist only to show one."""
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if is_media(value):
                continue
            value = strip(value)
            out[key] = value
        return out
    if isinstance(node, list):
        out = []
        for item in node:
            if is_media(item):
                continue
            had_picture = isinstance(item, dict) and any(is_media(v) for v in item.values())
            item = strip(item)
            if isinstance(item, dict):
                # A manual block of type image/frame/pair is only its picture(s).
                if item.get('type') in ('image', 'frame') and 'src' not in item:
                    continue
                if item.get('type') == 'pair' and len(item.get('frames', [])) < 2:
                    continue
                if had_picture and set(item) <= {'alt', 'label', 'caption', 'credit'}:
                    continue
            out.append(item)
        return out
    return node


def data():
    os.makedirs(os.path.join(APP, 'data', 'wiki'))
    files = ['data/wiki.json', 'data/manual.json'] + sorted(glob.glob('data/wiki/*.json'))
    for path in files:
        content = strip(json.load(open(path, encoding='utf-8-sig')))
        text = json.dumps(drop_orphans(content), ensure_ascii=False, indent=1)
        open(os.path.join(APP, path), 'w', encoding='utf-8', newline='\n').write(text)
    about = ('Rights record for the pictures in the Microsoft Store edition.' if OFFICIAL
             else 'The Microsoft Store edition ships no pictures or clips, so this record is empty.')
    for file in KEEP:
        os.makedirs(os.path.dirname(os.path.join(APP, file)), exist_ok=True)
        shutil.copyfile(file, os.path.join(APP, file))
    # A record may name the picture it was made from; that one may not be in this edition.
    assets = [{k: v for k, v in asset.items() if k != 'derived_from' or v in KEEP} for asset in KEEP.values()]
    json.dump({'_about': about, 'assets': assets}, open(os.path.join(APP, 'data', 'media.json'), 'w', encoding='utf-8'), indent=1)


def drop_orphans(node):
    """Captions and credits whose picture has gone."""
    if isinstance(node, dict):
        if 'frame' not in node:
            for key in ('frameAlt', 'frameCredit'):
                node.pop(key, None)
        return {k: drop_orphans(v) for k, v in node.items()}
    if isinstance(node, list):
        return [drop_orphans(v) for v in node]
    return node


def ui():
    shutil.copytree('ui', os.path.join(APP, 'ui'), ignore=shutil.ignore_patterns('stream.*'))
    for name in os.listdir('store/ui'):
        shutil.copyfile(os.path.join('store', 'ui', name), os.path.join(APP, 'ui', name))
    page_path = os.path.join(APP, 'ui', 'index.html')
    page = open(page_path, encoding='utf-8').read()

    def swap(old, new, count=1):
        nonlocal page
        if page.count(old) < 1:
            sys.exit(f'index.html has changed: could not find {old[:70]!r}')
        page = page.replace(old, new) if count == 0 else page.replace(old, new, count)

    swap('<html lang="en">', '<html lang="en" data-edition="store" data-media="official">' if OFFICIAL else '<html lang="en" data-edition="store">')
    swap('<link rel="icon" href="/images/gta6.png">', '<link rel="icon" href="/brand.png">')
    swap('<link rel="stylesheet" href="/manual.css">', '<link rel="stylesheet" href="/manual.css">\n  <link rel="stylesheet" href="/store.css">')
    swap('<script src="/art.js"></script>', '<script src="/art.js"></script>\n  <script src="/store-art.js"></script>')
    page = re.sub(r'\s*<link rel="stylesheet" href="/stream\.css">', '', page)
    page = re.sub(r'\s*<!-- Stream mode:.*?-->\s*<script src="/stream\.js"></script>', '', page, flags=re.S)
    # The intro: the app's own mark instead of the cover art and clips.
    intro, found = re.subn(
        r'<!-- Loading screen:.*?-->\s*<div id="splash" role="status" aria-label="Loading GTA 6 HQ">.*?(?=<div class="splash-foot">)',
        f'''<!-- Loading screen: the app's own mark over a dark sky -->
  <div id="splash" class="splash-own" role="status" aria-label="Loading {NAME}">
    <div class="own-stage" aria-hidden="true">
      <img class="own-mark" src="/brand.png" alt="">
      <p class="own-name">{NAME}</p>
      <p class="own-sub">Unofficial fan guide to Grand Theft Auto VI</p>
    </div>
    ''', page, flags=re.S)
    if found != 1:
        sys.exit('index.html has changed: could not find the loading screen.')
    page = intro
    swap('<img src="/images/gta6.png" alt="">', '<img src="/brand.png" alt="">', 0)
    swap('on the GTA 6 HQ Discord server', 'on the community Discord server')
    swap('GTA 6 HQ', NAME, 0)
    open(page_path, 'w', encoding='utf-8', newline='\n').write(page)
    for name in ('app.js', 'manual.js'):
        path = os.path.join(APP, 'ui', name)
        text = open(path, encoding='utf-8').read().replace('GTA 6 HQ', NAME)
        open(path, 'w', encoding='utf-8', newline='\n').write(text)


def check(exe):
    """Nothing the edition shows may point at a picture or clip it does not have."""
    problems = []
    for folder, _, names in os.walk(os.path.join(APP, 'data')):
        for name in names:
            text = open(os.path.join(folder, name), encoding='utf-8').read()
            for hit in re.findall(r'"/?(?:images|wallpapers)/[^"]*"', text):
                if hit.strip('"').lstrip('/') not in KEEP:
                    problems.append(f'{name}: {hit}')
    page = open(os.path.join(APP, 'ui', 'index.html'), encoding='utf-8').read()
    problems += [f'index.html: {hit}' for hit in re.findall(r'(?:src|href)="/(?:images|wallpapers)/[^"]*"', page)]
    for banned in (() if OFFICIAL else ('images',)) + ('wallpapers', os.path.join('images', 'splash'), os.path.join('data', 'update.json'), os.path.join('data', 'discord.json')):
        if os.path.exists(os.path.join(APP, banned)):
            problems.append(f'{banned} must not be in the Store edition')
    if problems:
        sys.exit('The Store edition still refers to pictures:\n  ' + '\n  '.join(problems[:20]))
    report = subprocess.run([exe, '--validate'], env=dict(os.environ, GTA6_HQ_ROOT=os.path.abspath(APP)), capture_output=True, text=True)
    summary = [line for line in report.stdout.splitlines() if re.search(r'error|warning', line, re.I)][:6]
    print('Data check:', '; '.join(summary) if summary else 'no output')
    if report.returncode != 0:
        sys.exit('The data check found errors in the Store edition.')


def manifest():
    assets = os.path.join(APP, 'assets')
    shutil.copytree('store/assets', assets)
    text = open('store/AppxManifest.xml', encoding='utf-8').read()
    for key, value in {'IDENTITY_NAME': identity['identity_name'], 'PUBLISHER': identity['publisher'],
                       'PUBLISHER_NAME': identity['publisher_display_name'], 'DISPLAY_NAME': identity['store_name'],
                       'APP_NAME': NAME, 'VERSION': VERSION, 'EXECUTABLE': EXE,
                       'DESCRIPTION': identity['description']}.items():
        text = text.replace('{{' + key + '}}', value.replace('&', '&amp;'))
    open(os.path.join(APP, 'AppxManifest.xml'), 'w', encoding='utf-8', newline='\n').write(text)


def sdk_tool(name):
    kits = r'C:\Program Files (x86)\Windows Kits\10\bin'
    found = sorted(glob.glob(os.path.join(kits, '10.*', 'x64', name)))
    return found[-1] if found else None


def pack():
    makepri, makeappx = sdk_tool('makepri.exe'), sdk_tool('makeappx.exe')
    if not (makepri and makeappx):
        print('Windows SDK not found: dist/store/app is ready, but no .msix was packed.')
        return None
    config = os.path.join(OUT, 'priconfig.xml')
    quiet = dict(stdout=subprocess.DEVNULL)
    if subprocess.run([makepri, 'createconfig', '/cf', config, '/dq', 'en-US', '/o'], **quiet).returncode != 0:
        sys.exit('makepri could not write its settings.')
    if subprocess.run([makepri, 'new', '/pr', APP, '/cf', config, '/mn', os.path.join(APP, 'AppxManifest.xml'),
                       '/of', os.path.join(APP, 'resources.pri'), '/o'], **quiet).returncode != 0:
        sys.exit('makepri could not index the tiles.')
    package = os.path.join(OUT, f'{EXE[:-4]}-{VERSION}-x64.msix')
    if subprocess.run([makeappx, 'pack', '/d', APP, '/p', package, '/o'], **quiet).returncode != 0:
        sys.exit('makeappx could not pack the folder.')
    return package


def main():
    for needed in ('store/app.ico', 'store/ui/brand.png', 'store/assets'):
        if not os.path.exists(needed):
            sys.exit('Run first: python scripts/make_store_art.py')
    exe = build()
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(APP)
    shutil.copyfile(exe, os.path.join(APP, EXE))
    shutil.copyfile('store/NOTICE-official-media.txt' if OFFICIAL else 'store/NOTICE.txt', os.path.join(APP, 'NOTICE.txt'))
    data()
    ui()
    check(os.path.join(APP, EXE))
    manifest()
    package = pack()
    size = sum(os.path.getsize(os.path.join(f, n)) for f, _, ns in os.walk(APP) for n in ns)
    print(f"With {len(KEEP)} of Rockstar's published pictures." if OFFICIAL else 'With no pictures from the game.')
    print(f'{NAME} {VERSION}: {APP} ({size / 1e6:.1f} MB)' + (f', {package} ({os.path.getsize(package) / 1e6:.1f} MB)' if package else ''))


if __name__ == '__main__':
    main()

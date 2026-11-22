"""Package a release: the setup program, a portable zip and checksums.

Two builds, as decided in docs/compliance/MEDIA-DISTRIBUTION-POLICY.md (option D):

    python scripts/package_release.py                         the PUBLIC build (the default)
    python scripts/package_release.py --include-local-media   a PERSONAL build, never to be uploaded

The public build holds only the pictures and clips that docs/compliance/DISTRIBUTION-ASSET-ALLOWLIST.md
lists as approved for distribution (today: none). It is the Microsoft Store edition's layout under
the GitHub name: every reference to a picture that isn't shipped is removed from the data, the
game's logo and intro are replaced by the app's own mark, the program carries the app's own icon
(store/app.ico), and the installer uses Inno Setup's plain pages instead of the game's artwork.
It keeps the update check and Discord presence. Before packing, it refuses to go on if anything
in the folder is a picture or clip the allow-list doesn't approve, or refers to one.

Writes dist/GTA6HQ-<version>-Setup.exe (when Inno Setup 6 is installed), the portable zip and
dist/SHA256SUMS.txt, taking the version from Cargo.toml. Then publish with:

    gh release create v<version> dist/GTA6HQ-<version>-Setup.exe dist/GTA6HQ-<version>-windows-portable.zip dist/SHA256SUMS.txt --title "GTA 6 HQ <version>" --notes "..."

The personal build is the full working tree, every picture included, packed the way releases used
to be (with the setup window in installer/shell). It goes to dist/personal/ with PERSONAL in every
file name, and is for the owner's own machines only: none of its pictures are cleared to be shared.

Standard library only (plus scripts/package_store.py, which this reuses).
"""
import hashlib, json, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
version = re.search(r'^version\s*=\s*"([^"]+)"', open('Cargo.toml', encoding='utf-8').read(), re.M).group(1)
PERSONAL = '--include-local-media' in sys.argv
APP_NAME = 'GTA 6 HQ'
MEDIA_DIRS = ('images', 'wallpapers')

candidates = [os.path.join(os.environ.get(var, ''), sub, 'Inno Setup 6', 'ISCC.exe')
              for var, sub in (('LOCALAPPDATA', 'Programs'), ('ProgramFiles(x86)', ''), ('ProgramFiles', ''))]
ISCC = next((p for p in candidates if os.path.exists(p)), None)


def approved_media():
    """Files listed under "Approved for distribution" in the allow-list the media audit writes."""
    text = open(os.path.join('docs', 'compliance', 'DISTRIBUTION-ASSET-ALLOWLIST.md'), encoding='utf-8').read()
    section = re.search(r'^## Approved for distribution\s*$(.*?)(?=^## |\Z)', text, re.M | re.S)
    if not section:
        sys.exit('DISTRIBUTION-ASSET-ALLOWLIST.md has no "Approved for distribution" section. Run scripts/audit_media.py.')
    return sorted(set(re.findall(r'^- `([^`]+)`', section.group(1), re.M)))


def zip_folder(folder, out):
    """Pack `folder` under GTA6HQ/ in the zip; returns the number of files."""
    count = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, _, files in os.walk(folder):
            for f in sorted(files):
                path = os.path.join(base, f)
                z.write(path, 'GTA6HQ/' + os.path.relpath(path, folder).replace(os.sep, '/'))
                count += 1
    print(f'{out}: {count} files, {os.path.getsize(out) / 1048576:.1f} MB')
    return count


def checksums(folder, built, name):
    with open(os.path.join(folder, name), 'w', encoding='utf-8', newline='\n') as sums:
        for file in built:
            digest = hashlib.sha256(open(os.path.join(folder, file), 'rb').read()).hexdigest()
            sums.write(f'{digest}  {file}\n')
            print(f'sha256 {digest}  {file}')


def assemble_public(app, exe, approved=None):
    """Lay out the public edition in `app` with program `exe` (any system): only allow-listed media,
    the app's own mark, the GitHub name, the update check and Discord presence. Runs the app's data
    check and the policy check; stops the build if either fails. Used by scripts/package_unix.py too."""
    import package_store as ps  # the Store edition's assembly: strip, ui swap, check

    approved = approved_media() if approved is None else approved
    shutil.rmtree(app, ignore_errors=True)
    os.makedirs(app)
    media = json.load(open(os.path.join('data', 'media.json'), encoding='utf-8'))['assets']
    by_file = {a['file']: a for a in media}
    ps.APP, ps.NAME = app, APP_NAME
    ps.KEEP = {f: by_file.get(f, {'file': f}) for f in approved}
    ps.data()
    ps.ui()
    name = os.path.basename(exe)
    shutil.copy2(exe, os.path.join(app, name))
    ps.check(os.path.join(app, name))  # no reference to a picture that isn't shipped; data check
    # The GitHub edition keeps its update check and Discord presence (the Store edition drops them).
    for extra in ('update.json', 'discord.json'):
        if os.path.exists(os.path.join('data', extra)):
            shutil.copyfile(os.path.join('data', extra), os.path.join(app, 'data', extra))
    about = ('Rights record for the pictures in the public build.' if approved
             else 'The public build ships no pictures or clips, so this record is empty.')
    record = json.load(open(os.path.join(app, 'data', 'media.json'), encoding='utf-8'))
    record['_about'] = about
    json.dump(record, open(os.path.join(app, 'data', 'media.json'), 'w', encoding='utf-8'), indent=1)
    shutil.copyfile('README.md', os.path.join(app, 'README.md'))
    notice = open(os.path.join('installer', 'notice-public.txt'), encoding='utf-8').read()
    open(os.path.join(app, 'NOTICE.txt'), 'w', encoding='utf-8', newline='\n').write(notice)
    enforce(app, approved)


def public():
    approved = approved_media()
    print(f'Public build: {len(approved)} media file(s) approved for distribution.')
    # The program under the GitHub name, with the app's own icon instead of the game's logo.
    target = os.path.join('target', 'public')
    env = dict(os.environ, GTA6_HQ_APP_NAME=APP_NAME, GTA6_HQ_APP_ICON='store/app.ico')
    if subprocess.run(['cargo', 'build', '--release', '--target-dir', target], env=env).returncode != 0:
        sys.exit('The build failed.')
    exe = os.path.join(target, 'release', 'gta6-hq.exe')

    app = os.path.join('dist', 'public', 'app')
    assemble_public(app, exe, approved)
    shutil.copyfile(os.path.join('store', 'app.ico'), os.path.join(app, 'gta6-hq.ico'))

    built = []
    zip_name = f'GTA6HQ-{version}-windows-portable.zip'
    zip_folder(app, os.path.join('dist', zip_name))
    built.append(zip_name)
    if ISCC:
        root = os.path.relpath(app, ROOT)
        if subprocess.run([ISCC, '/Qp', f'/DAppVersion={version}', f'/DPublicRoot={root}', '/Odist',
                           os.path.join('installer', 'gta6-hq.iss')]).returncode != 0:
            sys.exit('Inno Setup failed')
        setup = f'GTA6HQ-{version}-Setup.exe'
        print(f'{os.path.join("dist", setup)}: {os.path.getsize(os.path.join("dist", setup)) / 1048576:.1f} MB')
        built.insert(0, setup)
    else:
        print('Inno Setup 6 not found: only the portable zip was built.')
    checksums('dist', built, 'SHA256SUMS.txt')


def enforce(app, approved):
    """The policy as a check: no unapproved picture or clip in the folder, and nothing pointing at one."""
    allowed = set(approved)
    problems = []
    for base, _, files in os.walk(app):
        for f in files:
            rel = os.path.relpath(os.path.join(base, f), app).replace(os.sep, '/')
            if rel.split('/')[0] in MEDIA_DIRS and rel not in allowed:
                problems.append(f'not approved for distribution: {rel}')
            # The data and the page. (app.js and the styles name some pictures for the full edition;
            # the edition mark on the page switches those off, as in the Store edition.)
            if f.endswith('.json') or f == 'index.html':
                text = open(os.path.join(base, f), encoding='utf-8', errors='replace').read()
                for hit in re.findall(r'/?(?:images|wallpapers)/[\w./-]+\.(?:jpg|jpeg|png|webp|gif|mp4|webm|svg)', text):
                    if hit.lstrip('/') not in allowed:
                        problems.append(f'{rel} refers to {hit}')
    if problems:
        sys.exit('The public build would contain or refer to media that is not approved:\n  '
                 + '\n  '.join(sorted(set(problems))[:30]) + ('\n  …' if len(set(problems)) > 30 else ''))
    print('Policy check: only approved media, and no reference to anything else.')


def personal():
    print('PERSONAL build: every picture and clip is included. None of them is cleared to be shared.')
    print('Keep it on your own machines. Never attach it to a release or upload it anywhere.')
    exe = 'target/release/gta6-hq.exe'
    if not os.path.exists(exe):
        sys.exit('Build first: cargo build --release')
    if os.path.getmtime(exe) < max(os.path.getmtime(os.path.join('src', f)) for f in os.listdir('src')):
        sys.exit('The release build is older than the source. Run: cargo build --release')
    out_dir = os.path.join('dist', 'personal')
    os.makedirs(out_dir, exist_ok=True)
    name = f'GTA6HQ-{version}-PERSONAL-windows-portable.zip'
    count = 0
    with zipfile.ZipFile(os.path.join(out_dir, name), 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.write(exe, 'GTA6HQ/gta6-hq.exe')
        z.write('README.md', 'GTA6HQ/README.md')
        count += 2
        for top in ('ui', 'data', *MEDIA_DIRS):
            for base, _, files in os.walk(top):
                for f in sorted(files):
                    path = os.path.join(base, f)
                    z.write(path, 'GTA6HQ/' + path.replace(os.sep, '/'))
                    count += 1
    print(f'{os.path.join(out_dir, name)}: {count} files, {os.path.getsize(os.path.join(out_dir, name)) / 1048576:.1f} MB')
    built = [name]
    if ISCC:
        # Inno Setup builds the installer that does the work. It is then carried inside the setup
        # window (installer/shell), which shows the app's own pages and runs the Inno installer silently.
        shell = os.path.join('installer', 'shell')
        payload = os.path.join(ROOT, shell, 'payload')
        os.makedirs(payload, exist_ok=True)
        if subprocess.run([ISCC, '/Qp', f'/DAppVersion={version}', '/O' + payload, '/Fcore', os.path.join('installer', 'gta6-hq.iss')]).returncode != 0:
            sys.exit('Inno Setup failed')
        # How many files the installer copies (the zip's files plus the icon), for the progress ring.
        open(os.path.join(payload, 'files.txt'), 'w').write(str(count + 1))
        if subprocess.run(['cargo', 'build', '--release', '--quiet', '--target-dir', os.path.join(ROOT, 'target', 'setup')], cwd=shell).returncode != 0:
            sys.exit('Building the setup window failed')
        setup = f'GTA6HQ-{version}-PERSONAL-Setup.exe'
        shutil.copyfile(os.path.join('target', 'setup', 'release', 'gta6-hq-setup.exe'), os.path.join(out_dir, setup))
        print(f'{os.path.join(out_dir, setup)}: {os.path.getsize(os.path.join(out_dir, setup)) / 1048576:.1f} MB')
        built.insert(0, setup)
    else:
        print('Inno Setup 6 not found: only the portable zip was built.')
    checksums(out_dir, built, 'SHA256SUMS-PERSONAL.txt')


if __name__ == '__main__':
    personal() if PERSONAL else public()

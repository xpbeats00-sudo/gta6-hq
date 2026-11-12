"""Package the release build: the setup program, a portable zip and checksums.

    cargo build --release
    python scripts/package_release.py

Writes dist/GTA6HQ-<version>-Setup.exe (when Inno Setup 6 is installed), the portable zip
and dist/SHA256SUMS.txt, taking the version from Cargo.toml. Then publish with:

    gh release create v<version> dist/GTA6HQ-<version>-Setup.exe dist/GTA6HQ-<version>-windows-portable.zip dist/SHA256SUMS.txt --title "GTA 6 HQ <version>" --notes "..."

Standard library only.
"""
import hashlib, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
version = re.search(r'^version\s*=\s*"([^"]+)"', open('Cargo.toml', encoding='utf-8').read(), re.M).group(1)
exe = 'target/release/gta6-hq.exe'
if not os.path.exists(exe):
    sys.exit('Build first: cargo build --release')
if os.path.getmtime(exe) < max(os.path.getmtime(os.path.join('src', f)) for f in os.listdir('src')):
    sys.exit('The release build is older than the source. Run: cargo build --release')

name = f'GTA6HQ-{version}-windows-portable.zip'
os.makedirs('dist', exist_ok=True)
out = os.path.join('dist', name)
count = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    z.write(exe, 'GTA6HQ/gta6-hq.exe')
    z.write('README.md', 'GTA6HQ/README.md')
    count += 2
    for top in ('ui', 'data', 'images', 'wallpapers'):
        for base, _, files in os.walk(top):
            for f in sorted(files):
                path = os.path.join(base, f)
                z.write(path, 'GTA6HQ/' + path.replace(os.sep, '/'))
                count += 1
print(f'{out}: {count} files, {os.path.getsize(out) / 1048576:.1f} MB')
built = [name]

# The installer, if Inno Setup 6 is on this machine.
candidates = [os.path.join(os.environ.get(var, ''), sub, 'Inno Setup 6', 'ISCC.exe')
              for var, sub in (('LOCALAPPDATA', 'Programs'), ('ProgramFiles(x86)', ''), ('ProgramFiles', ''))]
iscc = next((p for p in candidates if os.path.exists(p)), None)
if iscc:
    # Inno Setup builds the installer that does the work. It is then carried inside the setup
    # window (installer/shell), which is the file people download: it shows the app's own
    # pages and runs the Inno installer silently.
    shell = os.path.join('installer', 'shell')
    payload = os.path.join(ROOT, shell, 'payload')
    os.makedirs(payload, exist_ok=True)
    if subprocess.run([iscc, '/Qp', f'/DAppVersion={version}', '/O' + payload, '/Fcore', os.path.join('installer', 'gta6-hq.iss')]).returncode != 0:
        sys.exit('Inno Setup failed')
    # How many files the installer copies (the zip's files plus the icon), for the progress ring.
    open(os.path.join(payload, 'files.txt'), 'w').write(str(count + 1))
    if subprocess.run(['cargo', 'build', '--release', '--quiet', '--target-dir', os.path.join(ROOT, 'target', 'setup')], cwd=shell).returncode != 0:
        sys.exit('Building the setup window failed')
    setup = f'GTA6HQ-{version}-Setup.exe'
    shutil.copyfile(os.path.join('target', 'setup', 'release', 'gta6-hq-setup.exe'), os.path.join('dist', setup))
    print(f'{os.path.join("dist", setup)}: {os.path.getsize(os.path.join("dist", setup)) / 1048576:.1f} MB')
    built.insert(0, setup)
else:
    print('Inno Setup 6 not found: only the portable zip was built.')

with open(os.path.join('dist', 'SHA256SUMS.txt'), 'w', encoding='utf-8', newline='\n') as sums:
    for file in built:
        digest = hashlib.sha256(open(os.path.join('dist', file), 'rb').read()).hexdigest()
        sums.write(f'{digest}  {file}\n')
        print(f'sha256 {digest}  {file}')

"""Package the release build as a portable zip with a checksum.

    cargo build --release
    python scripts/package_release.py

Writes dist/GTA6HQ-<version>-windows-portable.zip and dist/SHA256SUMS.txt, taking the
version from Cargo.toml. Then publish with:

    gh release create v<version> dist/GTA6HQ-<version>-windows-portable.zip dist/SHA256SUMS.txt --title "GTA 6 HQ <version>" --notes "..."

Standard library only.
"""
import hashlib, os, re, sys, zipfile

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
digest = hashlib.sha256(open(out, 'rb').read()).hexdigest()
open(os.path.join('dist', 'SHA256SUMS.txt'), 'w', encoding='utf-8', newline='\n').write(f'{digest}  {name}\n')
print(f'{out}: {count} files, {os.path.getsize(out) / 1048576:.1f} MB')
print(f'sha256 {digest}')

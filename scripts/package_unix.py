"""Package the app for macOS or Linux, on that system.

    cargo build --release
    python3 scripts/package_unix.py [--binary PATH]

macOS  -> dist/GTA6HQ-<version>-macos.zip           holding "GTA 6 HQ.app"
Linux  -> dist/GTA6HQ-<version>-linux-x86_64.tar.gz  holding a GTA6HQ folder

The macOS app is a bundle: the program in Contents/MacOS and the ui, data, images and
wallpapers folders in Contents/Resources, where the app looks for them. It is signed ad hoc
(no Apple developer account), so macOS asks before opening it the first time.
The Linux folder is the same layout as the Windows portable zip, plus install.sh, which adds
a menu entry for the current user. Pillow is used for the icons if it is installed.
"""
import argparse, os, platform, re, shutil, stat, subprocess, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
FOLDERS = ('ui', 'data', 'images', 'wallpapers')
version = re.search(r'^version\s*=\s*"([^"]+)"', open('Cargo.toml', encoding='utf-8').read(), re.M).group(1)

ap = argparse.ArgumentParser()
ap.add_argument('--binary', default=os.path.join('target', 'release', 'gta6-hq'))
a = ap.parse_args()
if not os.path.isfile(a.binary):
    sys.exit(f'{a.binary} is missing. Build first: cargo build --release')
os.makedirs('dist', exist_ok=True)


def square_logo(size):
    """The logo letterboxed into a square, or None without Pillow."""
    try:
        from PIL import Image
    except ImportError:
        return None
    logo = Image.open(os.path.join('images', 'gta6.png')).convert('RGBA')
    side = max(logo.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
    return square.resize((size, size), Image.LANCZOS)


def copy_content(into):
    for folder in FOLDERS:
        shutil.copytree(folder, os.path.join(into, folder))


def executable(path):
    os.chmod(path, os.stat(path).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def macos():
    app = os.path.join('dist', 'GTA 6 HQ.app')
    shutil.rmtree(app, ignore_errors=True)
    contents = os.path.join(app, 'Contents')
    os.makedirs(os.path.join(contents, 'MacOS'))
    os.makedirs(os.path.join(contents, 'Resources'))
    shutil.copy2(a.binary, os.path.join(contents, 'MacOS', 'gta6-hq'))
    executable(os.path.join(contents, 'MacOS', 'gta6-hq'))
    copy_content(os.path.join(contents, 'Resources'))
    icon = square_logo(1024)
    if icon:
        icon.save(os.path.join(contents, 'Resources', 'gta6-hq.icns'))
    open(os.path.join(contents, 'Info.plist'), 'w', encoding='utf-8').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>GTA 6 HQ</string>
  <key>CFBundleDisplayName</key><string>GTA 6 HQ</string>
  <key>CFBundleIdentifier</key><string>io.github.gta6-hq</string>
  <key>CFBundleExecutable</key><string>gta6-hq</string>
  <key>CFBundleIconFile</key><string>gta6-hq</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>{version}</string>
  <key>CFBundleVersion</key><string>{version}</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.reference</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Unofficial fan project. Not affiliated with Rockstar Games or Take-Two Interactive.</string>
</dict>
</plist>
''')
    # Ad hoc signature: Apple silicon will not run a program with none at all.
    subprocess.run(['codesign', '--force', '--deep', '--sign', '-', app], check=True)
    out = os.path.join('dist', f'GTA6HQ-{version}-macos.zip')
    if os.path.exists(out):
        os.remove(out)
    subprocess.run(['ditto', '-c', '-k', '--keepParent', app, out], check=True)
    return out


def linux():
    arch = platform.machine() or 'x86_64'
    name = f'GTA6HQ-{version}-linux-{arch}'
    stage = os.path.join('dist', name)
    shutil.rmtree(stage, ignore_errors=True)
    folder = os.path.join(stage, 'GTA6HQ')
    os.makedirs(folder)
    shutil.copy2(a.binary, os.path.join(folder, 'gta6-hq'))
    executable(os.path.join(folder, 'gta6-hq'))
    copy_content(folder)
    shutil.copy2('README.md', os.path.join(folder, 'README.md'))
    icon = square_logo(256)
    if icon:
        icon.save(os.path.join(folder, 'gta6-hq.png'))
    open(os.path.join(folder, 'install.sh'), 'w', encoding='utf-8', newline='\n').write('''#!/bin/sh
# Adds GTA 6 HQ to the applications menu for the current user. Run it from this folder.
# To remove it again: rm ~/.local/share/applications/gta6-hq.desktop
set -e
here="$(cd "$(dirname "$0")" && pwd)"
apps="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$apps"
cat > "$apps/gta6-hq.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=GTA 6 HQ
Comment=Unofficial Grand Theft Auto VI encyclopedia and field manual
Exec="$here/gta6-hq"
Icon=$here/gta6-hq.png
Terminal=false
Categories=Game;Reference;
EOF
echo "GTA 6 HQ was added to your applications menu."
''')
    executable(os.path.join(folder, 'install.sh'))
    out = os.path.join('dist', name + '.tar.gz')
    with tarfile.open(out, 'w:gz') as tar:
        tar.add(folder, arcname='GTA6HQ')
    shutil.rmtree(stage)
    return out


if sys.platform == 'darwin':
    out = macos()
elif sys.platform.startswith('linux'):
    out = linux()
else:
    sys.exit('This script packages for macOS and Linux. On Windows use scripts/package_release.py.')
print(f'{out}: {os.path.getsize(out) / 1048576:.1f} MB')

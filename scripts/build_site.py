"""Build the hosted GTA 6 HQ site (the interactive Leonida map and the guide pages) into site/.

    python scripts/build_site.py                 run a private copy of the app for the data
    python scripts/build_site.py --url URL       use an app server that is already running
    python scripts/build_site.py --out DIR       write somewhere else (default: site/)

The pages are the hand-written files in web/; the data is exported from the app's own server
(/api/wiki, /api/manual) through scripts/hq_data.py, the same source the desktop app and the
Discord assistant use, so there is no second copy of the data to keep in step. The site is
published by .github/workflows/pages.yml. Standard library only.
"""
import argparse, json, os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hq_data import HQData, ROOT  # noqa: E402

#: The app's colour tokens for pin groups (ui/themes.css, dark theme), for the hosted map.
TOKENS = {'accent-pink-strong': '#ff3d8b', 'accent-pink': '#ff6aa8', 'accent-purple': '#a77bff', 'accent-yellow': '#ffd34d',
          'ok': '#3ddc84', 'info': '#4fb3ff', 'danger': '#ff5a4f', 'text-primary': '#f1f1f3'}


def source_list(ids, registry, limit=12):
    out = []
    for sid in (ids or [])[:limit]:
        s = registry.get(sid)
        if s:
            out.append({'name': ' · '.join(x for x in (s.get('publisher'), s.get('title')) if x) or sid,
                        'url': s.get('url', ''), 'type': s.get('type') or s.get('sourceType') or ''})
    return out


def export(data):
    wiki = data.wiki()
    manual = data.manual()
    pins = data.pins()
    registry = wiki.get('sources', {})
    on_map = {p['ref'] for p in pins if p['ref']}
    entries = []
    for c in wiki.get('categories', []):
        labels = {f['key']: f.get('label') or f['key'].replace('_', ' ').title() for f in c.get('fields', [])}
        for e in wiki.get(c['key'], []):
            facts = []
            for k, v in (e.get('facts') or {}).items():
                if v in (None, '', []):
                    continue
                if isinstance(v, list):
                    v = ', '.join(str(x) for x in v)
                if k == 'price' and isinstance(v, (int, float)):
                    v = f'${v:,.0f}'
                facts.append([labels.get(k, k.replace('_', ' ').title()), str(v)])
            ref = f"{c['key']}/{e['slug']}"
            entries.append({
                'ref': ref, 'section': c['key'], 'section_label': c.get('label') or c['key'].title(),
                'name': e.get('name', ''), 'aliases': e.get('aliases', []), 'summary': e.get('summary', ''),
                'body': [b for b in e.get('body', []) if isinstance(b, str)], 'steps': e.get('steps', []),
                'facts': facts, 'spoiler': bool(e.get('spoiler')), 'confidence': e.get('confidence', ''),
                'verified': e.get('verified', ''), 'sources': source_list(e.get('sources'), registry),
                'on_map': ref in on_map,
            })
    m = wiki.get('map', {})
    config = {
        'width': m['width'], 'height': m['height'], 'image': '../assets/leonida.jpg',
        'attribution': m.get('attribution', ''),
        'labels': {c['key']: c['label'] for c in m.get('categories', [])},
        'colours': {c['key']: TOKENS.get(c.get('color'), c.get('color') if str(c.get('color', '')).startswith('#') else '#7fb3ff')
                    for c in m.get('categories', [])},
    }
    pin_out = [{k: p[k] for k in ('name', 'category', 'kind', 'x', 'y', 'ref', 'summary', 'spoiler', 'guide')} for p in pins]
    manual_out = {'title': manual.get('title'), 'sources': manual.get('sources', {}),
                  'chapters': [{'id': ch.get('id'), 'title': ch.get('title'), 'pages': ch.get('pages', [])}
                               for ch in manual.get('chapters', []) if ch.get('status', 'published') == 'published']}
    return config, pin_out, entries, manual_out


def build(data, out):
    if os.path.isdir(out):
        shutil.rmtree(out)
    shutil.copytree(os.path.join(ROOT, 'web'), out)
    assets = os.path.join(out, 'assets')
    for name in ('leaflet.js', 'leaflet.css'):
        shutil.copy2(os.path.join(ROOT, 'ui', 'vendor', name), os.path.join(assets, name))
    shutil.copy2(os.path.join(ROOT, 'images', 'map', 'leonida-official.jpg'), os.path.join(assets, 'leonida.jpg'))
    shutil.copy2(os.path.join(ROOT, 'images', 'community', 'server-icon.png'), os.path.join(assets, 'icon.png'))
    config, pins, entries, manual = export(data)
    os.makedirs(os.path.join(out, 'data'), exist_ok=True)
    for name, value in (('map', config), ('pins', pins), ('entries', entries), ('manual', manual)):
        with open(os.path.join(out, 'data', f'{name}.json'), 'w', encoding='utf-8') as f:
            json.dump(value, f, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(out, '.nojekyll'), 'w').close()
    return {'pins': len(pins), 'entries': len(entries), 'pages': sum(len(c['pages']) for c in manual['chapters'])}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser()
    ap.add_argument('--url')
    ap.add_argument('--out', default=os.path.join(ROOT, 'site'))
    args = ap.parse_args()
    data = HQData(args.url) if args.url else HQData.start()
    try:
        print('built', args.out, build(data, args.out))
    finally:
        data.stop()

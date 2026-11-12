"""Audit every media file against data/media.json and write the rights reports.

    python scripts/audit_media.py

Writes docs/compliance/MEDIA-RIGHTS-AUDIT.md, DISTRIBUTION-ASSET-ALLOWLIST.md and media-hashes.csv.
Reads only; data/media.json is not changed. Standard library only.
Exit code 1 if a file has no record, a record has no file, or two files are identical.
"""
import csv, datetime, glob, hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'compliance')
NOW = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
MEDIA_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm'}

# How each recorded rights status maps to a distribution decision.
DECISION = {
    'approved': 'approved_for_distribution',
    'permission_required': 'local_personal_use_only',
    'unknown': 'unknown',
    'rejected': 'rejected',
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def text(rel):
    try:
        return open(os.path.join(ROOT, rel), encoding='utf-8-sig', errors='replace').read()
    except OSError:
        return ''


def kind_of(asset):
    """evidence_frame | official_illustration | owner_supplied_unverified, from the recorded source."""
    src = (asset.get('source') or '').lower()
    if src.startswith('frame at') or 'frame of' in src and 'extended look' in src:
        return 'evidence_frame'
    if 'supplied by the app owner' in src or src.startswith('still from wallpapers') or src.startswith('crop of images') or 'wallpapers/' in src:
        return 'owner_supplied_unverified'
    return 'official_illustration'


def main():
    os.makedirs(OUT, exist_ok=True)
    media = json.loads(text('data/media.json'))
    records = {a['file']: a for a in media['assets']}
    disk = {}
    for top in ('images', 'wallpapers'):
        for base, _, files in os.walk(os.path.join(ROOT, top)):
            for f in files:
                if os.path.splitext(f)[1].lower() in MEDIA_EXT:
                    full = os.path.join(base, f)
                    disk[os.path.relpath(full, ROOT).replace(os.sep, '/')] = full

    no_record = sorted(set(disk) - set(records))
    no_file = sorted(set(records) - set(disk))
    hashes = {rel: sha256(full) for rel, full in disk.items()}
    by_hash = {}
    for rel, h in hashes.items():
        by_hash.setdefault(h, []).append(rel)
    dupes = sorted(v for v in by_hash.values() if len(v) > 1)

    # Where is each file used? Entry pictures by folder convention, plus any path written in data or interface files.
    wiki = json.loads(text('data/wiki.json'))
    for path in glob.glob(os.path.join(ROOT, 'data', 'wiki', '*.json')):
        part = json.loads(open(path, encoding='utf-8-sig').read())
        if isinstance(part, list):
            name = os.path.basename(path)[:-5]
            wiki[name] = (wiki.get(name) or []) + part
    slugs = {(c['key'], e.get('slug')) for c in wiki['categories'] for e in (wiki.get(c['key']) or [])}
    haystack = ''.join(text(p) for p in ['data/wiki.json', 'data/manual.json', 'ui/app.js', 'ui/manual.js', 'ui/index.html', 'ui/styles.css', 'ui/art.js']
                       + [os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, 'data', 'wiki', '*.json'))])
    derived = {a.get('derived_from') for a in media['assets']} | {(a.get('source') or '').split('wallpapers/')[-1] for a in media['assets']}

    def used(rel):
        parts = rel.split('/')
        if len(parts) == 3 and parts[0] == 'images' and (parts[1], os.path.splitext(parts[2])[0]) in slugs:
            return 'entry picture'
        if rel in haystack or ('/' + rel) in haystack:
            return 'named in data or interface'
        if rel in derived or os.path.basename(rel) in derived:
            return 'source of another asset'
        return ''

    usage = {rel: used(rel) for rel in disk}
    unused = sorted(rel for rel, u in usage.items() if not u)

    with open(os.path.join(OUT, 'media-hashes.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['file', 'sha256', 'bytes', 'rights_status', 'decision', 'kind', 'used_as', 'source', 'accessed'])
        for rel in sorted(disk):
            a = records.get(rel, {})
            w.writerow([rel, hashes[rel], os.path.getsize(disk[rel]), a.get('rights_status', ''), DECISION.get(a.get('rights_status'), 'unknown'),
                        kind_of(a) if a else '', usage[rel], a.get('source', ''), a.get('accessed', '')])

    decisions, kinds = {}, {}
    for rel in disk:
        a = records.get(rel, {})
        d = DECISION.get(a.get('rights_status'), 'unknown')
        decisions.setdefault(d, []).append(rel)
        if a:
            kinds[kind_of(a)] = kinds.get(kind_of(a), 0) + 1
    missing_fields = sorted(rel for rel, a in records.items() if not all(a.get(k) for k in ('source', 'license', 'creator', 'alt')))
    no_date = sorted(rel for rel, a in records.items() if not a.get('accessed'))

    def listing(items, empty='None.'):
        return [f'- `{i}`' if isinstance(i, str) else '- ' + ' = '.join(f'`{x}`' for x in i) for i in items] or [empty]

    r = ['# Media rights audit', '', f'Generated {NOW} by `scripts/audit_media.py` from the files on disk and `data/media.json`. Do not edit by hand.', '',
         '## Summary', '', '| Check | Result |', '|---|---|',
         f'| Media files on disk (`images/`, `wallpapers/`) | {len(disk)} |',
         f'| Records in `data/media.json` | {len(records)} |',
         f'| Files with no record | {len(no_record)} |',
         f'| Records with no file | {len(no_file)} |',
         f'| Groups of identical files | {len(dupes)} |',
         f'| Files not used anywhere | {len(unused)} |',
         f'| Records missing source, licence, creator or description | {len(missing_fields)} |',
         f'| Records with no retrieval date | {len(no_date)} |', '',
         '## Distribution decision', '',
         'The decision is derived from each record\'s `rights_status`. Nothing here is legal advice, and no permission has been requested or granted.', '',
         '| Decision | Files | Meaning |', '|---|---|---|',
         f'| approved_for_distribution | {len(decisions.get("approved_for_distribution", []))} | Cleared to ship in a public package |',
         f'| local_personal_use_only | {len(decisions.get("local_personal_use_only", []))} | Copyright Rockstar Games; fine on the owner\'s own machine, not cleared to redistribute |',
         f'| unknown | {len(decisions.get("unknown", []))} | Origin or rights not established |',
         f'| rejected | {len(decisions.get("rejected", []))} | Must not be used |', '',
         '**No file is cleared for public distribution.** A public installer built today would have to leave out every picture and video.', '',
         '## What kind of picture each record is', '', '| Kind | Records |', '|---|---|']
    r += [f'| {k} | {v} |' for k, v in sorted(kinds.items())]
    r += ['', '`evidence_frame`: a frame of Rockstar\'s official video, used as evidence in the manual or as an entry picture. `official_illustration`: an official Rockstar screenshot or artwork. `owner_supplied_unverified`: supplied by the app owner, or cut from such a file; where it first came from is not recorded.', '',
          '## Files with no record', ''] + listing(no_record)
    r += ['', '## Records with no file', ''] + listing(no_file)
    r += ['', '## Identical files', ''] + listing(dupes)
    r += ['', '## Files not used anywhere', '', 'On disk and recorded, but no entry, manual page or interface file points at them.', ''] + listing(unused)
    r += ['', '## Records with no retrieval date', ''] + listing(no_date)
    r += ['', '## Owner decisions still needed', '',
          '1. Is the app for private use only, or will it be distributed? Private use is the lower-risk case; keep this register either way.',
          '2. For distribution: ask Rockstar Games for permission, or ship a package without the media.',
          '3. Where did the wallpapers and the logo (`unknown`) come from? Without that they cannot be cleared.', '',
          'Per-file hashes, sources and decisions: `media-hashes.csv`.', '']
    open(os.path.join(OUT, 'MEDIA-RIGHTS-AUDIT.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(r))

    a = ['# Distribution asset allowlist', '', f'Generated {NOW} by `scripts/audit_media.py`. Do not edit by hand.', '',
         'Only files listed under "Approved" may go into a public release package.', '', '## Approved for distribution', '']
    a += listing(sorted(decisions.get('approved_for_distribution', [])), 'None. No media file is cleared for public distribution.')
    for key, title in (('local_personal_use_only', 'Local personal use only'), ('unknown', 'Unknown'), ('rejected', 'Rejected')):
        a += ['', f'## {title} ({len(decisions.get(key, []))})', ''] + listing(sorted(decisions.get(key, [])))
    a.append('')
    open(os.path.join(OUT, 'DISTRIBUTION-ASSET-ALLOWLIST.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(a))

    print(f'{len(disk)} files, {len(records)} records; no record {len(no_record)}, no file {len(no_file)}, identical groups {len(dupes)}, unused {len(unused)}')
    print('decisions:', {k: len(v) for k, v in decisions.items()})
    sys.exit(1 if (no_record or no_file or dupes) else 0)


main()

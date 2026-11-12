"""Generate the project's current-state reports from the live checkout.

    python scripts/current_state.py               counts only
    python scripts/current_state.py --run-checks  also run fmt, clippy, tests, release build, validator, node --check

Writes docs/status/CURRENT-STATE.md, DATA-AND-MANUAL-COUNTS.md, REPOSITORY-INVENTORY.md and,
with --run-checks, BASELINE-TEST-RESULTS.md. Nothing else is changed. Standard library only.
"""
import datetime, glob, json, math, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'status')
NOW = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')


def read_json(path):
    return json.loads(open(os.path.join(ROOT, path), encoding='utf-8-sig').read())


def load_wiki():
    """wiki.json with the per-section files in data/wiki/ merged in, as the app does."""
    wiki = read_json('data/wiki.json')
    for path in sorted(glob.glob(os.path.join(ROOT, 'data', 'wiki', '*.json'))):
        name = os.path.basename(path)[:-5]
        part = json.loads(open(path, encoding='utf-8-sig').read())
        if isinstance(part, dict):
            wiki.setdefault(name, {}).update(part)
        else:
            wiki[name] = (wiki.get(name) or []) + part
    return wiki


def manual_pages(manual, wiki):
    """Pages per chapter, following ui/manual.js: buildPages()."""
    rows = []
    for ch in manual['chapters']:
        if ch.get('status') == 'in-development':
            n, state = 1, 'In development'
        elif ch.get('wiki'):
            entries = [e for e in wiki.get(ch['wiki']['section'], []) if e.get('status') != 'draft' and not e.get('spoiler')]
            n = max(1, math.ceil(len(entries) / (ch['wiki'].get('perPage') or 3)))
            state = f"Published, {len(entries)} encyclopedia entries"
        elif ch.get('sourcesChapter'):
            n = math.ceil(len(manual['sources']) / 3) + (1 if manual.get('uncheckedSources') else 0)
            state = f"Published, {len(manual['sources'])} sources"
        else:
            n, state = len(ch['pages']), 'Published, written for the manual'
        rows.append((ch['number'], ch['title'], state, n))
    return rows


def evidence_totals(manual):
    per = {}
    for ch in manual['chapters']:
        for page in ch.get('pages', []):
            for b in page['blocks']:
                if b.get('evidence'):
                    per.setdefault(ch['title'], {}).setdefault(b['evidence'], 0)
                    per[ch['title']][b['evidence']] += 1
    return per


def tree_size(rel):
    count = size = 0
    for base, _, files in os.walk(os.path.join(ROOT, rel)):
        for f in files:
            count += 1
            size += os.path.getsize(os.path.join(base, f))
    return count, size


def mb(n):
    return f'{n / 1048576:.1f} MB'


def run(cmd):
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=isinstance(cmd, str))
        return p.returncode, (p.stdout or '') + (p.stderr or '')
    except FileNotFoundError as e:
        return 127, str(e)


def git_state():
    code, out = run(['git', 'rev-parse', '--short', 'HEAD'])
    if code != 0:
        return 'Not a Git repository: no commit, branch or history.'
    _, branch = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    _, dirty = run(['git', 'status', '--porcelain'])
    return f"Commit {out.strip()} on {branch.strip()}, {len(dirty.splitlines())} uncommitted paths."


def checks():
    exe = os.path.join(ROOT, 'target', 'release', 'gta6-hq.exe')
    js = sorted(p for p in glob.glob(os.path.join(ROOT, 'ui', '*.js')))
    plan = [
        ('Formatting', ['cargo', 'fmt', '--all', '--', '--check']),
        ('Clippy, warnings as errors', ['cargo', 'clippy', '--all-targets', '--all-features', '--', '-D', 'warnings']),
        ('Tests', ['cargo', 'test']),
        ('Release build', ['cargo', 'build', '--release']),
        ('Data validator', [exe, '--validate']),
    ] + [(f'node --check ui/{os.path.basename(p)}', ['node', '--check', p]) for p in js]
    results = []
    for name, cmd in plan:
        code, out = run(cmd)
        detail = ''
        if name == 'Tests':
            m = re.findall(r'test result: \w+\. (\d+) passed; (\d+) failed', out)
            detail = '; '.join(f'{a} passed, {b} failed' for a, b in m)
        if name == 'Data validator':
            m = re.search(r'\*\*(\d+) errors?, (\d+) warnings?\*\*', out)
            kinds = {}
            for k in re.findall(r'^\| `([a-z-]+)` \|', out, re.M):
                kinds[k] = kinds.get(k, 0) + 1
            detail = (f'{m.group(1)} errors, {m.group(2)} warnings' if m else 'no summary line') + \
                     ('; by check: ' + ', '.join(f'{k} {v}' for k, v in sorted(kinds.items())) if kinds else '')
        results.append((name, ' '.join(os.path.relpath(c, ROOT) if os.path.isabs(c) else c for c in cmd), code, detail))
    return results


def main():
    os.makedirs(OUT, exist_ok=True)
    wiki, manual, media = load_wiki(), read_json('data/manual.json'), read_json('data/media.json')
    version = re.search(r'^version\s*=\s*"([^"]+)"', open(os.path.join(ROOT, 'Cargo.toml'), encoding='utf-8').read(), re.M).group(1)
    cats = wiki['categories']
    rows = []
    for c in cats:
        es = wiki.get(c['key']) or []
        rows.append((c['label'], len(es), sum(e.get('status') == 'draft' for e in es), sum(bool(e.get('spoiler')) for e in es),
                     sum(not e.get('sources') for e in es)))
    total = sum(r[1] for r in rows)
    pages = manual_pages(manual, wiki)
    book = sum(p[3] for p in pages) + 1
    ev = evidence_totals(manual)
    rights = {}
    for a in media['assets']:
        rights[a.get('rights_status', 'missing')] = rights.get(a.get('rights_status', 'missing'), 0) + 1
    img_n, img_s = tree_size('images')
    wall_n, wall_s = tree_size('wallpapers')
    cache_n, cache_s = tree_size('cache')
    results = checks() if '--run-checks' in sys.argv else None

    counts = [f'# Data and manual counts', '', f'Generated {NOW} by `scripts/current_state.py` from the live data files. Do not edit by hand.', '',
              '## Encyclopedia', '', '| Category | Entries | Drafts | Spoilers | Without a source |', '|---|---|---|---|---|']
    counts += [f'| {a} | {b} | {c} | {d} | {e} |' for a, b, c, d, e in rows]
    counts += [f'| **Total** | **{total}** | {sum(r[2] for r in rows)} | {sum(r[3] for r in rows)} | {sum(r[4] for r in rows)} |', '',
               f'Sources in the registry: {len(wiki.get("sources", {}))}. Map markers: {len(wiki["map"]["markers"])} in {len(wiki["map"]["categories"])} categories.', '',
               '## Field Manual', '', '| No. | Chapter | State | Pages |', '|---|---|---|---|']
    counts += [f'| {a} | {b} | {c} | {d} |' for a, b, c, d in pages]
    counts += [f'| | **Whole book, as the reader counts it (contents is page 1; the cover is unnumbered)** | | **{book}** |', '',
               f'Manual sources: {len(manual["sources"])} checked, {len(manual.get("uncheckedSources", []))} listed but not checked.', '',
               '## Evidence labels in written chapters', '']
    labels = sorted({k for v in ev.values() for k in v})
    counts += ['| Chapter | ' + ' | '.join(labels) + ' |', '|---|' + '---|' * len(labels)]
    counts += [f'| {ch} | ' + ' | '.join(str(v.get(k, 0)) for k in labels) + ' |' for ch, v in ev.items()]
    counts += ['', '## Media', '', f'Records in `data/media.json`: {len(media["assets"])}.', '', '| Rights status | Records |', '|---|---|']
    counts += [f'| {k} | {v} |' for k, v in sorted(rights.items())]
    counts += ['', f'Files on disk: `images/` {img_n} ({mb(img_s)}), `wallpapers/` {wall_n} ({mb(wall_s)}). Map tile cache: {cache_n} files ({mb(cache_s)}).', '']
    open(os.path.join(OUT, 'DATA-AND-MANUAL-COUNTS.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(counts))

    inv = ['# Repository inventory', '', f'Generated {NOW} by `scripts/current_state.py`. Do not edit by hand.', '', '| Folder | Files | Size |', '|---|---|---|']
    for rel in ['src', 'ui', 'data', 'images', 'wallpapers', 'docs', 'scripts', 'cache', 'backups', 'staging', 'zips', 'target/release']:
        if os.path.isdir(os.path.join(ROOT, rel)):
            n, s = tree_size(rel)
            inv.append(f'| `{rel}/` | {n} | {mb(s)} |')
    inv += ['', '## Source files', '', '| File | Lines |', '|---|---|']
    for pat in ['src/*.rs', 'ui/*.js', 'ui/*.css', 'ui/*.html', 'data/*.json', 'data/wiki/*.json', 'scripts/*']:
        for p in sorted(glob.glob(os.path.join(ROOT, pat))):
            if os.path.isfile(p):
                inv.append(f'| `{os.path.relpath(p, ROOT).replace(os.sep, "/")}` | {sum(1 for _ in open(p, encoding="utf-8", errors="replace"))} |')
    inv += ['', '## Top level', '', ', '.join(f'`{n}`' for n in sorted(os.listdir(ROOT)) if not n.startswith('target')), '']
    open(os.path.join(OUT, 'REPOSITORY-INVENTORY.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(inv))

    if results is not None:
        t = ['# Baseline test results', '', f'Run {NOW} by `scripts/current_state.py --run-checks` against the live checkout.', '',
             '| Check | Command | Exit code | Result |', '|---|---|---|---|']
        t += [f'| {n} | `{c}` | {code} | {"Pass" if code == 0 else "FAIL"}{". " + d if d else ""} |' for n, c, code, d in results]
        t += ['', 'Not covered by this run: interface tests (none exist yet), accessibility, performance, clean-machine install.', '']
        open(os.path.join(OUT, 'BASELINE-TEST-RESULTS.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(t))

    cur = ['# GTA 6 HQ: current state', '',
           f'Generated {NOW} by `scripts/current_state.py`. **This is the one authoritative status report.** Older reports are history; see `REPORT-INDEX.md`.', '',
           '| Item | Now |', '|---|---|',
           f'| App version | {version} (`Cargo.toml`) |',
           f'| Version control | {git_state()} |',
           f'| Encyclopedia | {total} entries in {len(cats)} categories; {sum(1 for r in rows if r[1] == 0)} categories empty |',
           f'| Field Manual | {len(manual["chapters"])} chapters, {book} pages; {sum(1 for p in pages if p[2] == "In development")} chapter in development |',
           f'| Media records | {len(media["assets"])}: ' + ', '.join(f'{v} {k}' for k, v in sorted(rights.items())) + ' |',
           f'| Map | {len(wiki["map"]["markers"])} markers; tile cache {cache_n} files, {mb(cache_s)}; never pruned, limited to 1,365 tiles by the zoom limit |']
    if results is not None:
        for n, c, code, d in results:
            if not n.startswith('node'):
                cur.append(f'| {n} | {"Pass" if code == 0 else "FAIL"}{". " + d if d else ""} |')
        node = [r for r in results if r[0].startswith('node')]
        cur.append(f'| JavaScript syntax | {sum(r[2] == 0 for r in node)} of {len(node)} files pass `node --check` |')
    else:
        cur.append('| Checks | Not run in this generation; see `BASELINE-TEST-RESULTS.md` for the last run |')
    cur += ['', 'Detail: `DATA-AND-MANUAL-COUNTS.md`, `REPOSITORY-INVENTORY.md`, `BASELINE-TEST-RESULTS.md`, `../compliance/MEDIA-RIGHTS-AUDIT.md`.', '']
    blockers = os.path.join(OUT, 'KNOWN-BLOCKERS.md')
    if os.path.exists(blockers):
        cur += [open(blockers, encoding='utf-8').read().rstrip(), '']
    open(os.path.join(OUT, 'CURRENT-STATE.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(cur))
    print(f'entries {total}, manual pages {book}, media {len(media["assets"])}')
    if results is not None:
        for n, c, code, d in results:
            print(f'  {"ok  " if code == 0 else "FAIL"} {n} {d}')


main()

"""Print a short summary of one benchmark session: scripts/perf/summarise.py <folder>"""
import collections
import json
import os
import sys

d = sys.argv[1]
s = json.load(open(os.path.join(d, 'session.json')))
for k in ['homeStart', 'homeEnd', 'homePaused', 'idleOtherPage']:
    print(k, json.dumps(s.get(k)))
print('navigation', json.dumps(s['navigation']['all']), 'slowest place', max(s['navigation']['perPlace'].items(), key=lambda kv: kv[1]['median']))
print('search', json.dumps(s['searchApi']))
print('routes', json.dumps(s['routes']))
for k in ['searchPage', 'manualOpenMs', 'manualPageTurn', 'manualNightSwitch', 'manualAfter', 'mapFirst', 'mapRevisit', 'mediaOpenMs', 'mediaStart', 'mediaScrolled', 'mediaViewerOpen', 'mediaAfterViewer', 'shutdown']:
    print(k, json.dumps(s.get(k)))
# A label may itself contain commas; the nine numbers are always the last nine fields.
names = ['time', 'label', 'processes', 'cpu_pct', 'private_mb', 'working_set_mb', 'threads', 'handles', 'gpu_pct', 'gpu_decode_pct']
rows = []
for line in open(os.path.join(d, 'session-samples.csv')).read().splitlines()[1:]:
    f = line.split(',')
    rows.append(dict(zip(names, [f[0], ','.join(f[1:len(f) - 8])] + f[len(f) - 8:])))
by = collections.OrderedDict()
for r in rows:
    if r['cpu_pct'] != '':
        by.setdefault(r['label'], []).append(r)
num = lambda xs: [float(x) for x in xs if x != '']
for k, v in by.items():
    c, m, g, dec = num(r['cpu_pct'] for r in v), num(r['private_mb'] for r in v), num(r['gpu_pct'] for r in v), num(r['gpu_decode_pct'] for r in v)
    print(f"{k[:44]:44} n={len(v):3} cpu avg {sum(c) / len(c):6.1f} max {max(c):6.1f} | private MB {m[0]:.0f}->{m[-1]:.0f} max {max(m):.0f} | gpu avg {sum(g) / max(1, len(g)):.1f} decode {sum(dec) / max(1, len(dec)):.1f} | threads {v[-1]['threads']} handles {v[-1]['handles']}")

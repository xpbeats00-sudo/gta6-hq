"""Build the map's routing grids, so route legs run along the roads you see on the map.

The route planner and the robbery run draw each leg along a grid instead of as a straight line. Each
cell is road, track, land or sea. Positions are on Rockstar's official map picture
(images/map/leonida-official.jpg, 2805 x 3840), as everywhere else in the app.

The roads are read from the detailed community map the app shows when zoomed in (the GTA VI mapping
community via gtadb.org, CC BY 4.0, served by gta6-wiki.org): its zoom-4 tiles, which the app keeps in
cache/tiles/4/ once viewed. That map draws every street, highway and dirt track, where Rockstar's map
draws only the main roads, so legs worked out on it sit on the roads seen when zoomed in. The tiles
sit on the official map by the fit in data/wiki.json (map.tileFit). Where the tiles do not reach,
the official map's own colours are used.

  road  - streets (white) and highways (pale yellow), and bridges
  track - dirt tracks and trails (brown)
  land  - anything else that is not water
  sea   - water, and the official map's furniture drawn on it (legend, compass, seal, title)

Two grids are written, as greyscale PNGs (0 = sea, 96 = land, 176 = track, 255 = road):

  images/map/leonida-roads.png   one cell per 2 x 2 official-map pixels: the legs are drawn on it
  images/map/leonida-routes.png  one cell per 6 x 6 pixels: for putting stops in order (fast)

Fetch the zoom-4 tiles first if cache/tiles/4/ is empty (open the map and zoom in, or request
/tiles/4/<y>/<x>.webp from the running app for y 0-9, x 0-7), then:

  python scripts/build_route_grid.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OFFICIAL = ROOT / 'images' / 'map' / 'leonida-official.jpg'
TILES = ROOT / 'cache' / 'tiles' / '4'
FINE = ROOT / 'images' / 'map' / 'leonida-roads.png'
COARSE = ROOT / 'images' / 'map' / 'leonida-routes.png'
SEA, LAND, TRACK, ROAD = 0, 96, 176, 255

# The official map's furniture, as fractions of the picture (left, top, right, bottom): its white
# parts would otherwise read as roads. All of it sits on open sea, so it is filed as sea.
FURNITURE = [
    (0.000, 0.000, 1.000, 0.026), (0.000, 0.974, 1.000, 1.000),  # grid letters, top and bottom
    (0.000, 0.000, 0.034, 1.000), (0.966, 0.000, 1.000, 1.000),  # grid numbers, left and right
    (0.060, 0.045, 0.240, 0.195),  # legend box with its scale bar
    (0.115, 0.655, 0.215, 0.735),  # compass rose
    (0.680, 0.775, 0.950, 0.950),  # state seal and "The Great State of Leonida"
]


def classify(rgb, official=False):
    """Per-pixel kind from map colours."""
    r, g, b = (rgb[..., i].astype(np.int16) for i in range(3))
    lo, hi = rgb.min(axis=2).astype(np.int16), rgb.max(axis=2).astype(np.int16)
    if official:
        road = (lo > 215) & (hi - lo < 40)
        track = np.zeros_like(road)
    else:
        # Streets are white; highways pale yellow. City blocks are grey (below 225) and sand is a
        # deeper yellow (blue near 150), so neither passes.
        road = (r > 232) & (g > 232) & (b > 195)
        track = (r > 120) & (r < 215) & (r - b > 55) & (g - b > 25) & (r - g > 15)  # brown trails
    sea = (b > r + 50) & (g > r + 30) & ~road
    kind = np.full(r.shape, LAND, np.uint8)
    kind[track] = TRACK
    kind[sea] = SEA
    kind[road] = ROAD
    return kind


def grow(mask, n=1):
    """Widen a mask by n pixels (so a thin line is not missed when sampled)."""
    out = mask.copy()
    for _ in range(n):
        m = out.copy()
        m[1:] |= out[:-1]; m[:-1] |= out[1:]; m[:, 1:] |= out[:, :-1]; m[:, :-1] |= out[:, 1:]
        out = m
    return out


def main():
    official = np.asarray(Image.open(OFFICIAL).convert('RGB'))
    oh, ow, _ = official.shape
    base = classify(official, official=True)
    for left, top, right, bottom in FURNITURE:
        base[int(top * oh):int(bottom * oh), int(left * ow):int(right * ow)] = SEA

    fit = json.loads((ROOT / 'data' / 'wiki.json').read_text(encoding='utf-8'))['map']['tileFit']
    k = 2 ** (4 - fit['zoom'])  # zoom-4 pixels per zoom-3 pixel
    files = sorted(TILES.glob('*/*.webp'))
    if not files:
        raise SystemExit('No zoom-4 tiles in cache/tiles/4/: fetch them first (see the top of this file).')
    rows = max(int(f.parent.name) for f in files) + 1
    cols = max(int(f.stem) for f in files) + 1
    mosaic = np.zeros((rows * 512, cols * 512, 3), np.uint8)
    have = np.zeros((rows * 512, cols * 512), bool)
    for f in files:
        y, x = int(f.parent.name), int(f.stem)
        mosaic[y * 512:(y + 1) * 512, x * 512:(x + 1) * 512] = np.asarray(Image.open(f).convert('RGB'))
        have[y * 512:(y + 1) * 512, x * 512:(x + 1) * 512] = True
    detail = classify(mosaic)
    road, track, sea = grow(detail == ROAD), grow(detail == TRACK), detail == SEA

    def grid(cell):
        gh, gw = oh // cell, ow // cell
        # The middle of each cell, in official pixels, then in zoom-4 tile pixels.
        oy, ox = np.mgrid[0:gh, 0:gw].astype(np.float64)
        oy, ox = (oy + 0.5) * cell, (ox + 0.5) * cell
        ty = np.round(k * (fit['scale'] * oy + fit['y'])).astype(int)
        tx = np.round(k * (fit['scale'] * ox + fit['x'])).astype(int)
        inside = (ty >= 0) & (tx >= 0) & (ty < mosaic.shape[0]) & (tx < mosaic.shape[1])
        tyc, txc = np.clip(ty, 0, mosaic.shape[0] - 1), np.clip(tx, 0, mosaic.shape[1] - 1)
        covered = inside & have[tyc, txc]
        # Where the tiles do not reach: the official map, read cell by cell (any road pixel is road).
        blocks = lambda m: m[:gh * cell, :gw * cell].reshape(gh, cell, gw, cell)
        o_road = blocks(base == ROAD).sum(axis=(1, 3)) >= max(1, cell // 2)
        o_sea = blocks(base == SEA).mean(axis=(1, 3)) > 0.6
        out = np.full((gh, gw), LAND, np.uint8)
        out[o_sea] = SEA
        out[o_road] = ROAD
        # Where they do: sample around each cell's middle (a cell spans k * scale * cell tile pixels).
        span = max(1, int(round(k * fit['scale'] * cell / 2)))
        d_road = np.zeros((gh, gw), bool); d_track = np.zeros((gh, gw), bool); d_sea = np.zeros((gh, gw), int)
        n = 0
        for dy in range(-span + 1, span):
            for dx in range(-span + 1, span):
                yy = np.clip(tyc + dy, 0, mosaic.shape[0] - 1); xx = np.clip(txc + dx, 0, mosaic.shape[1] - 1)
                d_road |= road[yy, xx]; d_track |= track[yy, xx]; d_sea += sea[yy, xx]; n += 1
        d = np.full((gh, gw), LAND, np.uint8)
        d[d_sea > n * 0.6] = SEA
        d[d_track] = TRACK
        d[d_road] = ROAD
        out[covered] = d[covered]
        return out

    for cell, path in ((2, FINE), (6, COARSE)):
        g = grid(cell)
        Image.fromarray(g, 'L').save(path, optimize=True)
        counts = {name: int((g == v).sum()) for name, v in (('sea', SEA), ('land', LAND), ('track', TRACK), ('road', ROAD))}
        print(f'{path.relative_to(ROOT)}: {g.shape[1]} x {g.shape[0]} cells, {counts}')


if __name__ == '__main__':
    main()

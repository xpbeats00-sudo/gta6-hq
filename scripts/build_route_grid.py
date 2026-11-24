"""Build the map's routing grid from Rockstar's official map picture.

The route planner and the robbery run draw their legs along this grid instead of as straight lines:
each cell of the grid is road, land or sea, read from the colours of images/map/leonida-official.jpg.

  road  - the map's white road lines (interstates, highways, routes, and the bridges over water)
  land  - anything else that is not sea (towns, parks, swamp, beaches)
  sea   - the cyan water, and the map's own furniture drawn on it (legend, compass, seal, title)

The grid is 1/6 of the picture's size, one cell per 6 x 6 pixels, saved as a greyscale PNG:
0 = sea, 128 = land, 255 = road. Run it again if the official map picture changes:

  python scripts/build_route_grid.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'images' / 'map' / 'leonida-official.jpg'
OUT = ROOT / 'images' / 'map' / 'leonida-routes.png'
CELL = 6

# The map's own furniture, as fractions of the picture (left, top, right, bottom): its white parts
# would otherwise read as roads. All of it sits on open sea, so it is filed as sea.
FURNITURE = [
    (0.000, 0.000, 1.000, 0.026),  # grid letters along the top edge
    (0.000, 0.974, 1.000, 1.000),  # and the bottom edge
    (0.000, 0.000, 0.034, 1.000),  # grid numbers down the left edge
    (0.966, 0.000, 1.000, 1.000),  # and the right edge
    (0.060, 0.045, 0.240, 0.195),  # legend box with its scale bar
    (0.115, 0.655, 0.215, 0.735),  # compass rose
    (0.680, 0.775, 0.950, 0.950),  # state seal and "The Great State of Leonida"
]


def main():
    im = np.asarray(Image.open(SOURCE).convert('RGB')).astype(np.int16)
    h, w, _ = im.shape
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    lo = im.min(axis=2)
    hi = im.max(axis=2)
    # Roads: near white and grey-free. The faint grid lines over the sea are far below this.
    road = (lo > 215) & (hi - lo < 40)
    # Sea: blue and green well above red (the cyan water and its darker shades).
    sea = (b > r + 60) & (g > r + 40) & ~road

    for left, top, right, bottom in FURNITURE:
        y0, y1, x0, x1 = int(top * h), int(bottom * h), int(left * w), int(right * w)
        road[y0:y1, x0:x1] = False
        sea[y0:y1, x0:x1] = True

    gh, gw = h // CELL, w // CELL
    crop = (slice(0, gh * CELL), slice(0, gw * CELL))
    blocks = lambda m: m[crop].reshape(gh, CELL, gw, CELL)
    road_n = blocks(road).sum(axis=(1, 3))
    sea_n = blocks(sea).sum(axis=(1, 3))
    grid = np.full((gh, gw), 128, np.uint8)            # land
    grid[sea_n > CELL * CELL * 0.6] = 0                 # mostly water: sea
    grid[road_n >= 3] = 255                             # any real stretch of road line: road
    Image.fromarray(grid, 'L').save(OUT, optimize=True)
    counts = {name: int((grid == v).sum()) for name, v in (('sea', 0), ('land', 128), ('road', 255))}
    print(f'{OUT.relative_to(ROOT)}: {gw} x {gh} cells, {counts}')


if __name__ == '__main__':
    main()

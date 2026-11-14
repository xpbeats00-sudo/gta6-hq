"""What moves in each picture, for make_live_wallpapers.py. Coordinates are pixels of the 2000 x 1125
source pictures in images/artwork/.

    subjects   boxes around the people; they are cut out and brought nearer than the scenery
    near       (box, depth) for other things close to the viewer: a table, a car, a boat
    sway       (box, pixels, wavelength, speed) for palms, trees, hair and grass
    water      (outline, pixels) for water that ripples
    neon       glow that pulses; `boxes` limits it to part of the picture
    strobe     (box, colour) for police lights, colours as blue-green-red
    flicker    (box, feather) for muzzle flash and headlights
    smoke      drifting haze in a box
    sun        (x, y, radius, colour) for a glow that breathes
    sprites    small things lifted out and flown along a line
    particles  (kind, count): dust, pollen, bokeh, embers
"""
RED, BLUE = (40, 40, 255), (255, 90, 30)

SCENES = {
    'jason-lucia-gas-station': {
        'file': 'jason-lucia-gas-station.webp',
        'subjects': [(790, 110, 1300, 1125), (1160, 20, 1730, 1125)],
        'near': [((1260, 840, 2000, 1125), 0.55)],
        'sway': [((1700, 430, 2000, 900), 5, 34, 2), ((350, 580, 620, 870), 3, 30, 2), ((190, 800, 260, 930), 2, 26, 3), ((1060, 120, 1190, 330), 2.5, 40, 2)],
        'sprites': [{'box': (88, 478, 186, 535), 'path': ((260, 520), (-110, 430)), 'cycles': 1}],
        'neon': {'boxes': [(260, 680, 1000, 1050)], 'base': 0.08, 'swing': 0.12, 'beats': 2},
        'particles': [('dust', 50)],
    },
    'cal-hampton-boat': {
        'file': 'cal-hampton-boat.webp',
        'subjects': [(440, 40, 1470, 1000)],
        'near': [((280, 780, 2000, 1125), 0.7), ((1390, 300, 2000, 800), 0.55)],
        'water': [([(0, 440), (860, 480), (640, 740), (300, 1125), (0, 1125)], 3.5)],
        'sprites': [{'box': (1645, 45, 1755, 165), 'path': ((1830, -30), (1420, 250)), 'cycles': 1}],
        'particles': [('pollen', 30)],
    },
    'boobie-ike-club': {
        'file': 'boobie-ike-club.webp',
        'subjects': [(690, 30, 1390, 1125)],
        'neon': {'base': 0.1, 'swing': 0.2, 'beats': 4, 'buzz': 0.06},
        'smoke': {'box': (0, 300, 2000, 1000), 'amount': 0.12, 'color': (200, 235, 200)},
        'particles': [('bokeh', 26), ('dust', 40)],
    },
    'drequan-priest-jack-of-hearts': {
        'file': 'drequan-priest-jack-of-hearts.webp',
        'subjects': [(890, 20, 1500, 1040)],
        'near': [((650, 580, 2000, 1125), 0.6)],
        'neon': {'boxes': [(180, 120, 1000, 440), (200, 580, 830, 700)], 'base': 0.18, 'swing': 0.25, 'beats': 2, 'buzz': 0.12},
        'particles': [('dust', 40)],
    },
    'real-dimez-ocean-view': {
        'file': 'real-dimez-ocean-view.webp',
        'subjects': [(400, 90, 1010, 1125), (1020, 100, 1640, 1125)],
        'neon': {'boxes': [(1100, 20, 2000, 620)], 'base': 0.14, 'swing': 0.2, 'beats': 2, 'buzz': 0.08},
        'sway': [((120, 240, 380, 640), 4, 34, 2), ((1560, 260, 1800, 640), 3.5, 34, 2), ((880, 280, 1000, 420), 2, 28, 3), ((540, 100, 860, 380), 1.5, 30, 3)],
        'particles': [('dust', 40)],
    },
    'raul-bautista-duffel': {
        'file': 'raul-bautista-duffel.webp',
        'subjects': [(850, 10, 1510, 1125)],
        'sway': [((1540, 30, 2000, 640), 3.5, 40, 2), ((20, 200, 480, 420), 2.5, 36, 2)],
        'particles': [('pollen', 45)],
        'camera': {'parallax': (20, 8)},
    },
    'brian-heder-boat-yard': {
        'file': 'brian-heder-boat-yard.webp',
        'subjects': [(700, 20, 1630, 860)],
        'near': [((0, 780, 2000, 1125), 0.75), ((1640, 600, 1920, 1125), 0.9), ((40, 440, 640, 900), 0.7)],
        'smoke': {'box': (590, 520, 780, 760), 'amount': 0.4, 'color': (245, 240, 240)},
        'sway': [((840, 360, 960, 600), 2, 30, 2)],
        'particles': [('dust', 60)],
    },
    'jason-lucia-nightclub': {
        'file': 'jason-lucia-nightclub.webp',
        'subjects': [(420, 180, 1560, 1125)],
        'neon': {'base': 0.08, 'swing': 0.2, 'beats': 4, 'buzz': 0.05},
        'particles': [('bokeh', 40), ('dust', 30)],
        'camera': {'parallax': (11, 5)},
    },
    'jason-lucia-bank-robbery': {
        'file': 'jason-lucia-bank-robbery.webp',
        'subjects': [(250, 30, 1160, 1125), (1170, 240, 1660, 1125)],
        'particles': [('dust', 35)],
        'camera': {'parallax': (18, 6), 'pan': (14, 5)},
    },
    'hilltop-sunset': {
        'file': 'hilltop-sunset.webp',
        'far': 0.08, 'ground': 0.8,
        'near': [((0, 0, 1060, 800), 0.5), ((1620, 260, 2000, 940), 0.6)],
        'sway': [((0, 0, 1080, 640), 3, 46, 2), ((1600, 250, 2000, 930), 3, 40, 2), ((0, 770, 2000, 1125), 2.5, 18, 3)],
        'sprites': [
            {'box': (1228, 460, 1268, 486), 'path': ((1100, 500), (1420, 430)), 'cycles': 1, 'thresh': 30, 'bob': 3},
            {'box': (1118, 596, 1150, 622), 'path': ((1000, 640), (1300, 560)), 'cycles': 1, 'thresh': 30, 'bob': 3},
            {'box': (1434, 352, 1462, 376), 'path': ((1330, 390), (1600, 320)), 'cycles': 1, 'thresh': 30, 'bob': 2},
            {'box': (1470, 390, 1506, 412), 'path': ((1380, 420), (1640, 360)), 'cycles': 1, 'thresh': 30, 'bob': 2},
            {'box': (1626, 514, 1672, 542), 'path': ((1760, 505), (1480, 560)), 'cycles': 1, 'thresh': 30},
        ],
        'sun': [(700, 640, 420, (60, 120, 190))],
        'particles': [('pollen', 70)],
    },
    'jason-lucia-car-window': {
        'file': 'jason-lucia-car-window.webp',
        'subjects': [(790, 0, 1960, 1010), (250, 430, 780, 1125)],
        'near': [((0, 0, 900, 330), 0.95), ((0, 930, 2000, 1125), 1.0)],
        'sun': [(300, 400, 300, (120, 200, 240))],
        'sway': [((400, 430, 700, 640), 1.5, 30, 3)],
        'particles': [('dust', 50)],
        'camera': {'parallax': (20, 8)},
    },
    'rusty-anchor-bar': {
        'file': 'rusty-anchor-bar.webp',
        'subjects': [(330, 290, 720, 1125), (590, 400, 1290, 1125), (650, 240, 900, 620)],
        'near': [((1000, 850, 2000, 1125), 0.8)],
        'neon': {'base': 0.1, 'swing': 0.18, 'beats': 3, 'buzz': 0.08},
        'particles': [('dust', 40), ('bokeh', 14)],
    },
    'lucia-shootout-convertible': {
        'file': 'lucia-shootout-convertible.webp',
        'subjects': [(1040, 150, 1620, 900)],
        'near': [((0, 640, 2000, 1125), 0.8)],
        'flicker': [((560, 440, 860, 640), 60)],
        'strobe': [((820, 190, 940, 260), RED), ((880, 270, 1000, 340), BLUE), ((560, 330, 680, 400), RED)],
        'smoke': {'box': (300, 200, 1000, 640), 'amount': 0.12},
        'sway': [((1320, 170, 1560, 470), 2, 34, 3)],
        'particles': [('embers', 20), ('dust', 30)],
    },
    'jason-lucia-convertible-night': {
        'file': 'jason-lucia-convertible-night.webp',
        'subjects': [(430, 400, 900, 1000), (740, 90, 1260, 620)],
        'near': [((1100, 60, 2000, 1125), 0.6)],
        'neon': {'base': 0.08, 'swing': 0.15, 'beats': 2},
        'particles': [('bokeh', 20)],
    },
    'jason-motorbike-police': {
        'file': 'jason-motorbike-police.webp',
        'subjects': [(0, 130, 1450, 1125)],
        'strobe': [((1380, 330, 1640, 560), RED), ((1560, 300, 1980, 620), BLUE)],
        'flicker': [((40, 640, 420, 780), 60)],
        'smoke': {'box': (1300, 200, 2000, 900), 'amount': 0.15, 'color': (220, 200, 255)},
        'particles': [('dust', 70)],
    },
    'jason-biker-standoff': {
        'file': 'jason-biker-standoff.webp',
        'subjects': [(1260, 30, 1960, 1125)],
        'near': [((0, 0, 1080, 1125), 0.95)],
        'smoke': {'box': (700, 0, 2000, 1125), 'amount': 0.2, 'color': (225, 215, 200)},
        'particles': [('dust', 90)],
        'camera': {'parallax': (22, 8)},
    },
    'dirt-bikes-hallway': {
        'file': 'dirt-bikes-hallway.webp',
        'subjects': [(630, 20, 1570, 1125), (120, 220, 610, 1000), (1290, 360, 1960, 1100)],
        'neon': {'base': 0.1, 'swing': 0.2, 'beats': 4, 'buzz': 0.1},
        'flicker': [((1110, 650, 1270, 800), 40), ((230, 540, 340, 620), 40)],
        'particles': [('dust', 40)],
    },
    'canal-police-raid': {
        'file': 'canal-police-raid.webp',
        'far': 0.08, 'ground': 0.75,
        'near': [((700, 780, 2000, 1125), 0.8)],
        'strobe': [((80, 660, 280, 740), BLUE), ((440, 640, 580, 720), RED), ((740, 570, 880, 640), BLUE), ((380, 920, 560, 980), BLUE)],
        'water': [([(0, 960), (760, 960), (700, 1125), (0, 1125)], 3), ([(1500, 1050), (2000, 1000), (2000, 1125), (1500, 1125)], 3)],
        'neon': {'boxes': [(0, 60, 2000, 330)], 'base': 0.1, 'swing': 0.12, 'beats': 2, 'buzz': 0.08},
        'sway': [((1450, 330, 2000, 820), 3, 36, 2)],
        'smoke': {'box': (600, 300, 1100, 620), 'amount': 0.15},
        'particles': [('dust', 30)],
    },
    'dancer-money': {
        'file': 'dancer-money.webp',
        'subjects': [(20, 150, 1750, 1125)],
        'near': [((1540, 90, 2000, 800), 0.95), ((0, 920, 430, 1125), 0.95), ((1150, 520, 1450, 800), 0.9)],
        'neon': {'base': 0.05, 'swing': 0.1, 'beats': 2},
        'particles': [('bokeh', 20)],
        'camera': {'parallax': (24, 10)},
    },
    'dog-and-owner': {
        'file': 'dog-and-owner.webp',
        'subjects': [(40, 110, 900, 1125), (820, 0, 2000, 1125)],
        'sway': [((1560, 0, 2000, 330), 4, 34, 2)],
        'particles': [('pollen', 30)],
    },
    'trap-house-crew': {
        'file': 'trap-house-crew.webp',
        'subjects': [(600, 230, 1700, 1125), (80, 120, 470, 1125), (1340, 0, 1760, 620), (600, 340, 840, 900)],
        'neon': {'boxes': [(1700, 0, 2000, 600)], 'base': 0.1, 'swing': 0.12, 'beats': 2},
        'smoke': {'box': (1500, 0, 2000, 700), 'amount': 0.15, 'color': (255, 200, 190)},
        'sway': [((310, 0, 1000, 330), 2, 20, 2)],
        'particles': [('dust', 50)],
    },
    'tattooed-crew': {
        'file': 'tattooed-crew.webp',
        'subjects': [(520, 330, 1540, 1125), (840, 20, 1130, 420)],
        'near': [((30, 60, 640, 1050), 0.3), ((1380, 70, 1990, 1050), 0.3)],
        'particles': [('dust', 40)],
        'camera': {'parallax': (20, 8)},
    },
    'ricardo-gas-station': {
        'file': 'ricardo-gas-station.webp',
        'far': 0.08, 'ground': 0.7,
        'neon': {'base': 0.14, 'swing': 0.2, 'beats': 2, 'buzz': 0.12},
        'sway': [((1700, 250, 2000, 900), 4, 36, 2), ((330, 200, 600, 420), 2.5, 30, 2), ((100, 400, 760, 680), 2, 30, 2)],
        'smoke': {'box': (1500, 450, 2000, 750), 'amount': 0.12},
        'particles': [('dust', 30)],
    },
    'dressing-room': {
        'file': 'dressing-room.webp',
        'subjects': [(1430, 10, 1960, 1125), (250, 110, 790, 1100), (1050, 430, 1720, 1125), (760, 250, 1150, 900)],
        'neon': {'boxes': [(0, 0, 2000, 300)], 'base': 0.08, 'swing': 0.1, 'beats': 2, 'buzz': 0.1},
        'particles': [('dust', 40)],
    },
    'car-meet-selfie': {
        'file': 'car-meet-selfie.webp',
        'subjects': [(540, 190, 950, 1010)],
        'near': [((50, 430, 1300, 1125), 0.75)],
        'sway': [((760, 0, 1100, 260), 4, 34, 2), ((1390, 30, 1660, 330), 4, 34, 2), ((1620, 230, 2000, 420), 3, 30, 2), ((0, 0, 110, 160), 3, 30, 2)],
        'sprites': [
            {'box': (1344, 314, 1382, 336), 'path': ((1250, 340), (1500, 290)), 'cycles': 1, 'thresh': 30, 'bob': 2},
            {'box': (1776, 168, 1812, 190), 'path': ((1900, 168), (1650, 200)), 'cycles': 1, 'thresh': 30},
            {'box': (1174, 160, 1204, 180), 'path': ((1100, 180), (1320, 150)), 'cycles': 1, 'thresh': 30, 'bob': 2},
        ],
        'particles': [('pollen', 30)],
    },
    'club-vip': {
        'file': 'club-vip.webp',
        'subjects': [(500, 20, 1420, 1125), (40, 180, 640, 1125), (1400, 20, 1990, 800)],
        'near': [((240, 780, 1700, 1125), 0.95), ((1520, 240, 2000, 1125), 0.9)],
        'neon': {'base': 0.06, 'swing': 0.18, 'beats': 4},
        'flicker': [((180, 870, 290, 960), 40)],
        'particles': [('bokeh', 30)],
    },
    'vice-city-skyline-night': {
        'file': 'vice-city-skyline-night.webp',
        'far': 0.05, 'ground': 0.8,
        'neon': {'base': 0.1, 'swing': 0.12, 'beats': 2, 'buzz': 0.1},
        'water': [([(1050, 640), (1560, 620), (1560, 700), (1340, 760), (1300, 880), (1050, 900), (900, 820)], 2.5)],
        'sprites': [{'box': (322, 136, 432, 196), 'path': ((232, 158), (682, 128)), 'cycles': 1, 'thresh': 20}],
        'particles': [('dust', 20)],
        'camera': {'push': 0.05},
    },
    'delights-cabaret': {
        'file': 'delights-cabaret.webp',
        'subjects': [(830, 30, 1290, 1125)],
        'neon': {'base': 0.14, 'swing': 0.28, 'beats': 2, 'buzz': 0.15},
        'smoke': {'box': (0, 0, 2000, 700), 'amount': 0.14, 'color': (120, 120, 255)},
        'particles': [('bokeh', 24), ('dust', 40)],
    },
}

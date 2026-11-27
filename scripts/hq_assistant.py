"""The GTA 6 HQ assistant: answers a player's question from GTA 6 HQ's own data.

No language model and no second database: a question is read with simple rules (what is asked:
where, how, how many, which is best; about what), the subject is looked up with the app's own
search (/api/search, which forgives typos and plurals), the Field Manual's pages and the map's
pins, and the answer is built only from what those hold. Anything the data does not hold is said
to be unknown, never guessed. Spoiler text stays inside Discord spoiler bars (||like this||).

    from hq_data import HQData
    from hq_assistant import Assistant
    a = Assistant(HQData.start(), site='https://example.github.io/gta6-hq')
    answer = a.ask('where can I find the pegassi sports car?')
    answer = a.ask('which one is fastest?', context=answer.context)

Discord-free on purpose: scripts/discord_assistant.py turns an Answer into a Discord message, and
scripts/test_assistant.py tests this module directly. Pillow is needed only for map_preview().
"""
import io, math, re, time, urllib.parse
from dataclasses import dataclass, field

SITE = 'https://xpbeats00-sudo.github.io/gta6-hq'
#: Follow-up questions may lean on the last answer for this long.
CONTEXT_SECONDS = 15 * 60
MAX_LISTED = 12

FILLER = set('''
a an the i me my we you your u is are was be been do does did can could would should will shall
to of in on at for from with into onto by about it its this that these those there here
where wheres find found get getting got locate located location locations place places spot spots
how hows what whats which who whom whose why when show tell give list need needed want please
any some all every each one ones thing things stuff gta gta6 vi 6 game leonida also just really
whats im ive id much many get go going way ways good best fast faster fastest most more
nearest closest near nearby buy bought purchase
'''.split())
PRONOUNS = {'it', 'that', 'this', 'them', 'those', 'one', 'ones', 'there', 'thing', 'they', 'he', 'she', 'him', 'her'}

#: Words a player uses for a kind of place on the map, beyond the kind's own name.
KIND_WORDS = {
    'Standard Gun Shops': ['ammu nation', 'ammunation', 'ammu-nation', 'gun shop', 'gun store', 'gunshop', 'buy guns', 'buy a gun', 'buy weapons'],
    'High-End Gun Shops': ['ammu nation', 'ammunation', 'ammu-nation', 'gun shop', 'gun store', 'high end gun'],
    'Gang Operations': ['gang illegal operation', 'gang operation', 'gang op', 'illegal operation'],
    'Bank Jobs': ['small bank', 'bank job', 'rob a bank', 'rob the bank', 'bank robbery', 'banks'],
    'Big Bank Jobs': ['big bank', 'bank vault', 'vault'],
    'Smash and Grabs': ['smash and grab', 'jewelry store', 'jewellery store', 'jewelry'],
    'Pawn Shops': ['pawn shop', 'pawn'],
    'Payday Loan Stores': ['payday loan'],
    'ATMs': ['atm', 'cash machine'],
    'Stunt Jumps': ['stunt jump'],
    'Garages': ['garage'],
    'Mod Shops': ['mod shop', 'modshop', 'customise', 'customize', 'tuning'],
    'Paint Shops': ['paint shop', 'pay n spray', "pay 'n' spray", 'paynspray', 'respray'],
    'Safehouses': ['safehouse', 'safe house'],
    'Fences': ['fence', 'sell stolen'],
    'Vehicle Fences': ['vehicle fence', 'sell a car', 'sell car'],
    'Races': ['race', 'street race'],
    'Hunting Spots': ['hunting spot', 'hunt'],
    'Fishing Spots': ['fishing spot', 'fish'],
    'Shooting Range Challenges': ['shooting range'],
    'Gas Stations': ['gas station', 'petrol station', 'fuel station'],
    'Train Stations': ['train station'],
    'Car Washes': ['car wash'],
    'Barbers and Salons': ['barber', 'haircut', 'salon'],
    'Tattoo Parlors': ['tattoo'],
    'Vehicle Rentals': ['rent a car', 'car rental', 'rental'],
    'Drones': ['drone'],
    'Main Missions': ['main mission', 'story mission'],
    'Side Missions': ['side mission'],
    'Random Events': ['random event'],
    'Fitness': ['gym', 'fitness'],
    'Golf': ['golf'],
    "Kenton's Treasure": ['kenton', 'treasure'],
    'Kitty Litter Lab Raids': ['kitty litter', 'lab raid'],
    'Vehicle Thefts for Moses': ['moses'],
    "Randy's Wish List": ['randy', 'wish list'],
    'Custom Weapons': ['custom weapon'],
    'Convenience Stores': ['convenience store', 'corner store'],
}
#: What a comparison word asks for: (fact field, highest wins?).
COMPARE_WORDS = [
    (r'\bfast|top speed|speediest|most speed|\bspeed', 'speed', True),
    (r'acceleration|accelerat|quickest|quicker', 'acceleration', True),
    (r'off.?road', 'offroad_handling', True),
    (r'handling|handles', 'asphalt_handling', True),
    (r'strongest|toughest|durab|strength|armou?r', 'strength', True),
    (r'cheapest|lowest price|least expensive|cheaper', 'price', False),
    (r'most expensive|priciest|highest price|dearest', 'price', True),
    (r'damage|hardest hitting|most powerful|strongest gun', 'damage', True),
    (r'accura', 'accuracy', True),
    (r'longest range|most range|range', 'range', True),
    (r'magazine|biggest mag|most ammo', 'magazine', True),
    (r'best|top rated|highest rated|rating', 'rating', True),
]
#: Attributes a player may ask to compare that GTA 6 HQ has no figures for.
NO_FIGURES = {'fuel': 'fuel', 'tank': 'fuel', 'mpg': 'fuel', 'seats': None, 'capacity': 'capacity', 'weight': 'weight',
              'climb': 'climb rate', 'altitude': 'altitude', 'braking': 'braking', 'brakes': 'braking', 'fire rate': 'fire rate'}
#: Words that narrow vehicles to a class.
VEHICLE_CLASSES = {
    'plane': ['plane', 'planes', 'aircraft', 'jet', 'jets', 'aeroplane', 'airplane', 'fly', 'flying'],
    'helicopter': ['helicopter', 'helicopters', 'heli', 'chopper'],
    'boat': ['boat', 'boats', 'yacht', 'jet ski', 'watercraft'],
    'motorcycle': ['bike', 'bikes', 'motorbike', 'motorcycle', 'motorcycles'],
    'car': ['car', 'cars', 'sports car', 'supercar', 'muscle car', 'vehicle', 'ride'],
}
SECTION_WORDS = {
    'vehicles': ['car', 'cars', 'vehicle', 'vehicles', 'plane', 'aircraft', 'boat', 'bike', 'helicopter', 'truck', 'ride'],
    'weapons': ['gun', 'guns', 'weapon', 'weapons', 'rifle', 'pistol', 'shotgun', 'smg', 'sniper', 'knife', 'melee'],
    'collectibles': ['collectible', 'collectibles', 'card', 'cards', 'collectable'],
    'missions': ['mission', 'missions', 'quest', 'job'],
    'businesses': ['shop', 'store', 'business', 'restaurant', 'bar', 'club', 'dealership', 'property', 'properties'],
    'activities': ['activity', 'activities', 'minigame', 'stick up', 'stickup', 'robbery'],
    'wildlife': ['animal', 'animals', 'wildlife', 'fish', 'bird', 'alligator', 'gator'],
    'achievements': ['trophy', 'trophies', 'achievement', 'achievements'],
    'locations': ['district', 'neighbourhood', 'neighborhood', 'area', 'region', 'city', 'town', 'island'],
}


@dataclass
class Answer:
    kind: str                      # entry, places, guide, compare, options, unknown, sources
    title: str
    text: str = ''
    fields: list = field(default_factory=list)      # (name, value)
    steps: list = field(default_factory=list)
    pins: list = field(default_factory=list)        # pins to show; pins[0] is the main one when focus
    focus: bool = False
    refs: list = field(default_factory=list)        # entries the answer is about
    sources: list = field(default_factory=list)     # {'name', 'url'}
    options: list = field(default_factory=list)     # (label, query) for "did you mean"
    map_url: str = ''
    guide_url: str = ''
    guide_label: str = 'View full guide'
    context: dict = field(default_factory=dict)
    spoiler: bool = False


# ---------- words ----------
def norm(text):
    text = text.lower().replace('’', "'").replace('‘', "'")
    text = re.sub(r"[^a-z0-9%'\- ]+", ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def stem(word):
    word = word.strip("'-")
    for end, put in (("'s", ''), ('ies', 'y'), ('es', ''), ('s', '')):
        if word.endswith(end) and len(word) - len(end) >= 3 and not word.endswith('ss'):
            return word[:-len(end)] + put
    return word


def tokens(text):
    return [stem(w) for w in norm(text).replace('-', ' ').split() if w]


def joined_tokens(text):
    """Words with hyphens closed up: "Stick-Ups" is "stickup", as players often type it."""
    return [stem(w) for w in norm(text).replace('-', '').split() if w]


def near(a, b):
    """Same word, allowing one slip in words of five letters or more."""
    if a == b:
        return True
    if min(len(a), len(b)) < 5 or abs(len(a) - len(b)) > 1:
        return False
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1] <= 1


def has_phrase(text, phrase):
    return re.search(r'(?<![a-z])' + re.escape(phrase) + r'(?![a-z])', text) is not None


def core_words(text):
    return [w for w in tokens(text) if w not in FILLER and stem(w) not in FILLER]


def all_core_words(text):
    return list(dict.fromkeys(core_words(text) + [w for w in joined_tokens(text) if w not in FILLER]))


def unspoil(text):
    return re.sub(r'\|\|', '', text or '')


def spoil(text, on=True):
    text = (text or '').strip()
    if not on or not text or text.startswith('||'):
        return text
    return f'||{text}||'


def clip(text, n):
    text = re.sub(r'\s+', ' ', text or '').strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(' ', 1)[0]
    # Never cut a spoiler bar in half.
    if cut.count('||') % 2:
        cut += '||'
    return cut + '…'


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', unspoil(text).lower()).strip('-')


def pin_sources(pins):
    """Where the given pins' positions come from, as answer sources (marker "via" in data/wiki.json)."""
    vias = {p.get('via') or '' for p in pins}
    out = []
    if 'gtabase' in vias:
        out.append({'name': "Pin positions: GTABase's map, matched to the street map", 'url': 'https://www.gtabase.com/gta-6/map/'})
    if vias - {'gtabase'}:
        out.append({'name': 'Pin positions: Gamersky map via gta6-wiki.org, placed approximately', 'url': 'https://gta6-wiki.org'})
    return out


# ---------- the assistant ----------
class Assistant:
    def __init__(self, data, site=SITE):
        self.data = data
        self.site = site.rstrip('/')
        self._index_version = -1

    # ---- indexes, rebuilt when the wiki changes ----
    def _indexes(self):
        wiki = self.data.wiki()
        if self._index_version == self.data.version:
            return
        pins = self.data.pins()
        self.kinds = {}
        for p in pins:
            if p['kind']:
                self.kinds.setdefault(p['kind'], []).append(p)
        self.areas = [p for p in pins if p['category'] in ('regions', 'districts')]
        self.pins_by_ref = {}
        for p in pins:
            if p['ref']:
                self.pins_by_ref.setdefault(p['ref'], []).append(p)
        # Pin names long enough to look for inside "where" text (shorter ones match too much).
        self.named = sorted((p for p in pins if len(unspoil(p['name'])) >= 7 and not p['spoiler']),
                            key=lambda p: -len(p['name']))
        self.pages = []
        manual = self.data.manual() or {}
        for ch in manual.get('chapters', []):
            for i, page in enumerate(ch.get('pages', [])):
                self.pages.append({'chapter': ch, 'page': page, 'index': i,
                                   'forms': [set(tokens(page.get('title', ''))) - FILLER, set(joined_tokens(page.get('title', ''))) - FILLER],
                                   'chapter_words': set(tokens(ch.get('title', '')))})
        self.manual_sources = manual.get('sources', {})
        self.sources = wiki.get('sources', {})
        self._index_version = self.data.version

    # ---- links ----
    def map_link(self, pins=(), kind=None, focus=None):
        q = {}
        if kind:
            q['kind'] = kind
        if focus:
            q['focus'] = focus
        spots = [p for p in pins if not (focus and p.get('ref') == focus)][:20] if not kind else []
        if spots:
            q['at'] = ';'.join(f"{p['x']:.4f},{p['y']:.4f}" for p in spots)
        # The hosted site is the app itself: its own map page, opened at the request.
        return f'{self.site}/#/map' + ('?' + urllib.parse.urlencode(q, safe=',;/') if q else '')

    def entry_link(self, ref):
        section, _, slug = ref.partition('/')
        if section in ('characters', 'locations'):
            return f'{self.site}/#/{section}/{urllib.parse.quote(slug)}'
        if section in ('news', 'editions', 'faq'):
            return f'{self.site}/#/intel'
        return f'{self.site}/#/wiki/{section}/{urllib.parse.quote(slug)}'

    def page_link(self, hit):
        ch = hit['chapter']
        # The app numbers a chapter's pages from 1, after its title page when it has a cover.
        cover = 1 if ch.get('cover') and ch.get('status') != 'in-development' else 0
        return f"{self.site}/#/manual/{ch['id']}/{hit['index'] + 1 + cover}"

    # ---- facts about places ----
    def area_of(self, pin):
        """The closest region and Vice City district markers to a pin (by map position)."""
        best = {}
        for a in self.areas:
            d = math.hypot(a['x'] - pin['x'], (a['y'] - pin['y']) * 1.37)
            if a['category'] not in best or d < best[a['category']][0]:
                best[a['category']] = (d, a['name'])
        region = best.get('regions', (9, ''))[1]
        district = best['districts'][1] if best.get('districts', (9,))[0] < 0.06 else ''
        return region, district

    def entry_sources(self, entry, limit=6):
        out = []
        for sid in (entry or {}).get('sources', [])[:limit]:
            s = self.sources.get(sid)
            if s:
                out.append({'name': ' · '.join(x for x in (s.get('publisher'), s.get('title')) if x), 'url': s.get('url', ''),
                            'type': s.get('type', '')})
        return out

    def page_sources(self, page, limit=6):
        seen, out = set(), []
        for b in page.get('blocks', []):
            for sid in b.get('sources', []) or []:
                if sid in seen:
                    continue
                seen.add(sid)
                s = self.manual_sources.get(sid) or self.sources.get(sid)
                if s:
                    out.append({'name': ' · '.join(x for x in (s.get('publisher'), s.get('title')) if x), 'url': s.get('url', '')})
        return out[:limit]

    # ---- finding the subject ----
    def match_kinds(self, text):
        n = norm(text)
        words = set(tokens(text))
        found = []
        for kind in self.kinds:
            phrases = [kind.lower()] + KIND_WORDS.get(kind, [])
            hit = any(has_phrase(n, p) for p in phrases)
            if not hit:
                kw = [stem(w) for w in tokens(kind) if w not in FILLER and w not in ('and', 'for')]
                hit = bool(kw) and all(any(near(k, w) for w in words) for k in kw)
            if hit:
                found.append(kind)
        # "ammu-nation" names both gun shop kinds: keep both. A longer kind name that matched wins
        # over a shorter one it contains ("big bank jobs" over "bank jobs").
        found = [k for k in found if not any(k != o and k.lower() in o.lower() and has_phrase(n, o.lower()) for o in found)]
        return found

    def match_pages(self, text, chapters=None):
        words = all_core_words(text)
        if not words:
            return []
        out = []
        for hit in self.pages:
            if chapters and hit['chapter'].get('id') not in chapters:
                continue
            best = 0
            for title in hit['forms']:
                if not title:
                    continue
                got = sum(1 for t in title if any(near(t, w) for w in words))
                if got:
                    best = max(best, got / len(title) + 0.25 * got / len(core_words(text) or words))
            if not best:
                continue
            out.append((best + (0.1 if hit['chapter_words'] & set(words) else 0), hit))
        out.sort(key=lambda s: -s[0])
        return out

    def search(self, text, section=None, limit=8):
        q = ' '.join(core_words(text)) or text
        try:
            page = self.data.search(q, section=section, limit=limit)
        except OSError:
            return [], False
        return page.get('hits', []), page.get('partial', False)

    def wanted_section(self, text):
        n = norm(text)
        for section, words in SECTION_WORDS.items():
            if any(has_phrase(n, w) for w in words):
                return section
        return None

    def vehicle_class(self, text):
        n = norm(text)
        for cls, words in VEHICLE_CLASSES.items():
            if any(has_phrase(n, w) for w in words):
                return cls
        return None

    # ---- the question ----
    def ask(self, question, context=None):
        self._indexes()
        context = context if context and time.time() - context.get('at', 0) < CONTEXT_SECONDS else {}
        q = norm(question)
        words = core_words(question)
        vague = not words or all(w in PRONOUNS for w in words) or (len(words) <= 2 and any(w in PRONOUNS for w in tokens(question)) and not self.match_kinds(question) and not self.search(question)[0])

        wants_where = bool(re.search(r"\b(where|wheres|find|located|location|nearest|closest|map|get (a|an|the|it|one|that)|show me|buy)\b", q))
        wants_how = bool(re.search(r"\b(how (do|to|can|does|should|would)|complete|finish|beat|unlock|rob|steps?|guide|walkthrough|tips?)\b", q))
        wants_count = bool(re.search(r"\bhow many\b|\b100 ?%|\bhundred percent|\b100 percent|\bcompletion\b|\bcomplete everything\b", q))
        wants_compare = bool(re.search(r"\b(which|what)\b.*\b(most|best|fastest|quickest|strongest|cheapest|highest|top|longest|better|biggest|toughest|lowest|least)\b", q)) \
            or bool(re.search(r"\b(fastest|cheapest|strongest|best) \w+", q)) and not wants_where

        if not wants_compare and re.search(r"\b(fast|quick|speedy)\b", q) and self.vehicle_class(question):
            wants_compare = True
        if wants_compare:
            return self.compare(question, context)
        if wants_count:
            got = self.completion(question)
            if got:
                return self.with_context(got, context)
        if vague and context.get('refs'):
            ref = context.get('focus') or next((r for r in context['refs'] if self.pins_by_ref.get(r) or
                                                ((self.data.entry(r) or {}).get('facts') or {}).get('where')), context['refs'][0])
            entry = self.data.entry(ref)
            if entry:
                return self.with_context(self.about_entry(ref, entry, where=wants_where or not wants_how), context)
        if vague and context.get('kind') and wants_where:
            return self.with_context(self.places(context['kind'].split('|'), question), context)

        kinds = self.match_kinds(question)
        if kinds and (wants_where or not wants_how):
            return self.with_context(self.places(kinds, question), context)
        if wants_how:
            got = self.guide(question) or (self.kind_guide(kinds) if kinds else None)
            if got:
                return self.with_context(got, context)
        if wants_where:
            pin = self.pin_named(question)
            if pin:
                return self.with_context(self.pin_answer(pin), context)
        if not wants_where:
            pages = self.match_pages(question)
            if pages and pages[0][0] >= 1.0:
                return self.with_context(self.guide_answer(pages[0][1]), context)
        return self.with_context(self.lookup(question, where=wants_where), context)

    def with_context(self, answer, old):
        ctx = {'at': time.time(), 'refs': answer.refs[:20] or old.get('refs', []),
               'focus': answer.refs[0] if answer.refs and answer.focus else (answer.refs[0] if len(answer.refs) == 1 else old.get('focus') if not answer.refs else None),
               'kind': answer.context.get('kind', ''), 'question_kind': answer.kind,
               'sources': answer.sources or old.get('sources', []), 'title': answer.title}
        answer.context = ctx
        return answer

    # ---- answers ----
    def lookup(self, question, where=False, section=None):
        section = section or self.wanted_section(question)
        hits, partial = self.search(question, section=section)
        if not hits and section:
            hits, partial = self.search(question)
        if not hits:
            return self.unknown(question)
        words = set(core_words(question))
        top = hits[0]

        def exact(h):
            name = {w for w in tokens(unspoil(h['name'])) if not re.fullmatch(r"'?\d{2,4}", w)} - FILLER  # a model year is often left out
            return (name and all(any(near(t, w) for w in words) for t in name)) or norm(unspoil(h['name'])) in norm(question)
        exacts = [h for h in hits if exact(h)]
        if exacts:
            top = exacts[0]
        elif len(hits) > 1 and (partial or hits[1]['score'] >= top['score'] * 0.9):
            close = [h for h in hits if h['score'] >= top['score'] * (0.6 if partial else 0.85)][:6]
            if len(close) > 1:
                return self.options(question, close)
        ref = f"{top['section']}/{top['slug']}"
        entry = self.data.entry(ref)
        if not entry:
            return self.unknown(question)
        answer = self.about_entry(ref, entry, where=where)
        others = [h for h in hits if f"{h['section']}/{h['slug']}" != ref][:4]
        if others:
            answer.options = [(unspoil(h['name']) if not h.get('spoiler') else 'Spoiler entry', f"{h['section']}/{h['slug']}") for h in others]
        return answer

    def options(self, question, hits):
        lines, opts, refs = [], [], []
        for h in hits:
            ref = f"{h['section']}/{h['slug']}"
            name = spoil(unspoil(h['name']), h.get('spoiler'))
            lines.append(f"**{name}** · {self.section_label(h['section'])}")
            opts.append((unspoil(h['name'])[:80] if not h.get('spoiler') else f"Spoiler ({self.section_label(h['section'])})", ref))
            refs.append(ref)
        return Answer('options', 'Which one do you mean?', 'A few things in GTA 6 HQ match that:\n' + '\n'.join(lines),
                      options=opts, refs=refs)

    def section_label(self, key):
        for c in self.data.wiki().get('categories', []):
            if c['key'] == key:
                return c.get('label') or c.get('name') or key.title()
        return key.title()

    def about_entry(self, ref, entry, where=False):
        section = ref.split('/')[0]
        hidden = bool(entry.get('spoiler'))
        name = spoil(entry['name'], hidden)
        facts = entry.get('facts') or {}
        summary = spoil(entry.get('summary', ''), hidden)
        fields = []
        pins = list(self.pins_by_ref.get(ref, []))
        if not pins and isinstance(entry.get('x'), (int, float)):
            pins = [{'name': entry['name'], 'x': entry['x'], 'y': entry['y'], 'ref': ref, 'kind': '', 'category': section,
                     'summary': entry.get('summary', ''), 'spoiler': hidden}]
        where_text = facts.get('where') or facts.get('location') or entry.get('region') or facts.get('region') or ''
        named = [] if pins else self.pins_named_in(' '.join(str(x) for x in (where_text, ' '.join(entry.get('body', [])[:3]))))
        region = entry.get('region') or facts.get('region') or facts.get('county') or ''
        if pins:
            r, d = self.area_of(pins[0])
            fields.append(('Region', spoil(region or r, hidden) + (f' (near {d})' if d and d not in (region or r) else '')))
            fields.append(('Map position', f"{pins[0]['x'] * 100:.1f}% across, {pins[0]['y'] * 100:.1f}% down (approximate)"))
        elif region:
            fields.append(('Region', spoil(str(region), hidden)))
        if where_text and where_text != region:
            fields.append(('Where to get it' if section in ('vehicles', 'weapons') else 'Where', spoil(clip(str(where_text), 900), hidden)))
        for key, label in self.fact_labels(section):
            if key in ('where', 'location', 'region', 'county') or key not in facts:
                continue
            value = facts[key]
            if isinstance(value, list):
                value = ', '.join(str(v) for v in value)
            if key == 'price' and isinstance(value, (int, float)):
                value = f'${value:,.0f}'
            if value in ('', None):
                continue
            fields.append((label, spoil(clip(str(value), 300), hidden)))
            if len(fields) >= 9:
                break
        text = summary
        if where and not pins and not named and not where_text:
            text += ('\n\n' if text else '') + "GTA 6 HQ doesn't have a map position for this yet, so I can't point to it on the map."
        steps = [spoil(clip(str(s), 300), hidden) for s in (entry.get('steps') or [])][:8]
        if not steps and not where:
            body = [b for b in entry.get('body', []) if isinstance(b, str)]
            if body:
                text += '\n\n' + '\n'.join('• ' + spoil(clip(b, 260), hidden) for b in body[:3])
        show = pins or named
        answer = Answer('entry', ('📍 ' if show else '') + unspoil(name) if not hidden else ('📍 ' if show else '') + 'Spoiler entry',
                        clip(text, 1800), fields=fields, steps=steps, pins=show, focus=bool(pins), refs=[ref],
                        sources=self.entry_sources(entry), spoiler=hidden)
        if hidden:
            answer.text = f'{name}\n\n' + answer.text
        answer.map_url = self.map_link(show, focus=ref if pins else None) if show else ''
        if named and not pins:
            # A spoiler entry's places often carry its name ("Declasse Martha's Vamos"), so they go behind bars too.
            answer.fields.append(('On the map', 'The places named in this answer: '
                                  + ', '.join(spoil(p['name'], hidden or p['spoiler']) for p in named[:6])))
        answer.guide_url = self.entry_link(ref)
        answer.guide_label = 'View in GTA 6 HQ'
        return answer

    def fact_labels(self, section):
        for c in self.data.wiki().get('categories', []):
            if c['key'] == section:
                return [(f['key'], f.get('label') or f['key'].replace('_', ' ').title()) for f in c.get('fields', [])]
        return []

    def pins_named_in(self, text):
        n = norm(unspoil(text))
        out = []
        for p in self.named:
            name = norm(unspoil(p['name']))
            if len(name) >= 7 and has_phrase(n, name) and not any(norm(o['name']) == name for o in out):
                out.append(p)
            if len(out) >= 6:
                break
        specific = [p for p in out if p['category'] not in ('regions', 'districts')]
        return specific or out

    def place_named(self, text):
        """A region, district or place pin whose name the text gives after "near", "in" or "around"."""
        n = norm(text).rstrip('?. ')
        for m in reversed(list(re.finditer(r"\b(?:near|to|around|in|by|at) (?:the )?", n))):
            want = n[m.end():].strip()
            if len(want) < 3:
                continue
            best = None
            for p in self.data.pins():
                name = norm(unspoil(p['name']))
                if p['spoiler'] or not name:
                    continue
                if name == want or (len(want) >= 4 and name.startswith(want)):
                    rank = {'regions': 1, 'districts': 0}.get(p['category'], 2)
                    if best is None or rank < best[0]:
                        best = (rank, p)
            if best:
                return best[1]
        return None

    def pin_named(self, question):
        """A map pin whose whole name is what the question asks about ("where is Jason's house")."""
        want = core_words(question)
        if not want:
            return None
        best = None
        for p in self.data.pins():
            if p['category'] in ('regions', 'districts') and p['spoiler']:
                continue
            have = [w for w in tokens(unspoil(p['name'])) if w not in FILLER]
            if have and have == want:
                if best is None or (p['ref'] and not best['ref']):
                    best = p
        return best

    def pin_answer(self, pin):
        if pin.get('ref') and self.data.entry(pin['ref']):
            answer = self.about_entry(pin['ref'], self.data.entry(pin['ref']), where=True)
            if not answer.pins:
                answer.pins, answer.focus = [pin], True
                answer.map_url = self.map_link([pin])
            return answer
        r, d = self.area_of(pin)
        fields = [('Region', r + (f' (near {d})' if d and d != r else ''))]
        if pin.get('kind'):
            fields.insert(0, ('Kind', pin['kind']))
        fields.append(('Map position', f"{pin['x'] * 100:.1f}% across, {pin['y'] * 100:.1f}% down" + ('' if pin.get('via') == 'gtabase' else ' (approximate)')))
        answer = Answer('entry', '📍 ' + (unspoil(pin['name']) if not pin['spoiler'] else 'Spoiler'),
                        spoil(pin.get('summary') or "Here it is on the Leonida map.", pin['spoiler']),
                        fields=fields, pins=[pin], focus=True, spoiler=pin['spoiler'],
                        sources=pin_sources([pin]))
        answer.map_url = self.map_link([pin])
        if pin.get('guide'):
            hit = next((h for h in self.pages if h['chapter'].get('id') == pin['guide'][0] and unspoil(h['page'].get('title', '')) == pin['guide'][1]), None)
            if hit:
                answer.guide_url, answer.guide_label = self.page_link(hit), 'Field Manual guide'
        return answer

    def places(self, kinds, question=''):
        pins = [p for k in kinds for p in self.kinds.get(k, [])]
        label = ' and '.join(kinds)
        anchor = self.place_named(question) if question else None
        if anchor:
            pins.sort(key=lambda p: math.hypot(p['x'] - anchor['x'], (p['y'] - anchor['y']) * 1.37))
        lines = []
        for p in pins[:MAX_LISTED]:
            r, d = self.area_of(p)
            lines.append(f"• {spoil(p['name'], p['spoiler'])} · {d or r}")
        more = len(pins) - MAX_LISTED
        text = f"GTA 6 HQ has **{len(pins)}** {label} on the Leonida map." + ('\n\n' + '\n'.join(lines) if lines else '')
        if more > 0:
            text += f'\n…and {more} more on the map.'
        if anchor:
            text = text.replace(' on the Leonida map.', f" on the Leonida map. Closest to **{anchor['name']}** first:", 1)
        elif re.search(r'\b(nearest|closest|near me)\b', norm(question)):
            text += ("\n\nI can't see where you are in the game, so these are all of them. Open the map to spot the closest, "
                     "or ask again with a place, like *nearest one to Vice Beach*.")
        text += ('\n\nThe positions come from community maps.' if all(p.get('via') == 'gtabase' for p in pins)
                 else '\n\nThe positions come from community maps; some are approximate.')
        refs = [p['ref'] for p in pins if p['ref']]
        guide = next((p['guide'] for p in pins if p.get('guide')), None)
        answer = Answer('places', f'📍 {label}', text, pins=pins, refs=refs[:20],
                        sources=pin_sources(pins))
        answer.map_url = self.map_link(pins, kind='|'.join(kinds))
        answer.context['kind'] = '|'.join(kinds)
        if guide:
            hit = next((h for h in self.pages if h['chapter'].get('id') == guide[0] and unspoil(h['page'].get('title', '')) == guide[1]), None) \
                or next((h for h in self.pages if h['chapter'].get('id') == guide[0]), None)
            if hit:
                answer.guide_url = self.page_link(hit)
                answer.guide_label = 'Field Manual guide'
        return answer

    def page_text(self, page):
        """A page's opening text, its steps, tips and the 'what you need' table, all as written."""
        intro, steps, tips, fields, unknown = '', [], [], [], []
        for b in page.get('blocks', []):
            t = b.get('type')
            if t == 'intro' and not intro:
                intro = b.get('text', '')
            elif t == 'paragraph' and not intro:
                intro = b.get('text', '')
            elif t == 'numbered':
                steps.append((b.get('title') and f"**{b['title']}**: " or '') + b.get('text', ''))
            elif t in ('tip', 'warning', 'callout'):
                tips.append(b.get('text', '') or b.get('title', ''))
            elif t == 'table' and not fields and b.get('rows'):
                for row in b['rows'][:6]:
                    if len(row) >= 2:
                        fields.append((unspoil(str(row[0]))[:250], clip(str(row[1]), 300)))
            elif t == 'checklist' and b.get('items'):
                steps.extend(str(i) if not isinstance(i, dict) else (i.get('text') or i.get('label') or '') for i in b['items'][:10])
            elif t == 'unknown':
                unknown.extend(b.get('items', []))
        return intro, steps, tips, fields, unknown

    def guide_answer(self, hit, title_prefix='📘 '):
        page = hit['page']
        intro, steps, tips, fields, unknown = self.page_text(page)
        text = intro
        if tips:
            text += '\n\n💡 ' + clip(tips[0], 400)
        if unknown:
            text += '\n\n**Not known yet:** ' + '; '.join(clip(u, 220) for u in unknown[:3])
        answer = Answer('guide', title_prefix + unspoil(page.get('title', '')), clip(text, 2000), fields=fields,
                        steps=[clip(s, 320) for s in steps[:8]], sources=self.page_sources(page))
        answer.guide_url = self.page_link(hit)
        answer.guide_label = 'Full guide'
        # The map for a guide: the pins of a kind named in its title, or the entries its steps link to.
        kinds = self.match_kinds(page.get('title', ''))
        if kinds:
            pins = [p for k in kinds for p in self.kinds.get(k, [])]
            answer.pins, answer.map_url = pins, self.map_link(pins, kind='|'.join(kinds))
            answer.context['kind'] = '|'.join(kinds)
        refs = []
        for b in page.get('blocks', []):
            link = b.get('link') or ''
            if link.startswith('#/wiki/'):
                refs.append(link[len('#/wiki/'):])
        title = set(joined_tokens(page.get('title', ''))) - FILLER
        each = [e for e in self.data.wiki().get('collectibles', [])
                if title and set(joined_tokens(str((e.get('facts') or {}).get('type', '')))) == title]
        if each:
            names = ', '.join(spoil(e['name'], e.get('spoiler')) for e in each[:8])
            total = next(((e.get('facts') or {}).get('total') for e in each if (e.get('facts') or {}).get('total')), None)
            answer.fields.append(('In GTA 6 HQ', f"{len(each)}" + (f" of {total}" if total else '') + f" listed: {clip(names, 700)}"))
            refs += [f"collectibles/{e['slug']}" for e in each]
        answer.refs = list(dict.fromkeys(refs))[:20]
        if not answer.pins:
            pins = [p for r in answer.refs for p in self.pins_by_ref.get(r, [])]
            if pins:
                answer.pins, answer.map_url = pins, self.map_link(pins)
        return answer

    def kind_guide(self, kinds):
        """The Field Manual page the map's pins of these kinds point to, with those pins on its map."""
        guide = next((p['guide'] for k in kinds for p in self.kinds.get(k, []) if p.get('guide')), None)
        if not guide:
            return None
        hit = next((h for h in self.pages if h['chapter'].get('id') == guide[0] and unspoil(h['page'].get('title', '')) == guide[1]), None)
        if not hit:
            return None
        answer = self.guide_answer(hit)
        pins = [p for k in kinds for p in self.kinds.get(k, [])]
        answer.pins, answer.map_url = pins, self.map_link(pins, kind='|'.join(kinds))
        answer.context['kind'] = '|'.join(kinds)
        answer.fields.insert(0, ('On the map', f"{len(pins)} {' and '.join(kinds)}"))
        return answer

    def guide(self, question):
        pages = self.match_pages(question)
        if not pages or pages[0][0] < 0.75:
            return None
        return self.guide_answer(pages[0][1])

    def completion(self, question):
        words = core_words(question)
        rest = [w for w in words if w not in ('100', '100%', 'percent', 'hundred', 'completion', 'complete', 'need', 'do')]
        g100 = [h['chapter'].get('id') for h in self.pages if str(h['chapter'].get('id', '')).startswith('g100') or h['chapter'].get('id') == 'robbery-planner']
        if rest:
            pages = self.match_pages(' '.join(rest), chapters=set(g100)) or self.match_pages(' '.join(rest))
            if pages and pages[0][0] >= 0.75:
                return self.guide_answer(pages[0][1], '💯 ')
            # A collectible's own entry carries its total.
            hits, _ = self.search(' '.join(rest), section='collectibles', limit=3)
            for h in hits:
                e = self.data.entry(f"collectibles/{h['slug']}")
                if e and (e.get('facts') or {}).get('total') and set(tokens(e['name'])) & set(rest):
                    a = self.about_entry(f"collectibles/{h['slug']}", e)
                    a.title = '💯 ' + a.title.lstrip('📍 ')
                    return a
            return None
        hit = next((h for h in self.pages if h['chapter'].get('id') == 'g100-route' and 'counted' in h['page'].get('title', '').lower()), None) \
            or next((h for h in self.pages if h['chapter'].get('id') == 'g100-route'), None)
        return self.guide_answer(hit, '💯 ') if hit else None

    def compare(self, question, context):
        n = norm(question)
        for word, what in NO_FIGURES.items():
            if what and has_phrase(n, word):
                return self.with_context(Answer('compare', 'Not in the data yet',
                    f"GTA 6 HQ has no {what} figures for any vehicle yet, so I can't say which has the most. "
                    "I won't guess. The vehicle stats it does have are speed, acceleration, handling, off-road handling, "
                    "strength and rating, read from the in-game stat bars."), context)
        key, high = next(((k, h) for pat, k, h in COMPARE_WORDS if re.search(pat, n)), ('rating', True))
        section = self.wanted_section(question)
        cls = self.vehicle_class(question)
        pool = []
        if context.get('refs') and (not section or all(r.startswith(section + '/') for r in context['refs'])) \
                and re.search(r'\b(one|them|those|these|it)\b', n):
            pool = [(r, self.data.entry(r)) for r in context['refs']]
        if not pool:
            section = section or ('weapons' if key in ('damage', 'accuracy', 'range', 'magazine') else 'vehicles')
            for e in self.data.wiki().get(section, []):
                if cls and section == 'vehicles' and not self.is_class(e, cls):
                    continue
                if section in ('vehicles', 'weapons') and not (e.get('facts') or {}).get('manufacturer') \
                        and not (e.get('facts') or {}).get('model') and not (e.get('facts') or {}).get('weapon_class'):
                    continue  # a page about a group (Planes and Helicopters), not one vehicle
                pool.append((f"{section}/{e['slug']}", e))
        scored = []
        for ref, e in pool:
            if not e:
                continue
            v = (e.get('facts') or {}).get(key)
            if isinstance(v, (int, float)):
                scored.append((v, ref, e))
        label = dict(self.fact_labels(pool[0][0].split('/')[0]) if pool else []).get(key, key.replace('_', ' '))
        what = cls + 's' if cls else (section or 'entries')
        if not scored:
            names = [e for _, e in pool if e][:10]
            text = f"GTA 6 HQ has no {label.lower()} figures for these {what} yet, so I can't rank them. I won't guess."
            if names:
                text += f"\n\nThe {what} it has ({len(pool)}):\n" + '\n'.join(
                    f"• **{spoil(e['name'], e.get('spoiler'))}**" + (f": {spoil(clip(str((e.get('facts') or {}).get('where')), 160), e.get('spoiler'))}" if (e.get('facts') or {}).get('where') else '')
                    for e in names)
            answer = Answer('compare', f"{(cls or what).title()}s in GTA 6 HQ" if cls else 'Not in the data yet', text,
                            refs=[r for r, e in pool if e][:20])
            return self.with_context(answer, context)
        scored.sort(key=lambda s: -s[0] if high else s[0])
        lines = []
        for v, ref, e in scored[:5]:
            shown = f'${v:,.0f}' if key == 'price' else f'{v:g}'
            lines.append(f"**{spoil(e['name'], e.get('spoiler'))}**: {shown}")
        best = scored[0][2]
        text = (f"By **{label.lower()}**, from the {len(scored)} {what} GTA 6 HQ has figures for:\n" + '\n'.join(lines)
                + ('\n\nStats are the in-game stat bars (out of 10).' if key in ('speed', 'acceleration', 'asphalt_handling', 'offroad_handling', 'strength', 'rating', 'damage', 'accuracy', 'range') else ''))
        if len(scored) < len(pool):
            text += f'\n{len(pool) - len(scored)} others have no {label.lower()} figure yet.'
        refs = [r for _, r, _ in scored[:5]]
        answer = Answer('compare', f"🏁 {'Highest' if high else 'Lowest'} {label.lower()}: {unspoil(best['name']) if not best.get('spoiler') else 'Spoiler'}",
                        text, refs=refs, focus=True, sources=self.entry_sources(best, 3))
        answer.guide_url = self.entry_link(refs[0])
        answer.guide_label = 'View in GTA 6 HQ'
        return self.with_context(answer, context)

    def is_class(self, e, cls):
        text = norm(' '.join(str(x) for x in ((e.get('facts') or {}).get('class', ''), e.get('class', ''), ' '.join(e.get('tags', [])))))
        return any(has_phrase(text, w) for w in VEHICLE_CLASSES[cls]) or \
            (cls == 'plane' and has_phrase(text, 'plane')) or (cls == 'car' and not any(
                has_phrase(text, w) for c in ('plane', 'helicopter', 'boat', 'motorcycle') for w in VEHICLE_CLASSES[c]))

    def unknown(self, question):
        words = core_words(question)
        text = ("I couldn't find that in GTA 6 HQ, so I won't guess. "
                "Try the name as it appears in the game, or ask about a place, vehicle, weapon, collectible, mission or activity.")
        pages = self.match_pages(question)
        opts = [(unspoil(h['page']['title'])[:80], 'manual:' + h['chapter']['id'] + ':' + str(h['index'])) for s, h in pages[:3] if s >= 0.5]
        return Answer('unknown', 'Not in GTA 6 HQ yet', text if words else 'Ask me anything about GTA 6: where something is, how to do it, or what is best.',
                      options=opts)

    def sources_answer(self, context):
        srcs = (context or {}).get('sources') or []
        if not srcs:
            return Answer('sources', 'Sources', 'There is no earlier answer here to show sources for. Ask a question first.')
        lines = [f"• [{s['name']}]({s['url']})" if s.get('url') else f"• {s['name']}" for s in srcs[:10]]
        return Answer('sources', f"Sources: {context.get('title', '')}".strip(),
                      'What GTA 6 HQ based that answer on:\n' + '\n'.join(lines))

    def answer_for_ref(self, ref, where=True):
        """An answer about one entry, or one Field Manual page ('manual:<chapter>:<index>')."""
        self._indexes()
        if ref.startswith('manual:'):
            _, ch, i = ref.split(':')
            hit = next((h for h in self.pages if h['chapter'].get('id') == ch and str(h['index']) == i), None)
            return self.with_context(self.guide_answer(hit), {}) if hit else self.unknown('')
        entry = self.data.entry(ref)
        return self.with_context(self.about_entry(ref, entry, where=where), {}) if entry else self.unknown('')

    def nearby(self, answer_pins, limit=8, radius=0.05):
        """Other places near the first pin, nearest first."""
        self._indexes()
        if not answer_pins:
            return []
        c = answer_pins[0]
        out = []
        for p in self.data.pins():
            if p is c or p['category'] in ('regions', 'districts') or (p['x'], p['y']) == (c['x'], c['y']):
                continue
            d = math.hypot(p['x'] - c['x'], (p['y'] - c['y']) * 1.37)
            if d <= radius:
                out.append((d, p))
        out.sort(key=lambda s: s[0])
        return [p for _, p in out[:limit]]


# ---------- a map picture for the message (not a substitute for the interactive map) ----------
_MAP = {}


def map_preview(pins, image_path, focus=True, size=(760, 520)):
    """A JPEG: the part of the official Leonida map around the pins, each pin marked. Returns bytes."""
    from PIL import Image, ImageDraw, ImageFilter
    if image_path not in _MAP:
        _MAP[image_path] = Image.open(image_path).convert('RGB')
    base = _MAP[image_path]
    W, H = base.size
    pts = [(p['x'] * W, p['y'] * H) for p in pins[:200]]
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    aspect = size[0] / size[1]
    cw = max(max(xs) - min(xs), 0) * 1.35 + 260
    ch = max(max(ys) - min(ys), 0) * 1.35 + 260
    if cw / ch < aspect:
        cw = ch * aspect
    else:
        ch = cw / aspect
    cw, ch = min(cw, W), min(ch, H)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    left = min(max(cx - cw / 2, 0), W - cw)
    top = min(max(cy - ch / 2, 0), H - ch)
    crop = base.crop((int(left), int(top), int(left + cw), int(top + ch))).resize(size, Image.LANCZOS)
    k = size[0] / cw
    over = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    # Darken a little so the markers stand out, keeping the map readable.
    d.rectangle((0, 0, size[0], size[1]), fill=(4, 10, 24, 70))
    glow = Image.new('RGBA', size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    many = len(pts) > 1
    for i, (x, y) in enumerate(pts):
        px, py = (x - left) * k, (y - top) * k
        main = focus and i == 0
        r = 13 if main else (8 if many else 12)
        g.ellipse((px - r - 6, py - r - 6, px + r + 6, py + r + 6), fill=(0, 229, 255, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    over = Image.alpha_composite(over, glow)
    d = ImageDraw.Draw(over)
    for i, (x, y) in enumerate(pts):
        px, py = (x - left) * k, (y - top) * k
        main = focus and i == 0
        r = 11 if main else (6 if many else 10)
        d.ellipse((px - r, py - r, px + r, py + r), fill=(0, 229, 255, 255) if main or not many else (41, 121, 255, 255),
                  outline=(255, 255, 255, 255), width=3 if main else 2)
    d.rectangle((0, 0, size[0] - 1, size[1] - 1), outline=(0, 229, 255, 255), width=2)
    out = Image.alpha_composite(crop.convert('RGBA'), over).convert('RGB')
    buf = io.BytesIO()
    out.save(buf, 'JPEG', quality=86, optimize=True)
    return buf.getvalue()

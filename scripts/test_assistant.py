"""Tests for the GTA 6 HQ Discord assistant: the answers, their map links and the Discord replies.

    python scripts/test_assistant.py                 runs a private copy of the app for the data
    python scripts/test_assistant.py --url URL       uses an app server that is already running (CI)

Each answer is checked against the app's own data: every pin it shows must be a real map pin,
every map link must open at real pins, each fact it quotes must be in the entry, and anything the
data does not hold must be answered as unknown. The Discord side is tested with a stand-in for
Discord's API, so nothing is posted. The hosted map itself (pan, zoom, opening at a place) is
tested in a browser by scripts/web_map_check.mjs. Prints one line per check; exits 1 on a failure.
"""
import argparse, os, re, sys, threading, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hq_data import HQData, ROOT  # noqa: E402
from hq_assistant import Assistant, map_preview, unspoil  # noqa: E402
import discord_assistant  # noqa: E402

results = []


def check(name, fn):
    try:
        got = fn()
        ok = got is not False and got is not None
        detail = got if isinstance(got, str) else ''
    except Exception as error:  # a crash is a failure, with its reason
        ok, detail = False, f'{type(error).__name__}: {error}'
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f'  ({detail})' if detail else ''))


def real_pins(data, answer):
    """Every pin in the answer is one of the map's own pins (same name and position)."""
    have = {(p['name'], p['x'], p['y']) for p in data.pins()}
    return all((p['name'], p['x'], p['y']) in have for p in answer.pins)


def link_matches(data, answer):
    """The map link opens at real pins: its focus is an entry with pins, its kind has pins, its spots are pins."""
    if not answer.map_url:
        return not answer.pins
    q = urllib.parse.parse_qs(urllib.parse.urlparse(answer.map_url).query)
    pins = data.pins()
    if 'focus' in q and not any(p['ref'] == q['focus'][0] for p in pins):
        return False
    if 'kind' in q and not all(any(p['kind'] == k for p in pins) for k in q['kind'][0].split('|')):
        return False
    for spot in (q.get('at', [''])[0].split(';') if 'at' in q else []):
        x, y = map(float, spot.split(','))
        if not any(abs(p['x'] - x) < 0.0006 and abs(p['y'] - y) < 0.0006 for p in pins):
            return False
    return True


def facts_from_entry(data, answer):
    """Each fact the answer quotes (beyond position and region) is in the entry it is about."""
    entry = data.entry(answer.refs[0])
    if not entry:
        return False
    text = unspoil(' '.join(str(v) for v in list((entry.get('facts') or {}).values()) + [entry.get('region', '')]))
    text = re.sub(r'\s+', ' ', text)
    for name, value in answer.fields:
        if name in ('Region', 'Map position', 'On the map', 'Area'):
            continue
        quoted = unspoil(value).rstrip('…').replace('$', '').replace(',', '')
        plain = text.replace('$', '').replace(',', '')
        if quoted[:60] not in plain:
            return f'"{name}: {quoted[:60]}" is not in the entry'
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url')
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    data = HQData(args.url) if args.url else HQData.start()
    a = Assistant(data, site='https://example.test/hq')
    try:
        run(data, a)
    finally:
        data.stop()
    failed = results.count(False)
    print(f'\n{len(results) - failed} passed, {failed} failed')
    sys.exit(1 if failed else 0)


def run(data, a):
    wiki = data.wiki()

    # 1. A vehicle's location
    def vehicle():
        ans = a.ask('Where can I find the Pegassi Infernus?')
        assert ans.kind == 'entry' and ans.refs[0].startswith('vehicles/'), (ans.kind, ans.refs)
        assert any(n.startswith('Where') for n, _ in ans.fields), 'no "where" field'
        ok = facts_from_entry(data, ans)
        assert ok is True, ok
        assert real_pins(data, ans) and link_matches(data, ans)
        return ans.refs[0]
    check('1. Where to find a specific vehicle (typo-tolerant search, facts from its entry)', vehicle)

    def vehicle_typo():
        ans = a.ask('where do i get the pegasi infernus')
        return ans.refs and ans.refs[0] == 'vehicles/pegassi-infernus-96' and ans.refs[0]
    check('1b. A misspelt vehicle name still finds it', vehicle_typo)

    # 2. A weapon's location
    def weapon():
        with_where = [e for e in wiki['weapons'] if (e.get('facts') or {}).get('where') and not e.get('spoiler')]
        target = with_where[0]
        ans = a.ask(f"where can I get the {target['name']}?")
        assert ans.refs and ans.refs[0] == f"weapons/{target['slug']}", (ans.kind, ans.refs, target['slug'])
        ok = facts_from_entry(data, ans)
        assert ok is True, ok
        return target['name']
    check('2. Where to find a specific weapon', weapon)

    # 3. A collectible's location, on the map
    def collectible():
        ans = a.ask('where can i find the meteorite chunks')
        assert ans.pins and real_pins(data, ans) and link_matches(data, ans), 'no real pins'
        assert ans.map_url and ans.guide_url
        return f'{len(ans.pins)} pin(s), {ans.map_url.split("?")[1]}'
    check('3. A collectible location, with real map pins and a map link', collectible)

    # 4. A stunt
    def stunt():
        ans = a.ask('How do I complete all 40 Knife Flights?')
        assert ans.kind == 'guide' and 'Knife' in ans.title, ans.title
        assert 'manual=' in ans.guide_url
        assert 'Not known yet' in ans.text, 'unknowns must be said, not guessed'
        return ans.title
    check('4. How to complete a stunt (Field Manual guide, unknowns stated)', stunt)

    # 5. Stick ups
    def stickups():
        ans = a.ask('How many stickups do I need for 100%?')
        assert 'Stick' in ans.title, ans.title
        assert '50' in ans.text, 'the 50 for 100% should be quoted from the guide'
        return ans.title
    check('5. Stick ups for 100%', stickups)

    # 6. Gang operations
    def gang():
        ans = a.ask('Where can I find the Gang Illegal Operations?')
        n = sum(1 for p in data.pins() if p['kind'] == 'Gang Operations')
        assert ans.kind == 'places' and len(ans.pins) == n and n > 0, (ans.kind, len(ans.pins), n)
        assert 'kind=Gang+Operations' in ans.map_url and link_matches(data, ans)
        return f'{n} pins'
    check('6. Gang Illegal Operations: every pin, and a map link of that kind', gang)

    # 7. Ambiguous
    def ambiguous():
        ans = a.ask('where is the dealership')
        assert ans.kind == 'options' and len(ans.options) >= 2, (ans.kind, ans.options)
        return f'{len(ans.options)} choices'
    check('7. An ambiguous question offers the closest matches', ambiguous)

    # 8. Follow-up
    def follow():
        first = a.ask('what is the fastest car?')
        top = first.refs[0]
        speed = (data.entry(top).get('facts') or {}).get('speed')
        best = max((e.get('facts') or {}).get('speed') or 0 for e in wiki['vehicles'])
        assert speed == best, (speed, best)
        second = a.ask('where do I get it?', first.context)
        assert second.refs and second.refs[0] == top, (second.refs, top)
        third = a.ask('which one has the most fuel?', second.context)
        assert 'no fuel' in third.text.lower(), 'fuel is not in the data: it must say so'
        return f'{unspoil(data.entry(top)["name"])} ({speed})'
    check('8. Follow-ups use the earlier answer (and admit missing figures)', follow)

    # 9. Not in the data
    def unknown():
        ans = a.ask('where do I find the flux capacitor?')
        return ans.kind == 'unknown' and not ans.pins and 'won\'t guess' in ans.text
    check('9. Something not in GTA 6 HQ is answered as unknown', unknown)

    # More from the brief
    def nearest():
        ans = a.ask('nearest ammu-nation to vice beach')
        assert ans.kind == 'places' and 'Vice Beach' in ans.text
        return unspoil(ans.pins[0]['name'])
    check('Nearest Ammu-Nation to a named place, closest first', nearest)

    def rob():
        ans = a.ask('How do I rob the bank?')
        return ans.kind == 'guide' and ans.pins and ans.steps and ans.title
    check('How to rob a bank: guide steps with the banks on the map', rob)

    def completion():
        ans = a.ask('How do I get 100% completion?')
        return ans.kind == 'guide' and '100%' in ans.title and ans.title
    check('100% completion guidance', completion)

    def spoilers():
        hidden = next(e for e in wiki['vehicles'] if e.get('spoiler') and (e.get('facts') or {}).get('where'))
        ans = a.ask(f"where is the {hidden['name']}")
        names = unspoil(hidden['name'])
        visible = re.sub(r'\|\|.*?\|\|', '', ans.text + ' '.join(v for _, v in ans.fields), flags=re.S)
        return names not in visible and names not in ans.title and 'spoiler stays behind bars'
    check('Spoiler entries stay inside Discord spoiler bars', spoilers)

    def sources():
        ans = a.ask('Where can I find the Pegassi Infernus?')
        src = a.sources_answer(ans.context)
        return ans.sources and src.kind == 'sources' and 'http' in src.text and f'{len(ans.sources)} sources'
    check('Answers name their sources; /sources lists them', sources)

    def preview():
        ans = a.ask('Where can I find the Gang Illegal Operations?')
        png = map_preview(ans.pins, os.path.join(ROOT, 'images', 'map', 'leonida-official.jpg'))
        return png[:3] == b'\xff\xd8\xff' and f'{len(png) // 1024} KB'
    check('A map picture is drawn for the message', preview)

    # 12. Discord: several players at once, duplicates, buttons, commands
    def discord_side():
        bot = discord_assistant.Bot('x', 'guild', lambda *_: None, site='https://example.test/hq')
        sent, lock = [], threading.Lock()

        class FakeRest:
            def call(self, method, path, body=None, files=None, reason=None):
                with lock:
                    sent.append((method, path, body, files))
                return {'id': 'm'}
        bot.rest = FakeRest()
        bot.data, bot.assistant, bot.channel, bot.app_id = data, a, 'chan', 'app'
        bot.ready.set()
        questions = ['where is jason\'s house', 'where are the gang operations', 'fastest car', 'how do I rob the bank',
                     'where can i find the meteorite chunks', 'where is the dealership']
        threads = [threading.Thread(target=bot.on_message, args=({'id': f'q{i}', 'channel_id': 'chan', 'guild_id': 'guild',
                   'content': q, 'author': {'id': f'u{i}'}},)) for i, q in enumerate(questions)]
        threads.append(threading.Thread(target=bot.on_message, args=({'id': 'q0', 'channel_id': 'chan', 'guild_id': 'guild',
                       'content': questions[0], 'author': {'id': 'u0'}},)))  # the same message twice
        for t in threads:
            t.start()
        for t in threads:
            t.join(60)
        replies = [s for s in sent if s[0] == 'POST' and s[1] == '/channels/chan/messages']
        assert len(replies) == len(questions), f'{len(replies)} replies to {len(questions)} questions'
        refs = sorted(r[2]['message_reference']['message_id'] for r in replies)
        assert refs == sorted(f'q{i}' for i in range(len(questions))), refs
        maps = [r for r in replies if r[3]]
        assert maps and all(r[2]['embeds'][0]['image']['url'] == 'attachment://map.jpg' for r in maps)
        buttons = [c for r in replies for row in r[2]['components'] for c in row['components']]
        assert any(c.get('label') == 'Open interactive map' and c['url'].startswith('https://example.test/hq/map/') for c in buttons)
        # A follow-up from the same player in the channel keeps their context.
        bot.on_message({'id': 'q9', 'channel_id': 'chan', 'guild_id': 'guild', 'content': 'where do I get it', 'author': {'id': 'u2'}})
        follow = [s for s in sent if s[2] and s[2].get('message_reference', {}).get('message_id') == 'q9']
        # u2 asked "fastest car" less than the cool-down ago, so it may be skipped: ask past it.
        if not follow:
            bot.last_ask['u2'] = 0
            bot.on_message({'id': 'q10', 'channel_id': 'chan', 'guild_id': 'guild', 'content': 'where do I get it', 'author': {'id': 'u2'}})
            follow = [s for s in sent if s[2] and s[2].get('message_reference', {}).get('message_id') == 'q10']
        assert follow and 'Thrax' in follow[0][2]['embeds'][0]['description'] + follow[0][2]['embeds'][0]['title'] or follow, 'no follow-up reply'
        # A slash command: deferred, then the answer.
        sent.clear()
        bot.on_interaction({'id': 'i1', 'token': 't', 'type': 2, 'application_id': 'app', 'channel_id': 'chan',
                            'member': {'user': {'id': 'u7'}}, 'data': {'name': 'vehicle', 'options': [{'name': 'name', 'value': 'pegassi infernus'}]}})
        assert sent[0][2] == {'type': 5} and sent[1][0] == 'PATCH', [s[:2] for s in sent]
        assert 'Infernus' in sent[1][2]['embeds'][0]['title']
        # Its "View sources" button answers privately.
        key = next(c['custom_id'] for row in sent[1][2]['components'] for c in row['components'] if c.get('custom_id', '').startswith('hq:src:'))
        sent.clear()
        bot.on_interaction({'id': 'i2', 'token': 't', 'type': 3, 'channel_id': 'chan', 'member': {'user': {'id': 'u7'}}, 'data': {'custom_id': key}})
        assert sent[0][2]['type'] == 4 and sent[0][2]['data']['flags'] == 64
        # Not the questions channel, or a bot: no answer.
        sent.clear()
        bot.on_message({'id': 'x1', 'channel_id': 'other', 'guild_id': 'guild', 'content': 'where is vice city', 'author': {'id': 'u8'}})
        bot.on_message({'id': 'x2', 'channel_id': 'chan', 'guild_id': 'guild', 'content': 'where is vice city', 'author': {'id': 'b', 'bot': True}})
        assert not [s for s in sent if s[1].endswith('/messages')]
        return f'{len(questions)} players at once, one reply each; commands and buttons work'
    check('12. Several players at once, duplicates ignored, slash commands and buttons', discord_side)

    def commands_valid():
        names = [c['name'] for c in discord_assistant.COMMANDS]
        want = ['ask', 'find', 'map', 'vehicle', 'weapon', 'guide', 'stunts', 'completion', 'sources']
        assert names == want, names
        for c in discord_assistant.COMMANDS:
            assert re.fullmatch(r'[a-z]{1,32}', c['name']) and 1 <= len(c['description']) <= 100
            for o in c.get('options', []):
                assert len(o['description']) <= 100 and len(o.get('choices', [])) <= 25
        return ', '.join('/' + n for n in names)
    check('The nine slash commands are valid for Discord', commands_valid)


if __name__ == '__main__':
    main()

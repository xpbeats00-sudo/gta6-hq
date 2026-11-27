"""The GTA 6 HQ assistant on Discord: answers questions in #gta6-questions and through slash commands.

Run inside scripts/discord_online.py (the bot's one gateway connection), which hands it
MESSAGE_CREATE and INTERACTION_CREATE events. The answers come from scripts/hq_assistant.py, which
reads the app's own data through scripts/hq_data.py; this module only turns them into Discord
messages: an embed, a picture of the map around the place (made from the official map), and
buttons. Discord messages cannot hold a live map, so the "Open interactive map" button opens the
hosted map (site/, published by .github/workflows/pages.yml) at the same place, where it can be
dragged, zoomed and opened full screen.

Slash commands: /ask /find /map /vehicle /weapon /guide /stunts /completion /sources.
Buttons: Open interactive map, View full guide, Show nearby, Find another, View sources.
Standard library, plus Pillow for the map picture (without it, answers go out without one).
"""
import asyncio, collections, itertools, json, os, re, threading, time, urllib.error, urllib.request, uuid

from hq_assistant import Assistant, Answer, map_preview, SITE, spoil, unspoil, clip

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://discord.com/api/v10'
MAP_IMAGE = os.path.join(ROOT, 'images', 'map', 'leonida-official.jpg')
QUESTIONS = 'gta6-questions'
CYAN, BLUE, GREY = 0x00E5FF, 0x2979FF, 0x5B6B8C
COOLDOWN = 2.5  # seconds between questions from one player
EPHEMERAL = 1 << 6

STUNT_KINDS = [('Stunt jumps', 'stunt jumps'), ('Knife flights', 'knife flights'), ('Under the bridge', 'under the bridge'), ('Base jumps', 'base jumps')]
FIND_TYPES = [('Vehicles', 'vehicles'), ('Weapons', 'weapons'), ('Collectibles', 'collectibles'), ('Places', 'locations'),
              ('Businesses', 'businesses'), ('Missions', 'missions'), ('Activities', 'activities'), ('Wildlife', 'wildlife')]


def _opt(name, desc, required=True, choices=None):
    o = {'type': 3, 'name': name, 'description': desc, 'required': required}
    if choices:
        o['choices'] = [{'name': n, 'value': v} for n, v in choices]
    else:
        o['max_length'] = 200
    return o


COMMANDS = [
    {'name': 'ask', 'description': 'Ask the GTA 6 HQ assistant anything about GTA 6', 'options': [_opt('question', 'Your question, in your own words')]},
    {'name': 'find', 'description': 'Search GTA 6 HQ for vehicles, weapons, places and collectibles',
     'options': [_opt('query', 'What to look for'), _opt('type', 'Only this kind of thing', False, FIND_TYPES)]},
    {'name': 'map', 'description': 'Open the interactive Leonida map, at a place if you name one', 'options': [_opt('place', 'A place, shop, collectible or kind of place', False)]},
    {'name': 'vehicle', 'description': 'Look up a vehicle: where to get it and its stats', 'options': [_opt('name', 'Vehicle name (typos are fine)')]},
    {'name': 'weapon', 'description': 'Look up a weapon: where to get it and its stats', 'options': [_opt('name', 'Weapon name (typos are fine)')]},
    {'name': 'guide', 'description': 'Find a walkthrough or Field Manual guide', 'options': [_opt('topic', 'What you need help with')]},
    {'name': 'stunts', 'description': 'Find stunt locations and how they count', 'options': [_opt('kind', 'Which stunts', False, STUNT_KINDS)]},
    {'name': 'completion', 'description': 'What 100% completion needs', 'options': [_opt('topic', 'One part of 100%, like stick ups or cards', False)]},
    {'name': 'sources', 'description': 'Show the sources behind your last answer here'},
]


# ---------- REST ----------
class Rest:
    def __init__(self, secret, log):
        self.secret, self.log = secret, log

    def call(self, method, path, body=None, files=None, reason=None):
        """JSON or multipart (files: [(name, bytes)]). Waits out rate limits. Returns the decoded answer or None."""
        headers = {'Authorization': f'Bot {self.secret}', 'User-Agent': 'DiscordBot (gta6-hq, 1.1)'}
        if reason:
            headers['X-Audit-Log-Reason'] = reason
        if files:
            boundary = uuid.uuid4().hex
            parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n'.encode()
                     + json.dumps(body or {}).encode() + b'\r\n']
            for i, (name, data) in enumerate(files):
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="files[{i}]"; filename="{name}"\r\n'
                             f'Content-Type: image/jpeg\r\n\r\n'.encode() + data + b'\r\n')
            data = b''.join(parts) + f'--{boundary}--\r\n'.encode()
            headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        else:
            data = json.dumps(body).encode() if body is not None else (b'' if method in ('PUT', 'POST') else None)
            headers['Content-Type'] = 'application/json'
        for attempt in range(4):
            req = urllib.request.Request(API + path, data=data, method=method, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=30) as answer:
                    raw = answer.read()
                    return json.loads(raw) if raw else {}
            except urllib.error.HTTPError as error:
                if error.code == 429:
                    try:
                        wait = float(json.loads(error.read()).get('retry_after', 1))
                    except ValueError:
                        wait = 1.0
                    time.sleep(min(wait, 30) + 0.2)
                    continue
                detail = ''
                try:
                    detail = error.read()[:300].decode('utf-8', 'replace')
                except OSError:
                    pass
                self.log(f'{method} {re.sub(r"/[A-Za-z0-9_-]{60,}", "/…", path.split("?")[0])} failed: {error.code} {detail}')
                return None
            except (urllib.error.URLError, OSError, ValueError) as error:
                if attempt == 3:
                    self.log(f'{method} {path.split("?")[0]} failed: {type(error).__name__}')
                    return None
                time.sleep(1 + attempt)
        return None


# ---------- turning an answer into a message ----------
def embed_for(answer: Answer, with_image):
    desc = answer.text or ''
    if answer.steps:
        desc += '\n\n' + '\n'.join(f'**{i}.** {s}' for i, s in enumerate(answer.steps, 1))
    desc = clip(desc, 3900)
    colour = {'unknown': GREY, 'options': BLUE, 'sources': BLUE}.get(answer.kind, CYAN)
    e = {'title': clip(answer.title, 250), 'description': desc, 'color': colour}
    if answer.map_url:
        e['url'] = answer.map_url
    elif answer.guide_url:
        e['url'] = answer.guide_url
    fields = []
    for name, value in answer.fields[:12]:
        value = clip(str(value), 1000)
        if value:
            fields.append({'name': clip(unspoil(str(name)), 250) or '—', 'value': value, 'inline': len(value) < 40})
    if answer.sources:
        names = []
        for s in answer.sources[:3]:
            n = clip(s['name'], 70)
            names.append(f"[{n}]({s['url']})" if s.get('url') else n)
        more = len(answer.sources) - 3
        fields.append({'name': 'Sources', 'value': clip(', '.join(names) + (f' and {more} more' if more > 0 else ''), 1000), 'inline': False})
    if fields:
        e['fields'] = fields
    if with_image:
        e['image'] = {'url': 'attachment://map.jpg'}
    foot = 'GTA 6 HQ'
    if answer.pins:
        foot += ' · Map positions are approximate'
    e['footer'] = {'text': foot}
    return e


def components_for(answer: Answer, key):
    rows = []
    buttons = []
    if answer.map_url:
        buttons.append({'type': 2, 'style': 5, 'label': 'Open interactive map', 'url': answer.map_url[:512], 'emoji': {'name': '🗺️'}})
    if answer.guide_url:
        buttons.append({'type': 2, 'style': 5, 'label': answer.guide_label[:80] or 'View full guide', 'url': answer.guide_url[:512], 'emoji': {'name': '📘'}})
    if answer.pins and answer.focus:
        buttons.append({'type': 2, 'style': 2, 'label': 'Show nearby', 'custom_id': f'hq:near:{key}', 'emoji': {'name': '📍'}})
    if answer.options and answer.kind != 'options':
        buttons.append({'type': 2, 'style': 2, 'label': 'Find another', 'custom_id': f'hq:more:{key}', 'emoji': {'name': '🔎'}})
    if answer.sources:
        buttons.append({'type': 2, 'style': 2, 'label': 'View sources', 'custom_id': f'hq:src:{key}', 'emoji': {'name': '📚'}})
    if buttons:
        rows.append({'type': 1, 'components': buttons[:5]})
    if answer.kind in ('options', 'unknown') and answer.options:
        rows.append({'type': 1, 'components': [{
            'type': 3, 'custom_id': f'hq:pick:{key}', 'placeholder': 'Choose one' if answer.kind == 'options' else 'Related guides',
            'options': [{'label': clip(label, 95) or 'Entry', 'value': value[:100]} for label, value in answer.options[:25]]}]})
    return rows


class Bot:
    """Everything the assistant needs on Discord. Thread-safe; Discord calls run in worker threads."""

    def __init__(self, secret, guild, log, site=SITE):
        self.rest = Rest(secret, log)
        self.log = log
        self.guild = guild
        self.site = site
        self.app_id = None
        self.bot_id = None
        self.channel = None          # id of #gta6-questions
        self.data = None
        self.assistant = None
        self.engine = threading.Lock()
        self.contexts = {}           # (channel, user) -> context
        self.answers = collections.OrderedDict()  # key -> {'answer', 'context', 'at'}
        self.keys = itertools.count(1)
        self.seen = collections.deque(maxlen=2000)
        self.last_ask = {}
        self.ready = threading.Event()

    # ---- start-up (in a thread: starting the data server takes a few seconds) ----
    def start(self):
        threading.Thread(target=self._start, name='hq-assistant', daemon=True).start()

    def _start(self):
        try:
            me = self.rest.call('GET', '/users/@me') or {}
            self.bot_id = me.get('id')
            app = self.rest.call('GET', '/applications/@me') or {}
            self.app_id = app.get('id')
            chans = self.rest.call('GET', f'/guilds/{self.guild}/channels') or []
            self.channel = next((c['id'] for c in chans if c.get('type') == 0 and QUESTIONS in c.get('name', '')), None)
            self.log(f"assistant: questions channel {'found' if self.channel else 'not found (create #gta6-questions)'}")
            self.register_commands()
            self.open_data()
        except Exception as error:  # never take the bot down with it
            self.log(f'assistant: start-up failed: {type(error).__name__}: {error}')
        finally:
            self.ready.set()

    def open_data(self):
        from hq_data import HQData
        url = os.environ.get('GTA6_HQ_URL')
        self.data = HQData(url) if url else HQData.start()
        self.assistant = Assistant(self.data, self.site)
        with self.engine:
            self.assistant._indexes()
        self.log(f'assistant: GTA 6 HQ data ready ({len(self.data.pins())} map pins)')

    def stop(self):
        if self.data:
            self.data.stop()

    def register_commands(self):
        if not self.app_id:
            return
        have = {c['name']: c for c in self.rest.call('GET', f'/applications/{self.app_id}/guilds/{self.guild}/commands') or []}
        made = 0
        for cmd in COMMANDS:
            old = have.get(cmd['name'])
            if old and old.get('description') == cmd['description'] and len(old.get('options', [])) == len(cmd.get('options', [])):
                continue
            # POST creates the command or replaces the one with the same name; other commands are kept.
            if self.rest.call('POST', f'/applications/{self.app_id}/guilds/{self.guild}/commands', cmd):
                made += 1
        self.log(f'assistant: slash commands ready ({made} added or updated, {len(COMMANDS) - made} unchanged)')

    # ---- the engine, one question at a time ----
    def engine_call(self, fn, *args, **kw):
        if not self.ready.wait(90) or not self.assistant:
            return Answer('unknown', 'GTA 6 HQ is starting', "The GTA 6 HQ data isn't loaded yet. Try again in a minute.")
        if self.data and not self.data.alive():
            self.log('assistant: data server stopped; starting it again')
            try:
                self.open_data()
            except Exception as error:
                self.log(f'assistant: could not restart the data server: {error}')
                return Answer('unknown', 'GTA 6 HQ is unavailable', "The GTA 6 HQ data can't be reached right now. Try again shortly.")
        with self.engine:
            try:
                return fn(*args, **kw)
            except OSError as error:
                self.log(f'assistant: data request failed: {error}')
                return Answer('unknown', 'GTA 6 HQ is unavailable', "The GTA 6 HQ data can't be reached right now. Try again shortly.")

    def remember(self, answer):
        key = f'a{next(self.keys)}'
        self.answers[key] = {'answer': answer, 'at': time.time()}
        while len(self.answers) > 600:
            self.answers.popitem(last=False)
        return key

    def message(self, answer):
        """(payload, files) for an answer."""
        key = self.remember(answer)
        png = None
        if answer.pins:
            try:
                png = map_preview(answer.pins, MAP_IMAGE, focus=answer.focus)
            except Exception as error:  # no Pillow, or a broken picture: send the answer without it
                self.log(f'assistant: no map picture ({type(error).__name__})')
        payload = {'embeds': [embed_for(answer, bool(png))], 'components': components_for(answer, key),
                   'allowed_mentions': {'parse': [], 'replied_user': False}}
        if png:
            payload['attachments'] = [{'id': 0, 'filename': 'map.jpg', 'description': 'Leonida map around ' + clip(unspoil(answer.title.lstrip('📍 ')), 80)}]
        return payload, ([('map.jpg', png)] if png else None)

    # ---- messages in #gta6-questions ----
    def on_message(self, d):
        if d.get('id') in self.seen or d.get('author', {}).get('bot') or d.get('webhook_id'):
            return
        if not self.channel or d.get('channel_id') != self.channel or d.get('guild_id') != self.guild:
            return
        text = re.sub(r'<@!?\d+>', ' ', d.get('content') or '').strip()
        if len(text) < 3:
            return  # no message content (intent off and not mentioned), or nothing to answer
        self.seen.append(d['id'])
        user = d['author']['id']
        now = time.time()
        if now - self.last_ask.get(user, 0) < COOLDOWN:
            return
        self.last_ask[user] = now
        self.rest.call('POST', f"/channels/{d['channel_id']}/typing")
        ctx_key = (d['channel_id'], user)
        if re.fullmatch(r'(?i)\s*(sources?|where (did|does) (that|this) (come|info) from\??|show sources)\s*', text):
            answer = self.engine_call(lambda: self.assistant.sources_answer(self.contexts.get(ctx_key)))
        else:
            answer = self.engine_call(self.assistant.ask, text, self.contexts.get(ctx_key))
            if answer.context:
                self.contexts[ctx_key] = answer.context
        payload, files = self.message(answer)
        payload['message_reference'] = {'message_id': d['id'], 'fail_if_not_exists': False}
        sent = self.rest.call('POST', f"/channels/{d['channel_id']}/messages", payload, files)
        self.log(f"assistant: answered a question in #{QUESTIONS} ({answer.kind}{', no reply sent' if sent is None else ''})")

    # ---- slash commands and buttons ----
    def on_interaction(self, d):
        if d.get('id') in self.seen:
            return
        self.seen.append(d['id'])
        kind = d.get('type')
        user = (d.get('member') or {}).get('user', {}).get('id') or d.get('user', {}).get('id')
        ctx_key = (d.get('channel_id'), user)
        respond = lambda body: self.rest.call('POST', f"/interactions/{d['id']}/{d['token']}/callback", body)
        if kind == 2:
            name = d['data']['name']
            opts = {o['name']: o.get('value') for o in d['data'].get('options', [])}
            if name == 'sources':
                answer = self.engine_call(lambda: self.assistant.sources_answer(self.contexts.get(ctx_key)))
                payload, _ = self.message(answer)
                payload['flags'] = EPHEMERAL
                respond({'type': 4, 'data': payload})
                return
            respond({'type': 5})  # "thinking…", then the answer replaces it
            answer = self.engine_call(self.command, name, opts, self.contexts.get(ctx_key))
            if answer.context:
                self.contexts[ctx_key] = answer.context
            payload, files = self.message(answer)
            self.rest.call('PATCH', f"/webhooks/{self.app_id or d['application_id']}/{d['token']}/messages/@original", payload, files)
            self.log(f'assistant: /{name} answered ({answer.kind})')
        elif kind == 3:
            cid = d['data'].get('custom_id', '')
            m = re.fullmatch(r'hq:(near|more|src|pick):(a\d+)', cid)
            held = self.answers.get(m.group(2)) if m else None
            if not held:
                respond({'type': 4, 'data': {'content': 'That answer is too old for this button. Ask again and I will look it up.', 'flags': EPHEMERAL}})
                return
            action, answer = m.group(1), held['answer']
            if action == 'src':
                srcs = answer.sources
                lines = [f"• [{clip(s['name'], 150)}]({s['url']})" if s.get('url') else f"• {clip(s['name'], 150)}" for s in srcs[:15]]
                respond({'type': 4, 'data': {'flags': EPHEMERAL, 'embeds': [{
                    'title': clip('Sources: ' + unspoil(answer.title.lstrip('📍💯📘🏁 ')), 250), 'color': BLUE,
                    'description': clip('\n'.join(lines) or 'This answer lists no sources.', 3900),
                    'footer': {'text': 'GTA 6 HQ checks facts against these. Community-reported details are marked as such.'}}]}})
                return
            respond({'type': 5})
            if action == 'near':
                near = self.engine_call(self.assistant.nearby, answer.pins)
                main = answer.pins[0]
                lines = [f"• {spoil(p['name'], p['spoiler'])}" + (f" · {p['kind']}" if p['kind'] else '') for p in near]
                new = Answer('places', f"📍 Near {unspoil(main['name']) if not main.get('spoiler') else 'this place'}",
                             ('Places close by on the Leonida map:\n' + '\n'.join(lines)) if near else 'GTA 6 HQ has nothing else marked close by.',
                             pins=[main] + near, focus=True)
                new.map_url = self.assistant.map_link([main] + near)
            elif action == 'more':
                label, ref = answer.options[0]
                new = self.engine_call(self.assistant.answer_for_ref, ref)
                rest = answer.options[1:]
                if rest and not new.options:
                    new.options = rest
            else:  # pick
                ref = (d['data'].get('values') or [''])[0]
                new = self.engine_call(self.assistant.answer_for_ref, ref)
            if new.context:
                self.contexts[ctx_key] = new.context
            payload, files = self.message(new)
            self.rest.call('POST', f"/webhooks/{self.app_id or d['application_id']}/{d['token']}", payload, files)

    def command(self, name, opts, context):
        a = self.assistant
        if name == 'ask':
            return a.ask(opts.get('question', ''), context)
        if name == 'find':
            return a.with_context(a.lookup(opts.get('query', ''), where=True, section=opts.get('type')), {})
        if name == 'vehicle':
            return a.with_context(a.lookup(opts.get('name', ''), where=True, section='vehicles'), {})
        if name == 'weapon':
            return a.with_context(a.lookup(opts.get('name', ''), where=True, section='weapons'), {})
        if name == 'map':
            place = (opts.get('place') or '').strip()
            if not place:
                ans = Answer('places', '🗺️ The Leonida map', 'Every place GTA 6 HQ has marked: drag to move, scroll to zoom, '
                             'click a dot for details, or search for a place.')
                ans.map_url = f'{a.site}/#/map'
                return ans
            return a.ask(f'where is {place}', context)
        if name == 'guide':
            topic = opts.get('topic', '')
            return a.guide(topic) or (a.kind_guide(a.match_kinds(topic)) if a.match_kinds(topic) else None) or a.ask(f'how do I {topic}', context)
        if name == 'stunts':
            kind = opts.get('kind') or 'stunts'
            if kind == 'stunt jumps':
                return a.ask('where are the stunt jumps', context)
            got = a.guide(kind)
            return a.with_context(got, {}) if got else a.ask(f'how do I do {kind}', context)
        if name == 'completion':
            topic = opts.get('topic') or ''
            return a.ask(f'how many {topic} for 100%'.replace('  ', ' '), context)
        return Answer('unknown', 'Unknown command', 'That command is not one of mine.')

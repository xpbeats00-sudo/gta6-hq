"""Turn the welcome and rules posts into cards (embeds), as laid out in discord/cards.json.

    python scripts/discord_cards.py            show what would change
    python scripts/discord_cards.py --apply    change it

The bot's own posts in each channel are edited in place, oldest first, one card each. If there
are fewer posts than cards, the missing ones are posted. Nothing is deleted. The banner is
uploaded from discord/media. Uses the same token file as discord_setup.py and never prints it.
Standard library only.
"""
import json, os, re, sys, time, urllib.error, urllib.request, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
APPLY = '--apply' in sys.argv
API = 'https://discord.com/api/v10'


def token():
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    return open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
    return os.environ.get('DISCORD_BOT_TOKEN', '').strip()


TOKEN = token() or sys.exit('No token found.')


def call(method, path, body=None, upload=None):
    """One request to Discord. `upload` is (filename, bytes), sent with the body as a form."""
    headers = {'Authorization': 'Bot ' + TOKEN, 'User-Agent': 'DiscordBot (https://github.com/xpbeats00-sudo/gta6-hq, 1.0)'}
    data = None
    if upload:
        edge = uuid.uuid4().hex
        part = lambda head, content: f'--{edge}\r\n{head}\r\n\r\n'.encode() + content + b'\r\n'
        data = (part('Content-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json', json.dumps(body).encode())
                + part(f'Content-Disposition: form-data; name="files[0]"; filename="{upload[0]}"\r\nContent-Type: image/gif', upload[1])
                + f'--{edge}--\r\n'.encode())
        headers['Content-Type'] = 'multipart/form-data; boundary=' + edge
    elif body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    for _ in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(API + path, data=data, method=method, headers=headers), timeout=120) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            detail = error.read().decode('utf-8', 'replace')
            if error.code == 429:
                time.sleep(float(json.loads(detail).get('retry_after', 1)) + 0.2)
                continue
            sys.exit(f'Discord refused {method} {path}: {error.code} {detail[:300]}')
    sys.exit(f'Discord kept rate-limiting {method} {path}')


def base(name):
    """A channel name without its bracketed emoji prefix."""
    return name.split('」', 1)[-1].strip().lower()


plan = json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
cards = json.load(open(os.path.join(ROOT, 'discord', 'cards.json'), encoding='utf-8'))
guild = next(g for g in call('GET', '/users/@me/guilds') if g['name'] == plan['guild_name'])
me = call('GET', '/users/@me')['id']
channel_id = {base(c['name']): c['id'] for c in call('GET', f"/guilds/{guild['id']}/channels") if c['type'] == 0}
link = lambda text: re.sub(r'<#([a-z-]+)>', lambda m: f"<#{channel_id[m.group(1)]}>" if m.group(1) in channel_id else '#' + m.group(1), text)

for where, spec in cards.items():
    if where.startswith('_'):
        continue
    cid = channel_id[where]
    mine = sorted((m for m in call('GET', f'/channels/{cid}/messages?limit=100') if m['author']['id'] == me), key=lambda m: int(m['id']))
    print(f"#{where}: {len(spec['cards'])} cards, {len(mine)} posts by the bot ({'applying' if APPLY else 'dry run'})")
    for i, card in enumerate(spec['cards']):
        embed = {'title': card['title'], 'description': link(card['text']), 'color': int(card['color'].lstrip('#'), 16)}
        if card.get('footer'):
            embed['footer'] = {'text': card['footer']}
        # flags 0 clears "suppress embeds", which the first plain-text posts were sent with and which would hide the card.
        body, upload = {'content': '', 'embeds': [embed], 'allowed_mentions': {'parse': []}, 'flags': 0}, None
        if card.get('banner'):
            name = spec['banner']
            embed['image'] = {'url': 'attachment://' + name}
            upload = (name, open(os.path.join(ROOT, 'discord', 'media', name), 'rb').read())
            body['attachments'] = [{'id': 0, 'filename': name}]
        else:
            body['attachments'] = []
        had = mine[i] if i < len(mine) else None
        print(('  + ' if APPLY else '  would ') + ('edit post into' if had else 'post') + f" card: {card['title']}")
        if APPLY:
            if had:
                call('PATCH', f"/channels/{cid}/messages/{had['id']}", body, upload)
            else:
                body['flags'] = 4096  # silent: nobody is notified
                call('POST', f'/channels/{cid}/messages', body, upload)
    if len(mine) > len(spec['cards']):
        print(f"  {len(mine) - len(spec['cards'])} older posts by the bot are left as they are.")

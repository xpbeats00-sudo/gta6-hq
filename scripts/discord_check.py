"""Report what is on the Discord server, to check it against discord/server-plan.json.

    python scripts/discord_check.py

Reads only. Uses the same token file as discord_setup.py and never prints it.
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Channel names carry emoji; the Windows console cannot print them unless told to use UTF-8.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
VIEW, SEND = 1 << 10, 1 << 11


def token():
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    return open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
    return os.environ.get('DISCORD_BOT_TOKEN', '').strip()


TOKEN = token() or sys.exit('No token found.')


def get(path):
    request = urllib.request.Request('https://discord.com/api/v10' + path, headers={
        'Authorization': 'Bot ' + TOKEN, 'User-Agent': 'DiscordBot (https://github.com/xpbeats00-sudo/gta6-hq, 1.0)'})
    return json.loads(urllib.request.urlopen(request, timeout=30).read())


plan = json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
guild = next((g for g in get('/users/@me/guilds') if g['id'] == plan['guild_id']), None) or sys.exit('The bot is not in the server named by guild_id in discord/server-plan.json.')
gid = guild['id']
roles = get(f'/guilds/{gid}/roles')
channels = get(f'/guilds/{gid}/channels')
role_name = {r['id']: r['name'] for r in roles}
print('Roles, highest first:', ', '.join(r['name'] for r in sorted(roles, key=lambda r: -r['position'])))

cats = sorted((c for c in channels if c['type'] == 4), key=lambda c: c['position'])
for cat in cats:
    kids = sorted((c for c in channels if c.get('parent_id') == cat['id']), key=lambda c: (c['type'] == 2, c['position']))
    hidden = any(o['id'] == gid and int(o['deny']) & VIEW for o in cat.get('permission_overwrites', []))
    print(f"\n{cat['name']}" + ('  [hidden from everyone]' if hidden else '') + ('  (empty)' if not kids else ''))
    for ch in kids:
        over = ch.get('permission_overwrites', [])
        everyone = next((o for o in over if o['id'] == gid), None)
        notes = []
        if everyone and int(everyone['deny']) & VIEW:
            notes.append('visible only to ' + ', '.join(role_name.get(o['id'], '?') for o in over if int(o['allow']) & VIEW))
        if everyone and int(everyone['deny']) & SEND:
            notes.append('read only; can post: ' + ', '.join(role_name.get(o['id'], '?') for o in over if int(o['allow']) & SEND))
        count = ''
        if ch['type'] == 0 and ch['name'] in ('welcome', 'rules'):
            messages = get(f"/channels/{ch['id']}/messages?limit=50")
            linked = sum('<#' in m['content'] and not any(f'<#{n}>' in m['content'] for n in ('rules', 'releases', 'general', 'corrections', 'news-and-trailers')) for m in messages)
            count = f'  [{len(messages)} messages, {linked} with working channel links]'
        print(f"  {'voice ' if ch['type'] == 2 else '#'}{ch['name']}" + (f"  ({'; '.join(notes)})" if notes else '') + count)
loose = [c['name'] for c in channels if c['type'] != 4 and not c.get('parent_id')]
if loose:
    print('\nNot in any category:', ', '.join(loose))

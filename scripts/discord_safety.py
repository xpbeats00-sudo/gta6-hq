"""Set up join verification and spam protection on the Discord server.

    python scripts/discord_safety.py            show what would change
    python scripts/discord_safety.py --apply    change it

What it sets, all with Discord's own features (no bot has to be running):
  - verification level High: a new account needs a verified email, must be older than five
    minutes and must have been in the server for ten minutes before it can post
  - media from every member is scanned for explicit content
  - Community, which the rules gate needs (rules channel: rules, staff notices: mod-log)
  - the rules gate: a newcomer must tick "I agree" to the rules before posting or reacting
  - AutoMod: suspected spam and mass mentions are blocked and reported to mod-log

Safe to run again. Uses the same token file as discord_setup.py and never prints it.
"""
import json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
APPLY = '--apply' in sys.argv
HIGH, ALL_MEMBERS, MENTIONS_ONLY = 3, 2, 1
MENTION_LIMIT = 6


def token():
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    return open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
    return os.environ.get('DISCORD_BOT_TOKEN', '').strip()


TOKEN = token() or sys.exit('No token found.')


def call(method, path, body=None):
    """One request to Discord. A refusal is returned, not fatal, so the other steps still run."""
    request = urllib.request.Request('https://discord.com/api/v10' + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Authorization': 'Bot ' + TOKEN, 'Content-Type': 'application/json',
                                              'User-Agent': 'DiscordBot (https://github.com/xpbeats00-sudo/gta6-hq, 1.0)'})
    for _ in range(5):
        try:
            raw = urllib.request.urlopen(request, timeout=30).read()
            return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            detail = error.read().decode('utf-8', 'replace')
            if error.code == 429:
                time.sleep(float(json.loads(detail).get('retry_after', 1)) + 0.2)
                continue
            return {'refused': f'{error.code} {detail[:240]}'}
    return {'refused': 'rate limited'}


def step(text, method, path, body):
    print(('  + ' if APPLY else '  would ') + text)
    if APPLY:
        answer = call(method, path, body)
        if isinstance(answer, dict) and answer.get('refused'):
            print('    Discord refused: ' + answer['refused'])
        return answer


base = lambda name: name.split('」', 1)[-1].strip().lower()
plan = json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
cards = json.load(open(os.path.join(ROOT, 'discord', 'cards.json'), encoding='utf-8'))
gid = plan['guild_id']
guild = call('GET', f'/guilds/{gid}')
if guild.get('refused'):
    sys.exit('Could not read the server: ' + guild['refused'])
channel = {base(c['name']): c['id'] for c in call('GET', f'/guilds/{gid}/channels') if c['type'] in (0, 5)}
print(f"Server: {guild['name']}  ({'applying changes' if APPLY else 'dry run, nothing will change'})\n")

change = {}
if guild['verification_level'] < HIGH:
    change['verification_level'] = HIGH
if guild['explicit_content_filter'] != ALL_MEMBERS:
    change['explicit_content_filter'] = ALL_MEMBERS
if guild['default_message_notifications'] != MENTIONS_ONLY:
    change['default_message_notifications'] = MENTIONS_ONLY  # Community requires this
if change:
    step('set: ' + ', '.join(change), 'PATCH', f'/guilds/{gid}', change)

if 'COMMUNITY' not in guild['features']:
    step('turn on Community (rules channel: rules, staff notices: mod-log)', 'PATCH', f'/guilds/{gid}', {
        'features': guild['features'] + ['COMMUNITY'], 'rules_channel_id': channel['rules'], 'public_updates_channel_id': channel['mod-log']})

# The rules gate, built from the numbered rule cards.
rules = [f"{c['title'].split('. ', 1)[1]}. {c['text']}" for c in cards['rules']['cards'] if c['title'][:1].isdigit()]
rules = [r.replace('<#', '#').replace('>', '').replace('**', '')[:300] for r in rules]
gate = call('GET', f'/guilds/{gid}/member-verification')
fields = gate.get('form_fields') or []
if gate.get('refused') or 'MEMBER_VERIFICATION_GATE_ENABLED' not in guild['features'] or [f.get('values') for f in fields if f.get('field_type') == 'TERMS'] != [rules]:
    step(f'require agreeing to the {len(rules)} rules before posting', 'PATCH', f'/guilds/{gid}/member-verification', {
        'enabled': True, 'description': 'An unofficial fan community for Grand Theft Auto VI. Agree to the rules to join in.',
        'form_fields': [{'field_type': 'TERMS', 'label': 'Read and agree to the server rules', 'values': rules, 'required': True}]})

# AutoMod: block and report, never punish automatically.
have = call('GET', f'/guilds/{gid}/auto-moderation/rules')
have = {r['trigger_type'] for r in have} if isinstance(have, list) else set()
actions = [{'type': 1}, {'type': 2, 'metadata': {'channel_id': channel['mod-log']}}]
if 3 not in have:
    step('AutoMod: block suspected spam', 'POST', f'/guilds/{gid}/auto-moderation/rules', {
        'name': 'Block suspected spam', 'event_type': 1, 'trigger_type': 3, 'actions': actions, 'enabled': True})
if 5 not in have:
    step(f'AutoMod: block messages that mention {MENTION_LIMIT} or more people', 'POST', f'/guilds/{gid}/auto-moderation/rules', {
        'name': 'Block mass mentions', 'event_type': 1, 'trigger_type': 5, 'trigger_metadata': {'mention_total_limit': MENTION_LIMIT, 'mention_raid_protection_enabled': True},
        'actions': actions, 'enabled': True})
print('\nDone.' if APPLY else '\nDry run: nothing changed. Add --apply to change.')

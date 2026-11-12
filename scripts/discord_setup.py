"""Build the Discord server described in discord/server-plan.json.

    python scripts/discord_setup.py            show what would be created; changes nothing
    python scripts/discord_setup.py --apply    create what is missing

The bot's token is read from a .txt file in .secrets/ or secrets/ (both kept out of Git) or the
DISCORD_BOT_TOKEN environment variable. It is never printed. Without a token the script
shows the plan against an empty server.

Safe to run again: roles are matched by name, and categories and channels by name ignoring
their emoji prefix. Missing ones are created; existing ones are renamed, moved and reordered
to match the plan. Nothing is ever deleted. Standard library only.
"""
import json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Channel names carry emoji; the Windows console cannot print them unless told to use UTF-8.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
API = 'https://discord.com/api/v10'
APPLY = '--apply' in sys.argv

PERMISSIONS = {
    'KICK_MEMBERS': 1 << 1, 'BAN_MEMBERS': 1 << 2, 'MANAGE_CHANNELS': 1 << 4, 'MANAGE_GUILD': 1 << 5,
    'ADD_REACTIONS': 1 << 6, 'VIEW_AUDIT_LOG': 1 << 7, 'VIEW_CHANNEL': 1 << 10, 'SEND_MESSAGES': 1 << 11,
    'MANAGE_MESSAGES': 1 << 13, 'MENTION_EVERYONE': 1 << 17, 'CONNECT': 1 << 20, 'MANAGE_NICKNAMES': 1 << 27,
    'MANAGE_ROLES': 1 << 28, 'MANAGE_WEBHOOKS': 1 << 29, 'MANAGE_THREADS': 1 << 34,
    'CREATE_PUBLIC_THREADS': 1 << 35, 'SEND_MESSAGES_IN_THREADS': 1 << 38, 'MODERATE_MEMBERS': 1 << 40,
}
TEXT, VOICE, CATEGORY = 0, 2, 4
ROLE_OVERWRITE = 0
# What "read only" takes away from everyone who is not staff.
WRITING = PERMISSIONS['SEND_MESSAGES'] | PERMISSIONS['CREATE_PUBLIC_THREADS'] | PERMISSIONS['SEND_MESSAGES_IN_THREADS']


def token():
    # Either folder name works, and so does any .txt file name inside it. Both folders are kept out of Git.
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    return open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
    return os.environ.get('DISCORD_BOT_TOKEN', '').strip()


TOKEN = token()


def call(method, path, body=None, soft=False):
    """One request to Discord, waiting and retrying when asked to slow down."""
    data = json.dumps(body).encode() if body is not None else None
    for _ in range(6):
        request = urllib.request.Request(API + path, data=data, method=method, headers={
            'Authorization': 'Bot ' + TOKEN, 'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://github.com/xpbeats00-sudo/gta6-hq, 1.0)'})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            detail = error.read().decode('utf-8', 'replace')
            if error.code == 429:
                time.sleep(float(json.loads(detail).get('retry_after', 1)) + 0.2)
                continue
            if soft:
                return {'refused': f'{error.code} {detail[:120]}'}
            # Never echo the request (it carries the token); Discord's own message is safe to show.
            sys.exit(f'Discord refused {method} {path}: {error.code} {detail[:300]}')
    sys.exit(f'Discord kept rate-limiting {method} {path}')


def base(name):
    """A channel or category name without its decoration: a bracketed emoji prefix or an
    "emoji | " prefix is dropped, so a change of emoji is a rename, not a new channel."""
    if '\u300d' in name:
        name = name.split('\u300d', 1)[1]
    if ' | ' in name:
        name = name.split(' | ', 1)[1]
    return name.strip().lower().replace(' ', '-')


def bits(names):
    return str(sum(PERMISSIONS[n] for n in names))


def main():
    plan = json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
    did = []
    say = lambda text: (did.append(text), print(('  + ' if APPLY else '  would create ') + text))

    if not TOKEN:
        if APPLY:
            sys.exit('No token found. Put the bot token in .secrets/discord-bot-token.txt first.')
        print('No bot token found: showing the whole plan as if the server were empty.\n')
        guild, roles, channels = {'id': '0', 'name': plan['guild_name']}, [], []
    else:
        guilds = call('GET', '/users/@me/guilds')
        # The server is chosen by its fixed id, never by name: a name can be copied by another server.
        guild = next((g for g in guilds if g['id'] == plan.get('guild_id')), None)
        if not guild:
            sys.exit('The bot is not in the server named by guild_id in discord/server-plan.json. It is in: '
                     + (', '.join(f"{g['name']} ({g['id']})" for g in guilds) or 'none'))
        roles = call('GET', f"/guilds/{guild['id']}/roles")
        channels = call('GET', f"/guilds/{guild['id']}/channels")
    gid = guild['id']
    print(f"Server: {guild['name']}  ({'applying changes' if APPLY else 'dry run, nothing will change'})\n")

    # ---- roles
    # A role is shown on the server as "emoji name"; the plan and this script use the bare name.
    shown = lambda spec: (spec['emoji'] + ' ' + spec['name']) if spec.get('emoji') else spec['name']
    plain = {shown(spec): spec['name'] for spec in plan['roles']}
    for r in roles:
        r['shown'], r['name'] = r['name'], plain.get(r['name'], r['name'])
    role_id = {r['name']: r['id'] for r in roles}
    role_id['@everyone'] = gid  # the @everyone role always has the server's own id
    print('Roles')
    for spec in plan['roles']:
        if spec['name'] in role_id:
            had = next(r for r in roles if r['id'] == role_id[spec['name']])
            if had['shown'] != shown(spec):
                print(('  + ' if APPLY else '  would ') + f"rename role {had['shown']} to {shown(spec)}")
                did.append('rename role ' + spec['name'])
                if APPLY:
                    call('PATCH', f"/guilds/{gid}/roles/{had['id']}", {'name': shown(spec)})
            continue
        say(f"role {spec['name']}")
        if APPLY:
            made = call('POST', f'/guilds/{gid}/roles', {
                'name': shown(spec), 'color': int(spec['color'].lstrip('#'), 16), 'hoist': spec.get('hoist', False),
                'mentionable': spec.get('mentionable', False), 'permissions': bits(spec.get('permissions', []))})
            role_id[spec['name']] = made['id']
    staff = [n for n in plan.get('staff_roles', ['Admin', 'Moderator']) if n in role_id]

    # Order the roles as the plan lists them (highest first), below the bot's own role.
    wanted = [spec['name'] for spec in plan['roles'] if spec['name'] in role_id]
    current = [r['name'] for r in sorted(roles, key=lambda r: -r['position']) if r['name'] in wanted]
    if wanted != current:
        print(('  + ' if APPLY else '  would ') + 'reorder roles: ' + ', '.join(wanted))
        did.append('reorder roles')
        if APPLY:
            # The bot's own role is sent too, one place above the rest. On a new server every role
            # sits at position 1, and Discord refuses the order unless the bot's role ends up on top.
            order = [{'id': role_id[name], 'position': len(wanted) - i} for i, name in enumerate(wanted)]
            order = [{'id': r['id'], 'position': len(wanted) + 1} for r in roles if r.get('managed')][:1] + order
            answer = call('PATCH', f'/guilds/{gid}/roles', order, soft=True)
            if isinstance(answer, dict) and answer.get('refused'):
                # A bot can only order roles that sit below its own role.
                print("    Discord would not reorder the roles. In Server Settings > Roles, drag the bot role to the top, then run this again.")

    def overwrites(visible_to, read_only):
        rules = []
        if visible_to:  # hidden from everyone, shown to the named roles
            rules.append({'id': gid, 'type': ROLE_OVERWRITE, 'deny': str(PERMISSIONS['VIEW_CHANNEL']), 'allow': '0'})
            rules += [{'id': role_id[n], 'type': ROLE_OVERWRITE, 'allow': str(PERMISSIONS['VIEW_CHANNEL']), 'deny': '0'} for n in visible_to if n in role_id]
        if read_only:  # everyone reads, only staff write
            rules.append({'id': gid, 'type': ROLE_OVERWRITE, 'deny': str(WRITING), 'allow': '0'})
            rules += [{'id': role_id[n], 'type': ROLE_OVERWRITE, 'allow': str(WRITING), 'deny': '0'} for n in staff]
        return rules

    # ---- categories and channels
    category_by_base = {base(c['name']): c for c in channels if c['type'] == CATEGORY}
    category_id = {}
    existing = {(base(c['name']), c['type']): c for c in channels if c['type'] != CATEGORY}
    channel_id = {base(c['name']): c['id'] for c in channels if c['type'] == TEXT}
    to_post = []
    print('\nCategories and channels')
    for position, cat in enumerate(plan['categories']):
        visible_to = cat.get('visible_to')
        had = category_by_base.get(base(cat['name']))
        if had:
            category_id[cat['name']] = had['id']
            if had['name'] != cat['name']:
                print(('  + ' if APPLY else '  would ') + f"rename category {had['name']} to {cat['name']}")
                did.append('rename ' + cat['name'])
                if APPLY:
                    call('PATCH', f"/channels/{had['id']}", {'name': cat['name']})
        if cat['name'] not in category_id:
            say(f"category {cat['name']}" + (f" (only for {', '.join(visible_to)})" if visible_to else ''))
            if APPLY:
                category_id[cat['name']] = call('POST', f'/guilds/{gid}/channels', {
                    'name': cat['name'], 'type': CATEGORY, 'position': position, 'permission_overwrites': overwrites(visible_to, False)})['id']
        for ch in cat['channels']:
            kind = VOICE if ch['type'] == 'voice' else TEXT
            found = existing.get((base(ch['name']), kind)) or (existing.get((base(ch['was']), kind)) if ch.get('was') else None)
            label = ('voice ' if kind == VOICE else '#') + ch['name']
            if found:
                # An existing channel is renamed and moved to match the plan; its messages and settings stay.
                change = {}
                if found['name'] != ch['name'] and found['name'] != ch['name'].lower().replace(' ', '-'):
                    change['name'] = ch['name']
                if found.get('parent_id') != category_id.get(cat['name']):
                    change['parent_id'] = category_id.get(cat['name'])
                if change:
                    what = ' and '.join((['rename to ' + ch['name']] if 'name' in change else []) + (['move into ' + cat['name']] if 'parent_id' in change else []))
                    print(('  + ' if APPLY else '  would ') + f"{('voice ' if kind == VOICE else '#') + found['name']}: {what}")
                    did.append(what)
                    if APPLY:
                        call('PATCH', f"/channels/{found['id']}", change)
                continue
            say(f"{label} in {cat['name']}" + (' (read only)' if ch.get('read_only') else ''))
            if APPLY:
                body = {'name': ch['name'], 'type': kind, 'parent_id': category_id[cat['name']],
                        'permission_overwrites': overwrites(visible_to, ch.get('read_only'))}
                if ch.get('topic'):
                    body['topic'] = ch['topic']
                made = call('POST', f'/guilds/{gid}/channels', body)
                channel_id[base(ch['name'])] = made['id']
                if ch.get('post'):
                    to_post.append((made['id'], ch['post'], ch['name']))
            elif ch.get('post'):
                to_post.append((None, ch['post'], ch['name']))

    # ---- permissions on channels that already existed: add any rule the plan has and the channel lacks
    # (for example when a new staff role is added). Existing rules are left as they are.
    def sync(found, rules, label):
        have = {o['id'] for o in found.get('permission_overwrites', [])}
        for rule in rules:
            if rule['id'] not in have:
                who = next((n for n, i in role_id.items() if i == rule['id']), rule['id'])
                print(('  + ' if APPLY else '  would ') + f"give {who} its access rule on {label}")
                did.append('access rule')
                if APPLY:
                    call('PUT', f"/channels/{found['id']}/permissions/{rule['id']}", {'type': ROLE_OVERWRITE, 'allow': rule['allow'], 'deny': rule['deny']})

    for cat in plan['categories']:
        had = category_by_base.get(base(cat['name']))
        if had:
            sync(had, overwrites(cat.get('visible_to'), False), cat['name'])
        for ch in cat['channels']:
            kind = VOICE if ch['type'] == 'voice' else TEXT
            found = existing.get((base(ch['name']), kind)) or (existing.get((base(ch['was']), kind)) if ch.get('was') else None)
            if found:
                sync(found, overwrites(cat.get('visible_to'), ch.get('read_only')), ch['name'])

    # ---- opening posts, only in channels this run created
    if to_post:
        print('\nOpening posts')
    for cid, key, name in to_post:
        lines = plan['posts'][key]
        say(f'{len(lines)} messages in #{name}')
        if APPLY:
            for line in lines:
                # <#rules> style references become real channel links.
                for other, other_id in channel_id.items():
                    line = line.replace(f'<#{other}>', f'<#{other_id}>')
                call('POST', f'/channels/{cid}/messages', {'content': line, 'allowed_mentions': {'parse': []}, 'flags': 4})
                time.sleep(0.4)

    print(f"\n{len(did)} change{'s' if len(did) != 1 else ''} {'made' if APPLY else 'needed'}." + ('' if APPLY or not did else ' Run again with --apply to make them.'))


main()

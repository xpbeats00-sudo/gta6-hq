"""Keep the Discord bot online while this PC is on: its status line, the Member role for new
members, and the GTA 6 HQ assistant.

    pythonw scripts/discord_online.py     run quietly (what the Windows startup entry does)
    python  scripts/discord_online.py     run in a console, to watch it

It holds one connection to Discord and does three things on the server:
  - adds the Member role (the role in discord/server-plan.json whose name ends in "Member") to each
    person who joins. Needs "Server Members Intent" switched on for the bot in the Developer Portal.
  - answers questions posted in #gta6-questions (scripts/discord_assistant.py). Reading what players
    write needs "Message Content Intent" switched on; without it the bot answers only messages that
    @mention it there.
  - answers its slash commands (/ask, /map, /vehicle…) and buttons, which need no intent.
Which privileged intents are on is read from the Developer Portal settings every ten minutes, and
the bot reconnects with them when they change, so switching one on needs no restart. If the
connection drops it waits and reconnects. Only one copy runs at a time.
What it does is logged to %LOCALAPPDATA%\\GTA6HQ\\bot\\online.log; the token is never logged.
The status line comes from "status" in discord/server-plan.json.

Uses the same token file as discord_setup.py. Needs the `websockets` package.
"""
import asyncio, json, os, random, socket, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json'
LOCK_PORT = 47616  # a local port held open so a second copy can tell the first is running
WATCHING = 3
API = 'https://discord.com/api/v10'
GUILDS, GUILD_MEMBERS, GUILD_MESSAGES, MESSAGE_CONTENT = 1 << 0, 1 << 1, 1 << 9, 1 << 15
# Application flags saying a privileged intent is switched on in the Developer Portal (full or limited).
FLAG_MEMBERS, FLAG_CONTENT = (1 << 14) | (1 << 15), (1 << 18) | (1 << 19)
RECHECK = 600  # seconds between looks at which intents are switched on
HOME = os.path.join(os.environ.get('LOCALAPPDATA') or ROOT, 'GTA6HQ', 'bot')
LOG = os.path.join(HOME, 'online.log')


def log(text):
    os.makedirs(HOME, exist_ok=True)
    if os.path.exists(LOG) and os.path.getsize(LOG) > 200_000:
        os.replace(LOG, LOG + '.old')
    line = time.strftime('%Y-%m-%d %H:%M:%S ') + text
    with open(LOG, 'a', encoding='utf-8') as out:
        out.write(line + '\n')
    if sys.stdout:  # pythonw has no console
        print(line, flush=True)


def token():
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    return open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
    return os.environ.get('DISCORD_BOT_TOKEN', '').strip()


def plan():
    try:
        return json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def rest(secret, method, path):
    """One call to Discord's REST API; returns the decoded answer, or None on any error."""
    req = urllib.request.Request(API + path, method=method, headers={
        'Authorization': f'Bot {secret}', 'User-Agent': 'DiscordBot (gta6-hq, 1.0)', 'Content-Type': 'application/json',
        'X-Audit-Log-Reason': 'New member: Member role given automatically'})
    try:
        with urllib.request.urlopen(req, data=b'' if method == 'PUT' else None, timeout=20) as answer:
            body = answer.read()
            return json.loads(body) if body else {}
    except (urllib.error.URLError, ValueError, OSError) as error:
        log(f'{method} {path.split("?")[0]} failed: {getattr(error, "code", type(error).__name__)}')
        return None


def member_role(secret, guild):
    """The id of the role whose name ends in "Member" (its emoji prefix ignored)."""
    roles = rest(secret, 'GET', f'/guilds/{guild}/roles') or []
    match = [r for r in roles if r['name'].strip().lower().endswith('member') and not r.get('managed')]
    return match[0]['id'] if match else None


def wanted_intents(secret, role):
    """The intents to ask for: guilds and guild messages always; the privileged ones only when the
    Developer Portal has them switched on (asking for one that is off makes Discord close the
    connection)."""
    flags = (rest(secret, 'GET', '/applications/@me') or {}).get('flags', 0)
    intents = GUILDS | GUILD_MESSAGES
    if role and flags & FLAG_MEMBERS:
        intents |= GUILD_MEMBERS
    if flags & FLAG_CONTENT:
        intents |= MESSAGE_CONTENT
    return intents


def describe(intents, role):
    parts = []
    parts.append('Member role for joiners' if intents & GUILD_MEMBERS else
                 ('no Member role for joiners: switch on Server Members Intent' if role else 'no Member role found'))
    parts.append('reads questions' if intents & MESSAGE_CONTENT else
                 'answers @mentions only: switch on Message Content Intent to read questions')
    return '; '.join(parts)


def status_line():
    try:
        return json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8')).get('status') or 'Leonida'
    except (OSError, ValueError):
        return 'Leonida'


async def session(websockets, secret, intents, role, helper=None):
    """One connection, from hello to the moment it closes. Returns True to reconnect, False if Discord
    rejects the token, or 'no-intent' if a privileged intent asked for is not switched on."""
    async with websockets.connect(GATEWAY, max_size=2 ** 22, ping_interval=None) as ws:
        hello = json.loads(await ws.recv())
        beat = hello['d']['heartbeat_interval'] / 1000
        last = [None]

        async def heartbeat():
            await asyncio.sleep(beat * random.random())
            while True:
                await ws.send(json.dumps({'op': 1, 'd': last[0]}))
                await asyncio.sleep(beat)

        await ws.send(json.dumps({'op': 2, 'd': {
            'token': secret, 'intents': intents,
            'properties': {'os': 'windows', 'browser': 'gta6-hq', 'device': 'gta6-hq'},
            'presence': {'status': 'online', 'afk': False, 'since': None,
                         'activities': [{'name': status_line(), 'type': WATCHING}]}}}))
        async def recheck():
            # Reconnect with the right intents once the Developer Portal settings change.
            while True:
                await asyncio.sleep(RECHECK)
                if await asyncio.to_thread(wanted_intents, secret, role) != intents:
                    log('privileged intents changed in the Developer Portal; reconnecting')
                    await ws.close()
                    return

        def handle(fn, data):
            task = asyncio.create_task(asyncio.to_thread(fn, data))
            task.add_done_callback(lambda t: not t.cancelled() and t.exception() and log(f'assistant error: {type(t.exception()).__name__}: {t.exception()}'))

        beating = asyncio.create_task(heartbeat())
        watching = asyncio.create_task(recheck())
        try:
            async for raw in ws:
                event = json.loads(raw)
                if event.get('s') is not None:
                    last[0] = event['s']
                if event['op'] == 0 and event['t'] == 'READY':
                    log(f"online as {event['d']['user']['username']}, status: Watching {status_line()} ({describe(intents, role)})")
                elif event['op'] == 0 and event['t'] == 'MESSAGE_CREATE' and helper:
                    handle(helper.on_message, event['d'])
                elif event['op'] == 0 and event['t'] == 'INTERACTION_CREATE' and helper:
                    handle(helper.on_interaction, event['d'])
                elif event['op'] == 0 and event['t'] == 'GUILD_MEMBER_ADD' and role:
                    d = event['d']
                    user = d.get('user', {})
                    if not user.get('bot') and role not in d.get('roles', []):
                        done = await asyncio.to_thread(rest, secret, 'PUT', f"/guilds/{d['guild_id']}/members/{user['id']}/roles/{role}")
                        log(f"new member {user.get('username', '?')}: " + ('Member role given' if done is not None else 'could not give the Member role'))
                elif event['op'] == 1:
                    await ws.send(json.dumps({'op': 1, 'd': last[0]}))
                elif event['op'] in (7, 9):  # Discord asks for a fresh connection
                    return True
        finally:
            beating.cancel()
            watching.cancel()
        if ws.close_code == 4014 and intents & (GUILD_MEMBERS | MESSAGE_CONTENT):
            return 'no-intent'
        if ws.close_code in (4004, 4013, 4014):
            log(f'Discord rejected the connection (code {ws.close_code}); stopping. Check the token.')
            return False
    return True


async def main():
    try:
        import websockets
    except ImportError:
        log('The websockets package is missing: run  pip install websockets')
        return
    secret = token()
    if not secret:
        log('No token found in the secrets folder; stopping.')
        return
    guild = plan().get('guild_id')
    role = member_role(secret, guild) if guild else None
    log(f'Member role for new members: {"found" if role else "not found (no role named …Member)"}')
    helper = None
    if guild:
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from discord_assistant import Bot
            helper = Bot(secret, guild, log)
            helper.start()
        except Exception as error:  # the bot stays online without the assistant
            log(f'assistant not started: {type(error).__name__}: {error}')
    refused = 0  # privileged intents Discord refused although the settings said they were on
    wait = 5
    while True:
        started = time.time()
        intents = await asyncio.to_thread(wanted_intents, secret, role) & ~refused
        try:
            result = await session(websockets, secret, intents, role, helper)
            if result == 'no-intent':
                refused |= intents & (GUILD_MEMBERS | MESSAGE_CONTENT)
                log('Discord refused a privileged intent; reconnecting without it.')
                continue
            if not result:
                return
        except Exception as error:  # network down, PC waking from sleep, Discord restarting
            code = getattr(error, 'code', None) or getattr(getattr(error, 'rcvd', None), 'code', None)
            if code == 4014 and intents & (GUILD_MEMBERS | MESSAGE_CONTENT):
                refused |= intents & (GUILD_MEMBERS | MESSAGE_CONTENT)
                log('Discord refused a privileged intent; reconnecting without it.')
                continue
            if code in (4004, 4013, 4014):
                log('Discord rejected the token; stopping.')
                return
            log(f'connection lost ({type(error).__name__}); reconnecting')
        wait = 5 if time.time() - started > 120 else min(wait * 2, 300)
        await asyncio.sleep(wait)


if __name__ == '__main__':
    lock = socket.socket()
    try:
        lock.bind(('127.0.0.1', LOCK_PORT))
    except OSError:
        sys.exit(0)  # already running
    asyncio.run(main())

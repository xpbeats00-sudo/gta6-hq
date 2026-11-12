"""Keep the Discord bot showing as online, with a status line, while this PC is on.

    pythonw scripts/discord_online.py     run quietly (what the Windows startup entry does)
    python  scripts/discord_online.py     run in a console, to watch it

It holds one connection to Discord and does nothing else: it reads no messages and posts
nothing. If the connection drops it waits and reconnects. Only one copy runs at a time.
What it does is logged to %LOCALAPPDATA%\\GTA6HQ\\bot\\online.log; the token is never logged.
The status line comes from "status" in discord/server-plan.json.

Uses the same token file as discord_setup.py. Needs the `websockets` package.
"""
import asyncio, json, os, random, socket, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json'
LOCK_PORT = 47616  # a local port held open so a second copy can tell the first is running
WATCHING = 3
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


def status_line():
    try:
        return json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8')).get('status') or 'Leonida'
    except (OSError, ValueError):
        return 'Leonida'


async def session(websockets, secret):
    """One connection, from hello to the moment it closes. Returns False if Discord rejects the token."""
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
            'token': secret, 'intents': 0,  # no intents: it receives nothing about members or messages
            'properties': {'os': 'windows', 'browser': 'gta6-hq', 'device': 'gta6-hq'},
            'presence': {'status': 'online', 'afk': False, 'since': None,
                         'activities': [{'name': status_line(), 'type': WATCHING}]}}}))
        beating = asyncio.create_task(heartbeat())
        try:
            async for raw in ws:
                event = json.loads(raw)
                if event.get('s') is not None:
                    last[0] = event['s']
                if event['op'] == 0 and event['t'] == 'READY':
                    log(f"online as {event['d']['user']['username']}, status: Watching {status_line()}")
                elif event['op'] == 1:
                    await ws.send(json.dumps({'op': 1, 'd': last[0]}))
                elif event['op'] in (7, 9):  # Discord asks for a fresh connection
                    return True
        finally:
            beating.cancel()
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
    wait = 5
    while True:
        started = time.time()
        try:
            if not await session(websockets, secret):
                return
        except Exception as error:  # network down, PC waking from sleep, Discord restarting
            if getattr(error, 'code', None) in (4004, 4013, 4014) or getattr(getattr(error, 'rcvd', None), 'code', None) in (4004, 4013, 4014):
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

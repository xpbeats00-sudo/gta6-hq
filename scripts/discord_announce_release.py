"""Post a card in the Discord releases channel when a new version of the app is published.

    python scripts/discord_announce_release.py            show the card, post nothing
    python scripts/discord_announce_release.py --apply    post it

Run by .github/workflows/discord-release.yml when a release is published on GitHub, where the
release comes from the event and the token from the DISCORD_BOT_TOKEN secret. Run by hand, it
uses the latest release and the local token file. It posts each version once: if the channel
already holds a card linking to that release, it does nothing. Pre-releases and drafts are
skipped. Only the opt-in App Updates role is pinged. Standard library only.
"""
import json, os, re, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
APPLY = '--apply' in sys.argv
AGENT = 'DiscordBot (https://github.com/xpbeats00-sudo/gta6-hq, 1.0)'
PINK = 0xee3f7c


def token():
    found = os.environ.get('DISCORD_BOT_TOKEN', '').strip()
    for folder in ('.secrets', 'secrets'):
        directory = os.path.join(ROOT, folder)
        if not found and os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if name.lower().endswith('.txt'):
                    found = open(os.path.join(directory, name), encoding='utf-8-sig').read().strip()
                    break
    return found


TOKEN = token() or sys.exit('No Discord bot token: set DISCORD_BOT_TOKEN or add the token file.')


def discord(method, path, body=None):
    request = urllib.request.Request('https://discord.com/api/v10' + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Authorization': 'Bot ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': AGENT})
    try:
        return json.loads(urllib.request.urlopen(request, timeout=30).read())
    except urllib.error.HTTPError as error:
        # Never echo the request (it carries the token); Discord's own message is safe to show.
        sys.exit(f"Discord refused {method} {path}: {error.code} {error.read().decode('utf-8', 'replace')[:300]}")


def release():
    """The release that was just published, or the latest one when run by hand."""
    event = os.environ.get('GITHUB_EVENT_PATH')
    if event and os.path.exists(event):
        found = json.load(open(event, encoding='utf-8')).get('release')
        if found:
            return found
    repo = json.load(open(os.path.join(ROOT, 'data', 'update.json'), encoding='utf-8'))['repository']
    request = urllib.request.Request(f'https://api.github.com/repos/{repo}/releases/latest', headers={'User-Agent': 'gta6-hq-release-announcer'})
    return json.loads(urllib.request.urlopen(request, timeout=30).read())


def whats_new(body):
    """The "What's new" part of the release notes, or failing that the opening paragraph."""
    body = (body or '').replace('\r\n', '\n')
    found = re.search(r"^##\s*What's new\s*\n(.*?)(?=^##\s|\Z)", body, re.S | re.M | re.I)
    text = (found.group(1) if found else body.split('\n\n', 1)[0]).strip()
    text = re.sub(r'^Not published, approved or endorsed.*$', '', text, flags=re.M).strip()
    return text if len(text) <= 1800 else text[:1800].rsplit('\n', 1)[0] + '\n…'


def base(name):
    return name.split('」', 1)[-1].strip().lower()


found = release()
if found.get('draft') or found.get('prerelease'):
    print('A draft or pre-release: not announced.')
    sys.exit(0)
link = found['html_url']
setup = next((a['browser_download_url'] for a in found.get('assets', []) if a['name'].lower().endswith('setup.exe')), link)
card = {
    'title': f"🚀 {found.get('name') or found['tag_name']} is out",
    'url': link,
    'description': whats_new(found.get('body')),
    'color': PINK,
    'fields': [{'name': 'Get it', 'value': f"**[Download the installer]({setup})**  ·  [Release page]({link})"},
               {'name': 'Already installed?', 'value': 'The app offers the update when you open it. The installer goes over your current version.'}],
    'footer': {'text': 'GTA 6 HQ is an unofficial fan project'},
}
plan = json.load(open(os.path.join(ROOT, 'discord', 'server-plan.json'), encoding='utf-8'))
guild = next((g for g in discord('GET', '/users/@me/guilds') if g['id'] == plan['guild_id']), None) or sys.exit('The bot is not in the server named by guild_id in discord/server-plan.json.')
channel = next(c['id'] for c in discord('GET', f"/guilds/{guild['id']}/channels") if c['type'] in (0, 5) and base(c['name']) == 'releases')
role = next((r['id'] for r in discord('GET', f"/guilds/{guild['id']}/roles") if r['name'].endswith('App Updates')), None)

recent = discord('GET', f'/channels/{channel}/messages?limit=50')
if any(embed.get('url') == link for message in recent for embed in message.get('embeds', [])):
    print(f"{found['tag_name']} is already announced: nothing posted.")
    sys.exit(0)
print(card['title'], '\n\n' + card['description'], '\n')
if APPLY:
    discord('POST', f'/channels/{channel}/messages', {
        'content': f'<@&{role}>' if role else '', 'embeds': [card],
        'allowed_mentions': {'roles': [role] if role else []}})
    print('Posted.')
else:
    print('Dry run: nothing posted. Add --apply to post.')

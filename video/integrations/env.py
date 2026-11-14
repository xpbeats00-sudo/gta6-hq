"""Read video/.env without printing it. Values in the real environment win."""
import os

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')


def get(name):
    if os.environ.get(name):
        return os.environ[name]
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if key.strip() == name and value.strip():
                        return value.strip()
    return None


def require(name, what, where):
    value = get(name)
    if not value:
        raise SystemExit(f'{what} is not connected: {name} is not set.\n'
                         f'Get a key at {where}, copy video/.env.example to video/.env and put the key there.\n'
                         'Nothing was sent and nothing was generated.')
    return value

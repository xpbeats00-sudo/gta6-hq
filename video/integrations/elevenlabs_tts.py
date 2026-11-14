"""ElevenLabs text to speech, standard library only.

    python video/integrations/elevenlabs_tts.py "Text to speak" out.wav

Status: written from the official API reference (POST /v1/text-to-speech/{voice_id}, header xi-api-key)
but NOT TESTED, because no key has been connected. It refuses to run without ELEVENLABS_API_KEY and
ELEVENLABS_VOICE_ID in video/.env. Each call uses characters from the account's quota.
The free plan allows non-commercial use with attribution only.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import env  # noqa: E402


def synthesise(text, out_path):
    key = env.require('ELEVENLABS_API_KEY', 'ElevenLabs voice', 'https://elevenlabs.io/app/api/api-keys')
    voice = env.require('ELEVENLABS_VOICE_ID', 'ElevenLabs voice', 'your ElevenLabs voice library (copy a voice id)')
    model = env.get('ELEVENLABS_MODEL_ID') or 'eleven_multilingual_v2'
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
        data=json.dumps({'text': text, 'model_id': model}).encode('utf-8'),
        headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            audio = r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f'ElevenLabs refused the request: HTTP {e.code} {e.read().decode("utf-8", "replace")[:300]}')
    mp3 = os.path.splitext(out_path)[0] + '.mp3'
    with open(mp3, 'wb') as f:
        f.write(audio)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', '48000', '-ac', '2', out_path], check=True)
    os.remove(mp3)
    return out_path


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    print(synthesise(sys.argv[1], sys.argv[2]))

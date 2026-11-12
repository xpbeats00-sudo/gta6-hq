"""Transcribe speech to an .srt with FFmpeg's built-in whisper filter.

    python video/integrations/whisper_transcribe.py input.mp4 out.srt

FFmpeg 8.1 on this machine is built with whisper.cpp, so no program needs installing: only a model
file is needed, and none has been downloaded. Put one at video/models/ggml-base.en.bin (142 MiB, from
https://huggingface.co/ggerganov/whisper.cpp/tree/main; tiny is 75 MiB, small 466 MiB). Downloading
it needs the owner's approval. Status: NOT TESTED, because no model is present.

Run from the repository root: the filter is given relative paths because a drive letter's colon
would be read as an option separator.
"""
import glob
import os
import subprocess
import sys

VIDEO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def model_path():
    found = sorted(glob.glob(os.path.join(VIDEO, 'models', 'ggml-*.bin')))
    if not found:
        raise SystemExit('Whisper is not ready: no model in video/models.\n'
                         'Download ggml-base.en.bin from https://huggingface.co/ggerganov/whisper.cpp/tree/main '
                         'into video/models (ask the owner first). Nothing was transcribed.')
    return found[-1]


def transcribe(src, out, fmt='srt'):
    model = os.path.relpath(model_path()).replace('\\', '/')
    dest = os.path.relpath(out).replace('\\', '/')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn',
                    '-af', f'whisper=model={model}:language=en:queue=10:destination={dest}:format={fmt}', '-f', 'null', '-'], check=True)
    return out


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    print(transcribe(sys.argv[1], sys.argv[2]))

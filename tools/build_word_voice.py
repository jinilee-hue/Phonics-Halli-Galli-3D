"""카드 낱말 읽어 주기 소리 — 3D 판 전용, 회사 phonics-api TTS로 (2026-11-19 사용자 선택 C).
원래 게임(../Phonics-Halli-Galli)의 tools/build_voice.py와 같은 낱말 · 같은 자르기 · 같은 크기 규칙, 목소리만 바꿈:
같은 Ana(en-US-AnaNeural)를 phonics-api로 받아 빠르기 0.9(= -10%)를 ffmpeg로 맞춤 (phonics-kit/tools/tts_voice.py).
원래 게임은 건드리지 않아요(사용자: "Halli Galli 2D는 작업 안해도 돼") — 결과는 이 폴더의 src/voice-data.js만.
실행: /Users/jini/.local/bin/uv run --quiet --with numpy python tools/build_word_voice.py      (키: ~/.config/phonics-api/key)
"""
import base64
import json
import pathlib
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
import tts_voice  # noqa: E402

VOICE, RATE = 'en-US-AnaNeural', '-10%'
SR = 24000
ROOT = pathlib.Path(__file__).resolve().parent.parent
JS = ROOT / 'src' / 'voice-data.js'
OUT = pathlib.Path.home() / '.cache' / 'phonics-halli-galli' / 'voice_api_cut'        # 자른 mp3 (저장소 밖)
src = (ROOT / 'src' / 'words.js').read_text(encoding='utf-8')
W = json.loads(src[src.index('{'): src.rindex('}') + 1])
words = set()
for lv in ('level1', 'level2'):
    for w in W[lv]['words']:
        words |= {w['base'], w['plural']}
L3 = W['level3']
for w in L3['es'] + L3['regular']:
    words |= {w['base'], w['plural']}
for t in L3['traps']:
    words.add(t['w'])
    if t.get('plural'):
        words.add(t['plural'])
words = sorted(x.strip() for x in words if x and x.strip())
fname = lambda w: re.sub(r'[^a-z0-9]+', '_', w.lower()).strip('_')
print(f'낱말 {len(words)}개')
with ThreadPoolExecutor(4) as ex:                     # 받기 (캐시에 없는 것만)
    raws = dict(zip(words, ex.map(lambda w: tts_voice.clip(f'{w}.', VOICE, tempo=tts_voice.rate(RATE)), words)))

LEAD, TAIL = .12, .15                                  # 원래 게임과 같음
FR = int(SR * .01)


def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def speech(x):
    n = len(x) // FR
    rms = np.sqrt((x[:n * FR].reshape(n, FR) ** 2).mean(1) + 1e-12)
    return rms, np.nonzero(rms > rms.max() * 10 ** (-50 / 20))[0]


shutil.rmtree(OUT, ignore_errors=True); OUT.mkdir(parents=True)
clips, trim = {}, {}
for w in words:
    raw = raws[w]
    _, act = speech(decode(raw))
    dst = OUT / f'{fname(w)}.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-t', f'{(act[-1] + 1) * FR / SR + TAIL:.3f}',
                    '-c:a', 'copy', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', str(dst)], check=True)
    y = decode(dst)
    rms, act = speech(y)
    voiced = rms[act[0]:act[-1] + 1]
    loud = np.sqrt((voiced[voiced > voiced.max() * .1] ** 2).mean())
    g = min(10 ** (-17 / 20) / loud, 10 ** (-1 / 20) / np.abs(y).max())
    clips[w] = base64.b64encode(dst.read_bytes()).decode('ascii')
    trim[w] = [round(max(0., act[0] * FR / SR - LEAD), 3), round(float(g), 3)]
JS.write_text(
    '// tools/build_word_voice.py 가 만든 파일입니다 — 카드 낱말 읽어 주기 소리 (직접 고치지 마세요).\n'
    f'// 목소리: {VOICE} · 빠르기 {RATE} · 회사 phonics-api TTS(Azure)로 만들고 빠르기를 ffmpeg로 맞춤 (2026-11-19 사용자 선택 C)\n'
    '// 파일을 더블클릭해 열어도(file://) 소리가 나도록 mp3를 글자(base64)로 넣어 두었어요.\n'
    f'window.VOICE_INFO = {json.dumps({"voice": VOICE, "rate": RATE, "count": len(clips), "engine": "phonics-api"})};\n'
    '// 재생할 때 맞추는 값 [시작 초(말 시작 0.12초 전), 크기 배수(말소리 -17dBFS)] — src/main.js speak()가 씀\n'
    f'window.VOICE_TRIM = {json.dumps(trim, separators=(",", ":"))};\n'
    'window.VOICE_CLIPS = {\n' + ',\n'.join(f'{json.dumps(w)}:"{b}"' for w, b in clips.items()) + '\n};\n',
    encoding='utf-8')
print(f'만든 소리 {len(clips)}개 · voice-data.js {JS.stat().st_size / 1024:.0f}KB')

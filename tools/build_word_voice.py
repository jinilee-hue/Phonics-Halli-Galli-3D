"""카드 낱말 읽어 주기 소리 — 3D 판 전용, 회사 phonics-api TTS로 (2026-11-19 사용자 선택 C).
원래 게임(../Phonics-Halli-Galli)의 tools/build_voice.py와 같은 낱말 · 같은 자르기 · 같은 크기 규칙, 목소리만 바꿈:
2026-11-20부터 파닉스 게임 공통 튜터 목소리(Ava Multilingual, aiden 높이·빠르기 — tts_voice.tutor + tutor_takes), 레슨팩 낱말은 팩 녹음.
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

VOICE, RATE = 'en-US-AvaMultilingualNeural', 'aiden shape'   # the unified tutor voice (tts_voice.tutor)
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
# 2026-11-20 (user: "할리갈리로 통일해서 새 목소리로 바꿔"): the one tutor voice of the phonics games (tts_voice.tutor —
# Ava Multilingual shaped to the old 'aiden'), every word read back (whisper small) and retaken with another wording until
# heard right (tutor_takes); the words the lesson pack has keep its recordings (phonics-kit rule, like the other games)
import lessonpack  # noqa: E402
import tutor_takes  # noqa: E402
PACK = lessonpack.load(lessonpack.pack_dir('FP.K.U1L1'))
packed = {w: e['audio'] for w, e in PACK['words'].items() if e.get('audio_src') == 'pack' and w in words}
got, never = tutor_takes.best([(f'w:{w}', w, 'en') for w in words if w not in packed])
if never:
    print('never heard right (kept take 1 — check by ear):', never)
raws = {w: got[f'w:{w}'] for w in words if w not in packed}
for w, src in packed.items():                         # the pack's recording, as a mono 24 kHz mp3 like the TTS clips
    dst = pathlib.Path.home() / '.cache' / 'phonics-halli-galli' / f'pack_{w}.mp3'
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', str(SR), '-b:a', '48k', str(dst)], check=True)
    raws[w] = dst
print('lesson pack recordings:', sorted(packed))

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
    '// 목소리: 파닉스 게임 공통 튜터 목소리 = Ava Multilingual(회사 phonics-api TTS), 옛 aiden의 높이·빠르기 (2026-11-20) · 레슨팩 낱말은 팩 녹음\n'
    '// 파일을 더블클릭해 열어도(file://) 소리가 나도록 mp3를 글자(base64)로 넣어 두었어요.\n'
    f'window.VOICE_INFO = {json.dumps({"voice": VOICE, "rate": RATE, "count": len(clips), "engine": "phonics-api"})};\n'
    '// 재생할 때 맞추는 값 [시작 초(말 시작 0.12초 전), 크기 배수(말소리 -17dBFS)] — src/main.js speak()가 씀\n'
    f'window.VOICE_TRIM = {json.dumps(trim, separators=(",", ":"))};\n'
    'window.VOICE_CLIPS = {\n' + ',\n'.join(f'{json.dumps(w)}:"{b}"' for w, b in clips.items()) + '\n};\n',
    encoding='utf-8')
print(f'만든 소리 {len(clips)}개 · voice-data.js {JS.stat().st_size / 1024:.0f}KB')

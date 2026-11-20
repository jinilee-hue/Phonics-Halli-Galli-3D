"""노란 종 튜터(진행자)의 말소리를 미리 만듭니다 — 기기마다 목소리가 달라지지 않게.

목소리: 5살쯤 아이 목소리 — Microsoft 신경망 음성 'Ana' (en-US-AnaNeural · 미국 여자아이)를 살짝 높게(+10Hz), 조금 천천히(-5%)
  사용자 요청: 어른 목소리(Ava) → 아이 목소리. +55Hz(약 405Hz)는 '너무 아기 같다'고 해서 5살 아이 높이(약 250~330Hz)로 낮춤.
  지금 약 330Hz — 카드 낱말을 읽는 목소리(같은 Ana, 약 310Hz)보다 살짝 높아요.
  받아쓰기(whisper) 비교: Ana +0Hz 16/18 · +10Hz 17/18 · +18Hz 17/18 · +55Hz 18/18 · Maisie(영국 여자아이) 13~14/18
  (+10Hz에서 못 맞힌 1줄은 'Oops'를 'Boops'로 받아쓴 것)
도구(2026-11-19, 사용자 선택 C): 회사 phonics-api TTS(Azure 신경망 음성) — 같은 Ana에 높이·빠르기를 ffmpeg로 맞춤
  (phonics-kit/tools/tts_voice.py: 높이 ×1.035 ≈ +10Hz, 빠르기 0.95 = -5%). `--engine edge` = 예전 edge-tts(시제품).

결과
  gl/media/tutor/<id>.mp3   말마다 한 파일 — 받은 원본 그대로(다시 압축 안 함), 끝 빈소리만 잘라 냄
  gl/tutor-voice.js         window.TUTOR_VOICE = { info, lines: { id: { text, b64, start, gain, dur, mouth } } }
                            mouth: 60ms마다 입을 벌릴지(1) 닫을지(0) — 말소리 세기로 정함 (종 입 움직이기)
말을 고치거나 더하려면 아래 LINES만 고치고 다시 돌리세요. 받은 원본은 ~/.cache/phonics-halli-galli/tutor/ 에 남겨 둡니다.

실행: /Users/jini/.local/bin/uv run --quiet --with numpy python tools/build_tutor_voice.py   (키: ~/.config/phonics-api/key)
"""
import asyncio
import base64
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

import numpy as np

VOICE, RATE, PITCH = 'en-US-AnaNeural', '-5%', '+10Hz'        # edge (old prototype) only
TUTOR_VOICE = 'en-US-AvaMultilingualNeural'                     # phonics-api: the unified tutor voice (tts_voice.tutor)
SR = 24000
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'gl' / 'media' / 'tutor'
JS = ROOT / 'gl' / 'tutor-voice.js'
ENGINE = sys.argv[sys.argv.index('--engine') + 1] if '--engine' in sys.argv else 'phonics-api'
PITCH_K = 1.035                       # phonics-api: '+10Hz' on Ana as a pitch factor
CACHE = pathlib.Path.home() / '.cache' / 'phonics-halli-galli' / 'tutor' / (
    f'{VOICE}_{RATE.replace("%", "pct")}_{PITCH}' if ENGINE == 'edge' else 'phonics-api_tutor_voice')

# 상황별 말 (짧은 영어) — gl/tutor.js가 id로 불러요
LINES = {
    'ready':     'Ready? Go!',                          # 게임 시작
    'yourTurn':  'Your turn!',                          # 내 차례인데 머뭇거릴 때
    'ring':      'Ring the bell!',                      # (처음 몇 장) 여럿 카드 — 쳐!
    'waitRing':  'Wait! Ring the bell first!',          # 여럿 카드인데 종 대신 카드를 넘기려 할 때
    'dontRing':  "Just one. Don't ring!",               # (처음 몇 장) 하나 카드 — 치지 마!
    'yes1':      'Yes!',                                # 맞게 쳤을 때 (번갈아)
    'yes2':      'Great job!',
    'yes3':      'Super!',
    'yes4':      'You got it!',
    'oneMore':   'One more!',                           # 내 S가 2개
    'oops':      'Oops! Just one.',                     # 하나 카드에 쳤을 때
    'cocoFirst': 'Coco was first!',                     # Coco가 먼저 친 뒤에 쳤을 때
    'listenS':   'Listen for the "s" sound!',           # Coco가 먼저 맞혔을 때 (소리 단서)
    'missed':    'That was more than one! Ring next time.',   # 아무도 안 친 여럿 카드
    'cocoOops':  'Oops, Coco! Just one.',               # Coco가 하나 카드에 쳤을 때
    'careful':   'Listen carefully!',                   # Coco S가 2개
    'win':       'You win! Great job!',                 # 이겼을 때
    'lose':      "Good try! Let's play again!",         # 졌을 때
}
# 한국어 말 (2026-11-20 사용자 "링딩동에서 언어 선택 들어가야해") — 같은 목소리(Ava Multilingual)가 한국어로, gl/lang.js가 고른 말로 틀어요
LINES_KO = {
    'ready':     '준비됐니? 시작!',
    'yourTurn':  '네 차례야!',
    'ring':      '종을 쳐!',
    'waitRing':  '잠깐! 종부터 쳐!',
    'dontRing':  '하나뿐이야. 치지 마!',
    'yes1':      '맞아!',
    'yes2':      '잘했어!',
    'yes3':      '최고야!',
    'yes4':      '바로 그거야!',
    'oneMore':   '하나 더!',
    'oops':      '앗! 하나뿐이야.',
    'cocoFirst': '코코가 먼저 쳤어!',
    'listenS':   '끝소리 스를 잘 들어 봐!',
    'missed':    '여러 개였어! 다음엔 종을 쳐.',
    'cocoOops':  '앗, 코코! 하나뿐이야.',
    'careful':   '잘 들어 봐!',
    'win':       '네가 이겼어! 잘했어!',
    'lose':      '잘했어! 한 판 더 하자!',
}
assert set(LINES_KO) == set(LINES)
FR = int(SR * .01)            # 10ms 틀
MOUTH_MS = 60                 # 입 움직임 칸


def key(i, t):
    return f'{i}_{hashlib.md5(t.encode()).hexdigest()[:8]}'


async def fetch_all():
    import edge_tts
    CACHE.mkdir(parents=True, exist_ok=True)
    todo = [(i, t) for i, t in LINES.items() if not (CACHE / f'{key(i, t)}.mp3').exists()]

    async def one(i, t):
        for attempt in range(4):
            try:
                tmp = CACHE / f'{key(i, t)}.part'
                await edge_tts.Communicate(t, VOICE, rate=RATE, pitch=PITCH).save(str(tmp))
                tmp.rename(CACHE / f'{key(i, t)}.mp3')
                return
            except Exception as e:
                if attempt == 3:
                    raise RuntimeError(f'{i}: {e}')
                await asyncio.sleep(1.5 * (attempt + 1))
    sem = asyncio.Semaphore(6)

    async def guarded(i, t):
        async with sem:
            await one(i, t)
    await asyncio.gather(*(guarded(i, t) for i, t in todo))
    return len(todo)


def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def speech(x):
    n = len(x) // FR
    rms = np.sqrt((x[:n * FR].reshape(n, FR) ** 2).mean(1) + 1e-12)
    return rms, np.nonzero(rms > rms.max() * 10 ** (-50 / 20))[0]


def fetch_api():
    sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
    import tts_voice  # noqa: E402
    CACHE.mkdir(parents=True, exist_ok=True)
    # 2026-11-20 (user: "할리갈리로 통일해서 새 목소리로 바꿔"): the one tutor voice of the phonics games — Ava Multilingual
    # shaped to the old 'aiden' (tts_voice.tutor), every take read back (whisper small) and retaken until heard right
    import tutor_takes  # noqa: E402
    got, never = tutor_takes.best([(f't:{i}', t, 'en') for i, t in LINES.items()] + [(f'k:{i}', t, 'ko') for i, t in LINES_KO.items()])
    if never:
        print('never heard right (kept take 1 — check by ear):', never)
    for i, t in LINES.items():
        shutil.copy2(got[f't:{i}'], CACHE / f'{key(i, t)}.mp3')
    for i, t in LINES_KO.items():
        shutil.copy2(got[f'k:{i}'], CACHE / f'ko_{key(i, t)}.mp3')
    return len(LINES) + len(LINES_KO)


got = asyncio.run(fetch_all()) if ENGINE == 'edge' else fetch_api()
print(f'새로 받음 {got}개 · 캐시 {CACHE}')
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob('*.mp3'):
    f.unlink()
lines, lines_ko, report = {}, {}, []
for i, t, raw, dst, out in ([(i, t, CACHE / f'{key(i, t)}.mp3', OUT / f'{i}.mp3', lines) for i, t in LINES.items()] +
                            ([(i, t, CACHE / f'ko_{key(i, t)}.mp3', OUT / f'ko_{i}.mp3', lines_ko) for i, t in LINES_KO.items()]
                             if ENGINE != 'edge' else [])):
    _, act = speech(decode(raw))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-t', f'{(act[-1] + 1) * FR / SR + .12:.3f}',
                    '-c:a', 'copy', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', str(dst)], check=True)
    y = decode(dst)
    rms, act = speech(y)
    voiced = rms[act[0]:act[-1] + 1]
    loud = np.sqrt((voiced[voiced > voiced.max() * .1] ** 2).mean())
    g = min(10 ** (-19 / 20) / loud, 10 ** (-1 / 20) / np.abs(y).max())      # 낱말(-17dBFS)보다 살짝 작게: 낱말이 주인공
    start = max(0., act[0] * FR / SR - .05)
    end = (act[-1] + 1) * FR / SR
    # 입: 60ms 칸마다 그 칸 소리 세기 > 가장 큰 칸의 30% 이면 벌림
    step = MOUTH_MS // 10
    seg = rms[int(start * 100):int(end * 100) + 1]
    m = [seg[k:k + step].mean() for k in range(0, len(seg), step)]
    top = max(m) if m else 1
    mouth = ''.join('1' if v > top * .3 else '0' for v in m)
    out[i] = {'text': t, 'start': round(start, 3), 'gain': round(float(g), 3), 'dur': round(end - start, 3), 'mouth': mouth,
              'b64': base64.b64encode(dst.read_bytes()).decode('ascii')}
    report.append((i if out is lines else 'ko_' + i, round(end - start, 2), dst.stat().st_size))

JS.write_text(
    '// tools/build_tutor_voice.py 가 만든 파일입니다 — 노란 종 튜터(진행자) 말소리 (직접 고치지 마세요).\n'
    + (f'// 목소리: 5살쯤 아이 = {VOICE} 높이 {PITCH} · 빠르기 {RATE} · edge-tts (시제품용)\n' if ENGINE == 'edge' else
     '// 목소리: 파닉스 게임 공통 튜터 목소리 = Ava Multilingual(회사 phonics-api TTS), 옛 aiden의 높이·빠르기로 맞춤 (2026-11-20 사용자 "할리갈리로 통일해서 새 목소리로 바꿔")\n')
    + '// 파일을 더블클릭해 열어도(file://) 소리가 나도록 mp3를 글자(base64)로 넣어 두었어요. 원본: gl/media/tutor/*.mp3\n'
    f'window.TUTOR_VOICE = {{ info: {json.dumps({"voice": VOICE if ENGINE == "edge" else TUTOR_VOICE, "rate": RATE if ENGINE == "edge" else "aiden shape", "mouthMs": MOUTH_MS, "engine": ENGINE})},\n'
    '  lines: {\n' + ',\n'.join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in lines.items()) + '\n  },\n'
    '  lines_ko: {\n' + ',\n'.join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in lines_ko.items()) + '\n  } };\n',
    encoding='utf-8')
print(f'말 {len(lines)}개 · 길이:', ', '.join(f'{i} {d}s' for i, d, _ in report))
print(f'mp3 합계 {sum(r[2] for r in report) / 1024:.0f}KB · tutor-voice.js {JS.stat().st_size / 1024:.0f}KB')

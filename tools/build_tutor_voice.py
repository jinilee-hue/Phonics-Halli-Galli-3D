"""노란 종 튜터(진행자)의 말소리를 미리 만듭니다 — 기기마다 목소리가 달라지지 않게.

목소리: Microsoft 신경망 음성 'Ava' (en-US-AvaNeural · 밝고 표현이 풍부한 어른 여자 목소리), 조금 천천히(-5%)
  카드 낱말을 읽는 목소리(Ana · 여자아이)와 일부러 다르게 — 아이가 '문제 낱말'과 '안내 말'을 헷갈리지 않게.
도구: edge-tts (무료 · 시제품용). 정식 출시 때는 Azure Speech(유료 정식 서비스)나 성우 녹음으로 바꿀 것.

결과
  gl/media/tutor/<id>.mp3   말마다 한 파일 — 받은 원본 그대로(다시 압축 안 함), 끝 빈소리만 잘라 냄
  gl/tutor-voice.js         window.TUTOR_VOICE = { info, lines: { id: { text, b64, start, gain, dur, mouth } } }
                            mouth: 60ms마다 입을 벌릴지(1) 닫을지(0) — 말소리 세기로 정함 (종 입 움직이기)
말을 고치거나 더하려면 아래 LINES만 고치고 다시 돌리세요. 받은 원본은 ~/.cache/phonics-halli-galli/tutor/ 에 남겨 둡니다.

실행: /Users/jini/.hermes/bin/uv run --quiet --with edge-tts --with numpy python tools/build_tutor_voice.py
"""
import asyncio
import base64
import hashlib
import json
import pathlib
import subprocess

import numpy as np

VOICE, RATE, PITCH = 'en-US-AvaNeural', '-5%', '+0Hz'
SR = 24000
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'gl' / 'media' / 'tutor'
JS = ROOT / 'gl' / 'tutor-voice.js'
CACHE = pathlib.Path.home() / '.cache' / 'phonics-halli-galli' / 'tutor' / f'{VOICE}_{RATE.replace("%", "pct")}_{PITCH}'

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


got = asyncio.run(fetch_all())
print(f'새로 받음 {got}개 · 캐시 {CACHE}')
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob('*.mp3'):
    f.unlink()
lines, report = {}, []
for i, t in LINES.items():
    raw = CACHE / f'{key(i, t)}.mp3'
    _, act = speech(decode(raw))
    dst = OUT / f'{i}.mp3'
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
    lines[i] = {'text': t, 'start': round(start, 3), 'gain': round(float(g), 3), 'dur': round(end - start, 3), 'mouth': mouth,
                'b64': base64.b64encode(dst.read_bytes()).decode('ascii')}
    report.append((i, round(end - start, 2), dst.stat().st_size))

JS.write_text(
    '// tools/build_tutor_voice.py 가 만든 파일입니다 — 노란 종 튜터(진행자) 말소리 (직접 고치지 마세요).\n'
    f'// 목소리: {VOICE} (Microsoft 신경망 음성 · 밝은 어른 여자 목소리 · 낱말 목소리 Ana와 다르게) · 빠르기 {RATE} · edge-tts (시제품용)\n'
    '// 파일을 더블클릭해 열어도(file://) 소리가 나도록 mp3를 글자(base64)로 넣어 두었어요. 원본: gl/media/tutor/*.mp3\n'
    f'window.TUTOR_VOICE = {{ info: {json.dumps({"voice": VOICE, "rate": RATE, "mouthMs": MOUTH_MS})},\n'
    '  lines: {\n' + ',\n'.join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in lines.items()) + '\n  } };\n',
    encoding='utf-8')
print(f'말 {len(lines)}개 · 길이:', ', '.join(f'{i} {d}s' for i, d, _ in report))
print(f'mp3 합계 {sum(r[2] for r in report) / 1024:.0f}KB · tutor-voice.js {JS.stat().st_size / 1024:.0f}KB')

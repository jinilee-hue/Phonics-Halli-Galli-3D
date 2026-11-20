"""인트로 소리 새로 섞기: 원래 인트로의 음악·효과음(목소리를 뺀 것) + 새 나레이션 한 목소리
  - 음악: BS-RoFormer로 뺀 Instrumental (sep/)
  - 목소리: voice/<목소리>_<n>.mp3 (edge-tts) — 문장 3개를 정한 시각에 놓음
      1) 'Phonics'가 박(1.561s)에 오게 → 'Ring'도 거의 다음 박
      2) 'play' 끝이 5.00s (종 윙크 4.95와 같이)
      3) 'start' 시작이 5.84s (START 반짝 첫 번째와 같이)
  - 목소리 크기는 원래 나레이션(Vocals) 크기에 맞추고, 목소리 아래 음악을 살짝(-2dB) 내림
  - 울림 없이 (2026-11-20 사용자 "울림 빼줘"); 예전처럼 방 울림을 넣으려면 --reverb
  - 전체 크기는 지금 인트로와 같게(-12.6 LUFS), 최고점 -1 dBTP
결과: out/intro_<목소리>.wav · .m4a · ev_<목소리>.json (로고 통통 시각)
쓰는 법: uv run --with numpy --with scipy --with soundfile --with pyloudnorm python mix_voice.py ava ana
"""
import json
import pathlib
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

D = pathlib.Path('/tmp/gl/hg/rdd')
OUT = D / 'out'
OUT.mkdir(exist_ok=True)
SR = 44100
TARGET_LUFS = -12.6
REVERB = '--reverb' in sys.argv          # 목소리에 방 울림을 섞을지 (기본: 안 섞음)
BEAT, B0 = .4737, .14
words = json.loads((D / 'voice' / 'words.json').read_text())

inst_p = next(p for p in (D / 'sep').glob('*Instrumental*.wav'))
voc_p = next(p for p in (D / 'sep').glob('*Vocals*.wav'))
inst, sr = sf.read(inst_p, dtype='float64')
voc_old, _ = sf.read(voc_p, dtype='float64')
assert sr == SR, sr
N = len(inst)
meter = pyln.Meter(SR)


def load_mp3(p):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f64le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float64).copy()


def wt(key, word):
    return next(w for w in words[key] if w[0].strip('!?.,').lower() == word.lower())


def reverb_ir(rt60=.55, pre=.012, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * rt60 * 1.2)
    t = np.arange(n) / SR
    env = np.exp(-6.91 * t / rt60)
    ir = rng.standard_normal((n, 2)) * env[:, None]
    b, a = signal.butter(1, 5000 / (SR / 2))                      # 어둡게 (방 소리)
    ir = signal.lfilter(b, a, ir, axis=0)
    ir = np.concatenate([np.zeros((int(SR * pre), 2)), ir])
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


def envelope(x, att=.015, rel=.22):
    a_a, a_r = np.exp(-1 / (SR * att)), np.exp(-1 / (SR * rel))
    e, out = 0.0, np.empty_like(x)
    ax = np.abs(x)
    for i, v in enumerate(ax):                                  # 10초라 그냥 돌려도 빠름
        e = a_a * e + (1 - a_a) * v if v > e else a_r * e + (1 - a_r) * v
        out[i] = e
    return out


def limiter(y, ceil_db=-1.0, look=.005, rel=.06):
    ceil = 10 ** (ceil_db / 20)
    os4 = signal.resample_poly(y, 4, 1, axis=0)                 # 진짜 최고점(4배)
    pk = np.abs(os4).max(axis=1).reshape(-1, 4).max(axis=1)[:len(y)]
    need = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    L = int(SR * look)
    # 앞으로 L만큼 내다본 가장 작은 값 → 뒤로 L 평균(부드럽게 줄이기, 최고점에선 충분히 줄어 있음) → 천천히 풀기
    fwd = np.lib.stride_tricks.sliding_window_view(np.pad(need, (0, L), constant_values=1), L + 1).min(axis=1)
    need = np.convolve(np.pad(fwd, (L - 1, 0), constant_values=1), np.ones(L) / L, 'valid')
    a_r = np.exp(-1 / (SR * rel))
    gg, cur = np.empty_like(need), 1.0
    for i, v in enumerate(need):
        cur = v if v < cur else a_r * cur + (1 - a_r) * v
        gg[i] = cur
    return y * gg[:, None], float(gg.min())


def build(key):
    clips = [load_mp3(D / 'voice' / f'{key}_{i}.mp3') for i in range(3)]
    off = [1.561 - wt(f'{key}_0', 'Phonics')[1],
           5.00 - wt(f'{key}_1', 'play')[2],
           5.84 - wt(f'{key}_2', 'start')[1]]
    v = np.zeros(N)
    for c, o in zip(clips, off):
        i = int(round(o * SR))
        v[i:i + len(c)] += c[:max(0, N - i)]
    b, a = signal.butter(2, 90 / (SR / 2), 'high')
    v = signal.lfilter(b, a, v)
    # 목소리 크기 = 원래 나레이션 크기
    gain_db = meter.integrated_loudness(np.stack([voc_old[:, 0], voc_old[:, 1]], 1)) - meter.integrated_loudness(np.stack([v, v], 1))
    v *= 10 ** (gain_db / 20)
    voice = np.stack([v, v], 1)
    if REVERB:   # 방 울림 (예전 기본값) — 2026-11-20 사용자 "울림 빼줘": 이제 기본은 울림 없이, 다른 게임 튜터 목소리처럼
        voice = voice + signal.fftconvolve(v[:, None] * np.ones((1, 2)), reverb_ir(), axes=0)[:N] * 10 ** (-17 / 20)
    # 목소리 아래 음악 살짝 내림 (최대 -2dB)
    e = envelope(v)
    duck = 1 - (1 - 10 ** (-2 / 20)) * np.clip(e / (np.percentile(e[e > 1e-4], 90) + 1e-9), 0, 1)
    y = inst * duck[:, None] + voice
    lufs = meter.integrated_loudness(y)
    y *= 10 ** ((TARGET_LUFS - lufs) / 20)
    y, gmin = limiter(y)
    n_end = int(.03 * SR)                                       # 끝 30ms 페이드 (딸깍 방지)
    y[-n_end:] *= np.linspace(1, 0, n_end)[:, None]
    sf.write(OUT / f'intro_{key}.wav', y, SR, subtype='PCM_24')
    ev = dict(offsets=[round(o, 3) for o in off],
              phonics=round(off[0] + wt(f'{key}_0', 'Phonics')[1], 3),
              ring=round(off[0] + wt(f'{key}_0', 'Ring')[1], 3),
              ding=round(off[0] + wt(f'{key}_0', 'Ding')[1], 3),
              dong=round(off[0] + wt(f'{key}_0', 'Dong')[1], 3),
              s1_end=round(off[0] + words[f'{key}_0'][-1][2], 3),
              play_end=round(off[1] + wt(f'{key}_1', 'play')[2], 3),
              start=round(off[2] + wt(f'{key}_2', 'start')[1], 3),
              begin=round(off[2] + wt(f'{key}_2', 'begin')[1], 3),
              s3_end=round(off[2] + words[f'{key}_2'][-1][2], 3),
              voice_gain_db=round(gain_db, 1), limiter_min_db=round(20 * np.log10(gmin), 2),
              lufs_before=round(lufs, 1))
    (OUT / f'ev_{key}.json').write_text(json.dumps(ev, indent=1))
    print(key, ev)


for k in [a for a in sys.argv[1:] if not a.startswith('--')]:
    build(k)

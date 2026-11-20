# 인트로 나레이션 다시 만들기

인트로 소리 = 원래 인트로 영상의 음악 · 효과음(목소리만 뺀 것) + 새 나레이션 한 목소리.

1. 원래 소리에서 목소리 빼기 (BS-RoFormer, 10초에 20초쯤)
   ```
   git show a0caa5c^:gl/media/intro.m4a > /tmp/gl/hg/rdd/intro_old.m4a
   ffmpeg -i intro_old.m4a -ar 44100 -ac 2 intro_old.wav
   uv run --python 3.11 --with 'audio-separator[cpu]' audio-separator intro_old.wav \
     --model_filename model_bs_roformer_ep_317_sdr_12.9755.ckpt --output_dir sep --output_format WAV
   ```
2. 목소리 만들기: `python3 voice_api.py [tutor|api20]` (phonics-api, 키 ~/.config/phonics-api/key) — 예전 edge-tts는 `uv run --with edge-tts python voice_gen.py ava20` (목소리 이름을 주면 그것만, 문장마다 mp3 + 낱말 시각)
3. 섞기: `uv run --with numpy --with scipy --with soundfile --with pyloudnorm python mix_voice.py ava20`
   - 'Phonics'를 음악 박(1.561초)에, 'play' 끝을 5.00초(종 윙크), 'start'를 5.84초(START 반짝)에 맞춰 놓아요.
   - 목소리 크기는 원래 나레이션에 맞추고, 전체는 -12.6 LUFS · 최고점 -1 dBTP.
   - `out/ev_<목소리>.json`의 phonics · ring · ding 값을 `gl/intro-mg.js`의 EV(phonics · ring · dingdong)에 넣어요.
4. `ffmpeg -i out/intro_ava20.wav -c:a aac_at -b:a 160k gl/media/intro.m4a` 후 intro-mg.js의 `intro.m4a?v=`와 index.html · sync의 `intro-mg.js?v=` 올리기.
   (sync_from_original.py는 돌리지 마세요 — Cursor가 3D 쪽 src/style.css · upgrade.css · index.html을 직접 고쳐 둬서 되돌려져요)

| 목소리 | 높이 | EV phonics · ring · dingdong |
|---|---|---|
| **tutor (지금)** — 파닉스 게임 공통 튜터 목소리: Ava Multilingual, 옛 aiden 높이·빠르기 (`voice_api.py tutor`, 2026-11-20 사용자 "할리갈리로 통일해서 새 목소리로 바꿔") | — | 1.561 · 1.941 · 2.301 |
| api20 — 회사 phonics-api TTS의 Ava, ava20과 같게 20% 빠르게 · 높이 ×1.036 (`voice_api.py`, 2026-11-19 사용자 선택 C) | — | 1.561 · 1.841 · 2.061 |
| ava20 — edge-tts Ava 20% 빠르게 · +8Hz, 더 발랄하게 (이전) | 242 Hz | 1.561 · 1.946 · 2.123 |
| ava15 — 15% 빠르게 · +5Hz | 239 Hz | 1.561 · 1.963 · 2.148 |
| ava10 — 10% 빠르게 | 229 Hz | 1.561 · 1.981 · 2.175 |
| ava — 밝은 어른 진행자 (처음 판) | 229 Hz | 1.561 · 2.023 · 2.236 |
| ana — 아이, 게임 낱말 목소리와 같은 사람 | 305 Hz | 1.561 · 2.179 · 2.548 |
| avam — Ava 새 버전(Multilingual) | 221 Hz | 1.561 · 2.161 · 2.474 |
| andrewm — 남자 진행자(Andrew Multilingual) | 135 Hz | 1.561 · 2.361 · 2.736 |

스크립트 안 경로는 작업 폴더 `/tmp/gl/hg/rdd` 기준이에요.

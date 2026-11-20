"""인트로 나레이션 목소리를 회사 phonics-api TTS로 (2026-11-19 사용자 선택 C — 지금과 같은 Ava, 높이·빠르기 맞춤).
voice_gen.py의 ava20(Ava 20% 빠르게 · +8Hz)과 같은 설정을 phonics-kit/tools/tts_voice.py로: 높이 ×1.036, 빠르기 1.2.
낱말 시각은 whisper로(phonics-kit/tools/word_marks.py) — mix_voice.py가 'Phonics' · 'play' · 'start' 시각을 써요.
결과: /tmp/gl/hg/rdd/voice/api20_<n>.mp3 + words.json의 api20_<n>
실행: python3 voice_api.py [tutor|api20]  →  uv run --with numpy --with scipy --with soundfile --with pyloudnorm python mix_voice.py api20
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

KIT = pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'
sys.path.insert(0, str(KIT))
import tts_voice  # noqa: E402

D = pathlib.Path('/tmp/gl/hg/rdd/voice')
D.mkdir(parents=True, exist_ok=True)
LINES = ['Welcome to Phonics Ring Ding Dong!', 'Are you ready to play?', 'Press start to begin!']
# tutor (default, 2026-11-20 user: "할리갈리로 통일해서 새 목소리로 바꿔") = the one tutor voice of the phonics games
# (Ava Multilingual shaped to the old 'aiden'); api20 = the previous Ava 20 % faster
KEY = sys.argv[1] if len(sys.argv) > 1 else 'tutor'
items = []
for i, text in enumerate(LINES):
    dst = D / f'{KEY}_{i}.mp3'
    shutil.copy2(tts_voice.tutor(text, 'en') if KEY == 'tutor' else tts_voice.clip(text, 'en-US-AvaNeural', pitch=1.036, tempo=1.2), dst)
    items.append({'file': str(dst), 'text': text})
with tempfile.TemporaryDirectory() as td:
    pathlib.Path(td, 'in.json').write_text(json.dumps(items))
    subprocess.run([str(pathlib.Path.home() / '.claude/skills/video-vision/.venv/bin/python'), str(KIT / 'word_marks.py'),
                    f'{td}/in.json', f'{td}/out.json'], check=True)
    marks = json.loads(pathlib.Path(td, 'out.json').read_text())
wj = D / 'words.json'
out = json.loads(wj.read_text()) if wj.exists() else {}
for i, it in enumerate(items):
    out[f'{KEY}_{i}'] = marks[it['file']]
    print(f'{KEY}_{i}', ' '.join(f'{w}@{a:.2f}-{b:.2f}' for w, a, b in marks[it['file']]))
wj.write_text(json.dumps(out, indent=1))

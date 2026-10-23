"""3D 판(WebGL)에서 쓰는 그림을 src/gl-tex.js 안에 넣어요 (window.GL_TEX = {경로: data URL}).

왜: WebGL은 index.html을 더블클릭해서 열면(file://) 그림 파일을 못 읽어요(브라우저 보안).
    소리(voice-data.js)처럼 그림도 코드 안에 넣어 두면 어디서 열어도 3D 판이 그려져요.

넣는 것
- assets/card_web/*.webp  카드 앞면 그림 (그대로)
- assets/card/my_card.png · coco_card.png  카드 뒷면 → 폭 512 webp
- assets/card/my_s.png · coco_s.png  S 토큰 → 256 webp
- assets/bell_parts 눈 · 입 · 볼  3D 종 얼굴

다시 만들기:  python3 tools/build_gl_tex.py   (카드 그림을 바꾸면 다시 돌리세요)
"""
import base64
import io
import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
A = ROOT / 'assets'


def webp(path, width, quality):
    im = Image.open(path).convert('RGBA')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    return buf.getvalue()


out = {}
for p in sorted((A / 'card_web').glob('*.webp')):
    out[f'card_web/{p.name}'] = p.read_bytes()
for name in ('my_card.png', 'coco_card.png'):
    out[f'card/{name}'] = webp(A / 'card' / name, 512, 88)
for name in ('my_s.png', 'coco_s.png'):
    out[f'card/{name}'] = webp(A / 'card' / name, 256, 90)
# 3D 종 얼굴 조각 (gl/bell3d.js가 캔버스에 그려서 종 몸통에 입힘 — 원래 크기 그대로)
for name in ('eye_l', 'eye_r', 'mouth', 'blush_l', 'blush_r'):
    out[f'bell_parts/{name}.png'] = webp(A / 'bell_parts' / f'{name}.png', 4096, 92)
# 3D Coco 얼굴: 얼굴 창(tools/build_coco_face.py) + 눈 · 눈동자 · 입 · 볼 조각
out['coco_parts/face_base.webp'] = (A / 'coco_parts' / 'face_base.webp').read_bytes()
for name in ('eye_l', 'eye_r', 'iris_l', 'iris_r', 'mouth', 'blush_l', 'blush_r'):
    out[f'coco_parts/{name}.png'] = webp(A / 'coco_parts' / f'{name}.png', 4096, 92)

data = {k: 'data:image/webp;base64,' + base64.b64encode(v).decode() for k, v in out.items()}
js = ('// tools/build_gl_tex.py 가 만든 파일입니다 — 3D 판(gl/board3d.js)이 쓰는 그림 (더블클릭으로 열어도 그려지게 코드 안에 넣음)\n'
      'window.GL_TEX = ' + json.dumps(data, indent=0) + ';\n')
dst = ROOT / 'src' / 'gl-tex.js'
dst.write_text(js, encoding='utf-8')
print(f'{len(data)}장 · {dst.stat().st_size / 1e6:.2f} MB → {dst.relative_to(ROOT)}')

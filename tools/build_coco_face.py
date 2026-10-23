"""3D Coco 얼굴 창 그림: assets/coco_parts/body.webp(눈 · 입 지운 그림)에서 얼굴 창만 오려 냄 → assets/coco_parts/face_base.webp
(창 밖 분홍 몸통은 3D 껍데기가 그리니 투명하게. gl/coco3d.js가 이 위에 눈 · 눈동자 · 입을 표정대로 그려요)

  python3 tools/build_coco_face.py      (그 다음 tools/build_gl_tex.py)

창 모양: 얼굴 창 바깥 홈(진한 분홍 테)까지 감싸는 둥근 빵 모양 — 원래 그림 픽셀(1064×1137) 기준
"""
import json
import pathlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / 'assets' / 'coco_parts'
FACE = {'x0': 255, 'y0': 465, 'w': 560, 'h': 335}      # 오려 낼 범위 (원래 그림 픽셀)
CX, CY, A, B_TOP, B_BOT, N = 533, 632, 270, 160, 158, 2.7   # 창: 가운데 · 반폭 · 위/아래 반높이 · 둥글기

body = Image.open(P / 'body.webp').convert('RGBA')
scale = body.width / 1064                                # 조각 그림은 반 크기
x0, y0, w, h = FACE['x0'], FACE['y0'], FACE['w'], FACE['h']
crop = body.resize((1064, round(body.height / scale)), Image.LANCZOS).crop((x0, y0, x0 + w, y0 + h))
yy, xx = np.mgrid[0:h, 0:w].astype(float)
X, Y = xx + x0 + .5, yy + y0 + .5
b = np.where(Y < CY, B_TOP, B_BOT)
d = (np.abs(X - CX) / A) ** N + (np.abs(Y - CY) / b) ** N   # 1이면 창 테두리
alpha = np.clip((1.06 - d) / .12, 0, 1)                   # 가장자리를 부드럽게
arr = np.asarray(crop).astype(float)
arr[..., 3] = arr[..., 3] * alpha
out = Image.fromarray(arr.astype(np.uint8), 'RGBA')
out.save(P / 'face_base.webp', 'WEBP', quality=92, method=6)
(P / 'face_base.json').write_text(json.dumps(FACE), encoding='utf-8')
# 확인용: 흰 바탕 위
bg = Image.new('RGBA', out.size, (255, 255, 255, 255)); bg.alpha_composite(out)
bg.convert('RGB').save('/tmp/gl/hg/g3d/coco_face_base_check.png')
print('face_base.webp', out.size, FACE)

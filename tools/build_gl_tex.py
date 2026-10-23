"""3D 판(WebGL)에서 쓰는 그림을 src/gl-tex.js 안에 넣어요 (window.GL_TEX = {경로: data URL}).

왜: WebGL은 index.html을 더블클릭해서 열면(file://) 그림 파일을 못 읽어요(브라우저 보안).
    소리(voice-data.js)처럼 그림도 코드 안에 넣어 두면 어디서 열어도 3D 판이 그려져요.

넣는 것
- assets/card_web/*.webp  카드 앞면 그림 (그대로)
- assets/card/my_card.png · coco_card.png  카드 뒷면 → 폭 512 webp
- assets/card/my_s.png · coco_s.png  S 토큰 → 256 webp
- assets/bell_parts 눈 · 입 · 볼  3D 종 얼굴 (눈 · 입은 그림 밖에 남은 원래 그림의 광택 · 그늘 자국을 지움 — clean_part,
  색은 캐릭터 시트 JSON 팔레트로: 눈 · 입 #4A2B21 · 볼 #FF9999 — ink / tint)

다시 만들기:  python3 tools/build_gl_tex.py   (카드 그림을 바꾸면 다시 돌리세요)
"""
import base64
import io
import json
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
A = ROOT / 'assets'


def clean_part(path, lum_max=150, grow=5, feather=1.0):
    """원래 종 그림에서 오려 낸 눈 · 입 조각에는 그림 밖에 원래 몸통의 광택 · 그늘 차이가 반투명으로 남아 있어요
    (2D에선 몸통 그림과 겹쳐 티가 안 나지만, 빛을 따로 받는 3D 몸통 위에선 왼쪽 눈 위 얼룩 · 눈 밑 번짐으로 보여요).
    진한 갈색 그림만 남기고(노란 그늘은 파랑이 거의 없어서 갈색과 갈라져요) 안쪽 구멍(흰 눈빛)은 채워요. PIL만 써요."""
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A')
    r, _, b, _ = im.split()
    lum = im.convert('RGB').convert('L')
    brown = ImageChops.subtract(b.point(lambda v: min(255, v * 3)), r).point(lambda v: 255 if v > 0 else 0)
    dark = ImageChops.multiply(a.point(lambda v: 255 if v > 140 else 0), lum.point(lambda v: 255 if v < lum_max else 0))
    dark = ImageChops.multiply(dark, brown)
    dark = dark.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))      # 흩뿌린 점 지우기
    m = dark.filter(ImageFilter.MaxFilter(grow))                                         # 그림 가장자리(부드러운 픽셀)까지
    pad = Image.new('L', (m.width + 2, m.height + 2), 0)
    pad.paste(m, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)                                                # 바깥 → 128 · 안쪽 구멍(흰 눈빛) = 0
    m = pad.crop((1, 1, m.width + 1, m.height + 1)).point(lambda v: 0 if v == 128 else 255)
    im.putalpha(ImageChops.multiply(a, m.filter(ImageFilter.GaussianBlur(feather))))
    return im


INK = (0x4A, 0x2B, 0x21)      # 캐릭터 시트 JSON: facial_eyes_and_mouth
CHEEK = (0xFF, 0x99, 0x99)    # 캐릭터 시트 JSON: facial_cheeks


def ink(im, lum0=70):
    """갈색 그림을 INK 색으로 (흰 눈빛 · 가장자리 번짐은 밝기 그대로: 갈색(밝기 lum0) → INK, 흰색 → 흰색)"""
    a = im.getchannel('A')
    lum = im.convert('RGB').convert('L')
    t = lum.point(lambda v: max(0, min(255, round((v - lum0) * 255 / (255 - lum0)))))
    out = Image.composite(Image.new('RGB', im.size, (255, 255, 255)), Image.new('RGB', im.size, INK), t)
    out.putalpha(a)
    return out


def tint(path, rgb):
    im = Image.open(path).convert('RGBA')
    out = Image.new('RGBA', im.size, rgb + (255,))
    out.putalpha(im.getchannel('A'))
    return out


def webp(path, width, quality):
    im = path if isinstance(path, Image.Image) else Image.open(path).convert('RGBA')
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
    src = A / 'bell_parts' / f'{name}.png'
    out[f'bell_parts/{name}.png'] = webp(ink(clean_part(src)) if name in ('eye_l', 'eye_r', 'mouth') else tint(src, CHEEK), 4096, 92)
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

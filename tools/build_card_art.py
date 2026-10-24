#!/usr/bin/env python3
"""6세 · 7세 카드 그림 → 3D 폴더용 가벼운 사본 (3D 폴더 전용 · 원래 게임은 그대로)

  python3 tools/build_card_art.py          (동기화.command가 돌 때마다 같이 돌아요 — 바뀐 그림만 다시 만듦)

- 원래 게임 assets/card/card_<낱말>.png 중 5세 목록(원래 src/cards.js의 CARD_ART)에 없는 2 · 3단계 낱말 그림
  → gl/media/cards/card_<낱말>.webp (600×800, 모서리 7.5% 둥글게 · 바깥 검은 바탕은 투명 — 원래 tools/build_cards.py와 같은 모양)
- gl/card-art.js : window.CARD_ART에 더할 목록 (주소 끝 ?v= 는 그림 내용의 해시 → 그림을 바꾸면 새로 받아요)
- gl/card-tex.js : 파일을 더블클릭해 열었을 때(file://) 3D 판이 그림을 읽도록 data URL로 — 2단계 이상을 고를 때만 불러와요 (gl/lv-cards.js)
- 2 · 3단계 낱말이 아닌 파일 이름(오타 등)은 건너뛰고 알려 줘요
- PIL만 써요 (동기화.command가 쓰는 시스템 python3에서도 돌게)
"""
import base64
import hashlib
import json
import pathlib
import re
import sys

from PIL import Image, ImageChops, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIG = ROOT.parent / 'Phonics-Halli-Galli'
SRC = ORIG / 'assets' / 'card'
OUT = ROOT / 'gl' / 'media' / 'cards'
ART_JS = ROOT / 'gl' / 'card-art.js'
TEX_JS = ROOT / 'gl' / 'card-tex.js'
OW, OH = 600, 800
R = 0.075          # 모서리 둥글기 = 카드 폭의 7.5% (원래 build_cards.py · CSS .card.has-art .front 와 같은 값)
SS = 4


def rounded_mask(w, h, r):
    big = Image.new('L', (w * SS, h * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), radius=r * SS, fill=255)
    return big.resize((w, h), Image.BOX)


def card_box(im):
    """카드가 있는 곳(검정도 투명도 아닌 픽셀)의 상자 + 맨 윗줄에서 카드가 시작하는 x(= 원래 모서리 둥글기)"""
    r, g, b, a = im.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v > 51 else 0)
    m = ImageChops.multiply(mx, a.point(lambda v: 255 if v > 10 else 0))
    box = m.getbbox()
    x0, y0, x1, y1 = box
    row = m.crop((x0, y0, x1, y0 + 1)).tobytes()
    first = next((i for i, v in enumerate(row) if v), 0)
    return box, first / (x1 - x0)


def words_of(level_js):
    W = json.loads(re.search(r'window\.WORDS\s*=\s*(\{.*\});', level_js, re.S).group(1))
    lv = {}
    for w in W['level2']['words']:
        lv.setdefault(w['base'], 2); lv.setdefault(w['plural'], 2)
    for key in ('es', 'regular'):
        for w in W['level3'][key]:
            lv.setdefault(w['base'], 3); lv.setdefault(w['plural'], 3)
    for t in W['level3']['traps']:
        lv.setdefault(t['w'], 3)
        if t.get('plural'):
            lv.setdefault(t['plural'], 3)
    return lv


def main():
    if not SRC.exists():
        sys.exit(f'원래 게임 카드 그림 폴더를 못 찾았어요: {SRC}')
    have5 = set(re.findall(r'"([^"]+)":\s*"\./assets/', (ORIG / 'src' / 'cards.js').read_text(encoding='utf-8')))
    lv = words_of((ORIG / 'src' / 'words.js').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    art, tex, made, skipped, radii = {}, {}, [], [], []
    for p in sorted(SRC.glob('card_*.png')):
        w = p.stem[len('card_'):]
        if w in have5:
            continue                                    # 5세 카드: 원래 게임 사본(assets/card_web)을 그대로 씀
        if w not in lv:
            skipped.append(w)
            continue
        dst = OUT / f'card_{w}.webp'
        if not dst.exists() or dst.stat().st_mtime < p.stat().st_mtime:
            im = Image.open(p).convert('RGBA')
            (x0, y0, x1, y1), r0 = card_box(im)
            radii.append((r0, w))
            ratio = (x1 - x0) / (y1 - y0)
            out = im.crop((x0, y0, x1, y1)).resize((OW, OH), Image.LANCZOS)
            out.putalpha(ImageChops.multiply(out.getchannel('A'), rounded_mask(OW, OH, R * OW)))
            out.save(dst, 'WEBP', quality=88, method=6)
            made.append(f'{w}{"" if abs(ratio - .75) < .005 else f" (비율 {ratio:.3f} → 0.750)"}')
        data = dst.read_bytes()
        src = f'./gl/media/cards/card_{w}.webp?v={hashlib.md5(data).hexdigest()[:8]}'
        art[w] = src
        tex[src] = 'data:image/webp;base64,' + base64.b64encode(data).decode()
    if radii:
        worst = max(radii)
        print(f'원래 모서리 둥글기 {min(radii)[0] * 100:.1f}% ~ {worst[0] * 100:.1f}% ({worst[1]}) → 모두 {R * 100:.1f}%')
        if worst[0] > R + .002:
            print(f'  ※ {worst[1]}: 원래 모서리가 {R * 100:.1f}%보다 둥글어서 모서리에 검은 테가 남을 수 있어요 — 그림을 확인해 주세요')
    by = {2: sorted(w for w in art if lv[w] == 2), 3: sorted(w for w in art if lv[w] == 3)}
    ART_JS.write_text(
        '// tools/build_card_art.py 가 만든 파일입니다 (3D 폴더 전용) — 원래 게임 assets/card의 6세 · 7세 카드 그림 → gl/media/cards\n'
        '// 5세 카드(원래 src/cards.js)는 그대로 두고, 그림이 생긴 2 · 3단계 낱말만 window.CARD_ART에 더해요\n'
        '(() => {\n'
        '  const A = window.CARD_ART = window.CARD_ART || {};\n'
        f'  const ADD = {json.dumps(art, ensure_ascii=False, indent=2)};\n'
        '  for (const k in ADD) if (!A[k]) A[k] = ADD[k];\n'
        '})();\n', encoding='utf-8')
    TEX_JS.write_text(
        '// tools/build_card_art.py 가 만든 파일입니다 — 파일을 더블클릭해 열었을 때(file://) 3D 판이 6세 · 7세 카드 그림을 읽도록 data URL로\n'
        '// (http로 열면 안 써요. gl/lv-cards.js가 2단계 이상을 고를 때만 불러와요)\n'
        f'window.GL_TEX = Object.assign(window.GL_TEX || {{}}, {json.dumps(tex)});\n', encoding='utf-8')
    for f in OUT.glob('card_*.webp'):                     # 원본이 없어진 사본은 지움
        if f.stem[len('card_'):] not in art:
            f.unlink()
            print('  지움(원본 없음):', f.name)
    print(f'카드 그림: 6세 {len(by[2])}장 · 7세 {len(by[3])}장 (새로 만듦 {len(made)}장)'
          f'  · gl/card-tex.js {TEX_JS.stat().st_size / 1e6:.1f} MB')
    if made:
        print('  새로 만듦:', ', '.join(made[:12]) + (' …' if len(made) > 12 else ''))
    if skipped:
        print('  2 · 3단계 낱말이 아니라 건너뜀(파일 이름 확인):', ', '.join(skipped))


if __name__ == '__main__':
    main()

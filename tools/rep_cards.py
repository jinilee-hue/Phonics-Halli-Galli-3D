#!/usr/bin/env python3
"""카드 가운데 그림 → 파닉스 공통 대표이미지 (3D 폴더 전용 · 원래 게임은 그대로)

  uv run --with numpy --with scipy --with pillow python tools/rep_cards.py      (그다음 python3 tools/build_card_art.py)

2026-11-19 파닉스 공통 규칙: 그림카드 안의 그림 = 레슨팩 그림, 없으면 공통이미지자료 'FPR K_U1,2 대표이미지/<낱말>.png'
(phonics-kit lessonpack.picture). 원래 게임 assets/card/card_<낱말>.png 중 대표이미지가 있는 낱말만:
  카드 상자로 자르고 → 가운데 그림(+그 그림자)을 둘레 판 색으로 메우고 → 모든 카드 같은 자리 · 같은 상자에 대표이미지 + 부드러운 그림자
  → build_card_art.py 와 같은 모양(600×800, 모서리 7.5%)으로 gl/media/cards/card_<낱말>.webp
  → tools/rep_cards.json (낱말 → 원래 카드 · 대표이미지의 해시) — build_card_art.py 는 이 낱말들을 원래 카드에서 다시 만들지 않고
    (5세 카드면 OVER로 원래 사본 대신 씀), 원래 카드나 대표이미지가 바뀌었으면 이 도구를 다시 돌리라고 알려 줘요.
대표이미지가 없는 낱말과 KEEP(그림 개수가 모서리 숫자와 안 맞는 대표이미지)은 원래 그림 그대로. 테두리 · 낱말 글자 · 모서리 배지는 안 건드려요.
"""
import hashlib
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy import ndimage as ndi
from scipy.spatial import ConvexHull

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT.parent / 'phonics-kit' / 'tools'))
import build_card_art as B  # noqa: E402
import lessonpack  # noqa: E402

LIST = HERE / 'rep_cards.json'
# 그림 개수가 카드 모서리 숫자(= 몇 개)와 안 맞는 대표이미지 — 단수 · 복수를 그림 개수로 보는 게임이라 원래 그림을 그대로 둬요
# (사용자 선택 2026-11-20 "원래 그림 유지"): seed 씨앗 3개+동그라미 / cats 4마리 / maps · pans 2개 / peas 꼬투리 1개 / toys 장난감 3개
KEEP = {'seed', 'cats', 'maps', 'pans', 'peas', 'toys'}


def md5(p):
    return hashlib.md5(pathlib.Path(p).read_bytes()).hexdigest()[:8]


# card layout (all cards share one template; fractions of the card box): the picture sits above the word
ZONE_Y = (.10, .72)          # where the old picture (+ its shadow) can be — the word starts at ≈ .74
ZONE_X = (.08, .92)
BADGE = (.24, .17)           # the level badge in the top-left corner: x < .24, y < .17 — never painted over
BOX = (.66, .44, .445)       # the new picture: fits in .66 W × .44 H, centred at x .5, y .445 (the old pictures' median)


def zone_mask(W, H):
    z = np.zeros((H, W), bool)
    z[int(H * ZONE_Y[0]):int(H * ZONE_Y[1]), int(W * ZONE_X[0]):int(W * ZONE_X[1])] = True
    z[:int(H * BADGE[1]), :int(W * BADGE[0])] = False
    return z


def centre(diff, W, H):
    """the centre picture (+ its shadow): components centred above the word — never the corner badges or the frame"""
    lab, _ = ndi.label(ndi.binary_dilation(diff, iterations=6))
    keep = np.zeros_like(diff)
    for i, (ys, xs) in enumerate(ndi.find_objects(lab), 1):
        cy, cx = (ys.start + ys.stop) / 2 / H, (xs.start + xs.stop) / 2 / W
        if .25 < cx < .75 and .15 < cy < .62:
            keep |= lab == i
    return keep


def panel_fit(a, W, H):
    """a shaded panel as a smooth surface (only to find the picture): per channel a cubic in x, y fitted to the panel,
    refitted 4 times, each time without the pixels that sit far from the last fit"""
    yy, xx = np.mgrid[0:H, 0:W]
    u, v = xx / W - .5, yy / H - .4
    basis = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, u ** 3, u * u * v, u * v * v, v ** 3], -1)
    zone = zone_mask(W, H)
    use = zone & ~((np.abs(u) < .3) & (np.abs(v + .02) < .25))         # first fit: without the middle
    step = max(1, int((W * H / 40000) ** .5))
    sub = np.zeros_like(use); sub[::step, ::step] = True
    for _ in range(4):
        coef = np.linalg.lstsq(basis[use & sub], a[use & sub], rcond=None)[0]
        fit = basis @ coef
        use = zone & (np.abs(a - fit).sum(-1) < 30)
    return fit


def hull(keep):
    """the convex hull of the found picture — also takes the picture's faint parts (a cream bone on a cream card)"""
    ys, xs = np.nonzero(keep)
    pts = np.stack([xs, ys], 1)[::max(1, len(xs) // 20000)]
    v = pts[ConvexHull(pts).vertices]
    m = Image.new('L', (keep.shape[1], keep.shape[0]), 0)
    ImageDraw.Draw(m).polygon([tuple(map(float, q)) for q in v], fill=255)
    return np.asarray(m) > 0


def pushpull(a, known):
    """fill the unknown pixels smoothly from the known ones around them (pyramid push-pull)"""
    w = known.astype(np.float32)
    I = a * w[..., None]
    levels = []
    while min(w.shape) > 4:
        levels.append((I, w))
        h2, w2 = (w.shape[0] + 1) // 2 * 2, (w.shape[1] + 1) // 2 * 2
        Ip = np.zeros((h2, w2, 3), np.float32); Ip[:I.shape[0], :I.shape[1]] = I
        wp = np.zeros((h2, w2), np.float32); wp[:w.shape[0], :w.shape[1]] = w
        I = Ip.reshape(h2 // 2, 2, w2 // 2, 2, 3).sum((1, 3))
        w = wp.reshape(h2 // 2, 2, w2 // 2, 2).sum((1, 3))
        c = np.minimum(w, 1)
        I = I / np.maximum(w, 1e-6)[..., None] * c[..., None]
        w = c
    C = I / np.maximum(w, 1e-6)[..., None]
    if (w <= 0).any():          # holes still open at the top level: the mean of what is known there
        C[w <= 0] = (I.sum((0, 1)) / max(w.sum(), 1e-6))
    for I, w in reversed(levels):
        up = np.stack([np.asarray(Image.fromarray(C[..., k]).resize((w.shape[1], w.shape[0]), Image.BILINEAR)) for k in range(3)], -1)
        C = I + (1 - w)[..., None] * up
    return C


def swap(card, pic_path):
    """card: RGBA cut to the card box. The old centre picture (+ its shadow) is filled in from the panel around it and the
    representative picture goes in one standard box (BOX) with a soft contact shadow."""
    W, H = card.size
    alpha = card.getchannel('A')
    a = np.asarray(card.convert('RGB')).astype(np.float32)
    zone = zone_mask(W, H)
    flat = np.median(a[int(H * .2):int(H * .25), int(W * .14):int(W * .2)].reshape(-1, 3), 0)   # the panel colour
    keep = centre((np.abs(a - flat).sum(-1) > 18) & zone, W, H)
    if not keep.any():          # a shaded panel (log, nut, seeds …): compare with a smooth fit of the panel instead
        keep = centre((np.abs(a - panel_fit(a, W, H)).sum(-1) > 24) & zone, W, H)
    if not keep.any():
        raise ValueError('no centre picture found')
    gone = ndi.binary_dilation(hull(keep), iterations=max(8, W // 80)) & zone
    panel = np.zeros((H, W), bool)
    panel[int(H * .06):int(H * .73), int(W * .06):int(W * .94)] = True
    panel[:int(H * BADGE[1]), :int(W * BADGE[0])] = False
    filled = pushpull(a, panel & ~gone)
    m = np.asarray(Image.fromarray(gone.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(max(3, W // 200)))).astype(np.float32)[..., None] / 255
    m = m * zone[..., None]
    im = Image.fromarray(np.clip(a * (1 - m) + filled * m, 0, 255).astype(np.uint8)).convert('RGBA')
    pic = Image.open(pic_path).convert('RGBA')
    pic = pic.crop(pic.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    s = min(W * BOX[0] / pic.width, H * BOX[1] / pic.height)
    pic = pic.resize((max(1, round(pic.width * s)), max(1, round(pic.height * s))), Image.LANCZOS)
    cx, cy = W * .5, H * BOX[2]
    px, py = round(cx - pic.width / 2), round(cy - pic.height / 2)
    sh = Image.new('L', im.size, 0)
    ImageDraw.Draw(sh).ellipse((cx - pic.width * .36, py + pic.height * .95, cx + pic.width * .36, py + pic.height * 1.06), fill=70)
    shade = Image.new('RGBA', im.size, (40, 60, 90, 0))
    shade.putalpha(sh.filter(ImageFilter.GaussianBlur(W * .012)))
    im.alpha_composite(shade)
    im.alpha_composite(pic, (px, py))
    im.putalpha(alpha)
    return im


def main():
    words = sys.argv[1:]
    done = json.loads(LIST.read_text()) if LIST.exists() else {}
    B.OUT.mkdir(parents=True, exist_ok=True)
    made, kept, none, fail, kept_orig = [], [], [], [], []
    for p in sorted(B.SRC.glob('card_*.png')):
        w = p.stem[len('card_'):]
        if words and w not in words:
            continue
        pic = lessonpack.picture(w)
        if pic and w in KEEP:
            if done.pop(w, None):                       # 전에 바꿨던 카드 → 지워서 build_card_art.py가 원래 그림으로 다시 만들게
                (B.OUT / f'card_{w}.webp').unlink(missing_ok=True)
            kept_orig.append(w)
            continue
        if not pic:
            none.append(w)
            continue
        sig = {'card': md5(p), 'pic': md5(pic)}
        dst = B.OUT / f'card_{w}.webp'
        if done.get(w) == sig and dst.exists() and not words:
            kept.append(w)
            continue
        im = Image.open(p).convert('RGBA')
        box, _ = B.card_box(im)
        try:
            card = swap(im.crop(box), pic)
        except ValueError as e:
            fail.append(f'{w} ({e})')
            continue
        out = card.resize((B.OW, B.OH), Image.LANCZOS)
        out.putalpha(ImageChops.multiply(out.getchannel('A'), B.rounded_mask(B.OW, B.OH, B.R * B.OW)))
        out.save(dst, 'WEBP', quality=88, method=6)
        done[w] = sig
        made.append(w)
    LIST.write_text(json.dumps(dict(sorted(done.items())), indent=1) + '\n')
    print(f'대표이미지 카드: 새로 만듦 {len(made)} · 그대로 {len(kept)} · 대표이미지 없음(원래 그림) {len(none)}')
    if made:
        print('  새로 만듦:', ' '.join(made))
    if kept_orig:
        print('  개수가 안 맞아 원래 그림 그대로(KEEP):', ' '.join(kept_orig))
    if fail:
        print('  ※ 못 바꿈(원래 그림 그대로):', ', '.join(fail))


if __name__ == '__main__':
    main()

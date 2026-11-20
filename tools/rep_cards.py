#!/usr/bin/env python3
"""카드 가운데 그림 → 파닉스 공통 대표이미지 (3D 폴더 전용 · 원래 게임은 그대로)

  uv run --with numpy --with scipy --with pillow python tools/rep_cards.py      (그다음 python3 tools/build_card_art.py)

2026-11-19 파닉스 공통 규칙: 그림카드 안의 그림 = 레슨팩 그림, 없으면 공통이미지자료 'FPR K_U1,2 대표이미지/<낱말>.png'
(phonics-kit lessonpack.picture). 원래 게임 assets/card/card_<낱말>.png 중 대표이미지가 있는 낱말만:
  카드 상자로 자르고 → 가운데 그림 전체(+그 그림자, 판 가장자리 · 낱말 위까지 뻗은 조각)를 깨끗한 판 색 + 판의 결로 메우고 → 모든 카드 같은 자리 · 같은 상자에 대표이미지 + 부드러운 그림자
  → build_card_art.py 와 같은 모양(600×800, 모서리 7.5%)으로 gl/media/cards/card_<낱말>.webp
  → tools/rep_cards.json (낱말 → 원래 카드 · 대표이미지의 해시) — build_card_art.py 는 이 낱말들을 원래 카드에서 다시 만들지 않고
    (5세 카드면 OVER로 원래 사본 대신 씀), 원래 카드나 대표이미지가 바뀌었으면 이 도구를 다시 돌리라고 알려 줘요.
대표이미지가 없는 낱말과 KEEP(그림 개수가 모서리 숫자와 안 맞는 대표이미지)은 원래 그림 그대로.
MULTI(maps)는 단수 대표이미지를 N장 겹쳐 놓아요. 테두리 · 낱말 글자 · 모서리 배지는 안 건드려요.
"""
import hashlib
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps
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
KEEP = {'seed', 'cats', 'pans', 'peas', 'toys'}
# 여럿 카드를 단수 대표이미지 N장을 겹쳐 만듦 (사용자 2026-11-20 "maps 는 map에 있는 이미지를 3개 겹쳐서 넣어주면 되겠네" —
# 원래 maps 그림은 지도 3장이 한 줄로 붙어 한 장처럼 보였음): 낱말 → (그림을 가져올 낱말, 몇 장)
MULTI = {'maps': ('map', 3), 'puzzles': ('puzzle', 2)}   # puzzles: 사용자 "puzzle에 있는 이미지를 2개로 겹쳐서"
MULTI['toes'] = ('toe', 'pair')   # 사용자 "toe에 있는 발과 화살표를 좌우 반전시켜 하나 더 만들어서 양발처럼" — 'pair' = 거울상 + 그대로, 나란히
MULTI_BOX = (.80, .46)       # a pile is wider than one picture — as wide as the other plural cards' pictures


def md5(p):
    return hashlib.md5(pathlib.Path(p).read_bytes()).hexdigest()[:8]


# card layout (all cards share one template; fractions of the card box): the picture sits above the word
ZONE_Y = (.10, .72)          # where the old picture (+ its shadow) can be — the word starts at ≈ .74
ZONE_X = (.08, .92)
BADGE = (.24, .17)           # the level badge in the top-left corner: x < .24, y < .17 — never painted over
PANEL_X = (.05, .95)         # the panel inside the cream frame (the frame's inner edge is at ≈ .042 / .948)
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


def cut_white(pic):
    """a picture on an opaque white square (dog — user: "dog 흰바탕 빼야해", then "흰색 배경삭제가 제대로 안된거 같은데"):
    - the background = the pale grey-white that touches the edge (its floor shadow too) + big pure-white holes it cannot reach
      (between the legs, under the belly) → transparent, the floor shadow kept as a soft see-through shadow;
    - the edge (fur tips mixed with the white) un-mixed: alpha from how far a pixel is from white, colour with the white taken out
    Pictures without a white square stay as they are."""
    a = np.asarray(pic).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    lo = rgb.min(-1)
    sat = rgb.max(-1) - lo
    ring = np.ones(al.shape, bool)
    ring[8:-8, 8:-8] = False
    if ((lo >= 190) & (sat <= 18) & (al > 200))[ring].mean() < .9:
        return pic, False
    pale = (lo >= 120) & (sat <= 24) & (al > 200)                  # white … the floor shadow's grey (fur is sat ≥ 79)
    lab, _ = ndi.label(pale)
    ids = np.unique(lab[ring & pale])
    bg = np.isin(lab, ids[ids > 0])
    white = (lo >= 215) & (sat <= 24)                               # pure-white holes the edge can't reach
    lab, n = ndi.label(white & ~bg)
    if n:
        size = ndi.sum(np.ones_like(lo), lab, index=np.arange(1, n + 1))
        bg |= np.isin(lab, 1 + np.nonzero(size > .001 * lo.size)[0])
    lab, _ = ndi.label((lo >= 165) & (sat <= 45) & ~bg)             # pale slivers touching it (under the paws: sat ≈ 30; paw fur ≥ 85)
    ids = np.unique(lab[ndi.binary_dilation(bg, iterations=2) & (lab > 0)])
    bg |= np.isin(lab, ids)
    fg = ~bg
    out = a.copy()
    # background: white → clear, grey → a soft dark shadow (alpha from its darkness)
    sh = np.clip((248 - lo) / 248, 0, 1) * .85
    out[bg, :3] = 40
    out[bg, 3] = al[bg] * sh[bg]
    # the edge band: un-mix the white (alpha from whiteness against the fur colour just inside)
    band = ndi.binary_dilation(bg, iterations=4) & fg
    inner = ndi.binary_dilation(bg, iterations=14) & ndi.binary_erosion(fg, iterations=5)
    ref = float(np.median(lo[inner])) if inner.any() else 150.
    k = np.clip((255 - lo) / max(255 - ref, 30), 0, 1)
    kb = np.maximum(k[band], .02)[:, None]
    out[band, :3] = np.clip((rgb[band] - (1 - kb) * 255) / kb, 0, 255)
    out[band, 3] = al[band] * k[band]
    out[..., 3] = np.asarray(Image.fromarray(out[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))).astype(np.float32)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA'), True


def word_top(a, flat, W, H):
    """where the printed word starts (fraction of H): rows of strong ink in x .28–.72, going up from its bottom to the gap
    above it; kept within .72–.77 (all cards measure .734–.78)"""
    ink = (np.abs(a - flat).sum(-1) > 90)[:, int(W * .28):int(W * .72)].mean(1)
    y = int(H * .93)
    while y > int(H * .6) and ink[y] < .06:
        y -= 1
    while y > int(H * .6) and ink[y] >= .03:
        y -= 1
    return min(.77, max(.72, y / H))


def texture(r, known, W, H):
    """the panel's fine grain (r = image − its blur) from the free strip at the panel's left edge, tiled across (every other
    copy mirrored, so no seams); 0 where the strip is not clean panel"""
    x0, x1 = int(W * .055), int(W * .19)
    src = ndi.binary_erosion(known, iterations=4)                   # not next to an edge (badge, frame, word, picture)
    src[:int(H * .08)] = False
    v = r[src]
    lim = 3 * 1.4826 * np.median(np.abs(v - np.median(v, 0)), 0) + .5 if len(v) else 0   # no outliers (3 robust sigma)
    strip = np.clip(r[:, x0:x1], -lim, lim) * src[:, x0:x1, None]
    reps = W // (x1 - x0) + 2
    return np.concatenate([strip, strip[:, ::-1]] * reps, 1)[:, :W]


def stack(pic_path, n):
    """n copies of one picture overlapping like a small pile — back row left/right, front copy lower in the middle (n = 3),
    or side by side overlapping (n = 2), or a mirrored pair side by side (n = "pair", two feet); each copy throws a soft shadow on the ones behind it, so every copy reads"""
    pic = cut_white(Image.open(pic_path).convert('RGBA'))[0]
    pic = pic.crop(pic.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    w, h = pic.size
    pad = int(w * .08)                                              # room for the shadows (else they end in a straight cut)
    if n == 'pair':             # two feet: the picture mirrored on the left (the other foot), as it is on the right
        gap = int(w * .06)
        copies = [(ImageOps.mirror(pic), pad, pad), (pic, pad + w + gap, pad)]
        W, H = 2 * w + gap + 2 * pad, h + 2 * pad
    else:
        spots = [(0, 0), (.56 * w, 0), (.28 * w, .40 * h)] if n == 3 else [(0, 0), (.56 * w, .12 * h)]
        copies = [(pic, x + pad, y + pad) for x, y in spots[:n]]
        W, H = int(w * 1.56) + 2 * pad, int(h * (1.40 if n == 3 else 1.12)) + 2 * pad
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for pic, x, y in copies:
        a = pic.getchannel('A')
        sh = Image.new('L', (W, H), 0)
        sh.paste(a.point(lambda v: v * .35), (int(x) + int(w * .02), int(y) + int(h * .04)))
        shade = Image.new('RGBA', (W, H), (30, 40, 60, 0)); shade.putalpha(sh.filter(ImageFilter.GaussianBlur(w * .02)))
        out.alpha_composite(shade)
        out.alpha_composite(pic, (int(x), int(y)))
    return out


def panel_box(a, W, H):
    """the panel's inner edges in pixels — the cream frame's inner edge differs per card (.947–.958 W): the strongest
    brightness step met first from the panel side in the window where the edge can be (left .025–.07 W, right .93–.975 W, top .02–.07 H), median of the
    step over a few rows / columns; 2 px kept clear of the frame's own inner line. No clear step (a panel as pale as the
    frame) → the usual place (.045 / .955 / .045)."""
    g = a.sum(-1)
    def edge(profiles, lo, hi, default, inward_first):
        # the first clear step met coming from the panel side (the frame's outer rim makes a second step further out)
        d = np.median(np.abs(np.diff(np.stack(profiles), axis=1))[:, lo:hi], 0)
        ks = range(len(d) - 1, -1, -1) if inward_first == 'high' else range(len(d))
        return next((lo + k for k in ks if d[k] > 12), default)
    rows = [g[int(H * f)] for f in (.09, .3, .5, .66)]
    cols = [g[:, int(W * f)] for f in (.4, .6, .8)]
    x0 = edge(rows, int(W * .025), int(W * .07), int(W * .045), 'high') + 3
    x1 = edge(rows, int(W * .93), int(W * .975), int(W * .955), 'low') - 1
    y0 = edge(cols, int(H * .02), int(H * .07), int(H * .045), 'high') + 3
    return x0, x1, y0


def swap(card, pic_path, box=None):
    """card: RGBA cut to the card box. The old centre picture (+ its shadow) is filled in from the panel around it and the
    representative picture goes in one standard box (BOX) with a soft contact shadow."""
    W, H = card.size
    alpha = card.getchannel('A')
    a = np.asarray(card.convert('RGB')).astype(np.float32)
    zone = zone_mask(W, H)
    flat = np.median(a[int(H * .2):int(H * .25), int(W * .14):int(W * .2)].reshape(-1, 3), 0)   # the panel colour
    bg = flat
    keep = centre((np.abs(a - bg).sum(-1) > 18) & zone, W, H)
    if not keep.any():          # a shaded panel (log, nut, seeds …): compare with a smooth fit of the panel instead
        bg = panel_fit(a, W, H)
        keep = centre((np.abs(a - bg).sum(-1) > 24) & zone, W, H)
    if not keep.any():
        raise ValueError('no centre picture found')
    off = np.abs(a - bg).sum(-1)
    # the panel: inside the frame (x .05–.95, from y .045) down to just above the word, without the level badge
    wtop = word_top(a, flat, W, H)
    x0, x1, y0 = panel_box(a, W, H)
    panel = np.zeros((H, W), bool)
    panel[y0:int(H * (wtop - .006)), x0:x1] = True
    panel[:int(H * BADGE[1]), :int(W * BADGE[0])] = False
    near = ndi.binary_dilation(keep, iterations=6)
    # the old picture's faint parts (a cream bone's end on a cream card): weak but clear, touching what was found —
    # taken only while they don't blow the area up (a shaded panel is 'weak' everywhere)
    blur = ndi.gaussian_filter(a, (2, 2, 0))
    weak = (np.abs(blur - bg).sum(-1) > 10) & zone
    lab, _ = ndi.label(weak)
    ids = np.unique(lab[near & weak])
    more = np.isin(lab, ids[ids > 0])
    full = keep | more if (keep | more).sum() < 1.6 * keep.sum() else keep.copy()
    # its parts outside the zone (a pan's rim at the panel's edge, a girl's shoes near the word): small clear pieces that
    # touch it (a big one is the panel's own shading, not the picture)
    piece = (off > 40) & panel & ~zone
    lab, _ = ndi.label(piece)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m_i = lab[sl] == i
        if m_i.sum() < .03 * W * H and (near[sl] & m_i).any():
            full[sl] |= m_i
    gone = ndi.binary_dilation(hull(full & panel), iterations=max(8, W // 80)) & panel
    # fill only from clean panel pixels: smooth where they are (no edge of a picture leftover, the word or the badge),
    # so nothing gets smeared in; then the panel's own fine texture on top (copied from the free strip at its left edge)
    smooth = ndi.binary_erosion(np.abs(a - blur).sum(-1) < 14, iterations=2)
    known = panel & ~gone & smooth
    soft = ndi.gaussian_filter(a, (2, 2, 0))
    filled = pushpull(soft, known) + texture(a - soft, known, W, H)
    m = np.asarray(Image.fromarray(gone.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(max(3, W // 200)))).astype(np.float32)[..., None] / 255
    m = np.maximum(m, gone[..., None].astype(np.float32)) * panel[..., None]   # all of the erased area replaced (the fade only outside it)
    im = Image.fromarray(np.clip(a * (1 - m) + filled * m, 0, 255).astype(np.uint8)).convert('RGBA')
    pic = pic_path if isinstance(pic_path, Image.Image) else cut_white(Image.open(pic_path).convert('RGBA'))[0]
    pic = pic.crop(pic.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    bw, bh = box or BOX[:2]
    s = min(W * bw / pic.width, H * bh / pic.height)
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
        pic = lessonpack.picture(MULTI[w][0] if w in MULTI else w)
        if pic and w in KEEP:
            if done.pop(w, None):                       # 전에 바꿨던 카드 → 지워서 build_card_art.py가 원래 그림으로 다시 만들게
                (B.OUT / f'card_{w}.webp').unlink(missing_ok=True)
            kept_orig.append(w)
            continue
        if not pic:
            none.append(w)
            continue
        sig = {'card': md5(p), 'pic': md5(pic), 'cut': cut_white(Image.open(pic).convert('RGBA'))[1]}
        if w in MULTI:
            sig['multi'] = list(MULTI[w])
        dst = B.OUT / f'card_{w}.webp'
        if done.get(w) == sig and dst.exists() and not words:
            kept.append(w)
            continue
        im = Image.open(p).convert('RGBA')
        box, _ = B.card_box(im)
        try:
            card = swap(im.crop(box), stack(pic, MULTI[w][1]), MULTI_BOX) if w in MULTI else swap(im.crop(box), pic)
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

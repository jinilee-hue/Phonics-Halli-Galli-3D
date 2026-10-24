#!/usr/bin/env python3
"""HUD 시계 색 바꾸기 (3D 폴더 전용) — 빨강 · 노랑 · 주황 · 파랑 시계를 핑크 · 보라 계열로

  python3 tools/build_clock_color.py        → gl/media/clock/<테마>/{body,hand_orange,hand_blue,still}.png

- 원래 조각(assets/clock_parts/*.png, 원래 게임에서 복사)은 그대로 두고, 색만 바꾼 복사본을 만들어요.
  gl/clock-color.js가 시계 그림 주소를 이 복사본으로 바꿔 끼워요 (?clock=purple · ?clock=off).
- 부분마다(테두리 · 꼭지 · 긴 바늘 · 화살 바늘) 평균색을 목표색으로 옮기고, 명암(밝기 · 채도 차이)은 그대로 둬요.
  가운데 크림색 얼굴과 바늘 꼭지(cap)는 그대로.
- PIL만 써요 (동기화.command가 쓰는 시스템 python3에서도 돌게).
"""
import colorsys
import json
import math
import pathlib
import re

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'clock_parts'
OUT = ROOT / 'gl' / 'media' / 'clock'


def oklch(L, C, h):
    """OKLCH → sRGB (0~255) — 목표색을 눈에 보이는 밝기 기준으로 정하려고"""
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_, m_, s_ = L + .3963377774 * a + .2158037573 * b, L - .1055613458 * a - .0638541728 * b, L - .0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    lin = (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
           -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)
    enc = lambda x: 12.92 * x if x <= .0031308 else 1.055 * x ** (1 / 2.4) - .055
    return tuple(max(0, min(255, round(enc(max(0., x)) * 255))) for x in lin)


# 테마: 부분마다 목표 평균색 (OKLCH 밝기 L · 채도 C · 색상 h)
THEMES = {
    # 핑크: 테두리 사탕 핑크 · 꼭지 연보라 · 긴 바늘 보라 · 화살 바늘 진분홍
    'pink': {'ring': oklch(.72, .15, 355), 'knob': oklch(.80, .10, 302),
             'hand_orange': oklch(.56, .17, 296), 'hand_blue': oklch(.64, .19, 356)},
    # 보라: 테두리 라벤더 보라 · 꼭지 연분홍 · 긴 바늘 진분홍 · 화살 바늘 진보라
    'purple': {'ring': oklch(.65, .15, 298), 'knob': oklch(.82, .10, 355),
               'hand_orange': oklch(.64, .19, 356), 'hand_blue': oklch(.50, .16, 288)},
}


def hsv_bytes(im):
    """RGBA → (h, s, v, a) 0~255 바이트 4개"""
    r, g, b, a = im.split()
    h, s, v = Image.merge('RGB', (r, g, b)).convert('HSV').split()
    return h.tobytes(), s.tobytes(), v.tobytes(), a.tobytes()


def mean_hsv(im, weight=None):
    """불투명 · 채도 있는 픽셀(하이라이트 빼고)의 평균 색상(원형 평균) · 채도 · 밝기 (0~1)"""
    h, s, v, a = hsv_bytes(im)
    w8 = weight.tobytes() if weight is not None else None
    cx = cy = ss = vv = tw = 0.
    for i in range(len(a)):
        if a[i] < 128 or s[i] < 77:          # 반투명 가장자리 · 하이라이트(채도 .3 밑)는 평균에서 빼요
            continue
        w = (a[i] / 255) * (w8[i] / 255 if w8 else 1)
        if w <= 0:
            continue
        t = h[i] / 256 * 2 * math.pi
        cx += w * math.cos(t); cy += w * math.sin(t); ss += w * s[i]; vv += w * v[i]; tw += w
    return (math.atan2(cy, cx) / (2 * math.pi)) % 1, ss / tw / 255, vv / tw / 255


def shifted(im, src, dst, kh=1., sat=1.):
    """평균색 src(h,s,v) → 목표색 dst(r,g,b): 색상은 돌리고 채도 · 밝기는 비율로 — 명암 차이는 그대로
    kh: 원래 색상 차이를 얼마나 남길지 (노란 꼭지의 주황 그늘이 연보라에선 파랗게 보여서 꼭지는 줄여요)
    sat: 채도를 더 줄이는 비율 (얼굴 가장자리 그늘은 옅게)"""
    th, ts, tv = colorsys.rgb_to_hsv(*(c / 255 for c in dst))
    m, t = src[0] * 256, th * 256
    ks, kv = ts / max(src[1], 1e-3) * sat, tv / max(src[2], 1e-3)
    r, g, b, a = im.split()
    h, s, v = Image.merge('RGB', (r, g, b)).convert('HSV').split()
    h = h.point(lambda x: int(round(t + ((x - m + 128) % 256 - 128) * kh)) % 256)
    s = s.point(lambda x: min(255, int(round(x * ks))))
    v = v.point(lambda x: min(255, int(round(x * kv))))
    rgb = Image.merge('HSV', (h, s, v)).convert('RGB')
    return Image.merge('RGBA', (*rgb.split(), a))


def hue_mask(im, lo, hi, soft=8, s0=0., s1=.18):
    """색상이 lo~hi도(가장자리 soft도는 흐리게)이고 채도가 s0~s1부터 있는 픽셀 → 0~255 마스크"""
    r, g, b, a = im.split()
    h, s, v = Image.merge('RGB', (r, g, b)).convert('HSV').split()
    def f(x):
        d = x * 360 / 256
        if lo <= d <= hi:
            return 255
        e = min(abs(d - lo), abs(d - hi))
        return max(0, round(255 * (1 - e / soft)))
    hm = h.point(f)
    a0, a1 = s0 * 255, s1 * 255
    sm = s.point(lambda x: 255 if x >= a1 else 0 if x <= a0 else round((x - a0) / (a1 - a0) * 255))   # 채도 낮은 곳(크림 · 하이라이트)은 색상이 믿을 수 없어서 약하게
    return Image.composite(hm, Image.new('L', im.size, 0), sm)


def knob_circle(body, px, py):
    """꼭지 공의 원(가운데 x, y, 반지름): 노란 픽셀로 대충 자리를 잡고, 경계 점들에 원을 맞춰요"""
    W, H = body.size
    pix = body.load()
    hsv = lambda x, y: (lambda r, g, b, a: (*colorsys.rgb_to_hsv(r / 255, g / 255, b / 255), a))(*pix[x, y])
    yel = [(x, y) for y in range(H) for x in range(W)
           if math.hypot(x - px, y - py) > 165 and (lambda h, s, v, a: a > 200 and 25 <= h * 360 <= 70 and s > .45)(*hsv(x, y))]
    x0 = round(sum(p[0] for p in yel) / len(yel)); y0 = round(sum(p[1] for p in yel) / len(yel))
    # 위로 튀어나온 부분: 꼭지 옆(40px 왼쪽) 테두리 맨 위보다 위쪽 행의 좌우 투명 경계
    ring_top = next(y for y in range(H) if pix[x0 - 40, y][3] > 128)
    pts = []
    for y in range(0, ring_top - 2):
        xs = [x for x in range(max(0, x0 - 60), min(W, x0 + 60)) if pix[x, y][3] > 128]
        if xs:
            pts += [(xs[0], y), (xs[-1], y)]
    # 아래쪽: 노랑 · 주황(꼭지)과 빨강(테두리)이 맞닿는 곳
    for y in range(max(1, y0 - 25), min(H - 1, y0 + 50)):
        for x in range(max(1, x0 - 55), min(W - 1, x0 + 55)):
            h, s, v, a = hsv(x, y)
            if a > 200 and 25 <= h * 360 <= 70 and s > .45:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    h2, s2, v2, a2 = hsv(x + dx, y + dy)
                    if a2 > 200 and (h2 * 360 < 15 or h2 * 360 > 340) and s2 > .4:
                        pts.append((x, y))
                        break
    # Kasa 원 맞추기: x² + y² = A x + B y + C
    n = len(pts)
    sums = [[0.] * 4 for _ in range(3)]
    for x, y in pts:
        row, z = (x, y, 1.), x * x + y * y
        for i in range(3):
            for j in range(3):
                sums[i][j] += row[i] * row[j]
            sums[i][3] += row[i] * z
    M = sums
    for i in range(3):
        piv = max(range(i, 3), key=lambda r: abs(M[r][i]))
        M[i], M[piv] = M[piv], M[i]
        for r in range(3):
            if r != i:
                f = M[r][i] / M[i][i]
                M[r] = [a - f * b for a, b in zip(M[r], M[i])]
    A, B, C = (M[i][3] / M[i][i] for i in range(3))
    cx, cy = A / 2, B / 2
    r = math.sqrt(C + cx * cx + cy * cy)
    res = sorted(abs(math.hypot(x - cx, y - cy) - r) for x, y in pts)
    if n < 30 or res[len(res) // 2] > 1.0:
        raise SystemExit(f'꼭지 원을 못 맞췄어요 (점 {n}개, 어긋남 중간값 {res[len(res) // 2]:.2f}px) — 시계 그림이 바뀌었는지 확인해 주세요')
    return cx, cy, r


def main():
    parts = json.loads(re.search(r'CLOCK_PARTS\s*=\s*(\{.*?\});', (ROOT / 'src' / 'clock-parts.js').read_text(encoding='utf-8')).group(1))
    px, py = parts['pivot']
    body = Image.open(SRC / 'body.png').convert('RGBA')
    hands = {n: Image.open(SRC / f'{n}.png').convert('RGBA') for n in ('hand_orange', 'hand_blue')}
    cap = Image.open(SRC / 'cap.png').convert('RGBA')
    W, H = body.size

    # 꼭지(노란 공) = 원 하나. 색으로 가르면 반짝이(흰빛)나 공 아래 주황 그늘이 테두리 색으로 바뀌어 점 · 줄이 생겨요
    #   → 위로 튀어나온 부분의 투명 경계 + 아래쪽 노랑/빨강 경계에 원을 맞춰(Kasa) 그 원 안을 통째로 꼭지로
    kx, ky, kr = knob_circle(body, px, py)
    print(f'  꼭지 원 가운데 ({kx:.1f}, {ky:.1f}) 반지름 {kr:.1f}px')
    S = 4                                                   # 4배로 그려 줄여서 가장자리를 부드럽게
    big = Image.new('L', (W * S, H * S), 0)
    rr = kr + .5
    ImageDraw.Draw(big).ellipse(((kx - rr) * S, (ky - rr) * S, (kx + rr) * S, (ky + rr) * S), fill=255)
    knob_w = big.resize((W, H), Image.BOX)

    # 테두리(빨강): 얼굴(가운데 크림) 바깥 전부 — 얼굴 가장자리의 붉은 그늘도 같이 (경계에 빨간 띠가 남지 않게)
    R0 = 133
    ring_area = Image.new('L', body.size, 255)
    ImageDraw.Draw(ring_area).ellipse((px - R0, py - R0, px + R0, py + R0), fill=0)
    ring_area = ring_area.filter(ImageFilter.GaussianBlur(4))
    inv_knob = knob_w.point(lambda x: 255 - x)
    ring_w = Image.composite(ring_area, Image.new('L', body.size, 0), inv_knob)

    # 얼굴 가장자리 그늘 띠(가운데에서 133~151px): 테두리 색으로 물들되 옅게 — 진하면 보라 테두리 안쪽에 보라 띠가 둘러요
    band = Image.new('L', body.size, 0)
    ImageDraw.Draw(band).ellipse((px - 152, py - 152, px + 152, py + 152), fill=255)
    band = band.filter(ImageFilter.GaussianBlur(2))

    src = {'ring': mean_hsv(body, ring_w), 'knob': mean_hsv(body, knob_w),
           'hand_orange': mean_hsv(hands['hand_orange']), 'hand_blue': mean_hsv(hands['hand_blue'])}
    for k, (h, s, v) in src.items():
        print(f'  원래 {k:12s} h {h * 360:5.1f}° s {s:.2f} v {v:.2f}')

    for name, T in THEMES.items():
        d = OUT / name
        d.mkdir(parents=True, exist_ok=True)
        ring_full = shifted(body, src['ring'], T['ring'])
        ring_layer = Image.composite(shifted(body, src['ring'], T['ring'], sat=.45), ring_full, band)
        b2 = Image.composite(ring_layer, body, ring_w)
        b2 = Image.composite(shifted(body, src['knob'], T['knob'], kh=.3), b2, knob_w)
        b2.save(d / 'body.png', optimize=True)
        h2 = {k: shifted(im, src[k], T[k]) for k, im in hands.items()}
        for k, im in h2.items():
            im.save(d / f'{k}.png', optimize=True)
        still = Image.new('RGBA', body.size, (0, 0, 0, 0))     # 조각이 다 불러와지기 전 보이는 한 장 (처음 바늘 각도 그대로)
        for im in (b2, h2['hand_blue'], h2['hand_orange'], cap):
            still.alpha_composite(im)
        still.save(d / 'still.png', optimize=True)
        print(f'{name}: ' + ' · '.join(f'{k} #{"".join(f"{c:02x}" for c in v)}' for k, v in T.items()), '→', d.relative_to(ROOT))


if __name__ == '__main__':
    main()

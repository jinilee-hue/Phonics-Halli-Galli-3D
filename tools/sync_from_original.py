"""원래 게임(../Phonics-Halli-Galli)에서 고친 것을 이 3D 폴더로 가져와요.

  python3 tools/sync_from_original.py        (또는 '동기화.command' 더블클릭)

- src/  : 원래 게임의 src 파일을 전부 그대로 복사 (새로 생긴 파일도)
- assets: 원래 게임이 쓰는 그림 · 영상만 (index.html · src 안에 적힌 assets/... + 조각 폴더들)
- index.html: 원래 index.html에 3D 판 줄(아래 HEAD_ADD · BODY_ADD)만 끼워서 다시 만듦
- 카드 그림이 바뀌었으면 src/gl-tex.js(3D 판 그림)도 다시 만듦
3D 판 파일(gl/ · vendor/ · src/gl-tex.js · tools/)은 건드리지 않아요.
"""
import filecmp
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIG = ROOT.parent / 'Phonics-Halli-Galli'

# 3D 판을 켜는 줄 — 3D 쪽 파일을 더하면 여기만 고치고 이 스크립트를 다시 돌리면 돼요
HEAD_ADD = ('<link rel="stylesheet" href="./gl/board3d.css?v=1" />\n'
            '<link rel="stylesheet" href="./gl/intro-mg.css?v=1" />\n'
            '<link rel="stylesheet" href="./gl/result-fx.css?v=5" />\n'
            '<link rel="stylesheet" href="./gl/tutor.css?v=3" />\n')
# 인트로 모션그래픽: 원래 intro.js 바로 뒤(main.js보다 앞)에 끼워서 playIntro를 바꿔 둬요
INTRO_ADD = '<script src="./gl/intro-mg.js?v=2"></script>\n'
# 결과 화면 덧입히기: 원래 result.js 바로 뒤(main.js보다 앞)에 끼워서 renderResult를 바꿔 둬요 (main.js가 읽을 때 가져감)
RESULT_ADD = '<script src="./gl/result-fx.js?v=1"></script>\n'
BODY_ADD = ('<!-- 3D 판 (WebGL): three.js + 판 그림 + 판 그리기. 게임 규칙 · 소리 · 글자는 위 원래 스크립트 그대로 -->\n'
            '<script src="./vendor/three/three.iife.js"></script>\n'
            '<script src="./src/gl-tex.js?v=3"></script>\n'
            '<script src="./gl/board3d.js?v=1"></script>\n'
            '<script src="./gl/bell3d.js?v=4"></script>\n'
            '<script src="./gl/coco3d.js?v=1"></script>\n'
            '<script src="./gl/view360.js?v=2"></script>\n'
            '<!-- Coco 말풍선 영어 · 노란 종 튜터: 진행자 말소리 + 상황별 안내 (원래 게임 함수를 감싸서 끼어들어요 · ?tutor=off 로 튜터만 끔) -->\n'
            '<script src="./gl/coco-en.js?v=1"></script>\n'
            '<script src="./gl/tutor-voice.js?v=3"></script>\n'
            '<script src="./gl/tutor.js?v=3"></script>\n')
TITLE = ('<title>Phonics Halli Galli — Coco</title>', '<title>Phonics Halli Galli 3D — Coco</title>')
ASSET_DIRS = ['bell_parts', 'coco_parts', 'clock_parts', 'card_web']
OWN_SRC = {'gl-tex.js'}            # 3D 폴더에만 있는 src 파일


def copy_if_changed(a, b, changed):
    if b.exists() and filecmp.cmp(a, b, shallow=False):
        return
    b.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(a, b)
    changed.append(str(b.relative_to(ROOT)))


def main():
    if not (ORIG / 'index.html').exists():
        sys.exit(f'원래 게임 폴더를 못 찾았어요: {ORIG}')
    changed, missing = [], []

    # 1) src 전부
    for f in sorted((ORIG / 'src').iterdir()):
        if f.is_file() and f.name not in OWN_SRC:
            copy_if_changed(f, ROOT / 'src' / f.name, changed)
    extra = [f.name for f in (ROOT / 'src').iterdir() if f.is_file() and f.name not in OWN_SRC and not (ORIG / 'src' / f.name).exists()]

    # 2) assets: 글에 적힌 경로 + 조각 폴더
    texts = [(ORIG / 'index.html').read_text(encoding='utf-8')]
    texts += [p.read_text(encoding='utf-8', errors='ignore') for p in (ORIG / 'src').glob('*') if p.suffix in ('.js', '.css') and p.stat().st_size < 400_000]
    refs = set()
    for t in texts:
        refs.update(m.group(1) for m in re.finditer(r'assets/([\w\-./]+?\.(?:png|webp|jpe?g|mp4|svg|gif|wav|mp3))', t))
    for r in sorted(refs):
        a = ORIG / 'assets' / r
        if a.is_file():
            copy_if_changed(a, ROOT / 'assets' / r, changed)
        else:
            missing.append(r)
    for d in ASSET_DIRS:
        for a in sorted((ORIG / 'assets' / d).rglob('*')):
            if a.is_file():
                copy_if_changed(a, ROOT / 'assets' / a.relative_to(ORIG / 'assets'), changed)

    # 3) index.html = 원래 + 3D 줄
    html = (ORIG / 'index.html').read_text(encoding='utf-8')
    html = html.replace(*TITLE)
    m = re.search(r'<link[^>]*src/upgrade\.css[^>]*>\n', html)
    if not m or '</body>' not in html:
        sys.exit('원래 index.html에서 3D 줄을 끼울 자리(upgrade.css 링크 · </body>)를 못 찾았어요. 손으로 확인해 주세요.')
    html = html[:m.end()] + HEAD_ADD + html[m.end():]
    m = re.search(r'<script[^>]*src/intro\.js[^>]*></script>\n', html)
    if not m:
        sys.exit('원래 index.html에서 src/intro.js 줄을 못 찾았어요(인트로 모션그래픽을 끼울 자리). 손으로 확인해 주세요.')
    html = html[:m.end()] + INTRO_ADD + html[m.end():]
    m = re.search(r'<script[^>]*src/result\.js[^>]*></script>\n', html)
    if not m:
        sys.exit('원래 index.html에서 src/result.js 줄을 못 찾았어요(결과 화면 덧입히기를 끼울 자리). 손으로 확인해 주세요.')
    html = html[:m.end()] + RESULT_ADD + html[m.end():]
    html = html.replace('</body>', BODY_ADD + '</body>', 1)
    dst = ROOT / 'index.html'
    if not dst.exists() or dst.read_text(encoding='utf-8') != html:
        dst.write_text(html, encoding='utf-8')
        changed.append('index.html')

    # 4) 카드 그림이 바뀌었으면 3D 판 그림 다시
    if any(c.startswith('assets/card') for c in changed) or not (ROOT / 'src' / 'gl-tex.js').exists():
        subprocess.run([sys.executable, str(ROOT / 'tools' / 'build_gl_tex.py')], check=True)
        changed.append('src/gl-tex.js (다시 만듦)')

    print('가져온 것:' if changed else '바뀐 것 없음 — 3D 폴더가 원래 게임과 같아요.')
    for c in changed:
        print('  ·', c)
    if missing:
        print('원래 게임에 없는 그림(적혀만 있음):', ', '.join(missing))
    if extra:
        print('원래 게임엔 없고 3D 폴더에만 남은 src 파일(지워도 되는지 확인):', ', '.join(extra))


if __name__ == '__main__':
    main()

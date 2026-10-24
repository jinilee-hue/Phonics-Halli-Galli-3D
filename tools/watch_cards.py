#!/usr/bin/env python3
"""카드 그림 지켜보기 — 원래 게임 assets/card의 그림이 바뀌면 3D에 바로 반영 (사용자 요청 "수정되는거 있음 실시간 반영해")

  /usr/bin/python3 -u tools/watch_cards.py        (멈추기: Ctrl+C · 3시간 동안 바뀐 게 없으면 스스로 끝)

- 5초마다 card_*.png를 보고, 바뀐 게 있으면 30초 동안 더 안 바뀔 때까지 기다려요 (만드는 중인 그림을 피하려고)
- 그림이 끝까지 열리는지 확인 → tools/sync_from_original.py (카드 사본 · index.html) → 3D 저장소에 commit · push
  → 공유 링크(GitHub Pages)는 1~2분 뒤 반영. 내 컴퓨터(localhost:5182)는 새로고침하면 바로
- commit은 동기화가 만드는 것(gl/card-art.js · gl/card-tex.js · gl/media/cards · index.html · src · assets)만
- 원래 게임 저장소는 읽기만 해요
"""
import pathlib
import subprocess
import sys
import time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CARD = ROOT.parent / 'Phonics-Halli-Galli' / 'assets' / 'card'
POLL, QUIET, IDLE_MAX = 5, 30, 3 * 3600
PATHS = ['gl/card-art.js', 'gl/card-tex.js', 'gl/media/cards', 'index.html', 'src', 'assets']


def log(msg):
    print(time.strftime('[%H:%M:%S] ') + msg, flush=True)


def snap():
    out = {}
    for p in CARD.glob('card_*.png'):
        try:
            st = p.stat()
            out[p.name] = (st.st_mtime, st.st_size)
        except FileNotFoundError:
            pass
    return out


def unreadable(names):
    bad = []
    for n in names:
        p = CARD / n
        if not p.exists():
            continue
        try:
            with Image.open(p) as im:
                im.load()
        except Exception:
            bad.append(n)
    return bad


def sh(*cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


def ahead():
    r = sh('git', 'rev-list', '--count', 'origin/main..main')
    return int(r.stdout.strip() or 0) if r.returncode == 0 else 0


def push():
    r = sh('git', 'push', '-q', 'origin', 'main')
    if r.returncode:
        log('오류: push 실패 — 다음에 다시 해요 · ' + r.stderr.strip()[-200:])
        return False
    return True


def apply():
    r = sh(sys.executable, 'tools/sync_from_original.py')
    if r.returncode:
        log('오류: 동기화 실패 — ' + (r.stdout + r.stderr).strip()[-600:])
        return False
    st = sh('git', 'status', '--porcelain', '--', *PATHS).stdout.splitlines()
    if not st:
        log('사본이 이미 최신이에요')
        return True
    words = sorted({l[3:].strip().split('card_')[-1].rsplit('.', 1)[0] for l in st if 'gl/media/cards/' in l})
    sh('git', 'add', '-A', '--', *PATHS)
    msg = '카드 그림 실시간 반영: ' + (', '.join(words[:14]) + (' …' if len(words) > 14 else '') if words else '목록 · 페이지')
    c = sh('git', 'commit', '-q', '-m', msg, '--', *PATHS)
    if c.returncode:
        log('오류: commit 실패 — ' + (c.stdout + c.stderr).strip()[-300:])
        return False
    h = sh('git', 'log', '--oneline', '-1').stdout.strip()[:9]
    ok = push()
    log(f'반영: {len(words)}장 {" ".join(words)} → {h}{" (공유 링크는 1~2분 뒤)" if ok else " (push는 다음에)"}')
    return True


def main():
    log(f'지켜보기 시작: {CARD} (그림 {len(snap())}장)')
    last = snap()
    apply()                                              # 시작할 때 이미 바뀌어 있던 것부터
    pending, quiet_since, idle_since, push_try = set(), time.time(), time.time(), time.time()
    while True:
        time.sleep(POLL)
        now = snap()
        diff = {n for n in set(now) | set(last) if now.get(n) != last.get(n)}
        if diff:
            new = sorted(diff - pending)
            if new:
                log('바뀜: ' + ' '.join(n[5:-4] for n in new))
            pending |= diff
            quiet_since = time.time()
            last = now
            continue
        if pending and time.time() - quiet_since >= QUIET:
            bad = unreadable(pending)
            if bad:
                log('아직 쓰는 중인 그림이 있어 기다려요: ' + ' '.join(bad))
                quiet_since = time.time()
                continue
            if apply():
                pending = set()
            else:
                quiet_since = time.time()
            idle_since = time.time()
        if ahead() and time.time() - push_try > 60:      # 전에 push가 실패했으면 1분마다 다시
            push_try = time.time()
            if push():
                log('밀려 있던 commit을 올렸어요')
        if not pending and time.time() - idle_since > IDLE_MAX:
            log('3시간 동안 바뀐 그림이 없어 지켜보기를 끝내요')
            break


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log('지켜보기를 멈췄어요')

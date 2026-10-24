// HUD 시계 색 (3D 폴더 전용 · 사용자 요청 "시계 보라색이나 핑크 계열로"): 빨강 · 노랑 · 주황 · 파랑 → 핑크 · 보라 계열
//  · 원래 게임의 src/clock.js · assets/clock_parts는 그대로 — 그 스크립트가 만든 그림의 주소만 색 바꾼 복사본으로 바꿔 끼워요
//  · 복사본: tools/build_clock_color.py → gl/media/clock/<테마>/{body,hand_orange,hand_blue,still}.png (가운데 꼭지 cap은 원래 그대로)
//  · ?clock=purple(기본 — 파란 판 · 분홍 Coco 사이에서 가장 또렷해요) · ?clock=pink · ?clock=off(원래 색)
//  · src/clock.js 바로 뒤에 넣어요(동기화: tools/sync_from_original.py CLOCK_ADD). 복사본이 안 불러와지면 원래 그림으로 되돌려요
(() => {
  const THEMES = ['pink', 'purple'], DEF = 'purple', V = 1;
  const q = new URLSearchParams(location.search).get('clock');
  const theme = q === 'off' ? null : THEMES.includes(q) ? q : DEF;
  const host = document.getElementById('hudClock');
  if (!theme || !host) return;
  host.dataset.theme = theme;
  const dir = `./gl/media/clock/${theme}/`;
  const NAMES = { body: 1, hand_orange: 1, hand_blue: 1 };
  const parts = [];
  host.querySelectorAll('img').forEach(im => {
    const src = im.getAttribute('src') || '';
    const m = /clock_parts\/(\w+)\.png/.exec(src);
    const name = m ? m[1] : /time_icon\.png/.test(src) ? 'still' : null;
    if (!name || (m && !NAMES[name])) return;                 // cap(가운데 꼭지)은 원래 그대로
    im.dataset.orig = src;
    im.addEventListener('error', () => { if (im.dataset.orig) { im.src = im.dataset.orig; delete im.dataset.orig; } }, { once: true });
    im.src = `${dir}${name}.png?v=${V}`;
    if (im.classList.contains('ck-part')) parts.push(im);
  });
  // clock.js는 처음 그림이 다 풀리면 'live'(조각 보이기)를 붙여요 — 그림을 바꿨으니 새 그림 기준으로 다시
  const all = [...host.querySelectorAll('img.ck-part')];
  const ready = im => new Promise(res => {
    if (im.complete && im.naturalWidth) return res();
    const done = () => { if (im.complete && im.naturalWidth) { im.removeEventListener('load', done); res(); } };
    im.addEventListener('load', done);                         // 오류로 원래 그림으로 돌아가도 그 그림이 불러와지면 끝
  }).then(() => (im.decode ? im.decode().catch(() => {}) : 0));
  host.classList.remove('live');
  Promise.all(all.map(ready)).then(() => host.classList.add('live'));
})();

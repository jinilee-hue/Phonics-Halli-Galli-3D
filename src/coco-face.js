// Coco(왼쪽 친구) 표정과 몸짓 — 사용자가 준 그림(assets/coco.png)으로
//  · 그림 조각: tools/build_coco_parts.py 가 만든 assets/coco_parts/* + src/coco-parts.js (window.COCO_PARTS)
//  · 표정: main.js의 mood()가 #coco의 data-mood를 바꾸면 여기서 눈 · 입 모양을 골라 data-eyes · data-mouth로 알려 주고,
//          CSS(upgrade.css 'Coco 새 그림')가 그 모양을 보여 줘요
//      idle 기본 · think 눈동자를 위로 굴리며 입 꾹 · ready 눈 반짝 + 종 쪽 보기 + 작은 o 입 · happy/cheer 눈웃음 ^^ + 활짝 웃는 입
//      oops 질끈 > < + 물결 입 + 땀방울 · surprised 눈 크게 + 동그란 입 · sad 처진 눈 + 시무룩 입
//  · 몸짓(숨쉬기 · 통통 뛰기 · 흔들기 · 종 칠 때 기울기)은 예전 Coco처럼 .c-body 애니메이션 그대로 (style.css · upgrade.css)
//  · 여기서 더 하는 것: 깜빡임(가끔 두 번) · 가만히 있을 때 가끔 두리번
// 조각을 다 불러오기 전에는 원래 그림 한 장(still.webp)이 보여요. 조각 파일이 없으면 예전 꼬마종 Coco 그대로.
(() => {
  const P = window.COCO_PARTS, coco = document.getElementById('coco');
  const bodyEl = coco && coco.querySelector('.c-body');
  if (!P || !bodyEl) return;
  coco.dataset.look = 'art';
  coco.parentElement.classList.add('coco-art-on');
  const NS = 'http://www.w3.org/2000/svg';
  const pct = (v, t) => (v / t * 100).toFixed(3) + '%';
  const n = v => (+v).toFixed(1);

  // ── 층: 원래 그림(불러오는 동안) · 몸통(눈 · 입 지운 그림) · 볼 · 눈(흰자 + 눈동자) · 입 · 새로 그린 선
  const art = document.createElement('div');
  art.className = 'coco-art';
  const place = (el, p, box) => {
    const b = box || { x: 0, y: 0, w: P.W, h: P.H };
    Object.assign(el.style, { left: pct(p.x - b.x, b.w), top: pct(p.y - b.y, b.h), width: pct(p.w, b.w), height: pct(p.h, b.h) });
    if (p.cx != null) el.style.transformOrigin = `${n((p.cx - p.x) / p.w * 100)}% ${n((p.cy - p.y) / p.h * 100)}%`;
  };
  const img = (name, cls, parent, box) => {
    const im = new Image();
    im.className = cls; im.alt = ''; im.draggable = false;
    im.src = './assets/coco_parts/' + P[name].file;
    place(im, P[name], box);
    (parent || art).appendChild(im);
    return im;
  };
  const imgs = [];
  img('still', 'cf-still');
  imgs.push(img('body', 'cf-part cf-body'));
  if (P.blush_l && P.blush_l.file) imgs.push(img('blush_l', 'cf-part cf-blush l'), img('blush_r', 'cf-part cf-blush r'));
  for (const s of ['l', 'r']) {                       // 눈 = 흰자 상자 안에 눈동자 (눈을 키우거나 처지게 하면 눈동자도 같이)
    const e = P['eye_' + s];
    const box = document.createElement('div');
    box.className = 'cf-part cf-eyebox ' + s;
    place(box, e);
    imgs.push(img('eye_' + s, 'cf-eye', box, e));
    const iris = img('iris_' + s, 'cf-iris', box, e);
    iris.style.transformOrigin = '50% 50%';
    imgs.push(iris);
    art.appendChild(box);
  }
  imgs.push(img('mouth', 'cf-part cf-mouth'));

  // ── 새로 그리는 선 (그림 픽셀 좌표 · 선 색 · 굵기는 원래 입과 같게)
  const E = [P.eye_l, P.eye_r], sw = n(P.stroke * .95), ink = P.ink;
  const M = P.mouth, mx = M.cx, my = M.cy, mw = (M.core[2] - M.core[0]) / 2;
  const shut = e => `M${n(e.cx - .58 * e.r)} ${n(e.cy - 4)}Q${n(e.cx)} ${n(e.cy + .42 * e.r)} ${n(e.cx + .58 * e.r)} ${n(e.cy - 4)}`;
  const smile = e => `M${n(e.cx - .58 * e.r)} ${n(e.cy + .2 * e.r)}Q${n(e.cx)} ${n(e.cy - .62 * e.r)} ${n(e.cx + .58 * e.r)} ${n(e.cy + .2 * e.r)}`;
  const squint = (e, s) => `M${n(e.cx - s * .4 * e.r)} ${n(e.cy - .42 * e.r)}L${n(e.cx + s * .34 * e.r)} ${n(e.cy)}` +
                           `L${n(e.cx - s * .4 * e.r)} ${n(e.cy + .42 * e.r)}`;
  const happy = `M${n(mx - mw * 1.15)} ${n(my - mw * .42)}Q${n(mx)} ${n(my - mw * .2)} ${n(mx + mw * 1.15)} ${n(my - mw * .42)}` +
                `Q${n(mx + mw * 1.05)} ${n(my + mw * 1.2)} ${n(mx)} ${n(my + mw * 1.26)}Q${n(mx - mw * 1.05)} ${n(my + mw * 1.2)} ${n(mx - mw * 1.15)} ${n(my - mw * .42)}Z`;
  const wave = `M${n(mx - mw * 1.05)} ${n(my + 2)}` + [0, 1, 2, 3].map(i =>
    `Q${n(mx - mw * 1.05 + mw * .525 * (2 * i + 1) / 2)} ${n(my + (i % 2 ? 12 : -10))} ${n(mx - mw * 1.05 + mw * .525 * (i + 1))} ${n(my + 2)}`).join('');
  const sx = 752, sy = 548;                           // 땀방울: 얼굴 창 오른쪽 위 바깥
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'cf-part cf-lines');
  svg.setAttribute('viewBox', `0 0 ${P.W} ${P.H}`);
  const line = (cls, d, w = sw) => `<path class="${cls}" d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  svg.innerHTML =
    `<defs><clipPath id="cfMouthClip"><path d="${happy}"/></clipPath></defs>` +
    `<g class="cf-e-shut">${line('', shut(E[0]))}${line('', shut(E[1]))}</g>` +
    `<g class="cf-e-smile">${line('', smile(E[0]), n(P.stroke * 1.05))}${line('', smile(E[1]), n(P.stroke * 1.05))}</g>` +
    `<g class="cf-e-squint">${line('', squint(E[0], 1))}${line('', squint(E[1], -1))}</g>` +
    line('cf-m-flat', `M${n(mx - mw * .62)} ${n(my + 3)}L${n(mx + mw * .62)} ${n(my - 1)}`) +
    `<ellipse class="cf-m-o" cx="${n(mx)}" cy="${n(my + 4)}" rx="${n(mw * .36)}" ry="${n(mw * .44)}" fill="${ink}"/>` +
    `<ellipse class="cf-m-O" cx="${n(mx)}" cy="${n(my + 6)}" rx="${n(mw * .5)}" ry="${n(mw * .66)}" fill="${ink}"/>` +
    `<g class="cf-m-happy"><path d="${happy}" fill="${ink}" stroke="${ink}" stroke-width="8" stroke-linejoin="round"/>` +
    `<ellipse cx="${n(mx)}" cy="${n(my + mw * 1.08)}" rx="${n(mw * .62)}" ry="${n(mw * .4)}" fill="#EF8E9C" clip-path="url(#cfMouthClip)"/></g>` +
    line('cf-m-wavy', wave) +
    line('cf-m-frown', `M${n(mx - mw * .78)} ${n(my + mw * .34)}Q${n(mx)} ${n(my - mw * .44)} ${n(mx + mw * .78)} ${n(my + mw * .34)}`) +
    `<g class="cf-sweat"><path d="M${sx} ${sy - 30}C${sx + 15} ${sy - 8} ${sx + 18} ${sy + 8} ${sx} ${sy + 14}C${sx - 18} ${sy + 8} ${sx - 15} ${sy - 8} ${sx} ${sy - 30}Z" fill="#9fd8ff" stroke="#fff" stroke-width="4"/>` +
    `<ellipse cx="${sx - 5}" cy="${sy}" rx="4" ry="7" fill="#fff" opacity=".85"/></g>`;
  art.appendChild(svg);
  bodyEl.appendChild(art);
  Promise.all(imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})))
    .then(() => { if (imgs.every(im => im.complete && im.naturalWidth)) coco.classList.add('faced'); });

  // ── 기분(data-mood) → 눈 · 입 모양 · 눈동자 방향(눈동자 크기의 %)
  const LOOK = {
    idle:      {},
    think:     { mouth: 'flat', gx: -13, gy: -15 },              // 위로 눈동자를 굴리며 생각
    ready:     { eyes: 'wide', mouth: 'o', gx: 17, gy: 3 },      // 종 쪽(오른쪽)을 노려봄
    happy:     { eyes: 'smile', mouth: 'happy' },
    cheer:     { eyes: 'smile', mouth: 'happy' },
    oops:      { eyes: 'squint', mouth: 'wavy' },
    surprised: { eyes: 'wide', mouth: 'O', iris: 'small', gy: -4 },
    sad:       { eyes: 'droop', mouth: 'frown', gy: 16 },
  };
  let glance = null;
  const apply = () => {
    const L = LOOK[coco.dataset.mood] || {};
    coco.dataset.eyes = L.eyes || '';
    coco.dataset.mouth = L.mouth || '';
    coco.dataset.iris = L.iris || '';
    const g = (!L.eyes && !L.mouth && glance) || L;
    coco.style.setProperty('--gx', g.gx || 0);
    coco.style.setProperty('--gy', g.gy || 0);
  };
  new MutationObserver(apply).observe(coco, { attributes: true, attributeFilter: ['data-mood'] });
  apply();

  // ── 깜빡임 (가끔 두 번 연달아) · 가만히 있을 때 가끔 두리번
  const canBlink = () => !['smile', 'squint'].includes(coco.dataset.eyes) && !document.hidden;
  const blink = () => {
    if (!canBlink()) return;
    coco.dataset.blink = '';
    setTimeout(() => { delete coco.dataset.blink; }, 120);
  };
  let next = performance.now() + 1800, untilGlance = 3;
  setInterval(() => {
    const now = performance.now();
    if (now < next) return;
    blink();
    if (Math.random() < .3) setTimeout(blink, 260);
    if (--untilGlance <= 0 && (coco.dataset.mood || 'idle') === 'idle') {
      untilGlance = 2 + (Math.random() * 3 | 0);
      const s = Math.random() < .5 ? -1 : 1;
      glance = { gx: s * (9 + Math.random() * 6), gy: Math.random() * 6 - 2 };
      apply();
      setTimeout(() => { glance = null; apply(); }, 900 + Math.random() * 500);
    }
    next = now + 2400 + Math.random() * 2600;
  }, 150);

  window.CocoFace = { blink, apply };
})();

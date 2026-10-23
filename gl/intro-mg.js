/* ─────────────────────────────────────────────────────────────────────────────
   인트로 모션그래픽 — 영상(assets/intro.mp4)을 트는 대신, 시작 화면의 3D 종 · 카드 · 로고 · START를
   원래 영상과 같은 흐름으로 직접 움직여요. 소리는 영상의 소리만 뽑은 것(gl/media/intro.m4a)이라
   내레이션 · 음악 · 효과음 시각에 맞춰 움직여요 (아래 시각은 소리를 재서 얻은 값, 박 = 0.4737초).

     0.00 – 1.10   카메라가 가까이 · 낮게에서 뒤로 빠지며 시작 화면이 펼쳐짐 (카드는 종 둘레를 빠르게 돎)
     1.68·2.22·2.64  "Phonics · Halli · Galli" 낱말마다 로고가 통통 · 갸웃
     4.37 → 4.64   START가 로고 위에서 떨어져 종 아래에 착 (납작 → 통)
     4.95          "Are you ready to play?" 끝에 종이 윙크
     5.84 · 6.31   "start · begin"에 맞춰 START가 반짝 (빛 테두리)
     7.24 → 8.61   하얀 장갑 손이 오른쪽 아래에서 들어와 START를 꾹 (8.61 딸깍)
     8.86          띵! 종이 울림 (눈 꾹 · 납작 · 알록달록 물결) → 9.15 활짝 웃음
     8.95 → 10.0   카메라가 종으로 확 다가감
     10.0 → 10.85  다시 뒤로 빠지며 그대로 시작 화면 (화면이 바뀌는 끊김 없이)

   · 카메라: gl/view360.js의 판 변형(.felt)으로 3D를 움직이고, 같은 배율을 HTML 층(로고 · START · 손 · 카드 궤도 · 방 배경)에도 걸어요.
   · 소리 자동재생이 막히면 소리 없이 시작하고, 화면을 한 번 누르면 그 자리부터 소리가 나요. SKIP은 1.5초 뒤에.
   · 3D가 꺼진 기기(?q=html · WebGL 없음)는 원래 영상 인트로 그대로. ?intro=video 로 원래 영상도 볼 수 있어요.
   · 확인용: IntroMG.freeze(초) · IntroMG.live() · IntroMG.skip()
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
'use strict';
const orig = window.playIntro;                        // src/intro.js (영상 인트로)
const Q = new URLSearchParams(location.search);
const RM = matchMedia('(prefers-reduced-motion: reduce)');

const BEAT = .4737, B0 = .14;                         // 음악 126.66 BPM, 첫 박 0.14초
const END = 10.0, BACK = .85, ZMAX = 3.1;             // 영상 길이 · 시작 화면으로 돌아오는 시간 · 가장 가까이
const EV = { phonics: 1.68, halli: 2.22, galli: 2.64, drop: 4.37, land: 4.64, wink: 4.95, pulse: [5.84, 6.31],
             handIn: 7.24, hover: 8.2, down: 8.45, press: 8.61, ding: 8.86, happy: 9.15, ding2: 9.33, zoom: 8.95 };
const SPARK_AT = [[.84, .80], [.11, .60], [.90, .30], [.22, .88]];   // 탁자 위 반짝이 (화면 비율)

const clamp01 = v => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const outExpo = u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const outCubic = u => 1 - Math.pow(1 - u, 3);
const inCubic = u => u * u * u;
const inOutCubic = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const hop = (t, t0, d) => { const u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * (1 - .3 * u); };
const wobble = (t, t0, f, k) => { const u = t - t0; return u <= 0 ? 0 : Math.exp(-k * u) * Math.cos(2 * Math.PI * f * u); };

/* ── 카메라 (배율 · 높이 · 좌우) ── */
const sway = u => 1.6 * Math.sin(u * .55);
function cam(t) {
  if (RM.matches) return { zoom: 1, el: 0, az: 0 };
  if (t < 1.1) { const u = outExpo(seg(t, 0, 1.1)); return { zoom: lerp(1.42, 1, u), el: lerp(9, 0, u), az: lerp(-5, 0, u) }; }
  if (t < EV.zoom) return { zoom: 1 + .035 * inOutCubic(seg(t, 1.1, EV.zoom)), el: 0, az: sway(t - 1.1) };
  if (t < END + .05) { const u = inCubic(seg(t, EV.zoom, END - .05)); return { zoom: lerp(1.035, ZMAX, u), el: 0, az: sway(EV.zoom - 1.1) * (1 - u) }; }
  const u = inOutCubic(seg(t, END + .05, END + BACK));
  return { zoom: lerp(ZMAX, 1, u), el: 0, az: 0 };
}
// 카드 궤도 빠르기: 인트로 동안 1.7배 → 종으로 다가갈 때 3배 → 시작 화면에서 원래 빠르기 (orbit.js의 시계를 앞당김)
function orbitAt(t) {
  const a = Math.min(t, EV.zoom), b = Math.max(0, Math.min(t, END) - EV.zoom), c = Math.max(0, Math.min(t, END + BACK) - END);
  return 1.7 * a + 1.7 * b + 1.3 * b * b / (2 * (END - EV.zoom)) + 3 * c - 2 * c * c / (2 * BACK) + Math.max(0, t - END - BACK);
}

/* ── 상태 ── */
let app, box, skipBtn, logoImg, startBtn, bellImg, orbits, space, mg, cam2d, logoC, startC, rings, hand, sparks, poster, audio, arcs, arcPaths;
let L = null, onDone = null, t0 = 0, frozen = null, running = false, finished = false, skipping = null, lastCam = cam(0), evNext = 0;
let orbitExtra = 0, orbitFixed = null;

function clock() {
  if (frozen != null) return frozen;
  if (!t0) return 0;
  let t = (performance.now() - t0) / 1000;
  if (audio && !audio.paused && !audio.ended && audio.readyState >= 2 && t < END - .1) {   // 소리에 맞춰 살살 따라감
    const d = audio.currentTime - t;
    if (Math.abs(d) > .3) { t0 -= d * 1000; t += d; }
    else if (Math.abs(d) > .02) { t0 -= d * 100; t += d * .1; }
  }
  return t;
}
function orbitClock() {
  if (orbitFixed != null) return orbitFixed;
  if (running && t0) return t0 / 1000 + orbitAt(clock());
  return performance.now() / 1000 + orbitExtra;
}
function installOrbitClock() {
  const d = Object.getOwnPropertyDescriptor(window, 'ORBIT_T');
  if (d && d.get) return;
  if (window.ORBIT_T != null) orbitFixed = window.ORBIT_T;
  Object.defineProperty(window, 'ORBIT_T', { configurable: true, get: orbitClock, set: v => { orbitFixed = v; } });
}

/* ── 그림 층 ── */
const SPARK_SVG = '<svg class="mg-spark" viewBox="0 0 24 24"><path d="M12 0c.9 6.2 5.1 10.6 12 12-6.9 1.4-11.1 5.8-12 12-.9-6.2-5.1-10.6-12-12C6.9 10.6 11.1 6.2 12 0z"/></svg>';
// 종이 울릴 때 양옆 알록달록 물결 (영상처럼 굵게, 한쪽에 3줄): 반지름(종 폭 비율) · 색
const ARCS = [[.6, ['oklch(0.93 0.11 100)', 'oklch(0.93 0.11 100)']], [.74, ['oklch(0.84 0.1 355)', 'oklch(0.86 0.09 55)']],
              [.88, ['oklch(0.87 0.09 175)', 'oklch(0.85 0.08 230)']]];
function arcsSvg() {
  const U = 100 / 1.3, A = 36 * Math.PI / 180;                // 지름 2.6 × 종 폭 = viewBox 200
  let s = '<svg class="mg-arcs" viewBox="-100 -100 200 200">';
  ARCS.forEach(([r, col], i) => [-1, 1].forEach((side, j) => {
    const R = r * U, x = side * R * Math.cos(A), y = R * Math.sin(A);
    s += `<path data-i="${i}" stroke="${col[j]}" d="M${x.toFixed(2)} ${(-y).toFixed(2)} A${R.toFixed(2)} ${R.toFixed(2)} 0 0 ${side < 0 ? 0 : 1} ${x.toFixed(2)} ${y.toFixed(2)}"/>`;
  }));
  return s + '</svg>';
}
function build() {
  mg = document.createElement('div');
  mg.className = 'mg';
  mg.setAttribute('aria-hidden', 'true');
  mg.innerHTML = '<div class="mg-poster"></div><div class="mg-cam">' + SPARK_SVG.repeat(4) + arcsSvg() +
    `<img class="mg-logo" src="${logoImg.getAttribute('src')}" alt="" draggable="false">` +
    '<i class="mg-ring"></i><i class="mg-ring"></i><i class="mg-ring"></i>' +
    `<img class="mg-start" src="${startBtn.querySelector('img').getAttribute('src')}" alt="" draggable="false">` +
    '<img class="mg-hand" src="./assets/tap_hand.png?v=right" alt="" draggable="false"></div>';
  box.insertBefore(mg, box.firstChild);
  poster = mg.querySelector('.mg-poster');
  cam2d = mg.querySelector('.mg-cam');
  logoC = mg.querySelector('.mg-logo');
  startC = mg.querySelector('.mg-start');
  rings = [...mg.querySelectorAll('.mg-ring')];
  hand = mg.querySelector('.mg-hand');
  sparks = [...mg.querySelectorAll('.mg-spark')];
  arcs = mg.querySelector('.mg-arcs');
  arcPaths = [...arcs.querySelectorAll('path')];
}
const placeEl = (el, r) => { el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; };
function measure() {
  const vh = innerHeight / 100, lr = logoImg.getBoundingClientRect(), sr = startBtn.getBoundingClientRect();
  L = { vh, W: innerWidth, H: innerHeight, logo: lr, start: sr };
  placeEl(logoC, lr);
  placeEl(startC, sr);
  logoC.style.filter = getComputedStyle(logoImg).filter;
  startC.style.filter = getComputedStyle(startBtn).filter;
  rings.forEach(r => placeEl(r, { left: sr.left - .4 * vh, top: sr.top - .4 * vh, width: sr.width + .8 * vh, height: sr.height * .86 + .8 * vh }));
  const hh = 33 * vh, hw = hh * 758 / 1006;
  hand.style.width = hw + 'px'; hand.style.height = hh + 'px';
  L.hand = { w: hw, h: hh, tx: .38 * hw, ty: .03 * hh };
  SPARK_AT.forEach((p, i) => { sparks[i].style.left = p[0] * L.W + 'px'; sparks[i].style.top = p[1] * L.H + 'px'; });
  const bw = (r => (r ? r.x1 - r.x0 : 30 * vh))(Bell3D.screenRect()) * 2.6;
  // 카메라 기준점 = 3D 종 몸통 가운데: 판 좌표(.felt 변형의 기준점, 높이 포함) · 화면 좌표(HTML 층 배율 기준점)
  const B = window.Board3D, T = B.THREE, A = B.api;
  const p = new T.Vector3(0, .82, 0);
  Bell3D.root.updateMatrixWorld(true);
  Bell3D.root.localToWorld(p);
  const pb = p.clone().applyMatrix4(new T.Matrix4().copy(B.board.matrixWorld).invert());
  const fr = A.rectIn(document.querySelector('.felt'));
  L.origin = `${(pb.x - fr.x).toFixed(1)}px ${(-pb.y - fr.y).toFixed(1)}px ${pb.z.toFixed(1)}px`;
  const s = p.clone().project(B.camera), cr = B.renderer.domElement.getBoundingClientRect();
  L.S = { x: cr.left + (s.x + 1) / 2 * cr.width, y: cr.top + (1 - s.y) / 2 * cr.height };
  cam2d.style.transformOrigin = `${L.S.x.toFixed(1)}px ${L.S.y.toFixed(1)}px`;
  placeEl(arcs, { left: L.S.x - bw / 2, top: L.S.y - bw / 2, width: bw, height: bw });   // 물결은 종 몸통 가운데에
  space.style.scale = '';
  const gs = space.getBoundingClientRect();
  space.style.transformOrigin = `${(L.S.x - gs.left).toFixed(1)}px ${(L.S.y - gs.top).toFixed(1)}px`;
}

/* ── 한 장면 그리기: t(초)와 카메라만 보고 모든 걸 정해요 ── */
function setCam(c) {
  const V = View360.V;
  V.anim = null; V.vAz = V.vEl = 0;
  V.az = c.az; V.el = c.el; V.zoom = c.zoom; V.origin = L.origin;
  View360.apply();
  Board3D.kick();
}
function render(t, c) {
  const vh = L.vh, z = c.zoom;
  setCam(c);
  // HTML 층도 같은 배율로 (방 배경은 멀리 있어서 덜)
  cam2d.style.transform = z === 1 ? '' : `scale(${z.toFixed(4)})`;
  space.style.scale = z === 1 ? '' : Math.pow(z, .8).toFixed(4);
  const br = bellImg.getBoundingClientRect(), ox = br.left + br.width / 2, oy = br.top + br.height * .74;   // orbit.js 궤도 가운데
  orbits.forEach(o => { o.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`; o.style.scale = z === 1 ? '' : z.toFixed(4); });

  // 로고: "Phonics" 통통 · "Halli" 왼쪽 갸웃 · "Galli" 오른쪽 갸웃
  const hp = hop(t, EV.phonics, .42), hh = hop(t, EV.halli, .38), hg = hop(t, EV.galli, .4);
  logoC.style.transform = `translate3d(0, ${(-(2.4 * hp + 1.5 * hh + 1.5 * hg) * vh).toFixed(2)}px, 0) ` +
    `rotate(${(-2.4 * hh + 2.4 * hg).toFixed(2)}deg) scale(${(1 - .03 * hp).toFixed(4)}, ${(1 + .05 * hp).toFixed(4)})`;

  // START: 로고 위에서 떨어져 착 → 통 → 반짝 두 번 → 손가락에 꾹
  const sr = L.start;
  let sy = 0, sx = 1, sY = 1, op = 0;
  if (t >= EV.drop) {
    op = 1;
    if (RM.matches) op = seg(t, EV.drop, EV.land);
    else if (t < EV.land) {
      const u = seg(t, EV.drop, EV.land), top = L.logo.top + L.logo.height * .05 - sr.top;
      sy = top * (1 - u * u); sY = 1 + .14 * u; sx = 1 - .07 * u;            // 떨어지며 길쭉
    } else {
      const w = -wobble(t, EV.land, 2.4, 7.5);                              // 착(납작) → 통 → 제자리
      sY = 1 + .2 * w; sx = 1 - .13 * w;
      sy = -2.2 * vh * hop(t, EV.land + .06, .3);
    }
  }
  const pulse = 1 + .07 * (hop(t, EV.pulse[0], .32) + hop(t, EV.pulse[1], .32));
  const pr = seg(t, EV.press - .05, EV.press) - seg(t, EV.press + .3, EV.press + .48);    // 꾹 눌림
  sy += .8 * vh * pr;
  startC.style.opacity = op;
  startC.style.transform = `translate3d(0, ${sy.toFixed(2)}px, 0) scale(${(sx * pulse * (1 - .04 * pr)).toFixed(4)}, ${(sY * pulse * (1 - .05 * pr)).toFixed(4)})`;

  // 빛 테두리: 반짝 두 번 + 누를 때
  [EV.pulse[0], EV.pulse[1], EV.press].forEach((tr, i) => {
    const u = seg(t, tr, tr + .62), on = t > tr && u < 1, r = rings[i];
    r.style.opacity = on ? (.95 * Math.pow(1 - u, 1.2)).toFixed(3) : '0';
    r.style.transform = on ? `scale(${(1 + .34 * outCubic(u)).toFixed(4)}, ${(1 + .62 * outCubic(u)).toFixed(4)})` : '';
  });

  // 종 물결: 띵 두 번 (안쪽부터 60ms씩 차례로 퍼짐)
  arcPaths.forEach(pa => {
    const i = +pa.dataset.i;
    let o = 0, s = 1;
    [EV.ding, EV.ding2].forEach(tr => {
      const u = seg(t, tr + .06 * i, tr + .06 * i + .8);
      if (u > 0 && u < 1) { const v = Math.min(1, u / .14) * (1 - Math.max(0, (u - .4) / .6)); if (v > o) { o = v; s = .86 + .3 * outCubic(u); } }
    });
    pa.style.opacity = o.toFixed(3);
    pa.style.transform = o > 0 ? `scale(${s.toFixed(4)})` : '';
  });

  // 손: 오른쪽 아래에서 들어와 → START 위에서 잠깐 → 꾹 → 들고 사라짐 (손가락 끝 기준)
  const hd = L.hand, press = { x: sr.left + sr.width * .64, y: sr.top + sr.height * .42 };
  const hover = { x: press.x + 2.5 * vh, y: sr.top - 7 * vh }, off = { x: L.W + hd.w * .55, y: L.H + hd.h * .45 };
  let hop2 = 0, p = off, rot = -38, sq = 1;
  if (t >= EV.handIn && t < 9.9) {
    hop2 = 1 - seg(t, 9.45, 9.9);
    if (t < EV.hover) { const u = outCubic(seg(t, EV.handIn, EV.hover)); p = { x: lerp(off.x, hover.x, u), y: lerp(off.y, hover.y, u) }; rot = lerp(-38, -22, u); }
    else if (t < EV.down) { p = { x: hover.x, y: hover.y - .7 * vh * Math.sin(Math.PI * seg(t, EV.hover, EV.down)) }; rot = -22; }
    else if (t < EV.press) { const u = inCubic(seg(t, EV.down, EV.press)); p = { x: lerp(hover.x, press.x, u), y: lerp(hover.y, press.y, u) }; rot = lerp(-22, -16, u); }
    else { p = press; rot = -16; sq = 1 - .045 * Math.max(0, wobble(t, EV.press, 3, 8)); }
    if (t > 9.35) { const u = outCubic(seg(t, 9.35, 9.9)); p = { x: p.x + 3 * vh * u, y: p.y + 7 * vh * u }; }
  }
  if (RM.matches) { p = press; rot = -16; }
  hand.style.opacity = hop2.toFixed(3);
  hand.style.transform = hop2 > 0 ? `translate3d(${(p.x - hd.tx).toFixed(1)}px, ${(p.y - hd.ty).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sq.toFixed(4)})` : '';

  // 반짝이: 박마다 하나씩 차례로
  const k0 = Math.floor((t - B0) / BEAT);
  sparks.forEach((s, i) => {
    let v = 0;
    for (let k = k0 - 1; k <= k0; k++) if (k >= 0 && k % 4 === i) v = Math.max(v, hop(t, B0 + k * BEAT, .6));
    if (t > END) v = 0;
    s.style.opacity = v.toFixed(3);
    s.style.transform = `scale(${(.35 + .85 * v).toFixed(3)}) rotate(${(v * 40).toFixed(1)}deg)`;
  });
  lastCam = c;
}

/* ── 정해진 시각에 한 번씩: 윙크 · 띵 · 활짝 ── */
function ring(withFace) {
  const b = document.getElementById('bell');
  if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
  if (withFace && window.BellFace) BellFace.press();          // 소리는 인트로 소리에 이미 있어요 (main.js의 ding은 안 부름)
}
const EVENTS = [
  [EV.wink, () => window.BellFace && BellFace.wink()],
  [EV.ding, () => ring(true)],
  [EV.happy, () => window.BellFace && BellFace.pose('closed', 'happy', 1300)],   // 활짝 (종으로 다가가는 동안 내내)
  [EV.ding2, () => ring(false)],
];
function fire(t) {
  if (evNext > 0 && t < EVENTS[evNext - 1][0]) evNext = EVENTS.findIndex(e => e[0] > t), evNext = evNext < 0 ? EVENTS.length : evNext;
  while (evNext < EVENTS.length && EVENTS[evNext][0] <= t) {
    const [te, fn] = EVENTS[evNext++];
    if (t - te < .5) try { fn(); } catch (e) { console.error('[인트로] ', e); }
  }
}

/* ── 돌리기 ── */
function loop() {
  if (finished) return;
  let t = clock(), c;
  if (skipping) {
    const u = outCubic(seg(performance.now(), skipping.at, skipping.at + 420));
    c = { zoom: lerp(skipping.from.zoom, 1, u), el: lerp(skipping.from.el, 0, u), az: lerp(skipping.from.az, 0, u) };
    render(END + BACK, c);
    if (u >= 1) return finish();
  } else {
    render(t, cam(t));
    fire(t);
    if (t >= END + BACK && frozen == null) return finish();
  }
  requestAnimationFrame(loop);
}
function begin() {
  if (t0 || finished) return;
  t0 = performance.now() - (audio && !audio.paused ? audio.currentTime * 1000 : 0);
  running = true;
  Board3D.addPre(() => { if (finished || !running) return false; if (!skipping) setCam(cam(clock())); return true; });   // 3D가 자리를 읽기 직전에 같은 시각으로
  requestAnimationFrame(loop);
}
function start() {
  if (finished) return;
  installOrbitClock();
  measure();
  render(0, cam(0));
  app.classList.add('mg-intro');
  box.classList.add('mg');
  requestAnimationFrame(() => poster.classList.add('out'));
  audio.muted = false;
  audio.play().catch(() => { audio.muted = true; audio.play().catch(() => {}); });
  audio.addEventListener('playing', begin, { once: true });
  setTimeout(begin, 450);                                   // 소리가 못 나도 그림은 시작
}
function unmute() {
  if (finished || !audio) return;
  audio.muted = false;
  const t = clock();
  if (audio.paused && !skipping && t < END - .15) {
    try { audio.currentTime = Math.max(0, t); } catch (e) { /* 아직 못 읽음 */ }
    audio.play().catch(() => {});
  }
}
function skip() {
  if (finished || skipping) return;
  if (!L) { finish(); return; }                             // 아직 시작 전(그림 · 소리 준비 중): 바로 시작 화면으로
  skipping = { at: performance.now(), from: lastCam };
  if (audio) audio.pause();
  if (!t0) begin();
}
function finish() {
  if (finished) return;
  finished = true;
  if (audio) audio.pause();
  orbitExtra = (t0 ? t0 / 1000 + orbitAt(Math.min(clock(), END + BACK)) : performance.now() / 1000) - performance.now() / 1000;
  running = false;
  const V = View360.V;
  V.az = V.el = 0; V.zoom = 1; V.origin = '';
  View360.apply(); Board3D.kick();
  cam2d.style.transform = ''; space.style.scale = ''; space.style.transformOrigin = '';
  orbits.forEach(o => { o.style.scale = ''; o.style.transformOrigin = ''; });
  Board3D.api.pointer.hold = false;
  app.classList.add('mg-done');
  try { onDone && onDone(); } catch (e) { console.error('[인트로] ', e); }
  setTimeout(() => box.remove(), 450);                      // 진짜 로고 · START가 다 나타난 뒤에 겹쳐 둔 그림을 걷어요
}

function run(done) {
  onDone = done;
  app = document.getElementById('app'); box = document.getElementById('intro'); skipBtn = document.getElementById('introSkip');
  logoImg = document.querySelector('.logo img'); startBtn = document.getElementById('start'); bellImg = document.querySelector('.bell-img');
  orbits = [...document.querySelectorAll('.orbit')]; space = document.querySelector('.gl-space');
  const video = document.getElementById('introVideo');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); video.style.display = 'none'; }   // 영상은 안 받아요
  build();
  audio = new Audio('./gl/media/intro.m4a');
  audio.preload = 'auto';
  Board3D.api.pointer.hold = true;                          // 인트로 동안 손 따라 시점은 쉬기
  skipBtn.addEventListener('click', e => { e.stopPropagation(); skip(); });
  box.addEventListener('pointerdown', e => { if (!(e.target.closest && e.target.closest('#introSkip'))) unmute(); });
  setTimeout(() => skipBtn.classList.add('show'), 1500);
  addEventListener('resize', () => { if (!finished && L) measure(); });
  // 3D 종 · 그림 · 소리가 준비되면 시작 (최대 4초 기다림)
  const imgs = [logoImg, startBtn.querySelector('img'), hand], w0 = performance.now();
  (function wait() {
    if (finished) return;
    const el = performance.now() - w0;
    const ok = Bell3D.root.visible && imgs.every(i => i.complete) && (audio.readyState >= 3 || el > 2500);
    if (ok || el > 4000) start(); else setTimeout(wait, 60);
  })();
}

window.playIntro = function playIntro(done) {
  const go = () => {
    const B = window.Board3D;
    const can = Q.get('intro') !== 'video' && B && !B.off && window.View360 && window.Bell3D && document.getElementById('intro') &&
      document.querySelector('.gl-space') && document.querySelector('.logo img') && document.getElementById('start');
    if (!can) return orig ? orig(done) : done && done();
    try { run(done); } catch (e) { console.error('[인트로] 모션 인트로를 못 열어서 영상으로', e); if (orig) orig(done); else if (done) done(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });   // 3D 스크립트가 다 읽힌 뒤
  else go();
};
window.IntroMG = {
  freeze(t) { frozen = t; if (audio) audio.pause(); if (!t0) begin(); fire(t); if (L) render(t, cam(t)); },
  live() { if (frozen != null) { t0 = performance.now() - frozen * 1000; frozen = null; } },
  skip, get t() { return clock(); }, get running() { return running; }, get audio() { return audio; }, cam, orbitAt,
};
})();

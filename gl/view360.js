/* ─────────────────────────────────────────────────────────────────────────────
   360° 돌려 보기 (WebGL 판 · 종 · Coco)
   · 판 위 빈 곳을 끌기: 판 전체가 빙글 (좌우 = 한 바퀴 360°, 위아래 = 바로 위에서 ~ 탁자 높이 옆에서) · 놓으면 미끄러지듯 멈춤
   · 두 손가락 벌리기 / 마우스 휠: 가까이 · 멀리
   · Coco를 끌기(게임 화면) · 종을 끌기(시작 화면): 캐릭터만 한 바퀴 (좌우로 끌면 빙글 · 위아래로 끌면 앞뒤 공중돌기) → 놓으면 스르르 정면으로
   · Coco를 콕(끌지 않고 톡): 통통 + 눈웃음
   · 오른쪽 위 360° 버튼: 정면이면 한 바퀴 빙 둘러보고 돌아오기 · 돌아가 있으면 정면으로
   · 빈 곳 두 번 톡: 정면으로
   어떻게: 판(.felt)에 CSS 회전을 걸어요 → HTML 판(누르는 자리 · 내 차례 손 · 점선 · 말풍선)이 3D와 같이 돌아서
           돌려 둔 채로도 게임이 그대로 돼요. 종 · Coco의 HTML 그림판은 반대로 돌려서 늘 카메라를 보게(말풍선 · 종 누르는 자리용)
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
'use strict';
const B = window.Board3D;
if (!B || B.off) return;
const A = B.api, app = document.getElementById('app');
const felt = document.querySelector('.felt'), bellSpot = document.querySelector('.bell-spot'), cocoSpot = document.getElementById('cocoSpot');
if (!felt) return;

const V = { az: 0, el: 0, zoom: 1, vAz: 0, vEl: 0, anim: null, origin: '' };   // az · el: 도(°) · origin: 돌리는 가운데를 따로 정할 때
const TILT = 40;                                                  // 원래 탁자 기울기 (style.css .table rotateX)
const EL_MIN = -TILT, EL_MAX = 42, Z_MIN = .72, Z_MAX = 1.55;     // 기울기 0°(바로 위에서) ~ 82°(탁자 높이, 옆에서)
const EL_PX = 100;                                                // 화면 높이만큼 위아래로 끌면 100°
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isDefault = () => Math.abs(V.az % 360) < .05 && Math.abs(V.el) < .05 && Math.abs(V.zoom - 1) < .002;
const screen = () => app.dataset.screen;

/* ── 360° 버튼 (오른쪽 위, 소리 버튼 앞) ── */
const btn = document.createElement('button');
btn.className = 'hud-btn';
btn.id = 'btnView';
btn.setAttribute('aria-label', '360° 돌려 보기');
btn.innerHTML =
  // 360° 아이콘: 정육면체 + 아래를 도는 고리 화살표 (전 아이콘은 선이 서로 엇갈려 작은 크기에서 낙서처럼 깨져 보였어요)
  '<svg class="ic-360" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2 16.2 6.4 12 8.6 7.8 6.4Z"/>' +
  '<path d="M7.8 6.4v4.4L12 13l4.2-2.2V6.4"/><path d="M12 8.6V13"/>' +
  '<path d="M4.77 13A9.2 4.2 0 1 0 19.23 13"/><path d="M20.32 15.36 19.23 13l2.59-.22"/></svg>' +
  '<svg class="ic-front" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 9.2A8 8 0 1 1 4 12"/><path d="M4.2 4.6v4.8H9"/>' +
  '<circle cx="12" cy="12" r="2.2"/></svg>';
const hudR = document.querySelector('.hud-r');
if (hudR) hudR.insertBefore(btn, hudR.firstChild);
btn.addEventListener('click', () => {
  if (isDefault() && !V.anim) tour(); else home(700);
});
function paintBtn() {
  const turned = !isDefault() || (V.anim && V.anim.kind === 'tour');
  btn.classList.toggle('turned', !isDefault() && !(V.anim && V.anim.kind === 'tour'));
  btn.setAttribute('aria-label', btn.classList.contains('turned') ? '정면으로' : '360° 돌려 보기');
  app.classList.toggle('view-turned', turned);
}

/* ── 움직임: 정면으로 · 한 바퀴 둘러보기 ── */
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function home(ms) {
  const az0 = V.az, near = Math.round(az0 / 360) * 360;           // 가장 가까운 정면으로 (돌던 방향 그대로)
  V.anim = { kind: 'home', t0: A.now(), ms, from: { az: az0, el: V.el, zoom: V.zoom }, to: { az: near, el: 0, zoom: 1 } };
  V.vAz = V.vEl = 0; B.kick();
}
function tour() {                                                  // 한 바퀴 빙 둘러보기 (조금 낮게 내려갔다 올라옴)
  V.anim = { kind: 'tour', t0: A.now(), ms: 5200, from: { az: V.az, el: 0, zoom: 1 }, to: { az: V.az - 360, el: 0, zoom: 1 } };
  V.vAz = V.vEl = 0; B.kick();
}
function stepAnim() {
  const a = V.anim;
  const k = clamp((A.now() - a.t0) / a.ms, 0, 1), e = ease(k);   // 실제 시간 기준 (장면이 느리게 그려지는 기기도 정해진 시간에 끝남)
  V.az = a.from.az + (a.to.az - a.from.az) * e;
  V.el = a.from.el + (a.to.el - a.from.el) * e + (a.kind === 'tour' ? Math.sin(Math.PI * k) * 12 : 0);
  V.zoom = a.from.zoom + (a.to.zoom - a.from.zoom) * e - (a.kind === 'tour' ? Math.sin(Math.PI * k) * .08 : 0);
  if (k >= 1) { V.anim = null; V.az = a.to.az; V.el = a.to.el; V.zoom = a.to.zoom; }
}

/* ── CSS에 걸기 (자리 읽기 바로 전, gl/board3d.js의 매 장면에서) ── */
let originKey = '', originTitle = false, lastCss = '';
// 돌리는 가운데: 게임 = 판 가운데 / 시작 화면 = 3D 종 받침 가운데 (판이 안 보이고 종만 있어서 종이 제자리에서 돌게)
function origin() {
  if (screen() === 'title' && bellSpot && window.Bell3D) {
    const r = A.rectIn(bellSpot), f = A.rectIn(felt);
    return { css: `${(r.cx - f.x).toFixed(1)}px ${(r.cy - f.y - Bell3D.baseOffset()).toFixed(1)}px`, title: true };
  }
  return { css: '50% 50%', title: false };
}
const RAD = Math.PI / 180;
function apply() {
  if (isDefault()) {
    V.az = 0;
    if (lastCss) {                   // 정면이면 원래 그대로 (CSS 비움)
      felt.style.transform = felt.style.transformOrigin = '';
      [bellSpot, cocoSpot].forEach(el => { if (el) { el.style.transform = ''; el.style.transformOrigin = ''; } });
      lastCss = '';
    }
    const o = origin();              // 정면일 때만 돌리는 가운데를 바꿈 (돌리는 중에 바뀌면 판이 튀어서)
    originKey = o.css; originTitle = o.title;
    B.view.turned = false; B.view.az = B.view.el = 0; B.view.azCss = '';
    return;
  }
  // 위에서 내려다볼수록 판이 덜 눕혀져 화면보다 커지니, 원래 크기로 보이게 살짝 작게 (게임 화면만 · 시작 화면은 종만 있어서)
  const fit = !originTitle && V.el < 0 ? Math.cos(TILT * RAD) / Math.cos((TILT + V.el) * RAD) : 1;
  const css = `rotateX(${V.el.toFixed(3)}deg) rotateZ(${V.az.toFixed(3)}deg) scale(${(V.zoom * fit).toFixed(4)})`;
  if (css !== lastCss) {
    felt.style.transformOrigin = V.origin || originKey || origin().css;   // V.origin: 인트로(gl/intro-mg.js)가 종 몸통 가운데로
    felt.style.transform = css;
    // 종 · Coco HTML 그림판은 판이 돈 만큼(좌우 · 위아래) 되돌려서 늘 원래 모습으로 (말풍선 · 시작 화면 카드 궤도 · 종 자리)
    // 되돌리는 축 = 3D 캐릭터가 서 있는 곳 (종: 받침 가운데, Coco: 발) → 3D와 같은 자리를 따라가요
    const back = `rotateZ(${(-V.az).toFixed(3)}deg) rotateX(${(-V.el).toFixed(3)}deg)`;
    if (bellSpot) {
      const s = A.NUM(getComputedStyle(bellSpot).scale) || 1, d = window.Bell3D ? Bell3D.baseOffset() / s : 0;
      bellSpot.style.transform = `translate3d(0, ${(-d).toFixed(2)}px, 0) ${back} translate3d(0, ${d.toFixed(2)}px, 0)`;
    }
    if (cocoSpot) { cocoSpot.style.transformOrigin = '50% 80%'; cocoSpot.style.transform = back; }
    lastCss = css;
  }
  B.view.turned = true; B.view.az = V.az; B.view.el = V.el;
  B.view.azCss = `rotateZ(${V.az.toFixed(3)}deg) scale(${(V.zoom * fit).toFixed(4)})`;   // 위아래를 뺀 판 (gl/board3d.js)
}
B.addPre(dt => {
  let moving = false;
  if (V.anim) { stepAnim(); moving = true; }
  else if (!drag || !drag.moved) {
    if (Math.abs(V.vAz) > .0005 || Math.abs(V.vEl) > .0005) {      // 놓은 뒤 미끄러지기
      V.az += V.vAz * dt; V.el = clamp(V.el + V.vEl * dt, EL_MIN, EL_MAX);
      const f = Math.exp(-dt / 480); V.vAz *= f; V.vEl *= f; moving = true;
    } else V.vAz = V.vEl = 0;
  }
  apply();
  paintBtn();
  return moving || (drag && drag.moved);
});
// 시작 화면 ↔ 게임으로 바뀌면 정면으로
new MutationObserver(() => { if (!isDefault() || V.anim) home(600); }).observe(app, { attributes: true, attributeFilter: ['data-screen'] });

/* ── 끌기 · 두 손가락 · 휠 ── */
let drag = null, lastTap = { t: 0, x: 0, y: 0 };
const fingers = new Map();
let pinch = null;
const inRect = (r, x, y) => r && x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
function blocked(e) {
  if (app.classList.contains('intro-on')) return true;              // 인트로 영상 중엔 안 돌림
  const t = e.target;
  if (!t || !t.closest) return true;
  if (t.closest('.verdict.show, .hud, .vol, .level, #start, #replay, #hit0, .intro')) return true;
  if (t.closest('#hitBell') && screen() === 'game') return true;      // 게임 중 종은 누르기(치기)만
  return false;
}
addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (fingers.size === 2 && !blocked(e)) {                          // 두 손가락: 가까이 · 멀리
    const [a, b] = [...fingers.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: V.zoom };
    if (drag) {
      [spinOf(drag.mode), flipOf(drag.mode)].forEach(sp => { if (sp) sp.held = false; });
      drag.moved = true; drag.mode = 'pinch';
    }
    return;
  }
  if (drag || blocked(e)) return;
  let mode = 'orbit';
  const x = e.clientX, y = e.clientY;
  if (screen() === 'game' && window.Coco3D && inRect(A.screenRectOf(Coco3D.pivot), x, y)) mode = 'coco';
  else if (screen() === 'title' && window.Bell3D && (e.target.closest('#hitBell') || inRect(Bell3D.screenRect(), x, y))) mode = 'bell';
  drag = { id: e.pointerId, mode, x0: x, y0: y, x, y, moved: false, hist: [], spin0: 0 };
  V.anim = null;
  if (mode === 'orbit') { V.vAz = V.vEl = 0; }
}, { passive: true });
function spinOf(mode) { return mode === 'coco' ? window.Coco3D && Coco3D.spin : mode === 'bell' ? window.Bell3D && Bell3D.spin : null; }
function flipOf(mode) { return mode === 'coco' ? window.Coco3D && Coco3D.flip : mode === 'bell' ? window.Bell3D && Bell3D.flip : null; }
function move(id, x, y) {
  if (fingers.has(id)) fingers.set(id, { x, y });
  if (pinch && fingers.size >= 2) {
    const [a, b] = [...fingers.values()];
    V.zoom = clamp(pinch.z0 * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.d0, Z_MIN, Z_MAX);
    B.kick(); return;
  }
  if (!drag || id !== drag.id) return;
  const dx = x - drag.x, dy = y - drag.y, now = performance.now();
  drag.x = x; drag.y = y;
  if (!drag.moved) {
    if (Math.hypot(x - drag.x0, y - drag.y0) < 9) return;
    drag.moved = true;
    A.pointer.hold = true;                                         // 끄는 동안은 손 따라 시점 쉬기
    app.classList.add('dragging');
    // 캐릭터는 처음 끈 쪽으로만 (좌우면 빙글 · 위아래면 공중돌기) → 흔들리지 않게
    drag.axis = Math.abs(x - drag.x0) >= Math.abs(y - drag.y0) ? 'x' : 'y';
    [spinOf(drag.mode), flipOf(drag.mode)].forEach(sp => { if (sp) { sp.held = true; sp.settling = false; } });
  }
  const W = innerWidth, H = innerHeight;
  if (drag.mode === 'orbit') {
    V.az -= dx * 360 / (W * .9);                                   // 화면 폭만큼 끌면 약 한 바퀴
    V.el = clamp(V.el - dy * EL_PX / H, EL_MIN, EL_MAX);           // 아래로 끌면 위에서 보기 · 위로 끌면 낮게(옆에서)
  } else {
    const sp = spinOf(drag.mode), fl = flipOf(drag.mode);
    if (sp && drag.axis === 'x') sp.angle += dx * Math.PI * 2 / (W * .45);
    if (fl && drag.axis === 'y') fl.angle -= dy * Math.PI * 2 / (H * .7);   // 아래로 끌면 앞으로 · 위로 끌면 뒤로 공중돌기
  }
  drag.hist.push({ t: now, dx, dy });
  while (drag.hist.length && now - drag.hist[0].t > 90) drag.hist.shift();
  B.kick();
}
addEventListener('pointermove', e => move(e.pointerId, e.clientX, e.clientY), { passive: true });
addEventListener('touchmove', e => {                               // 브라우저가 끌기를 가로채(pointercancel) 버려도 한 손가락 끌기는 계속
  if (drag && drag.lost && e.touches.length === 1) move(drag.id, e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
function end(e) {
  fingers.delete(e.pointerId);
  if (pinch && fingers.size < 2) pinch = null;
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  A.pointer.hold = false;
  app.classList.remove('dragging');
  const now = performance.now(), h = d.hist.filter(p => now - p.t < 90);
  const span = h.length ? Math.max(16, now - h[0].t) : 16;
  const vx = h.reduce((s, p) => s + p.dx, 0) / span, vy = h.reduce((s, p) => s + p.dy, 0) / span;   // 화면 px/ms
  if (d.moved && d.mode === 'orbit') {                              // 미끄러짐은 최대 약 반 바퀴까지
    V.vAz = clamp(-vx * 360 / (innerWidth * .9), -.32, .32); V.vEl = clamp(-vy * EL_PX / innerHeight * .4, -.06, .06);
  }
  else if (d.moved && d.mode !== 'pinch') {
    const sp = spinOf(d.mode), fl = flipOf(d.mode);
    if (sp) { sp.vel = d.axis === 'x' ? clamp(vx * Math.PI * 2 / (innerWidth * .45), -.02, .02) : 0; sp.held = false; }
    if (fl) { fl.vel = d.axis === 'y' ? clamp(-vy * Math.PI * 2 / (innerHeight * .7), -.02, .02) : 0; fl.held = false; }
  }
  else if (!d.moved) {
    if (d.mode === 'coco' && window.Coco3D) Coco3D.poke();         // 콕
    if (d.mode === 'orbit') {                                      // 빈 곳 두 번 톡 → 정면으로
      if (now - lastTap.t < 320 && Math.hypot(d.x - lastTap.x, d.y - lastTap.y) < 40 && !isDefault()) home(650);
      lastTap = { t: now, x: d.x, y: d.y };
    }
  }
  B.kick();
}
addEventListener('pointerup', end, { passive: true });
addEventListener('pointercancel', e => {                           // 터치를 브라우저가 가져가도 손가락 자리는 touchmove로 계속
  if (drag && e.pointerId === drag.id && e.pointerType === 'touch') { drag.lost = true; fingers.delete(e.pointerId); return; }
  end(e);
}, { passive: true });
addEventListener('touchend', e => { if (drag && drag.lost && e.touches.length === 0) end({ pointerId: drag.id }); }, { passive: true });
addEventListener('wheel', e => {                                   // 휠 · 트랙패드 두 손가락: 가까이 · 멀리
  if (app.classList.contains('intro-on') || (e.target.closest && e.target.closest('.hud, .vol, .verdict.show'))) return;
  V.zoom = clamp(V.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), Z_MIN, Z_MAX);
  V.anim = null; B.kick();
}, { passive: true });

window.View360 = { V, home, tour, isDefault, apply,
  set(o) { V.anim = null; V.vAz = V.vEl = 0; if (o.az != null) V.az = o.az; if (o.el != null) V.el = clamp(o.el, EL_MIN, EL_MAX); if (o.zoom != null) V.zoom = clamp(o.zoom, Z_MIN, Z_MAX); B.kick(); } };
})();

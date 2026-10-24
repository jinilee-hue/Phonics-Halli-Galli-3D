/* ─────────────────────────────────────────────────────────────────────────────
   Coco 3D (WebGL) — assets/coco.png 그림을 보고 만든 3D 모형
   · 모양: 분홍 손종 껍데기(안쪽은 진한 분홍) + 꼭대기 고리 + 껍데기 아래 작은 몸 · 팔 · 다리
   · 얼굴: 그림의 얼굴 창(tools/build_coco_face.py) 위에 눈 · 눈동자 · 입 · 볼을 표정대로 그려 껍데기에 입힘
           (카메라 쪽에서 비춰 입혀서 그림처럼 반듯하게)
   · 표정: src/coco-face.js가 정하는 대로 (#coco의 data-eyes · data-mouth · data-iris · data-blink · --gx · --gy · data-mood)
   · 몸짓: 원래 CSS 움직임(.c-body의 숨쉬기 · 통통 · 흔들 · 종 쪽으로 기울기 · 시무룩)을 매 순간 읽어서 그대로
   · 자리 · 크기: 원래 HTML Coco(.coco-spot · #coco) 자리 그대로 (시작 화면에선 숨음)
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
'use strict';
const B = window.Board3D, P = window.COCO_PARTS;
const cocoEl = document.getElementById('coco'), spotEl = document.getElementById('cocoSpot');
const cBody = cocoEl && cocoEl.querySelector('.c-body');
if (!B || B.off || !P || !cocoEl || !spotEl || !cBody) return;
const T = B.THREE, A = B.api, app = document.getElementById('app');
const U = 531;                                   // 그림 픽셀 → 3D 단위 (껍데기 테 반지름 = 1)
const hOf = y => (1137 - y) / U;                 // 그림 y → 바닥에서 높이

/* ── 모양 (반지름, 높이) — 그림 줄별 폭에서 ── */
const OUTER = [[.93, .37], [.975, .39], [.995, .42], [.999, .446], [.99, .48], [.962, .52], [.925, .56], [.892, .6], [.864, .635],
  [.845, .672], [.83, .71], [.818, .75], [.805, .82], [.795, .93], [.79, 1.01], [.779, 1.12], [.767, 1.2], [.752, 1.275],
  [.73, 1.35], [.698, 1.426], [.653, 1.5], [.591, 1.576], [.507, 1.652], [.42, 1.7], [.3, 1.745], [.16, 1.772], [0, 1.78]];
const INNER = [[0, 1.73], [.15, 1.722], [.29, 1.695], [.4, 1.65], [.48, 1.6], [.55, 1.53], [.61, 1.45], [.66, 1.37], [.69, 1.28],
  [.715, 1.2], [.73, 1.1], [.74, 1], [.75, .9], [.765, .8], [.785, .72], [.81, .66], [.84, .6], [.875, .54], [.905, .48],
  [.92, .43], [.925, .39], [.93, .37]];
const KID = [[0, .1], [.18, .11], [.26, .15], [.29, .22], [.3, .3], [.3, .45], [.26, .55], [0, .58]];
const FACE = { x0: 255, y0: 465, w: 560, h: 335, cx: 533, cy: 632 };
// 크기, 보이는 각도: Coco 그림은 거의 정면이라 종보다 낮게(12°) — 넓은 치마 테 아래로 작은 팔다리가 보이게
let FACE_K = 1.15, SIZE = .86, VIEW = 12, FACE_DY = .06;

const smoothPts = (pts, n) => {
  const c = new T.SplineCurve(pts.map(([r, y]) => new T.Vector2(r, y)));
  c.arcLengthDivisions = 300;
  return c.getSpacedPoints(n).map(v => new T.Vector2(Math.max(0, v.x), v.y));
};

/* ── 재질 (그림 분홍: 밝은 곳 #f5b5d0 · 중간 #e594b4) — 종처럼 밝기 압축 없이 은은한 자체 밝기 ── */
const pink = new T.MeshPhysicalMaterial({ color: new T.Color('#f7a6c6'), emissive: new T.Color('#5a1f38'), roughness: .55,
  clearcoat: .15, clearcoatRoughness: .5, envMapIntensity: 1.8, toneMapped: false });
const pinkIn = new T.MeshPhysicalMaterial({ color: new T.Color('#d8789f'), emissive: new T.Color('#33101f'), roughness: .7,
  envMapIntensity: 1.2, toneMapped: false });
const kidPink = new T.MeshPhysicalMaterial({ color: new T.Color('#f294bb'), emissive: new T.Color('#4a1830'), roughness: .5,
  clearcoat: .2, envMapIntensity: 1.6, toneMapped: false });

/* ── 얼굴 그림 (캔버스) ── */
const fc = document.createElement('canvas');
fc.width = 1024; fc.height = Math.round(1024 * FACE.h / FACE.w);
const fg = fc.getContext('2d');
const faceTex = new T.CanvasTexture(fc);
faceTex.colorSpace = T.SRGBColorSpace; faceTex.anisotropy = 8;
faceTex.wrapS = faceTex.wrapT = T.ClampToEdgeWrapping;
// 눈동자는 따로 한 층: 손 쪽을 볼 때 그림을 다시 그리지 않고 그림 자리(offset)만 옮겨요
const ic = document.createElement('canvas');
ic.width = fc.width; ic.height = fc.height;
const ig = ic.getContext('2d');
const irisTex = new T.CanvasTexture(ic);
irisTex.colorSpace = T.SRGBColorSpace; irisTex.anisotropy = 8;
irisTex.wrapS = irisTex.wrapT = T.ClampToEdgeWrapping;
const img = {};
let left = 0;
['face_base.webp', 'eye_l.png', 'eye_r.png', 'iris_l.png', 'iris_r.png', 'mouth.png', 'blush_l.png', 'blush_r.png'].forEach(f => {
  const im = new Image();
  left++;
  im.onload = () => { left--; B.kick(); };
  im.onerror = () => { left--; console.warn('[Coco 3D] 얼굴 조각을 못 읽었어요:', f); };
  im.src = (window.GL_TEX && GL_TEX['coco_parts/' + f]) || './assets/coco_parts/' + f;
  img[f.split('.')[0]] = im;
});
const ink = P.ink, sw = P.stroke * .95;
const M = P.mouth, mx = M.cx, my = M.cy, mw = (M.core[2] - M.core[0]) / 2;
const E = { l: P.eye_l, r: P.eye_r };
const draw = (g, im, x, y, w, h) => { if (im && im.naturalWidth) g.drawImage(im, x, y, w, h); };
function stroke(g, w) { g.lineWidth = w || sw; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink; g.stroke(); }
function eyeLine(g, kind, e, s) {
  g.beginPath();
  if (kind === 'shut') { g.moveTo(e.cx - .58 * e.r, e.cy - 4); g.quadraticCurveTo(e.cx, e.cy + .42 * e.r, e.cx + .58 * e.r, e.cy - 4); stroke(g); }
  else if (kind === 'smile') { g.moveTo(e.cx - .58 * e.r, e.cy + .2 * e.r); g.quadraticCurveTo(e.cx, e.cy - .62 * e.r, e.cx + .58 * e.r, e.cy + .2 * e.r); stroke(g, P.stroke * 1.05); }
  else { g.moveTo(e.cx - s * .4 * e.r, e.cy - .42 * e.r); g.lineTo(e.cx + s * .34 * e.r, e.cy); g.lineTo(e.cx - s * .4 * e.r, e.cy + .42 * e.r); stroke(g); }
}
function happyPath(g) {
  g.beginPath(); g.moveTo(mx - mw * 1.15, my - mw * .42); g.quadraticCurveTo(mx, my - mw * .2, mx + mw * 1.15, my - mw * .42);
  g.quadraticCurveTo(mx + mw * 1.05, my + mw * 1.2, mx, my + mw * 1.26); g.quadraticCurveTo(mx - mw * 1.05, my + mw * 1.2, mx - mw * 1.15, my - mw * .42); g.closePath();
}
// 표정 상태 (부드럽게 바뀌는 값은 따라감)
const S = { eyeS: 1, eyeSy: 1, eyeDy: 0, irisS: 1, gx: 0, gy: 0, blush: 1, pop: 1, mouth: '', sweatT0: -1e9, mood: '' };
let faceSig = '', irisSig = '', pokeSmile = false;
const MOOD_GAZE = new Set(['think', 'ready', 'surprised', 'sad']);   // 생각 · 준비 · 놀람 · 시무룩은 원래 눈동자 방향 그대로
function drawFace(t, pg) {
  const eyes = pokeSmile ? 'smile' : cocoEl.dataset.eyes || '', mouth = cocoEl.dataset.mouth || '', blink = cocoEl.dataset.blink != null;
  const mood = cocoEl.dataset.mood || '';
  if (mood === 'oops' && S.mood !== 'oops') S.sweatT0 = t;
  S.mood = mood;
  if (mouth !== S.mouth) { S.mouth = mouth; S.popT0 = t; }
  const k = .35;                                            // CSS transition .16~.24s 비슷하게
  const own = !pg || MOOD_GAZE.has(mood);
  const to = { eyeS: eyes === 'wide' ? 1.1 : 1, eyeSy: eyes === 'droop' ? .74 : eyes === 'wide' ? 1.1 : 1, eyeDy: eyes === 'droop' ? .05 : 0,
    irisS: cocoEl.dataset.iris === 'small' ? .84 : 1,
    gx: own ? A.NUM(cocoEl.style.getPropertyValue('--gx')) : pg.gx, gy: own ? A.NUM(cocoEl.style.getPropertyValue('--gy')) : pg.gy,
    blush: eyes === 'smile' ? 1.14 : 1 };
  let moving = false;
  for (const key in to) { const d = to[key] - S[key]; if (Math.abs(d) > .002) { S[key] += d * k; moving = true; } else S[key] = to[key]; }
  const popK = A.clamp01((t - (S.popT0 || 0)) / 200);
  S.pop = popK < 1 ? .6 + .4 * (1 + 2.2 * Math.pow(popK - 1, 3) + 1.2 * Math.pow(popK - 1, 2)) : 1;
  if (popK < 1) moving = true;
  const sweatK = (t - S.sweatT0) / 1100;
  if (sweatK >= 0 && sweatK < 1) moving = true;
  const lines = blink && eyes !== 'smile' && eyes !== 'squint' ? 'shut' : eyes === 'smile' ? 'smile' : eyes === 'squint' ? 'squint' : '';
  // 눈동자 자리 = 눈동자 층 offset (그림을 다시 그리지 않음)
  irisTex.offset.set(-(S.gx / 100 * P.iris_l.w) / FACE.w, (S.gy / 100 * P.iris_l.h) / FACE.h);
  const sc = fc.width / FACE.w;
  const isig = [lines, left, S.eyeS, S.eyeSy, S.eyeDy, S.irisS].join('|');
  if (isig !== irisSig) {
    irisSig = isig;
    ig.setTransform(1, 0, 0, 1, 0, 0); ig.clearRect(0, 0, ic.width, ic.height);
    ig.setTransform(sc, 0, 0, sc, -FACE.x0 * sc, -FACE.y0 * sc);
    if (!lines) for (const s of ['l', 'r']) {
      const e = E[s], ir = P['iris_' + s];
      ig.save();
      ig.translate(e.cx, e.cy + S.eyeDy * e.h); ig.scale(S.eyeS, S.eyeSy); ig.translate(-e.cx, -e.cy);
      ig.translate(ir.x + ir.w / 2, ir.y + ir.h / 2); ig.scale(S.irisS, S.irisS);
      draw(ig, img['iris_' + s], -ir.w / 2, -ir.h / 2, ir.w, ir.h);
      ig.restore();
    }
    irisTex.needsUpdate = true;
  }
  const sig = [eyes, mouth, blink, left, S.eyeS, S.eyeSy, S.eyeDy, S.blush, S.pop, sweatK < 1 ? sweatK.toFixed(2) : 'x'].join('|');
  if (sig === faceSig) return moving;
  faceSig = sig;
  const g = fg;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fc.width, fc.height);
  g.setTransform(sc, 0, 0, sc, -FACE.x0 * sc, -FACE.y0 * sc);         // 원래 그림 픽셀 좌표로
  draw(g, img.face_base, FACE.x0, FACE.y0, FACE.w, FACE.h);
  for (const n of ['blush_l', 'blush_r']) {
    const p = P[n]; g.save(); g.translate(p.cx, p.cy); g.scale(S.blush, S.blush); draw(g, img[n], p.x - p.cx, p.y - p.cy, p.w, p.h); g.restore();
  }
  for (const s of ['l', 'r']) {                              // 흰자 (눈동자는 위 눈동자 층)
    const e = E[s];
    if (lines) { eyeLine(g, lines, e, s === 'l' ? 1 : -1); continue; }
    g.save();
    g.translate(e.cx, e.cy + S.eyeDy * e.h); g.scale(S.eyeS, S.eyeSy); g.translate(-e.cx, -e.cy);
    draw(g, img['eye_' + s], e.x, e.y, e.w, e.h);
    g.restore();
  }
  g.save(); g.translate(mx, my + 4); g.scale(S.pop, S.pop); g.translate(-mx, -my - 4);
  if (!mouth) draw(g, img.mouth, M.x, M.y, M.w, M.h);
  else if (mouth === 'flat') { g.beginPath(); g.moveTo(mx - mw * .62, my + 3); g.lineTo(mx + mw * .62, my - 1); stroke(g); }
  else if (mouth === 'o' || mouth === 'O') { const big = mouth === 'O'; g.beginPath(); g.ellipse(mx, my + (big ? 6 : 4), mw * (big ? .5 : .36), mw * (big ? .66 : .44), 0, 0, Math.PI * 2); g.fillStyle = ink; g.fill(); }
  else if (mouth === 'happy') {
    happyPath(g); g.fillStyle = ink; g.fill(); g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = ink; g.stroke();
    g.save(); happyPath(g); g.clip(); g.beginPath(); g.ellipse(mx, my + mw * 1.08, mw * .62, mw * .4, 0, 0, Math.PI * 2); g.fillStyle = '#EF8E9C'; g.fill(); g.restore();
  } else if (mouth === 'wavy') {
    g.beginPath(); g.moveTo(mx - mw * 1.05, my + 2);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo(mx - mw * 1.05 + mw * .525 * (2 * i + 1) / 2, my + (i % 2 ? 12 : -10), mx - mw * 1.05 + mw * .525 * (i + 1), my + 2);
    stroke(g);
  } else if (mouth === 'frown') { g.beginPath(); g.moveTo(mx - mw * .78, my + mw * .34); g.quadraticCurveTo(mx, my - mw * .44, mx + mw * .78, my + mw * .34); stroke(g); }
  g.restore();
  if (sweatK >= 0 && sweatK < 1) {                         // 땀방울 (틀렸을 때 1.1초)
    const e = sweatK * sweatK, op = sweatK < .2 ? sweatK / .2 : 1 - (sweatK - .2) / .8, sx = 752, sy = 548 - 14 + 40 * e;
    g.save(); g.globalAlpha = Math.max(0, op);
    g.beginPath(); g.moveTo(sx, sy - 30); g.bezierCurveTo(sx + 15, sy - 8, sx + 18, sy + 8, sx, sy + 14); g.bezierCurveTo(sx - 18, sy + 8, sx - 15, sy - 8, sx, sy - 30); g.closePath();
    g.fillStyle = '#9fd8ff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
    g.beginPath(); g.ellipse(sx - 5, sy, 4, 7, 0, 0, Math.PI * 2); g.globalAlpha *= .85; g.fillStyle = '#fff'; g.fill(); g.restore();
  }
  faceTex.needsUpdate = true;
  return true;
}
const faceMat = new T.MeshStandardMaterial({ map: faceTex, transparent: true, depthWrite: false, roughness: .5,
  emissive: new T.Color('#ffffff'), emissiveMap: faceTex, emissiveIntensity: .3, envMapIntensity: 1.8, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const irisMat = faceMat.clone();
irisMat.map = irisTex; irisMat.emissiveMap = irisTex; irisMat.polygonOffsetFactor = irisMat.polygonOffsetUnits = -6;

/* ── 모형 조립 (+Y 위 · +Z 앞) ── */
const pivot = new T.Group();      // 발 (탁자에 닿는 곳) — 여기를 축으로 뒤로 젖혀 그림 각도로
const root = new T.Group();       // 크기
root.rotation.x = Math.PI / 2;
const look = new T.Group();       // 손 쪽으로 몸 돌리기 · 콕 찌르면 통통 (발 기준)
const anim = new T.Group();       // 원래 CSS 몸짓 (발 기준)
const tumble = new T.Group(), tumbleIn = new T.Group();   // 위아래로 한 바퀴 (몸 가운데를 축으로 앞뒤 공중돌기)
const HC = .92;                   // 몸 가운데 높이 (껍데기 테 반지름 = 1)
tumble.position.y = HC; tumbleIn.position.y = -HC;
pivot.add(root); root.add(tumble); tumble.add(tumbleIn); tumbleIn.add(look); look.add(anim);
const SEG = 64;
const mesh = (geo, mat) => { const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };
const outerPts = smoothPts(OUTER, 90);
const shell = mesh(new T.LatheGeometry(outerPts, SEG), pink);
const shellIn = mesh(new T.LatheGeometry(smoothPts(INNER, 70), SEG), pinkIn);
const facePts = outerPts.filter(v => v.y > .62 && v.y < 1.36);
const faceGeo = new T.LatheGeometry(facePts, SEG / 2, -Math.PI * .5, Math.PI);
const face = new T.Mesh(faceGeo, faceMat);
face.receiveShadow = true; face.renderOrder = 2;
const irises = new T.Mesh(faceGeo, irisMat);
irises.receiveShadow = true; irises.renderOrder = 3;
const loop = mesh(new T.TorusGeometry(.145, .058, 18, 44), pink);
loop.position.y = hOf(110);
const kid = mesh(new T.LatheGeometry(smoothPts(KID, 30), 32), kidPink);
const legGeo = new T.CapsuleGeometry(.1, .07, 6, 16);
const armGeo = new T.CapsuleGeometry(.062, .11, 6, 14);
const legs = [-1, 1].map(s => { const m = mesh(legGeo, kidPink); m.position.set(s * .14, .135, .02); m.scale.set(1, 1, .9); return m; });
const arms = [-1, 1].map(s => { const m = mesh(armGeo, kidPink); m.position.set(s * .4, .29, .04); m.rotation.z = s * .95; return m; });
anim.add(shell, shellIn, face, irises, loop, kid, ...legs, ...arms);
pivot.visible = false;
B.board.add(pivot);

/* 얼굴 입히기: 카메라 쪽에서 (bell3d.js와 같은 방법) */
const camL = new T.Vector3(), inv = new T.Matrix4(), dir = new T.Vector3(), lastDir = new T.Vector3(), anchor = new T.Vector3();
const right = new T.Vector3(), vup = new T.Vector3(), UPY = new T.Vector3(0, 1, 0), tmp = new T.Vector3();
const radiusAt = y => { for (let i = 1; i < outerPts.length; i++) { const a = outerPts[i - 1], b = outerPts[i];
  if ((a.y - y) * (b.y - y) <= 0) return A.lerp(a.x, b.x, (y - a.y) / ((b.y - a.y) || 1)); } return .8; };
let uvKey = '';
function mapFace(force) {
  if (B.view.turned) return;                                 // 판을 돌려 보는 중엔 얼굴을 몸에 그려 둔 그대로
  B.board.updateMatrixWorld(true);
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  camL.copy(A.restCam).applyMatrix4(inv);                 // 손 따라 옮기기 전 카메라 → 얼굴이 몸에 그려진 것처럼
  const fy = hOf(FACE.cy) + FACE_DY, r = radiusAt(fy), az = Math.atan2(camL.x, camL.z);
  anchor.set(Math.sin(az) * r, fy, Math.cos(az) * r);
  dir.copy(camL).sub(anchor).normalize();
  if (!force && uvKey === FACE_K + ',' + FACE_DY && dir.angleTo(lastDir) < .004) return;
  uvKey = FACE_K + ',' + FACE_DY; lastDir.copy(dir);
  right.crossVectors(UPY, dir).normalize();
  vup.crossVectors(dir, right).normalize();
  const w = FACE.w / U * FACE_K, h = FACE.h / U * FACE_K;
  const u0 = (FACE.cx - FACE.x0) / FACE.w, v0 = 1 - (FACE.cy - FACE.y0) / FACE.h;
  const pos = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { tmp.fromBufferAttribute(pos, i).sub(anchor); uv.setXY(i, u0 + tmp.dot(right) / w, v0 + tmp.dot(vup) / h); }
  uv.needsUpdate = true;
}

/* ── 손 바라보기 · 콕 찌르기 ──
   눈동자가 손 쪽으로(생각 · 준비 · 놀람 · 시무룩일 땐 원래 방향) · 몸도 손 쪽으로 살짝 돌고 끄덕
   Coco를 손가락 · 마우스로 콕 누르면 통통 튀며 눈웃음 (게임에는 영향 없음) */
const lk = { yaw: 0, pitch: 0, nx: 0, ny: 0 }, faceW = new T.Vector3(), tgt = new T.Vector3();
const spin = A.spinner(), flip = A.spinner(), tAxis = new T.Vector3();
const YAW = 16 * Math.PI / 180, PITCH = 6 * Math.PI / 180, GX = 20, GY = 16;
let gazeFromPointer = null, lookT = 0, pokeT0 = -1e9;
function watch(L, t) {
  const dt = Math.min(64, Math.max(0, t - lookT)); lookT = t;
  const p = A.pointer, on = A.engaged();
  let nx = 0, ny = 0;
  faceW.set(0, hOf(FACE.cy), .7).applyMatrix4(anim.matrixWorld).project(B.camera);   // 얼굴의 화면 자리
  const fx = (faceW.x + 1) / 2 * L.W, fy = (1 - faceW.y) / 2 * L.H;
  if (on) {
    nx = Math.max(-1, Math.min(1, (p.x - fx) / (L.W * .4)));
    ny = Math.max(-1, Math.min(1, (p.y - fy) / (L.H * .45)));
    if (A.pointerOnPlane(0, tgt)) {                         // 손가락이 가리키는 판 위 자리 → Coco 몸 기준 방향 (판을 돌려도 맞게)
      B.board.localToWorld(tgt); root.worldToLocal(tgt);
      nx = Math.max(-1, Math.min(1, Math.atan2(tgt.x, Math.max(.05, tgt.z)) / .8));
    }
  }
  const k = 1 - Math.exp(-dt / (on ? 120 : 450)), body = A.reducedMotion() ? 0 : 1;
  const to = { yaw: nx * YAW * body, pitch: ny * PITCH * body, nx, ny };
  let moving = false;
  for (const key in to) { const d = to[key] - lk[key]; if (Math.abs(d) > 1e-4) { lk[key] += d * k; moving = true; } else lk[key] = to[key]; }
  gazeFromPointer = on || Math.abs(lk.nx) + Math.abs(lk.ny) > .01 ? { gx: lk.nx * GX, gy: lk.ny * GY } : null;
  // 콕 찌르면: 납작 → 통 (0.65초) + 눈웃음 0.5초
  const pk = (t - pokeT0) / 650;
  let sx = 1, sy = 1, hop = 0;
  if (pk >= 0 && pk < 1) {
    const w = Math.sin(pk * Math.PI * 3) * (1 - pk);
    sy = 1 - .16 * w; sx = 1 + .1 * w; hop = Math.max(0, Math.sin(Math.min(1, pk * 1.6) * Math.PI)) * .16 * body;
    moving = true;
  }
  pokeSmile = pk >= 0 && pk < .75;
  if (spin.step(dt)) moving = true;                          // 끌어서 한 바퀴: 좌우
  if (flip.step(dt)) moving = true;                          //               위아래 (앞뒤 공중돌기)
  look.rotation.set(lk.pitch, lk.yaw + spin.angle, 0);
  tumble.quaternion.setFromAxisAngle(tAxis.set(axis.x, 0, -axis.y).normalize(), flip.angle);   // 카메라 쪽 가로축 (몸 기준)
  look.scale.set(sx, sy, sx);
  look.position.y = hop;
  return moving;
}

/* ── 자리 · 몸짓 ── */
let unit = 1, ready = false;
const camB = new T.Vector3(), camR = new T.Vector3(), invB = new T.Matrix4(), hz = new T.Vector3(), axis = new T.Vector3();
const camC = new T.Vector3(), ctr = new T.Vector3(), feltEl = document.querySelector('.felt');
function cssMove() {                     // 원래 CSS 몸짓 (.c-body: translate · rotate · scale, 발 기준)
  const cs = getComputedStyle(cBody);
  const tr = (cs.translate && cs.translate !== 'none') ? cs.translate.split(' ').map(A.NUM) : [0, 0];
  const rot = (cs.rotate && cs.rotate !== 'none') ? A.NUM(cs.rotate) : 0;
  const sc = (cs.scale && cs.scale !== 'none') ? cs.scale.split(' ').map(A.NUM) : [1, 1];
  return { x: tr[0] || 0, y: tr[1] || 0, rot, sx: sc[0] || 1, sy: sc.length > 1 ? sc[1] : (sc[0] || 1) };
}
function place(L) {
  const R = A.rectIn(spotEl), w = cocoEl.offsetWidth || R.w;
  unit = w * (U / 1064) * SIZE;
  root.scale.setScalar(unit);
  // #coco 바닥(= 발) = 자리 높이의 80% — 바로 Coco 칸 위쪽 끝이라, 원래 그림처럼 칸 끝에 올라선 모습으로 (칸 두께 1.4vh)
  const fy = R.y + R.h * .8, tray = L && L.trays && L.trays[1] && L.trays[1].tray;
  const onTray = tray && fy > tray.y - .5 * A.vh && fy < tray.y + tray.h && R.cx > tray.x && R.cx < tray.x + tray.w;
  pivot.position.set(R.cx, -fy, onTray ? 1.4 * A.vh : 0);
  B.board.updateMatrixWorld(true);
  // 원래 화면 · 좌우로 돌린 화면: 카메라가 몇 도 위에서 보는지 재서 VIEW°에서 본 모습(그림 각도)이 되게 카메라 반대쪽으로 젖힘
  // 위아래로 돌려 볼 때: 젖히는 쪽 · 양은 위아래를 뺀 판(azBoard)에서 정하고 판과 같이 돌아요
  //   → 위에서 보면 정수리가, 낮게 보면 옆모습이 (낮을수록 똑바로 세움 · 바로 위에서 봐도 뒤집히지 않음)
  camB.copy(A.restCam).applyMatrix4(invB.copy(B.board.matrixWorld).invert()).sub(pivot.position).normalize();
  camR.copy(A.restCam).applyMatrix4(invB.copy(A.azBoard).invert()).sub(pivot.position).normalize();
  const elev = Math.asin(Math.max(-1, Math.min(1, camB.z))) * 180 / Math.PI;
  const elevR = Math.asin(Math.max(-1, Math.min(1, camR.z))) * 180 / Math.PI;
  // 젖히는 쪽: Coco 자리가 아니라 판 가운데(돌리는 가운데)에서 본 카메라 쪽 — Coco는 판 왼쪽에 있어서 제 자리에서 재면
  // '카메라 반대쪽'이 옆으로도 기울어, 화면에서 왼쪽으로 20°쯤 기울어 보였어요 (처음 들어올 땐 37°). 판을 돌려도 같이 돌아요
  const F = (L && L.felt) || A.rectIn(feltEl);
  ctr.set(F.cx, -F.cy, pivot.position.z);
  camC.copy(A.restCam).applyMatrix4(invB.copy(A.azBoard).invert()).sub(ctr);
  hz.set(camC.x, camC.y, 0);
  if (hz.lengthSq() < 1e-8) hz.set(0, -1, 0);
  hz.normalize();
  pivot.quaternion.setFromAxisAngle(axis.set(hz.y, -hz.x, 0).normalize(),
    Math.max(0, Math.min(45, elevR - VIEW)) * Math.max(0, Math.min(1, elev / Math.max(1, elevR))) * Math.PI / 180);
  return A.NUM(getComputedStyle(spotEl).opacity);
}
B.addPart({
  build(L) { place(L); mapFace(true); },
  update(L, t) {
    if (!ready) {
      if (left > 0) return false;
      ready = true; app.classList.add('coco3d-on');            // 얼굴 조각을 다 읽으면 HTML Coco 대신 3D Coco
    }
    const op = place(L);
    pivot.visible = op > .02 && L.game;
    if (!pivot.visible) return false;
    const mv = cssMove();
    anim.position.set(mv.x / unit, -mv.y / unit, 0);
    anim.rotation.z = -mv.rot * Math.PI / 180;
    anim.scale.set(mv.sx, mv.sy, mv.sx);
    mapFace(false);
    const lookMoving = watch(L, t);
    const faceMoving = drawFace(t, gazeFromPointer);
    // 통통 · 흔들 · 기울기 · 표정이 바뀌는 중이면 매 장면, 숨쉬기만 있으면 초당 30장
    const active = faceMoving || lookMoving || cocoEl.classList.contains('lean') || /^(happy|cheer|oops)$/.test(cocoEl.dataset.mood || '');
    return active ? true : 'idle';
  },
});

window.Coco3D = { pivot, root, anim, look, tumble, lk, faceTex, irisTex, fc, poke() { pokeT0 = A.now(); B.kick(); }, get spin() { return spin; }, get flip() { return flip; },
  debug: () => ({ pokeT0, now: A.now(), rect: A.screenRectOf(pivot) }), mats: { pink, pinkIn, kidPink, faceMat, irisMat },
  tune(o) { if (o.FACE_K != null) FACE_K = o.FACE_K; if (o.SIZE != null) SIZE = o.SIZE; if (o.VIEW != null) VIEW = o.VIEW;
    if (o.FACE_DY != null) FACE_DY = o.FACE_DY; uvKey = ''; B.kick(); } };
})();

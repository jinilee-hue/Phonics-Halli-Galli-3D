/* ─────────────────────────────────────────────────────────────────────────────
   가운데 종 3D (WebGL) — 캐릭터 시트(GAME BELL) · gemini JSON 사양을 보고 만든 3D 모형
   · 모양: 둥근 도넛 받침(빨강) + 아랫단이 퍼지는 반구 돔(노랑) + 회색 축 + 버섯 버튼 — 돌림판(단면을 한 바퀴 돌린) 모양
   · 재질: 완전 무광 클레이 (roughness .85 · metallic 0), 경계는 검은 선 없이 미리 칠한 그늘(AO)로만
   · 얼굴: 원래 그림의 눈 · 입 · 볼 조각(assets/bell_parts)을 캔버스에 그려 몸통에 입힘.
           카메라 쪽에서 비춰 입혀서, 내려다봐도 얼굴은 그림처럼 반듯하게 보여요.
   · 표정 · 몸짓: src/bell-face.js가 정하는 대로 (#bell의 data-eyes · data-mouth, BellFace.press)
       깜빡 · 윙크(고개 갸웃) · 누르면 납작 → 통 · 맞히면 활짝 웃음 · 틀리면 '앗' 입 · 가만히 있으면 숨쉬기
   · 자리 · 크기: 원래 HTML 종(.bell-spot · #bell) 자리를 매 순간 읽어서 (시작 화면 ↔ 게임 화면도 그대로 따라감)
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
'use strict';
const B = window.Board3D, P = window.BELL_PARTS;
const bellEl = document.getElementById('bell'), spotEl = document.querySelector('.bell-spot');
if (!B || B.off || !P || !bellEl || !spotEl) return;
const T = B.THREE, A = B.api, app = document.getElementById('app');

/* ── 모양: 캐릭터 시트(CHARACTER SHEET: GAME BELL) 옆모습 · 정면에서 잰 단면 — 받침 반지름 = 1, 바닥 가운데 = 원점, 위 = +Y, 앞(카메라 쪽) = +Z
   · 받침(빨강): 곧은 옆 + 도넛처럼 둥근 위 테두리 + 넓고 살짝 오목한 윗면, 바닥은 오목한 접시 (높이 .30)
   · 돔(노랑): 아랫단이 둥글게 퍼지는 반구 (테 바닥 .385 ~ 꼭대기 1.30). 받침에서 살짝 떠 있고 가운데 회색 기둥, 속은 비어 있음
   · 축(회색): 원기둥 (1.30 ~ 1.42 보임) · 버튼(진한 노랑): 동글납작한 버섯 (1.42 ~ 1.55) — 누르면 같이 쑥
   (시트의 d1 · d2 표시는 그림마다 달라서 그림 실루엣을 직접 재서 정했어요: /tmp/gl/hg/bell_sheet_profile.py) ── */
// 받침: 옆은 거의 곧게 · 위 테두리는 둥글게(도넛) · 윗면은 넓고 평평(살짝 오목) — 시트 옆모습의 위쪽이 좁아 보이는 건 위에서 본 윗면이라서
const BASE = [[0, .035], [.7, .035], [.76, .03], [.8, .014], [.84, 0], [.93, 0], [.972, .018], [.994, .055], [1, .1], [.997, .155],
  [.986, .2], [.965, .243], [.932, .274], [.89, .292], [.84, .3], [.79, .301], [.74, .297], [.68, .29], [0, .29]];
const BODY = [[0, .5], [.62, .5], [.74, .482], [.8, .448], [.835, .408], [.86, .389], [.885, .385], [.905, .393], [.918, .413],
  [.922, .443], [.914, .474], [.893, .5], [.862, .52], [.835, .54], [.82, .565], [.815, .6], [.81, .65], [.8, .72], [.785, .8],
  [.765, .87], [.74, .93], [.71, .99], [.675, 1.05], [.62, 1.11], [.55, 1.165], [.46, 1.215], [.35, 1.255], [.22, 1.285], [.1, 1.298],
  [0, 1.3]];
const FACE_FROM = .56;        // 이 높이부터 위가 몸통(얼굴 입힐 곳) — 아랫단 둥근 띠 위
const STEM = [[0, 1.27], [.1, 1.27], [.106, 1.28], [.106, 1.405], [.1, 1.425], [0, 1.425]];                   // 금속 연결 축
const KNOB = [[0, 1.405], [.11, 1.405], [.118, 1.415], [.125, 1.43], [.16, 1.438], [.19, 1.448], [.205, 1.465], [.207, 1.485],
  [.198, 1.505], [.175, 1.525], [.135, 1.541], [.08, 1.55], [0, 1.553]];                                     // 꼭대기 누름 버튼
const POST = [[0, .27], [.13, .27], [.136, .28], [.136, .51], [0, .51]];                                         // 돔을 받치는 회색 기둥
const TOP_Y = 1.553, LIP_Y = .385, DOME_C = .84;   // 꼭대기 · 돔 테 바닥 · 돔 가운데 높이
const FACE = { x0: 300, y0: 480, w: 900, h: 330, cx: 750, cy: 645, unit: 748 };   // 얼굴 그림 범위(원래 그림 픽셀) — 볼을 바깥으로 옮겨서 넓힘
// 캐릭터 시트 정면처럼: 입은 눈 아래 끝 높이로(위로 23px) · 볼은 조금 바깥으로(25px) — 원래 그림 픽셀 단위 (시트 실측: 눈→입 .106 · 볼 ±.494)
const MOUTH_DY = -23, BLUSH_DX = 25;
// 얼굴 높이 · 크기, 크기, 보이는 각도 (확인하며 맞춘 값)
// VIEW: 게임 카메라는 종 자리를 약 60° 위에서 내려다봐서, 똑바로 세우면 빨간 받침 뒤쪽이 종 뒤로 크게 보이고 위에서 본 모습이 돼요.
// 원래 HTML 종(카메라를 향해 세운 그림)처럼, 받침 앞 모서리를 축으로 뒤로 젖혀서 VIEW° 위에서 본 모습(그림 각도)이 되게 해요.
// 젖힌 만큼 받침 뒤쪽은 탁자 면 아래로 내려가지만, 탁자를 바닥 그림처럼 먼저 깔아서(board3d.js) 잘리지 않아요.
let FACE_Y = .8, FACE_K = 1.02, SIZE = .96, VIEW = 28, FOOT = 0;

const smoothPts = (pts, n) => {
  const c = new T.SplineCurve(pts.map(([r, y]) => new T.Vector2(r, y)));
  c.arcLengthDivisions = 400;
  return c.getSpacedPoints(n).map(v => new T.Vector2(Math.max(0, v.x), v.y));
};
const lathe = (pts, n, seg, a0, len) => new T.LatheGeometry(smoothPts(pts, n), seg, a0, len);

/* ── 재질: 원래 그림과 화면 색을 재서 맞춤 (그림 노랑 밝은 곳 #ffeb5a · 중간 #f2cc3b)
   탁자는 원래 CSS 색에 맞춰 빛을 정해서, 종은 밝기 압축(tone mapping)을 빼고 은은한 자체 밝기(emissive)로 그늘을 띄움 ── */
// 재질: 캐릭터 시트 · gemini JSON — "Extreme Matte" 무광 클레이 (roughness .85 · metallic 0 · 반사 · 광택 거의 0)
// 클레이의 뽀송한 결은 sheen(비스듬히 볼 때 은은히 밝아짐)으로, 색은 JSON 팔레트. 밝기는 게임 화면 빛에서 시트 색이 나오게 맞춤
const clay = (hex, emi, sheenHex, more) => new T.MeshPhysicalMaterial(Object.assign({ color: new T.Color(hex), emissive: new T.Color(emi),
  roughness: .85, metalness: 0, specularIntensity: .1, sheen: .3, sheenRoughness: .8, sheenColor: new T.Color(sheenHex),
  envMapIntensity: 1, toneMapped: false, vertexColors: true }, more));
const yellow = clay('#FFEB00', '#3c3000', '#fff27a');              // 돔
const btnYellow = clay('#FFD400', '#3a2a00', '#ffe36a');           // 버튼
const red = clay('#E02E35', '#2a0406', '#ff7a7e');                 // 받침
const chrome = clay('#8A8A8A', '#2a2a2a', '#e0e0e0', { sheen: .2 });    // 금속 축 · 기둥 (무광 회색 — 시트처럼 조금 밝게)

/* ── 얼굴 그림 (캔버스) ── */
const fc = document.createElement('canvas');
fc.width = 1024; fc.height = Math.round(1024 * FACE.h / FACE.w);
const fg = fc.getContext('2d');
const faceTex = new T.CanvasTexture(fc);
faceTex.colorSpace = T.SRGBColorSpace;
faceTex.anisotropy = 8;
// 눈은 따로 한 층: 손 쪽을 볼 때 그림을 다시 그리지 않고 그림 자리(offset)만 옮겨요 (태블릿도 가볍게)
const ec = document.createElement('canvas');
ec.width = fc.width; ec.height = fc.height;
const eg = ec.getContext('2d');
const eyeTex = new T.CanvasTexture(ec);
eyeTex.colorSpace = T.SRGBColorSpace;
eyeTex.anisotropy = 8;
const partImg = {};
let partsLeft = 0;
['eye_l', 'eye_r', 'mouth', 'blush_l', 'blush_r'].forEach(n => {
  const im = new Image();
  partsLeft++;
  im.onload = () => { partsLeft--; faceKey = ''; B.kick(); };
  im.onerror = () => { partsLeft--; console.warn('[종 3D] 얼굴 조각을 못 읽었어요:', n); };
  im.src = (window.GL_TEX && GL_TEX[`bell_parts/${n}.png`]) || `./assets/bell_parts/${n}.png`;
  partImg[n] = im;
});
// 새로 그리는 선: src/bell-face.js와 같은 모양 · 같은 굵기
const ink = '#4A2B21', sw = P.stroke * .92;                  // JSON 팔레트 (원래 그림 선 #5d4030보다 살짝 진함)
const closedEye = (g, e) => { const half = (e.core[2] - e.core[0]) * .56, y = e.cy + 8;
  g.beginPath(); g.moveTo(e.cx - half, y); g.quadraticCurveTo(e.cx, y - 52, e.cx + half, y);
  g.lineWidth = sw; g.lineCap = 'round'; g.strokeStyle = ink; g.stroke(); };
function happyPath(g) {
  const mx = P.mouth.cx, my = P.mouth.cy + MOUTH_DY;
  g.beginPath(); g.moveTo(mx - 60, my - 24); g.quadraticCurveTo(mx, my - 14, mx + 60, my - 24);
  g.quadraticCurveTo(mx + 54, my + 56, mx, my + 58); g.quadraticCurveTo(mx - 54, my + 56, mx - 60, my - 24); g.closePath();
}
function drawPart(g, name, s, dx = 0, dy = 0) {
  const p = P[name], im = partImg[name];
  if (!im || !im.naturalWidth) return;
  g.save(); g.translate(p.cx + dx, p.cy + dy); g.scale(s, s); g.drawImage(im, p.x - p.cx, p.y - p.cy, p.w, p.h); g.restore();
}
let faceKey = '';
function drawFace(eyes, mouth) {
  const key = eyes + '|' + mouth + '|' + partsLeft;
  if (key === faceKey) return false;
  faceKey = key;
  const g = fg, k = fc.width / FACE.w;
  for (const c of [fg, eg]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fc.width, fc.height); c.setTransform(k, 0, 0, k, -FACE.x0 * k, -FACE.y0 * k); }   // 원래 그림 픽셀 좌표로
  const bs = mouth === 'happy' ? 1.12 : 1;                      // 활짝 웃으면 볼이 살짝 커짐
  drawPart(g, 'blush_l', bs, -BLUSH_DX); drawPart(g, 'blush_r', bs, BLUSH_DX);
  g.globalAlpha = .55; drawPart(g, 'blush_l', bs, -BLUSH_DX); drawPart(g, 'blush_r', bs, BLUSH_DX); g.globalAlpha = 1;   // 3D 몸통 위에선 볼이 옅어 보여서 한 번 더
  const es = mouth === 'o' ? 1.12 : 1;                          // '앗' 하면 눈이 살짝 커짐
  if (eyes === 'closed') { closedEye(eg, P.eye_l); closedEye(eg, P.eye_r); }
  else { drawPart(eg, 'eye_l', es); if (eyes === 'wink') closedEye(eg, P.eye_r); else drawPart(eg, 'eye_r', es); }
  eyeTex.needsUpdate = true;
  if (mouth === 'happy') {
    g.save(); happyPath(g); g.fillStyle = ink; g.fill(); g.lineWidth = 14; g.lineJoin = 'round'; g.strokeStyle = ink; g.stroke();
    happyPath(g); g.clip(); g.beginPath(); g.ellipse(P.mouth.cx, P.mouth.cy + MOUTH_DY + 47, 36, 22, 0, 0, Math.PI * 2); g.fillStyle = '#EF8E9C'; g.fill(); g.restore();
  } else if (mouth === 'o') {
    g.beginPath(); g.ellipse(P.mouth.cx, P.mouth.cy + MOUTH_DY + 12, 44, 54, 0, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
  } else drawPart(g, 'mouth', 1, 0, MOUTH_DY);
  faceTex.needsUpdate = true;
  return true;
}
const faceMat = new T.MeshStandardMaterial({ map: faceTex, transparent: true, depthWrite: false, roughness: .85,   // 몸통처럼 무광
  emissive: new T.Color('#ffffff'), emissiveMap: faceTex, emissiveIntensity: .32, envMapIntensity: 2.2, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const eyeMat = faceMat.clone();
eyeMat.map = eyeTex; eyeMat.emissiveMap = eyeTex; eyeMat.polygonOffsetFactor = eyeMat.polygonOffsetUnits = -6;

/* ── 모형 조립 ── */
const pivot = new T.Group();           // 받침 가운데 · 카메라에서 먼 쪽으로 젖힘 (받침 테두리 중 카메라에 가장 가까운 곳이 축)
pivot.matrixAutoUpdate = false;
const root = new T.Group();            // 종 (+Y가 탁자 위쪽이 되게 눕혀 둠)
root.rotation.x = Math.PI / 2;
const turn = new T.Group();            // 한 바퀴 돌리기 (받침까지 통째로)
const tumble = new T.Group(), tumbleIn = new T.Group();   // 위아래로 한 바퀴 (몸 가운데를 축으로 앞뒤 공중돌기)
const HC = .78;                        // 몸 가운데 높이 (받침 반지름 = 1, 종 전체 높이 1.55의 가운데)
tumble.position.y = HC; tumbleIn.position.y = -HC;
pivot.add(root); root.add(tumble); tumble.add(tumbleIn); tumbleIn.add(turn);
const upper = new T.Group();           // 받침 위 (눌리면 납작 · 숨쉬기 · 갸웃)
upper.position.y = LIP_Y;
const plunger = new T.Group();         // 목 · 꼭지 (누르면 쑥)
// 그림자: 탁자에 드리우기만 하고 제 몸엔 받지 않아요 — 판 전체를 덮는 그림자 지도라 작은 종 위에선 칸이 굵어서,
// 노란 몸통 테가 빨간 받침에 드리운 그림자가 얼룩덜룩 깨져 보였어요 (몸의 입체감은 빛 · 주변 반사로 충분)
const mesh = (geo, mat, y0) => { const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = false; if (y0) geo.translate(0, -y0, 0); return m; };
// 촘촘함: 태블릿도 가볍게 (종 전체 삼각형 약 3만 개 · 그림자 포함 두 번 그림)
const SEG = 72;
const base = mesh(lathe(BASE, 72, SEG), red);
const bodyPts = smoothPts(BODY, 120);
const body = mesh(new T.LatheGeometry(bodyPts, SEG), yellow, LIP_Y);
const stem = mesh(lathe(STEM, 14, 32), chrome, LIP_Y);
const knob = mesh(lathe(KNOB, 26, 48), btnYellow, LIP_Y);
const post = mesh(lathe(POST, 8, 32), chrome, LIP_Y);
// 그늘(AO)을 꼭짓점에 미리 칠함: 테두리에 검은 선 없이 맞닿은 곳 · 아랫면만 부드럽게 어둡게 (시트 "부드러운 음영과 AO로만 경계")
const sm = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
function bakeAO(m, fn, y0 = 0) {
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = fn(Math.hypot(pos.getX(i), pos.getZ(i)), pos.getY(i) + y0, nor.getY(i));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
}
// 받침: 돔 밑(틈 속) 윗면은 그늘 · 돔 테 바로 바깥은 살짝 · 바닥 접시는 조금
bakeAO(base, (r, y) => 1 - .42 * sm((y - .24) / .06) * (1 - sm((r - .84) / .09)) - .1 * sm((y - .27) / .05) * (1 - sm((r - .97) / .06))
  - .14 * (1 - sm(y / .05)));
// 돔: 속(아래를 보는 안쪽 면)은 어둡게 · 아랫단 밑면은 살짝
bakeAO(body, (r, y, ny) => 1 - (r < .87 ? .5 : .16) * Math.max(0, -ny) - .1 * (1 - sm((y - .39) / .05)), LIP_Y);
bakeAO(stem, (r, y) => .78 + .22 * Math.sin(Math.PI * Math.max(0, Math.min(1, (y - 1.29) / .12))), LIP_Y);   // 돔 · 버튼에 들어가는 양 끝은 그늘
bakeAO(knob, (r, y, ny) => 1 - .3 * Math.max(0, -ny), LIP_Y);                                               // 버섯 갓 아랫면
bakeAO(post, () => .55, LIP_Y);                                                                              // 돔 밑 그늘 속
// 얼굴 입힐 겉면 = 몸통과 같은 곡선 · 같은 각도 칸(5°)의 앞쪽 반 → 몸통 겉면에 꼭 붙음
const domePts = bodyPts.filter(v => v.y >= FACE_FROM);
const faceGeo = new T.LatheGeometry(domePts, SEG / 2, -Math.PI * .5, Math.PI);
faceGeo.translate(0, -LIP_Y, 0);
const face = new T.Mesh(faceGeo, faceMat);
face.receiveShadow = false;
face.renderOrder = 2;
const eyesMesh = new T.Mesh(faceGeo, eyeMat);       // 같은 겉면 · 같은 UV, 그림만 눈
eyesMesh.receiveShadow = false;
eyesMesh.renderOrder = 3;
plunger.add(stem, knob);
upper.add(body, face, eyesMesh, plunger, post);
turn.add(base, upper);
root.visible = false;
B.board.add(pivot);

/* ── 얼굴 입히기: 카메라 쪽에서 비춘 그림자처럼 (내려다봐도 얼굴은 반듯하게) ── */
const radiusAt = y => { for (let i = 1; i < domePts.length; i++) { const a = domePts[i - 1], b = domePts[i];
  if ((a.y - y) * (b.y - y) <= 0) return A.lerp(a.x, b.x, (y - a.y) / ((b.y - a.y) || 1)); } return 0; };
const camL = new T.Vector3(), inv = new T.Matrix4(), dir = new T.Vector3(), lastDir = new T.Vector3(), anchor = new T.Vector3();
const right = new T.Vector3(), vup = new T.Vector3(), UPY = new T.Vector3(0, 1, 0), tmp = new T.Vector3();
let uvKey = '';
function mapFace(force) {
  if (B.view.turned) return;                                 // 판을 돌려 보는 중엔 얼굴을 몸에 그려 둔 그대로
  B.board.updateMatrixWorld(true);
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  // 카메라 자리 (종 몸통 기준 · 눌리거나 숨쉬기 전 모양으로) → 눌릴 때 얼굴도 몸통과 같이 찌그러짐
  camL.copy(A.restCam).applyMatrix4(inv);
  camL.y -= LIP_Y;
  const az = Math.atan2(camL.x, camL.z), ry = FACE_Y - LIP_Y, r = radiusAt(FACE_Y);
  anchor.set(Math.sin(az) * r, ry, Math.cos(az) * r);       // 얼굴 가운데: 몸통 앞(카메라 쪽) 겉면
  dir.copy(camL).sub(anchor).normalize();
  const key = [FACE_Y, FACE_K].join(',');
  if (!force && key === uvKey && dir.angleTo(lastDir) < .004) return;
  uvKey = key; lastDir.copy(dir);
  right.crossVectors(UPY, dir).normalize();
  vup.crossVectors(dir, right).normalize();
  const w = FACE.w / FACE.unit * FACE_K, h = FACE.h / FACE.unit * FACE_K;
  const u0 = (FACE.cx - FACE.x0) / FACE.w, v0 = 1 - (FACE.cy - FACE.y0) / FACE.h;
  const pos = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i).sub(anchor);
    uv.setXY(i, u0 + tmp.dot(right) / w, v0 + tmp.dot(vup) / h);
  }
  uv.needsUpdate = true;
}
faceTex.wrapS = faceTex.wrapT = eyeTex.wrapS = eyeTex.wrapT = T.ClampToEdgeWrapping;

/* ── 움직임 ── */
let pressT0 = -1e9, tilt = 0, ready = false;
/* 튜터 몸짓 (gl/tutor.js가 부름): 끄덕 · 도리도리 · 콩콩 · 갸웃 + 반짝(부르기) + 바라보기 */
const GEST = { nod: 720, shake: 820, hop: 780, wiggle: 700 };
let gKind = '', gT0 = -1e9, glow = 0, glowTo = 0;
const gaze = { x: 0, y: 0, until: -1e9 };
const emiY = yellow.emissive.clone(), emiB = btnYellow.emissive.clone(), emiGlow = new T.Color('#8a6c00');
function act(kind) { if (!GEST[kind]) return; gKind = kind; gT0 = A.now(); B.kick(); }
function gestureAt(t) {
  const out = { pitch: 0, yaw: 0, roll: 0, lift: 0, sx: 1, sy: 1, on: false };
  const k = (t - gT0) / (GEST[gKind] || 1);
  if (!gKind || k < 0 || k >= 1 || A.reducedMotion()) return out;
  out.on = true;
  const fade = 1 - k;
  if (gKind === 'nod') out.pitch = Math.sin(k * Math.PI * 4) * .2 * fade;            // 끄덕끄덕 (두 번)
  else if (gKind === 'shake') out.yaw = Math.sin(k * Math.PI * 6) * .3 * fade;       // 도리도리 (세 번)
  else if (gKind === 'wiggle') out.roll = Math.sin(k * Math.PI * 4) * .14 * fade;    // 갸웃갸웃
  else if (gKind === 'hop') {                                                          // 콩콩 (두 번) — 닿을 때 납작
    const h = Math.abs(Math.sin(k * Math.PI * 2));
    out.lift = h * .26 * (1 - k * .35);
    const land = Math.max(0, 1 - h * 4) * fade;
    out.sx = 1 + .07 * land; out.sy = 1 - .1 * land;
  }
  return out;
}
const easePress = A.bezier(.25, .8, .35, 1);
const PRESS = [[0, 1, 1], [.16, 1.07, .86], [.42, .97, 1.05], [.68, 1.01, .99], [1, 1, 1]];   // bell-face.js의 bf-press와 같은 박자
function pressScale(k) {
  const e = easePress(k);
  for (let i = 1; i < PRESS.length; i++) if (e <= PRESS[i][0]) {
    const a = PRESS[i - 1], b = PRESS[i], f = (e - a[0]) / (b[0] - a[0]);
    return [A.lerp(a[1], b[1], f), A.lerp(a[2], b[2], f)];
  }
  return [1, 1];
}
if (window.BellFace && BellFace.press) {          // 종을 누를 때마다 (main.js의 hitBell → BellFace.press)
  const press0 = BellFace.press;
  BellFace.press = function () { pressT0 = A.now(); B.kick(); return press0.apply(this, arguments); };
}

/* 손 바라보기 */
const look = { ex: 0, ey: 0, yaw: 0, pitch: 0 }, faceW = new T.Vector3();
const EYE_X = 16, EYE_Y = 12, YAW = 13 * Math.PI / 180, PITCH = 6 * Math.PI / 180;   // 눈(그림 픽셀) · 몸 돌기 최대
const tgt = new T.Vector3();
function watch(L, t) {
  const looking = A.now() < gaze.until;                     // 튜터가 바라볼 자리를 정해 두면 (내 카드 더미 · 카드 · Coco)
  const p = looking ? gaze : A.pointer, on = looking || A.engaged();
  let nx = 0, ny = 0;
  if (on) {
    faceW.set(0, FACE_Y - LIP_Y, .6).applyMatrix4(upper.matrixWorld).project(B.camera);   // 얼굴 가운데의 화면 자리
    const fx = (faceW.x + 1) / 2 * L.W, fy = (1 - faceW.y) / 2 * L.H;
    nx = Math.max(-1, Math.min(1, (p.x - fx) / (L.W * .45)));
    ny = Math.max(-1, Math.min(1, (p.y - fy) / (L.H * .5)));
    if (!looking && A.pointerOnPlane(0, tgt)) {             // 손가락이 가리키는 판 위 자리 → 종 몸 기준 방향
      B.board.localToWorld(tgt); root.worldToLocal(tgt);
      const a = Math.atan2(tgt.x, Math.max(.05, tgt.z));
      nx = Math.max(-1, Math.min(1, a / .9));
    }
  }
  if (looking) { nx = Math.max(-1, Math.min(1, nx * 1.7)); ny = Math.max(-1, Math.min(1, ny * 1.4)); }   // 튜터가 보는 곳은 또렷하게
  const body = A.reducedMotion() ? 0 : 1;
  const to = { ex: nx * EYE_X, ey: ny * EYE_Y, yaw: nx * YAW * body * (looking ? 1.5 : 1), pitch: ny * PITCH * body };
  const k = 1 - Math.exp(-dtLook(t) / (on ? 110 : 420));
  let moving = false;
  for (const key in to) { const d = to[key] - look[key]; if (Math.abs(d) > 1e-4) { look[key] += d * k; moving = true; } else look[key] = to[key]; }
  return moving;
}
let lookT = 0, spinT = 0;
function dtLook(t) { const d = Math.min(64, Math.max(0, t - lookT)); lookT = t; return d; }
function dtSpin(t) { const d = Math.min(64, Math.max(0, t - spinT)); spinT = t; return d; }

let unit = 1;
const camB = new T.Vector3(), camR = new T.Vector3(), invB = new T.Matrix4(), cB = new T.Vector3(), hz = new T.Vector3(), axis = new T.Vector3();
const mR = new T.Matrix4(), mT = new T.Matrix4();
function place(L) {
  const bw = .93 * L.bell.w * L.bellScale;                  // 원래 HTML 종 폭
  unit = bw / 2 * SIZE;
  root.scale.setScalar(unit);
  cB.set(L.bell.cx, -L.bell.cy + (FOOT + .975) * unit, 0);  // 받침 가운데 (원래 종의 발 자리 = 받침 앞 모서리)
  // 카메라가 이 자리를 몇 도 위에서 보는지 재서, VIEW°에서 본 모습이 되게 카메라 반대쪽으로 젖힘
  // (판을 360° 돌려도 늘 카메라 반대쪽 · 시작 화면 · 게임 화면 따로 맞음)
  B.board.updateMatrixWorld(true);
  // 원래 화면 · 좌우로 돌린 화면: 카메라가 몇 도 위에서 보는지 재서 VIEW°에서 본 모습(그림 각도)이 되게 카메라 반대쪽으로 젖힘
  // 위아래로 돌려 볼 때: 젖히는 쪽 · 양은 위아래를 뺀 판(azBoard)에서 정하고 판과 같이 돌아요
  //   → 위에서 보면 정수리가, 낮게 보면 옆모습이 (낮을수록 똑바로 세움 · 바로 위에서 봐도 뒤집히지 않음)
  camB.copy(A.restCam).applyMatrix4(invB.copy(B.board.matrixWorld).invert()).sub(cB).normalize();
  camR.copy(A.restCam).applyMatrix4(invB.copy(A.azBoard).invert()).sub(cB).normalize();
  const elev = Math.asin(Math.max(-1, Math.min(1, camB.z))) * 180 / Math.PI;
  const elevR = Math.asin(Math.max(-1, Math.min(1, camR.z))) * 180 / Math.PI;
  const lean = Math.max(0, Math.min(45, elevR - VIEW)) * Math.max(0, Math.min(1, elev / Math.max(1, elevR))) * Math.PI / 180;
  hz.set(camR.x, camR.y, 0);
  if (hz.lengthSq() < 1e-8) hz.set(0, -1, 0);
  hz.normalize();
  axis.set(hz.y, -hz.x, 0).normalize();
  const ex = hz.x * .975 * unit, ey = hz.y * .975 * unit;     // 젖히는 축 = 받침 테두리 중 카메라 쪽
  pivot.matrix.makeTranslation(cB.x + ex, cB.y + ey, 0).multiply(mR.makeRotationAxis(axis, lean)).multiply(mT.makeTranslation(-ex, -ey, 0));
  pivot.matrixWorldNeedsUpdate = true;
}
const spin = A.spinner(), flip = A.spinner(), tAxis = new T.Vector3();
B.addPart({
  build(L) { place(L); mapFace(true); },
  update(L, t) {
    if (!ready) {
      if (partsLeft > 0) return false;
      ready = true; app.classList.add('bell3d-on');           // 얼굴 조각을 다 읽으면 HTML 종 대신 3D 종
    }
    root.visible = true;
    place(L);
    drawFace(bellEl.dataset.eyes || '', bellEl.dataset.mouth || '');
    mapFace(false);
    // 숨쉬기 (2.8초) · 누르면 납작 → 통 · 윙크하면 살짝 갸웃
    const br = Math.sin(t / 2800 * Math.PI * 2) * .5 + .5;
    let sx = 1 - .007 * br, sy = 1 + .012 * br, push = 0, busy = false;
    const k = (t - pressT0) / 520;
    if (k >= 0 && k < 1) {
      const [px, py] = pressScale(k);
      sx *= px; sy *= py; push = Math.max(0, 1 - py) * .55; busy = true;
    }
    const g = gestureAt(t);
    if (g.on) busy = true;
    sx *= g.sx; sy *= g.sy;
    upper.scale.set(sx, sy, sx);
    plunger.position.y = -push;
    turn.position.y = g.lift;
    glow += (glowTo - glow) * .18;
    if (Math.abs(glowTo - glow) > .002) busy = true; else glow = glowTo;
    const pulse = glowTo > 0 ? .75 + .25 * Math.sin(t / 160) : 1;   // 부를 땐 반짝반짝
    if (glowTo > 0) busy = true;
    yellow.emissive.copy(emiY).lerp(emiGlow, glow * pulse);
    btnYellow.emissive.copy(emiB).lerp(emiGlow, glow * pulse);
    const tiltTo = bellEl.dataset.eyes === 'wink' ? -3 * Math.PI / 180 : 0;
    tilt += (tiltTo - tilt) * .25;
    if (Math.abs(tiltTo - tilt) > .0005) busy = true;
    // 손 바라보기: 눈이 손 쪽으로 · 몸도 손 쪽으로 살짝 돌고 끄덕 (손이 멈추면 천천히 제자리)
    if (watch(L, t)) busy = true;
    upper.rotation.set(look.pitch + g.pitch, look.yaw + g.yaw, tilt + g.roll);
    eyeTex.offset.set(-look.ex / FACE.w, look.ey / FACE.h);
    const ds = dtSpin(t);
    if (spin.step(ds)) busy = true;                           // 끌어서 한 바퀴 (시작 화면): 좌우
    if (flip.step(ds)) busy = true;                           //                         위아래 (앞뒤 공중돌기)
    turn.rotation.y = spin.angle;
    tumble.quaternion.setFromAxisAngle(tAxis.set(axis.x, 0, -axis.y).normalize(), flip.angle);   // 카메라 쪽 가로축 (몸 기준)
    return busy || 'idle';
  },
});

/* 종 누르는 자리: 원래 HTML 종 자리 + 3D 종이 화면에 보이는 자리를 모두 덮게 */
const box = new T.Box3(), corners = Array.from({ length: 8 }, () => new T.Vector3());
function screenRect() {
  if (!root.visible) return null;
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const c = B.renderer.domElement.getBoundingClientRect();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i = 0;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const v = corners[i++].set(x, y, z).project(B.camera);
    const sx = c.left + (v.x + 1) / 2 * c.width, sy = c.top + (1 - v.y) / 2 * c.height;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return { x0, y0, x1, y1 };
}
const place0 = window.place;
if (typeof place0 === 'function') {
  window.place = function () {
    place0.apply(this, arguments);
    const r = screenRect(), hb = document.getElementById('hitBell');
    if (!r || !hb || !ready) return;
    const h = hb.getBoundingClientRect(), pad = 6;
    const x0 = Math.min(h.left, r.x0 - pad), y0 = Math.min(h.top, r.y0 - pad), x1 = Math.max(h.right, r.x1 + pad), y1 = Math.max(h.bottom, r.y1 + pad);
    Object.assign(hb.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px' });
  };
}

// 확인용: Bell3D.tune({ FACE_Y, FACE_K, BACK, SIZE })
window.Bell3D = { root, upper, turn, tumble, face, faceTex, fc, screenRect, look, get spin() { return spin; }, get flip() { return flip; },
  act, glow(on) { glowTo = on ? 1 : 0; B.kick(); }, gaze(x, y, ms) { gaze.x = x; gaze.y = y; gaze.until = A.now() + (ms || 1500); B.kick(); },
  get ready() { return ready; },
  mats: { yellow, btnYellow, red, chrome, faceMat, eyeMat }, eyesMesh, DOME_C,
  baseOffset: () => (FOOT + .975) * unit,      // 원래 종 발 자리(받침 앞 모서리) → 받침 가운데까지 (판 좌표 px, 먼 쪽으로)
  tune(o) { if (o.FACE_Y != null) FACE_Y = o.FACE_Y; if (o.FACE_K != null) FACE_K = o.FACE_K; if (o.SIZE != null) SIZE = o.SIZE;
    if (o.VIEW != null) VIEW = o.VIEW; if (o.FOOT != null) FOOT = o.FOOT; uvKey = ''; B.kick(); } };
})();

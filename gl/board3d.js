/* ─────────────────────────────────────────────────────────────────────────────
   판 3D (WebGL · three.js) — 탁자 · 카드 더미 · 나온 카드 · S 칸을 진짜 3D로 그려요.

   게임 규칙 · 목소리 · 음악 · 글자 · 버튼 · 종 · Coco · 결과 화면은 원래 HTML(src/main.js 등) 그대로예요.
   이 파일은 HTML 판(#table 안)의 자리와 상태(class)를 매 순간 읽어서, 같은 자리에 3D로 다시 그릴 뿐이에요.
   - 카메라: .scene의 CSS 원근(perspective 1500px · 시점 50% -10%)과 똑같이 → 3D 물건이 HTML 자리에 정확히 겹쳐요
     (그래서 카드 누르는 곳 · 종 누르는 곳 · 말풍선 자리를 하나도 안 고쳐도 맞아요)
   - 해상도가 바뀌면 HTML 판 크기(vh · %)를 그대로 따라가요.
   - WebGL을 못 쓰는 기기면 아무것도 안 하고 원래 HTML 판이 그대로 보여요.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
'use strict';
const T = window.THREE;
const app = document.getElementById('app');
const QS = new URLSearchParams(location.search);
const FORCE = (QS.get('q') || '').toLowerCase();        // 확인용: ?q=high · mid · low · html(3D 끔)
if (!T || !app || FORCE === 'html') return;
// 이 기기에서 전에 '너무 느려서 원래 판'으로 정했으면 3D를 켜지 않음 (7일 동안 · ?q=high 등으로 다시 시험)
let MEMO_START = null;
try { MEMO_START = JSON.parse(localStorage.getItem('hg3d-quality') || 'null'); } catch (e) { /* 무시 */ }
if (MEMO_START && (!MEMO_START.at || Date.now() - MEMO_START.at > 7 * 864e5)) MEMO_START = null;
if (MEMO_START && MEMO_START.v === 'html' && !FORCE) { console.info('[판 3D] 이 기기는 전에 느려서 원래 판으로 열어요 (?q=high 로 다시 시험)'); return; }

const $ = (s, r) => (r || document).querySelector(s);
const sceneEl = $('.scene'), tableEl = $('#table'), feltEl = $('.felt', tableEl);
const spotEl = $('#spot'), hintEl = $('#spot .hint'), bellEl = $('#bell'), bellSpotEl = $('.bell-spot');
// 0 = 나(파랑 · 오른쪽), 1 = Coco(분홍 · 왼쪽)
const PL = [0, 1].map(i => ({
  i, tray: $('#t' + i), deck: $('#t' + i + ' .deck'), well: $('#t' + i + ' .well'), label: $('#t' + i + ' .label'),
  slots: [...document.querySelectorAll('#s' + i + ' .slot')],
}));
const BACK = ['card/my_card.png', 'card/coco_card.png'];
const TOKEN = ['card/my_s.png', 'card/coco_s.png'];

/* ── 렌더러 (WebGL이 안 되면 여기서 끝 → HTML 판 그대로) ── */
const canvas = document.createElement('canvas');
canvas.className = 'gl-board';
canvas.setAttribute('aria-hidden', 'true');
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  console.warn('[판 3D] WebGL을 쓸 수 없어서 원래 HTML 판으로 보여요.', e);
  return;
}
const orbitBack = sceneEl.querySelector('.orbit-back');
sceneEl.insertBefore(canvas, orbitBack ? orbitBack.nextSibling : sceneEl.firstChild);   // 시작 화면: 뒤쪽 카드 < 3D 종 < 앞쪽 카드
app.classList.add('gl-on');
document.body.classList.add('gl-on');
/* ── 기기 성능에 맞춘 화질 (태블릿 · 전자칠판) ──
   high: 선명(최대 2배) + 부드러운 그림자 · mid: 1.5배 + 보통 그림자 · low: 1배 + 가벼운 그림자
   그려야 할 화소 수에도 한도를 둬요 (큰 전자칠판 4K는 high여도 약 400만 화소까지만 → 조금 덜 선명해도 부드럽게).
   카드가 움직이는 동안 실제 속도를 재서, 느리면 한 단계씩 내리고 low에서도 느리면 원래 HTML 판으로 바꿔요. */
const TIERS = [
  { name: 'high', pr: 2, px: 4.2e6, shadow: T.VSMShadowMap, map: 1024 },
  { name: 'mid', pr: 1.5, px: 2.6e6, shadow: T.PCFSoftShadowMap, map: 1024 },
  { name: 'low', pr: 1, px: 1.6e6, shadow: T.PCFShadowMap, map: 512 },
];
const gl = renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const GPU = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
let tier = 0;
if (/SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic/i.test(GPU)) tier = 2;                 // 그래픽 칩 없이 CPU로 그리는 기기
else if (/Mali-[4T]|Adreno \(TM\) [2-5]\d\d|PowerVR|Intel.*HD Graphics [2-5]\d{2,3}\b|Intel.*HD Graphics$/i.test(GPU) ||
         (navigator.deviceMemory && navigator.deviceMemory <= 2)) tier = 1;                         // 오래된 태블릿 · 노트북
const forced = TIERS.findIndex(q => q.name === FORCE);
if (forced >= 0) tier = forced;
else if (MEMO_START && MEMO_START.gpu === GPU) tier = Math.max(tier, TIERS.findIndex(q => q.name === MEMO_START.v));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TIERS[tier].shadow;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new T.Scene();
const camera = new T.PerspectiveCamera();
const board = new T.Group();          // 탁자 좌표: x 오른쪽 · y 먼 쪽(위) · z 탁자 면에서 위로 (단위 = CSS px)
board.matrixAutoUpdate = false;
scene.add(board);
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.27;

// 빛: 하늘빛(위에서 고르게) + 해(왼쪽 위 먼 쪽에서 → 그림자는 오른쪽 앞으로, 원래 CSS 그림자 방향)
const hemi = new T.HemisphereLight(0xffffff, 0xaec4d2, 0.8);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff4e8, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(TIERS[tier].map);   // 그림자 지도 크기 (화질 단계에 따라)
sun.shadow.radius = 5;
sun.shadow.blurSamples = 10;
sun.shadow.bias = -0.0006;
board.add(sun, sun.target);
const SUN_DIR = new T.Vector3(-0.42, 0.62, 1).normalize();

/* ── 손 · 마우스 따라가기 ──
   · 공간: 손이 가는 쪽으로 보는 자리(카메라 = CSS perspective-origin)가 살짝 옮겨 가요 → 탁자 · 종 · Coco · 카드가 진짜 입체처럼 엇갈려 움직이고
           방 배경(맨 뒤)도 따라 움직여요. HTML 판도 같은 값으로 움직여서 누르는 자리 · 말풍선이 그대로 맞아요.
   · 빛: 해도 손 쪽으로 살짝 → 그림자가 손을 따라 기울어요
   · 캐릭터(gl/bell3d.js · gl/coco3d.js): pointer 값을 읽어서 손을 바라보고 몸을 돌려요
   마우스는 4초, 손가락은 2.5초 동안 안 움직이면 천천히 제자리로. '동작 줄이기' 설정이면 공간 · 몸은 안 움직여요 */
const RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const pointer = { x: innerWidth / 2, y: innerHeight / 2, t: -1e9, mouse: false, down: false, tapT: -1e9, tapX: 0, tapY: 0, inside: true };
const engaged = () => !pointer.hold && pointer.inside && performance.now() - pointer.t < (pointer.mouse ? 4000 : 2500);
function onMove(x, y, mouse) { pointer.x = x; pointer.y = y; pointer.t = performance.now(); pointer.mouse = mouse; pointer.inside = true; wantDraw = true; }
addEventListener('pointermove', e => onMove(e.clientX, e.clientY, e.pointerType === 'mouse'), { passive: true });
addEventListener('pointerdown', e => {
  onMove(e.clientX, e.clientY, e.pointerType === 'mouse');
  pointer.down = true; pointer.tapT = performance.now(); pointer.tapX = e.clientX; pointer.tapY = e.clientY;
}, { passive: true, capture: true });
addEventListener('pointerup', () => { pointer.down = false; }, { passive: true, capture: true });
addEventListener('touchmove', e => { const t = e.touches && e.touches[0]; if (t) onMove(t.clientX, t.clientY, false); }, { passive: true, capture: true });
document.documentElement.addEventListener('mouseleave', () => { pointer.inside = false; wantDraw = true; });
addEventListener('blur', () => { pointer.inside = false; wantDraw = true; });
const PARA = { x: .085, y: .055, bg: .45, sun: .2 };   // 시점 이동(화면 폭 · 높이의 몇 배) · 배경은 그 몇 배 · 해 방향
const par = { x: 0, y: 0, fx: .5, fy: -.1 };
{ const cs = getComputedStyle(sceneEl), po = cs.perspectiveOrigin.split(' ');   // 원래 시점(CSS) → 비율로 기억
  par.fx = (parseFloat(po[0]) || sceneEl.clientWidth / 2) / Math.max(1, sceneEl.clientWidth);
  par.fy = (parseFloat(po[1]) || 0) / Math.max(1, sceneEl.clientHeight); }
// 방 배경 층: .app 배경을 그대로 물려받아 조금 크게 깔고 손 따라 살짝 옮김
const space = document.createElement('div');
space.className = 'gl-space';
space.setAttribute('aria-hidden', 'true');
app.insertBefore(space, app.firstChild);
function applyParallax(dt) {
  const W = sceneEl.clientWidth, H = sceneEl.clientHeight, on = engaged() && !RM.matches;
  const tx = on ? Math.max(-1, Math.min(1, (pointer.x - W / 2) / (W / 2))) : 0;
  const ty = on ? Math.max(-1, Math.min(1, (pointer.y - H / 2) / (H / 2))) : 0;
  const k = 1 - Math.exp(-dt / (on ? 240 : 650));            // 따라갈 땐 부드럽게, 제자리로는 더 천천히
  par.x += (tx - par.x) * k; par.y += (ty - par.y) * k;
  if (Math.abs(tx - par.x) < .0005) par.x = tx;
  if (Math.abs(ty - par.y) < .0005) par.y = ty;
  const ox = par.x * PARA.x * W, oy = par.y * PARA.y * H;
  sceneEl.style.perspectiveOrigin = `${(par.fx * W + ox).toFixed(2)}px ${(par.fy * H + oy).toFixed(2)}px`;
  space.style.transform = `translate3d(${(ox * PARA.bg).toFixed(2)}px, ${(oy * PARA.bg).toFixed(2)}px, 0)`;
  return par.x !== tx || par.y !== ty;
}

/* ── 숫자 도우미 ── */
let fakeNow = null;                           // 확인용: 시간을 멈춰 두고 한 장면씩 찍을 때 (Board3D.at)
const now = () => (fakeNow != null ? fakeNow : performance.now());
const NUM = v => parseFloat(v) || 0;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function bezier(x1, y1, x2, y2) {            // CSS cubic-bezier와 같은 곡선
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, D = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = D(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
    if (t < 0 || t > 1 || Math.abs(X(t) - x) > 1e-3) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { (X(t) < x) ? lo = t : hi = t; t = (lo + hi) / 2; } }
    return Y(t);
  };
}
const easeDeal = bezier(.2, .9, .25, 1.05);   // 원래 카드 나오기(deal)와 같은 곡선
const easeFly = bezier(.3, .7, .3, 1);        // 원래 S가 칸으로 날아가기와 같은 곡선
const easePop = bezier(.3, 1.7, .5, 1);       // 원래 S 토큰 톡 튀어나오기와 같은 곡선
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ── CSS 색 → three 색 (oklch도 그대로: 캔버스에 칠해서 읽음) ── */
const c1 = document.createElement('canvas'); c1.width = c1.height = 1;
const g1 = c1.getContext('2d', { willReadFrequently: true });
function rgba(css) { g1.clearRect(0, 0, 1, 1); g1.fillStyle = '#000'; g1.fillStyle = css; g1.fillRect(0, 0, 1, 1); const d = g1.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255]; }
const colorCache = new Map();
function color(css) {
  let c = colorCache.get(css);
  if (!c) { const [r, g, b] = rgba(css); c = new T.Color().setRGB(r, g, b, T.SRGBColorSpace); colorCache.set(css, c); }
  return c;
}
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ── 모양 ── */
function rrTo(p, x, y, w, h, r) {
  r = Math.max(0.01, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x + w, y + h - r); p.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  p.lineTo(x + r, y + h); p.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x, y + r); p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}
const rrShape = (w, h, r) => rrTo(new T.Shape(), -w / 2, -h / 2, w, h, r);
function planarUV(geo, w, h) {               // 윗면 그림: 물건 폭 · 높이에 꼭 맞게 (가운데 기준)
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / w + .5; uv[i * 2 + 1] = p.getY(i) / h + .5; }
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return geo;
}
// 둥근 판(두께 있음): z 0 ~ depth. 재질 [윗면·밑면, 옆면]
function slabGeo(w, h, r, depth, bevel, hole) {
  bevel = Math.max(0, Math.min(bevel, depth / 2 - 0.01, w / 4, h / 4));
  const s = rrShape(w - 2 * bevel, h - 2 * bevel, Math.max(0.5, r - bevel));
  if (hole) s.holes.push(rrTo(new T.Path(), -(hole.w + 2 * bevel) / 2, -(hole.h + 2 * bevel) / 2, hole.w + 2 * bevel, hole.h + 2 * bevel, hole.r + bevel));
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.01, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, bevel);
  return planarUV(g, w, h);
}
const plateGeo = (w, h, r) => planarUV(new T.ShapeGeometry(rrShape(w, h, r), 10), w, h);

/* ── 그림(텍스처): src/gl-tex.js 안에 넣어 둔 그림 → 없으면 파일 주소로 ── */
const texCache = new Map();
const texKey = src => { const m = String(src || '').match(/assets\/([^?#]+)/); return m ? decodeURIComponent(m[1]) : String(src || ''); };
function imageTex(src) {
  const key = texKey(src);
  let tex = texCache.get(key);
  if (tex) return tex;
  const img = new Image();
  tex = new T.Texture(img);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = ANISO;
  img.onload = () => { tex.needsUpdate = true; kick(); };
  img.onerror = () => console.warn('[판 3D] 그림을 못 읽었어요:', key);
  img.src = (window.GL_TEX && window.GL_TEX[key]) || src;
  texCache.set(key, tex);
  return tex;
}
Object.keys(window.GL_TEX || {}).forEach(imageTex);   // 미리 풀어 둠 → 카드가 나오자마자 그림이 보이게

function canvasTex(w, h, draw, maxPx, shared) {
  const s = Math.min(2.5, (maxPx || 2048) / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.max(4, Math.round(w * s)); cv.height = Math.max(4, Math.round(h * s));
  const g = cv.getContext('2d');
  g.scale(cv.width / w, cv.height / h);
  draw(g, s);
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = ANISO;
  if (!shared) t.userData.owned = true;    // 이 물건만 쓰는 그림 → 물건을 치울 때 같이 치움
  return t;
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// CSS inset box-shadow 같은 안쪽 그림자 (s = 캔버스 배율: 그림자 흐림 · 거리는 배율을 안 따라가서)
function insetShadow(g, s, x, y, w, h, r, css, blur, dy) {
  g.save();
  g.beginPath(); rr(g, x, y, w, h, r); g.clip();
  g.shadowColor = css; g.shadowBlur = blur * s; g.shadowOffsetX = 0; g.shadowOffsetY = dy * s;
  g.beginPath(); g.rect(x - w, y - h, w * 3, h * 3); rr(g, x, y, w, h, r);
  g.fillStyle = '#000'; g.fill('evenodd');
  g.restore();
}
function spacedText(g, text, cx, cy, spacing) { // letter-spacing (캔버스 letterSpacing이 없는 브라우저도)
  const ws = [...text].map(ch => g.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + spacing * (ws.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => { g.fillText(ch, x + ws[i] / 2, cy); x += ws[i] + spacing; });
}
let grain = null;
function grainPattern(g) {
  if (!grain) {
    grain = document.createElement('canvas'); grain.width = grain.height = 160;
    const q = grain.getContext('2d'), d = q.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = rnd() < .5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 5 + rnd() * 7; }
    q.putImageData(d, 0, 0);
  }
  return g.createPattern(grain, 'repeat');
}

/* ── 재질 ── */
const std = o => new T.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: 0 }, o));
// 탁자(테두리 · 바닥 · 천)는 깊이를 안 남기고 맨 먼저 그려요(바닥 그림처럼). 그래서 종 · Coco를 원래 그림처럼
// 낮은 각도에서 본 모습으로 세워도(받침 뒤쪽이 탁자 면 아래로 내려가도) 탁자에 잘리지 않아요.
const M = {
  rim: std({ roughness: .5, depthWrite: false }), rimSide: std({ roughness: .55, depthWrite: false }), felt: std({ roughness: .96, depthWrite: false }),
  paper: std({ roughness: .62 }),
  trayTop: [std({ roughness: .6 }), std({ roughness: .6 })], traySide: [std({ roughness: .58 }), std({ roughness: .58 })],
  coinSide: [std({ roughness: .4 }), std({ roughness: .4 })],
};
const faceMats = new Map();
function faceMat(tex) {
  let m = faceMats.get(tex.uuid);
  if (!m) {
    m = std({ map: tex, roughness: .46, alphaTest: .5, alphaToCoverage: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    faceMats.set(tex.uuid, m);
  }
  return m;
}
function paint() {   // 색은 CSS 변수에서 (원래 판과 같은 색)
  M.rim.color.copy(color(cssVar('--rim')));
  M.rimSide.color.copy(color(cssVar('--rim-side')));
  M.paper.color.copy(color(cssVar('--paper')));
  ['--p1', '--p2'].forEach((v, i) => { M.trayTop[i].color.setScalar(.95); M.traySide[i].color.copy(color(cssVar(v + '-deep'))); });
  M.coinSide[0].color.copy(color('oklch(0.55 0.15 275)'));
  M.coinSide[1].color.copy(color('oklch(0.6 0.15 18)'));
}
paint();

/* ── HTML 판 자리 읽기 (탁자 왼쪽 위 기준 CSS px, 기울이기 전 · translate 포함) ── */
function tr(el) {
  const v = getComputedStyle(el).translate;
  if (!v || v === 'none') return [0, 0];
  const p = v.split(' ');
  const f = (s, size) => (s && s.endsWith('%') ? NUM(s) / 100 * size : NUM(s));
  return [f(p[0], el.offsetWidth), f(p[1], el.offsetHeight)];
}
function rectIn(el) {
  let x = 0, y = 0, e = el;
  while (e && e !== tableEl) {
    x += e.offsetLeft; y += e.offsetTop;
    const t = tr(e); x += t[0]; y += t[1];
    const op = e.offsetParent;
    if (op && op !== tableEl) { x += op.clientLeft; y += op.clientTop; }
    e = op;
  }
  const w = el.offsetWidth, h = el.offsetHeight;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
function measure() {
  const cs = getComputedStyle(sceneEl), ts = getComputedStyle(tableEl), po = cs.perspectiveOrigin.split(' ');
  const L = {
    W: sceneEl.clientWidth, H: sceneEl.clientHeight,
    persp: NUM(cs.perspective) || 1500, pox: NUM(po[0]), poy: NUM(po[1]),
    tm: ts.transform, to: ts.transformOrigin,
    tx: tableEl.offsetLeft, ty: tableEl.offsetTop, tw: tableEl.offsetWidth, th: tableEl.offsetHeight,
    felt: rectIn(feltEl), fm: getComputedStyle(feltEl).transform, fo: getComputedStyle(feltEl).transformOrigin,
    trays: PL.map(p => ({ tray: rectIn(p.tray), deck: rectIn(p.deck), well: rectIn(p.well), label: rectIn(p.label) })),
    slots: PL.map(p => p.slots.map(rectIn)),
    spot: rectIn(spotEl), spotOp: NUM(getComputedStyle(spotEl).opacity),
    hint: hintEl.style.display !== 'none',
    bell: rectIn(bellSpotEl), bellScale: NUM(getComputedStyle(bellSpotEl).scale) || 1,
    game: app.dataset.screen === 'game',
  };
  L.vh = L.H / 100;
  return L;
}

/* ── 카메라 = CSS 원근 그대로 ── */
const S_FLIP = new T.Matrix4().makeScale(1, -1, 1), mA = new T.Matrix4(), mB = new T.Matrix4(), mC = new T.Matrix4();
const restCam = new T.Vector3();
function applyCamera(L) {
  const n = 200, f = 8000, P = L.persp;
  restCam.set(par.fx * L.W, -par.fy * L.H, P);           // 손 따라 옮기기 전 (원래 CSS 시점)
  camera.position.set(L.pox, -L.poy, P);
  camera.quaternion.identity();
  camera.updateMatrixWorld(true);
  camera.projectionMatrix.makePerspective(-L.pox * n / P, (L.W - L.pox) * n / P, L.poy * n / P, (L.poy - L.H) * n / P, n, f);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
const UP = new T.Vector3();
function applyBoard(L) {
  const o = L.to.split(' ').map(NUM);
  const dm = L.tm && L.tm !== 'none' ? new DOMMatrix(L.tm) : new DOMMatrix();
  mB.fromArray(dm.toFloat64Array());
  mA.makeTranslation(L.tx + o[0], L.ty + o[1], o[2] || 0);
  mC.makeTranslation(-o[0], -o[1], -(o[2] || 0));
  board.matrix.copy(S_FLIP).multiply(mA).multiply(mB).multiply(mC);
  mRest.copy(board.matrix).multiply(S_FLIP);            // 돌리기 전 판
  mAz.copy(board.matrix);
  if (L.fm && L.fm !== 'none') {                         // 360° 돌리기: 천(.felt) 변형을 판 전체(탁자 · 물건 · 바닥 그림자)에
    const fo = L.fo.split(' ').map(NUM), ox = L.felt.x + fo[0], oy = L.felt.y + fo[1], oz = fo[2] || 0;
    mD.makeTranslation(ox, oy, oz);
    mE.fromArray(new DOMMatrix(L.fm).toFloat64Array());
    mF.makeTranslation(-ox, -oy, -oz);
    board.matrix.multiply(mD).multiply(mE).multiply(mF);
    // 위아래(높이)만 뺀 판: 캐릭터가 어느 쪽으로 젖힐지 정하는 데 (바로 위에서 볼 때 카메라가 뒤쪽으로 넘어가도 뒤집히지 않게)
    if (view.azCss) mAz.multiply(mD).multiply(mE.fromArray(new DOMMatrix(view.azCss).toFloat64Array())).multiply(mF);
    else mAz.copy(board.matrix);
  }
  board.matrix.multiply(S_FLIP);
  mAz.multiply(S_FLIP);
  board.matrixWorldNeedsUpdate = true;
  UP.set(0, 0, 1).transformDirection(board.matrix);   // 하늘빛은 탁자 위쪽에서
  hemi.position.copy(UP);
  // 해: 원래 방향(왼쪽 위 먼 쪽)에서 손 쪽으로 살짝 → 그림자가 손을 따라 기울어요.
  // 판을 돌려도 해는 방에 그대로 → 그림자가 판 위에서 빙 돌아가요
  sunDir.copy(SUN_DIR); sunDir.x += par.x * PARA.sun; sunDir.y -= par.y * PARA.sun * .6; sunDir.normalize();
  // 위아래(높이)는 보는 눈만 움직이는 거라 해는 판에 그대로 → 위에서 봐도 · 낮게 봐도 판이 어두워지지 않아요
  if (view.turned) sunDir.applyAxisAngle(ZAX, view.az * Math.PI / 180);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, sunDist);
}
const mRest = new T.Matrix4(), mAz = new T.Matrix4(), mD = new T.Matrix4(), mE = new T.Matrix4(), mF = new T.Matrix4(), ZAX = new T.Vector3(0, 0, 1);
const sunDir = new T.Vector3();
let sunDist = 4000;

/* ── 판 만들기 (크기가 바뀔 때만 다시) ── */
const V = {};          // 지금 판의 3D 물건들
let builtKey = '', fontsReady = false;
let TH = 0, RIM_H = 0, TRAY_H = 0, CT = 0, DECK_CT = 0, SLOT_CT = 0, vh = 8;
const DECK_N = 7, LABEL_UP = 1.1;
function dispose(o) {
  if (!o) return;
  o.traverse(n => {
    if (n.geometry && !n.geometry.userData.keep) n.geometry.dispose();
    const ms = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    ms.forEach(m => { if (m.map && m.map.userData.owned) m.map.dispose(); if (m.userData.own) m.dispose(); });
  });
  o.parent && o.parent.remove(o);
}
const own = m => { m.userData.own = true; return m; };
function build(L) {
  const key = [L.W, L.H, L.tw, L.th, L.felt.w, L.felt.h,
    ...L.trays.flatMap(t => [t.tray.w, t.tray.h, t.deck.w, t.deck.h, t.deck.cx - t.tray.cx, t.deck.cy - t.tray.cy, t.well.w, t.well.h, t.label.cy - t.tray.cy]),
    L.slots[0][0].w, L.slots[0][0].h, L.spot.w, L.spot.h, fontsReady].map(v => Math.round(+v * 10)).join(',');
  if (key === builtKey) return false;
  builtKey = key;
  vh = L.vh;
  TH = 2.6 * vh; RIM_H = .9 * vh; TRAY_H = 1.4 * vh; CT = .42 * vh; DECK_CT = .4 * vh; SLOT_CT = .3 * vh;
  ['table', 'trays', 'slotWells', 'spot'].forEach(k => { [].concat(V[k] || []).flat().forEach(dispose); V[k] = null; });
  paint();
  const tw = L.tw, th = L.th, f = L.felt;

  /* 탁자: 두꺼운 바닥 + 살짝 솟은 테두리 + 안쪽 천(펠트) + 바닥에 지는 그림자 */
  const table = new T.Group();
  table.position.set(tw / 2, -th / 2, 0);
  const base = new T.Mesh(slabGeo(tw, th, 7 * vh, TH, .7 * vh), [M.rim, M.rimSide]);
  base.position.z = -TH - .25 * vh;
  base.castShadow = true; base.receiveShadow = true; base.renderOrder = -4;
  const rim = new T.Mesh(slabGeo(tw, th, 7 * vh, RIM_H + .25 * vh, .45 * vh, { w: f.w, h: f.h, r: 5 * vh }), [M.rim, M.rim]);
  rim.position.z = -.25 * vh;
  rim.castShadow = true; rim.receiveShadow = true; rim.renderOrder = -3;
  const feltTex = canvasTex(f.w, f.h, (g, s) => {
    const A = cssVar('--table'), B = cssVar('--table-deep');
    g.save(); g.translate(f.w * .5, f.h * .45); g.scale(f.w * .79, f.h * .71);   // CSS: ellipse at 50% 45% (farthest-corner)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(.4, A); gr.addColorStop(1, B);
    g.fillStyle = gr; g.fillRect(-2, -2, 4, 4); g.restore();
    g.fillStyle = grainPattern(g); g.fillRect(0, 0, f.w, f.h);                     // 천 느낌 아주 살짝
    insetShadow(g, s, 0, 0, f.w, f.h, 5 * vh, 'oklch(0.4 0.06 215 / .25)', 1.6 * vh, 1 * vh);
  });
  M.felt.map = feltTex; M.felt.needsUpdate = true;
  const felt = new T.Mesh(plateGeo(f.w, f.h, 5 * vh), M.felt);
  felt.position.set(f.cx - tw / 2, -(f.cy - th / 2), 0);
  felt.receiveShadow = true; felt.renderOrder = -2;
  const mg = 12 * vh;
  const floorTex = canvasTex(tw + mg * 2, th + mg * 2, (g, s) => {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const off = 10000;
    g.shadowColor = 'oklch(0.3 0.05 60 / .42)'; g.shadowBlur = 8 * vh * s; g.shadowOffsetX = off; g.shadowOffsetY = 0;
    g.beginPath(); rr(g, (mg - off / s) * s, mg * s, tw * s, th * s, 7 * vh * s); g.fillStyle = '#000'; g.fill();
    g.restore();
  }, 1024);
  // 바닥 그림자: 탁자보다 먼저 그려야 해서(탁자가 깊이를 안 남김) '투명' 대신 직접 섞기로 불투명 차례에 그림
  const floor = new T.Mesh(new T.PlaneGeometry(tw + mg * 2, th + mg * 2), own(new T.MeshBasicMaterial({ map: floorTex, transparent: false, depthWrite: false, toneMapped: false,
    blending: T.CustomBlending, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor })));
  floor.position.set(0, -3.2 * vh, -TH - 1.6 * vh);
  floor.renderOrder = -5;
  table.add(floor, base, rim, felt);
  board.add(table);
  V.table = table;

  /* 해: 탁자 가운데를 비추고, 그림자 범위는 탁자 크기만큼 */
  const D = Math.max(tw, th) * 2;
  sunDist = D;
  sun.target.position.set(tw / 2, -th / 2, 0);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, D);
  const sc = sun.shadow.camera, half = Math.max(tw, th) * .62;
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = D - half * 1.6; sc.far = D + half * 1.6;
  sc.updateProjectionMatrix();

  /* 나 · Coco 칸 (두께 있는 판 + 윗면에 이름 · 카드 놓는 오목한 자리) + 카드 더미 */
  V.trays = L.trays.map((t, i) => {
    const R = t.tray, grp = new T.Group();
    const trayColor = getComputedStyle(PL[i].tray).backgroundColor;
    const top = canvasTex(R.w, R.h, (g, s) => {
      g.fillStyle = trayColor; g.fillRect(0, 0, R.w, R.h);
      const w = t.well, wx = w.x - R.x, wy = w.y - R.y;
      g.beginPath(); rr(g, wx, wy, w.w, w.h, 2 * vh); g.fillStyle = 'rgb(255 255 255 / .18)'; g.fill();
      insetShadow(g, s, wx, wy, w.w, w.h, 2 * vh, 'oklch(0.2 0.05 260 / .3)', 1.4 * vh, .8 * vh);
      const lb = t.label;
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 ${4.2 * vh}px Fredoka, sans-serif`;
      // 원래 자리보다 조금 위로: 더미가 두께가 있어서, 손 따라 시점이 낮아지거나 맨 위 카드가 들리면
      // 바로 뒤의 이름을 가려 글자 끝만 하얗게 삐죽 보였어요 (판 윗면 여백 2vh 안에서 옮김)
      spacedText(g, PL[i].label.textContent.trim(), lb.cx - R.x, lb.cy - R.y + .2 * vh - LABEL_UP * vh, .02 * 4.2 * vh);
    }, 1024);
    M.trayTop[i].map = top; M.trayTop[i].needsUpdate = true;
    const slab = new T.Mesh(slabGeo(R.w, R.h, 3 * vh, TRAY_H, .5 * vh), [M.trayTop[i], M.traySide[i]]);
    slab.castShadow = true; slab.receiveShadow = true;
    grp.add(slab);
    // 카드 더미: 뒷면 그림 카드 7장 — 반듯하게 틈 없이 쌓아 옆면이 고른 종이 결로 보이게
    // (조금씩 삐뚤게 · 사이를 띄워 쌓았더니 둥근 모서리가 어긋나고 얇은 틈이 계단처럼 깨져 보였어요)
    // 그림자 지도도 받지 않아요: 판 전체를 덮는 지도라 얇은 카드 옆면 위에선 칸이 굵어 얼룩져요 (종과 같은 이유) — 탁자엔 그대로 드리움
    const deck = new T.Group(), back = imageTex(BACK[i]);
    deck.position.set(t.deck.cx - R.cx, -(t.deck.cy - R.cy), TRAY_H);
    for (let k = 0; k < DECK_N; k++) {
      const c = makeCard(t.deck.w, t.deck.h, t.deck.w * .092, DECK_CT, back, back);
      c.position.set(0, 0, DECK_CT / 2 + k * DECK_CT);
      c.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
      // 앞 · 뒤 그림판은 카드 크기 그대로라 둥글게 깎인 옆면 밖으로 살짝 나와 이웃 카드에 박혀요 → 옆면에 하얀 점 · 끊긴 줄.
      // 보이는 건 맨 위 카드의 윗면 하나뿐이라 나머지 그림판은 끔 (그리는 양도 줄어요)
      const [, front, backFace] = c.children;
      backFace.visible = false;
      front.visible = k === DECK_N - 1;
      deck.add(c);
    }
    grp.add(deck);
    grp.userData = { deck, shakeT0: 0 };
    board.add(grp);
    return grp;
  });

  /* S 칸(획득한 카드 놓는 자리): 탁자에 한 톤 깊게 파인 자리 */
  V.slotWells = L.slots.map((row, i) => row.map((R, j) => {
    const fill = getComputedStyle(PL[i].slots[j]).backgroundColor;
    const tex = canvasTex(R.w, R.h, (g, s) => {
      const r = .7 * vh;
      g.beginPath(); rr(g, 0, 0, R.w, R.h, r); g.fillStyle = fill; g.fill();
      insetShadow(g, s, 0, 0, R.w, R.h, r, 'oklch(0.42 0.07 215 / .34)', 1.1 * vh, .55 * vh);
      insetShadow(g, s, 0, 0, R.w, R.h, r, 'rgb(255 255 255 / .42)', .4 * vh, -.25 * vh);
    }, 256);
    const m = new T.Mesh(plateGeo(R.w, R.h, .7 * vh), own(std({ map: tex, transparent: true, depthWrite: false, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    m.receiveShadow = true; m.renderOrder = 1;
    board.add(m);
    return m;
  }));

  /* 카드 자리: 점선 테두리 + CARD ZONE */
  const SP = L.spot, spot = new T.Group();
  const line = canvasTex(SP.w, SP.h, g => {
    const bw = .5 * vh;
    g.beginPath(); rr(g, bw / 2, bw / 2, SP.w - bw, SP.h - bw, 2.4 * vh - bw / 2);
    g.setLineDash([1.6 * vh, 1.1 * vh]); g.lineWidth = bw; g.lineCap = 'round'; g.strokeStyle = 'oklch(0.45 0.06 220 / .55)'; g.stroke();
  }, 1024);
  const hint = canvasTex(SP.w, SP.h, g => {
    const fs = 5 * vh;
    g.fillStyle = 'oklch(0.42 0.06 220)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${fs}px Fredoka, sans-serif`;
    spacedText(g, 'CARD', SP.w / 2, SP.h / 2 - fs * .52, fs * .1);
    spacedText(g, 'ZONE', SP.w / 2, SP.h / 2 + fs * .52, fs * .1);
  }, 1024);
  const pg = new T.PlaneGeometry(SP.w, SP.h);
  const lineM = new T.Mesh(pg, own(std({ map: line, transparent: true, depthWrite: false, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  const hintM = new T.Mesh(pg, own(std({ map: hint, transparent: true, depthWrite: false, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  lineM.receiveShadow = hintM.receiveShadow = true;
  lineM.renderOrder = hintM.renderOrder = 1;
  spot.add(lineM, hintM);
  spot.userData = { lineM, hintM };
  board.add(spot);
  V.spot = spot;

  parts.forEach(pt => { try { pt.build && pt.build(L); } catch (e) { console.error('[판 3D] 부품 만들기 오류', e); } });
  // 이미 있는 카드 · S 칸 카드는 새 크기로
  cards.forEach(c => resizeCard(c));
  slotState.forEach(row => row.forEach(st => { if (st.card) { dispose(st.card); st.card = null; } if (st.coin) { dispose(st.coin); st.coin = null; } st.dirty = true; }));
  return true;
}

/* ── 카드 (두께 있는 종이 카드: 옆면 + 앞면 그림 + 뒷면 그림) ── */
const geoCache = new Map();
function cardGeo(w, h, r, t) {
  const k = [w, h, r, t].map(v => v.toFixed(1)).join('|');
  let g = geoCache.get(k);
  if (!g) {
    g = { body: slabGeo(w, h, r, t, t * .45), face: plateGeo(w, h, r) };
    g.body.userData.keep = g.face.userData.keep = true;
    geoCache.set(k, g);
  }
  return g;
}
function makeCard(w, h, r, t, frontTex, backTex) {
  const G = cardGeo(w, h, r, t), grp = new T.Group();
  grp.rotation.order = 'ZYX';      // 뒤집기(Y)는 카드 기준, 돌리기(Z)는 탁자 기준
  const body = new T.Mesh(G.body, M.paper);
  body.position.z = -t / 2; body.castShadow = true; body.receiveShadow = true;
  const frontMat = frontTex.userData.owned
    ? own(std({ map: frontTex, roughness: .46, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
    : faceMat(frontTex);
  const front = new T.Mesh(G.face, frontMat);
  front.position.z = t / 2 + .06; front.receiveShadow = true;
  const back = new T.Mesh(G.face, faceMat(backTex));
  back.rotation.y = Math.PI; back.position.z = -t / 2 - .06; back.receiveShadow = true;
  grp.add(body, front, back);
  grp.userData.size = [w, h];
  return grp;
}

/* 판 가운데에 나온 카드들 (HTML #spot .card 하나당 하나) */
const cards = [];             // { el, who, obj, src, dealT0, from, rz, hopT0, shakeT0, bumpT0, sinkT0, z }
const DEAL_MS = 620;
function cardSize(el) { return [el.offsetWidth || 22 * vh, el.offsetHeight || 29.33 * vh]; }
function frontTexOf(el) {
  const img = el.querySelector('.card-img');
  if (img) return imageTex(img.getAttribute('src'));
  return textCardTex(el);
}
// 그림 없는 카드(2단계 '그림 자리' · 3단계 낱말만): 숨겨 둔 HTML 카드 앞면을 그대로 옮겨 그림
// (자리 · 글꼴 · 색 · 점선을 HTML에서 읽으니 원래 카드와 같은 모양 — CSS를 고쳐도 따라감)
function offsetIn(e, root) {
  let x = 0, y = 0;
  for (let n = e; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return [x, y];
}
function drawText(g, t, root) {
  const cs = getComputedStyle(t), text = t.textContent.trim();
  if (!text) return;
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  g.fillStyle = cs.color; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const m = g.measureText(text), A = m.fontBoundingBoxAscent || NUM(cs.fontSize) * .8, D = m.fontBoundingBoxDescent || NUM(cs.fontSize) * .2;
  const [x, y] = offsetIn(t, root), pt = NUM(cs.paddingTop), pb = NUM(cs.paddingBottom);
  const boxH = t.offsetHeight - pt - pb, lh = cs.lineHeight === 'normal' ? A + D : NUM(cs.lineHeight);
  const top = y + pt + (boxH - lh) / 2;               // 줄 높이 안에서 글자 칸을 가운데로 (CSS와 같은 방식)
  g.fillText(text, x + t.offsetWidth / 2, top + (lh - (A + D)) / 2 + A);
}
function textCardTex(el) {
  const front = el.querySelector('.front') || el, [w, h] = cardSize(el);
  const t = canvasTex(w, h, () => {}, 1024);
  const paint = () => {                                // 글꼴을 늦게 받아도 다시 그림
    const cv = t.image, g = cv.getContext('2d');
    g.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = getComputedStyle(front).backgroundColor; g.fillRect(0, 0, w, h);   // 모서리는 3D 카드 모양이 잘라 줌
    const art = front.querySelector('.art');
    if (art) {
      const a = getComputedStyle(art), [x, y] = offsetIn(art, front), aw = art.offsetWidth, ah = art.offsetHeight, r = NUM(a.borderTopLeftRadius);
      g.beginPath(); rr(g, x, y, aw, ah, r); g.fillStyle = a.backgroundColor; g.fill();
      const ow = NUM(a.outlineWidth), oo = NUM(a.outlineOffset);
      if (a.outlineStyle === 'dashed' && ow > 0) {     // 점선 테두리 (outline-offset이 음수면 안쪽)
        const ins = -oo - ow / 2;
        g.save(); g.setLineDash([ow * 3, ow * 3]); g.lineWidth = ow; g.strokeStyle = a.outlineColor;
        g.beginPath(); rr(g, x + ins, y + ins, aw - 2 * ins, ah - 2 * ins, Math.max(.5, r - ins)); g.stroke(); g.restore();
      }
      art.querySelectorAll('small, strong').forEach(e => drawText(g, e, front));
    }
    front.querySelectorAll('.word').forEach(e => drawText(g, e, front));
    t.needsUpdate = true; kick();
  };
  paint();
  if (!fontsReady && document.fonts) document.fonts.ready.then(paint);
  return t;
}
function addCard(el) {
  const who = (el.style.getPropertyValue('--fx') || '').trim().startsWith('-') ? 1 : 0;   // Coco 카드는 왼쪽(-)에서 와요
  const c = { el, who, front: frontTexOf(el), dealT0: now(), rz: 0, z: null, hopT0: 0, shakeT0: 0, bumpT0: 0, sinkT0: 0, ringM: null, glowM: null };
  c.fr = -NUM(el.style.getPropertyValue('--fr')) * Math.PI / 180;
  resizeCard(c);
  cards.push(c);
  return c;
}
function resizeCard(c) {
  const [w, h] = cardSize(c.el);
  if (c.obj && c.obj.userData.size[0] === w && c.obj.userData.size[1] === h) return;
  const old = c.obj;
  if (old && c.front.userData.owned) c.front = textCardTex(c.el);   // 글자 카드는 새 크기로 다시 그림 (옛 그림은 옛 카드와 같이 치움)
  c.obj = makeCard(w, h, w * .074, CT, c.front, imageTex(BACK[c.who]));
  // 맞았을 때: 카드 둘레 색 테두리(원래 CSS 0 0 0 1vh) + 바닥에 번지는 빛
  const ring = new T.Mesh(plateGeo(w + 2 * vh, h + 2 * vh, w * .074 + vh), own(new T.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false })));
  ring.position.z = -CT / 2 - .12; ring.visible = false;
  c.obj.add(ring); c.ringM = ring;
  board.add(c.obj);
  if (old) { c.obj.position.copy(old.position); c.obj.rotation.copy(old.rotation); dispose(old); }
}
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTex(300, 380, (g, s) => {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const off = 10000;
    g.shadowColor = '#fff'; g.shadowBlur = 34 * s; g.shadowOffsetX = off;
    g.beginPath(); rr(g, 50 * s - off, 50 * s, 200 * s, 280 * s, 18 * s); g.fillStyle = '#fff'; g.fill(); g.fill();
    g.restore();
  }, 512, true);
  return glowTex;
}
function syncCards() {
  const els = [...spotEl.querySelectorAll('.card')];
  cards.forEach(c => { if (!els.includes(c.el) && !c.sinkT0) c.sinkT0 = now(); });
  els.forEach(el => { if (!cards.some(c => c.el === el)) addCard(el); });
  kick();
}

/* S 칸에 들어간 카드 + S 동전 */
const slotState = PL.map(p => p.slots.map(el => ({ el, card: null, coin: null, flyT0: 0, from: null, popT0: 0, loseT0: 0, dirty: false })));
const slotOf = new Map();
slotState.forEach((row, i) => row.forEach((st, j) => slotOf.set(st.el, [i, j])));
function slotCard(i, j, L, srcTex) {
  const R = L.slots[i][j];
  const tex = srcTex.clone();                         // 칸 비율(1208:1524)에 맞춰 위아래를 살짝 잘라 꽉 차게(cover)
  const a = 3 / 4, s = R.w / R.h, keep = Math.min(1, a / s);
  tex.repeat.set(1, keep); tex.offset.set(0, (1 - keep) / 2); tex.needsUpdate = true; tex.userData = { owned: true };
  const m = own(std({ map: tex, roughness: .46, alphaTest: .5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const G = cardGeo(R.w, R.h, .7 * vh, SLOT_CT);
  const grp = new T.Group(); grp.rotation.order = 'ZYX';
  const body = new T.Mesh(G.body, M.paper); body.position.z = -SLOT_CT / 2; body.castShadow = true; body.receiveShadow = true;
  const front = new T.Mesh(G.face, m); front.position.z = SLOT_CT / 2 + .06; front.receiveShadow = true;
  grp.add(body, front);
  grp.userData.size = [R.w, R.h];
  board.add(grp);
  return grp;
}
function makeCoin(i, R) {
  const d = R.w * .52, rad = d * .47, ht = .5 * vh, grp = new T.Group();
  const side = new T.Mesh(new T.CylinderGeometry(rad, rad, ht, 40), M.coinSide[i]);
  side.rotation.x = Math.PI / 2; side.position.z = ht / 2; side.castShadow = true;
  const top = new T.Mesh(new T.PlaneGeometry(d, d), own(std({ map: imageTex(TOKEN[i]), roughness: .4, alphaTest: .5, alphaToCoverage: true })));
  top.position.z = ht + .08;
  grp.add(side, top);
  board.add(grp);
  return grp;
}

/* ── 반짝이 · 물결 ── */
const fx = [];                // { obj, t0, ms, step(k) }
let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  starTex = canvasTex(64, 64, g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath();
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 9 : 31; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.closePath(); g.fill();
  }, 64, true);
  return starTex;
}
// 점 크기: three는 '카메라에서 떨어진 거리' 기준이라, 화면에서 vh만큼 보이게 바꿔 줌 (원근 거리 ÷ 화면 반 높이)
const pointSize = (L, vhOnScreen) => vhOnScreen * L.persp / 50;
function sparkle(x, y, z, w, h, who) {
  const n = 26, pos = new Float32Array(n * 3), vel = [], col = new Float32Array(n * 3);
  const gold = color('oklch(0.86 0.16 88)'), mine = color(cssVar(who ? '--p2' : '--p1')), white = new T.Color(1, 1, 1);
  const L = last, sz = pointSize(L, 2.8);
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2, ex = Math.cos(a) * w * .55, ey = Math.sin(a) * h * .55;
    pos.set([x + ex, y + ey, z], k * 3);
    vel.push([ex * (1.2 + rnd()), ey * (1.2 + rnd()), (14 + rnd() * 16) * vh]);
    const r = rnd(), c = r < .45 ? gold : r < .75 ? mine : white; col.set([c.r, c.g, c.b], k * 3);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const mat = own(new T.PointsMaterial({ size: sz, map: starTexture(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
  const pts = new T.Points(geo, mat);
  pts.renderOrder = 5;
  board.add(pts);
  const base = pos.slice();
  fx.push({ obj: pts, t0: now(), ms: 900, step: k => {
    const t = k * .9;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = base[i * 3] + vel[i][0] * t * .9;
      pos[i * 3 + 1] = base[i * 3 + 1] + vel[i][1] * t * .9;
      pos[i * 3 + 2] = base[i * 3 + 2] + vel[i][2] * t - 30 * vh * t * t;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 1 - smooth(.45, 1, k);
    mat.size = sz * (1 - k * .45);
  } });
}
function wave(x, y, css, delay) {
  const m = own(new T.MeshBasicMaterial({ color: color(css), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const ring = new T.Mesh(new T.RingGeometry(.84, 1, 72), m);
  ring.position.set(x, y, .3 * vh);
  ring.renderOrder = 2;
  board.add(ring);
  fx.push({ obj: ring, t0: now() + (delay || 0), ms: 620, step: k => {
    const e = 1 - Math.pow(1 - k, 3), r = lerp(9, 33, e) * vh;
    ring.scale.set(r, r * .92, 1);
    m.opacity = .85 * (1 - k);
  } });
}

/* ── HTML 판의 변화(class) → 3D 움직임 ── */
function classSteps(olds, now) {           // remove → add 를 한 번에 해도(다시 흔들기 등) 놓치지 않게 순서대로
  const states = [...olds, now].map(s => new Set(String(s || '').split(/\s+/).filter(Boolean)));
  const added = new Set();
  for (let k = 1; k < states.length; k++) states[k].forEach(c => { if (!states[k - 1].has(c)) added.add(c); });
  return added;
}
function onClass(el, added) {
  const t = now();
  if (el === bellEl) {
    if (!added.has('hit')) return;
    const L = last; if (!L || !L.game) return;
    const who = el.classList.contains('hit-l') ? 1 : el.classList.contains('hit-r') ? 0 : -1;
    const css = who === 1 ? cssVar('--p2-soft') : who === 0 ? cssVar('--p1-soft') : '#fff';
    const bx = L.bell.cx - .4 * vh * L.bellScale, by = -(L.bell.cy - 6.4 * vh * L.bellScale);   // 종 받침 가운데 (원래 종 그림자 자리)
    wave(bx, by, '#fff', 0); wave(bx, by, css, 110);
    cards.forEach(c => { c.bumpT0 = t; });
    kick(); return;
  }
  if (el.classList.contains('card')) {
    const c = cards.find(o => o.el === el); if (!c) return;
    if (added.has('right')) {
      c.hopT0 = t;
      const L = last, who = (el.style.getPropertyValue('--hitc') || '').includes(' 14') ? 1 : 0;   // Coco가 맞히면 분홍(hue 14)
      if (L) { const [w, h] = cardSize(el); sparkle(L.spot.cx, -L.spot.cy, CT * 3, w, h, who); }
    }
    if (added.has('wrong')) c.shakeT0 = t;
    kick(); return;
  }
  if (slotOf.has(el)) {
    const [i, j] = slotOf.get(el), st = slotState[i][j];
    if (added.has('show-card')) { st.flyT0 = t; st.from = null; st.dirty = true; }
    if (added.has('has')) { st.popT0 = t; st.dirty = true; }
    if (added.has('lose')) { st.loseT0 = t; }
    st.dirty = true; kick(); return;
  }
  if (el.classList.contains('deck') && added.has('no')) {
    const i = PL.findIndex(p => p.deck === el);
    if (V.trays && V.trays[i]) V.trays[i].userData.shakeT0 = t;
    kick();
  }
}
const mo = new MutationObserver(recs => {
  const seq = new Map();
  let kids = false;
  recs.forEach(r => {
    if (r.type === 'childList') { kids = true; return; }
    if (!seq.has(r.target)) seq.set(r.target, []);
    seq.get(r.target).push(r.oldValue);
  });
  if (kids) syncCards();
  seq.forEach((olds, el) => onClass(el, classSteps(olds, el.className)));
});
mo.observe(tableEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

/* ── 매 순간: 자리 읽기 → 움직이기 → 그리기 (바뀐 게 없으면 안 그림) ── */
let last = null, lastSig = '', wantDraw = true, prevT = now(), lastDrawAt = 0;
const parts = [];      // 다른 파일(gl/bell3d.js · gl/coco3d.js)이 더하는 3D 물건 { build(L), update(L, t, dt) }
const pre = [];        // 자리 읽기 전에 CSS를 바꾸는 것 (gl/view360.js: 판 돌리기)
const view = { turned: false, az: 0, el: 0, azCss: '' };
function kick() { wantDraw = true; }
function pixelRatio(L) {
  const q = TIERS[tier], dpr = window.devicePixelRatio || 1;
  const budget = Math.sqrt(q.px / Math.max(1, L.W * L.H));        // 화소 한도 안에서
  return Math.max(.5, Math.min(dpr, q.pr, budget));
}
function setTier(n, why) {
  tier = Math.max(0, Math.min(TIERS.length - 1, n));
  const q = TIERS[tier];
  renderer.shadowMap.type = q.shadow;
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  sun.shadow.mapSize.setScalar(q.map);
  scene.traverse(o => [].concat(o.material || []).forEach(m => { m.needsUpdate = true; }));
  console.info(`[판 3D] 화질 ${q.name}` + (why ? ` (${why})` : ''));
  kick();
}
function sizeCanvas(L) {
  const pr = pixelRatio(L);
  if (Math.abs(renderer.getPixelRatio() - pr) > .01) renderer.setPixelRatio(pr);
  const s = renderer.getSize(new T.Vector2());
  if (s.x !== L.W || s.y !== L.H) renderer.setSize(L.W, L.H, false);
}
let idle = false;
function update(L, t, dt) {
  let busy = false;
  idle = false;
  const game = L.game;
  if (V.table) V.table.visible = game;                 // 시작 화면에는 탁자가 없어요 (원래도 투명)
  const offstage = !game && view.turned;               // 시작 화면에서 돌려 볼 때: 화면 밖에 비켜 둔 칸들이 돌아 들어오지 않게
  (V.trays || []).forEach(g => { g.visible = !offstage; });
  (V.slotWells || []).forEach(row => row.forEach(m => { m.visible = !offstage; }));
  // 나 · Coco 칸 (시작 화면 ↔ 게임: 옆에서 미끄러져 들어옴 — HTML translate를 그대로 따라감)
  // 내 차례에 마우스가 내 카드 더미 위에 있으면 맨 위 카드가 살짝 들리고 마우스 쪽으로 기울어요 ('나를 뒤집어!')
  const hit0 = document.getElementById('hit0');
  let hov = 0, hx = 0, hy = 0;
  if (pointer.mouse && engaged() && app.classList.contains('my-turn') && hit0) {
    const r = hit0.getBoundingClientRect();
    if (pointer.x > r.left && pointer.x < r.right && pointer.y > r.top && pointer.y < r.bottom) {
      hov = 1; hx = (pointer.x - (r.left + r.width / 2)) / (r.width / 2); hy = (pointer.y - (r.top + r.height / 2)) / (r.height / 2);
    }
  }
  (V.trays || []).forEach((grp, i) => {
    const R = L.trays[i].tray, u = grp.userData;
    grp.position.set(R.cx, -R.cy, 0);
    u.deck.position.x = L.trays[i].deck.cx - R.cx;
    const top = u.deck.children[u.deck.children.length - 1];
    if (top) {
      if (top.userData.z0 == null) top.userData.z0 = top.position.z;
      const k = 1 - Math.exp(-dt / 90), on = i === 0 ? hov : 0;
      u.hover = (u.hover || 0) + (on - (u.hover || 0)) * k;
      if (Math.abs(on - u.hover) < .002) u.hover = on; else busy = true;
      u.hx = (u.hx || 0) + ((on ? hx : 0) - (u.hx || 0)) * k;
      u.hy = (u.hy || 0) + ((on ? hy : 0) - (u.hy || 0)) * k;
      top.position.z = top.userData.z0 + u.hover * 1.6 * vh;
      top.rotation.x = u.hy * .09 * u.hover;
      top.rotation.y = u.hx * .09 * u.hover;
      // 맨 위 카드가 들리면 그 아래 카드 윗면(뒷면 그림)이 보이게 — 붙어 있을 땐 그림판이 옆으로 삐져나와서 꺼 둠
      const under = u.deck.children[u.deck.children.length - 2];
      if (under) under.children[1].visible = u.hover > .02;
    }
    if (u.shakeT0) {
      const k = (t - u.shakeT0) / 350;
      if (k < 1) { u.deck.position.x += Math.sin(k * Math.PI * 4) * vh * (1 - k); busy = true; } else u.shakeT0 = 0;
    }
  });
  (V.slotWells || []).forEach((row, i) => row.forEach((m, j) => { const R = L.slots[i][j]; m.position.set(R.cx, -R.cy, .12); }));
  if (V.spot) {
    const SP = L.spot, u = V.spot.userData;
    V.spot.position.set(SP.cx, -SP.cy, .14);
    V.spot.visible = game || L.spotOp > .01;
    u.lineM.material.opacity = L.spotOp;
    u.hintM.material.opacity = L.spotOp;
    u.hintM.visible = L.hint;
  }

  // 나온 카드: 쌓인 순서대로 위로 · 옛 카드는 원래처럼 살짝 돌아간 채로
  const live = cards.filter(c => !c.sinkT0);
  for (let n = cards.length - 1; n >= 0; n--) {
    const c = cards[n], o = c.obj;
    const idx = live.indexOf(c);
    const zTarget = CT / 2 + .1 * vh + Math.max(0, idx) * (CT + .12 * vh);
    c.z = c.z == null ? zTarget : lerp(c.z, zTarget, 1 - Math.exp(-dt / 90));
    const rzTarget = -NUM(c.el.style.rotate) * Math.PI / 180;
    c.rz = lerp(c.rz, rzTarget, 1 - Math.exp(-dt / 110));
    if (Math.abs(c.rz - rzTarget) > .001 || Math.abs(c.z - zTarget) > .05) busy = true;
    let x = L.spot.cx, y = -L.spot.cy, z = c.z, rz = c.rz, ry = 0, rx = 0, s = 1;
    if (c.dealT0) {                                     // 카드 더미에서 집어 → 뒤집으며 날아와 → 판에 착
      const k = clamp01((t - c.dealT0) / DEAL_MS), e = easeDeal(k), D = L.trays[c.who].deck;
      const fromZ = TRAY_H + DECK_N * DECK_CT;
      x = lerp(D.cx, x, e); y = lerp(-D.cy, y, e);
      z = lerp(fromZ, z, clamp01(e)) + Math.sin(Math.PI * Math.min(1, k * 1.08)) * 12 * vh;
      ry = Math.PI * (1 - smooth(.08, .72, k)) * (c.who ? -1 : 1);
      rz = lerp(c.fr, rz, e);
      s = lerp(D.w / c.obj.userData.size[0], 1, clamp01(e));
      if (k >= 1) c.dealT0 = 0; else busy = true;
    }
    if (c.hopT0) { const k = (t - c.hopT0) / 460; if (k < 1) { z += Math.sin(Math.PI * k) * 2.4 * vh; busy = true; } else c.hopT0 = 0; }
    if (c.bumpT0) { const k = (t - c.bumpT0) / 260; if (k < 1) { z += Math.sin(Math.PI * k) * .9 * vh; busy = true; } else c.bumpT0 = 0; }
    if (c.shakeT0) {
      const k = (t - c.shakeT0) / 400;
      if (k < 1) { const w = c.obj.userData.size[0]; x += Math.sin(k * Math.PI * 4) * .1 * w * (1 - k); rz += Math.sin(k * Math.PI * 4) * .06 * (1 - k); busy = true; }
      else c.shakeT0 = 0;
    }
    if (c.sinkT0) { dispose(o); cards.splice(n, 1); continue; }   // 치운 카드(맨 밑에 깔린 것)는 바로 치움
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.scale.setScalar(s);
    o.visible = game || !!c.dealT0;
    // 맞았을 때 색 테두리
    const right = c.el.classList.contains('right');
    if (c.ringM) {
      const m = c.ringM.material;
      if (right) { m.color.copy(color(c.el.style.getPropertyValue('--hitc') || '#fff')); }
      const to = right ? 1 : 0;
      m.opacity = lerp(m.opacity, to, 1 - Math.exp(-dt / 70));
      c.ringM.visible = m.opacity > .01;
      if (Math.abs(m.opacity - to) > .01) busy = true;
    }
  }
  // 맞았을 때 바닥에 번지는 빛 (맨 위 카드 아래)
  const top = live[live.length - 1];
  if (top && top.el.classList.contains('right')) {
    if (!V.glow) {
      V.glow = new T.Mesh(new T.PlaneGeometry(1, 1), own(new T.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })));
      V.glow.renderOrder = 1; board.add(V.glow);
    }
    const [w, h] = top.obj.userData.size;
    V.glow.scale.set(w * 1.5, h * 1.36, 1);
    V.glow.position.set(L.spot.cx, -L.spot.cy, .2 * vh);
    V.glow.material.color.copy(color(top.el.style.getPropertyValue('--hitc') || '#fff'));
    V.glow.material.opacity = lerp(V.glow.material.opacity, .9, 1 - Math.exp(-dt / 90));
    V.glow.visible = true;
    if (V.glow.material.opacity < .89) busy = true;
  } else if (V.glow && V.glow.visible) {
    V.glow.material.opacity = lerp(V.glow.material.opacity, 0, 1 - Math.exp(-dt / 90));
    if (V.glow.material.opacity < .01) V.glow.visible = false; else busy = true;
  }

  // S 칸: 카드가 날아와 앉고 → S 동전 톡 → 틀리면 튀어 올라 사라짐
  slotState.forEach((row, i) => row.forEach((st, j) => {
    const el = st.el, R = L.slots[i][j];
    const shows = el.classList.contains('show-card') || el.classList.contains('has');
    if (!shows && !st.loseT0) { if (st.card) { dispose(st.card); st.card = null; } if (st.coin) { dispose(st.coin); st.coin = null; } st.flyT0 = 0; return; }
    if (!st.card) {
      const img = el.querySelector('.got-card');
      const src = img && img.getAttribute('src');
      if (!src) return;
      st.card = slotCard(i, j, L, imageTex(src));
      const srcCard = live[live.length - 1];
      if (st.flyT0 && srcCard) st.from = { x: srcCard.obj.position.x, y: srcCard.obj.position.y, z: srcCard.obj.position.z + CT, s: srcCard.obj.userData.size[0] / R.w, rz: srcCard.rz };
      else st.flyT0 = 0;
    }
    let x = R.cx, y = -R.cy, z = SLOT_CT / 2 + .2 * vh, rz = 0, s = 1, rx = 0;
    if (st.flyT0 && st.from) {
      const k = clamp01((t - st.flyT0) / 720), e = easeFly(k), F = st.from;
      x = lerp(F.x, x, e); y = lerp(F.y, y, e);
      z = lerp(F.z, z, e) + Math.sin(Math.PI * Math.min(1, k)) * 13 * vh;
      s = lerp(F.s, 1, e);
      rz = lerp(F.rz, 0, e) + Math.sin(Math.PI * k) * .35 * (i ? 1 : -1);
      rx = Math.sin(Math.PI * k) * .25;
      if (k >= 1) st.flyT0 = 0; else busy = true;
    }
    let cs = 1, cz = 0;
    if (st.loseT0) {
      const k = (t - st.loseT0) / 450;
      if (k >= 1) { dispose(st.card); st.card = null; if (st.coin) { dispose(st.coin); st.coin = null; } st.loseT0 = 0; return; }
      cs = k < .4 ? lerp(1, 1.3, k / .4) : lerp(1.3, .2, (k - .4) / .6); cz = k * 4 * vh; busy = true;
    }
    st.card.position.set(x, y, z + cz); st.card.rotation.set(rx, 0, rz); st.card.scale.setScalar(s * cs);
    const hasCoin = el.classList.contains('has') || st.loseT0;
    if (hasCoin && !st.coin) st.coin = makeCoin(i, R);
    if (st.coin) {
      let ps = 1;
      if (st.popT0) { const k = (t - st.popT0) / 350; if (k < 1) { ps = Math.max(.3, lerp(.3, 1, easePop(k))); busy = true; } else st.popT0 = 0; }
      st.coin.position.set(R.cx, -R.cy + R.h * .04, z + SLOT_CT / 2 + cz + .2);
      st.coin.scale.setScalar(ps * cs);
    }
  }));

  // 다른 파일이 더한 물건 (종 · Coco): true = 움직이는 중, 'idle' = 숨쉬기 같은 잔잔한 움직임(초당 30장이면 충분)
  parts.forEach(pt => {
    if (!pt.update) return;
    let r = false;
    try { r = pt.update(L, t, dt); } catch (e) { console.error('[판 3D] 부품 움직이기 오류', e); }
    if (r === true) busy = true; else if (r === 'idle') idle = true;
  });
  // 반짝이 · 물결
  for (let n = fx.length - 1; n >= 0; n--) {
    const f = fx[n], k = (t - f.t0) / f.ms;
    if (k < 0) { f.obj.visible = false; busy = true; continue; }
    f.obj.visible = true;
    if (k >= 1) { dispose(f.obj); fx.splice(n, 1); continue; }
    f.step(k); busy = true;
  }
  return busy;
}
/* ── 말풍선: main.js가 띄운 순간의 Coco 자리를 기억했다가, 시점이 옮겨 가면 같이 옮김 ── */
const cocoSpotEl = document.getElementById('cocoSpot');
const bubState = new Map();
['bubbleL', 'bubbleR'].map(id => document.getElementById(id)).filter(Boolean).forEach(b => {
  new MutationObserver(() => {
    if (!b.classList.contains('show') || !cocoSpotEl) { bubState.delete(b); return; }
    const c = cocoSpotEl.getBoundingClientRect();
    bubState.set(b, { left: parseFloat(b.style.left) || 0, top: parseFloat(b.style.top) || 0, x: c.left + c.width / 2, y: c.top + c.height / 2 });
  }).observe(b, { attributes: true, attributeFilter: ['class'] });
});
function anchorBubbles() {
  if (!bubState.size) return;
  const c = cocoSpotEl.getBoundingClientRect(), x = c.left + c.width / 2, y = c.top + c.height / 2;
  bubState.forEach((s, b) => {
    if (!b.classList.contains('show')) { bubState.delete(b); return; }
    b.style.left = (s.left + x - s.x).toFixed(1) + 'px'; b.style.top = (s.top + y - s.y).toFixed(1) + 'px';
  });
}

/* ── 속도 재기: 그린 다음 장면이 얼마나 늦게 오는지 (움직이는 동안만) ── */
const perf = { iv: [], sum: 0, prevRAF: 0, drew: false, fps: 0, frames: 0, t0: 0, off: false };
// 한 장면이 26ms(초당 38장)보다 느리면 한 단계 내림 · 55ms(초당 18장)보다 느리면 바로 low로 · low에서도 55ms면 원래 판으로
// 움직이는 장면 36장 또는 1.5초마다 판단 (아주 느린 기기도 몇 초 안에 알맞은 화질로)
const SLOW_MS = 26, TOO_SLOW_MS = 55, WINDOW = 36, LOW = TIERS.length - 1;
const MEMO = 'hg3d-quality';         // 이 기기에서 정해진 화질을 기억 (다음에 열 때 처음부터 그 화질로 · 7일)
function remember(v) { try { localStorage.setItem(MEMO, JSON.stringify({ v, gpu: GPU, at: Date.now() })); } catch (e) { /* 무시 */ } }
function judge() {
  const n = perf.iv.length;
  if (FORCE || n < 6 || (n < WINDOW && perf.sum < 1500)) return;
  const iv = perf.iv.slice().sort((a, b) => a - b), med = iv[n >> 1];
  perf.iv.length = 0; perf.sum = 0;
  if (med <= SLOW_MS) return;
  const why = `한 장면 ${med.toFixed(0)}ms`;
  if (tier < LOW) { setTier(med > TOO_SLOW_MS ? LOW : tier + 1, why); remember(TIERS[tier].name); }
  else if (med > TOO_SLOW_MS) { remember('html'); giveUp(`low에서도 ${why}`); }
}
// 3D 끄고 원래 HTML 판으로 (너무 느린 기기 · 그래픽 오류)
function giveUp(why) {
  if (perf.off) return;
  perf.off = true;
  console.warn('[판 3D] 원래 HTML 판으로 바꿔요:', why);
  try { mo.disconnect(); } catch (e) { /* 무시 */ }
  // 3D 판 · 3D 종 · 3D Coco 표시를 모두 떼서 원래 HTML 판 · 종 · Coco가 다시 보이게
  [...app.classList].filter(c => /(^gl|3d)-on$/.test(c)).forEach(c => app.classList.remove(c));
  document.body.classList.remove('gl-on');
  canvas.remove(); space.remove(); sceneEl.style.perspectiveOrigin = '';   // 손 따라 옮기던 시점 · 배경도 원래대로
  try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* 무시 */ }
  if (typeof window.place === 'function') try { window.place(); } catch (e) { /* 무시 */ }
  if (window.Board3D) window.Board3D.off = why;
  if (meter) meter.textContent = '원래 HTML 판 (' + why + ')';
}
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); giveUp('그래픽 오류(context lost)'); });

// 확인용 속도 표시: 주소 끝에 ?fps
let meter = null;
if (QS.has('fps')) {
  meter = document.createElement('div');
  meter.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;padding:4px 8px;border-radius:6px;font:12px/1.3 ui-monospace,Menlo,monospace;' +
    'color:#fff;background:rgb(0 0 0 / .55);pointer-events:none;white-space:pre';
  document.body.appendChild(meter);
}
function paintMeter(t) {
  if (!meter || perf.off) return;
  perf.frames++;
  if (t - perf.t0 < 500) return;
  perf.fps = Math.round(perf.frames * 1000 / (t - perf.t0)); perf.frames = 0; perf.t0 = t;
  const s = renderer.getSize(new T.Vector2()), pr = renderer.getPixelRatio();
  meter.textContent = `3D 판 · ${TIERS[tier].name}${FORCE ? '(고정)' : ''} · 초당 ${perf.fps}장 · ${Math.round(s.x * pr)}×${Math.round(s.y * pr)}\n${GPU.slice(0, 60)}`;
}

function frame() {
  if (perf.off) return;
  requestAnimationFrame(frame);
  const real = performance.now();
  if (perf.drew && document.visibilityState === 'visible') { const d = real - perf.prevRAF; if (d < 1000) { perf.iv.push(d); perf.sum += d; } }
  perf.prevRAF = real; perf.drew = false;
  const t = now(), dt = Math.max(0, Math.min(64, t - prevT)); prevT = t;
  if (document.hidden) return;
  let paraMoving = applyParallax(dt);              // 손 따라 시점 (자리 읽기 전에)
  pre.forEach(fn => { try { if (fn(dt)) paraMoving = true; } catch (e) { console.error('[판 3D] 돌리기 오류', e); } });   // 360° 돌리기 (gl/view360.js)
  const L = measure();
  const sig = JSON.stringify(L, (k, v) => (typeof v === 'number' ? Math.round(v * 10) : v));
  if (sig !== lastSig) {
    lastSig = sig; wantDraw = true;
    // 판이 움직이는 동안(시작 화면 ↔ 게임, 창 크기) 누르는 자리도 계속 따라가게 — main.js의 follow()는 1.5초만 따라가서
    // 화면이 느린 기기에선 칸이 다 들어오기 전에 멈출 수 있어요
    if (typeof window.place === 'function') { try { window.place(); } catch (e) { /* 무시 */ } }
  }
  last = L;
  if (paraMoving) wantDraw = true;
  anchorBubbles();
  if (meter) paintMeter(real);
  if (!wantDraw) {
    if (!idle || real - lastDrawAt < 31) return;      // 숨쉬기 · 깜빡임만 있을 땐 초당 30장
  }
  lastDrawAt = real;
  sizeCanvas(L);
  build(L);
  applyCamera(L);
  applyBoard(L);
  const busy = update(L, t, dt);
  renderer.render(scene, camera);
  wantDraw = busy;
  perf.drew = busy || idle;    // 이어서 움직이는 장면만 잼 (한 번 그리고 쉬는 장면은 빼고)
  judge();
}
addEventListener('resize', kick);
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 40px Fredoka'), document.fonts.ready]) : Promise.resolve())
  .then(() => { fontsReady = true; kick(); }, () => { fontsReady = true; kick(); });
requestAnimationFrame(frame);
console.info(`[판 3D] 켜짐 · 화질 ${TIERS[tier].name} · ${GPU}`);

// 확인용 (콘솔: Board3D.renderer.info 등)
/* 캐릭터 한 바퀴 돌리기 (gl/view360.js가 끌기로 angle을 바꾸고, 놓으면 vel로 미끄러지다 정면으로 되돌아옴) */
function spinner() {
  return { angle: 0, vel: 0, held: false, settling: false, target: 0,
    step(dt) {
      if (this.held) { this.settling = false; return true; }
      if (!this.settling) {
        if (Math.abs(this.vel) > .0022) { this.angle += this.vel * dt; this.vel *= Math.exp(-dt / 420); return true; }
        const TAU = Math.PI * 2, bias = Math.sign(this.vel || 0) * .3;
        this.target = Math.round(this.angle / TAU + bias) * TAU;
        this.settling = true;
      }
      // 정면(한 바퀴 단위)으로 스르르: 감쇠 스프링
      const k = .00005, c = 2 * Math.sqrt(k);
      this.vel += (k * (this.target - this.angle) - c * this.vel) * dt;
      this.angle += this.vel * dt;
      if (Math.abs(this.target - this.angle) < .002 && Math.abs(this.vel) < .00006) { this.angle = 0; this.vel = 0; this.settling = false; return false; }
      return true;
    } };
}
const _box = new T.Box3(), _v = new T.Vector3();
// 손이 가리키는 판 위 한 점 (판 좌표 · 높이 z인 평면) — 캐릭터가 판을 돌려도 손 쪽을 보게
const _ray = new T.Raycaster(), _ndc = new T.Vector2(), _inv = new T.Matrix4(), _plane = new T.Plane(new T.Vector3(0, 0, 1), 0);
function pointerOnPlane(z, out) {
  const c = canvas.getBoundingClientRect();
  if (!c.width) return null;
  _ndc.set((pointer.x - c.left) / c.width * 2 - 1, -((pointer.y - c.top) / c.height * 2 - 1));
  _ray.setFromCamera(_ndc, camera);
  board.updateMatrixWorld(true);
  const r = _ray.ray.clone().applyMatrix4(_inv.copy(board.matrixWorld).invert());
  _plane.constant = -z;
  return r.intersectPlane(_plane, out || new T.Vector3());
}
function screenRectOf(obj) {
  if (!obj || !obj.visible) return null;
  obj.updateMatrixWorld(true);
  _box.setFromObject(obj);
  if (_box.isEmpty()) return null;
  const c = canvas.getBoundingClientRect();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const x of [_box.min.x, _box.max.x]) for (const y of [_box.min.y, _box.max.y]) for (const z of [_box.min.z, _box.max.z]) {
    _v.set(x, y, z).project(camera);
    const sx = c.left + (_v.x + 1) / 2 * c.width, sy = c.top + (1 - _v.y) / 2 * c.height;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
window.Board3D = { THREE: T, renderer, scene, camera, board, cards, slotState, V, kick, measure, perf, GPU,
  addPart(pt) { parts.push(pt); builtKey = ''; kick(); },
  addPre(fn) { pre.push(fn); kick(); },
  view,                             // gl/view360.js: 판이 돌아가 있으면 turned = true (캐릭터 얼굴을 다시 입히지 않음)
  api: { std, own, imageTex, canvasTex, color, cssVar, dispose, rr, NUM, clamp01, lerp, smooth, bezier, rectIn, now,
         pointer, engaged, par, restCam, screenRectOf, reducedMotion: () => RM.matches, pointerOnPlane, spinner,
         restBoard: mRest,   // 돌리기 전 판
         azBoard: mAz,       // 좌우로만 돌린 판 (위아래 뺌) — 캐릭터가 젖히는 쪽 · 원래 보이는 각도 재는 데
         get vh() { return vh; }, get last() { return last; }, sun, get tier() { return tier; } },
  get tier() { return TIERS[tier].name; }, setTier: n => setTier(typeof n === 'string' ? TIERS.findIndex(q => q.name === n) : n, '직접'),
  giveUp, at(ms) { fakeNow = ms; kick(); }, live() { fakeNow = null; kick(); }, get now() { return now(); } };
})();

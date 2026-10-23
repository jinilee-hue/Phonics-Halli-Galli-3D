// 시작 화면: 5세 카드들이 종을 가운데 두고 탁자 위를 빙글빙글 돌아요 (인트로 영상처럼)
//  - 탁자에 비스듬히 누운 카드가 종 둘레의 큰 타원을 따라 돌아요: 뒤쪽은 작게(종 뒤로 숨음), 앞쪽은 크게(종 앞)
//  - 카드마다 몇 초에 한 번씩 톡 튀어 오르며 한 바퀴 뒤집혀요 → 뒷면(게임 카드 뒷면 무늬)이 잠깐 보였다가 다시 그림
//  - 같은 카드를 두 층에 하나씩 둬요: 종 뒤 층(.orbit-back, .scene 맨 앞) / 종 앞 층(.orbit-front, .title 맨 앞)
//    카드가 타원 뒤쪽 반에 있으면 뒤 층 것만, 앞쪽 반에 있으면 앞 층 것만 보여요 (바뀌는 곳은 화면 양옆 끝)
//  - 로고 · START · 단계 고르기는 늘 카드보다 위 (.orbit{z-index:0})
//  - 움직임 줄이기 설정이면 멈춘 채로 둥글게만 놓아요
(() => {
'use strict';
const WORDS = ['bug', 'cats', 'egg', 'pets', 'pig', 'dogs'];
const PERIOD = 26;      // 한 바퀴 도는 시간(초)
const SIZE = 26;        // 카드 기본 폭(vh, CSS .orb와 같은 값) — 뒤쪽 0.72배(약 19vh) · 앞쪽 1.18배(약 31vh)
const TILT = 34;        // 탁자에 누운 각도(도)
const FLIP_EVERY = [6.5, 8.5, 7.5, 9.5, 7, 8];   // 카드마다 뒤집히는 간격(초)
const FLIP_TIME = 1.1;  // 한 번 뒤집히는 데 걸리는 시간(초)

const app = document.getElementById('app');
const back = document.querySelector('.orbit-back');
const front = document.querySelector('.orbit-front');
if (!app || !back || !front || !window.CARD_ART) return;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

const make = (layer, w, side) => {
  const d = document.createElement('div');
  d.className = 'orb';
  // 뒷면: 사용자가 만든 카드 뒷면 그림 (my_card 파랑 · coco_card 분홍), 없으면 앞면 그림을 그대로
  const backArt = CARD_ART[side === 'p1' ? 'my_card' : 'coco_card'] || CARD_ART[w];
  d.innerHTML = `<div class="orb-face"><img src="${CARD_ART[w]}" alt="" draggable="false"></div>` +
                `<div class="orb-back"><img src="${backArt}" alt="" draggable="false"></div>`;
  layer.appendChild(d);
  return d;
};
const cards = WORDS.filter(w => CARD_ART[w]).map((w, i, all) => ({
  a0: (i / all.length) * Math.PI * 2 + 0.35,
  tilt: [-9, 7, -5, 10, -7, 5][i % 6],
  ph: i * 1.7,
  every: FLIP_EVERY[i % FLIP_EVERY.length],
  off: 1.2 + i * 1.3,                        // 첫 뒤집기 시각을 카드마다 엇갈리게
  b: make(back, w, i % 2 ? 'p2' : 'p1'),
  f: make(front, w, i % 2 ? 'p2' : 'p1'),
}));

// 종 자리 재기 (시작 화면일 때만 — 게임 화면에선 종이 위로 올라가 있음)
let G = null;
function measure() {
  const img = document.querySelector('.bell-img');
  if (!img) return;
  const r = img.getBoundingClientRect();
  if (r.width < 10) return;
  const vh = innerHeight / 100;
  const sideW = SIZE * 0.95 * vh;                                   // 타원 양 끝(가운데 깊이)의 카드 폭
  const rx = Math.min(62 * vh, innerWidth / 2 - 0.42 * sideW);      // 양 끝 카드는 아주 조금만 화면 밖으로
  G = { cx: r.left + r.width / 2, cy: r.top + r.height * 0.74, rx, ry: rx * 0.38, vh };
}

const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // 천천히 → 빠르게 → 천천히
function draw(ms) {
  if (app.dataset.screen !== 'title') return;
  measure();                       // 게임 → 시작 화면으로 돌아올 때 종이 움직이니 매번 잼 (읽기 한 번, 가벼움)
  if (!G) return;
  const T = (window.ORBIT_T != null ? window.ORBIT_T : ms / 1000);   // ORBIT_T: 확인용으로 시각 고정
  for (const c of cards) {
    const a = c.a0 + (T / PERIOD) * Math.PI * 2;
    const s = Math.sin(a);
    const depth = (s + 1) / 2;                                   // 0 = 맨 뒤, 1 = 맨 앞
    // 뒤집기: every초마다 FLIP_TIME 동안 rotateY 0 → 360, 그동안 톡 튀어 오름
    const k = ((T - c.off) % c.every + c.every) % c.every;
    const p = k < FLIP_TIME ? k / FLIP_TIME : 0;
    const flip = 360 * ease(p);
    const hop = Math.sin(Math.PI * p) * 5 * G.vh * (0.6 + 0.4 * depth);
    const x = G.cx + G.rx * Math.cos(a);
    const y = G.cy + G.ry * s - Math.sin(T * 1.3 + c.ph) * 1.2 * G.vh - hop;
    const sc = 0.72 + 0.46 * depth;
    const rz = c.tilt + 6 * Math.sin(T * 0.7 + c.ph);
    const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)}) ` +
               `perspective(${(90 * G.vh).toFixed(0)}px) rotateX(${TILT}deg) rotateZ(${rz.toFixed(2)}deg) rotateY(${flip.toFixed(1)}deg)`;
    const z = String(Math.round(depth * 100));
    const inFront = s > 0;
    c.f.style.transform = c.b.style.transform = tf;
    c.f.style.zIndex = c.b.style.zIndex = z;
    c.f.style.visibility = inFront ? 'visible' : 'hidden';
    c.b.style.visibility = inFront ? 'hidden' : 'visible';
  }
}

function loop(ms) {
  draw(ms);
  if (!reduce.matches) requestAnimationFrame(loop);
}
measure();
requestAnimationFrame(loop);
addEventListener('resize', measure);
// 움직임 줄이기 설정일 때만: 멈춘 채로 둥글게 놓기
setInterval(() => { if (reduce.matches) draw(0); }, 500);
})();

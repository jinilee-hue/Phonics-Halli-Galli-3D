// 게임 레벨 = Coco 빠르기 (3D 폴더 전용) — phonics-kit README '공통 규칙: 레벨' (사용자 2026-11-22)
//  · 레벨은 고르지 않아요. START는 저장된 레벨부터 · 이기면 +1 · 지면 같은 레벨 한 번 더 · 두 판 연속 지면 한 칸 아래.
//  · 학습 레벨(나이 단계) 안의 난이도 단계 — 지금은 5세(1단계)만 열려 있어서 5세에만 적용. 6·7세(?age=)는 원래 Coco 그대로.
//  · 원래 게임(src/main.js)은 그대로: 판이 시작될 때(reset) LEVELS[1].cpu를 아래 표의 값으로 바꿔 둬요.
//    main.js는 cpu 값을 카드마다 그때그때 읽어요(cpuReact · flip의 L().cpu).
//  · 이 기기에 기억: localStorage 'hg-speed' {level, poor}. 레벨이 바뀌면 PhonicsProgress.setLevel('ring-ding-dong', n).
//  · 게임 위 단계 알약: 'Age 5 · K · Level 3' (이름 'Age 5'는 gl/lang.js). 레벨이 오르면 결과 화면에 LEVEL UP! (gl/result-fx.js).
(() => {
  'use strict';
  /* global LEVELS, level, ME */
  if (typeof LEVELS === 'undefined' || !LEVELS[1] || typeof window.reset !== 'function') return;
  // Coco가 종을 치는 때 = 카드가 열리고 400 + react + 220 ms (main.js cpuReact) → 아래 주석의 초.
  // 레벨마다 반응 약 12% 빠르게 · 여럿 카드를 놓치는 일(miss) · 한 개 카드에 잘못 치는 일(slip) 줄이기 · 다음 카드 빨리(flip).
  // flip은 그 레벨 Coco 반응의 가장 늦은 때보다 늘 0.25초 넘게 길게(1단계 3200을 정한 이유와 같음 — main.js 주석).
  // 아이(5~6세) 반응 ~1.0~1.5초 + 카드가 보이기까지 ~0.35초 → 1~2레벨은 넉넉, 6레벨은 빠른 아이가 겨우 이기는 경주.
  const SPEED = [null,
    { react: [1800, 2400], miss: .25, slip: .08, flip: 3200 },    // 1  2.42–3.02초 (원래 1단계 값 그대로)
    { react: [1580, 2110], miss: .22, slip: .07, flip: 3000 },    // 2  2.20–2.73
    { react: [1390, 1860], miss: .18, slip: .065, flip: 2850 },   // 3  2.01–2.48
    { react: [1230, 1640], miss: .15, slip: .055, flip: 2650 },   // 4  1.85–2.26
    { react: [1080, 1440], miss: .11, slip: .05, flip: 2500 },    // 5  1.70–2.06
    { react: [950, 1270], miss: .08, slip: .04, flip: 2300 },     // 6  1.57–1.89
  ];
  const TOP = SPEED.length - 1, KEY = 'hg-speed', GAME = 'ring-ding-dong';
  const clamp = n => Math.min(TOP, Math.max(1, n | 0 || 1));
  let st = { level: 1, poor: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') st = { level: clamp(+s.level), poor: Math.max(0, +s.poor | 0) }; } catch (e) { /* storage off */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage off */ } };
  let playing = 0, counted = false, last = null;     // playing = 이번 판 레벨 (0 = 5세가 아님) · last = 이번 판 결과로 바뀐 것
  const on = () => typeof level !== 'undefined' && level === 1;

  function pill() {
    const el = document.getElementById('lvPill');
    if (el && on()) el.textContent = `${LEVELS[1].name} · ${LEVELS[1].book} · Level ${playing || st.level}`;
  }

  const reset0 = window.reset;
  window.reset = function () {
    last = null; counted = false;
    playing = on() ? st.level : 0;
    if (playing) LEVELS[1].cpu = Object.assign({}, SPEED[playing]);
    const r = reset0.apply(this, arguments);
    pill();
    return r;
  };

  const end0 = window.end;
  window.end = function (w) {
    if (playing && !counted) {
      counted = true;
      const from = playing, won = w === ME;
      if (won) { st.poor = 0; st.level = Math.min(TOP, from + 1); }
      else if (++st.poor >= 2) { st.poor = 0; st.level = Math.max(1, from - 1); }
      else st.level = from;
      save();
      last = { from, to: st.level, won, kind: st.level > from ? 'up' : st.level < from ? 'down' : 'same' };
      if (st.level !== from) try { window.PhonicsProgress && window.PhonicsProgress.setLevel(GAME, st.level); } catch (e) { /* storage off */ }
    }
    return end0.apply(this, arguments);
  };

  pill();
  window.HGSpeed = { TABLE: SPEED, TOP, get level() { return st.level; }, get poor() { return st.poor; },
    get playing() { return playing; }, get last() { return last; } };
})();

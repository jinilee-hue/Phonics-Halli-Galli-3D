// 배경음악 — 인트로 영상과 같은 음악(목소리를 뺀 4마디)을 시작 화면 · 게임 화면에 이음새 없이 반복
//  - 음원: src/bgm-data.js (window.BGM_WAV, base64 WAV · 원본 assets/bgm_loop.wav · 만드는 법 tools/bgm/)
//    파일을 더블클릭해 열어도(file://) 소리가 나도록 소리 파일을 글자로 넣어 두었어요.
//  - 너무 크지 않게: 시작 화면은 작게, 게임 화면은 낱말을 들어야 하니 더 작게, 낱말을 읽는 동안은 더 줄여요(duck).
//  - 인트로 영상이 끝나는 순간 같은 음악이 이어지게 영상 끝 0.5초와 겹쳐 서서히 커져요.
//  쓰는 법: BGM.play('title' | 'game') · BGM.setVolume(0~1) · BGM.setMuted(true/false) · BGM.duck(true/false)
(() => {
'use strict';

// 화면별 크기 (1 = 원본 음원 크기 -18 LUFS). 효과음 · 낱말 읽기보다 한참 작게.
const LEVEL = { title: 0.30, game: 0.20 };
const DUCK = 0.4;          // 낱말을 읽는 동안 이만큼으로 줄임

const AC = window.AudioContext || window.webkitAudioContext;
let ac = null, master = null, bus = null, buffer = null, loading = null;
let src = null, screen = null, muted = false, ducked = false, duckTimer = 0, vol = 1;   // vol: 오른쪽 위 소리 막대 (0~1)
let startAt = 0;                              // 음악이 시작된 시각 (오디오 시계) — 박자 위치 계산용

function context() {
  if (!ac && AC) {
    ac = new AC();
    master = ac.createGain();                 // 소리 끄기 · 줄이기
    bus = ac.createGain();                    // 화면별 크기
    bus.gain.value = 0;
    bus.connect(master);
    master.connect(ac.destination);
  }
  return ac;
}
function load() {
  if (!loading) {
    loading = new Promise((res, rej) => {
      const b64 = window.BGM_WAV;
      if (!b64) { rej(new Error('BGM_WAV 없음')); return; }
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      // 옛 Safari는 promise를 돌려주지 않아 콜백도 함께
      const p = context().decodeAudioData(bytes.buffer, b => res(b), e => rej(e));
      if (p && p.then) p.then(res, rej);
    }).then(b => (buffer = b));
  }
  return loading;
}
const target = () => (muted ? 0 : vol) * (ducked ? DUCK : 1);
function setMaster(fast) {
  if (!master || !ac) return;
  const now = ac.currentTime;
  const v = target();
  master.gain.cancelScheduledValues(now);
  // setTargetAtTime(0) 은 0에 닿지 않거나 무시되는 브라우저가 있어, 끌 때는 바로 0으로 둔다
  master.gain.setValueAtTime(v <= 0 ? 0 : master.gain.value, now);
  if (v > 0) master.gain.linearRampToValueAtTime(v, now + (fast ? 0.08 : 0.3));
}
function play(name) {
  if (!context() || !LEVEL[name]) return Promise.resolve();
  screen = name;
  return load().then(() => {
    const now = ac.currentTime;
    if (!src) {                               // 처음: 한 바퀴를 이음새 없이 반복
      src = ac.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(bus);
      startAt = now + 0.02;
      src.start(startAt);
    }
    // 화면이 바뀌면 같은 음악을 끊지 않고 크기만 천천히 바꿈 (시작 화면 → 게임 화면이 자연스럽게 이어짐)
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.setTargetAtTime(LEVEL[screen], now, 0.45);
  }).catch(() => {});
}
// 낱말을 읽는 동안 음악을 줄임. 끝났다는 신호가 안 와도 4초 뒤엔 돌아옴
function duck(on) {
  clearTimeout(duckTimer);
  ducked = !!on;
  if (on) duckTimer = setTimeout(() => duck(false), 4000);
  setMaster(on);
}
function setMuted(m) {
  muted = !!m;
  setMaster(true);
  if (bus && ac) {
    const now = ac.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(muted ? 0 : (LEVEL[screen] || 0), now);
  }
}
// 오른쪽 위 소리 막대 (0~1, 이미 귀에 고르게 맞춘 값). 0이면 끄기와 같음
function setVolume(v) {
  vol = Math.max(0, Math.min(1, +v || 0));
  if ((vol === 0) !== muted) setMuted(vol === 0); else setMaster(true);
}

// 브라우저는 화면을 한 번 누르기 전엔 소리를 막아 둠 → 첫 터치 · 클릭 · 키에서 풀기
const unlock = () => { if (ac && ac.state === 'suspended' && !document.hidden) ac.resume(); };
['pointerdown', 'touchend', 'click', 'keydown'].forEach(e => addEventListener(e, unlock, true));
// 다른 탭으로 가면 멈췄다가 돌아오면 이어서
document.addEventListener('visibilitychange', () => {
  if (!ac || !src) return;
  if (document.hidden) ac.suspend(); else ac.resume();
});
// 미리 풀어 둠 (START를 누르기 전에 준비되게)
if (window.BGM_WAV && AC) setTimeout(() => { load().catch(() => {}); }, 500);

// 지금 들리는 박자 위치 (몇 번째 박인지, 소수점 = 박 안의 위치). 음악이 안 돌면 null.
// 반복 구간이 4마디 = 16박이라 처음부터 계속 박자가 맞아요. HUD 시계(src/clock.js)가 이 박자에 맞춰 째깍여요.
function beat() {
  if (!ac || !src || !buffer || ac.state !== 'running') return null;
  const t = ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) - startAt;
  return t < 0 ? null : t / (buffer.duration / 16);
}

window.BGM = { play, duck, setMuted, setVolume, beat, get state() { return { ctx: ac && ac.state, screen, muted, ducked, vol, ready: !!buffer, level: bus && bus.gain.value, master: master && master.gain.value }; } };
})();

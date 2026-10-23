// HUD 시계: 바늘 두 개가 따로 돌며 '시간이 흐르고 있어!' 하는 급박함을 보여 줘요
//  · 주황(긴 바늘): 배경음악 박자마다 째깍 — 30°씩 튕기듯 넘어가며 살짝 되튐 (음악이 안 들리면 같은 빠르기로)
//  · 파랑(화살 바늘): 미끄러지듯 쉬지 않고 돎 (24초에 한 바퀴)
//  · 주황이 한 바퀴 돌 때마다(12박) 시계가 자명종처럼 부르르
//  · 게임 진행 시간과 같이 움직여요: 판이 끝나면 그 자리에 멈추고, 새 판이면 처음 모양에서 다시
// 조각: tools/build_clock_parts.py → assets/clock_parts/*.png + src/clock-parts.js (window.CLOCK_PARTS)
// 진행 시간은 main.js의 clockFrom · clockHold(전역)를 읽어요 — 이름을 바꾸면 여기도 같이 바꿔 주세요.
(() => {
  const P = window.CLOCK_PARTS, host = document.getElementById('hudClock');
  if (!P || !host) return;
  const origin = `${(P.pivot[0] / P.W * 100).toFixed(3)}% ${(P.pivot[1] / P.H * 100).toFixed(3)}%`;
  const part = (name, cls) => {
    const im = new Image(); im.src = `./assets/clock_parts/${name}.png`; im.alt = ''; im.draggable = false;
    im.className = 'ck-part ' + cls; return im;
  };
  const body = part('body', 'ck-body'), cap = part('cap', 'ck-cap');
  const blue = part('hand_blue', 'ck-hand'), orange = part('hand_orange', 'ck-hand');
  blue.style.transformOrigin = orange.style.transformOrigin = origin;
  const hands = document.createElement('span');            // 그림자를 바늘과 같이 돌리지 않으려고 감싸서 그림자를 줌
  hands.className = 'ck-part ck-hands';
  hands.append(blue, orange);
  host.append(body, hands, cap);
  const imgs = [body, blue, orange, cap];
  Promise.all(imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})))
    .then(() => { if (imgs.every(im => im.complete && im.naturalWidth)) host.classList.add('live'); });

  const BEAT = 60 / 126.67;          // 배경음악 빠르기 (assets/bgm_loop.wav = 16박 7.58초)
  const STEP = 30;                   // 주황: 한 박자에 30° (12박 = 한 바퀴)
  const SNAP = .2;                   // 박자의 앞 20% 동안 넘어감
  const BLUE_TURN = 24;              // 파랑: 한 바퀴 24초
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const backOut = t => { const c = 2.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };   // 넘어가서 살짝 되튐

  const clock = () => { try { return { from: clockFrom, hold: clockHold }; } catch (e) { return { from: 0, hold: null }; } };
  const beatNow = () => {
    const b = window.BGM && BGM.beat ? BGM.beat() : null;
    return b != null ? b : performance.now() / 1000 / BEAT;
  };

  let ticks = 0, lastBeat = null;
  function ring() {
    if (reduce.matches) return;
    host.classList.remove('ring'); void host.offsetWidth; host.classList.add('ring');
  }
  function frame() {
    requestAnimationFrame(frame);
    const { from, hold } = clock();
    if (!from) {                                           // 판 시작 전 · 나간 뒤: 처음 모양
      if (ticks || lastBeat != null) { ticks = 0; lastBeat = null; blue.style.rotate = orange.style.rotate = '0deg'; }
      return;
    }
    if (hold != null) return;                              // 판이 끝남: 그 자리에 멈춤
    const b = beatNow(), ib = Math.floor(b);
    if (lastBeat == null || ib < lastBeat || ib - lastBeat > 8) lastBeat = ib;   // 처음 · 음악이 늦게 켜짐 · 탭을 오래 비움
    else if (ib > lastBeat) {
      ticks += ib - lastBeat; lastBeat = ib;
      if (ticks % 12 === 0) ring();
    }
    const e = ticks === 0 ? 0 : (reduce.matches ? 1 : backOut(Math.min(1, (b - ib) / SNAP)));
    orange.style.rotate = (STEP * (Math.max(0, ticks - 1) + (ticks ? e : 0))).toFixed(2) + 'deg';
    blue.style.rotate = (360 * (performance.now() - from) / 1000 / BLUE_TURN).toFixed(2) + 'deg';
  }
  requestAnimationFrame(frame);
  window.HudClock = { get state() { return { live: host.classList.contains('live'), ticks, orange: orange.style.rotate, blue: blue.style.rotate }; } };
})();

// 가운데 종의 표정과 몸짓 — 인트로 영상처럼
//  · 가만히 있을 때: 숨 쉬듯 살짝 들썩이고, 2.5~5초마다 눈을 깜빡(⌒ ⌒), 몇 번에 한 번은 한쪽 눈 찡긋 윙크(고개 살짝 갸웃)
//  · 누르면: 눈을 꾹 감고(⌒ ⌒) 납작하게 눌렸다가 통 튀어 오르고, 양옆으로 알록달록 소리 물결 (분홍 · 노랑 · 민트 · 하늘)
//  · 맞히면 눈 감고 활짝 웃는 입 · 틀리면 눈 동그랗게 뜨고 '앗' 입
// 얼굴 조각: tools/build_bell_parts.py 가 만든 assets/bell_parts/*.png + src/bell-parts.js (window.BELL_PARTS)
// 조각을 다 불러오기 전에는 원래 종 그림(.bell-img)이 그대로 보여요.
// 다른 곳에서: BellFace.press() · BellFace.react('happy' | 'oops') · BellFace.blink() · BellFace.wink() · BellFace.pose(눈, 입, ms)
(() => {
  const P = window.BELL_PARTS, bell = document.getElementById('bell');
  if (!P || !bell) return;
  const NS = 'http://www.w3.org/2000/svg';
  const pct = (v, t) => (v / t * 100).toFixed(3) + '%';
  const n = v => v.toFixed(1);

  // ── 층: 종 몸통(얼굴 지운 그림) 위에 원래 눈 · 입 조각, 그 위에 새로 그리는 선(감은 눈 · 웃는 입 · 동그란 입)
  const art = document.createElement('div'); art.className = 'bell-art';
  const squash = document.createElement('div'); squash.className = 'bell-squash';
  art.appendChild(squash);
  const part = (name, cls) => {
    const im = new Image(); im.className = cls; im.alt = ''; im.draggable = false;
    im.src = `./assets/bell_parts/${name}.png`;
    const p = P[name];
    if (p) Object.assign(im.style, {
      left: pct(p.x, P.W), top: pct(p.y, P.H), width: pct(p.w, P.W), height: pct(p.h, P.H),
      transformOrigin: `${n((p.cx - p.x) / p.w * 100)}% ${n((p.cy - p.y) / p.h * 100)}%`,
    });
    squash.appendChild(im); return im;
  };
  const imgs = [part('body', 'bf-body'), part('blush_l', 'bf-blush l'), part('blush_r', 'bf-blush r'),
                part('eye_l', 'bf-eye l'), part('eye_r', 'bf-eye r'), part('mouth', 'bf-mouth')];

  // 감은 눈 ⌒ : 눈 폭보다 조금 넓게, 눈 가운데 높이에서 위로 볼록 (인트로의 깜빡 · 누를 때 눈)
  const closedEye = e => { const half = (e.core[2] - e.core[0]) * .56, y = e.cy + 8;
    return `M${n(e.cx - half)} ${n(y)}Q${n(e.cx)} ${n(y - 52)} ${n(e.cx + half)} ${n(y)}`; };
  const mx = P.mouth.cx, my = P.mouth.cy, sw = n(P.stroke * .92);
  const happy = `M${n(mx - 60)} ${n(my - 24)}Q${n(mx)} ${n(my - 14)} ${n(mx + 60)} ${n(my - 24)}` +
                `Q${n(mx + 54)} ${n(my + 56)} ${n(mx)} ${n(my + 58)}Q${n(mx - 54)} ${n(my + 56)} ${n(mx - 60)} ${n(my - 24)}Z`;
  const lines = document.createElementNS(NS, 'svg');
  lines.setAttribute('class', 'bf-lines'); lines.setAttribute('viewBox', `0 0 ${P.W} ${P.H}`); lines.setAttribute('aria-hidden', 'true');
  lines.innerHTML =
    `<defs><clipPath id="bfMouthClip"><path d="${happy}"/></clipPath></defs>` +
    `<path class="bf-closed l" d="${closedEye(P.eye_l)}" fill="none" stroke="${P.ink}" stroke-width="${sw}" stroke-linecap="round"/>` +
    `<path class="bf-closed r" d="${closedEye(P.eye_r)}" fill="none" stroke="${P.ink}" stroke-width="${sw}" stroke-linecap="round"/>` +
    `<g class="bf-happy"><path d="${happy}" fill="${P.ink}" stroke="${P.ink}" stroke-width="14" stroke-linejoin="round"/>` +
    `<ellipse cx="${n(mx)}" cy="${n(my + 47)}" rx="36" ry="22" fill="#EF8E9C" clip-path="url(#bfMouthClip)"/></g>` +
    `<ellipse class="bf-o" cx="${n(mx)}" cy="${n(my + 12)}" rx="44" ry="54" fill="${P.ink}"/>`;   // '앗' 입: 눈 크기의 2/3쯤
  squash.appendChild(lines);

  // ── 소리 물결: 종 양옆에 알록달록 호 3겹씩 (인트로에서 종이 울릴 때 나오는 색)
  const rings = document.createElementNS(NS, 'svg');
  rings.setAttribute('class', 'bell-rings'); rings.setAttribute('viewBox', `0 0 ${P.W} ${P.H}`); rings.setAttribute('aria-hidden', 'true');
  const C = ['#FF9DBF', '#FFD66E', '#8BE3CB', '#9DC6FF'];
  const cx = P.W / 2, cy = P.H * .44;
  let ringHtml = '';
  [-1, 1].forEach((side, s) => {
    for (let i = 0; i < 3; i++) {
      const r = P.W * (.47 + i * .055), a = (34 - i * 4) * Math.PI / 180, x = cx + side * r * Math.cos(a);
      ringHtml += `<path d="M${n(x)} ${n(cy - r * Math.sin(a))}A${n(r)} ${n(r)} 0 0 ${side > 0 ? 1 : 0} ${n(x)} ${n(cy + r * Math.sin(a))}"` +
                  ` stroke="${C[(i + s * 2) % 4]}" style="--i:${i}"/>`;
    }
  });
  rings.innerHTML = ringHtml;

  bell.insertBefore(rings, bell.firstChild);
  bell.appendChild(art);
  Promise.all(imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})))
    .then(() => { if (imgs.every(im => im.complete && im.naturalWidth)) bell.classList.add('faced'); });

  // ── 표정 바꾸기: 한 번에 하나만, 정해진 시간 뒤 원래 얼굴로
  let restore = 0, holdUntil = 0, pressAt = -1e9;
  const set = (eyes = '', mouth = '') => { bell.dataset.eyes = eyes; bell.dataset.mouth = mouth; };
  function pose(eyes, mouth, ms, delay = 0) {
    clearTimeout(restore);
    holdUntil = performance.now() + delay + ms;
    const go = () => { set(eyes, mouth); restore = setTimeout(() => set(), ms); };
    if (delay) restore = setTimeout(go, delay); else go();
  }
  const press = () => { pressAt = performance.now(); pose('closed', '', 300); };
  // 맞음/틀림은 누르는 순간과 거의 같이 오니, 꾹 감은 눈이 잠깐 보인 다음 바뀌게
  const react = kind => {
    const d = Math.max(0, pressAt + 160 - performance.now());
    if (kind === 'happy') pose('closed', 'happy', 950, d); else pose('', 'o', 900, d);
  };
  const free = () => performance.now() >= holdUntil;
  const blink = () => { if (free()) pose('closed', '', 110); };
  const wink = () => { if (free()) pose('wink', '', 620); };

  // ── 가만히 있을 때: 깜빡 (가끔 두 번 연달아) · 몇 번에 한 번 윙크
  let nextIdle = performance.now() + 2200, untilWink = 2;
  setInterval(() => {
    const now = performance.now();
    if (now < nextIdle) return;
    if (free() && !document.hidden) {
      if (--untilWink <= 0) { wink(); untilWink = 3 + (Math.random() * 3 | 0); }
      else { blink(); if (Math.random() < .3) setTimeout(blink, 260); }
    }
    nextIdle = now + 2400 + Math.random() * 2600;
  }, 150);

  window.BellFace = { press, react, blink, wink, pose };
})();

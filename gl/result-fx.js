// 결과 화면 덧입히기 (3D 폴더에만) — gl/result-fx.css 와 짝
//  · 순위: 3등까지만. 내가 3등 밖이면 3등 밑에 내 줄 (사이에 건너뛴 사람이 있으면 '···')
//  · 이겼을 때: 제목이 통통 · S 토큰이 판의 S 칸에서 날아와 쏙(도-미-솔) · 내 쪽에 왕관 · 꽃가루 · 판을 누르면 꽃가루 톡
//  · 졌을 때:   제목이 떨어져 시무룩 → 다시 벌떡 · Coco 토큰 먼저 · Coco 쪽에 왕관 · 판을 누르면 하트 · 다시 하기가 콩콩
//  · 함께: 숫자 올라가기 · 내 순위가 전체 수부터 굴러 내려와 멈춤 · 토큰 · 왕관 · 순위 줄을 누르면 흔들
// 원래 결과 화면(src/result.js)은 그대로 두고 그 뒤에 덧입혀요.
// main.js가 처음 읽힐 때 renderResult를 가져가므로(const { renderResult } = window) result.js 바로 뒤 · main.js 앞에 읽어야 해요
// (tools/sync_from_original.py 의 RESULT_ADD).
(() => {
  const render0 = window.renderResult;
  if (typeof render0 !== 'function') return;
  const $ = s => document.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vh = () => innerHeight / 100;
  let run = null;

  window.renderResult = function () {
    const out = render0.apply(this, arguments);
    try { trimRank(); prep(arguments[0] || {}); } catch (e) { console.warn('[result-fx]', e); }
    return out;
  };

  // ── 순위: 3등까지 + (밖이면) 내 줄
  function trimRank() {
    const list = $('#vList');
    if (!list) return;
    const rankOf = li => parseInt((li.querySelector('.rk-no') || {}).textContent, 10) || 99;
    const rows = $$('li.rk:not(.gap)', list), me = rows.find(li => li.classList.contains('me'));
    $$('li.gap', list).forEach(li => li.remove());
    const top = rows.filter(li => rankOf(li) <= 3);
    rows.forEach(li => { if (!top.includes(li) && li !== me) li.remove(); });
    if (me && !top.includes(me)) {
      me.classList.add('below');
      list.appendChild(me);
      if (rankOf(me) > Math.max(3, ...top.map(rankOf)) + 1) {      // 4등이면 바로 밑, 그보다 아래면 사이에 '···'
        const g = document.createElement('li');
        g.className = 'rk gap'; g.setAttribute('aria-hidden', 'true'); g.textContent = '···';
        list.insertBefore(g, me);
      }
    }
    $$('li', list).forEach((li, i) => li.style.setProperty('--i', i));
    list.dataset.n = $$('li.rk:not(.gap)', list).length;                 // 줄 수 → 3줄뿐이면 크게 (gl/result-fx.css)
  }

  // ── 연출 준비 (보이기 직전)
  function prep(o) {
    const v = $('#verdict');
    v.classList.add('fx');
    v.classList.toggle('fx-win', !!o.win);
    v.classList.toggle('fx-lose', !o.win);
    const h = $('#vTitle'), txt = h.textContent;
    h.setAttribute('aria-label', txt);
    h.classList.remove('wave', 'up');
    h.innerHTML = [...txt].map((c, k) => `<span class="ch" aria-hidden="true" style="--k:${k};--r:${(k % 2 ? 1 : -1) * (6 + (k * 37) % 5)}deg">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    $$('#vHits b, #vRt b, #vMiss b').forEach(b => {
      b.dataset.to = b.textContent;
      if (b.textContent !== '-') b.textContent = b.closest('#vRt') ? '0.0' : '0';
    });
    const r = $('#vRank'), of = ($('#vOf').textContent.match(/\d+/) || [])[0];
    r.dataset.to = r.textContent;
    if (of) r.textContent = of;
    $('#again').classList.remove('idle');
    $$('.rfx-crown').forEach(c => c.remove());
    $$('.r-stats div.done, .r-my.land').forEach(e => e.classList.remove('done', 'land'));
  }

  // ── 보이면 시작 · 사라지면 정리 (다시 하기 · 나가기)
  const verdict = $('#verdict');
  if (!verdict) return;
  new MutationObserver(() => {
    const on = verdict.classList.contains('show') && verdict.classList.contains('fx');
    if (on && !run) start(); else if (!on && run) stop();
  }).observe(verdict, { attributes: true, attributeFilter: ['class'] });

  function start() {
    const win = verdict.classList.contains('fx-win');
    const R = run = { win, timers: [], raf: 0, nodes: [], parts: [], cv: null };
    const at = (ms, fn) => R.timers.push(setTimeout(() => { if (run === R) fn(); }, ms));
    if (reduce()) {
      $$('.mt.got').forEach(t => t.classList.add('in'));
      $$('#vHits b, #vRt b, #vMiss b').forEach(b => { if (b.dataset.to != null) b.textContent = b.dataset.to; });
      $('#vRank').textContent = $('#vRank').dataset.to;
      $$('.rk.me.below, .rk.gap').forEach(e => e.classList.add('arrive'));
      crown(win, true);
      $('#again').classList.add('idle');
      return;
    }
    // 1) S 토큰: 판의 S 칸에서 결과로 날아와요 — 이긴 쪽 먼저
    let t = 720;
    (win ? [0, 1] : [1, 0]).forEach((pi, n) => {
      const slots = $$(`#s${pi} .slot`), toks = $$(`${pi ? '#vCoco' : '#vMe'} .mt.got`);
      // 내 토큰은 맑은 도-미-솔, Coco 토큰은 낮고 작은 소리 (져도 Coco 토큰을 축하하는 소리처럼 들리지 않게)
      toks.forEach((tok, k) => { at(t, () => fly(R, slots[k], tok, pi, k, pi === 0)); t += n === 0 ? 280 : 200; });
      t += 160;
    });
    const after = t + 520;
    // 2) 이긴 쪽 왕관 · 이기면 꽃가루 + 제목 출렁 / 지면 제목이 다시 힘내서 일어서요
    at(after, () => {
      crown(win);
      if (win) { confettiBurst(R); title('wave'); }
      else title('up');
    });
    // 3) 맞힌 종 · 빠르기 · 실수
    at(Math.max(1000, t - 200), () => countStats(R));
    // 4) 순위: 전체 수부터 내 순위까지 굴러 내려와요 (판이 다 올라온 뒤 바로)
    at(700, () => rollRank(R));
    // 5) 다시 하기
    at(after + 900, () => $('#again').classList.add('idle'));
  }

  function stop() {
    const R = run;
    run = null;
    if (!R) return;
    R.timers.forEach(clearTimeout);
    cancelAnimationFrame(R.raf);
    R.nodes.forEach(n => n.remove());
    $$('.rfx-crown, .rfx-heart, .rfx-burst, .rfx-fly').forEach(n => n.remove());
    $('#again').classList.remove('idle');
  }

  const again = (el, c) => { if (!el) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };

  // ── 소리 (main.js의 tone — 소리 크기 · 끔을 따라요)
  const NOTE = [1047, 1319, 1568];                    // 도 · 미 · 솔
  function snd(fs, d, type, g) { try { if (typeof tone === 'function') tone(fs, d, type, g); } catch (e) {} }
  const pling = (k, main) => main ? snd([NOTE[k % 3], NOTE[k % 3] * 2], .32, 'sine', .13) : snd([NOTE[k % 3] / 2], .2, 'sine', .09);
  const tick = (g = .05) => snd([1250], .045, 'triangle', g);

  // ── S 토큰 날리기
  const BLUES = ['oklch(0.72 0.1 265)', 'oklch(0.86 0.12 95)', 'oklch(0.85 0.08 200)'];
  const PINKS = ['oklch(0.78 0.12 10)', 'oklch(0.88 0.08 40)', 'oklch(0.86 0.12 95)'];
  function fly(R, slot, tok, pi, k, main) {
    const b = tok.getBoundingClientRect();
    const a = slot && slot.getBoundingClientRect();
    const img = tok.querySelector('img');
    if (!a || !a.width || !img) { tok.classList.add('in'); pling(k, main); return; }
    const size = b.width * 1.18, el = document.createElement('div');
    el.className = 'rfx-fly';
    el.style.width = el.style.height = size + 'px';
    el.innerHTML = `<img src="${img.src}" alt="">`;
    document.body.appendChild(el);
    R.nodes.push(el);
    const ax = a.left + a.width / 2 - size / 2, ay = a.top + a.height / 2 - size / 2;
    const bx = b.left + b.width / 2 - size / 2, by = b.top + b.height / 2 - size / 2;
    const mx = (ax + bx) / 2, my = Math.min(ay, by) - 12 * vh(), k0 = Math.max(.6, Math.min(2, a.width / size));
    const spin = pi ? -1 : 1;
    const an = el.animate([
      { transform: `translate(${ax}px,${ay}px) scale(${k0}) rotate(0deg)` },
      { transform: `translate(${mx}px,${my}px) scale(1.5) rotate(${spin * 200}deg)`, offset: .5 },
      { transform: `translate(${bx}px,${by}px) scale(1) rotate(${spin * 360}deg)` },
    ], { duration: 640, easing: 'cubic-bezier(.35,.6,.35,1)' });
    an.onfinish = () => {
      el.remove();
      if (run !== R) return;
      tok.classList.add('in');
      burst(R, b.left + b.width / 2, b.top + b.height / 2, pi ? PINKS : BLUES, main ? 9 : 6);
      pling(k, main);
    };
  }

  function burst(R, x, y, colors, n = 8, dist = 6.5) {
    const g = document.createElement('div');
    g.className = 'rfx-burst';
    g.style.left = x + 'px'; g.style.top = y + 'px';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * .4, d = (dist * (.7 + Math.random() * .5)) * vh();
      const s = document.createElement('i');
      s.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--c:${colors[i % colors.length]};--s:${(1 + Math.random() * .7).toFixed(2)}vh`;
      g.appendChild(s);
    }
    document.body.appendChild(g);
    R.nodes.push(g);
    setTimeout(() => g.remove(), 700);
  }

  // ── 왕관: 이긴 쪽 이름 위로 뚝
  const CROWN = `<svg viewBox="0 0 64 54" aria-hidden="true"><defs><linearGradient id="rfxCrownG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE98A"/><stop offset=".55" stop-color="#FFCB3D"/><stop offset="1" stop-color="#F2A91F"/></linearGradient></defs>
    <path d="M9 41 L6 15 Q6 11.5 9 13.8 L20.5 24 L29.6 8.6 Q32 5 34.4 8.6 L43.5 24 L55 13.8 Q58 11.5 58 15 L55 41 Z" fill="url(#rfxCrownG)" stroke="#E0961A" stroke-width="2.6" stroke-linejoin="round"/>
    <rect x="7.5" y="38.5" width="49" height="11" rx="5.5" fill="#F7B52C" stroke="#E0961A" stroke-width="2.6"/>
    <circle cx="32" cy="6.4" r="4.6" fill="#FF8FA3"/><circle cx="6.6" cy="12" r="3.9" fill="#8EC9FF"/><circle cx="57.4" cy="12" r="3.9" fill="#7EE0C3"/>
    <circle cx="32" cy="44" r="3.1" fill="#FF8FA3"/><circle cx="19" cy="44" r="2.2" fill="#fff6"/><circle cx="45" cy="44" r="2.2" fill="#fff6"/>
    <path d="M14 21 Q15.6 29 15 35.5" stroke="#fff" stroke-opacity=".65" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>`;
  function crown(win, quiet) {
    const label = $(win ? '#vSideMe b' : '#vSideCoco b');
    if (!label || label.querySelector('.rfx-crown')) return;
    const c = document.createElement('span');
    c.className = 'rfx-crown';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = CROWN;
    label.appendChild(c);
    if (!quiet) setTimeout(() => snd([784, 1175], .4, 'triangle', .1), 380);
  }

  function title(kind) { again($('#vTitle'), kind); }

  // ── 꽃가루 (캔버스 한 장 — 클레이 조각처럼 위쪽이 밝은 둥근 조각)
  const CONF = ['#FFD84D', '#FF8FA3', '#7EE0C3', '#8EC9FF', '#FFB37A', '#B9A6FF'];
  function confetti(R, x, y, n, up, spread) {
    if (!R.cv) {
      R.cv = document.createElement('canvas');
      R.cv.className = 'rfx-confetti';
      document.body.appendChild(R.cv);
      R.nodes.push(R.cv);
    }
    const u = vh();
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - .5) * spread;
      const sp = (up * (.55 + Math.random() * .6)) * u;
      R.parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 6.3, vr: (Math.random() - .5) * 12,
        w: (1.1 + Math.random() * .9) * u, h: (.65 + Math.random() * .5) * u, round: Math.random() < .35, c: CONF[i % CONF.length],
        ph: Math.random() * 6.3, t: 0 });
    }
    if (!R.raf) { R.last = performance.now(); R.raf = requestAnimationFrame(now => step(R, now)); }
  }
  function confettiBurst(R) {
    const h = $('#vTitle').getBoundingClientRect(), u = vh();
    confetti(R, h.left + h.width / 2, h.top + h.height * .6, 70, 95, 2.2);
    confetti(R, innerWidth * .04, innerHeight * .98, 34, 120, .7);
    confetti(R, innerWidth * .96, innerHeight * .98, 34, 120, .7);
    R.parts.slice(-68).forEach((p, i) => { p.vx += (i < 34 ? 1 : -1) * 28 * u; });      // 양옆 대포는 가운데 쪽으로
    snd([1568, 2093], .5, 'sine', .08);
  }
  function step(R, now) {
    if (run !== R) return;
    const cv = R.cv, dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight, u = vh();
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const dt = Math.min(.05, (now - R.last) / 1000);
    R.last = now;
    R.parts = R.parts.filter(p => p.y < H + 5 * u && p.t < 6);
    for (const p of R.parts) {
      p.t += dt;
      p.vy += 120 * u * dt;                                      // 떨어지기
      const drag = Math.exp(-2.2 * dt);
      p.vx *= drag; p.vy = p.vy * drag + 0 * dt;
      p.x += (p.vx + Math.sin(p.t * 5 + p.ph) * 6 * u) * dt;   // 살랑살랑
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      const flip = Math.abs(Math.cos(p.t * 4 + p.ph));          // 뒤집히며 납작해 보이게
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.scale(1, .35 + .65 * flip);
      g.fillStyle = p.c;
      g.beginPath();
      if (p.round) g.arc(0, 0, p.h * .8, 0, Math.PI * 2);
      else g.roundRect ? g.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.h / 2) : g.rect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)';                    // 위쪽 빛 (클레이)
      g.beginPath();
      if (p.round) g.arc(-p.h * .22, -p.h * .25, p.h * .32, 0, Math.PI * 2);
      else g.rect(-p.w / 2 + p.h * .3, -p.h / 2 + p.h * .14, p.w - p.h * .6, p.h * .22);
      g.fill();
      g.restore();
    }
    R.raf = R.parts.length ? requestAnimationFrame(n => step(R, n)) : 0;
    if (!R.parts.length) g.clearRect(0, 0, W, H);
  }

  // ── 하트 (졌을 때 판을 누르면)
  // 살구색 판 위에서도 또렷하게: 진한 색 + 흰 테두리 (연한 분홍은 판 색에 묻혔어요)
  const HEART = c => `<svg viewBox="-3 -3 46 42" aria-hidden="true"><path d="M20 34 C8 25 2 18.5 2 11.5 C2 5.6 6.6 2 11.4 2 C15.2 2 18.2 4.2 20 7.4 C21.8 4.2 24.8 2 28.6 2 C33.4 2 38 5.6 38 11.5 C38 18.5 32 25 20 34 Z" fill="${c}" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>
    <ellipse cx="11.5" cy="10" rx="4.6" ry="3" fill="#fff" fill-opacity=".6" transform="rotate(-25 11.5 10)"/></svg>`;
  const HEARTS = ['#FF4F7B', '#FF7A45', '#FFB800', '#E84FA8'];
  function hearts(R, x, y) {
    for (let i = 0; i < 3; i++) {
      const h = document.createElement('span');
      h.className = 'rfx-heart';
      h.style.cssText = `left:${x}px;top:${y}px;--hx:${((i - 1) * 6 + (Math.random() - .5) * 4).toFixed(1)}vh;--hr:${((Math.random() - .5) * 50).toFixed(0)}deg;animation-delay:${i * 90}ms`;
      h.innerHTML = HEART(HEARTS[(i + (Math.random() * 4 | 0)) % HEARTS.length]);
      document.body.appendChild(h);
      R.nodes.push(h);
      setTimeout(() => h.remove(), 1800);
    }
    snd([660, 990], .16, 'sine', .07);
  }

  // ── 숫자 올라가기
  function countStats(R) {
    $$('#vHits b, #vRt b, #vMiss b').forEach((b, i) => {
      const to = b.dataset.to, box = b.closest('div');
      if (to == null || to === '-') { setTimeout(() => run === R && again(box, 'done'), i * 160); return; }
      const end = parseFloat(to) || 0, dec = to.includes('.') ? 1 : 0;
      const t0 = performance.now() + i * 160, dur = dec ? 700 : Math.min(900, 170 * Math.max(1, end));
      let shown = b.textContent;
      const f = now => {
        if (run !== R) return;
        const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        const val = (end * e).toFixed(dec);
        if (val !== shown) { b.textContent = val; shown = val; if (!dec) tick(.04); }
        if (k < 1) requestAnimationFrame(f);
        else { b.textContent = to; again(box, 'done'); }
      };
      requestAnimationFrame(f);
    });
  }

  // ── 내 순위: 전체 수부터 한 칸씩 굴러 내려와 멈춰요 (점점 느리게)
  function rollRank(R) {
    const el = $('#vRank'), to = parseInt(el.dataset.to, 10), from = parseInt(el.textContent, 10);
    const land = () => {
      el.textContent = el.dataset.to;
      again($('.r-my'), 'land');
      snd([880, 1320], .3, 'sine', .1);
      $$('.rk.me.below, .rk.gap').forEach(e => e.classList.add('arrive'));
      const me = $('.rk.me');
      if (!me) return;
      setTimeout(() => {
        if (run !== R) return;
        again(me, 'shine');
        if (to <= 3) {
          const no = me.querySelector('.rk-no'), r = no.getBoundingClientRect();
          again(no, 'glint');
          burst(R, r.left + r.width / 2, r.top + r.height / 2, ['#FFD84D', '#FFE98A', '#FFFFFF'], 10, 5);
          snd([1568, 2093], .35, 'sine', .09);
        }
      }, 260);
    };
    if (!(from > to)) { land(); return; }
    const steps = from - to;
    let i = 0;
    const next = () => {
      if (run !== R) return;
      i++;
      el.textContent = String(from - i);
      again(el, 'tick');
      tick(.035);
      if (i < steps) R.timers.push(setTimeout(next, 70 + 250 * Math.pow(i / steps, 2.2)));
      else land();
    };
    R.timers.push(setTimeout(next, 60));
  }

  // ── 누르면: 토큰 흔들 · 왕관 흔들 · 순위 줄 꿀렁 · 제목 다시 · 판(이기면 꽃가루 톡 / 지면 하트)
  verdict.addEventListener('pointerdown', e => {
    const R = run;
    if (!R || !verdict.classList.contains('show')) return;
    const t = e.target;
    if (t.closest('.again')) return;
    const tok = t.closest('.mt.got.in');
    if (tok) { again(tok, 'jig'); pling($$('.mt.got', tok.parentNode).indexOf(tok), true); return; }
    const cr = t.closest('.rfx-crown');
    if (cr) { again(cr, 'jig'); const r = cr.getBoundingClientRect(); burst(R, r.left + r.width / 2, r.top + r.height / 2, ['#FFD84D', '#FFE98A', '#FFFFFF'], 8, 5); snd([1175, 1568], .25, 'triangle', .08); return; }
    const row = t.closest('.rk:not(.gap)');
    if (row) { again(row, 'squish'); snd([740], .12, 'sine', .07); return; }
    if (t.closest('#vTitle')) { title(R.win ? 'wave' : 'up'); snd([R.win ? 1047 : 784], .2, 'sine', .07); return; }
    if (!t.closest('.r-card') || reduce()) return;
    if (R.win) { confetti(R, e.clientX, e.clientY, 18, 55, 2.6); snd([1319, 1760], .22, 'sine', .07); }
    else hearts(R, e.clientX, e.clientY);
  });

  window.ResultFX = { get run() { return run; }, stop };
})();

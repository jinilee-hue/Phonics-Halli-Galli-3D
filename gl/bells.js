/* MY BELLS — 모은 S로 가운데 종의 색을 바꿔요 (3D 폴더 전용 · 사용자 2026-11-22: 게임마다 모은 것이 가는 곳이 있어야 함 → 여기선 종 꾸미기)
   · 모은 S: 게임이 끝날 때마다 내 S를 이 기기에 더해요 (localStorage 'hg-s-total' — gl/progress-rdd.js의 end() 감싸기에서)
   · 종 모양: Classic(처음부터) · Pink(S 5) · Mint(S 15) · Rainbow(S 30). 고른 것은 'hg-bell'에 기억
     3D 종은 Bell3D.paint(색), 3D가 꺼진 HTML 종은 #app[data-bell-style]의 CSS 필터(gl/bells.css)
   · 시작 화면 오른쪽 위 종 버튼 → MY BELLS 판: 종 그림 4개 · 잠긴 것은 흐리게 + 자물쇠 + 필요한 S · 지금 종 표시 · 모은 S
   화면 글자는 짧은 영어 이름표만. 새 목소리 없음 (고를 때 짧은 효과음만). */
(() => {
  'use strict';
  const K_TOTAL = 'hg-s-total', K_BELL = 'hg-bell';
  // 색: 3D 종에서 직접 보며 고름 (~/.cache/agent-scratch/rewards/variants.png) — Classic은 원래 재질 값 그대로
  const STYLES = [
    { id: 'classic', name: 'Classic', need: 0, dome: '#FFEB00', knob: '#FFD400', base: '#E02E35',
      domeEmi: '#3c3000', domeSheen: '#fff27a', knobEmi: '#3a2a00', knobSheen: '#ffe36a', baseEmi: '#2a0406', baseSheen: '#ff7a7e' },
    { id: 'pink', name: 'Pink', need: 5, dome: '#FF8EC2', knob: '#FF6FAF', base: '#9A7CF0', glow: '#6a2a48' },        // 핑크 시계처럼 분홍 + 라벤더
    { id: 'mint', name: 'Mint', need: 15, dome: '#7EEBCB', knob: '#57DDB6', base: '#FF8A8A', glow: '#1f5a48' },       // 민트 + 산호
    { id: 'rainbow', name: 'Rainbow', need: 30, rainbow: ['#FF8FB1', '#FFB36B', '#FFE45C', '#7EE0A8', '#72C7F5', '#A98BF5'],
      dome: '#FFE45C', knob: '#FFC94A', base: '#FFC94A', glow: '#5a4a10' },                                           // 무지개 + 금빛 받침
  ];
  const byId = id => STYLES.find(s => s.id === id) || STYLES[0];
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode — this visit only */ } };
  const total = () => Math.max(0, parseInt(read(K_TOTAL), 10) || 0);
  const open = s => total() >= s.need;
  let cur = byId(read(K_BELL));
  if (!open(cur)) cur = STYLES[0];
  const app = document.getElementById('app');

  function apply(s) {
    if (app) app.dataset.bellStyle = s.id;
    if (window.Bell3D && Bell3D.paint) Bell3D.paint(s);
  }
  apply(cur);

  /* ── 작은 종 그림 (SVG) — 3D 종처럼: 빨간 받침 자리 · 퍼진 테 · 돔 · 회색 축 · 버튼 + 얼굴 ── */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const lit = (h, t) => mix(h, '#ffffff', t), dim = (h, t) => mix(h, '#000000', t);
  function bellSVG(s) {
    const u = 'bl-' + s.id, id = n => `${u}-${n}`;
    const domeStops = s.rainbow
      ? s.rainbow.slice().reverse().map((c, i, a) => `<stop offset="${(i / (a.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')
      : `<stop offset="0" stop-color="${lit(s.dome, .45)}"/><stop offset=".55" stop-color="${s.dome}"/><stop offset="1" stop-color="${dim(s.dome, .1)}"/>`;
    const rim = s.rainbow ? s.rainbow[0] : s.dome;
    return `<svg viewBox="0 0 100 92" aria-hidden="true"><defs>
<linearGradient id="${id('d')}" x1="0" y1="0" x2="0" y2="1">${domeStops}</linearGradient>
<linearGradient id="${id('r')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit(rim, .3)}"/><stop offset=".6" stop-color="${rim}"/><stop offset="1" stop-color="${dim(rim, .14)}"/></linearGradient>
<linearGradient id="${id('bt')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit(s.base, .22)}"/><stop offset="1" stop-color="${s.base}"/></linearGradient>
<linearGradient id="${id('bs')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dim(s.base, .06)}"/><stop offset="1" stop-color="${dim(s.base, .24)}"/></linearGradient>
<linearGradient id="${id('k')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit(s.knob, .45)}"/><stop offset="1" stop-color="${dim(s.knob, .08)}"/></linearGradient>
</defs>
<ellipse cx="50" cy="83" rx="44" ry="6" fill="#283c5a" opacity=".16"/>
<path d="M4 68v8a46 12 0 0 0 92 0v-8z" fill="url(#${id('bs')})"/>
<ellipse cx="50" cy="68" rx="46" ry="12" fill="url(#${id('bt')})"/>
<rect x="44.5" y="8" width="11" height="9" rx="2" fill="#a3a3a3"/>
<ellipse cx="50" cy="8.5" rx="12.5" ry="5.2" fill="url(#${id('k')})"/>
<ellipse cx="46" cy="6.6" rx="5" ry="1.6" fill="#fff" opacity=".55"/>
<path d="M14 58C14 27 29 15 50 15s36 12 36 43z" fill="url(#${id('d')})"/>
<path d="M8 58c0-6 5-9 11-9h62c6 0 11 3 11 9s-14 10-42 10S8 64 8 58z" fill="url(#${id('r')})"/>
<ellipse cx="34" cy="28" rx="8" ry="4.6" transform="rotate(-28 34 28)" fill="#fff" opacity=".45"/>
<ellipse cx="29" cy="55.5" rx="4" ry="2.4" fill="#ff9999" opacity=".85"/><ellipse cx="71" cy="55.5" rx="4" ry="2.4" fill="#ff9999" opacity=".85"/>
<ellipse cx="37" cy="48" rx="3.7" ry="4.3" fill="#4a2b21"/><ellipse cx="63" cy="48" rx="3.7" ry="4.3" fill="#4a2b21"/>
<circle cx="36" cy="46.4" r="1.25" fill="#fff"/><circle cx="62" cy="46.4" r="1.25" fill="#fff"/>
<path d="M44.6 52.2q2.7 3.6 5.4 0q2.7 3.6 5.4 0" fill="none" stroke="#4a2b21" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  }

  /* ── 버튼 (오른쪽 위 무리의 맨 앞 · 시작 화면에만) ── */
  const S_IMG = './assets/card/my_s.png';
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.2V7.6"/><path d="M9.6 4.6h4.8"/>' +
    '<path d="M4.6 16.4a7.4 7.4 0 0 1 14.8 0"/><path d="M3.2 16.4h17.6a.9.9 0 0 1 .9.9v.9a1.4 1.4 0 0 1-1.4 1.4H3.7a1.4 1.4 0 0 1-1.4-1.4v-.9a.9.9 0 0 1 .9-.9z"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/><path d="M12 14.6v2"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.6l4.2 4.2 8.8-9.6"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  let btn, scrim, panel, totalEl, grid;

  function build() {
    const bar = document.querySelector('.hud-r');
    if (!bar || btn) return;
    btn = document.createElement('button');
    btn.className = 'hud-btn'; btn.id = 'btnBells'; btn.type = 'button';
    btn.setAttribute('aria-label', 'My bells'); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = ICON;
    bar.insertBefore(btn, bar.firstChild);

    scrim = document.createElement('div');
    scrim.className = 'bells-scrim'; scrim.hidden = true;
    panel = document.createElement('section');
    panel.className = 'bells-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bellsTitle');
    panel.innerHTML = `<header class="bells-head"><h2 id="bellsTitle">MY BELLS</h2>
<span class="bells-total"><img src="${S_IMG}" alt="" draggable="false"><b></b></span>
<button class="bells-close" type="button" aria-label="Close">${CLOSE}</button></header><div class="bells-grid"></div>`;
    totalEl = panel.querySelector('.bells-total');
    grid = panel.querySelector('.bells-grid');
    grid.innerHTML = STYLES.map(s => `<button class="bell-tile" type="button" data-id="${s.id}">
<span class="bt-pic">${bellSVG(s)}<i class="bt-lock">${LOCK}</i><i class="bt-on">${CHECK}</i></span>
<span class="bt-lbl">${s.name}</span><span class="bt-need"><img src="${S_IMG}" alt="" draggable="false"><b>${s.need}</b></span></button>`).join('');
    app.append(scrim, panel);

    btn.addEventListener('click', e => { e.stopPropagation(); show(); });
    scrim.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); hide(); });
    panel.addEventListener('pointerdown', e => e.stopPropagation());        // 판 위에서 끌어도 360° 돌리기가 시작되지 않게
    panel.querySelector('.bells-close').addEventListener('click', () => hide());
    grid.addEventListener('click', e => { const t = e.target.closest('.bell-tile'); if (t) pick(t); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); hide(); } }, true);
    // 시작 화면을 떠나면 (START · 인트로 다시) 닫아요
    new MutationObserver(() => { if (app.dataset.screen !== 'title' && !panel.hidden) hide(true); })
      .observe(app, { attributes: true, attributeFilter: ['data-screen'] });
  }

  function paint() {
    if (!panel) return;
    const n = total();
    totalEl.querySelector('b').textContent = n;
    totalEl.setAttribute('aria-label', `${n} S`);
    grid.querySelectorAll('.bell-tile').forEach(t => {
      const s = byId(t.dataset.id), ok = open(s), on = s.id === cur.id;
      t.classList.toggle('locked', !ok); t.classList.toggle('on', on);
      t.setAttribute('aria-pressed', String(on));
      t.setAttribute('aria-disabled', String(!ok));
      t.setAttribute('aria-label', ok ? s.name : `${s.name}, ${s.need} S`);
    });
  }
  function show() {
    if (app.dataset.screen !== 'title' || !panel.hidden) return;
    paint();
    scrim.hidden = panel.hidden = false;
    panel.classList.remove('out');
    btn.setAttribute('aria-expanded', 'true');
    try { tone([880, 1320], .18, 'sine', .1); } catch (e) { /* main.js not ready */ }
    (grid.querySelector('.bell-tile.on') || panel.querySelector('.bells-close')).focus({ preventScroll: true });
  }
  function hide(now) {
    if (!panel || panel.hidden) return;
    btn.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
    const done = () => { panel.hidden = true; panel.classList.remove('out'); };
    if (now || matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else { panel.classList.add('out'); setTimeout(done, 180); }
    if (!now) btn.focus({ preventScroll: true });
  }
  function pick(t) {
    const s = byId(t.dataset.id);
    if (!open(s)) {                                       // 잠김: 고를 수 없어요 — 살짝 흔들고 필요한 S를 보여 줌
      t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope');
      try { tone([196, 185], .22, 'triangle', .12); } catch (e) {}
      return;
    }
    if (s.id !== cur.id) { cur = s; write(K_BELL, s.id); apply(s); }
    paint();
    try { tone([1320, 1980, 2640], .45, 'sine', .12); } catch (e) {}
    // 시작 화면의 종이 바로 바뀌고 콩콩 + 활짝
    if (window.Bell3D && Bell3D.ready && Bell3D.act) Bell3D.act('hop');
    if (window.BellFace && BellFace.pose) BellFace.pose('closed', 'happy', 900);
  }

  window.HGBells = { STYLES, total, get current() { return cur.id; }, refresh: paint, open: show, close: hide };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

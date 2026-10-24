// 6세 · 7세 그림 카드 (3D 폴더 전용 · 사용자 요청 "6세 이미지 생성해서 넣었는데 반영해줘" · "7세에도 그림카드가 있어야지")
//  · 원래 main.js는 그림 카드를 5세(1단계)에서만 써요(level===1) — 2 · 3단계도 그림이 있으면 그림 카드로 바꿔요
//    flip을 감싸서, 방금 나온 카드(cur.el)의 '그림 자리'(6세) · 글자만(7세) 앞면을 그림으로 바꿔 끼움 (3D 판은 이 HTML 카드를 읽어 그려요)
//  · 그림 목록: gl/card-art.js (tools/build_card_art.py가 원래 게임 assets/card에서 만듦)
//  · 6세 덱: 단수 · 복수 그림이 둘 다 있는 낱말만 골라요 — 그림이 다 생기면 원래대로 62개 전부에서
//    HOLD: 그림을 고칠 때까지 빼 둘 낱말 (예: 여럿 카드인데 하나만 그려진 그림). 지금은 없음 — maps는 지도 3개로 고쳐졌어요
//  · ?age=6 · ?age=7 : 그 단계로 시작 (단계 고르기 단추는 원래 게임에서 숨김)
//  · 파일을 더블클릭해 열면(file://) 3D 판이 그림 파일을 못 읽어요 → 2단계 이상이면 gl/card-tex.js(data URL)를 그때 불러와요
(() => {
  const HOLD = new Set([]);
  const art = w => window.CARD_ART && window.CARD_ART[w];

  // ── 6세 덱: 그림이 있는 낱말만
  try {
    const d0 = Object.getOwnPropertyDescriptor(LEVELS[2], 'words');
    Object.defineProperty(LEVELS[2], 'words', {
      configurable: true, enumerable: true,
      get() {
        const all = WORDS.level2.words;
        const ok = all.filter(w => art(w.base) && art(w.plural) && !HOLD.has(w.base));
        if (ok.length < 10 || ok.length === all.length) return d0.get.call(this);
        return pickN(ok, 10).flatMap(w => [[w.base, 0, oneKo(w)], [w.plural, 1, manyKo(w)]]);
      }
    });
  } catch (e) { console.warn('[lv-cards] 6세 덱', e); }

  // ── 나온 카드를 그림 카드로
  function dress(el, w) {
    if (!el || level === 1 || el.classList.contains('has-art')) return;
    const src = art(w);
    if (!src) return;
    const front = el.querySelector('.f.front');
    if (!front) return;
    front.innerHTML = `<img class="card-img" src="${src}" alt="${w}" draggable="false"><div class="word">${w}</div>`;
    el.classList.remove('nopic');
    el.classList.add('has-art');
  }
  // 다음 카드 그림을 미리 받아 둠 (http: 카드가 나오자마자 3D 판에 그림이 보이게)
  const pre = new Set();
  function preload() {
    if (level === 1 || location.protocol === 'file:') return;
    (deck || []).slice(0, 3).forEach(c => {
      const src = art(c.w);
      if (src && !pre.has(src)) { pre.add(src); const im = new Image(); im.decoding = 'async'; im.src = src; }
    });
  }
  const flip0 = window.flip;
  window.flip = function () {
    const r = flip0.apply(this, arguments);
    try { dress(cur && cur.el, cur && cur.w); preload(); } catch (e) { console.warn('[lv-cards]', e); }
    return r;
  };
  const reset0 = window.reset;
  window.reset = function () {
    const r = reset0.apply(this, arguments);
    try { preload(); } catch (e) {}
    return r;
  };

  // ── file://: 3D 판용 그림(data URL)을 2단계 이상일 때만
  let texAsked = false;
  function needTex() {
    if (texAsked || location.protocol !== 'file:' || level === 1) return;
    texAsked = true;
    const s = document.createElement('script');
    s.src = './gl/card-tex.js';
    document.head.appendChild(s);
  }
  const pick0 = window.pickLevel;
  window.pickLevel = function () {
    const r = pick0.apply(this, arguments);
    try { needTex(); } catch (e) {}
    return r;
  };

  // ── ?age=6 · ?age=7
  const lv = { 5: 1, 6: 2, 7: 3 }[new URLSearchParams(location.search).get('age')];
  if (lv && lv !== level) { window.pickLevel(lv); reset(); }
})();

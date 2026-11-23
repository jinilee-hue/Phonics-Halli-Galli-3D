// 언어 고르기 — 노란 종 튜터의 말과 Coco 말풍선을 영어 / 한국어로 (3D 폴더 전용)
// 사용자 2026-11-20: "링딩동에서 언어 선택 들어가야해". 다른 파닉스 게임(Toy Catch)과 같은 토글 — 두 국기, 쓰는 쪽이 흰 손잡이 위.
// 시작 화면에만 보여요(Toy Catch처럼). 카드 낱말 소리는 배우는 영어라 그대로. 고른 말은 이 기기에 기억해요(localStorage 'hg-lang').
// 처음 오면(기억된 말 없음) 한국어로 시작 (사용자 2026-11-22, 파닉스 게임 공통). 화면 글자는 두 말 모두 영어.
// 화면 글자는 영어 (사용자 2026-11-22 "응 바꿔"): 게임 위쪽 단계 알약 '1단계 · 5세 · K' → 'Level 1 · Age 5 · K'.
// 2026-11-23 게임 레벨(Coco 빠르기, gl/speed.js)이 생겨서 알약은 'Age 5 · K · Level 3' — 이름은 나이만, Level은 speed.js가 붙여요.
// 원래 게임(src/main.js, 동기화로 덮어써짐)은 그대로 두고 여기서 이름만 바꿔요 — LEVELS는 main.js의 전역 const.
try { if (typeof LEVELS !== 'undefined') for (const k of [1, 2, 3]) if (LEVELS[k]) LEVELS[k].name = `Age ${k + 4}`; } catch (e) { /* the original changed */ }
(() => {
  const KEY = 'hg-lang';
  let lang = 'ko';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'ko'; } catch (e) { /* private mode */ }
  const subs = [];
  window.HGLang = {
    get: () => lang,
    set(l) { lang = l === 'ko' ? 'ko' : 'en'; try { localStorage.setItem(KEY, lang); } catch (e) {} paint(); subs.forEach(f => { try { f(lang); } catch (e) {} }); },
    on: (f) => subs.push(f),
  };
  // 노란 종 튜터의 말: TUTOR_VOICE.lines가 고른 말의 묶음을 돌려줘요 (tutor.js는 그대로 VOICE.lines를 읽음)
  const V = window.TUTOR_VOICE;
  if (V && V.lines_ko) {
    const en = V.lines;
    Object.defineProperty(V, 'lines', { configurable: true, get: () => (lang === 'ko' ? V.lines_ko : en) });
  }
  const EN = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><defs><clipPath id=\"hgflag-en\"><circle cx=\"12\" cy=\"12\" r=\"12\"/></clipPath></defs><g clip-path=\"url(#hgflag-en)\"><rect width=\"24\" height=\"24\" fill=\"#fff\"/><rect y=\"0\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"3.69\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"7.38\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"11.08\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"14.77\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"18.46\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect y=\"22.15\" width=\"24\" height=\"1.85\" fill=\"#b22234\"/><rect width=\"12\" height=\"12.92\" fill=\"#3c3b6e\"/><g fill=\"#fff\"><circle cx=\"1.6\" cy=\"1.8\" r=\".7\"/><circle cx=\"4.5\" cy=\"1.8\" r=\".7\"/><circle cx=\"7.4\" cy=\"1.8\" r=\".7\"/><circle cx=\"10.3\" cy=\"1.8\" r=\".7\"/><circle cx=\"3.05\" cy=\"3.7\" r=\".7\"/><circle cx=\"5.95\" cy=\"3.7\" r=\".7\"/><circle cx=\"8.85\" cy=\"3.7\" r=\".7\"/><circle cx=\"1.6\" cy=\"5.6\" r=\".7\"/><circle cx=\"4.5\" cy=\"5.6\" r=\".7\"/><circle cx=\"7.4\" cy=\"5.6\" r=\".7\"/><circle cx=\"10.3\" cy=\"5.6\" r=\".7\"/><circle cx=\"3.05\" cy=\"7.5\" r=\".7\"/><circle cx=\"5.95\" cy=\"7.5\" r=\".7\"/><circle cx=\"8.85\" cy=\"7.5\" r=\".7\"/><circle cx=\"1.6\" cy=\"9.4\" r=\".7\"/><circle cx=\"4.5\" cy=\"9.4\" r=\".7\"/><circle cx=\"7.4\" cy=\"9.4\" r=\".7\"/><circle cx=\"10.3\" cy=\"9.4\" r=\".7\"/><circle cx=\"3.05\" cy=\"11.3\" r=\".7\"/><circle cx=\"5.95\" cy=\"11.3\" r=\".7\"/><circle cx=\"8.85\" cy=\"11.3\" r=\".7\"/></g></g></svg>", KO = "<svg viewBox=\"-12 -12 24 24\" aria-hidden=\"true\"><defs><clipPath id=\"hgflag-ko\"><circle r=\"12\"/></clipPath></defs><g clip-path=\"url(#hgflag-ko)\"><rect x=\"-18\" y=\"-12\" width=\"36\" height=\"24\" fill=\"#fff\"/><g transform=\"rotate(33.69)\"><path d=\"M-6 0a6 6 0 0 1 12 0 3 3 0 0 0-6 0 3 3 0 0 1-6 0z\" fill=\"#cd2e3a\"/><path d=\"M-6 0a6 6 0 0 0 12 0 3 3 0 0 0-6 0 3 3 0 0 1-6 0z\" fill=\"#0047a0\"/></g><g fill=\"#151515\"><g transform=\"rotate(33.69) translate(-10.2 0)\"><rect x=\"-1.55\" y=\"-2.8\" width=\".9\" height=\"5.6\"/><rect x=\"-.15\" y=\"-2.8\" width=\".9\" height=\"5.6\"/><rect x=\"1.25\" y=\"-2.8\" width=\".9\" height=\"5.6\"/></g><g transform=\"rotate(33.69) translate(10.2 0)\"><rect x=\"-2.2\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\"-2.2\" y=\".3\" width=\".9\" height=\"2.5\"/><rect x=\"-.75\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\"-.75\" y=\".3\" width=\".9\" height=\"2.5\"/><rect x=\".7\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\".7\" y=\".3\" width=\".9\" height=\"2.5\"/></g><g transform=\"rotate(-33.69) translate(10.2 0)\"><rect x=\"-2.2\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\"-2.2\" y=\".3\" width=\".9\" height=\"2.5\"/><rect x=\"-.75\" y=\"-2.8\" width=\".9\" height=\"5.6\"/><rect x=\".7\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\".7\" y=\".3\" width=\".9\" height=\"2.5\"/></g><g transform=\"rotate(-33.69) translate(-10.2 0)\"><rect x=\"-1.55\" y=\"-2.8\" width=\".9\" height=\"5.6\"/><rect x=\"-.15\" y=\"-2.8\" width=\".9\" height=\"2.5\"/><rect x=\"-.15\" y=\".3\" width=\".9\" height=\"2.5\"/><rect x=\"1.25\" y=\"-2.8\" width=\".9\" height=\"5.6\"/></g></g></g></svg>";
  let btn = null;
  function paint() {
    if (!btn) return;
    btn.dataset.l = lang;
    btn.setAttribute('aria-pressed', String(lang === 'ko'));
    btn.querySelectorAll('.flag').forEach(f => f.classList.toggle('on', f.dataset.l === lang));
  }
  function mount() {
    const bar = document.querySelector('.hud-r');
    if (!bar || btn) return;
    btn = document.createElement('button');
    btn.className = 'lang-tog'; btn.id = 'btnLang'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Language: English or Korean · 언어: 영어 또는 한국어');
    btn.innerHTML = `<span class="knob"></span><span class="flag" data-l="en">${EN}</span><span class="flag" data-l="ko">${KO}</span>`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); window.HGLang.set(lang === 'ko' ? 'en' : 'ko'); try { window.sfx && sfx('tap'); } catch (err) {} });
    bar.insertBefore(btn, bar.firstChild);
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

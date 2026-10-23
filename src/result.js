// 결과 화면: 왼쪽은 이겼다 / 아쉬워요, 오른쪽은 우리 반 순위.
// 반 기록 연동 전이라 반 친구 기록은 예시입니다. '나'의 기록만 방금 한 판에서 잽니다.
//   모은 S  = 게임이 끝났을 때 내 S 토큰 수 (0~3, 이기면 3)
//   빠르기  = 카드가 나온 뒤 맞게 종을 칠 때까지 걸린 평균 시간
//   순위    = 모은 S가 많은 순, 같으면 빠른 순
// (파일을 더블클릭해 열어도 돌아가도록 모듈이 아닌 일반 스크립트로 둡니다)
(() => {
const $ = s => document.querySelector(s);
const NAMES = ['Emma', 'Leo', 'Mia', 'Noah', 'Ava', 'Liam', 'Zoe', 'Ethan', 'Lily', 'Ryan', 'Chloe'];  // 예시 이름
const TONES = ['var(--c-blue)', 'var(--c-green)', 'var(--c-cream)', 'var(--c-pink)'];
// 단계마다 늘 같은 예시 기록이 나오도록 이름+단계로 고정한 난수. 단계가 높을수록 Coco가 빨라 S를 덜 모아요.
const SAMPLE = {
  1: { s: [.05, .15, .25, .55], rt: [1.1, 2.4] },
  2: { s: [.07, .18, .30, .45], rt: [0.9, 2.0] },
  3: { s: [.10, .23, .32, .35], rt: [0.8, 1.7] },
};
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
function classmates(level) {
  const S = SAMPLE[level] || SAMPLE[1];
  const out = NAMES.map((name, i) => {
    const r = seeded(name + level);
    let u = r(), s = 0;
    while (s < 3 && u > S.s[s]) { u -= S.s[s]; s++; }
    return { name, tone: TONES[i % TONES.length], s, rt: Math.round((S.rt[0] + r() * (S.rt[1] - S.rt[0])) * 10) / 10 };
  });
  // 예시끼리 같은 기록(같은 등수)이 나오지 않게 빠르기를 0.1초씩 비켜 줌
  out.forEach((a, i) => { while (out.some((b, j) => j < i && b.s === a.s && b.rt === a.rt)) a.rt = Math.round((a.rt + .1) * 10) / 10; });
  return out;
}
const rtKey = r => r.rt ?? 99;
const better = (a, b) => a.s !== b.s ? a.s > b.s : rtKey(a) < rtKey(b);
const sTokens = (n, cls = 'mt', src = '') => [0, 1, 2].map(i => `<i class="${cls}${i < n ? ' got' : ''}" style="--d:${i * 120 + 300}ms">${src && i < n ? `<img src="${src}" alt="S">` : 'S'}</i>`).join('');

window.renderResult = function renderResult({ win, me, coco, stats, level, levelName }) {
  // ── 왼쪽: 승패 ──
  $('#vKicker').textContent = `게임 끝 · ${levelName}`;
  $('#vMe').innerHTML = sTokens(me, 'mt', './assets/card/my_s.png');
  $('#vCoco').innerHTML = sTokens(coco, 'mt', './assets/card/coco_s.png');
  $('#vSideMe').classList.toggle('won', win);
  $('#vSideCoco').classList.toggle('won', !win);
  const avg = stats.rt.length ? Math.round(stats.rt.reduce((a, b) => a + b, 0) / stats.rt.length / 100) / 10 : null;
  $('#vHits').innerHTML = `<b>${stats.hits}</b>번`;
  $('#vRt').innerHTML = avg == null ? '<b>-</b>' : `<b>${avg.toFixed(1)}</b>초`;
  $('#vMiss').innerHTML = `<b>${stats.miss}</b>번`;

  // ── 오른쪽: 우리 반 순위 ──
  const mine = { name: 'Me', me: true, s: me, rt: avg };
  const list = [...classmates(level), mine].sort((a, b) => b.s - a.s || rtKey(a) - rtKey(b));
  const rankOf = r => 1 + list.filter(o => o !== r && better(o, r)).length;
  $('#vRank').textContent = rankOf(mine);
  $('#vOf').textContent = `/ ${list.length}명`;

  const row = (r, i) => {
    const k = rankOf(r);
    return `<li class="rk${r.me ? ' me' : ''}" style="--i:${i}">
      <span class="rk-no${k <= 3 ? ' m' + k : ''}">${k}</span>
      <span class="av" style="--av:${r.me ? 'var(--p1)' : r.tone}">${r.me ? 'Me' : r.name[0]}</span>
      <span class="rk-name">${r.name}</span>
      <span class="rk-s" aria-label="S ${r.s}개">${sTokens(r.s, 'ms', r.me ? './assets/card/my_s.png' : '')}</span>
      <span class="rk-rt">${r.rt == null ? '<b>-</b>' : `<b>${r.rt.toFixed(1)}</b>초`}</span></li>`;
  };
  const SHOW = 6;
  const top = list.slice(0, SHOW);
  const meIn = top.includes(mine);
  $('#vList').innerHTML = top.map(row).join('') +
    (meIn ? '' : `<li class="rk gap" aria-hidden="true" style="--i:${SHOW}">···</li>` + row(mine, SHOW + 1));
};
})();

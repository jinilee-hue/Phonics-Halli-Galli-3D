/* Ring Ding Dong 3D → the shared progress record (phonics-kit phonics-progress.js, launcher fix F1: one record per game in
 * localStorage 'phonics.progress', for the launcher). Records only — nothing on screen changes; the result screen keeps its
 * Class Ranking (user 2026-11-22: "링딩동은 그냥 Class Ranking으로 가는게 좋겠어").
 * Saved at the END of a game (main.js end()), not when the result shows, so a game counts even if the player leaves first.
 * main.js globals (P, ME, CPU, stats, level) are read at call time; end is wrapped once every script has run (tutor.js
 * wraps it too). Fields: stars = my S, won, coco = Coco's S, hits, misses, level, avgTime (s, lower is better),
 * speed = the game level played (Coco's speed 1–6, gl/speed.js; higher is better). */
(() => {
  'use strict';
  addEventListener('DOMContentLoaded', () => {
    const end0 = window.end;
    if (typeof end0 !== 'function' || end0.rddProgress) return;
    const wrapped = function (w) {
      try {
        /* global P, ME, CPU, stats, level */
        const st = (typeof stats !== 'undefined' && stats) || {}, rt = st.rt || [];
        const game = { stars: P[ME].score | 0, won: w === ME, coco: P[CPU].score | 0, hits: st.hits | 0, misses: st.miss | 0,
          level: (typeof level !== 'undefined' && level) || 1 };
        if (rt.length) game.avgTime = Math.round(rt.reduce((a, b) => a + b, 0) / rt.length / 100) / 10;   // same as src/result.js
        if (window.HGSpeed && window.HGSpeed.playing) game.speed = window.HGSpeed.playing;
        if (window.PhonicsProgress) window.PhonicsProgress.played('ring-ding-dong', game, { higher: ['speed'] });
      } catch (e) { console.warn('[progress] ring-ding-dong', e); }
      // MY BELLS (gl/bells.js): 아이가 모은 S를 이 기기에 모아 둬요 — 게임마다 내 S를 더함 (모은 S로 종 색을 열어요)
      try {
        const add = P[ME].score | 0;
        if (add > 0) localStorage.setItem('hg-s-total', String((parseInt(localStorage.getItem('hg-s-total'), 10) || 0) + add));
        if (window.HGBells) window.HGBells.refresh();
      } catch (e) { /* private mode */ }
      return end0.apply(this, arguments);
    };
    wrapped.rddProgress = true;
    window.end = wrapped;
  });
})();

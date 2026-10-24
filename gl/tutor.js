// 노란 종 튜터 (3D 폴더에만) — 게임을 이끄는 진행자 겸 선생님
// 사용자와 정한 것: 짧은 영어 · 낱말 목소리(Ana · 여자아이)와 다른 밝은 진행자 목소리(Ava) · 3D 폴더에만
//  · 낱말 소리를 가리지 않기 (정책 C-05): 종은 낱말 읽기가 끝나고 비는 틈에만 말하고, 낱말이 시작되면 바로 멈춰요
//  · 글자보다 몸짓: 바라보기 · 끄덕 · 도리도리 · 콩콩 · 반짝 + 짧은 말풍선
//  · 한 번에 한 명만: 종이 말할 땐 Coco 말풍선은 쉬고, 아이가 종을 치거나 카드를 넘기면 종은 바로 멈춰요
//  · 진행: 종이 말하는 동안은 Coco가 기다려요 (Coco 반응 · 카드 넘기기를 잠시 멈췄다가 이어서)
//  · 잘하면 물러나기: 처음 몇 장은 자세히(안내) → 반응만(가볍게) → 3번 연속 맞히면 말없이 끄덕(조용히) · 2번 연속 틀리면 다시 안내
// 원래 게임 코드(src/main.js)는 고치지 않고, 그 함수들(flip · hitBell · end · reset …)을 감싸서 끼어들어요.
// 끄기: 주소 뒤에 ?tutor=off · 말소리: gl/tutor-voice.js (tools/build_tutor_voice.py)
(() => {
  if (new URLSearchParams(location.search).get('tutor') === 'off') return;
  const VOICE = window.TUTOR_VOICE;
  if (!VOICE || typeof window.flip !== 'function' || typeof window.hitBell !== 'function') return;
  const appEl = document.getElementById('app'), bellEl = document.getElementById('bell');
  const now = () => performance.now();
  const onGame = () => appEl.dataset.screen === 'game';
  const has3D = () => !!(window.Bell3D && appEl.classList.contains('bell3d-on'));
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const trace = [];                                         // 확인용 기록 [시각, 무엇, 내용]
  const note = (k, v) => { trace.push([Math.round(now()), k, v]); if (trace.length > 800) trace.shift(); };

  // ── 얼마나 도와줄지
  const session = { games: 0 };
  const fresh = () => ({ cards: 0, guidedP: 0, guidedS: 0, streak: 0, errRun: 0, boost: 0, said: {}, listenS: 0, missed: 0, praise: 0 });
  let G = fresh();
  function phase() {
    if (G.boost > 0) return 'guide';                                                        // 2번 연속 틀리면 다시 안내
    if (session.games === 0 && (G.guidedP < 2 || G.guidedS < 1) && G.cards < 6) return 'guide';   // 첫 판 처음 몇 장
    if (G.streak >= 3) return 'quiet';                                                      // 3번 연속 맞히면 말없이
    return 'light';
  }
  const checkBoost = () => { if (G.errRun >= 2) { G.boost = 2; G.errRun = 0; G.streak = 0; note('boost', 2); } };

  // ── 말소리 (main.js의 소리 장치 · 소리 크기를 함께 써요)
  const bufs = new Map();
  const audio = () => { try { return ctx(); } catch (e) { return null; } };
  function bufFor(id) {
    if (bufs.has(id)) return bufs.get(id);
    const line = VOICE.lines[id], c = audio();
    const p = !line || !c ? Promise.resolve(null) : new Promise(res => {
      const bin = atob(line.b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const q = c.decodeAudioData(bytes.buffer, res, () => res(null));
      if (q && q.then) q.then(res, () => res(null));
    });
    bufs.set(id, p);
    return p;
  }
  const preload = () => Object.keys(VOICE.lines).forEach(bufFor);
  const duck = on => { try { window.BGM && BGM.duck(on); } catch (e) {} };

  // ── 낱말 목소리(Ana)가 말하는 동안은 종은 기다려요
  //    낱말이 '곧 나올' 때(카드를 뒤집음 · 종을 친 뒤 다시 읽기)는 시간으로 어림하지 않고 실제 순서를 따라가요:
  //    ① 낱말을 읽으라는 요청(speak)이 올 때까지 → ② 소리가 실제로 시작될 때까지 → ③ 끝나고 0.22초 쉼
  //    (느린 기기에선 다시 읽기가 2초 가까이 늦게 시작돼서, 정해 둔 시간만 기다리면 종 말과 부딪혔어요)
  let anaOn = false, anaAt = 0, anaWant = 0, anaSoon = 0, anaEnd = 0;
  const talking0 = window.talking;
  window.talking = function (on) {
    anaOn = !!on;
    if (on) { anaAt = now(); anaSoon = 0; anaWant = 0; stopLine('word'); } else anaEnd = now();
    note('ana', on ? 'on' : 'off');
    const r = talking0.apply(this, arguments);
    if (!on && speaking) duck(true);
    return r;
  };
  const anaBusy = () => (anaOn && now() - anaAt < 3500) || (anaWant && now() - anaWant < 4000) || now() < anaSoon || now() - anaEnd < 220;
  const speak0 = window.speak;
  window.speak = function () { anaWant = 0; if (!muted) anaSoon = now() + 1500; return speak0.apply(this, arguments); };
  const repeat0 = window.repeatWord;
  window.repeatWord = function () { anaWant = now(); return repeat0.apply(this, arguments); };

  // ── 말하기: 한 줄씩 차례로
  let speaking = null, pumpT = 0, lineEnd = 0;
  const queue = [];
  function sayLine(id, o = {}) {
    if (!VOICE.lines[id]) return null;
    const item = Object.assign({ id, at: now(), maxWait: 3200, mouth: 'happy', eyes: '' }, o);
    if (o.front) queue.unshift(item); else queue.push(item);
    note('queue', id);
    pump();
    return item;
  }
  function pump() {
    clearTimeout(pumpT);
    if (speaking || !queue.length) return;
    // 낱말을 읽는 동안 기다린 시간은 '너무 늦은 말' 셈에 넣지 않아요 — 느린 기기에서 다시 읽기가 늦게 끝나도
    // 칭찬 · 안내가 버려지지 않게 (낱말이 끝난 뒤 최소 1.5초는 말할 수 있음)
    if (anaBusy()) { const t = now(); queue.forEach(it => { it.at = Math.max(it.at, t - Math.max(0, it.maxWait - 1500)); }); pumpT = setTimeout(pump, 70); return; }
    const item = queue.shift();
    if (now() - item.at > item.maxWait || (item.valid && !item.valid()) || !onGame()) {
      note('drop', item.id); item.cancel && item.cancel('stale'); pump(); return;
    }
    const sp = speaking = { id: item.id, item, src: null, timers: [], t0: 0 };
    const go = buf => { if (speaking === sp) begin(sp, buf); };
    if (muted) go(null); else bufFor(item.id).then(go);
  }
  function begin(sp, buf) {
    const item = sp.item, line = VOICE.lines[item.id];
    sp.t0 = now();
    note('say', item.id);
    if (!item.keepCoco) hideCocoBubbles();
    bubble(line.text);
    if (item.act) gesture(item.act);
    if (item.gaze) look(item.gaze, line.dur * 1000 + 700);
    if (item.glow) glowOn(true);
    if (item.onStart) item.onStart();
    duck(true);
    mouthRun(sp, line, item.mouth, item.eyes);
    if (buf && !muted) {
      const c = audio();
      if (c) {
        if (c.state === 'suspended') c.resume();
        const src = c.createBufferSource(), g = c.createGain();
        src.buffer = buf; g.gain.value = gainOf(volume) * line.gain;
        src.connect(g); g.connect(c.destination);
        src.start(0, Math.min(line.start, buf.duration));
        sp.src = src;
      }
    }
    sp.timers.push(setTimeout(() => finish(sp, false), line.dur * 1000 + 80));
  }
  function finish(sp, cut) {
    if (speaking !== sp) return;
    speaking = null;
    sp.timers.forEach(clearTimeout);
    if (sp.src) { try { sp.src.stop(); } catch (e) {} }
    mouthStop();
    bubbleHide(cut);
    if (sp.item.glow && !calling) glowOn(false);
    if (!anaOn) duck(false);
    lineEnd = now();
    note(cut ? 'cut' : 'end', sp.id);
    if (cut) sp.item.cancel && sp.item.cancel('cut'); else sp.item.done && sp.item.done();
    // 끊긴 경우엔 다음 말을 한 박자 뒤에: 끊은 그 순간 게임이 하는 일(Coco 말풍선 · 낱말 읽기 예약)이 먼저 자리 잡게
    if (cut) { clearTimeout(pumpT); pumpT = setTimeout(pump, 0); } else pump();
  }
  function stopLine(why) {
    if (speaking) { note('stop', why); finish(speaking, true); }
  }
  function clearQueue(pred) {
    for (let k = queue.length - 1; k >= 0; k--) {
      const it = queue[k];
      if (pred && !pred(it)) continue;
      queue.splice(k, 1);
      note('drop', it.id);
      it.cancel && it.cancel('clear');
    }
  }

  // ── 입 움직이기: 말소리 세기를 미리 재 둔 칸(60ms)대로 벌렸다 다물었다
  let mouthT = 0;
  function mouthRun(sp, line, open, eyes) {
    const ms = VOICE.info.mouthMs || 60, m = line.mouth || '';
    let k = 0, last = null;
    const step = () => {
      if (speaking !== sp) return;
      const ch = m[k++];
      const want = ch === '1' ? open : '';
      if (want !== last && window.BellFace) { BellFace.pose(eyes, want, 420); last = want; }   // 말이 끊겨도 0.42초 뒤 원래 얼굴
      if (ch != null) mouthT = setTimeout(step, ms);
    };
    step();
  }
  function mouthStop() { clearTimeout(mouthT); if (window.BellFace) BellFace.pose('', '', 1); }

  // ── 몸짓 · 바라보기 · 반짝
  function gesture(kind) {
    if (RM.matches) return;
    if (has3D()) { Bell3D.act(kind); return; }
    const K = {                                                // 3D가 꺼졌을 때(HTML 종)
      nod: [{ rotate: '0deg' }, { rotate: '0deg', translate: '0 4%' }, { translate: '0 0' }, { translate: '0 4%' }, { translate: '0 0' }],
      shake: [{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '7deg' }, { rotate: '-5deg' }, { rotate: '4deg' }, { rotate: '0deg' }],
      wiggle: [{ rotate: '0deg' }, { rotate: '5deg' }, { rotate: '-5deg' }, { rotate: '0deg' }],
      hop: [{ translate: '0 0' }, { translate: '0 -10%' }, { translate: '0 0' }, { translate: '0 -7%' }, { translate: '0 0' }],
    }[kind];
    if (K && bellEl.animate) bellEl.animate(K, { duration: 760, easing: 'ease-in-out', composite: 'add' });
  }
  function look(where, ms) {
    if (!has3D()) return;
    const el = where === 'me' ? document.querySelector('#t0 .deck') : where === 'pile' ? document.getElementById('spot') : where === 'coco' ? document.getElementById('coco') : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    Bell3D.gaze(r.left + r.width / 2, r.top + r.height / 2, ms);
  }
  function glowOn(on) { if (has3D()) Bell3D.glow(on); }

  // ── 말풍선 (종 오른쪽 위) · 부르는 물결 · S 반짝
  const bub = document.createElement('div');
  bub.className = 'tutor-bubble';
  bub.setAttribute('aria-live', 'polite');
  bub.innerHTML = '<span></span>';
  appEl.appendChild(bub);
  const call = document.createElement('div');
  call.className = 'tutor-call';
  call.setAttribute('aria-hidden', 'true');
  call.innerHTML = '<i></i><i></i><i></i>';
  appEl.appendChild(call);
  function bellRect() {
    if (has3D()) { const r = Bell3D.screenRect(); if (r) return { left: r.x0, top: r.y0, right: r.x1, bottom: r.y1, width: r.x1 - r.x0, height: r.y1 - r.y0 }; }
    return bellEl.getBoundingClientRect();
  }
  // 말풍선 자리: 종 몸통 오른쪽 위 (꼬리가 종 쪽) — 위 시계 · 버튼 밑, 내 칸 위의 빈 판
  //   HTML 종 자리로 정해요(3D 종이 서 있는 자리와 같음). 3D 상자는 젖힌 만큼 커서 말풍선이 너무 멀리 떴어요
  function placeBubble() {
    const r = bellEl.getBoundingClientRect();
    if (!r.width) return;
    const vh = innerHeight / 100, hud = document.querySelector('.hud-time');
    const minTop = hud ? hud.getBoundingClientRect().bottom + 1.2 * vh : 2 * vh;
    bub.style.left = Math.max(2 * vh, Math.min(innerWidth - bub.offsetWidth - 2 * vh, r.right - r.width * .1)) + 'px';
    bub.style.top = Math.max(minTop, r.top + r.height * .14) + 'px';
  }
  function placeCall() {
    const r = bellRect();
    if (!r || !r.width) return;
    call.style.left = (r.left + r.width / 2) + 'px';
    call.style.top = (r.top + r.height * .45) + 'px';
    call.style.setProperty('--s', (r.width * 1.05) + 'px');
  }
  let bubT = 0;
  function bubble(text) {
    clearTimeout(bubT);
    bub.querySelector('span').textContent = text;
    bub.classList.remove('show', 'out');
    placeBubble();
    void bub.offsetWidth;
    bub.classList.add('show');
  }
  function bubbleHide(now_) {
    clearTimeout(bubT);
    bubT = setTimeout(() => { bub.classList.add('out'); bubT = setTimeout(() => bub.classList.remove('show', 'out'), 260); }, now_ ? 0 : 650);
  }
  let calling = false;
  function callOn(on) {
    calling = !!on && !RM.matches;
    if (calling) placeCall();
    call.classList.toggle('on', calling);
    glowOn(!!on);
  }
  function popS() {
    if (RM.matches) return;
    const s = document.getElementById('spot').getBoundingClientRect();
    const el = document.createElement('img');
    el.className = 'tutor-s'; el.alt = ''; el.src = './assets/card/my_s.png';
    el.style.left = (s.left + s.width / 2) + 'px'; el.style.top = (s.top + s.height * .08) + 'px';
    appEl.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
  function hideCocoBubbles() { document.querySelectorAll('#bubbleL.show, #bubbleR.show').forEach(b => b.classList.remove('show')); }

  // ── Coco 기다리게 하기: 종이 안내 · 칭찬하는 동안은 Coco 반응 · 카드 넘기기를 멈췄다가 이어서
  let holdN = 0, holdAt = 0, pendReact = null, pendFlip = null;
  const cpuReact0 = window.cpuReact, cpuFlipIn0 = window.cpuFlipIn;
  window.cpuReact = function (card) { if (holdN > 0) { pendReact = card; return; } return cpuReact0.apply(this, arguments); };
  window.cpuFlipIn = function (ms) { if (holdN > 0) { pendFlip = ms; return; } return cpuFlipIn0.apply(this, arguments); };
  function hold(why) {
    note('hold', why);
    if (holdN++ > 0) return;
    holdAt = now();
    pendReact = cur && !cur.done && !over ? cur : null;
    pendFlip = turn === CPU && !over ? Math.max(0, cpuFlipAt - now()) : null;
    clearTimers();
  }
  function release(why) {
    if (holdN === 0) return;
    note('release', why);
    if (--holdN > 0) return;
    const card = pendReact, wait = pendFlip;
    pendReact = pendFlip = null;
    if (over || !onGame()) return;
    clearTimers();
    if (card && card === cur && !card.done) cpuReact0(card);
    if (turn === CPU) cpuFlipIn0(Math.max(1400, wait || 0));
  }
  function dropHold() { holdN = 0; pendReact = pendFlip = null; }

  // ── 처음 몇 장: 카드마다 자세히
  let guiding = null, hintT = 0;
  function guide(card) {
    guiding = { card, prompts: 0, timers: [] };
    hold('guide');
    const valid = () => !!guiding && guiding.card === card && cur === card && !card.done && !over && onGame();
    if (card.p) { G.guidedP++; prompt(card, valid); }
    else {
      G.guidedS++;
      sayLine('dontRing', { act: 'shake', gaze: 'pile', valid, maxWait: 5000, kind: 'guide',
        done: () => { if (guiding && guiding.card === card) guiding.timers.push(setTimeout(() => endGuide('single'), 450)); },
        cancel: why => { if (guiding && guiding.card === card) endGuide('single-' + why); } });   // 못 말했으면 바로 끝 (Coco가 멈춘 채로 남지 않게)
    }
  }
  function prompt(card, valid) {
    guiding.prompts++;
    // 다음 단계: 4초 기다렸다가 한 번 더 알려 주고, 두 번 알려 줘도 안 치면 Coco 차례로 (안내를 끝내고 Coco를 풀어 줌)
    // 말을 못 하고 버려지거나(줄이 밀림) 끊겨도 꼭 다음 단계로 — 안 그러면 Coco가 멈춘 채로 남아요
    const next = ms => { if (valid()) guiding.timers.push(setTimeout(() => { if (valid()) { if (guiding.prompts < 2) prompt(card, valid); else endGuide('timeout'); } }, ms)); };
    sayLine('ring', { act: 'hop', gaze: 'pile', valid, maxWait: 5000, kind: 'guide',
      onStart: () => { callOn(true); popS(); },
      done: () => next(4000), cancel: () => next(2500) });
  }
  function endGuide(why) {
    if (!guiding) return;
    guiding.timers.forEach(clearTimeout);
    guiding = null;
    callOn(false);
    note('guide-end', why);
    release('guide');
  }

  // ── 게임 함수 감싸기
  const flip0 = window.flip;
  window.flip = function (i) {
    if (!onGame() || over) return flip0.apply(this, arguments);
    const prev = cur;
    // 여럿 카드를 안내하는 중인데 종 대신 카드를 넘기려 하면: 막고 "Wait! Ring the bell first!"
    if (i === ME && i === turn && guiding && guiding.card === prev && prev && prev.p && !prev.done) {
      if (!guiding.waited) { guiding.waited = true; stopLine('wait'); sayLine('waitRing', { act: 'hop', gaze: 'pile', front: true, maxWait: 1500 }); }
      else if (!speaking) { gesture('hop'); callOn(true); }          // 두 번째부터는 말없이 콩콩 · 반짝 (같은 말 되풀이 안 함)
      note('block', 'flip');
      return;
    }
    // 아무도 안 친 여럿 카드: 다음 카드 전에 한마디 (안내 · 가벼운 단계 · 한 판에 2번까지)
    if (i === turn && prev && prev.p && !prev.done && !prev.tMissed && phase() !== 'quiet' && G.missed < 2) {
      prev.tMissed = true; G.missed++; G.streak = 0; G.errRun++; checkBoost();
      stopLine('missed'); clearQueue();
      hold('missed');
      sayLine('missed', { act: 'hop', gaze: 'pile', glow: true, mouth: 'o', maxWait: 4000,
        done: () => { release('missed'); flip(i); },
        cancel: () => release('missed') });
      return;
    }
    if (i === ME) lastAct = now();
    if (i === turn) { clearQueue(); stopLine('flip'); }       // 새 카드: 줄 서 있던 말은 지난 이야기
    const r = flip0.apply(this, arguments);
    if (cur && cur !== prev) onCard(cur, i);
    return r;
  };
  function onCard(card, who) {
    G.cards++;
    anaWant = now();                                         // 0.26초 뒤 낱말을 읽어요 — 소리가 시작될 때까지 종은 기다림
    endGuide('newcard');
    clearTimeout(hintT);
    const ph = phase();
    note('card', `${card.w}${card.p ? ' (여럿)' : ''} · ${who === ME ? 'me' : 'coco'} · ${ph}`);
    if (ph === 'guide') { if (G.boost > 0) G.boost--; guide(card); }
    else if (ph === 'light' && card.p) {                    // 가볍게: 머뭇거리면 말없이 콩콩 · 반짝
      hintT = setTimeout(() => {
        if (cur !== card || card.done || over || !onGame() || speaking) return;
        gesture('hop'); glowOn(true); setTimeout(() => { if (!calling) glowOn(false); }, 1400);
      }, 3600);
    }
  }

  const hit0 = window.hitBell;
  window.hitBell = function (who) {
    const card = cur, wasDone = !!(card && card.done), wrongN = card && card.wrong ? card.wrong.size : 0, lk = lockUntil, t = now();
    if (who === ME) lastAct = t;
    if (onGame() && !over && card) { clearQueue(it => it.kind === 'guide'); stopLine('hit'); }   // 종이 울리면 아직 못 한 안내는 버려요
    const r = hit0.apply(this, arguments);
    if (!onGame() || !card) return r;
    if (!wasDone && card.done) onRight(who, card);
    else if (!card.p && card.wrong.size > wrongN) onWrong(who, card);
    else if (wasDone && who === ME && card.tWinner === CPU && t < lk + 900 && t >= lk) onLate(card);
    return r;
  };
  const lineThenRelease = (id, why, o) => { hold(why); sayLine(id, Object.assign({ maxWait: 3500, done: () => release(why), cancel: () => release(why) }, o)); };
  function onRight(who, card) {
    card.tWinner = who;
    const guided = !!guiding && guiding.card === card;
    endGuide('rang');
    clearTimeout(hintT);
    if (over) return;                                       // 마지막 S면 end()에서 (이겼다 · 졌다)
    if (who === ME) {
      G.streak++; G.errRun = 0;
      if (phase() === 'quiet' && !guided) { gesture('nod'); note('quiet', 'nod'); return; }
      const id = P[ME].score === 2 && !G.said.oneMore ? (G.said.oneMore = 1, 'oneMore') : ['yes1', 'yes2', 'yes3', 'yes4'][G.praise++ % 4];
      lineThenRelease(id, 'praise', { act: 'nod', gaze: 'me', eyes: 'closed' });
    } else {
      G.streak = 0;
      let id = null;
      if (P[CPU].score === 2 && !G.said.careful) { G.said.careful = 1; id = 'careful'; }
      else if (phase() !== 'quiet' && G.listenS < 2) { G.listenS++; id = 'listenS'; }
      if (!id) { gesture('nod'); look('coco', 1200); return; }
      lineThenRelease(id, 'coco', { act: 'wiggle', gaze: 'coco' });
    }
  }
  function onWrong(who, card) {
    if (who === ME) {
      G.streak = 0; G.errRun++; checkBoost();
      if (guiding && guiding.card === card) endGuide('wrong');
      lineThenRelease('oops', 'oops', { act: 'shake', gaze: 'pile', mouth: 'o' });
    } else if (!G.said.cocoOops) {
      G.said.cocoOops = 1;
      lineThenRelease('cocoOops', 'cocoOops', { act: 'shake', gaze: 'coco', mouth: 'o' });
    } else { gesture('shake'); look('coco', 1000); }
  }
  function onLate() {
    if (now() - (G.said.lateAt || -1e9) < 6000) return;
    G.said.lateAt = now();
    lineThenRelease('cocoFirst', 'late', { act: 'wiggle', gaze: 'coco' });
  }

  function stopAll(why) {
    stopLine(why); clearQueue();
    if (guiding) { guiding.timers.forEach(clearTimeout); guiding = null; }
    callOn(false); dropHold();
    clearTimeout(hintT); clearTimeout(openT);
  }
  const end0 = window.end;
  window.end = function (w) {
    stopAll('end');
    const r = end0.apply(this, arguments);
    session.games++;
    const win = w === ME;
    // 이겼다 · 졌다: Coco 말풍선은 그대로 두고, 다시 읽어 주는 낱말이 끝나면
    sayLine(win ? 'win' : 'lose', { act: win ? 'hop' : 'nod', gaze: 'me', eyes: win ? 'closed' : '', keepCoco: true, maxWait: 4000 });
    return r;
  };
  const reset0 = window.reset;
  window.reset = function () { stopAll('reset'); G = fresh(); turnSeen = -1; return reset0.apply(this, arguments); };
  // 한국어 안내 글('한 개면 치지 마!' · '코코가 먼저!')은 종의 말 · 몸짓으로 바꿔요
  window.say = function (text) { note('callout', text); };
  // 종이 말하는 동안 Coco 말풍선은 쉬어요
  const cocoSay0 = window.cocoSay;
  window.cocoSay = function (text) {
    if (speaking && !speaking.item.keepCoco) { note('coco-skip', text); return; }
    return cocoSay0.apply(this, arguments);
  };

  // ── 시작: "Ready? Go!" (Coco 인사 뒤) · 다시 하기
  let openT = 0;
  function opening(ms) {
    clearTimeout(openT);
    openT = setTimeout(() => {
      if (!onGame() || over || G.cards > 0) return;
      sayLine('ready', { act: 'hop', eyes: 'closed', keepCoco: true, maxWait: 2500 });
    }, ms);
  }
  document.getElementById('start').addEventListener('click', () => { preload(); opening(2900); });
  document.getElementById('again').addEventListener('click', () => opening(900));

  // ── 내 차례인데 머뭇거리면 "Your turn!" (내 카드 더미를 바라보며) · 늘 지켜보기
  let turnSeen = -1, turnAt = 0, turnPrompts = 0, lastAct = 0;
  setInterval(() => {
    if (speaking) placeBubble();
    if (calling) placeCall();
    if (!onGame() || over) return;
    if (holdN > 0 && now() - holdAt > 15000) { note('watchdog', holdN); holdN = 1; release('watchdog'); }   // 혹시 멈춘 채로 남지 않게
    if (turn !== turnSeen) { turnSeen = turn; turnAt = now(); turnPrompts = 0; }
    if (turn !== ME || speaking || queue.length || guiding || holdN > 0 || anaBusy()) return;
    if (cur && cur.p && !cur.done) return;                  // 여럿 카드가 떠 있으면 카드 대신 종을 쳐야 하니 기다림
    const wait = { guide: 4500, light: 7000, quiet: 11000 }[phase()];
    const since = Math.max(turnAt, lastAct, lineEnd);
    if (turnPrompts < 2 && now() - since > wait) {
      turnPrompts++;
      sayLine('yourTurn', { act: 'wiggle', gaze: 'me' });
    }
  }, 250);

  window.Tutor = { trace, session, get state() { return { phase: phase(), G: Object.assign({}, G), session: Object.assign({}, session), speaking: speaking && speaking.id,
    queue: queue.map(q => q.id), holdN, guiding: !!guiding, calling, anaBusy: anaBusy() }; }, sayLine, stopLine, phase };
})();

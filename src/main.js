// 원본: original/20261021_1116_Phonics Halli Galli — Coco.html 의 <script>
// words.js · intro.js · result.js 가 먼저 읽혀서 window.WORDS / playIntro / renderResult 를 줍니다.
// (모듈 import를 쓰지 않아 파일을 더블클릭해 열어도 돌아가요)
const { WORDS, playIntro, renderResult } = window;

// ── 카드 단어: 연구팩(필수 문법 27 v0.26)의 교재 출현 낱말 ──
// src/words.js 는 tools/build_words.py 가 만듭니다. 판마다 새로 뽑아 덱을 만들어요.
const oneKo = w => w.ko && `${w.ko} 한 ${w.unit}`;
const manyKo = w => w.ko && `${w.ko} 여러 ${w.unit}`;
const pickN = (a, n) => shuffle(a).slice(0, n);
const uniq = cards => [...new Map(cards.map(c => [c[0], c])).values()];
// 1단계: 5세 교재(SAD K·FPR K) 낱말 한 장씩, 10장 중 4장꼴로 여럿(-s)
function level1Cards(){
  const ws = shuffle(WORDS.level1.words), nPl = Math.round(ws.length * .4);
  return ws.map((w, i) => i < nPl ? [w.plural, 1, manyKo(w)] : [w.base, 0, oneKo(w)]);
}
// 2단계: 6세 교재(SAD A·FPR A) 낱말 10개를 짝(cat / cats)으로
function level2Cards(){
  return pickN(WORDS.level2.words, 10).flatMap(w => [[w.base, 0, oneKo(w)], [w.plural, 1, manyKo(w)]]);
}
// 3단계: 7세 교재(SAD B·FPR B) -es 짝 5개 + s로 끝나는 단수 함정 4개 + 그냥 -s 6개
function level3Cards(){
  const L3 = WORDS.level3;
  const es = pickN(L3.es, 5).flatMap(w => [[w.base, 0], [w.plural, 1]]);
  const traps = pickN(L3.traps, 4).flatMap(t => t.plural ? [[t.w, 0], [t.plural, 1]] : [[t.w, 0]]);
  const reg = pickN(L3.regular, 6).map((w, i) => i < 3 ? [w.plural, 1] : [w.base, 0]);
  return uniq([...es, ...traps, ...reg]);
}
// 3단계 낱말 수: -es 짝 · 함정 · 그냥 -s 를 합치되 겹치는 낱말(dress는 -es 짝이면서 함정)은 한 번만
const L3_COUNT = new Set([...WORDS.level3.es.map(w => w.base), ...WORDS.level3.traps.map(t => t.w), ...WORDS.level3.regular.map(w => w.base)]).size;

// 단계별 단어 덱
const LEVELS = {
  1:{ name:'1단계 · 5세', book:'K', desc:`-s 복수형 · 그림 보기 · Coco 느림 · 교재 낱말 ${WORDS.level1.words.length}개`, pic:true,
      cpu:{ react:[1800,2400], miss:.25, slip:.08, flip:3200 },   // flip: 내가 카드를 뒤집은 뒤 Coco가 자기 카드를 뒤집기까지 (반응 최대 3.02초보다 길게)
      get words(){ return level1Cards(); } },
  2:{ name:'2단계 · 6세', book:'A', desc:`같은 단어 짝 (cat / cats) · 그림 보기 · Coco 보통 · 교재 낱말 ${WORDS.level2.words.length}개`, pic:true,
      cpu:{ react:[1150,1550], miss:.12, slip:.06, flip:2200 },
      get words(){ return level2Cards(); } },
  3:{ name:'3단계 · 7세', book:'B', desc:`-es 복수형 + s로 끝나는 단수 함정 · 그림 없이 · Coco 빠름 · 교재 낱말 ${L3_COUNT}개`, pic:false,
      cpu:{ react:[750,1050], miss:.05, slip:.04, flip:1900 },
      get words(){ return level3Cards(); } }
};
const TINTS = ['var(--c-blue)','var(--c-green)','var(--c-cream)','var(--c-pink)'];
const ME=0, CPU=1;
const $ = s => document.querySelector(s);
const app=$('#app'), bell=$('#bell'), spot=$('#spot'), coco=$('#coco');
const P=[0,1].map(i=>({ tray:$('#t'+i), slots:[...$('#s'+i).querySelectorAll('.slot')],
  deck:$('#t'+i).querySelector('.deck'), minus:$('#s'+i).querySelector('.minus'), score:0 }));
let level=1, deck, turn, cur, over, lockUntil, timers=[], moodTimer;
// 결과 화면용 내 기록: 맞힌 종, 카드가 나온 뒤 맞게 친 시간(ms), 실수
const stats = { hits:0, rt:[], miss:0 };

const L=()=>LEVELS[level];
const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
// Coco 차례 카드 뒤집기 예약. 누가 종을 맞게 친 뒤에는 카드가 칸으로 날아가고 낱말을 다시 읽을 동안 기다렸다가 뒤집음
const AFTER_HIT = 1500;
let cpuFlipAt = 0;
function cpuFlipIn(ms){ cpuFlipAt = performance.now() + ms; later(()=>flip(CPU), ms); }
const rand=([a,b])=>a+Math.random()*(b-a);
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
const newDeck=()=>shuffle(L().words.map(([w,p,a])=>({w,p:!!p,a})));

// Coco 표정과 말풍선
function mood(m, ms){ clearTimeout(moodTimer); coco.dataset.mood=m; if(ms) moodTimer=setTimeout(()=>{ if(!over) coco.dataset.mood='idle'; }, ms); }
function cocoSay(text, side){
  const b = $(side === 'left' ? '#bubbleL' : '#bubbleR');
  b.querySelector('span').textContent = text;
  const r = coco.getBoundingClientRect();
  const img = b.querySelector('.cloud');
  const w = b.offsetWidth, h = b.offsetHeight;
  const iw = img.offsetWidth, ih = img.offsetHeight;
  const shift = side === 'left' ? .54 : .49;
  const hang = Math.max(0, shift * ih - h / 2);
  const sidePad = Math.max(0, (iw - w) / 2);
  const bleed = innerHeight * .02;
  const felt = document.querySelector('.felt').getBoundingClientRect();
  const minTop = felt.top + innerHeight * .015 + hang;
  let left, top;
  if(side === 'left'){ left = r.left - w + 8; top = r.top - h * .15; }
  else { left = r.right - 8; top = r.top - h * .2; }
  left = Math.max(bleed + sidePad, Math.min(left, innerWidth - w - bleed - sidePad));
  top = Math.max(minTop, Math.min(top, innerHeight - h - bleed));
  b.style.left = left + 'px'; b.style.top = top + 'px';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function lean(){ coco.classList.remove('lean'); void coco.offsetWidth; coco.classList.add('lean'); }

function reset(){
  clearTimers(); deck=newDeck(); cur=null; over=false; lockUntil=0;
  stats.hits=0; stats.rt=[]; stats.miss=0;
  P.forEach(p=>{ p.score=0; p.slots.forEach(s=>s.className='slot'); });
  spot.querySelectorAll('.card').forEach(c=>c.remove()); spot.querySelector('.hint').style.display='';
  $('#verdict').classList.remove('show'); $('#replay').disabled=true; $('#lvPill').textContent=`${L().name} · ${L().book}`;   // 교재 등급까지 (5세 = K 교재)
  mood('idle'); setTurn(ME); resetClock();
}
// 게임 진행 시간. 판이 시작되면 0:00부터 흐르고, 끝나면 그 시간에 멈춘다.
let clockRAF = 0, clockFrom = 0, clockHold = null;
function paintClock(){
  const el = $('#hudTimeNum'); if(!el) return;
  const ms = clockHold != null ? clockHold : (clockFrom ? performance.now() - clockFrom : 0);
  const sec = Math.min(35999, Math.floor(ms / 1000));
  const text = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  if (el.textContent === text) return;
  // 숫자마다 같은 폭 칸에 넣어서, 시간이 바뀌어도 알약 크기가 그대로 (Fredoka는 1이 좁고 2가 넓은 등 숫자 폭이 제각각)
  el.innerHTML = [...text].map(c => c === ':' ? '<i class="sep">:</i>' : '<i>' + c + '</i>').join('');
  el.dataset.n = String(text.length - 1);   // 숫자 개수 — 10분이 넘으면 칸을 조금 작게 해서 같은 폭에 맞춤 (upgrade.css)
}
function tickClock(){ paintClock(); if (clockFrom && clockHold == null) clockRAF = requestAnimationFrame(tickClock); }
function startClock(){ clockHold = null; clockFrom = performance.now(); cancelAnimationFrame(clockRAF); tickClock(); }
function holdClock(){ if (clockFrom && clockHold == null) clockHold = performance.now() - clockFrom; cancelAnimationFrame(clockRAF); paintClock(); }
function resetClock(){ clockFrom = 0; clockHold = null; cancelAnimationFrame(clockRAF); paintClock(); }
function setTurn(t){ turn=t; P.forEach((p,i)=>p.tray.classList.toggle('turn', i===t && !over && app.dataset.screen==='game'));
  // 내 차례 가이드: '내 차례' 글자 대신 손 모양이 내 카드를 톡톡
  app.classList.toggle('my-turn', t===ME && !over && app.dataset.screen==='game'); }
function say(text){ const c=$('#callout'); c.textContent=text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show'); }

// 소리 크기 (오른쪽 위 스피커 → 세로 막대) — 효과음 · 단어 읽어주기 · 배경음악 모두. 0이면 소리 끔. 기기에 기억해 둠
let volume = 1;
try{ const v = parseFloat(localStorage.getItem('hg-volume')); if(isFinite(v)) volume = Math.min(1, Math.max(0, v)); }catch(e){}
let muted = volume === 0;
const gainOf = v => v * v;     // 귀에 고르게 들리도록 (막대 절반 = 1/4 세기)
let ac; const ctx=()=> ac = ac || new (window.AudioContext||window.webkitAudioContext)();
function tone(fs,d,type='sine',g0=.22){ if(muted) return; try{ const c=ctx(), g=c.createGain(); g.gain.setValueAtTime(Math.max(.0011, g0*gainOf(volume)),c.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d); g.connect(c.destination);
  fs.forEach(f=>{ const o=c.createOscillator(); o.type=type; o.frequency.value=f; o.connect(g); o.start(); o.stop(c.currentTime+d); }); }catch(e){} }
const ding=()=>tone([1760,2640,3520],1.1), buzz=()=>tone([170,182],.35,'triangle',.2);
// ── 단어 읽어주기: 미리 만든 아이 목소리 소리 파일 (Microsoft 신경망 음성 'Ana' · 여자아이) ──
// 기기 내장 음성(speechSynthesis)은 기기마다 목소리가 달라서 쓰지 않아요 — 어느 기기에서나 같은 목소리.
// 소리: src/voice-data.js (window.VOICE_CLIPS = {낱말: mp3 base64}) — tools/build_voice.py가 만듦, 원본 assets/voice/*.mp3
// iOS/iPadOS는 첫 소리를 사용자 터치 안에서 시작해야 해서, START · 카드 누를 때 소리 장치를 깨워요(unlockSpeech).
const clipBuf = new Map(), clipWait = new Map();
let voiceSrc = null, speakSeq = 0;
function clipFor(w){
  const key = String(w).toLowerCase();
  if(clipBuf.has(key)) return Promise.resolve(clipBuf.get(key));
  if(clipWait.has(key)) return clipWait.get(key);
  const b64 = window.VOICE_CLIPS && window.VOICE_CLIPS[key];
  if(!b64){ console.warn('[읽어주기] 소리 파일 없음:', w); return Promise.resolve(null); }
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for(let i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const p = new Promise(res=>{   // 옛 Safari는 promise를 돌려주지 않아 콜백도 함께
      const q = ctx().decodeAudioData(bytes.buffer, res, ()=>res(null)); if(q && q.then) q.then(res, ()=>res(null)); })
    .then(buf=>{ clipWait.delete(key); if(buf) clipBuf.set(key, buf); return buf; });
  clipWait.set(key, p);
  return p;
}
// 지금 단계 낱말 소리를 미리 풀어 둠 (카드를 뒤집자마자 바로 들리게)
function levelWords(){ const l = WORDS['level'+level]; if(!l) return [];
  if(l.words) return l.words.flatMap(w=>[w.base, w.plural]);
  return [...l.es, ...l.regular].flatMap(w=>[w.base, w.plural]).concat(l.traps.flatMap(t=>t.plural ? [t.w, t.plural] : [t.w])); }
function unlockSpeech(){ try{ const c = ctx(); if(c.state === 'suspended') c.resume(); levelWords().forEach(clipFor); }catch(e){} }
function talking(on){ if(cur && cur.el) cur.el.classList.toggle('talking', on); window.BGM && BGM.duck(on); }   // 낱말을 읽는 동안 배경음악을 줄임
function stopVoice(){ speakSeq++; if(voiceSrc){ const s = voiceSrc; voiceSrc = null; s.onended = null; try{ s.stop(); }catch(e){} talking(false); } }
function speak(w){
  if(muted) return;
  stopVoice();
  const my = speakSeq;
  clipFor(w).then(buf=>{
    if(!buf || my !== speakSeq || muted) return;
    const c = ctx(); if(c.state === 'suspended') c.resume();
    const src = c.createBufferSource(), g = c.createGain();
    // 소리 파일은 받은 원본 그대로(다시 압축 안 함) — 시작 자리(말 0.12초 전) · 크기는 여기서 맞춤 (VOICE_TRIM · tools/build_voice.py)
    const t = (window.VOICE_TRIM && VOICE_TRIM[String(w).toLowerCase()]) || [0, 1];
    src.buffer = buf; g.gain.value = gainOf(volume) * t[1];
    src.connect(g); g.connect(c.destination);
    src.onended = ()=>{ if(voiceSrc === src){ voiceSrc = null; talking(false); } };
    voiceSrc = src; talking(true); src.start(0, Math.min(t[0], buf.duration));
  });
}

function flip(i){
  if(over || app.dataset.screen!=='game') return;
  const p=P[i];
  if(i!==turn){ p.deck.classList.remove('no'); void p.deck.offsetWidth; p.deck.classList.add('no'); return; }
  clearTimers();
  if(!deck.length) deck=newDeck();
  const c=deck.shift(); cur={...c, done:false, wrong:new Set(), t0:performance.now()};
  spot.querySelector('.hint').style.display='none';
  spot.querySelectorAll('.card').forEach((o,k,all)=>{ o.classList.remove('deal','right','wrong'); o.classList.add('old');
    if(!o.style.rotate) o.style.rotate=(Math.random()*16-8)+'deg'; if(all.length>2 && k===0) o.remove(); });
  // 5세(1단계) 카드는 그림 카드 (assets/card → tools/build_cards.py → src/cards.js)
  const img = level===1 && window.CARD_ART && CARD_ART[c.w];
  const el=document.createElement('div'); el.className='card deal'+(img?' has-art':L().pic?'':' nopic');
  el.style.setProperty('--fx', i? '-60vh':'60vh'); el.style.setProperty('--fr', i? '-20deg':'20deg');   // 나는 오른쪽, Coco는 왼쪽
  el.style.setProperty('--bk', i? 'var(--p2)':'var(--p1)'); el.style.setProperty('--bks', i? 'var(--p2-soft)':'var(--p1-soft)');
  const art = img ? `<img class="card-img" src="${img}" alt="${c.w}" draggable="false">` : L().pic ? `<div class="art" style="--tint:${TINTS[Math.random()*4|0]}"><small>그림 자리</small><strong>${c.a}</strong></div>` : '';
  el.innerHTML=`<div class="f front">${art}<div class="word">${c.w}</div></div><div class="f back"><b></b></div>`;
  spot.appendChild(el); cur.el=el; $('#replay').disabled=false;
  setTimeout(()=>speak(c.w), 260);   // 소리 앞 빈소리가 0.03→0.12초로 늘어서 0.09초 일찍 시작 (들리는 때는 전과 같음)
  mood('think');
  cpuReact(cur);
  setTurn(1-turn);
  if(turn===CPU) cpuFlipIn(L().cpu.flip);
}
// Coco는 카드가 열린 뒤 단계별 반응 시간만큼 생각하다 판단한다
function cpuReact(card){
  const C=L().cpu, t=400+rand(C.react);
  const go=()=>{ if(cur!==card || card.done || over) return; mood('ready'); later(()=>{ if(cur===card && !card.done && !over){ lean(); hitBell(CPU); } }, 220); };
  if(card.p && Math.random()>C.miss) later(go, t);
  else if(!card.p && Math.random()<C.slip) later(go, t);
  else later(()=>{ if(cur===card && !over) mood('idle'); }, t);
}
function hitBell(who){
  bell.classList.remove('hit','hit-l','hit-r'); void bell.offsetWidth;
  bell.classList.add('hit'); if(app.dataset.screen==='game') bell.classList.add(who?'hit-l':'hit-r');
  ding(); window.BellFace && BellFace.press();   // 종 표정: 꾹 눈 감고 납작 (src/bell-face.js)
  if(app.dataset.screen!=='game' || over || !cur) return;
  if(cur.done){ if(who===ME && performance.now()<lockUntil+900) say('코코가 먼저!'); return; }
  if(performance.now()<lockUntil) return;
  const p=P[who];
  if(cur.p){
    cur.done=true; lockUntil=performance.now()+500;
    repeatWord(cur);
    cur.el.style.setProperty('--hitc', who? 'oklch(0.85 0.1 14)':'oklch(0.85 0.07 260)');
    cur.el.classList.add('right'); window.BellFace && BellFace.react('happy');
    if(who===CPU){ mood('happy',1400); cocoSay('여러 개!'); }
    else { mood('surprised',1200); cocoSay('와, 빠르다!'); stats.hits++; stats.rt.push(performance.now()-cur.t0); }
    fly(p.slots[p.score]); p.score++;
    if(p.score===3) end(who);
    else if(turn===CPU && cpuFlipAt - performance.now() < AFTER_HIT){ clearTimers(); cpuFlipIn(AFTER_HIT); }
  }else{
    if(cur.wrong.has(who)) return; cur.wrong.add(who); buzz(); window.BellFace && BellFace.react('oops');
    repeatWord(cur);
    if(who===ME){ say('한 개면 치지 마!'); stats.miss++; }
    else { mood('oops',1500); cocoSay('한 개야!'); }
    cur.el.classList.remove('wrong'); void cur.el.offsetWidth; cur.el.classList.add('wrong');
    p.minus.classList.remove('show'); void p.minus.offsetWidth; p.minus.classList.add('show');
    if(p.score>0){ p.score--; const s=p.slots[p.score]; s.className='slot has lose'; setTimeout(()=>s.className='slot',450); }
  }
}
// 종을 친 뒤 종소리가 잦아들 즈음 같은 단어를 한 번 더 읽어준다 (맞았든 틀렸든)
// (소리 앞 빈소리가 0.12초라 0.09초 일찍 시작 — 들리는 때는 전과 같음)
function repeatWord(card){ setTimeout(()=>{ if(cur===card) speak(card.w); }, 560); }
function fly(target){
  const art = cur.el && cur.el.querySelector('.card-img');
  if(art){
    let img = target.querySelector('.got-card');
    if(!img){ img=document.createElement('img'); img.className='got-card'; img.draggable=false; target.insertBefore(img, target.firstChild); }
    img.src = art.currentSrc || art.src; img.alt = art.alt || '';
    target.classList.add('show-card');
  }
  const a=cur.el.getBoundingClientRect(), b=target.getBoundingClientRect();
  const src = P[1].slots.includes(target) ? './assets/card/coco_s.png' : './assets/card/my_s.png';
  const f=document.createElement('div'); f.className='flyer'; f.innerHTML=`<div class="token"><img src="${src}" alt="S" draggable="false"></div>`; document.body.appendChild(f);
  const h=f.offsetWidth/2, sx=a.left+a.width/2-h, sy=a.top+a.height/2-h, ex=b.left+b.width/2-h, ey=b.top+b.height/2-h;
  f.animate([{transform:`translate(${sx}px,${sy}px) scale(.5)`},
    {transform:`translate(${(sx+ex)/2}px,${Math.min(sy,ey)-90}px) scale(1.4)`, offset:.45},
    {transform:`translate(${ex}px,${ey}px) scale(.9)`}], {duration:720, easing:'cubic-bezier(.3,.7,.3,1)'})
   .onfinish=()=>{ f.remove(); target.className='slot has'; };
}
function end(w){
  over=true; clearTimers(); holdClock(); setTurn(turn);
  // Coco가 이기면 "내가 이겼다!"가 사라진 뒤에 "한 판 더?"가 나온다
  const cocoWon = w===CPU;
  setTimeout(()=>{ if(cocoWon){ mood('cheer'); cocoSay('내가 이겼다!');
                     setTimeout(()=>{ if(over && app.dataset.screen==='game') cocoSay('한 판 더?'); }, 3400); }
                   else { mood('sad'); cocoSay('네가 이겼어!'); setTimeout(()=>{ if(over) mood('happy'); }, 1300); } }, 300);
  setTimeout(()=>{ if(!over) return;   // 그사이 나가기·다시 하기를 눌렀으면 결과를 띄우지 않음
    const h=$('#vTitle');
    h.textContent = w===ME ? '이겼다!' : '아쉬워요!'; h.style.color = w===ME ? 'var(--p1)' : 'var(--p2)';
    $('#vSub').textContent = w===ME ? 'Coco보다 먼저 S 3개를 모았어요' : 'Coco가 먼저 모았어요. 다시 도전해요!';
    renderResult({ win: w===ME, me: P[ME].score, coco: P[CPU].score, stats, level, levelName: L().name });
    $('#verdict').classList.add('show'); $('#again').focus(); }, cocoWon ? 6000 : 2200);
}

// 3D 판 위 히트테스트 대신 화면 좌표 터치 영역
function place(){
  const set=(hit,r,pad=0)=>Object.assign(hit.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
  set($('#hit0'),P[ME].deck.getBoundingClientRect(),10);
  set($('#hitBell'),bell.getBoundingClientRect(),8);
  const s=spot.getBoundingClientRect(), rp=$('#replay');
  Object.assign(rp.style,{left:(s.right+16)+'px', top:(s.top+s.height/2-rp.offsetHeight/2)+'px', width:'', height:''});
}
function follow(ms){ const t0=performance.now(); (function f(){ place(); if(performance.now()-t0<ms) requestAnimationFrame(f); })(); }
addEventListener('resize', place);
$('#hit0').addEventListener('click', ()=>{ unlockSpeech(); flip(ME); });
const hb=$('#hitBell');
hb.addEventListener('pointerdown', e=>{ e.preventDefault(); hitBell(ME); });
hb.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); hitBell(ME); } });
$('#replay').addEventListener('click', ()=>{ unlockSpeech(); cur && speak(cur.w); });
function pickLevel(v){ level=+v;   // 단계 설명 줄은 화면에서 뺐어요 (LEVELS의 desc는 참고용으로만 남김)
  document.querySelectorAll('.level button').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lv===String(v))); }
document.querySelectorAll('.level button').forEach(b=>b.addEventListener('click', ()=>pickLevel(b.dataset.lv)));
// Coco 모습은 꼬마종으로 정함 (index.html의 data-look="bell") — 모습 고르기 버튼은 뺐어요
$('#start').addEventListener('click', ()=>{ unlockSpeech(); app.dataset.screen='game'; ctx(); window.BGM && BGM.play('game'); reset(); startClock(); follow(1500); setTimeout(()=>{ mood('happy',4200); cocoSay('안녕!', 'left'); setTimeout(()=>{ if(app.dataset.screen==='game') cocoSay('나는 Coco야', 'right'); }, 650); }, 1100); });
$('#again').addEventListener('click', ()=>{ reset(); startClock(); });
// 오른쪽 위: 스피커(누르면 세로 소리 막대) · 나가기 — 시작 화면과 게임 화면 모두에 있어요
const vol = $('#vol'), volPanel = $('#volPanel');
let volTimer = 0;
function paintVolume(){
  const b = $('#btnSound');
  b.setAttribute('aria-pressed', String(muted)); b.classList.toggle('low', !muted && volume < .5);
  vol.style.setProperty('--v', volume.toFixed(3));
  volPanel.setAttribute('aria-valuenow', String(Math.round(volume * 100)));
}
function setVolume(v, save = true){
  volume = Math.min(1, Math.max(0, v)); if(volume < .03) volume = 0;   // 맨 아래 = 소리 끔
  muted = volume === 0;
  window.BGM && BGM.setVolume(gainOf(volume));
  if(muted) stopVoice();
  paintVolume();
  if(save) try{ localStorage.setItem('hg-volume', String(volume)); }catch(e){}
}
function openVolume(on){
  vol.classList.toggle('open', on); $('#btnSound').setAttribute('aria-expanded', String(on)); volPanel.tabIndex = on ? 0 : -1;
  clearTimeout(volTimer); if(on) volTimer = setTimeout(()=>openVolume(false), 3500);   // 가만히 두면 3.5초 뒤 접힘
}
$('#btnSound').addEventListener('click', ()=>openVolume(!vol.classList.contains('open')));
const volFrom = e => { const r = volPanel.querySelector('.vol-track').getBoundingClientRect(); return 1 - (e.clientY - r.top) / r.height; };
let volDrag = null;   // 누르고 있는 손가락(포인터) — 막대 밖으로 끌어도 계속 따라가게 붙잡아 둠
volPanel.addEventListener('pointerdown', e=>{ e.preventDefault(); volDrag = e.pointerId; setVolume(volFrom(e)); openVolume(true);
  try{ volPanel.setPointerCapture(e.pointerId); }catch(_){} });
volPanel.addEventListener('pointermove', e=>{ if(volDrag === e.pointerId){ setVolume(volFrom(e)); openVolume(true); } });
const volEnd = e=>{ if(volDrag !== e.pointerId) return; volDrag = null; openVolume(true); if(!muted) tone([1320], .14, 'sine', .14); };   // 놓으면 그 크기로 '톡'
volPanel.addEventListener('pointerup', volEnd);
volPanel.addEventListener('pointercancel', volEnd);
volPanel.addEventListener('keydown', e=>{ const k = {ArrowUp:.1, ArrowRight:.1, ArrowDown:-.1, ArrowLeft:-.1}[e.key];
  if(k){ e.preventDefault(); setVolume(volume + k); openVolume(true); }
  else if(e.key==='Escape'){ openVolume(false); $('#btnSound').focus(); } });
document.addEventListener('pointerdown', e=>{ if(vol.classList.contains('open') && !e.target.closest('#vol')) openVolume(false); }, true);
// 나가기: 게임 화면 → 시작 화면 / 시작 화면 → 들어온 곳으로 (없으면 인트로부터 다시)
$('#btnExit').addEventListener('click', ()=>{
  stopVoice();
  if(app.dataset.screen === 'title'){
    if(history.length > 1){ history.back(); setTimeout(()=>location.reload(), 700); } else location.reload();
    return;
  }
  reset(); app.dataset.screen='title'; window.BGM && BGM.play('title'); setTurn(ME); follow(1200);
});
setVolume(volume, false);
document.addEventListener('keydown', e=>{ if(e.target.closest('button, .vol') || $('#intro')) return;
  if(e.key===' '){ e.preventDefault(); hitBell(ME); } if(e.key==='Enter') flip(ME); });
pickLevel(1); reset(); follow(600);
// 인트로 영상을 먼저 보여 주고, 끝나면 시작 화면
playIntro(()=>{ app.classList.remove('intro-on'); app.classList.add('intro-done'); follow(600);
  window.BGM && BGM.play('title'); });   // 인트로 영상이 끝나면 시작 화면 음악 (아직 화면을 안 눌렀으면 첫 터치에 나옴)

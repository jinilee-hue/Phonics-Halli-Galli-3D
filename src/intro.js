// 인트로 영상: 페이지를 열면 한 번 재생하고, 끝나면(또는 SKIP) 게임 시작 화면으로 넘어갑니다.
// 브라우저는 터치 전 소리 있는 자동재생을 막는 경우가 많아서
//   소리 켜고 재생 → 막히면 소리 끄고 재생 (화면을 누르면 소리가 켜짐)
//   → 그것도 막히면(아이패드 저전력 모드 등) 가운데 재생 버튼
// (파일을 더블클릭해 열어도 돌아가도록 모듈이 아닌 일반 스크립트로 둡니다)
window.playIntro = function playIntro(onDone) {
  const box = document.getElementById('intro');
  const v = document.getElementById('introVideo');
  if (!box || !v) { onDone?.(); return; }
  const skip = document.getElementById('introSkip');
  const tap = document.getElementById('introTap');

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    v.pause();
    box.classList.add('out');
    setTimeout(() => { box.remove(); onDone?.(); }, 600);
  };

  v.addEventListener('ended', finish);
  v.addEventListener('error', finish);
  skip.addEventListener('click', e => { e.stopPropagation(); finish(); });
  box.addEventListener('pointerdown', () => { v.muted = false; });
  tap.addEventListener('click', e => {
    e.stopPropagation();
    box.classList.remove('need-tap');
    v.muted = false;
    v.play().catch(finish);
  });
  setTimeout(() => skip.classList.add('show'), 1500);

  v.muted = false;
  v.play().catch(() => {
    v.muted = true;
    v.play().catch(() => box.classList.add('need-tap'));
  });
};

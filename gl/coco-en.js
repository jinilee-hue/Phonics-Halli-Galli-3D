// Coco(분홍 종) 말풍선을 영어로 (3D 폴더에만)
// 노란 종이 영어로 말하니 Coco도 영어로 맞춰요 — 영어 게임 안에서 말이 한 가지 말로.
// 원래 게임(src/main.js)의 한국어 말은 그대로 두고, 보여 줄 때만 바꿔요. 노란 종이 쓰는 말과 같은 낱말로(more than one · just one · you win).
(() => {
  const EN = {
    '안녕!': 'Hi!',
    '나는 Coco야': "I'm Coco!",
    '여러 개!': 'More than one!',      // Coco가 여럿 카드에 맞게 침
    '와, 빠르다!': 'So fast!',         // 아이가 맞게 침
    '한 개야!': 'Oops!',               // Coco가 하나 카드에 잘못 침 (뒤이어 노란 종이 "Oops, Coco! Just one.")
    '내가 이겼다!': 'I win!',
    '한 판 더?': 'One more game?',
    '네가 이겼어!': 'You win!',
  };
  const say0 = window.cocoSay;
  if (typeof say0 !== 'function') return;
  window.cocoSay = function (text, side) {
    const en = EN[text];
    document.querySelectorAll('#bubbleL, #bubbleR').forEach(b => b.classList.toggle('en', !!en));
    return say0.call(this, en || text, side);
  };
  window.COCO_EN = EN;
})();

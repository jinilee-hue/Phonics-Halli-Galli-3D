// tools/build_words.py 가 연구팩에서 만든 파일입니다. 직접 고치지 말고 스크립트를 다시 돌리세요.
// 파일을 더블클릭해 열어도(file://) 돌아가도록 모듈이 아닌 전역 변수로 둡니다.
window.WORDS = {
 "source": {
  "pack": "필수 문법 27 × 6과정 출현 낱말 분석 v0.26 (2026-10-18)",
  "sheet": "1-1 › 16 단어별 과정별 · 기준 1(나온 낱말 전부) · NP-01 규칙 복수형 -s",
  "traps": "3-2 문법학습단계 v0.5 › 09_문장별 학습 단계 (7세 SAD B · FPR B 문장)",
  "level3Regular": "7세 그냥 -s 낱말은 교재 출현 2번 이상만",
  "books": {
   "5": "SAD K · FPR K",
   "6": "SAD A · FPR A",
   "7": "SAD B · FPR B"
  },
  "counts": {
   "5": 20,
   "6": 73,
   "7": 136
  }
 },
 "level1": {
  "age": 5,
  "words": [
   {
    "base": "cat",
    "plural": "cats",
    "n": 6,
    "src": "SAD K p.229(2) · FPR K p.142(2), p.178, p.186",
    "ko": "고양이",
    "unit": "마리"
   },
   {
    "base": "cracker",
    "plural": "crackers",
    "n": 2,
    "src": "SAD K p.131(2)",
    "ko": "크래커",
    "unit": "개"
   },
   {
    "base": "hat",
    "plural": "hats",
    "n": 2,
    "src": "FPR K p.141, p.215",
    "ko": "모자",
    "unit": "개"
   },
   {
    "base": "bat",
    "plural": "bats",
    "n": 1,
    "src": "FPR K p.177",
    "ko": "야구방망이",
    "unit": "개"
   },
   {
    "base": "bug",
    "plural": "bugs",
    "n": 1,
    "src": "FPR K p.286",
    "ko": "벌레",
    "unit": "마리"
   },
   {
    "base": "dog",
    "plural": "dogs",
    "n": 1,
    "src": "FPR K p.227",
    "ko": "강아지",
    "unit": "마리"
   },
   {
    "base": "dot",
    "plural": "dots",
    "n": 1,
    "src": "FPR K p.153",
    "ko": "점",
    "unit": "개"
   },
   {
    "base": "egg",
    "plural": "eggs",
    "n": 1,
    "src": "FPR K p.227",
    "ko": "달걀",
    "unit": "개"
   },
   {
    "base": "hill",
    "plural": "hills",
    "n": 1,
    "src": "FPR K p.189",
    "ko": "언덕",
    "unit": "개"
   },
   {
    "base": "jet",
    "plural": "jets",
    "n": 1,
    "src": "FPR K p.289",
    "ko": "제트기",
    "unit": "대"
   },
   {
    "base": "jug",
    "plural": "jugs",
    "n": 1,
    "src": "FPR K p.289",
    "ko": "물병",
    "unit": "개"
   },
   {
    "base": "leg",
    "plural": "legs",
    "n": 1,
    "src": "FPR K p.227",
    "ko": "다리",
    "unit": "개"
   },
   {
    "base": "lip",
    "plural": "lips",
    "n": 1,
    "src": "FPR K p.189",
    "ko": "입술",
    "unit": "개"
   },
   {
    "base": "pan",
    "plural": "pans",
    "n": 1,
    "src": "FPR K p.79",
    "ko": "프라이팬",
    "unit": "개"
   },
   {
    "base": "pet",
    "plural": "pets",
    "n": 1,
    "src": "FPR K p.265",
    "ko": "반려동물",
    "unit": "마리"
   },
   {
    "base": "pig",
    "plural": "pigs",
    "n": 1,
    "src": "FPR K p.227",
    "ko": "돼지",
    "unit": "마리"
   },
   {
    "base": "pot",
    "plural": "pots",
    "n": 1,
    "src": "FPR K p.153",
    "ko": "냄비",
    "unit": "개"
   }
  ],
  "excluded": [
   {
    "w": "bills",
    "why": "지폐·새 부리 두 뜻이라 그림이 헷갈림 (같은 쪽에 이름 Bill도 나옴)"
   },
   {
    "w": "foxes",
    "why": "-es 복수는 3단계에서 다룸"
   },
   {
    "w": "naps",
    "why": "낮잠은 그림으로 하나·여럿을 보여 주기 어려움"
   }
  ]
 },
 "level2": {
  "age": 6,
  "words": [
   {
    "base": "bird",
    "plural": "birds",
    "n": 6,
    "src": "FPR A p.293, p.307(2), p.312, p.361(2)",
    "ko": "새",
    "unit": "마리"
   },
   {
    "base": "cat",
    "plural": "cats",
    "n": 6,
    "src": "FPR A p.9, p.17(2), p.89(2), p.319",
    "ko": "고양이",
    "unit": "마리"
   },
   {
    "base": "dog",
    "plural": "dogs",
    "n": 6,
    "src": "SAD A p.43(2) · FPR A p.47(2), p.284, p.340",
    "ko": "강아지",
    "unit": "마리"
   },
   {
    "base": "bug",
    "plural": "bugs",
    "n": 5,
    "src": "SAD A p.142(2) · FPR A p.82, p.254, p.367",
    "ko": "벌레",
    "unit": "마리"
   },
   {
    "base": "can",
    "plural": "cans",
    "n": 4,
    "src": "SAD A p.256(2), p.258(2)",
    "ko": "깡통",
    "unit": "개"
   },
   {
    "base": "clown",
    "plural": "clowns",
    "n": 4,
    "src": "SAD A p.43(4)",
    "ko": "광대",
    "unit": "명"
   },
   {
    "base": "coin",
    "plural": "coins",
    "n": 4,
    "src": "FPR A p.354, p.357(2), p.363",
    "ko": "동전",
    "unit": "개"
   },
   {
    "base": "egg",
    "plural": "eggs",
    "n": 4,
    "src": "FPR A p.66, p.73, p.75(2)",
    "ko": "달걀",
    "unit": "개"
   },
   {
    "base": "kid",
    "plural": "kids",
    "n": 4,
    "src": "FPR A p.24, p.73, p.89(2)",
    "ko": "아이",
    "unit": "명"
   },
   {
    "base": "plant",
    "plural": "plants",
    "n": 4,
    "src": "SAD A p.321(2) · FPR A p.91, p.145",
    "ko": "식물",
    "unit": "그루"
   },
   {
    "base": "log",
    "plural": "logs",
    "n": 3,
    "src": "SAD A p.228(2) · FPR A p.73",
    "ko": "통나무",
    "unit": "개"
   },
   {
    "base": "monkey",
    "plural": "monkeys",
    "n": 3,
    "src": "FPR A p.426, p.435(2)",
    "ko": "원숭이",
    "unit": "마리"
   },
   {
    "base": "pup",
    "plural": "pups",
    "n": 3,
    "src": "FPR A p.73(3)",
    "ko": "새끼 강아지",
    "unit": "마리"
   },
   {
    "base": "sail",
    "plural": "sails",
    "n": 3,
    "src": "SAD A p.331(3)",
    "ko": "돛",
    "unit": "개"
   },
   {
    "base": "seed",
    "plural": "seeds",
    "n": 3,
    "src": "SAD A p.321, p.323 · FPR A p.277",
    "ko": "씨앗",
    "unit": "개"
   },
   {
    "base": "tree",
    "plural": "trees",
    "n": 3,
    "src": "SAD A p.257(2) · FPR A p.412",
    "ko": "나무",
    "unit": "그루"
   },
   {
    "base": "balloon",
    "plural": "balloons",
    "n": 2,
    "src": "SAD A p.282(2)",
    "ko": "풍선",
    "unit": "개"
   },
   {
    "base": "bat",
    "plural": "bats",
    "n": 2,
    "src": "FPR A p.73, p.254",
    "ko": "야구방망이",
    "unit": "개"
   },
   {
    "base": "bean",
    "plural": "beans",
    "n": 2,
    "src": "FPR A p.177, p.240",
    "ko": "콩",
    "unit": "개"
   },
   {
    "base": "bear",
    "plural": "bears",
    "n": 2,
    "src": "SAD A p.43 · FPR A p.391",
    "ko": "곰",
    "unit": "마리"
   },
   {
    "base": "bike",
    "plural": "bikes",
    "n": 2,
    "src": "SAD A p.228(2)",
    "ko": "자전거",
    "unit": "대"
   },
   {
    "base": "coat",
    "plural": "coats",
    "n": 2,
    "src": "SAD A p.228(2)",
    "ko": "외투",
    "unit": "벌"
   },
   {
    "base": "dollar",
    "plural": "dollars",
    "n": 2,
    "src": "FPR A p.375(2)",
    "ko": "달러 지폐",
    "unit": "장"
   },
   {
    "base": "friend",
    "plural": "friends",
    "n": 2,
    "src": "FPR A p.119(2)",
    "ko": "친구",
    "unit": "명"
   },
   {
    "base": "frog",
    "plural": "frogs",
    "n": 2,
    "src": "FPR A p.119(2)",
    "ko": "개구리",
    "unit": "마리"
   },
   {
    "base": "hat",
    "plural": "hats",
    "n": 2,
    "src": "FPR A p.69(2)",
    "ko": "모자",
    "unit": "개"
   },
   {
    "base": "orange",
    "plural": "oranges",
    "n": 2,
    "src": "FPR A p.105(2)",
    "ko": "오렌지",
    "unit": "개"
   },
   {
    "base": "pea",
    "plural": "peas",
    "n": 2,
    "src": "SAD A p.321 · FPR A p.235",
    "ko": "완두콩",
    "unit": "개"
   },
   {
    "base": "snack",
    "plural": "snacks",
    "n": 2,
    "src": "FPR A p.105(2)",
    "ko": "과자",
    "unit": "개"
   },
   {
    "base": "sock",
    "plural": "socks",
    "n": 2,
    "src": "FPR A p.138, p.382",
    "ko": "양말",
    "unit": "짝"
   },
   {
    "base": "squirrel",
    "plural": "squirrels",
    "n": 2,
    "src": "SAD A p.257(2)",
    "ko": "다람쥐",
    "unit": "마리"
   },
   {
    "base": "swing",
    "plural": "swings",
    "n": 2,
    "src": "FPR A p.105(2)",
    "ko": "그네",
    "unit": "개"
   },
   {
    "base": "toad",
    "plural": "toads",
    "n": 2,
    "src": "SAD A p.228(2)",
    "ko": "두꺼비",
    "unit": "마리"
   },
   {
    "base": "turtle",
    "plural": "turtles",
    "n": 2,
    "src": "SAD A p.257(2)",
    "ko": "거북",
    "unit": "마리"
   },
   {
    "base": "ant",
    "plural": "ants",
    "n": 1,
    "src": "FPR A p.91",
    "ko": "개미",
    "unit": "마리"
   },
   {
    "base": "bee",
    "plural": "bees",
    "n": 1,
    "src": "FPR A p.284",
    "ko": "벌",
    "unit": "마리"
   },
   {
    "base": "bell",
    "plural": "bells",
    "n": 1,
    "src": "FPR A p.73",
    "ko": "종",
    "unit": "개"
   },
   {
    "base": "block",
    "plural": "blocks",
    "n": 1,
    "src": "FPR A p.82",
    "ko": "블록",
    "unit": "개"
   },
   {
    "base": "car",
    "plural": "cars",
    "n": 1,
    "src": "FPR A p.277",
    "ko": "자동차",
    "unit": "대"
   },
   {
    "base": "cave",
    "plural": "caves",
    "n": 1,
    "src": "FPR A p.254",
    "ko": "동굴",
    "unit": "개"
   },
   {
    "base": "cloud",
    "plural": "clouds",
    "n": 1,
    "src": "SAD A p.298",
    "ko": "구름",
    "unit": "개"
   },
   {
    "base": "crab",
    "plural": "crabs",
    "n": 1,
    "src": "FPR A p.110",
    "ko": "게",
    "unit": "마리"
   },
   {
    "base": "cup",
    "plural": "cups",
    "n": 1,
    "src": "FPR A p.52",
    "ko": "컵",
    "unit": "개"
   },
   {
    "base": "cupcake",
    "plural": "cupcakes",
    "n": 1,
    "src": "SAD A p.282",
    "ko": "컵케이크",
    "unit": "개"
   },
   {
    "base": "fan",
    "plural": "fans",
    "n": 1,
    "src": "FPR A p.9",
    "ko": "선풍기",
    "unit": "대"
   },
   {
    "base": "flower",
    "plural": "flowers",
    "n": 1,
    "src": "FPR A p.91",
    "ko": "꽃",
    "unit": "송이"
   },
   {
    "base": "girl",
    "plural": "girls",
    "n": 1,
    "src": "FPR A p.354",
    "ko": "여자아이",
    "unit": "명"
   },
   {
    "base": "glove",
    "plural": "gloves",
    "n": 1,
    "src": "FPR A p.407",
    "ko": "장갑",
    "unit": "짝"
   },
   {
    "base": "goat",
    "plural": "goats",
    "n": 1,
    "src": "SAD A p.206",
    "ko": "염소",
    "unit": "마리"
   },
   {
    "base": "jug",
    "plural": "jugs",
    "n": 1,
    "src": "FPR A p.168",
    "ko": "물병",
    "unit": "개"
   },
   {
    "base": "map",
    "plural": "maps",
    "n": 1,
    "src": "FPR A p.9",
    "ko": "지도",
    "unit": "장"
   },
   {
    "base": "mat",
    "plural": "mats",
    "n": 1,
    "src": "FPR A p.9",
    "ko": "매트",
    "unit": "장"
   },
   {
    "base": "nut",
    "plural": "nuts",
    "n": 1,
    "src": "FPR A p.277",
    "ko": "견과",
    "unit": "개"
   },
   {
    "base": "pan",
    "plural": "pans",
    "n": 1,
    "src": "FPR A p.9",
    "ko": "프라이팬",
    "unit": "개"
   },
   {
    "base": "paw",
    "plural": "paws",
    "n": 1,
    "src": "FPR A p.367",
    "ko": "동물 발",
    "unit": "개"
   },
   {
    "base": "pen",
    "plural": "pens",
    "n": 1,
    "src": "FPR A p.267",
    "ko": "펜",
    "unit": "자루"
   },
   {
    "base": "rose",
    "plural": "roses",
    "n": 1,
    "src": "FPR A p.191",
    "ko": "장미",
    "unit": "송이"
   },
   {
    "base": "shoe",
    "plural": "shoes",
    "n": 1,
    "src": "FPR A p.133",
    "ko": "신발",
    "unit": "짝"
   },
   {
    "base": "sled",
    "plural": "sleds",
    "n": 1,
    "src": "FPR A p.91",
    "ko": "썰매",
    "unit": "대"
   },
   {
    "base": "spot",
    "plural": "spots",
    "n": 1,
    "src": "FPR A p.89",
    "ko": "얼룩점",
    "unit": "개"
   },
   {
    "base": "toe",
    "plural": "toes",
    "n": 1,
    "src": "FPR A p.412",
    "ko": "발가락",
    "unit": "개"
   },
   {
    "base": "toy",
    "plural": "toys",
    "n": 1,
    "src": "FPR A p.354",
    "ko": "장난감",
    "unit": "개"
   }
  ],
  "excluded": [
   {
    "w": "songs",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "days",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "shorts",
    "why": "shorts(반바지)는 늘 여럿 꼴이라 짝 카드 'short'가 성립하지 않음"
   },
   {
    "w": "stairs",
    "why": "stairs(계단)는 거의 늘 여럿 꼴로 씀"
   },
   {
    "w": "boxes",
    "why": "-es 복수는 3단계에서 다룸"
   },
   {
    "w": "parts",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "points",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "scores",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "sports",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "things",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   },
   {
    "w": "woods",
    "why": "그림으로 하나·여럿을 보여 주기 어려움"
   }
  ]
 },
 "level3": {
  "age": 7,
  "es": [
   {
    "base": "fox",
    "plural": "foxes",
    "n": 2,
    "src": "SAD B p.185, p.186"
   },
   {
    "base": "bench",
    "plural": "benches",
    "n": 1,
    "src": "SAD B p.185"
   },
   {
    "base": "box",
    "plural": "boxes",
    "n": 1,
    "src": "SAD B p.186"
   },
   {
    "base": "brush",
    "plural": "brushes",
    "n": 1,
    "src": "SAD B p.187"
   },
   {
    "base": "dress",
    "plural": "dresses",
    "n": 1,
    "src": "SAD B p.185"
   },
   {
    "base": "peach",
    "plural": "peaches",
    "n": 1,
    "src": "SAD B p.186"
   },
   {
    "base": "sandwich",
    "plural": "sandwiches",
    "n": 1,
    "src": "FPR B p.81"
   },
   {
    "base": "wrench",
    "plural": "wrenches",
    "n": 1,
    "src": "SAD B p.185"
   }
  ],
  "traps": [
   {
    "w": "bus",
    "n": 16,
    "src": "SAD B p.105",
    "sentence": "All the children in our class ride the bus.",
    "plural": "buses",
    "pluralSrc": "SAD B p.75"
   },
   {
    "w": "class",
    "n": 15,
    "src": "SAD B p.105",
    "sentence": "All the children in our class ride the bus."
   },
   {
    "w": "grass",
    "n": 6,
    "src": "SAD B p.205",
    "sentence": "Till I touch the grass below."
   },
   {
    "w": "mess",
    "n": 4,
    "src": "SAD B p.35",
    "sentence": "Why is Pup a mess?"
   },
   {
    "w": "circus",
    "n": 3,
    "src": "SAD B p.130",
    "sentence": "Let's go to the circus."
   },
   {
    "w": "dress",
    "n": 3,
    "src": "SAD B p.179",
    "sentence": "I asked Mrs. Berg where she got her dress."
   },
   {
    "w": "glass",
    "n": 1,
    "src": "SAD B p.232",
    "sentence": "It is five cents a glass."
   },
   {
    "w": "moss",
    "n": 1,
    "src": "FPR B p.15",
    "sentence": "I pat some soft, wet moss on the log."
   }
  ],
  "regular": [
   {
    "base": "book",
    "plural": "books",
    "n": 8,
    "src": "SAD B p.197(3) · FPR B p.133(2), p.247(2), p.248"
   },
   {
    "base": "coin",
    "plural": "coins",
    "n": 8,
    "src": "SAD B p.156(3), p.165(3) · FPR B p.267(2)"
   },
   {
    "base": "duck",
    "plural": "ducks",
    "n": 8,
    "src": "SAD B p.32(6) · FPR B p.20, p.186"
   },
   {
    "base": "friend",
    "plural": "friends",
    "n": 6,
    "src": "SAD B p.217, p.232(3) · FPR B p.56, p.81"
   },
   {
    "base": "word",
    "plural": "words",
    "n": 6,
    "src": "SAD B p.110(2), p.193 · FPR B p.248(2), p.264"
   },
   {
    "base": "syllable",
    "plural": "syllables",
    "n": 5,
    "src": "SAD B p.108, p.110(2), p.112, p.193"
   },
   {
    "base": "thing",
    "plural": "things",
    "n": 5,
    "src": "SAD B p.93, p.97(2), p.115 · FPR B p.40"
   },
   {
    "base": "year",
    "plural": "years",
    "n": 5,
    "src": "SAD B p.186 · FPR B p.310(4)"
   },
   {
    "base": "apple",
    "plural": "apples",
    "n": 4,
    "src": "SAD B p.198(2) · FPR B p.40, p.185"
   },
   {
    "base": "bike",
    "plural": "bikes",
    "n": 4,
    "src": "SAD B p.51(2) · FPR B p.61(2)"
   },
   {
    "base": "bird",
    "plural": "birds",
    "n": 4,
    "src": "SAD B p.61(2), p.139 · FPR B p.236"
   },
   {
    "base": "bug",
    "plural": "bugs",
    "n": 4,
    "src": "SAD B p.32(2) · FPR B p.10, p.16"
   },
   {
    "base": "cent",
    "plural": "cents",
    "n": 4,
    "src": "SAD B p.232 · FPR B p.68(3)"
   },
   {
    "base": "cow",
    "plural": "cows",
    "n": 4,
    "src": "SAD B p.126, p.134 · FPR B p.257(2)"
   },
   {
    "base": "egg",
    "plural": "eggs",
    "n": 4,
    "src": "FPR B p.46, p.50, p.186, p.310"
   },
   {
    "base": "sail",
    "plural": "sails",
    "n": 4,
    "src": "SAD B p.226(4)"
   },
   {
    "base": "thorn",
    "plural": "thorns",
    "n": 4,
    "src": "SAD B p.131(2) · FPR B p.88(2)"
   },
   {
    "base": "bean",
    "plural": "beans",
    "n": 3,
    "src": "SAD B p.113 · FPR B p.222(2)"
   },
   {
    "base": "boat",
    "plural": "boats",
    "n": 3,
    "src": "SAD B p.226(3)"
   },
   {
    "base": "card",
    "plural": "cards",
    "n": 3,
    "src": "SAD B p.131(2), p.183"
   },
   {
    "base": "chair",
    "plural": "chairs",
    "n": 3,
    "src": "FPR B p.215(2), p.264"
   },
   {
    "base": "claw",
    "plural": "claws",
    "n": 3,
    "src": "SAD B p.150(2) · FPR B p.277"
   },
   {
    "base": "cloud",
    "plural": "clouds",
    "n": 3,
    "src": "SAD B p.165(3)"
   },
   {
    "base": "scrap",
    "plural": "scraps",
    "n": 3,
    "src": "FPR B p.98(3)"
   },
   {
    "base": "seed",
    "plural": "seeds",
    "n": 3,
    "src": "SAD B p.70 · FPR B p.264, p.267"
   },
   {
    "base": "song",
    "plural": "songs",
    "n": 3,
    "src": "FPR B p.91(2), p.174"
   },
   {
    "base": "sport",
    "plural": "sports",
    "n": 3,
    "src": "FPR B p.205(2), p.288"
   },
   {
    "base": "star",
    "plural": "stars",
    "n": 3,
    "src": "SAD B p.51, p.197(2)"
   },
   {
    "base": "toy",
    "plural": "toys",
    "n": 3,
    "src": "SAD B p.165 · FPR B p.113, p.268"
   },
   {
    "base": "ant",
    "plural": "ants",
    "n": 2,
    "src": "SAD B p.113 · FPR B p.310"
   },
   {
    "base": "bag",
    "plural": "bags",
    "n": 2,
    "src": "FPR B p.56, p.130"
   },
   {
    "base": "bear",
    "plural": "bears",
    "n": 2,
    "src": "FPR B p.215, p.226"
   },
   {
    "base": "bone",
    "plural": "bones",
    "n": 2,
    "src": "SAD B p.186 · FPR B p.62"
   },
   {
    "base": "car",
    "plural": "cars",
    "n": 2,
    "src": "SAD B p.96, p.165"
   },
   {
    "base": "cat",
    "plural": "cats",
    "n": 2,
    "src": "FPR B p.10, p.163"
   },
   {
    "base": "clown",
    "plural": "clowns",
    "n": 2,
    "src": "SAD B p.130 · FPR B p.235"
   },
   {
    "base": "day",
    "plural": "days",
    "n": 2,
    "src": "SAD B p.208 · FPR B p.150"
   },
   {
    "base": "desk",
    "plural": "desks",
    "n": 2,
    "src": "FPR B p.78, p.264"
   },
   {
    "base": "flower",
    "plural": "flowers",
    "n": 2,
    "src": "SAD B p.93 · FPR B p.268"
   },
   {
    "base": "grape",
    "plural": "grapes",
    "n": 2,
    "src": "FPR B p.104, p.144"
   },
   {
    "base": "hat",
    "plural": "hats",
    "n": 2,
    "src": "FPR B p.10, p.195"
   },
   {
    "base": "hunt",
    "plural": "hunts",
    "n": 2,
    "src": "SAD B p.208(2)"
   },
   {
    "base": "key",
    "plural": "keys",
    "n": 2,
    "src": "FPR B p.124, p.133"
   },
   {
    "base": "kind",
    "plural": "kinds",
    "n": 2,
    "src": "SAD B p.115, p.186"
   },
   {
    "base": "kitten",
    "plural": "kittens",
    "n": 2,
    "src": "FPR B p.78, p.186"
   },
   {
    "base": "mountain",
    "plural": "mountains",
    "n": 2,
    "src": "SAD B p.154(2)"
   },
   {
    "base": "nut",
    "plural": "nuts",
    "n": 2,
    "src": "SAD B p.29, p.61"
   },
   {
    "base": "plant",
    "plural": "plants",
    "n": 2,
    "src": "SAD B p.106 · FPR B p.123"
   },
   {
    "base": "pond",
    "plural": "ponds",
    "n": 2,
    "src": "SAD B p.32(2)"
   },
   {
    "base": "puddle",
    "plural": "puddles",
    "n": 2,
    "src": "SAD B p.32(2)"
   },
   {
    "base": "puzzle",
    "plural": "puzzles",
    "n": 2,
    "src": "FPR B p.173, p.264"
   },
   {
    "base": "remark",
    "plural": "remarks",
    "n": 2,
    "src": "FPR B p.170(2)"
   },
   {
    "base": "shirt",
    "plural": "shirts",
    "n": 2,
    "src": "FPR B p.195(2)"
   },
   {
    "base": "shoe",
    "plural": "shoes",
    "n": 2,
    "src": "FPR B p.242(2)"
   },
   {
    "base": "squirrel",
    "plural": "squirrels",
    "n": 2,
    "src": "SAD B p.61, p.191"
   },
   {
    "base": "toe",
    "plural": "toes",
    "n": 2,
    "src": "FPR B p.92, p.140"
   },
   {
    "base": "train",
    "plural": "trains",
    "n": 2,
    "src": "FPR B p.287(2)"
   },
   {
    "base": "wheel",
    "plural": "wheels",
    "n": 2,
    "src": "SAD B p.119 · FPR B p.124"
   },
   {
    "base": "wood",
    "plural": "woods",
    "n": 2,
    "src": "FPR B p.254(2)"
   }
  ],
  "excluded": [
   {
    "w": "pants",
    "why": "pants(바지)는 늘 여럿 꼴"
   },
   {
    "w": "stairs",
    "why": "stairs(계단)는 거의 늘 여럿 꼴로 씀"
   },
   {
    "w": "lots",
    "why": "lots는 'lots of'로 쓰는 말이라 셀 수 있는 낱말이 아님"
   }
  ]
 }
};

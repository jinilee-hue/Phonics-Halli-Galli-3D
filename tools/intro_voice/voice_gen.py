"""인트로 나레이션 목소리 만들기 (edge-tts) — 문장마다 mp3 + 낱말 시각(WordBoundary)
목소리 후보: ava(밝은 어른 진행자) · ana(아이 목소리, 게임 낱말 목소리와 같은 사람)
결과: /tmp/gl/hg/rdd/voice/<목소리>_<n>.mp3 + words.json
"""
import asyncio
import json
import pathlib

import edge_tts

D = pathlib.Path('/tmp/gl/hg/rdd/voice')
D.mkdir(parents=True, exist_ok=True)
LINES = ['Welcome to Phonics Ring Ding Dong!', 'Are you ready to play?', 'Press start to begin!']
VOICES = {
    'ava': dict(voice='en-US-AvaNeural', rate='+0%', pitch='+0Hz'),
    'emma': dict(voice='en-US-EmmaNeural', rate='+0%', pitch='+0Hz'),
    'ana': dict(voice='en-US-AnaNeural', rate='-5%', pitch='+0Hz'),
}


async def one(key, i, text):
    v = VOICES[key]
    c = edge_tts.Communicate(text, v['voice'], rate=v['rate'], pitch=v['pitch'], boundary='WordBoundary')
    audio, words = bytearray(), []
    async for ch in c.stream():
        if ch['type'] == 'audio':
            audio += ch['data']
        elif ch['type'] == 'WordBoundary':
            words.append([ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7])
    (D / f'{key}_{i}.mp3').write_bytes(audio)
    return words


async def main():
    out = {}
    for key in VOICES:
        for i, text in enumerate(LINES):
            out[f'{key}_{i}'] = await one(key, i, text)
    (D / 'words.json').write_text(json.dumps(out, indent=1))
    for k, w in out.items():
        print(k, ' '.join(f'{t}@{a:.2f}-{b:.2f}' for t, a, b in w))


asyncio.run(main())

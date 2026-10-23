#!/bin/bash
# 더블클릭하면 3D 시제품을 켜고 브라우저를 엽니다 (포트 5182 — 원래 게임 5181과 같이 켜 둘 수 있어요).
# 서버 없이 index.html을 더블클릭해서 열어도 돌아가요.
cd "$(dirname "$0")" || exit 1
PORT=5182
URL="http://localhost:$PORT/?v=$(date +%s)"

if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then
  open "$URL"
  exit 0
fi
if ! command -v python3 >/dev/null 2>&1; then
  open index.html
  exit 0
fi
( sleep 1; open "$URL" ) &
python3 -m http.server "$PORT"

#!/bin/bash
# 더블클릭: 원래 게임(옆 폴더 Phonics-Halli-Galli)에서 고친 것을 이 3D 폴더로 가져와요.
cd "$(dirname "$0")" || exit 1
python3 tools/sync_from_original.py
echo
read -r -n 1 -p "아무 키나 누르면 닫혀요."

#!/bin/bash
# 1キャラ分の シート（回転・ポーズ）を Codex で 生成する。docs/character-pipeline.md の 1.
# 使い方: tools/charkit/gen.sh <id> <作業フォルダ>   （キャラ情報は tools/charkit/chars.tsv から読む）
set -e
ID="$1"; OUT="$2/$ID"; ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LINE=$(grep -P "^$ID\t" "$ROOT/tools/charkit/chars.tsv")
DESC=$(echo "$LINE" | cut -f3); REF=$(echo "$LINE" | cut -f4); SPECIAL=$(echo "$LINE" | cut -f5)
mkdir -p "$OUT"; cd "$OUT"
ARGS=()
if [ "$REF" != "-" ]; then cp "$ROOT/キャラクター/$REF" ref.img; ARGS=(-i ref.img); MATCH="The attached image is the reference for the character. Match the design exactly: hair, accessories, outfit, colors."; else MATCH="Draw the character accurately to the official design."; fi
cat > prompt.txt <<P
Character: $DESC. $MATCH
Use your image generation tool to create TWO separate images and save them in the current directory.
Image 1 '${ID}_turn.png': a character turnaround model sheet in clean flat 2D TV-anime cel style with black outlines. Strict grid 4 columns x 3 rows on a pure white background, each cell one full-body character in the same neutral standing pose, same size, feet on the same baseline, generous empty space between cells, no text, no labels, no shadows, no overlap. The 12 cells rotate in 30-degree steps, left to right then top to bottom: front (0), 30, 60, 90 (right side profile), 120, 150, 180 (back), 210, 240, 270 (left side profile), 300, 330. Identical proportions and colors in every cell.
Image 2 '${ID}_poses.png': same style, strict grid 5 columns x 4 rows on pure white background, 20 cells, one full-body character per cell, same scale, generous empty space between cells, no text, no labels, no shadows, no overlap, each pose from the camera angle that shows it best: 1 waving hello, 2 big laugh, 3 surprised jump, 4 crying, 5 angry pouting, 6 running, 7 dancing, 8 $SPECIAL, 9 eating a snack happily, 10 thinking, 11 victory pose, 12 tripping and falling, 13 flying leap, 14 sitting, 15 sleeping, 16 pointing forward, 17 clapping, 18 bowing, 19 shy blushing, 20 scared.
Print both saved paths. If refused, print the refusal message.
P
timeout 1500 codex exec --skip-git-repo-check --sandbox workspace-write "${ARGS[@]}" -- "$(cat prompt.txt)" < /dev/null > gen.log 2>&1 || true
ls "${ID}_turn.png" "${ID}_poses.png" 2>/dev/null || { echo "FAILED $ID"; tail -5 gen.log; }

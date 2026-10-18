#!/bin/bash
# 生成した 2枚の シートを 切り抜いて、確認用の 一覧画像を 作る。docs/character-pipeline.md の 2〜3.
# 使い方: tools/charkit/cut_char.sh <id> <作業フォルダ>
ID="$1"; W="$2/$ID"; K="$(dirname "$0")"
rm -rf "$W/out"
python3 -I "$K/cut_sheet.py" "$W/${ID}_turn.png" 4 3 "$W/out" t000,t030,t060,t090,t120,t150,t180,t210,t240,t270,t300,t330 --auto
python3 -I "$K/cut_sheet.py" "$W/${ID}_poses.png" 5 4 "$W/out" p_wave,p_laugh,p_jump,p_cry,p_angry,p_run,p_dance,p_special,p_eat,p_think,p_victory,p_trip,p_fly,p_sit,p_sleep,p_point,p_clap,p_bow,p_shy,p_scared --auto
python3 -I - "$W" <<'P'
import sys, glob
from PIL import Image, ImageDraw
w = sys.argv[1]; fs = sorted(glob.glob(w + '/out/*.png')); tiles = []
for f in fs:
    t = Image.open(f); s = 180 / t.height; tiles.append((t.resize((max(1, int(t.width * s)), 180)), f.split('/')[-1][:-4]))
cols = 11; rows = (len(tiles) + cols - 1) // cols; sh = Image.new('RGBA', (cols * 160, rows * 200), (40, 40, 60, 255)); d = ImageDraw.Draw(sh)
for i, (t, n) in enumerate(tiles): sh.alpha_composite(t, ((i % cols) * 160, (i // cols) * 200)); d.text(((i % cols) * 160 + 2, (i // cols) * 200 + 184), n, fill='white')
sh.convert('RGB').save(w + '/check.png'); print(len(fs), 'frames')
P

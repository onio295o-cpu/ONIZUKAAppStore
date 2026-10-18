# 生成シート（白背景・マス目）を 1マスずつ 切り分けて、外がわの 白い背景だけ 透明に する。
# 顔やおなかの 白は 線に かこまれているので 残る。
# 使い方: python3 cut_sheet.py <シート.png> <列> <行> <出力フォルダ> <名前1,名前2,...>
#   例: python3 cut_sheet.py turn.png 4 3 out t000,t030,t060,t090,t240b,t210b,t180,t150b,t270,t300,t330,t000b
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def cutout(im):
    im = im.convert('RGB'); W, H = im.size
    a = np.array(im).astype(int)
    white = a.min(axis=2) > 222
    # 端から つながる 白 = 背景（まわり1pxを 白で かこんで そこから ぬる）
    bg = Image.new('L', (W + 2, H + 2), 255); bg.paste(Image.fromarray((white * 255).astype(np.uint8)), (1, 1))
    ImageDraw.floodfill(bg, (0, 0), 128)
    alpha = np.where(np.array(bg)[1:-1, 1:-1] == 128, 0, 255).astype(np.uint8)
    # ふちを なめらかに：背景との さかいの うすい灰色は 半透明に
    edge = np.array(Image.fromarray(alpha).filter(ImageFilter.MaxFilter(3))) > 0
    lum = a.mean(axis=2)
    soft = (alpha == 0) & edge & (lum < 250)
    alpha = np.where(soft, np.clip((255 - lum) * 2.2, 0, 255), alpha).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')

def drop_edge_bits(o):
    # マスの ふちに かかった 小さな 部分（となりの 絵の はみ出し）だけ 消す
    A = np.array(o.getchannel('A')); total = (A > 0).sum()
    m = Image.fromarray(np.where(A > 0, 255, 0).astype(np.uint8)); w, h = m.size
    border = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    for (x, y) in border:
        if m.getpixel((x, y)) != 255: continue
        ImageDraw.floodfill(m, (x, y), 100); comp = np.array(m) == 100
        if comp.sum() < total * .06: A[comp] = 0
        m = Image.fromarray(np.where(comp, 50, np.array(m)).astype(np.uint8))
    o.putalpha(Image.fromarray(A)); return o

def grid(path, cols, rows, outdir, names):
    os.makedirs(outdir, exist_ok=True)
    im = Image.open(path); W, H = im.size; cw, ch = W / cols, H / rows
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            if i >= len(names) or not names[i] or names[i] == '-': continue
            o = drop_edge_bits(cutout(im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))))
            bb = o.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            if not bb: print('empty cell', i); continue
            o = o.crop((max(0, bb[0] - 4), max(0, bb[1] - 4), min(o.width, bb[2] + 4), min(o.height, bb[3] + 4)))
            o.save(os.path.join(outdir, names[i] + '.png'))

if __name__ == '__main__':
    path, cols, rows, outdir, names = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5].split(',')
    grid(path, cols, rows, outdir, names)

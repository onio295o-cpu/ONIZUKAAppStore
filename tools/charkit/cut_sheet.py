# 生成シート（白背景・マス目）を 1マスずつ 切り分けて、外がわの 白い背景だけ 透明に する。
# 顔やおなかの 白は 線に かこまれているので 残る。
# 使い方: python3 cut_sheet.py <シート.png> <列> <行> <出力フォルダ> <名前1,名前2,...> [--auto]
#   --auto: マス目で 均等に 切らず、1人ずつの 形を 見つけて 切る（髪や 手が マスから はみ出す キャラ向け）
#   --close N: 線の すきまが N px まで なら ふさいでから 背景を ぬる（白い キャラの 中まで 透明に なるのを ふせぐ）
#   例: python3 cut_sheet.py turn.png 4 3 out t000,t030,t060,t090,t240b,t210b,t180,t150b,t270,t300,t330,t000b
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CLOSE = 0
def cutout(im):
    im = im.convert('RGB'); W, H = im.size
    a = np.array(im).astype(int)
    white = a.min(axis=2) > 222
    fill = white
    if CLOSE:   # 線を 太らせて すきまを ふさぎ、ぬったあと 同じだけ 背景を もどす
        dark = Image.fromarray(((a.mean(axis=2) < 200) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * CLOSE + 1))
        fill = white & (np.array(dark) == 0)
    # 端から つながる 白 = 背景（まわり1pxを 白で かこんで そこから ぬる）
    bg = Image.new('L', (W + 2, H + 2), 255); bg.paste(Image.fromarray((fill * 255).astype(np.uint8)), (1, 1))
    ImageDraw.floodfill(bg, (0, 0), 128)
    outside = np.array(bg)[1:-1, 1:-1] == 128
    if CLOSE:
        grow = Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * CLOSE + 3))
        outside = (np.array(grow) > 0) & white
    alpha = np.where(outside, 0, 255).astype(np.uint8)
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

def label(mask):
    # 4近傍の つながりで 番号を ふる（scipy なしの 簡単版）
    H, W = mask.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; st.append((yy, xx))
    return lab, n

def split_touching(m, cell_of):
    # となりの 人と ふれて つながった 形：けずって（細い つなぎ目を 切って）人ごとに 分け、けずった ぶんを 元に もどす。
    # 分けられない ときだけ マスの 線で 切る。
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    mc, cc = m[y0:y1, x0:x1], cell_of[y0:y1, x0:x1]
    for r in range(1, 6):
        e = np.array(Image.fromarray((mc * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * r + 1))) > 0
        lab, n = label(e); area = np.bincount(lab.ravel(), minlength=n + 1)
        big = [i for i in range(1, n + 1) if area[i] >= mc.sum() * .05]
        who = {i: np.bincount(cc[lab == i]).argmax() for i in big}
        if len(set(who.values())) < 2: continue
        own = np.full(mc.shape, -1, np.int32)
        for i in big: own[lab == i] = who[i]
        for _ in range(4 * r + 40):   # けずった ぶんを となりから 少しずつ ぬって もどす
            todo = mc & (own < 0)
            if not todo.any(): break
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb = np.roll(own, (dy, dx), axis=(0, 1)); f = todo & (nb >= 0) & (own < 0); own[f] = nb[f]
        own = np.where(own < 0, cc, own)
        return own[ys - y0, xs - x0]
    return cell_of[m]

def auto(path, cols, rows, outdir, names):
    # 形の つながりで 部品に 分け、部品ごとに 中心が ある マスへ くばる。
    # マスの 線を こえた 髪や 手も、つながっていれば その人の ものに なる。
    # となりの 人と くっついた 部品だけは、マスの 線で 切る。
    os.makedirs(outdir, exist_ok=True)
    full = cutout(Image.open(path)); W, H = full.size
    A = np.array(full.getchannel('A')); cw, ch = W / cols, H / rows
    k = 2; sm = np.array(Image.fromarray(A).resize((W // k, H // k), Image.BOX)) > 30
    lab, n = label(sm)
    owner = np.full(sm.shape, -1, np.int32)
    gy, gx = np.mgrid[0:sm.shape[0], 0:sm.shape[1]]
    cell_of = (np.minimum(gy * k // ch, rows - 1) * cols + np.minimum(gx * k // cw, cols - 1)).astype(np.int32)
    area = np.bincount(lab.ravel(), minlength=n + 1); small_lim = sm.size / (rows * cols) * .06
    for i in range(1, n + 1):
        if area[i] < small_lim: continue   # 小さい 部品（くつ・なみだ・キラキラ）は あとで
        m = lab == i; cells = np.unique(cell_of[m])
        if len(cells) == 1: owner[m] = cells[0]; continue
        # 一番 多くの 面積を もつ マスが 9割以上なら その人の もの
        cnt = np.bincount(cell_of[m], minlength=rows * cols)
        if cnt.max() >= m.sum() * .9: owner[m] = cnt.argmax()
        else: owner[m] = split_touching(m, cell_of)
    # 小さい 部品は マスでなく、いちばん 近い 大きい 部品の 人に くばる（となりの マスに 落ちた くつも 持ち主へ）
    by, bx = np.nonzero(owner >= 0); step = max(1, len(by) // 40000); by, bx = by[::step], bx[::step]
    for i in range(1, n + 1):
        if area[i] >= small_lim: continue
        ys, xs = np.nonzero(lab == i)
        if not len(by): owner[ys, xs] = cell_of[ys, xs]; continue
        q = max(1, len(ys) // 60)
        d = (ys[::q, None] - by[None]) ** 2 + (xs[::q, None] - bx[None]) ** 2
        j = d.min(axis=0).argmin(); owner[ys, xs] = owner[by[j], bx[j]]
    for idx in range(min(len(names), rows * cols)):
        if not names[idx] or names[idx] == '-': continue
        m = Image.fromarray(((owner == idx) * 255).astype(np.uint8)).resize((W, H), Image.NEAREST)
        m = np.array(m.filter(ImageFilter.MaxFilter(3))) > 0
        o = full.copy(); o.putalpha(Image.fromarray(np.where(m, A, 0).astype(np.uint8)))
        bb = o.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bb: print('empty cell', idx); continue
        o = o.crop((max(0, bb[0] - 4), max(0, bb[1] - 4), min(W, bb[2] + 4), min(H, bb[3] + 4)))
        o.save(os.path.join(outdir, names[idx] + '.png'))

if __name__ == '__main__':
    path, cols, rows, outdir, names = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5].split(',')
    if '--close' in sys.argv: CLOSE = int(sys.argv[sys.argv.index('--close') + 1])
    (auto if '--auto' in sys.argv else grid)(path, cols, rows, outdir, names)

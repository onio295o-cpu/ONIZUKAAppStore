# 切り抜いた 絵を WebP に して chars/sheet/<id>.js に まとめる。docs/character-pipeline.md の 4.
# 使い方: python3 pack.py <id> <切り抜きフォルダ>
import sys, os, glob, io, base64, json
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TURN = ['t000', 't030', 't060', 't090', 't120', 't150', 't180', 't210', 't240', 't270', 't300', 't330']
def info(cid):
    for r in open(os.path.join(ROOT, 'tools/charkit/chars.tsv'), encoding='utf-8'):
        f = r.rstrip('\n').split('\t')
        if f[0] == cid: return f
def pack(cid, src, height=260, q=80):
    f = info(cid); frames = {}
    for p in sorted(glob.glob(os.path.join(src, '*.png'))):
        im = Image.open(p).convert('RGBA'); s = min(1, height / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        frames[os.path.basename(p)[:-4]] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    meta = {'name': f[1], 'turn': [t for t in TURN if t in frames], 'special': 'special', 'line': [f[5], f[6]]}
    js = json.dumps(meta, ensure_ascii=False)[:-1] + ', "frames": ' + json.dumps(frames) + '}'
    os.makedirs(os.path.join(ROOT, 'chars/sheet'), exist_ok=True)
    out = os.path.join(ROOT, 'chars/sheet', cid + '.js')
    open(out, 'w', encoding='utf-8').write(f'/* {f[1]}：Codex で 作った シートから 切り抜き（docs/character-pipeline.md） */\n(window.SHEET_CHARS = window.SHEET_CHARS || {{}}).{cid} = {js};\n')
    return out, os.path.getsize(out)
if __name__ == '__main__':
    print(*pack(sys.argv[1], sys.argv[2]))

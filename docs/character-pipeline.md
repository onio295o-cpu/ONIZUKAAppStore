# キャラクター制作の手順（ドラえもん方式）

ドラえもんを作ったときと同じ流れで、新しいキャラをアプリに入れるための手順です。
これを基本の型として、プリキュアなど他のキャラにも使います。

## 全体の流れ

1. Codex（ChatGPT の画像生成）で「シート画像」を作る
   - 回転シート：12方向（30度きざみ）
   - ポーズシート
   - 視点シート：上・下・斜め上
2. シートをマスごとに切り分け、白い背景を透明にする（`tools/charkit/cut_sheet.py`）
3. 切り抜いた絵を目で審査する（崩れ・別キャラ化・はみ出しを確認）
4. WebP に圧縮して `chars/<キャラ>.js` にまとめる
5. `tools/charkit/actor.js`（絵の切りかえアクター）で動かし、ショーやキャラ一覧に入れる
6. ブラウザでショーを再生して、エラーと見た目を確認する

## 0. 準備

- Codex にログインしておく：`codex login --device-auth`（表示された URL とコードで本人がログイン）
- 確認：`codex login status` が `Logged in using ChatGPT` になること

## 1. シート画像を作る

1回の生成で、1枚のシートにまとめて描かせます。1枚ずつ別々に作ると、色や形がバラバラになりやすいためです。

`codex exec --skip-git-repo-check --sandbox workspace-write "<プロンプト>"` で実行します。
元の画像がある場合は `-i 参考画像.png` を付けると、似せやすくなります。

### 回転シート（`<id>_turn.png`）

```
Use your image generation tool to create ONE image: a character turnaround model sheet of <キャラ名・作品名>,
in the clean flat 2D TV-anime cel style with black outlines. Layout: a strict grid of 4 columns x 3 rows on a
pure white background, each cell one full-body character standing in the same neutral pose, same size, feet on
the same baseline, no text, no labels, no shadows, no overlap between cells. The 12 cells show the character
rotating in 30-degree steps, left to right then top to bottom: front (0), 30, 60, 90 (right side profile), 120,
150, 180 (back), 210, 240, 270 (left side profile), 300, 330. Keep proportions and colors identical in every cell.
Save it as <id>_turn.png in the current directory and print the path. If the tool refuses, print the exact refusal message.
```

### ポーズシート（`<id>_poses.png`）

5列×4行・20マスで作ります。ポーズの中身はキャラに合わせて変えます。
例（ドラえもん）：手を振る、大笑い、びっくりジャンプ、泣く、怒る、走る、ダンス、ひみつ道具、どら焼き、考える、勝利、転ぶ、タケコプター、すわる、ねる、指さし、拍手、おじぎ、照れる、こわがる。
プロンプトには「strict grid 5 columns x 4 rows, pure white background, no text, no shadows, no overlap, each pose drawn from the camera angle that shows it best」を必ず入れます。

### 視点シート（`<id>_views.png`）

1行×3マスで作ります：真上から（top）、下から見上げ（low）、斜め上45度（high）。

## 2. 切り分けと背景の透明化

```
python3 -I tools/charkit/cut_sheet.py <シート.png> <列> <行> <出力フォルダ> <名前をカンマ区切り>
```

- 外側の白は透明にし、線で囲まれた中の白（顔・おなか）は残します。
- マスのふちにかかった小さな切れはし（隣のマスのはみ出し）は消します。
- 名前を `-` にしたマスは書き出しません（崩れたマスを捨てるとき用）。

## 3. 審査（ここが一番大事）

全部の絵を1枚に並べた確認画像を作って、目で見ます。次のどれかがあれば、そのマスは捨てるか作り直します。

- 回転の向きが順番どおりでない：生成では向きがよく入れ替わるので、実際の向きを見て名前を付け直す。
  - ドラえもんでは、生成されたマスの向きを見て `t000, t030, t060, t090, t240b, t210b, t180, t150b, t270, t300, t330, t000b` と付け直した。
- 顔・色・服が他のマスと違う（別キャラになっている）
- 背景の白が残っている、または体の白まで抜けている
- 隣のマスの絵が混ざっている
- 文字や記号が入っている

崩れていたら、そのシートだけ作り直します。

## 4. まとめる

- 高さ 400px に縮めて WebP（quality 90）にし、`window.<ID>_FRAMES = {名前: dataURL}` の形で `chars/<id>.js` に書き出します。
- その後ろに `tools/charkit/actor.js` の中身をつなげます。
- 目安の大きさは、1キャラ（35枚）で約 650KB です。

## 5. アプリに入れる

- `index.html` に `<script src="chars/<id>.js"></script>` を足します。
- キャラ一覧（PARTY）に5つのポーズを登録します：`normal / happy / surprised / funny / attack`。
- ショーで使う場合は、`doraShow()` を手本にショー関数を作ります。
  - 登場 → `turn()` で1周 → `pose()` を順番に → 吹き出し、の流れ。
- 絵の切りかえは、アニメと同じくスパッと切りかえて、ぽよんと弾ませてつなぎます（半透明で重ねると、すけて見えて不自然）。

## 6. 確認

- 4歳・5歳それぞれでショーを再生し、`pageerror` が出ないことを確認します。
- 3問続けて正解するとショーが出ることを確認します。
- スマホ用リンク（単一HTML）は 16MB までなので、大きさを確認します。

## たくさんのキャラを作るときの注意

- **容量**：35枚 × 約650KB のままだと、50キャラで約 32MB になり、スマホ用リンク（16MB まで）に入りません。数を増やすときは、1キャラを「回転6方向＋ポーズ8つ」・高さ300px くらいに減らして、1キャラ 150〜200KB に抑えます。
- **生成の回数**：1キャラにつき3回生成します。ChatGPT のプランの使用量を使うので、5キャラずつ区切って進めます。
- **似ているかどうか**：作品やキャラが多いほど、生成した絵が別のキャラに寄りやすくなります。手元の画像を `-i` で渡すと精度が上がります。
- **権利**：既存のキャラクターの絵なので、家族など個人で使う範囲にとどめます。

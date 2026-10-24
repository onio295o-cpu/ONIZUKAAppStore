/* ================================================================
   しこうりょく パズル 2：7つの ゲームの もんだいの 自動生成と 検証（画面とは 切りはなした 純粋な ロジック）
   なかまはずれ(odd)・かがみの せかい(mirror)・じょうけん パズル(logic)・じゅんばん きおく(memory)
   かげあて(shadow)・ブロック つみ(blocks)・かたち あわせ(tangram)
   - どの もんだいも「せいかいが かならず ある」「せいかいが 1つに きまる」ことを 生成時に 検証する
   - ブラウザでは window.Puzzles2。さらに window.Puzzles.generate を つつんで、あたらしい gen は ここで つくる
     （learn/puzzles.js の あとに よみこむ。さきに よまれても Puzzles が できた ときに つつむ）
   - Node（テスト）では module.exports（install(Puzzles) で つつむ）
   ================================================================ */
(function(root){
'use strict';

/* ---------- たね つき 乱数・こまかい どうぐ ---------- */
function rng(seed){ let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ri = (R, n) => Math.floor(R() * n);
const pick = (R, a) => a[ri(R, a.length)];
const shuffle = (R, a) => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = ri(R, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const between = (R, ab) => ab[0] + ri(R, ab[1] - ab[0] + 1);
const range = n => Array.from({length:n}, (_, i) => i);
const J = x => JSON.stringify(x);
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

const COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];
const SHAPES = ['circle', 'triangle', 'square', 'star', 'heart'];
const NAMES = {
  red:'あか', blue:'あお', yellow:'きいろ', green:'みどり', purple:'むらさき',
  circle:'まる', triangle:'さんかく', square:'しかく', star:'ほし', heart:'ハート', diamond:'ひしがた',
  big:'おおきい', small:'ちいさい',
};
const ATTR_NAME = {color:'いろ', shape:'かたち', size:'おおきさ', count:'かず'};

// k マスの つながった かたちを n×n の なかに つくる（[x,y] の ならび）。つくれなければ null
function randCells(R, n, k){
  const cells = [[ri(R, n), ri(R, n)]], has = (x, y) => cells.some(c => c[0] === x && c[1] === y);
  for(let guard = 0; cells.length < k && guard < 600; guard++){
    const [bx, by] = pick(R, cells), d = ri(R, 4), x = bx + DX[d], y = by + DY[d];
    if(x < 0 || y < 0 || x >= n || y >= n || has(x, y)) continue;
    cells.push([x, y]);
  }
  return cells.length === k ? cells : null;
}
function cellsConnected(cs){
  if(!cs.length) return false;
  const set = new Set(cs.map(c => c.join(','))), seen = new Set([cs[0].join(',')]), st = [cs[0]];
  while(st.length){ const [x, y] = st.pop(); for(let d = 0; d < 4; d++){ const k = (x + DX[d]) + ',' + (y + DY[d]); if(set.has(k) && !seen.has(k)){ seen.add(k); st.push([x + DX[d], y + DY[d]]); } } }
  return seen.size === cs.length;
}

/* ================================================================
   ① なかまはずれ：4つの うち 3つが なかま（いろ・かたち・かず・おおきさ・しゅるい）。ちがう 1つを えらぶ
   ================================================================ */
// えもじの なかま（sup＝おおきな なかま。sub どうしの ちがいは おなじ sup の なかで くらべる）
const EMO = {
  fruit:{sup:'food', label:'くだもの', items:[['🍎', 'りんご'], ['🍌', 'バナナ'], ['🍇', 'ぶどう'], ['🍓', 'いちご'], ['🍊', 'みかん'], ['🍑', 'もも'], ['🍒', 'さくらんぼ'], ['🍉', 'すいか'], ['🍍', 'パイナップル'], ['🍋', 'レモン']]},
  veg:{sup:'food', label:'やさい', items:[['🥕', 'にんじん'], ['🥦', 'ブロッコリー'], ['🌽', 'とうもろこし'], ['🥒', 'きゅうり'], ['🍆', 'なす'], ['🥔', 'じゃがいも']]},
  sweets:{sup:'food', label:'おかし', items:[['🍰', 'ケーキ'], ['🍩', 'ドーナツ'], ['🍪', 'クッキー'], ['🍭', 'キャンディ'], ['🍦', 'ソフトクリーム'], ['🍫', 'チョコレート'], ['🍮', 'プリン']]},
  beast:{sup:'life', label:'あしが 4ほんの どうぶつ', easy:'どうぶつ', items:[['🐶', 'いぬ'], ['🐱', 'ねこ'], ['🐰', 'うさぎ'], ['🐻', 'くま'], ['🐼', 'パンダ'], ['🦁', 'ライオン'], ['🐯', 'とら'], ['🐘', 'ぞう'], ['🦒', 'キリン'], ['🐮', 'うし'], ['🐷', 'ぶた'], ['🐴', 'うま']]},
  bird:{sup:'life', label:'とり', items:[['🐦', 'ことり'], ['🦉', 'ふくろう'], ['🦆', 'あひる'], ['🐓', 'にわとり'], ['🦜', 'オウム'], ['🦅', 'わし'], ['🐤', 'ひよこ']]},
  bug:{sup:'life', label:'むし', items:[['🐞', 'てんとうむし'], ['🦋', 'ちょうちょ'], ['🐝', 'はち'], ['🐜', 'あり'], ['🐛', 'いもむし'], ['🦗', 'こおろぎ']]},
  sea:{sup:'life', label:'みずの なかの いきもの', items:[['🐟', 'さかな'], ['🐠', 'ねったいぎょ'], ['🐡', 'ふぐ'], ['🐙', 'たこ'], ['🦀', 'かに'], ['🦑', 'いか'], ['🐬', 'イルカ'], ['🐳', 'くじら']]},
  road:{sup:'ride', label:'みちを はしる のりもの', easy:'のりもの', items:[['🚗', 'くるま'], ['🚌', 'バス'], ['🚒', 'しょうぼうしゃ'], ['🚓', 'パトカー'], ['🚕', 'タクシー'], ['🚚', 'トラック'], ['🚜', 'トラクター']]},
  sky:{sup:'ride', label:'そらを とぶ のりもの', items:[['✈️', 'ひこうき'], ['🚁', 'ヘリコプター'], ['🛩️', 'ちいさな ひこうき'], ['🚀', 'ロケット']]},
  boat:{sup:'ride', label:'みずの うえを すすむ のりもの', items:[['🚢', 'ふね'], ['⛵', 'ヨット'], ['🚤', 'ボート'], ['🛶', 'カヌー']]},
  clothes:{sup:'wear', label:'みに つける もの', items:[['👕', 'シャツ'], ['👗', 'ワンピース'], ['👖', 'ズボン'], ['🧢', 'ぼうし'], ['🧦', 'くつした'], ['👟', 'くつ'], ['🧤', 'てぶくろ']]},
};
const ODD_EASY = ['fruit', 'beast', 'road', 'clothes', 'sweets'];   // 4さい：おおきく ちがう なかま
const ODD_LV = {
  1:{kind:'shape', split:['color', 'shape'], attrs:{color:'distinct', shape:'distinct'}},
  2:{kind:'emoji', mode:'super'},
  3:{kind:'shape', split:['color', 'shape', 'count'], attrs:{color:'distinct', shape:'distinct'}},
  4:{kind:'emoji', mode:'sub', sups:['food', 'ride']},
  5:{kind:'emoji', mode:'sub', sups:['life']},
  6:{kind:'shape', split:['color', 'shape', 'count', 'size'], attrs:{color:'mixed', shape:'mixed', count:'mixed', size:'mixed'}},
};
const ODD_POOL = {color:COLORS, shape:SHAPES, count:[1, 2, 3], size:['big', 'small']};
const ODD_PATTERNS = {color:['2-2', '2-1-1', 'distinct'], shape:['2-2', '2-1-1', 'distinct'], count:['2-2', '2-1-1'], size:['2-2', 'same']};
const ODD_BASE = {color:'red', shape:'circle', count:1, size:'big'};
const ODD_ATTRS = ['color', 'shape', 'count', 'size'];
const oddItemKey = it => `${it.color}|${it.shape}|${it.count}|${it.size}`;
function spread(R, pattern, pool){
  const p = shuffle(R, pool);
  const v = pattern === 'same' ? [p[0], p[0], p[0], p[0]] : pattern === 'distinct' ? p.slice(0, 4) : pattern === '2-2' ? [p[0], p[0], p[1], p[1]] : [p[0], p[0], p[1], p[2]];
  return shuffle(R, v);
}
// それぞれの ぞくせいで「3つ おなじ・1つ ちがう」に なっている ものを さがす → {ぞくせい: ちがう ものの ばんごう}
function oddSplits(items, attrs = ODD_ATTRS){
  const by = {};
  for(const a of attrs){
    const cnt = new Map(); items.forEach(it => cnt.set(it[a], (cnt.get(it[a]) || 0) + 1));
    if(cnt.size !== 2) continue;
    const e = [...cnt.entries()], single = e.find(x => x[1] === 1);
    if(single && e.some(x => x[1] === 3)) by[a] = items.findIndex(it => it[a] === single[0]);
  }
  return by;
}
function genOdd(R, level){
  const L = ODD_LV[level] || ODD_LV[1];
  for(let tries = 0; tries < 400; tries++){
    let q;
    if(L.kind === 'shape'){
      const A = pick(R, L.split), p = ri(R, 4), items = range(4).map(() => Object.assign({}, ODD_BASE));
      const [m, o] = shuffle(R, ODD_POOL[A]);
      items.forEach((it, i) => it[A] = i === p ? o : m);
      for(const [B, spec] of Object.entries(L.attrs)){
        if(B === A) continue;
        spread(R, spec === 'mixed' ? pick(R, ODD_PATTERNS[B]) : spec, ODD_POOL[B]).forEach((v, i) => items[i][B] = v);
      }
      // おおきさと かずが どちらも かわると、ちいさい 1こが おおきい 3この ものより おおきく みえて まぎらわしい
      if(new Set(items.map(x => x.size)).size > 1 && new Set(items.map(x => x.count)).size > 1) continue;
      q = {t:'odd', level, kind:'shape', items, ans:p, attr:A, maj:m, odd:o};
      q.sig = 'od:' + items.map(oddItemKey).join(',');
    }else{
      let gm, go;
      if(L.mode === 'super'){ gm = pick(R, ODD_EASY); go = pick(R, ODD_EASY.filter(g => EMO[g].sup !== EMO[gm].sup)); }
      else { const sup = pick(R, L.sups); [gm, go] = shuffle(R, Object.keys(EMO).filter(g => EMO[g].sup === sup)); }
      const mk = (g, [e, n]) => ({e, n, g});
      const items = shuffle(R, EMO[gm].items).slice(0, 3).map(x => mk(gm, x)), p = ri(R, 4);
      items.splice(p, 0, mk(go, pick(R, EMO[go].items)));
      const lab = g => L.mode === 'super' ? (EMO[g].easy || EMO[g].label) : EMO[g].label;
      q = {t:'odd', level, kind:'emoji', mode:L.mode, items, ans:p, majLabel:lab(gm), oddLabel:lab(go)};
      q.sig = 'od:' + items.map(x => x.e).join('');
    }
    if(verifyOdd(q).ok) return q;
  }
  throw new Error('odd: 生成できませんでした ' + level);
}
function verifyOdd(q){
  if(!q.items || q.items.length !== 4) return {ok:false};
  if(q.kind === 'shape'){
    if(new Set(q.items.map(oddItemKey)).size !== 4) return {ok:false, why:'same items'};
    const by = oddSplits(q.items), ks = Object.keys(by);
    return {ok:ks.length === 1 && ks[0] === q.attr && by[q.attr] === q.ans, by};
  }
  if(new Set(q.items.map(x => x.e)).size !== 4) return {ok:false, why:'same emoji'};
  const by = oddSplits(q.items, ['g']);
  if(by.g !== q.ans) return {ok:false};
  const gOdd = q.items[q.ans].g, gMaj = q.items[(q.ans + 1) % 4].g;
  const sameSup = EMO[gOdd].sup === EMO[gMaj].sup;
  return {ok:q.mode === 'super' ? !sameSup : sameSup};
}
function describeOdd(q){
  if(q.kind === 'emoji'){ const others = q.items.filter((_, i) => i !== q.ans).map(x => x.n); return `${others.join('、')}は ${q.majLabel}。${q.items[q.ans].n}は ${q.oddLabel} だよ`; }
  const v = x => q.attr === 'count' ? `${x}こ` : NAMES[x];
  return `ほかの 3つは みんな ${v(q.maj)}。これだけ ${v(q.odd)} だよ`;
}

/* ================================================================
   ② かがみの せかい：ます目の もようを かがみ（みぎがわ）／みず（したがわ）に うつした ものを えらぶ
   ひっかけ：もとの まま・はんたいむきの うつしかた・まわした もの・1マス ちがう もの
   ================================================================ */
const MIR_LV = {
  1:{n:3, cells:[3, 3], colors:1, traps:['orig', 'alter'], fixed:true},
  2:{n:3, cells:[4, 4], colors:2, traps:['orig', 'flip2', 'alter']},
  3:{n:4, cells:[4, 5], colors:2, traps:['orig', 'flip2', 'alter', 'rot']},
  4:{n:4, cells:[5, 6], colors:2, traps:['flip2', 'rot', 'alter', 'orig']},
  5:{n:5, cells:[6, 7], colors:3, traps:['flip2', 'rot', 'alter', 'orig']},
  6:{n:5, cells:[7, 8], colors:3, traps:['flip2', 'rot', 'alter', 'orig'], ud:.5},
};
const gKey = g => g.map(r => r.join('')).join('/');
const flipLR = g => g.map(r => r.slice().reverse());
const flipUD = g => g.slice().reverse().map(r => r.slice());
const rot90 = g => { const n = g.length; return range(n).map(y => range(n).map(x => g[n - 1 - x][y])); };   // みぎまわり
function alterGrid(R, g, colors){
  const n = g.length, d = g.map(r => r.slice()), full = [], empty = [];
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) (d[y][x] ? full : empty).push([x, y]);
  if(colors > 1 && R() < .45){ const [x, y] = pick(R, full); d[y][x] = pick(R, range(colors).map(i => i + 1).filter(c => c !== d[y][x])); return d; }
  const [fx, fy] = pick(R, full), near = empty.filter(([x, y]) => full.some(([a, b]) => !(a === fx && b === fy) && Math.abs(a - x) + Math.abs(b - y) === 1));
  if(!near.length) return d;
  const [ex, ey] = pick(R, near); d[ey][ex] = d[fy][fx]; d[fy][fx] = 0;
  return d;
}
function genMirror(R, level, opt = {}){
  const L = MIR_LV[level] || MIR_LV[1], nCh = opt.choices || 3, n = L.n;
  for(let tries = 0; tries < 400; tries++){
    const cells = randCells(R, n, between(R, L.cells)); if(!cells) continue;
    const g = range(n).map(() => Array(n).fill(0));
    cells.forEach(([x, y]) => g[y][x] = 1 + ri(R, L.colors));
    if(L.colors > 1 && new Set(cells.map(([x, y]) => g[y][x])).size < 2) continue;
    const axis = L.ud && R() < L.ud ? 'ud' : 'lr', flip = axis === 'lr' ? flipLR : flipUD, other = axis === 'lr' ? flipUD : flipLR;
    const answer = flip(g), ak = gKey(answer);
    if(ak === gKey(g)) continue;                                  // うつしても おなじ もようは つかわない
    const ch = [answer], ks = new Set([ak]);
    const add = d => { const k = gKey(d); if(ks.has(k)) return false; ks.add(k); ch.push(d); return true; };
    for(const t of (L.fixed ? L.traps : shuffle(R, L.traps))){
      if(ch.length >= nCh) break;
      if(t === 'orig') add(g);
      else if(t === 'flip2') add(other(g));
      else if(t === 'rot'){ const r1 = rot90(g); add(pick(R, [r1, rot90(r1), rot90(rot90(r1))])); }
      else add(alterGrid(R, answer, L.colors));
    }
    for(let t = 0; t < 60 && ch.length < nCh; t++) add(alterGrid(R, answer, L.colors));
    if(ch.length < nCh) continue;
    const q = {t:'mirror', level, n, axis, base:g, choices:shuffle(R, ch)};
    q.ans = q.choices.findIndex(c => gKey(c) === ak);
    q.traps = {orig:q.choices.some(c => gKey(c) === gKey(g))};
    if(!verifyMirror(q).ok) continue;
    q.sig = 'mr:' + axis + ':' + gKey(g);
    return q;
  }
  throw new Error('mirror: 生成できませんでした ' + level);
}
function verifyMirror(q){
  const target = gKey(q.axis === 'ud' ? flipUD(q.base) : flipLR(q.base));
  if(target === gKey(q.base)) return {ok:false};
  const ks = q.choices.map(gKey), okIdx = ks.map((k, i) => k === target ? i : -1).filter(i => i >= 0);
  return {ok:okIdx.length === 1 && okIdx[0] === q.ans && new Set(ks).size === ks.length, okIdx};
}

/* ================================================================
   ③ じょうけん パズル
   attr ：「あかい まるは どれ？」（2〜3つの じょうけん・「〜では ない」）
   carry：「ふうせんを もっている ねこは どれ？」
   house：どうぶつの いえ（3〜4けん）。ヒントに ぜんぶ あう ならびかたが 1つだけ に なるように つくる
   ================================================================ */
const LOG_LV = {
  1:{kind:'attr', sets:[['color', 'shape']]},
  2:{kind:'carry'},
  3:{kind:'attr', sets:[['size', 'color', 'shape']]},
  4:{kind:'attr', sets:[['color', 'shape']], neg:true},
  5:{kind:'house', n:3, clues:[2, 3]},
  6:{kind:'house', n:4, clues:[3, 4]},
};
const LOG_POOL = {color:COLORS, shape:SHAPES, size:['big', 'small']};
const COLOR_ADJ = {red:'あかい', blue:'あおい', yellow:'きいろい', green:'みどりの', purple:'むらさきの'};
const CARRY_ANIMALS = [['🐶', 'いぬ'], ['🐱', 'ねこ'], ['🐰', 'うさぎ'], ['🐻', 'くま'], ['🐼', 'パンダ'], ['🐷', 'ぶた']];
const CARRY_HELD = [['🎈', 'ふうせん'], ['🌂', 'かさ'], ['🍦', 'ソフトクリーム'], ['🎁', 'プレゼント'], ['🌻', 'ひまわり'], ['⚽', 'ボール']];
const HOUSE_ANIMALS = [['🐶', 'いぬ'], ['🐱', 'ねこ'], ['🐰', 'うさぎ'], ['🐻', 'くま'], ['🐼', 'パンダ'], ['🐷', 'ぶた'], ['🦊', 'きつね'], ['🐵', 'さる']];
const satCond = (it, c) => c.neg ? it[c.a] !== c.v : it[c.a] === c.v;
function condText(conds){
  const by = {}; conds.forEach(c => by[c.a] = c);
  const neg = conds.find(c => c.neg);
  if(neg) return neg.a === 'shape' ? `${NAMES[neg.v]} では ない ${COLOR_ADJ[by.color.v]} ものは どれ？` : `${NAMES[neg.v]} では ない ${NAMES[by.shape.v]}は どれ？`;
  const parts = [];
  if(by.size) parts.push(NAMES[by.size.v]);
  if(by.color) parts.push(COLOR_ADJ[by.color.v]);
  parts.push(by.shape ? NAMES[by.shape.v] : 'もの');
  return parts.join(' ') + 'は どれ？';
}
const logicItemKey = it => J(it);
function genLogicAttr(R, L, level, nCh){
  for(let tries = 0; tries < 300; tries++){
    const attrs = pick(R, L.sets), negA = L.neg ? pick(R, attrs) : null;
    const conds = attrs.map(a => ({a, v:pick(R, LOG_POOL[a]), neg:a === negA}));
    const make = bad => {
      const it = {color:'red', shape:'circle', size:'big'};
      for(const c of conds){ const differ = c.neg ? !bad.includes(c.a) : bad.includes(c.a); it[c.a] = differ ? pick(R, LOG_POOL[c.a].filter(x => x !== c.v)) : c.v; }
      return it;
    };
    const answer = make([]), ch = [answer], ks = new Set([logicItemKey(answer)]);
    const add = it => { const k = logicItemKey(it); if(ks.has(k)) return; ks.add(k); ch.push(it); };
    for(const c of shuffle(R, conds)){ if(ch.length >= nCh) break; add(make([c.a])); }
    for(let t = 0; t < 40 && ch.length < nCh; t++) add(make(shuffle(R, attrs).slice(0, 2)));
    if(ch.length < nCh) continue;
    const q = {t:'logic', level, kind:'attr', conds, text:condText(conds), choices:shuffle(R, ch)};
    q.ans = q.choices.indexOf(answer);
    if(!verifyLogic(q).ok) continue;
    q.sig = 'lg:' + J(conds) + J(q.choices);
    return q;
  }
  throw new Error('logic: 生成できませんでした ' + level);
}
function genLogicCarry(R, level, nCh){
  for(let tries = 0; tries < 100; tries++){
    const [a1, a2] = shuffle(R, CARRY_ANIMALS), [h1, h2] = shuffle(R, CARRY_HELD);
    const it = (a, h) => ({a:a[0], an:a[1], h:h[0], hn:h[1]});
    const answer = it(a1, h1), ch = [answer, it(a1, h2), it(a2, h1), it(a2, h2)].slice(0, nCh);
    const conds = [{a:'a', v:a1[0]}, {a:'h', v:h1[0]}];
    const q = {t:'logic', level, kind:'carry', conds, text:`${h1[1]}を もっている ${a1[1]}は どれ？`, choices:shuffle(R, ch)};
    q.ans = q.choices.indexOf(answer);
    if(!verifyLogic(q).ok) continue;
    q.sig = 'lg:c:' + q.choices.map(x => x.a + x.h).join('');
    return q;
  }
  throw new Error('logic: 生成できませんでした ' + level);
}
// どうぶつの いえ。P[a] = どうぶつ a の いえ（ひだりから 0,1,2…）
function perms(n){ const out = []; const rec = (a, rest) => { if(!rest.length){ out.push(a); return; } rest.forEach((x, i) => rec(a.concat([x]), rest.filter((_, j) => j !== i))); }; rec([], range(n)); return out; }
function evalClue(c, P, n){
  const a = P[c.a], b = c.b != null ? P[c.b] : null;
  switch(c.k){
    case 'pos': return a === c.p;
    case 'notpos': return a !== c.p;
    case 'end': return a === 0 || a === n - 1;
    case 'notend': return a !== 0 && a !== n - 1;
    case 'right1': return a === b + 1;
    case 'left1': return a === b - 1;
    case 'right': return a > b;
    case 'left': return a < b;
    case 'next': return Math.abs(a - b) === 1;
    case 'notnext': return Math.abs(a - b) !== 1;
  }
  return false;
}
function allClues(n){
  const out = [];
  for(let a = 0; a < n; a++){
    for(let p = 0; p < n; p++) out.push({k:'pos', a, p}, {k:'notpos', a, p});
    out.push({k:'end', a}); if(n >= 4) out.push({k:'notend', a});
    for(let b = 0; b < n; b++){
      if(a === b) continue;
      out.push({k:'right1', a, b}, {k:'left1', a, b}, {k:'right', a, b}, {k:'left', a, b});
      if(a < b){ out.push({k:'next', a, b}); if(n >= 4) out.push({k:'notnext', a, b}); }
    }
  }
  return out;
}
const solveHouse = (clues, n) => perms(n).filter(P => clues.every(c => evalClue(c, P, n)));
const posName = (p, n) => n === 3 ? ['ひだり', 'まんなか', 'みぎ'][p] : `ひだりから ${p + 1}ばんめ`;
function clueText(c, animals, n, emoji){
  const nm = i => emoji ? animals[i].e + animals[i].n : animals[i].n, A = nm(c.a), B = c.b != null ? nm(c.b) : '';
  switch(c.k){
    case 'pos': return `${A}は ${posName(c.p, n)}の いえ`;
    case 'notpos': return `${A}は ${posName(c.p, n)}の いえ では ない`;
    case 'end': return `${A}は はしっこの いえ`;
    case 'notend': return `${A}は はしっこの いえ では ない`;
    case 'right1': return `${A}は ${B}の すぐ みぎ`;
    case 'left1': return `${A}は ${B}の すぐ ひだり`;
    case 'right': return `${A}は ${B}より みぎ`;
    case 'left': return `${A}は ${B}より ひだり`;
    case 'next': return `${A}と ${B}は となりどうし`;
    case 'notnext': return `${A}と ${B}は となりでは ない`;
  }
  return '';
}
function genHouse(R, L, level){
  const n = L.n, all = allClues(n), PS = perms(n);
  for(let tries = 0; tries < 600; tries++){
    const animals = shuffle(R, HOUSE_ANIMALS).slice(0, n).map(([e, nm]) => ({e, n:nm}));
    const sol = pick(R, PS);
    let rest = PS, set = [];
    for(const c of shuffle(R, all.filter(c => evalClue(c, sol, n)))){
      if(c.k === 'pos' && (set.some(x => x.k === 'pos') || R() < .6)) continue;   // 「〜は 〜の いえ」は すくなめ
      const next = rest.filter(P => evalClue(c, P, n));
      if(next.length === rest.length) continue;
      set.push(c); rest = next;
      if(rest.length === 1) break;
    }
    if(rest.length !== 1) continue;
    for(let i = set.length - 1; i >= 0; i--){ const s2 = set.filter((_, j) => j !== i); if(solveHouse(s2, n).length === 1) set = s2; }   // むだな ヒントを けす
    if(set.length < L.clues[0] || set.length > L.clues[1]) continue;
    const direct = new Set(set.filter(c => c.k === 'pos').map(c => c.a)), askable = range(n).filter(a => !direct.has(a));
    if(!askable.length) continue;
    const a = pick(R, askable), who = R() < .5;
    const ask = who ? {k:'who', h:sol[a]} : {k:'where', a};
    let key = 0, best = Infinity;
    set.forEach((c, i) => { const m = PS.filter(P => evalClue(c, P, n)).length; if(m < best){ best = m; key = i; } });
    const clues = set.map(c => Object.assign({}, c, {text:clueText(c, animals, n, true), say:clueText(c, animals, n, false)}));
    const q = {t:'logic', level, kind:'house', n, animals, clues, sol, ask, choices:range(n), ans:who ? a : sol[a], key,
      text:who ? `${posName(sol[a], n)}の いえに すんでいるのは だれ？` : `${animals[a].n}は どの いえに すんでいる？`};
    if(!verifyLogic(q).ok) continue;
    q.sig = 'lg:h:' + animals.map(x => x.e).join('') + J(set) + J(ask);
    return q;
  }
  throw new Error('logic: 生成できませんでした ' + level);
}
function genLogic(R, level, opt = {}){
  const L = LOG_LV[level] || LOG_LV[1], nCh = opt.choices || 3;
  if(L.kind === 'carry') return genLogicCarry(R, level, nCh);
  if(L.kind === 'house') return genHouse(R, L, level);
  return genLogicAttr(R, L, level, nCh);
}
function verifyLogic(q){
  if(q.kind === 'house'){
    const sols = solveHouse(q.clues, q.n);
    if(sols.length !== 1 || J(sols[0]) !== J(q.sol)) return {ok:false};
    const right = q.ask.k === 'where' ? q.sol[q.ask.a] : q.sol.indexOf(q.ask.h);
    return {ok:q.choices[q.ans] === right && new Set(q.choices).size === q.choices.length};
  }
  const okIdx = q.choices.map((it, i) => q.conds.every(c => satCond(it, c)) ? i : -1).filter(i => i >= 0);
  const uniq = new Set(q.choices.map(logicItemKey)).size === q.choices.length;
  return {ok:okIdx.length === 1 && okIdx[0] === q.ans && uniq, okIdx};
}
function describeLogic(q){
  if(q.kind === 'house'){
    const at = range(q.n).map(h => q.animals[q.sol.indexOf(h)].n);
    const line = q.n === 3 ? `ひだりは ${at[0]}、まんなかは ${at[1]}、みぎは ${at[2]}` : `ひだりから ${at.join('、')}`;
    const ansWord = q.ask.k === 'where' ? `${posName(q.choices[q.ans], q.n)}の いえ` : q.animals[q.ans].n;
    return `${line}。どの ヒントにも あうのは この ならびかた だけ。だから こたえは ${ansWord}`;
  }
  if(q.kind === 'carry'){ const a = q.choices[q.ans]; return `${a.hn}を もっている ${a.an}は これ だけ。ほかは どうぶつか もっている ものが ちがうよ`; }
  const words = [...new Set(q.conds.map(c => ATTR_NAME[c.a]))];
  const head = q.text.replace(/は どれ？$/, '');
  return `${head}は これ だけ。ほかは ${words.join('か ')}が あわないよ`;
}

/* ================================================================
   ④ じゅんばん きおく：えが 1つずつ でてくる → おなじ じゅんばんに タップ
   ================================================================ */
const MEM_THEMES = {
  animal:[['🐶', 'いぬ'], ['🐱', 'ねこ'], ['🐰', 'うさぎ'], ['🐻', 'くま'], ['🐼', 'パンダ'], ['🐸', 'かえる'], ['🐵', 'さる'], ['🐷', 'ぶた'], ['🦁', 'ライオン'], ['🐘', 'ぞう']],
  fruit:[['🍎', 'りんご'], ['🍌', 'バナナ'], ['🍇', 'ぶどう'], ['🍓', 'いちご'], ['🍊', 'みかん'], ['🍑', 'もも'], ['🍉', 'すいか'], ['🍒', 'さくらんぼ']],
  ride:[['🚗', 'くるま'], ['🚌', 'バス'], ['🚒', 'しょうぼうしゃ'], ['🚀', 'ロケット'], ['🚲', 'じてんしゃ'], ['🚂', 'きしゃ'], ['🚁', 'ヘリコプター'], ['⛵', 'ヨット']],
};
const MEM_LV = {
  1:{len:3, pal:4, ms:1100, theme:'mix'},
  2:{len:4, pal:4, ms:1100, theme:'mix'},
  3:{len:4, pal:5, ms:1000},
  4:{len:5, pal:5, ms:950},
  5:{len:5, pal:6, ms:900, rep:[1, 1]},
  6:{len:6, pal:6, ms:850, rep:[1, 2]},
};
function genMemory(R, level){
  const L = MEM_LV[level] || MEM_LV[1];
  for(let tries = 0; tries < 300; tries++){
    let pal;
    if(L.theme === 'mix'){ const all = [].concat(...Object.values(MEM_THEMES)); pal = shuffle(R, all).slice(0, L.pal); }
    else pal = shuffle(R, MEM_THEMES[pick(R, Object.keys(MEM_THEMES))]).slice(0, L.pal);
    let seq;
    if(!L.rep) seq = shuffle(R, range(L.pal)).slice(0, L.len);
    else { seq = []; for(let i = 0; i < L.len; i++) seq.push(pick(R, range(L.pal).filter(v => v !== seq[i - 1]))); }
    const q = {t:'memory', level, pal:pal.map(([e, n]) => ({e, n})), seq, ms:L.ms, rep:!!L.rep};
    if(!verifyMemory(q).ok) continue;
    q.sig = 'me:' + q.pal.map(x => x.e).join('') + ':' + seq.join('');
    return q;
  }
  throw new Error('memory: 生成できませんでした ' + level);
}
function verifyMemory(q){
  const L = MEM_LV[q.level] || MEM_LV[1], s = q.seq;
  if(s.length !== L.len || q.pal.length !== L.pal || new Set(q.pal.map(x => x.e)).size !== q.pal.length) return {ok:false};
  if(s.some((v, i) => !(v >= 0 && v < q.pal.length) || (i && v === s[i - 1]))) return {ok:false};   // となりどうし おなじ だと 1つに みえる
  const repeats = s.length - new Set(s).size;
  return {ok:L.rep ? repeats >= L.rep[0] && repeats <= L.rep[1] : repeats === 0};
}

/* ================================================================
   ⑤ かげあて：くろい かげと おなじ かたちの ものを えらぶ
   emoji：えもじの かげ（4さい） / comp：かたちを くみあわせた もの（5〜6さい）
   comp は かげを ラスタ（50×50）に して くらべ、せいかい いがいは はっきり ちがう ことを たしかめる
   ================================================================ */
const SH_EMOJI = {
  mix:[['🍎', 'りんご'], ['🍌', 'バナナ'], ['🐘', 'ぞう'], ['🦒', 'キリン'], ['🚗', 'くるま'], ['🚀', 'ロケット'], ['🌂', 'かさ'], ['⭐', 'ほし'], ['🐟', 'さかな'], ['🦋', 'ちょうちょ'], ['🍄', 'きのこ'], ['🎸', 'ギター'], ['🐌', 'かたつむり'], ['🌵', 'サボテン'], ['🔑', 'かぎ'], ['⏰', 'めざましどけい'], ['🚲', 'じてんしゃ'], ['🐢', 'かめ']],
  animal:[['🐘', 'ぞう'], ['🦒', 'キリン'], ['🐎', 'うま'], ['🐄', 'うし'], ['🐖', 'ぶた'], ['🐕', 'いぬ'], ['🐈', 'ねこ'], ['🐇', 'うさぎ'], ['🦔', 'はりねずみ'], ['🐢', 'かめ'], ['🐊', 'わに'], ['🦕', 'きょうりゅう'], ['🐓', 'にわとり'], ['🦆', 'あひる'], ['🐪', 'らくだ'], ['🦘', 'カンガルー'], ['🦏', 'さい'], ['🐁', 'ねずみ']],
};
const SH_LV = {
  1:{kind:'emoji', set:'mix'},
  2:{kind:'emoji', set:'animal'},
  3:{kind:'comp', parts:2, ops:['shape', 'move', 'size'], sizes:[17]},
  4:{kind:'comp', parts:3, ops:['shape', 'move', 'swap'], sizes:[16]},
  5:{kind:'comp', parts:3, ops:['shape', 'move', 'swap', 'size'], sizes:[13, 18], flip:true, mirror:true},
  6:{kind:'comp', parts:4, ops:['shape', 'move', 'size', 'swap'], sizes:[13, 17], flip:true, mirror:true},
};
const SH_ANCH = [26, 50, 74];
const SH_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
const SH_TH = 24;   // ラスタで これだけ ちがえば「ちがう かげ」と みなす（50×50 の うち）
const UNIT = (() => {
  const circle = range(32).map(i => { const a = i / 32 * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
  const star = range(10).map(i => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .45 : 1; return [r * Math.cos(a), r * Math.sin(a)]; });
  const heart = range(36).map(i => { const t = i / 36 * Math.PI * 2, e = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [16 * Math.sin(t) ** 3 / 16 * .95, -(e + 2.6) / 14.4 * .95]; });
  return {circle, star, heart, square:[[-.85, -.85], [.85, -.85], [.85, .85], [-.85, .85]], triangle:[[0, -1], [1, .78], [-1, .78]], diamond:[[0, -1], [.8, 0], [0, 1], [-.8, 0]]};
})();
// 1つの パーツ {s, x, y, r, rot} を 0〜100 の ざひょうの たかっけいに
function partPoly(p){
  const c = Math.cos((p.rot || 0) * Math.PI / 180), s = Math.sin((p.rot || 0) * Math.PI / 180);
  return UNIT[p.s].map(([u, v]) => [+(p.x + p.r * (u * c - v * s)).toFixed(2), +(p.y + p.r * (u * s + v * c)).toFixed(2)]);
}
function inPoly(x, y, P){ let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const [xi, yi] = P[i], [xj, yj] = P[j]; if((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const partCache = new Map();
function partRaster(p, res){
  const k = `${p.s},${p.x},${p.y},${p.r},${p.rot || 0},${res}`;
  let out = partCache.get(k); if(out) return out;
  const P = partPoly(p), xs = P.map(q => q[0]), ys = P.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  out = new Uint8Array(res * res);
  for(let j = Math.max(0, Math.floor(y0 * res / 100) - 1); j < Math.min(res, Math.ceil(y1 * res / 100) + 1); j++)
    for(let i = Math.max(0, Math.floor(x0 * res / 100) - 1); i < Math.min(res, Math.ceil(x1 * res / 100) + 1); i++){
      const x = (i + .5) * 100 / res, y = (j + .5) * 100 / res;
      if(x >= x0 && x <= x1 && y >= y0 && y <= y1 && inPoly(x, y, P)) out[j * res + i] = 1;
    }
  if(partCache.size > 3000) partCache.clear();
  partCache.set(k, out);
  return out;
}
function raster(parts, res = 50){
  const out = new Uint8Array(res * res);
  for(const p of parts){ const r = partRaster(p, res); for(let i = 0; i < out.length; i++) out[i] |= r[i]; }
  return out;
}
const rdiff = (a, b) => { let d = 0; for(let i = 0; i < a.length; i++) if(a[i] !== b[i]) d++; return d; };
const anchorOf = p => [SH_ANCH.indexOf(p.x), SH_ANCH.indexOf(p.y)];
const geo = p => ({s:p.s, x:p.x, y:p.y, r:p.r, rot:p.rot || 0});
function shapeOp(R, L, base, op){
  const d = base.map(geo), i = ri(R, d.length);
  if(op === 'shape'){ d[i].s = pick(R, SH_SHAPES.filter(s => s !== d[i].s)); d[i].rot = 0; return d; }
  if(op === 'size'){ d[i].r = d[i].r >= 16 ? d[i].r - 6 : d[i].r + 6; return d; }
  if(op === 'mirror') return d.map(p => Object.assign(p, {x:100 - p.x}));
  if(op === 'swap'){ const js = range(d.length).filter(j => d[j].s !== d[i].s); if(!js.length) return null; const j = pick(R, js); [d[i].s, d[j].s] = [d[j].s, d[i].s]; [d[i].rot, d[j].rot] = [d[j].rot, d[i].rot]; return d; }
  // move：ほかの パーツの となりの あいている ばしょへ
  const used = d.map(anchorOf), free = [];
  for(let ay = 0; ay < 3; ay++) for(let ax = 0; ax < 3; ax++){
    if(used.some(([x, y]) => x === ax && y === ay)) continue;
    if(used.some(([x, y], j) => j !== i && Math.abs(x - ax) + Math.abs(y - ay) === 1)) free.push([ax, ay]);
  }
  if(!free.length) return null;
  const [ax, ay] = pick(R, free); d[i].x = SH_ANCH[ax]; d[i].y = SH_ANCH[ay];
  return d;
}
const colorize = (R, parts) => { const cs = shuffle(R, COLORS); return parts.map((p, i) => Object.assign(geo(p), {c:cs[i % cs.length]})); };
function genShadow(R, level, opt = {}){
  const L = SH_LV[level] || SH_LV[1], nCh = opt.choices || 3;
  if(L.kind === 'emoji'){
    const ch = shuffle(R, SH_EMOJI[L.set]).slice(0, nCh).map(([e, n]) => ({e, n})), ans = ri(R, nCh);
    const q = {t:'shadow', level, kind:'emoji', shadow:ch[ans].e, choices:ch, ans};
    q.sig = 'sh:' + ch.map(x => x.e).join('') + ans;
    if(verifyShadow(q).ok) return q;
    throw new Error('shadow: 生成できませんでした ' + level);
  }
  for(let tries = 0; tries < 400; tries++){
    const cells = randCells(R, 3, L.parts); if(!cells) continue;
    const parts = cells.map(([ax, ay]) => { const s = pick(R, SH_SHAPES); return {s, x:SH_ANCH[ax], y:SH_ANCH[ay], r:pick(R, L.sizes), rot:L.flip && (s === 'triangle' || s === 'heart') && R() < .5 ? 180 : 0}; });
    const B = raster(parts);
    if(parts.some((_, i) => rdiff(B, raster(parts.filter((__, j) => j !== i))) < 20)) continue;   // かくれて みえない パーツは だめ
    const geoms = [parts], rs = [B];
    const tryAdd = d => { if(!d) return false; const r = raster(d); if(rs.some(x => rdiff(x, r) < SH_TH)) return false; geoms.push(d); rs.push(r); return true; };
    if(L.mirror && !tryAdd(shapeOp(R, L, parts, 'mirror'))) continue;   // むきの ひっかけが つくれない かたちは つかわない
    for(let t = 0; t < 80 && geoms.length < nCh; t++) tryAdd(shapeOp(R, L, parts, pick(R, L.ops)));
    if(geoms.length < nCh) continue;
    const order = shuffle(R, range(nCh));
    const q = {t:'shadow', level, kind:'comp', parts:parts.map(geo), choices:order.map(k => colorize(R, geoms[k])), ans:order.indexOf(0), mirror:!!L.mirror};
    if(!verifyShadow(q).ok) continue;
    q.sig = 'sh:' + J(q.parts);
    return q;
  }
  throw new Error('shadow: 生成できませんでした ' + level);
}
function verifyShadow(q){
  if(q.kind === 'emoji'){
    const es = q.choices.map(x => x.e), okIdx = es.map((e, i) => e === q.shadow ? i : -1).filter(i => i >= 0);
    return {ok:okIdx.length === 1 && okIdx[0] === q.ans && new Set(es).size === es.length};
  }
  const B = raster(q.parts), ds = q.choices.map(c => rdiff(B, raster(c)));
  const okIdx = ds.map((d, i) => d === 0 ? i : -1).filter(i => i >= 0);
  return {ok:okIdx.length === 1 && okIdx[0] === q.ans && ds.every((d, i) => i === q.ans || d >= SH_TH), ds};
}
function describeShadow(q){
  if(q.kind === 'emoji') return `かげの かたちが ぴったり おなじ なのは ${q.choices[q.ans].n}。いろが なくても かたちで わかるね`;
  const names = [...new Set(q.parts.map(p => NAMES[p.s]))];
  return `かげに ぴったり かさなるのは これ。${names.join('と ')}の ばしょと おおきさが おなじ だよ` + (q.mirror ? '。みぎと ひだりが はんたいの ものは かげも はんたいに なるよ' : '');
}

/* ================================================================
   ⑥ ブロック つみ：ななめうえから みた つみき（アイソメトリック）。ぜんぶで いくつ？
   たかさマップ h[x][y]（つみきは したから じゅんに つむ → うえの つみきの したには かならず つみきが ある）
   みえかたは 画面を こまかく しらべて きめる（てまえ＝x+y+z が おおきい つみきが まえ）
   ================================================================ */
const BL_LV = {
  1:{w:3, d:2, total:[2, 4], maxH:2, hidden:[0, 0]},
  2:{w:3, d:2, total:[4, 6], maxH:3, hidden:[0, 0], tall:true},
  3:{w:3, d:3, total:[5, 7], maxH:3, hidden:[0, 0], tall:true},
  4:{w:3, d:3, total:[6, 9], maxH:3, hidden:[1, 2], tall:true},
  5:{w:3, d:3, total:[7, 10], maxH:3, hidden:[1, 3], tall:true},
  6:{w:4, d:3, total:[9, 13], maxH:4, hidden:[2, 4], tall:true},
};
const S3 = Math.sqrt(3), C30 = S3 / 2;
const isoP = (x, y, z) => [(x - y) * C30, (x + y) / 2 - z];   // がめんの ざひょう（y は した むき）
function cubesOf(h){ const out = []; h.forEach((col, x) => col.forEach((hh, y) => { for(let z = 0; z < hh; z++) out.push({x, y, z}); })); return out; }
// それぞれの つみきが どれだけ みえるか（f＝ぜんたい、top＝うえの めん）
function blockVis(h, step = .07){
  const cubes = cubesOf(h);
  const inHex = (c, X, Y) => { const [cx, cy] = isoP(c.x, c.y, c.z), dx = Math.abs(X - cx); return dx <= C30 && Math.abs(Y - cy) + dx / S3 <= 1; };
  return cubes.map(c => {
    const [cx, cy] = isoP(c.x, c.y, c.z), s = c.x + c.y + c.z;
    const front = cubes.filter(d => { if(d.x + d.y + d.z <= s) return false; const [ex, ey] = isoP(d.x, d.y, d.z); return Math.hypot(ex - cx, ey - cy) < 2; });   // かさなるのは ちかい ものだけ
    let tot = 0, vis = 0, ttot = 0, tvis = 0;
    for(let Y = cy - 1 + step / 2; Y < cy + 1; Y += step) for(let X = cx - C30 + step / 2; X < cx + C30; X += step){
      const dx = Math.abs(X - cx), dy = Y - cy;
      if(dx / S3 + Math.abs(dy) > 1) continue;
      const top = dy <= -dx / S3, seen = !front.some(d => inHex(d, X, Y));
      tot++; if(top) ttot++;
      if(seen){ vis++; if(top) tvis++; }
    }
    return Object.assign({}, c, {f:vis / tot, top:ttot ? tvis / ttot : 0});
  });
}
function trimH(h){
  const xs = range(h.length).filter(x => h[x].some(v => v > 0)), ys = range(h[0].length).filter(y => h.some(col => col[y] > 0));
  return xs.map(x => ys.map(y => h[x][y]));
}
function blockCheck(h, L){
  const vis = blockVis(h), topZ = c => h[c.x][c.y] - 1, colTop = c => vis.find(t => t.x === c.x && t.y === c.y && t.z === topZ(c));
  const hidden = vis.filter(c => c.f < .25);
  if(vis.some(c => c.z === topZ(c) && c.top < .5)) return null;            // どの つみの いちばん うえも よく みえる
  if(hidden.some(c => c.z === topZ(c) || colTop(c).top < .6)) return null;  // かくれた つみきは、みえる つみきの した だけ
  return {hidden:hidden.length, visible:vis.length - hidden.length};
}
function genBlocks(R, level, opt = {}){
  const L = BL_LV[level] || BL_LV[1], nCh = opt.choices || 3;
  for(let tries = 0; tries < 3000; tries++){
    const N = between(R, L.total), h = range(L.w).map(() => Array(L.d).fill(0));
    h[ri(R, L.w)][ri(R, L.d)] = 1;
    let cnt = 1;
    for(let guard = 0; cnt < N && guard < 400; guard++){
      const x = ri(R, L.w), y = ri(R, L.d);
      if(h[x][y] > 0){ if(h[x][y] < L.maxH && R() < .5){ h[x][y]++; cnt++; } }
      else if([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (h[x + dx] || [])[y + dy] > 0)){ h[x][y] = 1; cnt++; }
    }
    if(cnt !== N) continue;
    const t = trimH(h);
    if(L.tall && Math.max(...t.flat()) < 2) continue;
    const r = blockCheck(t, L);
    if(!r || r.hidden < L.hidden[0] || r.hidden > L.hidden[1]) continue;
    const set = new Set([N]), cand = shuffle(R, [N - 1, N + 1, N - 2, N + 2]);
    if(r.hidden) cand.unshift(r.visible);                                   // みえる ぶん だけ かぞえた かず（ひっかけ）
    for(const v of cand){ if(set.size >= nCh) break; if(v >= 1) set.add(v); }
    const q = {t:'blocks', level, h:t, n:N, hidden:r.hidden, choices:shuffle(R, [...set]), ans:N};
    if(!verifyBlocks(q).ok) continue;
    q.sig = 'bl:' + J(t);
    return q;
  }
  throw new Error('blocks: 生成できませんでした ' + level);
}
function verifyBlocks(q){
  const n = q.h.flat().reduce((a, b) => a + b, 0), r = blockCheck(q.h, BL_LV[q.level] || BL_LV[1]);
  const okIdx = q.choices.map((v, i) => v === n ? i : -1).filter(i => i >= 0);
  return {ok:!!r && r.hidden === q.hidden && n === q.n && q.ans === n && okIdx.length === 1 && new Set(q.choices).size === q.choices.length};
}
// だんごとの かず（したから）
const layerCounts = h => { const m = Math.max(...h.flat()); return range(m).map(z => h.flat().filter(v => v > z).length); };
function describeBlocks(q){
  const ls = layerCounts(q.h);
  return ls.map((c, z) => `${z + 1}だんめ ${c}こ`).join('、') + `。ぜんぶで ${q.n}こ` + (q.hidden ? '。うえの つみきの したに かくれている つみきも かぞえたよ' : '');
}

/* ================================================================
   ⑦ かたち あわせ（ポリオミノ）
   fill：あいている ところに ぴったり はいる ピースは どれ？
   pair：どの 2つを あわせると この かたちに なる？
   ピースは まわしても うらがえしても よい ものとして、ほかの せんたくしでは ぜったいに できない ことを たしかめる
   ================================================================ */
const TG_LV = {
  1:{mode:'fill', g:3, n:[4, 5], k:[2, 2]},
  2:{mode:'fill', g:3, n:[5, 7], k:[3, 3]},
  3:{mode:'fill', g:4, n:[7, 8], k:[4, 4]},
  4:{mode:'pair', g:3, n:[5, 6], a:[2, 3]},
  5:{mode:'fill', g:4, n:[8, 9], k:[4, 5], rot:true},
  6:{mode:'pair', g:4, n:[7, 8], a:[3, 4], rot:true},
};
const T8 = [p => [p[0], p[1]], p => [-p[1], p[0]], p => [-p[0], -p[1]], p => [p[1], -p[0]], p => [-p[0], p[1]], p => [p[1], p[0]], p => [p[0], -p[1]], p => [-p[1], -p[0]]];
const pNorm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const pKey = cs => pNorm(cs).map(c => c.join(',')).join(';');
const pRot = (cs, n) => { let r = cs; for(let i = 0; i < n; i++) r = r.map(T8[1]); return pNorm(r); };
const freeKey = cs => T8.map(t => pKey(cs.map(t))).sort()[0];
const pairKey = pr => [pKey(pr[0]), pKey(pr[1])].sort().join('|');
// target の なかの つながった k マス（のこりは かんけい なし）
function growWithin(R, target, k){
  const T = new Set(target.map(c => c.join(','))), set = [pick(R, target)], has = c => set.some(s => s[0] === c[0] && s[1] === c[1]);
  for(let guard = 0; set.length < k && guard < 300; guard++){ const b = pick(R, set), d = ri(R, 4), c = [b[0] + DX[d], b[1] + DY[d]]; if(T.has(c.join(',')) && !has(c)) set.push(c); }
  return set.length === k ? set : null;
}
// P と Q（まわす・うらがえす のは じゆう）で target を すきまなく うめられるか → おきかた or null
function canTile(target, P, Q){
  if(P.length + Q.length !== target.length) return null;
  const T = new Set(target.map(c => c.join(','))), fq = freeKey(Q), seen = new Set();
  for(const t of T8){
    const o = pNorm(P.map(t)), k = pKey(o); if(seen.has(k)) continue; seen.add(k);
    for(const [tx, ty] of target){
      const dx = tx - o[0][0], dy = ty - o[0][1], pl = o.map(c => [c[0] + dx, c[1] + dy]);
      if(!pl.every(c => T.has(c.join(',')))) continue;
      const S = new Set(pl.map(c => c.join(','))), rest = target.filter(c => !S.has(c.join(',')));
      if(rest.length && freeKey(rest) === fq) return {a:pl, b:rest};
    }
  }
  return null;
}
// cs と ちがう かたち（まわしても うらがえしても かさならない）の ピース
function otherPiece(R, cs, avoid, sameSize){
  const k = cs.length;
  for(let t = 0; t < 60; t++){
    const size = sameSize ? k : pick(R, [k - 1, k + 1].filter(s => s >= 1));
    const p = randCells(R, Math.max(4, size), size); if(!p) continue;
    const fk = freeKey(p); if(avoid.has(fk)) continue;
    return pRot(p, ri(R, 4));
  }
  return null;
}
const SAME_SIZE_KINDS = {1:1, 2:1, 3:2, 4:5, 5:12};   // ちがう かたちの かず（モノミノ〜ペントミノ）
function genFill(R, L, level, nCh){
  for(let tries = 0; tries < 600; tries++){
    const target = randCells(R, L.g, between(R, L.n)); if(!target) continue;
    const gap = growWithin(R, target, between(R, L.k)); if(!gap) continue;
    const rest = target.filter(c => !gap.some(g => g[0] === c[0] && g[1] === c[1]));
    if(!cellsConnected(rest)) continue;
    const k = gap.length, gk = freeKey(gap);
    let ansPiece = pNorm(gap);
    if(L.rot){ const rs = shuffle(R, [1, 2, 3]).map(r => pRot(gap, r)).filter(p => pKey(p) !== pKey(gap)); if(!rs.length) continue; ansPiece = rs[0]; }
    const ch = [ansPiece], fks = new Set([gk]), ks = new Set([pKey(ansPiece)]);
    let same = 0;
    for(let t = 0; t < 100 && ch.length < nCh; t++){
      const canSame = SAME_SIZE_KINDS[k] - 1 > same, wantSame = k >= 3 && canSame && R() < .8;
      const p = otherPiece(R, gap, fks, wantSame); if(!p || ks.has(pKey(p))) continue;
      fks.add(freeKey(p)); ks.add(pKey(p)); ch.push(p); if(p.length === k) same++;
    }
    if(ch.length < nCh) continue;
    const q = {t:'tangram', level, mode:'fill', rot:!!L.rot, target:pNorm(target), gap:null, choices:shuffle(R, ch)};
    // target を 0 はじまりに した ぶん gap も ずらす
    const mx = Math.min(...target.map(c => c[0])), my = Math.min(...target.map(c => c[1]));
    q.gap = gap.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    q.ans = q.choices.indexOf(ansPiece);
    if(!verifyTangram(q).ok) continue;
    q.sig = 'tg:f:' + J([q.target, q.gap]);
    return q;
  }
  throw new Error('tangram: 生成できませんでした ' + level);
}
function genPair(R, L, level, nCh){
  for(let tries = 0; tries < 800; tries++){
    const target0 = randCells(R, L.g, between(R, L.n)); if(!target0) continue;
    const target = pNorm(target0);
    const A = growWithin(R, target, between(R, L.a)); if(!A) continue;
    const B = target.filter(c => !A.some(a => a[0] === c[0] && a[1] === c[1]));
    if(!B.length || !cellsConnected(B)) continue;
    const show = cs => L.rot ? pRot(cs, 1 + ri(R, 3)) : pNorm(cs);
    const correct = [show(A), show(B)];
    if(L.rot && pKey(correct[0]) === pKey(A) && pKey(correct[1]) === pKey(B)) continue;   // まわって みえない
    const ch = [correct], ks = new Set([pairKey(correct)]);
    for(let t = 0; t < 200 && ch.length < nCh; t++){
      const mode = ri(R, 3), alt = cs => otherPiece(R, cs, new Set([freeKey(cs)]), cs.length >= 3 && R() < .85);
      const P = mode !== 1 ? alt(A) : A, Q = mode !== 0 ? alt(B) : B;
      if(!P || !Q || canTile(target, P, Q)) continue;
      const d = [show(P), show(Q)], k = pairKey(d);
      if(ks.has(k)) continue;
      ks.add(k); ch.push(d);
    }
    if(ch.length < nCh) continue;
    const q = {t:'tangram', level, mode:'pair', rot:!!L.rot, target, place:{a:pNormKeep(A), b:pNormKeep(B)}, choices:shuffle(R, ch)};
    q.ans = q.choices.indexOf(correct);
    if(!verifyTangram(q).ok) continue;
    q.sig = 'tg:p:' + J([target, q.place.a]);
    return q;
  }
  throw new Error('tangram: 生成できませんでした ' + level);
}
const pNormKeep = cs => cs.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
function genTangram(R, level, opt = {}){
  const L = TG_LV[level] || TG_LV[1], nCh = opt.choices || 3;
  return L.mode === 'fill' ? genFill(R, L, level, nCh) : genPair(R, L, level, nCh);
}
function verifyTangram(q){
  if(q.mode === 'fill'){
    const T = new Set(q.target.map(c => c.join(',')));
    if(!q.gap.every(c => T.has(c.join(','))) || q.gap.length >= q.target.length) return {ok:false};
    const gk = freeKey(q.gap), okIdx = q.choices.map((c, i) => freeKey(c) === gk ? i : -1).filter(i => i >= 0);
    return {ok:okIdx.length === 1 && okIdx[0] === q.ans && new Set(q.choices.map(pKey)).size === q.choices.length, okIdx};
  }
  const okIdx = q.choices.map((c, i) => canTile(q.target, c[0], c[1]) ? i : -1).filter(i => i >= 0);
  return {ok:okIdx.length === 1 && okIdx[0] === q.ans && new Set(q.choices.map(pairKey)).size === q.choices.length, okIdx};
}
function describeTangram(q){
  if(q.mode === 'fill') return `あいている ところは ${q.gap.length}マス。この かたち${q.rot ? 'を まわすと' : 'が'} ぴったり はいるよ`;
  const a = q.place.a.length, b = q.place.b.length;
  return `${a}マスと ${b}マスで ${a + b}マス。${q.rot ? 'まわして ' : ''}くっつけると この かたちに なるよ`;
}

/* ---------------- まとめ：ステージの 設定 から 問題を つくる ---------------- */
const choiceCount = age => age <= 4 ? 3 : 4;
const GEN2 = {
  odd:(R, g) => genOdd(R, g.level || 1),
  mirror:(R, g, age) => genMirror(R, g.level || 1, {choices:choiceCount(age)}),
  logic:(R, g, age) => genLogic(R, g.level || 1, {choices:choiceCount(age)}),
  memory:(R, g) => genMemory(R, g.level || 1),
  shadow:(R, g, age) => genShadow(R, g.level || 1, {choices:choiceCount(age)}),
  blocks:(R, g, age) => genBlocks(R, g.level || 1, {choices:choiceCount(age)}),
  tangram:(R, g, age) => genTangram(R, g.level || 1, {choices:choiceCount(age)}),
};
const VERIFY = {odd:verifyOdd, mirror:verifyMirror, logic:verifyLogic, memory:verifyMemory, shadow:verifyShadow, blocks:verifyBlocks, tangram:verifyTangram};
// recent：さいきん でた もんだい（おなじ もんだいを くりかえさない）／hash：recent を みじかく ほぞんする ための 関数
function generate(gen, count, age, seed, recent = [], hash = x => x){
  const f = GEN2[gen.gen]; if(!f) throw new Error('Puzzles2: しらない gen ' + gen.gen);
  const R = rng(seed), out = [], used = new Set(recent);
  for(let i = 0; i < count; i++){
    let q = null;
    for(let t = 0; t < 30; t++){ const c = f(R, gen, age); if(!used.has(hash(c.sig))){ q = c; break; } q = c; }
    used.add(hash(q.sig)); out.push(q);
  }
  return out;
}
// Puzzles.generate を つつむ（あたらしい gen は ここ、それ いがいは もとの generate）
function install(P){
  if(!P || P.__puzzles2) return !!P;
  const orig = P.generate;
  P.generate = function(gen, ...rest){ return gen && GEN2[gen.gen] ? generate(gen, ...rest) : orig.call(this, gen, ...rest); };
  P.__puzzles2 = true; P.originalGenerate = orig;
  return true;
}
const API = {rng, generate, install, GEN2, VERIFY, NAMES, COLORS, SHAPES, COLOR_ADJ, ATTR_NAME,
  genOdd, verifyOdd, describeOdd, oddSplits, EMO, ODD_LV,
  genMirror, verifyMirror, flipLR, flipUD, rot90, gKey, MIR_LV,
  genLogic, verifyLogic, describeLogic, evalClue, solveHouse, clueText, condText, posName, LOG_LV,
  genMemory, verifyMemory, MEM_LV,
  genShadow, verifyShadow, describeShadow, partPoly, raster, rdiff, UNIT, SH_LV, SH_TH,
  genBlocks, verifyBlocks, describeBlocks, blockVis, layerCounts, isoP, BL_LV,
  genTangram, verifyTangram, describeTangram, canTile, freeKey, pKey, pNorm, pRot, TG_LV};
if(typeof module !== 'undefined' && module.exports){ module.exports = API; return; }
root.Puzzles2 = API;
// window.Puzzles（learn/puzzles.js）を つつむ。まだ なければ、できた ときに つつむ
if(root.Puzzles) install(root.Puzzles);
else {
  let held;
  try{ Object.defineProperty(root, 'Puzzles', {configurable:true, enumerable:true, get(){ return held; }, set(v){ held = v; install(v); }}); }catch(e){}
}
})(typeof window !== 'undefined' ? window : globalThis);

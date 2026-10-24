/* ================================================================
   しこうりょく パズル：もんだいの 自動生成と 検証（画面とは 切りはなした 純粋な ロジック）
   - どの もんだいも「せいかいが かならず ある」「せいかいが 1つに きまる」ことを 生成時に 検証する
   - ブラウザでは window.Puzzles、Node（テスト）では module.exports
   ================================================================ */
(function(root){
'use strict';

/* ---------- たね つき 乱数 ---------- */
function rng(seed){ let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ri = (R, n) => Math.floor(R() * n);
const pick = (R, a) => a[ri(R, a.length)];
const shuffle = (R, a) => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = ri(R, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================================================================
   ① きそくせい パズル
   要素の 属性：color（いろ）/ shape（かたち）/ size（おおきさ）/ count（かず）/ dir（むき）
   ================================================================ */
const COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];
const SHAPES = ['circle', 'triangle', 'square', 'star', 'heart'];
const SIZES = ['big', 'small', 'mid'];
const DIRS = ['up', 'right', 'down', 'left'];
const NAMES = {
  red:'あか', blue:'あお', yellow:'きいろ', green:'みどり', purple:'むらさき',
  circle:'まる', triangle:'さんかく', square:'しかく', star:'ほし', heart:'ハート',
  big:'おおきい', small:'ちいさい', mid:'ふつう', up:'うえ', right:'みぎ', down:'した', left:'ひだり',
};
const ATTR_NAME = {color:'いろ', shape:'かたち', size:'おおきさ', count:'かず', dir:'むき'};
const UNITS = {AB:[0, 1], ABC:[0, 1, 2], AAB:[0, 0, 1], ABB:[0, 1, 1], ABAC:[0, 1, 0, 2]};
const BASE_ITEM = {color:'red', shape:'circle', size:'big', count:1, dir:'up'};

// 1つの 属性の 規則を さがす：くりかえし（周期 p、2回 いじょう 見えている）か、等差（かず・むき）
function ruleOf(vals, attr){
  const n = vals.length;
  for(let p = 1; p * 2 <= n; p++){ let ok = true; for(let i = p; i < n; i++) if(vals[i] !== vals[i - p]){ ok = false; break; } if(ok) return {kind:'cycle', p, unit:vals.slice(0, p)}; }
  if(attr === 'count' && n >= 3){ const d = vals[1] - vals[0]; if(d !== 0 && vals.every((v, i) => !i || v - vals[i - 1] === d)) return {kind:'step', d}; }
  if(attr === 'dir' && n >= 3){ const ix = vals.map(v => DIRS.indexOf(v)), d = (ix[1] - ix[0] + 4) % 4; if(d && ix.every((v, i) => !i || (v - ix[i - 1] + 4) % 4 === d)) return {kind:'turn', d}; }
  return null;
}
// すべての 属性に 規則が あるか（せいかい候補の 検証に つかう）
function consistent(seq){
  for(const a of Object.keys(BASE_ITEM)){ if(!ruleOf(seq.map(x => x[a]), a)) return false; }
  return true;
}
const LEVELS = {
  // 4さい：いろだけ・かたちだけ・おおきさだけ（2〜3しゅるいの 規則）
  p1:{attrs:{color:['AB']}, show:6},
  p2:{attrs:{shape:['AB', 'ABC']}, show:6},
  p3:{attrs:{color:['AAB', 'ABB', 'ABC']}, show:6, alt:{size:['AB']}},
  // 5さい：いろと かたちが いっしょに かわる／かずが ふえる／まんなかが ぬけている
  p4:{attrs:{color:['AB', 'ABC'], shape:'linked'}, show:6},
  p5:{attrs:{count:['step', 'AB', 'ABC']}, show:5, alt:{color:['ABB', 'AAB'], shape:'linked'}},
  p6:{attrs:{color:['AB', 'ABC'], shape:'linked'}, show:7, missing:true},
  // 6さい：べつべつの 規則を くみあわせる（いろ 2しゅう＋かたち 3しゅう など）
  p7:{attrs:{color:['AB'], shape:['ABC']}, show:6},
  p8:{attrs:{dir:['turn'], color:['AB', 'ABC']}, show:6},
  p9:{attrs:{size:['AB'], shape:['ABC'], color:['AAB', 'ABB']}, show:6, missing:true},
};
function genPattern(R, level, opt = {}){
  const L = LEVELS[level] || LEVELS.p1;
  for(let tries = 0; tries < 200; tries++){
    const spec = (L.alt && R() < .45) ? L.alt : L.attrs, show = L.show, total = show + 1;
    const seq = Array.from({length:total}, () => Object.assign({}, BASE_ITEM));
    const fixedShape = pick(R, SHAPES), fixedColor = pick(R, COLORS);
    seq.forEach(x => { x.shape = fixedShape; x.color = fixedColor; });
    let linked = null;
    for(const [attr, kinds] of Object.entries(spec)){
      if(kinds === 'linked') continue;
      const kind = pick(R, kinds);
      if(attr === 'count' && kind === 'step'){ const st = 1 + ri(R, 2); seq.forEach((x, i) => x.count = st + i); continue; }
      if(attr === 'dir' && kind === 'turn'){ const s = ri(R, 4), d = pick(R, [1, 3]); seq.forEach((x, i) => x.dir = DIRS[(s + i * d) % 4]); continue; }
      const unit = UNITS[kind], pool = attr === 'color' ? COLORS : attr === 'shape' ? SHAPES : attr === 'size' ? SIZES.slice(0, 2) : attr === 'count' ? [1, 2, 3, 4] : DIRS;
      const vals = shuffle(R, pool).slice(0, Math.max(...unit) + 1);
      const off = ri(R, unit.length);
      seq.forEach((x, i) => x[attr] = vals[unit[(i + off) % unit.length]]);
      if(spec.shape === 'linked' && attr === 'color'){ linked = {vals, shapes:shuffle(R, SHAPES).slice(0, vals.length)}; }
    }
    if(linked) seq.forEach(x => x.shape = linked.shapes[linked.vals.indexOf(x.color)]);
    const miss = L.missing ? 2 + ri(R, show - 3) : show;   // どこが ぬけているか
    const answer = seq[miss];
    const shown = seq.slice(0, total).map((x, i) => i === miss ? null : x).slice(0, L.missing ? total : show);
    // まちがいの 選択肢：せいかいと 1〜2か所 ちがう もの
    const nCh = opt.choices || 3, changing = Object.keys(spec).filter(a => spec[a] !== 'linked');
    if(spec.shape === 'linked') changing.push('shape');
    const ch = [answer], sig = new Set([JSON.stringify(answer)]);
    for(let k = 0; k < 60 && ch.length < nCh; k++){
      const d = Object.assign({}, answer), a = pick(R, changing.length ? changing : ['color']);
      const pool = a === 'color' ? COLORS : a === 'shape' ? SHAPES : a === 'size' ? SIZES.slice(0, 2) : a === 'count' ? [1, 2, 3, 4, 5, 6] : DIRS;
      const usedVals = [...new Set(seq.map(x => x[a]))];
      d[a] = pick(R, R() < .75 && usedVals.length > 1 ? usedVals : pool);
      if(R() < .3 && changing.length > 1){ const b = pick(R, changing); const p2 = b === 'color' ? COLORS : b === 'shape' ? SHAPES : b === 'size' ? SIZES.slice(0, 2) : b === 'count' ? [1, 2, 3, 4, 5] : DIRS; d[b] = pick(R, p2); }
      const s = JSON.stringify(d); if(sig.has(s)) continue; sig.add(s); ch.push(d);
    }
    if(ch.length < nCh) continue;
    const q = {t:'pattern', level, seq:shown, miss, total:shown.length, choices:shuffle(R, ch)};
    q.ans = q.choices.findIndex(c => same(c, answer));
    const v = verifyPattern(q);
    if(!v.ok) continue;
    q.rules = v.rules; q.sig = 'pt:' + JSON.stringify([shown, miss]);
    return q;
  }
  throw new Error('pattern: 生成できませんでした ' + level);
}
// 検証：選択肢を それぞれ あてはめて、規則が なりたつのが ちょうど 1つ（せいかい）だけ
function verifyPattern(q){
  const okIdx = [];
  q.choices.forEach((c, i) => { const s = q.seq.slice(); if(q.miss >= s.length) s.push(c); else s[q.miss] = c; if(consistent(s)) okIdx.push(i); });
  if(okIdx.length !== 1 || okIdx[0] !== q.ans) return {ok:false, okIdx};
  const full = q.seq.slice(); if(q.miss >= full.length) full.push(q.choices[q.ans]); else full[q.miss] = q.choices[q.ans];
  const rules = {}; for(const a of Object.keys(BASE_ITEM)){ const r = ruleOf(full.map(x => x[a]), a); if(r && !(r.kind === 'cycle' && r.p === 1)) rules[a] = r; }
  return {ok:true, rules, full};
}
// 規則の せつめい文
function describePattern(q){
  const parts = [];
  for(const [a, r] of Object.entries(q.rules || {})){
    if(r.kind === 'cycle') parts.push(`${ATTR_NAME[a]}は ${r.unit.map(v => a === 'count' ? v : NAMES[v]).join('、')} の くりかえし`);
    else if(r.kind === 'step') parts.push(`かずが ${r.d}ずつ ${r.d > 0 ? 'ふえる' : 'へる'}`);
    else if(r.kind === 'turn') parts.push(`むきが ${r.d === 1 ? 'みぎ' : 'ひだり'}に まわる`);
  }
  if(!parts.length) parts.push('おなじ ものの くりかえし');
  const a = q.choices[q.ans], word = [a.size !== 'big' && q.rules?.size ? NAMES[a.size] : '', NAMES[a.color], a.count > 1 || q.rules?.count ? `${a.count}この` : '', NAMES[a.shape]].filter(Boolean).join(' ');
  return parts.join('。') + `。だから ${q.miss >= q.seq.length ? 'つぎは' : '？は'} ${word}`;
}

/* ================================================================
   ② めいろ たんけん：あなほり法で 生成 → ループ・おばけ・かぎ を たす → BFS で 検証
   ================================================================ */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // 0うえ 1みぎ 2した 3ひだり
function genMaze(R, o = {}){
  const W = o.w || 5, H = o.h || 5;
  for(let tries = 0; tries < 200; tries++){
    // walls[y][x] = [上,右,下,左] true=かべ
    const walls = Array.from({length:H}, () => Array.from({length:W}, () => [true, true, true, true]));
    const seen = Array.from({length:H}, () => Array(W).fill(false));
    const st = [[0, 0]]; seen[0][0] = true;
    while(st.length){
      const [x, y] = st[st.length - 1];
      const ds = shuffle(R, [0, 1, 2, 3]).filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[ny][nx]; });
      if(!ds.length){ st.pop(); continue; }
      const d = ds[0], nx = x + DX[d], ny = y + DY[d];
      walls[y][x][d] = false; walls[ny][nx][(d + 2) % 4] = false; seen[ny][nx] = true; st.push([nx, ny]);
    }
    // ループを つくって わかれみちを ふやす
    for(let k = 0; k < (o.braid || 0); k++){
      const x = ri(R, W), y = ri(R, H), d = ri(R, 4), nx = x + DX[d], ny = y + DY[d];
      if(nx < 0 || ny < 0 || nx >= W || ny >= H || !walls[y][x][d]) { k--; if(k < -50) break; continue; }
      walls[y][x][d] = false; walls[ny][nx][(d + 2) % 4] = false;
    }
    const start = [0, 0], goal = [W - 1, H - 1];
    const mz = {t:'maze', w:W, h:H, walls, start, goal, ghosts:[], key:null};
    // かぎ：ゴールから とおい いきどまりに おく
    if(o.key){
      const dist = bfs(mz, start, null).dist, ends = [];
      for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const open = walls[y][x].filter(w => !w).length; if(open === 1 && !(x === 0 && y === 0) && !(x === goal[0] && y === goal[1]) && dist[y][x] >= Math.min(W, H)) ends.push([x, y]); }
      if(!ends.length) continue;
      mz.key = pick(R, ends);
    }
    // おばけ：とおれない マス（さいたんの みち いがいに おく）
    for(let k = 0; k < (o.ghosts || 0); k++){
      const path = solveMaze(mz); if(!path) break;
      const onPath = new Set(path.map(p => p.join(',')));
      const cand = []; for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const s = x + ',' + y; if(!onPath.has(s) && !mz.ghosts.some(g => g.join(',') === s) && !(mz.key && mz.key.join(',') === s)) cand.push([x, y]); }
      if(!cand.length) break;
      mz.ghosts.push(pick(R, cand));
    }
    const path = solveMaze(mz);
    if(!path) continue;
    if(path.length - 1 < (o.minLen || W + H - 2)) continue;   // かんたんすぎる めいろは つかわない
    mz.path = path; mz.sig = 'mz:' + JSON.stringify([walls.map(r => r.map(c => c.map(Number).join('')).join('.')), mz.ghosts, mz.key]);
    return mz;
  }
  throw new Error('maze: 生成できませんでした');
}
const blocked = (mz, x, y) => mz.ghosts.some(g => g[0] === x && g[1] === y);
function canMove(mz, x, y, d){ const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < mz.w && ny < mz.h && !mz.walls[y][x][d] && !blocked(mz, nx, ny); }
function bfs(mz, from, to){
  const dist = Array.from({length:mz.h}, () => Array(mz.w).fill(Infinity)), prev = {};
  const q = [from]; dist[from[1]][from[0]] = 0;
  while(q.length){
    const [x, y] = q.shift();
    if(to && x === to[0] && y === to[1]) break;
    for(let d = 0; d < 4; d++){ if(!canMove(mz, x, y, d)) continue; const nx = x + DX[d], ny = y + DY[d]; if(dist[ny][nx] !== Infinity) continue; dist[ny][nx] = dist[y][x] + 1; prev[nx + ',' + ny] = [x, y]; q.push([nx, ny]); }
  }
  let path = null;
  if(to && dist[to[1]][to[0]] !== Infinity){ path = [to]; let c = to; while(c[0] !== from[0] || c[1] !== from[1]){ c = prev[c.join(',')]; path.unshift(c); } }
  return {dist, path};
}
// スタート →（かぎ）→ ゴール の さいたんの みち。とどかなければ null
function solveMaze(mz, from){
  const s = from || mz.start;
  if(mz.key){ const a = bfs(mz, s, mz.key).path, b = bfs(mz, mz.key, mz.goal).path; return a && b ? a.concat(b.slice(1)) : null; }
  return bfs(mz, s, mz.goal).path;
}

/* ================================================================
   ③ かたち まわし（回転）：ポリオミノを つくり、90・180・270ど まわした ものを えらぶ
   ================================================================ */
// かたち = [{x,y,c}]（c=いろ 0/1）。まわす・うらがえす・正規化
const norm = s => { const mx = Math.min(...s.map(p => p.x)), my = Math.min(...s.map(p => p.y)); return s.map(p => ({x:p.x - mx, y:p.y - my, c:p.c})).sort((a, b) => a.y - b.y || a.x - b.x); };
const key = s => norm(s).map(p => `${p.x},${p.y},${p.c}`).join(';');
const rotCW = s => norm(s.map(p => ({x:-p.y, y:p.x, c:p.c})));      // がめん（yが した）で みぎまわり 90ど
const rotN = (s, n) => { let r = norm(s); for(let i = 0; i < ((n % 4) + 4) % 4; i++) r = rotCW(r); return r; };
const mirror = s => norm(s.map(p => ({x:-p.x, y:p.y, c:p.c})));
const rotations = s => [0, 1, 2, 3].map(n => key(rotN(s, n)));
function connected(s){
  const set = new Set(s.map(p => p.x + ',' + p.y)), st = [s[0]], seen = new Set([s[0].x + ',' + s[0].y]);
  while(st.length){ const p = st.pop(); for(let d = 0; d < 4; d++){ const k = (p.x + DX[d]) + ',' + (p.y + DY[d]); if(set.has(k) && !seen.has(k)){ seen.add(k); st.push({x:p.x + DX[d], y:p.y + DY[d]}); } } }
  return seen.size === s.length;
}
function randShape(R, n, g, marks){
  const cells = [{x:ri(R, g), y:ri(R, g)}], has = c => cells.some(p => p.x === c.x && p.y === c.y);
  while(cells.length < n){ const b = pick(R, cells), d = ri(R, 4), c = {x:b.x + DX[d], y:b.y + DY[d]}; if(c.x < 0 || c.y < 0 || c.x >= g || c.y >= g || has(c)) continue; cells.push(c); }
  const idx = shuffle(R, cells.map((_, i) => i)).slice(0, marks);
  return norm(cells.map((p, i) => ({x:p.x, y:p.y, c:idx.includes(i) ? 1 : 0})));
}
// o: {n:マスの数, g:わく, marks:いろつきの数, mode:'same'|'angle', mirror:かがみの ひっかけ数, choices}
function genRotate(R, o = {}){
  const n = o.n || 4, g = o.g || 3, nCh = o.choices || 3;
  for(let tries = 0; tries < 300; tries++){
    const base = randShape(R, n, g, o.marks ?? 1), rots = rotations(base);
    if(new Set(rots).size < 4) continue;                       // まわしても おなじに みえる かたちは つかわない（どの むきか わからなくなる）
    if(rots.includes(key(mirror(base)))) continue;               // うらがえしても おなじ かたちは ひっかけに ならない
    const k = o.mode === 'angle' ? 1 + ri(R, 3) : 1 + ri(R, 3);
    const answer = rotN(base, k), ch = [answer], ks = new Set([key(answer)]);
    const add = s => { const kk = key(s); if(ks.has(kk)) return false; ks.add(kk); ch.push(s); return true; };
    if(o.mode === 'angle'){ for(const j of shuffle(R, [0, 1, 2, 3].filter(j => j !== k))){ if(ch.length >= nCh - (o.mirror ? 1 : 0)) break; add(rotN(base, j)); } }
    for(let m = 0; m < (o.mirror || 0) && ch.length < nCh; m++) add(rotN(mirror(base), ri(R, 4)));
    for(let t2 = 0; t2 < 80 && ch.length < nCh; t2++){   // 1マス うごかした・いろを かえた にせもの
      let d = base.map(p => Object.assign({}, p));
      if(R() < .5 && (o.marks ?? 1) > 0){ const i = ri(R, d.length); d[i].c = 1 - d[i].c; }
      else { const i = ri(R, d.length), b = pick(R, d), dd = ri(R, 4), c = {x:b.x + DX[dd], y:b.y + DY[dd], c:d[i].c}; if(d.some(p => p.x === c.x && p.y === c.y)) continue; d.splice(i, 1, c); if(!connected(d)) continue; }
      d = rotN(norm(d), ri(R, 4));
      if(rots.includes(key(d))) continue;                         // じつは せいかいと おなじ → だめ
      if(o.mode === 'angle' && false) continue;
      add(d);
    }
    if(ch.length < nCh) continue;
    const q = {t:'rotate', mode:o.mode || 'same', base, k, choices:shuffle(R, ch), g};
    q.ans = q.choices.findIndex(c => key(c) === key(answer));
    if(!verifyRotate(q).ok) continue;
    q.sig = 'rt:' + key(base) + ':' + q.mode + k;
    return q;
  }
  throw new Error('rotate: 生成できませんでした');
}
// 検証：mode same＝まわして base に なるのは せいかいだけ／angle＝ちょうど k かい まわした ものは せいかいだけ
function verifyRotate(q){
  const rots = rotations(q.base), target = key(rotN(q.base, q.k));
  const okIdx = q.choices.map((c, i) => [i, q.mode === 'angle' ? key(c) === target : rots.includes(key(c))]).filter(x => x[1]).map(x => x[0]);
  return {ok:okIdx.length === 1 && okIdx[0] === q.ans, okIdx};
}
// こたえを みて、base を みぎに なんかい まわすと おなじか
function turnsTo(q){ const a = key(q.choices[q.ans]); for(let n = 0; n < 4; n++) if(key(rotN(q.base, n)) === a) return n; return -1; }

/* ---------------- まとめ：ステージの 設定 から 問題を つくる ---------------- */
const GEN = {
  pattern:(R, g, age) => genPattern(R, g.level, {choices:age <= 4 ? 3 : 4}),
  maze:(R, g) => genMaze(R, g),
  rotate:(R, g, age) => genRotate(R, Object.assign({choices:age <= 4 ? 3 : 4}, g)),
};
// recent：さいきん でた もんだい（おなじ もんだいを くりかえさない）
// hash：recent を みじかく ほぞんする ための 関数（なければ sig を そのまま つかう）
function generate(gen, count, age, seed, recent = [], hash = x => x){
  const R = rng(seed), out = [], used = new Set(recent);
  for(let i = 0; i < count; i++){
    let q = null;
    for(let t = 0; t < 30; t++){ const c = GEN[gen.gen](R, gen, age); if(!used.has(hash(c.sig))){ q = c; break; } q = c; }
    used.add(hash(q.sig)); out.push(q);
  }
  return out;
}
const API = {rng, generate, genPattern, verifyPattern, describePattern, ruleOf, consistent, genMaze, solveMaze, canMove, bfs, genRotate, verifyRotate, rotN, rotCW, mirror, key, norm, rotations, turnsTo, NAMES, COLORS, SHAPES, DIRS, DX, DY, LEVELS};
if(typeof module !== 'undefined' && module.exports) module.exports = API; else root.Puzzles = API;
})(typeof window !== 'undefined' ? window : globalThis);

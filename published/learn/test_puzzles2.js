/* しこうりょく パズル 2 の テスト（node learn/test_puzzles2.js [たねの かず]）
   - shikou.json の すべての あたらしい ステージ × たくさんの たねで もんだいを つくり、
     「例外が でない」「せいかいが ちょうど 1つ（生成がわ とは べつの しらべかたで）」「せんたくしが かさならない」「sig が ある」を たしかめる
   - window.Puzzles.generate を つつんだ あとも、もとの gen（pattern / maze / rotate）が うごく ことを たしかめる */
'use strict';
const fs = require('fs'), path = require('path');
const P1 = require('./puzzles.js'), P2 = require('./puzzles2.js');
P2.install(P1);

const SEEDS = +process.argv[2] || 120;
let checks = 0, fails = 0;
const ok = (cond, msg) => { checks++; if(!cond){ fails++; if(fails <= 40) console.error('NG:', msg); } };
const J = x => JSON.stringify(x);
const uniq = a => new Set(a.map(J)).size === a.length;
const KANJI = /[一-鿿]/;
const range = n => Array.from({length:n}, (_, i) => i);

/* ---------------- shikou.json ---------------- */
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/shikou.json'), 'utf8'));
const NEW = ['odd', 'mirror', 'logic', 'memory', 'shadow', 'blocks', 'tangram'];
const OLD_IDS = {4:['k4-p1', 'k4-p2', 'k4-p3', 'k4-m1', 'k4-m2', 'k4-m3', 'k4-r1', 'k4-r2', 'k4-r3'], 5:['k5-p1', 'k5-p2', 'k5-p3', 'k5-m1', 'k5-m2', 'k5-m3', 'k5-r1', 'k5-r2', 'k5-r3'], 6:['k6-p1', 'k6-p2', 'k6-p3', 'k6-m1', 'k6-m2', 'k6-m3', 'k6-r1', 'k6-r2', 'k6-r3']};
ok(J(Object.keys(data.tracks).slice(0, 3)) === J(['pattern', 'maze', 'rotate']), 'もとの track が さきに ある');
for(const t of NEW){ const tr = data.tracks[t]; ok(tr && tr.title && tr.icon && tr.say, 'track ' + t); ok(tr && !KANJI.test(tr.title + tr.say), 'track に かんじ なし ' + t); }
const allIds = [];
for(const age of ['4', '5', '6']){
  const st = data.courses[age];
  ok(J(st.slice(0, 9).map(s => s.id)) === J(OLD_IDS[age]), `もとの ステージが さきに ある ${age}`);
  for(const t of NEW){
    const mine = st.filter(s => s.track === t);
    ok(mine.length === 2, `${age}さい ${t} は 2ステージ`);
    mine.forEach(s => { ok(s.count >= 8 && s.count <= 10, 'count 8〜10 ' + s.id); ok(s.gen && s.gen.gen === t && s.gen.level >= 1 && s.gen.level <= 6, 'gen ' + s.id); ok(!KANJI.test(s.title), 'title かんじ なし ' + s.id); });
  }
  st.forEach(s => { allIds.push(s.id); ok(data.tracks[s.track], 'track が ある ' + s.id); });
}
ok(new Set(allIds).size === allIds.length, 'ステージ id が かさならない');

/* ---------------- shikou2.js：もんだいの しゅるいが ある ---------------- */
const ui = fs.readFileSync(path.join(__dirname, 'shikou2.js'), 'utf8');
try{ new Function(ui); ok(true, ''); }catch(e){ ok(false, 'shikou2.js の ぶんぽう ' + e.message); }
for(const t of NEW) ok(new RegExp(`\\n  ${t}: \\{`).test(ui), 'TYPES に ある ' + t);

/* ---------------- べつの しらべかた（生成がわの verify は つかわない） ---------------- */
// ① なかまはずれ
const emoGroup = {};
for(const [g, v] of Object.entries(P2.EMO)) for(const [e] of v.items){ ok(!(e in emoGroup), 'えもじが 2つの なかまに ある ' + e); emoGroup[e] = g; }
function checkOdd(q){
  ok(q.items.length === 4 && uniq(q.items), 'odd: 4つ・かさならない ' + q.sig);
  const odds = [];
  if(q.kind === 'shape'){
    for(const a of ['color', 'shape', 'count', 'size']) for(let i = 0; i < 4; i++){
      const others = q.items.filter((_, j) => j !== i).map(x => x[a]);
      if(others.every(v => v === others[0]) && q.items[i][a] !== others[0]) odds.push([i, a]);
    }
    ok(odds.length === 1 && odds[0][0] === q.ans, 'odd: ちがう ものが ちょうど 1つ ' + J(odds) + ' ' + q.sig);
    const sizes = new Set(q.items.map(x => x.size)).size, counts = new Set(q.items.map(x => x.count)).size;
    ok(!(sizes > 1 && counts > 1), 'odd: おおきさと かずが いっしょに かわらない');
  }else{
    const gs = q.items.map(x => emoGroup[x.e]);
    for(let i = 0; i < 4; i++){ const o = gs.filter((_, j) => j !== i); if(o.every(g => g === o[0]) && gs[i] !== o[0]) odds.push(i); }
    ok(odds.length === 1 && odds[0] === q.ans, 'odd: なかまが ちがうのは 1つ ' + q.sig);
    const sup = g => P2.EMO[g].sup;
    ok(q.mode === 'super' ? sup(gs[q.ans]) !== sup(gs[(q.ans + 1) % 4]) : sup(gs[q.ans]) === sup(gs[(q.ans + 1) % 4]), 'odd: なかまの おおきさ');
    q.items.forEach(x => ok(P2.EMO[emoGroup[x.e]].items.some(([e, n]) => e === x.e && n === x.n), 'odd: なまえ'));
  }
  const ex = P2.describeOdd(q); ok(ex && !KANJI.test(ex), 'odd: せつめい ' + ex);
}
// ② かがみ
function checkMirror(q){
  const n = q.n, want = range(n).map(y => range(n).map(x => q.axis === 'ud' ? q.base[n - 1 - y][x] : q.base[y][n - 1 - x]));
  ok(J(want) !== J(q.base), 'mirror: うつすと かわる もよう');
  const hit = q.choices.map((c, i) => J(c) === J(want) ? i : -1).filter(i => i >= 0);
  ok(hit.length === 1 && hit[0] === q.ans, 'mirror: せいかいが 1つ ' + q.sig);
  ok(uniq(q.choices), 'mirror: せんたくしが かさならない');
  ok(q.choices.every(c => c.length === n && c.every(r => r.length === n)), 'mirror: おおきさ');
}
// ③ じょうけん
function clueHolds(c, P, n){
  const a = P[c.a], b = c.b == null ? null : P[c.b];
  return ({pos:a === c.p, notpos:a !== c.p, end:a === 0 || a === n - 1, notend:a > 0 && a < n - 1, right1:a - b === 1, left1:b - a === 1, right:a > b, left:a < b, next:Math.abs(a - b) === 1, notnext:Math.abs(a - b) !== 1})[c.k];
}
function permsOf(n){ if(n === 1) return [[0]]; const out = []; for(const p of permsOf(n - 1)) for(let i = 0; i <= p.length; i++){ const q = p.slice(); q.splice(i, 0, n - 1); out.push(q); } return out; }
function checkLogic(q, age){
  ok(q.text && !KANJI.test(q.text), 'logic: もんだい文 ' + q.text);
  if(q.kind === 'house'){
    const sols = permsOf(q.n).filter(P => q.clues.every(c => clueHolds(c, P, q.n)));
    ok(sols.length === 1 && J(sols[0]) === J(q.sol), 'logic: ならびかたが 1つ ' + q.sig);
    const right = q.ask.k === 'where' ? sols[0][q.ask.a] : sols[0].indexOf(q.ask.h);
    ok(q.choices.filter(v => v === right).length === 1 && q.choices[q.ans] === right, 'logic: こたえ');
    ok(uniq(q.choices), 'logic: せんたくしが かさならない');
    q.clues.forEach(c => { ok(c.text && c.say && !KANJI.test(c.text + c.say), 'logic: ヒント文'); ok(c.say.includes(q.animals[c.a].n), 'logic: ヒントに なまえ'); });
    ok(!q.clues.some(c => c.k === 'pos' && c.a === (q.ask.k === 'where' ? q.ask.a : q.ans)), 'logic: きかれる どうぶつを ちょくせつ いわない');
  }else{
    const satisfy = it => q.conds.every(c => (it[c.a] === c.v) !== !!c.neg);
    const hit = q.choices.map((it, i) => satisfy(it) ? i : -1).filter(i => i >= 0);
    ok(hit.length === 1 && hit[0] === q.ans, 'logic: あてはまるのが 1つ ' + q.sig);
    ok(uniq(q.choices), 'logic: せんたくしが かさならない');
    ok(q.choices.length === (age <= 4 ? 3 : 4), 'logic: せんたくしの かず');
    if(q.kind === 'carry') ok(q.text.includes(q.choices[q.ans].an) && q.text.includes(q.choices[q.ans].hn), 'logic: carry 文');
    else q.conds.forEach(c => ok(q.text.includes(P2.NAMES[c.v]) || q.text.includes(P2.COLOR_ADJ[c.v] || '@@'), 'logic: 文に じょうけん'));
  }
  const ex = P2.describeLogic(q); ok(ex && !KANJI.test(ex), 'logic: せつめい ' + ex);
}
// ④ きおく
const MEM_LEN = {1:3, 2:4, 3:4, 4:5, 5:5, 6:6};
function checkMemory(q){
  ok(q.seq.length === MEM_LEN[q.level], 'memory: ながさ');
  ok(uniq(q.pal.map(x => x.e)), 'memory: えが かさならない');
  ok(q.seq.every(v => Number.isInteger(v) && v >= 0 && v < q.pal.length), 'memory: ばんごう');
  ok(q.seq.every((v, i) => !i || v !== q.seq[i - 1]), 'memory: となりが おなじ でない');
  const rep = q.seq.length - new Set(q.seq).size;
  ok(q.level <= 4 ? rep === 0 : rep >= 1 && rep <= 2, 'memory: くりかえし');
  ok(q.ms >= 800, 'memory: みせる じかん');
}
// ⑤ かげ：べつの ラスタ（64×64・まきつき数）で くらべる
function wind(x, y, P){ let w = 0; for(let i = 0; i < P.length; i++){ const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; const cr = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1); if(y1 <= y){ if(y2 > y && cr > 0) w++; }else if(y2 <= y && cr < 0) w--; } return w !== 0; }
function ras(parts){ const R = 64, out = [], polys = parts.map(p => { const P = P2.partPoly(p), xs = P.map(q => q[0]), ys = P.map(q => q[1]); return {P, a:Math.min(...xs), b:Math.max(...xs), c:Math.min(...ys), d:Math.max(...ys)}; });
  for(let j = 0; j < R; j++) for(let i = 0; i < R; i++){ const x = (i + .37) * 100 / R, y = (j + .61) * 100 / R; out.push(polys.some(o => x >= o.a && x <= o.b && y >= o.c && y <= o.d && wind(x, y, o.P)) ? 1 : 0); } return out; }
function checkShadow(q){
  if(q.kind === 'emoji'){
    const hit = q.choices.map((c, i) => c.e === q.shadow ? i : -1).filter(i => i >= 0);
    ok(hit.length === 1 && hit[0] === q.ans, 'shadow: えもじ 1つ');
    ok(uniq(q.choices.map(c => c.e)), 'shadow: かさならない');
    return;
  }
  const B = ras(q.parts), ds = q.choices.map(c => { const r = ras(c); let d = 0; r.forEach((v, i) => d += v !== B[i]); return d; });
  const hit = ds.map((d, i) => d === 0 ? i : -1).filter(i => i >= 0);
  ok(hit.length === 1 && hit[0] === q.ans, 'shadow: かげが おなじのは 1つ ' + J(ds));
  ok(ds.every((d, i) => i === q.ans || d >= 25), 'shadow: ちがいが はっきり ' + J(ds));
  ok(q.choices.every(c => c.every(p => p.c)), 'shadow: いろつき');
  ok(uniq(q.choices.map(c => c.map(p => [p.s, p.x, p.y, p.r, p.rot]))), 'shadow: かさならない');
}
// ⑥ つみき：3D の ひかりの せんを たどって みえかたを しらべる
function rayVisible(h){
  const W = h.length, D = h[0].length, H = Math.max(...h.flat()), occ = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < D && z < h[x][y];
  const C30 = Math.sqrt(3) / 2, res = {};
  for(let x = 0; x < W; x++) for(let y = 0; y < D; y++) for(let z = 0; z < h[x][y]; z++){
    const cx = (x - y) * C30, cy = (x + y) / 2 - z; let tot = 0, vis = 0;
    for(let sy = -0.95; sy < 1; sy += .1) for(let sx = -0.83; sx < .87; sx += .1){
      if(Math.abs(sx) / Math.sqrt(3) + Math.abs(sy) > .97) continue;
      tot++;
      const X = cx + sx, Y = cy + sy, u = X / C30;
      let first = null;
      // z = t - Y が 0〜H の あいだ だけ しらべれば よい（てまえ から おくへ）
      for(let t = Y + H + .001; t > Y; t -= .02){ const px = t + u / 2, py = t - u / 2, pz = t - Y; const fx = Math.floor(px), fy = Math.floor(py), fz = Math.floor(pz); if(occ(fx, fy, fz)){ first = [fx, fy, fz]; break; } }
      if(first && first[0] === x && first[1] === y && first[2] === z) vis++;
    }
    res[`${x},${y},${z}`] = vis / tot;
  }
  return res;
}
function checkBlocks(q, age){
  const n = q.h.reduce((s, col) => s + col.reduce((a, b) => a + b, 0), 0);
  ok(n === q.n, 'blocks: かず');
  ok(q.choices.filter(v => v === n).length === 1 && q.ans === n, 'blocks: せいかいが 1つ');
  ok(uniq(q.choices) && q.choices.every(v => v >= 1), 'blocks: せんたくし');
  ok(q.choices.length === (age <= 4 ? 3 : 4), 'blocks: せんたくしの かず');
  const L = P2.BL_LV[q.level];
  ok(n >= L.total[0] && n <= L.total[1], 'blocks: はんい');
  const vis = rayVisible(q.h);
  for(const [k, f] of Object.entries(vis)){
    const [x, y, z] = k.split(',').map(Number), top = q.h[x][y] - 1;
    if(L.hidden[1] === 0) ok(f >= .1, `blocks: ぜんぶ みえる ${k} ${f.toFixed(2)} ${q.sig}`);
    else if(f < .1) ok(z < top && vis[`${x},${y},${top}`] >= .3, `blocks: かくれた つみきは みえる つみきの した ${k} ${q.sig}`);
  }
  ok(q.hidden >= L.hidden[0] && q.hidden <= L.hidden[1], 'blocks: かくれた かず');
  const ex = P2.describeBlocks(q); ok(!KANJI.test(ex) && ex.includes(`${n}こ`), 'blocks: せつめい');
}
// ⑦ かたち あわせ：8つの むきを べつに つくって しらべる
const ORI = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0], [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0]];
const canon = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => (c[0] - mx) + ':' + (c[1] - my)).sort().join(' '); };
const orients = cs => [...new Set(ORI.map(([a, b, c, d]) => canon(cs.map(([x, y]) => [a * x + b * y, c * x + d * y]))))].map(s => s.split(' ').map(t => t.split(':').map(Number)));
const sameShape = (A, B) => A.length === B.length && orients(A).some(o => canon(o) === canon(B));
function placements(piece, T){
  const out = [];
  for(const o of orients(piece)) for(const [tx, ty] of T){ for(const [ox, oy] of o){ const pl = o.map(([x, y]) => [x - ox + tx, y - oy + ty]); if(pl.every(([x, y]) => T.some(t => t[0] === x && t[1] === y))) out.push(pl.map(c => c.join(',')).sort().join(' ')); } }
  return [...new Set(out)];
}
function tiles(T, A, B){
  if(A.length + B.length !== T.length) return false;
  const all = T.map(c => c.join(',')).sort().join(' '), pa = placements(A, T), pb = placements(B, T);
  for(const a of pa) for(const b of pb){ const s = a.split(' ').concat(b.split(' ')); if(new Set(s).size === s.length && s.sort().join(' ') === all) return true; }
  return false;
}
function checkTangram(q){
  if(q.mode === 'fill'){
    ok(q.gap.every(g => q.target.some(t => t[0] === g[0] && t[1] === g[1])) && q.gap.length < q.target.length, 'tangram: あなは かたちの なか');
    const hit = q.choices.map((c, i) => sameShape(c, q.gap) ? i : -1).filter(i => i >= 0);
    ok(hit.length === 1 && hit[0] === q.ans, 'tangram: はいるのは 1つ ' + q.sig);
    ok(new Set(q.choices.map(canon)).size === q.choices.length, 'tangram: かさならない');
    if(q.rot) ok(canon(q.choices[q.ans]) !== canon(q.gap), 'tangram: まわして ある');
  }else{
    const hit = q.choices.map((c, i) => tiles(q.target, c[0], c[1]) ? i : -1).filter(i => i >= 0);
    ok(hit.length === 1 && hit[0] === q.ans, 'tangram: できる くみあわせは 1つ ' + J(hit) + ' ' + q.sig);
    ok(new Set(q.choices.map(c => [canon(c[0]), canon(c[1])].sort().join('|'))).size === q.choices.length, 'tangram: かさならない');
    const pl = q.place.a.concat(q.place.b).map(c => c.join(',')).sort().join(' ');
    ok(pl === q.target.map(c => c.join(',')).sort().join(' ') && sameShape(q.place.a, q.choices[q.ans][0]) && sameShape(q.place.b, q.choices[q.ans][1]), 'tangram: おきかた');
  }
  const ex = P2.describeTangram(q); ok(!KANJI.test(ex), 'tangram: せつめい');
}
const CHECK = {odd:checkOdd, mirror:checkMirror, logic:checkLogic, memory:checkMemory, shadow:checkShadow, blocks:checkBlocks, tangram:checkTangram};
const SEED_DIV = {blocks:4};   // ひかりの せんの しらべは おもいので たねを へらす

/* ---------------- すべての あたらしい ステージ × たくさんの たね ---------------- */
const hash = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const stats = {};
const t0 = Date.now();
for(const age of [4, 5, 6]){
  for(const st of data.courses[age].filter(s => NEW.includes(s.gen && s.gen.gen))){
    const g = st.gen.gen, N = Math.ceil(SEEDS / (SEED_DIV[g] || 1));
    const sigs = new Set(); let qn = 0;
    for(let s = 1; s <= N; s++){
      let qs;
      try{ qs = P1.generate(st.gen, st.count, age, s * 7919 + age, s % 3 ? [] : [...sigs].slice(-40).map(hash), hash); }
      catch(e){ ok(false, `${st.id} たね${s}: ${e.message}`); continue; }
      ok(qs.length === st.count, st.id + ' もんだいの かず');
      for(const q of qs){
        qn++;
        ok(q.t === g, `${st.id}: t=${q.t}`);
        ok(typeof q.sig === 'string' && q.sig.length > 3, st.id + ': sig');
        ok(J(JSON.parse(J(q))) === J(q), st.id + ': ほぞん できる（JSON）');
        try{ CHECK[g](q, age); }catch(e){ ok(false, `${st.id}: しらべで エラー ${e.message}`); }
        sigs.add(q.sig);
      }
    }
    stats[st.id] = {q:qn, uniq:sigs.size};
  }
}
/* もとの gen も つつんだ あと うごく */
for(const gen of [{gen:'pattern', level:'p4'}, {gen:'maze', w:5, h:5}, {gen:'rotate', n:4, g:3, marks:1}]){
  for(let s = 1; s <= 5; s++){ try{ const qs = P1.generate(gen, 5, 5, s); ok(qs.length === 5 && qs.every(q => q.t === gen.gen), 'もとの gen ' + gen.gen); }catch(e){ ok(false, 'もとの gen ' + gen.gen + ' ' + e.message); } }
}
ok(P1.originalGenerate && P1.__puzzles2, 'install できた');

console.log(Object.entries(stats).map(([k, v]) => `${k}:${v.q}もん(しゅるい${v.uniq})`).join('  '));
console.log(`\nチェック ${checks} こ、しっぱい ${fails} こ（${((Date.now() - t0) / 1000).toFixed(1)}びょう）`);
process.exit(fails ? 1 : 0);

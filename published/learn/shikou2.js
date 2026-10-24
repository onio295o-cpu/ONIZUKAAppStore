/* ================================================================
   しこうりょく 2：あたらしい 7つの ゲームの 画面（もんだいの しゅるい）
   なかまはずれ(odd)・かがみの せかい(mirror)・じょうけん パズル(logic)・じゅんばん きおく(memory)
   かげあて(shadow)・ブロック つみ(blocks)・かたち あわせ(tangram)
   - learn/learn.js の あとに よみこむ（Learn.TYPES に たす）。もんだいは learn/puzzles2.js が 生成・検証する
   - もんだいの ながれ：setup → intro → input → (まちがい 1かいめ) hint → explain（せつめいの もじを かえす）
   ================================================================ */
(() => {
'use strict';
const L = window.Learn;
if(!L || !L.TYPES || !L.kit){ console.warn('shikou2.js: learn/learn.js を さきに よみこんでください'); return; }
const {submit, sleep, tap, esc} = L.kit;
const Voice = L.Voice, ruby = L.ruby;
const P2 = () => window.Puzzles2;
const range = n => Array.from({length:n}, (_, i) => i);

/* ---------------- きょうつうの どうぐ ---------------- */
// えらぶ ボタン（4つの ときは スマホで 2×2 に ならべて おおきく する）
function pickGrid(c, parent, items, html, opt = {}){
  const box = document.createElement('div');
  box.className = 'lq-pick s2-pick' + (opt.cls ? ' ' + opt.cls : '');
  box.dataset.n = items.length; box.style.setProperty('--n', items.length);
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'btn'; b.dataset.v = i; b.innerHTML = html(it, i);
    const lab = opt.label ? opt.label(it, i) : ''; if(lab) b.setAttribute('aria-label', lab);
    b.onclick = () => submit(c, i, b);
    box.append(b);
  });
  parent.append(box);
  return box;
}
const pickAns = c => { c.ans = c.q.ans; c.ansLabel = 'みどりの もの'; c.ansSay = ''; };
function markOk(c){ const b = c.pick && c.pick.querySelector(`[data-v="${c.q.ans}"]`); if(b) b.classList.add('ok'); }
// ヒント：もじでも みせる（こえを とめていても わかるように）。よみあげは learn.js が hintSay を つかう
function showHint(c, text){
  c.hintSay = text;
  let el = c.vis.querySelector('.s2-hint');
  if(!el){ el = document.createElement('div'); el.className = 's2-hint'; c.vis.append(el); }
  el.innerHTML = '💡 ' + ruby(text);
}
function setText(c, text){ c.text = text; c.say = text; const el = document.getElementById('lqText'); if(el) el.innerHTML = ruby(text); }

/* ---------------- え（SVG） ---------------- */
const COLOR_HEX = {red:'#ff5a6e', blue:'#43a6ff', yellow:'#ffd23f', green:'#3ec46d', purple:'#a77bff'};
const SHAPE_SVG = {
  circle:'<circle cx="50" cy="50" r="40"/>',
  triangle:'<polygon points="50,8 93,88 7,88"/>',
  square:'<rect x="12" y="12" width="76" height="76" rx="8"/>',
  star:'<polygon points="50,6 62,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 38,38"/>',
  heart:'<path d="M50 90 C 10 62, 4 34, 26 20 C 40 12, 50 24, 50 30 C 50 24, 60 12, 74 20 C 96 34, 90 62, 50 90 Z"/>',
};
// こま {color, shape, size, count}
function itemSVG(it){
  const fill = COLOR_HEX[it.color] || '#999', sc = it.size === 'small' ? .55 : 1, n = it.count || 1;
  const one = (x, y, k) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})" fill="${fill}" stroke="#3b2a1e" stroke-width="${Math.min(10, 6 / Math.max(k, .5)).toFixed(1)}" stroke-linejoin="round">${SHAPE_SVG[it.shape]}</g>`;
  let g;
  if(n > 1){
    const cols = 2, rows = Math.ceil(n / cols), k = .9 / Math.max(cols, rows) * sc;
    g = range(n).map(i => { const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols); return one(50 - inRow * 50 * k + (i % cols) * 100 * k, 50 - rows * 50 * k + r * 100 * k, k); }).join('');
  }else g = one(50 - 50 * sc, 50 - 50 * sc, sc);
  return `<svg viewBox="0 0 100 100" class="s2-item" aria-hidden="true">${g}</svg>`;
}
// かがみの ます目
const MCOL = ['#ffffff', '#ff8a3d', '#43a6ff', '#3ec46d'];
function gridSVG(g, opt = {}){
  const n = g.length; let s = '';
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){
    const v = g[y][x];
    s += `<rect x="${x + .05}" y="${y + .05}" width=".9" height=".9" rx=".12" fill="${v ? MCOL[v] : '#fff'}" stroke="${v ? '#3b2a1e' : '#d8cfc2'}" stroke-width="${v ? .07 : .04}"/>`;
  }
  if(opt.hl) s += opt.axis === 'ud' ? `<rect x="-.02" y="${n - 1 - .02}" width="${n + .04}" height="1.04" fill="none" stroke="#ffb800" stroke-width=".14" rx=".15"/>` : `<rect x="${n - 1 - .02}" y="-.02" width="1.04" height="${n + .04}" fill="none" stroke="#ffb800" stroke-width=".14" rx=".15"/>`;
  return `<svg viewBox="-.1 -.1 ${n + .2} ${n + .2}" class="s2-grid" aria-hidden="true">${s}</svg>`;
}
// かげあての かたち（くみあわせ）
function compSVG(parts, black){
  const P = P2();
  return `<svg viewBox="0 0 100 100" class="s2-comp" aria-hidden="true">${parts.map(p => `<polygon points="${P.partPoly(p).map(q => q.join(',')).join(' ')}" fill="${black ? '#2a2420' : COLOR_HEX[p.c] || '#999'}" stroke="${black ? '#2a2420' : '#3b2a1e'}" stroke-width="2.2" stroke-linejoin="round"/>`).join('')}</svg>`;
}
// つみき（ななめうえから）。opt: layers=だんごとに いろ / upto=その だんまで / labels={"x,y,z":ばんごう}
const WOOD = ['#ffdca0', '#f0b25e', '#d68a35'];
const LAYER = [['#cfeaff', '#86c6f7', '#4f9fe0'], ['#d4f5cc', '#8fdc84', '#58b94d'], ['#ffd6e0', '#ffa3ba', '#e57492'], ['#e6d9ff', '#bea4f5', '#9b7ae0']];
function blocksSVG(h, opt = {}){
  const P = P2(), S = 30, iso = (x, y, z) => P.isoP(x, y, z).map(v => +(v * S).toFixed(1));
  const W = h.length, D = h[0].length, maxH = Math.max(...h.flat());
  const pts = []; for(const x of [0, W]) for(const y of [0, D]) for(const z of [0, maxH]) pts.push(iso(x, y, z));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 6;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2];
  const poly = (ps, fill) => `<polygon points="${ps.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="#3b2a1e" stroke-width="1.7" stroke-linejoin="round"/>`;
  let s = poly([iso(0, 0, 0), iso(W, 0, 0), iso(W, D, 0), iso(0, D, 0)], '#efe6d6');   // ゆか
  for(let i = 1; i < W; i++){ const a = iso(i, 0, 0), b = iso(i, D, 0); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d2c3a8" stroke-width="1.2"/>`; }
  for(let j = 1; j < D; j++){ const a = iso(0, j, 0), b = iso(W, j, 0); s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d2c3a8" stroke-width="1.2"/>`; }
  const cubes = [];
  h.forEach((col, x) => col.forEach((hh, y) => { for(let z = 0; z < Math.min(hh, opt.upto || hh); z++) cubes.push({x, y, z}); }));
  cubes.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));   // おくから じゅんに かく
  for(const {x, y, z} of cubes){
    const col = opt.layers ? LAYER[z % LAYER.length] : WOOD;
    s += poly([iso(x, y, z + 1), iso(x + 1, y, z + 1), iso(x + 1, y + 1, z + 1), iso(x, y + 1, z + 1)], col[0]);   // うえ
    s += poly([iso(x + 1, y, z + 1), iso(x + 1, y, z), iso(x + 1, y + 1, z), iso(x + 1, y + 1, z + 1)], col[2]);   // みぎ
    s += poly([iso(x, y + 1, z + 1), iso(x + 1, y + 1, z + 1), iso(x + 1, y + 1, z), iso(x, y + 1, z)], col[1]);   // ひだり
    const lab = opt.labels && opt.labels[`${x},${y},${z}`];
    if(lab != null){ const [tx, ty] = iso(x + .5, y + .5, z + 1); s += `<text x="${tx}" y="${ty + 5}" text-anchor="middle" font-size="15" font-weight="900" fill="#3b2a1e">${lab}</text>`; }
  }
  return `<svg viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" class="s2-blocks" role="img" aria-label="つみき">${s}</svg>`;
}
// ポリオミノ（マス）。layers=[{cells, fill, dash, cls}]、S=わくの おおきさ（マス）を そろえる
function polySVG(layers, S){
  const all = [].concat(...layers.map(l => l.cells)), w = Math.max(...all.map(c => c[0])) + 1, hh = Math.max(...all.map(c => c[1])) + 1;
  const Z = Math.max(S || 0, w, hh), ox = (Z - w) / 2, oy = (Z - hh) / 2;
  const rects = layers.map(l => l.cells.map(([x, y]) => `<rect x="${x + ox + .06}" y="${y + oy + .06}" width=".88" height=".88" rx=".12" fill="${l.fill}" stroke="${l.dash ? '#ff8a3d' : '#3b2a1e'}" stroke-width="${l.dash ? .09 : .07}"${l.dash ? ' stroke-dasharray=".2 .12"' : ''}${l.cls ? ` class="${l.cls}"` : ''}/>`).join('')).join('');
  return `<svg viewBox="-.1 -.1 ${Z + .2} ${Z + .2}" class="s2-poly" aria-hidden="true">${rects}</svg>`;
}
const restCells = q => q.target.filter(c => !q.gap.some(g => g[0] === c[0] && g[1] === c[1]));
const pieceSize = ps => Math.max(...ps.map(p => Math.max(...p.map(c => Math.max(c[0], c[1]))) + 1));

/* ---------------- じょうけん パズルの ちいさな え ---------------- */
function chipHTML(q, cd){
  const P = P2(), N = P.NAMES;
  if(q.kind === 'carry'){ const it = q.choices[q.ans]; return cd.a === 'a' ? `<span class="s2-chip"><i class="s2-ce">${esc(it.a)}</i><b>${esc(it.an)}</b></span>` : `<span class="s2-chip"><i class="s2-ce">${esc(it.h)}</i><b>${esc(it.hn)}</b></span>`; }
  let icon;
  if(cd.a === 'color') icon = `<i class="s2-dot" style="background:${COLOR_HEX[cd.v]}"></i>`;
  else if(cd.a === 'shape') icon = `<svg viewBox="0 0 100 100" class="s2-mini" aria-hidden="true"><g fill="#e2dbcf" stroke="#3b2a1e" stroke-width="8" stroke-linejoin="round">${SHAPE_SVG[cd.v]}</g></svg>`;
  else icon = `<svg viewBox="0 0 100 100" class="s2-mini" aria-hidden="true"><circle cx="50" cy="50" r="${cd.v === 'big' ? 42 : 22}" fill="#e2dbcf" stroke="#3b2a1e" stroke-width="8"/></svg>`;
  return `<span class="s2-chip${cd.neg ? ' neg' : ''}">${icon}<b>${esc(N[cd.v])}${cd.neg ? ' では ない' : ''}</b></span>`;
}
function condWord(cd){
  const P = P2();
  return cd.a === 'color' ? `${P.COLOR_ADJ[cd.v]} もの` : cd.a === 'shape' ? `${P.NAMES[cd.v]}の かたち` : `${P.NAMES[cd.v]} もの`;
}
const carryHTML = it => `<span class="s2-carry"><span class="a">${esc(it.a)}</span><span class="h">${esc(it.h)}</span></span>`;
const ROOF = ['#ff5a6e', '#43a6ff', '#3ec46d', '#a77bff'];
const houseLab = (h, n) => n === 3 ? ['ひだり', 'まんなか', 'みぎ'][h] : `${h + 1}ばんめ`;

/* ================================================================
   もんだいの しゅるい
   ================================================================ */
Object.assign(L.TYPES, {
  /* ① なかまはずれ：4つの なかから ちがう 1つを タップ */
  odd: {
    setup(c){
      const q = c.q; pickAns(c);
      c.text = 'なかまはずれは どれ？'; c.say = 'なかまはずれは どれ？ ひとつだけ ちがう ものを さがそう';
      c.pick = pickGrid(c, c.vis, q.items, it => q.kind === 'emoji' ? `<span class="s2-emo">${esc(it.e)}</span>` : itemSVG(it), {cls:'s2-odd', label:it => it.n || ''});
    },
    input(){},   // こたえる ボタンは え そのもの（setup で つくった）
    hint(c){
      const q = c.q, A = {color:'いろを よく みてね', shape:'かたちを よく みてね', count:'いくつ あるか かぞえて みよう', size:'おおきさを くらべて みよう'};
      showHint(c, q.kind === 'shape' ? A[q.attr] : q.mode === 'super' ? 'たべもの？ いきもの？ のりもの？ なんの なかまか かんがえよう' : 'おなじ なかまの 3つを さがそう。のこった 1つが こたえ だよ');
    },
    explain(c){
      markOk(c);
      c.pick.querySelectorAll('.btn').forEach(b => { if(+b.dataset.v !== c.q.ans) b.classList.add('mate'); });
      return P2().describeOdd(c.q);
    },
  },

  /* ② かがみの せかい：かがみ（みず）に うつした もようを えらぶ */
  mirror: {
    setup(c){
      const q = c.q, ud = q.axis === 'ud'; pickAns(c);
      c.text = ud ? 'みずに うつすと どう みえる？' : 'かがみに うつすと どう みえる？';
      const box = document.createElement('div'); box.className = 's2-mir' + (ud ? ' ud' : '');
      box.innerHTML = `<div class="s2-mbase">${gridSVG(q.base)}</div><div class="s2-mline" aria-hidden="true"></div><div class="s2-mq">?</div>`;
      c.vis.append(box); c.mBox = box;
    },
    input(c){ c.pick = pickGrid(c, c.inp, c.q.choices, g => gridSVG(g)); },
    hint(c){
      const q = c.q;
      c.mBox.querySelector('.s2-mbase').innerHTML = gridSVG(q.base, {hl:true, axis:q.axis});
      showHint(c, q.axis === 'ud' ? 'みずに いちばん ちかい よこの れつを みてね。みずの すぐ そばに うつるよ' : 'かがみに いちばん ちかい たての れつを みてね。かがみの すぐ そばに うつるよ');
    },
    async explain(c){
      const q = c.q, mq = c.mBox.querySelector('.s2-mq');
      mq.classList.add('on'); mq.innerHTML = `<div class="s2-flip ${q.axis}">${gridSVG(q.base)}</div>`;
      markOk(c);
      await sleep(80, c.t); mq.firstChild.classList.add('go'); await sleep(900, c.t);
      return (q.axis === 'ud' ? 'みずに うつすと、うえと したが はんたいに なるよ。みぎと ひだりは そのまま だよ' : 'かがみに うつすと、みぎと ひだりが はんたいに なるよ。うえと したは そのまま だよ') + (q.traps && q.traps.orig ? '。もとの ままの ものは ちがうよ' : '');
    },
  },

  /* ③ じょうけん パズル */
  logic: {
    setup(c){
      const q = c.q; pickAns(c);
      if(q.kind === 'house') return L.TYPES.logic.setupHouse(c);
      c.text = q.text; c.say = q.text;
      const chips = document.createElement('div'); chips.className = 's2-chips';
      chips.innerHTML = q.conds.map(cd => chipHTML(q, cd)).join('<b class="s2-plus">＋</b>');
      c.vis.append(chips); c.chips = chips;
    },
    setupHouse(c){
      const q = c.q, n = q.n, P = P2();
      c.text = q.text;
      c.say = 'ヒントを よく きいてね。' + q.clues.map(cl => cl.say).join('。') + '。' + q.text;
      c.ansLabel = q.ask.k === 'where' ? `${P.posName(q.choices[q.ans], n)}の いえ` : q.animals[q.ans].n; c.ansSay = c.ansLabel;
      const mem = document.createElement('div'); mem.className = 's2-members';
      mem.innerHTML = q.animals.map(a => `<span>${esc(a.e)}<small>${esc(a.n)}</small></span>`).join('');
      const hs = document.createElement('div'); hs.className = 's2-houses'; hs.style.setProperty('--n', n);
      hs.innerHTML = range(n).map(h => { const ask = q.ask.k === 'who' && q.ask.h === h;
        return `<div class="s2-house${ask ? ' ask' : ''}" data-h="${h}"><div class="roof" style="--rc:${ROOF[h % ROOF.length]}"></div><div class="body"><span class="who">${ask ? '❓' : ''}</span></div><div class="lab">${houseLab(h, n)}</div></div>`; }).join('');
      const ol = document.createElement('ol'); ol.className = 's2-clues';
      ol.innerHTML = q.clues.map(cl => `<li>${ruby(cl.text)}</li>`).join('');
      c.vis.append(mem, hs, ol); c.houses = hs; c.clueEl = ol;
    },
    input(c){
      const q = c.q;
      if(q.kind === 'house'){
        const where = q.ask.k === 'where';
        c.pick = pickGrid(c, c.inp, q.choices, v => where ? `<span class="s2-hb">🏠</span><small>${houseLab(v, q.n)}</small>` : `<span class="s2-emo sm">${esc(q.animals[v].e)}</span><small>${esc(q.animals[v].n)}</small>`,
          {label:v => where ? houseLab(v, q.n) : q.animals[v].n});
        return;
      }
      c.pick = pickGrid(c, c.inp, q.choices, it => q.kind === 'carry' ? carryHTML(it) : itemSVG(Object.assign({count:1}, it)), {label:it => q.kind === 'carry' ? `${it.hn}を もった ${it.an}` : ''});
    },
    hint(c){
      const q = c.q;
      if(q.kind === 'house'){ const li = c.clueEl.children[q.key]; if(li) li.classList.add('hl'); showHint(c, 'まず ひかっている ヒントから かんがえよう'); return; }
      if(q.kind === 'carry'){ showHint(c, `まず ${q.choices[q.ans].an}を さがそう。つぎに もっている ものを みてね`); return; }
      const i = Math.max(0, q.conds.findIndex(cd => !cd.neg)), chip = c.chips.querySelectorAll('.s2-chip')[i];
      if(chip) chip.classList.add('hl');
      showHint(c, `1つずつ たしかめよう。まず ${condWord(q.conds[i])}を さがそう`);
    },
    async explain(c){
      const q = c.q; markOk(c);
      if(q.kind === 'house'){
        for(let h = 0; h < q.n; h++){ const el = c.houses.querySelector(`[data-h="${h}"] .who`); el.textContent = q.animals[q.sol.indexOf(h)].e; el.classList.add('pop'); await sleep(250, c.t); }
        for(const li of c.clueEl.children){ li.classList.remove('hl'); li.classList.add('ok'); await sleep(200, c.t); }
      }
      return P2().describeLogic(q);
    },
  },

  /* ④ じゅんばん きおく：1つずつ でてくる えを おぼえて、おなじ じゅんばんに タップ */
  memory: {
    setup(c){
      const q = c.q;
      c.ans = q.seq.join(','); c.ansLabel = q.seq.map(i => q.pal[i].e).join(' → '); c.ansSay = ''; c.taps = [];
      c.text = 'でてくる じゅんばんを おぼえてね'; c.say = 'おなじ じゅんばんに タップしよう';
      const box = document.createElement('div'); box.className = 's2-mem';
      box.innerHTML = `<div class="s2-stage"><span class="s2-eye">👀</span></div><div class="s2-slots">${q.seq.map((_, i) => `<span data-i="${i}"><small>${i + 1}</small></span>`).join('')}</div>`;
      c.vis.append(box); c.stage = box.querySelector('.s2-stage'); c.slots = box.querySelector('.s2-slots');
    },
    // じゅんばんに 1つずつ みせる（なまえも いう）
    async play(c){
      const q = c.q;
      for(let i = 0; i < q.seq.length; i++){
        const it = q.pal[q.seq[i]], slot = c.slots.children[i];
        c.stage.innerHTML = `<span class="s2-show">${esc(it.e)}</span><b class="s2-no">${i + 1}</b>`;
        slot.classList.add('now'); Voice.say(it.n, {quiet:0, rate:1.05});
        await sleep(q.ms, c.t);
        slot.classList.remove('now'); c.stage.innerHTML = '';
        await sleep(280, c.t);
      }
      c.stage.innerHTML = '<span class="s2-eye">🤔</span>';
    },
    async intro(c){
      await Voice.say('よく みて おぼえてね');
      await sleep(250, c.t);
      await L.TYPES.memory.play(c);
      setText(c, 'おなじ じゅんばんに タップしよう');
    },
    drawSlots(c, seq){
      [...c.slots.children].forEach((s, k) => { const v = seq ? seq[k] : c.taps[k]; s.innerHTML = v != null ? `<span>${esc(c.q.pal[v].e)}</span>` : `<small>${k + 1}</small>`; s.classList.toggle('f', v != null); });
    },
    input(c){
      const q = c.q, T = L.TYPES.memory, box = document.createElement('div');
      box.className = 's2-palette'; box.dataset.n = q.pal.length;
      q.pal.forEach((it, i) => {
        const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `<span>${esc(it.e)}</span>`; b.setAttribute('aria-label', it.n);
        b.onclick = () => {
          if(c.locked || c.taps.length >= q.seq.length) return;
          tap(); c.taps.push(i); T.drawSlots(c);
          b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
          if(c.taps.length === q.seq.length) submit(c, c.taps.join(','), null);
        };
        box.append(b);
      });
      const undo = document.createElement('button'); undo.className = 'btn sub s2-undo'; undo.textContent = '↩ 1つ けす';
      undo.onclick = () => { if(c.locked || !c.taps.length) return; tap(); c.taps.pop(); T.drawSlots(c); };
      c.inp.append(box, undo);
    },
    check(c, v){ return v === c.ans; },
    async hint(c){
      c.taps = []; L.TYPES.memory.drawSlots(c);
      showHint(c, 'もういちど みせるね。よく みてね');
      await Voice.say('もういちど みせるね');
      await L.TYPES.memory.play(c);
      c.hintSay = 'おなじ じゅんばんに タップしよう';
    },
    explain(c){
      const q = c.q, mine = c.taps.slice(), right = mine.join(',') === c.ans;
      L.TYPES.memory.drawSlots(c, q.seq);
      [...c.slots.children].forEach((s, k) => s.classList.toggle('ng', !right && mine[k] !== q.seq[k]));
      const names = q.seq.map(i => q.pal[i].n).join('、');
      return right ? `${names}。ばっちり おぼえて いたね` : `${names} の じゅんばん だったよ。なまえを こころの なかで いいながら みると おぼえやすいよ`;
    },
  },

  /* ⑤ かげあて：くろい かげと おなじ かたちを えらぶ */
  shadow: {
    setup(c){
      const q = c.q; pickAns(c);
      c.text = 'この かげは どれかな？'; c.say = 'くろい かげと おなじ かたちは どれかな？';
      const box = document.createElement('div'); box.className = 's2-shadow';
      box.innerHTML = q.kind === 'emoji' ? `<span class="s2-silemo" aria-hidden="true">${esc(q.shadow)}</span>` : compSVG(q.parts, true);
      c.vis.append(box); c.shBox = box;
    },
    input(c){
      const q = c.q;
      c.pick = pickGrid(c, c.inp, q.choices, ch => q.kind === 'emoji' ? `<span class="s2-emo">${esc(ch.e)}</span>` : compSVG(ch, false), {label:ch => ch.n || ''});
    },
    hint(c){
      const q = c.q; c.shBox.classList.add('hl');
      showHint(c, q.kind === 'emoji' ? 'あたまや あし、しっぽの かたちを くらべて みよう' : q.mirror ? 'かたちの ばしょと むきを よく みてね' : 'どんな かたちが どこに あるかな？ よく くらべて みよう');
    },
    async explain(c){
      const q = c.q; markOk(c); c.shBox.classList.remove('hl');
      const over = document.createElement('div'); over.className = 's2-over';
      over.innerHTML = q.kind === 'emoji' ? `<span class="s2-silemo color">${esc(q.choices[q.ans].e)}</span>` : compSVG(q.choices[q.ans], false);
      c.shBox.append(over);
      await sleep(60, c.t); over.classList.add('on'); await sleep(800, c.t);
      return P2().describeShadow(q);
    },
  },

  /* ⑥ ブロック つみ：つみきは ぜんぶで いくつ？（こたえは かず） */
  blocks: {
    setup(c){
      const q = c.q;
      c.ans = q.n; c.choices = q.choices.slice(); c.ansLabel = `${q.n}こ`; c.ansSay = `${q.n}こ`;
      c.text = 'つみきは ぜんぶで いくつ？'; c.say = q.hidden ? 'つみきは ぜんぶで いくつ？ かくれている つみきも かぞえよう' : 'つみきは ぜんぶで いくつ？';
      const box = document.createElement('div'); box.className = 's2-bwrap'; box.innerHTML = blocksSVG(q.h);
      c.vis.append(box); c.bBox = box;
    },
    hint(c){
      c.bBox.innerHTML = blocksSVG(c.q.h, {layers:true});
      showHint(c, c.q.hidden ? 'うえに のっている つみきの したにも つみきが あるよ。したの だんから かぞえよう' : 'いろごとに、したの だんから かぞえよう');
    },
    async explain(c){
      const q = c.q, h = q.h, maxH = Math.max(...h.flat()), labels = {};
      let k = 0;
      for(let z = 0; z < maxH; z++){   // したの だんから 1だんずつ つんで、ばんごうを つける
        const cells = [];
        h.forEach((col, x) => col.forEach((hh, y) => { if(hh > z) cells.push([x, y]); }));
        cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]).forEach(([x, y]) => labels[`${x},${y},${z}`] = ++k);
        c.bBox.innerHTML = blocksSVG(h, {layers:true, upto:z + 1, labels});
        await sleep(1100, c.t);
      }
      return P2().describeBlocks(q);
    },
  },

  /* ⑦ かたち あわせ：あいている ところに はいる ピース／2つで できる くみあわせ */
  tangram: {
    setup(c){
      const q = c.q; pickAns(c);
      const turn = q.rot ? 'まわしても いいよ。' : '';
      c.text = q.mode === 'fill' ? `${turn}あいている ところに ぴったり はいるのは どれ？` : `${turn}どの 2つを あわせると この かたちに なる？`;
      const box = document.createElement('div'); box.className = 's2-board';
      box.innerHTML = q.mode === 'fill' ? polySVG([{cells:restCells(q), fill:'#43a6ff'}, {cells:q.gap, fill:'#fff', dash:true, cls:'gap'}]) : polySVG([{cells:q.target, fill:'#d9cfbf'}]);
      c.vis.append(box); c.board = box;
    },
    input(c){
      const q = c.q, S = pieceSize(q.mode === 'fill' ? q.choices : [].concat(...q.choices));
      c.pick = pickGrid(c, c.inp, q.choices, ch => q.mode === 'fill' ? polySVG([{cells:ch, fill:'#ff8a3d'}], S)
        : `<span class="s2-pair">${polySVG([{cells:ch[0], fill:'#ff8a3d'}], S)}<b>＋</b>${polySVG([{cells:ch[1], fill:'#3ec46d'}], S)}</span>`, {cls:q.mode === 'pair' ? 's2-pairs' : ''});
    },
    hint(c){
      const q = c.q;
      if(q.mode === 'fill'){ c.board.classList.add('hl'); showHint(c, 'あいている マスは いくつ？ かたちも よく みてね'); }
      else showHint(c, `ぜんぶで ${q.target.length}マス だよ。マスの かずと かたちを くらべて みよう`);
    },
    async explain(c){
      const q = c.q; markOk(c); c.board.classList.remove('hl');
      c.board.innerHTML = q.mode === 'fill' ? polySVG([{cells:restCells(q), fill:'#43a6ff'}, {cells:q.gap, fill:'#ff8a3d', cls:'s2-in'}])
        : polySVG([{cells:q.place.a, fill:'#ff8a3d', cls:'s2-in'}, {cells:q.place.b, fill:'#3ec46d', cls:'s2-in'}]);
      await sleep(600, c.t);
      return P2().describeTangram(q);
    },
  },
});
})();

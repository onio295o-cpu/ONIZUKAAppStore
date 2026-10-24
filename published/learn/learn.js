/* ================================================================
   がくしゅう モジュール（プロフィール・5きょうか・きょうつう もんだい システム・さんすう）
   - 既存の ゲーム（index.html）の 上に 追加する。既存の 画面・保存データ（sansu-party）は さわらない
   - プロフィールと がくしゅう記録は 端末内（localStorage）の べつの キーに 保存する
   - 問題データは learn/data/*.json に 分けて あり、UI と 切りはなして 追加できる
   ================================================================ */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const RB = /\{([^|{}]+)\|([^{}]+)\}/g;   // ふりがな：{漢字|かんじ}
const ruby = s => esc(s).replace(RB, '<ruby>$1<rt>$2</rt></ruby>');
const reading = s => String(s).replace(RB, '$2');
// よみあげ用：じょしの「は」を「わ」に（よみあげでは「ハ」と よまれる ため）
const speechOf = s => reading(s).replace(/は(?=[ 　？！、。]|$)/g, 'わ').replace(/＋/g, ' たす ').replace(/−/g, ' ひく ').replace(/＝/g, ' わ ');
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tap = k => { try{ window.sfx && sfx(k || 'tap'); }catch(e){} };
// 既存の 設定（const save は window に のらないので typeof で みる）
const voiceOn = () => { try{ return typeof save === 'undefined' || save.voice !== false; }catch(e){ return true; } };

/* ---------------- ほぞん（端末内だけ） ---------------- */
const PKEY = 'chiiku-profiles-v1', GKEY = id => 'chiiku-progress-v1:' + id;
const mem = {};
const Store = {
  get(k, d){ try{ const v = localStorage.getItem(k); if(v != null) return JSON.parse(v); }catch(e){} return k in mem ? JSON.parse(mem[k]) : d; },
  set(k, v){ const s = JSON.stringify(v); mem[k] = s; try{ localStorage.setItem(k, s); return true; }catch(e){ return false; } },
  del(k){ delete mem[k]; try{ localStorage.removeItem(k); }catch(e){} },
};
const ICONS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊', '🐸', '🐯', '🦁', '🐨', '🐧', '🦄'];
const COLORS = ['#ffe08a', '#bfe6ff', '#ffc9d4', '#c8f0c0', '#e3d4ff', '#ffd9b3'];
const Profiles = {
  data: null,
  load(){ this.data = Store.get(PKEY, null) || {v:1, current:null, list:[]}; return this.data; },
  save(){ return Store.set(PKEY, this.data); },
  list(){ return this.data.list; },
  get(id){ return this.data.list.find(p => p.id === id) || null; },
  current(){ return this.get(this.data.current); },
  use(id){ this.data.current = id; this.save(); },
  upsert(p){
    const i = this.data.list.findIndex(x => x.id === p.id);
    if(i < 0) this.data.list.push(p); else this.data.list[i] = p;
    return this.save();
  },
  remove(id){
    this.data.list = this.data.list.filter(p => p.id !== id);
    if(this.data.current === id) this.data.current = null;
    Store.del(GKEY(id)); this.save();
  },
};
// プロフィールごとの がくしゅう記録（キーが べつなので まざらない）
const Progress = {
  of(pid){ return Store.get(GKEY(pid), null) || {v:1, subjects:{}, weak:{}}; },
  put(pid, g){ return Store.set(GKEY(pid), g); },
  subj(g, sid){ return g.subjects[sid] || (g.subjects[sid] = {ages:{}, correct:0, total:0}); },
  stage(g, sid, age, stid){ const a = this.subj(g, sid).ages[age] || (this.subj(g, sid).ages[age] = {stages:{}}); return a.stages[stid] || null; },
  stars(g){ let n = 0; Object.values(g.subjects).forEach(s => Object.values(s.ages).forEach(a => Object.values(a.stages).forEach(st => n += st.stars || 0))); return n; },
  rate(g, sid){ const s = sid ? g.subjects[sid] : null; const c = sid ? (s ? s.correct : 0) : Object.values(g.subjects).reduce((n, x) => n + x.correct, 0);
    const t = sid ? (s ? s.total : 0) : Object.values(g.subjects).reduce((n, x) => n + x.total, 0); return t ? Math.round(c / t * 100) : null; },
};

/* ---------------- こえ ----------------
   きまった セリフは がくしゅうナビの 録音（voice/learn/*.mp3）、それ いがいは ブラウザの よみあげ。
   外部の 有料サービスは つかわない */
const CLIP_DIR = 'voice/learn/';
const CLIPS = {
  'せいかい！':'lv_seikai', 'できたね！':'lv_dekita', 'おしい！ ヒントを みてね':'lv_oshii', 'いっしょに かぞえよう':'lv_kazoe', 'みていてね':'lv_mite',
  'すごい！ ほしが 3こ！':'lv_st3', 'よく できました！ ほしが 2こ':'lv_st2', 'がんばったね！ ほしが 1こ':'lv_st1', 'もういちど ちょうせん してみよう':'lv_st0',
  'つぎの ステージが あそべるように なったよ':'lv_unlock', 'じゅんびちゅう だよ。もうすこし まってね':'lv_junbi', 'まえの ステージで ほしを 1こ とると あそべるよ':'lv_lock',
  'こくご':'lv_kokugo', 'さんすう':'lv_sansu', 'こっき':'lv_kokki', 'うちゅう':'lv_uchu', 'えいご':'lv_eigo',
  'まるは いくつ あるかな？':'lv_q_count', 'まるは いくつ？ 5の まとまりを みてね':'lv_q_see', 'あと いくつで 10？':'lv_q_ten', 'まるが おおいのは どっち？':'lv_q_cmp',
  'なんじ かな？':'lv_q_clock', 'ぜんぶで なんえん？':'lv_q_money', 'つぎに くる かずは なに？':'lv_q_seq', 'しかくに はいる かずは なに？':'lv_q_blank', 'ちいさい じゅんに タップしよう':'lv_q_order',
  '5の まとまりを みてね。いくつ かな？':'lv_h_rows', 'あいている ところを かぞえてね':'lv_h_empty', '?の まるを かぞえてね':'lv_h_q', 'かずを くらべて みよう':'lv_h_cmp',
  'となりの かずと くらべて みよう':'lv_h_seq', 'おおきい おかねから じゅんに たそう':'lv_h_money', 'ふえた まるも いっしょに かぞえよう':'lv_h_add', 'ばつの ついていない まるを かぞえよう':'lv_h_sub',
  'ふえた ところも かぞえてね':'lv_h_more', 'ばつの ついた まるは なくなるよ':'lv_h_less', 'つぎは いちばん ちいさい かずを さがそう':'lv_h_order', 'したの だんの まるを かぞえよう':'lv_h_lower',
  'うえの だんが 5こ':'lv_h_top', 'ひとつずつ かぞえて みよう':'lv_h_one',
  // しこうりょく
  'しこうりょく':'lv_shikou', 'つぎに くるのは どれ？':'lv_q_next', '?に はいるのは どれ？':'lv_q_miss', 'ゴールまで いこう':'lv_q_goal', 'かぎを とってから ゴールへ いこう':'lv_q_key',
  'おなじ かたちは どれ？ まわして かんがえよう':'lv_q_rot', 'うらがえしは だめだよ。まわして おなじ かたちは どれ？':'lv_q_rot2',
  'みぎに 1かい まわすと どれ？':'lv_q_ang1', 'みぎに 2かい まわすと どれ？':'lv_q_ang2', 'みぎに 3かい まわすと どれ？':'lv_q_ang3',
  'ゆっくり かんがえてね':'lv_e_slow', 'いっしょに たしかめよう':'lv_e_check', 'つぎは きっと できるよ':'lv_e_next',
  'いろの じゅんばんを みてね':'lv_h_color', 'かたちの じゅんばんを みてね':'lv_h_shape', 'くりかえしを さがそう':'lv_h_rep', 'ひかっている みちを すすもう':'lv_h_path', 'まわす ボタンで まわして みよう':'lv_h_spin',
  'かべが あるよ':'lv_m_wall', 'おばけの ところは とおれないよ':'lv_m_ghost', 'かぎを ゲットした！':'lv_m_key', 'いっしょに いこう':'lv_m_go',
};
for(let i = 1; i <= 20; i++) CLIPS[String(i)] = 'lv_n' + i;
const Voice = {
  last:null, slow:false, seq:0, jaVoice:null, enVoice:null,
  pick(){ try{ const vs = speechSynthesis.getVoices(); this.jaVoice = vs.find(v => /^ja/i.test(v.lang)) || null; this.enVoice = vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }catch(e){} },
  // よみあげて、おわったら resolve（よみあげ オフでも すぐ つぎへ すすめる）
  say(text, opt = {}){
    ++this.seq; this.last = {text, opt};
    this.halt();
    if(!voiceOn() || !text) return new Promise(r => setTimeout(r, opt.quiet ?? 250));
    const key = !opt.lang && CLIPS[text];
    if(key) return this.clip(key);
    if(!('speechSynthesis' in window)) return new Promise(r => setTimeout(r, opt.quiet ?? 250));
    return new Promise(res => {
      let done = false; const fin = () => { if(!done){ done = true; clearTimeout(tm); res(); } };
      const u = new SpeechSynthesisUtterance(opt.raw ? text : speechOf(text));
      const en = opt.lang && /^en/.test(opt.lang);
      u.lang = en ? 'en-US' : 'ja-JP'; const v = en ? this.enVoice : this.jaVoice; if(v) u.voice = v;
      u.rate = (opt.rate || .95) * (this.slow ? .72 : 1); u.pitch = opt.pitch || 1.15;
      u.onend = u.onerror = fin;
      const tm = setTimeout(fin, 1500 + reading(text).length * 260 / (this.slow ? .72 : 1));
      try{ speechSynthesis.speak(u); }catch(e){ fin(); }
    });
  },
  // 録音を ながす（おわったら resolve。よめない ときは ブラウザの よみあげに きりかえ）
  clip(key){
    return new Promise(res => {
      let done = false; const a = new Audio(CLIP_DIR + key + '.mp3'); this.audio = a;
      const fin = () => { if(!done){ done = true; clearTimeout(tm); res(); } };
      const tm = setTimeout(fin, 8000);
      a.playbackRate = this.slow ? .8 : 1; a.onended = fin;
      a.onerror = () => { if(this.audio === a){ this.audio = null; const t = Object.keys(CLIPS).find(k => CLIPS[k] === key); this.tts(t).then(fin); } else fin(); };
      a.play().catch(() => fin());
      a.addEventListener('pause', fin);
    });
  },
  tts(text){ return new Promise(res => { try{ const u = new SpeechSynthesisUtterance(speechOf(text)); u.lang = 'ja-JP'; if(this.jaVoice) u.voice = this.jaVoice; u.rate = this.slow ? .7 : .95; u.onend = u.onerror = () => res(); speechSynthesis.speak(u); setTimeout(res, 1500 + text.length * 260); }catch(e){ res(); } }); },
  halt(){ if(this.audio){ const a = this.audio; this.audio = null; try{ a.pause(); }catch(e){} } try{ window.stopVoice ? stopVoice() : speechSynthesis.cancel(); }catch(e){} },
  stop(){ this.seq++; this.halt(); },
  replay(){ if(this.last) return this.say(this.last.text, this.last.opt); },
};
try{ Voice.pick(); speechSynthesis.onvoiceschanged = () => Voice.pick(); }catch(e){}

/* ---------------- がめん ---------------- */
const IDS = ['lprof', 'ledit', 'lhome', 'lstage', 'lplay'];
function mountScreens(){
  const html = id => `<section id="${id}" class="screen bg-night stars ln hide"><div class="wrap" id="${id}W"></div></section>`;
  const box = document.createElement('div'); box.innerHTML = IDS.map(html).join('');
  const anchor = $('fxl') || document.body.firstChild;
  [...box.children].forEach(s => document.body.insertBefore(s, anchor));
  if(typeof SCREENS !== 'undefined' && Array.isArray(SCREENS)) IDS.forEach(id => SCREENS.includes(id) || SCREENS.push(id));
}
function go(id){
  Run.stop();
  if(typeof window.show === 'function'){ try{ show(id); }catch(e){ fallbackShow(id); } } else fallbackShow(id);
  ({lprof:renderProfiles, lhome:renderHome, lstage:renderStages})[id]?.();
  const sc = $(id); if(sc) sc.scrollTop = 0;
}
function fallbackShow(id){ document.querySelectorAll('section.screen').forEach(s => s.classList.toggle('hide', s.id !== id)); }
function toast(msg, speak){ document.querySelectorAll('.ltoast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'ltoast'; t.innerHTML = ruby(msg); document.body.append(t); setTimeout(() => t.remove(), 2500); if(speak) Voice.say(msg); }
function avatar(p, size = 72){
  const st = `--s:${size}px;--bgc:${p.color || COLORS[0]}`, cls = 'lav' + (p.shape === 'square' ? ' sq' : '');
  return p.photo ? `<span class="${cls}" style="${st}"><img src="${esc(p.photo)}" alt=""></span>` : `<span class="${cls}" style="${st}">${esc(p.icon || '🐶')}</span>`;
}
const ageLabel = a => `${a}さい`;

/* ---------- プロフィール いちらん ---------- */
function renderProfiles(){
  const list = Profiles.list();
  $('lprofW').innerHTML = `
    <h1 class="title-logo">がくしゅう<br><span>パーティー</span></h1>
    <p class="lead">だれが あそぶ？</p>
    <div class="lp-grid" id="lpGrid"></div>
    ${list.length ? '' : '<p class="note">さいしょに プロフィールを つくろう。しゃしんや ことばは この たんまつの なかだけに ほぞんされます。</p>'}
    <button class="btn sub" id="lpGame">🎮 いつもの ゲームで あそぶ</button>
    <details class="note" style="text-align:left"><summary>クレジット（おとの そざい）</summary>
      がくしゅうナビ・なかまの こえ：Style-Bert-VITS2モデル「小春音アミ」、あみたろの声素材工房 (https://amitaro.net/)<br>
      のび太風・ボーボボ風の こえ（いちぶ）：Style-Bert-VITS2 JVNVモデル（JVNVコーパス、CC BY-SA 4.0）<br>
      ドラえもん風・プリキュア風・ジャイアン風ほかの こえ：ElevenLabs で 生成
    </details>`;
  const grid = $('lpGrid');
  list.forEach(p => {
    const g = Progress.of(p.id);
    const c = document.createElement('div'); c.className = 'lp-card'; c.setAttribute('role', 'button'); c.tabIndex = 0;
    c.innerHTML = `${avatar(p, 84)}<div class="nm"></div><div class="sub">${ageLabel(p.age)}・⭐${Progress.stars(g)}</div><button class="ed" aria-label="へんしゅう">✏️</button>`;
    c.querySelector('.nm').textContent = p.name;
    c.onclick = e => { if(e.target.closest('.ed')) return; tap(); Profiles.use(p.id); Voice.say(`${p.name}さん、いっしょに がんばろう`); go('lhome'); };
    c.querySelector('.ed').onclick = () => { tap(); openEdit(p.id); };
    grid.append(c);
  });
  const add = document.createElement('button'); add.className = 'lp-card add'; add.innerHTML = '<span class="plus">＋</span>あたらしく つくる';
  add.onclick = () => { tap(); openEdit(null); }; grid.append(add);
  $('lpGame').onclick = () => { tap(); go('home'); };
}

/* ---------- プロフィール へんしゅう（しゃしんは まる・しかくに きりぬき） ---------- */
let edit = null;
function openEdit(id){
  const p = id ? Profiles.get(id) : null;
  edit = p ? JSON.parse(JSON.stringify(p)) : {id:'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name:'', age:4, icon:ICONS[Profiles.list().length % ICONS.length], color:COLORS[Profiles.list().length % COLORS.length], photo:null, shape:'circle', created:Date.now()};
  edit.isNew = !p; crop = null;
  go('ledit'); renderEdit();
}
let crop = null;   // {img, z, ox, oy}
function renderEdit(){
  const e = edit;
  $('leditW').innerHTML = `
    <div class="hdr"><button class="btn ghost" id="leBack">← もどる</button><h2>${e.isNew ? 'あたらしい プロフィール' : 'プロフィール'}</h2><span class="sp"></span></div>
    <div style="display:flex;justify-content:center" id="lePrev">${avatar(e, 110)}</div>
    <div class="label">なまえ</div>
    <input type="text" id="leName" maxlength="12" placeholder="なまえを いれてね" autocomplete="off">
    <div class="label">ねんれい（コース）</div>
    <div class="le-ages">${[4, 5, 6].map(a => `<button class="btn ${e.age === a ? 'on' : ''}" data-a="${a}">${ageLabel(a)}</button>`).join('')}</div>
    <div class="label">アイコン</div>
    <div class="le-icons">${ICONS.map(i => `<button class="${!e.photo && e.icon === i ? 'on' : ''}" data-i="${i}">${i}</button>`).join('')}</div>
    <div class="label">いっしょに がんばる キャラ</div>
    <div class="le-buddy" id="leBuddy"></div>
    <div class="row">
      <label class="btn sub">📷 しゃしんを えらぶ<input type="file" id="leFile" accept="image/*" hidden></label>
      ${e.photo ? '<button class="btn sub" id="leNoPhoto">アイコンに もどす</button>' : ''}
    </div>
    <div class="le-crop hide" id="leCrop">
      <canvas id="leCv" width="480" height="480" class="${e.shape === 'square' ? 'sq' : ''}"></canvas>
      <input type="range" id="leZoom" min="1" max="4" step="0.01" value="1" aria-label="おおきさ">
      <div class="row" style="width:100%"><button class="btn sub" id="leShape">${e.shape === 'square' ? '⬜ しかく' : '⚪ まる'}</button><button class="btn" id="leCropOk">✂️ これで きりぬく</button></div>
      <p class="note">ゆびで うごかして、バーで おおきさを かえられます</p>
    </div>
    <button class="btn" id="leSave">✅ ほぞんする</button>
    ${e.isNew ? '' : '<button class="btn sub" id="leDel">🗑 この プロフィールを けす</button>'}`;
  $('leName').value = e.name;
  const S = window.SHEET_CHARS || {}, bb = $('leBuddy');
  const any = document.createElement('button'); any.className = !e.buddy ? 'on' : ''; any.innerHTML = '<span class="any">🎲</span>おまかせ'; any.onclick = () => { tap(); e.buddy = null; renderEdit(); }; bb.append(any);
  Object.entries(S).filter(([, c]) => c && c.frames).forEach(([id, c]) => { const b = document.createElement('button'); b.className = e.buddy === id ? 'on' : ''; b.innerHTML = `<img src="${c.frames.t000 || c.frames.p_wave}" alt=""><span></span>`; b.lastChild.textContent = c.name; b.onclick = () => { tap(); e.buddy = id; renderEdit(); }; bb.append(b); });
  $('leName').oninput = ev => { e.name = ev.target.value; };
  $('leBack').onclick = () => { tap(); go(Profiles.current() && !e.isNew ? 'lprof' : 'lprof'); };
  document.querySelectorAll('#leditW .le-ages .btn').forEach(b => b.onclick = () => { tap(); e.age = +b.dataset.a; renderEdit(); });
  document.querySelectorAll('#leditW .le-icons button').forEach(b => b.onclick = () => { tap(); e.icon = b.dataset.i; e.photo = null; renderEdit(); });
  $('leFile').onchange = ev => { const f = ev.target.files[0]; if(f) loadPhoto(f); };
  if($('leNoPhoto')) $('leNoPhoto').onclick = () => { tap(); e.photo = null; crop = null; renderEdit(); };
  $('leShape').onclick = () => { tap(); e.shape = e.shape === 'square' ? 'circle' : 'square'; $('leCv').classList.toggle('sq', e.shape === 'square'); $('leShape').textContent = e.shape === 'square' ? '⬜ しかく' : '⚪ まる'; };
  $('leCropOk').onclick = () => { tap(); finishCrop(); };
  $('leSave').onclick = saveEdit;
  if($('leDel')) $('leDel').onclick = () => {
    if(!confirm(`${e.name || 'この プロフィール'} を けしますか？ がくしゅうの きろくも きえます。`)) return;
    Profiles.remove(e.id); toast('けしました'); go('lprof');
  };
  if(crop) showCrop();
}
function loadPhoto(file){
  if(!/^image\//.test(file.type)){ toast('がぞうを えらんでね'); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { crop = {img, z:1, ox:0, oy:0, url}; showCrop(); };
  img.onerror = () => { URL.revokeObjectURL(url); toast('この しゃしんは よめませんでした'); };
  img.src = url;
}
function showCrop(){
  $('leCrop').classList.remove('hide');
  const cv = $('leCv'), x = cv.getContext('2d'), z = $('leZoom'); z.value = crop.z;
  const draw = () => {
    const {img} = crop, S = cv.width, base = Math.max(S / img.width, S / img.height), sc = base * crop.z;
    const w = img.width * sc, h = img.height * sc;
    crop.ox = Math.min(0, Math.max(S - w, crop.ox)); crop.oy = Math.min(0, Math.max(S - h, crop.oy));
    x.clearRect(0, 0, S, S); x.drawImage(img, crop.ox, crop.oy, w, h);
  };
  if(crop.ox === 0 && crop.oy === 0){ const S = cv.width, base = Math.max(S / crop.img.width, S / crop.img.height); crop.ox = (S - crop.img.width * base) / 2; crop.oy = (S - crop.img.height * base) / 2; }
  draw();
  z.oninput = () => { const S = cv.width, c = S / 2, k = +z.value / crop.z; crop.ox = c - (c - crop.ox) * k; crop.oy = c - (c - crop.oy) * k; crop.z = +z.value; draw(); };
  let drag = null;
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); drag = {x:ev.clientX, y:ev.clientY, ox:crop.ox, oy:crop.oy}; };
  cv.onpointermove = ev => { if(!drag) return; const r = cv.width / cv.clientWidth; crop.ox = drag.ox + (ev.clientX - drag.x) * r; crop.oy = drag.oy + (ev.clientY - drag.y) * r; draw(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  crop.draw = draw;
}
function finishCrop(){
  if(!crop) return;
  const out = document.createElement('canvas'); out.width = out.height = 256;
  out.getContext('2d').drawImage($('leCv'), 0, 0, 256, 256);
  edit.photo = out.toDataURL('image/jpeg', .82);
  try{ URL.revokeObjectURL(crop.url); }catch(e){}
  crop = null; renderEdit(); toast('きりぬきました');
}
function saveEdit(){
  const e = edit; e.name = (e.name || '').trim();
  if(!e.name){ toast('なまえを いれてね', true); $('leName').focus(); return; }
  if(crop) finishCrop();
  const p = {id:e.id, name:e.name.slice(0, 12), age:e.age, icon:e.icon, color:e.color, photo:e.photo || null, shape:e.shape, buddy:e.buddy || null, created:e.created};
  if(!Profiles.upsert(p)){ toast('ほぞんできませんでした（ようりょうが いっぱいかも）'); return; }
  if(e.isNew){ Profiles.use(p.id); tap('coin'); go('lhome'); } else { tap('coin'); go('lprof'); }
}

/* ---------- がくしゅう ホーム（5きょうか） ---------- */
let SUBJECTS = null; const DATA = {};
async function loadJSON(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
async function subjects(){ if(!SUBJECTS) SUBJECTS = (await loadJSON('learn/data/subjects.json')).subjects; return SUBJECTS; }
async function subjectData(s){ if(!DATA[s.id]) DATA[s.id] = await loadJSON(s.data); return DATA[s.id]; }
let curSubj = null;
async function renderHome(){
  const p = Profiles.current(); if(!p){ go('lprof'); return; }
  const g = Progress.of(p.id), rate = Progress.rate(g);
  $('lhomeW').innerHTML = `
    <div class="lh-top">${avatar(p, 64)}<div class="who"><b></b><span>${ageLabel(p.age)}コース</span></div><button class="btn ghost" id="lhSwitch">👥 かえる</button></div>
    <div class="lh-ages">${[4, 5, 6].map(a => `<button class="${p.age === a ? 'on' : ''}" data-a="${a}">${ageLabel(a)}</button>`).join('')}</div>
    <div class="panel lh-stat"><div>⭐<b>${Progress.stars(g)}</b>ほし</div><div>🎯<b>${rate == null ? '−' : rate + '%'}</b>せいかい</div><div>📝<b>${Object.values(g.weak).reduce((n, w) => n + Object.keys(w).length, 0)}</b>にがて</div></div>
    <div class="lh-subj" id="lhSubj"><p class="note">よみこみちゅう…</p></div>
    <button class="btn sub" id="lhGame">🎮 いつもの ゲームで あそぶ</button>`;
  $('lhomeW').querySelector('.who b').textContent = p.name;
  $('lhSwitch').onclick = () => { tap(); go('lprof'); };
  document.querySelectorAll('#lhomeW .lh-ages button').forEach(b => b.onclick = () => {
    tap(); p.age = +b.dataset.a; Profiles.upsert(p); Voice.say(`${p.age}さいの コースに したよ`); renderHome();
  });
  $('lhGame').onclick = () => { tap(); go('home'); };
  let list;
  try{ list = await subjects(); }catch(e){ $('lhSubj').innerHTML = '<p class="note">データを よみこめませんでした。つうしんを たしかめて、もういちど ひらいてね。</p>'; return; }
  const box = $('lhSubj'); if(!box) return; box.innerHTML = '';
  list.forEach(s => {
    const b = document.createElement('button'); b.className = 'btn' + (s.ready ? '' : ' off'); b.style.setProperty('--c', s.color);
    b.innerHTML = `<span class="ic">${s.icon}</span><span>${ruby(s.title)}</span>${s.ready ? '' : '<span class="soon">じゅんびちゅう</span>'}`;
    b.onclick = () => {
      tap();
      if(!s.ready){ toast(`${s.speak}は じゅんびちゅう だよ。もうすこし まってね`); Voice.say(s.speak).then(() => Voice.say('じゅんびちゅう だよ。もうすこし まってね')); return; }
      curSubj = s; Voice.say(s.speak); go('lstage');
    };
    box.append(b);
  });
}

/* ---------- ステージ いちらん（track＝ゲームの しゅるいごとに ひらく） ---------- */
const TYPE_NAME = {count:'かぞえる', see:'まとまり', tap:'まるを ぬる', five:'5と いくつ', ten:'10を つくる', more:'ふえる', less:'へる', cmp:'くらべる', add:'たしざん', sub:'ひきざん',
  split:'ぶんかい', blank:'□の かず', seq:'かずの きまり', order:'ならべる', clock:'とけい', money:'おかね', word:'ぶんしょうだい', pattern:'きそく パズル', maze:'めいろ', rotate:'かたち まわし'};
const prevIndex = (stages, i) => { const tr = stages[i].track; if(!tr) return i - 1; for(let j = i - 1; j >= 0; j--) if(stages[j].track === tr) return j; return -1; };
const nextIndex = (stages, i) => { const tr = stages[i].track; for(let j = i + 1; j < stages.length; j++) if(!tr || stages[j].track === tr) return j; return -1; };
const resumeKey = (sid, age, stid) => `${sid}:${age}:${stid}`;
function isOpen(g, sid, age, stages, i){
  const j = prevIndex(stages, i), rec = Progress.stage(g, sid, age, stages[i].id);
  if(j < 0 || (rec && rec.plays > 0)) return true;
  const prev = Progress.stage(g, sid, age, stages[j].id); return !!(prev && prev.stars >= 1);
}
async function renderStages(){
  const p = Profiles.current(); if(!p || !curSubj){ go('lhome'); return; }
  $('lstageW').innerHTML = `<div class="hdr"><button class="btn ghost" id="lsBack">← もどる</button><h2>${ruby(curSubj.title)}・${ageLabel(p.age)}</h2><span class="sp"></span></div><div id="lsInfo"></div><div class="ls-list" id="lsList"><p class="note">よみこみちゅう…</p></div>`;
  $('lsBack').onclick = () => { tap(); go('lhome'); };
  let d; try{ d = await subjectData(curSubj); }catch(e){ $('lsList').innerHTML = '<p class="note">データを よみこめませんでした</p>'; return; }
  const stages = d.courses[p.age] || [], g = Progress.of(p.id), box = $('lsList'); if(!box) return; box.innerHTML = '';
  // にがてな ぶんや（5もん いじょう といて せいかい 6わり みまん）
  const ty = (g.subjects[curSubj.id] || {}).types || {}, weakT = Object.entries(ty).filter(([, v]) => v.n >= 5 && v.c / v.n < .6).map(([k]) => TYPE_NAME[k] || k);
  if(weakT.length) $('lsInfo').innerHTML = `<p class="note">📝 にがて：${weakT.map(esc).join('・')}</p>`;
  let lastTrack = null;
  stages.forEach((st, i) => {
    if(st.track && st.track !== lastTrack && d.tracks && d.tracks[st.track]){ lastTrack = st.track; const h = document.createElement('div'); h.className = 'ls-track'; h.innerHTML = `${d.tracks[st.track].icon} ${ruby(d.tracks[st.track].title)}`; box.append(h); }
    const rec = Progress.stage(g, curSubj.id, p.age, st.id), open = isOpen(g, curSubj.id, p.age, stages, i), stars = rec ? rec.stars : 0;
    const res = (g.resume || {})[resumeKey(curSubj.id, p.age, st.id)];
    const no = st.track ? stages.slice(0, i + 1).filter(x => x.track === st.track).length : i + 1;
    const b = document.createElement('button'); b.className = 'btn' + (open ? '' : ' lock');
    b.innerHTML = `<span class="no">${open ? no : '🔒'}</span><span class="tt">${ruby(st.title)}${res ? '<small class="rs">▶ つづきから</small>' : ''}</span><span class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
    b.onclick = () => {
      tap();
      if(!open){ toast('まえの ステージで ほしを 1こ とると あそべるよ', true); return; }
      startStage({subject:curSubj, age:p.age, stage:st, index:i, stages});
    };
    box.append(b);
  });
  const weak = Object.entries(g.weak[curSubj.id] || {}).filter(([, w]) => w.age === p.age);
  if(weak.length){
    const b = document.createElement('button'); b.className = 'btn weak';
    b.innerHTML = `<span class="no">📝</span><span class="tt">にがてを れんしゅう（${Math.min(10, weak.length)}もん）</span>`;
    b.onclick = () => { tap(); startStage({subject:curSubj, age:p.age, stage:{id:'weak', title:'にがてを れんしゅう', q:weak.slice(0, 10).map(([id, w]) => Object.assign({}, w.q, {id}))}, index:-1, stages, weak:true}); };
    box.append(b);
  }
}

/* ================================================================
   きょうつう もんだい エンジン
   ================================================================ */
const Run = { token:0, alive(t){ return t === this.token; }, stop(){ this.token++; Voice.stop(); Buddy.calm(); } };
const sleep = (ms, t) => new Promise((res, rej) => setTimeout(() => (t == null || Run.alive(t)) ? res() : rej(STOP), ms));
const STOP = {stop:true};
let P = null;   // いま あそんでいる ステージ
const hashStr = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

// ステージの もんだいを よういする（gen が あれば じどう生成。さいきん でた もんだいは さける）
function buildQuestions(o, g){
  const st = o.stage;
  if(!st.gen) return st.q.map((q, k) => Object.assign({id:q.id || `${st.id}-${k + 1}`}, q));
  const rec = (g.recent || (g.recent = {}))[st.gen.gen] || [];
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const qs = window.Puzzles.generate(st.gen, st.count || 10, o.age, seed, rec, hashStr);
  g.recent[st.gen.gen] = rec.concat(qs.map(q => hashStr(q.sig))).slice(-80);   // みじかい ハッシュだけ ほぞん
  return qs.map(q => Object.assign(q, {id:`${st.id}#${hashStr(q.sig)}`}));
}
function startStage(o){
  const p = Profiles.current(), g = Progress.of(p.id);
  const rk = resumeKey(o.subject.id, o.age, o.stage.id), saved = !o.weak && !o.fresh && (g.resume || {})[rk];
  if(saved && saved.i < saved.qs.length){
    P = Object.assign(o, {pid:p.id, rk, i:saved.i, correct:saved.correct, results:saved.results || [], qs:saved.qs});
    toast('つづきから はじめるよ');
  }else{
    let qs; try{ qs = buildQuestions(o, g); }catch(e){ console.error(e); toast('もんだいを つくれませんでした'); return; }
    P = Object.assign(o, {pid:p.id, rk, i:0, correct:0, results:[], qs});
    Progress.put(p.id, g);
  }
  go('lplay'); renderPlayShell(); nextQ();
}
// とちゅうで やめても つづきから できるように ほぞん
function saveResume(){
  if(!P || P.weak) return;
  const g = Progress.of(P.pid); g.resume = g.resume || {};
  g.resume[P.rk] = {qs:P.qs, i:P.i, correct:P.correct, results:P.results, at:Date.now()};
  Progress.put(P.pid, g);
}
function renderPlayShell(){
  $('lplayW').innerHTML = `
    <div class="hdr"><button class="btn ghost" id="lqQuit">← やめる</button><div class="prog" id="lqProg"></div><span class="coins" id="lqStar">⭐0</span></div>
    <div class="lq-bar"><button class="btn sub" id="lqAgain">🔊 もういちど</button><button class="btn sub" id="lqStop">⏹ とめる</button><button class="btn sub ${Voice.slow ? 'on' : ''}" id="lqSlow">🐢 ゆっくり</button></div>
    <div class="lq-buddy" id="lqBuddy"></div>
    <div class="panel lq-panel"><div class="lq-text" id="lqText"></div><div class="lq-vis" id="lqVis"></div></div>
    <div id="lqIn"></div>
    <div class="panel lq-fb hide" id="lqFb"></div>`;
  $('lqQuit').onclick = () => { tap(); Buddy.destroy(); go('lstage'); };
  $('lqAgain').onclick = () => { tap(); Voice.replay(); };
  $('lqStop').onclick = () => { tap(); Voice.stop(); };
  $('lqSlow').onclick = () => { tap(); Voice.slow = !Voice.slow; $('lqSlow').classList.toggle('on', Voice.slow); Voice.replay(); };
  Buddy.mount($('lqBuddy'));
}
function drawProg(){
  $('lqProg').innerHTML = P.qs.map((q, k) => `<i class="${k < P.i ? 'done' : k === P.i ? 'now' : ''}"></i>`).join('');
  $('lqStar').textContent = '⭐' + P.correct;
}
async function nextQ(){
  if(P.i >= P.qs.length){ finishStage(); return; }
  drawProg(); saveResume();
  const q = P.qs[P.i], T = TYPES[q.t];
  const t = ++Run.token;
  const ctx = {q, t, vis:$('lqVis'), inp:$('lqIn'), tries:0, locked:false, choices:null, ans:null, text:'', say:'', expl:'', age:P.age};
  ctx.fb = ok => feedback(ctx, ok);
  $('lqFb').classList.add('hide'); ctx.vis.innerHTML = ''; ctx.inp.innerHTML = '';
  if(!T){ ctx.vis.innerHTML = `<p class="note">この もんだいは まだ つかえません（${esc(q.t)}）</p>`; P.results.push({id:q.id, ok:false, skip:true}); P.i++; return setTimeout(nextQ, 800); }
  T.setup(ctx);
  $('lqText').innerHTML = ruby(ctx.text);
  Buddy.say(ctx.text, 'point', 3200);
  try{
    if(T.intro) await T.intro(ctx);
    if(!Run.alive(t)) return;
    window.Learn._ctx = ctx;
    renderInput(ctx, T); ctx.ready = true;
    Voice.say(ctx.say || ctx.text);
    Buddy.idle(t);
  }catch(e){ if(e !== STOP) console.error(e); }
}
function choicesFor(ans, n, lo = 0, hi = 20){
  const set = new Set([ans]); const ds = shuffle([1, -1, 2, -2, 3, -3, 4, 5]);
  for(const d of ds){ if(set.size >= n) break; const v = ans + d; if(v >= lo && v <= hi) set.add(v); }
  let k = 1; while(set.size < n){ set.add(ans + n + k++); }
  return shuffle([...set]);
}
function renderInput(ctx, T){
  if(T.input){ T.input(ctx); return; }
  const n = ctx.choices.length, box = document.createElement('div');
  box.className = 'lq-ans' + (ctx.choices.some(c => String(c).length > 3) ? ' txt' : ''); box.style.setProperty('--n', n > 4 ? 3 : n);
  ctx.choices.forEach(c => {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = c; b.dataset.v = c;
    b.onclick = () => submit(ctx, c, b); box.append(b);
  });
  ctx.inp.append(box);
}
// こたえあわせ（ok を しってから よぶ ことも できる）
async function submit(ctx, v, btn){
  if(ctx.locked || !Run.alive(ctx.t)) return;
  const T = TYPES[ctx.q.t];
  const ok = T.check ? T.check(ctx, v) : String(v) === String(ctx.ans);
  ctx.locked = true; Buddy.calm();
  try{
    if(ok){
      if(btn) btn.classList.add('ok'); tap('coin');
      await feedback(ctx, true);
    }else{
      ctx.tries++; if(btn){ btn.classList.add('ng'); btn.disabled = true; } tap('boing');
      if(ctx.tries === 1){
        Buddy.say('だいじょうぶ！ ヒントを みてね', 'shy', 3000);
        showFb(`<div class="big no">おしい！</div><div class="ex">ヒントを みてね</div>`);
        await Voice.say('おしい！ ヒントを みてね');
        if(T.hint) await T.hint(ctx);
        if(!Run.alive(ctx.t)) return;
        $('lqFb').classList.add('hide'); ctx.locked = false;
        Buddy.pose('point');
        Voice.say(ctx.hintSay || ctx.say || ctx.text);
      }else{
        markAnswer(ctx);
        await feedback(ctx, false);
      }
    }
  }catch(e){ if(e !== STOP) console.error(e); }
}
function markAnswer(ctx){ ctx.inp.querySelectorAll('.lq-ans .btn, .lq-pick .btn').forEach(b => { if(String(b.dataset.v) === String(ctx.ans)) b.classList.add('ok'); }); }
function showFb(html){ const f = $('lqFb'); f.innerHTML = html; f.classList.remove('hide'); }
async function feedback(ctx, ok){
  const first = ok && ctx.tries === 0;
  record(ctx, first);
  if(ok) Buddy.say(first ? pickOne(['すごい！', 'やったね！', 'よく かんがえたね！']) : 'できたね！', pickOne(['laugh', 'clap', 'victory']), 2600);
  else Buddy.say('いっしょに たしかめよう', 'point', 2600);
  showFb(`<div class="big ${ok ? '' : 'no'}">${ok ? (first ? 'せいかい！' : 'できたね！') : `こたえは ${esc(ctx.ansLabel ?? ctx.ans)}`}</div><div class="ex" id="lqEx"></div>`);
  const T = TYPES[ctx.q.t];
  await Voice.say(ok ? (first ? 'せいかい！' : 'できたね！') : (ctx.ansSay === '' ? 'いっしょに たしかめよう' : `こたえは ${ctx.ansSay ?? ctx.ansLabel ?? ctx.ans}`));
  const ex = T.explain ? await T.explain(ctx) : ctx.expl;
  if(!Run.alive(ctx.t)) return;
  if(ex){ $('lqEx').innerHTML = ruby(ex); await Voice.say(ex, {rate:.85}); }
  if(!Run.alive(ctx.t)) return;
  if(first && P.i % 5 === 4) Buddy.spin();   // くぎりで ときどき たのしい うごき（とく あいだは うごかない）
  const b = document.createElement('button'); b.className = 'btn lq-go'; b.textContent = P.i + 1 < P.qs.length ? 'つぎへ ▶' : 'けっかを みる ▶';
  b.onclick = () => { tap(); P.i++; nextQ(); };
  $('lqFb').append(b);
}
const pickOne = a => a[Math.floor(Math.random() * a.length)];
function record(ctx, first){
  if(ctx.recorded) return; ctx.recorded = true;
  const g = Progress.of(P.pid), s = Progress.subj(g, P.subject.id), q = ctx.q;
  s.total++; if(first){ s.correct++; P.correct++; }
  const ty = s.types || (s.types = {}), tt = ty[q.t] || (ty[q.t] = {c:0, n:0}); tt.n++; if(first) tt.c++;
  P.results.push({id:q.id, ok:first});
  const w = g.weak[P.subject.id] || (g.weak[P.subject.id] = {});
  if(first){ delete w[q.id]; }
  else{ const clean = Object.assign({}, q); delete clean.id; w[q.id] = {q:clean, age:P.age, n:((w[q.id] || {}).n || 0) + 1, at:Date.now()}; }
  Progress.put(P.pid, g);
  if(!P.weak){ const g2 = Progress.of(P.pid); g2.resume = g2.resume || {}; g2.resume[P.rk] = {qs:P.qs, i:P.i + 1, correct:P.correct, results:P.results, at:Date.now()}; Progress.put(P.pid, g2); }
  $('lqStar').textContent = '⭐' + P.correct;
}
const starsFor = c => c >= 9 ? 3 : c >= 7 ? 2 : c >= 5 ? 1 : 0;
function finishStage(){
  Run.token++;
  const n = P.qs.length, c = P.correct, stars = starsFor(Math.round(c * 10 / n));
  const g = Progress.of(P.pid);
  let unlocked = false; const ni = P.weak ? -1 : nextIndex(P.stages, P.index);
  if(!P.weak){
    const sa = Progress.subj(g, P.subject.id).ages[P.age] || (Progress.subj(g, P.subject.id).ages[P.age] = {stages:{}});
    const old = sa.stages[P.stage.id] || {stars:0, best:0, plays:0};
    sa.stages[P.stage.id] = {stars:Math.max(old.stars, stars), best:Math.max(old.best, c), plays:old.plays + 1, last:c, n, at:Date.now()};
    unlocked = stars >= 1 && old.stars < 1 && ni >= 0;
    if(g.resume) delete g.resume[P.rk];
    Progress.put(P.pid, g);
  }
  $('lqProg').innerHTML = P.qs.map(() => '<i class="done"></i>').join('');
  $('lqText').innerHTML = ''; $('lqVis').innerHTML = ''; $('lqIn').innerHTML = '';
  const msg = stars === 3 ? 'すごい！ ほしが 3こ！' : stars === 2 ? 'よく できました！ ほしが 2こ' : stars === 1 ? 'がんばったね！ ほしが 1こ' : 'もういちど ちょうせん してみよう';
  const hasNext = ni >= 0 && (stars >= 1 || (Progress.stage(g, P.subject.id, P.age, P.stages[ni].id) || {}).plays);
  showFb(`<div class="big">${P.weak ? 'にがて れんしゅう おしまい' : 'ステージ クリア'}</div>
    <div class="lr-stars">${[1, 2, 3].map(k => `<span class="${k <= stars ? 'on' : ''}">⭐</span>`).join('')}</div>
    <div class="ex">${n}もん ちゅう ${c}もん せいかい<br>${msg}${unlocked ? '<br>🔓 つぎの ステージが あそべるように なったよ' : ''}</div>
    <div class="row">${hasNext ? '<button class="btn" id="lrNext">つぎの ステージ ▶</button>' : ''}<button class="btn sub" id="lrAgain">🔁 もういちど</button></div>
    <button class="btn sub" id="lrList" style="margin-top:10px">📋 ステージ いちらん</button>`);
  if(stars >= 2 && window.sfx) tap('win');
  if(stars >= 1) Buddy.spin(); else Buddy.say('つぎは きっと できるよ', 'wave', 3000);
  Voice.say(msg).then(() => { if(unlocked && $('lrList')) Voice.say('つぎの ステージが あそべるように なったよ'); });
  if($('lrNext')) $('lrNext').onclick = () => { tap(); startStage({subject:P.subject, age:P.age, stage:P.stages[ni], index:ni, stages:P.stages}); };
  $('lrAgain').onclick = () => { tap(); const o = P; startStage({subject:o.subject, age:o.age, stage:o.stage, index:o.index, stages:o.stages, weak:o.weak, fresh:true}); };
  $('lrList').onclick = () => { tap(); Buddy.destroy(); go('lstage'); };
  window.Learn._result = {stars, correct:c, n};
}

/* ---------------- せんせいキャラ（既存の シートキャラ と ポーズを つかう） ---------------- */
const Buddy = {
  actor:null, el:null, idleT:null, sayT:null,
  pickChar(){ const S = window.SHEET_CHARS || {}, p = Profiles.current(); if(p && p.buddy && S[p.buddy]) return S[p.buddy]; const ids = Object.keys(S).filter(k => S[k] && S[k].frames); return ids.length ? S[ids[Math.floor(Math.random() * ids.length)]] : null; },
  mount(box){
    this.destroy(); if(!box) return;
    const C = this.pickChar(); if(!C || !window.SheetActor){ box.classList.add('hide'); return; }
    box.classList.remove('hide');
    box.innerHTML = '<div class="lb-stage"></div><div class="lb-say hide"></div>';
    try{ this.actor = SheetActor.create(box.firstChild, C); this.el = box; this.C = C; this.actor.pose('wave'); }catch(e){ this.actor = null; box.classList.add('hide'); }
  },
  say(text, pose, ms = 2600){
    if(!this.actor || !this.el) return; if(pose) this.actor.pose(pose);
    const b = this.el.querySelector('.lb-say'); b.innerHTML = ruby(text); b.classList.remove('hide');
    clearTimeout(this.sayT); this.sayT = setTimeout(() => { b.classList.add('hide'); this.actor && this.actor.pose('think'); }, ms);
  },
  pose(p){ this.actor && this.actor.pose(p); },
  spin(){ const a = this.actor; if(a) a.turn(1100, 1, () => this.actor === a && a.pose(pickOne(['victory', 'dance', 'jump']))); },
  idle(t){ clearTimeout(this.idleT); this.idleT = setTimeout(() => { if(Run.alive(t) && this.actor){ this.say('ゆっくり かんがえてね', 'wave', 3000); Voice.say('ゆっくり かんがえてね'); } }, 25000); },
  calm(){ clearTimeout(this.idleT); },
  destroy(){ clearTimeout(this.idleT); clearTimeout(this.sayT); if(this.actor) try{ this.actor.destroy(); }catch(e){} this.actor = null; this.el = null; },
};

/* ================================================================
   5この まとまり（よこ 5マス）の えがき かた
   ================================================================ */
function Dots(parent, slots, opt = {}){
  const el = document.createElement('div'); el.className = 'dots'; if(opt.d) el.style.setProperty('--d', opt.d + 'px');
  const rows = Math.max(1, Math.ceil(slots / 5)), cells = [], rowEls = [];
  for(let r = 0; r < rows; r++){
    const row = document.createElement('div'); row.className = 'r' + (r && r % 2 === 0 ? ' g10' : '');
    for(let c = 0; c < 5; c++){ const d = document.createElement('div'); d.className = 'dot'; row.append(d); cells.push(d); }
    el.append(row); rowEls.push(row);
  }
  parent.append(el);
  const api = {
    el, cells, rowEls,
    set(i, cls, pop){ const d = cells[i]; if(!d) return; d.className = 'dot' + (cls ? ' ' + cls : ''); if(pop){ void d.offsetWidth; d.classList.add('pop'); } },
    fill(from, to, cls){ for(let i = from; i < to; i++) api.set(i, 'on ' + cls); },
    label(i, s){ const d = cells[i]; if(d) d.innerHTML = s == null ? '' : `<b>${s}</b>`; },
    labels(from, to, start = 1){ for(let i = from; i < to; i++) api.label(i, start + i - from); },
    clearLabels(){ cells.forEach(d => d.innerHTML = ''); },
    hl(r, on){ rowEls[r] && rowEls[r].classList.toggle('hl', on); },
  };
  return api;
}
const slotsFor = n => Math.max(5, Math.ceil(n / 5) * 5);
// 5の まとまりで いう ことば
function groupSay(n){
  if(n <= 5) return `${n}こ`;
  if(n < 10) return `5こと ${n - 5}こで、${n}こ`;
  if(n === 10) return '5こが 2つで 10こ';
  const q = Math.floor(n / 5), r = n % 5;
  return r ? `5こが ${q}つで ${q * 5}こ。あと ${r}こで ${n}こ` : `5こが ${q}つで ${n}こ`;
}
// かぞえる アニメ（1こずつ ふやして よみあげる）
async function countUp(ctx, D, from, to, cls, start, step = 620){
  for(let i = from; i < to; i++){
    D.set(i, 'on ' + cls, true); D.label(i, start + i - from);
    Voice.say(String(start + i - from), {rate:1.1, quiet:0});
    await sleep(step, ctx.t);
  }
}
// まとまりを じゅんばんに ひからせる
async function flashRows(ctx, D, n){
  const rows = Math.ceil(n / 5);
  for(let r = 0; r < rows; r++){ D.hl(r, true); await sleep(380, ctx.t); }
  await sleep(300, ctx.t); for(let r = 0; r < rows; r++) D.hl(r, false);
}

/* たしざんの アニメ（4＋3、5＋3、8＋4 の 3とおり） */
async function animAdd(ctx, a, b, full = true){
  const vis = ctx.vis; vis.innerHTML = '';
  const s = a + b, D = Dots(vis, slotsFor(s));
  if(a === 5 && s <= 10){   // 5＋3：うえの だんに 5、したの だんに 3
    D.fill(0, 5, 'c1'); D.hl(0, true); await Voice.say('うえに 5こ'); D.hl(0, false);
    for(let i = 0; i < b; i++){ D.set(5 + i, 'on c2', true); await sleep(380, ctx.t); }
    D.hl(1, true); await Voice.say(`したに ${b}こ`); D.hl(1, false);
    return `5と ${b}で ${s}`;
  }
  D.fill(0, a, 'c1'); await Voice.say(`${a}こ`);
  if(s <= 10 || a >= 10){   // 4＋3：1こずつ ふやして「5、6、7」
    await countUp(ctx, D, a, s, 'c2', a + 1, 700);
    D.clearLabels(); await flashRows(ctx, D, s);
    return `${a}こと ${b}こで ${s}こ`;
  }
  // 8＋4：まず 10を つくる → のこりを たす
  const k = 10 - a, r = b - k;
  for(let i = 0; i < k; i++){ D.set(a + i, 'on c2', true); await sleep(450, ctx.t); }
  D.hl(0, true); D.hl(1, true); await Voice.say(`${a}に ${k}を たすと 10`); D.hl(0, false); D.hl(1, false);
  for(let i = 0; i < r; i++){ D.set(10 + i, 'on c3', true); await sleep(450, ctx.t); }
  await Voice.say(`あと ${r}を たすと ${s}`);
  return full ? `${a}に ${k}を たすと 10。あと ${r}を たすと ${s}` : '';
}
/* ひきざんの アニメ（くりさがりは 10から ひく） */
async function animSub(ctx, a, b){
  const vis = ctx.vis; vis.innerHTML = '';
  const D = Dots(vis, slotsFor(a)), r = a - b;
  D.fill(0, a, 'c1'); await Voice.say(`${a}こ`);
  if(a > 10 && b > a - 10){   // 12−5：10の まとまりから 5を とる
    const ones = a - 10;
    D.hl(0, true); D.hl(1, true); await Voice.say(`${a}は 10と ${ones}`); D.hl(0, false); D.hl(1, false);
    for(let i = 0; i < b; i++){ D.set(9 - i, 'on x', true); await sleep(420, ctx.t); }
    await Voice.say(`10から ${b}を ひいて ${10 - b}`);
    return `10から ${b}を ひいて ${10 - b}。${10 - b}と ${ones}で ${r}`;
  }
  for(let i = 0; i < b; i++){ D.set(a - 1 - i, 'on x', true); Voice.say(String(a - 1 - i), {rate:1.1, quiet:0}); await sleep(560, ctx.t); }
  return `${a}こから ${b}こ とって ${r}こ`;
}

/* ================================================================
   もんだいの しゅるい（あたらしい しゅるいは ここに たすだけ）
   setup：もんだい文・こたえ・えを つくる / intro：さきに みせる アニメ / input：とくべつな こたえかた
   hint：まちがえた ときの ヒント / explain：せつめい（もじを かえす）
   ================================================================ */
const nChoices = ctx => ctx.age <= 4 ? 3 : 4;
const TYPES = {
  count: {
    setup(c){ const n = c.q.n; c.text = 'まるは いくつ あるかな？'; c.ans = n; c.choices = choicesFor(n, nChoices(c), 1); c.D = Dots(c.vis, slotsFor(n)); },
    async intro(c){ await Voice.say('いっしょに かぞえよう'); await countUp(c, c.D, 0, c.q.n, 'c1', 1); await sleep(300, c.t); c.D.clearLabels(); },
    async hint(c){ c.D.labels(0, c.q.n); await flashRows(c, c.D, c.q.n); c.hintSay = '5の まとまりを みてね。いくつ かな？'; },
    async explain(c){ c.D.clearLabels(); await flashRows(c, c.D, c.q.n); return groupSay(c.q.n); },
  },
  see: {
    setup(c){ const n = c.q.n; c.text = 'まるは いくつ？ 5の まとまりを みてね'; c.ans = n; c.choices = choicesFor(n, nChoices(c), 1); c.D = Dots(c.vis, slotsFor(n)); c.D.fill(0, n, 'c1'); },
    async hint(c){ await flashRows(c, c.D, c.q.n); const n = c.q.n; c.hintSay = n > 5 ? `5こが ${Math.floor(n / 5)}つ。のこりは いくつ？` : 'ひとつずつ かぞえて みよう'; await Voice.say(c.hintSay); },
    async explain(c){ c.D.labels(0, c.q.n); await flashRows(c, c.D, c.q.n); return groupSay(c.q.n); },
  },
  tap: {
    setup(c){ const n = c.q.n; c.text = `まるを ${n}こ ぬろう`; c.ans = n; c.D = Dots(c.vis, Math.max(10, slotsFor(n + 1))); c.on = new Set();
      c.D.cells.forEach((d, i) => { d.classList.add('tp'); d.onclick = () => { if(c.locked) return; tap(); c.on.has(i) ? c.on.delete(i) : c.on.add(i); c.D.set(i, c.on.has(i) ? 'on c1 tp' : 'tp', true); }; }); },
    input(c){ const b = document.createElement('button'); b.className = 'btn lq-go'; b.textContent = '✅ できた！'; b.onclick = () => submit(c, c.on.size, null); c.inp.append(b); },
    check(c, v){ return v === c.q.n; },
    async hint(c){ const k = c.on.size; c.hintSay = k > c.q.n ? `いまは ${k}こ。ぬりすぎ だよ` : `いまは ${k}こ。あと ${c.q.n - k}こ だよ`; await Voice.say(c.hintSay); },
    async explain(c){ c.D.cells.forEach((d, i) => { d.onclick = null; c.D.set(i, i < c.q.n ? 'on c1' : ''); }); await flashRows(c, c.D, c.q.n); return groupSay(c.q.n); },
  },
  five: {
    setup(c){ const n = c.q.n; c.text = `5と いくつで ${n}？`; c.ans = n - 5; c.choices = choicesFor(n - 5, nChoices(c), 0, 10); c.D = Dots(c.vis, 10); c.D.fill(0, 5, 'c1'); for(let i = 5; i < n; i++) c.D.set(i, 'q'); },
    async hint(c){ c.D.hl(0, true); await Voice.say('うえの だんが 5こ'); c.D.hl(0, false); c.hintSay = 'したの だんの まるを かぞえよう'; },
    async explain(c){ const n = c.q.n; for(let i = 5; i < n; i++){ c.D.set(i, 'on c2', true); await sleep(300, c.t); } return `5と ${n - 5}で ${n}`; },
  },
  ten: {
    setup(c){ const n = c.q.n; c.text = 'あと いくつで 10？'; c.ans = 10 - n; c.choices = choicesFor(10 - n, nChoices(c), 0, 10); c.D = Dots(c.vis, 10); c.D.fill(0, n, 'c1'); },
    async hint(c){ for(let i = c.q.n; i < 10; i++) c.D.set(i, 'q', true); c.hintSay = 'あいている ところを かぞえてね'; await Voice.say(c.hintSay); },
    async explain(c){ const n = c.q.n; await countUp(c, c.D, n, 10, 'c2', n + 1, 420); c.D.clearLabels(); return `${n}と ${10 - n}で 10`; },
  },
  more: {
    setup(c){ const {n, d} = c.q; c.text = `${d}こ ふえると いくつ？`; c.ans = n + d; c.choices = choicesFor(n + d, nChoices(c), 1); c.D = Dots(c.vis, slotsFor(n + d)); c.D.fill(0, n, 'c1'); },
    async intro(c){ await Voice.say(`いま ${c.q.n}こ`); },
    async hint(c){ const {n, d} = c.q; for(let i = n; i < n + d; i++) c.D.set(i, 'q', true); c.hintSay = 'ふえた ところも かぞえてね'; await Voice.say(c.hintSay); },
    async explain(c){ const {n, d} = c.q; await countUp(c, c.D, n, n + d, 'c2', n + 1, 600); return `${n}こに ${d}こ ふえて ${n + d}こ`; },
  },
  less: {
    setup(c){ const {n, d} = c.q; c.text = `${d}こ へると いくつ？`; c.ans = n - d; c.choices = choicesFor(n - d, nChoices(c), 0); c.D = Dots(c.vis, slotsFor(n)); c.D.fill(0, n, 'c1'); },
    async intro(c){ await Voice.say(`いま ${c.q.n}こ`); },
    async hint(c){ const {n, d} = c.q; for(let i = n - d; i < n; i++) c.D.set(i, 'on x', true); c.hintSay = 'ばつの ついた まるは なくなるよ'; await Voice.say(c.hintSay); },
    async explain(c){ const {n, d} = c.q; for(let i = 0; i < d; i++){ c.D.set(n - 1 - i, 'on x', true); await sleep(450, c.t); } return `${n}こから ${d}こ へって ${n - d}こ`; },
  },
  cmp: {
    setup(c){ const {a, b} = c.q; c.text = 'まるが おおいのは どっち？'; c.ans = a > b ? 'a' : 'b'; },
    input(c){
      const box = document.createElement('div'); box.className = 'lq-cmp';
      ['a', 'b'].forEach(k => { const bt = document.createElement('button'); bt.dataset.v = k; Dots(bt, Math.max(10, slotsFor(Math.max(c.q.a, c.q.b))), {d:24}).fill(0, c.q[k], k === 'a' ? 'c1' : 'c2'); bt.onclick = () => submit(c, k, bt); box.append(bt); });
      c.vis.append(box); c.box = box;
    },
    async hint(c){ c.box.querySelectorAll('.dots').forEach(el => el.querySelectorAll('.dot.on').forEach((d, i) => d.innerHTML = `<b>${i + 1}</b>`)); c.hintSay = 'かずを くらべて みよう'; await Voice.say(c.hintSay); },
    async explain(c){ const {a, b} = c.q; c.box.querySelector(`[data-v="${c.ans}"]`).classList.add('ok'); return `${Math.max(a, b)}の ほうが ${Math.abs(a - b)}こ おおいね`; },
  },
  add: {
    setup(c){ const {a, b} = c.q; c.text = `${a} ＋ ${b} は いくつ？`; c.ans = a + b; c.choices = choicesFor(a + b, nChoices(c), 0, 30);
      if(!c.q.intro) TYPES.add.still(c); },
    still(c){ const {a, b} = c.q; c.vis.innerHTML = ''; Dots(c.vis, slotsFor(a)).fill(0, a, 'c1'); const pl = document.createElement('div'); pl.className = 'lq-plus'; pl.innerHTML = `＋<span class="mini">${'<i></i>'.repeat(b)}</span>`; c.vis.append(pl); },
    async intro(c){ if(!c.q.intro) return; await Voice.say('みていてね'); c.introExpl = await animAdd(c, c.q.a, c.q.b); await Voice.say(c.introExpl); },
    async hint(c){ c.hintSay = 'ふえた まるも いっしょに かぞえよう'; await animAdd(c, c.q.a, c.q.b, false); },
    async explain(c){ return c.q.intro && c.introExpl ? c.introExpl : animAdd(c, c.q.a, c.q.b); },
  },
  sub: {
    setup(c){ const {a, b} = c.q; c.text = `${a} − ${b} は いくつ？`; c.ans = a - b; c.choices = choicesFor(a - b, nChoices(c), 0, 20);
      if(!c.q.intro){ Dots(c.vis, slotsFor(a)).fill(0, a, 'c1'); const pl = document.createElement('div'); pl.className = 'lq-plus'; pl.textContent = `${b}こ とると？`; c.vis.append(pl); } },
    async intro(c){ if(!c.q.intro) return; await Voice.say('みていてね'); c.introExpl = await animSub(c, c.q.a, c.q.b); await Voice.say(c.introExpl); },
    async hint(c){ c.hintSay = 'ばつの ついていない まるを かぞえよう'; await animSub(c, c.q.a, c.q.b); },
    async explain(c){ return c.q.intro && c.introExpl ? c.introExpl : animSub(c, c.q.a, c.q.b); },
  },
  split: {
    setup(c){ const {n, a} = c.q; c.text = `${n}は ${a}と いくつ？`; c.ans = n - a; c.choices = choicesFor(n - a, nChoices(c), 0, 20); c.D = Dots(c.vis, slotsFor(n)); c.D.fill(0, a, 'c1'); for(let i = a; i < n; i++) c.D.set(i, 'q'); },
    async hint(c){ c.hintSay = '?の まるを かぞえてね'; await Voice.say(c.hintSay); },
    async explain(c){ const {n, a} = c.q; for(let i = a; i < n; i++){ c.D.set(i, 'on c2', true); await sleep(250, c.t); } return `${n}は ${a}と ${n - a}`; },
  },
  blank: {
    setup(c){ const e = c.q.eq; c.ans = c.q.ans; c.text = '□に はいる かずは なに？'; c.say = 'しかくに はいる かずは なに？'; c.choices = choicesFor(c.ans, nChoices(c), 0, 30);
      const el = document.createElement('div'); el.className = 'lq-eq'; el.innerHTML = e.map(x => x === '□' ? '<span class="bx">□</span>' : esc(x === '-' ? '−' : x)).join(' '); c.vis.append(el); c.eqEl = el; },
    async hint(c){ const [x, op, y, , z] = c.q.eq; c.hintSay = op === '+' ? (x === '□' ? `${y}と なにで ${z}に なるかな` : `${x}と なにで ${z}に なるかな`) : (x === '□' ? `なにから ${y}を ひくと ${z}かな` : `${x}から なにを ひくと ${z}かな`); await Voice.say(c.hintSay); },
    async explain(c){ const [x, op, y, , z] = c.q.eq, a = c.ans; c.eqEl.querySelector('.bx').textContent = a;
      return op === '+' ? `${z}から ${x === '□' ? y : x}を ひくと ${a}` : (x === '□' ? `${z}に ${y}を たすと ${a}` : `${x}から ${z}を ひくと ${a}`); },
  },
  seq: {
    setup(c){ const s = c.q.seq; c.ans = c.q.ans; c.text = 'つぎに くる かずは なに？'; c.choices = choicesFor(c.ans, nChoices(c), 0, 40);
      const el = document.createElement('div'); el.className = 'lq-seq'; el.innerHTML = s.map(v => v == null ? '<span class="qq">?</span>' : `<span>${v}</span>`).join(''); c.vis.append(el); c.seqEl = el; },
    async hint(c){ const s = c.q.seq, d = s[1] - s[0]; const ar = s.slice(1).map(() => `<em>${d > 0 ? '+' : '−'}${Math.abs(d)}</em>`);
      const sp = c.seqEl.querySelectorAll('span'); sp.forEach((el, i) => { if(i && ar[i - 1]) el.insertAdjacentHTML('beforebegin', ar[i - 1]); }); c.hintSay = 'となりの かずと くらべて みよう'; await Voice.say(c.hintSay); },
    async explain(c){ const s = c.q.seq, d = s[1] - s[0]; c.seqEl.querySelector('.qq').textContent = c.ans; return `${Math.abs(d)}ずつ ${d > 0 ? 'ふえて' : 'へって'} いるよ。つぎは ${c.ans}`; },
  },
  order: {
    setup(c){ c.sorted = c.q.nums.slice().sort((x, y) => x - y); c.ans = c.sorted.join('、'); c.ansSay = c.sorted.join('、'); c.text = 'ちいさい じゅんに タップしよう'; c.k = 0; },
    input(c){
      const slots = document.createElement('div'); slots.className = 'lq-slots'; slots.innerHTML = c.sorted.map(() => '<span></span>').join(''); c.vis.append(slots);
      const box = document.createElement('div'); box.className = 'lq-order';
      shuffle(c.q.nums).forEach(v => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = v;
        b.onclick = () => { if(c.locked) return;
          if(v === c.sorted[c.k]){ tap(); b.classList.add('used'); const sl = slots.children[c.k]; sl.textContent = v; sl.classList.add('f'); c.k++; if(c.k === c.sorted.length) submit(c, 'done', null); }
          else submit(c, 'ng', null); };
        box.append(b); });
      c.inp.append(box); c.slots = slots;
    },
    check(c, v){ return v === 'done'; },
    async hint(c){ c.hintSay = `つぎは いちばん ちいさい かずを さがそう`; await Voice.say(c.hintSay); },
    async explain(c){ [...c.slots.children].forEach((s, i) => { s.textContent = c.sorted[i]; s.classList.add('f'); }); c.inp.querySelectorAll('.lq-order .btn').forEach(b => b.classList.add('used')); return `ちいさい じゅんに ${c.sorted.join('、')}`; },
  },
  clock: {
    setup(c){ const {h, m} = c.q, lab = (hh, mm) => `${hh}じ${mm ? 'はん' : ''}`;
      c.ans = lab(h, m); c.ansLabel = c.ans;
      const alt = new Set([c.ans]); const cand = shuffle([[h % 12 + 1, m], [(h + 10) % 12 + 1, m], [h, m ? 0 : 30], [(h + 5) % 12 + 1, m ? 0 : 30], [(h + 2) % 12 + 1, m]]);
      for(const [hh, mm] of cand){ if(alt.size >= nChoices(c)) break; alt.add(lab(hh, mm)); }
      c.choices = shuffle([...alt]); c.text = 'なんじ かな？';
      c.vis.innerHTML = clockSVG(h, m); },
    async hint(c){ const el = c.vis.querySelector('.lclock'); el.classList.add('hl'); c.hintSay = c.q.m ? 'みじかい はりの すぐ まえの かずを みてね。ながい はりが 6の ときは はん だよ' : 'みじかい はりが さしている かずを みてね'; await Voice.say(c.hintSay); },
    async explain(c){ const {h, m} = c.q; return m ? `みじかい はりが ${h}と ${h % 12 + 1}の あいだ、ながい はりが 6で ${h}じはん` : `みじかい はりが ${h}、ながい はりが 12で ${h}じ`; },
  },
  money: {
    setup(c){ const cs = c.q.coins.slice().sort((x, y) => y - x), sum = cs.reduce((n, v) => n + v, 0); c.coins = cs; c.ans = sum; c.ansLabel = `${sum}えん`;
      const alt = new Set([sum]); for(const d of shuffle([1, -1, 5, -5, 10, -10, 2])){ if(alt.size >= nChoices(c)) break; if(sum + d > 0) alt.add(sum + d); }
      c.choices = shuffle([...alt]).map(v => `${v}えん`); c.ans = `${sum}えん`; c.text = 'ぜんぶで なんえん？';
      const el = document.createElement('div'); el.className = 'lq-coins'; el.innerHTML = cs.map(v => `<span class="coin v${v}${v === 5 || v === 50 ? ' hole' : ''}" data-v="${v}えん"><span>${v}</span></span>`).join(''); c.vis.append(el); c.coinEl = el; },
    async hint(c){ c.coinEl.querySelectorAll('.coin').forEach(x => x.classList.add('tag')); c.hintSay = 'おおきい おかねから じゅんに たそう'; await Voice.say(c.hintSay); },
    async explain(c){ let s = 0; const steps = c.coins.map(v => (s += v)); return `${c.coins.join('えんと ')}えんで、${steps.join('、')}。ぜんぶで ${s}えん`; },
  },
  word: {
    setup(c){ const q = c.q, u = q.unit || 'こ';
      c.ans = q.ans != null ? q.ans : q.op === '+' ? q.a + q.b : q.a - q.b; c.ansLabel = `${c.ans}${u}`; c.ansSay = c.ansLabel;
      c.text = q.text; c.choices = choicesFor(c.ans, nChoices(c), 0, 30);
      const el = document.createElement('div'); el.className = 'lq-pics'; const e1 = q.emoji || '⭐', e2 = q.emoji2 || e1;
      let html = '';
      if(q.show){ html = `${Array.from({length:q.show[0]}, () => `<i>${e1}</i>`).join('')}<span class="sep"></span>${Array.from({length:q.show[1]}, () => `<i class="add">${e1}</i>`).join('')}`; }
      else if(q.op === '+') html = `${Array.from({length:q.a}, () => `<i>${e1}</i>`).join('')}<span class="sep"></span>${Array.from({length:q.b}, () => `<i class="add">${e1}</i>`).join('')}`;
      else if(q.op === 'diff') html = `${Array.from({length:q.a}, () => `<i>${e1}</i>`).join('')}<span class="sep"></span>${Array.from({length:q.b}, () => `<i>${e2}</i>`).join('')}`;
      else html = Array.from({length:q.a}, () => `<i>${e1}</i>`).join('');
      el.innerHTML = html; c.vis.append(el); c.pics = el; },
    async hint(c){ const q = c.q;
      if(q.op === '-' && !q.show){ const items = [...c.pics.querySelectorAll('i')]; items.slice(q.a - q.b).forEach(i => i.classList.add('gone')); c.hintSay = 'うすく なった ものは なくなったよ。のこりを かぞえよう'; }
      else if(q.op === 'diff'){ c.hintSay = 'うえと したを 1つずつ くらべて みよう'; }
      else c.hintSay = q.show ? 'はじめに あった かずを かんがえよう' : 'ぜんぶを かぞえて みよう';
      await Voice.say(c.hintSay); },
    async explain(c){ const q = c.q, u = q.unit || 'こ';
      if(q.op === '-' && !q.show) c.pics.querySelectorAll('i').forEach((i, k) => k >= q.a - q.b && i.classList.add('gone'));
      if(q.expl) return q.expl;
      return q.op === '+' ? `${q.a}と ${q.b}で ${q.a + q.b}${u}` : q.op === 'diff' ? `${q.a}と ${q.b}の ちがいは ${q.a - q.b}${u}` : `${q.a}から ${q.b} とって ${q.a - q.b}${u}`; },
  },
};
/* ================================================================
   こくご・こっき・うちゅう・えいご で つかう きょうつうの もんだい
   quiz  ：みせる もの（show）を みて えらぶ。q = {t:'quiz', text, say?, show:{big|pics|flag|planet|html}, choices:[...], ans:(番号 or もじ), hint?, expl?, en?, cbig?}
   order ：ただしい じゅんに タップ。q = {t:'order2', text, items:[ラベル...]（ただしい じゅん）, show?, expl?}
   repeat：えいごを きいて 2かい いってみよう（れんしゅう。かならず せいかい）。q = {t:'repeat', en, ja, show}
   ================================================================ */
const PLANET = {
  sun:{c1:'#ffe36e', c2:'#ff9a1f', r:46, glow:1}, mercury:{c1:'#cfc6bd', c2:'#8f857c', r:14}, venus:{c1:'#ffe2a6', c2:'#d9a24f', r:22},
  earth:{c1:'#6ec6ff', c2:'#2b78d6', r:23, land:1}, mars:{c1:'#ff9d6e', c2:'#c4492a', r:18}, jupiter:{c1:'#f3d2a8', c2:'#c48a57', r:42, band:1},
  saturn:{c1:'#f8e3a6', c2:'#d1a95c', r:34, ring:1}, uranus:{c1:'#bff3f2', c2:'#5cc7d1', r:28, ring:2}, neptune:{c1:'#8fb6ff', c2:'#3557d6', r:27},
  moon:{c1:'#f2f2ee', c2:'#a9a9a2', r:16, crater:1}, pluto:{c1:'#e8d2c0', c2:'#a2826a', r:10},
};
// わくせいの え（SVG）。size:true で ほんとうの おおきさの じゅんが わかる ように する
function planetSVG(id, opt = {}){
  const p = PLANET[id] || PLANET.earth, r = opt.fixed ? 40 : p.r, g = 'pg' + id + (opt.fixed ? 'f' : '');
  let extra = '';
  if(p.band) extra += [-.45, -.15, .2, .5].map((y, i) => `<ellipse cx="50" cy="${50 + y * r}" rx="${r * Math.sqrt(1 - y * y)}" ry="${r * .09}" fill="${i % 2 ? '#e7b98a' : '#b9784a'}" opacity=".7"/>`).join('') + `<ellipse cx="${50 + r * .3}" cy="${50 + r * .3}" rx="${r * .16}" ry="${r * .1}" fill="#c4553a"/>`;
  if(p.land) extra += `<path d="M${50 - r * .5} ${50 - r * .3} q${r * .3} ${-r * .3} ${r * .5} 0 t${r * .2} ${r * .5} t${-r * .5} ${r * .2}z M${50 + r * .1} ${50 + r * .2} q${r * .3} ${-r * .1} ${r * .4} ${r * .3} t${-r * .4} ${r * .2}z" fill="#4cc36b"/>`;
  if(p.crater) extra += `<circle cx="${50 - r * .3}" cy="${50 - r * .2}" r="${r * .18}" fill="#c9c9c2"/><circle cx="${50 + r * .3}" cy="${50 + r * .25}" r="${r * .12}" fill="#c9c9c2"/>`;
  const ring = p.ring ? `<ellipse cx="50" cy="50" rx="${r * 1.7}" ry="${r * (p.ring === 2 ? .9 : .38)}" fill="none" stroke="#d9c38a" stroke-width="${r * .14}" transform="rotate(${p.ring === 2 ? 70 : -15} 50 50)" opacity=".9"/>` : '';
  const glow = p.glow ? `<circle cx="50" cy="50" r="${r * 1.08}" fill="#ffd23f" opacity=".35"/>` : '';
  return `<svg viewBox="-20 -20 140 140" class="lpl" aria-label="${id}"><defs><radialGradient id="${g}" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></radialGradient></defs>${glow}<circle cx="50" cy="50" r="${r}" fill="url(#${g})" stroke="#3b2a1e" stroke-width="2"/>${extra}${ring}</svg>`;
}
// みせる もの
function showHTML(s){
  if(!s) return '';
  if(s.big) return `<div class="lq-big ${s.small ? 'sm' : ''}">${ruby(s.big)}</div>`;
  if(s.pics) return `<div class="lq-pics lq-pics2">${s.pics.map(e => `<i>${esc(e)}</i>`).join('')}</div>`;
  if(s.flag) return `<div class="lq-flag">${esc(s.flag)}</div>`;
  if(s.planet) return `<div class="lq-planet">${planetSVG(s.planet, {fixed:true})}</div>`;
  if(s.planets) return `<div class="lq-planets">${s.planets.map(id => planetSVG(id)).join('')}</div>`;
  if(s.text) return `<div class="lq-read">${ruby(s.text)}</div>`;
  return '';
}
const enSay = (c, w) => Voice.say(w, {lang:'en-US', raw:true, rate:.8});
Object.assign(TYPES, {
  quiz: {
    setup(c){ const q = c.q; c.text = q.text; c.say = q.say || q.text;
      c.choices = q.choices.slice(); c.ans = typeof q.ans === 'number' ? q.choices[q.ans] : q.ans;
      if(q.shuffle !== false) c.choices = shuffle(c.choices);
      c.ansLabel = reading(c.ans);
      c.vis.innerHTML = showHTML(q.show);
      if(q.en){ const b = document.createElement('button'); b.className = 'btn sub lq-en'; b.textContent = '🔊 English'; b.onclick = () => { tap(); enSay(c, q.en); }; c.vis.append(b); } },
    async intro(c){ if(c.q.en){ await Voice.say(c.q.text); await enSay(c, c.q.en); c.say = ''; } },
    input(c){ const q = c.q, box = document.createElement('div');
      box.className = 'lq-ans' + (q.cbig ? ' cbig' : ' txt'); box.style.setProperty('--n', c.choices.length > 4 ? 3 : c.choices.length > 2 && !q.cbig && c.choices.some(x => reading(x).length > 5) ? 1 : c.choices.length);
      c.choices.forEach(ch => { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = ruby(ch); b.dataset.v = ch;
        b.onclick = () => { if(q.enChoices && !c.locked) enSay(c, reading(ch)); submit(c, ch, b); }; box.append(b); });
      c.inp.append(box); },
    async hint(c){ c.hintSay = c.q.hint || 'よく みて かんがえて みよう'; await Voice.say(c.hintSay, c.q.hintEn ? {lang:'en-US', raw:true} : {}); },
    async explain(c){ if(c.q.en) await enSay(c, c.q.en); return c.q.expl || ''; },
  },
  order2: {
    setup(c){ const q = c.q; c.text = q.text; c.ans = q.items.join(' → '); c.ansLabel = q.items.map(reading).join('・'); c.ansSay = ''; c.next = 0; c.vis.innerHTML = showHTML(q.show); },
    input(c){ const q = c.q, slots = document.createElement('div'); slots.className = 'lq-slots lq-slots2';
      slots.innerHTML = q.items.map(() => '<span></span>').join(''); c.inp.append(slots);
      const box = document.createElement('div'); box.className = 'lq-order lq-order2';
      shuffle(q.items.map((it, i) => [it, i])).forEach(([it, i]) => { const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = q.planets ? planetSVG(it) + `<small>${ruby(q.labels ? q.labels[i] : it)}</small>` : ruby(it);
        b.onclick = () => { if(c.locked) return;
          if(i === c.next){ tap(); b.classList.add('used'); const s = slots.children[c.next]; s.innerHTML = q.planets ? `<small>${ruby(q.labels ? q.labels[i] : it)}</small>` : ruby(it); s.classList.add('f'); c.next++; if(c.next === q.items.length) submit(c, c.ans, null); }
          else submit(c, '__ng', b); };
        box.append(b); });
      c.inp.append(box); c.box = box; },
    check(c, v){ return v === c.ans; },
    async hint(c){ c.hintSay = c.q.hint || 'さいしょに くるのは どれかな？'; await Voice.say(c.hintSay);
      c.box.querySelectorAll('.btn').forEach(b => { b.disabled = false; b.classList.remove('ng'); }); },
    async explain(c){ return c.q.expl || c.q.items.map(reading).join('、') + ' の じゅんだよ'; },
  },
  repeat: {
    setup(c){ const q = c.q; c.text = `「${q.ja}」は えいごで 「${q.en}」。2かい いって みよう`; c.say = ''; c.ans = 'ok'; c.ansSay = ''; c.ansLabel = q.en; c.count = 0;
      c.vis.innerHTML = showHTML(q.show) + `<div class="lq-enw">${esc(q.en)}</div>`; },
    async intro(c){ await Voice.say(`${c.q.ja}は えいごで`); await enSay(c, c.q.en); await Voice.say('れんしゅう してみよう。2かい いってみよう'); },
    input(c){ const box = document.createElement('div'); box.className = 'lq-rep';
      box.innerHTML = `<button class="btn sub" data-a="listen">🔊 きく</button><button class="btn" data-a="said">🗣️ いえたよ！ <b>0</b>/2</button>`;
      box.querySelector('[data-a=listen]').onclick = () => { tap(); enSay(c, c.q.en); };
      box.querySelector('[data-a=said]').onclick = async e => { if(c.locked) return; tap('coin'); c.count++; e.currentTarget.querySelector('b').textContent = c.count;
        if(c.count < 2){ Buddy.say('じょうず！ もう1かい', 'clap', 2000); await enSay(c, c.q.en); } else submit(c, 'ok', null); };
      c.inp.append(box); },
    check(){ return true; },
    async explain(c){ await enSay(c, c.q.en); return `${c.q.en} は 「${c.q.ja}」だよ`; },
  },
});
/* ================================================================
   しこうりょく：きそく パズル・めいろ たんけん・かたち まわし（問題は learn/puzzles.js が 生成・検証）
   ================================================================ */
const PZ = () => window.Puzzles;
const COLOR_HEX = {red:'#ff5a6e', blue:'#43a6ff', yellow:'#ffd23f', green:'#3ec46d', purple:'#a77bff'};
const SHAPE_SVG = {
  circle:'<circle cx="50" cy="50" r="40"/>',
  triangle:'<polygon points="50,8 93,88 7,88"/>',
  square:'<rect x="12" y="12" width="76" height="76" rx="8"/>',
  star:'<polygon points="50,6 62,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 38,38"/>',
  heart:'<path d="M50 90 C 10 62, 4 34, 26 20 C 40 12, 50 24, 50 30 C 50 24, 60 12, 74 20 C 96 34, 90 62, 50 90 Z"/>',
  arrow:'<polygon points="50,6 90,48 64,48 64,92 36,92 36,48 10,48"/>',
};
const DIR_DEG = {up:0, right:90, down:180, left:270};
// 1つの こま（いろ・かたち・おおきさ・かず・むき）を SVG に
function itemSVG(it, usesDir){
  const fill = COLOR_HEX[it.color] || '#999', shape = usesDir ? 'arrow' : it.shape, sc = it.size === 'small' ? .55 : it.size === 'mid' ? .78 : 1;
  const one = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k}) rotate(${usesDir ? DIR_DEG[it.dir] : 0} 50 50)" fill="${fill}" stroke="#3b2a1e" stroke-width="${6 / k > 10 ? 10 : 6 / Math.max(k, .5)}" stroke-linejoin="round">${SHAPE_SVG[shape]}</g>`;
  let g;
  if(it.count > 1){ const n = it.count, cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), k = .9 / Math.max(cols, rows) * sc;
    g = Array.from({length:n}, (_, i) => one(50 - cols * 50 * k + (i % cols) * 100 * k, 50 - rows * 50 * k + Math.floor(i / cols) * 100 * k, k)).join(''); }
  else g = one(50 - 50 * sc, 50 - 50 * sc, sc);
  return `<svg viewBox="0 0 100 100" class="pzi">${g}</svg>`;
}
const usesDirOf = q => (q.choices || []).some(c => c.dir !== 'up') || (q.seq || []).some(c => c && c.dir !== 'up');
// かたち（ポリオミノ）を SVG に：ます目の まんなかに おく
function shapeSVG(cells, cls = ''){
  const w = Math.max(...cells.map(p => p.x)) + 1, h = Math.max(...cells.map(p => p.y)) + 1, S = Math.max(w, h), ox = (S - w) / 2, oy = (S - h) / 2;
  return `<svg viewBox="-0.15 -0.15 ${S + .3} ${S + .3}" class="pzs ${cls}">${cells.map(p => `<rect x="${p.x + ox + .04}" y="${p.y + oy + .04}" width=".92" height=".92" rx=".14" fill="${p.c ? '#ff8a3d' : '#43a6ff'}" stroke="#3b2a1e" stroke-width=".09"/>${p.c ? `<circle cx="${p.x + ox + .5}" cy="${p.y + oy + .5}" r=".17" fill="#fff"/>` : ''}`).join('')}</svg>`;
}
function pickButtons(ctx, html){
  const box = document.createElement('div'); box.className = 'lq-pick'; box.style.setProperty('--n', ctx.q.choices.length);
  ctx.q.choices.forEach((c, i) => { const b = document.createElement('button'); b.className = 'btn'; b.dataset.v = i; b.innerHTML = html(c, i); b.onclick = () => submit(ctx, i, b); box.append(b); });
  ctx.inp.append(box); return box;
}
const mazeKeys = {ctx:null};
document.addEventListener('keydown', e => { const c = mazeKeys.ctx; if(!c || !c.board || !c.board.isConnected){ mazeKeys.ctx = null; return; } const k = {ArrowUp:0, ArrowRight:1, ArrowDown:2, ArrowLeft:3}[e.key]; if(k != null){ e.preventDefault(); TYPES.maze.move(c, k); } });
Object.assign(TYPES, {
  pattern: {
    setup(c){ const q = c.q, end = q.miss >= q.seq.length; c.ans = q.ans; c.ansSay = ''; c.ansLabel = 'みどりの もの'; c.dir = usesDirOf(q);
      c.text = end ? 'つぎに くるのは どれ？' : '?に はいるのは どれ？';
      const row = document.createElement('div'); row.className = 'pz-row';
      const cells = end ? q.seq.concat([null]) : q.seq;
      row.innerHTML = cells.map((it, i) => it ? `<span class="pz-c" data-i="${i}">${itemSVG(it, c.dir)}</span>` : `<span class="pz-c q" data-i="${i}">?</span>`).join('');
      c.vis.append(row); c.row = row; c.cells = cells; },
    input(c){ pickButtons(c, it => itemSVG(it, c.dir)); },
    async hint(c){ const r = Object.entries(c.q.rules || {})[0]; if(!r) return; const [a, rule] = r;
      if(rule.kind === 'cycle'){ c.row.querySelectorAll('.pz-c').forEach((el, i) => i < rule.p && el.classList.add('hl')); }
      c.hintSay = a === 'color' ? 'いろの じゅんばんを みてね' : a === 'shape' ? 'かたちの じゅんばんを みてね' : 'くりかえしを さがそう';
      await Voice.say(c.hintSay); },
    async explain(c){ const q = c.q, r = Object.values(q.rules || {}).find(x => x.kind === 'cycle'), els = [...c.row.querySelectorAll('.pz-c')];
      const ansEl = c.row.querySelector('.pz-c.q'); if(ansEl){ ansEl.classList.remove('q'); ansEl.innerHTML = itemSVG(q.choices[q.ans], c.dir); ansEl.classList.add('ans'); }
      if(r){ for(let k = 0; k * r.p < els.length; k++){ els.slice(k * r.p, k * r.p + r.p).forEach(el => el.classList.add('g' + (k % 2))); await sleep(450, c.t); } }
      return PZ().describePattern(q); },
  },
  rotate: {
    setup(c){ const q = c.q; c.ans = q.ans; c.ansSay = ''; c.ansLabel = 'みどりの もの'; c.turn = 0;
      c.text = q.mode === 'angle' ? `みぎに ${q.k}かい まわすと どれ？` : (c.age >= 5 ? 'うらがえしは だめだよ。まわして おなじ かたちは どれ？' : 'おなじ かたちは どれ？ まわして かんがえよう');
      const box = document.createElement('div'); box.className = 'pz-base';
      box.innerHTML = `<div class="pz-rot">${shapeSVG(q.base)}</div>${q.mode === 'angle' ? `<div class="pz-turns">${'↻'.repeat(q.k)}</div>` : ''}<button class="btn sub pz-spin">↻ まわす</button>`;
      c.vis.append(box); c.rotEl = box.querySelector('.pz-rot');
      box.querySelector('.pz-spin').onclick = () => { tap(); c.turn++; c.rotEl.style.transform = `rotate(${c.turn * 90}deg)`; }; },
    input(c){ c.pick = pickButtons(c, sh => shapeSVG(sh)); },
    async hint(c){ c.rotEl.classList.add('hl'); c.hintSay = 'まわす ボタンで まわして みよう'; await Voice.say(c.hintSay);
      if(c.q.mode === 'angle'){ c.turn = 1; c.rotEl.style.transform = 'rotate(90deg)'; await sleep(700, c.t); } },
    async explain(c){ const n = PZ().turnsTo(c.q); c.turn = 0; c.rotEl.style.transform = 'rotate(0deg)'; await sleep(350, c.t);
      for(let i = 1; i <= n; i++){ c.rotEl.style.transform = `rotate(${i * 90}deg)`; await sleep(800, c.t); }
      c.pick && c.pick.querySelector(`[data-v="${c.q.ans}"]`).classList.add('ok');
      const trap = c.q.choices.some((ch, i) => i !== c.q.ans && PZ().rotations(PZ().mirror(c.q.base)).includes(PZ().key(ch)));
      return `みぎに ${n}かい まわすと おなじ かたちに なるよ` + (trap ? '。うらがえしの かたちは まわしても おなじに ならないよ' : ''); },
  },
  maze: {
    setup(c){ const m = c.q; c.pos = m.start.slice(); c.trail = [m.start.slice()]; c.hasKey = !m.key; c.ans = 'goal'; c.ansSay = ''; c.ansLabel = 'ひかっている みち';
      c.text = m.key ? 'かぎを とってから ゴールへ いこう' : 'ゴールまで いこう';
      const W = Math.min(window.innerWidth || 375, 680) - 70, H = (window.innerHeight || 740) - 470, cs = Math.max(30, Math.min(64, Math.floor(W / m.w), Math.floor(Math.max(H, 220) / m.h)));   // はば と たかさ の りょうほうに あわせる
      const board = document.createElement('div'); board.className = 'mz'; board.style.cssText = `--cs:${cs}px;grid-template-columns:repeat(${m.w},${cs}px)`;
      for(let y = 0; y < m.h; y++) for(let x = 0; x < m.w; x++){
        const w = m.walls[y][x], d = document.createElement('div'); d.className = 'mz-c'; d.dataset.x = x; d.dataset.y = y;
        d.style.borderWidth = `${w[0] ? 3 : 0}px ${w[1] ? 3 : 0}px ${w[2] ? 3 : 0}px ${w[3] ? 3 : 0}px`;
        if(m.ghosts.some(g => g[0] === x && g[1] === y)) d.innerHTML = '<span class="mz-i">👻</span>';
        if(m.key && m.key[0] === x && m.key[1] === y) d.innerHTML = '<span class="mz-i mz-key">🔑</span>';
        if(m.goal[0] === x && m.goal[1] === y) d.innerHTML = `<span class="mz-i mz-goal">${m.key ? '🚪' : '🏁'}</span>`;
        board.append(d);
      }
      const me = document.createElement('div'); me.className = 'mz-me';
      const C = Buddy.C, img = C && C.frames && (C.frames.t000 || C.frames.p_wave);
      me.innerHTML = img ? `<img src="${img}" alt="">` : '🐣'; board.append(me);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'mz-line'); board.append(svg);
      c.vis.append(board); c.board = board; c.me = me; c.cs = cs; c.svg = svg;
      TYPES.maze.place(c); },
    place(c){ c.me.style.transform = `translate(${c.pos[0] * c.cs}px, ${c.pos[1] * c.cs}px)`; },
    move(c, d){
      if(c.locked || !Run.alive(c.t)) return; const m = c.q, [x, y] = c.pos;
      if(!PZ().canMove(m, x, y, d)){ const nx = x + PZ().DX[d], ny = y + PZ().DY[d];
        const ghost = m.ghosts.some(g => g[0] === nx && g[1] === ny);
        c.me.classList.remove('bump'); void c.me.offsetWidth; c.me.classList.add('bump'); tap('boing');
        const now = Date.now(); if(!c.lastBump || now - c.lastBump > 2500){ c.lastBump = now; Voice.say(ghost ? 'おばけの ところは とおれないよ' : 'かべが あるよ'); }
        return; }
      c.pos = [x + PZ().DX[d], y + PZ().DY[d]]; c.trail.push(c.pos.slice()); TYPES.maze.place(c); tap();
      c.board.querySelectorAll('.mz-c.glow').forEach(el => { if(+el.dataset.x === c.pos[0] && +el.dataset.y === c.pos[1]) el.classList.remove('glow'); });
      if(m.key && !c.hasKey && c.pos[0] === m.key[0] && c.pos[1] === m.key[1]){ c.hasKey = true; c.board.querySelector('.mz-key').remove(); c.board.querySelector('.mz-goal').textContent = '🏁'; tap('coin'); Voice.say('かぎを ゲットした！'); }
      if(c.pos[0] === m.goal[0] && c.pos[1] === m.goal[1]){ if(c.hasKey) submit(c, 'goal', null); else Voice.say('かぎを とってから ゴールへ いこう'); }
    },
    input(c){
      const pad = document.createElement('div'); pad.className = 'mz-pad';
      pad.innerHTML = `<span></span><button class="btn" data-d="0" aria-label="うえ">⬆️</button><span></span><button class="btn" data-d="3" aria-label="ひだり">⬅️</button><button class="btn sub mz-hint">💡</button><button class="btn" data-d="1" aria-label="みぎ">➡️</button><span></span><button class="btn" data-d="2" aria-label="した">⬇️</button><span></span>`;
      pad.querySelectorAll('[data-d]').forEach(b => b.onclick = () => TYPES.maze.move(c, +b.dataset.d));
      pad.querySelector('.mz-hint').onclick = () => TYPES.maze.useHint(c);
      c.inp.append(pad);
      // ゆびで なぞる・スワイプ
      let drag = null;
      c.board.onpointerdown = e => { drag = {x:e.clientX, y:e.clientY, moved:false}; try{ c.board.setPointerCapture(e.pointerId); }catch(_){} };
      c.board.onpointermove = e => {
        if(!drag) return; const r = c.board.getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / c.cs), cy = Math.floor((e.clientY - r.top) / c.cs);
        const dx = cx - c.pos[0], dy = cy - c.pos[1];
        if(Math.abs(dx) + Math.abs(dy) === 1){ drag.moved = true; TYPES.maze.move(c, dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0); }
      };
      c.board.onpointerup = c.board.onpointercancel = e => {
        if(drag && !drag.moved){ const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if(Math.max(Math.abs(dx), Math.abs(dy)) > 30) TYPES.maze.move(c, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); }
        drag = null; };
      mazeKeys.ctx = c;   // キーボード（タブレットの キーボードや パソコン）でも うごかせる
    },
    check(c, v){ return v === 'goal'; },
    // ヒント：1かいめは つぎの 5マスを ひからせる。2かいめは みちを ぜんぶ みせて いっしょに すすむ（まちがい あつかい）
    async useHint(c){
      if(c.locked) return; tap(); c.tries++; Buddy.calm();
      const m = c.q, rest = c.hasKey ? PZ().bfs(m, c.pos, m.goal).path : PZ().solveMaze(m, c.pos);
      if(!rest) return;
      if(c.tries === 1){ rest.slice(1, 6).forEach(([x, y]) => c.board.querySelector(`.mz-c[data-x="${x}"][data-y="${y}"]`).classList.add('glow')); Buddy.say('ひかっている みちを すすもう', 'point', 3000); await Voice.say('ひかっている みちを すすもう'); return; }
      c.locked = true; rest.forEach(([x, y]) => c.board.querySelector(`.mz-c[data-x="${x}"][data-y="${y}"]`).classList.add('glow'));
      Buddy.say('いっしょに いこう', 'point', 2500); await Voice.say('いっしょに いこう');
      try{ for(const [x, y] of rest.slice(1)){ await sleep(260, c.t); c.pos = [x, y]; c.trail.push([x, y]); TYPES.maze.place(c);
        if(m.key && !c.hasKey && x === m.key[0] && y === m.key[1]){ c.hasKey = true; c.board.querySelector('.mz-key')?.remove(); c.board.querySelector('.mz-goal').textContent = '🏁'; } }
        await c.fb(false); }catch(e){ if(e !== STOP) console.error(e); }
    },
    async hint(c){},
    async explain(c){ const m = c.q, cs = c.cs, pts = c.trail.map(([x, y]) => `${x * cs + cs / 2},${y * cs + cs / 2}`).join(' ');
      c.svg.setAttribute('viewBox', `0 0 ${m.w * cs} ${m.h * cs}`); c.svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#ff8a3d" stroke-width="${Math.max(5, cs / 6)}" stroke-linecap="round" stroke-linejoin="round" opacity=".85" class="mz-trail"/>`;
      const steps = c.trail.length - 1, best = m.path.length - 1;
      return `オレンジの せんが とおった みちだよ。${steps}マス すすんだね` + (steps <= best ? '。いちばん ちかい みちで ゴールできたよ！' : `。いちばん ちかい みちは ${best}マスだよ`); },
  },
});
function clockSVG(h, m){
  const num = [...Array(12)].map((_, i) => { const k = i + 1, a = k * Math.PI / 6, r = 74; return `<text x="${100 + r * Math.sin(a)}" y="${100 - r * Math.cos(a) + 7}" text-anchor="middle" font-size="20" font-weight="800" fill="#3b2a1e">${k}</text>`; }).join('');
  const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
  return `<svg class="lclock" viewBox="0 0 200 200" aria-label="とけい"><circle cx="100" cy="100" r="95" fill="#fff" stroke="#3b2a1e" stroke-width="6"/>${num}
    <line class="mh" x1="100" y1="100" x2="${100 + 70 * Math.sin(ma)}" y2="${100 - 70 * Math.cos(ma)}"/><line class="hh" x1="100" y1="100" x2="${100 + 46 * Math.sin(ha)}" y2="${100 - 46 * Math.cos(ha)}"/>
    <circle cx="100" cy="100" r="7" fill="#3b2a1e"/></svg>`;
}

/* ---------------- 既存の ゲームとの つなぎ ---------------- */
function linkGame(){
  const row = document.querySelector('#home .subrow');
  if(row && !$('toLearn')){ const b = document.createElement('button'); b.className = 'btn'; b.id = 'toLearn'; b.textContent = '📚 がくしゅう'; b.onclick = () => { tap(); go(Profiles.current() ? 'lhome' : 'lprof'); }; row.prepend(b); }
}
function init(){
  Profiles.load(); mountScreens(); linkGame();
  go('lprof');
}
window.Learn = {init, go, Profiles, Progress, Voice, TYPES, ruby, reading, speechOf, groupSay, starsFor,
  // ほかの ファイル（learn/shikou2.js など）から 問題の しゅるいを ふやす ための どうぐ
  kit:{submit, sleep, STOP, Run, Buddy, shuffle, tap, esc, choicesFor, pickOne, nChoices, pickButtons, showHTML, planetSVG, enSay, PZ:() => window.Puzzles}, _ctx:null, _result:null, _submit:(v) => { const c = window.Learn._ctx; if(c) submit(c, v, c.inp.querySelector(`.lq-ans .btn[data-v="${v}"]`)); }};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ================================================================
   5びょう ギャグ（3もん れんぞく せいかいの ごほうび）
   - 小学生が わらう、わかりやすい ドタバタ。キャラは まいかい ランダム
   - playGag(host, done) で 1つ 再生（つづけて 同じ ネタは 出さない）
   - index.html の SheetActor / CutoutActor / sfx を つかう
   ================================================================ */
(function(global){
  const css = `
  .gg{position:absolute;inset:0;overflow:hidden;font-family:var(--font);background:linear-gradient(#9fdcff 0,#e6f6ff 55%,#8fd77a 55%,#5fb752 100%)}
  .gg-c{position:absolute;transform-origin:50% 100%;translate:-50% 0}
  .gg-c>.in{position:absolute;inset:0}
  .gg-p{position:absolute;transform-origin:50% 50%;translate:-50% 50%;line-height:1;text-align:center;pointer-events:none;white-space:nowrap}
  .gg-say{position:absolute;z-index:30;background:#fff;border:4px solid #3b2a1e;border-radius:20px;padding:6px 12px;font:900 clamp(1rem,4.6vw,1.35rem)/1.3 var(--font);color:#3b2a1e;
    box-shadow:0 4px 0 #3b2a1e;width:max-content;max-width:70%;text-align:center;translate:-50% 0;animation:ggIn .3s cubic-bezier(.2,1.7,.4,1) both;white-space:pre-line}
  @keyframes ggIn{from{scale:0}}
  .gg-sfx{position:absolute;z-index:31;font:900 clamp(2.4rem,13vw,4.6rem)/1 var(--font);color:#ffd23f;-webkit-text-stroke:3px #3b2a1e;paint-order:stroke fill;text-shadow:0 6px 0 #3b2a1e;
    translate:-50% -50%;rotate:-7deg;animation:ggPop 1.2s cubic-bezier(.2,1.6,.4,1) both;white-space:nowrap;pointer-events:none}
  @keyframes ggPop{0%{scale:0}25%{scale:1.15}40%{scale:1}85%{opacity:1}100%{opacity:0;scale:1.1}}
  .gg-shake{animation:ggShake .09s linear 8}
  @keyframes ggShake{25%{translate:-6px 3px}75%{translate:6px -3px}}
  .gg-flash{position:absolute;inset:0;z-index:29;background:#fff;animation:ggFl .5s ease-out forwards;pointer-events:none}
  @keyframes ggFl{from{opacity:.9}to{opacity:0}}
  .gg-zap{animation:ggZap .12s steps(1) infinite}
  @keyframes ggZap{50%{filter:invert(1) brightness(1.4)}}
  .gg-stars{position:absolute;z-index:25;width:20vmin;height:8vmin;translate:-50% 50%;animation:ggSpin .9s linear infinite;pointer-events:none}
  .gg-stars i{position:absolute;font-style:normal;font-size:5vmin}
  @keyframes ggSpin{to{rotate:360deg}}
  .gg-note{position:absolute;z-index:20;font-size:7vmin;animation:ggNote 1.4s ease-out forwards;pointer-events:none}
  @keyframes ggNote{to{transform:translate(var(--dx),-30vh) rotate(40deg);opacity:0}}
  .gg-crack{position:absolute;inset:0;z-index:28;pointer-events:none}
  `;
  const TUB = '<svg viewBox="0 0 100 50" style="width:100%;height:100%"><path d="M4 8 H96 L84 46 H16 Z" fill="#b8c2cc" stroke="#3b2a1e" stroke-width="4" stroke-linejoin="round"/><path d="M4 8 H96" stroke="#3b2a1e" stroke-width="7"/><path d="M22 18 H78" stroke="#fff" stroke-width="3" opacity=".7"/></svg>';
  const ROLLER = '<svg viewBox="0 0 120 80" style="width:100%;height:100%"><rect x="34" y="6" width="70" height="40" rx="6" fill="#ffcf3f" stroke="#3b2a1e" stroke-width="4"/><rect x="44" y="12" width="26" height="18" fill="#bfe6ff" stroke="#3b2a1e" stroke-width="3"/><circle cx="34" cy="56" r="22" fill="#8a8f96" stroke="#3b2a1e" stroke-width="4"/><circle cx="92" cy="64" r="14" fill="#3b3b3b" stroke="#3b2a1e" stroke-width="4"/></svg>';
  const CANNON = '<svg viewBox="0 0 100 70" style="width:100%;height:100%"><rect x="20" y="10" width="72" height="30" rx="14" fill="#555" stroke="#222" stroke-width="4" transform="rotate(-22 50 30)"/><circle cx="34" cy="52" r="16" fill="#8b5a2b" stroke="#3b2a1e" stroke-width="4"/></svg>';
  const VACUUM = '<svg viewBox="0 0 100 60" style="width:100%;height:100%"><rect x="56" y="14" width="40" height="34" rx="12" fill="#ff6b8a" stroke="#3b2a1e" stroke-width="4"/><path d="M58 30 Q30 30 14 44" fill="none" stroke="#3b2a1e" stroke-width="9"/><path d="M58 30 Q30 30 14 44" fill="none" stroke="#9aa" stroke-width="5"/><rect x="0" y="40" width="24" height="12" rx="3" fill="#666" stroke="#3b2a1e" stroke-width="3"/></svg>';
  const SNOW = '<svg viewBox="0 0 100 100" style="width:100%;height:100%"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#9cc4e4" stroke-width="5"/><path d="M30 30 q8 -6 14 0 M60 64 q8 -6 14 0 M26 64 q6 4 12 0" stroke="#cfe3f3" stroke-width="4" fill="none"/></svg>';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- ぶたい（キャラ・こどうぐ・うごき） ----------
  function Stage(host){
    if(!document.getElementById('ggCss')){ const s = document.createElement('style'); s.id = 'ggCss'; s.textContent = css; document.head.append(s); }
    const S = document.createElement('div'); S.className = 'gg'; host.append(S);
    const actors = []; let alive = true;
    const SND = k => { try{ typeof sfx === 'function' && sfx(k); }catch(e){} };
    const ids = Object.keys(global.SHEET_CHARS || {}).filter(k => global.SHEET_CHARS[k].frames && k !== 'bobobo');
    const g = {
      S, SND, alive: () => alive && S.isConnected,
      wait: async ms => { await sleep(ms); if(!g.alive()) throw 'stop'; },
      cast: n => shuffle(ids).slice(0, n),
      // x・b は 画面の %（x は まんなか、b は 下から）、h は たかさ %
      sheet(id, x, b, h, z = 5){
        const C = global.SHEET_CHARS[id], el = document.createElement('div'); el.className = 'gg-c'; el.style.zIndex = z; S.append(el);
        el.style.aspectRatio = C.aspect || '3/4'; const inn = document.createElement('div'); inn.className = 'in'; el.append(inn);
        el.a = global.SheetActor ? SheetActor.create(inn, C) : null; el.a && actors.push(el.a);
        el.pose = p => { el.a && el.a.pose(p); return el; }; g.set(el, {x, b, h, r:0, sx:1, sy:1, o:1}); return el;
      },
      cut(id, x, b, h, z = 6){
        const cfg = global.CUTOUT_CONFIGS[id], el = document.createElement('div'); el.className = 'gg-c'; el.style.zIndex = z; S.append(el);
        el.style.aspectRatio = cfg.canvas.w + '/' + cfg.canvas.h; const inn = document.createElement('div'); inn.className = 'in'; el.append(inn);
        el.a = CutoutActor.create(cfg, inn).speed(.8); actors.push(el.a); el.pose = m => { el.a.play(m); return el; }; g.set(el, {x, b, h, r:0, sx:1, sy:1, o:1}); return el;
      },
      prop(html, x, b, w, z = 8){ const el = document.createElement('div'); el.className = 'gg-p'; el.innerHTML = html; el.style.zIndex = z; el.style.width = w + 'vmin'; el.style.fontSize = (w * .9) + 'vmin'; S.append(el); g.set(el, {x, b, r:0, sx:1, sy:1, o:1}); return el; },
      set(el, v){ Object.assign(el, {st:Object.assign(el.st || {}, v)}); const s = el.st;
        el.style.left = s.x + '%'; el.style.bottom = s.b + '%'; if(s.h != null) el.style.height = s.h + '%';
        el.style.rotate = s.r + 'deg'; el.style.scale = s.sx + ' ' + s.sy; el.style.opacity = s.o; },
      move(el, to, ms, fn = ease){
        const f = Object.assign({}, el.st), t0 = performance.now();
        return new Promise(res => { (function step(now){ if(!g.alive()) return res(); const u = Math.min(1, (now - t0) / ms), e = fn(u), v = {};
          for(const k in to) if(k !== 'arc') v[k] = f[k] + (to[k] - f[k]) * e;
          if(to.arc) v.b = (v.b ?? f.b) + Math.sin(u * Math.PI) * to.arc;
          g.set(el, v); u < 1 ? requestAnimationFrame(step) : res(); })(t0); });
      },
      say(el, text, ms = 1800){ const b = document.createElement('div'); b.className = 'gg-say'; b.textContent = text;
        const top = el.st.b + (el.st.h || 10) * el.st.sy + 2; b.style.left = Math.max(26, Math.min(74, el.st.x)) + '%'; b.style.bottom = Math.min(86, top) + '%'; S.append(b); setTimeout(() => b.remove(), ms); },
      pop(text, x, y, snd){ const e = document.createElement('div'); e.className = 'gg-sfx'; e.textContent = text; e.style.left = x + '%'; e.style.top = y + '%'; S.append(e); setTimeout(() => e.remove(), 1300); snd && SND(snd); },
      stars(x, b){ const e = document.createElement('div'); e.className = 'gg-stars'; e.innerHTML = '<i style="left:0;top:0">⭐</i><i style="left:40%;top:50%">💫</i><i style="right:0;top:0">⭐</i>'; e.style.left = x + '%'; e.style.bottom = b + '%'; S.append(e); return e; },
      flash(){ const e = document.createElement('div'); e.className = 'gg-flash'; S.append(e); setTimeout(() => e.remove(), 500); },
      shake(){ S.classList.remove('gg-shake'); void S.offsetWidth; S.classList.add('gg-shake'); },
      stop(){ alive = false; actors.forEach(a => { try{ a.destroy(); }catch(e){} }); S.remove(); },
    };
    return g;
  }
  const lin = u => u;

  // ---------- 20この ネタ（どれも 5びょう くらい） ----------
  const GAGS = {
    // 1. バナナの かわで すってーん → あたまから ささる
    async banana(g){ const [a] = g.cast(1); const A = g.sheet(a, 12, 8, 30).pose('run'); const ban = g.prop('🍌', 55, 9, 9);
      await g.move(A, {x:52}, 1300, lin); A.pose('trip'); g.pop('つるっ！', 50, 40, 'boing'); ban.remove();
      await g.move(A, {b:30, r:-200}, 600); await g.move(A, {b:8, r:-180}, 350, u => u * u); g.pop('どてーん！', 50, 52, 'crash'); g.shake(); A.pose('cry'); g.stars(52, 6);
      await g.wait(1600); },
    // 2. パイが かおに べちゃっ
    async pie(g){ const [a] = g.cast(1); const A = g.sheet(a, 18, 8, 28).pose('laugh'); const G = g.cut('gian', 74, 6, 40).pose('ニヤリ');
      g.say(G, 'なんだよ？'); await g.wait(900); A.pose('point'); const p = g.prop('🥧', 24, 30, 12, 9); g.SND('whoosh2');
      await g.move(p, {x:74, b:38, r:540}, 800, lin); g.pop('べちゃっ！', 70, 36, 'hit'); g.set(p, {sx:2.2, sy:1.6}); G.pose('びっくり'); g.say(G, 'むぐぐーっ！'); A.pose('laugh');
      await g.move(p, {b:30}, 1600); await g.wait(800); },
    // 3. くしゃみで みんな ふっとぶ
    async sneeze(g){ const [a, b, c] = g.cast(3); const A = g.sheet(a, 22, 8, 28).pose('think'); const B = g.sheet(b, 58, 8, 22), C = g.sheet(c, 80, 8, 22);
      g.say(A, 'は…は…'); await g.move(A, {sy:1.15, sx:.92}, 900); await g.wait(200);
      g.set(A, {sx:1.1, sy:.9}); A.pose('angry'); g.pop('ハックション！！', 50, 34, 'boom'); g.shake(); B.pose('scared'); C.pose('scared');
      await Promise.all([g.move(B, {x:130, b:60, r:720}, 1500), g.move(C, {x:150, b:40, r:-720}, 1500)]); A.pose('laugh'); g.say(A, 'ごめーん！'); await g.wait(1300); },
    // 4. タライが あたまに ガーン
    async tub(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 32).pose('wave'); g.say(A, 'いい てんき〜♪'); const t = g.prop(TUB, 50, 110, 30, 9);
      await g.wait(1200); g.SND('whoosh2'); await g.move(t, {b:43}, 600, u => u * u); g.pop('ガーン！！', 50, 30, 'crash'); g.shake();
      g.set(A, {sx:1.25, sy:.7}); A.pose('cry'); g.stars(50, 36); await g.move(t, {b:28, r:30, x:66}, 500); await g.wait(1900); },
    // 5. おならロケット
    async fart(g){ const [a, b] = g.cast(2); const A = g.sheet(a, 40, 8, 28).pose('shy'), B = g.sheet(b, 78, 8, 24).pose('wave');
      g.say(A, 'あっ… でそう…'); await g.wait(1100); const cl = g.prop('💨', 34, 12, 16, 4); g.pop('ぷぅ〜〜！', 40, 60, 'ufo'); A.pose('fly');
      await Promise.all([g.move(A, {b:120, r:-15}, 1400, u => u * u), g.move(cl, {sx:3, sy:3, o:.8}, 1400)]); B.pose('scared'); g.say(B, 'くさーーい！！'); await g.wait(1500); },
    // 6. おとしあなに おちて ばねで とびだす
    async hole(g){ const [a] = g.cast(1); const hole = g.prop('<div style="width:30vmin;height:8vmin;background:radial-gradient(#000 40%,#3a2412 70%);border-radius:50%;border:3px solid #3b2a1e"></div>', 55, 6, 30, 4); const A = g.sheet(a, 15, 8, 28, 5).pose('run');
      await g.move(A, {x:55}, 1200, lin); A.pose('scared'); g.say(A, 'あ〜れ〜！'); await g.move(A, {b:-30, sy:.6}, 500, u => u * u); g.SND('down');
      await g.wait(700); g.SND('boing'); A.pose('jump'); g.pop('びよよ〜ん！', 50, 30); await g.move(A, {b:40, sy:1.2, r:360}, 700); await g.move(A, {b:8, sy:1}, 500, u => u * u); A.pose('cry'); g.stars(55, 34); await g.wait(1000); },
    // 7. ローラーで ぺらぺらに
    async roller(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 30).pose('wave'); const R = g.prop(ROLLER, -20, 22, 38, 9);
      await g.move(R, {x:50}, 1200, lin); g.set(A, {sy:.06, sx:1.3}); g.pop('ぺっちゃんこ！', 50, 40, 'crash'); await g.move(R, {x:130}, 900, lin);
      await g.move(A, {r:8}, 300); await g.move(A, {r:-8}, 300); await g.wait(400); g.SND('pop'); g.pop('ぽんっ！', 50, 50); A.pose('surprised'); await g.move(A, {sy:1, sx:1, r:0}, 400); A.pose('cry'); await g.wait(1000); },
    // 8. ふうせんみたいに ふくらんで ぷしゅるる〜
    async balloon(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 26).pose('surprised'); g.say(A, 'ジュース のみすぎた…');
      await g.move(A, {sx:1.9, sy:1.5}, 1300); g.pop('パンパン！', 50, 26); await g.move(A, {b:40}, 700); g.SND('ufo'); g.pop('ぷしゅるるる〜！', 50, 20);
      const path = [[20, 70], [80, 60], [30, 20], [75, 30], [50, 8]]; for(const [x, b] of path){ await g.move(A, {x, b, r:A.st.r + 200, sx:A.st.sx * .9, sy:A.st.sy * .9}, 330); }
      g.set(A, {sx:1, sy:1, r:0}); A.pose('sleep'); g.SND('land'); await g.wait(900); },
    // 9. ドミノたおし
    async domino(g){ const c = g.cast(5); const L = c.map((id, i) => g.sheet(id, 12 + i * 19, 8, 14).pose('wave')); L[4].pose('laugh');
      await g.wait(500); g.pop('ドミノ〜！', 50, 30);
      for(let i = 0; i < 4; i++){ L[i].pose('scared'); g.SND('hit'); await g.move(L[i], {r:70}, 300); }
      g.say(L[4], 'セーフ！'); await g.wait(800); g.SND('crash'); await g.move(L[4], {r:80}, 400, u => u * u); L.forEach(l => l.pose('cry')); g.shake(); await g.wait(900); },
    // 10. ジャイアンの うたで みんな きぜつ
    async song(g){ const [a, b] = g.cast(2); const G = g.cut('gian', 50, 6, 42).pose('歌う'); const A = g.sheet(a, 14, 8, 22), B = g.sheet(b, 86, 8, 22);
      g.say(G, 'ボエ〜〜〜♪'); g.SND('boom');
      for(let i = 0; i < 10; i++){ const n = document.createElement('div'); n.className = 'gg-note'; n.textContent = pickOne(['🎵', '🎶', '💥']); n.style.left = (40 + Math.random() * 20) + '%'; n.style.top = '30%'; n.style.setProperty('--dx', (Math.random() * 60 - 30) + 'vw'); n.style.animationDelay = (i * .12) + 's'; g.S.append(n); }
      A.pose('scared'); B.pose('scared'); g.shake(); await g.wait(1500);
      g.prop('🪟', 30, 60, 14, 9); g.pop('パリーン！', 30, 30, 'crash'); g.prop('💥', 30, 62, 16, 10);
      A.pose('sleep'); B.pose('sleep'); await Promise.all([g.move(A, {r:-90}, 500), g.move(B, {r:90}, 500)]); g.say(G, 'あれ？ みんな ねちゃった'); await g.wait(1800); },
    // 11. たいほうで とんで がめんに べたっ
    async cannon(g){ const [a] = g.cast(1); const can = g.prop(CANNON, 14, 12, 30, 6); const A = g.sheet(a, 14, 16, 20, 5).pose('scared'); g.set(A, {o:0});
      await g.wait(500); g.pop('ドーン！', 22, 50, 'boom'); g.set(A, {o:1}); A.pose('fly');
      await g.move(A, {x:52, b:20, h:20, sx:4.2, sy:4.2, r:720}, 900); g.flash(); g.pop('べたっ！', 50, 40, 'hit'); g.set(A, {r:0, sx:4.6, sy:3.6}); A.pose('cry');
      await g.move(A, {b:-20}, 2200, lin); await g.wait(400); },
    // 12. かおを がめんに むにゅ〜
    async squish(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 24).pose('laugh'); g.say(A, 'ねえねえ！'); await g.wait(700);
      await g.move(A, {b:-60, h:24, sx:5, sy:5}, 900); g.SND('pop'); g.pop('むにゅ〜〜', 50, 20); await g.move(A, {sx:6.2, sy:4.2}, 600);
      await g.move(A, {sx:5, sy:5}, 300); A.pose('angry'); await g.move(A, {sx:6.4, sy:3.8}, 500); g.SND('boing'); await g.move(A, {b:-110}, 1300, u => u * u); await g.wait(500); },
    // 13. そうじきで すいこまれる
    async vacuum(g){ const [a, b] = g.cast(2); const V = g.prop(VACUUM, 72, 12, 36, 7); const B = g.sheet(b, 86, 8, 22, 6).pose('point'); const A = g.sheet(a, 30, 8, 26).pose('wave');
      g.pop('ゴォォォ！', 70, 30, 'whoosh2'); A.pose('scared'); g.say(A, 'まって〜！');
      await g.move(A, {x:52, sx:2.2, sy:.45, r:-10}, 1100); await g.move(A, {x:60, sx:.1, sy:.1, o:0}, 400); g.pop('ズボボッ！', 60, 46, 'hit');
      await g.wait(900); g.pop('げぷっ', 76, 30, 'boing'); g.set(A, {x:60, sx:1, sy:1, r:0, o:1}); A.pose('trip'); await g.move(A, {x:30, b:30, r:-360, arc:20}, 800); g.set(A, {b:8}); A.pose('cry'); B.pose('laugh'); await g.wait(800); },
    // 14. でんきで ビリビリ → まっくろ
    async zap(g){ const [a] = g.cast(1); const A = g.sheet(a, 30, 8, 28).pose('point'); const z = g.prop('🔌', 62, 14, 12); g.say(A, 'これ なにかな？');
      await g.wait(900); await g.move(A, {x:52}, 600); A.classList.add('gg-zap'); A.pose('scared'); g.pop('ビリビリビリ！', 50, 30, 'slash'); g.prop('⚡', 40, 40, 14, 9); g.prop('⚡', 64, 46, 12, 9);
      await g.move(A, {sy:1.15}, 1200); A.classList.remove('gg-zap'); A.style.filter = 'brightness(.25)'; g.pop('ぷすぷす…', 50, 50, 'miss'); A.pose('cry');
      g.prop('💨', 52, 46, 12, 9); await g.wait(1900); },
    // 15. まわりすぎて めが ぐるぐる
    async dizzy(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 30).pose('dance'); g.say(A, 'まわるの とくい！');
      for(let i = 0; i < 9; i++){ await g.move(A, {sx:-1}, 140 - i * 8); await g.move(A, {sx:1}, 140 - i * 8); }
      g.pop('ぐるぐる〜', 50, 30, 'ufo'); A.pose('scared'); await g.move(A, {r:20, x:56}, 400); await g.move(A, {r:-25, x:44}, 400); await g.move(A, {r:90, x:56}, 400, u => u * u);
      g.SND('crash'); g.prop('😵', 66, 22, 10, 9); g.stars(60, 20); await g.wait(1200); },
    // 16. ゆきだまが みんなを まきこんで ころころ
    async snowball(g){ const [a, b] = g.cast(2); const A = g.sheet(a, 50, 8, 22).pose('wave'), B = g.sheet(b, 75, 8, 22).pose('wave'); const sb = g.prop(SNOW, -10, 14, 18, 9);
      g.pop('ゴロゴロ…', 30, 30, 'whoosh2'); await g.move(sb, {x:50, r:540}, 1100, lin); A.pose('scared'); g.set(A, {o:0}); g.set(sb, {sx:1.6, sy:1.6}); g.pop('まきこまれた！', 50, 38, 'hit');
      await g.move(sb, {x:75, r:900}, 800, lin); g.set(B, {o:0}); g.set(sb, {sx:2.3, sy:2.3}); g.SND('hit');
      const legs = g.prop('🦵🦵', 75, 40, 12, 10); await Promise.all([g.move(sb, {x:140, r:1500}, 1300, lin), g.move(legs, {x:140, r:1500}, 1300, lin)]); await g.wait(500); },
    // 17. マーシャルの ホースが じぶんに ぶしゃー
    async hose(g){ const M = global.SHEET_CHARS.marshall ? g.sheet('marshall', 30, 8, 28).pose('special') : g.sheet(g.cast(1)[0], 30, 8, 28).pose('point'); const f = g.prop('🔥', 78, 12, 16);
      g.say(M, 'ひを けすぞ！'); await g.wait(1000); g.pop('ぶしゃー！', 60, 30, 'whoosh2'); const w = g.prop('💦', 50, 26, 12, 9); await g.move(w, {x:72}, 500);
      g.pop('あれ？', 60, 44); await g.move(w, {x:32, b:34, r:200, sx:2.5, sy:2.5}, 700); M.pose('scared'); M.style.filter = 'saturate(.6) brightness(1.15)'; g.prop('💧', 22, 30, 8, 9); g.prop('💧', 38, 36, 7, 9); g.prop('💧', 30, 44, 6, 9); g.pop('ぶはっ！', 30, 40, 'boing');
      g.say(M, 'つめたーーい！'); f.textContent = '😆'; await g.wait(1800); },
    // 18. ハチに おいかけられて ゴチン
    async bees(g){ const [a, b] = g.cast(2); const A = g.sheet(a, 20, 8, 22).pose('run'), B = g.sheet(b, 80, 8, 22).pose('run'); g.set(B, {sx:-1});
      const be = g.prop('🐝🐝🐝', 0, 40, 18, 9); g.pop('ブーン！', 50, 26, 'ufo'); g.say(A, 'にげろ〜！');
      await Promise.all([g.move(A, {x:47}, 1300, lin), g.move(B, {x:53}, 1300, lin), g.move(be, {x:40}, 1300)]); g.pop('ゴチン！！', 50, 44, 'crash'); g.shake();
      A.pose('cry'); B.pose('cry'); await Promise.all([g.move(A, {r:-90, x:40}, 400), g.move(B, {r:90, x:60}, 400)]); g.stars(50, 22); await g.move(be, {x:120, b:70}, 1500); },
    // 19. きょだいか → あたま ゴン → ちっちゃく
    async giant(g){ const [a] = g.cast(1); const A = g.sheet(a, 50, 8, 24).pose('victory'); g.say(A, 'おおきく なーれ！');
      await g.wait(700); g.SND('ufo'); await g.move(A, {sx:4, sy:4}, 1300); g.pop('ゴン！！', 50, 8, 'crash'); g.shake(); A.pose('cry');
      await g.wait(400); g.SND('pop'); await g.move(A, {sx:.18, sy:.18}, 700); g.say(A, 'ちっちゃ！', 1600); await g.move(A, {x:46}, 300); await g.move(A, {x:54}, 300); await g.wait(1200); },
    // 20. のび太が ころんで ジャイアンと ボールに なって ガッシャーン
    async tumble(g){ const N = g.cut('nobita', 18, 6, 36).pose('走る'), G = g.cut('gian', 70, 6, 38).pose('通常立ち');
      await g.move(N, {x:52}, 1100, lin); N.pose('転びそう'); g.pop('わわわっ！', 50, 30, 'boing'); G.pose('びっくり');
      await Promise.all([g.move(N, {x:66, r:200, b:12}, 500), g.move(G, {r:-30}, 500)]); g.say(G, 'ぎゃーっ！');
      await Promise.all([g.move(N, {x:130, r:900}, 1300, lin), g.move(G, {x:135, r:-900}, 1300, lin)]); g.pop('ガッシャーン！', 50, 40, 'crash'); g.shake(); g.flash(); await g.wait(1000); },
    // 21. うさぎが ヤハーッ と とんで みんなを ぺちゃんこ
    async yaha(g){ const ids = ['chiikawa', 'hachiware', 'usagi'].filter(k => global.SHEET_CHARS[k]); if(ids.length < 3) return GAGS.giant(g);
      const C = g.sheet('chiikawa', 25, 8, 18).pose('wave'), H = g.sheet('hachiware', 50, 8, 18).pose('wave'), U = g.sheet('usagi', 75, 8, 20).pose('wave');
      await g.wait(500); U.pose('jump'); g.pop('ヤハーッ！！', 72, 30, 'boing'); await g.move(U, {b:130}, 700, u => 1 - (1 - u) * (1 - u)); await g.wait(500);
      g.set(U, {x:38}); C.pose('scared'); H.pose('scared'); await g.move(U, {b:10}, 500, u => u * u); g.pop('ズドーン！', 38, 40, 'crash'); g.shake();
      g.set(C, {sy:.25, sx:1.4}); g.set(H, {sy:.25, sx:1.4}); U.pose('laugh'); await g.wait(1800); },
  };
  let last = '';
  function playGag(host, done, name){
    const g = Stage(host), keys = Object.keys(GAGS).filter(k => k !== last);
    const k = name && GAGS[name] ? name : keys[Math.floor(Math.random() * keys.length)]; last = k;
    (async () => { try{ await GAGS[k](g); }catch(e){ if(e !== 'stop') console.error(e); } if(g.alive()){ g.stop(); done && done(); } })();
    return {name:k, stop:() => g.stop()};
  }
  global.playGag = playGag; global.GAG_NAMES = Object.keys(GAGS);
})(window);

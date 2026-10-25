/* ================================================================
   ごほうびアニメ（デモ）：やきゅう → ジャイアンに ボール → サッカーに へんこう → のび太 すってん → ボーボボの 鼻毛で ほけんしつへ
   - index.html の CutoutActor（のび太・ジャイアン）、SheetActor（シートキャラ）、BoboboAnimator、drawNoseHair、sfx を つかう
   - baseballDemo(host, done) で 再生。うごきは ゆっくり（見えないと 楽しくない）
   ================================================================ */
(function(global){
  const css = `
  .bd{position:absolute;inset:0;overflow:hidden;font-family:var(--font);background:linear-gradient(#8fd3ff 0,#d9f1ff 26%,#7cc964 26%,#56ad48 100%)}
  .bd-field{position:absolute;inset:0;transition:opacity .8s}
  .bd-field svg{position:absolute;left:0;bottom:0;width:100%;height:74%}
  .bd-bat{position:absolute;left:52%;top:44%;width:70%;height:9%;transform-origin:6% 50%;rotate:-75deg;transition:rotate .35s cubic-bezier(.3,1.6,.5,1);z-index:2}
  .bd-c{position:absolute;transform-origin:50% 100%}
  .bd-c>.in{position:absolute;inset:0}
  .bd-say{position:absolute;z-index:20;background:#fff;border:4px solid #3b2a1e;border-radius:22px;padding:7px 13px;font:900 clamp(.95rem,4.2vw,1.25rem)/1.35 var(--font);color:#3b2a1e;
    box-shadow:0 5px 0 #3b2a1e;width:max-content;max-width:min(64%,340px);text-align:center;transform:translateX(-50%);animation:bdSay .35s cubic-bezier(.2,1.7,.4,1) both;white-space:pre-line}
  .bd-say.angry{background:#ffe1d6;border-color:#c4304a;box-shadow:0 5px 0 #c4304a;font-size:clamp(1.1rem,5vw,1.5rem)}
  @keyframes bdSay{from{transform:translateX(-50%) scale(0)}}
  .bd-sfx{position:absolute;z-index:21;font:900 clamp(2.2rem,12vw,4.2rem)/1 var(--font);color:#ffd23f;-webkit-text-stroke:3px #3b2a1e;paint-order:stroke fill;text-shadow:0 6px 0 #3b2a1e;
    transform:translate(-50%,-50%);animation:bdSfx 1.4s cubic-bezier(.2,1.6,.4,1) both;white-space:nowrap;pointer-events:none}
  @keyframes bdSfx{0%{transform:translate(-50%,-50%) scale(0) rotate(-14deg)}25%{transform:translate(-50%,-50%) scale(1.1) rotate(-6deg)}40%{transform:translate(-50%,-50%) scale(1) rotate(-6deg)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.1) rotate(-6deg)}}
  .bd-ball{position:absolute;z-index:15;width:7vmin;height:7vmin;min-width:26px;min-height:26px;transform:translate(-50%,50%)}
  .bd-ball svg{width:100%;height:100%;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35))}
  .bd-stars{position:absolute;z-index:16;width:22vmin;height:9vmin;transform:translate(-50%,50%);animation:bdSpin 1s linear infinite}
  .bd-stars i{position:absolute;font-style:normal;font-size:5vmin}
  @keyframes bdSpin{to{rotate:360deg}}
  .bd-hair{position:absolute;inset:0;width:100%;height:100%;z-index:14;pointer-events:none}
  .bd-wrap::after{content:'';position:absolute;inset:18% 10% 10%;border-radius:40%;background:repeating-linear-gradient(-18deg,transparent 0 14px,#3a2412 14px 17px,transparent 17px 30px);animation:bdWrap .6s linear infinite}
  @keyframes bdWrap{to{background-position:0 30px}}
  .bd-flash{position:absolute;inset:0;z-index:30;background:#fff;animation:bdFlash .9s ease-out forwards;pointer-events:none}
  @keyframes bdFlash{from{opacity:1}to{opacity:0}}
  .bd-house{position:absolute;z-index:3;bottom:5%;width:42%;height:27%;transition:left 1.6s cubic-bezier(.2,1,.4,1)}
  .bd-house svg{width:100%;height:100%;overflow:visible}
  .bd-cap{position:absolute;left:50%;top:6%;z-index:25;transform:translateX(-50%);background:#3b2a1e;color:#fff;border-radius:99px;padding:6px 16px;font:900 clamp(.9rem,4vw,1.15rem)/1.3 var(--font);white-space:nowrap;animation:bdSay .4s both}
  `;
  const BASE = `<svg viewBox="0 0 100 66" preserveAspectRatio="none"><path d="M10 64 L50 30 L90 64 Z" fill="#c98f55" opacity=".9"/><path d="M26 64 L50 44 L74 64 Z" fill="#7cc964"/>
    <circle cx="50" cy="40" r="3.4" fill="#d9a46b"/><rect x="48.5" y="28.5" width="3" height="3" fill="#fff" transform="rotate(45 50 30)"/><rect x="88.5" y="61" width="3" height="3" fill="#fff" transform="rotate(45 90 62.5)"/>
    <rect x="8.5" y="61" width="3" height="3" fill="#fff" transform="rotate(45 10 62.5)"/></svg>`;
  const SOCCER = `<svg viewBox="0 0 100 66" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width=".7" opacity=".9"><path d="M2 20 H98 V65 H2 Z"/><path d="M50 20 V65"/><ellipse cx="50" cy="44" rx="11" ry="7"/><path d="M98 32 H84 V58 H98"/></g>
    <g stroke="#eee" stroke-width=".6" fill="none"><path d="M97 26 L91 28 V60 L97 62"/><path d="M91 28 H99 M91 36 H99 M91 44 H99 M91 52 H99 M93 28 V60 M95 27 V61"/></g><path d="M91 28 V60" stroke="#fff" stroke-width="1.6"/></svg>`;
  const BALL_B = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#555" stroke-width="1.5"/><path d="M9 7 Q15 20 9 33 M31 7 Q25 20 31 33" fill="none" stroke="#d33" stroke-width="2" stroke-dasharray="2 2"/></svg>`;
  const BALL_S = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#333" stroke-width="1.5"/><polygon points="20,12 27,17 24,25 16,25 13,17" fill="#222"/><path d="M20 12 V4 M27 17 L35 14 M24 25 L29 33 M16 25 L11 33 M13 17 L5 14" stroke="#222" stroke-width="1.5"/></svg>`;
  const HOUSE = `<svg viewBox="0 0 100 80"><path d="M6 30 L50 4 L94 30 Z" fill="#ff8a8a" stroke="#3b2a1e" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="12" y="30" width="76" height="48" fill="#fffaf0" stroke="#3b2a1e" stroke-width="2.5"/><rect x="40" y="10" width="20" height="14" rx="2" fill="#fff" stroke="#3b2a1e" stroke-width="1.5"/>
    <path d="M47 13 h6 v3 h3 v6 h-3 v3 h-6 v-3 h-3 v-6 h3z" fill="#e53935" transform="translate(0 -1.5) scale(1 .85) translate(0 2)"/>
    <rect x="18" y="36" width="20" height="15" fill="#bfe6ff" stroke="#3b2a1e" stroke-width="2"/><rect x="62" y="36" width="20" height="15" fill="#bfe6ff" stroke="#3b2a1e" stroke-width="2"/>
    <rect class="door" x="40" y="46" width="20" height="32" fill="#a9744a" stroke="#3b2a1e" stroke-width="2"/><rect x="30" y="56" width="40" height="0" fill="none"/>
    <rect x="26" y="25" width="48" height="0" fill="none"/><g><rect x="28" y="54" width="44" height="0"/></g></svg>`;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

  function baseballDemo(host, done){
    if(!document.getElementById('bdCss')){ const s = document.createElement('style'); s.id = 'bdCss'; s.textContent = css; document.head.append(s); }
    const S = document.createElement('div'); S.className = 'bd'; host.append(S);
    const field = document.createElement('div'); field.className = 'bd-field'; field.innerHTML = BASE; S.append(field);
    const cv = document.createElement('canvas'); cv.className = 'bd-hair'; S.append(cv);
    let alive = true; const run = { stop(){ alive = false; actors.forEach(a => { try{ a.destroy(); }catch(e){} }); S.remove(); } };
    const actors = [], W = () => S.clientWidth, H = () => S.clientHeight;
    const TS = .76;   // ぜんたいを 約40びょうに
    const wait = async ms => { await sleep(ms * TS); if(!alive || !S.isConnected) throw 'stop'; };
    const SND = typeof sfx === 'function' ? sfx : () => {};
    // 声：キャラごとに 高さを かえて よむ（よみあげ オフなら だまって すすむ）
    const VOICE = {nobita:[1.35, 1.05], gian:[.55, .9], ref:[1.6, 1.05], bobo:[.45, .85], chii:[1.9, 1.1], chase:[1.2, 1.05]};
    const talk = (who, text) => { try{ if(global.save && save.voice === false) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/\n/g, ' ')); u.lang = 'ja-JP'; const [p, r] = VOICE[who] || [1, 1]; u.pitch = p; u.rate = r; speechSynthesis.speak(u); }catch(e){} };

    // キャラを おく：x・b・h は 画面の %（x は まんなか、b は 下から、h は たかさ）
    function put(el, x, b, h, ar){ el.style.left = x + '%'; el.style.bottom = b + '%'; el.style.height = h + '%'; el.style.aspectRatio = ar; el.style.translate = '-50% 0'; el.x = x; el.b = b; el.r = 0; }
    function sheet(id, x, b, h, z = 5){
      const C = (global.SHEET_CHARS || {})[id]; const el = document.createElement('div'); el.className = 'bd-c'; el.style.zIndex = z; S.append(el);
      put(el, x, b, h, C && C.aspect ? C.aspect : '3/4'); const inn = document.createElement('div'); inn.className = 'in'; el.append(inn);
      el.a = C && global.SheetActor ? SheetActor.create(inn, C) : null; if(el.a) actors.push(el.a); el.pose = p => { el.a && el.a.pose(p); return el; }; return el;
    }
    function cut(id, x, b, h, z = 6){
      const el = document.createElement('div'); el.className = 'bd-c'; el.style.zIndex = z; S.append(el);
      const cfg = global.CUTOUT_CONFIGS[id]; put(el, x, b, h, cfg.canvas.w + '/' + cfg.canvas.h); const inn = document.createElement('div'); inn.className = 'in'; el.append(inn);
      el.a = CutoutActor.create(cfg, inn).speed(.7); actors.push(el.a); el.pose = m => { el.a.play(m); return el; }; return el;
    }
    // うごかす（ゆっくり）：x・b・r（回転）を ms かけて
    function move(el, to, ms, fn = ease){
      ms *= TS; const f = {x:el.x, b:el.b, r:el.r || 0}, t0 = performance.now();
      return new Promise(res => { (function step(now){ if(!alive) return res(); const u = Math.min(1, (now - t0) / ms), e = fn(u);
        for(const k of ['x', 'b', 'r']) if(to[k] != null) el[k] = f[k] + (to[k] - f[k]) * e;
        if(to.arc) el.style.marginBottom = (Math.sin(u * Math.PI) * to.arc) + '%';
        el.style.left = el.x + '%'; el.style.bottom = el.b + '%'; el.style.rotate = el.r + 'deg';
        u < 1 ? requestAnimationFrame(step) : res(); })(t0); });
    }
    function say(el, text, ms = 2600, cls = ''){
      const b = document.createElement('div'); b.className = 'bd-say ' + cls; b.textContent = text;
      const top = 100 - el.b - parseFloat(el.style.height) - 2; b.style.left = Math.max(32, Math.min(68, el.x)) + '%'; b.style.bottom = (100 - Math.max(4, top)) + '%';
      S.append(b); setTimeout(() => b.remove(), ms); return b;
    }
    const pop = (text, x, y) => { const e = document.createElement('div'); e.className = 'bd-sfx'; e.textContent = text; e.style.left = x + '%'; e.style.top = y + '%'; S.append(e); setTimeout(() => e.remove(), 1500); };
    const cap = text => { S.querySelector('.bd-cap')?.remove(); const e = document.createElement('div'); e.className = 'bd-cap'; e.textContent = text; S.append(e); return e; };
    // ボール：x・b（%）を ベジェで とばす
    const ball = document.createElement('div'); ball.className = 'bd-ball'; ball.innerHTML = BALL_B; ball.style.display = 'none'; S.append(ball);
    function fly(from, to, peak, ms, spin = 900){
      ms *= TS; ball.style.display = ''; const t0 = performance.now();
      return new Promise(res => { (function step(now){ if(!alive) return res(); const u = Math.min(1, (now - t0) / ms);
        const x = from[0] + (to[0] - from[0]) * u, b = from[1] + (to[1] - from[1]) * u + Math.sin(u * Math.PI) * peak;
        ball.style.left = x + '%'; ball.style.bottom = b + '%'; ball.style.rotate = (u * spin) + 'deg';
        u < 1 ? requestAnimationFrame(step) : res(); })(t0); });
    }

    // ---------- 1. やきゅう ----------
    const chii = sheet('chiikawa', 12, 5, 11, 7), nob = cut('nobita', 32, 5, 27, 8), chase = sheet('chase', 60, 30, 14, 4);
    const usa = sheet('usagi', 50, 46, 10, 3), hachi = sheet('hachiware', 82, 44, 10, 3), mar = sheet('marshall', 20, 42, 11, 3);
    const gian = cut('gian', 84, 3, 25, 9);
    const bat = document.createElement('div'); bat.className = 'bd-bat';
    bat.innerHTML = '<svg viewBox="0 0 100 12" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M2 5 L40 4 Q70 1 97 2 Q100 6 97 10 Q70 11 40 8 L2 7 Z" fill="#d9a05b" stroke="#3b2a1e" stroke-width="1.6"/><rect x="1" y="4" width="10" height="4" fill="#3b2a1e"/></svg>';
    nob.append(bat);
    const all = [chii, nob, chase, usa, hachi, mar, gian];
    nob.pose('決めポーズ'); gian.pose('通常立ち'); chase.pose('wave'); chii.pose('wave');

    (async () => {
      try{
        cap('⚾ みんなで やきゅう！');
        await wait(600); say(nob, 'よーし、うつぞ〜！'); talk('nobita', 'よーし、うつぞー！');
        await wait(2400); say(chase, 'いくよ！ それっ！'); talk('chase', 'いくよ！ それっ！'); chase.pose('jump');
        await wait(1100); chase.pose('point'); SND('whoosh2');
        await fly([58, 38], [36, 16], 6, 1300);   // ゆっくり ピッチング
        nob.pose('驚き'); bat.style.rotate = '40deg'; SND('hit'); pop('カキーン！', 40, 46);
        // ボールは たかく あがって … ジャイアンの あたまへ
        await fly([36, 16], [84, 27], 40, 2200, 1600);
        SND('crash'); pop('ゴツン！', 76, 40); gian.pose('びっくり');
        const st = document.createElement('div'); st.className = 'bd-stars'; st.innerHTML = '<i style="left:0;top:0">⭐</i><i style="left:40%;top:50%">⭐</i><i style="right:0;top:0">⭐</i>';
        st.style.left = '84%'; st.style.bottom = '27%'; S.append(st);
        await fly([84, 27], [72, 3], 10, 900, 400); bat.style.rotate = '-75deg';
        await wait(1200); gian.pose('怒鳴る'); say(gian, 'もーーっ！！\nいたいじゃないか！', 2800, 'angry'); talk('gian', 'もーーっ！ いたいじゃないか！'); SND('boom');
        await wait(3000); st.remove(); gian.pose('迫る'); say(gian, 'やきゅうは やめだ！\nサッカーに するぞ！', 3000, 'angry'); talk('gian', 'やきゅうは やめだ！ サッカーに するぞ！');
        await wait(3200); nob.pose('おどおど'); say(nob, 'ええ〜っ…\nぼく サッカー にがて なのに…', 3000); talk('nobita', 'ええーっ。ぼく サッカー にがて なのに');
        chii.pose('cry');
        await wait(3400);

        // ---------- 2. サッカーに へんこう ----------
        const fl = document.createElement('div'); fl.className = 'bd-flash'; S.append(fl); setTimeout(() => fl.remove(), 900); SND('whoosh2');
        field.innerHTML = SOCCER; ball.innerHTML = BALL_S; ball.style.display = 'none'; bat.remove();
        cap('⚽ サッカーの はじまり！');
        mar.style.display = 'none';
        await Promise.all([move(nob, {x:18, b:5}, 900), move(gian, {x:86, b:6}, 900), move(chii, {x:12, b:42}, 900), move(chase, {x:78, b:30}, 900),
          move(usa, {x:64, b:45}, 900), move(hachi, {x:36, b:45}, 900)]);
        chii.pose('jump'); gian.pose('どやポーズ');
        const ref = sheet('happy', 50, 110, 20, 6); ref.pose('fly'); all.push(ref);
        await move(ref, {b:26}, 1500); ref.pose('point'); SND('ding'); SND('crit');
        say(ref, 'ピピーッ！\nしあい かいし！', 2600); talk('ref', 'ピピーッ！ しあい かいし！');
        ball.style.display = ''; ball.style.left = '52%'; ball.style.bottom = '6%'; ball.style.rotate = '0deg';
        await wait(2800);
        nob.pose('走る'); say(nob, 'よ、よーし… けるぞ！', 1800); talk('nobita', 'よ、よーし。けるぞ！');
        await move(nob, {x:49}, 2200, u => u);   // ボールに むかって はしる
        // ---------- 3. ボールの うえで つるっ！ ----------
        nob.pose('転びそう'); SND('boing'); pop('つるっ！', 52, 50);
        fly([52, 6], [68, 5], 3, 1800, 720);   // ボールは ころころ
        await move(nob, {r:-30, b:12}, 500);
        await move(nob, {r:-95, b:4, x:62}, 700, u => u * u);
        SND('crash'); pop('すってーん！', 50, 56); nob.pose('泣く');
        const st2 = document.createElement('div'); st2.className = 'bd-stars'; st2.innerHTML = '<i style="left:0;top:0">⭐</i><i style="right:0;top:0">⭐</i>';
        st2.style.left = '50%'; st2.style.bottom = '14%'; S.append(st2);
        await wait(700); say(nob, 'いたた〜…', 2000); talk('nobita', 'いたたー');
        ref.pose('scared'); chii.pose('scared'); usa.pose('scared'); hachi.pose('scared'); gian.pose('びっくり');
        await wait(2400);

        // ---------- 4. ボーボボ とうじょう → 鼻毛で ほけんしつへ ----------
        const bbEl = document.createElement('div'); bbEl.className = 'bd-c'; bbEl.style.zIndex = 10; S.append(bbEl); put(bbEl, -20, 2, 36, '1/1.15');
        const bb = BoboboAnimator.create({target:bbEl, autoplay:false, transparent:true, noLabel:true, style:'impact', speed:.7}); actors.push(bb);
        bb.play('walk'); SND('fanfare');
        await move(bbEl, {x:14}, 1800);
        bb.play('roar'); say(bbEl, 'ここは おれに まかせろ！', 2400); talk('bobo', 'ここは おれに まかせろ！');
        await wait(2400); bb.play('nosewhip'); say(bbEl, 'はなげ しんけん！！', 2200, 'angry'); talk('bobo', 'はなげ しんけん！'); SND('slash');
        // 鼻毛（キャンバス）：はなから のび太へ
        const x = cv.getContext('2d'); let hair = {t0:performance.now()};
        (function loop(now){
          if(!alive || !hair) { x.clearRect(0, 0, cv.width, cv.height); return; } requestAnimationFrame(loop);
          const dpr = Math.min(2, devicePixelRatio || 1); if(cv.width !== Math.round(W() * dpr)){ cv.width = Math.round(W() * dpr); cv.height = Math.round(H() * dpr); }
          x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W(), H());
          const np = bb.nosePoint && bb.nosePoint(); if(!np) return;
          // translate（中央よせ）や 回転も ふくめた 本当の 位置で 計算する
          const R = S.getBoundingClientRect(), cvs = bbEl.querySelector('canvas'), bR = (cvs || bbEl).getBoundingClientRect(), nR = nob.getBoundingClientRect();
          const sx = bR.left - R.left + np.x, sy = bR.top - R.top + np.y;
          const tx = nR.left - R.left + nR.width / 2, ty = nR.top - R.top + nR.height * .5, k = Math.min(1, (now - hair.t0) / 600);
          for(let i = 0; i < 6; i++) global.drawNoseHair && drawNoseHair(x, sx, sy, sx + (tx - sx) * k + (i - 3) * 6, sy + (ty - sy) * k + Math.sin(i * 1.7) * 10, {n:3, t:now + i * 120, w:7, sway:18, seed:i + 1, spread:5});
        })(performance.now());
        await wait(800); st2.remove(); nob.classList.add('bd-wrap'); SND('hit'); pop('シュルルル！', 56, 36); nob.pose('驚き');
        await move(nob, {r:0, b:12}, 900);
        // ほけんしつが やってくる
        const house = document.createElement('div'); house.className = 'bd-house'; house.innerHTML = HOUSE + '<div style="position:absolute;left:50%;top:44%;transform:translateX(-50%);background:#fff;border:3px solid #3b2a1e;border-radius:10px;padding:2px 10px;font:900 clamp(.8rem,3.6vw,1.05rem)/1.2 var(--font);color:#e53935;white-space:nowrap">ほけんしつ</div>';
        house.style.left = '110%'; S.append(house);
        await move(gian, {x:40, b:16}, 900); gian.pose('びっくり');
        await sleep(50); house.style.left = '56%'; SND('whoosh2');
        await wait(1700); cap('🏥 ほけんしつへ はこぶぞ！');
        bb.play('dash'); say(bbEl, 'ほけんしつまで\nひとっとび だ！', 2200); talk('bobo', 'ほけんしつまで ひとっとび だ！');
        await move(nob, {x:77, b:12, arc:26, r:360}, 2600);
        nob.style.transition = 'opacity .5s, scale .5s'; nob.style.opacity = 0; nob.style.scale = '.4'; SND('pop'); pop('ぽすっ！', 78, 50);
        await wait(600); hair = null; nob.classList.remove('bd-wrap');
        await wait(600); SND('land'); pop('バタン！', 78, 56);
        bb.play('victory'); say(bbEl, 'しんぱい いらない。\nかならず げんきに なる！', 2800); talk('bobo', 'しんぱい いらない。かならず げんきに なる！');
        await wait(3000);
        // ---------- 5. おしまい：のび太 げんきに なって でてくる ----------
        nob.style.opacity = 1; nob.style.scale = '1'; nob.r = 0; nob.style.rotate = '0deg'; put(nob, 77, 5, 24, nob.style.aspectRatio); nob.pose('くすくす笑い'); move(nob, {arc:8}, 700);
        say(nob, 'なおったー！\nみんな ありがとう！', 2800); talk('nobita', 'なおったー！ みんな ありがとう！'); SND('win');
        ref.pose('victory'); chii.pose('victory'); usa.pose('dance'); hachi.pose('clap'); chase.pose('victory'); gian.pose('大笑い');
        cap('🎉 おしまい');
        await wait(3600);
        run.stop(); done && done();
      }catch(e){ if(e !== 'stop') console.error(e); }
    })();
    return run;
  }
  global.baseballDemo = baseballDemo;
})(window);

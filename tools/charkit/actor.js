// シートから 作った キャラ（回転12方向＋ポーズ）を 動かす 共通アクター。docs/character-pipeline.md の 5.
// SheetActor.create(wrap, SHEET_CHARS.heart) → .pose('wave') .turn(ms, 回数, done) .move(x, y) .destroy()
(function(global){
  const ease = x => x * x * (3 - 2 * x);
  function create(wrap, C){
    const F = C.frames, TURN = C.turn;
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:50%;bottom:0;height:100%;aspect-ratio:3/4;transform-origin:50% 100%;will-change:transform';
    const mk = () => { const i = new Image(); i.alt = ''; i.draggable = false; i.style.cssText = 'position:absolute;left:0;bottom:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;pointer-events:none'; box.append(i); return i; };
    const A = mk(), B = mk(); B.style.opacity = 0; wrap.append(box);
    let seq = 0, front = A, cur = '', spin = null, pop = 0, t0 = performance.now(), alive = true, x = 0, y = 0;
    // 絵は アニメと同じく スパッと 切りかえ、ぽよんと 弾ませて つなぐ（半透明で 重ねると すけて 見える）
    function show(key){
      if(key === cur || !F[key]) return; cur = key;
      const back = front === A ? B : A, tok = ++seq;
      back.src = F[key];
      const go = () => { if(tok !== seq) return; back.style.opacity = 1; front.style.opacity = 0; front = back; };
      back.decode ? back.decode().then(go, go) : go();
    }
    function frame(now){
      if(!alive || !box.isConnected) return;
      requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      if(spin){   // くるっと 回る：角度に 合わせて 回転の 絵を じゅんばんに
        const u = Math.min(1, (now - spin.t0) / spin.ms), a = ease(u) * spin.turns * TURN.length;
        show(TURN[Math.floor(a + .5) % TURN.length]);
        if(u >= 1){ const s = spin; spin = null; s.done && s.done(); }
      }
      const p = Math.max(0, 1 - (now - pop) / 420), boing = Math.sin(p * Math.PI * 2.5) * p;
      const bob = Math.sin(t * 3.1) * 4, br = Math.sin(t * 2.2) * .015;
      box.style.transform = `translate(calc(-50% + ${x}px), ${y - bob}px) scale(${1 + boing * .08 - br * .5}, ${1 - boing * .08 + br})`;
    }
    requestAnimationFrame(frame);
    show(TURN[0]);
    return {
      pose(name){ spin = null; show(F['p_' + name] ? 'p_' + name : name); pop = performance.now(); return this; },
      turn(ms = 1200, turns = 1, done){ spin = {t0:performance.now(), ms, turns, done}; return this; },
      move(nx, ny){ x = nx; y = ny; return this; },
      el: box,
      destroy(){ alive = false; box.remove(); }
    };
  }
  global.SheetActor = { create };
})(window);

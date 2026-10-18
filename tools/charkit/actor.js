// ドラえもん アクター：全角度（12方向）とポーズ（20種）の絵を、なめらかに 切りかえて 動かす
(function(global){
  const F = global.DORA_FRAMES || {};
  // 正面から 右まわりに 1周（30度きざみ）
  const TURN = ['t000', 't030', 't060', 't090', 't150b', 't150b', 't180', 't210b', 't240b', 't270', 't300', 't330'];
  const POSES = ['wave', 'laugh', 'jump', 'cry', 'angry', 'run', 'dance', 'gadget', 'dorayaki', 'think', 'victory', 'trip', 'fly', 'sit', 'sleep', 'point', 'clap', 'bow', 'shy', 'scared'];
  const ease = x => x * x * (3 - 2 * x);
  function create(wrap){
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:50%;bottom:0;height:100%;aspect-ratio:3/4;transform-origin:50% 100%;will-change:transform';
    const mk = () => { const i = new Image(); i.alt = ''; i.draggable = false; i.style.cssText = 'position:absolute;left:0;bottom:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;transition:opacity .14s linear;pointer-events:none'; box.append(i); return i; };
    const A = mk(), B = mk(); B.style.opacity = 0; wrap.append(box);
    let seq = 0, front = A, cur = '', spin = null, pop = 0, t0 = performance.now(), alive = true, x = 0, y = 0, sx = 1;
    // 絵の 切りかえ：2枚を 重ねて クロスフェード（パッと 変わらない）
    function show(key, fade = false){   // アニメと同じく 絵は スパッと 切りかえ、ぽよんと 弾ませて つなぐ
      if(key === cur || !F[key]) return; cur = key;
      const back = front === A ? B : A, tok = ++seq;
      back.style.transition = 'none'; back.style.opacity = 0; void back.offsetWidth; back.style.transition = fade ? 'opacity .14s linear' : 'none';
      back.src = F[key];
      // 新しい絵を 上に 重ねて 0→1、出きってから 下の 古い絵を 消す（すけて 見えない）
      const go = () => { if(tok !== seq) return; const old = front; back.style.zIndex = 2; old.style.zIndex = 1; back.style.opacity = 1; front = back;
        setTimeout(() => { if(tok === seq){ old.style.transition = 'none'; old.style.opacity = 0; } }, fade ? 150 : 0); };   // 古い 切りかえは すてる
      back.decode ? back.decode().then(go, go) : go();
    }
    function frame(now){
      if(!alive || !box.isConnected) return;
      requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      if(spin){   // くるっと 回る：角度に 合わせて 12方向の 絵を じゅんばんに
        const u = Math.min(1, (now - spin.t0) / spin.ms), a = ease(u) * spin.turns * 12;
        show(TURN[Math.floor(a + .5) % 12], false);
        if(u >= 1){ const s = spin; spin = null; s.done && s.done(); }
      }
      // 待機：ふわふわ 上下＋息、ポーズ切りかえ時は ぽよんと 弾む
      const p = Math.max(0, 1 - (now - pop) / 420), boing = Math.sin(p * Math.PI * 2.5) * p;
      const bob = Math.sin(t * 3.1) * 4, br = Math.sin(t * 2.2) * .015;
      box.style.transform = `translate(calc(-50% + ${x}px), ${y - bob}px) scale(${sx * (1 + boing * .08 - br * .5)}, ${1 - boing * .08 + br})`;
    }
    requestAnimationFrame(frame);
    show('t000', false);
    return {
      pose(name){ spin = null; show(POSES.includes(name) ? 'p_' + name : name); pop = performance.now(); return this; },
      turn(ms = 1200, turns = 1, done){ spin = {t0:performance.now(), ms, turns, done}; return this; },
      view(name){ show('v_' + name); pop = performance.now(); return this; },
      move(nx, ny){ x = nx; y = ny; return this; },
      flip(v){ sx = v ? -1 : 1; return this; },
      el: box, poses: POSES,
      destroy(){ alive = false; box.remove(); }
    };
  }
  global.DoraActor = { create, POSES };
})(window);

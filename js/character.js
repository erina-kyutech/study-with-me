/* ============================================================
   character.js
   ドット絵風の女の子キャラクターを <canvas> にプロシージャル描画し、
   状態（IDLE / STUDY）に応じて自然なアニメーションを行う。

   実際のピクセル画像(PNG/スプライトシート)を使わず、小さな
   グリッド(34x36)に対して図形描画APIで毎フレーム再描画する方式。
   image-rendering: pixelated と組み合わせることでドット絵に見える。

   STEP3 以降で PAGE_TURN / DRINK / THINK / STRETCH / WATCH_CLOCK /
   YAWN などの行動を追加する際は、ACTIONS registry と drawExtra() の
   拡張ポイントを使う想定。今回(STEP1-2)は IDLE / STUDY のみ実装。
   ============================================================ */

const Character = (() => {
  const GRID_W = 34;
  const GRID_H = 36;

  const PALETTE = {
    hairDark:  '#5a4030',
    hairMid:   '#6b4a3a',
    hairLight: '#8a6248',
    skin:      '#f4c9a8',
    skinShade: '#e0ab84',
    blush:     'rgba(232,140,140,0.55)',
    eye:       '#2b1c14',
    eyeShine:  '#fdf6ee',
    sweater:   '#f0e6d2',
    sweaterSh: '#dccdae',
    ink:       '#4a3528',
    penBody:   '#7d8ba0',
  };

  let canvas, ctx;
  let mode = 'idle';       // 'idle' | 'study' | 'paused'
  let rafId = null;
  let startTime = performance.now();

  // --- blink scheduling (real-time based, randomized) ---
  let blinking = false;
  let blinkUntil = 0;
  let nextBlinkAt = 0;

  function scheduleNextBlink(now) {
    const gap = 2600 + Math.random() * 4200; // 2.6s〜6.8s
    nextBlinkAt = now + gap;
  }

  // --- gentle idle pen-tap timer (home screen only) ---
  let nextTapAt = 0;
  let tapping = false;
  let tapUntil = 0;

  function scheduleNextTap(now) {
    nextTapAt = now + 4000 + Math.random() * 5000;
  }

  /* ---------- low-level pixel helpers ---------- */

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // rasterized filled ellipse, row by row -> chunky pixel-art circles
  function ellipse(cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    const yStart = Math.ceil(cy - ry);
    const yEnd = Math.floor(cy + ry);
    for (let y = yStart; y <= yEnd; y++) {
      const dy = (y - cy) / ry;
      const t = 1 - dy * dy;
      if (t < 0) continue;
      const halfW = rx * Math.sqrt(t);
      const xStart = Math.round(cx - halfW);
      const xEnd = Math.round(cx + halfW);
      ctx.fillRect(xStart, y, xEnd - xStart + 1, 1);
    }
  }

  /* ---------- drawing ---------- */

  function draw(state) {
    ctx.clearRect(0, 0, GRID_W, GRID_H);

    const headTilt = state.headTilt || 0;    // -1..1 sway
    const armBob = state.armBob || 0;        // 0..1 writing bob
    const eyesClosed = state.eyesClosed;

    ctx.save();
    // 頭の左右わずかな揺れ (idle sway)。原点は首の付け根あたり。
    ctx.translate(17, 19);
    ctx.rotate(headTilt * 0.035);
    ctx.translate(-17, -19);

    // --- 後ろ髪 ---
    ellipse(17, 14.5, 10.5, 12.5, PALETTE.hairDark);
    px(6.5, 15, 21, 9, PALETTE.hairDark);

    // --- 顔（肌） ---
    ellipse(17, 13, 7.8, 8.3, PALETTE.skin);

    // --- 前髪（上部） ---
    ellipse(17, 6.8, 8.3, 3.9, PALETTE.hairMid);
    // サイドの髪（顔の両脇を額から肩まで） ---
    px(8.2, 8, 3.4, 12, PALETTE.hairMid);
    px(22.4, 8, 3.4, 12, PALETTE.hairMid);
    px(8.2, 8, 1.2, 12, PALETTE.hairLight);

    // --- お団子ヘア ---
    ellipse(17, 3.4, 4.3, 3.3, PALETTE.hairMid);
    ellipse(15.3, 2.2, 1.5, 1.1, PALETTE.hairLight);

    // --- 目 ---
    if (eyesClosed) {
      px(13, 14, 2.4, 1, PALETTE.eye);
      px(18.6, 14, 2.4, 1, PALETTE.eye);
    } else {
      px(13, 12.4, 2.2, 3, PALETTE.eye);
      px(18.6, 12.4, 2.2, 3, PALETTE.eye);
      px(13.1, 12.6, 0.8, 0.8, PALETTE.eyeShine);
      px(18.7, 12.6, 0.8, 0.8, PALETTE.eyeShine);
    }

    // --- ほお ---
    ellipse(11.6, 15.6, 1.5, 1, PALETTE.blush);
    ellipse(22.4, 15.6, 1.5, 1, PALETTE.blush);

    // --- 口 ---
    if (state.mouthOpen) {
      ellipse(17, 17.3, 1.1, 1.1, PALETTE.eye);
    } else {
      px(16, 17, 2, 0.8, PALETTE.ink);
    }

    // --- 首 ---
    px(14.2, 18.2, 5.6, 3, PALETTE.skinShade);

    ctx.restore(); // 頭の傾き終わり（体は傾けない）

    // --- 体（セーター） ---
    // 注意: 楕円の上端が首より上（あご・口）にかかると顔が隠れてしまうため、
    // 中心(cy)と半径(ry)は「首の付け根(y≈21)より下」から始まるように調整すること。
    ellipse(17, 24, 13, 5, PALETTE.sweater);
    px(3.6, 24, 26.8, 11, PALETTE.sweater);
    px(3.6, 32, 26.8, 3, PALETTE.sweaterSh);
    // 襟
    px(14.6, 19.6, 5, 2.2, PALETTE.cream || '#fbf6ec');
    px(15.2, 19.8, 3.6, 1.6, '#fbf6ec');

    // --- 腕・手（勉強中の書く動き） ---
    const bob = Math.sin(armBob * Math.PI * 2) * 0.9;

    // 左腕（ノートを押さえる）
    px(6, 24, 4, 3, PALETTE.sweater);
    px(7, 27, 4, 3, PALETTE.sweater);
    px(8, 30, 4.5, 2.6, PALETTE.skin);

    // 右腕（ペンを持つ・上下に動く）
    px(24, 24, 4, 3, PALETTE.sweater);
    px(23, 27, 4, 3 + bob * 0.4, PALETTE.sweater);
    px(21.5, 30 + bob, 4.5, 2.6, PALETTE.skin);

    // ペン
    ctx.save();
    ctx.translate(23.5, 31.2 + bob);
    ctx.rotate(-0.5 + bob * 0.15);
    px(0, 0, 4.5, 1.1, PALETTE.penBody);
    px(4.2, -0.1, 1, 1.3, PALETTE.ink);
    ctx.restore();

    // --- あくびの手（口を隠す）は STEP3 で追加予定 ---
  }

  /* ---------- animation loop ---------- */

  function tick(now) {
    const t = (now - startTime) / 1000; // seconds

    // blink scheduling
    if (!blinking && now >= nextBlinkAt) {
      blinking = true;
      blinkUntil = now + 130 + Math.random() * 60;
    } else if (blinking && now >= blinkUntil) {
      blinking = false;
      scheduleNextBlink(now);
    }

    // idle pen tap scheduling (home screen flavor motion)
    if (mode === 'idle') {
      if (!tapping && now >= nextTapAt) {
        tapping = true;
        tapUntil = now + 900;
      } else if (tapping && now >= tapUntil) {
        tapping = false;
        scheduleNextTap(now);
      }
    }

    const headTilt = Math.sin(t * 0.35) * 0.6 + Math.sin(t * 0.9) * 0.15;

    let armBob = 0;
    if (mode === 'study') {
      // 執筆の周期モーション。時々ふっと止まる「間」を作って機械的にならないようにする
      const pausePhase = Math.sin(t * 0.12);
      const writing = pausePhase > -0.55; // たまに小休止
      armBob = writing ? (t * 1.7) % 1 : 0.0;
    } else if (mode === 'idle' && tapping) {
      armBob = (t * 3) % 1;
    }

    draw({
      headTilt,
      armBob,
      eyesClosed: blinking,
      mouthOpen: false,
    });

    rafId = requestAnimationFrame(tick);
  }

  /* ---------- public API ---------- */

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const now = performance.now();
    scheduleNextBlink(now);
    scheduleNextTap(now);
    startTime = now;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function setMode(newMode) {
    mode = newMode;
  }

  return { init, setMode };
})();

/* ============================================================
   character.js
   画像アセット(assets/characters/<charId>/<state>/frame_N.png)を
   差し替えて再生する Sprite Animation エンジン。

   プロシージャル描画(Canvas図形描画/CSS簡易パーツ/SVG合成)は一切使用しない。
   キャラクターを差し替えるだけで別キャラに対応できるよう、
   キャラクターIDを引数化している。

   状態:
     IDLE        待機（ホーム画面）
     STUDY       勉強のベースポーズ（ペンを動かす）
     PAGE_TURN   ページをめくる
     DRINK       飲み物を飲む
     THINK       考える
     STRETCH     伸びをする
     YAWN        あくび・眠い
     LOOK_CLOCK  時計を見る
     LAPTOP      PCを見る
     REST        休憩する（一時停止中）

   勉強セッション中は STUDY を基本状態とし、ランダムな間隔で
   PAGE_TURN/DRINK/THINK/STRETCH/YAWN/LOOK_CLOCK/LAPTOP のいずれかへ
   一時的に遷移してからSTUDYへ戻る、を繰り返す（同じ行動が連続しない
   よう直前の行動は除外して抽選する）。
   ============================================================ */

const Character = (() => {
  const CHAR_ID = 'girl01';

  // 状態ごとのフレーム枚数
  const FRAME_COUNTS = {
    idle: 4,
    study: 7,
    'page-turn': 5,
    drink: 5,
    think: 6,
    stretch: 3,
    yawn: 4,
    laptop: 4,
    'look-clock': 3,
    rest: 4,
  };

  // 勉強中にランダムで挟み込む行動と、その行動の継続時間・重み(出やすさ)
  const RANDOM_ACTIONS = [
    { state: 'page-turn', minMs: 1600, maxMs: 2600, weight: 3 },
    { state: 'drink', minMs: 2200, maxMs: 3800, weight: 2 },
    { state: 'think', minMs: 2500, maxMs: 5000, weight: 3 },
    { state: 'stretch', minMs: 2000, maxMs: 3000, weight: 1.4 },
    { state: 'yawn', minMs: 2000, maxMs: 3400, weight: 1.2 },
    { state: 'look-clock', minMs: 1500, maxMs: 2400, weight: 1.6 },
    { state: 'laptop', minMs: 2500, maxMs: 4500, weight: 1.4 },
  ];

  const STUDY_MIN_MS = 30 * 1000;
  const STUDY_MAX_MS = 120 * 1000;

  function framePath(state, i) {
    return `assets/characters/${CHAR_ID}/${state}/frame_${i + 1}.png`;
  }

  const preloaded = [];
  function preloadAll() {
    Object.entries(FRAME_COUNTS).forEach(([state, count]) => {
      for (let i = 0; i < count; i++) {
        const img = new Image();
        img.src = framePath(state, i);
        preloaded.push(img);
      }
    });
  }

  let imgEl;
  let mode = 'idle'; // 'idle' | 'study' | 'rest'
  let frameIndex = 0;
  let timerId = null;
  let lastRandomAction = null;

  function setFrame(state, i) {
    imgEl.src = framePath(state, i);
  }

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickWeighted(items) {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  // --- IDLE（ホーム画面）: ランダムな間隔でポーズを変える ---
  function runIdleLoop() {
    clearTimer();
    const count = FRAME_COUNTS.idle;
    let next = Math.floor(Math.random() * count);
    if (next === frameIndex) next = (next + 1) % count;
    frameIndex = next;
    setFrame('idle', frameIndex);

    timerId = setTimeout(() => {
      if (mode === 'idle') runIdleLoop();
    }, 1800 + Math.random() * 2200);
  }

  // --- STUDY（勉強中の基本ポーズ）: 書き続けるフレームをテンポよくループ ---
  function runStudyPoseLoop(untilAt) {
    clearTimer();
    frameIndex = (frameIndex + 1) % FRAME_COUNTS.study;
    setFrame('study', frameIndex);

    const now = Date.now();
    if (now >= untilAt) {
      runRandomAction();
      return;
    }
    const pause = Math.random() < 0.12;
    const delay = pause ? 900 + Math.random() * 500 : 380 + Math.random() * 320;
    timerId = setTimeout(() => {
      if (mode === 'study') runStudyPoseLoop(untilAt);
    }, Math.min(delay, untilAt - now));
  }

  // STUDYの合間に挟むランダム行動（PAGE_TURN/DRINK/THINK/STRETCH/YAWN/LOOK_CLOCK/LAPTOP）
  function runRandomAction() {
    clearTimer();
    const candidates = RANDOM_ACTIONS.filter((a) => a.state !== lastRandomAction);
    const action = pickWeighted(candidates.length ? candidates : RANDOM_ACTIONS);
    lastRandomAction = action.state;

    const duration = randRange(action.minMs, action.maxMs);
    const endAt = Date.now() + duration;
    frameIndex = 0;
    playActionFrames(action.state, endAt, () => {
      if (mode === 'study') startStudyPose();
    });
  }

  function playActionFrames(state, endAt, onDone) {
    const count = FRAME_COUNTS[state];
    setFrame(state, frameIndex % count);
    frameIndex++;

    const now = Date.now();
    if (now >= endAt) {
      onDone();
      return;
    }
    const frameDelay = 420 + Math.random() * 260;
    timerId = setTimeout(() => {
      if (mode === 'study') playActionFrames(state, endAt, onDone);
    }, Math.min(frameDelay, endAt - now));
  }

  function startStudyPose() {
    const untilAt = Date.now() + randRange(STUDY_MIN_MS, STUDY_MAX_MS);
    frameIndex = 0;
    runStudyPoseLoop(untilAt);
  }

  // --- REST（一時停止）: 休憩フレームをゆったりループ ---
  function runRestLoop() {
    clearTimer();
    frameIndex = (frameIndex + 1) % FRAME_COUNTS.rest;
    setFrame('rest', frameIndex);
    timerId = setTimeout(() => {
      if (mode === 'rest') runRestLoop();
    }, 1600 + Math.random() * 1200);
  }

  function startLoopForMode() {
    frameIndex = 0;
    lastRandomAction = null;
    if (mode === 'study') startStudyPose();
    else if (mode === 'rest') runRestLoop();
    else runIdleLoop();
  }

  /* ---------- public API ---------- */

  function init(imageEl) {
    imgEl = imageEl;
    preloadAll();
    startLoopForMode();
  }

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    startLoopForMode();
  }

  return { init, setMode };
})();

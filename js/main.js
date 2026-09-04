/* ============================================================
   main.js
   画面遷移・ボタン操作・タイマー表示の更新を担当するエントリーポイント。
   ============================================================ */

(() => {
  const DEFAULT_SETTINGS = {
    studyMinutes: 25, // 将来的に 25/50/カスタム を選べるように拡張予定 (STEP8)
    breakMinutes: 5,
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem('swm.settings');
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  const settings = loadSettings();

  const els = {
    room: document.getElementById('room'),
    homeScreen: document.getElementById('home-screen'),
    studyScreen: document.getElementById('study-screen'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    endBtn: document.getElementById('end-btn'),
    timerDisplay: document.getElementById('timer-display'),
    goalFill: document.getElementById('goal-fill'),
    goalText: document.getElementById('goal-text'),
    breakCountdown: document.getElementById('break-countdown'),
    speechBubble: document.getElementById('speech-bubble'),
    speechText: document.getElementById('speech-text'),
    charCanvas: document.getElementById('char-canvas'),
  };

  const START_MESSAGES = [
    '一緒にがんばろう！',
    'よし、はじめよう〜',
    '集中していこう！',
  ];

  let speechTimeoutId = null;
  function showSpeech(text, durationMs = 3200) {
    els.speechText.textContent = text;
    els.speechBubble.hidden = false;
    if (speechTimeoutId) clearTimeout(speechTimeoutId);
    speechTimeoutId = setTimeout(() => {
      els.speechBubble.hidden = true;
    }, durationMs);
  }

  const timer = new StudyTimer({
    onTick: (elapsedMs) => {
      els.timerDisplay.textContent = StudyTimer.formatHMS(elapsedMs);

      const goalMs = settings.studyMinutes * 60 * 1000;
      const ratio = Math.min(1, elapsedMs / goalMs);
      els.goalFill.style.width = `${ratio * 100}%`;
      els.goalText.textContent = `${StudyTimer.formatMS(elapsedMs)} / ${StudyTimer.formatMS(goalMs)}`;

      const remainMs = Math.max(0, goalMs - elapsedMs);
      els.breakCountdown.textContent = StudyTimer.formatMS(remainMs);
    },
  });

  function goToHome() {
    els.studyScreen.hidden = true;
    els.homeScreen.hidden = false;
    Character.setMode('idle');
    els.room.classList.remove('is-paused');
    els.pauseBtn.textContent = '一時停止';
  }

  function goToStudy() {
    els.homeScreen.hidden = true;
    els.studyScreen.hidden = false;
    Character.setMode('study');
    timer.start();
    showSpeech(START_MESSAGES[Math.floor(Math.random() * START_MESSAGES.length)]);
  }

  els.startBtn.addEventListener('click', goToStudy);

  els.pauseBtn.addEventListener('click', () => {
    if (timer.isPaused) {
      timer.resume();
      Character.setMode('study');
      els.room.classList.remove('is-paused');
      els.pauseBtn.textContent = '一時停止';
      showSpeech('再開だ、がんばろう！', 2200);
    } else {
      timer.pause();
      Character.setMode('paused');
      els.room.classList.add('is-paused');
      els.pauseBtn.textContent = '再開する';
      showSpeech('少し休憩中…', 2200);
    }
  });

  els.endBtn.addEventListener('click', () => {
    const elapsedMs = timer.getElapsedMs();
    const ok = window.confirm(
      `勉強を終了しますか？\n今回の勉強時間: ${StudyTimer.formatHMS(elapsedMs)}`
    );
    if (!ok) return;
    timer.stop();
    showSpeech('おつかれさま！よくがんばったね', 3000);
    goToHome();
  });

  // --- init ---
  Character.init(els.charCanvas);
  Room.init(els.room);
  goToHome();
})();

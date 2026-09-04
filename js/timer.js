/* ============================================================
   timer.js
   実経過時間(Date.now()基準)で正確に計測するタイマー。
   フレーム数やsetIntervalの積算に依存しないため、
   タブが非アクティブでもズレない。
   ============================================================ */

class StudyTimer {
  constructor({ onTick } = {}) {
    this.onTick = onTick || (() => {});
    this.reset();
    this._intervalId = null;
  }

  reset() {
    this._startedAt = null;
    this._pausedAt = null;
    this._totalPausedMs = 0;
    this.isRunning = false;
    this.isPaused = false;
  }

  start() {
    this.reset();
    this._startedAt = Date.now();
    this.isRunning = true;
    this.isPaused = false;
    this._loop();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this._pausedAt = Date.now();
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this._totalPausedMs += Date.now() - this._pausedAt;
    this._pausedAt = null;
    this.isPaused = false;
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  getElapsedMs() {
    if (!this._startedAt) return 0;
    const end = this.isPaused ? this._pausedAt : Date.now();
    return Math.max(0, end - this._startedAt - this._totalPausedMs);
  }

  _loop() {
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this.onTick(this.getElapsedMs());
    }, 250); // 250ms間隔でポーリングし、表示は秒単位に丸める
  }

  static formatHMS(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  static formatMS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }
}

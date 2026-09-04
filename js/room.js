/* ============================================================
   room.js
   現在時刻に応じて部屋の雰囲気（壁・空・照明）を切り替える。
   ============================================================ */

const Room = (() => {
  let el;

  function classify(hour) {
    if (hour >= 5 && hour < 10) return 'time-morning';
    if (hour >= 10 && hour < 16) return 'time-day';
    if (hour >= 16 && hour < 19) return 'time-evening';
    if (hour >= 19 && hour < 23) return 'time-night';
    return 'time-latenight'; // 23:00-5:00
  }

  function apply() {
    const cls = classify(new Date().getHours());
    el.classList.remove('time-morning', 'time-day', 'time-evening', 'time-night', 'time-latenight');
    el.classList.add(cls);
  }

  function updateClockHands() {
    const now = new Date();
    const hourEl = document.querySelector('.hand.hour');
    const minuteEl = document.querySelector('.hand.minute');
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    if (hourEl) hourEl.style.transform = `rotate(${h * 30 + m * 0.5}deg)`;
    if (minuteEl) minuteEl.style.transform = `rotate(${m * 6}deg)`;

    const deskClockEl = document.querySelector('.deskclock');
    if (deskClockEl) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      deskClockEl.textContent = `${hh}:${mm}`;
    }
  }

  function init(roomEl) {
    el = roomEl;
    apply();
    updateClockHands();
    setInterval(() => {
      apply();
      updateClockHands();
    }, 30 * 1000);
  }

  return { init };
})();

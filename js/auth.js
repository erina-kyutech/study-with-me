/* ============================================================
   auth.js
   ログイン/新規登録/ゲスト利用の切り替えと、勉強記録のDB保存を担当。
   DB接続なしでも(APIがエラーでも)アプリ自体は使えるようにする。
   ============================================================ */

const Auth = (() => {
  let currentUser = null;

  const els = {};
  function cacheEls() {
    els.authScreen = document.getElementById('auth-screen');
    els.authForm = document.getElementById('auth-form');
    els.authEmail = document.getElementById('auth-email');
    els.authPassword = document.getElementById('auth-password');
    els.authError = document.getElementById('auth-error');
    els.authSubmit = document.getElementById('auth-submit');
    els.authToggleText = document.getElementById('auth-toggle-text');
    els.authToggleBtn = document.getElementById('auth-toggle-btn');
    els.authGuestBtn = document.getElementById('auth-guest-btn');
    els.userBar = document.getElementById('user-bar');
    els.userEmail = document.getElementById('user-email');
    els.logoutBtn = document.getElementById('logout-btn');
    els.historyBtn = document.getElementById('history-btn');
    els.historyScreen = document.getElementById('history-screen');
    els.historyTotal = document.getElementById('history-total');
    els.historyList = document.getElementById('history-list');
    els.historyCloseBtn = document.getElementById('history-close-btn');
  }

  let isRegisterMode = false;
  function setMode(register) {
    isRegisterMode = register;
    els.authSubmit.textContent = register ? '登録する' : 'ログイン';
    els.authToggleText.textContent = register ? 'アカウントをお持ちの場合は' : 'アカウントがない場合は';
    els.authToggleBtn.textContent = register ? 'ログイン' : '新規登録';
    els.authError.hidden = true;
  }

  async function api(path, options) {
    const res = await fetch(path, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function showAuthScreen() {
    els.authScreen.hidden = false;
    document.getElementById('home-screen').hidden = true;
    document.getElementById('study-screen').hidden = true;
  }

  function showApp() {
    els.authScreen.hidden = true;
    els.historyScreen.hidden = true;
    document.getElementById('home-screen').hidden = false;
  }

  function updateUserBar() {
    if (currentUser) {
      els.userBar.hidden = false;
      els.userEmail.textContent = currentUser.email;
    } else {
      els.userBar.hidden = true;
      els.userEmail.textContent = '';
    }
  }

  async function refreshMe() {
    try {
      currentUser = await api('/api/auth/me');
    } catch (e) {
      currentUser = null;
    }
    updateUserBar();
    return currentUser;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    els.authError.hidden = true;
    const email = els.authEmail.value.trim();
    const password = els.authPassword.value;
    const path = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    try {
      currentUser = await api(path, { method: 'POST', body: JSON.stringify({ email, password }) });
      updateUserBar();
      showApp();
    } catch (e) {
      els.authError.textContent = e.message || 'エラーが発生しました';
      els.authError.hidden = false;
    }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      /* ignore */
    }
    currentUser = null;
    updateUserBar();
    showAuthScreen();
  }

  function formatMinutes(sec) {
    return `${Math.round(sec / 60)}分`;
  }

  async function openHistory() {
    document.getElementById('home-screen').hidden = true;
    els.historyScreen.hidden = false;
    els.historyList.innerHTML = '<li class="history-empty">読み込み中…</li>';
    try {
      const data = await api('/api/sessions');
      els.historyTotal.textContent = `合計 ${formatMinutes(data.totalSec)}`;
      if (!data.sessions.length) {
        els.historyList.innerHTML = '<li class="history-empty">まだ記録がありません</li>';
        return;
      }
      els.historyList.innerHTML = data.sessions
        .map((s) => {
          const d = new Date(s.startedAt);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          return `<li><span class="history-date">${dateStr}</span><span class="history-dur">${formatMinutes(s.durationSec)}</span></li>`;
        })
        .join('');
    } catch (e) {
      els.historyList.innerHTML = '<li class="history-empty">読み込みに失敗しました</li>';
    }
  }

  function closeHistory() {
    els.historyScreen.hidden = true;
    document.getElementById('home-screen').hidden = false;
  }

  async function recordSession(startedAt, endedAt, durationSec) {
    if (!currentUser) return;
    if (durationSec < 5) return; // ノイズ除去(誤タップ等)
    try {
      await api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSec,
        }),
      });
    } catch (e) {
      console.warn('セッションの保存に失敗しました', e);
    }
  }

  async function init() {
    cacheEls();
    els.authForm.addEventListener('submit', handleSubmit);
    els.authToggleBtn.addEventListener('click', () => setMode(!isRegisterMode));
    els.authGuestBtn.addEventListener('click', () => {
      currentUser = null;
      updateUserBar();
      showApp();
    });
    els.logoutBtn.addEventListener('click', logout);
    els.historyBtn.addEventListener('click', openHistory);
    els.historyCloseBtn.addEventListener('click', closeHistory);
    setMode(false);

    const user = await refreshMe();
    if (user) {
      showApp();
    } else {
      showAuthScreen();
    }
  }

  return { init, recordSession, get currentUser() { return currentUser; } };
})();

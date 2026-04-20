(() => {
  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  function isLoginPage() {
    return /(^|\/)index\.html$/i.test(window.location.pathname) || window.location.pathname.endsWith('/');
  }

  function removeDeprecatedLinks() {
    document.querySelectorAll('a[href="pedidos-online.html"], a[href="app-cliente.html"]').forEach((el) => {
      const card = el.closest('.nav-item, .quick-link-card, .workspace-card, .husky-workspace-tab, .action-card, .dashboard-card');
      (card || el).remove();
    });
    document.querySelectorAll('[data-module="ifood"], .ifood-card, .ifood-panel').forEach((el) => el.remove());
  }

  function bindLoginThemeButton() {
    const button = document.getElementById('login-theme-toggle');
    if (!button) return;
    button.addEventListener('click', () => {
      if (window.HuskyApp?.toggleThemeMode) {
        window.HuskyApp.toggleThemeMode();
        window.setTimeout(updateThemeLabel, 60);
      }
    });
  }

  function updateThemeLabel() {
    const button = document.getElementById('login-theme-toggle');
    if (!button) return;
    const mode = document.body.dataset.themeMode === 'dark' ? 'Escuro' : 'Claro';
    button.querySelector('span')?.replaceChildren(document.createTextNode(`Tema ${mode}`));
  }

  let audioCtx;
  function playDingle() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = audioCtx || new AudioContextClass();
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      o1.type = 'sine';
      o2.type = 'triangle';
      o1.frequency.setValueAtTime(740, now);
      o2.frequency.setValueAtTime(988, now + 0.03);
      o1.connect(gain);
      o2.connect(gain);
      o1.start(now);
      o2.start(now + 0.03);
      o1.stop(now + 0.12);
      o2.stop(now + 0.18);
    } catch (_) {}
  }

  function bindSoftDingle() {
    document.addEventListener('click', (event) => {
      const clickable = event.target.closest('button, .btn, .nav-item, a.card-link, .quick-link-card');
      if (!clickable) return;
      if (clickable.matches('[disabled], .is-disabled')) return;
      playDingle();
    }, { passive: true });
  }

  function cleanupLoginDecor() {
    if (!isLoginPage()) return;
    const spotlight = document.getElementById('husky-login-spotlight');
    if (spotlight) spotlight.remove();
  }

  onReady(() => {
    document.body.classList.add('husky-ui-ready');
    removeDeprecatedLinks();
    cleanupLoginDecor();
    bindLoginThemeButton();
    bindSoftDingle();
    updateThemeLabel();
    window.addEventListener('husky:settings-changed', updateThemeLabel);
  });
})();

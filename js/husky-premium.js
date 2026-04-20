(() => {
  'use strict';

  function currentPage() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function pleasantClickDing() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = pleasantClickDing.ctx || (pleasantClickDing.ctx = new AudioCtx());
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      master.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
      osc2.frequency.setValueAtTime(523.25, now + 0.01);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.16);

      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.55, now + 0.018);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      gain2.gain.setValueAtTime(0.0001, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc1.connect(gain1).connect(master);
      osc2.connect(gain2).connect(master);
      osc1.start(now);
      osc2.start(now + 0.01);
      osc1.stop(now + 0.19);
      osc2.stop(now + 0.23);
    } catch (_error) {}
  }

  function bindClickSounds() {
    let last = 0;
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('button, .btn, a.nav-item, .mobile-menu-btn, .husky-home-action');
      if (!trigger) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      pleasantClickDing();
    }, true);
  }

  function cleanupDisabledFeatures() {
    document.querySelectorAll('a[href="pedidos-online.html"], link[href*="pedidos-online.css"], script[src*="pedidos-online.js"]').forEach((el) => el.remove());
    document.querySelectorAll('[data-ifood], #ifood-settings-form, #home-ifood-status, #home-ifood-detail').forEach((el) => {
      const container = el.closest('.panel, .summary-card, .metric-card, .status-box, article, section, .nav-item');
      if (container && !container.matches('body')) container.remove();
      else el.remove();
    });
  }

  function rethemeBrand() {
    document.querySelectorAll('.brand-logo').forEach((img) => {
      img.setAttribute('src', 'assets/img/brand/logo-blue.png');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cleanupDisabledFeatures();
    rethemeBrand();
    bindClickSounds();
    document.body.classList.add('husky-premium-ready');
    document.body.dataset.pageName = currentPage().replace('.html', '');
  });
})();

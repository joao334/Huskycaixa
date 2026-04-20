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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_error) {}
  }

  function bindClickSounds() {
    let last = 0;
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('button, .btn, a.nav-item, .mobile-menu-btn');
      if (!trigger) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      pleasantClickDing();
    }, true);
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const button = document.getElementById('mobile-menu-btn');
    if (!sidebar || !button) return;

    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    const open = () => {
      sidebar.classList.add('is-open');
      document.body.classList.add('sidebar-visible');
      overlay.style.display = 'block';
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    };

    const close = () => {
      sidebar.classList.remove('is-open');
      document.body.classList.remove('sidebar-visible');
      overlay.classList.remove('is-visible');
      setTimeout(() => {
        if (!document.body.classList.contains('sidebar-visible')) {
          overlay.style.display = 'none';
        }
      }, 220);
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (sidebar.classList.contains('is-open')) close();
      else open();
    });

    overlay.addEventListener('click', close);
    sidebar.querySelectorAll('a.nav-item').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) close();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
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
    toggleSidebar();
    bindClickSounds();
    document.body.classList.add('husky-premium-ready');
    document.body.dataset.pageName = currentPage().replace('.html', '');
  });
})();

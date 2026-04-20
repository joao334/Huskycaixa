(() => {
  'use strict';

  const BRAND_DECOR = [
    'assets/img/brand/husky-arms.jpeg',
    'assets/img/brand/husky-nose.jpeg',
    'assets/img/brand/husky-phone.jpeg'
  ];

  function currentPage() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function pleasantClickDing() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = pleasantClickDing.ctx || (pleasantClickDing.ctx = new AudioCtx());
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      osc2.frequency.setValueAtTime(660, now);
      osc2.frequency.exponentialRampToValueAtTime(990, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.24);
      osc2.stop(now + 0.24);
    } catch (_e) {}
  }

  function bindClickSounds() {
    let last = 0;
    document.addEventListener('pointerdown', (event) => {
      const trigger = event.target.closest('button, .btn, a, .nav-item, .husky-quick-chip, .theme-toggle-btn, #btn-toggle-theme');
      if (!trigger || trigger.disabled) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      pleasantClickDing();
    }, { passive: true, capture: true });
  }

  function enhanceSidebarAndTopbar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('mobile-menu-btn');
    if (!sidebar || !btn) return;

    btn.setAttribute('aria-label', 'Abrir menu');
    btn.innerHTML = '<span>☰</span>';

    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }

    const syncOverlay = () => {
      const visible = document.body.classList.contains('sidebar-visible') || sidebar.classList.contains('is-open');
      overlay.style.display = visible ? 'block' : 'none';
      overlay.classList.toggle('is-visible', visible);
    };

    btn.addEventListener('click', () => {
      setTimeout(syncOverlay, 30);
    }, { passive: true });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('is-open');
      document.body.classList.remove('sidebar-visible');
      syncOverlay();
    });

    sidebar.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
      setTimeout(syncOverlay, 20);
    }));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        sidebar.classList.remove('is-open');
        document.body.classList.remove('sidebar-visible');
        syncOverlay();
      }
    });

    syncOverlay();
  }

  function cleanupUI() {
    document.querySelectorAll('a[href="pedidos-online.html"], .husky-workspace-strip, .husky-mobile-dock, #husky-mobile-primary, #husky-mobile-focus-toggle, #husky-mobile-filter-toggle, #husky-install-shortcut, script[src*="pedidos-online.js"], link[href*="pedidos-online.css"]').forEach((el) => el.remove());
    document.querySelectorAll('#ifood-settings-form').forEach((form) => form.closest('.panel, .panel-subsection, section, article')?.remove());
    document.querySelectorAll('#home-ifood-status, #home-ifood-detail').forEach((el) => el.closest('.husky-home-mini-stat, .status-box, .panel, article, .summary-card')?.remove());
    document.querySelectorAll('.husky-menu-organizer').forEach((el) => el.remove());
  }

  function injectDecor() {
    if (!document.body || document.body.dataset.huskyDecorReady === 'true') return;
    document.body.dataset.huskyDecorReady = 'true';
    if (currentPage() === 'index.html') return;

    const wrap = document.createElement('div');
    wrap.className = 'husky-decor-layer';
    wrap.innerHTML = `
      <img src="assets/img/brand/logo-badge.png" class="husky-floating husky-floating--badge" alt="Husky Confeiteiro" />
      <img src="assets/img/brand/husky-arms.jpeg" class="husky-floating husky-floating--arms" alt="Mascote Husky" />
      <img src="assets/img/brand/husky-think.jpeg" class="husky-floating husky-floating--think" alt="Mascote Husky" />
      <div class="husky-gradient-orb husky-gradient-orb--one"></div>
      <div class="husky-gradient-orb husky-gradient-orb--two"></div>
    `;
    document.body.appendChild(wrap);

    const heading = document.querySelector('.page-heading');
    if (heading && !heading.querySelector('.husky-quick-chips')) {
      const chips = document.createElement('div');
      chips.className = 'husky-quick-chips';
      chips.innerHTML = `
        <span class="husky-quick-chip">Azul Husky</span>
        <span class="husky-quick-chip">Bege Cremoso</span>
        <span class="husky-quick-chip">Fluxo Leve</span>
      `;
      heading.appendChild(chips);
    }
  }

  function rethemeBrand() {
    const logos = document.querySelectorAll('.brand-logo');
    logos.forEach((img) => img.setAttribute('src', 'assets/img/brand/logo-blue.png'));
    const avatar = document.querySelector('.operator-avatar');
    if (avatar) avatar.setAttribute('src', 'assets/img/brand/husky-arms.jpeg');
  }

  document.addEventListener('DOMContentLoaded', () => {
    cleanupUI();
    rethemeBrand();
    injectDecor();
    enhanceSidebarAndTopbar();
    bindClickSounds();
  });
})();

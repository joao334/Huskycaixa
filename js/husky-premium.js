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
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('button, .btn, a, .nav-item, .husky-quick-chip');
      if (!trigger) return;
      const tag = trigger.tagName;
      if (tag === 'A' && (trigger.getAttribute('href') || '').startsWith('#')) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      pleasantClickDing();
    }, true);
  }

  function enhanceSidebarAndTopbar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('mobile-menu-btn');
    const body = document.body;
    if (!sidebar || !btn) return;

    btn.setAttribute('aria-label', 'Abrir menu');
    btn.innerHTML = '<span>☰</span>';

    const overlay = document.getElementById('sidebar-overlay') || (() => {
      const el = document.createElement('div');
      el.id = 'sidebar-overlay';
      document.body.appendChild(el);
      return el;
    })();

    const open = () => {
      sidebar.classList.add('is-open');
      body.classList.add('sidebar-visible');
      overlay.style.display = 'block';
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    };
    const close = () => {
      sidebar.classList.remove('is-open');
      body.classList.remove('sidebar-visible');
      overlay.classList.remove('is-visible');
      setTimeout(() => { if (!body.classList.contains('sidebar-visible')) overlay.style.display = 'none'; }, 220);
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (sidebar.classList.contains('is-open')) close(); else open();
    });
    overlay.addEventListener('click', close);
    sidebar.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', close));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function cleanupUI() {
    if (currentPage() === 'index.html') return;
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

  window.addEventListener('storage', () => {
    const raw = localStorage.getItem('husky_system:state');
    if (!raw || !document.body) return;
    try {
      const parsed = JSON.parse(raw);
      const mode = parsed?.settings?.visual?.themeMode || 'husky-default';
      document.body.dataset.themeMode = mode;
      document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
    } catch (_error) {}
  });
})();

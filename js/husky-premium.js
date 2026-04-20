(() => {
  'use strict';

  function playSoftDing() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = playSoftDing.ctx || (playSoftDing.ctx = new Ctx());
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.018, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      master.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(660, now);
      osc1.frequency.exponentialRampToValueAtTime(820, now + 0.12);
      osc2.frequency.setValueAtTime(510, now);
      osc2.frequency.exponentialRampToValueAtTime(620, now + 0.15);
      osc1.connect(master);
      osc2.connect(master);
      osc1.start(now);
      osc2.start(now + 0.01);
      osc1.stop(now + 0.16);
      osc2.stop(now + 0.2);
    } catch (e) {}
  }

  function bindClickDing() {
    let last = 0;
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('button, .btn, .nav-item, .mobile-menu-btn, .husky-home-action, .quick-link-card');
      if (!trigger) return;
      const now = Date.now();
      if (now - last < 120) return;
      last = now;
      playSoftDing();
    }, true);
  }

  function injectDecorLayer() {
    if (!document.body || document.getElementById('husky-decor-layer')) return;
    const layer = document.createElement('div');
    layer.id = 'husky-decor-layer';
    layer.className = 'husky-decor-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <img src="assets/img/brand/logo-badge.png" alt="" class="husky-decor--badge" />
      <img src="assets/img/mascote-3d.png" alt="" class="husky-decor--mascot" />
      <img src="assets/img/brand/husky-arms-transparent.png" alt="" class="husky-decor--arms" />
    `;
    document.body.appendChild(layer);
  }

  function applyPremiumMarkers() {
    document.documentElement.classList.add('husky-premium-ready');
    document.body.classList.add('husky-premium-ready');
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyPremiumMarkers();
    injectDecorLayer();
    bindClickDing();
  });
})();

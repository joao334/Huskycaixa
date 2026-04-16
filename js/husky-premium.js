(() => {
  'use strict';

  const NAV_META = {
    'home.html': { icon: '🏠', label: 'Início', sub: 'Visão geral', group: 'principal' },
    'vendas.html': { icon: '💸', label: 'Vendas', sub: 'Caixa rápido', group: 'operacao' },
    'produtos.html': { icon: '🧁', label: 'Produtos', sub: 'Catálogo', group: 'operacao' },
    'estoque.html': { icon: '📦', label: 'Estoque', sub: 'Entradas e saídas', group: 'operacao' },
    'despesas.html': { icon: '🧾', label: 'Despesas', sub: 'Custos', group: 'gestao' },
    'relatorios.html': { icon: '📈', label: 'Relatórios', sub: 'Resultados', group: 'gestao' },
    'clientes.html': { icon: '👥', label: 'Clientes', sub: 'Relacionamento', group: 'gestao' },
    'comprovantes.html': { icon: '✅', label: 'Comprovantes', sub: 'Pix e anexos', group: 'gestao' },
    'configuracoes.html': { icon: '⚙️', label: 'Configurações', sub: 'Ajustes', group: 'sistema' }
  };

  const WORKSPACE_ITEMS = [
    { href: 'home.html', icon: '🏠', title: 'Painel', sub: 'Hoje' },
    { href: 'vendas.html', icon: '💸', title: 'Vendas', sub: 'Pedidos' },
    { href: 'produtos.html', icon: '🧁', title: 'Produtos', sub: 'Cardápio' },
    { href: 'estoque.html', icon: '📦', title: 'Estoque', sub: 'Controle' },
    { href: 'relatorios.html', icon: '📈', title: 'Relatórios', sub: 'Análises' },
    { href: 'clientes.html', icon: '👥', title: 'Clientes', sub: 'Contato' }
  ];

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function currentPage() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function isAppPage() {
    return document.body?.classList.contains('app-page-body');
  }

  function isLoginPage() {
    return /index\.html$/i.test(currentPage());
  }

  function isCompact() {
    return window.innerWidth <= 768;
  }

  function normalizeTopbar() {
    if (!isAppPage()) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    let left = topbar.querySelector('.topbar-left');
    let right = topbar.querySelector('.topbar-right');

    if (!left) {
      left = document.createElement('div');
      left.className = 'topbar-left';
      topbar.prepend(left);
    }

    if (!right) {
      right = document.createElement('div');
      right.className = 'topbar-right';
      topbar.appendChild(right);
    }

    let actions = right.querySelector('.topbar-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'topbar-actions';
      right.appendChild(actions);
    }

    let themeButton = topbar.querySelector('#btn-toggle-theme');
    if (!themeButton) {
      themeButton = document.createElement('button');
      themeButton.type = 'button';
      themeButton.id = 'btn-toggle-theme';
      themeButton.className = 'btn btn-secondary';
      themeButton.setAttribute('data-action', 'toggle-theme');
      themeButton.textContent = 'Tema escuro';
      actions.prepend(themeButton);
    } else if (themeButton.parentElement !== actions) {
      actions.prepend(themeButton);
    }
  }

  function enhanceSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || nav.dataset.premiumReady === 'true') return;

    const links = Array.from(nav.querySelectorAll('a.nav-item'));
    const groups = {
      principal: 'Painel',
      operacao: 'Operação',
      gestao: 'Gestão',
      sistema: 'Sistema'
    };

    let lastGroup = null;

    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const meta = NAV_META[href] || { icon: '•', label: link.textContent.trim(), sub: '', group: 'principal' };

      if (meta.group !== lastGroup) {
        const label = document.createElement('div');
        label.className = 'nav-group-label';
        label.textContent = groups[meta.group] || 'Menu';
        nav.insertBefore(label, link);
        lastGroup = meta.group;
      }

      link.dataset.navKey = href.replace('.html', '');
      link.innerHTML = `
        <span class="nav-item-icon" aria-hidden="true">${meta.icon}</span>
        <span class="nav-item-copy">
          <strong>${meta.label}</strong>
          <small>${meta.sub}</small>
        </span>
      `;
    });

    nav.dataset.premiumReady = 'true';
  }

  function workspaceChip(title, value) {
    return `<span class="husky-login-badge">${title}: ${value}</span>`;
  }

  function injectWorkspaceStrip() {
    if (!isAppPage()) return;
    const contentArea = document.querySelector('.content-area');
    const topbar = document.querySelector('.topbar');
    if (!contentArea || !topbar) return;

    let strip = document.getElementById('husky-workspace-strip');
    if (!strip) {
      strip = document.createElement('section');
      strip.id = 'husky-workspace-strip';
      strip.className = 'husky-workspace-strip';
      topbar.insertAdjacentElement('afterend', strip);
    }

    const activeFile = currentPage();
    const app = window.HuskyApp;
    const isDark = (app?.getSettings?.().visual?.themeMode || 'husky-default') === 'dark';

    strip.innerHTML = `
      <div class="husky-workspace-strip__header">
        <div>
          <div class="eyebrow">Fluxo rápido</div>
          <h2 class="husky-workspace-strip__title">Central Husky</h2>
          <div class="husky-workspace-strip__meta">Acesso rápido às áreas principais, com foco em velocidade no celular e no PC.</div>
        </div>
        <div class="husky-login-badge-row">
          ${workspaceChip('Tema', isDark ? 'Escuro' : 'Claro')}
          ${workspaceChip('Atalho', 'Ctrl + K')}
          ${workspaceChip('Modo', isCompact() ? 'Compacto' : 'Completo')}
        </div>
      </div>
      <div class="husky-workspace-strip__tabs">
        ${WORKSPACE_ITEMS.map((item) => `
          <a href="${item.href}" class="husky-workspace-tab ${activeFile === item.href ? 'is-active' : ''}">
            <span>${item.icon}</span>
            <strong>${item.title}</strong>
            <small>${item.sub}</small>
          </a>
        `).join('')}
        <button type="button" class="husky-workspace-tab" data-premium-command>
          <span>⌘</span>
          <strong>Comandos</strong>
          <small>Buscar ação</small>
        </button>
      </div>
    `;

    strip.querySelector('[data-premium-command]')?.addEventListener('click', () => {
      window.HuskyApp?.openCommandPalette?.();
    });
  }

  function findPageFocusConfig() {
    const page = currentPage();
    const map = {
      'vendas.html': {
        root: '.sales-compact-grid',
        primary: '.sales-fast-form',
        secondary: '.sales-fast-side',
        titles: ['Venda', 'Resumo'],
        desc: 'No celular, escolha entre lançar o pedido ou ver o painel lateral.'
      },
      'produtos.html': {
        root: '.products-main-grid',
        primary: '.products-main-grid > article:first-child',
        secondary: '.products-side-column',
        titles: ['Cadastro', 'Painel'],
        desc: 'Simplifica o catálogo no celular, separando cadastro da visão lateral.'
      },
      'estoque.html': {
        root: '.estoque-main-grid',
        primary: '.estoque-main-grid > article:first-child',
        secondary: '.estoque-side-column',
        titles: ['Movimentar', 'Painel'],
        desc: 'Troque entre registro de estoque e visão auxiliar no celular.'
      },
      'despesas.html': {
        root: '.despesas-main-grid',
        primary: '.despesas-main-grid > article:first-child',
        secondary: '.despesas-side-column',
        titles: ['Cadastro', 'Painel'],
        desc: 'Foco total no lançamento, com a parte lateral separada.'
      },
      'clientes.html': {
        root: '.clientes-main-grid',
        primary: '.clientes-main-grid > article:first-child',
        secondary: '.clientes-side-column',
        titles: ['Cliente', 'Painel'],
        desc: 'Cadastro principal separado do apoio lateral no celular.'
      }
    };
    return map[page] || null;
  }

  function ensureBodyFocusState(defaultMode = 'primary') {
    document.body.classList.remove('mobile-focus-primary', 'mobile-focus-secondary');
    document.body.classList.add(defaultMode === 'secondary' ? 'mobile-focus-secondary' : 'mobile-focus-primary');
  }

  function injectMobileFocusToggle() {
    if (!isAppPage()) return;
    const config = findPageFocusConfig();
    if (!config) return;
    const root = document.querySelector(config.root);
    const primary = document.querySelector(config.primary);
    const secondary = document.querySelector(config.secondary);
    if (!root || !primary || !secondary) return;

    let box = document.getElementById('husky-mobile-focus-toggle');
    if (!box) {
      box = document.createElement('section');
      box.id = 'husky-mobile-focus-toggle';
      box.className = 'husky-mobile-focus-toggle';
      root.insertAdjacentElement('beforebegin', box);
    }

    box.innerHTML = `
      <div class="husky-mobile-focus-head">
        <div>
          <h3 class="husky-mobile-focus-title">Modo foco</h3>
          <div class="husky-mobile-focus-copy">${config.desc}</div>
        </div>
        <span class="husky-login-badge">Mobile</span>
      </div>
      <div class="husky-mobile-focus-actions">
        <button type="button" class="husky-mobile-focus-btn is-active" data-focus-mode="primary">${config.titles[0]}</button>
        <button type="button" class="husky-mobile-focus-btn" data-focus-mode="secondary">${config.titles[1]}</button>
      </div>
    `;

    const setMode = (mode) => {
      ensureBodyFocusState(mode);
      box.querySelectorAll('[data-focus-mode]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.focusMode === mode);
      });
    };

    box.querySelectorAll('[data-focus-mode]').forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.focusMode));
    });

    setMode('primary');
  }

  function markMobileFilterPanels() {
    if (!isAppPage()) return;
    const selectors = [
      '.sales-filter-panel',
      '.panel:has(.toolbar-grid)',
      '.panel:has(.report-filter-grid)',
      '.panel:has(.products-filter-grid)',
      '.panel:has(.estoque-filter-grid)',
      '.panel:has(.estoque-history-filter-grid)',
      '.panel:has(.despesas-filter-grid)',
      '.panel:has(.clientes-filter-grid)',
      '.panel:has(.comprovantes-filter-grid)',
      '.panel:has(.users-toolbar-grid)'
    ];

    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((panel) => {
          panel.dataset.mobileFilterPanel = 'true';
        });
      } catch (error) {
        /* :has fallback below */
      }
    });

    document.querySelectorAll('.panel').forEach((panel) => {
      if (
        panel.querySelector('.toolbar-grid, .report-filter-grid, .products-filter-grid, .estoque-filter-grid, .estoque-history-filter-grid, .despesas-filter-grid, .clientes-filter-grid, .comprovantes-filter-grid, .users-toolbar-grid')
      ) {
        panel.dataset.mobileFilterPanel = 'true';
      }
    });
  }

  function injectMobileFilterToggle() {
    if (!isAppPage()) return;
    markMobileFilterPanels();
    const panel = document.querySelector('.sales-filter-panel, .panel[data-mobile-filter-panel="true"]');
    if (!panel) return;

    let box = document.getElementById('husky-mobile-filter-toggle');
    if (!box) {
      box = document.createElement('section');
      box.id = 'husky-mobile-filter-toggle';
      box.className = 'husky-mobile-filter-toggle';
      panel.insertAdjacentElement('beforebegin', box);
    }

    const applyState = (expanded) => {
      document.body.classList.toggle('mobile-filters-collapsed', !expanded && isCompact());
      box.querySelectorAll('[data-filter-state]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.filterState === (expanded ? 'open' : 'closed'));
      });
    };

    box.innerHTML = `
      <div class="husky-mobile-filter-head">
        <div>
          <h3 class="husky-mobile-filter-title">Filtros rápidos</h3>
          <div class="husky-mobile-filter-copy">Abra só quando precisar para a tela ficar leve no celular.</div>
        </div>
        <span class="husky-login-badge">Foco</span>
      </div>
      <div class="husky-mobile-filter-actions">
        <button type="button" class="husky-mobile-filter-btn is-active" data-filter-state="closed">Ocultar</button>
        <button type="button" class="husky-mobile-filter-btn" data-filter-state="open">Mostrar</button>
      </div>
    `;

    box.querySelectorAll('[data-filter-state]').forEach((button) => {
      button.addEventListener('click', () => applyState(button.dataset.filterState === 'open'));
    });

    applyState(false);
  }

  function enhanceLogin() {
    if (!isLoginPage()) return;
    const cardBody = document.querySelector('.husky-login-card-body');
    if (!cardBody) return;

    let spotlight = document.getElementById('husky-login-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('section');
      spotlight.id = 'husky-login-spotlight';
      spotlight.className = 'husky-login-spotlight';
      cardBody.appendChild(spotlight);
    }

    spotlight.innerHTML = `
      <div class="husky-login-spotlight__header">
        <div>
          <div class="eyebrow">Experiência premium</div>
          <h3 class="husky-login-spotlight__title">Sistema mais rápido e elegante</h3>
          <div class="husky-login-spotlight__copy">Interface pensada para funcionar melhor no celular, no caixa e no desktop.</div>
        </div>
        <div class="husky-login-badge-row">
          <span class="husky-login-badge">Dark mode corrigido</span>
          <span class="husky-login-badge">Mobile simples</span>
        </div>
      </div>
      <div class="husky-login-spotlight__stats">
        <div class="husky-login-stat"><strong>1 toque</strong><span>para acessar ações principais no celular</span></div>
        <div class="husky-login-stat"><strong>Modo foco</strong><span>para esconder excesso de informação no mobile</span></div>
        <div class="husky-login-stat"><strong>⌘ Ctrl + K</strong><span>para navegar mais rápido no PC</span></div>
      </div>
    `;
  }

  function refreshWorkspace() {
    normalizeTopbar();
    enhanceSidebar();
    injectWorkspaceStrip();
    injectMobileFocusToggle();
    injectMobileFilterToggle();
    enhanceLogin();
  }

  onReady(() => {
    refreshWorkspace();
    ensureBodyFocusState('primary');

    window.addEventListener('resize', () => {
      if (!isCompact()) {
        document.body.classList.remove('mobile-filters-collapsed');
      } else {
        document.body.classList.add('mobile-filters-collapsed');
      }
      refreshWorkspace();
    });

    window.addEventListener('orientationchange', refreshWorkspace);
    window.addEventListener('husky:state-changed', refreshWorkspace);

    const observer = new MutationObserver(() => {
      refreshWorkspace();
    });

    const topbar = document.querySelector('.topbar');
    const sidebar = document.querySelector('.sidebar-nav');
    const loginCard = document.querySelector('.husky-login-card-body');
    [topbar, sidebar, loginCard].filter(Boolean).forEach((node) => {
      observer.observe(node, { childList: true, subtree: true });
    });
  });
})();

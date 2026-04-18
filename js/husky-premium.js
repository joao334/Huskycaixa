(() => {
  'use strict';

  function icon(name, alt = '') {
    return `<img src="assets/img/icons/${name}.svg" alt="${alt}" class="husky-ui-icon" />`;
  }

  const MENU_ORDER_KEY = 'husky_sidebar_menu_order';

  const NAV_META = {
    'pedidos-online.html': { icon: icon('sales', 'Pedidos online'), label: 'Pedidos online', sub: 'App do cliente', group: 'principal' },
    'home.html': { icon: icon('home', 'Início'), label: 'Início', sub: 'Visão geral', group: 'principal' },
    'vendas.html': { icon: icon('sales', 'Vendas'), label: 'Vendas', sub: 'Caixa rápido', group: 'operacao' },
    'produtos.html': { icon: icon('cupcake', 'Produtos'), label: 'Produtos', sub: 'Catálogo', group: 'operacao' },
    'estoque.html': { icon: icon('box', 'Estoque'), label: 'Estoque', sub: 'Entradas e saídas', group: 'operacao' },
    'despesas.html': { icon: icon('receipt', 'Despesas'), label: 'Despesas', sub: 'Custos', group: 'gestao' },
    'relatorios.html': { icon: icon('chart', 'Relatórios'), label: 'Relatórios', sub: 'Resultados', group: 'gestao' },
    'clientes.html': { icon: icon('users', 'Clientes'), label: 'Clientes', sub: 'Relacionamento', group: 'gestao' },
    'comprovantes.html': { icon: icon('proof', 'Comprovantes'), label: 'Comprovantes', sub: 'Pix e anexos', group: 'gestao' },
    'configuracoes.html': { icon: icon('settings', 'Configurações'), label: 'Configurações', sub: 'Ajustes', group: 'sistema' }
  };

  const DEFAULT_MENU_ORDER = [
    'pedidos-online.html',
    'home.html',
    'vendas.html',
    'produtos.html',
    'estoque.html',
    'despesas.html',
    'relatorios.html',
    'clientes.html',
    'comprovantes.html',
    'configuracoes.html'
  ];

  const WORKSPACE_ITEMS = [
    { href: 'pedidos-online.html', icon: icon('sales', 'Pedidos online'), title: 'Pedidos online', sub: 'Tempo real' },
    { href: 'home.html', icon: icon('home', 'Início'), title: 'Painel', sub: 'Hoje' },
    { href: 'vendas.html', icon: icon('sales', 'Vendas'), title: 'Vendas', sub: 'Pedidos' },
    { href: 'produtos.html', icon: icon('cupcake', 'Produtos'), title: 'Produtos', sub: 'Cardápio' },
    { href: 'estoque.html', icon: icon('box', 'Estoque'), title: 'Estoque', sub: 'Controle' },
    { href: 'relatorios.html', icon: icon('chart', 'Relatórios'), title: 'Relatórios', sub: 'Análises' }
  ];

  function getMenuOrder() {
    try {
      const raw = localStorage.getItem(MENU_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_MENU_ORDER];
    } catch (_error) {
      return [...DEFAULT_MENU_ORDER];
    }
  }

  function saveMenuOrder(order = []) {
    localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(order));
  }

  function sortMenuLinks(links = []) {
    const order = getMenuOrder();
    return [...links].sort((a, b) => {
      const aHref = a.getAttribute('href') || '';
      const bHref = b.getAttribute('href') || '';
      const aIndex = order.indexOf(aHref);
      const bIndex = order.indexOf(bHref);
      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;
      return safeA - safeB;
    });
  }

  function enhanceSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const existingLabels = nav.querySelectorAll('.nav-group-label');
    existingLabels.forEach((entry) => entry.remove());

    const links = Array.from(nav.querySelectorAll('a.nav-item'));
    const sortedLinks = sortMenuLinks(links);
    const groups = {
      principal: 'Painel',
      operacao: 'Operação',
      gestao: 'Gestão',
      sistema: 'Sistema'
    };

    sortedLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const meta = NAV_META[href] || { icon: '•', label: link.textContent.trim(), sub: '', group: 'principal' };
      link.dataset.navKey = href.replace('.html', '');
      link.dataset.navHref = href;
      link.innerHTML = `
        <span class="nav-item-icon" aria-hidden="true">${meta.icon}</span>
        <span class="nav-item-copy">
          <strong>${meta.label}</strong>
          <small>${meta.sub}</small>
        </span>
      `;
      nav.appendChild(link);
    });

    let lastGroup = null;
    Array.from(nav.querySelectorAll('a.nav-item')).forEach((link) => {
      const href = link.getAttribute('href') || '';
      const meta = NAV_META[href] || { group: 'principal' };
      if (meta.group !== lastGroup) {
        const label = document.createElement('div');
        label.className = 'nav-group-label';
        label.textContent = groups[meta.group] || 'Menu';
        nav.insertBefore(label, link);
        lastGroup = meta.group;
      }
    });

    let organizer = document.getElementById('husky-menu-organizer');
    if (!organizer) {
      organizer = document.createElement('button');
      organizer.type = 'button';
      organizer.id = 'husky-menu-organizer';
      organizer.className = 'btn btn-secondary btn-full husky-menu-organizer';
      organizer.textContent = 'Organizar menu';
      document.querySelector('.sidebar-bottom')?.prepend(organizer);
      organizer.addEventListener('click', () => {
        const editing = nav.classList.toggle('is-reordering');
        organizer.textContent = editing ? 'Concluir organização' : 'Organizar menu';
        nav.querySelectorAll('a.nav-item').forEach((link) => {
          link.draggable = editing;
        });
      });
    }

    let draggedHref = '';
    nav.querySelectorAll('a.nav-item').forEach((link) => {
      link.addEventListener('dragstart', (event) => {
        draggedHref = link.getAttribute('href') || '';
        event.dataTransfer?.setData('text/plain', draggedHref);
        link.classList.add('is-dragging');
      });
      link.addEventListener('dragend', () => {
        link.classList.remove('is-dragging');
      });
      link.addEventListener('dragover', (event) => {
        if (!nav.classList.contains('is-reordering')) return;
        event.preventDefault();
      });
      link.addEventListener('drop', (event) => {
        if (!nav.classList.contains('is-reordering')) return;
        event.preventDefault();
        const targetHref = link.getAttribute('href') || '';
        const order = getMenuOrder().filter(Boolean);
        const from = order.indexOf(draggedHref);
        const to = order.indexOf(targetHref);
        if (from === -1 || to === -1 || from === to) return;
        order.splice(to, 0, order.splice(from, 1)[0]);
        saveMenuOrder(order);
        enhanceSidebar();
      });
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
            <span class="husky-workspace-tab__icon">${item.icon}</span>
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

  let refreshQueued = false;

  function queueRefreshWorkspace() {
    if (refreshQueued) return;
    refreshQueued = true;

    const runner = () => {
      refreshQueued = false;
      refreshWorkspace();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(runner);
      return;
    }

    window.setTimeout(runner, 16);
  }

  onReady(() => {
    queueRefreshWorkspace();
    ensureBodyFocusState('primary');

    window.addEventListener('resize', () => {
      if (!isCompact()) {
        document.body.classList.remove('mobile-filters-collapsed');
      } else {
        document.body.classList.add('mobile-filters-collapsed');
      }
      queueRefreshWorkspace();
    });

    window.addEventListener('orientationchange', queueRefreshWorkspace);
    window.addEventListener('husky:state-changed', queueRefreshWorkspace);
    window.addEventListener('husky:settings-changed', queueRefreshWorkspace);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        queueRefreshWorkspace();
      }
    });
  });
})();

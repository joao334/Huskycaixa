(() => {
  'use strict';

  const APP_NAME = 'Husky Confeitaria';
  const APP_VERSION = '1.2.0';
  const STORAGE_PREFIX = 'husky_system';
  const LOCAL_SESSION_KEY = 'husky_local_auth_session';
  const LOCAL_USERS_KEY = 'husky_local_auth_users';
  const REMEMBER_KEY = 'husky_remembered_user';
  const ACCESS_MIGRATION_KEY = 'husky_access_reset_v4';
  const STATE_CHANGED_EVENT = 'husky:state-changed';
  const SETTINGS_CHANGED_EVENT = 'husky:settings-changed';

  const defaultSettings = {
    company: {
      name: 'Husky Confeitaria',
      tradeName: 'Husky Confeitaria',
      phone: '11988456865',
      email: '',
      instagram: '@huskyconfeiteiro',
      address: ''
    },
    visual: {
      themeMode: 'husky-default',
      accentStyle: 'original',
      enablePatternBackground: true,
      showMascotDashboard: true
    },
    print: {
      receiptType: 'comprovante',
      printerSize: '80mm',
      printCompanyData: true,
      printLogo: true,
      printQrcodePix: false,
      autoPrintAfterSale: false,
      receiptFooterMessage: 'Obrigada pela preferência.'
    },
    security: {
      enableLoginProtection: true,
      enable2FA: false,
      rememberLastUser: true,
      logUserActions: true,
      sessionTimeout: 60,
      passwordPolicy: 'basic'
    },
    cloud: {
      provider: 'supabase',
      projectName: '',
      apiKey: '',
      url: '',
      autoSync: true,
      offlineCache: true,
      connected: false,
      lastSyncAt: null
    },
    backup: {
      frequency: 'manual',
      location: 'local',
      lastBackupAt: null
    },
    business: {
      pixKey: '',
      documentLabel: 'Recibo de venda',
      legalFooter: 'Documento gerado pelo sistema. Não substitui NF-e/NFC-e oficial.',
      defaultSalesChannel: 'Loja',
      defaultDeliveryType: 'Retirada'
    },
    fiscal: {
      ie: '',
      im: '',
      regime: 'MEI',
      series: '1',
      nextInvoiceNumber: '1',
      issueInvoiceNotice: true
    },
    integrations: {
      ifood: {
        enabled: false,
        environment: 'sandbox',
        merchantId: '',
        clientId: '',
        token: '',
        storeName: '',
        webhookSecret: '',
        pollingMinutes: 5,
        lastImportAt: null
      }
    }
  };

  const defaultState = {
    settings: defaultSettings,
    users: [
      {
        id: crypto.randomUUID(),
        name: 'Administrador',
        email: 'admin@husky.com',
        role: 'Administrador',
        status: 'Ativo',
        avatar: 'assets/img/avatar-user.png',
        lastAccess: null
      }
    ],
    currentUser: null,
    products: [],
    sales: [],
    expenses: [],
    stockMovements: [],
    customers: [],
    proofs: [],
    proofLogs: [],
    logs: []
  };

  const selectors = {
    sidebar: '#sidebar',
    mobileMenuButton: '#mobile-menu-btn',
    topbarSyncStatus: '#topbar-sync-status',
    sidebarCloudStatus: '#sidebar-cloud-status',
    loggedUserName: '#logged-user-name',
    loggedUserRole: '#logged-user-role',
    operatorAvatar: '.operator-avatar'
  };

  const HuskyApp = {
    APP_NAME,
    APP_VERSION,
    STORAGE_PREFIX,

    init() {
      this.cacheDom();
      this.ensureBaseState();
      this.migrateLegacyAccessData();
      this.syncUsersFromAuthStorage();
      this.applySettingsToUI();
      this.injectSidebarOverlay();
      this.bindGlobalEvents();
      this.bindStorageSync();
      this.refreshShell();
      this.setCurrentDateDefaults();
      this.registerAutoFields();
      this.markActiveLinksByPath();
      this.log('Aplicação inicializada.');
    },

    toggleThemeMode() {
  const current = this.getSettings?.().visual?.themeMode || 'husky-default';
  const next = current === 'dark' ? 'husky-default' : 'dark';

  this.updateSettings({
    visual: {
      ...this.getSettings().visual,
      themeMode: next
    }
  });

  this.applySettingsToUI();
  this.showToast(
    next === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.',
    'success'
  );
},

    cacheDom() {
      this.dom = {
        body: document.body,
        html: document.documentElement,
        sidebar: document.querySelector(selectors.sidebar),
        mobileMenuButton: document.querySelector(selectors.mobileMenuButton),
        topbarSyncStatus: document.querySelector(selectors.topbarSyncStatus),
        sidebarCloudStatus: document.querySelector(selectors.sidebarCloudStatus),
        loggedUserName: document.querySelector(selectors.loggedUserName),
        loggedUserRole: document.querySelector(selectors.loggedUserRole),
        operatorAvatar: document.querySelector(selectors.operatorAvatar),
        sidebarOverlay: document.getElementById('sidebar-overlay')
      };
    },

    bindGlobalEvents() {
      this.dom.mobileMenuButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleSidebar();
      });

      window.addEventListener('resize', () => {
        });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.closeSidebar();
        }
      });

      document.addEventListener('click', (event) => {
        const target = event.target;

        const logoutTrigger = target.closest('[data-action="logout"], #btn-logout');
        if (logoutTrigger) {
          event.preventDefault();
          this.logout();
          return;
        }

        const copyTrigger = target.closest('[data-copy-text]');
        if (copyTrigger) {
          this.copyText(copyTrigger.getAttribute('data-copy-text'));
          return;
        }

        const themeTrigger = target.closest('[data-action="toggle-theme"], #btn-toggle-theme');
if (themeTrigger) {
  event.preventDefault();
  this.toggleThemeMode();
  return;
}

        if (target.closest('.sidebar .nav-item')) {
          this.closeSidebar();
        }
      });

      if (this.dom.sidebar) {
        this.dom.sidebar.addEventListener('click', (event) => {
          const target = event.target.closest('a, button');
          if (!target) return;

          if (target.classList.contains('nav-item')) {
            setTimeout(() => this.closeSidebar(), 180);
          }
        });

        this.dom.sidebar.addEventListener('touchend', (event) => {
          const target = event.target.closest('a, button');
          if (!target) return;

          if (target.classList.contains('nav-item')) {
            setTimeout(() => this.closeSidebar(), 180);
          }
        });
      }

      window.addEventListener(STATE_CHANGED_EVENT, () => {
        this.refreshShell();
      });
    },

    bindStorageSync() {
      window.addEventListener('storage', (event) => {
        if (event.key === this.getStorageKey('state')) {
          this.refreshShell();
          this.dispatchStateChanged(this.getAppState());
        }
      });
    },

    injectSidebarOverlay() {
      if (document.getElementById('sidebar-overlay')) {
        this.dom.sidebarOverlay = document.getElementById('sidebar-overlay');
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';

      document.body.appendChild(overlay);
      this.dom.sidebarOverlay = overlay;
    },

    toggleSidebar() {
      if (!this.dom.sidebar) return;

      const isOpen = this.dom.sidebar.classList.contains('is-open');
      if (isOpen) {
        this.closeSidebar();
      } else {
        this.openSidebar();
      }
    },

    openSidebar() {
      if (!this.dom.sidebar) return;
      this.dom.sidebar.classList.add('is-open');
      this.dom.sidebar.style.pointerEvents = 'auto';
      this.dom.sidebar.style.zIndex = '9999';
      document.body.style.overflow = 'hidden';
    },

    closeSidebar() {
      this.dom.sidebar?.classList.remove('is-open');

      if (this.dom.sidebar) {
        this.dom.sidebar.style.pointerEvents = '';
        this.dom.sidebar.style.zIndex = '';
      }

      document.body.style.overflow = '';
    },

    ensureOnlineOrdersNavLink() {
      const onlineOrdersLink = document.querySelector('.nav-item[href="pedidos-online.html"]');
      if (onlineOrdersLink) {
        const listItem = onlineOrdersLink.closest('li, .nav-group, .nav-entry');
        if (listItem && listItem !== onlineOrdersLink) {
          listItem.remove();
        } else {
          onlineOrdersLink.remove();
        }
      }
    },

    markActiveLinksByPath() {
      this.ensureOnlineOrdersNavLink();
      const currentFile = window.location.pathname.split('/').pop() || 'index.html';
      const navLinks = document.querySelectorAll('.nav-item[href]');

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href === currentFile) {
          link.classList.add('active');
        } else if (!link.classList.contains('active')) {
          link.classList.remove('active');
        }
      });
    },

    ensureBaseState() {
      const existing = this.getStorage('state');

      if (!existing) {
        this.setStorage('state', this.deepClone(defaultState));
        return;
      }

      const migrated = this.deepClone(existing);

      if (Array.isArray(migrated.clients) && !Array.isArray(migrated.customers)) {
        migrated.customers = [...migrated.clients];
      }

      const merged = this.deepMerge(this.deepClone(defaultState), migrated);
      this.setStorage('state', merged);
    },

    migrateLegacyAccessData() {
      const shouldReset = Boolean(window.HUSKY_RESET_ACCESS_ON_UPGRADE);
      const alreadyMigrated = localStorage.getItem(ACCESS_MIGRATION_KEY) === 'done';

      if (!shouldReset || alreadyMigrated) {
        return;
      }

      const adminUser = {
        id: crypto.randomUUID(),
        name: 'Administrador',
        email: 'admin@husky.com',
        role: 'Administrador',
        status: 'Ativo',
        avatar: 'assets/img/avatar-user.png',
        lastAccess: null,
        domain: '',
        notes: '',
        permissions: {
          canManageUsers: true,
          canViewFinancial: true
        },
        passwordHash: '1450575459',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const state = this.getAppState();
        state.users = [
          {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            status: adminUser.status,
            avatar: adminUser.avatar,
            lastAccess: null,
            domain: '',
            notes: '',
            permissions: {
              canManageUsers: true,
              canViewFinancial: true
            }
          }
        ];
        state.currentUser = null;
        this.setStorage('state', state);

        localStorage.setItem(this.getStorageKey('auth_users'), JSON.stringify([adminUser]));
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([adminUser]));
        localStorage.removeItem(this.getStorageKey('auth_session'));
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.setItem(ACCESS_MIGRATION_KEY, 'done');
      } catch (error) {
        console.error('[HuskyApp] erro ao limpar acessos antigos', error);
      }
    },

    refreshShell() {
      this.applySettingsToUI();
      this.setPageUser();
      this.setCloudStatus();
      this.ensureOnlineOrdersNavLink();
      this.markActiveLinksByPath();
    },

    getAppState() {
      return this.getStorage('state') || this.deepClone(defaultState);
    },

    setAppState(nextState) {
      const safeState = this.deepMerge(this.deepClone(defaultState), nextState || {});
      this.setStorage('state', safeState);
      this.refreshShell();
      this.dispatchStateChanged(safeState);
      return safeState;
    },

    updateAppState(updater) {
      const current = this.deepClone(this.getAppState());
      const next = typeof updater === 'function' ? updater(current) : current;
      return this.setAppState(next);
    },

    dispatchStateChanged(state) {
      window.dispatchEvent(
        new CustomEvent(STATE_CHANGED_EVENT, {
          detail: { state: this.deepClone(state) }
        })
      );
    },

    dispatchSettingsChanged(settings) {
      window.dispatchEvent(
        new CustomEvent(SETTINGS_CHANGED_EVENT, {
          detail: { settings: this.deepClone(settings) }
        })
      );
    },

    getSettings() {
      return this.getAppState().settings || this.deepClone(defaultSettings);
    },

    updateSettings(partialSettings) {
      const nextState = this.updateAppState((state) => {
        state.settings = this.deepMerge(
          state.settings || this.deepClone(defaultSettings),
          partialSettings
        );
        return state;
      });

      this.dispatchSettingsChanged(nextState.settings);
      return nextState.settings;
    },

    applySettingsToUI() {
      const settings = this.getSettings();
      document.title = `${settings.company?.tradeName || APP_NAME} | ${this.getPageTitleFallback()}`;

      if (this.dom.body) {
        this.dom.body.dataset.themeMode = settings.visual?.themeMode || 'husky-default';
        this.dom.body.dataset.accentStyle = settings.visual?.accentStyle || 'original';
      }

      document.querySelectorAll('.app-pattern').forEach((el) => {
        el.style.display = settings.visual?.enablePatternBackground ? '' : 'none';
      });
    },

    getPageTitleFallback() {
      const h1 = document.querySelector('.page-heading h1');
      return h1?.textContent?.trim() || 'Sistema';
    },

    syncUsersFromAuthStorage() {
  const authUsers = this.getStorage('auth_users');
  if (!Array.isArray(authUsers) || !authUsers.length) return;

  const nextState = this.updateAppState((state) => {
    const currentUsers = Array.isArray(state.users) ? state.users : [];
    const mergedUsers = [...currentUsers];

    authUsers.forEach((authUser) => {
      const index = mergedUsers.findIndex(
        (entry) => entry.id === authUser.id || entry.email === authUser.email
      );

      const existingUser = index >= 0 ? mergedUsers[index] : null;

      const normalized = {
        id: authUser.id || existingUser?.id || crypto.randomUUID(),
        name: authUser.name || existingUser?.name || 'Usuário',
        email: authUser.email || existingUser?.email || '',
        role: authUser.role || existingUser?.role || 'Operacional',
        status: authUser.status || existingUser?.status || 'Ativo',

        /* AQUI ESTÁ A CORREÇÃO */
        avatar:
          authUser.avatar ||
          authUser.avatar_url ||
          existingUser?.avatar ||
          'assets/img/avatar-user.png',

        lastAccess: authUser.lastAccess || existingUser?.lastAccess || null,
        domain: authUser.domain || existingUser?.domain || '',
        notes: authUser.notes || existingUser?.notes || '',
        permissions: {
          canManageUsers:
            authUser.permissions?.canManageUsers ??
            existingUser?.permissions?.canManageUsers ??
            false,
          canViewFinancial:
            authUser.permissions?.canViewFinancial ??
            existingUser?.permissions?.canViewFinancial ??
            true
        }
      };

      if (index >= 0) {
        mergedUsers[index] = {
          ...mergedUsers[index],
          ...normalized,
          permissions: {
            ...mergedUsers[index].permissions,
            ...normalized.permissions
          }
        };
      } else {
        mergedUsers.push(normalized);
      }
    });

    state.users = mergedUsers;

    if (state.currentUser) {
      const currentMatch = mergedUsers.find(
        (user) =>
          user.id === state.currentUser.id ||
          String(user.email || '').toLowerCase() ===
            String(state.currentUser.email || '').toLowerCase()
      );

      if (currentMatch) {
        state.currentUser = {
          ...state.currentUser,
          ...currentMatch
        };
      }
    }

    return state;
  });

  return nextState.users;
},

    setPageUser() {
      const state = this.getAppState();
      const fallbackUser = (state.users || []).find((user) => user.status !== 'Inativo') || state.users?.[0] || null;
      const currentUser = state.currentUser || fallbackUser;

      if (currentUser) {
        if (this.dom.loggedUserName) this.dom.loggedUserName.textContent = currentUser.name || 'Administrador';
        if (this.dom.loggedUserRole) this.dom.loggedUserRole.textContent = currentUser.role || 'Gestão / Caixa';
        if (this.dom.operatorAvatar) {
          this.dom.operatorAvatar.src = currentUser.avatar || 'assets/img/avatar-user.png';
        }
      }
    },

    setCloudStatus() {
      const settings = this.getSettings();
      const cloud = settings.cloud || {};

      const text = cloud.connected
        ? `Conectada${cloud.lastSyncAt ? ` • Última sincronização ${this.formatDateTime(cloud.lastSyncAt)}` : ''}`
        : 'Pronto para sincronização';

      if (this.dom.topbarSyncStatus) this.dom.topbarSyncStatus.textContent = text;
      if (this.dom.sidebarCloudStatus) this.dom.sidebarCloudStatus.textContent = text;

      document.querySelectorAll('#login-cloud-status').forEach((element) => {
        element.textContent = cloud.connected ? 'Conectada' : 'Pronta';
      });
    },

    registerAutoFields() {
      const currencyFields = document.querySelectorAll('[data-mask="currency"]');
      currencyFields.forEach((field) => {
        field.addEventListener('blur', () => {
          const numericValue = this.toNumber(field.value);
          field.value = numericValue ? this.formatCurrency(numericValue) : '';
        });
      });
    },

   setCurrentDateDefaults() {
  const today = this.todayISO();
  const nowTime = this.currentTimeHHMM();

  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (input.value || input.dataset.autofill === 'false') return;

    const id = String(input.id || '').toLowerCase();

    /* nunca preencher filtros automaticamente */
    const isFilterField =
      id.includes('filter') ||
      id.includes('start') ||
      id.includes('end') ||
      id.includes('periodo') ||
      id.includes('period');

    /* só preencher campos operacionais reais */
    const canAutoFill =
      id === 'sale-date' ||
      id === 'expense-date' ||
      id === 'proof-date' ||
      id.includes('birthday') ||
      id.includes('due');

    if (canAutoFill && !isFilterField) {
      input.value = today;
    }
  });

  document.querySelectorAll('input[type="time"]').forEach((input) => {
    if (!input.value && input.dataset.autofill !== 'false') {
      input.value = nowTime;
    }
  });
},

    getCollection(name) {
      const state = this.getAppState();
      const value = state?.[name];
      return Array.isArray(value) ? value : [];
    },

    setCollection(name, list) {
      return this.updateAppState((state) => {
        state[name] = Array.isArray(list) ? list : [];
        return state;
      });
    },

    addToCollection(name, item, idField = 'id') {
      return this.updateAppState((state) => {
        const list = Array.isArray(state[name]) ? state[name] : [];
        state[name] = this.upsertItem(list, item, idField);
        return state;
      });
    },

    deleteFromCollection(name, id) {
      return this.updateAppState((state) => {
        const list = Array.isArray(state[name]) ? state[name] : [];
        state[name] = this.removeById(list, id);
        return state;
      });
    },

    formatCurrency(value) {
      return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    },

    formatNumber(value, decimals = 0) {
      return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    },

    formatDate(value) {
      if (!value) return '-';

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        const parts = String(value).split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return String(value);
      }

      return date.toLocaleDateString('pt-BR');
    },

    formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);

      return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    },

    todayISO() {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().slice(0, 10);
    },

    currentTimeHHMM() {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    },

    createId(prefix = 'ID') {
      const stamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 900 + 100);
      return `${prefix}-${stamp}${random}`;
    },

    createOrderNumber(prefix = 'PED') {
      const state = this.getAppState();
      const total = (state.sales?.length || 0) + 1;
      return `${prefix}-${String(total).padStart(4, '0')}`;
    },

    toNumber(value) {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (value === null || value === undefined || value === '') return 0;

      let normalized = String(value).trim().replace(/\s+/g, '').replace(/R\$/gi, '');
      if (!normalized) return 0;

      const hasComma = normalized.includes(',');
      const hasDot = normalized.includes('.');

      if (hasComma && hasDot) {
        const lastComma = normalized.lastIndexOf(',');
        const lastDot = normalized.lastIndexOf('.');
        const decimalSeparator = lastComma > lastDot ? ',' : '.';
        const thousandsSeparator = decimalSeparator == ',' ? '.' : ',';
        normalized = normalized.split(thousandsSeparator).join('');
        if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
      } else if (hasComma) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else if (hasDot) {
        const parts = normalized.split('.');
        if (parts.length > 2) {
          const decimal = parts.pop();
          normalized = parts.join('') + '.' + decimal;
        }
      }

      normalized = normalized.replace(/[^\d.-]/g, '');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    prepareDecimalInputs(scope = document) {
      const selectors = [
        '#proof-amount',
        '#expense-value',
        '#expense-item-unit-value',
        '#stock-unit-cost',
        '#stock-total-cost',
        '#product-sale-price',
        '#product-cost-price',
        '#sale-discount',
        '#sale-extra-fee',
        '#sale-shipping-fee'
      ];

      selectors.forEach((selector) => {
        scope.querySelectorAll(selector).forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          input.setAttribute('type', 'text');
          input.setAttribute('inputmode', 'decimal');
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('spellcheck', 'false');
        });
      });
    },

    sum(list = [], mapper = (item) => item) {
      return list.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);
    },

    calculateMargin(price, cost) {
      const salePrice = this.toNumber(price);
      const costPrice = this.toNumber(cost);
      if (salePrice <= 0) return 0;
      return ((salePrice - costPrice) / salePrice) * 100;
    },

    getStorageKey(key) {
      return `${STORAGE_PREFIX}:${key}`;
    },

    getStorage(key) {
      try {
        const raw = localStorage.getItem(this.getStorageKey(key));
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.error(`[${APP_NAME}] erro ao ler storage`, error);
        return null;
      }
    },

    setStorage(key, value) {
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
      } catch (error) {
        console.error(`[${APP_NAME}] erro ao salvar storage`, error);
      }
    },

    removeStorage(key) {
      localStorage.removeItem(this.getStorageKey(key));
    },

    deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    },

    deepMerge(target, source) {
      if (!source || typeof source !== 'object') return target;
      const output = Array.isArray(target) ? [...target] : { ...target };

      Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = output[key];

        if (Array.isArray(sourceValue)) {
          output[key] = [...sourceValue];
        } else if (sourceValue && typeof sourceValue === 'object') {
          output[key] = this.deepMerge(
            targetValue && typeof targetValue === 'object' ? targetValue : {},
            sourceValue
          );
        } else {
          output[key] = sourceValue;
        }
      });

      return output;
    },

    findById(list = [], id) {
      return list.find((item) => item.id === id) || null;
    },

    removeById(list = [], id) {
      return list.filter((item) => item.id !== id);
    },

    upsertItem(list = [], item, idField = 'id') {
      const index = list.findIndex((entry) => entry?.[idField] === item?.[idField]);
      if (index >= 0) {
        const updated = [...list];
        updated[index] = item;
        return updated;
      }
      return [item, ...list];
    },

    normalizeText(text) {
      return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    },

    includesText(haystack, needle) {
      return this.normalizeText(haystack).includes(this.normalizeText(needle));
    },

    showToast(message, type = 'info') {
      let container = document.getElementById('husky-toast-container');

      if (!container) {
        container = document.createElement('div');
        container.id = 'husky-toast-container';
        container.style.position = 'fixed';
        container.style.right = '18px';
        container.style.bottom = '18px';
        container.style.display = 'grid';
        container.style.gap = '10px';
        container.style.zIndex = '200';
        container.style.maxWidth = 'min(360px, calc(100vw - 24px))';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.padding = '14px 16px';
      toast.style.borderRadius = '16px';
      toast.style.color = '#fff';
      toast.style.boxShadow = '0 16px 30px rgba(0,0,0,0.18)';
      toast.style.fontWeight = '700';
      toast.style.lineHeight = '1.5';
      toast.style.background = this.getToastColor(type);
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = '0.22s ease';

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 220);
      }, 2600);
    },

    getToastColor(type) {
      switch (type) {
        case 'success':
          return 'linear-gradient(180deg, #2f8b57, #236a41)';
        case 'warning':
          return 'linear-gradient(180deg, #c08a2b, #936617)';
        case 'danger':
          return 'linear-gradient(180deg, #bf4b4b, #8f3434)';
        default:
          return 'linear-gradient(180deg, #2f6f9f, #1f4f73)';
      }
    },

    confirmAction(message) {
      return window.confirm(message);
    },

    copyText(text) {
      if (!navigator.clipboard) {
        this.showToast('Área de transferência não disponível.', 'warning');
        return;
      }

      navigator.clipboard
        .writeText(String(text || ''))
        .then(() => this.showToast('Copiado com sucesso.', 'success'))
        .catch(() => this.showToast('Não foi possível copiar.', 'danger'));
    },

    downloadJSON(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },

    exportBackup() {
      const state = this.getAppState();
      const filename = `backup_husky_${this.todayISO()}.json`;
      this.downloadJSON(filename, state);

      this.updateSettings({
        backup: {
          ...this.getSettings().backup,
          lastBackupAt: new Date().toISOString()
        }
      });

      this.showToast('Backup exportado com sucesso.', 'success');
    },

    async logout() {
      try {
        if (window.HuskySupabase?.auth) {
          await window.HuskySupabase.auth.signOut();
        }
      } catch (error) {
        console.error('[HuskyApp] erro ao encerrar sessão no Supabase', error);
      }

      try {
        const state = this.getAppState();
        state.currentUser = null;
        this.setAppState(state);
      } catch (error) {
        console.error('[HuskyApp] erro ao limpar estado local', error);
      }

      try {
        localStorage.removeItem(this.getStorageKey('auth_session'));
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem('husky_auth_message');
      } catch (error) {
        console.error('[HuskyApp] erro ao limpar sessão local', error);
      }

      window.location.replace('index.html');
    },

    log(message, meta = {}) {
      const settings = this.getSettings();
      if (!settings.security?.logUserActions) return;

      const payload = {
        id: crypto.randomUUID(),
        message,
        meta,
        createdAt: new Date().toISOString(),
        page: window.location.pathname.split('/').pop() || 'index.html'
      };

      const logs = this.getStorage('logs') || [];
      logs.unshift(payload);
      this.setStorage('logs', logs.slice(0, 300));
    },

    query(selector, scope = document) {
      return scope.querySelector(selector);
    },

    queryAll(selector, scope = document) {
      return Array.from(scope.querySelectorAll(selector));
    }
  };


  HuskyApp.commandState = {
    items: [],
    filtered: [],
    isOpen: false,
    activeIndex: 0
  };

  HuskyApp.getQuickActions = function () {
    return [
      {
        id: 'go-home',
        icon: '🏠',
        title: 'Ir para Início',
        subtitle: 'Painel principal com visão geral da operação.',
        keywords: 'home inicio dashboard painel',
        handler: () => window.location.assign('home.html')
      },
      {
        id: 'go-sales',
        icon: '💸',
        title: 'Nova venda / Vendas',
        subtitle: 'Abrir o caixa rápido e registrar pedidos.',
        keywords: 'vendas venda caixa pedido pedidos',
        handler: () => window.location.assign('vendas.html')
      },
      {
        id: 'go-products',
        icon: '🧁',
        title: 'Produtos',
        subtitle: 'Gerenciar catálogo, categorias e preços.',
        keywords: 'produtos catalogo cardapio doces',
        handler: () => window.location.assign('produtos.html')
      },
      {
        id: 'go-stock',
        icon: '📦',
        title: 'Estoque',
        subtitle: 'Consultar entradas, saídas e níveis de estoque.',
        keywords: 'estoque insumos entradas saidas',
        handler: () => window.location.assign('estoque.html')
      },
      {
        id: 'go-expenses',
        icon: '🧾',
        title: 'Despesas',
        subtitle: 'Controlar custos fixos e variáveis.',
        keywords: 'despesas gastos custos financeiro',
        handler: () => window.location.assign('despesas.html')
      },
      {
        id: 'go-reports',
        icon: '📈',
        title: 'Relatórios',
        subtitle: 'Visualizar faturamento, lucro e desempenho.',
        keywords: 'relatorios analise desempenho lucro',
        handler: () => window.location.assign('relatorios.html')
      },
      {
        id: 'go-clients',
        icon: '👥',
        title: 'Clientes',
        subtitle: 'Cadastrar e acompanhar relacionamento.',
        keywords: 'clientes cadastro recorrencia vip',
        handler: () => window.location.assign('clientes.html')
      },
      {
        id: 'go-proofs',
        icon: '✅',
        title: 'Comprovantes',
        subtitle: 'Conferir comprovantes Pix e pendências.',
        keywords: 'comprovantes pix anexos pagamento',
        handler: () => window.location.assign('comprovantes.html')
      },
      {
        id: 'go-settings',
        icon: '⚙️',
        title: 'Configurações',
        subtitle: 'Personalizar empresa, backup e usuários.',
        keywords: 'configuracoes empresa backup usuarios sistema',
        handler: () => window.location.assign('configuracoes.html')
      },
      {
        id: 'toggle-theme',
        icon: '🌙',
        title: 'Alternar tema',
        subtitle: 'Trocar entre modo claro e escuro.',
        keywords: 'tema dark claro aparencia',
        handler: () => this.toggleThemeMode()
      },
      {
        id: 'export-backup',
        icon: '⬇️',
        title: 'Exportar backup',
        subtitle: 'Baixar uma cópia completa dos dados atuais.',
        keywords: 'backup exportar baixar seguranca',
        handler: () => this.exportBackup()
      }
    ];
  };

  HuskyApp.injectWorkspaceEnhancements = function () {
    if (this.enhancementsReady) {
      this.updateThemeButtons();
      this.renderTopbarPills();
      this.injectPageFooter();
      return;
    }

    this.enhancementsReady = true;
    this.ensureCommandPalette();
    this.ensureFloatingButton();
    this.bindWorkspaceShortcuts();
    this.updateThemeButtons();
    this.renderTopbarPills();
    this.injectPageFooter();
  };

  HuskyApp.ensureCommandPalette = function () {
    if (!document.body || document.getElementById('husky-command-backdrop')) return;
    if (!document.body.classList.contains('app-page-body')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'husky-command-backdrop';
    wrapper.className = 'husky-command-backdrop';
    wrapper.innerHTML = `
      <div class="husky-command" role="dialog" aria-modal="true" aria-label="Atalhos rápidos">
        <div class="husky-command-header">
          <input id="husky-command-input" class="husky-command-input" type="text" placeholder="Buscar páginas, ações e atalhos..." autocomplete="off" />
        </div>
        <div class="husky-command-meta">
          <span>Ambiente rápido da Husky • navegue por tudo em segundos</span>
          <span><span class="husky-kbd">Enter</span> abrir &nbsp; <span class="husky-kbd">Esc</span> fechar</span>
        </div>
        <div id="husky-command-list" class="husky-command-list"></div>
      </div>
    `;

    document.body.appendChild(wrapper);

    wrapper.addEventListener('click', (event) => {
      if (event.target === wrapper) {
        this.closeCommandPalette();
      }
    });

    const input = wrapper.querySelector('#husky-command-input');
    input?.addEventListener('input', () => this.renderCommandPalette(input.value));
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const first = this.commandState.filtered?.[0];
        if (first) {
          this.runQuickAction(first.id);
        }
      }
    });

    this.commandState.items = this.getQuickActions();
    this.renderCommandPalette('');
  };

  HuskyApp.ensureFloatingButton = function () {
    if (!document.body || !document.body.classList.contains('app-page-body')) return;
    if (document.getElementById('husky-fab')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'husky-fab';
    button.className = 'husky-fab';
    button.textContent = 'Atalhos';
    button.setAttribute('aria-label', 'Abrir atalhos rápidos');
    button.addEventListener('click', () => this.openCommandPalette());
    document.body.appendChild(button);
  };

  HuskyApp.bindWorkspaceShortcuts = function () {
    if (this.shortcutsBound) return;
    this.shortcutsBound = true;

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
        event.preventDefault();
        this.toggleCommandPalette();
        return;
      }

      if (this.commandState.isOpen && event.key === 'Escape') {
        event.preventDefault();
        this.closeCommandPalette();
        return;
      }

      if (!isTyping && event.key === '?' && document.body.classList.contains('app-page-body')) {
        event.preventDefault();
        this.openCommandPalette();
      }
    });
  };

  HuskyApp.renderCommandPalette = function (query = '') {
    const list = document.getElementById('husky-command-list');
    if (!list) return;

    const safeQuery = this.normalizeText(query || '');
    const items = this.commandState.items || this.getQuickActions();
    const filtered = !safeQuery
      ? items
      : items.filter((item) => {
          const haystack = `${item.title} ${item.subtitle} ${item.keywords || ''}`;
          return this.includesText(haystack, safeQuery);
        });

    this.commandState.filtered = filtered;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <strong>Nenhum atalho encontrado.</strong>
          <p>Tente buscar por vendas, estoque, clientes, relatórios ou backup.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map(
        (item) => `
          <button type="button" class="husky-command-item" data-command-id="${item.id}">
            <span class="husky-command-icon">${item.icon}</span>
            <span class="husky-command-copy">
              <strong>${item.title}</strong>
              <span>${item.subtitle}</span>
            </span>
            <span class="husky-kbd">Enter</span>
          </button>
        `
      )
      .join('');

    list.querySelectorAll('[data-command-id]').forEach((button) => {
      button.addEventListener('click', () => this.runQuickAction(button.getAttribute('data-command-id')));
    });
  };

  HuskyApp.runQuickAction = function (id) {
    const items = this.commandState.items || this.getQuickActions();
    const action = items.find((item) => item.id === id);
    if (!action) return;

    this.closeCommandPalette();
    try {
      action.handler();
    } catch (error) {
      console.error('[HuskyApp] erro ao executar atalho', error);
      this.showToast('Não foi possível executar este atalho.', 'danger');
    }
  };

  HuskyApp.openCommandPalette = function () {
    const backdrop = document.getElementById('husky-command-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('is-open');
    this.commandState.isOpen = true;
    const input = document.getElementById('husky-command-input');
    if (input) {
      input.value = '';
      this.renderCommandPalette('');
      setTimeout(() => input.focus(), 30);
    }
  };

  HuskyApp.closeCommandPalette = function () {
    const backdrop = document.getElementById('husky-command-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    this.commandState.isOpen = false;
  };

  HuskyApp.toggleCommandPalette = function () {
    if (this.commandState.isOpen) {
      this.closeCommandPalette();
    } else {
      this.openCommandPalette();
    }
  };

  HuskyApp.updateThemeButtons = function () {
    const isDark = (this.getSettings?.().visual?.themeMode || 'husky-default') === 'dark';
    document.querySelectorAll('#btn-toggle-theme, .theme-toggle-btn').forEach((button) => {
      button.textContent = isDark ? 'Tema claro' : 'Tema escuro';
      button.setAttribute('aria-label', isDark ? 'Trocar para tema claro' : 'Trocar para tema escuro');
      button.title = 'Alternar aparência';
    });
  };

  HuskyApp.renderTopbarPills = function () {
    if (!document.body.classList.contains('app-page-body')) return;
    const right = document.querySelector('.topbar-right');
    if (!right) return;

    let pills = document.getElementById('husky-topbar-pills');
    if (!pills) {
      pills = document.createElement('div');
      pills.id = 'husky-topbar-pills';
      pills.className = 'husky-topbar-pills';
      right.prepend(pills);
    }

    const isDark = (this.getSettings?.().visual?.themeMode || 'husky-default') === 'dark';
    const today = new Date();
    const formatted = today.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });

    pills.innerHTML = `
      <span class="husky-topbar-pill">📅 ${formatted}</span>
      <span class="husky-topbar-pill">⌘ Ctrl + K</span>
      <span class="husky-topbar-pill">${isDark ? '🌙 Escuro' : '☀️ Claro'}</span>
    `;
  };

  HuskyApp.injectPageFooter = function () {
    if (!document.body.classList.contains('app-page-body')) return;
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) return;

    let footer = document.getElementById('husky-page-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'husky-page-footer';
      footer.className = 'husky-page-footer';
      contentArea.appendChild(footer);
    }

    footer.textContent = `${APP_NAME} • versão ${APP_VERSION} • ambiente elegante e rápido`;
  };

  const __huskyOriginalInit = HuskyApp.init.bind(HuskyApp);
  HuskyApp.init = function () {
    __huskyOriginalInit();
    this.injectWorkspaceEnhancements();
  };

  const __huskyOriginalRefreshShell = HuskyApp.refreshShell.bind(HuskyApp);
  HuskyApp.refreshShell = function () {
    __huskyOriginalRefreshShell();
    this.injectWorkspaceEnhancements();
  };

  const __huskyOriginalLogout = HuskyApp.logout.bind(HuskyApp);
  HuskyApp.logout = async function () {
    try {
      localStorage.removeItem('husky_local_auth_session');
    } catch (error) {
      console.error('[HuskyApp] erro ao limpar sessão local', error);
    }

    return __huskyOriginalLogout();
  };



  HuskyApp.getCurrentPageKey = function () {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    return currentFile.replace(/\.html$/i, '') || 'index';
  };

  HuskyApp.updateThemeMeta = function () {
    const isDark = (this.getSettings?.().visual?.themeMode || 'husky-default') === 'dark';
    const themeColor = isDark ? '#111b27' : '#2f61a5';
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });
    if (document.documentElement) {
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
  };

  HuskyApp.getMobilePrimaryActionConfig = function () {
    const page = this.getCurrentPageKey();
    const map = {
      home: { label: 'Nova venda', icon: '＋', href: 'vendas.html' },
      vendas: { label: 'Nova venda', icon: '＋', selector: '#btn-new-sale-top, #btn-save-sale' },
      produtos: { label: 'Novo produto', icon: '＋', selector: '#btn-new-product-top, #btn-save-product' },
      estoque: { label: 'Movimentar estoque', icon: '＋', selector: '#btn-new-stock-movement-top, #btn-save-stock-movement' },
      despesas: { label: 'Nova despesa', icon: '＋', selector: '#btn-new-expense-top, #btn-save-expense' },
      clientes: { label: 'Novo cliente', icon: '＋', selector: '#btn-new-client-top, #btn-save-client' },
      comprovantes: { label: 'Novo comprovante', icon: '＋', selector: '#btn-new-proof-top, #btn-save-proof' },
      relatorios: { label: 'Gerar relatório', icon: '▣', selector: '#btn-generate-report, #btn-generate-report-hero' },
      configuracoes: { label: 'Salvar ajustes', icon: '✓', selector: '#btn-save-all-settings-top, #btn-save-all-settings-hero' }
    };
    return map[page] || { label: 'Ir para início', icon: '⌂', href: 'home.html' };
  };

  HuskyApp.getUiIcon = function (name, alt = '') {
    return `<img src="assets/img/icons/${name}.svg" alt="${alt}" class="husky-ui-icon" />`;
  };

  HuskyApp.ensureMobileDock = function () {
    if (!document.body || !document.body.classList.contains('app-page-body')) return;

    let dock = document.getElementById('husky-mobile-dock');
    if (!dock) {
      dock = document.createElement('nav');
      dock.id = 'husky-mobile-dock';
      dock.className = 'husky-mobile-dock';
      dock.setAttribute('aria-label', 'Navegação rápida mobile');
      document.body.appendChild(dock);
    }

    const current = this.getCurrentPageKey();
    const items = [
      { href: 'home.html', icon: this.getUiIcon('home', 'Início'), label: 'Início', active: current === 'home' },
      { href: 'vendas.html', icon: this.getUiIcon('sales', 'Vendas'), label: 'Vendas', active: current === 'vendas' },
      { href: 'produtos.html', icon: this.getUiIcon('cupcake', 'Produtos'), label: 'Produtos', active: current === 'produtos' },
      { action: 'menu', icon: '☰', label: 'Menu', active: false }
    ];

    dock.innerHTML = `
      <div class="husky-mobile-dock__grid">
        ${items
          .map((item) => {
            if (item.action === 'menu') {
              return `
                <button type="button" class="husky-mobile-dock__item ${item.active ? 'is-active' : ''}" data-mobile-dock-action="menu">
                  <span class="dock-icon">${item.icon}</span>
                  <span>${item.label}</span>
                </button>
              `;
            }
            return `
              <a href="${item.href}" class="husky-mobile-dock__item ${item.active ? 'is-active' : ''}">
                <span>${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `;
          })
          .join('')}
      </div>
    `;

    dock.querySelector('[data-mobile-dock-action="menu"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.openSidebar();
    });

    let primary = document.getElementById('husky-mobile-primary');
    if (!primary) {
      primary = document.createElement('button');
      primary.type = 'button';
      primary.id = 'husky-mobile-primary';
      primary.setAttribute('aria-label', 'Ação principal desta página');
      document.body.appendChild(primary);
    }

    const config = this.getMobilePrimaryActionConfig();
    primary.innerHTML = `${config.icon} ${config.label}`;
    primary.onclick = (event) => {
      event.preventDefault();
      if (config.selector) {
        const target = document.querySelector(config.selector);
        if (target) {
          target.click();
          if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
      if (config.href) {
        window.location.assign(config.href);
      }
    };
  };

  HuskyApp.syncAdaptiveLayout = function () {
    if (!document.body) return;
    const isMobile = window.innerWidth <= 992;
    const isCompact = window.innerWidth <= 768;
    document.body.dataset.page = this.getCurrentPageKey();
    document.body.classList.toggle('is-mobile-shell', isMobile);
    document.body.classList.toggle('mobile-compact', isCompact);
    this.updateThemeMeta();
    this.ensureMobileDock();
  };

  const __huskyOriginalApplySettingsToUI = HuskyApp.applySettingsToUI.bind(HuskyApp);
  HuskyApp.applySettingsToUI = function () {
    __huskyOriginalApplySettingsToUI();
    this.updateThemeMeta();
    this.syncAdaptiveLayout();
  };

  const __huskyOriginalUpdateThemeButtons = HuskyApp.updateThemeButtons.bind(HuskyApp);
  HuskyApp.updateThemeButtons = function () {
    __huskyOriginalUpdateThemeButtons();
    const isDark = (this.getSettings?.().visual?.themeMode || 'husky-default') === 'dark';
    const compact = window.innerWidth <= 768;
    document.querySelectorAll('#btn-toggle-theme, .theme-toggle-btn').forEach((button) => {
      button.textContent = compact ? (isDark ? '☀️ Claro' : '🌙 Escuro') : (isDark ? 'Tema claro' : 'Tema escuro');
    });
  };

  const __huskyOriginalBindGlobalEvents = HuskyApp.bindGlobalEvents.bind(HuskyApp);
  HuskyApp.bindGlobalEvents = function () {
    __huskyOriginalBindGlobalEvents();
    window.addEventListener('resize', () => this.syncAdaptiveLayout());
    window.addEventListener('orientationchange', () => this.syncAdaptiveLayout());
  };


  HuskyApp.getCloudStorageBucket = function () {
    return 'husky-files';
  };

  HuskyApp.isCloudStorageReady = function () {
    return String(window.HUSKY_AUTH_MODE || 'local').toLowerCase() === 'supabase' && Boolean(window.HuskySupabase?.storage);
  };

  HuskyApp.sanitizeFileName = function (name = 'arquivo') {
    const safe = String(name || 'arquivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return safe || `arquivo-${Date.now()}`;
  };

  HuskyApp.formatFileSize = function (bytes = 0) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 KB';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  };

  HuskyApp.getAttachmentPreviewUrl = function (attachment = null) {
    if (!attachment) return '';
    return attachment.localUrl || attachment.url || attachment.publicUrl || attachment.signedUrl || attachment.dataUrl || attachment.fileDataUrl || '';
  };

  HuskyApp.revokeAttachmentPreview = function (attachment = null) {
    const localUrl = attachment?.localUrl || '';
    if (typeof localUrl === 'string' && localUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(localUrl);
      } catch (error) {
        console.error('[HuskyApp] erro ao revogar preview local', error);
      }
    }
  };

  HuskyApp.prepareLocalFileDraft = async function (file) {
    if (!file) return null;

    const type = file.type || 'application/octet-stream';
    const localUrl = URL.createObjectURL(file);

    return {
      name: file.name,
      type,
      size: file.size || 0,
      uploadedAt: new Date().toISOString(),
      source: 'local-draft',
      localUrl,
      rawFile: file
    };
  };

  HuskyApp.optimizeImageFile = async function (file, { maxWidth = 1800, maxHeight = 1800, quality = 0.82 } = {}) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      return file;
    }

    if ((file.size || 0) <= 2 * 1024 * 1024) {
      return file;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
        img.src = imageUrl;
      });

      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const outputType = ['image/png', 'image/webp'].includes(file.type) ? file.type : 'image/jpeg';

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (result) => resolve(result || file),
          outputType,
          outputType === 'image/png' ? undefined : quality
        );
      });

      URL.revokeObjectURL(imageUrl);

      if (!(blob instanceof Blob)) {
        return file;
      }

      const extension = outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
      const baseName = String(file.name || 'imagem').replace(/\.[^.]+$/, '');
      return new File([blob], `${baseName}${extension}`, { type: outputType });
    } catch (error) {
      console.error('[HuskyApp] erro ao otimizar imagem', error);
      return file;
    }
  };

  HuskyApp.uploadFileToCloud = async function (file, { folder = 'proofs' } = {}) {
    if (!this.isCloudStorageReady()) {
      throw new Error('Storage em nuvem não está disponível.');
    }

    const supabase = window.HuskySupabase;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData?.session;
    if (!session?.user) {
      throw new Error('Faça login na nuvem antes de enviar arquivos.');
    }

    const preparedFile = await this.optimizeImageFile(file);
    const bucket = this.getCloudStorageBucket();
    const safeName = this.sanitizeFileName(file.name);
    const path = `${window.HUSKY_WORKSPACE_ID || 'husky-principal'}/${folder}/${session.user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, preparedFile, {
      upsert: false,
      cacheControl: '3600',
      contentType: preparedFile.type || file.type || 'application/octet-stream'
    });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
      name: file.name,
      type: preparedFile.type || file.type || 'application/octet-stream',
      size: preparedFile.size || file.size || 0,
      uploadedAt: new Date().toISOString(),
      source: 'cloud',
      storageBucket: bucket,
      storagePath: path,
      url: publicData?.publicUrl || ''
    };
  };

  HuskyApp.deleteCloudFile = async function (attachment = null) {
    if (!attachment?.storagePath || !this.isCloudStorageReady()) return;

    try {
      await window.HuskySupabase.storage
        .from(attachment.storageBucket || this.getCloudStorageBucket())
        .remove([attachment.storagePath]);
    } catch (error) {
      console.error('[HuskyApp] erro ao remover arquivo da nuvem', error);
    }
  };

  HuskyApp.isStandaloneApp = function () {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  };

  HuskyApp.isIosDevice = function () {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  };

  HuskyApp.showInstallHelp = function () {};

  HuskyApp.ensureInstallShortcut = function () { const button = document.getElementById('husky-install-shortcut'); if (button) button.remove(); };

  HuskyApp.registerPWA = function () { this.__pwaReady = true; this.deferredInstallPrompt = null; this.ensureInstallShortcut(); };

  const __huskyOriginalInitPWA = HuskyApp.init.bind(HuskyApp);
  HuskyApp.init = function () {
    __huskyOriginalInitPWA();
  };

  const __huskyOriginalRefreshShellInstall = HuskyApp.refreshShell.bind(HuskyApp);
  HuskyApp.refreshShell = function () {
    __huskyOriginalRefreshShellInstall();
  };

  const __huskyOriginalSyncAdaptiveInstall = HuskyApp.syncAdaptiveLayout?.bind(HuskyApp);
  if (__huskyOriginalSyncAdaptiveInstall) {
    HuskyApp.syncAdaptiveLayout = function () {
      __huskyOriginalSyncAdaptiveInstall();
      };
  }

  window.HuskyApp = HuskyApp;
  document.addEventListener('DOMContentLoaded', () => HuskyApp.init());
})();
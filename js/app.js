(() => {
  'use strict';

  const APP_NAME = 'Husky Confeitaria';
  const APP_VERSION = '1.1.0';
  const STORAGE_PREFIX = 'husky_system';
  const STATE_CHANGED_EVENT = 'husky:state-changed';
  const SETTINGS_CHANGED_EVENT = 'husky:settings-changed';

  const defaultSettings = {
    company: {
      name: 'Husky Confeitaria',
      tradeName: 'Husky Confeitaria',
      phone: '',
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
      provider: 'firebase',
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
        operatorAvatar: document.querySelector(selectors.operatorAvatar)
      };
    },

    bindGlobalEvents() {
      this.dom.mobileMenuButton?.addEventListener('click', () => {
        this.toggleSidebar();
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 920) {
          this.closeSidebar();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.closeSidebar();
        }
      });

      document.addEventListener('click', (event) => {
        const target = event.target;

        if (target.matches('[data-action="logout"]')) {
          this.logout();
        }

        if (target.matches('[data-copy-text]')) {
          this.copyText(target.getAttribute('data-copy-text'));
        }
      });

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
      if (document.getElementById('sidebar-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(24, 14, 10, 0.45)';
      overlay.style.backdropFilter = 'blur(2px)';
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      overlay.style.transition = '0.25s ease';
      overlay.style.zIndex = '110';

      overlay.addEventListener('click', () => this.closeSidebar());
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
      if (!this.dom.sidebar || window.innerWidth > 920) return;
      this.dom.sidebar.classList.add('is-open');
      if (this.dom.sidebarOverlay) {
        this.dom.sidebarOverlay.style.opacity = '1';
        this.dom.sidebarOverlay.style.visibility = 'visible';
      }
      document.body.style.overflow = 'hidden';
    },

    closeSidebar() {
      this.dom.sidebar?.classList.remove('is-open');
      if (this.dom.sidebarOverlay) {
        this.dom.sidebarOverlay.style.opacity = '0';
        this.dom.sidebarOverlay.style.visibility = 'hidden';
      }
      document.body.style.overflow = '';
    },

    markActiveLinksByPath() {
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

    refreshShell() {
      this.applySettingsToUI();
      this.setPageUser();
      this.setCloudStatus();
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
          const index = mergedUsers.findIndex((entry) => entry.id === authUser.id || entry.email === authUser.email);
          const normalized = {
            id: authUser.id || crypto.randomUUID(),
            name: authUser.name || 'Usuário',
            email: authUser.email || '',
            role: authUser.role || 'Operacional',
            status: authUser.status || 'Ativo',
            avatar: authUser.avatar || 'assets/img/avatar-user.png',
            lastAccess: authUser.lastAccess || null
          };

          if (index >= 0) {
            mergedUsers[index] = { ...mergedUsers[index], ...normalized };
          } else {
            mergedUsers.push(normalized);
          }
        });

        state.users = mergedUsers;
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
        if (!input.value && input.dataset.autofill !== 'false') {
          const id = input.id || '';
          const canAutoFill = /date|start|end|birthday|due/i.test(id);
          if (canAutoFill) input.value = today;
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
      if (typeof value === 'number') return value;
      if (!value) return 0;

      const normalized = String(value)
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
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

    logout() {
      const state = this.getAppState();
      state.currentUser = null;
      this.setAppState(state);
      window.location.href = 'index.html';
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

  window.HuskyApp = HuskyApp;
  document.addEventListener('DOMContentLoaded', () => HuskyApp.init());
})();
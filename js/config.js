(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Config] HuskyApp não encontrado. Verifique se app.js foi carregado antes de config.js.');
    return;
  }

  const DEFAULT_CONFIG = {
    company: {
      name: 'Husky Confeitaria',
      tradeName: 'Husky Confeitaria',
      cnpj: '',
      phone: '',
      email: '',
      instagram: '@huskyconfeiteiro',
      address: ''
    },
    visual: {
      themeMode: 'husky-default',
      accentStyle: 'original',
      enablePatternBackground: true,
      showMascotDashboard: true,
      logo: null,
      mascot: null
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
    security: {
      enableLoginProtection: true,
      enable2FA: false,
      rememberLastUser: true,
      logUserActions: true,
      sessionTimeout: 60,
      passwordPolicy: 'basic'
    },
    backup: {
      frequency: 'manual',
      location: 'local',
      lastBackupAt: null
    }
  };

  const DEFAULT_PASSWORD = '123456';
  const DEFAULT_AVATAR = 'assets/img/avatar-user.png';

  const CONFIG_PAGE = {
    refs: {},
    editingUserId: null,
    userFilters: {
      search: '',
      role: '',
      status: ''
    },
    draftAssets: {
      logo: null,
      mascot: null
    },
    draftUserAvatar: null,

    init() {
      if (!document.getElementById('company-settings-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.loadAllForms();
      this.populateCloudDefaultsFromEnv();
      this.resetUserForm(true);
      this.renderUsersTable();
      this.renderStatusBlocks();
      this.renderCards();
      app.log('Tela de configurações carregada.');
    },

    cacheRefs() {
      this.refs = {
        companyName: document.getElementById('company-name'),
        companyTradeName: document.getElementById('company-trade-name'),
        companyCnpj: document.getElementById('company-cnpj'),
        companyPhone: document.getElementById('company-phone'),
        companyEmail: document.getElementById('company-email'),
        companyInstagram: document.getElementById('company-instagram'),
        companyAddress: document.getElementById('company-address'),
        btnSaveCompanySettings: document.getElementById('btn-save-company-settings'),

        themeMode: document.getElementById('theme-mode'),
        accentStyle: document.getElementById('accent-style'),
        logoUpload: document.getElementById('logo-upload'),
        mascotUpload: document.getElementById('mascot-upload'),
        enablePatternBackground: document.getElementById('enable-pattern-background'),
        showMascotDashboard: document.getElementById('show-mascot-dashboard'),
        btnSaveVisualSettings: document.getElementById('btn-save-visual-settings'),

        receiptType: document.getElementById('receipt-type'),
        printerSize: document.getElementById('printer-size'),
        printCompanyData: document.getElementById('print-company-data'),
        printLogo: document.getElementById('print-logo'),
        printQrcodePix: document.getElementById('print-qrcode-pix'),
        autoPrintAfterSale: document.getElementById('auto-print-after-sale'),
        receiptFooterMessage: document.getElementById('receipt-footer-message'),
        btnSavePrintSettings: document.getElementById('btn-save-print-settings'),

        cloudProvider: document.getElementById('cloud-provider'),
        cloudProjectName: document.getElementById('cloud-project-name'),
        cloudApiKey: document.getElementById('cloud-api-key'),
        cloudUrl: document.getElementById('cloud-url'),
        cloudAutoSync: document.getElementById('cloud-auto-sync'),
        cloudOfflineCache: document.getElementById('cloud-offline-cache'),
        btnTestCloudConnection: document.getElementById('btn-test-cloud-connection'),
        btnSaveCloudSettings: document.getElementById('btn-save-cloud-settings'),

        sessionTimeout: document.getElementById('session-timeout'),
        passwordPolicy: document.getElementById('password-policy'),
        enableLoginProtection: document.getElementById('enable-login-protection'),
        enable2FA: document.getElementById('enable-2fa'),
        rememberLastUser: document.getElementById('remember-last-user'),
        logUserActions: document.getElementById('log-user-actions'),
        btnSaveSecuritySettings: document.getElementById('btn-save-security-settings'),

        backupFrequency: document.getElementById('backup-frequency'),
        backupLocation: document.getElementById('backup-location'),
        btnExportBackup: document.getElementById('btn-export-backup'),
        btnImportBackup: document.getElementById('btn-import-backup'),
        btnSaveBackupSettings: document.getElementById('btn-save-backup-settings'),

        btnSaveAllSettingsTop: document.getElementById('btn-save-all-settings-top'),
        btnSaveAllSettingsHero: document.getElementById('btn-save-all-settings-hero'),
        btnResetSettingsHero: document.getElementById('btn-reset-settings-hero'),
        btnExportBackupTop: document.getElementById('btn-export-backup-top'),

        userAccountForm: document.getElementById('user-account-form'),
        userId: document.getElementById('user-id'),
        userAccountModeTag: document.getElementById('user-account-mode-tag'),
        userAvatarUpload: document.getElementById('user-avatar-upload'),
        userAvatarPreview: document.getElementById('user-avatar-preview'),
        userName: document.getElementById('user-name'),
        userEmail: document.getElementById('user-email'),
        userRole: document.getElementById('user-role'),
        userStatus: document.getElementById('user-status'),
        userDomain: document.getElementById('user-domain'),
        userTempPassword: document.getElementById('user-temp-password'),
        userNotes: document.getElementById('user-notes'),
        userCanManageUsers: document.getElementById('user-can-manage-users'),
        userCanViewFinancial: document.getElementById('user-can-view-financial'),
        btnSaveUserAccount: document.getElementById('btn-save-user-account'),
        btnUpdateUserAccount: document.getElementById('btn-update-user-account'),
        btnBlockUserAccount: document.getElementById('btn-block-user-account'),
        btnDeleteUserAccount: document.getElementById('btn-delete-user-account'),
        btnClearUsers: document.getElementById('btn-clear-users'),

        usersSearch: document.getElementById('users-search'),
        usersFilterRole: document.getElementById('users-filter-role'),
        usersFilterStatus: document.getElementById('users-filter-status'),
        btnFilterUsers: document.getElementById('btn-filter-users'),
        btnNewUser: document.getElementById('btn-new-user'),
        usersTableBody: document.getElementById('users-table-body'),

        userSummaryName: document.getElementById('user-summary-name'),
        userSummaryStatus: document.getElementById('user-summary-status'),
        userSummaryRole: document.getElementById('user-summary-role'),
        userSummaryDomain: document.getElementById('user-summary-domain'),
        userSummaryManageUsers: document.getElementById('user-summary-manage-users'),

        settingsCloudStatusCard: document.getElementById('settings-cloud-status-card'),
        settingsActiveUsersCard: document.getElementById('settings-active-users-card'),
        settingsLastBackupCard: document.getElementById('settings-last-backup-card'),
        settingsCurrentThemeCard: document.getElementById('settings-current-theme-card'),

        systemLoginStatus: document.getElementById('system-login-status'),
        systemCloudStatus: document.getElementById('system-cloud-status'),
        systemBackupStatus: document.getElementById('system-backup-status'),
        systemLogsStatus: document.getElementById('system-logs-status')
      };
    },

    bindEvents() {
      this.refs.btnSaveCompanySettings?.addEventListener('click', () => this.saveCompanySettings());
      this.refs.btnSaveVisualSettings?.addEventListener('click', () => this.saveVisualSettings());
      this.refs.btnSavePrintSettings?.addEventListener('click', () => this.savePrintSettings());
      this.refs.btnSaveCloudSettings?.addEventListener('click', () => this.saveCloudSettings());
      this.refs.btnSaveSecuritySettings?.addEventListener('click', () => this.saveSecuritySettings());
      this.refs.btnSaveBackupSettings?.addEventListener('click', () => this.saveBackupSettings());

      this.refs.btnSaveAllSettingsTop?.addEventListener('click', () => this.saveAllSettings());
      this.refs.btnSaveAllSettingsHero?.addEventListener('click', () => this.saveAllSettings());
      this.refs.btnResetSettingsHero?.addEventListener('click', () => this.resetSettings());

      this.refs.btnTestCloudConnection?.addEventListener('click', () => this.testCloudConnection());
      this.refs.btnExportBackup?.addEventListener('click', () => this.exportBackup());
      this.refs.btnExportBackupTop?.addEventListener('click', () => this.exportBackup());
      this.refs.btnImportBackup?.addEventListener('click', () => this.importBackup());

      this.refs.btnNewUser?.addEventListener('click', () => this.resetUserForm());
      this.refs.btnFilterUsers?.addEventListener('click', () => this.applyUserFilters());
      this.refs.usersSearch?.addEventListener('input', () => {
        this.userFilters.search = this.refs.usersSearch.value.trim();
        this.renderUsersTable();
      });
      this.refs.usersFilterRole?.addEventListener('change', () => {
        this.userFilters.role = this.refs.usersFilterRole.value || '';
        this.renderUsersTable();
      });
      this.refs.usersFilterStatus?.addEventListener('change', () => {
        this.userFilters.status = this.refs.usersFilterStatus.value || '';
        this.renderUsersTable();
      });

      this.refs.usersTableBody?.addEventListener('click', (event) => this.handleUsersTableActions(event));

      this.refs.logoUpload?.addEventListener('change', (event) => this.readAssetFile(event, 'logo'));
      this.refs.mascotUpload?.addEventListener('change', (event) => this.readAssetFile(event, 'mascot'));

      this.refs.userAvatarUpload?.addEventListener('change', (event) => this.readUserAvatar(event));
      this.refs.btnSaveUserAccount?.addEventListener('click', () => this.saveUserAccount());
      this.refs.btnUpdateUserAccount?.addEventListener('click', () => this.updateUserAccount());
      this.refs.btnBlockUserAccount?.addEventListener('click', () => this.blockSelectedUser());
      this.refs.btnDeleteUserAccount?.addEventListener('click', () => this.deleteSelectedUser());
      this.refs.btnClearUsers?.addEventListener('click', () => this.clearExtraUsers());

      [
        this.refs.userName,
        this.refs.userStatus,
        this.refs.userRole,
        this.refs.userDomain,
        this.refs.userCanManageUsers
      ].forEach((field) => {
        field?.addEventListener('input', () => this.renderUserSummaryFromForm());
        field?.addEventListener('change', () => this.renderUserSummaryFromForm());
      });
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
    },

    getSettings() {
      return app.getAppState().settings || this.deepClone(DEFAULT_CONFIG);
    },

    getLocalUsers() {
      const key = app.getStorageKey('auth_users');
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('[Husky Config] erro ao ler usuários locais', error);
        return [];
      }
    },

    getUsers() {
      const localUsers = this.getLocalUsers();
      const stateUsers = Array.isArray(this.getState().users) ? this.getState().users : [];
      const merged = [];

      const pushNormalized = (user) => {
        if (!user) return;
        const normalized = this.normalizeUser(user);
        const index = merged.findIndex(
          (entry) =>
            (normalized.id && entry.id === normalized.id) ||
            (normalized.email && entry.email.toLowerCase() === normalized.email.toLowerCase())
        );

        if (index >= 0) {
          merged[index] = {
            ...merged[index],
            ...normalized,
            permissions: {
              ...merged[index].permissions,
              ...normalized.permissions
            }
          };
        } else {
          merged.push(normalized);
        }
      };

      localUsers.forEach(pushNormalized);
      stateUsers.forEach(pushNormalized);

      const currentUser = this.getState().currentUser;
      if (currentUser) pushNormalized(currentUser);

      return merged.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    saveUsers(users) {
      const normalizedUsers = users.map((user) => this.normalizeUser(user));
      localStorage.setItem(app.getStorageKey('auth_users'), JSON.stringify(normalizedUsers));
      localStorage.setItem('husky_local_auth_users', JSON.stringify(normalizedUsers));

      const state = this.getState();
      state.users = normalizedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar || DEFAULT_AVATAR,
        lastAccess: user.lastAccess || null,
        domain: user.domain || '',
        notes: user.notes || '',
        permissions: {
          canManageUsers: Boolean(user.permissions?.canManageUsers),
          canViewFinancial: Boolean(user.permissions?.canViewFinancial)
        }
      }));

      if (state.currentUser) {
        const match = normalizedUsers.find(
          (user) =>
            user.id === state.currentUser.id ||
            String(user.email || '').toLowerCase() === String(state.currentUser.email || '').toLowerCase()
        );
        if (match) {
          state.currentUser = {
            ...state.currentUser,
            id: match.id,
            name: match.name,
            email: match.email,
            role: match.role,
            status: match.status,
            avatar: match.avatar || DEFAULT_AVATAR,
            lastAccess: match.lastAccess || state.currentUser.lastAccess || null,
            domain: match.domain || '',
            notes: match.notes || '',
            permissions: {
              canManageUsers: Boolean(match.permissions?.canManageUsers),
              canViewFinancial: Boolean(match.permissions?.canViewFinancial)
            }
          };
        } else {
          state.currentUser = null;
          localStorage.removeItem('husky_local_auth_session');
        }
      }

      this.setState(state);
    },

    normalizeUser(user) {
  return {
    id: user.id || crypto.randomUUID(),
    name: String(user.name || 'Usuário').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    role: String(user.role || 'Operacional').trim(),
    status: String(user.status || 'Ativo').trim(),

    /* mantém a foto se já existir */
    avatar:
      user.avatar ||
      user.avatar_url ||
      user.photo ||
      user.profileImage ||
      'assets/img/avatar-user.png',

    domain: String(user.domain || '').trim(),
    notes: String(user.notes || '').trim(),
    passwordHash: user.passwordHash || this.simpleHash('123456'),
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    lastAccess: user.lastAccess || null,
    permissions: {
      canManageUsers: Boolean(user.permissions?.canManageUsers),
      canViewFinancial: user.permissions?.canViewFinancial !== false
    }
  };
},

    loadAllForms() {
      const settings = this.deepMerge(this.deepClone(DEFAULT_CONFIG), this.getSettings());
      const { company, visual, print, cloud, security, backup } = settings;

      if (this.refs.companyName) this.refs.companyName.value = company.name || '';
      if (this.refs.companyTradeName) this.refs.companyTradeName.value = company.tradeName || '';
      if (this.refs.companyCnpj) this.refs.companyCnpj.value = company.cnpj || '';
      if (this.refs.companyPhone) this.refs.companyPhone.value = company.phone || '';
      if (this.refs.companyEmail) this.refs.companyEmail.value = company.email || '';
      if (this.refs.companyInstagram) this.refs.companyInstagram.value = company.instagram || '';
      if (this.refs.companyAddress) this.refs.companyAddress.value = company.address || '';

      if (this.refs.themeMode) this.refs.themeMode.value = visual.themeMode || 'husky-default';
      if (this.refs.accentStyle) this.refs.accentStyle.value = visual.accentStyle || 'original';
      if (this.refs.enablePatternBackground) this.refs.enablePatternBackground.checked = Boolean(visual.enablePatternBackground);
      if (this.refs.showMascotDashboard) this.refs.showMascotDashboard.checked = Boolean(visual.showMascotDashboard);
      this.draftAssets.logo = visual.logo || null;
      this.draftAssets.mascot = visual.mascot || null;

      if (this.refs.receiptType) this.refs.receiptType.value = print.receiptType || 'comprovante';
      if (this.refs.printerSize) this.refs.printerSize.value = print.printerSize || '80mm';
      if (this.refs.printCompanyData) this.refs.printCompanyData.checked = Boolean(print.printCompanyData);
      if (this.refs.printLogo) this.refs.printLogo.checked = Boolean(print.printLogo);
      if (this.refs.printQrcodePix) this.refs.printQrcodePix.checked = Boolean(print.printQrcodePix);
      if (this.refs.autoPrintAfterSale) this.refs.autoPrintAfterSale.checked = Boolean(print.autoPrintAfterSale);
      if (this.refs.receiptFooterMessage) this.refs.receiptFooterMessage.value = print.receiptFooterMessage || '';

      if (this.refs.cloudProvider) this.refs.cloudProvider.value = cloud.provider || 'supabase';
      if (this.refs.cloudProjectName) this.refs.cloudProjectName.value = cloud.projectName || '';
      if (this.refs.cloudApiKey) this.refs.cloudApiKey.value = cloud.apiKey || '';
      if (this.refs.cloudUrl) this.refs.cloudUrl.value = cloud.url || '';
      if (this.refs.cloudAutoSync) this.refs.cloudAutoSync.checked = Boolean(cloud.autoSync);
      if (this.refs.cloudOfflineCache) this.refs.cloudOfflineCache.checked = Boolean(cloud.offlineCache);

      if (this.refs.sessionTimeout) this.refs.sessionTimeout.value = String(security.sessionTimeout || 60);
      if (this.refs.passwordPolicy) this.refs.passwordPolicy.value = security.passwordPolicy || 'basic';
      if (this.refs.enableLoginProtection) this.refs.enableLoginProtection.checked = Boolean(security.enableLoginProtection);
      if (this.refs.enable2FA) this.refs.enable2FA.checked = Boolean(security.enable2FA);
      if (this.refs.rememberLastUser) this.refs.rememberLastUser.checked = Boolean(security.rememberLastUser);
      if (this.refs.logUserActions) this.refs.logUserActions.checked = Boolean(security.logUserActions);

      if (this.refs.backupFrequency) this.refs.backupFrequency.value = backup.frequency || 'manual';
      if (this.refs.backupLocation) this.refs.backupLocation.value = backup.location || 'local';

      app.applySettingsToUI();
      this.renderCards();
      this.renderStatusBlocks();
    },

    populateCloudDefaultsFromEnv() {
      const current = this.getSettings().cloud || {};
      let changed = false;

      if (this.refs.cloudProvider && !this.refs.cloudProvider.value) {
        this.refs.cloudProvider.value = 'supabase';
      }

      if (window.HUSKY_SUPABASE_URL && this.refs.cloudUrl && !this.refs.cloudUrl.value) {
        this.refs.cloudUrl.value = window.HUSKY_SUPABASE_URL;
        changed = true;
      }

      if (window.HUSKY_SUPABASE_KEY && this.refs.cloudApiKey && !this.refs.cloudApiKey.value) {
        this.refs.cloudApiKey.value = window.HUSKY_SUPABASE_KEY;
        changed = true;
      }

      if (this.refs.cloudProjectName && !this.refs.cloudProjectName.value && window.HUSKY_SUPABASE_URL) {
        try {
          const host = new URL(window.HUSKY_SUPABASE_URL).hostname;
          this.refs.cloudProjectName.value = host.split('.')[0] || '';
          changed = true;
        } catch (error) {
          console.warn('[Husky Config] não foi possível extrair nome do projeto do Supabase.');
        }
      }

      if (changed && !current.url && !current.apiKey) {
        app.updateSettings(this.collectCloudSettings());
        this.renderCards();
        this.renderStatusBlocks();
      }
    },

    collectCompanySettings() {
      return {
        company: {
          ...this.getSettings().company,
          name: this.refs.companyName?.value.trim() || '',
          tradeName: this.refs.companyTradeName?.value.trim() || '',
          cnpj: this.refs.companyCnpj?.value.trim() || '',
          phone: this.refs.companyPhone?.value.trim() || '',
          email: this.refs.companyEmail?.value.trim() || '',
          instagram: this.refs.companyInstagram?.value.trim() || '',
          address: this.refs.companyAddress?.value.trim() || ''
        }
      };
    },

    collectVisualSettings() {
      return {
        visual: {
          ...this.getSettings().visual,
          themeMode: this.refs.themeMode?.value || 'husky-default',
          accentStyle: this.refs.accentStyle?.value || 'original',
          enablePatternBackground: Boolean(this.refs.enablePatternBackground?.checked),
          showMascotDashboard: Boolean(this.refs.showMascotDashboard?.checked),
          logo: this.draftAssets.logo || this.getSettings().visual?.logo || null,
          mascot: this.draftAssets.mascot || this.getSettings().visual?.mascot || null
        }
      };
    },

    collectPrintSettings() {
      return {
        print: {
          ...this.getSettings().print,
          receiptType: this.refs.receiptType?.value || 'comprovante',
          printerSize: this.refs.printerSize?.value || '80mm',
          printCompanyData: Boolean(this.refs.printCompanyData?.checked),
          printLogo: Boolean(this.refs.printLogo?.checked),
          printQrcodePix: Boolean(this.refs.printQrcodePix?.checked),
          autoPrintAfterSale: Boolean(this.refs.autoPrintAfterSale?.checked),
          receiptFooterMessage: this.refs.receiptFooterMessage?.value.trim() || ''
        }
      };
    },

    collectCloudSettings(overrides = {}) {
      return {
        cloud: {
          ...this.getSettings().cloud,
          provider: this.refs.cloudProvider?.value || 'supabase',
          projectName: this.refs.cloudProjectName?.value.trim() || '',
          apiKey: this.refs.cloudApiKey?.value.trim() || '',
          url: this.refs.cloudUrl?.value.trim() || '',
          autoSync: Boolean(this.refs.cloudAutoSync?.checked),
          offlineCache: Boolean(this.refs.cloudOfflineCache?.checked),
          ...overrides
        }
      };
    },

    collectSecuritySettings() {
      return {
        security: {
          ...this.getSettings().security,
          sessionTimeout: Number(this.refs.sessionTimeout?.value || 60),
          passwordPolicy: this.refs.passwordPolicy?.value || 'basic',
          enableLoginProtection: Boolean(this.refs.enableLoginProtection?.checked),
          enable2FA: Boolean(this.refs.enable2FA?.checked),
          rememberLastUser: Boolean(this.refs.rememberLastUser?.checked),
          logUserActions: Boolean(this.refs.logUserActions?.checked)
        }
      };
    },

    collectBackupSettings() {
      return {
        backup: {
          ...this.getSettings().backup,
          frequency: this.refs.backupFrequency?.value || 'manual',
          location: this.refs.backupLocation?.value || 'local'
        }
      };
    },

    saveCompanySettings(showToast = true) {
      app.updateSettings(this.collectCompanySettings());
      this.refreshSessionUserName();
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Dados da empresa salvos com sucesso.', 'success');
      app.log('Configurações da empresa atualizadas.');
    },

    saveVisualSettings(showToast = true) {
      app.updateSettings(this.collectVisualSettings());
      app.applySettingsToUI();
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Identidade visual salva com sucesso.', 'success');
      app.log('Configurações visuais atualizadas.');
    },

    savePrintSettings(showToast = true) {
      app.updateSettings(this.collectPrintSettings());
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações de impressão salvas com sucesso.', 'success');
      app.log('Configurações de impressão atualizadas.');
    },

    saveCloudSettings(showToast = true) {
      const currentCloud = this.getSettings().cloud || {};
      app.updateSettings(
        this.collectCloudSettings({
          connected: Boolean(currentCloud.connected),
          lastSyncAt: currentCloud.lastSyncAt || null
        })
      );

      if (typeof app.setCloudStatus === 'function') {
        app.setCloudStatus();
      } else if (typeof app.refreshShell === 'function') {
        app.refreshShell();
      }

      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações da nuvem salvas com sucesso.', 'success');
      app.log('Configurações da nuvem atualizadas.');
    },

    saveSecuritySettings(showToast = true) {
      app.updateSettings(this.collectSecuritySettings());
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações de segurança salvas com sucesso.', 'success');
      app.log('Configurações de segurança atualizadas.');
    },

    saveBackupSettings(showToast = true) {
      app.updateSettings(this.collectBackupSettings());
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações de backup salvas com sucesso.', 'success');
      app.log('Configurações de backup atualizadas.');
    },

    saveAllSettings() {
      this.saveCompanySettings(false);
      this.saveVisualSettings(false);
      this.savePrintSettings(false);
      this.saveCloudSettings(false);
      this.saveSecuritySettings(false);
      this.saveBackupSettings(false);
      app.showToast('Todas as configurações foram salvas.', 'success');
      app.log('Todas as configurações foram atualizadas.');
    },

    resetSettings() {
      const confirmed = app.confirmAction('Deseja restaurar as configurações padrão do sistema?');
      if (!confirmed) return;

      const merged = this.deepMerge(this.deepClone(this.getSettings()), DEFAULT_CONFIG);
      app.updateSettings(merged);
      this.draftAssets.logo = null;
      this.draftAssets.mascot = null;
      this.loadAllForms();
      if (typeof app.setCloudStatus === 'function') app.setCloudStatus();
      app.showToast('Configurações restauradas para o padrão.', 'success');
      app.log('Configurações restauradas para padrão.');
    },

    validateCloudFields() {
      const provider = this.refs.cloudProvider?.value || '';
      const projectName = this.refs.cloudProjectName?.value.trim() || '';
      const apiKey = this.refs.cloudApiKey?.value.trim() || '';
      const url = this.refs.cloudUrl?.value.trim() || '';

      if (!provider) return { ok: false, message: 'Selecione um provedor de nuvem.' };
      if (!projectName) return { ok: false, message: 'Informe o nome do projeto da nuvem.' };
      if (!apiKey) return { ok: false, message: 'Informe a API Key da nuvem.' };
      if (!url) return { ok: false, message: 'Informe a URL do projeto da nuvem.' };
      return { ok: true };
    },

    async testCloudConnection() {
      const validation = this.validateCloudFields();
      if (!validation.ok) {
        app.showToast(validation.message, 'warning');
        return;
      }

      let connected = false;

      try {
        if (
          this.refs.cloudProvider?.value === 'supabase' &&
          window.HuskySupabase &&
          typeof window.HuskySupabase.auth?.getSession === 'function'
        ) {
          const { error } = await window.HuskySupabase.auth.getSession();
          connected = !error;
        } else {
          connected = true;
        }
      } catch (error) {
        connected = false;
      }

      app.updateSettings(
        this.collectCloudSettings({
          connected,
          lastSyncAt: connected ? new Date().toISOString() : null
        })
      );

      if (typeof app.setCloudStatus === 'function') {
        app.setCloudStatus();
      } else if (typeof app.refreshShell === 'function') {
        app.refreshShell();
      }

      this.renderCards();
      this.renderStatusBlocks();

      if (connected) {
        app.showToast('Conexão com a nuvem validada com sucesso.', 'success');
        app.log('Teste de conexão com nuvem realizado com sucesso.');
      } else {
        app.showToast('Não foi possível validar a conexão da nuvem.', 'danger');
      }
    },

    exportBackup() {
      if (typeof app.exportBackup === 'function') {
        app.exportBackup();
      } else {
        const state = app.getAppState();
        app.downloadJSON(`backup_husky_${app.todayISO()}.json`, state);
      }

      const backupSettings = this.collectBackupSettings();
      backupSettings.backup.lastBackupAt = new Date().toISOString();
      app.updateSettings(backupSettings);
      this.renderCards();
      this.renderStatusBlocks();
      app.log('Backup exportado manualmente.');
    },

    importBackup() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Arquivo inválido.');
          }

          if (!app.confirmAction('Deseja importar este backup e substituir os dados atuais?')) return;

          const current = app.getAppState();
          const mergedState = this.deepMerge(this.deepClone(current), parsed);
          app.setAppState(mergedState);

          if (Array.isArray(parsed.users) && parsed.users.length) {
            const authUsers = parsed.users.map((user) =>
              this.normalizeUser({
                ...user,
                passwordHash: user.passwordHash || this.simpleHash(DEFAULT_PASSWORD)
              })
            );
            this.saveUsers(authUsers);
          }

          this.loadAllForms();
          this.resetUserForm(true);
          this.renderUsersTable();
          this.renderCards();
          this.renderStatusBlocks();
          if (typeof app.setCloudStatus === 'function') app.setCloudStatus();
          app.showToast('Backup importado com sucesso.', 'success');
          app.log('Backup importado manualmente.');
        } catch (error) {
          console.error(error);
          app.showToast('Não foi possível importar o backup.', 'danger');
        }
      });
      input.click();
    },

    getUserFromForm() {
      const id = this.refs.userId?.value || crypto.randomUUID();
      const email = String(this.refs.userEmail?.value || '').trim().toLowerCase();

      return this.normalizeUser({
        id,
        name: this.refs.userName?.value.trim() || '',
        email,
        role: this.refs.userRole?.value || 'Operacional',
        status: this.refs.userStatus?.value || 'Ativo',
        domain: this.refs.userDomain?.value.trim() || '',
        notes: this.refs.userNotes?.value.trim() || '',
        avatar: this.draftUserAvatar || undefined,
        passwordHash: this.refs.userTempPassword?.value
          ? this.simpleHash(this.refs.userTempPassword.value)
          : undefined,
        permissions: {
          canManageUsers: Boolean(this.refs.userCanManageUsers?.checked),
          canViewFinancial: Boolean(this.refs.userCanViewFinancial?.checked)
        }
      });
    },

    validateUserPayload(user, currentId = null) {
      if (!user.name) {
        app.showToast('Informe o nome do usuário.', 'warning');
        this.refs.userName?.focus();
        return false;
      }

      if (!user.email) {
        app.showToast('Informe o e-mail do usuário.', 'warning');
        this.refs.userEmail?.focus();
        return false;
      }

      const users = this.getUsers();
      const duplicated = users.find(
        (entry) =>
          entry.id !== currentId &&
          String(entry.email || '').toLowerCase() === String(user.email || '').toLowerCase()
      );

      if (duplicated) {
        app.showToast('Já existe um usuário com esse e-mail.', 'warning');
        this.refs.userEmail?.focus();
        return false;
      }

      return true;
    },

    saveUserAccount() {
      const currentId = this.refs.userId?.value || null;
      const user = this.getUserFromForm();

      if (!this.validateUserPayload(user, currentId)) return;

      const users = this.getUsers();

      if (currentId && users.some((entry) => entry.id === currentId)) {
        app.showToast('Este usuário já existe. Use o botão editar.', 'warning');
        return;
      }

      if (!this.refs.userTempPassword?.value.trim()) {
        user.passwordHash = this.simpleHash(DEFAULT_PASSWORD);
      }

      user.createdAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();

      users.unshift(user);
      this.saveUsers(users);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      this.loadUserIntoForm(user.id);
      app.showToast('Usuário salvo com sucesso.', 'success');
      app.log('Usuário salvo.', { email: user.email, role: user.role });
    },

    updateUserAccount() {
      const currentId = this.refs.userId?.value || this.editingUserId;
      if (!currentId) {
        app.showToast('Selecione um usuário para editar.', 'warning');
        return;
      }

      const users = this.getUsers();
      const index = users.findIndex((entry) => entry.id === currentId);

      if (index < 0) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const existing = users[index];
      const incoming = this.getUserFromForm();

      if (!this.validateUserPayload(incoming, currentId)) return;

      users[index] = this.normalizeUser({
        ...existing,
        ...incoming,
        avatar: this.draftUserAvatar || existing.avatar || DEFAULT_AVATAR,
        passwordHash: this.refs.userTempPassword?.value.trim()
          ? this.simpleHash(this.refs.userTempPassword.value)
          : existing.passwordHash,
        updatedAt: new Date().toISOString()
      });

      this.saveUsers(users);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      this.loadUserIntoForm(currentId);
      app.showToast('Usuário atualizado com sucesso.', 'success');
      app.log('Usuário atualizado.', { email: users[index].email, role: users[index].role });
    },

    blockSelectedUser() {
      const currentId = this.refs.userId?.value || this.editingUserId;
      if (!currentId) {
        app.showToast('Selecione um usuário para bloquear.', 'warning');
        return;
      }

      const users = this.getUsers();
      const index = users.findIndex((entry) => entry.id === currentId);

      if (index < 0) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const user = users[index];
      const nextStatus = user.status === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
      const actionLabel = nextStatus === 'Bloqueado' ? 'bloquear' : 'reativar';

      if (!app.confirmAction(`Deseja ${actionLabel} o usuário ${user.name}?`)) return;

      users[index] = {
        ...user,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };

      this.saveUsers(users);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      this.loadUserIntoForm(currentId);
      app.showToast(
        nextStatus === 'Bloqueado'
          ? 'Usuário bloqueado com sucesso.'
          : 'Usuário reativado com sucesso.',
        'success'
      );
      app.log('Status do usuário alterado.', { email: user.email, status: nextStatus });
    },

    deleteSelectedUser() {
      const currentId = this.refs.userId?.value || this.editingUserId;
      if (!currentId) {
        app.showToast('Selecione um usuário para excluir.', 'warning');
        return;
      }

      const users = this.getUsers();
      const user = users.find((entry) => entry.id === currentId);

      if (!user) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const activeAdmins = users.filter((entry) => entry.role === 'Administrador' && entry.status !== 'Bloqueado');

      if (activeAdmins.length <= 1 && user.role === 'Administrador') {
        app.showToast('Mantenha ao menos um administrador ativo no sistema.', 'warning');
        return;
      }

      if (!app.confirmAction(`Deseja excluir o usuário ${user.name}?`)) return;

      const filtered = users.filter((entry) => entry.id !== currentId);
      this.saveUsers(filtered);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      this.resetUserForm();
      app.showToast('Usuário excluído com sucesso.', 'success');
      app.log('Usuário excluído.', { email: user.email, role: user.role });
    },

    clearExtraUsers() {
      const users = this.getUsers();
      const admin =
        users.find((entry) => String(entry.email || '').toLowerCase() === 'admin@husky.com') ||
        this.normalizeUser({
          name: 'Administrador',
          email: 'admin@husky.com',
          role: 'Administrador',
          status: 'Ativo',
          permissions: {
            canManageUsers: true,
            canViewFinancial: true
          }
        });

      if (!app.confirmAction('Deseja limpar a lista de acessos e manter apenas o administrador padrão?')) {
        return;
      }

      this.saveUsers([admin]);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      this.loadUserIntoForm(admin.id);
      app.showToast('Lista de acessos limpa com sucesso.', 'success');
      app.log('Lista de acessos limpa.', { kept: admin.email });
    },

    loadUserIntoForm(userId) {
      const user = this.getUsers().find((entry) => entry.id === userId);
      if (!user) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      this.editingUserId = user.id;
      if (this.refs.userId) this.refs.userId.value = user.id;
      if (this.refs.userName) this.refs.userName.value = user.name || '';
      if (this.refs.userEmail) this.refs.userEmail.value = user.email || '';
      if (this.refs.userRole) this.refs.userRole.value = user.role || 'Operacional';
      if (this.refs.userStatus) this.refs.userStatus.value = user.status || 'Ativo';
      if (this.refs.userDomain) this.refs.userDomain.value = user.domain || '';
      if (this.refs.userTempPassword) this.refs.userTempPassword.value = '';
      if (this.refs.userNotes) this.refs.userNotes.value = user.notes || '';
      if (this.refs.userCanManageUsers) this.refs.userCanManageUsers.checked = Boolean(user.permissions?.canManageUsers);
      if (this.refs.userCanViewFinancial) this.refs.userCanViewFinancial.checked = Boolean(user.permissions?.canViewFinancial);

      this.draftUserAvatar = user.avatar || DEFAULT_AVATAR;
      this.renderUserAvatarPreview(this.draftUserAvatar);
      this.renderUserSummary(user);
      this.updateUserModeTag(`Editando ${user.name}`);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    resetUserForm(skipScroll = false) {
      this.editingUserId = null;
      this.draftUserAvatar = null;

      if (this.refs.userAccountForm) this.refs.userAccountForm.reset();

      if (this.refs.userId) this.refs.userId.value = '';
      if (this.refs.userRole) this.refs.userRole.value = 'Administrador';
      if (this.refs.userStatus) this.refs.userStatus.value = 'Ativo';
      if (this.refs.userDomain) this.refs.userDomain.value = '';
      if (this.refs.userTempPassword) this.refs.userTempPassword.value = '';
      if (this.refs.userCanManageUsers) this.refs.userCanManageUsers.checked = false;
      if (this.refs.userCanViewFinancial) this.refs.userCanViewFinancial.checked = true;

      this.renderUserAvatarPreview(null);
      this.renderUserSummaryFromForm();
      this.updateUserModeTag('Novo usuário');

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    updateUserModeTag(label) {
      if (this.refs.userAccountModeTag) {
        this.refs.userAccountModeTag.textContent = label;
      }
    },

    readUserAvatar(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.draftUserAvatar = reader.result;
        this.renderUserAvatarPreview(this.draftUserAvatar);
        this.renderUserSummaryFromForm();
        app.showToast('Foto de perfil carregada com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler a foto de perfil.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    renderUserAvatarPreview(src) {
      if (!this.refs.userAvatarPreview) return;

      if (!src) {
        this.refs.userAvatarPreview.innerHTML = '<p>Nenhuma foto enviada.</p>';
        return;
      }

      this.refs.userAvatarPreview.innerHTML = `
        <div style="display:grid; gap:12px; align-items:start;">
          <img src="${src}" alt="Foto de perfil do usuário" style="width:100%; max-width:180px; border-radius:18px; border:1px solid rgba(47,111,159,0.12);" />
        </div>
      `;
    },

    renderUserSummaryFromForm() {
      this.renderUserSummary({
        name: this.refs.userName?.value.trim() || '-',
        status: this.refs.userStatus?.value || 'Ativo',
        role: this.refs.userRole?.value || 'Administrador',
        domain: this.refs.userDomain?.value.trim() || 'Livre',
        permissions: {
          canManageUsers: Boolean(this.refs.userCanManageUsers?.checked)
        }
      });
    },

    renderUserSummary(user) {
      if (this.refs.userSummaryName) this.refs.userSummaryName.textContent = user?.name || '-';
      if (this.refs.userSummaryStatus) this.refs.userSummaryStatus.textContent = user?.status || 'Ativo';
      if (this.refs.userSummaryRole) this.refs.userSummaryRole.textContent = user?.role || 'Administrador';
      if (this.refs.userSummaryDomain) this.refs.userSummaryDomain.textContent = user?.domain || 'Livre';
      if (this.refs.userSummaryManageUsers) {
        this.refs.userSummaryManageUsers.textContent = user?.permissions?.canManageUsers ? 'Sim' : 'Não';
      }
    },

    applyUserFilters() {
      this.userFilters.search = this.refs.usersSearch?.value.trim() || '';
      this.userFilters.role = this.refs.usersFilterRole?.value || '';
      this.userFilters.status = this.refs.usersFilterStatus?.value || '';
      this.renderUsersTable();
    },

    handleUsersTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const userId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-user') {
        this.loadUserIntoForm(userId);
      }

      if (action === 'toggle-user') {
        this.editingUserId = userId;
        if (this.refs.userId) this.refs.userId.value = userId;
        this.blockSelectedUser();
      }

      if (action === 'permissions-user') {
        this.showPermissions(userId);
      }

      if (action === 'delete-user') {
        this.editingUserId = userId;
        if (this.refs.userId) this.refs.userId.value = userId;
        this.deleteSelectedUser();
      }
    },

    showPermissions(userId) {
      const user = this.getUsers().find((entry) => entry.id === userId);
      if (!user) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const pieces = [];
      pieces.push(user.permissions?.canManageUsers ? 'gerencia usuários' : 'não gerencia usuários');
      pieces.push(user.permissions?.canViewFinancial ? 'vê financeiro' : 'não vê financeiro');
      pieces.push(user.domain ? `domínio ${user.domain}` : 'domínio livre');

      app.showToast(`${user.name}: ${pieces.join(' • ')}`, 'info');
    },

    getFilteredUsers() {
      return this.getUsers()
        .filter((user) => {
          const haystack = [user.name, user.email, user.role, user.domain, user.notes].join(' ');
          const matchesSearch = !this.userFilters.search || app.includesText(haystack, this.userFilters.search);
          const matchesRole = !this.userFilters.role || user.role === this.userFilters.role;
          const matchesStatus = !this.userFilters.status || user.status === this.userFilters.status;
          return matchesSearch && matchesRole && matchesStatus;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    renderUsersTable() {
      const users = this.getFilteredUsers();
      if (!this.refs.usersTableBody) return;

      if (!users.length) {
        this.refs.usersTableBody.innerHTML = '<tr><td colspan="7">Nenhum usuário encontrado.</td></tr>';
        return;
      }

      this.refs.usersTableBody.innerHTML = users
        .map((user) => `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${this.escapeHtml(user.avatar || DEFAULT_AVATAR)}" alt="${this.escapeHtml(user.name || 'Usuário')}" style="width:34px; height:34px; border-radius:12px; object-fit:cover; border:1px solid rgba(47,111,159,0.12);" />
                <span>${this.escapeHtml(user.name || '-')}</span>
              </div>
            </td>
            <td>${this.escapeHtml(user.email || '-')}</td>
            <td>${this.escapeHtml(user.role || '-')}</td>
            <td>${this.escapeHtml(user.status || '-')}</td>
            <td>${this.escapeHtml(user.domain || 'Livre')}</td>
            <td>${user.lastAccess ? app.formatDateTime(user.lastAccess) : '-'}</td>
            <td>
              <div class="table-action-group">
                <button type="button" class="btn btn-secondary btn-small" data-action="edit-user" data-id="${user.id}">Editar</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="permissions-user" data-id="${user.id}">Permissões</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="toggle-user" data-id="${user.id}">
                  ${user.status === 'Bloqueado' ? 'Reativar' : 'Bloquear'}
                </button>
                <button type="button" class="btn btn-danger btn-small" data-action="delete-user" data-id="${user.id}">
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        `)
        .join('');
    },

    renderCards() {
      const settings = this.getSettings();
      const users = this.getUsers();

      if (this.refs.settingsCloudStatusCard) {
        this.refs.settingsCloudStatusCard.textContent = settings.cloud?.connected ? 'Conectada' : 'Desconectada';
      }

      if (this.refs.settingsActiveUsersCard) {
        this.refs.settingsActiveUsersCard.textContent = String(users.filter((user) => user.status === 'Ativo').length);
      }

      if (this.refs.settingsLastBackupCard) {
        this.refs.settingsLastBackupCard.textContent = settings.backup?.lastBackupAt
          ? app.formatDateTime(settings.backup.lastBackupAt)
          : '-';
      }

      if (this.refs.settingsCurrentThemeCard) {
        this.refs.settingsCurrentThemeCard.textContent = this.getThemeLabel(
          settings.visual?.themeMode,
          settings.visual?.accentStyle
        );
      }
    },

    renderStatusBlocks() {
      const settings = this.getSettings();

      if (this.refs.systemLoginStatus) {
        this.refs.systemLoginStatus.textContent = settings.security?.enableLoginProtection ? 'Ativo' : 'Desativado';
      }

      if (this.refs.systemCloudStatus) {
        this.refs.systemCloudStatus.textContent = settings.cloud?.connected ? 'Conectada' : 'Desconectada';
      }

      if (this.refs.systemBackupStatus) {
        this.refs.systemBackupStatus.textContent = this.getBackupFrequencyLabel(settings.backup?.frequency);
      }

      if (this.refs.systemLogsStatus) {
        this.refs.systemLogsStatus.textContent = settings.security?.logUserActions ? 'Ativos' : 'Desativados';
      }
    },

    refreshSessionUserName() {
      const settings = this.getSettings();
      const title = settings.company?.tradeName || settings.company?.name || 'Husky Confeitaria';
      document.title = `${title} | Configurações`;
    },

    readAssetFile(event, type) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.draftAssets[type] = {
          name: file.name,
          type: file.type || 'image/*',
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString()
        };
        app.showToast(type === 'logo' ? 'Logo carregada com sucesso.' : 'Mascote carregado com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler o arquivo selecionado.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    getThemeLabel(themeMode, accentStyle) {
      const themeMap = {
        'husky-default': 'Husky padrão',
        light: 'Claro',
        dark: 'Escuro'
      };

      const accentMap = {
        original: 'Original',
        bege: 'Bege cremoso',
        premium: 'Premium escuro'
      };

      return `${themeMap[themeMode] || 'Husky padrão'} • ${accentMap[accentStyle] || 'Original'}`;
    },

    getBackupFrequencyLabel(frequency) {
      const map = {
        manual: 'Manual',
        daily: 'Diário',
        weekly: 'Semanal',
        monthly: 'Mensal'
      };
      return map[frequency] || 'Manual';
    },

    simpleHash(value) {
      const text = String(value || '');
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(index);
        hash |= 0;
      }
      return String(hash);
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

    escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  document.addEventListener('DOMContentLoaded', () => CONFIG_PAGE.init());
  window.HuskyConfig = CONFIG_PAGE;
})();
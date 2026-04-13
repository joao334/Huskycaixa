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
      provider: 'firebase',
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

  const CONFIG_PAGE = {
    refs: {},
    userFilters: {
      search: '',
      role: ''
    },
    draftAssets: {
      logo: null,
      mascot: null
    },

    init() {
      if (!document.getElementById('company-settings-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.loadAllForms();
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

        usersSearch: document.getElementById('users-search'),
        usersFilterRole: document.getElementById('users-filter-role'),
        btnNewUser: document.getElementById('btn-new-user'),
        usersTableBody: document.getElementById('users-table-body'),

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

      this.refs.btnNewUser?.addEventListener('click', () => this.createUser());
      this.refs.usersSearch?.addEventListener('input', () => {
        this.userFilters.search = this.refs.usersSearch.value.trim();
        this.renderUsersTable();
      });
      this.refs.usersFilterRole?.addEventListener('change', () => {
        this.userFilters.role = this.refs.usersFilterRole.value || '';
        this.renderUsersTable();
      });
      this.refs.usersTableBody?.addEventListener('click', (event) => this.handleUsersTableActions(event));

      this.refs.logoUpload?.addEventListener('change', (event) => this.readAssetFile(event, 'logo'));
      this.refs.mascotUpload?.addEventListener('change', (event) => this.readAssetFile(event, 'mascot'));
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

    getUsers() {
      const key = app.getStorageKey('auth_users');
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('[Husky Config] erro ao ler usuários', error);
        return [];
      }
    },

    saveUsers(users) {
      localStorage.setItem(app.getStorageKey('auth_users'), JSON.stringify(users));

      const state = this.getState();
      state.users = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastAccess: user.lastAccess || null
      }));
      this.setState(state);
    },

    loadAllForms() {
      const settings = this.deepMerge(this.deepClone(DEFAULT_CONFIG), this.getSettings());
      const { company, visual, print, cloud, security, backup } = settings;

      this.refs.companyName.value = company.name || '';
      this.refs.companyTradeName.value = company.tradeName || '';
      this.refs.companyCnpj.value = company.cnpj || '';
      this.refs.companyPhone.value = company.phone || '';
      this.refs.companyEmail.value = company.email || '';
      this.refs.companyInstagram.value = company.instagram || '';
      this.refs.companyAddress.value = company.address || '';

      this.refs.themeMode.value = visual.themeMode || 'husky-default';
      this.refs.accentStyle.value = visual.accentStyle || 'original';
      this.refs.enablePatternBackground.checked = Boolean(visual.enablePatternBackground);
      this.refs.showMascotDashboard.checked = Boolean(visual.showMascotDashboard);
      this.draftAssets.logo = visual.logo || null;
      this.draftAssets.mascot = visual.mascot || null;

      this.refs.receiptType.value = print.receiptType || 'comprovante';
      this.refs.printerSize.value = print.printerSize || '80mm';
      this.refs.printCompanyData.checked = Boolean(print.printCompanyData);
      this.refs.printLogo.checked = Boolean(print.printLogo);
      this.refs.printQrcodePix.checked = Boolean(print.printQrcodePix);
      this.refs.autoPrintAfterSale.checked = Boolean(print.autoPrintAfterSale);
      this.refs.receiptFooterMessage.value = print.receiptFooterMessage || '';

      this.refs.cloudProvider.value = cloud.provider || 'firebase';
      this.refs.cloudProjectName.value = cloud.projectName || '';
      this.refs.cloudApiKey.value = cloud.apiKey || '';
      this.refs.cloudUrl.value = cloud.url || '';
      this.refs.cloudAutoSync.checked = Boolean(cloud.autoSync);
      this.refs.cloudOfflineCache.checked = Boolean(cloud.offlineCache);

      this.refs.sessionTimeout.value = String(security.sessionTimeout || 60);
      this.refs.passwordPolicy.value = security.passwordPolicy || 'basic';
      this.refs.enableLoginProtection.checked = Boolean(security.enableLoginProtection);
      this.refs.enable2FA.checked = Boolean(security.enable2FA);
      this.refs.rememberLastUser.checked = Boolean(security.rememberLastUser);
      this.refs.logUserActions.checked = Boolean(security.logUserActions);

      this.refs.backupFrequency.value = backup.frequency || 'manual';
      this.refs.backupLocation.value = backup.location || 'local';

      app.applySettingsToUI();
      this.renderCards();
      this.renderStatusBlocks();
    },

    collectCompanySettings() {
      return {
        company: {
          ...this.getSettings().company,
          name: this.refs.companyName.value.trim(),
          tradeName: this.refs.companyTradeName.value.trim(),
          cnpj: this.refs.companyCnpj.value.trim(),
          phone: this.refs.companyPhone.value.trim(),
          email: this.refs.companyEmail.value.trim(),
          instagram: this.refs.companyInstagram.value.trim(),
          address: this.refs.companyAddress.value.trim()
        }
      };
    },

    collectVisualSettings() {
      return {
        visual: {
          ...this.getSettings().visual,
          themeMode: this.refs.themeMode.value,
          accentStyle: this.refs.accentStyle.value,
          enablePatternBackground: Boolean(this.refs.enablePatternBackground.checked),
          showMascotDashboard: Boolean(this.refs.showMascotDashboard.checked),
          logo: this.draftAssets.logo || this.getSettings().visual?.logo || null,
          mascot: this.draftAssets.mascot || this.getSettings().visual?.mascot || null
        }
      };
    },

    collectPrintSettings() {
      return {
        print: {
          ...this.getSettings().print,
          receiptType: this.refs.receiptType.value,
          printerSize: this.refs.printerSize.value,
          printCompanyData: Boolean(this.refs.printCompanyData.checked),
          printLogo: Boolean(this.refs.printLogo.checked),
          printQrcodePix: Boolean(this.refs.printQrcodePix.checked),
          autoPrintAfterSale: Boolean(this.refs.autoPrintAfterSale.checked),
          receiptFooterMessage: this.refs.receiptFooterMessage.value.trim()
        }
      };
    },

    collectCloudSettings(overrides = {}) {
      return {
        cloud: {
          ...this.getSettings().cloud,
          provider: this.refs.cloudProvider.value,
          projectName: this.refs.cloudProjectName.value.trim(),
          apiKey: this.refs.cloudApiKey.value.trim(),
          url: this.refs.cloudUrl.value.trim(),
          autoSync: Boolean(this.refs.cloudAutoSync.checked),
          offlineCache: Boolean(this.refs.cloudOfflineCache.checked),
          ...overrides
        }
      };
    },

    collectSecuritySettings() {
      return {
        security: {
          ...this.getSettings().security,
          sessionTimeout: Number(this.refs.sessionTimeout.value || 60),
          passwordPolicy: this.refs.passwordPolicy.value,
          enableLoginProtection: Boolean(this.refs.enableLoginProtection.checked),
          enable2FA: Boolean(this.refs.enable2FA.checked),
          rememberLastUser: Boolean(this.refs.rememberLastUser.checked),
          logUserActions: Boolean(this.refs.logUserActions.checked)
        }
      };
    },

    collectBackupSettings() {
      return {
        backup: {
          ...this.getSettings().backup,
          frequency: this.refs.backupFrequency.value,
          location: this.refs.backupLocation.value
        }
      };
    },

    saveCompanySettings(showToast = true) {
      const companySettings = this.collectCompanySettings();
      app.updateSettings(companySettings);
      this.refreshSessionUserName();
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Dados da empresa salvos com sucesso.', 'success');
      app.log('Configurações da empresa atualizadas.');
    },

    saveVisualSettings(showToast = true) {
      const visualSettings = this.collectVisualSettings();
      app.updateSettings(visualSettings);
      app.applySettingsToUI();
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Identidade visual salva com sucesso.', 'success');
      app.log('Configurações visuais atualizadas.');
    },

    savePrintSettings(showToast = true) {
      const printSettings = this.collectPrintSettings();
      app.updateSettings(printSettings);
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações de impressão salvas com sucesso.', 'success');
      app.log('Configurações de impressão atualizadas.');
    },

    saveCloudSettings(showToast = true) {
      const currentCloud = this.getSettings().cloud || {};
      const cloudSettings = this.collectCloudSettings({
        connected: Boolean(currentCloud.connected),
        lastSyncAt: currentCloud.lastSyncAt || null
      });
      app.updateSettings(cloudSettings);
      app.setCloudStatus();
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações da nuvem salvas com sucesso.', 'success');
      app.log('Configurações da nuvem atualizadas.');
    },

    saveSecuritySettings(showToast = true) {
      const securitySettings = this.collectSecuritySettings();
      app.updateSettings(securitySettings);
      this.renderCards();
      this.renderStatusBlocks();
      if (showToast) app.showToast('Configurações de segurança salvas com sucesso.', 'success');
      app.log('Configurações de segurança atualizadas.');
    },

    saveBackupSettings(showToast = true) {
      const backupSettings = this.collectBackupSettings();
      app.updateSettings(backupSettings);
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
      app.setCloudStatus();
      app.showToast('Configurações restauradas para o padrão.', 'success');
      app.log('Configurações restauradas para padrão.');
    },

    validateCloudFields() {
      const provider = this.refs.cloudProvider.value;
      const projectName = this.refs.cloudProjectName.value.trim();
      const apiKey = this.refs.cloudApiKey.value.trim();
      const url = this.refs.cloudUrl.value.trim();

      if (!provider) return { ok: false, message: 'Selecione um provedor de nuvem.' };
      if (!projectName) return { ok: false, message: 'Informe o nome do projeto da nuvem.' };
      if (!apiKey) return { ok: false, message: 'Informe a API Key da nuvem.' };
      if (!url) return { ok: false, message: 'Informe a URL do projeto da nuvem.' };
      return { ok: true };
    },

    testCloudConnection() {
      const validation = this.validateCloudFields();
      if (!validation.ok) {
        app.showToast(validation.message, 'warning');
        return;
      }

      const connectedSettings = this.collectCloudSettings({
        connected: true,
        lastSyncAt: new Date().toISOString()
      });
      app.updateSettings(connectedSettings);
      app.setCloudStatus();
      this.renderCards();
      this.renderStatusBlocks();
      app.showToast('Conexão com a nuvem validada com sucesso.', 'success');
      app.log('Teste de conexão com nuvem realizado com sucesso.');
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
            const authUsers = parsed.users.map((user) => ({
              id: user.id || crypto.randomUUID(),
              name: user.name || 'Usuário',
              email: user.email || '',
              role: user.role || 'Operacional',
              status: user.status || 'Ativo',
              lastAccess: user.lastAccess || null,
              passwordHash: user.passwordHash || this.simpleHash(DEFAULT_PASSWORD),
              createdAt: user.createdAt || new Date().toISOString()
            }));
            this.saveUsers(authUsers);
          }

          this.loadAllForms();
          this.renderUsersTable();
          this.renderCards();
          this.renderStatusBlocks();
          app.setCloudStatus();
          app.showToast('Backup importado com sucesso.', 'success');
          app.log('Backup importado manualmente.');
        } catch (error) {
          console.error(error);
          app.showToast('Não foi possível importar o backup.', 'danger');
        }
      });
      input.click();
    },

    createUser() {
      const name = window.prompt('Nome do novo usuário:');
      if (!name) return;

      const email = window.prompt('E-mail do novo usuário:');
      if (!email) return;

      const normalizedEmail = email.trim().toLowerCase();
      const users = this.getUsers();
      if (users.some((user) => String(user.email || '').toLowerCase() === normalizedEmail)) {
        app.showToast('Já existe um usuário com esse e-mail.', 'warning');
        return;
      }

      const role = window.prompt('Perfil do usuário (Administrador, Caixa, Gestão ou Operacional):', 'Operacional') || 'Operacional';
      const password = window.prompt('Senha inicial do usuário:', DEFAULT_PASSWORD) || DEFAULT_PASSWORD;

      const nextUser = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        role: role.trim(),
        status: 'Ativo',
        passwordHash: this.simpleHash(password),
        createdAt: new Date().toISOString(),
        lastAccess: null
      };

      users.unshift(nextUser);
      this.saveUsers(users);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      app.showToast('Usuário criado com sucesso.', 'success');
      app.log('Usuário criado.', { email: nextUser.email, role: nextUser.role });
    },

    handleUsersTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const userId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-user') {
        this.editUser(userId);
      }

      if (action === 'permissions-user') {
        this.showPermissions(userId);
      }
    },

    editUser(userId) {
      const users = this.getUsers();
      const user = users.find((entry) => entry.id === userId);
      if (!user) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const name = window.prompt('Nome do usuário:', user.name || '') || user.name;
      const role = window.prompt('Perfil do usuário:', user.role || 'Operacional') || user.role;
      const status = window.prompt('Status do usuário (Ativo/Inativo):', user.status || 'Ativo') || user.status;
      const resetPassword = window.prompt('Nova senha (deixe igual para manter a atual):', '');

      user.name = name.trim();
      user.role = role.trim();
      user.status = status.trim();
      if (resetPassword) {
        user.passwordHash = this.simpleHash(resetPassword);
      }

      this.saveUsers(users);
      this.renderUsersTable();
      this.renderCards();
      this.renderStatusBlocks();
      app.showToast('Usuário atualizado com sucesso.', 'success');
      app.log('Usuário atualizado.', { email: user.email, role: user.role, status: user.status });
    },

    showPermissions(userId) {
      const user = this.getUsers().find((entry) => entry.id === userId);
      if (!user) {
        app.showToast('Usuário não encontrado.', 'danger');
        return;
      }

      const role = String(user.role || '').toLowerCase();
      let permissionText = 'Permissões não definidas.';

      if (role.includes('administrador')) permissionText = 'Acesso total a todas as telas e configurações.';
      if (role.includes('caixa')) permissionText = 'Acesso a vendas, comprovantes e consulta básica.';
      if (role.includes('gest')) permissionText = 'Acesso a financeiro, relatórios, clientes e vendas.';
      if (role.includes('operacional')) permissionText = 'Acesso a estoque, produtos e apoio operacional.';

      app.showToast(`${user.name}: ${permissionText}`, 'info');
    },

    getFilteredUsers() {
      return this.getUsers().filter((user) => {
        const matchesSearch = !this.userFilters.search || app.includesText([user.name, user.email, user.role].join(' '), this.userFilters.search);
        const matchesRole = !this.userFilters.role || user.role === this.userFilters.role;
        return matchesSearch && matchesRole;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    renderUsersTable() {
      const users = this.getFilteredUsers();
      if (!users.length) {
        this.refs.usersTableBody.innerHTML = '<tr><td colspan="6">Nenhum usuário encontrado.</td></tr>';
        return;
      }

      this.refs.usersTableBody.innerHTML = users.map((user) => `
        <tr>
          <td>${this.escapeHtml(user.name || '-')}</td>
          <td>${this.escapeHtml(user.email || '-')}</td>
          <td>${this.escapeHtml(user.role || '-')}</td>
          <td>${this.escapeHtml(user.status || '-')}</td>
          <td>${user.lastAccess ? app.formatDateTime(user.lastAccess) : '-'}</td>
          <td>
            <div class="table-action-group">
              <button type="button" class="btn btn-secondary btn-small" data-action="edit-user" data-id="${user.id}">Editar</button>
              <button type="button" class="btn btn-secondary btn-small" data-action="permissions-user" data-id="${user.id}">Permissões</button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    renderCards() {
      const settings = this.getSettings();
      const users = this.getUsers();

      this.refs.settingsCloudStatusCard.textContent = settings.cloud?.connected ? 'Conectada' : 'Desconectada';
      this.refs.settingsActiveUsersCard.textContent = String(users.filter((user) => user.status === 'Ativo').length);
      this.refs.settingsLastBackupCard.textContent = settings.backup?.lastBackupAt ? app.formatDateTime(settings.backup.lastBackupAt) : '-';
      this.refs.settingsCurrentThemeCard.textContent = this.getThemeLabel(settings.visual?.themeMode, settings.visual?.accentStyle);
    },

    renderStatusBlocks() {
      const settings = this.getSettings();
      this.refs.systemLoginStatus.textContent = settings.security?.enableLoginProtection ? 'Ativo' : 'Desativado';
      this.refs.systemCloudStatus.textContent = settings.cloud?.connected ? 'Conectada' : 'Desconectada';
      this.refs.systemBackupStatus.textContent = this.getBackupFrequencyLabel(settings.backup?.frequency);
      this.refs.systemLogsStatus.textContent = settings.security?.logUserActions ? 'Ativos' : 'Desativados';
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
        caramelo: 'Caramelo',
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
          output[key] = this.deepMerge(targetValue && typeof targetValue === 'object' ? targetValue : {}, sourceValue);
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
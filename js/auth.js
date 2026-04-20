(() => {
  'use strict';

  const LOGIN_PAGE = 'index.html';
  const HOME_PAGE = 'home.html';
  const REMEMBER_KEY = 'husky_remembered_user';
  const LOCAL_USERS_KEY = 'husky_local_auth_users';
  const LOCAL_SESSION_KEY = 'husky_local_auth_session';
  const AUTH_MODE = String(window.HUSKY_AUTH_MODE || 'local').toLowerCase();
  const CLOUD_STRICT = Boolean(window.HUSKY_CLOUD_STRICT);
  const REDIRECT_GUARD_KEY = 'husky_redirect_guard';
  const REDIRECT_GUARD_WINDOW_MS = 1500;


  const LOCAL_DEFAULT_ADMIN = {
    id: crypto.randomUUID(),
    name: 'Administrador',
    email: 'admin@husky.com',
    password: '123456',
    passwordHash: '1450575459',
    role: 'Administrador',
    status: 'Ativo',
    avatar: 'assets/img/avatar-user.png',
    permissions: {
      canManageUsers: true,
      canViewFinancial: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccess: null
  };

  const AuthModule = {
    supabase: null,
    app: null,
    bootstrapped: false,
    authListenerBound: false,
    localMode: false,
    preferLocalAuth: AUTH_MODE !== 'supabase',
    cloudUnavailable: false,
    isSubmittingLogin: false,
    isSubmittingRegister: false,

    async init() {
      this.app = window.HuskyApp || null;

      this.bindLogoutButtons();
      this.bindLoginForm();
      this.bindRegisterForm();
      this.bindForgotPassword();
      this.restoreRememberedEmail();

      if (this.preferLocalAuth) {
        this.localMode = true;
        this.ensureLocalAdminAccount();

        if (this.isLoginPage()) {
          this.notify('Modo local ativo. Use admin@husky.com e senha 123456 para o primeiro acesso.', 'warning');
        }

        await this.bootstrapSession();
        return;
      }

      this.supabase = await this.waitForSupabase();

      if (!this.supabase) {
        this.cloudUnavailable = true;
        this.localMode = false;
        this.bootstrapped = true;

        if (this.isLoginPage()) {
          this.notify('Não foi possível conectar ao login em nuvem. Verifique a internet e o carregamento do Supabase.', 'danger');
        } else {
          this.handleNoSession();
        }
        return;
      }

      await this.bootstrapSession();
      this.bindAuthStateListener();
    },

    async waitForSupabase() {
      if (window.HuskySupabase) return window.HuskySupabase;

      for (let i = 0; i < 80; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (window.HuskySupabase) return window.HuskySupabase;
      }

      return null;
    },

    isLoginPage() {
      const file = window.location.pathname.split('/').pop() || LOGIN_PAGE;
      return file === '' || file === LOGIN_PAGE;
    },

    getHomePage() {
      return HOME_PAGE;
    },

    getLoginPage() {
      return LOGIN_PAGE;
    },

    getCurrentFile() {
      return window.location.pathname.split('/').pop() || LOGIN_PAGE;
    },

    shouldThrottleRedirect(targetPage) {
      try {
        const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY);
        const payload = raw ? JSON.parse(raw) : null;
        if (!payload?.target || !payload?.at) return false;
        return payload.target === targetPage && Date.now() - Number(payload.at) < REDIRECT_GUARD_WINDOW_MS;
      } catch (_error) {
        return false;
      }
    },

    rememberRedirect(targetPage) {
      try {
        sessionStorage.setItem(REDIRECT_GUARD_KEY, JSON.stringify({ target: targetPage, at: Date.now() }));
      } catch (_error) {}
    },

    clearRedirectGuard() {
      try {
        sessionStorage.removeItem(REDIRECT_GUARD_KEY);
      } catch (_error) {}
    },

    safeRedirect(targetPage, replace = true) {
      const currentFile = this.getCurrentFile();
      if (!targetPage || currentFile === targetPage) return;
      if (this.shouldThrottleRedirect(targetPage)) {
        console.warn('[Auth] redirecionamento repetido bloqueado para', targetPage);
        return;
      }

      this.rememberRedirect(targetPage);

      if (replace) {
        window.location.replace(targetPage);
      } else {
        window.location.assign(targetPage);
      }
    },

    async bootstrapSession() {
      if (this.localMode) {
        this.bootstrapLocalSession();
        this.bootstrapped = true;
        return;
      }

      if (!this.supabase) {
        this.handleNoSession();
        this.bootstrapped = true;
        return;
      }

      try {
        const { data, error } = await this.supabase.auth.getSession();

        if (error) {
          console.error('[Auth] erro ao obter sessão', error);
          this.handleNoSession();
          this.bootstrapped = true;
          return;
        }

        const session = data?.session || null;

        if (!session?.user) {
          this.handleNoSession();
          this.bootstrapped = true;
          return;
        }

        await this.handleAuthenticatedUser(session.user, false);
        this.bootstrapped = true;
      } catch (error) {
        console.error('[Auth] erro no bootstrap da sessão', error);
        this.handleNoSession();
        this.bootstrapped = true;
      }
    },

    bindAuthStateListener() {
      if (this.localMode || this.authListenerBound || !this.supabase) return;
      this.authListenerBound = true;

      this.supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!this.bootstrapped) return;

        try {
          if (session?.user) {
            await this.handleAuthenticatedUser(session.user, true);
          } else {
            this.handleNoSession();
          }
        } catch (error) {
          console.error('[Auth] erro ao observar autenticação', error);
        }
      });
    },

    async handleAuthenticatedUser(user, allowRedirect = true) {
      const profile = this.localMode
        ? this.createPublicProfileFromLocal(user)
        : await this.ensureUserProfile(user);

      const status = String(profile?.status || 'Ativo').trim().toLowerCase();
      if (profile && ['bloqueado', 'excluído', 'inativo'].includes(status)) {
        await this.revokeAccess(profile);
        return;
      }

      this.clearRedirectGuard();
      this.persistCurrentUser(profile);

      if (this.localMode) {
        this.setLocalSession(profile);
      }

      if (this.isLoginPage() && allowRedirect) {
        this.safeRedirect(this.getHomePage());
      }
    },

    handleNoSession() {
      this.persistCurrentUser(null);

      if (this.isLoginPage()) {
        this.clearRedirectGuard();
        return;
      }

      this.safeRedirect(this.getLoginPage());
    },

    async ensureUserProfile(user) {
      const localUsers = this.app?.getAppState?.().users || [];
      const cachedLocalUser =
        localUsers.find(
          (entry) =>
            entry.id === user.id ||
            String(entry.email || '').toLowerCase() === String(user.email || '').toLowerCase()
        ) || null;

      const fallbackProfile = {
        id: user.id,
        name: user.user_metadata?.name || cachedLocalUser?.name || this.getNameFromEmail(user.email),
        email: user.email || '',
        role: cachedLocalUser?.role || 'Administrador',
        status: cachedLocalUser?.status || 'Ativo',
        avatar:
          cachedLocalUser?.avatar ||
          user.user_metadata?.avatar_url ||
          'assets/img/avatar-user.png',
        lastAccess: new Date().toISOString()
      };

      const toPublicProfile = (row) => ({
        id: row.id || fallbackProfile.id,
        name: row.name || fallbackProfile.name,
        email: row.email || fallbackProfile.email,
        role: row.role || fallbackProfile.role || 'Administrador',
        status: row.status || fallbackProfile.status || 'Ativo',
        avatar: row.avatar_url || fallbackProfile.avatar || 'assets/img/avatar-user.png',
        lastAccess: new Date().toISOString()
      });

      try {
        const { data: existing, error: existingError } = await this.supabase
          .from('profiles')
          .select('id, name, email, role, status, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (existingError) {
          console.error('[Auth] erro ao buscar perfil existente', existingError);
          return fallbackProfile;
        }

        if (existing) {
          const payload = {
            id: existing.id,
            name: user.user_metadata?.name || existing.name || fallbackProfile.name,
            email: user.email || existing.email || fallbackProfile.email,
            role: existing.role || fallbackProfile.role || 'Administrador',
            status: existing.status || fallbackProfile.status || 'Ativo',
            avatar_url:
              cachedLocalUser?.avatar ||
              existing.avatar_url ||
              user.user_metadata?.avatar_url ||
              null,
            updated_at: new Date().toISOString()
          };

          const { data, error } = await this.supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

          if (error) {
            console.error('[Auth] erro ao atualizar perfil existente', error);
            return toPublicProfile(existing);
          }

          return toPublicProfile(data);
        }

        const payload = {
          id: user.id,
          name: fallbackProfile.name,
          email: fallbackProfile.email,
          role: fallbackProfile.role,
          status: fallbackProfile.status,
          avatar_url: cachedLocalUser?.avatar || user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          console.error('[Auth] erro ao criar perfil', error);
          return fallbackProfile;
        }

        return toPublicProfile(data);
      } catch (error) {
        console.error('[Auth] erro ao garantir perfil', error);
        return fallbackProfile;
      }
    },

    async revokeAccess(profile) {
      const status = String(profile?.status || 'Bloqueado').trim();
      const message =
        status.toLowerCase() === 'excluído'
          ? 'Este acesso foi removido do sistema.'
          : `Este acesso está ${status.toLowerCase()} no sistema.`;

      try {
        if (this.localMode) {
          localStorage.removeItem(LOCAL_SESSION_KEY);
        } else if (this.supabase?.auth) {
          await this.supabase.auth.signOut();
        }
      } catch (error) {
        console.error('[Auth] erro ao encerrar acesso bloqueado', error);
      }

      this.persistCurrentUser(null);
      this.notify(message, 'danger');

      if (!this.isLoginPage()) {
        this.safeRedirect(this.getLoginPage());
      }
    },

    persistCurrentUser(profile) {
      if (!this.app || typeof this.app.updateAppState !== 'function') return;

      this.app.updateAppState((state) => {
        state.currentUser = profile;

        if (!Array.isArray(state.users)) {
          state.users = [];
        }

        if (profile) {
          const existingIndex = state.users.findIndex(
            (entry) =>
              entry.id === profile.id ||
              String(entry.email || '').toLowerCase() === String(profile.email || '').toLowerCase()
          );

          if (existingIndex >= 0) {
            state.users[existingIndex] = {
              ...state.users[existingIndex],
              ...profile
            };
          } else {
            state.users.unshift(profile);
          }
        }

        return state;
      });

      if (profile) {
        this.persistAuthUserCache(profile);
      }
    },

    persistAuthUserCache(profile) {
      try {
        if (!this.app || typeof this.app.getStorageKey !== 'function') return;

        const storageKey = this.app.getStorageKey('auth_users');
        const raw = localStorage.getItem(storageKey);
        const authUsers = raw ? JSON.parse(raw) : [];
        const safeUsers = Array.isArray(authUsers) ? authUsers : [];

        const index = safeUsers.findIndex(
          (entry) =>
            entry.id === profile.id ||
            String(entry.email || '').toLowerCase() === String(profile.email || '').toLowerCase()
        );

        const nextUser = {
          ...safeUsers[index],
          ...profile
        };

        if (index >= 0) {
          safeUsers[index] = nextUser;
        } else {
          safeUsers.unshift(nextUser);
        }

        localStorage.setItem(storageKey, JSON.stringify(safeUsers));
      } catch (error) {
        console.error('[Auth] erro ao persistir cache de usuários', error);
      }
    },

    bindLoginForm() {
      const form = document.getElementById('login-form');
      const loginButton = document.getElementById('btn-login');
      if (!form) return;

      const submitLogin = async (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

        if (this.isSubmittingLogin) return;
        this.isSubmittingLogin = true;
        if (loginButton) loginButton.disabled = true;

        try {
          const emailInput = document.getElementById('login-email');
          const passwordInput = document.getElementById('login-password');
          const rememberInput = document.getElementById('remember-access');

          const email = String(emailInput?.value || '').trim().toLowerCase();
          const password = String(passwordInput?.value || '');
          const remember = Boolean(rememberInput?.checked);

          if (!email || !password) {
            this.notify('Informe e-mail e senha para entrar.', 'warning');
            return;
          }

          if (this.localMode) {
            const localUser = this.authenticateLocalUser(email, password);

            if (!localUser) {
              this.notify('E-mail ou senha inválidos no modo local.', 'danger');
              return;
            }

            if (remember) {
              this.setRememberedUser({ email });
            } else {
              this.clearRememberedUser();
            }

            await this.handleAuthenticatedUser(localUser, false);
            this.notify('Login local realizado com sucesso.', 'success');
            setTimeout(() => window.location.replace(this.getHomePage()), 180);
            return;
          }

          if (!this.supabase) {
            this.supabase = await this.waitForSupabase();
          }

          if (!this.supabase) {
            this.cloudUnavailable = true;
            this.notify('A conexão com o login em nuvem não foi iniciada. Verifique a internet e tente novamente.', 'danger');
            return;
          }

          const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            this.notify(this.getSupabaseErrorMessage(error), 'danger');
            return;
          }

          const authUser = data?.user || data?.session?.user || null;
          if (!authUser) {
            this.notify('O login foi aceito, mas a sessão não retornou usuário. Tente novamente.', 'danger');
            return;
          }

          if (remember) {
            this.setRememberedUser({ email });
          } else {
            this.clearRememberedUser();
          }

          try {
            await this.handleAuthenticatedUser(authUser, false);
          } catch (profileError) {
            console.error('[Auth] erro ao preparar perfil após login', profileError);
          }

          this.notify('Login realizado com sucesso.', 'success');
          setTimeout(() => window.location.replace(this.getHomePage()), 180);
        } catch (error) {
          console.error('[Auth] erro no login', error);
          this.notify(this.getSupabaseErrorMessage(error), 'danger');
        } finally {
          this.isSubmittingLogin = false;
          if (loginButton) loginButton.disabled = false;
        }
      };

      form.addEventListener('submit', submitLogin);
      loginButton?.addEventListener('click', submitLogin);
    },

    bindRegisterForm() {
      const registerForm = document.getElementById('register-form');
      const registerButton = document.getElementById('btn-create-account');
      if (!registerForm) return;

      const submitRegister = async (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

        if (this.isSubmittingRegister) return;
        this.isSubmittingRegister = true;
        if (registerButton) registerButton.disabled = true;

        try {
          const nameInput = document.getElementById('register-name');
          const emailInput = document.getElementById('register-email');
          const passwordInput = document.getElementById('register-password');
          const confirmPasswordInput = document.getElementById('register-confirm-password');

          if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;

          const name = String(nameInput.value || '').trim();
          const email = String(emailInput.value || '').trim().toLowerCase();
          const password = String(passwordInput.value || '');
          const confirmPassword = String(confirmPasswordInput.value || '');

          if (!name || !email || !password || !confirmPassword) {
            this.notify('Preencha todos os campos para criar o login.', 'warning');
            return;
          }

          if (password.length < 6) {
            this.notify('A senha precisa ter pelo menos 6 caracteres.', 'warning');
            return;
          }

          if (password !== confirmPassword) {
            this.notify('A confirmação da senha não confere.', 'warning');
            return;
          }

          if (this.localMode) {
            const created = this.createLocalUser({ name, email, password });

            if (!created.ok) {
              this.notify(created.message, 'danger');
              return;
            }

            this.setRememberedUser({ email });
            await this.handleAuthenticatedUser(created.user, false);
            this.notify('Login local criado com sucesso.', 'success');
            setTimeout(() => window.location.replace(this.getHomePage()), 180);
            return;
          }

          if (!this.supabase) {
            this.supabase = await this.waitForSupabase();
          }

          if (!this.supabase) {
            this.cloudUnavailable = true;
            this.notify('A conexão com o cadastro em nuvem não foi iniciada. Verifique a internet e tente novamente.', 'danger');
            return;
          }

          const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name
              }
            }
          });

          if (error) {
            this.notify(this.getSupabaseErrorMessage(error), 'danger');
            return;
          }

          if (data.session?.user) {
            await this.handleAuthenticatedUser(data.session.user, false);
            this.setRememberedUser({ email });
            this.notify('Login criado com sucesso.', 'success');

            setTimeout(() => {
              this.safeRedirect(this.getHomePage());
            }, 180);
            return;
          }

          this.setRememberedUser({ email });
          this.notify('Login criado com sucesso. Agora faça o login.', 'success');

          const loginEmail = document.getElementById('login-email');
          if (loginEmail) loginEmail.value = email;
          document.getElementById('btn-show-login')?.click();
        } catch (error) {
          console.error('[Auth] erro ao criar login', error);
          this.notify('Não foi possível criar o login.', 'danger');
        } finally {
          this.isSubmittingRegister = false;
          if (registerButton) registerButton.disabled = false;
        }
      };

      registerForm.addEventListener('submit', submitRegister);
      registerButton?.addEventListener('click', submitRegister);
    },

    bindForgotPassword() {
      const button = document.getElementById('btn-forgot-password');
      if (!button) return;

      button.addEventListener('click', async () => {
        const emailInput = document.getElementById('login-email');
        const email = String(emailInput?.value || '').trim().toLowerCase();

        if (!email) {
          this.notify('Digite seu e-mail para redefinir a senha.', 'warning');
          return;
        }

        if (this.localMode) {
          this.notify('No modo local, use a senha cadastrada ou crie um novo acesso.', 'warning');
          return;
        }

        try {
          if (!this.supabase) {
            this.supabase = await this.waitForSupabase();
          }

          if (!this.supabase) {
            this.notify('A conexão com a recuperação de senha não foi iniciada.', 'danger');
            return;
          }

          const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/${this.getLoginPage()}`
          });

          if (error) {
            this.notify(this.getSupabaseErrorMessage(error), 'danger');
            return;
          }

          this.notify('Enviamos o link de recuperação para o seu e-mail.', 'success');
        } catch (error) {
          console.error('[Auth] erro ao recuperar senha', error);
          this.notify('Não foi possível enviar o e-mail de recuperação.', 'danger');
        }
      });
    },

    bindLogoutButtons() {
      const buttons = [
        ...document.querySelectorAll('#btn-logout'),
        ...document.querySelectorAll('[data-action="logout"]')
      ];

      buttons.forEach((button) => {
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (this.app && typeof this.app.logout === 'function') {
            await this.app.logout();
            return;
          }

          try {
            if (this.localMode) {
              localStorage.removeItem(LOCAL_SESSION_KEY);
              localStorage.removeItem(REMEMBER_KEY);
              this.persistCurrentUser(null);
              this.safeRedirect(this.getLoginPage());
              return;
            }

            const { error } = await this.supabase.auth.signOut();

            if (error) {
              this.notify(this.getSupabaseErrorMessage(error), 'danger');
              return;
            }

            this.persistCurrentUser(null);
            this.safeRedirect(this.getLoginPage());
          } catch (error) {
            console.error('[Auth] erro ao sair', error);
            this.notify('Não foi possível encerrar a sessão.', 'danger');
          }
        });
      });
    },

    restoreRememberedEmail() {
      const emailInput = document.getElementById('login-email');
      const rememberInput = document.getElementById('remember-access');
      if (!emailInput || !rememberInput) return;

      const remembered = this.getRememberedUser();
      if (remembered?.email) {
        emailInput.value = remembered.email;
        rememberInput.checked = true;
      }
    },

    setRememberedUser(payload) {
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
      } catch (error) {
        console.error('[Auth] erro ao lembrar usuário', error);
      }
    },

    getRememberedUser() {
      try {
        const raw = localStorage.getItem(REMEMBER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },

    clearRememberedUser() {
      localStorage.removeItem(REMEMBER_KEY);
    },

    getLocalUsers() {
      try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const localUsers = Array.isArray(list) ? list : [];

        let configUsers = [];
        if (this.app && typeof this.app.getStorageKey === 'function') {
          const appRaw = localStorage.getItem(this.app.getStorageKey('auth_users'));
          const parsed = appRaw ? JSON.parse(appRaw) : [];
          configUsers = Array.isArray(parsed) ? parsed : [];
        }

        const merged = [];
        [...localUsers, ...configUsers].forEach((user) => {
          if (!user) return;
          const email = String(user.email || '').toLowerCase();
          const index = merged.findIndex(
            (entry) => entry.id === user.id || String(entry.email || '').toLowerCase() === email
          );

          const normalized = {
            ...user,
            email,
            avatar: user.avatar || user.avatar_url || 'assets/img/avatar-user.png'
          };

          if (index >= 0) {
            merged[index] = {
              ...merged[index],
              ...normalized
            };
          } else {
            merged.push(normalized);
          }
        });

        return merged;
      } catch (error) {
        console.error('[Auth] erro ao ler usuários locais', error);
        return [];
      }
    },

    saveLocalUsers(users) {
      const safeUsers = Array.isArray(users) ? users : [];
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(safeUsers));

      try {
        if (this.app && typeof this.app.getStorageKey === 'function') {
          const publicUsers = safeUsers.map((user) => {
            const nextUser = { ...user };
            delete nextUser.password;
            return nextUser;
          });
          localStorage.setItem(this.app.getStorageKey('auth_users'), JSON.stringify(publicUsers));
        }
      } catch (error) {
        console.error('[Auth] erro ao sincronizar usuários locais', error);
      }
    },

    ensureLocalAdminAccount() {
      const users = this.getLocalUsers();
      const exists = users.some(
        (user) => String(user.email || '').toLowerCase() === LOCAL_DEFAULT_ADMIN.email
      );

      if (exists) return;

      users.unshift({
        ...LOCAL_DEFAULT_ADMIN
      });

      this.saveLocalUsers(users);
    },

    authenticateLocalUser(email, password) {
      const users = this.getLocalUsers();
      const hash = this.simpleHash(password);
      const found = users.find((user) => {
        const sameEmail = String(user.email || '').toLowerCase() === String(email || '').toLowerCase();
        const passwordOk =
          String(user.password || '') === String(password || '') ||
          String(user.passwordHash || '') === hash;
        return sameEmail && passwordOk;
      });

      if (!found) return null;

      found.lastAccess = new Date().toISOString();
      found.updatedAt = new Date().toISOString();
      this.saveLocalUsers(users);
      return found;
    },

    createLocalUser({ name, email, password }) {
      const users = this.getLocalUsers();
      const exists = users.some(
        (user) => String(user.email || '').toLowerCase() === String(email || '').toLowerCase()
      );

      if (exists) {
        return {
          ok: false,
          message: 'Este e-mail já está cadastrado no modo local.'
        };
      }

      const user = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: this.simpleHash(password),
        role: 'Administrador',
        status: 'Ativo',
        avatar: 'assets/img/avatar-user.png',
        permissions: {
          canManageUsers: true,
          canViewFinancial: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccess: new Date().toISOString()
      };

      users.unshift(user);
      this.saveLocalUsers(users);

      return { ok: true, user };
    },

    createPublicProfileFromLocal(localUser) {
      return {
        id: localUser.id,
        name: localUser.name || this.getNameFromEmail(localUser.email),
        email: localUser.email || '',
        role: localUser.role || 'Administrador',
        status: localUser.status || 'Ativo',
        avatar: localUser.avatar || 'assets/img/avatar-user.png',
        lastAccess: new Date().toISOString()
      };
    },

    setLocalSession(profile) {
      try {
        localStorage.setItem(
          LOCAL_SESSION_KEY,
          JSON.stringify({
            id: profile.id,
            email: profile.email,
            lastAccess: new Date().toISOString()
          })
        );
      } catch (error) {
        console.error('[Auth] erro ao salvar sessão local', error);
      }
    },

    bootstrapLocalSession() {
      try {
        const raw = localStorage.getItem(LOCAL_SESSION_KEY);
        const session = raw ? JSON.parse(raw) : null;

        if (!session?.email && !session?.id) {
          this.handleNoSession();
          return;
        }

        const localUsers = this.getLocalUsers();
        const user =
          localUsers.find(
            (entry) =>
              entry.id === session.id ||
              String(entry.email || '').toLowerCase() === String(session.email || '').toLowerCase()
          ) || null;

        if (!user) {
          localStorage.removeItem(LOCAL_SESSION_KEY);
          this.handleNoSession();
          return;
        }

        this.persistCurrentUser(this.createPublicProfileFromLocal(user));

        if (this.isLoginPage()) {
          this.safeRedirect(this.getHomePage());
        }
      } catch (error) {
        console.error('[Auth] erro ao iniciar sessão local', error);
        this.handleNoSession();
      }
    },

    getNameFromEmail(email) {
      const local = String(email || '').split('@')[0] || 'Administrador';
      const normalized = local.replace(/[._-]+/g, ' ').trim();
      return (
        normalized
          .split(' ')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || 'Administrador'
      );
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

    notify(message, type = 'info') {
      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast(message, type);
      } else {
        console.log(message);
      }
    },

    getSupabaseErrorMessage(error) {
      const message = String(error?.message || '').toLowerCase();

      if (message.includes('invalid login credentials')) {
        return 'E-mail ou senha inválidos.';
      }

      if (message.includes('email not confirmed')) {
        return 'Seu e-mail ainda não foi confirmado.';
      }

      if (message.includes('user already registered')) {
        return 'Este e-mail já está cadastrado.';
      }

      if (message.includes('password should be at least')) {
        return 'A senha precisa ter pelo menos 6 caracteres.';
      }

      if (message.includes('signup is disabled')) {
        return 'O cadastro está desativado no momento.';
      }

      return error?.message || 'Ocorreu um erro na autenticação.';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    AuthModule.init();
  });
})();

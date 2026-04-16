(() => {
  'use strict';

  const LOGIN_PAGE = 'index.html';
  const HOME_PAGE = 'home.html';
  const REMEMBER_KEY = 'husky_remembered_user';
  const LOCAL_USERS_KEY = 'husky_local_auth_users';
  const LOCAL_SESSION_KEY = 'husky_local_auth_session';
  const LOCAL_DEFAULT_ADMIN = {
    name: 'Administrador',
    email: 'admin@husky.com',
    password: '123456',
    role: 'Administrador',
    status: 'Ativo',
    avatar: 'assets/img/avatar-user.png'
  };

  const AuthModule = {
    supabase: null,
    app: null,
    bootstrapped: false,
    authListenerBound: false,
    localMode: false,

    async init() {
      this.app = window.HuskyApp || null;

      this.bindLogoutButtons();
      this.bindLoginForm();
      this.bindRegisterForm();
      this.bindForgotPassword();
      this.restoreRememberedEmail();

      this.supabase = await this.waitForSupabase();

      if (!this.supabase) {
        this.localMode = true;
        this.ensureLocalAdminAccount();

        if (this.isLoginPage()) {
          this.notify('Modo local ativado. Use admin@husky.com e senha 123456 para o primeiro acesso.', 'warning');
        }
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

    async bootstrapSession() {
      if (this.localMode) {
        this.bootstrapLocalSession();
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

      this.persistCurrentUser(profile);

      if (this.localMode) {
        this.setLocalSession(profile);
      }

      if (this.isLoginPage() && allowRedirect) {
        window.location.replace(this.getHomePage());
      }
    },

    handleNoSession() {
      this.persistCurrentUser(null);

      if (!this.isLoginPage()) {
        window.location.replace(this.getLoginPage());
      }
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

      try {
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
          console.error('[Auth] erro ao criar/atualizar perfil', error);
          return fallbackProfile;
        }

        return {
          id: data.id,
          name: data.name || fallbackProfile.name,
          email: data.email || fallbackProfile.email,
          role: data.role || fallbackProfile.role || 'Administrador',
          status: data.status || fallbackProfile.status || 'Ativo',
          avatar: data.avatar_url || fallbackProfile.avatar || 'assets/img/avatar-user.png',
          lastAccess: new Date().toISOString()
        };
      } catch (error) {
        console.error('[Auth] erro ao garantir perfil', error);
        return fallbackProfile;
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

      const submitLogin = async (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

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
          this.notify('Conexão de login não iniciada. O sistema entrou em modo local.', 'warning');
          this.localMode = true;
          this.ensureLocalAdminAccount();
          return;
        }

        try {
          const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            this.notify(this.getSupabaseErrorMessage(error), 'danger');
            return;
          }

          if (remember) {
            this.setRememberedUser({ email });
          } else {
            this.clearRememberedUser();
          }

          await this.handleAuthenticatedUser(data.user, false);
          this.notify('Login realizado com sucesso.', 'success');

          setTimeout(() => {
            window.location.replace(this.getHomePage());
          }, 180);
        } catch (error) {
          console.error('[Auth] erro no login', error);
          this.notify('Não foi possível realizar o login.', 'danger');
        }
      };

      form?.addEventListener('submit', submitLogin);
      loginButton?.addEventListener('click', submitLogin);
    },

    bindRegisterForm() {
      const registerForm = document.getElementById('register-form');
      const registerButton = document.getElementById('btn-create-account');

      const submitRegister = async (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }

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

        try {
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
              window.location.replace(this.getHomePage());
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
        }
      };

      registerForm?.addEventListener('submit', submitRegister);
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
              this.persistCurrentUser(null);
              window.location.replace(this.getLoginPage());
              return;
            }

            const { error } = await this.supabase.auth.signOut();

            if (error) {
              this.notify(this.getSupabaseErrorMessage(error), 'danger');
              return;
            }

            this.persistCurrentUser(null);
            window.location.replace(this.getLoginPage());
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
        return Array.isArray(list) ? list : [];
      } catch (error) {
        console.error('[Auth] erro ao ler usuários locais', error);
        return [];
      }
    },

    saveLocalUsers(users) {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users || []));
    },

    ensureLocalAdminAccount() {
      const users = this.getLocalUsers();
      const exists = users.some(
        (user) => String(user.email || '').toLowerCase() === LOCAL_DEFAULT_ADMIN.email
      );

      if (exists) return;

      users.unshift({
        id: crypto.randomUUID(),
        ...LOCAL_DEFAULT_ADMIN,
        createdAt: new Date().toISOString(),
        lastAccess: null
      });

      this.saveLocalUsers(users);
    },

    authenticateLocalUser(email, password) {
      const users = this.getLocalUsers();
      const found = users.find(
        (user) =>
          String(user.email || '').toLowerCase() === String(email || '').toLowerCase() &&
          String(user.password || '') === String(password || '')
      );

      if (!found) return null;

      found.lastAccess = new Date().toISOString();
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
        password,
        role: 'Administrador',
        status: 'Ativo',
        avatar: 'assets/img/avatar-user.png',
        createdAt: new Date().toISOString(),
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
          window.location.replace(this.getHomePage());
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

  window.HuskyAuth = AuthModule;
})();

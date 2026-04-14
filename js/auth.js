(() => {
  'use strict';

  const LOGIN_PAGE = 'index.html';
  const HOME_PAGE = 'home.html';
  const REMEMBER_KEY = 'husky_remembered_user';

  const AuthModule = {
    supabase: null,
    app: null,
    bootstrapped: false,
    authListenerBound: false,

    async init() {
  this.app = window.HuskyApp || null;

  this.bindLogoutButtons();
  this.bindLoginForm();
  this.bindRegisterForm();
  this.bindForgotPassword();
  this.restoreRememberedEmail();

  this.supabase = await this.waitForSupabase();

  if (!this.supabase) {
    console.error('[Auth] Supabase não encontrado.');
    this.notify('Conexão com o Supabase não encontrada. Verifique o env.js.', 'danger');
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

    async bootstrapSession() {
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
      if (this.authListenerBound) return;
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
      const profile = await this.ensureUserProfile(user);
      this.persistCurrentUser(profile);

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

    if (!this.supabase) {
      this.supabase = await this.waitForSupabase();
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

    if (!this.supabase) {
      this.notify('Conexão de login não iniciada. Verifique o env.js.', 'danger');
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

    getNameFromEmail(email) {
      const local = String(email || '').split('@')[0] || 'Administrador';
      const normalized = local.replace(/[._-]+/g, ' ').trim();
      return normalized
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Administrador';
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
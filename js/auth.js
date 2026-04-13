(() => {
  'use strict';

  const LOGIN_PAGE = 'index.html';
  const HOME_PAGE = 'home.html';
  const SESSION_KEY = 'auth_session';
  const USERS_KEY = 'auth_users';

  const DEFAULT_USERS = [
    {
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: 'admin@husky.com',
      role: 'Administrador',
      status: 'Ativo',
      passwordHash: simpleHash('123456'),
      createdAt: new Date().toISOString(),
      lastAccess: null
    }
  ];

  const Auth = {
    init() {
      this.app = window.HuskyApp || null;
      this.currentPage = this.getCurrentPage();
      this.ensureUsers();
      this.ensureSessionIntegrity();
      this.guardRoutes();
      this.bindLoginForm();
      this.bindForgotPassword();
      this.bindLogoutLinks();
      this.hydrateRememberedUser();
      this.touchSession();
      this.startSessionWatcher();
    },

    getCurrentPage() {
      return window.location.pathname.split('/').pop() || LOGIN_PAGE;
    },

    ensureUsers() {
      const users = this.getUsers();
      if (!users.length) {
        this.setUsers(DEFAULT_USERS);
      }

      if (this.app) {
        const state = this.app.getAppState();
        const authUsers = this.getUsers();
        const mergedUsers = authUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          lastAccess: user.lastAccess || null
        }));

        state.users = mergedUsers;
        this.app.setAppState(state);
      }
    },

    ensureSessionIntegrity() {
      const session = this.getSession();
      if (!session) return;

      const user = this.findUserById(session.userId);
      if (!user || user.status !== 'Ativo') {
        this.clearSession();
        return;
      }

      if (this.isSessionExpired(session)) {
        this.clearSession();
        if (this.currentPage !== LOGIN_PAGE) {
          this.redirectToLogin('Sessão expirada. Faça login novamente.');
        }
      }
    },

    guardRoutes() {
      const protectionEnabled = this.isLoginProtectionEnabled();
      const session = this.getSession();
      const isLoginPage = this.currentPage === LOGIN_PAGE;

      if (!protectionEnabled) return;

      if (!session && !isLoginPage) {
        this.redirectToLogin();
        return;
      }

      if (session && isLoginPage) {
        window.location.replace(HOME_PAGE);
      }
    },

    bindLoginForm() {
      const form = document.getElementById('login-form');
      if (!form) return;

      form.addEventListener('submit', (event) => {
        event.preventDefault();

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

        const user = this.findUserByEmail(email);
        if (!user) {
          this.notify('Usuário não encontrado.', 'danger');
          return;
        }

        if (user.status !== 'Ativo') {
          this.notify('Este usuário não está ativo.', 'danger');
          return;
        }

        const passwordHash = simpleHash(password);
        if (user.passwordHash !== passwordHash) {
          this.notify('Senha incorreta.', 'danger');
          return;
        }

        this.createSession(user, remember);
        this.updateUserLastAccess(user.id);
        this.persistCurrentUserInApp(user);
        this.notify('Login realizado com sucesso.', 'success');

        setTimeout(() => {
          window.location.href = HOME_PAGE;
        }, 250);
      });
    },

    bindForgotPassword() {
      const button = document.getElementById('btn-forgot-password');
      if (!button) return;

      button.addEventListener('click', () => {
        const demoUser = this.findUserByEmail('admin@husky.com');
        const hint = demoUser
          ? 'Acesso inicial padrão: admin@husky.com / 123456'
          : 'Procure o administrador do sistema para redefinir sua senha.';

        this.notify(hint, 'info');
      });
    },

    bindLogoutLinks() {
      const logoutAnchors = Array.from(document.querySelectorAll('a[href="index.html"]'));
      logoutAnchors.forEach((anchor) => {
        if (!anchor.closest('.sidebar-bottom')) return;

        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          this.logout();
        });
      });
    },

    hydrateRememberedUser() {
      if (this.currentPage !== LOGIN_PAGE) return;
      if (!this.isRememberLastUserEnabled()) return;

      const remembered = this.getRememberedUser();
      if (!remembered) return;

      const emailInput = document.getElementById('login-email');
      const rememberInput = document.getElementById('remember-access');

      if (emailInput && !emailInput.value) emailInput.value = remembered.email || '';
      if (rememberInput) rememberInput.checked = true;
    },

    touchSession() {
      const session = this.getSession();
      if (!session) return;
      session.lastActivityAt = new Date().toISOString();
      this.setSession(session);
    },

    startSessionWatcher() {
      if (this.currentPage === LOGIN_PAGE) return;

      const events = ['click', 'keydown', 'mousemove', 'touchstart'];
      const throttledTouch = throttle(() => this.touchSession(), 15000);
      events.forEach((eventName) => {
        window.addEventListener(eventName, throttledTouch, { passive: true });
      });

      setInterval(() => {
        const session = this.getSession();
        if (!session) return;
        if (this.isSessionExpired(session)) {
          this.clearSession();
          this.redirectToLogin('Sessão expirada. Faça login novamente.');
        }
      }, 30000);
    },

    createSession(user, remember) {
      const now = new Date().toISOString();
      const session = {
        userId: user.id,
        email: user.email,
        remember,
        createdAt: now,
        lastActivityAt: now
      };

      this.setSession(session);
      if (remember) {
        this.setRememberedUser({ email: user.email, name: user.name });
      } else {
        this.clearRememberedUser();
      }
    },

    logout() {
      this.clearSession();
      this.persistCurrentUserInApp(null);
      this.notify('Você saiu do sistema.', 'info');
      window.location.href = LOGIN_PAGE;
    },

    redirectToLogin(message = '') {
      if (message) {
        sessionStorage.setItem('husky_auth_message', message);
      }
      window.location.replace(LOGIN_PAGE);
    },

    showRedirectMessage() {
      const message = sessionStorage.getItem('husky_auth_message');
      if (!message) return;
      sessionStorage.removeItem('husky_auth_message');
      this.notify(message, 'warning');
    },

    isSessionExpired(session) {
      const timeoutMinutes = this.getSessionTimeout();
      const lastActivity = new Date(session.lastActivityAt || session.createdAt || Date.now()).getTime();
      const now = Date.now();
      return now - lastActivity > timeoutMinutes * 60 * 1000;
    },

    getSessionTimeout() {
      const state = this.app?.getAppState?.();
      return Number(state?.settings?.security?.sessionTimeout || 60);
    },

    isLoginProtectionEnabled() {
      const state = this.app?.getAppState?.();
      return Boolean(state?.settings?.security?.enableLoginProtection ?? true);
    },

    isRememberLastUserEnabled() {
      const state = this.app?.getAppState?.();
      return Boolean(state?.settings?.security?.rememberLastUser ?? true);
    },

    getUsers() {
      try {
        const raw = localStorage.getItem(this.getStorageKey(USERS_KEY));
        const users = raw ? JSON.parse(raw) : [];
        return Array.isArray(users) ? users : [];
      } catch (error) {
        console.error('[Auth] erro ao ler usuários', error);
        return [];
      }
    },

    setUsers(users) {
      localStorage.setItem(this.getStorageKey(USERS_KEY), JSON.stringify(users));
    },

    findUserByEmail(email) {
      return this.getUsers().find((user) => String(user.email || '').toLowerCase() === String(email || '').toLowerCase()) || null;
    },

    findUserById(id) {
      return this.getUsers().find((user) => user.id === id) || null;
    },

    updateUserLastAccess(userId) {
      const users = this.getUsers().map((user) => {
        if (user.id !== userId) return user;
        return {
          ...user,
          lastAccess: new Date().toISOString()
        };
      });
      this.setUsers(users);
    },

    persistCurrentUserInApp(user) {
      if (!this.app) return;

      const state = this.app.getAppState();
      state.currentUser = user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            lastAccess: user.lastAccess || null
          }
        : null;

      const authUsers = this.getUsers();
      state.users = authUsers.map((authUser) => ({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        status: authUser.status,
        lastAccess: authUser.lastAccess || null
      }));

      this.app.setAppState(state);
    },

    getSession() {
      try {
        const raw = sessionStorage.getItem(this.getStorageKey(SESSION_KEY)) || localStorage.getItem(this.getStorageKey(SESSION_KEY));
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.error('[Auth] erro ao ler sessão', error);
        return null;
      }
    },

    setSession(session) {
      const serialized = JSON.stringify(session);
      sessionStorage.setItem(this.getStorageKey(SESSION_KEY), serialized);
      if (session.remember) {
        localStorage.setItem(this.getStorageKey(SESSION_KEY), serialized);
      } else {
        localStorage.removeItem(this.getStorageKey(SESSION_KEY));
      }
    },

    clearSession() {
      sessionStorage.removeItem(this.getStorageKey(SESSION_KEY));
      localStorage.removeItem(this.getStorageKey(SESSION_KEY));
    },

    setRememberedUser(payload) {
      localStorage.setItem(this.getStorageKey('remembered_user'), JSON.stringify(payload));
    },

    getRememberedUser() {
      try {
        const raw = localStorage.getItem(this.getStorageKey('remembered_user'));
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },

    clearRememberedUser() {
      localStorage.removeItem(this.getStorageKey('remembered_user'));
    },

    getStorageKey(key) {
      if (this.app?.getStorageKey) {
        return this.app.getStorageKey(key);
      }
      return `husky_system:${key}`;
    },

    notify(message, type = 'info') {
      if (this.app?.showToast) {
        this.app.showToast(message, type);
      } else {
        window.alert(message);
      }
    }
  };

  function simpleHash(value) {
    const text = String(value || '');
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }
    return String(hash);
  }

  function throttle(callback, delay = 300) {
    let lastTime = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastTime >= delay) {
        lastTime = now;
        callback(...args);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Auth.showRedirectMessage();
  });

  window.HuskyAuth = Auth;
})();

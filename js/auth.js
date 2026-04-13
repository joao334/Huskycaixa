(() => {
  'use strict';

  const LOGIN_PAGE = 'index.html';
  const HOME_PAGE = 'home.html';
  const REMEMBERED_USER_KEY = 'remembered_user';

  const Auth = {
    init() {
      this.app = window.HuskyApp || null;
      this.firebase = window.HuskyFirebase || null;
      this.currentPage = this.getCurrentPage();

      if (!this.firebase) {
        console.error('[Auth] Firebase não encontrado. Verifique o firebase-init.js.');
        return;
      }

      this.bindLoginForm();
      this.bindRegisterForm();
      this.bindForgotPassword();
      this.bindLogoutButton();
      this.hydrateRememberedUser();
      this.observeAuthState();
    },

    getCurrentPage() {
      return window.location.pathname.split('/').pop() || LOGIN_PAGE;
    },

    isLoginPage() {
      return this.currentPage === LOGIN_PAGE;
    },

    observeAuthState() {
  const { auth, onAuthStateChanged } = this.firebase;

  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        let profile = null;

        try {
          profile = await this.ensureUserProfile(user);
        } catch (profileError) {
          console.error('[Auth] erro ao carregar perfil no Firestore', profileError);

          profile = {
            id: user.uid,
            name: user.displayName || this.getNameFromEmail(user.email),
            email: user.email || '',
            role: 'Administrador',
            status: 'Ativo',
            lastAccess: new Date().toISOString()
          };
        }

        this.persistCurrentUserInApp(profile);

        if (this.isLoginPage()) {
          window.location.replace(HOME_PAGE);
        }
      } else {
        this.persistCurrentUserInApp(null);

        if (!this.isLoginPage()) {
          this.redirectToLogin();
        }
      }
    } catch (error) {
      console.error('[Auth] erro ao observar autenticação', error);
      this.notify('Erro ao validar a sessão do usuário.', 'danger');
    }
  });
},

    bindLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
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

    try {
      const { auth, signInWithEmailAndPassword } = this.firebase;
      await signInWithEmailAndPassword(auth, email, password);

      if (remember) {
        this.setRememberedUser({ email });
      } else {
        this.clearRememberedUser();
      }

      this.notify('Login realizado com sucesso.', 'success');
    } catch (error) {
      console.error('[Auth] erro no login', error);
      this.notify(this.getFirebaseErrorMessage(error), 'danger');
    }
  });
},

    bindRegisterForm() {
      const registerForm = document.getElementById('register-form');
      const registerButton = document.getElementById('btn-create-account');

      if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          await this.handleRegister();
        });
        return;
      }

      if (registerButton) {
        registerButton.addEventListener('click', async (event) => {
          event.preventDefault();
          await this.handleRegister();
        });
      }
    },

    async handleRegister() {
  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmPasswordInput = document.getElementById('register-confirm-password');

  if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
    this.notify('Os campos de cadastro ainda não estão prontos na tela de login.', 'warning');
    return;
  }

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
    const { auth, createUserWithEmailAndPassword } = this.firebase;
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await this.createUserProfile(credential.user, {
        name,
        email,
        role: 'Administrador',
        status: 'Ativo'
      });
    } catch (profileError) {
      console.error('[Auth] conta criada, mas perfil no Firestore falhou', profileError);
    }

    this.setRememberedUser({ email });
    this.notify('Login criado com sucesso.', 'success');
  } catch (error) {
    console.error('[Auth] erro ao criar login', error);
    this.notify(this.getFirebaseErrorMessage(error), 'danger');
  }
},

    async logout() {
      try {
        const { auth, signOut } = this.firebase;
        await signOut(auth);

        this.persistCurrentUserInApp(null);
        this.notify('Você saiu do sistema.', 'info');
        window.location.href = LOGIN_PAGE;
      } catch (error) {
        console.error('[Auth] erro ao sair', error);
        this.notify('Não foi possível sair do sistema.', 'danger');
      }
    },

    async ensureUserProfile(user) {
      const { db, doc, getDoc, setDoc, serverTimestamp } = this.firebase;
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        const payload = {
          name: user.displayName || this.getNameFromEmail(user.email),
          email: user.email || '',
          role: 'Administrador',
          status: 'Ativo',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastAccess: serverTimestamp()
        };

        await setDoc(userRef, payload);
        return {
          id: user.uid,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAccess: new Date().toISOString()
        };
      }

      const profile = snapshot.data();

      await setDoc(
        userRef,
        {
          updatedAt: serverTimestamp(),
          lastAccess: serverTimestamp()
        },
        { merge: true }
      );

      return {
        id: user.uid,
        name: profile.name || this.getNameFromEmail(user.email),
        email: profile.email || user.email || '',
        role: profile.role || 'Administrador',
        status: profile.status || 'Ativo',
        lastAccess: new Date().toISOString()
      };
    },

    async createUserProfile(user, data) {
      const { db, doc, setDoc, serverTimestamp } = this.firebase;
      const userRef = doc(db, 'users', user.uid);

      await setDoc(userRef, {
        name: data.name,
        email: data.email,
        role: data.role || 'Administrador',
        status: data.status || 'Ativo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastAccess: serverTimestamp()
      });
    },

    async touchUserProfile(user) {
      const { db, doc, setDoc, serverTimestamp } = this.firebase;
      const userRef = doc(db, 'users', user.uid);

      await setDoc(
        userRef,
        {
          updatedAt: serverTimestamp(),
          lastAccess: serverTimestamp()
        },
        { merge: true }
      );
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

      if (!Array.isArray(state.users)) {
        state.users = [];
      }

      if (user) {
        const exists = state.users.findIndex((entry) => entry.id === user.id);

        if (exists >= 0) {
          state.users[exists] = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            lastAccess: user.lastAccess || null
          };
        } else {
          state.users.unshift({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            lastAccess: user.lastAccess || null
          });
        }
      }

      this.app.setAppState(state);
    },

    hydrateRememberedUser() {
      if (!this.isLoginPage()) return;

      const remembered = this.getRememberedUser();
      if (!remembered) return;

      const emailInput = document.getElementById('login-email');
      const rememberInput = document.getElementById('remember-access');

      if (emailInput && !emailInput.value) {
        emailInput.value = remembered.email || '';
      }

      if (rememberInput) {
        rememberInput.checked = true;
      }
    },

    setRememberedUser(payload) {
      localStorage.setItem(this.getStorageKey(REMEMBERED_USER_KEY), JSON.stringify(payload));
    },

    getRememberedUser() {
      try {
        const raw = localStorage.getItem(this.getStorageKey(REMEMBERED_USER_KEY));
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },

    clearRememberedUser() {
      localStorage.removeItem(this.getStorageKey(REMEMBERED_USER_KEY));
    },

    redirectToLogin() {
      window.location.replace(LOGIN_PAGE);
    },

    getStorageKey(key) {
      if (this.app?.getStorageKey) {
        return this.app.getStorageKey(key);
      }
      return `husky_system:${key}`;
    },

    getNameFromEmail(email) {
      const raw = String(email || '').split('@')[0] || 'Usuário';
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    },

    getFirebaseErrorMessage(error) {
      const code = String(error?.code || '');

      if (code.includes('auth/email-already-in-use')) return 'Esse e-mail já está em uso.';
      if (code.includes('auth/invalid-email')) return 'O e-mail informado é inválido.';
      if (code.includes('auth/weak-password')) return 'A senha é muito fraca.';
      if (code.includes('auth/invalid-credential')) return 'E-mail ou senha incorretos.';
      if (code.includes('auth/user-not-found')) return 'Usuário não encontrado.';
      if (code.includes('auth/wrong-password')) return 'Senha incorreta.';
      if (code.includes('auth/network-request-failed')) return 'Falha de conexão com a internet.';
      if (code.includes('auth/too-many-requests')) return 'Muitas tentativas. Tente novamente mais tarde.';
      if (code.includes('auth/missing-password')) return 'Informe a senha.';
      if (code.includes('auth/missing-email')) return 'Informe o e-mail.';

      return error?.message || 'Não foi possível concluir a autenticação.';
    },

    notify(message, type = 'info') {
      if (this.app?.showToast) {
        this.app.showToast(message, type);
      } else {
        window.alert(message);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
  });

  window.HuskyAuth = Auth;
})();
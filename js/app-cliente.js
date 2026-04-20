(() => {
  'use strict';

  const STORAGE_KEY = 'husky_client_cart';
  const LAST_ORDER_KEY = 'husky_client_last_order';
  const PUBLIC_CATALOG_BUCKET = 'husky-files';
  const DELIVERY_FEE = 0;

  const STAGE_META = {
    aguardando_aceite: { label: 'Aguardando aceitar', className: 'stage-aguardando_aceite' },
    aceito: { label: 'Aceito', className: 'stage-aceito' },
    confeitando: { label: 'Confeitando', className: 'stage-confeitando' },
    pronto: { label: 'Pronto', className: 'stage-pronto' },
    saiu_entrega: { label: 'Saiu para entrega', className: 'stage-saiu_entrega' },
    finalizado: { label: 'Finalizado', className: 'stage-finalizado' },
    cancelado: { label: 'Cancelado', className: 'stage-cancelado' },
    importado: { label: 'Importado', className: 'stage-finalizado' }
  };

  const STORE_APP = {
    supabase: null,
    workspaceId: window.HUSKY_WORKSPACE_ID || 'husky-principal',
    refs: {},
    catalog: [],
    cart: [],
    myOrders: [],
    filters: { category: '', search: '' },
    storefront: {
      store_name: 'Husky Confeitaria',
      store_subtitle: 'Pedidos online no celular',
      hero_title: 'Peça seus doces favoritos.',
      hero_text: 'Escolha os produtos, monte o carrinho e finalize com login somente no pagamento.',
      pix_key: '',
      pix_copy_paste: '',
      pix_qr_image: '',
      catalog_layout: 'compact',
      checkout_requires_login: true
    },
    submitting: false,
    sessionUser: null,
    sessionProfile: null,
    catalogSource: 'supabase',
    authModalMode: 'login',
    pendingCheckoutAfterAuth: false,
    orderSubscription: null,

    init() {
      if (!document.getElementById('client-app')) return;
      this.cacheRefs();
      this.bindEvents();
      this.loadCart();
      this.updateCartUI();
      this.restoreLastOrder();
      this.registerServiceWorker();
      this.updateDeliveryModeUI();
      this.bootstrap();
    },

    cacheRefs() {
      this.refs = {
        statusBanner: document.getElementById('client-status-banner'),
        storeSubtitleHeader: document.getElementById('store-subtitle-header'),
        storefrontTitle: document.getElementById('storefront-title'),
        storefrontCopy: document.getElementById('storefront-copy'),
        catalogGrid: document.getElementById('client-catalog-grid'),
        categories: document.getElementById('catalog-categories'),
        search: document.getElementById('catalog-search'),
        btnRefreshCatalog: document.getElementById('btn-refresh-catalog'),
        btnOpenCart: document.getElementById('btn-open-cart'),
        btnCloseCart: document.getElementById('btn-close-cart'),
        btnHeroOpenCart: document.getElementById('btn-hero-open-cart'),
        btnScrollCatalog: document.getElementById('btn-scroll-catalog'),
        btnFloatingCart: document.getElementById('btn-floating-cart'),
        btnSubmitOrder: document.getElementById('btn-submit-order'),
        btnAccount: document.getElementById('btn-account'),
        btnOpenAuthFromCart: document.getElementById('btn-open-auth-from-cart'),
        btnCopyPixCode: document.getElementById('btn-copy-pix-code'),
        btnForgotClientPassword: document.getElementById('btn-forgot-client-password'),
        cartDrawer: document.getElementById('cart-drawer'),
        cartBackdrop: document.getElementById('cart-backdrop'),
        cartCountBadge: document.getElementById('cart-count-badge'),
        cartItemsContainer: document.getElementById('cart-items-container'),
        cartSubtotal: document.getElementById('cart-subtotal'),
        cartDeliveryFee: document.getElementById('cart-delivery-fee'),
        cartTotal: document.getElementById('cart-total'),
        customerName: document.getElementById('customer-name'),
        customerPhone: document.getElementById('customer-phone'),
        customerEmail: document.getElementById('customer-email'),
        customerDocument: document.getElementById('customer-document'),
        deliveryType: document.getElementById('delivery-type'),
        paymentMethod: document.getElementById('payment-method'),
        deliveryAddress: document.getElementById('delivery-address'),
        deliveryNeighborhood: document.getElementById('delivery-neighborhood'),
        deliveryReference: document.getElementById('delivery-reference'),
        orderNotes: document.getElementById('order-notes'),
        successBox: document.getElementById('client-order-success'),
        sourcePill: document.getElementById('catalog-source-pill'),
        countPill: document.getElementById('catalog-count-pill'),
        productsCount: document.getElementById('catalog-products-count'),
        cartItemsCount: document.getElementById('catalog-cart-items-count'),
        floatingCartTotal: document.getElementById('floating-cart-total'),
        customerOrdersList: document.getElementById('customer-orders-list'),
        customerLoginPill: document.getElementById('customer-login-pill'),
        customerOrdersCopy: document.getElementById('customer-orders-copy'),
        checkoutAuthTitle: document.getElementById('checkout-auth-title'),
        checkoutAuthCopy: document.getElementById('checkout-auth-copy'),
        pixPaymentBox: document.getElementById('pix-payment-box'),
        pixQrImage: document.getElementById('pix-qr-image'),
        pixKeyText: document.getElementById('pix-key-text'),
        pixCopyCode: document.getElementById('pix-copy-code'),
        pixStatusPill: document.getElementById('pix-status-pill'),
        authModal: document.getElementById('auth-modal'),
        authModalBackdrop: document.getElementById('auth-modal-backdrop'),
        btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
        authTabs: Array.from(document.querySelectorAll('[data-auth-tab]')),
        loginForm: document.getElementById('client-login-form'),
        registerForm: document.getElementById('client-register-form'),
        authFeedbackBox: document.getElementById('auth-feedback-box'),
        authLoginEmail: document.getElementById('auth-login-email'),
        authLoginPassword: document.getElementById('auth-login-password'),
        authRegisterName: document.getElementById('auth-register-name'),
        authRegisterEmail: document.getElementById('auth-register-email'),
        authRegisterPassword: document.getElementById('auth-register-password'),
        authRegisterPasswordConfirm: document.getElementById('auth-register-password-confirm')
      };
    },

    bindEvents() {
      this.refs.btnRefreshCatalog?.addEventListener('click', () => this.refreshAll(true));
      this.refs.btnOpenCart?.addEventListener('click', () => this.openCart());
      this.refs.btnCloseCart?.addEventListener('click', () => this.closeCart());
      this.refs.btnHeroOpenCart?.addEventListener('click', () => this.openCart());
      this.refs.btnFloatingCart?.addEventListener('click', () => this.openCart());
      this.refs.btnOpenAuthFromCart?.addEventListener('click', () => this.openAuthModal());
      this.refs.cartBackdrop?.addEventListener('click', () => this.closeCart());
      this.refs.authModalBackdrop?.addEventListener('click', () => this.closeAuthModal());
      this.refs.btnCloseAuthModal?.addEventListener('click', () => this.closeAuthModal());
      this.refs.btnAccount?.addEventListener('click', () => this.handleAccountAction());
      this.refs.btnScrollCatalog?.addEventListener('click', () => {
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      this.refs.btnCopyPixCode?.addEventListener('click', () => this.copyPixCode());
      this.refs.btnSubmitOrder?.addEventListener('click', () => this.submitOrder());
      this.refs.deliveryType?.addEventListener('change', () => {
        this.updateDeliveryModeUI();
        this.updateCartUI();
      });
      this.refs.paymentMethod?.addEventListener('change', () => {
        this.renderPixPayment();
        this.updateCheckoutAuthBox();
      });
      this.refs.search?.addEventListener('input', () => {
        this.filters.search = this.refs.search.value || '';
        this.renderCatalog();
      });
      this.refs.customerPhone?.addEventListener('input', () => {
        this.refs.customerPhone.value = this.formatPhoneInput(this.refs.customerPhone.value);
      });
      this.refs.customerDocument?.addEventListener('input', () => {
        this.refs.customerDocument.value = this.formatDocumentInput(this.refs.customerDocument.value);
      });

      this.refs.catalogGrid?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="add-to-cart"]');
        if (!button) return;
        const id = button.getAttribute('data-product-id');
        this.addToCart(id);
      });
      this.refs.categories?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-category]');
        if (!button) return;
        this.filters.category = button.getAttribute('data-category') || '';
        this.renderCategories();
        this.renderCatalog();
      });
      this.refs.cartItemsContainer?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('[data-cart-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-cart-action');
        const productId = actionBtn.getAttribute('data-product-id');
        if (action === 'increase') this.changeQuantity(productId, 1);
        if (action === 'decrease') this.changeQuantity(productId, -1);
        if (action === 'remove') this.removeFromCart(productId);
      });
      this.refs.authTabs.forEach((button) => {
        button.addEventListener('click', () => this.switchAuthTab(button.dataset.authTab || 'login'));
      });
      this.refs.loginForm?.addEventListener('submit', (event) => this.handleLogin(event));
      this.refs.registerForm?.addEventListener('submit', (event) => this.handleRegister(event));
      this.refs.btnForgotClientPassword?.addEventListener('click', () => this.handleForgotPassword());
    },

    async bootstrap() {
      if (!window.supabase || !window.HUSKY_SUPABASE_URL || !window.HUSKY_SUPABASE_KEY) {
        this.setStatus('Configuração ausente', 'Verifique o env.js do Supabase para ativar o catálogo e os pedidos.', 'error');
        return;
      }

      this.supabase = window.supabase.createClient(window.HUSKY_SUPABASE_URL, window.HUSKY_SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      this.supabase.auth.onAuthStateChange(async (_event, session) => {
        this.sessionUser = session?.user || null;
        await this.ensureCustomerProfile();
        await this.afterSessionChanged();
      });

      const { data } = await this.supabase.auth.getSession();
      this.sessionUser = data?.session?.user || null;
      await this.ensureCustomerProfile();
      await this.refreshAll();
      await this.afterSessionChanged();
    },

    async refreshAll(showFeedback = false) {
      await Promise.allSettled([
        this.loadStorefrontSettings(),
        this.loadCatalog(showFeedback)
      ]);
      this.applyStorefrontText();
      this.renderPixPayment();
    },

    async loadStorefrontSettings() {
      try {
        const { data, error } = await this.supabase
          .from('public_storefront_settings')
          .select('*')
          .eq('workspace_id', this.workspaceId)
          .maybeSingle();

        if (!error && data) {
          this.storefront = {
            ...this.storefront,
            ...data
          };
        }
      } catch (error) {
        console.warn('[Husky Cliente] storefront público indisponível.', error);
      }
    },

    applyStorefrontText() {
      if (this.refs.storeSubtitleHeader) this.refs.storeSubtitleHeader.textContent = this.storefront.store_subtitle || 'Pedidos online no celular';
      if (this.refs.storefrontTitle) this.refs.storefrontTitle.textContent = this.storefront.hero_title || 'Peça seus doces favoritos.';
      if (this.refs.storefrontCopy) this.refs.storefrontCopy.textContent = this.storefront.hero_text || 'Escolha os produtos, monte o carrinho e finalize com login somente no pagamento.';
    },

    async loadCatalog(showFeedback = false) {
      this.setStatus('Carregando catálogo...', 'Estamos preparando o cardápio para você.', 'default');
      let dbError = null;

      try {
        const { data, error } = await this.supabase
          .from('customer_catalog_items')
          .select('*')
          .eq('workspace_id', this.workspaceId)
          .eq('active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        this.catalog = this.normalizeCatalogList(data);
        this.catalogSource = 'supabase';
        this.afterCatalogLoad(showFeedback);
        return;
      } catch (error) {
        dbError = error;
        console.error('[Husky Cliente] erro ao carregar catálogo via tabela', error);
      }

      try {
        const fallbackCatalog = await this.fetchCatalogFromPublicStorage();
        this.catalog = this.normalizeCatalogList(fallbackCatalog);
        this.catalogSource = 'storage';
        this.afterCatalogLoad(showFeedback, true);
      } catch (fallbackError) {
        console.error('[Husky Cliente] erro ao carregar catálogo via storage', fallbackError);
        this.catalog = [];
        this.catalogSource = 'indisponível';
        this.renderCategories();
        this.renderCatalog();
        this.syncCatalogMeta();
        const message = this.getCatalogErrorMessage(dbError || fallbackError);
        this.setStatus(message.title, message.text, 'error');
      }
    },

    afterCatalogLoad(showFeedback = false, fromFallback = false) {
      this.renderCategories();
      this.renderCatalog();
      this.syncCatalogMeta();
      if (!this.catalog.length) {
        this.setStatus('Catálogo ainda não publicado', 'No painel interno, acesse Pedidos online e clique em “Publicar catálogo”.', 'default');
        return;
      }
      const sourceLabel = fromFallback ? 'catálogo público' : 'catálogo sincronizado';
      const detail = showFeedback
        ? `Tudo certo. Atualizamos ${this.catalog.length} item(ns) do ${sourceLabel}.`
        : `Escolha seus produtos, monte o carrinho e envie seu pedido. ${this.catalog.length} item(ns) disponíveis.`;
      this.setStatus('Catálogo carregado', detail, 'success');
    },

    getCatalogStoragePath() {
      return `${this.workspaceId}/catalog/public/catalog.json`;
    },

    async fetchCatalogFromPublicStorage() {
      const { data } = this.supabase.storage.from(PUBLIC_CATALOG_BUCKET).getPublicUrl(this.getCatalogStoragePath());
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('storage_public_url_unavailable');
      const response = await fetch(`${publicUrl}?v=${Date.now()}`, { method: 'GET', cache: 'no-store' });
      if (!response.ok) throw new Error(`storage_catalog_${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    },

    normalizeCatalogList(data) {
      return (Array.isArray(data) ? data : []).map((item, index) => ({
        ...item,
        id: item.id || item.product_id || `catalog-${index}`,
        product_id: item.product_id || item.id || `product-${index}`,
        name: item.name || 'Produto',
        short_name: item.short_name || '',
        category: item.category || '',
        description: item.description || '',
        unit: item.unit || 'unidade',
        price: Number(item.price || 0),
        image_url: item.image_url || 'assets/img/logo-husky.png',
        featured: Boolean(item.featured),
        active: item.active !== false,
        sort_order: Number(item.sort_order || index + 1)
      }));
    },

    renderCategories() {
      const categories = ['', ...Array.from(new Set(this.catalog.map((item) => String(item.category || '').trim()).filter(Boolean)))];
      this.refs.categories.innerHTML = categories.map((category) => {
        const label = category || 'Todos';
        const active = (this.filters.category || '') === category;
        return `<button type="button" class="chip-client ${active ? 'active' : ''}" data-category="${this.escapeAttribute(category)}">${this.escapeHtml(label)}</button>`;
      }).join('');
    },

    getFilteredCatalog() {
      const search = this.normalizeText(this.filters.search || '');
      return this.catalog.filter((item) => {
        const categoryOk = !this.filters.category || String(item.category || '') === this.filters.category;
        const text = `${item.name || ''} ${item.short_name || ''} ${item.description || ''} ${item.category || ''}`;
        const searchOk = !search || this.normalizeText(text).includes(search);
        return categoryOk && searchOk;
      });
    },

    renderCatalog() {
      const items = this.getFilteredCatalog();
      if (!items.length) {
        this.refs.catalogGrid.innerHTML = '<article class="catalog-empty-client">Nenhum produto encontrado no catálogo. Tente outro termo ou selecione outra categoria.</article>';
        return;
      }

      this.refs.catalogGrid.innerHTML = items.map((item) => {
        const image = item.image_url || 'assets/img/logo-husky.png';
        const badge = item.featured ? 'Em destaque' : (item.category || 'Catálogo Husky');
        return `
          <article class="product-card-client">
            <div class="product-media-client">
              <img src="${this.escapeAttribute(image)}" alt="${this.escapeAttribute(item.name || 'Produto')}" loading="lazy" />
              <div class="product-media-overlay-client">
                <span class="product-tag-client">${this.escapeHtml(badge)}</span>
              </div>
            </div>
            <div class="product-content-client">
              <div>
                <h3>${this.escapeHtml(item.name || 'Produto')}</h3>
                <p>${this.escapeHtml(item.description || item.short_name || 'Delicioso, feito com carinho pela Husky.')}</p>
              </div>
              <div class="product-footer-client">
                <div class="price-client">
                  <strong>${this.formatCurrency(item.price)}</strong>
                  <span>${this.escapeHtml(item.unit || 'unidade')}</span>
                </div>
                <button type="button" class="client-btn small" data-action="add-to-cart" data-product-id="${this.escapeAttribute(item.product_id)}">+ Carrinho</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    },

    syncCatalogMeta() {
      const sourceLabel = this.catalogSource === 'storage'
        ? 'Fonte: catálogo público'
        : this.catalogSource === 'supabase'
          ? 'Fonte: sistema online'
          : 'Fonte: indisponível';
      if (this.refs.sourcePill) this.refs.sourcePill.textContent = sourceLabel;
      if (this.refs.countPill) this.refs.countPill.textContent = `${this.catalog.length} item(ns)`;
      if (this.refs.productsCount) this.refs.productsCount.textContent = String(this.catalog.length);
      if (this.refs.cartItemsCount) {
        const totalItems = this.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        this.refs.cartItemsCount.textContent = String(totalItems);
      }
    },

    openCart() {
      this.refs.cartDrawer?.classList.add('open');
      this.refs.cartBackdrop?.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    closeCart() {
      this.refs.cartDrawer?.classList.remove('open');
      this.refs.cartBackdrop?.classList.remove('open');
      document.body.style.overflow = '';
    },

    openAuthModal(mode = 'login') {
      this.switchAuthTab(mode);
      this.refs.authModal?.classList.add('open');
      this.refs.authModalBackdrop?.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    closeAuthModal() {
      this.refs.authModal?.classList.remove('open');
      this.refs.authModalBackdrop?.classList.remove('open');
      if (!this.refs.cartDrawer?.classList.contains('open')) document.body.style.overflow = '';
      this.setAuthFeedback('');
    },

    switchAuthTab(mode = 'login') {
      this.authModalMode = mode;
      this.refs.authTabs.forEach((button) => button.classList.toggle('active', button.dataset.authTab === mode));
      this.refs.loginForm?.classList.toggle('active', mode === 'login');
      this.refs.registerForm?.classList.toggle('active', mode === 'register');
    },

    handleAccountAction() {
      if (this.sessionUser) {
        this.signOutCustomer();
        return;
      }
      this.openAuthModal('login');
    },

    async ensureCustomerProfile() {
      if (!this.sessionUser) {
        this.sessionProfile = null;
        return;
      }
      try {
        const payload = {
          id: this.sessionUser.id,
          email: this.sessionUser.email || '',
          name: this.sessionUser.user_metadata?.name || this.refs.customerName?.value.trim() || this.getNameFromEmail(this.sessionUser.email),
          role: 'Cliente',
          status: 'Ativo',
          updated_at: new Date().toISOString()
        };
        const { data, error } = await this.supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select('id, name, email, role, status')
          .single();
        if (error) throw error;
        this.sessionProfile = data;
      } catch (error) {
        console.warn('[Husky Cliente] não foi possível garantir o perfil do cliente.', error);
      }
    },

    async afterSessionChanged() {
      this.updateAccountUi();
      this.prefillCustomerData();
      this.updateCheckoutAuthBox();
      this.renderPixPayment();
      if (this.sessionUser) {
        await this.loadMyOrders();
        this.subscribeToMyOrders();
        if (this.pendingCheckoutAfterAuth) {
          this.pendingCheckoutAfterAuth = false;
          this.closeAuthModal();
          this.openCart();
          this.submitOrder();
        }
      } else {
        this.myOrders = [];
        this.unsubscribeFromMyOrders();
        this.renderMyOrders();
      }
    },

    updateAccountUi() {
      const logged = Boolean(this.sessionUser);
      if (this.refs.btnAccount) this.refs.btnAccount.textContent = logged ? 'Sair' : 'Entrar';
      if (this.refs.customerLoginPill) this.refs.customerLoginPill.textContent = logged ? 'Logado' : 'Sem login';
      if (this.refs.customerOrdersCopy) {
        this.refs.customerOrdersCopy.textContent = logged
          ? 'Acompanhe aqui as etapas dos seus pedidos.'
          : 'Faça login para acompanhar as etapas do seu pedido em tempo real.';
      }
    },

    prefillCustomerData() {
      if (!this.sessionUser) return;
      const name = this.sessionUser.user_metadata?.name || this.sessionProfile?.name || this.refs.customerName?.value || '';
      if (this.refs.customerName && !this.refs.customerName.value) this.refs.customerName.value = name;
      if (this.refs.customerEmail) this.refs.customerEmail.value = this.sessionUser.email || this.refs.customerEmail.value || '';
    },

    updateCheckoutAuthBox() {
      const requiresLogin = this.storefront.checkout_requires_login !== false;
      const paymentMethod = this.refs.paymentMethod?.value || 'Pix';
      const isPix = paymentMethod === 'Pix';
      const logged = Boolean(this.sessionUser);
      const title = !requiresLogin
        ? 'Pagamento liberado'
        : logged
          ? 'Conta conectada'
          : 'Você pode navegar sem login';
      const copy = !requiresLogin
        ? 'Seu pedido já pode ser enviado normalmente.'
        : logged
          ? 'Perfeito. Seu login já está pronto para fechar o pedido e acompanhar as etapas.'
          : 'Na hora de finalizar, você entra na sua conta para acompanhar o pedido depois.';
      if (this.refs.checkoutAuthTitle) this.refs.checkoutAuthTitle.textContent = title;
      if (this.refs.checkoutAuthCopy) this.refs.checkoutAuthCopy.textContent = copy + (isPix ? ' O Pix pode ser pago com QR Code abaixo.' : '');
      if (this.refs.btnOpenAuthFromCart) {
        this.refs.btnOpenAuthFromCart.textContent = logged ? 'Conta conectada' : 'Entrar / cadastrar';
        this.refs.btnOpenAuthFromCart.disabled = logged;
      }
      if (this.refs.btnSubmitOrder) {
        this.refs.btnSubmitOrder.textContent = !requiresLogin || logged ? 'Enviar pedido' : 'Entrar para pagar';
      }
    },

    renderPixPayment() {
      const isPix = this.refs.paymentMethod?.value === 'Pix';
      const hasPixInfo = Boolean(this.storefront.pix_key || this.storefront.pix_copy_paste || this.storefront.pix_qr_image);
      if (!this.refs.pixPaymentBox) return;
      this.refs.pixPaymentBox.hidden = !isPix;
      if (!isPix) return;
      if (this.refs.pixKeyText) this.refs.pixKeyText.textContent = this.storefront.pix_key || 'Não configurada';
      if (this.refs.pixCopyCode) this.refs.pixCopyCode.value = this.storefront.pix_copy_paste || '';
      if (this.refs.pixQrImage) {
        this.refs.pixQrImage.src = this.storefront.pix_qr_image || 'assets/img/logo-husky.png';
        this.refs.pixQrImage.style.opacity = this.storefront.pix_qr_image ? '1' : '.45';
      }
      if (this.refs.pixStatusPill) this.refs.pixStatusPill.textContent = hasPixInfo ? 'Pix ativo' : 'Pix pendente';
    },

    copyPixCode() {
      const value = String(this.refs.pixCopyCode?.value || '').trim();
      if (!value) {
        this.setStatus('Pix não configurado', 'A equipe ainda não publicou o Pix copia e cola.', 'error');
        return;
      }
      navigator.clipboard?.writeText(value)
        .then(() => this.setStatus('Pix copiado', 'O código Pix foi copiado para sua área de transferência.', 'success'))
        .catch(() => this.setStatus('Não foi possível copiar', 'Tente copiar o código manualmente.', 'error'));
    },

    loadCart() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this.cart = raw ? JSON.parse(raw) : [];
      } catch (_error) {
        this.cart = [];
      }
    },

    saveCart() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cart));
    },

    addToCart(productId) {
      const product = this.catalog.find((item) => item.product_id === productId);
      if (!product) return;
      const existing = this.cart.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.unshift({
          productId,
          catalogId: product.id,
          name: product.name,
          price: Number(product.price || 0),
          unit: product.unit || 'unidade',
          imageUrl: product.image_url || '',
          quantity: 1
        });
      }
      this.saveCart();
      this.updateCartUI();
      this.setStatus('Item adicionado', `${product.name} foi adicionado ao seu carrinho.`, 'success');
      this.openCart();
    },

    changeQuantity(productId, delta) {
      const item = this.cart.find((entry) => entry.productId === productId);
      if (!item) return;
      item.quantity = Math.max(1, Number(item.quantity || 0) + Number(delta || 0));
      this.saveCart();
      this.updateCartUI();
    },

    removeFromCart(productId) {
      this.cart = this.cart.filter((entry) => entry.productId !== productId);
      this.saveCart();
      this.updateCartUI();
    },

    getCartSubtotal() {
      return this.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    },

    getDeliveryFee() {
      return this.refs.deliveryType?.value === 'Entrega' ? DELIVERY_FEE : 0;
    },

    getCartTotal() {
      return this.getCartSubtotal() + this.getDeliveryFee();
    },

    updateCartUI() {
      const totalItems = this.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const total = this.getCartTotal();
      if (this.refs.cartCountBadge) this.refs.cartCountBadge.textContent = String(totalItems);
      if (this.refs.cartSubtotal) this.refs.cartSubtotal.textContent = this.formatCurrency(this.getCartSubtotal());
      if (this.refs.cartDeliveryFee) this.refs.cartDeliveryFee.textContent = this.formatCurrency(this.getDeliveryFee());
      if (this.refs.cartTotal) this.refs.cartTotal.textContent = this.formatCurrency(total);
      if (this.refs.floatingCartTotal) this.refs.floatingCartTotal.textContent = this.formatCurrency(total);
      if (this.refs.btnFloatingCart) this.refs.btnFloatingCart.style.display = totalItems ? 'inline-flex' : 'none';
      this.syncCatalogMeta();
      this.updateCheckoutAuthBox();
      if (!this.cart.length) {
        this.refs.cartItemsContainer.innerHTML = '<div class="cart-empty">Seu carrinho está vazio. Escolha os produtos do catálogo para montar o pedido.</div>';
        return;
      }
      this.refs.cartItemsContainer.innerHTML = this.cart.map((item) => `
        <article class="cart-item">
          <div class="cart-item-top">
            <div>
              <strong>${this.escapeHtml(item.name)}</strong>
              <div class="text-muted-client">${this.escapeHtml(item.unit || 'unidade')}</div>
            </div>
            <strong>${this.formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
          </div>
          <div class="cart-item-actions">
            <div class="qty-box">
              <button type="button" data-cart-action="decrease" data-product-id="${this.escapeAttribute(item.productId)}">−</button>
              <span>${Number(item.quantity || 0)}</span>
              <button type="button" data-cart-action="increase" data-product-id="${this.escapeAttribute(item.productId)}">+</button>
            </div>
            <button type="button" class="client-btn secondary small" data-cart-action="remove" data-product-id="${this.escapeAttribute(item.productId)}">Remover</button>
          </div>
        </article>
      `).join('');
    },

    updateDeliveryModeUI() {
      const isDelivery = this.refs.deliveryType?.value === 'Entrega';
      [this.refs.deliveryAddress, this.refs.deliveryNeighborhood, this.refs.deliveryReference].forEach((field) => {
        if (!field) return;
        field.disabled = !isDelivery;
        if (!isDelivery) field.value = '';
      });
    },

    validateOrder() {
      if (!this.cart.length) {
        this.setStatus('Carrinho vazio', 'Adicione pelo menos um produto antes de enviar o pedido.', 'error');
        this.openCart();
        return false;
      }
      if (!this.refs.customerName?.value.trim()) {
        this.setStatus('Nome obrigatório', 'Informe seu nome para enviar o pedido.', 'error');
        this.openCart();
        this.refs.customerName?.focus();
        return false;
      }
      if (!this.refs.customerPhone?.value.trim()) {
        this.setStatus('WhatsApp obrigatório', 'Informe um WhatsApp para contato.', 'error');
        this.openCart();
        this.refs.customerPhone?.focus();
        return false;
      }
      if (this.refs.deliveryType?.value === 'Entrega' && !this.refs.deliveryAddress?.value.trim()) {
        this.setStatus('Endereço obrigatório', 'Informe o endereço para entrega.', 'error');
        this.openCart();
        this.refs.deliveryAddress?.focus();
        return false;
      }
      if (this.storefront.checkout_requires_login !== false && !this.sessionUser) {
        this.pendingCheckoutAfterAuth = true;
        this.openAuthModal('login');
        this.setStatus('Entre para finalizar', 'Faça login ou crie sua conta para pagar e acompanhar o pedido.', 'default');
        return false;
      }
      return true;
    },

    createOrderNumber() {
      const stamp = new Date().toISOString().replace(/\D/g, '').slice(-10);
      const random = Math.floor(Math.random() * 900 + 100);
      return `APP-${stamp}${random}`;
    },

    async submitOrder() {
      if (this.submitting) return;
      if (!this.validateOrder()) return;
      this.submitting = true;
      this.refs.btnSubmitOrder.disabled = true;
      this.refs.btnSubmitOrder.textContent = 'Enviando...';
      try {
        const payload = {
          workspace_id: this.workspaceId,
          order_number: this.createOrderNumber(),
          customer_user_id: this.sessionUser?.id || null,
          customer_name: this.refs.customerName.value.trim(),
          customer_phone: this.refs.customerPhone.value.trim(),
          customer_email: this.refs.customerEmail.value.trim(),
          customer_document: this.refs.customerDocument.value.trim(),
          delivery_type: this.refs.deliveryType.value,
          delivery_address: this.refs.deliveryAddress.value.trim(),
          delivery_neighborhood: this.refs.deliveryNeighborhood.value.trim(),
          delivery_reference: this.refs.deliveryReference.value.trim(),
          payment_method: this.refs.paymentMethod.value,
          payment_status: 'Aguardando pagamento',
          order_status: 'Aguardando aceitar',
          status_stage: 'aguardando_aceite',
          source: 'App Cliente',
          notes: this.refs.orderNotes.value.trim(),
          items: this.cart.map((item) => ({
            productId: item.productId,
            catalogId: item.catalogId,
            name: item.name,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.price || 0),
            unit: item.unit || 'unidade',
            total: Number(item.price || 0) * Number(item.quantity || 0)
          })),
          subtotal: this.getCartSubtotal(),
          delivery_fee: this.getDeliveryFee(),
          total: this.getCartTotal()
        };

        const { error } = await this.supabase.from('customer_orders').insert(payload);
        if (error) throw error;

        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
          orderNumber: payload.order_number,
          customerName: payload.customer_name,
          total: payload.total,
          createdAt: new Date().toISOString()
        }));

        this.cart = [];
        this.saveCart();
        this.updateCartUI();
        this.clearForm();
        this.closeCart();
        this.showSuccess(payload.order_number, payload.total);
        this.setStatus('Pedido enviado com sucesso', 'Recebemos seu pedido. Agora você pode acompanhar o andamento pela área “Meus pedidos”.', 'success');
        if (this.sessionUser) await this.loadMyOrders(true);
      } catch (error) {
        console.error('[Husky Cliente] erro ao enviar pedido', error);
        const message = this.getOrderErrorMessage(error);
        this.setStatus(message.title, message.text, 'error');
      } finally {
        this.submitting = false;
        this.refs.btnSubmitOrder.disabled = false;
        this.updateCheckoutAuthBox();
      }
    },

    clearForm() {
      [
        this.refs.customerPhone,
        this.refs.customerDocument,
        this.refs.deliveryAddress,
        this.refs.deliveryNeighborhood,
        this.refs.deliveryReference,
        this.refs.orderNotes
      ].forEach((field) => {
        if (field) field.value = '';
      });
      if (this.refs.deliveryType) this.refs.deliveryType.value = 'Entrega';
      if (this.refs.paymentMethod) this.refs.paymentMethod.value = 'Pix';
      this.updateDeliveryModeUI();
      this.renderPixPayment();
    },

    showSuccess(orderNumber, total) {
      this.refs.successBox.innerHTML = `
        <div class="success-order-box">
          <div>Pedido enviado com sucesso 💙</div>
          <strong>${this.escapeHtml(orderNumber)}</strong>
          <p>Valor total do pedido: ${this.formatCurrency(total)}</p>
          <p>Agora é só aguardar o retorno da equipe da Husky.</p>
        </div>
      `;
    },

    restoreLastOrder() {
      try {
        const raw = localStorage.getItem(LAST_ORDER_KEY);
        const lastOrder = raw ? JSON.parse(raw) : null;
        if (!lastOrder?.orderNumber) return;
        this.showSuccess(lastOrder.orderNumber, Number(lastOrder.total || 0));
      } catch (_error) {
        return null;
      }
    },

    async loadMyOrders(showToast = false) {
      if (!this.sessionUser) {
        this.myOrders = [];
        this.renderMyOrders();
        return;
      }
      try {
        const { data, error } = await this.supabase
          .from('customer_orders')
          .select('*')
          .eq('workspace_id', this.workspaceId)
          .eq('customer_user_id', this.sessionUser.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        this.myOrders = Array.isArray(data) ? data : [];
        this.renderMyOrders();
        if (showToast) this.setStatus('Pedidos atualizados', 'Seus pedidos foram atualizados em tempo real.', 'success');
      } catch (error) {
        console.error('[Husky Cliente] erro ao carregar pedidos do cliente', error);
        this.refs.customerOrdersList.innerHTML = '<article class="catalog-empty-client">Não foi possível carregar seus pedidos agora.</article>';
      }
    },

    subscribeToMyOrders() {
      this.unsubscribeFromMyOrders();
      if (!this.sessionUser) return;
      this.orderSubscription = this.supabase
        .channel(`customer-orders-${this.sessionUser.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'customer_orders',
          filter: `customer_user_id=eq.${this.sessionUser.id}`
        }, () => {
          this.loadMyOrders(true);
        })
        .subscribe();
    },

    unsubscribeFromMyOrders() {
      if (this.orderSubscription) {
        this.supabase.removeChannel(this.orderSubscription);
        this.orderSubscription = null;
      }
    },

    renderMyOrders() {
      if (!this.sessionUser) {
        this.refs.customerOrdersList.innerHTML = '<article class="catalog-empty-client">Faça login para acompanhar seus pedidos por aqui.</article>';
        return;
      }
      if (!this.myOrders.length) {
        this.refs.customerOrdersList.innerHTML = '<article class="catalog-empty-client">Você ainda não tem pedidos feitos com esta conta.</article>';
        return;
      }
      this.refs.customerOrdersList.innerHTML = this.myOrders.map((order) => {
        const stageKey = this.normalizeStage(order.status_stage || order.order_status || 'aguardando_aceite');
        const stage = STAGE_META[stageKey] || STAGE_META.aguardando_aceite;
        const items = Array.isArray(order.items) ? order.items : [];
        return `
          <article class="customer-order-card">
            <div class="customer-order-head">
              <div>
                <strong>${this.escapeHtml(order.order_number || 'Pedido')}</strong>
                <div class="text-muted-client">${this.escapeHtml(this.formatDateTime(order.created_at))}</div>
              </div>
              <span class="order-stage-pill ${stage.className}">${this.escapeHtml(stage.label)}</span>
            </div>
            <div class="customer-order-tags">
              <span class="soft-pill-client" style="background: rgba(47,97,165,0.08); color: #2f61a5;">${this.escapeHtml(order.payment_method || 'Pix')}</span>
              <span class="soft-pill-client" style="background: rgba(47,97,165,0.08); color: #2f61a5;">${this.escapeHtml(order.delivery_type || 'Entrega')}</span>
            </div>
            <div class="customer-order-row"><span>Itens</span><strong>${items.length}</strong></div>
            <div class="customer-order-row"><span>Total</span><strong>${this.formatCurrency(order.total)}</strong></div>
            <div class="text-muted-client">${this.escapeHtml(this.getStageCustomerCopy(stageKey))}</div>
          </article>
        `;
      }).join('');
    },

    normalizeStage(value) {
      const raw = this.normalizeText(value);
      if (!raw) return 'aguardando_aceite';
      if (raw.includes('aguardando')) return 'aguardando_aceite';
      if (raw.includes('aceito')) return 'aceito';
      if (raw.includes('confeit') || raw.includes('produc')) return 'confeitando';
      if (raw.includes('saiu')) return 'saiu_entrega';
      if (raw.includes('pronto')) return 'pronto';
      if (raw.includes('final')) return 'finalizado';
      if (raw.includes('cancel')) return 'cancelado';
      if (raw.includes('import')) return 'importado';
      return raw.replace(/\s+/g, '_');
    },

    getStageCustomerCopy(stageKey) {
      const map = {
        aguardando_aceite: 'Seu pedido chegou e está aguardando a confirmação da equipe.',
        aceito: 'A equipe aceitou seu pedido e vai preparar tudo certinho.',
        confeitando: 'Seu pedido está em produção agora.',
        pronto: 'Seu pedido ficou pronto para retirada.',
        saiu_entrega: 'Seu pedido saiu para entrega.',
        finalizado: 'Pedido concluído com sucesso.',
        cancelado: 'Este pedido foi cancelado.',
        importado: 'Seu pedido já entrou no fluxo interno da loja.'
      };
      return map[stageKey] || 'Seu pedido está sendo acompanhado pela equipe.';
    },

    async handleLogin(event) {
      event.preventDefault();
      const email = String(this.refs.authLoginEmail?.value || '').trim().toLowerCase();
      const password = String(this.refs.authLoginPassword?.value || '');
      if (!email || !password) {
        this.setAuthFeedback('Informe e-mail e senha para entrar.', 'error');
        return;
      }
      try {
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.setAuthFeedback('Login realizado com sucesso.', 'success');
      } catch (error) {
        this.setAuthFeedback(this.getSupabaseErrorMessage(error), 'error');
      }
    },

    async handleRegister(event) {
      event.preventDefault();
      const name = String(this.refs.authRegisterName?.value || '').trim();
      const email = String(this.refs.authRegisterEmail?.value || '').trim().toLowerCase();
      const password = String(this.refs.authRegisterPassword?.value || '');
      const confirmPassword = String(this.refs.authRegisterPasswordConfirm?.value || '');
      if (!name || !email || !password || !confirmPassword) {
        this.setAuthFeedback('Preencha todos os campos para criar a conta.', 'error');
        return;
      }
      if (password.length < 6) {
        this.setAuthFeedback('A senha precisa ter pelo menos 6 caracteres.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        this.setAuthFeedback('A confirmação da senha não confere.', 'error');
        return;
      }
      try {
        const { data, error } = await this.supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        if (data.session?.user) {
          this.sessionUser = data.session.user;
          await this.ensureCustomerProfile();
          await this.afterSessionChanged();
          this.setAuthFeedback('Conta criada com sucesso.', 'success');
          return;
        }
        this.setAuthFeedback('Conta criada. Verifique seu e-mail para confirmar e depois faça login.', 'success');
        this.switchAuthTab('login');
        if (this.refs.authLoginEmail) this.refs.authLoginEmail.value = email;
      } catch (error) {
        this.setAuthFeedback(this.getSupabaseErrorMessage(error), 'error');
      }
    },

    async handleForgotPassword() {
      const email = String(this.refs.authLoginEmail?.value || '').trim().toLowerCase();
      if (!email) {
        this.setAuthFeedback('Informe seu e-mail para recuperar a senha.', 'error');
        return;
      }
      try {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.href
        });
        if (error) throw error;
        this.setAuthFeedback('Enviamos o link de recuperação para seu e-mail.', 'success');
      } catch (error) {
        this.setAuthFeedback(this.getSupabaseErrorMessage(error), 'error');
      }
    },

    async signOutCustomer() {
      try {
        await this.supabase.auth.signOut();
        this.setStatus('Você saiu da conta', 'Agora o catálogo continua aberto, mas seus pedidos ficam ocultos até novo login.', 'default');
      } catch (error) {
        console.error('[Husky Cliente] erro ao sair', error);
      }
    },

    setAuthFeedback(text, type = '') {
      if (!this.refs.authFeedbackBox) return;
      this.refs.authFeedbackBox.textContent = text || '';
      this.refs.authFeedbackBox.classList.toggle('is-error', type === 'error');
      this.refs.authFeedbackBox.classList.toggle('is-success', type === 'success');
      if (type === 'success' && text && this.sessionUser) {
        setTimeout(() => {
          if (this.refs.authFeedbackBox?.textContent === text) this.closeAuthModal();
        }, 700);
      }
    },

    registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('sw-cliente.js').catch(() => null);
    },

    getCatalogErrorMessage(error) {
      const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
      if (!navigator.onLine) {
        return { title: 'Sem conexão com a internet', text: 'Conecte seu aparelho e tente atualizar o catálogo novamente.' };
      }
      if (error?.code === '42P01' || raw.includes('customer_catalog_items') || raw.includes('relation') || raw.includes('does not exist')) {
        return {
          title: 'Catálogo ainda não configurado',
          text: 'No Supabase, execute o arquivo SQL atualizado do app do cliente. Depois, no sistema interno, abra “Pedidos online” e clique em “Publicar catálogo”.'
        };
      }
      return { title: 'Não foi possível carregar o catálogo', text: 'Tente novamente em instantes. Se continuar assim, publique o catálogo de novo em “Pedidos online”.' };
    },

    getOrderErrorMessage(error) {
      const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
      if (error?.code === '42P01' || raw.includes('customer_orders') || raw.includes('relation') || raw.includes('does not exist')) {
        return {
          title: 'Pedidos ainda não ativados',
          text: 'A tabela de pedidos do app do cliente ainda não foi criada no Supabase. Execute o arquivo SQL atualizado para ativar os envios.'
        };
      }
      if (raw.includes('row-level security') || raw.includes('permission denied')) {
        return {
          title: 'Login obrigatório',
          text: 'Entre na sua conta para finalizar o pedido.'
        };
      }
      if (!navigator.onLine) {
        return { title: 'Sem conexão com a internet', text: 'Conecte seu aparelho à internet e tente enviar novamente.' };
      }
      return { title: 'Não foi possível enviar o pedido', text: 'Tente novamente em instantes.' };
    },

    getSupabaseErrorMessage(error) {
      const raw = `${error?.message || ''}`.toLowerCase();
      if (raw.includes('invalid login')) return 'E-mail ou senha inválidos.';
      if (raw.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
      if (raw.includes('already registered')) return 'Este e-mail já está cadastrado.';
      return error?.message || 'Não foi possível concluir a autenticação.';
    },

    setStatus(title, text = '', type = 'default') {
      if (!this.refs.statusBanner) return;
      this.refs.statusBanner.innerHTML = `
        <div class="status-banner-title">${this.escapeHtml(title)}</div>
        <div class="status-banner-text">${this.escapeHtml(text)}</div>
      `;
      this.refs.statusBanner.classList.toggle('error', type === 'error');
      this.refs.statusBanner.classList.toggle('success', type === 'success');
    },

    formatPhoneInput(value) {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    },

    formatDocumentInput(value) {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    },

    formatCurrency(value) {
      return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },

    normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
    },

    getNameFromEmail(email) {
      return String(email || 'cliente')
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    },

    escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    escapeAttribute(value) {
      return this.escapeHtml(value).replace(/`/g, '&#96;');
    }
  };

  document.addEventListener('DOMContentLoaded', () => STORE_APP.init());
  window.HuskyClientApp = STORE_APP;
})();

(() => {
  'use strict';

  const STORAGE_KEY = 'husky_client_cart';
  const DELIVERY_FEE = 0;

  const STORE_APP = {
    supabase: null,
    workspaceId: window.HUSKY_WORKSPACE_ID || 'husky-principal',
    refs: {},
    catalog: [],
    cart: [],
    filters: {
      category: '',
      search: ''
    },
    submitting: false,

    init() {
      if (!document.getElementById('client-app')) return;
      this.cacheRefs();
      this.bindEvents();
      this.loadCart();
      this.updateCartUI();
      this.bootstrap();
      this.restoreLastOrder();
      this.registerServiceWorker();
    },

    async bootstrap() {
      if (!window.supabase || !window.HUSKY_SUPABASE_URL || !window.HUSKY_SUPABASE_KEY) {
        this.setStatus('Não foi possível iniciar o app. Verifique o env.js do Supabase.', true);
        return;
      }

      this.supabase = window.supabase.createClient(window.HUSKY_SUPABASE_URL, window.HUSKY_SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      await this.loadCatalog();
    },

    cacheRefs() {
      this.refs = {
        statusBanner: document.getElementById('client-status-banner'),
        catalogGrid: document.getElementById('client-catalog-grid'),
        categories: document.getElementById('catalog-categories'),
        search: document.getElementById('catalog-search'),
        btnRefreshCatalog: document.getElementById('btn-refresh-catalog'),
        btnOpenCart: document.getElementById('btn-open-cart'),
        btnCloseCart: document.getElementById('btn-close-cart'),
        cartDrawer: document.getElementById('cart-drawer'),
        cartBackdrop: document.getElementById('cart-backdrop'),
        cartCountBadge: document.getElementById('cart-count-badge'),
        cartItemsContainer: document.getElementById('cart-items-container'),
        cartSubtotal: document.getElementById('cart-subtotal'),
        cartDeliveryFee: document.getElementById('cart-delivery-fee'),
        cartTotal: document.getElementById('cart-total'),
        btnSubmitOrder: document.getElementById('btn-submit-order'),
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
        successBox: document.getElementById('client-order-success')
      };
    },

    bindEvents() {
      this.refs.btnRefreshCatalog?.addEventListener('click', () => this.loadCatalog(true));
      this.refs.btnOpenCart?.addEventListener('click', () => this.openCart());
      this.refs.btnCloseCart?.addEventListener('click', () => this.closeCart());
      this.refs.cartBackdrop?.addEventListener('click', () => this.closeCart());
      this.refs.search?.addEventListener('input', () => {
        this.filters.search = this.refs.search.value || '';
        this.renderCatalog();
      });
      this.refs.btnSubmitOrder?.addEventListener('click', () => this.submitOrder());

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
    },

    async loadCatalog(showFeedback = false) {
      this.setStatus('Carregando catálogo...');

      try {
        const { data, error } = await this.supabase
          .from('customer_catalog_items')
          .select('*')
          .eq('workspace_id', this.workspaceId)
          .eq('active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        this.catalog = Array.isArray(data) ? data : [];
        this.renderCategories();
        this.renderCatalog();

        if (!this.catalog.length) {
          this.setStatus('O catálogo ainda não foi publicado. Em instantes você poderá pedir por aqui.');
        } else {
          this.setStatus(showFeedback ? 'Catálogo atualizado com sucesso.' : 'Escolha seus produtos e monte seu pedido.');
        }
      } catch (error) {
        console.error('[Husky Cliente] erro ao carregar catálogo', error);
        this.catalog = [];
        this.renderCategories();
        this.renderCatalog();
        this.setStatus('Não foi possível carregar o catálogo agora. Tente novamente em instantes.', true);
      }
    },

    renderCategories() {
      const categories = ['', ...Array.from(new Set(this.catalog.map((item) => String(item.category || '').trim()).filter(Boolean)))];
      this.refs.categories.innerHTML = categories.map((category) => {
        const label = category || 'Todos';
        const active = (this.filters.category || '') === category;
        return `<button type="button" class="chip-client ${active ? 'active' : ''}" data-category="${this.escapeHtml(category)}">${this.escapeHtml(label)}</button>`;
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
        this.refs.catalogGrid.innerHTML = '<article class="catalog-empty-client">Nenhum produto encontrado no catálogo.</article>';
        return;
      }

      this.refs.catalogGrid.innerHTML = items.map((item) => {
        const image = item.image_url || 'assets/img/logo-husky.png';
        return `
          <article class="product-card-client">
            <div class="product-media-client">
              <img src="${this.escapeAttribute(image)}" alt="${this.escapeAttribute(item.name || 'Produto')}" loading="lazy" />
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
                <button type="button" class="client-btn" data-action="add-to-cart" data-product-id="${this.escapeAttribute(item.product_id)}">Adicionar</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
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
      this.setStatus(`${product.name} adicionado ao carrinho.`);
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
      if (this.refs.cartCountBadge) this.refs.cartCountBadge.textContent = String(totalItems);
      if (this.refs.cartSubtotal) this.refs.cartSubtotal.textContent = this.formatCurrency(this.getCartSubtotal());
      if (this.refs.cartDeliveryFee) this.refs.cartDeliveryFee.textContent = this.formatCurrency(this.getDeliveryFee());
      if (this.refs.cartTotal) this.refs.cartTotal.textContent = this.formatCurrency(this.getCartTotal());

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
            <button type="button" class="client-btn secondary" data-cart-action="remove" data-product-id="${this.escapeAttribute(item.productId)}">Remover</button>
          </div>
        </article>
      `).join('');
    },

    validateOrder() {
      if (!this.cart.length) {
        this.setStatus('Adicione pelo menos um produto antes de enviar o pedido.', true);
        this.openCart();
        return false;
      }

      if (!this.refs.customerName?.value.trim()) {
        this.setStatus('Informe seu nome para enviar o pedido.', true);
        this.openCart();
        this.refs.customerName?.focus();
        return false;
      }

      if (!this.refs.customerPhone?.value.trim()) {
        this.setStatus('Informe um WhatsApp para contato.', true);
        this.openCart();
        this.refs.customerPhone?.focus();
        return false;
      }

      if (this.refs.deliveryType?.value === 'Entrega' && !this.refs.deliveryAddress?.value.trim()) {
        this.setStatus('Informe o endereço para entrega.', true);
        this.openCart();
        this.refs.deliveryAddress?.focus();
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
          customer_name: this.refs.customerName.value.trim(),
          customer_phone: this.refs.customerPhone.value.trim(),
          customer_email: this.refs.customerEmail.value.trim(),
          customer_document: this.refs.customerDocument.value.trim(),
          delivery_type: this.refs.deliveryType.value,
          delivery_address: this.refs.deliveryAddress.value.trim(),
          delivery_neighborhood: this.refs.deliveryNeighborhood.value.trim(),
          delivery_reference: this.refs.deliveryReference.value.trim(),
          payment_method: this.refs.paymentMethod.value,
          payment_status: this.refs.paymentMethod.value === 'Pix' ? 'Aguardando pagamento' : 'Aguardando pagamento',
          order_status: 'Recebido',
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

        localStorage.setItem('husky_client_last_order', JSON.stringify({
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
        this.setStatus('Pedido enviado com sucesso. Já recebemos por aqui.');
      } catch (error) {
        console.error('[Husky Cliente] erro ao enviar pedido', error);
        this.setStatus('Não foi possível enviar o pedido agora. Tente novamente em instantes.', true);
      } finally {
        this.submitting = false;
        this.refs.btnSubmitOrder.disabled = false;
        this.refs.btnSubmitOrder.textContent = 'Enviar pedido';
      }
    },

    clearForm() {
      [
        this.refs.customerName,
        this.refs.customerPhone,
        this.refs.customerEmail,
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
        const raw = localStorage.getItem('husky_client_last_order');
        const lastOrder = raw ? JSON.parse(raw) : null;
        if (!lastOrder?.orderNumber) return;
        this.showSuccess(lastOrder.orderNumber, Number(lastOrder.total || 0));
      } catch (_error) {}
    },

    registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('sw-cliente.js').catch(() => null);
    },

    setStatus(message, isError = false) {
      if (!this.refs.statusBanner) return;
      this.refs.statusBanner.textContent = message;
      this.refs.statusBanner.classList.toggle('error', Boolean(isError));
    },

    formatCurrency(value) {
      return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    },

    normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
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

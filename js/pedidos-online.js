(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Pedidos Online] HuskyApp não encontrado.');
    return;
  }

  const STAGES = [
    { key: 'aguardando_aceite', label: 'Aguardando aceitar' },
    { key: 'aceito', label: 'Aceito' },
    { key: 'confeitando', label: 'Confeitando' },
    { key: 'pronto', label: 'Pronto' },
    { key: 'saiu_entrega', label: 'Saiu para entrega' },
    { key: 'finalizado', label: 'Finalizado' }
  ];

  const ONLINE_ORDERS_PAGE = {
    refs: {},
    supabase: null,
    workspaceId: window.HUSKY_WORKSPACE_ID || 'husky-principal',
    orders: [],
    catalog: [],
    storefront: null,
    seenOrderIds: new Set(),
    orderChannel: null,
    pollTimer: null,
    pixQrDraft: null,

    async init() {
      if (!document.getElementById('online-orders-page')) return;
      this.cacheRefs();
      this.bindEvents();
      this.setShareLink();
      this.loadPrivateSettings();
      this.supabase = await this.waitForSupabase();

      if (!this.supabase) {
        app.showToast('Supabase não encontrado. Verifique o env.js.', 'danger');
        return;
      }

      await this.refreshAll();
      this.markSeenOrders();
      this.subscribeToOrders();
      this.startPollingFallback();
      app.log('Tela de pedidos online carregada.');
    },

    cacheRefs() {
      this.refs = {
        metricPending: document.getElementById('metric-online-pending'),
        metricToday: document.getElementById('metric-online-today'),
        metricProduction: document.getElementById('metric-online-production'),
        metricCatalog: document.getElementById('metric-online-catalog'),
        clientAppLink: document.getElementById('client-app-link'),
        btnCopyClientLink: document.getElementById('btn-copy-client-link'),
        btnPublishCatalog: document.getElementById('btn-publish-catalog'),
        btnRefreshOnlineOrders: document.getElementById('btn-refresh-online-orders'),
        btnEnableOrderAlerts: document.getElementById('btn-enable-order-alerts'),
        btnSaveStorefrontSettings: document.getElementById('btn-save-storefront-settings'),
        catalogPublishSummary: document.getElementById('catalog-publish-summary'),
        catalogPreviewList: document.getElementById('catalog-preview-list'),
        onlineOrdersList: document.getElementById('online-orders-list'),
        boardConnectionPill: document.getElementById('board-connection-pill'),
        storeHeroTitle: document.getElementById('store-hero-title'),
        storeHeroText: document.getElementById('store-hero-text'),
        storePixKey: document.getElementById('store-pix-key'),
        storePixCopyPaste: document.getElementById('store-pix-copy-paste'),
        storePixQrFile: document.getElementById('store-pix-qr-file'),
        storePixQrPreview: document.getElementById('store-pix-qr-preview'),
        whatsappWebhookUrl: document.getElementById('whatsapp-webhook-url'),
        whatsappAutoStatus: document.getElementById('whatsapp-auto-status'),
        checkoutRequiresLogin: document.getElementById('checkout-requires-login')
      };
    },

    bindEvents() {
      this.refs.btnCopyClientLink?.addEventListener('click', () => {
        if (!this.refs.clientAppLink?.value) return;
        navigator.clipboard?.writeText(this.refs.clientAppLink.value)
          .then(() => app.showToast('Link do app copiado.', 'success'))
          .catch(() => app.showToast('Não foi possível copiar o link.', 'warning'));
      });
      this.refs.btnPublishCatalog?.addEventListener('click', () => this.publishCatalog());
      this.refs.btnRefreshOnlineOrders?.addEventListener('click', () => this.refreshAll(true));
      this.refs.btnEnableOrderAlerts?.addEventListener('click', () => this.enableBrowserAlerts());
      this.refs.btnSaveStorefrontSettings?.addEventListener('click', () => this.saveStorefrontSettings());
      this.refs.storePixQrFile?.addEventListener('change', (event) => this.handlePixQrUpload(event));

      this.refs.onlineOrdersList?.addEventListener('click', async (event) => {
        const actionBtn = event.target.closest('[data-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-action');
        const orderId = actionBtn.getAttribute('data-order-id');
        if (!orderId) return;

        if (action === 'import-order') return this.importOrder(orderId);
        if (action === 'send-whatsapp') return this.sendOrderToWhatsapp(orderId, 'manual_click');
        if (action === 'accept-order') return this.advanceStage(orderId, 'aceito');
        if (action === 'start-production') return this.advanceStage(orderId, 'confeitando');
        if (action === 'ready-order') return this.advanceStage(orderId, 'pronto');
        if (action === 'delivery-order') return this.advanceStage(orderId, 'saiu_entrega');
        if (action === 'finish-order') return this.advanceStage(orderId, 'finalizado');
      });
    },

    async waitForSupabase() {
      if (window.HuskySupabase) return window.HuskySupabase;
      for (let i = 0; i < 80; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (window.HuskySupabase) return window.HuskySupabase;
      }
      return null;
    },

    setShareLink() {
      const url = new URL('app-cliente.html', window.location.href);
      if (this.refs.clientAppLink) this.refs.clientAppLink.value = url.href;
    },

    loadPrivateSettings() {
      const settings = app.getSettings();
      const whatsapp = settings.integrations?.whatsappAutomation || {};
      if (this.refs.whatsappWebhookUrl) this.refs.whatsappWebhookUrl.value = whatsapp.webhookUrl || '';
      if (this.refs.whatsappAutoStatus) this.refs.whatsappAutoStatus.checked = Boolean(whatsapp.autoOnStatus);
    },

    persistPrivateSettings() {
      const current = app.getSettings();
      app.updateSettings({
        integrations: {
          ...current.integrations,
          whatsappAutomation: {
            ...(current.integrations?.whatsappAutomation || {}),
            webhookUrl: this.refs.whatsappWebhookUrl?.value.trim() || '',
            autoOnStatus: Boolean(this.refs.whatsappAutoStatus?.checked)
          }
        }
      });
    },

    async refreshAll(showToast = false) {
      try {
        await Promise.all([this.loadCatalog(), this.loadOrders(), this.loadStorefrontSettings()]);
        this.renderCatalog();
        this.renderOrders();
        this.renderMetrics();
        this.fillStorefrontForm();
        if (showToast) app.showToast('Pedidos online atualizados.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao atualizar', error);
        app.showToast('Não foi possível atualizar os pedidos online.', 'danger');
      }
    },

    async loadStorefrontSettings() {
      try {
        const { data, error } = await this.supabase
          .from('public_storefront_settings')
          .select('*')
          .eq('workspace_id', this.workspaceId)
          .maybeSingle();
        if (error) throw error;
        this.storefront = data || null;
      } catch (error) {
        console.warn('[Pedidos Online] storefront público ainda não configurado.', error);
        this.storefront = null;
      }
    },

    fillStorefrontForm() {
      const storefront = this.storefront || {};
      if (this.refs.storeHeroTitle) this.refs.storeHeroTitle.value = storefront.hero_title || 'Peça seus doces favoritos.';
      if (this.refs.storeHeroText) this.refs.storeHeroText.value = storefront.hero_text || 'Escolha os produtos, monte o carrinho e finalize com login somente no pagamento.';
      if (this.refs.storePixKey) this.refs.storePixKey.value = storefront.pix_key || app.getSettings().business?.pixKey || '';
      if (this.refs.storePixCopyPaste) this.refs.storePixCopyPaste.value = storefront.pix_copy_paste || '';
      if (this.refs.checkoutRequiresLogin) this.refs.checkoutRequiresLogin.checked = storefront.checkout_requires_login !== false;
      this.renderPixPreview(storefront.pix_qr_image || this.pixQrDraft || '');
    },

    renderPixPreview(dataUrl = '') {
      if (!this.refs.storePixQrPreview) return;
      if (!dataUrl) {
        this.refs.storePixQrPreview.innerHTML = '<span>Prévia do QR Code</span>';
        return;
      }
      this.refs.storePixQrPreview.innerHTML = `<img src="${this.escapeAttribute(dataUrl)}" alt="QR Code Pix" />`;
    },

    async handlePixQrUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      this.pixQrDraft = await this.readFileAsDataUrl(file);
      this.renderPixPreview(this.pixQrDraft);
    },

    async saveStorefrontSettings() {
      try {
        this.persistPrivateSettings();
        const payload = {
          workspace_id: this.workspaceId,
          store_name: app.getSettings().company?.tradeName || app.getSettings().company?.name || 'Husky Confeitaria',
          store_subtitle: 'Pedidos online no celular',
          hero_title: this.refs.storeHeroTitle?.value.trim() || 'Peça seus doces favoritos.',
          hero_text: this.refs.storeHeroText?.value.trim() || 'Escolha os produtos, monte o carrinho e finalize com login somente no pagamento.',
          pix_key: this.refs.storePixKey?.value.trim() || '',
          pix_copy_paste: this.refs.storePixCopyPaste?.value.trim() || '',
          pix_qr_image: this.pixQrDraft || this.storefront?.pix_qr_image || '',
          catalog_layout: 'compact',
          checkout_requires_login: Boolean(this.refs.checkoutRequiresLogin?.checked)
        };

        const { error } = await this.supabase
          .from('public_storefront_settings')
          .upsert(payload, { onConflict: 'workspace_id' });
        if (error) throw error;
        this.storefront = payload;
        app.showToast('Checkout do cliente atualizado.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao salvar checkout/automação', error);
        app.showToast('Não foi possível salvar as configurações do checkout.', 'danger');
      }
    },

    getPublishableProducts() {
      const state = app.getAppState();
      return (state.products || [])
        .filter((product) => {
          const active = String(product.status || 'Ativo').toLowerCase() !== 'inativo';
          return active && product.allowSale !== false;
        })
        .map((product, index) => ({
          id: product.id,
          name: product.name || 'Produto',
          shortName: product.shortName || '',
          category: product.category || '',
          description: product.description || '',
          unit: product.unit || 'unidade',
          price: Number(product.price || 0),
          imageUrl: product.image?.dataUrl || product.image?.url || '',
          featured: Boolean(product.featured),
          sortOrder: index + 1,
          stock: Number(product.stock || 0),
          minStock: Number(product.minStock || 0)
        }));
    },

    getCatalogStorageBucket() {
      return 'husky-files';
    },

    getCatalogStoragePath() {
      return `${this.workspaceId}/catalog/public/catalog.json`;
    },

    async publishCatalogJson(payload = []) {
      if (!Array.isArray(payload) || !payload.length) return null;
      const fileBody = JSON.stringify({
        workspaceId: this.workspaceId,
        publishedAt: new Date().toISOString(),
        items: payload
      });
      const file = new Blob([fileBody], { type: 'application/json' });
      const bucket = this.getCatalogStorageBucket();
      const path = this.getCatalogStoragePath();
      const { error } = await this.supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: '60',
        contentType: 'application/json'
      });
      if (error) throw error;
      const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || '';
    },

    async publishCatalog() {
      const products = this.getPublishableProducts();
      if (!products.length) {
        app.showToast('Não há produtos ativos e liberados para venda para publicar.', 'warning');
        return;
      }

      try {
        this.refs.btnPublishCatalog.disabled = true;
        this.refs.btnPublishCatalog.textContent = 'Publicando...';

        const payload = products.map((product) => ({
          workspace_id: this.workspaceId,
          product_id: product.id,
          name: product.name,
          short_name: product.shortName,
          category: product.category,
          description: product.description,
          unit: product.unit,
          price: Number(product.price || 0),
          image_url: product.imageUrl || '',
          featured: Boolean(product.featured),
          active: true,
          sort_order: Number(product.sortOrder || 0),
          metadata: { stock: product.stock, minStock: product.minStock }
        }));

        const deactivate = await this.supabase
          .from('customer_catalog_items')
          .update({ active: false })
          .eq('workspace_id', this.workspaceId);
        if (deactivate.error && deactivate.error.code !== 'PGRST116') throw deactivate.error;

        const { error } = await this.supabase
          .from('customer_catalog_items')
          .upsert(payload, { onConflict: 'workspace_id,product_id' });
        if (error) throw error;

        await this.publishCatalogJson(payload.map((item) => ({
          id: item.product_id,
          product_id: item.product_id,
          name: item.name,
          short_name: item.short_name,
          category: item.category,
          description: item.description,
          unit: item.unit,
          price: item.price,
          image_url: item.image_url,
          featured: item.featured,
          active: item.active,
          sort_order: item.sort_order,
          metadata: item.metadata || {}
        })));

        await this.saveStorefrontSettings();
        await this.refreshAll();
        this.markSeenOrders();
        app.showToast('Catálogo publicado no app do cliente.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao publicar catálogo', error);
        app.showToast('Não foi possível publicar o catálogo. Execute o SQL atualizado no Supabase.', 'danger');
      } finally {
        this.refs.btnPublishCatalog.disabled = false;
        this.refs.btnPublishCatalog.textContent = 'Publicar catálogo';
      }
    },

    async loadCatalog() {
      const { data, error } = await this.supabase
        .from('customer_catalog_items')
        .select('*')
        .eq('workspace_id', this.workspaceId)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      this.catalog = Array.isArray(data) ? data : [];
    },

    async loadOrders() {
      const { data, error } = await this.supabase
        .from('customer_orders')
        .select('*')
        .eq('workspace_id', this.workspaceId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      this.orders = Array.isArray(data) ? data : [];
    },

    renderMetrics() {
      const today = new Date().toISOString().slice(0, 10);
      const pending = this.orders.filter((order) => this.normalizeStage(order.status_stage || order.order_status) === 'aguardando_aceite').length;
      const production = this.orders.filter((order) => this.normalizeStage(order.status_stage || order.order_status) === 'confeitando').length;
      const todayCount = this.orders.filter((order) => String(order.created_at || '').slice(0, 10) === today).length;
      if (this.refs.metricPending) this.refs.metricPending.textContent = String(pending);
      if (this.refs.metricToday) this.refs.metricToday.textContent = String(todayCount);
      if (this.refs.metricProduction) this.refs.metricProduction.textContent = String(production);
      if (this.refs.metricCatalog) this.refs.metricCatalog.textContent = String(this.catalog.length);
    },

    renderCatalog() {
      if (!this.catalog.length) {
        this.refs.catalogPreviewList.innerHTML = '<div class="catalog-empty">Nenhum item publicado ainda. Clique em “Publicar catálogo”.</div>';
        this.refs.catalogPublishSummary.textContent = 'Catálogo ainda não publicado para o app do cliente.';
        return;
      }
      this.refs.catalogPublishSummary.textContent = `Catálogo publicado com ${this.catalog.length} item(ns). Os itens ativos do seu cadastro agora aparecem no app do cliente.`;
      this.refs.catalogPreviewList.innerHTML = this.catalog.slice(0, 8).map((item) => `
        <article class="catalog-preview-card">
          <img src="${this.escapeAttribute(item.image_url || 'assets/img/logo-husky.png')}" alt="${this.escapeAttribute(item.name || 'Produto')}" />
          <div>
            <h4>${this.escapeHtml(item.name || 'Produto')}</h4>
            <p>${this.escapeHtml(item.description || item.short_name || item.category || 'Produto publicado no app do cliente.')}</p>
          </div>
          <div>
            <strong>${this.formatCurrency(item.price)}</strong>
          </div>
        </article>
      `).join('');
    },

    groupOrdersByDay() {
      const groups = new Map();
      this.orders.forEach((order) => {
        const day = String(order.created_at || new Date().toISOString()).slice(0, 10);
        if (!groups.has(day)) groups.set(day, []);
        groups.get(day).push(order);
      });
      return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    },

    renderOrders() {
      if (!this.orders.length) {
        this.refs.onlineOrdersList.innerHTML = '<div class="orders-empty">Ainda não há pedidos recebidos pelo app do cliente.</div>';
        return;
      }
      const dayGroups = this.groupOrdersByDay();
      this.refs.onlineOrdersList.innerHTML = dayGroups.map(([day, orders]) => `
        <section class="orders-day-group">
          <div class="orders-day-header">
            <h4>${this.escapeHtml(this.formatDate(day))}</h4>
            <span class="tag-soft is-muted">${orders.length} pedido(s)</span>
          </div>
          <div class="orders-stage-board">
            ${STAGES.map((stage) => this.renderStageColumn(stage, orders)).join('')}
          </div>
        </section>
      `).join('');
    },

    renderStageColumn(stage, orders) {
      const stageOrders = orders.filter((order) => this.normalizeStage(order.status_stage || order.order_status) === stage.key);
      return `
        <article class="stage-column">
          <div class="stage-column-header">
            <strong>${stage.label}</strong>
            <span>${stageOrders.length}</span>
          </div>
          <div class="stage-column-list">
            ${stageOrders.length ? stageOrders.map((order) => this.renderOrderCard(order)).join('') : '<div class="stage-empty">Nenhum pedido nesta etapa.</div>'}
          </div>
        </article>
      `;
    },

    renderOrderCard(order) {
      const imported = Boolean(order.imported_sale_id);
      const items = Array.isArray(order.items) ? order.items : [];
      const stageKey = this.normalizeStage(order.status_stage || order.order_status || 'aguardando_aceite');
      const deliveryLine = [order.delivery_type || '', order.delivery_address || '', order.delivery_neighborhood || '']
        .filter(Boolean)
        .join(' • ');
      return `
        <article class="online-order-card">
          <div class="online-order-header">
            <div>
              <h4>${this.escapeHtml(order.customer_name || 'Cliente')}</h4>
              <p>${this.escapeHtml(order.order_number || order.id || '')} • ${this.escapeHtml(this.formatDateTime(order.created_at))}</p>
            </div>
            <span class="tag-soft is-muted">${this.escapeHtml(order.payment_method || 'Pix')}</span>
          </div>

          <div class="online-order-meta compact">
            <span class="tag-soft is-muted">${this.escapeHtml(order.customer_phone || 'Sem telefone')}</span>
            <span class="tag-soft is-muted">${this.escapeHtml(order.delivery_type || 'Entrega')}</span>
          </div>

          <div class="online-order-items">
            ${items.slice(0, 4).map((item) => `
              <div class="online-order-item">
                <span>${this.escapeHtml(item.name || 'Item')} • ${this.escapeHtml(String(item.quantity || 0))}x</span>
                <strong>${this.formatCurrency(item.total || (Number(item.unitPrice || 0) * Number(item.quantity || 0)))}</strong>
              </div>
            `).join('')}
          </div>

          <p><strong>Entrega:</strong> ${this.escapeHtml(deliveryLine || 'Retirada')}</p>
          ${order.notes ? `<p><strong>Observações:</strong> ${this.escapeHtml(order.notes)}</p>` : ''}
          <div class="online-order-footer">
            <div>
              <strong>Total: ${this.formatCurrency(order.total)}</strong>
            </div>
            <div class="online-order-actions">
              ${this.renderStageActions(order, stageKey, imported)}
            </div>
          </div>
        </article>
      `;
    },

    renderStageActions(order, stageKey, imported) {
      if (imported) {
        return `<a href="vendas.html" class="btn btn-secondary">Abrir vendas</a>`;
      }
      const buttons = [];
      if (stageKey === 'aguardando_aceite') buttons.push(`<button type="button" class="btn btn-secondary" data-action="accept-order" data-order-id="${this.escapeAttribute(order.id)}">Aceitar</button>`);
      if (stageKey === 'aceito') buttons.push(`<button type="button" class="btn btn-secondary" data-action="start-production" data-order-id="${this.escapeAttribute(order.id)}">Confeitando</button>`);
      if (stageKey === 'confeitando') {
        buttons.push(`<button type="button" class="btn btn-secondary" data-action="ready-order" data-order-id="${this.escapeAttribute(order.id)}">Pronto</button>`);
        buttons.push(`<button type="button" class="btn btn-secondary" data-action="delivery-order" data-order-id="${this.escapeAttribute(order.id)}">Saiu</button>`);
      }
      if (stageKey === 'pronto' || stageKey === 'saiu_entrega') buttons.push(`<button type="button" class="btn btn-secondary" data-action="finish-order" data-order-id="${this.escapeAttribute(order.id)}">Finalizar</button>`);
      buttons.push(`<button type="button" class="btn btn-secondary" data-action="send-whatsapp" data-order-id="${this.escapeAttribute(order.id)}">WhatsApp</button>`);
      if (stageKey !== 'finalizado') buttons.push(`<button type="button" class="btn btn-primary" data-action="import-order" data-order-id="${this.escapeAttribute(order.id)}">Importar</button>`);
      return buttons.join('');
    },

    normalizeStage(value) {
      const raw = String(value || '').toLowerCase();
      if (raw.includes('aguard')) return 'aguardando_aceite';
      if (raw.includes('aceit')) return 'aceito';
      if (raw.includes('confeit') || raw.includes('produ')) return 'confeitando';
      if (raw.includes('pronto')) return 'pronto';
      if (raw.includes('saiu')) return 'saiu_entrega';
      if (raw.includes('final')) return 'finalizado';
      if (raw.includes('cancel')) return 'cancelado';
      if (raw.includes('import')) return 'importado';
      return 'aguardando_aceite';
    },

    findOrderById(orderId) {
      return this.orders.find((order) => order.id === orderId) || null;
    },

    normalizePhone(value) {
      return String(value || '').replace(/\D+/g, '');
    },

    async advanceStage(orderId, stageKey) {
      const statusLabel = this.stageLabel(stageKey);
      try {
        const payload = {
          order_status: statusLabel,
          status_stage: stageKey,
          payment_status: stageKey === 'finalizado' ? 'Pago / concluído' : undefined
        };
        Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

        const { error } = await this.supabase
          .from('customer_orders')
          .update(payload)
          .eq('id', orderId)
          .eq('workspace_id', this.workspaceId);
        if (error) throw error;

        await this.refreshAll();
        app.showToast(`Pedido atualizado para ${statusLabel}.`, 'success');
        this.persistPrivateSettings();
        if (this.refs.whatsappAutoStatus?.checked) await this.sendOrderToWhatsapp(orderId, 'status_changed');
      } catch (error) {
        console.error('[Pedidos Online] erro ao atualizar status', error);
        app.showToast('Não foi possível atualizar o status do pedido.', 'danger');
      }
    },

    stageLabel(stageKey) {
      const stage = STAGES.find((item) => item.key === stageKey);
      return stage?.label || 'Aguardando aceitar';
    },

    async sendOrderToWhatsapp(orderId, reason = 'manual_click') {
      const order = this.findOrderById(orderId);
      if (!order) {
        app.showToast('Pedido não encontrado.', 'warning');
        return;
      }
      this.persistPrivateSettings();
      const webhookUrl = this.refs.whatsappWebhookUrl?.value.trim() || '';
      if (!webhookUrl) {
        app.showToast('Cadastre a URL da sua automação do WhatsApp para enviar sem abrir o app.', 'warning');
        return;
      }
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: this.workspaceId,
            event: reason,
            order,
            company: app.getSettings().company || {},
            stageLabel: this.stageLabel(this.normalizeStage(order.status_stage || order.order_status))
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        app.showToast('Mensagem enviada para a automação do WhatsApp.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao enviar para automação do WhatsApp', error);
        app.showToast('A automação do WhatsApp não respondeu. Verifique a URL configurada.', 'danger');
      }
    },

    async importOrder(orderId) {
      const order = this.findOrderById(orderId);
      if (!order) {
        app.showToast('Pedido não encontrado.', 'warning');
        return;
      }
      if (order.imported_sale_id) {
        app.showToast('Este pedido já foi importado para vendas.', 'warning');
        return;
      }

      try {
        const state = app.getAppState();
        const products = [...(state.products || [])];
        let stockMovements = [...(state.stockMovements || [])];
        const items = Array.isArray(order.items) ? order.items : [];
        const importedItems = [];

        for (const entry of items) {
          const productId = entry.productId || entry.product_id;
          const product = products.find((item) => item.id === productId);
          if (!product) throw new Error(`Produto não encontrado na base: ${entry.name || productId}.`);
          const quantity = Number(entry.quantity || 0);
          const available = Number(product.stock || 0);
          if (available < quantity) throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${available}.`);

          product.stock = Math.max(0, available - quantity);
          importedItems.push({
            productId: product.id,
            productCode: product.code || '',
            productName: product.name || entry.name || 'Produto',
            quantity,
            unitPrice: Number(entry.unitPrice || entry.unit_price || product.price || 0),
            unitCost: Number(product.cost || 0),
            total: Number(entry.total || (Number(entry.unitPrice || entry.unit_price || product.price || 0) * quantity))
          });

          stockMovements.unshift({
            id: crypto.randomUUID(),
            relatedSaleId: '',
            relatedOrderNumber: order.order_number,
            type: 'saida',
            productId: product.id,
            productName: product.name,
            quantity,
            unitCost: Number(product.cost || 0),
            totalCost: Number(product.cost || 0) * quantity,
            date: String(order.created_at || new Date().toISOString()).slice(0, 10),
            time: new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            reason: `Baixa automática por pedido do app ${order.order_number}`,
            reference: 'App Cliente',
            responsible: (app.getCurrentUser?.() || {}).name || 'Administrador',
            createdAt: new Date().toISOString()
          });
        }

        const saleId = app.createId('SALE');
        stockMovements = stockMovements.map((movement) => (
          movement.relatedSaleId === '' && movement.relatedOrderNumber === order.order_number
            ? { ...movement, relatedSaleId: saleId }
            : movement
        ));

        const cost = importedItems.reduce((sum, item) => sum + Number(item.unitCost || 0) * Number(item.quantity || 0), 0);
        const total = Number(order.total || 0);
        const shippingFee = Number(order.delivery_fee || 0);
        const subtotal = Number(order.subtotal || (total - shippingFee));
        const sale = {
          id: saleId,
          code: app.createId('SALE'),
          orderNumber: app.createOrderNumber('PED'),
          date: String(order.created_at || new Date().toISOString()).slice(0, 10),
          time: new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          client: {
            name: order.customer_name || 'Cliente',
            phone: order.customer_phone || '',
            email: order.customer_email || '',
            document: order.customer_document || ''
          },
          channel: order.source || 'App Cliente',
          externalReference: order.order_number || order.id,
          delivery: {
            type: order.delivery_type || 'Entrega',
            address: [order.delivery_address || '', order.delivery_neighborhood || '', order.delivery_reference || '']
              .filter(Boolean)
              .join(' • ')
          },
          paymentMethod: order.payment_method || 'Pix',
          paymentStatus: order.payment_status || 'Aguardando pagamento',
          orderStatus: 'Pendente',
          discount: 0,
          extraFee: 0,
          shippingFee,
          notes: ['Pedido importado do app do cliente.', order.notes || ''].filter(Boolean).join(' '),
          items: importedItems,
          subtotal,
          cost,
          total,
          profit: total - cost,
          pixProof: null,
          pixProofNote: '',
          updatedAt: new Date().toISOString(),
          createdAt: order.created_at || new Date().toISOString(),
          updatedBy: (app.getCurrentUser?.() || {}).email || 'admin@husky.com'
        };

        state.products = products;
        state.stockMovements = stockMovements;
        state.sales = app.upsertItem(state.sales || [], sale, 'id');
        state.customers = this.upsertCustomerFromOrder(state.customers || [], order);
        app.setAppState(state);

        const { error } = await this.supabase
          .from('customer_orders')
          .update({
            imported_sale_id: sale.id,
            imported_at: new Date().toISOString(),
            order_status: 'Importado',
            status_stage: 'finalizado',
            payment_status: sale.paymentStatus
          })
          .eq('id', orderId)
          .eq('workspace_id', this.workspaceId);
        if (error) throw error;

        await this.refreshAll();
        app.showToast('Pedido importado para a tela de vendas.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao importar pedido', error);
        app.showToast(error?.message || 'Não foi possível importar o pedido.', 'danger');
      }
    },

    upsertCustomerFromOrder(list, order) {
      const email = String(order.customer_email || '').toLowerCase();
      const phone = this.normalizePhone(order.customer_phone || '');
      const existing = list.find((customer) => {
        const sameEmail = email && String(customer.email || '').toLowerCase() === email;
        const samePhone = phone && this.normalizePhone(customer.phone || '') === phone;
        return sameEmail || samePhone;
      });
      if (existing) {
        return list.map((customer) => customer.id === existing.id ? {
          ...customer,
          name: order.customer_name || customer.name,
          phone: order.customer_phone || customer.phone,
          email: order.customer_email || customer.email,
          cpf: order.customer_document || customer.cpf,
          address: order.delivery_address || customer.address,
          deliveryReference: order.delivery_reference || customer.deliveryReference,
          updatedAt: new Date().toISOString(),
          updatedBy: (app.getCurrentUser?.() || {}).email || 'admin@husky.com'
        } : customer);
      }
      const now = new Date().toISOString();
      return [{
        id: crypto.randomUUID(),
        code: app.createId('CLI'),
        status: 'Ativo',
        origin: 'App Cliente',
        name: order.customer_name || 'Cliente',
        shortName: order.customer_name || 'Cliente',
        phone: order.customer_phone || '',
        email: order.customer_email || '',
        birthday: '',
        instagram: '',
        cpf: order.customer_document || '',
        address: order.delivery_address || '',
        deliveryReference: order.delivery_reference || '',
        paymentPreference: order.payment_method || 'Pix',
        favoriteProduct: '',
        tags: ['app cliente'],
        notes: 'Cliente criado automaticamente a partir de um pedido online.',
        receiveOffers: false,
        priorityService: false,
        createdAt: now,
        updatedAt: now,
        createdBy: (app.getCurrentUser?.() || {}).email || 'admin@husky.com',
        updatedBy: (app.getCurrentUser?.() || {}).email || 'admin@husky.com'
      }, ...list];
    },

    subscribeToOrders() {
      if (this.orderChannel) this.supabase.removeChannel(this.orderChannel);
      this.orderChannel = this.supabase
        .channel(`orders-board-${this.workspaceId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'customer_orders',
          filter: `workspace_id=eq.${this.workspaceId}`
        }, async (payload) => {
          this.updateConnectionPill('Realtime conectado');
          const isInsert = payload.eventType === 'INSERT';
          const incoming = payload.new || {};
          await this.refreshAll();
          if (isInsert && incoming.id && !this.seenOrderIds.has(incoming.id)) {
            this.seenOrderIds.add(incoming.id);
            this.playOrderSound();
            this.fireBrowserNotification(incoming);
          }
        })
        .subscribe((status) => {
          this.updateConnectionPill(status === 'SUBSCRIBED' ? 'Realtime conectado' : 'Realtime sincronizando');
        });
    },

    updateConnectionPill(text) {
      if (this.refs.boardConnectionPill) this.refs.boardConnectionPill.textContent = text;
    },

    startPollingFallback() {
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        this.refreshAll();
      }, Number(window.HUSKY_CLOUD_POLL_MS || 2500) * 3);
    },

    markSeenOrders() {
      this.orders.forEach((order) => this.seenOrderIds.add(order.id));
    },

    playOrderSound() {
      try {
        const AudioContextRef = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextRef) return;
        const ctx = new AudioContextRef();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.0001;
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        oscillator.stop(ctx.currentTime + 0.48);
      } catch (_error) {
        return null;
      }
    },

    async enableBrowserAlerts() {
      if (!('Notification' in window)) {
        app.showToast('Este navegador não suporta notificações.', 'warning');
        return;
      }
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        app.showToast('Alertas do navegador ativados.', 'success');
        return;
      }
      app.showToast('As notificações não foram liberadas.', 'warning');
    },

    fireBrowserNotification(order) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const body = `${order.customer_name || 'Cliente'} • ${this.formatCurrency(order.total || 0)}`;
      new Notification('Novo pedido na Husky', {
        body,
        icon: 'assets/img/logo-husky.png',
        badge: 'assets/img/logo-husky.png'
      });
    },

    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('file_read_error'));
        reader.readAsDataURL(file);
      });
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

    formatDate(value) {
      if (!value) return '-';
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
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

  document.addEventListener('DOMContentLoaded', () => ONLINE_ORDERS_PAGE.init());
  window.HuskyOnlineOrdersPage = ONLINE_ORDERS_PAGE;
})();

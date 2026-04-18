(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Pedidos Online] HuskyApp não encontrado.');
    return;
  }

  const ONLINE_ORDERS_PAGE = {
    refs: {},
    supabase: null,
    workspaceId: window.HUSKY_WORKSPACE_ID || 'husky-principal',
    orders: [],
    catalog: [],

    async init() {
      if (!document.getElementById('online-orders-page')) return;
      this.cacheRefs();
      this.bindEvents();
      this.setShareLink();
      this.supabase = await this.waitForSupabase();

      if (!this.supabase) {
        app.showToast('Supabase não encontrado. Verifique o env.js.', 'danger');
        return;
      }

      await this.refreshAll();
      app.log('Tela de pedidos online carregada.');
    },

    cacheRefs() {
      this.refs = {
        metricPending: document.getElementById('metric-online-pending'),
        metricToday: document.getElementById('metric-online-today'),
        metricImported: document.getElementById('metric-online-imported'),
        metricCatalog: document.getElementById('metric-online-catalog'),
        clientAppLink: document.getElementById('client-app-link'),
        btnCopyClientLink: document.getElementById('btn-copy-client-link'),
        btnPublishCatalog: document.getElementById('btn-publish-catalog'),
        btnRefreshOnlineOrders: document.getElementById('btn-refresh-online-orders'),
        catalogPublishSummary: document.getElementById('catalog-publish-summary'),
        catalogPreviewList: document.getElementById('catalog-preview-list'),
        onlineOrdersList: document.getElementById('online-orders-list')
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

      this.refs.onlineOrdersList?.addEventListener('click', async (event) => {
        const importBtn = event.target.closest('[data-action="import-order"]');
        if (importBtn) {
          const orderId = importBtn.getAttribute('data-order-id');
          await this.importOrder(orderId);
          return;
        }

        const markBtn = event.target.closest('[data-action="mark-production"]');
        if (markBtn) {
          const orderId = markBtn.getAttribute('data-order-id');
          await this.updateOrderStatus(orderId, 'Em produção');
          return;
        }
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

    async refreshAll(showToast = false) {
      try {
        await Promise.all([this.loadCatalog(), this.loadOrders()]);
        this.renderCatalog();
        this.renderOrders();
        this.renderMetrics();
        if (showToast) app.showToast('Pedidos online atualizados.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao atualizar', error);
        app.showToast('Não foi possível atualizar os pedidos online.', 'danger');
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
          metadata: {
            stock: product.stock,
            minStock: product.minStock
          }
        }));

        let dbPublished = false;
        let publicCatalogUrl = '';

        try {
          const deactivate = await this.supabase
            .from('customer_catalog_items')
            .update({ active: false })
            .eq('workspace_id', this.workspaceId);

          if (deactivate.error && deactivate.error.code !== 'PGRST116') throw deactivate.error;

          const { error } = await this.supabase
            .from('customer_catalog_items')
            .upsert(payload, { onConflict: 'workspace_id,product_id' });

          if (error) throw error;
          dbPublished = true;
        } catch (dbError) {
          console.error('[Pedidos Online] erro ao publicar catálogo em tabela', dbError);
        }

        try {
          publicCatalogUrl = await this.publishCatalogJson(payload.map((item) => ({
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
        } catch (storageError) {
          console.error('[Pedidos Online] erro ao publicar catálogo em storage', storageError);
        }

        if (!dbPublished && !publicCatalogUrl) {
          throw new Error('catalog_publish_failed');
        }

        await this.loadCatalog().catch(() => {
          this.catalog = payload;
        });
        this.renderCatalog();
        this.renderMetrics();

        if (this.refs.catalogPublishSummary) {
          const suffix = publicCatalogUrl
            ? ' Versão pública do catálogo atualizada com sucesso.'
            : ' O catálogo visual depende do SQL novo no Supabase.';
          this.refs.catalogPublishSummary.textContent = `Catálogo publicado com ${payload.length} item(ns).${suffix}`;
        }

        if (dbPublished) {
          app.showToast('Catálogo publicado no app do cliente.', 'success');
        } else {
          app.showToast('Catálogo visual publicado, mas execute o SQL novo para ativar a leitura completa e os pedidos.', 'warning');
        }
      } catch (error) {
        console.error('[Pedidos Online] erro ao publicar catálogo', error);
        app.showToast('Não foi possível publicar o catálogo. Execute o SQL novo no Supabase.', 'danger');
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
        .limit(100);

      if (error) throw error;
      this.orders = Array.isArray(data) ? data : [];
    },

    renderMetrics() {
      const today = new Date().toISOString().slice(0, 10);
      const pending = this.orders.filter((order) => !order.imported_sale_id && String(order.order_status || '').toLowerCase() !== 'importado').length;
      const todayCount = this.orders.filter((order) => String(order.created_at || '').slice(0, 10) === today).length;
      const imported = this.orders.filter((order) => Boolean(order.imported_sale_id)).length;

      if (this.refs.metricPending) this.refs.metricPending.textContent = String(pending);
      if (this.refs.metricToday) this.refs.metricToday.textContent = String(todayCount);
      if (this.refs.metricImported) this.refs.metricImported.textContent = String(imported);
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

    renderOrders() {
      if (!this.orders.length) {
        this.refs.onlineOrdersList.innerHTML = '<div class="orders-empty">Ainda não há pedidos recebidos pelo app do cliente.</div>';
        return;
      }

      this.refs.onlineOrdersList.innerHTML = this.orders.map((order) => {
        const imported = Boolean(order.imported_sale_id);
        const items = Array.isArray(order.items) ? order.items : [];
        const statusClass = imported ? 'is-success' : (String(order.order_status || '').toLowerCase().includes('produção') ? 'is-warning' : '');
        const statusLabel = imported ? 'Importado para vendas' : (order.order_status || 'Recebido');
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
              <span class="tag-soft ${statusClass}">${this.escapeHtml(statusLabel)}</span>
            </div>

            <div class="online-order-meta" style="margin-top: 12px;">
              <span class="tag-soft is-muted">${this.escapeHtml(order.source || 'App Cliente')}</span>
              <span class="tag-soft is-muted">${this.escapeHtml(order.payment_method || 'Pix')}</span>
              <span class="tag-soft is-muted">${this.escapeHtml(order.customer_phone || 'Sem telefone')}</span>
            </div>

            <div class="online-order-items">
              ${items.map((item) => `
                <div class="online-order-item">
                  <span>${this.escapeHtml(item.name || 'Item')} • ${this.escapeHtml(String(item.quantity || 0))}x</span>
                  <strong>${this.formatCurrency(item.total || (Number(item.unitPrice || 0) * Number(item.quantity || 0)))}</strong>
                </div>
              `).join('')}
            </div>

            <p><strong>Entrega:</strong> ${this.escapeHtml(deliveryLine || 'Retirada')}</p>
            ${order.notes ? `<p><strong>Observações:</strong> ${this.escapeHtml(order.notes)}</p>` : ''}

            <div class="online-order-footer" style="margin-top: 14px; justify-content: space-between;">
              <div>
                <strong>Total: ${this.formatCurrency(order.total)}</strong>
              </div>
              <div class="online-order-actions">
                ${imported ? `<a href="vendas.html" class="btn btn-secondary">Abrir vendas</a>` : `
                  <button type="button" class="btn btn-secondary" data-action="mark-production" data-order-id="${this.escapeAttribute(order.id)}">Em produção</button>
                  <button type="button" class="btn btn-primary" data-action="import-order" data-order-id="${this.escapeAttribute(order.id)}">Importar para vendas</button>
                `}
              </div>
            </div>
          </article>
        `;
      }).join('');
    },

    findOrderById(orderId) {
      return this.orders.find((order) => order.id === orderId) || null;
    },

    normalizePhone(value) {
      return String(value || '').replace(/\D+/g, '');
    },

    async updateOrderStatus(orderId, status) {
      try {
        const { error } = await this.supabase
          .from('customer_orders')
          .update({ order_status: status })
          .eq('id', orderId)
          .eq('workspace_id', this.workspaceId);

        if (error) throw error;
        await this.refreshAll();
        app.showToast('Status do pedido atualizado.', 'success');
      } catch (error) {
        console.error('[Pedidos Online] erro ao atualizar status', error);
        app.showToast('Não foi possível atualizar o status do pedido.', 'danger');
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
          if (!product) {
            throw new Error(`Produto não encontrado na base: ${entry.name || productId}.`);
          }

          const quantity = Number(entry.quantity || 0);
          const available = Number(product.stock || 0);
          if (available < quantity) {
            throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${available}.`);
          }

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
          notes: [
            'Pedido importado do app do cliente.',
            order.notes || ''
          ].filter(Boolean).join(' '),
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

    formatCurrency(value) {
      return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    },

    formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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

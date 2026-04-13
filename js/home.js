(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Home] HuskyApp não encontrado. Verifique se app.js foi carregado antes de home.js.');
    return;
  }

  const HOME_PAGE = {
    refs: {},

    init() {
      if (!this.isHomePage()) return;
      this.cacheRefs();
      this.bindEvents();
      this.renderAll();
      this.log('Tela inicial carregada.');
    },

    isHomePage() {
      const file = window.location.pathname.split('/').pop() || '';
      return file === 'home.html' || document.querySelector('.page-heading h1');
    },

    cacheRefs() {
      this.refs = {
        pageHeading: document.querySelector('.page-heading h1'),
        metricCards: Array.from(document.querySelectorAll('.metric-card')),
        panels: Array.from(document.querySelectorAll('.panel')),
        quickLinks: document.querySelector('.quick-links-grid'),

        recentSalesTableBody: this.pickById([
          'home-recent-sales-table-body',
          'recent-sales-table-body',
          'dashboard-sales-table-body'
        ]),

        lowStockTableBody: this.pickById([
          'home-low-stock-table-body',
          'dashboard-low-stock-table-body',
          'low-stock-table-body'
        ]),

        recentExpensesTableBody: this.pickById([
          'home-recent-expenses-table-body',
          'dashboard-expenses-table-body',
          'recent-expenses-table-body'
        ]),

        proofsTableBody: this.pickById([
          'home-proofs-table-body',
          'dashboard-proofs-table-body',
          'proofs-table-body'
        ]),

        alertsList: this.pickById([
          'home-alert-list',
          'dashboard-alert-list',
          'alert-list'
        ]),

        activityList: this.pickById([
          'home-activity-list',
          'dashboard-activity-list',
          'activity-list'
        ]),

        topProductsList: this.pickById([
          'home-top-products-list',
          'dashboard-top-products-list',
          'top-products-list'
        ]),

        topClientsList: this.pickById([
          'home-top-clients-list',
          'dashboard-top-clients-list',
          'top-clients-list'
        ]),

        welcomeName: this.pickById([
          'home-user-name',
          'dashboard-user-name'
        ]),

        welcomeRole: this.pickById([
          'home-user-role',
          'dashboard-user-role'
        ])
      };
    },

    bindEvents() {
      window.addEventListener('husky:state-changed', () => {
        this.renderAll();
      });

      window.addEventListener('storage', () => {
        this.renderAll();
      });
    },

    pickById(ids = []) {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
      }
      return null;
    },

    getState() {
      return typeof app.getAppState === 'function' ? app.getAppState() : {};
    },

    getSales() {
      return Array.isArray(this.getState().sales) ? this.getState().sales : [];
    },

    getExpenses() {
      return Array.isArray(this.getState().expenses) ? this.getState().expenses : [];
    },

    getProducts() {
      return Array.isArray(this.getState().products) ? this.getState().products : [];
    },

    getCustomers() {
      return Array.isArray(this.getState().customers) ? this.getState().customers : [];
    },

    getMovements() {
      return Array.isArray(this.getState().stockMovements) ? this.getState().stockMovements : [];
    },

    getProofs() {
      return Array.isArray(this.getState().proofs) ? this.getState().proofs : [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', role: 'Gestão / Caixa' };
    },

    todayISO() {
      if (typeof app.todayISO === 'function') return app.todayISO();
      return new Date().toISOString().slice(0, 10);
    },

    toNumber(value) {
      if (typeof app.toNumber === 'function') return app.toNumber(value);
      const num = Number(String(value ?? '').replace(',', '.'));
      return Number.isFinite(num) ? num : 0;
    },

    formatCurrency(value) {
      if (typeof app.formatCurrency === 'function') return app.formatCurrency(value);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(this.toNumber(value));
    },

    formatNumber(value, decimals = 0) {
      if (typeof app.formatNumber === 'function') return app.formatNumber(value, decimals);
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(this.toNumber(value));
    },

    formatDate(value) {
      if (typeof app.formatDate === 'function') return app.formatDate(value);
      if (!value) return '-';
      return new Date(value).toLocaleDateString('pt-BR');
    },

    normalizeText(value) {
      if (typeof app.normalizeText === 'function') return app.normalizeText(value);
      const text = String(value || '').trim().toLowerCase();
      try {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (error) {
        return text;
      }
    },

    sum(list = [], mapper = (item) => item) {
      if (typeof app.sum === 'function') return app.sum(list, mapper);
      return list.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);
    },

    showToast(message, type = 'info') {
      if (typeof app.showToast === 'function') app.showToast(message, type);
      else console.log(message);
    },

    log(message, payload = null) {
      if (typeof app.log === 'function') app.log(message, payload);
      else console.log(message, payload || '');
    },

    renderAll() {
      this.renderWelcome();
      this.renderMetrics();
      this.renderRecentSales();
      this.renderLowStock();
      this.renderRecentExpenses();
      this.renderProofs();
      this.renderAlerts();
      this.renderActivities();
      this.renderTopProducts();
      this.renderTopClients();
    },

    renderWelcome() {
      const user = this.getCurrentUser();

      if (this.refs.welcomeName) {
        this.refs.welcomeName.textContent = user.name || 'Administrador';
      }

      if (this.refs.welcomeRole) {
        this.refs.welcomeRole.textContent = user.role || 'Gestão / Caixa';
      }
    },

    renderMetrics() {
      const today = this.todayISO();

      const sales = this.getSales().filter((sale) => sale.orderStatus !== 'Cancelado');
      const todaySales = sales.filter((sale) => sale.date === today);
      const todayExpenses = this.getExpenses().filter((expense) => expense.date === today && expense.status !== 'Cancelado');
      const lowStock = this.getProducts().filter((product) => {
        const stock = this.toNumber(product.stock || 0);
        const minStock = this.toNumber(product.minStock || 0);
        return stock <= minStock;
      });

      const pendingProofs = this.getProofs().filter((proof) => {
        const status = this.normalizeText(proof.status || '');
        return status.includes('pendente') || status.includes('aguardando');
      });

      const revenueToday = this.sum(todaySales, (sale) => sale.total || 0);
      const expensesToday = this.sum(todayExpenses, (expense) => expense.value || 0);
      const profitToday = revenueToday - expensesToday;

      this.fillMetricCard(
        ['vendas do dia', 'vendas hoje', 'pedidos do dia'],
        String(todaySales.length)
      );

      this.fillMetricCard(
        ['faturamento do dia', 'receita do dia', 'valor vendido hoje'],
        this.formatCurrency(revenueToday)
      );

      this.fillMetricCard(
        ['despesas do dia', 'gastos do dia'],
        this.formatCurrency(expensesToday)
      );

      this.fillMetricCard(
        ['lucro do dia', 'resultado do dia'],
        this.formatCurrency(profitToday)
      );

      this.fillMetricCard(
        ['estoque baixo', 'alertas de estoque'],
        String(lowStock.length)
      );

      this.fillMetricCard(
        ['clientes', 'clientes cadastrados'],
        String(this.getCustomers().length)
      );

      this.fillMetricCard(
        ['comprovantes pendentes', 'pix pendente', 'pendencias pix'],
        String(pendingProofs.length)
      );

      const bestProduct = this.getTopProductsData()[0];
      this.fillMetricCard(
        ['produto destaque', 'mais vendido', 'top produto'],
        bestProduct ? bestProduct.name : '-'
      );
    },

    fillMetricCard(labelCandidates, value) {
      const cards = this.refs.metricCards || [];
      const normalizedLabels = labelCandidates.map((item) => this.normalizeText(item));

      for (const card of cards) {
        const labelEl = card.querySelector('.metric-label');
        const valueEl = card.querySelector('strong');
        if (!labelEl || !valueEl) continue;

        const labelText = this.normalizeText(labelEl.textContent || '');
        const matched = normalizedLabels.some((candidate) => labelText.includes(candidate));

        if (matched) {
          valueEl.textContent = value;
        }
      }
    },

    renderRecentSales() {
      const tbody = this.refs.recentSalesTableBody;
      if (!tbody) return;

      const sales = this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 8);

      if (!sales.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">Nenhuma venda encontrada.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = sales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Cliente não informado')}</td>
          <td>${this.formatDate(sale.date)}</td>
          <td>${this.escapeHtml(sale.orderStatus || '-')}</td>
          <td>${this.formatCurrency(sale.total || 0)}</td>
        </tr>
      `).join('');
    },

    renderLowStock() {
      const tbody = this.refs.lowStockTableBody;
      if (!tbody) return;

      const products = this.getProducts()
        .filter((product) => {
          const stock = this.toNumber(product.stock || 0);
          const minStock = this.toNumber(product.minStock || 0);
          return stock <= minStock;
        })
        .sort((a, b) => this.toNumber(a.stock || 0) - this.toNumber(b.stock || 0))
        .slice(0, 8);

      if (!products.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4">Nenhum item com estoque baixo.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = products.map((product) => `
        <tr>
          <td>${this.escapeHtml(product.name)}</td>
          <td>${this.formatNumber(product.stock || 0)}</td>
          <td>${this.formatNumber(product.minStock || 0)}</td>
          <td>${this.getStockStatus(product)}</td>
        </tr>
      `).join('');
    },

    renderRecentExpenses() {
      const tbody = this.refs.recentExpensesTableBody;
      if (!tbody) return;

      const expenses = this.getExpenses()
        .filter((expense) => expense.status !== 'Cancelado')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 8);

      if (!expenses.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">Nenhuma despesa encontrada.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = expenses.map((expense) => `
        <tr>
          <td>${this.formatDate(expense.date)}</td>
          <td>${this.escapeHtml(expense.description || '-')}</td>
          <td>${this.escapeHtml(expense.category || '-')}</td>
          <td>${this.escapeHtml(expense.status || '-')}</td>
          <td>${this.formatCurrency(expense.value || 0)}</td>
        </tr>
      `).join('');
    },

    renderProofs() {
      const tbody = this.refs.proofsTableBody;
      if (!tbody) return;

      const proofs = this.getProofs()
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime())
        .slice(0, 8);

      if (!proofs.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">Nenhum comprovante encontrado.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = proofs.map((proof) => `
        <tr>
          <td>${this.escapeHtml(proof.orderNumber || proof.saleId || '-')}</td>
          <td>${this.escapeHtml(proof.clientName || '-')}</td>
          <td>${this.escapeHtml(proof.fileName || proof.type || 'Comprovante')}</td>
          <td>${this.escapeHtml(proof.status || 'Registrado')}</td>
          <td>${proof.createdAt ? this.formatDate(proof.createdAt) : '-'}</td>
        </tr>
      `).join('');
    },

    renderAlerts() {
      const container = this.refs.alertsList;
      if (!container) return;

      const alerts = [];

      const lowStockProducts = this.getProducts().filter((product) => {
        const stock = this.toNumber(product.stock || 0);
        const minStock = this.toNumber(product.minStock || 0);
        return stock <= minStock;
      });

      lowStockProducts.slice(0, 4).forEach((product) => {
        alerts.push({
          title: product.name,
          text: `Estoque ${this.getStockStatus(product).toLowerCase()} • atual ${this.formatNumber(product.stock || 0)}`
        });
      });

      const pendingExpenses = this.getExpenses().filter((expense) => {
        const status = this.normalizeText(expense.status || '');
        return status.includes('pendente') || status.includes('parcelado');
      });

      pendingExpenses.slice(0, 3).forEach((expense) => {
        alerts.push({
          title: expense.description,
          text: `Despesa ${expense.status || 'Pendente'} • ${this.formatCurrency(expense.value || 0)}`
        });
      });

      if (!alerts.length) {
        container.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Sem alertas no momento</strong>
              <p>O painel vai mostrar aqui os principais avisos do dia.</p>
            </div>
            <span class="tag">OK</span>
          </div>
        `;
        return;
      }

      container.innerHTML = alerts.slice(0, 6).map((alert) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(alert.title)}</strong>
            <p>${this.escapeHtml(alert.text)}</p>
          </div>
          <span class="tag">Alerta</span>
        </div>
      `).join('');
    },

    renderActivities() {
      const container = this.refs.activityList;
      if (!container) return;

      const activities = [];

      this.getSales().forEach((sale) => {
        activities.push({
          date: `${sale.date || ''}T${sale.time || '00:00'}`,
          title: `Venda ${sale.orderNumber || '-'}`,
          text: `${sale.client?.name || 'Cliente'} • ${this.formatCurrency(sale.total || 0)}`
        });
      });

      this.getExpenses().forEach((expense) => {
        activities.push({
          date: `${expense.date || ''}T${expense.time || '00:00'}`,
          title: `Despesa`,
          text: `${expense.description || '-'} • ${this.formatCurrency(expense.value || 0)}`
        });
      });

      this.getMovements().forEach((movement) => {
        activities.push({
          date: `${movement.date || ''}T${movement.time || '00:00'}`,
          title: `Estoque • ${this.getTypeLabel(movement.type)}`,
          text: `${movement.productName || '-'} • qtd ${this.formatNumber(movement.quantity || 0)}`
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (!activities.length) {
        container.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Sem atividade recente</strong>
              <p>As últimas ações do sistema aparecerão aqui.</p>
            </div>
            <span class="tag">-</span>
          </div>
        `;
        return;
      }

      container.innerHTML = activities.slice(0, 8).map((activity) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(activity.title)}</strong>
            <p>${this.escapeHtml(activity.text)}</p>
          </div>
          <span class="tag">${activity.date ? this.formatDate(activity.date) : '-'}</span>
        </div>
      `).join('');
    },

    renderTopProducts() {
      const container = this.refs.topProductsList;
      if (!container) return;

      const products = this.getTopProductsData().slice(0, 6);

      if (!products.length) {
        container.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Sem produtos vendidos ainda</strong>
              <p>Os produtos mais vendidos aparecerão aqui.</p>
            </div>
            <span class="tag">-</span>
          </div>
        `;
        return;
      }

      container.innerHTML = products.map((product) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(product.name)}</strong>
            <p>${this.formatNumber(product.quantity)} item(ns) • ${this.formatCurrency(product.revenue)}</p>
          </div>
          <span class="tag">Top</span>
        </div>
      `).join('');
    },

    renderTopClients() {
      const container = this.refs.topClientsList;
      if (!container) return;

      const clients = this.getTopClientsData().slice(0, 6);

      if (!clients.length) {
        container.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Sem clientes com histórico ainda</strong>
              <p>Os melhores clientes aparecerão aqui.</p>
            </div>
            <span class="tag">-</span>
          </div>
        `;
        return;
      }

      container.innerHTML = clients.map((client) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(client.name)}</strong>
            <p>${client.orders} pedido(s) • ${this.formatCurrency(client.total)}</p>
          </div>
          <span class="tag">Cliente</span>
        </div>
      `).join('');
    },

    getTopProductsData() {
      const map = new Map();

      this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .forEach((sale) => {
          (sale.items || []).forEach((item) => {
            const key = item.productId || item.productName || item.name || 'produto';
            const current = map.get(key) || {
              id: item.productId || key,
              name: item.productName || item.name || 'Produto',
              quantity: 0,
              revenue: 0
            };

            current.quantity += this.toNumber(item.quantity || 0);
            current.revenue += this.toNumber(item.total || (item.unitPrice || item.price || 0) * (item.quantity || 0));
            map.set(key, current);
          });
        });

      return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    },

    getTopClientsData() {
      const map = new Map();

      this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .forEach((sale) => {
          const name = sale.client?.name || 'Cliente';
          const key = `${this.normalizeText(name)}|${sale.client?.phone || ''}|${sale.client?.email || ''}`;

          const current = map.get(key) || {
            name,
            orders: 0,
            total: 0
          };

          current.orders += 1;
          current.total += this.toNumber(sale.total || 0);
          map.set(key, current);
        });

      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },

    getStockStatus(product) {
      const stock = this.toNumber(product.stock || 0);
      const minStock = this.toNumber(product.minStock || 0);

      if (stock <= 0) return 'Sem estoque';
      if (stock <= minStock) return 'Baixo';
      return 'Normal';
    },

    getTypeLabel(type) {
      const map = {
        entrada: 'Entrada',
        saida: 'Saída',
        perda: 'Perda',
        ajuste: 'Ajuste',
        producao: 'Produção'
      };
      return map[type] || type || '-';
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

  document.addEventListener('DOMContentLoaded', () => HOME_PAGE.init());
  window.HuskyHome = HOME_PAGE;
})();
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
      this.setDefaultDates();
      this.renderAll();
      app.log('Tela inicial carregada.');
    },

    isHomePage() {
      const file = window.location.pathname.split('/').pop() || '';
      return file === 'home.html';
    },

    cacheRefs() {
      this.refs = {
        globalDateStart: document.getElementById('global-date-start'),
        globalDateEnd: document.getElementById('global-date-end'),
        btnApplyGlobalFilter: document.getElementById('btn-apply-global-filter'),

        metricSalesDay: document.getElementById('metric-sales-day'),
        metricProfitDay: document.getElementById('metric-profit-day'),
        metricExpensesDay: document.getElementById('metric-expenses-day'),
        metricStockAlert: document.getElementById('metric-stock-alert'),

        monthRevenue: document.getElementById('month-revenue'),
        monthProfit: document.getElementById('month-profit'),
        monthExpenses: document.getElementById('month-expenses'),
        finishedOrders: document.getElementById('finished-orders'),

        statusPendingPayment: document.getElementById('status-pending-payment'),
        statusPixProof: document.getElementById('status-pix-proof'),
        statusFinishedOrders: document.getElementById('status-finished-orders'),
        statusLowStock: document.getElementById('status-low-stock'),

        dashboardLastSalesTable: document.getElementById('dashboard-last-sales-table'),
        pendingOrdersTable: document.getElementById('pending-orders-table'),
        pixProofPreviewList: document.getElementById('pix-proof-preview-list'),

        dashboardAlertsList: document.getElementById('dashboard-alerts-list'),
        cashflowChartArea: document.getElementById('cashflow-chart-area'),
        monthlyPerformanceChart: document.getElementById('monthly-performance-chart')
      };
    },

    bindEvents() {
      this.refs.btnApplyGlobalFilter?.addEventListener('click', () => this.renderAll());

      this.refs.globalDateStart?.addEventListener('change', () => this.renderAll());
      this.refs.globalDateEnd?.addEventListener('change', () => this.renderAll());

      window.addEventListener('husky:state-changed', () => {
        this.renderAll();
      });

      window.addEventListener('storage', () => {
        this.renderAll();
      });
    },

    setDefaultDates() {
      const today = this.todayISO();
      const firstDay = this.getMonthStart(today);

      if (this.refs.globalDateStart && !this.refs.globalDateStart.value) {
        this.refs.globalDateStart.value = firstDay;
      }

      if (this.refs.globalDateEnd && !this.refs.globalDateEnd.value) {
        this.refs.globalDateEnd.value = today;
      }
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

    getProofs() {
      return Array.isArray(this.getState().proofs) ? this.getState().proofs : [];
    },

    todayISO() {
      return typeof app.todayISO === 'function'
        ? app.todayISO()
        : new Date().toISOString().slice(0, 10);
    },

    getMonthStart(dateStr) {
      const base = dateStr || this.todayISO();
      const [year, month] = base.split('-');
      return `${year}-${month}-01`;
    },

    toNumber(value) {
      return typeof app.toNumber === 'function'
        ? app.toNumber(value)
        : Number(value || 0);
    },

    formatCurrency(value) {
      if (typeof app.formatCurrency === 'function') {
        return app.formatCurrency(value);
      }

      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(this.toNumber(value));
    },

    formatDate(value) {
      if (typeof app.formatDate === 'function') {
        return app.formatDate(value);
      }

      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('pt-BR');
    },

    normalizeText(value) {
      const text = String(value || '').trim().toLowerCase();
      try {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (error) {
        return text;
      }
    },

    sum(list = [], mapper = (item) => item) {
      if (typeof app.sum === 'function') {
        return app.sum(list, mapper);
      }

      return list.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);
    },

    escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    getDateRange() {
      const start = this.refs.globalDateStart?.value || '';
      const end = this.refs.globalDateEnd?.value || '';

      return {
        start,
        end
      };
    },

    isWithinRange(dateValue, start, end) {
      if (!dateValue) return false;
      if (start && dateValue < start) return false;
      if (end && dateValue > end) return false;
      return true;
    },

    getFilteredSales() {
      const { start, end } = this.getDateRange();

      return this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .filter((sale) => this.isWithinRange(sale.date, start, end))
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });
    },

    getFilteredExpenses() {
      const { start, end } = this.getDateRange();

      return this.getExpenses()
        .filter((expense) => expense.status !== 'Cancelado')
        .filter((expense) => this.isWithinRange(expense.date, start, end))
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });
    },

    getLowStockProducts() {
      return this.getProducts().filter((product) => {
        const stock = this.toNumber(product.stock || 0);
        const minStock = this.toNumber(product.minStock || 0);
        return stock <= minStock;
      });
    },

    renderAll() {
      this.renderMetrics();
      this.renderSummary();
      this.renderStatus();
      this.renderRecentSales();
      this.renderPendingOrders();
      this.renderPixProofPreview();
      this.renderAlerts();
      this.renderChartPlaceholders();
    },

    renderMetrics() {
      const today = this.todayISO();

      const todaySales = this.getSales().filter(
        (sale) => sale.orderStatus !== 'Cancelado' && sale.date === today
      );

      const todayExpenses = this.getExpenses().filter(
        (expense) => expense.status !== 'Cancelado' && expense.date === today
      );

      const revenueToday = this.sum(todaySales, (sale) => sale.total || 0);
      const expensesToday = this.sum(todayExpenses, (expense) => expense.value || 0);
      const profitToday = revenueToday - expensesToday;
      const lowStockCount = this.getLowStockProducts().length;

      if (this.refs.metricSalesDay) {
        this.refs.metricSalesDay.textContent = this.formatCurrency(revenueToday);
      }

      if (this.refs.metricProfitDay) {
        this.refs.metricProfitDay.textContent = this.formatCurrency(profitToday);
      }

      if (this.refs.metricExpensesDay) {
        this.refs.metricExpensesDay.textContent = this.formatCurrency(expensesToday);
      }

      if (this.refs.metricStockAlert) {
        this.refs.metricStockAlert.textContent = String(lowStockCount);
      }
    },

    renderSummary() {
      const sales = this.getFilteredSales();
      const expenses = this.getFilteredExpenses();

      const revenue = this.sum(sales, (sale) => sale.total || 0);
      const expenseTotal = this.sum(expenses, (expense) => expense.value || 0);
      const profit = revenue - expenseTotal;
      const finished = sales.filter((sale) => sale.orderStatus === 'Finalizado').length;

      if (this.refs.monthRevenue) {
        this.refs.monthRevenue.textContent = this.formatCurrency(revenue);
      }

      if (this.refs.monthProfit) {
        this.refs.monthProfit.textContent = this.formatCurrency(profit);
      }

      if (this.refs.monthExpenses) {
        this.refs.monthExpenses.textContent = this.formatCurrency(expenseTotal);
      }

      if (this.refs.finishedOrders) {
        this.refs.finishedOrders.textContent = String(finished);
      }
    },

    renderStatus() {
      const sales = this.getFilteredSales();
      const lowStockCount = this.getLowStockProducts().length;

      const pendingPayment = sales.filter((sale) => {
        const status = this.normalizeText(sale.paymentStatus || '');
        return status.includes('aguardando') || status.includes('pendente') || status.includes('parcial');
      }).length;

      const pixWithProof = sales.filter((sale) => sale.paymentMethod === 'Pix' && sale.pixProof?.name).length;
      const finished = sales.filter((sale) => sale.orderStatus === 'Finalizado').length;

      if (this.refs.statusPendingPayment) {
        this.refs.statusPendingPayment.textContent = String(pendingPayment);
      }

      if (this.refs.statusPixProof) {
        this.refs.statusPixProof.textContent = String(pixWithProof);
      }

      if (this.refs.statusFinishedOrders) {
        this.refs.statusFinishedOrders.textContent = String(finished);
      }

      if (this.refs.statusLowStock) {
        this.refs.statusLowStock.textContent = String(lowStockCount);
      }
    },

    renderRecentSales() {
      const tbody = this.refs.dashboardLastSalesTable;
      if (!tbody) return;

      const sales = this.getFilteredSales().slice(0, 8);

      if (!sales.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4">Nenhuma venda encontrada no período.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = sales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.formatDate(sale.date)}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${this.formatCurrency(sale.total || 0)}</td>
        </tr>
      `).join('');
    },

    renderPendingOrders() {
      const tbody = this.refs.pendingOrdersTable;
      if (!tbody) return;

      const pendingOrders = this.getFilteredSales()
        .filter((sale) => {
          const paymentStatus = this.normalizeText(sale.paymentStatus || '');
          const orderStatus = this.normalizeText(sale.orderStatus || '');

          return (
            paymentStatus.includes('aguardando') ||
            paymentStatus.includes('pendente') ||
            orderStatus.includes('pendente') ||
            orderStatus.includes('producao') ||
            orderStatus.includes('produção') ||
            orderStatus.includes('pronto')
          );
        })
        .slice(0, 8);

      if (!pendingOrders.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">Nenhum pedido aguardando ação.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = pendingOrders.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${this.escapeHtml(sale.orderStatus || '-')}</td>
          <td>${this.escapeHtml(sale.paymentMethod || '-')}</td>
          <td>
            ${sale.paymentMethod === 'Pix'
              ? '<a href="comprovantes.html">Anexar</a>'
              : '<a href="vendas.html">Abrir</a>'}
          </td>
        </tr>
      `).join('');
    },

    renderPixProofPreview() {
      const container = this.refs.pixProofPreviewList;
      if (!container) return;

      const salesWithPix = this.getFilteredSales()
        .filter((sale) => sale.paymentMethod === 'Pix')
        .slice(0, 6);

      if (!salesWithPix.length) {
        container.innerHTML = `
          <div class="husky-home-proof-item">
            <div>
              <strong>Nenhum Pix no período</strong>
              <p>Os comprovantes aparecerão aqui.</p>
            </div>
            <span class="husky-home-soft-tag">-</span>
          </div>
        `;
        return;
      }

      container.innerHTML = salesWithPix.map((sale) => {
        const tag = sale.pixProof?.name
          ? 'Comprovante'
          : (this.normalizeText(sale.paymentStatus || '').includes('pago') ? 'Pago' : 'Pendente');

        return `
          <div class="husky-home-proof-item">
            <div>
              <strong>Pedido ${this.escapeHtml(sale.orderNumber || '-')}</strong>
              <p>${this.escapeHtml(sale.client?.name || 'Consumidor final')} • Pix</p>
            </div>
            <span class="husky-home-soft-tag">${this.escapeHtml(tag)}</span>
          </div>
        `;
      }).join('');
    },

    renderAlerts() {
      const container = this.refs.dashboardAlertsList;
      if (!container) return;

      const alerts = [];
      const lowStock = this.getLowStockProducts().slice(0, 3);

      lowStock.forEach((product) => {
        alerts.push(`Estoque baixo: ${product.name || 'Produto'} (${this.toNumber(product.stock || 0)})`);
      });

      const pendingPix = this.getFilteredSales().filter((sale) => {
        const status = this.normalizeText(sale.paymentStatus || '');
        return sale.paymentMethod === 'Pix' && !sale.pixProof?.name && !status.includes('pago');
      });

      if (pendingPix.length) {
        alerts.push(`${pendingPix.length} pedido(s) Pix sem comprovante.`);
      }

      if (!alerts.length) {
        container.innerHTML = `
          <li>Sem alertas críticos no momento.</li>
        `;
        return;
      }

      container.innerHTML = alerts.map((alert) => `<li>${this.escapeHtml(alert)}</li>`).join('');
    },

    renderChartPlaceholders() {
      const sales = this.getFilteredSales();
      const expenses = this.getFilteredExpenses();

      const revenue = this.sum(sales, (sale) => sale.total || 0);
      const expenseTotal = this.sum(expenses, (expense) => expense.value || 0);
      const profit = revenue - expenseTotal;

      if (this.refs.cashflowChartArea) {
        this.refs.cashflowChartArea.innerHTML = `
          <p>Entradas: <strong>${this.formatCurrency(revenue)}</strong></p>
          <p>Saídas: <strong>${this.formatCurrency(expenseTotal)}</strong></p>
        `;
      }

      if (this.refs.monthlyPerformanceChart) {
        this.refs.monthlyPerformanceChart.innerHTML = `
          <p>Resultado do período: <strong>${this.formatCurrency(profit)}</strong></p>
        `;
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => HOME_PAGE.init());
  window.HuskyHome = HOME_PAGE;
})();
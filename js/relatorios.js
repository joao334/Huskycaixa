(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Relatórios] HuskyApp não encontrado. Verifique se app.js foi carregado antes de relatorios.js.');
    return;
  }

  const REPORTS_PAGE = {
    refs: {},
    filters: {
      startDate: '',
      endDate: '',
      reportType: 'geral',
      periodPreset: '',
      paymentMethod: '',
      category: ''
    },

    init() {
      if (!document.getElementById('report-filter-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.ensureStateCollections();
      this.setDefaultFilters();
      this.populateDynamicFilters();
      this.renderAll();
      this.log('Tela de relatórios carregada.');
    },

    cacheRefs() {
      this.refs = {
        reportFilterForm: document.getElementById('report-filter-form'),
        reportStartDate: document.getElementById('report-start-date'),
        reportEndDate: document.getElementById('report-end-date'),
        reportType: document.getElementById('report-type'),
        reportPeriodPreset: document.getElementById('report-period-preset'),
        reportPaymentFilter: document.getElementById('report-payment-filter'),
        reportCategoryFilter: document.getElementById('report-category-filter'),
        btnGenerateReport: document.getElementById('btn-generate-report'),
        btnGenerateReportHero: document.getElementById('btn-generate-report-hero'),
        btnClearReportFilter: document.getElementById('btn-clear-report-filter'),
        btnExportReportPdfTop: document.getElementById('btn-export-report-pdf-top'),
        btnExportReportExcelTop: document.getElementById('btn-export-report-excel-top'),

        reportTotalSales: document.getElementById('report-total-sales'),
        reportTotalCosts: document.getElementById('report-total-costs'),
        reportTotalExpenses: document.getElementById('report-total-expenses'),
        reportTotalProfit: document.getElementById('report-total-profit'),
        reportAverageTicket: document.getElementById('report-average-ticket'),
        reportOrdersCount: document.getElementById('report-orders-count'),
        reportProfitMargin: document.getElementById('report-profit-margin'),
        reportLossesTotal: document.getElementById('report-losses-total'),

        monthlyReportChart: document.getElementById('monthly-report-chart'),
        financialFlowChart: document.getElementById('financial-flow-chart'),
        paymentMethodChart: document.getElementById('payment-method-chart'),

        topProductsReport: document.getElementById('top-products-report'),
        topExpenseCategories: document.getElementById('top-expense-categories'),
        bestMarginProducts: document.getElementById('best-margin-products'),

        reportFinishedOrders: document.getElementById('report-finished-orders'),
        reportPendingOrders: document.getElementById('report-pending-orders'),
        reportPixWithProof: document.getElementById('report-pix-with-proof'),
        reportCriticalStock: document.getElementById('report-critical-stock'),
        reportStockMovements: document.getElementById('report-stock-movements'),
        reportLowStock: document.getElementById('report-low-stock'),
        reportZeroStock: document.getElementById('report-zero-stock'),
        reportStockLosses: document.getElementById('report-stock-losses'),

        reportTableBody: document.getElementById('report-table-body'),
        reportSalesTableBody: document.getElementById('report-sales-table-body'),
        reportExpensesTableBody: document.getElementById('report-expenses-table-body')
      };
    },

    bindEvents() {
      this.refs.btnGenerateReport?.addEventListener('click', () => this.generateReport());
      this.refs.btnGenerateReportHero?.addEventListener('click', () => this.generateReport());
      this.refs.btnClearReportFilter?.addEventListener('click', () => this.resetFilters());
      this.refs.reportPeriodPreset?.addEventListener('change', () => this.applyPreset());
      this.refs.reportType?.addEventListener('change', () => this.captureFilters());
      this.refs.reportPaymentFilter?.addEventListener('change', () => this.captureFilters());
      this.refs.reportCategoryFilter?.addEventListener('change', () => this.captureFilters());
      this.refs.reportStartDate?.addEventListener('change', () => this.captureFilters());
      this.refs.reportEndDate?.addEventListener('change', () => this.captureFilters());
      this.refs.btnExportReportPdfTop?.addEventListener('click', () => this.exportAsPrint());
      this.refs.btnExportReportExcelTop?.addEventListener('click', () => this.exportAsCsv());

      window.addEventListener('husky:state-changed', () => {
        this.ensureStateCollections();
        this.populateDynamicFilters();
        this.renderAll();
      });

      window.addEventListener('storage', () => {
        this.ensureStateCollections();
        this.populateDynamicFilters();
        this.renderAll();
      });
    },

    ensureStateCollections() {
      const state = this.getState();

      if (!Array.isArray(state.sales)) state.sales = [];
      if (!Array.isArray(state.expenses)) state.expenses = [];
      if (!Array.isArray(state.products)) state.products = [];
      if (!Array.isArray(state.stockMovements)) state.stockMovements = [];
      if (!Array.isArray(state.proofs)) state.proofs = [];
      if (!Array.isArray(state.customers)) state.customers = [];

      if (typeof app.setAppState === 'function') {
        app.setAppState(state);
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

    getStockMovements() {
      return Array.isArray(this.getState().stockMovements) ? this.getState().stockMovements : [];
    },

    getProofs() {
      return Array.isArray(this.getState().proofs) ? this.getState().proofs : [];
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
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('pt-BR');
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

    includesText(haystack, needle) {
      if (typeof app.includesText === 'function') return app.includesText(haystack, needle);
      return this.normalizeText(haystack).includes(this.normalizeText(needle));
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

    setDefaultFilters() {
      const today = this.todayISO();
      const monthStart = `${today.slice(0, 7)}-01`;

      this.filters = {
        startDate: monthStart,
        endDate: today,
        reportType: 'geral',
        periodPreset: 'currentMonth',
        paymentMethod: '',
        category: ''
      };

      this.syncFiltersToForm();
    },

    syncFiltersToForm() {
      if (this.refs.reportStartDate) this.refs.reportStartDate.value = this.filters.startDate || '';
      if (this.refs.reportEndDate) this.refs.reportEndDate.value = this.filters.endDate || '';
      if (this.refs.reportType) this.refs.reportType.value = this.filters.reportType || 'geral';
      if (this.refs.reportPeriodPreset) this.refs.reportPeriodPreset.value = this.filters.periodPreset || '';
      if (this.refs.reportPaymentFilter) this.refs.reportPaymentFilter.value = this.filters.paymentMethod || '';
      if (this.refs.reportCategoryFilter) this.refs.reportCategoryFilter.value = this.filters.category || '';
    },

    captureFilters() {
      this.filters.startDate = this.refs.reportStartDate?.value || '';
      this.filters.endDate = this.refs.reportEndDate?.value || '';
      this.filters.reportType = this.refs.reportType?.value || 'geral';
      this.filters.periodPreset = this.refs.reportPeriodPreset?.value || '';
      this.filters.paymentMethod = this.refs.reportPaymentFilter?.value || '';
      this.filters.category = this.refs.reportCategoryFilter?.value || '';
    },

    populateDynamicFilters() {
      this.populatePaymentFilter();
      this.populateCategoryFilter();
      this.syncFiltersToForm();
    },

    populatePaymentFilter() {
      if (!this.refs.reportPaymentFilter) return;

      const current = this.filters.paymentMethod || '';
      const payments = new Set();

      this.getSales().forEach((sale) => {
        if (sale.paymentMethod) payments.add(sale.paymentMethod);
      });

      this.getExpenses().forEach((expense) => {
        if (expense.paymentMethod) payments.add(expense.paymentMethod);
      });

      const sorted = [...payments].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      this.refs.reportPaymentFilter.innerHTML = `
        <option value="">Todos os pagamentos</option>
        ${sorted.map((payment) => `<option value="${this.escapeHtml(payment)}">${this.escapeHtml(payment)}</option>`).join('')}
      `;

      if (sorted.includes(current)) {
        this.refs.reportPaymentFilter.value = current;
      }
    },

    populateCategoryFilter() {
      if (!this.refs.reportCategoryFilter) return;

      const current = this.filters.category || '';
      const categories = new Set();

      this.getProducts().forEach((product) => {
        if (product.category) categories.add(product.category);
      });

      this.getExpenses().forEach((expense) => {
        if (expense.category) categories.add(expense.category);
      });

      const sorted = [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      this.refs.reportCategoryFilter.innerHTML = `
        <option value="">Todas as categorias</option>
        ${sorted.map((category) => `<option value="${this.escapeHtml(category)}">${this.escapeHtml(category)}</option>`).join('')}
      `;

      if (sorted.includes(current)) {
        this.refs.reportCategoryFilter.value = current;
      }
    },

    applyPreset() {
      const preset = this.refs.reportPeriodPreset?.value || '';
      const today = new Date();

      const toISO = (date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 10);
      };

      let start = null;
      let end = toISO(today);

      if (preset === 'today') {
        start = end;
      }

      if (preset === 'yesterday') {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        start = toISO(d);
        end = toISO(d);
      }

      if (preset === '7days') {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        start = toISO(d);
      }

      if (preset === '15days') {
        const d = new Date(today);
        d.setDate(d.getDate() - 14);
        start = toISO(d);
      }

      if (preset === '30days') {
        const d = new Date(today);
        d.setDate(d.getDate() - 29);
        start = toISO(d);
      }

      if (preset === 'currentMonth') {
        start = `${toISO(today).slice(0, 7)}-01`;
      }

      if (preset === 'lastMonth') {
        const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        start = toISO(d);
        end = toISO(lastDay);
      }

      if (preset === 'year') {
        start = `${today.getFullYear()}-01-01`;
      }

      if (start) {
        if (this.refs.reportStartDate) this.refs.reportStartDate.value = start;
        if (this.refs.reportEndDate) this.refs.reportEndDate.value = end;
      }

      this.captureFilters();
    },

    resetFilters() {
      this.setDefaultFilters();
      this.populateDynamicFilters();
      this.renderAll();
      this.showToast('Filtros de relatório redefinidos.', 'success');
    },

    generateReport() {
      this.captureFilters();

      if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
        this.showToast('A data inicial não pode ser maior que a data final.', 'warning');
        return;
      }

      this.renderAll();
      this.showToast('Relatório atualizado com sucesso.', 'success');
      this.log('Relatório gerado.', { ...this.filters });
    },

    filterSales() {
      return this.getSales().filter((sale) => {
        const inRange = this.matchesDateRange(sale.date);
        const paymentOk = !this.filters.paymentMethod || sale.paymentMethod === this.filters.paymentMethod;
        const categoryOk = !this.filters.category || (sale.items || []).some((item) => this.findProductById(item.productId)?.category === this.filters.category);

        if (!inRange || !paymentOk || !categoryOk) return false;

        return true;
      });
    },

    filterExpenses() {
      return this.getExpenses().filter((expense) => {
        const inRange = this.matchesDateRange(expense.date);
        const paymentOk = !this.filters.paymentMethod || expense.paymentMethod === this.filters.paymentMethod;
        const categoryOk = !this.filters.category || expense.category === this.filters.category;

        if (!inRange || !paymentOk || !categoryOk) return false;

        return true;
      });
    },

    filterMovements() {
      return this.getStockMovements().filter((movement) => {
        const inRange = this.matchesDateRange(movement.date);
        const categoryOk = !this.filters.category || this.findProductById(movement.productId)?.category === this.filters.category;

        if (!inRange || !categoryOk) return false;

        return true;
      });
    },

    matchesDateRange(date) {
      if (!date) return false;
      if (this.filters.startDate && date < this.filters.startDate) return false;
      if (this.filters.endDate && date > this.filters.endDate) return false;
      return true;
    },

    renderAll() {
      const sales = this.filterSales();
      const expenses = this.filterExpenses();
      const movements = this.filterMovements();
      const analytics = this.buildAnalytics(sales, expenses, movements);

      this.renderMetrics(analytics);
      this.renderStatus(analytics, sales, movements);
      this.renderMonthlyChart(analytics.monthlyBuckets);
      this.renderFinancialFlowChart(analytics.dailyBuckets);
      this.renderPaymentMethodChart(analytics.paymentBuckets);
      this.renderTopProducts(analytics.topProducts);
      this.renderTopExpenseCategories(analytics.topExpenseCategories);
      this.renderBestMarginProducts(analytics.bestMarginProducts);
      this.renderAnalyticsTable(analytics);
      this.renderSalesTable(sales);
      this.renderExpensesTable(expenses);
    },

    buildAnalytics(sales, expenses, movements) {
      const validSales = sales.filter((sale) => sale.orderStatus !== 'Cancelado');
      const validExpenses = expenses.filter((expense) => expense.status !== 'Cancelado');

      const totalSales = this.sum(validSales, (sale) => sale.total || 0);
      const totalCosts = this.sum(validSales, (sale) => {
        if (sale.cost !== undefined && sale.cost !== null) return sale.cost || 0;
        return this.sum(sale.items || [], (item) => this.toNumber(item.unitCost || 0) * this.toNumber(item.quantity || 0));
      });
      const totalExpenses = this.sum(
        validExpenses.filter((expense) => expense.affectsProfit !== false),
        (expense) => expense.value || 0
      );
      const profit = totalSales - totalCosts - totalExpenses;
      const ordersCount = validSales.length;
      const averageTicket = ordersCount ? totalSales / ordersCount : 0;
      const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      const lossesTotal = this.sum(
        validExpenses.filter((expense) => expense.category === 'Perda de material'),
        (expense) => expense.value || 0
      );

      const monthlyBuckets = this.buildMonthlyBuckets(validSales, validExpenses);
      const dailyBuckets = this.buildDailyBuckets(validSales, validExpenses);
      const paymentBuckets = this.buildPaymentBuckets(validSales);
      const topProducts = this.buildTopProducts(validSales);
      const topExpenseCategories = this.buildTopExpenseCategories(validExpenses);
      const bestMarginProducts = this.buildBestMarginProducts(validSales);

      return {
        totalSales,
        totalCosts,
        totalExpenses,
        profit,
        ordersCount,
        averageTicket,
        profitMargin,
        lossesTotal,
        monthlyBuckets,
        dailyBuckets,
        paymentBuckets,
        topProducts,
        topExpenseCategories,
        bestMarginProducts
      };
    },

    buildMonthlyBuckets(sales, expenses) {
      const bucket = new Map();

      sales.forEach((sale) => {
        const key = (sale.date || '').slice(0, 7);
        if (!key) return;

        if (!bucket.has(key)) {
          bucket.set(key, { label: key, sales: 0, expenses: 0, profit: 0 });
        }

        const entry = bucket.get(key);
        entry.sales += this.toNumber(sale.total || 0);
        entry.profit += this.toNumber(sale.profit || (sale.total || 0) - (sale.cost || 0));
      });

      expenses.forEach((expense) => {
        const key = (expense.date || '').slice(0, 7);
        if (!key) return;

        if (!bucket.has(key)) {
          bucket.set(key, { label: key, sales: 0, expenses: 0, profit: 0 });
        }

        const entry = bucket.get(key);
        entry.expenses += this.toNumber(expense.value || 0);
        entry.profit -= this.toNumber(expense.value || 0);
      });

      return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
    },

    buildDailyBuckets(sales, expenses) {
      const bucket = new Map();

      sales.forEach((sale) => {
        const key = sale.date;
        if (!key) return;

        if (!bucket.has(key)) {
          bucket.set(key, { label: this.formatDate(key), date: key, input: 0, output: 0 });
        }

        bucket.get(key).input += this.toNumber(sale.total || 0);
      });

      expenses.forEach((expense) => {
        const key = expense.date;
        if (!key) return;

        if (!bucket.has(key)) {
          bucket.set(key, { label: this.formatDate(key), date: key, input: 0, output: 0 });
        }

        bucket.get(key).output += this.toNumber(expense.value || 0);
      });

      return [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
    },

    buildPaymentBuckets(sales) {
      const bucket = new Map();

      sales.forEach((sale) => {
        const key = sale.paymentMethod || 'Não informado';
        bucket.set(key, (bucket.get(key) || 0) + this.toNumber(sale.total || 0));
      });

      return [...bucket.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    },

    buildTopProducts(sales) {
      const bucket = new Map();

      sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const key = item.productId || item.productName || item.name || 'produto';
          const current = bucket.get(key) || {
            productId: item.productId || key,
            name: item.productName || item.name || 'Produto',
            quantity: 0,
            revenue: 0
          };

          current.quantity += this.toNumber(item.quantity || 0);
          current.revenue += this.toNumber(item.total || 0);
          bucket.set(key, current);
        });
      });

      return [...bucket.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6);
    },

    buildTopExpenseCategories(expenses) {
      const bucket = new Map();

      expenses.forEach((expense) => {
        const key = expense.category || 'Outros';
        bucket.set(key, (bucket.get(key) || 0) + this.toNumber(expense.value || 0));
      });

      return [...bucket.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    },

    buildBestMarginProducts(sales) {
      const bucket = new Map();

      sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const key = item.productId || item.productName || item.name || 'produto';
          const current = bucket.get(key) || {
            productId: item.productId || key,
            name: item.productName || item.name || 'Produto',
            revenue: 0,
            cost: 0,
            quantity: 0
          };

          current.revenue += this.toNumber(item.total || 0);
          current.cost += this.toNumber(item.unitCost || 0) * this.toNumber(item.quantity || 0);
          current.quantity += this.toNumber(item.quantity || 0);
          bucket.set(key, current);
        });
      });

      return [...bucket.values()]
        .map((item) => ({
          ...item,
          margin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0
        }))
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 6);
    },

    renderMetrics(analytics) {
      this.setText(this.refs.reportTotalSales, this.formatCurrency(analytics.totalSales));
      this.setText(this.refs.reportTotalCosts, this.formatCurrency(analytics.totalCosts));
      this.setText(this.refs.reportTotalExpenses, this.formatCurrency(analytics.totalExpenses));
      this.setText(this.refs.reportTotalProfit, this.formatCurrency(analytics.profit));
      this.setText(this.refs.reportAverageTicket, this.formatCurrency(analytics.averageTicket));
      this.setText(this.refs.reportOrdersCount, String(analytics.ordersCount));
      this.setText(this.refs.reportProfitMargin, `${this.formatNumber(analytics.profitMargin, 1)}%`);
      this.setText(this.refs.reportLossesTotal, this.formatCurrency(analytics.lossesTotal));
    },

    renderStatus(analytics, sales, movements) {
      const activeSales = sales.filter((sale) => sale.orderStatus !== 'Cancelado');
      const finishedOrders = activeSales.filter((sale) => sale.orderStatus === 'Finalizado').length;
      const pendingOrders = activeSales.filter((sale) => sale.orderStatus !== 'Finalizado').length;

      const proofs = this.getProofs();
      const pixWithProof = activeSales.filter((sale) => {
        if (sale.paymentMethod !== 'Pix') return false;
        const hasInSale = Boolean(sale.pixProof?.name || sale.pixProof?.dataUrl);
        const hasProofRecord = proofs.some((proof) => {
          return proof.saleId === sale.id || proof.orderNumber === sale.orderNumber;
        });
        return hasInSale || hasProofRecord;
      }).length;

      const products = this.getProducts();
      const criticalStock = products.filter((product) => this.toNumber(product.stock || 0) <= this.toNumber(product.minStock || 0)).length;
      const lowStock = products.filter((product) => {
        const stock = this.toNumber(product.stock || 0);
        const minStock = this.toNumber(product.minStock || 0);
        return stock > 0 && stock <= minStock;
      }).length;
      const zeroStock = products.filter((product) => this.toNumber(product.stock || 0) <= 0).length;
      const stockLosses = this.sum(
        movements.filter((movement) => movement.type === 'perda'),
        (movement) => movement.totalCost || 0
      );

      this.setText(this.refs.reportFinishedOrders, String(finishedOrders));
      this.setText(this.refs.reportPendingOrders, String(pendingOrders));
      this.setText(this.refs.reportPixWithProof, String(pixWithProof));
      this.setText(this.refs.reportCriticalStock, String(criticalStock));
      this.setText(this.refs.reportStockMovements, String(movements.length));
      this.setText(this.refs.reportLowStock, String(lowStock));
      this.setText(this.refs.reportZeroStock, String(zeroStock));
      this.setText(this.refs.reportStockLosses, this.formatCurrency(stockLosses));
    },

    renderMonthlyChart(data) {
      if (!this.refs.monthlyReportChart) return;

      this.refs.monthlyReportChart.innerHTML = this.renderBarChart(
        data.map((item) => ({
          label: item.label,
          value: item.sales,
          secondary: item.expenses,
          tertiary: item.profit
        })),
        'Vendas / Despesas / Lucro'
      );
    },

    renderFinancialFlowChart(data) {
      if (!this.refs.financialFlowChart) return;

      this.refs.financialFlowChart.innerHTML = this.renderBarChart(
        data.map((item) => ({
          label: item.label,
          value: item.input,
          secondary: item.output,
          tertiary: item.input - item.output
        })),
        'Entradas / Saídas / Saldo'
      );
    },

    renderPaymentMethodChart(data) {
      if (!this.refs.paymentMethodChart) return;

      this.refs.paymentMethodChart.innerHTML = this.renderSimpleListChart(
        data,
        (item) => `${item.label} • ${this.formatCurrency(item.value)}`,
        (item) => item.value
      );
    },

    renderTopProducts(data) {
      if (!this.refs.topProductsReport) return;

      if (!data.length) {
        this.refs.topProductsReport.innerHTML = this.renderEmptyCard(
          'Sem dados ainda',
          'Os produtos mais vendidos aparecerão aqui.',
          '0'
        );
        return;
      }

      this.refs.topProductsReport.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.name)}</strong>
            <p>${this.formatNumber(item.quantity)} vendidos • ${this.formatCurrency(item.revenue)}</p>
          </div>
          <span class="tag">${this.formatNumber(item.quantity)}</span>
        </div>
      `).join('');
    },

    renderTopExpenseCategories(data) {
      if (!this.refs.topExpenseCategories) return;

      if (!data.length) {
        this.refs.topExpenseCategories.innerHTML = this.renderEmptyCard(
          'Sem dados ainda',
          'As categorias de despesa aparecerão aqui.',
          'R$ 0,00'
        );
        return;
      }

      this.refs.topExpenseCategories.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.label)}</strong>
            <p>Impacto total no período</p>
          </div>
          <span class="tag">${this.formatCurrency(item.value)}</span>
        </div>
      `).join('');
    },

    renderBestMarginProducts(data) {
      if (!this.refs.bestMarginProducts) return;

      if (!data.length) {
        this.refs.bestMarginProducts.innerHTML = this.renderEmptyCard(
          'Sem dados ainda',
          'Os produtos mais rentáveis aparecerão aqui.',
          '0%'
        );
        return;
      }

      this.refs.bestMarginProducts.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.name)}</strong>
            <p>Receita ${this.formatCurrency(item.revenue)} • Custo ${this.formatCurrency(item.cost)}</p>
          </div>
          <span class="tag">${this.formatNumber(item.margin, 1)}%</span>
        </div>
      `).join('');
    },

    renderAnalyticsTable(analytics) {
      if (!this.refs.reportTableBody) return;

      this.refs.reportTableBody.innerHTML = `
        <tr>
          <td>${this.getPeriodLabel()}</td>
          <td>${this.formatCurrency(analytics.totalSales)}</td>
          <td>${this.formatCurrency(analytics.totalCosts)}</td>
          <td>${this.formatCurrency(analytics.totalExpenses)}</td>
          <td>${this.formatCurrency(analytics.profit)}</td>
          <td>${this.formatNumber(analytics.profitMargin, 1)}%</td>
        </tr>
      `;
    },

    renderSalesTable(sales) {
      if (!this.refs.reportSalesTableBody) return;

      const validSales = sales
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 12);

      if (!validSales.length) {
        this.refs.reportSalesTableBody.innerHTML = '<tr><td colspan="4">Nenhuma venda encontrada no período.</td></tr>';
        return;
      }

      this.refs.reportSalesTableBody.innerHTML = validSales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${this.escapeHtml(sale.paymentMethod || '-')}</td>
          <td>${this.formatCurrency(sale.total || 0)}</td>
        </tr>
      `).join('');
    },

    renderExpensesTable(expenses) {
      if (!this.refs.reportExpensesTableBody) return;

      const validExpenses = expenses
        .filter((expense) => expense.status !== 'Cancelado')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 12);

      if (!validExpenses.length) {
        this.refs.reportExpensesTableBody.innerHTML = '<tr><td colspan="4">Nenhuma despesa encontrada no período.</td></tr>';
        return;
      }

      this.refs.reportExpensesTableBody.innerHTML = validExpenses.map((expense) => `
        <tr>
          <td>${this.formatDate(expense.date)}</td>
          <td>${this.escapeHtml(expense.category || '-')}</td>
          <td>${this.escapeHtml(expense.description || '-')}</td>
          <td>${this.formatCurrency(expense.value || 0)}</td>
        </tr>
      `).join('');
    },

    renderBarChart(data, legendText = '') {
      if (!data.length) {
        return '<p>Não há dados suficientes para exibir o gráfico.</p>';
      }

      const maxValue = Math.max(
        1,
        ...data.flatMap((item) => [item.value || 0, item.secondary || 0, Math.abs(item.tertiary || 0)])
      );

      return `
        <div style="display:grid; gap:14px; width:100%;">
          <div style="font-size:12px; color:#6b564d; font-weight:700; text-transform:uppercase; letter-spacing:.04em;">${this.escapeHtml(legendText)}</div>
          ${data.map((item) => {
            const valueWidth = Math.max(4, ((item.value || 0) / maxValue) * 100);
            const secondaryWidth = Math.max(4, ((item.secondary || 0) / maxValue) * 100);
            const tertiaryWidth = Math.max(4, (Math.abs(item.tertiary || 0) / maxValue) * 100);

            return `
              <div style="display:grid; gap:8px;">
                <div style="display:flex; justify-content:space-between; gap:10px; font-size:13px; color:#6b564d;">
                  <strong style="color:#163247;">${this.escapeHtml(item.label)}</strong>
                  <span>V ${this.formatCurrency(item.value || 0)} • D ${this.formatCurrency(item.secondary || 0)} • L ${this.formatCurrency(item.tertiary || 0)}</span>
                </div>
                <div style="display:grid; gap:6px;">
                  <div style="height:10px; background:rgba(47,111,159,.12); border-radius:999px; overflow:hidden;">
                    <div style="height:100%; width:${valueWidth}%; background:linear-gradient(90deg,#2f6f9f,#9fc7e3);"></div>
                  </div>
                  <div style="height:10px; background:rgba(191,75,75,.10); border-radius:999px; overflow:hidden;">
                    <div style="height:100%; width:${secondaryWidth}%; background:linear-gradient(90deg,#bf4b4b,#e4b2b2);"></div>
                  </div>
                  <div style="height:10px; background:rgba(47,139,87,.10); border-radius:999px; overflow:hidden;">
                    <div style="height:100%; width:${tertiaryWidth}%; background:linear-gradient(90deg,#2f8b57,#9fd0af);"></div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    renderSimpleListChart(data, labelFormatter, valueGetter) {
      if (!data.length) {
        return '<p>Não há dados suficientes para exibir o gráfico.</p>';
      }

      const maxValue = Math.max(1, ...data.map((item) => valueGetter(item)));

      return `
        <div style="display:grid; gap:12px; width:100%;">
          ${data.map((item) => {
            const value = valueGetter(item);
            const width = Math.max(4, (value / maxValue) * 100);

            return `
              <div style="display:grid; gap:6px;">
                <div style="display:flex; justify-content:space-between; gap:10px; font-size:13px; color:#6b564d;">
                  <strong style="color:#163247;">${this.escapeHtml(item.label)}</strong>
                  <span>${this.escapeHtml(labelFormatter(item))}</span>
                </div>
                <div style="height:12px; background:rgba(47,111,159,.10); border-radius:999px; overflow:hidden;">
                  <div style="height:100%; width:${width}%; background:linear-gradient(90deg,#2f6f9f,#9fc7e3);"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    renderEmptyCard(title, description, tag) {
      return `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(title)}</strong>
            <p>${this.escapeHtml(description)}</p>
          </div>
          <span class="tag">${this.escapeHtml(tag)}</span>
        </div>
      `;
    },

    getPeriodLabel() {
      const start = this.filters.startDate ? this.formatDate(this.filters.startDate) : 'início';
      const end = this.filters.endDate ? this.formatDate(this.filters.endDate) : 'hoje';
      return `${start} até ${end}`;
    },

    exportAsCsv() {
      const sales = this.filterSales().filter((sale) => sale.orderStatus !== 'Cancelado');
      const expenses = this.filterExpenses().filter((expense) => expense.status !== 'Cancelado');

      const lines = [
        ['Tipo', 'Data', 'Descrição', 'Categoria/Pagamento', 'Valor']
      ];

      sales.forEach((sale) => {
        lines.push([
          'Venda',
          sale.date || '',
          sale.orderNumber || '',
          sale.paymentMethod || '',
          this.toNumber(sale.total || 0)
        ]);
      });

      expenses.forEach((expense) => {
        lines.push([
          'Despesa',
          expense.date || '',
          expense.description || '',
          expense.category || '',
          this.toNumber(expense.value || 0)
        ]);
      });

      const csv = lines
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `relatorio_husky_${this.todayISO()}.csv`;
      link.click();

      URL.revokeObjectURL(url);
      this.showToast('Relatório exportado em CSV.', 'success');
    },

    exportAsPrint() {
      this.showToast('Preparando versão para impressão.', 'success');
      window.print();
    },

    setText(element, value) {
      if (element) element.textContent = value;
    },

    findProductById(id) {
      if (!id) return null;
      return this.getProducts().find((product) => product.id === id) || null;
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

  document.addEventListener('DOMContentLoaded', () => REPORTS_PAGE.init());
  window.HuskyReports = REPORTS_PAGE;
})();
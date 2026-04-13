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
      this.setDefaultFilters();
      this.renderAll();
      app.log('Tela de relatórios carregada.');
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
    },

    getState() {
      return app.getAppState();
    },

    getSales() {
      return this.getState().sales || [];
    },

    getExpenses() {
      return this.getState().expenses || [];
    },

    getProducts() {
      return this.getState().products || [];
    },

    getStockMovements() {
      return this.getState().stockMovements || [];
    },

    setDefaultFilters() {
      const today = app.todayISO();
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
      this.refs.reportStartDate.value = this.filters.startDate || '';
      this.refs.reportEndDate.value = this.filters.endDate || '';
      this.refs.reportType.value = this.filters.reportType || 'geral';
      this.refs.reportPeriodPreset.value = this.filters.periodPreset || '';
      this.refs.reportPaymentFilter.value = this.filters.paymentMethod || '';
      this.refs.reportCategoryFilter.value = this.filters.category || '';
    },

    captureFilters() {
      this.filters.startDate = this.refs.reportStartDate.value;
      this.filters.endDate = this.refs.reportEndDate.value;
      this.filters.reportType = this.refs.reportType.value || 'geral';
      this.filters.periodPreset = this.refs.reportPeriodPreset.value || '';
      this.filters.paymentMethod = this.refs.reportPaymentFilter.value || '';
      this.filters.category = this.refs.reportCategoryFilter.value || '';
    },

    applyPreset() {
      const preset = this.refs.reportPeriodPreset.value;
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
        this.refs.reportStartDate.value = start;
        this.refs.reportEndDate.value = end;
      }

      this.captureFilters();
    },

    resetFilters() {
      this.setDefaultFilters();
      this.renderAll();
      app.showToast('Filtros de relatório redefinidos.', 'success');
    },

    generateReport() {
      this.captureFilters();
      if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
        app.showToast('A data inicial não pode ser maior que a data final.', 'warning');
        return;
      }

      this.renderAll();
      app.showToast('Relatório atualizado com sucesso.', 'success');
      app.log('Relatório gerado.', { ...this.filters });
    },

    filterSales() {
      return this.getSales().filter((sale) => {
        const inRange = this.matchesDateRange(sale.date);
        const paymentOk = !this.filters.paymentMethod || sale.paymentMethod === this.filters.paymentMethod;
        const categoryOk = !this.filters.category || (sale.items || []).some((item) => this.findProductById(item.productId)?.category === this.filters.category);

        if (!inRange || !paymentOk || !categoryOk) return false;

        if (this.filters.reportType === 'vendas') return true;
        if (this.filters.reportType === 'geral') return true;
        if (this.filters.reportType === 'mensal') return true;
        if (this.filters.reportType === 'clientes') return true;
        if (this.filters.reportType === 'produtos') return true;
        return true;
      });
    },

    filterExpenses() {
      return this.getExpenses().filter((expense) => {
        const inRange = this.matchesDateRange(expense.date);
        const paymentOk = !this.filters.paymentMethod || expense.paymentMethod === this.filters.paymentMethod;
        const categoryOk = !this.filters.category || expense.category === this.filters.category;

        if (!inRange || !paymentOk || !categoryOk) return false;

        if (this.filters.reportType === 'despesas') return true;
        if (this.filters.reportType === 'geral') return true;
        if (this.filters.reportType === 'mensal') return true;
        return true;
      });
    },

    filterMovements() {
      return this.getStockMovements().filter((movement) => {
        const inRange = this.matchesDateRange(movement.date);
        const categoryOk = !this.filters.category || this.findProductById(movement.productId)?.category === this.filters.category;

        if (!inRange || !categoryOk) return false;

        if (this.filters.reportType === 'estoque') return true;
        if (this.filters.reportType === 'geral') return true;
        if (this.filters.reportType === 'mensal') return true;
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

      const totalSales = app.sum(validSales, (sale) => sale.total || 0);
      const totalCosts = app.sum(validSales, (sale) => sale.cost || 0);
      const totalExpenses = app.sum(validExpenses.filter((expense) => expense.affectsProfit !== false), (expense) => expense.value || 0);
      const profit = totalSales - totalCosts - totalExpenses;
      const ordersCount = validSales.length;
      const averageTicket = ordersCount ? totalSales / ordersCount : 0;
      const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      const lossesTotal = app.sum(validExpenses.filter((expense) => expense.category === 'Perda de material'), (expense) => expense.value || 0);

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
        if (!bucket.has(key)) bucket.set(key, { label: key, sales: 0, expenses: 0, profit: 0 });
        const entry = bucket.get(key);
        entry.sales += app.toNumber(sale.total || 0);
        entry.profit += app.toNumber(sale.profit || 0);
      });

      expenses.forEach((expense) => {
        const key = (expense.date || '').slice(0, 7);
        if (!key) return;
        if (!bucket.has(key)) bucket.set(key, { label: key, sales: 0, expenses: 0, profit: 0 });
        const entry = bucket.get(key);
        entry.expenses += app.toNumber(expense.value || 0);
        entry.profit -= app.toNumber(expense.value || 0);
      });

      return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
    },

    buildDailyBuckets(sales, expenses) {
      const bucket = new Map();

      sales.forEach((sale) => {
        const key = sale.date;
        if (!key) return;
        if (!bucket.has(key)) bucket.set(key, { label: app.formatDate(key), date: key, input: 0, output: 0 });
        bucket.get(key).input += app.toNumber(sale.total || 0);
      });

      expenses.forEach((expense) => {
        const key = expense.date;
        if (!key) return;
        if (!bucket.has(key)) bucket.set(key, { label: app.formatDate(key), date: key, input: 0, output: 0 });
        bucket.get(key).output += app.toNumber(expense.value || 0);
      });

      return [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
    },

    buildPaymentBuckets(sales) {
      const bucket = new Map();
      sales.forEach((sale) => {
        const key = sale.paymentMethod || 'Não informado';
        bucket.set(key, (bucket.get(key) || 0) + app.toNumber(sale.total || 0));
      });

      return [...bucket.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    },

    buildTopProducts(sales) {
      const bucket = new Map();
      sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const current = bucket.get(item.productId) || {
            productId: item.productId,
            name: item.productName || 'Produto',
            quantity: 0,
            revenue: 0
          };
          current.quantity += app.toNumber(item.quantity || 0);
          current.revenue += app.toNumber(item.total || 0);
          bucket.set(item.productId, current);
        });
      });

      return [...bucket.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6);
    },

    buildTopExpenseCategories(expenses) {
      const bucket = new Map();
      expenses.forEach((expense) => {
        const key = expense.category || 'Outros';
        bucket.set(key, (bucket.get(key) || 0) + app.toNumber(expense.value || 0));
      });

      return [...bucket.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
    },

    buildBestMarginProducts(sales) {
      const bucket = new Map();
      sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const current = bucket.get(item.productId) || {
            productId: item.productId,
            name: item.productName || 'Produto',
            revenue: 0,
            cost: 0,
            quantity: 0
          };
          current.revenue += app.toNumber(item.total || 0);
          current.cost += app.toNumber(item.unitCost || 0) * app.toNumber(item.quantity || 0);
          current.quantity += app.toNumber(item.quantity || 0);
          bucket.set(item.productId, current);
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
      this.refs.reportTotalSales.textContent = app.formatCurrency(analytics.totalSales);
      this.refs.reportTotalCosts.textContent = app.formatCurrency(analytics.totalCosts);
      this.refs.reportTotalExpenses.textContent = app.formatCurrency(analytics.totalExpenses);
      this.refs.reportTotalProfit.textContent = app.formatCurrency(analytics.profit);
      this.refs.reportAverageTicket.textContent = app.formatCurrency(analytics.averageTicket);
      this.refs.reportOrdersCount.textContent = String(analytics.ordersCount);
      this.refs.reportProfitMargin.textContent = `${app.formatNumber(analytics.profitMargin, 1)}%`;
      this.refs.reportLossesTotal.textContent = app.formatCurrency(analytics.lossesTotal);
    },

    renderStatus(analytics, sales, movements) {
      const activeSales = sales.filter((sale) => sale.orderStatus !== 'Cancelado');
      const finishedOrders = activeSales.filter((sale) => sale.orderStatus === 'Finalizado').length;
      const pendingOrders = activeSales.filter((sale) => sale.orderStatus !== 'Finalizado').length;
      const pixWithProof = activeSales.filter((sale) => sale.paymentMethod === 'Pix' && sale.pixProof?.name).length;
      const products = this.getProducts();
      const criticalStock = products.filter((product) => app.toNumber(product.stock || 0) <= app.toNumber(product.minStock || 0)).length;
      const lowStock = products.filter((product) => app.toNumber(product.stock || 0) > 0 && app.toNumber(product.stock || 0) <= app.toNumber(product.minStock || 0)).length;
      const zeroStock = products.filter((product) => app.toNumber(product.stock || 0) <= 0).length;
      const stockLosses = app.sum(movements.filter((movement) => movement.type === 'perda'), (movement) => movement.totalCost || 0);

      this.refs.reportFinishedOrders.textContent = String(finishedOrders);
      this.refs.reportPendingOrders.textContent = String(pendingOrders);
      this.refs.reportPixWithProof.textContent = String(pixWithProof);
      this.refs.reportCriticalStock.textContent = String(criticalStock);
      this.refs.reportStockMovements.textContent = String(movements.length);
      this.refs.reportLowStock.textContent = String(lowStock);
      this.refs.reportZeroStock.textContent = String(zeroStock);
      this.refs.reportStockLosses.textContent = app.formatCurrency(stockLosses);
    },

    renderMonthlyChart(data) {
      this.refs.monthlyReportChart.innerHTML = this.renderBarChart(
        data.map((item) => ({ label: item.label, value: item.sales, secondary: item.expenses, tertiary: item.profit })),
        'Vendas / Despesas / Lucro'
      );
    },

    renderFinancialFlowChart(data) {
      this.refs.financialFlowChart.innerHTML = this.renderBarChart(
        data.map((item) => ({ label: item.label, value: item.input, secondary: item.output, tertiary: item.input - item.output })),
        'Entradas / Saídas / Saldo'
      );
    },

    renderPaymentMethodChart(data) {
      this.refs.paymentMethodChart.innerHTML = this.renderSimpleListChart(
        data,
        (item) => `${item.label} • ${app.formatCurrency(item.value)}`,
        (item) => item.value
      );
    },

    renderTopProducts(data) {
      if (!data.length) {
        this.refs.topProductsReport.innerHTML = this.renderEmptyCard('Sem dados ainda', 'Os produtos mais vendidos aparecerão aqui.', '0');
        return;
      }

      this.refs.topProductsReport.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.name)}</strong>
            <p>${app.formatNumber(item.quantity)} vendidos • ${app.formatCurrency(item.revenue)}</p>
          </div>
          <span class="tag">${app.formatNumber(item.quantity)}</span>
        </div>
      `).join('');
    },

    renderTopExpenseCategories(data) {
      if (!data.length) {
        this.refs.topExpenseCategories.innerHTML = this.renderEmptyCard('Sem dados ainda', 'As categorias de despesa aparecerão aqui.', 'R$ 0,00');
        return;
      }

      this.refs.topExpenseCategories.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.label)}</strong>
            <p>Impacto total no período</p>
          </div>
          <span class="tag">${app.formatCurrency(item.value)}</span>
        </div>
      `).join('');
    },

    renderBestMarginProducts(data) {
      if (!data.length) {
        this.refs.bestMarginProducts.innerHTML = this.renderEmptyCard('Sem dados ainda', 'Os produtos mais rentáveis aparecerão aqui.', '0%');
        return;
      }

      this.refs.bestMarginProducts.innerHTML = data.map((item) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(item.name)}</strong>
            <p>Receita ${app.formatCurrency(item.revenue)} • Custo ${app.formatCurrency(item.cost)}</p>
          </div>
          <span class="tag">${app.formatNumber(item.margin, 1)}%</span>
        </div>
      `).join('');
    },

    renderAnalyticsTable(analytics) {
      this.refs.reportTableBody.innerHTML = `
        <tr>
          <td>${this.getPeriodLabel()}</td>
          <td>${app.formatCurrency(analytics.totalSales)}</td>
          <td>${app.formatCurrency(analytics.totalCosts)}</td>
          <td>${app.formatCurrency(analytics.totalExpenses)}</td>
          <td>${app.formatCurrency(analytics.profit)}</td>
          <td>${app.formatNumber(analytics.profitMargin, 1)}%</td>
        </tr>
      `;
    },

    renderSalesTable(sales) {
      const validSales = sales.filter((sale) => sale.orderStatus !== 'Cancelado').slice(0, 12);
      if (!validSales.length) {
        this.refs.reportSalesTableBody.innerHTML = '<tr><td colspan="4">Nenhuma venda encontrada no período.</td></tr>';
        return;
      }

      this.refs.reportSalesTableBody.innerHTML = validSales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${this.escapeHtml(sale.paymentMethod || '-')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
        </tr>
      `).join('');
    },

    renderExpensesTable(expenses) {
      const validExpenses = expenses.filter((expense) => expense.status !== 'Cancelado').slice(0, 12);
      if (!validExpenses.length) {
        this.refs.reportExpensesTableBody.innerHTML = '<tr><td colspan="4">Nenhuma despesa encontrada no período.</td></tr>';
        return;
      }

      this.refs.reportExpensesTableBody.innerHTML = validExpenses.map((expense) => `
        <tr>
          <td>${app.formatDate(expense.date)}</td>
          <td>${this.escapeHtml(expense.category || '-')}</td>
          <td>${this.escapeHtml(expense.description || '-')}</td>
          <td>${app.formatCurrency(expense.value || 0)}</td>
        </tr>
      `).join('');
    },

    renderBarChart(data, legendText = '') {
      if (!data.length) {
        return '<p>Não há dados suficientes para exibir o gráfico.</p>';
      }

      const maxValue = Math.max(
        1,
        ...data.flatMap((item) => [item.value || 0, item.secondary || 0, item.tertiary || 0].filter((value) => Number.isFinite(value)))
      );

      return `
        <div style="display:grid; gap:14px; width:100%;">
          <div style="font-size:12px; color:#8d786f; font-weight:700; text-transform:uppercase; letter-spacing:.04em;">${legendText}</div>
          ${data.map((item) => {
            const valueWidth = Math.max(4, ((item.value || 0) / maxValue) * 100);
            const secondaryWidth = Math.max(4, ((item.secondary || 0) / maxValue) * 100);
            const tertiaryWidth = Math.max(4, (Math.abs(item.tertiary || 0) / maxValue) * 100);
            return `
              <div style="display:grid; gap:8px;">
                <div style="display:flex; justify-content:space-between; gap:10px; font-size:13px; color:#6b564d;">
                  <strong style="color:#2f211b;">${this.escapeHtml(item.label)}</strong>
                  <span>V ${app.formatCurrency(item.value || 0)} • D ${app.formatCurrency(item.secondary || 0)} • L ${app.formatCurrency(item.tertiary || 0)}</span>
                </div>
                <div style="display:grid; gap:6px;">
                  <div style="height:10px; background:rgba(143,95,67,.12); border-radius:999px; overflow:hidden;"><div style="height:100%; width:${valueWidth}%; background:linear-gradient(90deg,#8f5f43,#d9b08c);"></div></div>
                  <div style="height:10px; background:rgba(106,86,77,.08); border-radius:999px; overflow:hidden;"><div style="height:100%; width:${secondaryWidth}%; background:linear-gradient(90deg,#c9804a,#ead4c2);"></div></div>
                  <div style="height:10px; background:rgba(47,139,87,.08); border-radius:999px; overflow:hidden;"><div style="height:100%; width:${tertiaryWidth}%; background:linear-gradient(90deg,#2f8b57,#9fd0af);"></div></div>
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
                  <strong style="color:#2f211b;">${this.escapeHtml(item.label)}</strong>
                  <span>${this.escapeHtml(labelFormatter(item))}</span>
                </div>
                <div style="height:12px; background:rgba(143,95,67,.1); border-radius:999px; overflow:hidden;">
                  <div style="height:100%; width:${width}%; background:linear-gradient(90deg,#8f5f43,#d9b08c);"></div>
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
      const start = this.filters.startDate ? app.formatDate(this.filters.startDate) : 'início';
      const end = this.filters.endDate ? app.formatDate(this.filters.endDate) : 'hoje';
      return `${start} até ${end}`;
    },

    exportAsCsv() {
      const sales = this.filterSales().filter((sale) => sale.orderStatus !== 'Cancelado');
      const expenses = this.filterExpenses().filter((expense) => expense.status !== 'Cancelado');

      const lines = [
        ['Tipo', 'Data', 'Descrição', 'Categoria/Pagamento', 'Valor']
      ];

      sales.forEach((sale) => {
        lines.push(['Venda', sale.date || '', sale.orderNumber || '', sale.paymentMethod || '', app.toNumber(sale.total || 0)]);
      });

      expenses.forEach((expense) => {
        lines.push(['Despesa', expense.date || '', expense.description || '', expense.category || '', app.toNumber(expense.value || 0)]);
      });

      const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_husky_${app.todayISO()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      app.showToast('Relatório exportado em CSV.', 'success');
    },

    exportAsPrint() {
      app.showToast('Preparando versão para impressão.', 'success');
      window.print();
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

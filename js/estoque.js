(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Estoque] HuskyApp não encontrado. Verifique se app.js foi carregado antes de estoque.js.');
    return;
  }

  const STOCK_PAGE = {
    refs: {},
    filters: {
      statusSearch: '',
      statusCategory: '',
      statusType: '',
      historyStart: '',
      historyEnd: '',
      historyType: '',
      historyProduct: ''
    },
    editingMovementId: null,

    init() {
      if (!document.getElementById('stock-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.prepareInitialState();
      this.renderAll();
      this.log('Tela de estoque carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('stock-form'),
        stockMovementId: document.getElementById('stock-movement-id'),
        stockDate: document.getElementById('stock-date'),
        stockTime: document.getElementById('stock-time'),
        stockType: document.getElementById('stock-type'),
        stockProduct: document.getElementById('stock-product'),
        stockQuantity: document.getElementById('stock-quantity'),
        stockUnitCost: document.getElementById('stock-unit-cost'),
        stockTotalCost: document.getElementById('stock-total-cost'),
        stockReference: document.getElementById('stock-reference'),
        stockOrigin: document.getElementById('stock-origin'),
        stockResponsible: document.getElementById('stock-responsible'),
        stockReason: document.getElementById('stock-reason'),
        stockGenerateExpense: document.getElementById('stock-generate-expense'),
        stockAlertManagement: document.getElementById('stock-alert-management'),

        stockModeTag: document.getElementById('stock-mode-tag'),
        btnSaveStockMovement: document.getElementById('btn-save-stock-movement'),
        btnEditStockMovement: document.getElementById('btn-edit-stock-movement'),
        btnDeleteStockMovement: document.getElementById('btn-delete-stock-movement'),
        btnNewStockMovementTop: document.getElementById('btn-new-stock-movement-top'),
        btnNewStockMovementHero: document.getElementById('btn-new-stock-movement-hero'),

        stockProductsCount: document.getElementById('stock-products-count'),
        stockLowCount: document.getElementById('stock-low-count'),
        stockZeroCount: document.getElementById('stock-zero-count'),
        stockLossValue: document.getElementById('stock-loss-value'),

        stockSummaryProduct: document.getElementById('stock-summary-product'),
        stockSummaryCurrent: document.getElementById('stock-summary-current'),
        stockSummaryType: document.getElementById('stock-summary-type'),
        stockSummaryAfter: document.getElementById('stock-summary-after'),
        stockSummaryCost: document.getElementById('stock-summary-cost'),

        stockStatusSummary: document.getElementById('stock-status-summary'),
        stockMinSummary: document.getElementById('stock-min-summary'),
        stockLastMovementSummary: document.getElementById('stock-last-movement-summary'),
        stockReplenishmentSummary: document.getElementById('stock-replenishment-summary'),

        stockAlertList: document.getElementById('stock-alert-list'),

        stockSearch: document.getElementById('stock-search'),
        stockFilterCategory: document.getElementById('stock-filter-category'),
        stockFilterStatus: document.getElementById('stock-filter-status'),
        btnFilterStockStatus: document.getElementById('btn-filter-stock-status'),
        btnClearStockStatusFilter: document.getElementById('btn-clear-stock-status-filter'),
        stockStatusTableBody: document.getElementById('stock-status-table-body'),

        stockHistoryStart: document.getElementById('stock-history-start'),
        stockHistoryEnd: document.getElementById('stock-history-end'),
        stockHistoryType: document.getElementById('stock-history-type'),
        stockHistoryProduct: document.getElementById('stock-history-product'),
        btnFilterStockHistory: document.getElementById('btn-filter-stock-history'),
        btnClearStockHistoryFilter: document.getElementById('btn-clear-stock-history-filter'),
        stockHistoryTableBody: document.getElementById('stock-history-table-body'),

        restockTableBody: document.getElementById('restock-table-body'),
        recentLossTableBody: document.getElementById('recent-loss-table-body')
      };
    },

    bindEvents() {
      this.refs.btnSaveStockMovement?.addEventListener('click', () => this.handleSaveMovement());
      this.refs.btnEditStockMovement?.addEventListener('click', () => this.handleSaveMovement(true));
      this.refs.btnDeleteStockMovement?.addEventListener('click', () => this.handleDeleteMovement());
      this.refs.btnNewStockMovementTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewStockMovementHero?.addEventListener('click', () => this.resetForm());

      [
        this.refs.stockType,
        this.refs.stockProduct,
        this.refs.stockQuantity,
        this.refs.stockUnitCost,
        this.refs.stockReference,
        this.refs.stockOrigin,
        this.refs.stockResponsible,
        this.refs.stockReason,
        this.refs.stockGenerateExpense
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.btnFilterStockStatus?.addEventListener('click', () => this.applyStatusFilters());
      this.refs.btnClearStockStatusFilter?.addEventListener('click', () => this.clearStatusFilters());
      this.refs.btnFilterStockHistory?.addEventListener('click', () => this.applyHistoryFilters());
      this.refs.btnClearStockHistoryFilter?.addEventListener('click', () => this.clearHistoryFilters());

      this.refs.stockStatusTableBody?.addEventListener('click', (event) => this.handleStatusTableActions(event));
      this.refs.stockHistoryTableBody?.addEventListener('click', (event) => this.handleHistoryTableActions(event));

      window.addEventListener('husky:state-changed', () => {
        this.populateProductSelects();
        this.populateCategoryFilter();
        this.renderAll();
      });

      window.addEventListener('storage', () => {
        this.populateProductSelects();
        this.populateCategoryFilter();
        this.renderAll();
      });
    },

    prepareInitialState() {
      const state = this.getState();

      if (!Array.isArray(state.products)) state.products = [];
      if (!Array.isArray(state.stockMovements)) state.stockMovements = [];
      if (!Array.isArray(state.expenses)) state.expenses = [];

      this.setState(state);
      this.populateProductSelects();
      this.populateCategoryFilter();
      this.resetForm(true);
      this.renderAll();
    },

    getState() {
      return typeof app.getAppState === 'function' ? app.getAppState() : {};
    },

    setState(nextState) {
      if (typeof app.setAppState === 'function') {
        app.setAppState(nextState);
      }
      return nextState;
    },

    getProducts() {
      return Array.isArray(this.getState().products) ? this.getState().products : [];
    },

    getMovements() {
      return Array.isArray(this.getState().stockMovements) ? this.getState().stockMovements : [];
    },

    getExpenses() {
      return Array.isArray(this.getState().expenses) ? this.getState().expenses : [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    uuid() {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

    includesText(haystack, needle) {
      if (typeof app.includesText === 'function') return app.includesText(haystack, needle);
      return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
    },

    upsertItem(list, item, key = 'id') {
      if (typeof app.upsertItem === 'function') return app.upsertItem(list, item, key);
      const array = Array.isArray(list) ? [...list] : [];
      const index = array.findIndex((entry) => entry?.[key] === item?.[key]);
      if (index >= 0) array[index] = item;
      else array.unshift(item);
      return array;
    },

    removeById(list, id) {
      if (typeof app.removeById === 'function') return app.removeById(list, id);
      return (Array.isArray(list) ? list : []).filter((entry) => entry.id !== id);
    },

    sum(list = [], mapper = (item) => item) {
      if (typeof app.sum === 'function') return app.sum(list, mapper);
      return list.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);
    },

    confirmAction(message) {
      if (typeof app.confirmAction === 'function') return app.confirmAction(message);
      return window.confirm(message);
    },

    showToast(message, type = 'info') {
      if (typeof app.showToast === 'function') app.showToast(message, type);
      else window.alert(message);
    },

    log(message, payload = null) {
      if (typeof app.log === 'function') app.log(message, payload);
      else console.log(message, payload || '');
    },

    todayISO() {
      if (typeof app.todayISO === 'function') return app.todayISO();
      return new Date().toISOString().slice(0, 10);
    },

    currentTimeHHMM() {
      if (typeof app.currentTimeHHMM === 'function') return app.currentTimeHHMM();
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    },

    resetForm(skipScroll = false) {
      this.editingMovementId = null;
      if (this.refs.form) this.refs.form.reset();

      this.refs.stockMovementId.value = '';
      this.refs.stockDate.value = this.todayISO();
      this.refs.stockTime.value = this.currentTimeHHMM();
      this.refs.stockType.value = 'entrada';
      this.refs.stockProduct.value = '';
      this.refs.stockQuantity.value = '';
      this.refs.stockUnitCost.value = '';
      this.refs.stockTotalCost.value = '';
      this.refs.stockReference.value = '';
      this.refs.stockOrigin.value = '';
      this.refs.stockResponsible.value = this.getCurrentUser().name || 'Administrador';
      this.refs.stockReason.value = '';
      this.refs.stockGenerateExpense.checked = false;
      this.refs.stockAlertManagement.checked = true;

      this.updateModeTag('Nova movimentação');
      this.updateLiveSummary();

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    updateModeTag(label) {
      if (this.refs.stockModeTag) this.refs.stockModeTag.textContent = label;
    },

    populateProductSelects() {
      const products = [...this.getProducts()].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
      const options = products
        .map((product) => `<option value="${product.id}">${this.escapeHtml(product.name)} • ${this.escapeHtml(product.code || '-')}</option>`)
        .join('');

      if (this.refs.stockProduct) {
        this.refs.stockProduct.innerHTML = `<option value="">Selecione um produto</option>${options}`;
      }

      if (this.refs.stockHistoryProduct) {
        this.refs.stockHistoryProduct.innerHTML = `<option value="">Todos os produtos</option>${options}`;
      }
    },

    populateCategoryFilter() {
      if (!this.refs.stockFilterCategory) return;

      const categories = [...new Set(this.getProducts().map((product) => product.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

      const current = this.refs.stockFilterCategory.value;

      this.refs.stockFilterCategory.innerHTML = `
        <option value="">Todas as categorias</option>
        ${categories.map((category) => `<option value="${this.escapeHtml(category)}">${this.escapeHtml(category)}</option>`).join('')}
      `;

      if (categories.includes(current)) {
        this.refs.stockFilterCategory.value = current;
      }
    },

    validateForm() {
      const productId = this.refs.stockProduct.value;
      const type = this.refs.stockType.value;
      const quantity = this.toNumber(this.refs.stockQuantity.value || 0);
      const unitCost = this.toNumber(this.refs.stockUnitCost.value || 0);
      const product = this.findProductById(productId);

      if (!product) {
        this.showToast('Selecione um produto.', 'warning');
        this.refs.stockProduct.focus();
        return false;
      }

      if (!this.refs.stockDate.value) {
        this.showToast('Informe a data da movimentação.', 'warning');
        return false;
      }

      if (quantity <= 0) {
        this.showToast('Informe uma quantidade válida.', 'warning');
        this.refs.stockQuantity.focus();
        return false;
      }

      if (unitCost < 0) {
        this.showToast('Informe um custo unitário válido.', 'warning');
        this.refs.stockUnitCost.focus();
        return false;
      }

      const previousMovement = this.findEditableMovementById(this.editingMovementId);
      const projectedStock = this.calculateProjectedStock(product, type, quantity, previousMovement);

      if (projectedStock < 0) {
        this.showToast(`Estoque insuficiente para ${product.name}.`, 'danger');
        return false;
      }

      return true;
    },

    calculateProjectedStock(product, type, quantity, previousMovement = null) {
      let currentStock = this.toNumber(product.stock || 0);

      if (previousMovement) {
        currentStock = this.revertStockValue(currentStock, previousMovement.type, previousMovement.quantity);
      }

      return this.applyStockValue(currentStock, type, quantity);
    },

    applyStockValue(currentStock, type, quantity) {
      const qty = this.toNumber(quantity || 0);

      if (type === 'entrada' || type === 'producao') return currentStock + qty;
      if (type === 'saida' || type === 'perda') return currentStock - qty;
      if (type === 'ajuste') return qty;

      return currentStock;
    },

    revertStockValue(currentStock, type, quantity) {
      const qty = this.toNumber(quantity || 0);

      if (type === 'entrada' || type === 'producao') return currentStock - qty;
      if (type === 'saida' || type === 'perda') return currentStock + qty;
      if (type === 'ajuste') return currentStock;

      return currentStock;
    },

    buildMovementPayload() {
      const previous = this.findEditableMovementById(this.editingMovementId);
      const product = this.findProductById(this.refs.stockProduct.value);
      const quantity = this.toNumber(this.refs.stockQuantity.value || 0);
      const unitCost = this.toNumber(this.refs.stockUnitCost.value || 0);
      const totalCost = quantity * unitCost;
      const now = new Date().toISOString();

      return {
        id: previous?.id || this.refs.stockMovementId.value || this.uuid(),
        relatedSaleId: null,
        relatedOrderNumber: null,
        type: this.refs.stockType.value,
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost,
        totalCost,
        date: this.refs.stockDate.value,
        time: this.refs.stockTime.value || this.currentTimeHHMM(),
        reason: this.refs.stockReason.value.trim(),
        reference: this.refs.stockReference.value.trim() || this.getReferenceByType(this.refs.stockType.value),
        origin: this.refs.stockOrigin.value.trim(),
        responsible: this.refs.stockResponsible.value.trim() || this.getCurrentUser().name || 'Administrador',
        generateExpense: Boolean(this.refs.stockGenerateExpense.checked),
        alertManagement: Boolean(this.refs.stockAlertManagement.checked),
        createdAt: previous?.createdAt || now,
        updatedAt: now,
        createdBy: previous?.createdBy || this.getCurrentUser().email || 'admin@husky.com',
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    handleSaveMovement(isUpdate = false) {
      try {
        if (!this.validateForm()) return;

        const movement = this.buildMovementPayload();
        const previousMovement = this.findEditableMovementById(movement.id);
        const state = this.applyMovementToState(movement, previousMovement);

        this.setState(state);
        this.populateProductSelects();
        this.populateCategoryFilter();
        this.renderAll();

        this.showToast(
          isUpdate || previousMovement
            ? 'Movimentação atualizada com sucesso.'
            : 'Movimentação salva com sucesso.',
          'success'
        );

        this.log('Movimentação de estoque salva/atualizada.', {
          movementId: movement.id,
          productId: movement.productId,
          type: movement.type
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Estoque] erro ao salvar movimentação', error);
        this.showToast('Não foi possível salvar a movimentação.', 'danger');
      }
    },

    handleDeleteMovement() {
      try {
        const movement = this.findEditableMovementById(this.editingMovementId || this.refs.stockMovementId.value);

        if (!movement) {
          this.showToast('Selecione uma movimentação manual para excluir.', 'warning');
          return;
        }

        const confirmed = this.confirmAction(`Deseja excluir a movimentação de ${movement.productName}?`);
        if (!confirmed) return;

        const state = this.getState();
        const products = [...(state.products || [])];
        const product = products.find((entry) => entry.id === movement.productId);

        if (product) {
          product.stock = this.revertStockValue(this.toNumber(product.stock || 0), movement.type, movement.quantity);
          product.stock = Math.max(0, product.stock);
        }

        state.products = products;
        state.stockMovements = (state.stockMovements || []).filter((entry) => entry.id !== movement.id);
        state.expenses = (state.expenses || []).filter((expense) => expense.relatedMovementId !== movement.id);

        this.setState(state);
        this.populateProductSelects();
        this.populateCategoryFilter();
        this.renderAll();

        this.showToast('Movimentação excluída com sucesso.', 'success');
        this.log('Movimentação de estoque excluída.', {
          movementId: movement.id,
          productId: movement.productId
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Estoque] erro ao excluir movimentação', error);
        this.showToast('Não foi possível excluir a movimentação.', 'danger');
      }
    },

    applyMovementToState(movement, previousMovement = null) {
      const state = this.getState();
      const products = [...(state.products || [])];
      const product = products.find((entry) => entry.id === movement.productId);

      if (!product) return state;

      if (previousMovement) {
        const previousProduct = products.find((entry) => entry.id === previousMovement.productId);
        if (previousProduct) {
          previousProduct.stock = this.revertStockValue(
            this.toNumber(previousProduct.stock || 0),
            previousMovement.type,
            previousMovement.quantity
          );
          previousProduct.stock = Math.max(0, previousProduct.stock);
        }
      }

      product.stock = this.applyStockValue(this.toNumber(product.stock || 0), movement.type, movement.quantity);
      product.stock = Math.max(0, product.stock);

      state.products = products;
      state.stockMovements = this.upsertItem(state.stockMovements || [], movement, 'id');
      state.expenses = (state.expenses || []).filter((expense) => expense.relatedMovementId !== movement.id);

      if (movement.generateExpense && (movement.type === 'entrada' || movement.type === 'perda') && movement.totalCost > 0) {
        state.expenses.unshift(this.buildExpenseFromMovement(movement));
      }

      return state;
    },

    buildExpenseFromMovement(movement) {
      const category = movement.type === 'perda' ? 'Perda de material' : 'Compras';

      return {
        id: this.uuid(),
        relatedMovementId: movement.id,
        date: movement.date,
        time: movement.time,
        status: 'Pago',
        description: `${category} • ${movement.productName}`,
        category,
        value: movement.totalCost,
        paymentMethod: 'Pix',
        dueDate: movement.date,
        installments: 1,
        supplier: movement.origin || movement.reference || 'Estoque',
        reference: movement.reference || this.getReferenceByType(movement.type),
        note: movement.reason || `Gerado automaticamente pela movimentação ${movement.id}`,
        attachment: null,
        relatedProductId: movement.productId,
        affectsProfit: true,
        recurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    },

    updateLiveSummary() {
      const product = this.findProductById(this.refs.stockProduct.value);
      const type = this.refs.stockType.value;
      const quantity = this.toNumber(this.refs.stockQuantity.value || 0);
      const unitCost = this.toNumber(this.refs.stockUnitCost.value || 0);
      const totalCost = quantity * unitCost;
      const previousMovement = this.findEditableMovementById(this.editingMovementId);
      const currentStock = product ? this.calculateCurrentEditableStock(product, previousMovement) : 0;
      const afterStock = product ? this.applyStockValue(currentStock, type, quantity) : 0;
      const lastMovement = product ? this.getLastMovementByProduct(product.id) : null;
      const minStock = this.toNumber(product?.minStock || 0);

      if (this.refs.stockTotalCost) {
        this.refs.stockTotalCost.value = totalCost ? String(totalCost) : '';
      }

      this.refs.stockSummaryProduct.textContent = product?.name || '-';
      this.refs.stockSummaryCurrent.textContent = this.formatNumber(currentStock);
      this.refs.stockSummaryType.textContent = this.getTypeLabel(type);
      this.refs.stockSummaryAfter.textContent = this.formatNumber(Math.max(0, afterStock));
      this.refs.stockSummaryCost.textContent = this.formatCurrency(totalCost);

      this.refs.stockStatusSummary.textContent = product ? this.getProductStockStatus(product, currentStock) : 'Normal';
      this.refs.stockMinSummary.textContent = this.formatNumber(minStock);
      this.refs.stockLastMovementSummary.textContent = lastMovement ? `${this.getTypeLabel(lastMovement.type)} • ${this.formatDate(lastMovement.date)}` : '-';
      this.refs.stockReplenishmentSummary.textContent = product && Math.max(0, afterStock) <= minStock ? 'Sim' : 'Não';
    },

    calculateCurrentEditableStock(product, previousMovement = null) {
      let currentStock = this.toNumber(product.stock || 0);

      if (previousMovement && previousMovement.productId === product.id) {
        currentStock = this.revertStockValue(currentStock, previousMovement.type, previousMovement.quantity);
      }

      return Math.max(0, currentStock);
    },

    getReferenceByType(type) {
      const map = {
        entrada: 'Compra',
        saida: 'Saída manual',
        perda: 'Perda',
        ajuste: 'Ajuste manual',
        producao: 'Produção'
      };
      return map[type] || 'Movimentação';
    },

    getTypeLabel(type) {
      const map = {
        entrada: 'Entrada',
        saida: 'Saída',
        perda: 'Perda',
        ajuste: 'Ajuste manual',
        producao: 'Produção'
      };
      return map[type] || type;
    },

    getProductStockStatus(product, stockOverride = null) {
      const stock = stockOverride === null ? this.toNumber(product.stock || 0) : this.toNumber(stockOverride || 0);
      const minStock = this.toNumber(product.minStock || 0);

      if (stock <= 0) return 'Sem estoque';
      if (stock <= minStock) return 'Baixo';
      return 'Normal';
    },

    renderAll() {
      this.populateProductSelects();
      this.populateCategoryFilter();
      this.renderMetrics();
      this.renderAlerts();
      this.renderStatusTable();
      this.renderHistoryTable();
      this.renderRestockTable();
      this.renderRecentLossesTable();
      this.updateLiveSummary();
    },

    renderMetrics() {
      const products = this.getProducts();
      const movements = this.getMovements();

      const lowStock = products.filter((product) => {
        const stock = this.toNumber(product.stock || 0);
        const minStock = this.toNumber(product.minStock || 0);
        return stock > 0 && stock <= minStock;
      });

      const zeroStock = products.filter((product) => this.toNumber(product.stock || 0) <= 0);

      const lossValue = this.sum(
        movements.filter((movement) => movement.type === 'perda'),
        (movement) => movement.totalCost || 0
      );

      this.refs.stockProductsCount.textContent = String(products.length);
      this.refs.stockLowCount.textContent = String(lowStock.length);
      this.refs.stockZeroCount.textContent = String(zeroStock.length);
      this.refs.stockLossValue.textContent = this.formatCurrency(lossValue);
    },

    renderAlerts() {
      if (!this.refs.stockAlertList) return;

      const critical = this.getProducts().filter((product) => {
        return this.toNumber(product.stock || 0) <= this.toNumber(product.minStock || 0);
      });

      if (!critical.length) {
        this.refs.stockAlertList.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Sem alertas críticos</strong>
              <p>Os itens aparecerão aqui quando houver necessidade.</p>
            </div>
            <span class="tag">OK</span>
          </div>
        `;
        return;
      }

      this.refs.stockAlertList.innerHTML = critical.slice(0, 6).map((product) => {
        const needed = Math.max(
          0,
          this.toNumber(product.minStock || 0) - this.toNumber(product.stock || 0)
        );

        return `
          <div class="pix-proof-card">
            <div>
              <strong>${this.escapeHtml(product.name)}</strong>
              <p>Atual: ${this.formatNumber(product.stock || 0)} • Mínimo: ${this.formatNumber(product.minStock || 0)} • Repor: ${this.formatNumber(needed)}</p>
            </div>
            <span class="tag">${this.getProductStockStatus(product)}</span>
          </div>
        `;
      }).join('');
    },

    applyStatusFilters() {
      this.filters.statusSearch = this.refs.stockSearch.value.trim();
      this.filters.statusCategory = this.refs.stockFilterCategory.value;
      this.filters.statusType = this.refs.stockFilterStatus.value;
      this.renderStatusTable();
    },

    clearStatusFilters() {
      this.filters.statusSearch = '';
      this.filters.statusCategory = '';
      this.filters.statusType = '';

      this.refs.stockSearch.value = '';
      this.refs.stockFilterCategory.value = '';
      this.refs.stockFilterStatus.value = '';

      this.renderStatusTable();
    },

    getFilteredProducts() {
      return this.getProducts()
        .filter((product) => {
          const haystack = [product.name, product.code, product.sku, product.category].join(' ');
          const matchesSearch = !this.filters.statusSearch || this.includesText(haystack, this.filters.statusSearch);
          const matchesCategory = !this.filters.statusCategory || product.category === this.filters.statusCategory;
          const matchesType = !this.filters.statusType || this.matchesStockType(product, this.filters.statusType);
          return matchesSearch && matchesCategory && matchesType;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    matchesStockType(product, type) {
      const stock = this.toNumber(product.stock || 0);
      const minStock = this.toNumber(product.minStock || 0);

      if (type === 'zero') return stock <= 0;
      if (type === 'low') return stock > 0 && stock <= minStock;
      if (type === 'ok') return stock > minStock;

      return true;
    },

    renderStatusTable() {
      const products = this.getFilteredProducts();

      if (!products.length) {
        this.refs.stockStatusTableBody.innerHTML = `
          <tr>
            <td colspan="8">Nenhum produto encontrado.</td>
          </tr>
        `;
        return;
      }

      this.refs.stockStatusTableBody.innerHTML = products.map((product) => {
        const lastMovement = this.getLastMovementByProduct(product.id);

        return `
          <tr>
            <td>${this.escapeHtml(product.name)}</td>
            <td>${this.escapeHtml(product.code || '-')}</td>
            <td>${this.escapeHtml(product.category || '-')}</td>
            <td>${this.formatNumber(product.stock || 0)}</td>
            <td>${this.formatNumber(product.minStock || 0)}</td>
            <td>${this.getProductStockStatus(product)}</td>
            <td>${lastMovement ? `${this.formatDate(lastMovement.date)} • ${this.getTypeLabel(lastMovement.type)}` : '-'}</td>
            <td>
              <div class="table-action-group">
                <button type="button" class="btn btn-secondary btn-small" data-action="move-product" data-id="${product.id}">Movimentar</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="view-product" data-id="${product.id}">Ver</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    applyHistoryFilters() {
      this.filters.historyStart = this.refs.stockHistoryStart.value;
      this.filters.historyEnd = this.refs.stockHistoryEnd.value;
      this.filters.historyType = this.refs.stockHistoryType.value;
      this.filters.historyProduct = this.refs.stockHistoryProduct.value;
      this.renderHistoryTable();
    },

    clearHistoryFilters() {
      this.filters.historyStart = '';
      this.filters.historyEnd = '';
      this.filters.historyType = '';
      this.filters.historyProduct = '';

      this.refs.stockHistoryStart.value = '';
      this.refs.stockHistoryEnd.value = '';
      this.refs.stockHistoryType.value = '';
      this.refs.stockHistoryProduct.value = '';

      this.renderHistoryTable();
    },

    getFilteredMovements() {
      return this.getMovements()
        .filter((movement) => {
          const matchesStart = !this.filters.historyStart || movement.date >= this.filters.historyStart;
          const matchesEnd = !this.filters.historyEnd || movement.date <= this.filters.historyEnd;
          const matchesType = !this.filters.historyType || movement.type === this.filters.historyType;
          const matchesProduct = !this.filters.historyProduct || movement.productId === this.filters.historyProduct;
          return matchesStart && matchesEnd && matchesType && matchesProduct;
        })
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    renderHistoryTable() {
      const movements = this.getFilteredMovements();

      if (!movements.length) {
        this.refs.stockHistoryTableBody.innerHTML = `
          <tr>
            <td colspan="9">Nenhuma movimentação encontrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.stockHistoryTableBody.innerHTML = movements.map((movement) => {
        const editable = !movement.relatedSaleId;

        return `
          <tr>
            <td>${this.formatDate(movement.date)}</td>
            <td>${this.escapeHtml(movement.time || '-')}</td>
            <td>${this.escapeHtml(movement.productName || '-')}</td>
            <td>${this.getTypeLabel(movement.type)}</td>
            <td>${this.formatNumber(movement.quantity || 0)}</td>
            <td>${this.formatCurrency(movement.totalCost || 0)}</td>
            <td>${this.escapeHtml(movement.reference || '-')}</td>
            <td>${this.escapeHtml(movement.responsible || '-')}</td>
            <td>
              <div class="table-action-group">
                ${editable
                  ? `<button type="button" class="btn btn-secondary btn-small" data-action="edit-movement" data-id="${movement.id}">Editar</button>`
                  : `<button type="button" class="btn btn-secondary btn-small" disabled>Automático</button>`}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderRestockTable() {
      const products = this.getProducts()
        .filter((product) => this.toNumber(product.stock || 0) <= this.toNumber(product.minStock || 0))
        .sort((a, b) => this.toNumber(a.stock || 0) - this.toNumber(b.stock || 0));

      if (!products.length) {
        this.refs.restockTableBody.innerHTML = `
          <tr>
            <td colspan="4">Nenhum item precisando de reposição.</td>
          </tr>
        `;
        return;
      }

      this.refs.restockTableBody.innerHTML = products.map((product) => {
        const current = this.toNumber(product.stock || 0);
        const minimum = this.toNumber(product.minStock || 0);
        const replenish = Math.max(0, minimum - current);

        return `
          <tr>
            <td>${this.escapeHtml(product.name)}</td>
            <td>${this.formatNumber(current)}</td>
            <td>${this.formatNumber(minimum)}</td>
            <td>${this.formatNumber(replenish)}</td>
          </tr>
        `;
      }).join('');
    },

    renderRecentLossesTable() {
      const losses = this.getMovements()
        .filter((movement) => movement.type === 'perda')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 10);

      if (!losses.length) {
        this.refs.recentLossTableBody.innerHTML = `
          <tr>
            <td colspan="4">Nenhuma perda recente registrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.recentLossTableBody.innerHTML = losses.map((movement) => `
        <tr>
          <td>${this.escapeHtml(movement.productName || '-')}</td>
          <td>${this.formatDate(movement.date)}</td>
          <td>${this.formatNumber(movement.quantity || 0)}</td>
          <td>${this.formatCurrency(movement.totalCost || 0)}</td>
        </tr>
      `).join('');
    },

    handleStatusTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const productId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'move-product') {
        this.refs.stockProduct.value = productId;
        this.updateLiveSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.refs.stockQuantity.focus();
      }

      if (action === 'view-product') {
        this.refs.stockProduct.value = productId;
        this.updateLiveSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    handleHistoryTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      if (button.dataset.action === 'edit-movement') {
        this.loadMovementIntoForm(button.dataset.id);
      }
    },

    loadMovementIntoForm(movementId) {
      const movement = this.findEditableMovementById(movementId);

      if (!movement) {
        this.showToast('Movimentação não encontrada ou não pode ser editada.', 'danger');
        return;
      }

      this.editingMovementId = movement.id;
      this.refs.stockMovementId.value = movement.id;
      this.refs.stockDate.value = movement.date || this.todayISO();
      this.refs.stockTime.value = movement.time || this.currentTimeHHMM();
      this.refs.stockType.value = movement.type || 'entrada';
      this.refs.stockProduct.value = movement.productId || '';
      this.refs.stockQuantity.value = movement.quantity || 0;
      this.refs.stockUnitCost.value = movement.unitCost || '';
      this.refs.stockTotalCost.value = movement.totalCost || '';
      this.refs.stockReference.value = movement.reference || '';
      this.refs.stockOrigin.value = movement.origin || '';
      this.refs.stockResponsible.value = movement.responsible || this.getCurrentUser().name || 'Administrador';
      this.refs.stockReason.value = movement.reason || '';
      this.refs.stockGenerateExpense.checked = Boolean(movement.generateExpense);
      this.refs.stockAlertManagement.checked = Boolean(movement.alertManagement ?? true);

      this.updateModeTag(`Editando ${movement.productName}`);
      this.updateLiveSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    getLastMovementByProduct(productId) {
      return this.getMovements()
        .filter((movement) => movement.productId === productId)
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())[0] || null;
    },

    findProductById(id) {
      if (!id) return null;
      return this.getProducts().find((product) => product.id === id) || null;
    },

    findEditableMovementById(id) {
      if (!id) return null;
      const movement = this.getMovements().find((entry) => entry.id === id) || null;
      if (!movement || movement.relatedSaleId) return null;
      return movement;
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

  document.addEventListener('DOMContentLoaded', () => STOCK_PAGE.init());
  window.HuskyStock = STOCK_PAGE;
})();
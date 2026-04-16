(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Vendas] HuskyApp não encontrado. Verifique se app.js foi carregado antes de vendas.js.');
    return;
  }

  const SALES_PAGE = {
    filterStorageKey: 'husky_sales_period',
    refs: {},
    filters: {
      search: '',
      start: '',
      end: '',
      payment: '',
      orderStatus: '',
      paymentStatus: ''
    },
    editingSaleId: null,
    pixProofDraft: null,

    init() {
      if (!document.getElementById('sale-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.compactPersistedProofsIfNeeded();
      this.loadSavedPeriod();
      this.prepareInitialState();
      this.renderAll();
      app.log('Tela de vendas carregada.');
    },

    compactPersistedProofsIfNeeded() {
      const state = this.getState();
      let changed = false;

      state.sales = (state.sales || []).map((sale) => {
        if (!sale?.pixProof) return sale;

        const hasHeavyData =
          Boolean(sale.pixProof?.dataUrl) ||
          Boolean(sale.pixProof?.fileDataUrl) ||
          Boolean(sale.pixProof?.attachment?.dataUrl);

        if (!hasHeavyData) return sale;

        changed = true;
        return {
          ...sale,
          pixProof: {
            name: sale.pixProof?.name || '',
            type: sale.pixProof?.type || '',
            size: sale.pixProof?.size || 0,
            uploadedAt: sale.pixProof?.uploadedAt || sale.updatedAt || new Date().toISOString(),
            transactionId: sale.pixProof?.transactionId || '',
            note: sale.pixProof?.note || '',
            url: sale.pixProof?.url || '',
            storageBucket: sale.pixProof?.storageBucket || '',
            storagePath: sale.pixProof?.storagePath || ''
          }
        };
      });

      state.proofs = (state.proofs || []).map((proof) => {
        const hasHeavyData =
          Boolean(proof?.fileDataUrl) ||
          Boolean(proof?.attachment?.dataUrl);

        if (!hasHeavyData) return proof;

        changed = true;

        const attachment = proof.attachment
          ? {
              name: proof.attachment?.name || proof.fileName || '',
              type: proof.attachment?.type || proof.fileType || '',
              size: proof.attachment?.size || 0,
              uploadedAt: proof.attachment?.uploadedAt || proof.updatedAt || new Date().toISOString(),
              url: proof.attachment?.url || '',
              storageBucket: proof.attachment?.storageBucket || '',
              storagePath: proof.attachment?.storagePath || ''
            }
          : null;

        return {
          ...proof,
          attachment,
          fileName: proof.fileName || attachment?.name || '',
          fileType: proof.fileType || attachment?.type || '',
          fileDataUrl: ''
        };
      });

      if (changed) {
        this.setState(state);
        app.showToast('Arquivos pesados dos comprovantes foram compactados para liberar espaço.', 'warning');
      }
    },

    getDefaultPeriod() {
      const today = this.todayISO();
      return {
        start: `${today.slice(0, 7)}-01`,
        end: today
      };
    },

    loadSavedPeriod() {
      try {
        const raw = localStorage.getItem(app.getStorageKey(this.filterStorageKey));
        const saved = raw ? JSON.parse(raw) : null;
        const defaults = this.getDefaultPeriod();

        this.filters = {
          search: '',
          start: saved?.start || defaults.start,
          end: saved?.end || defaults.end,
          payment: '',
          orderStatus: '',
          paymentStatus: ''
        };

        this.syncFiltersToForm();
      } catch (error) {
        console.error('[Husky Vendas] erro ao carregar período salvo', error);
        const defaults = this.getDefaultPeriod();
        this.filters.start = defaults.start;
        this.filters.end = defaults.end;
        this.filters.search = '';
        this.filters.payment = '';
        this.filters.orderStatus = '';
        this.filters.paymentStatus = '';
        this.syncFiltersToForm();
      }
    },

    savePeriodOnly() {
      try {
        localStorage.setItem(
          app.getStorageKey(this.filterStorageKey),
          JSON.stringify({
            start: this.filters.start || '',
            end: this.filters.end || ''
          })
        );
      } catch (error) {
        console.error('[Husky Vendas] erro ao salvar período', error);
      }
    },

    syncFiltersToForm() {
      if (this.refs.salesSearch) this.refs.salesSearch.value = this.filters.search || '';
      if (this.refs.salesFilterStart) this.refs.salesFilterStart.value = this.filters.start || '';
      if (this.refs.salesFilterEnd) this.refs.salesFilterEnd.value = this.filters.end || '';
      if (this.refs.salesFilterPayment) this.refs.salesFilterPayment.value = this.filters.payment || '';
      if (this.refs.salesFilterOrderStatus) this.refs.salesFilterOrderStatus.value = this.filters.orderStatus || '';
      if (this.refs.salesFilterPaymentStatus) this.refs.salesFilterPaymentStatus.value = this.filters.paymentStatus || '';
    },

    resetListFiltersToDefault(syncForm = false) {
      const defaults = this.getDefaultPeriod();
      this.filters = {
        search: '',
        start: defaults.start,
        end: defaults.end,
        payment: '',
        orderStatus: '',
        paymentStatus: ''
      };
      this.savePeriodOnly();
      if (syncForm) this.syncFiltersToForm();
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('sale-form'),
        saleId: document.getElementById('sale-id'),
        saleCode: document.getElementById('sale-code'),
        saleOrderNumber: document.getElementById('sale-order-number'),
        salesHistoryTableBody: document.getElementById('sales-history-table-body'),
        saleDate: document.getElementById('sale-date'),
        saleTime: document.getElementById('sale-time'),
        saleClientName: document.getElementById('sale-client-name'),
        saleClientPhone: document.getElementById('sale-client-phone'),
        saleClientEmail: document.getElementById('sale-client-email'),
        saleDeliveryType: document.getElementById('sale-delivery-type'),
        saleDeliveryAddress: document.getElementById('sale-delivery-address'),
        salePaymentMethod: document.getElementById('sale-payment-method'),
        salePaymentStatus: document.getElementById('sale-payment-status'),
        saleOrderStatus: document.getElementById('sale-order-status'),
        saleDiscount: document.getElementById('sale-discount'),
        saleExtraFee: document.getElementById('sale-extra-fee'),
        saleShippingFee: document.getElementById('sale-shipping-fee'),
        saleNotes: document.getElementById('sale-notes'),
        saleItemsContainer: document.getElementById('sale-items-container'),
        btnAddSaleItem: document.getElementById('btn-add-sale-item'),
        btnSaveSale: document.getElementById('btn-save-sale'),
        btnUpdateSale: document.getElementById('btn-update-sale'),
        btnFinishSale: document.getElementById('btn-finish-sale'),
        btnCancelSale: document.getElementById('btn-cancel-sale'),
        btnGenerateReceipt: document.getElementById('btn-generate-receipt'),
        btnPrintReceipt: document.getElementById('btn-print-receipt'),
        btnSendWhatsApp: document.getElementById('btn-send-whatsapp'),
        btnGenerateSimpleInvoice: document.getElementById('btn-generate-simple-invoice'),
        btnNewSaleTop: document.getElementById('btn-new-sale-top'),
        btnNewSaleHero: document.getElementById('btn-new-sale-hero'),
        btnPrintCurrentTop: document.getElementById('btn-print-current-top'),
        saleModeTag: document.getElementById('sale-mode-tag'),

        saleSubtotal: document.getElementById('sale-subtotal'),
        saleCost: document.getElementById('sale-cost'),
        saleDiscountTotal: document.getElementById('sale-discount-total'),
        saleExtraTotal: document.getElementById('sale-extra-total'),
        saleShippingTotal: document.getElementById('sale-shipping-total'),
        saleTotal: document.getElementById('sale-total'),
        saleProfit: document.getElementById('sale-profit'),

        summaryPaymentMethod: document.getElementById('summary-payment-method'),
        summaryPaymentStatus: document.getElementById('summary-payment-status'),
        summaryOrderStatus: document.getElementById('summary-order-status'),
        summaryPixProofStatus: document.getElementById('summary-pix-proof-status'),

        receiptNumber: document.getElementById('receipt-number'),
        receiptDate: document.getElementById('receipt-date'),
        receiptClient: document.getElementById('receipt-client'),
        receiptItemsBody: document.getElementById('receipt-items-body'),
        receiptTotal: document.getElementById('receipt-total'),
        receiptPayment: document.getElementById('receipt-payment'),
        receiptStatus: document.getElementById('receipt-status'),

        printNumber: document.getElementById('print-number'),
        printDate: document.getElementById('print-date'),
        printClient: document.getElementById('print-client'),
        printItems: document.getElementById('print-items'),
        printSubtotal: document.getElementById('print-subtotal'),
        printDiscountTotal: document.getElementById('print-discount-total'),
        printShippingTotal: document.getElementById('print-shipping-total'),
        printTotal: document.getElementById('print-total'),
        printPayment: document.getElementById('print-payment'),
        printFooterMessage: document.getElementById('print-footer-message'),
        printCompanyLine: document.getElementById('print-company-line'),

        salePixProof: document.getElementById('sale-pix-proof'),
        salePixProofNote: document.getElementById('sale-pix-proof-note'),
        salePixProofPreview: document.getElementById('sale-pix-proof-preview'),

        salesTodayTotal: document.getElementById('sales-today-total'),
        salesPendingCount: document.getElementById('sales-pending-count'),
        salesFinishedCount: document.getElementById('sales-finished-count'),
        salesPixMissingCount: document.getElementById('sales-pix-missing-count'),

        salesSearch: document.getElementById('sales-search'),
        salesFilterStart: document.getElementById('sales-filter-start'),
        salesFilterEnd: document.getElementById('sales-filter-end'),
        salesFilterPayment: document.getElementById('sales-filter-payment'),
        salesFilterOrderStatus: document.getElementById('sales-filter-order-status'),
        salesFilterPaymentStatus: document.getElementById('sales-filter-payment-status'),
        btnFilterSales: document.getElementById('btn-filter-sales'),
        btnClearSalesFilter: document.getElementById('btn-clear-sales-filter'),

        salesTableBody: document.getElementById('sales-table-body'),
        pixPendingSalesTable: document.getElementById('pix-pending-sales-table'),
        finishedSalesTable: document.getElementById('finished-sales-table')
      };
    },

    bindEvents() {
      this.refs.btnAddSaleItem?.addEventListener('click', () => this.addSaleItemRow());
      this.refs.btnSaveSale?.addEventListener('click', () => this.handleSaveSale(false));
      this.refs.btnUpdateSale?.addEventListener('click', () => this.handleSaveSale(true));
      this.refs.btnFinishSale?.addEventListener('click', () => this.handleFinishSale());
      this.refs.btnCancelSale?.addEventListener('click', () => this.handleCancelSale());
      this.refs.btnGenerateReceipt?.addEventListener('click', () => this.prepareReceiptPreview(true));
      this.refs.btnPrintReceipt?.addEventListener('click', () => this.printReceipt());
      this.refs.btnSendWhatsApp?.addEventListener('click', () => this.sendReceiptToWhatsApp());
      this.refs.btnGenerateSimpleInvoice?.addEventListener('click', () => this.generateSimpleInvoice());
      this.refs.btnNewSaleTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewSaleHero?.addEventListener('click', () => this.resetForm());
      this.refs.btnPrintCurrentTop?.addEventListener('click', () => this.printReceipt());
      this.refs.btnFilterSales?.addEventListener('click', () => this.applyFilters());
      this.refs.btnClearSalesFilter?.addEventListener('click', () => this.clearFilters());
      this.refs.salePixProof?.addEventListener('change', (event) => this.handlePixProofUpload(event));

      [
        this.refs.saleDiscount,
        this.refs.saleExtraFee,
        this.refs.saleShippingFee,
        this.refs.salePaymentMethod,
        this.refs.salePaymentStatus,
        this.refs.saleOrderStatus,
        this.refs.saleClientName,
        this.refs.saleDate,
        this.refs.salePixProofNote
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.salesSearch?.addEventListener('input', () => {
        this.filters.search = this.refs.salesSearch.value.trim();
        this.renderAll();
      });

      this.refs.salesFilterStart?.addEventListener('change', () => {
        this.filters.start = this.normalizeDate(this.refs.salesFilterStart.value || '');
        this.savePeriodOnly();
        this.renderAll();
      });

      this.refs.salesFilterEnd?.addEventListener('change', () => {
        this.filters.end = this.normalizeDate(this.refs.salesFilterEnd.value || '');
        this.savePeriodOnly();
        this.renderAll();
      });

      this.refs.salesFilterPayment?.addEventListener('change', () => {
        this.filters.payment = this.refs.salesFilterPayment.value || '';
        this.renderAll();
      });

      this.refs.salesFilterOrderStatus?.addEventListener('change', () => {
        this.filters.orderStatus = this.refs.salesFilterOrderStatus.value || '';
        this.renderAll();
      });

      this.refs.salesFilterPaymentStatus?.addEventListener('change', () => {
        this.filters.paymentStatus = this.refs.salesFilterPaymentStatus.value || '';
        this.renderAll();
      });

      this.refs.salesTableBody?.addEventListener('click', (event) => this.handleSalesTableActions(event));
      this.refs.salesHistoryTableBody?.addEventListener('click', (event) => this.handleSalesHistoryActions(event));
      this.refs.pixPendingSalesTable?.addEventListener('click', (event) => this.handlePixPendingActions(event));
      this.refs.finishedSalesTable?.addEventListener('click', (event) => this.handleFinishedActions(event));

      window.addEventListener('husky:state-changed', () => {
        this.renderAll();
      });

      window.addEventListener('storage', () => {
        this.renderAll();
      });
    },

    prepareInitialState() {
      if (!this.getProducts().length) {
        app.showToast('Cadastre produtos para começar a vender.', 'warning');
      }

      this.resetForm(true);
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
    },

    getSales() {
      const sales = this.getState().sales;
      return Array.isArray(sales) ? sales : [];
    },

    getProducts() {
      const products = this.getState().products;
      return Array.isArray(products) ? products : [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    normalizeDate(value) {
      if (!value) return '';

      const text = String(value).trim();

      if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        return text.slice(0, 10);
      }

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        const [day, month, year] = text.split('/');
        return `${year}-${month}-${day}`;
      }

      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    getSaleDateValue(sale) {
      return this.normalizeDate(sale?.date || sale?.createdAt || '');
    },

    todayISO() {
      return typeof app.todayISO === 'function'
        ? app.todayISO()
        : new Date().toISOString().slice(0, 10);
    },

    resetForm(skipScroll = false) {
      this.editingSaleId = null;
      app.revokeAttachmentPreview(this.pixProofDraft);
      this.pixProofDraft = null;

      if (this.refs.form) this.refs.form.reset();

      if (this.refs.saleId) this.refs.saleId.value = '';
      if (this.refs.saleCode) this.refs.saleCode.value = app.createId('SALE');
      if (this.refs.saleOrderNumber) this.refs.saleOrderNumber.value = app.createOrderNumber('PED');
      if (this.refs.saleDate) this.refs.saleDate.value = this.todayISO();
      if (this.refs.saleTime) this.refs.saleTime.value = app.currentTimeHHMM();
      if (this.refs.salePaymentMethod) this.refs.salePaymentMethod.value = 'Pix';
      if (this.refs.salePaymentStatus) this.refs.salePaymentStatus.value = 'Aguardando pagamento';
      if (this.refs.saleOrderStatus) this.refs.saleOrderStatus.value = 'Pendente';
      if (this.refs.saleDiscount) this.refs.saleDiscount.value = '';
      if (this.refs.saleExtraFee) this.refs.saleExtraFee.value = '';
      if (this.refs.saleShippingFee) this.refs.saleShippingFee.value = '';
      if (this.refs.salePixProofNote) this.refs.salePixProofNote.value = '';
      if (this.refs.salePixProof) this.refs.salePixProof.value = '';

      if (this.refs.saleItemsContainer) {
        this.refs.saleItemsContainer.innerHTML = '';
        this.renderSaleItemsHeader();
        this.addSaleItemRow();
      }

      this.updatePixProofPreview();
      this.updateModeTag('Novo pedido');
      this.updateLiveSummary();

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    renderSaleItemsHeader() {
      if (!this.refs.saleItemsContainer) return;

      const header = document.createElement('div');
      header.className = 'sale-item-row sale-item-row-header';
      header.innerHTML = `
        <span>Produto</span>
        <span>Qtd</span>
        <span>Preço</span>
        <span>Total</span>
        <span>Ação</span>
      `;
      this.refs.saleItemsContainer.appendChild(header);
    },

    addSaleItemRow(item = null) {
      if (!this.refs.saleItemsContainer) return;

      const row = document.createElement('div');
      row.className = 'sale-item-row';
      row.dataset.rowId = crypto.randomUUID();

      const productsOptions = this.getProducts().map((product) => `
        <option value="${product.id}" ${item?.productId === product.id ? 'selected' : ''}>${this.escapeHtml(product.name)}</option>
      `).join('');

      row.innerHTML = `
        <div class="form-group compact-field">
          <select class="sale-item-product">
            <option value="">Selecione um produto</option>
            ${productsOptions}
          </select>
        </div>

        <div class="form-group compact-field">
          <input type="number" class="sale-item-quantity" value="${item?.quantity || 1}" min="1" />
        </div>

        <div class="form-group compact-field">
          <input type="number" class="sale-item-unit-price" placeholder="0,00" value="${item?.unitPrice ?? ''}" />
        </div>

        <div class="sale-item-total-cell">
          <strong>${app.formatCurrency(item?.total || 0)}</strong>
        </div>

        <div class="sale-item-action-cell">
          <button type="button" class="btn btn-danger btn-small sale-item-remove">Remover</button>
        </div>
      `;

      const productSelect = row.querySelector('.sale-item-product');
      const quantityInput = row.querySelector('.sale-item-quantity');
      const unitPriceInput = row.querySelector('.sale-item-unit-price');
      const removeButton = row.querySelector('.sale-item-remove');

      productSelect?.addEventListener('change', () => {
        const product = this.findProduct(productSelect.value);
        if (product && !unitPriceInput.value) {
          unitPriceInput.value = this.toNumber(product.price || 0);
        }
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      quantityInput?.addEventListener('input', () => {
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      unitPriceInput?.addEventListener('input', () => {
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      removeButton?.addEventListener('click', () => {
        const rows = this.getSaleItemRows();
        if (rows.length <= 1) {
          app.showToast('A venda precisa ter pelo menos um item.', 'warning');
          return;
        }
        row.remove();
        this.updateLiveSummary();
      });

      this.refs.saleItemsContainer.appendChild(row);
      this.updateRowTotal(row);
      this.updateLiveSummary();
    },

    getSaleItemRows() {
      if (!this.refs.saleItemsContainer) return [];
      return Array.from(this.refs.saleItemsContainer.querySelectorAll('.sale-item-row'))
        .filter((row) => !row.classList.contains('sale-item-row-header'));
    },

    updateRowTotal(row) {
      const quantity = this.toNumber(row.querySelector('.sale-item-quantity')?.value || 0);
      const unitPrice = this.toNumber(row.querySelector('.sale-item-unit-price')?.value || 0);
      const total = quantity * unitPrice;
      const totalCell = row.querySelector('.sale-item-total-cell strong');
      if (totalCell) totalCell.textContent = app.formatCurrency(total);
    },

    collectItemsFromForm() {
      return this.getSaleItemRows()
        .map((row) => {
          const productId = row.querySelector('.sale-item-product')?.value || '';
          const quantity = this.toNumber(row.querySelector('.sale-item-quantity')?.value || 0);
          const unitPrice = this.toNumber(row.querySelector('.sale-item-unit-price')?.value || 0);
          const product = this.findProduct(productId);

          return {
            rowId: row.dataset.rowId,
            productId,
            productName: product?.name || 'Produto avulso',
            quantity,
            unitPrice,
            unitCost: this.toNumber(product?.cost || 0),
            total: quantity * unitPrice
          };
        })
        .filter((item) => item.productId && item.quantity > 0);
    },

    calculateSaleTotals(items) {
      const subtotal = app.sum(items, (item) => item.total);
      const cost = app.sum(items, (item) => item.unitCost * item.quantity);
      const discount = this.toNumber(this.refs.saleDiscount?.value || 0);
      const extraFee = this.toNumber(this.refs.saleExtraFee?.value || 0);
      const shippingFee = this.toNumber(this.refs.saleShippingFee?.value || 0);
      const total = Math.max(0, subtotal - discount + extraFee + shippingFee);
      const profit = total - cost;

      return {
        subtotal,
        cost,
        discount,
        extraFee,
        shippingFee,
        total,
        profit
      };
    },

    async getPersistableProofMeta(existingSale = null) {
      const sourceProof = this.pixProofDraft || existingSale?.pixProof || null;
      if (!sourceProof) return null;

      let attachment = sourceProof;

      if (attachment?.rawFile) {
        if (app.isCloudStorageReady()) {
          attachment = await app.uploadFileToCloud(attachment.rawFile, { folder: 'proofs' });
        } else {
          attachment = await this.readLocalAttachmentAsDataUrl(attachment.rawFile);
        }

        if (existingSale?.pixProof?.storagePath && existingSale.pixProof.storagePath !== attachment.storagePath) {
          app.deleteCloudFile(existingSale.pixProof);
        }
      }

      return this.normalizeProofMeta({
        ...attachment,
        note: this.refs.salePixProofNote?.value.trim() || attachment.note || ''
      });
    },

    updateLiveSummary() {
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const existingSale = this.findSaleById(this.editingSaleId);
      const currentProof = this.pixProofDraft || existingSale?.pixProof || null;
      const pixProofText = currentProof?.name ? 'Enviado' : 'Não enviado';

      if (this.refs.saleSubtotal) this.refs.saleSubtotal.textContent = app.formatCurrency(totals.subtotal);
      if (this.refs.saleCost) this.refs.saleCost.textContent = app.formatCurrency(totals.cost);
      if (this.refs.saleDiscountTotal) this.refs.saleDiscountTotal.textContent = app.formatCurrency(totals.discount);
      if (this.refs.saleExtraTotal) this.refs.saleExtraTotal.textContent = app.formatCurrency(totals.extraFee);
      if (this.refs.saleShippingTotal) this.refs.saleShippingTotal.textContent = app.formatCurrency(totals.shippingFee);
      if (this.refs.saleTotal) this.refs.saleTotal.textContent = app.formatCurrency(totals.total);
      if (this.refs.saleProfit) this.refs.saleProfit.textContent = app.formatCurrency(totals.profit);

      if (this.refs.summaryPaymentMethod) this.refs.summaryPaymentMethod.textContent = this.refs.salePaymentMethod?.value || '-';
      if (this.refs.summaryPaymentStatus) this.refs.summaryPaymentStatus.textContent = this.refs.salePaymentStatus?.value || '-';
      if (this.refs.summaryOrderStatus) this.refs.summaryOrderStatus.textContent = this.refs.saleOrderStatus?.value || '-';
      if (this.refs.summaryPixProofStatus) {
        this.refs.summaryPixProofStatus.textContent =
          this.refs.salePaymentMethod?.value === 'Pix' ? pixProofText : 'Não obrigatório';
      }

      this.prepareReceiptPreview(false);
    },

    updateModeTag(label) {
      if (this.refs.saleModeTag) this.refs.saleModeTag.textContent = label;
    },

    validateForm({ forFinalization = false } = {}) {
      const items = this.collectItemsFromForm();
      if (!items.length) {
        app.showToast('Adicione pelo menos um produto à venda.', 'warning');
        return false;
      }

      if (!this.refs.saleClientName?.value.trim()) {
        app.showToast('Informe o nome do cliente.', 'warning');
        this.refs.saleClientName?.focus();
        return false;
      }

      if (!this.refs.saleDate?.value) {
        app.showToast('Informe a data da venda.', 'warning');
        return false;
      }

      const previousSale = this.findSaleById(this.editingSaleId);
      const stockCheck = this.checkStockAvailability(items, previousSale);

      if (!stockCheck.ok) {
        app.showToast(stockCheck.message, 'danger');
        return false;
      }

      if (
        forFinalization &&
        this.refs.salePaymentMethod?.value === 'Pix' &&
        !this.pixProofDraft &&
        !previousSale?.pixProof?.name
      ) {
        app.showToast('Para finalizar uma venda em Pix, anexe o comprovante.', 'warning');
        return false;
      }

      return true;
    },

    checkStockAvailability(newItems, previousSale = null) {
      const availableMap = new Map();

      this.getProducts().forEach((product) => {
        availableMap.set(product.id, this.toNumber(product.stock || 0));
      });

      if (previousSale && previousSale.orderStatus !== 'Cancelado') {
        previousSale.items.forEach((item) => {
          availableMap.set(
            item.productId,
            (availableMap.get(item.productId) || 0) + this.toNumber(item.quantity || 0)
          );
        });
      }

      for (const item of newItems) {
        const available = availableMap.get(item.productId) || 0;
        if (available < item.quantity) {
          return {
            ok: false,
            message: `Estoque insuficiente para ${item.productName}. Disponível: ${available}.`
          };
        }
      }

      return { ok: true };
    },

    async buildSalePayload(overrides = {}) {
      const existingSale = this.findSaleById(this.editingSaleId);
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const paymentMethod = this.refs.salePaymentMethod?.value || 'Pix';
      const paymentStatus = overrides.paymentStatus || this.refs.salePaymentStatus?.value || 'Aguardando pagamento';
      const orderStatus = overrides.orderStatus || this.refs.saleOrderStatus?.value || 'Pendente';
      const now = new Date().toISOString();

      return {
        id: existingSale?.id || this.refs.saleId?.value || app.createId('SALE'),
        code: existingSale?.code || this.refs.saleCode?.value || app.createId('SALE'),
        orderNumber: this.refs.saleOrderNumber?.value || existingSale?.orderNumber || app.createOrderNumber('PED'),
        date: this.normalizeDate(this.refs.saleDate?.value || this.todayISO()),
        time: this.refs.saleTime?.value || app.currentTimeHHMM(),
        client: {
          name: this.refs.saleClientName?.value.trim() || '',
          phone: this.refs.saleClientPhone?.value.trim() || '',
          email: this.refs.saleClientEmail?.value.trim() || ''
        },
        delivery: {
          type: this.refs.saleDeliveryType?.value || 'Retirada',
          address: this.refs.saleDeliveryAddress?.value.trim() || ''
        },
        paymentMethod,
        paymentStatus,
        orderStatus,
        discount: totals.discount,
        extraFee: totals.extraFee,
        shippingFee: totals.shippingFee,
        notes: this.refs.saleNotes?.value.trim() || '',
        items,
        subtotal: totals.subtotal,
        cost: totals.cost,
        total: totals.total,
        profit: totals.profit,
        pixProof: paymentMethod === 'Pix'
          ? await this.getPersistableProofMeta(existingSale)
          : null,
        pixProofNote: this.refs.salePixProofNote?.value.trim() || '',
        updatedAt: now,
        createdAt: existingSale?.createdAt || now,
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    ensureSaleWasPersisted(saleId) {
      return this.getSales().some((sale) => sale.id === saleId);
    },

    async handleSaveSale(isUpdate = false) {
      if (!this.validateForm()) return;

      this.setPersistingState(true);

      try {
        const sale = await this.buildSalePayload();
        const previousSale = this.findSaleById(sale.id);
        const nextState = this.applySaleToState(sale, previousSale);
        this.setState(nextState);

        if (!this.ensureSaleWasPersisted(sale.id)) {
          app.showToast('Não foi possível gravar a venda. O armazenamento do navegador pode estar cheio.', 'danger');
          return;
        }

        this.resetListFiltersToDefault(true);
        this.renderAll();

        app.showToast(
          isUpdate || previousSale
            ? 'Venda atualizada com sucesso.'
            : 'Venda salva com sucesso.',
          'success'
        );

        app.log('Venda salva/atualizada.', {
          saleId: sale.id,
          orderNumber: sale.orderNumber
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Vendas] erro ao salvar venda', error);
        app.showToast(`Não foi possível salvar a venda. ${error?.message || ''}`.trim(), 'danger');
      } finally {
        this.setPersistingState(false);
      }
    },

    async handleFinishSale() {
      if (!this.validateForm({ forFinalization: true })) return;

      this.setPersistingState(true);

      try {
        const sale = await this.buildSalePayload({
          paymentStatus: this.refs.salePaymentMethod?.value === 'Pix'
            ? 'Pago'
            : this.refs.salePaymentStatus?.value || 'Pago',
          orderStatus: 'Finalizado'
        });

        const previousSale = this.findSaleById(sale.id);
        const nextState = this.applySaleToState(sale, previousSale);
        this.setState(nextState);

        if (!this.ensureSaleWasPersisted(sale.id)) {
          app.showToast('Não foi possível finalizar a venda. O armazenamento do navegador pode estar cheio.', 'danger');
          return;
        }

        this.resetListFiltersToDefault(true);
        this.renderAll();

        app.showToast('Pedido finalizado com sucesso.', 'success');
        app.log('Pedido finalizado.', {
          saleId: sale.id,
          orderNumber: sale.orderNumber
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Vendas] erro ao finalizar venda', error);
        app.showToast(`Não foi possível finalizar a venda. ${error?.message || ''}`.trim(), 'danger');
      } finally {
        this.setPersistingState(false);
      }
    },

    handleCancelSale() {
      const saleId = this.editingSaleId || this.refs.saleId?.value;
      const existingSale = this.findSaleById(saleId);

      if (!existingSale) {
        app.showToast('Selecione uma venda existente para cancelar.', 'warning');
        return;
      }

      const confirmed = app.confirmAction(`Deseja cancelar o pedido ${existingSale.orderNumber}?`);
      if (!confirmed) return;

      const cancelledSale = {
        ...existingSale,
        orderStatus: 'Cancelado',
        paymentStatus: existingSale.paymentStatus === 'Pago' ? 'Pago' : 'Cancelado',
        updatedAt: new Date().toISOString(),
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };

      const nextState = this.applySaleToState(cancelledSale, existingSale);
      this.setState(nextState);

      this.resetListFiltersToDefault(true);
      this.renderAll();

      app.showToast('Pedido cancelado.', 'warning');
      app.log('Pedido cancelado.', {
        saleId: cancelledSale.id,
        orderNumber: cancelledSale.orderNumber
      });

      this.resetForm();
    },

    applySaleToState(sale, previousSale = null) {
      const state = app.getAppState();
      const products = [...(state.products || [])];
      let stockMovements = [...(state.stockMovements || [])].filter((move) => move.relatedSaleId !== sale.id);

      if (previousSale && previousSale.orderStatus !== 'Cancelado') {
        previousSale.items.forEach((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          if (product) {
            product.stock = this.toNumber(product.stock || 0) + this.toNumber(item.quantity || 0);
          }
        });
      }

      if (sale.orderStatus !== 'Cancelado') {
        sale.items.forEach((item) => {
          const product = products.find((entry) => entry.id === item.productId);

          if (product) {
            product.stock = Math.max(
              0,
              this.toNumber(product.stock || 0) - this.toNumber(item.quantity || 0)
            );
          }

          stockMovements.unshift({
            id: crypto.randomUUID(),
            relatedSaleId: sale.id,
            relatedOrderNumber: sale.orderNumber,
            type: 'saida',
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost * item.quantity,
            date: sale.date,
            time: sale.time,
            reason: `Baixa automática por venda ${sale.orderNumber}`,
            reference: 'Venda',
            responsible: this.getCurrentUser().name || 'Administrador',
            createdAt: new Date().toISOString()
          });
        });
      }

      state.products = products;
      state.stockMovements = stockMovements;
      state.sales = app.upsertItem(state.sales || [], sale, 'id');
      this.syncProofForSaleInState(state, sale);
      return state;
    },

    syncProofForSaleInState(state, sale) {
      const proofs = [...(state.proofs || [])];
      const index = proofs.findIndex((entry) => entry.relatedSaleId === sale.id);

      if (sale.paymentMethod !== 'Pix' || !sale.pixProof) {
        if (index >= 0) proofs.splice(index, 1);
        state.proofs = proofs;
        return;
      }

      const payload = {
        id: index >= 0 ? proofs[index].id : crypto.randomUUID(),
        relatedSaleId: sale.id,
        orderNumber: sale.orderNumber,
        clientName: sale.client?.name || 'Consumidor final',
        date: sale.date,
        time: sale.time,
        amount: sale.total,
        status:
          sale.orderStatus === 'Finalizado'
            ? 'Vinculado'
            : (sale.paymentStatus === 'Pago' ? 'Conferido' : 'Pendente de conferência'),
        origin: 'Cliente',
        paymentMethod: sale.paymentMethod,
        attachment: {
          name: sale.pixProof?.name || '',
          type: sale.pixProof?.type || '',
          size: sale.pixProof?.size || 0,
          uploadedAt: sale.pixProof?.uploadedAt || new Date().toISOString(),
          url: sale.pixProof?.url || '',
          storageBucket: sale.pixProof?.storageBucket || '',
          storagePath: sale.pixProof?.storagePath || ''
        },
        fileName: sale.pixProof?.name || '',
        fileType: sale.pixProof?.type || '',
        fileDataUrl: '',
        transactionId: sale.pixProof?.transactionId || '',
        note: sale.pixProofNote || sale.pixProof?.note || '',
        createdAt: index >= 0 ? proofs[index].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (index >= 0) {
        proofs[index] = payload;
      } else {
        proofs.unshift(payload);
      }

      state.proofs = proofs;
    },

    async handlePixProofUpload(event) {
      const file = event.target.files?.[0];

      if (!file) {
        app.revokeAttachmentPreview(this.pixProofDraft);
        this.pixProofDraft = null;
        this.updatePixProofPreview();
        this.updateLiveSummary();
        return;
      }

      try {
        app.revokeAttachmentPreview(this.pixProofDraft);
        this.pixProofDraft = await app.prepareLocalFileDraft(file);
        this.pixProofDraft.note = this.refs.salePixProofNote?.value.trim() || '';
        this.pixProofDraft.transactionId = '';
        this.updatePixProofPreview();
        this.updateLiveSummary();
        app.showToast('Comprovante preparado para envio em nuvem.', 'success');
      } catch (error) {
        console.error('[Husky Vendas] erro ao preparar comprovante', error);
        app.showToast('Não foi possível ler o comprovante.', 'danger');
      }
    },

    async readLocalAttachmentAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
            dataUrl: reader.result,
            uploadedAt: new Date().toISOString(),
            source: 'local'
          });
        };

        reader.onerror = () => reject(new Error('Não foi possível ler o comprovante local.'));
        reader.readAsDataURL(file);
      });
    },

    normalizeProofMeta(proof) {
      if (!proof) return null;

      return {
        name: proof.name || '',
        type: proof.type || 'application/octet-stream',
        size: proof.size || 0,
        uploadedAt: proof.uploadedAt || new Date().toISOString(),
        transactionId: proof.transactionId || '',
        note: proof.note || '',
        dataUrl: proof.dataUrl || '',
        url: proof.url || '',
        storageBucket: proof.storageBucket || '',
        storagePath: proof.storagePath || ''
      };
    },

    setPersistingState(isSaving) {
      [this.refs.btnSaveSale, this.refs.btnUpdateSale, this.refs.btnFinishSale].forEach((button) => {
        if (!button) return;
        button.disabled = Boolean(isSaving);
      });
    },

    updatePixProofPreview() {
      if (!this.refs.salePixProofPreview) return;

      const currentProof = this.pixProofDraft || this.findSaleById(this.editingSaleId)?.pixProof || null;

      if (!currentProof) {
        this.refs.salePixProofPreview.innerHTML = '<p>Nenhum comprovante anexado.</p>';
        return;
      }

      const isImage = String(currentProof.type || '').startsWith('image/');
      const sizeKb = currentProof.size ? `${Math.ceil(currentProof.size / 1024)} KB` : '-';
      const noteText =
        this.refs.salePixProofNote?.value.trim() ||
        currentProof.note ||
        'Sem observação';

      this.refs.salePixProofPreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(currentProof.name || 'Comprovante Pix')}</strong>
            <p>Tipo: ${this.escapeHtml(currentProof.type || '-')} • Tamanho: ${sizeKb}</p>
            <p>Observação: ${this.escapeHtml(noteText)}</p>
          </div>
          <span class="tag">${isImage ? 'Imagem' : 'Arquivo'}</span>
        </div>
        ${
          isImage && app.getAttachmentPreviewUrl(currentProof)
            ? `<div style="margin-top: 12px;"><img src="${app.getAttachmentPreviewUrl(currentProof)}" alt="Comprovante Pix" style="max-width: 100%; border-radius: 14px; border: 1px solid #ead9cd;" /></div>`
            : '<div style="margin-top:12px;"><p>Arquivo salvo com armazenamento em nuvem.</p></div>'
        }
      `;
    },

    applyFilters() {
      this.filters.search = this.refs.salesSearch?.value.trim() || '';
      this.filters.start = this.normalizeDate(this.refs.salesFilterStart?.value || '');
      this.filters.end = this.normalizeDate(this.refs.salesFilterEnd?.value || '');
      this.filters.payment = this.refs.salesFilterPayment?.value || '';
      this.filters.orderStatus = this.refs.salesFilterOrderStatus?.value || '';
      this.filters.paymentStatus = this.refs.salesFilterPaymentStatus?.value || '';

      this.savePeriodOnly();
      this.renderAll();
    },

    clearFilters() {
      this.resetListFiltersToDefault(true);
      this.renderAll();
    },

    getFilteredSales() {
      return this.getSales()
        .filter((sale) => {
          const searchTarget = [
            sale.orderNumber,
            sale.client?.name,
            sale.client?.phone,
            sale.client?.email,
            sale.code,
            sale.notes
          ].join(' ');

          const saleDate = this.getSaleDateValue(sale);
          const matchesSearch = !this.filters.search || app.includesText(searchTarget, this.filters.search);
          const matchesStart = !this.filters.start || (saleDate && saleDate >= this.filters.start);
          const matchesEnd = !this.filters.end || (saleDate && saleDate <= this.filters.end);
          const matchesPayment = !this.filters.payment || sale.paymentMethod === this.filters.payment;
          const matchesOrderStatus = !this.filters.orderStatus || sale.orderStatus === this.filters.orderStatus;
          const matchesPaymentStatus = !this.filters.paymentStatus || sale.paymentStatus === this.filters.paymentStatus;

          return matchesSearch && matchesStart && matchesEnd && matchesPayment && matchesOrderStatus && matchesPaymentStatus;
        })
        .sort((a, b) => {
          const dateA = new Date(`${this.getSaleDateValue(a)}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${this.getSaleDateValue(b)}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });
    },

    renderAll() {
      this.renderMetrics();
      this.renderSalesTable();
      this.renderSalesHistoryTable();
      this.renderPixPendingTable();
      this.renderFinishedTable();
      this.updateLiveSummary();
    },

    renderMetrics() {
      const today = this.todayISO();
      const sales = this.getSales();
      const todaySales = sales.filter(
        (sale) => this.getSaleDateValue(sale) === today && sale.orderStatus !== 'Cancelado'
      );
      const pending = sales.filter(
        (sale) => sale.orderStatus !== 'Finalizado' && sale.orderStatus !== 'Cancelado'
      );
      const finished = sales.filter((sale) => sale.orderStatus === 'Finalizado');
      const pixMissing = sales.filter((sale) => this.saleNeedsPixProof(sale));

      if (this.refs.salesTodayTotal) {
        this.refs.salesTodayTotal.textContent = app.formatCurrency(app.sum(todaySales, (sale) => sale.total || 0));
      }
      if (this.refs.salesPendingCount) {
        this.refs.salesPendingCount.textContent = String(pending.length);
      }
      if (this.refs.salesFinishedCount) {
        this.refs.salesFinishedCount.textContent = String(finished.length);
      }
      if (this.refs.salesPixMissingCount) {
        this.refs.salesPixMissingCount.textContent = String(pixMissing.length);
      }
    },

    renderSalesTable() {
      if (!this.refs.salesTableBody) return;

      const sales = this.getFilteredSales().slice(0, 8);

      if (!sales.length) {
        this.refs.salesTableBody.innerHTML = `
          <tr>
            <td colspan="4">Nenhuma venda encontrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.salesTableBody.innerHTML = sales.map((sale) => `
        <tr>
          <td>
            <strong>${this.escapeHtml(sale.orderNumber || '-')}</strong><br>
            <small>${this.escapeHtml(app.formatDate(this.getSaleDateValue(sale)))}</small>
          </td>
          <td>
            <strong>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</strong><br>
            <small>${this.escapeHtml(sale.paymentMethod || '-')} • ${this.escapeHtml(sale.orderStatus || '-')}</small>
          </td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>
            <div class="table-action-group">
              <button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">
                Editar
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    renderSalesHistoryTable() {
      const tbody = this.refs.salesHistoryTableBody;
      if (!tbody) return;

      const sales = [...this.getSales()].sort((a, b) => {
        const dateA = new Date(`${this.getSaleDateValue(a)}T${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${this.getSaleDateValue(b)}T${b.time || '00:00'}`).getTime();
        return dateB - dateA;
      });

      if (!sales.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">Nenhuma venda encontrada.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = sales.map((sale) => `
        <tr>
          <td><strong>${this.escapeHtml(sale.orderNumber || '-')}</strong></td>
          <td>${this.escapeHtml(app.formatDate(this.getSaleDateValue(sale)))}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${this.escapeHtml(sale.paymentMethod || '-')}</td>
          <td>${this.escapeHtml(sale.orderStatus || '-')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>
            <button
              type="button"
              class="btn btn-secondary btn-small"
              data-action="edit-sale"
              data-id="${sale.id}"
            >
              Abrir
            </button>
          </td>
        </tr>
      `).join('');
    },

    renderPixPendingTable() {
      if (!this.refs.pixPendingSalesTable) return;

      const pendingPixSales = this.getSales()
        .filter((sale) => this.saleNeedsPixProof(sale))
        .sort((a, b) => {
          const dateA = new Date(`${this.getSaleDateValue(a)}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${this.getSaleDateValue(b)}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });

      if (!pendingPixSales.length) {
        this.refs.pixPendingSalesTable.innerHTML = `
          <tr>
            <td colspan="4">Nenhum pedido aguardando comprovante Pix.</td>
          </tr>
        `;
        return;
      }

      this.refs.pixPendingSalesTable.innerHTML = pendingPixSales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">
              Anexar
            </button>
          </td>
        </tr>
      `).join('');
    },

    renderFinishedTable() {
      if (!this.refs.finishedSalesTable) return;

      const finishedSales = this.getSales()
        .filter((sale) => sale.orderStatus === 'Finalizado')
        .sort((a, b) => {
          const dateA = new Date(`${this.getSaleDateValue(a)}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${this.getSaleDateValue(b)}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });

      if (!finishedSales.length) {
        this.refs.finishedSalesTable.innerHTML = `
          <tr>
            <td colspan="4">Nenhum pedido finalizado ainda.</td>
          </tr>
        `;
        return;
      }

      this.refs.finishedSalesTable.innerHTML = finishedSales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">
              Ver
            </button>
          </td>
        </tr>
      `).join('');
    },

    handleSalesTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const saleId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-sale') {
        this.loadSaleIntoForm(saleId);
      }
    },

    handleSalesHistoryActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const saleId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-sale') {
        this.loadSaleIntoForm(saleId);
      }
    },

    handlePixPendingActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      if (button.dataset.action === 'edit-sale') {
        this.loadSaleIntoForm(button.dataset.id);
      }
    },

    handleFinishedActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      if (button.dataset.action === 'edit-sale') {
        this.loadSaleIntoForm(button.dataset.id);
      }
    },

    loadSaleIntoForm(saleId, scrollToTop = true) {
      const sale = this.findSaleById(saleId);

      if (!sale) {
        app.showToast('Venda não encontrada.', 'danger');
        return;
      }

      this.editingSaleId = sale.id;
      this.pixProofDraft = sale.pixProof || null;

      if (this.refs.saleId) this.refs.saleId.value = sale.id;
      if (this.refs.saleCode) this.refs.saleCode.value = sale.code || '';
      if (this.refs.saleOrderNumber) this.refs.saleOrderNumber.value = sale.orderNumber || '';
      if (this.refs.saleDate) this.refs.saleDate.value = this.getSaleDateValue(sale) || this.todayISO();
      if (this.refs.saleTime) this.refs.saleTime.value = sale.time || app.currentTimeHHMM();
      if (this.refs.saleClientName) this.refs.saleClientName.value = sale.client?.name || '';
      if (this.refs.saleClientPhone) this.refs.saleClientPhone.value = sale.client?.phone || '';
      if (this.refs.saleClientEmail) this.refs.saleClientEmail.value = sale.client?.email || '';
      if (this.refs.saleDeliveryType) this.refs.saleDeliveryType.value = sale.delivery?.type || 'Retirada';
      if (this.refs.saleDeliveryAddress) this.refs.saleDeliveryAddress.value = sale.delivery?.address || '';
      if (this.refs.salePaymentMethod) this.refs.salePaymentMethod.value = sale.paymentMethod || 'Pix';
      if (this.refs.salePaymentStatus) this.refs.salePaymentStatus.value = sale.paymentStatus || 'Aguardando pagamento';
      if (this.refs.saleOrderStatus) this.refs.saleOrderStatus.value = sale.orderStatus || 'Pendente';
      if (this.refs.saleDiscount) this.refs.saleDiscount.value = sale.discount || '';
      if (this.refs.saleExtraFee) this.refs.saleExtraFee.value = sale.extraFee || '';
      if (this.refs.saleShippingFee) this.refs.saleShippingFee.value = sale.shippingFee || '';
      if (this.refs.saleNotes) this.refs.saleNotes.value = sale.notes || '';
      if (this.refs.salePixProofNote) this.refs.salePixProofNote.value = sale.pixProofNote || sale.pixProof?.note || '';
      if (this.refs.salePixProof) this.refs.salePixProof.value = '';

      if (this.refs.saleItemsContainer) {
        this.refs.saleItemsContainer.innerHTML = '';
        this.renderSaleItemsHeader();
        (sale.items || []).forEach((item) => this.addSaleItemRow(item));
      }

      this.updateModeTag(`Editando ${sale.orderNumber}`);
      this.updatePixProofPreview();
      this.updateLiveSummary();

      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    getReceiptPayload() {
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const orderNumber = this.refs.saleOrderNumber?.value || 'PED-0000';
      const clientName = this.refs.saleClientName?.value.trim() || 'Consumidor final';
      const saleDate = this.refs.saleDate?.value
        ? app.formatDate(this.refs.saleDate.value)
        : app.formatDate(this.todayISO());
      const paymentMethod = this.refs.salePaymentMethod?.value || 'Pix';
      const orderStatus = this.refs.saleOrderStatus?.value || 'Pendente';
      const company = app.getSettings?.().company || {};
      const printSettings = app.getSettings?.().print || {};
      const visualSettings = app.getSettings?.().visual || {};
      const contactLine = [company.phone, company.instagram, company.address]
        .filter(Boolean)
        .join(' • ');

      return {
        items,
        totals,
        orderNumber,
        clientName,
        saleDate,
        paymentMethod,
        orderStatus,
        companyName: company.tradeName || company.name || 'Husky Confeitaria',
        footerMessage: printSettings.receiptFooterMessage || 'Obrigada pela preferência.',
        contactLine,
        showLogo: printSettings.printLogo !== false,
        showCompanyData: printSettings.printCompanyData !== false,
        mascotEnabled: visualSettings.showMascotDashboard !== false
      };
    },

    buildReceiptItemsMarkup(items, emptyColspan = 3, compact = false) {
      if (!items.length) {
        return compact
          ? '<li class="sale-receipt-item sale-receipt-empty">Nenhum item adicionado.</li>'
          : `<tr><td colspan="${emptyColspan}">Nenhum item adicionado.</td></tr>`;
      }

      if (compact) {
        return items.map((item) => `
          <li class="sale-receipt-item">
            <div>
              <strong>${this.escapeHtml(item.productName)}</strong>
              <span>${item.quantity}x item</span>
            </div>
            <strong>${app.formatCurrency(item.total)}</strong>
          </li>
        `).join('');
      }

      return items.map((item) => `
        <tr>
          <td>${this.escapeHtml(item.productName)}</td>
          <td>${item.quantity}</td>
          <td>${app.formatCurrency(item.total)}</td>
        </tr>
      `).join('');
    },

    prepareReceiptPreview(showToast = false) {
      const receipt = this.getReceiptPayload();

      if (this.refs.receiptNumber) this.refs.receiptNumber.textContent = receipt.orderNumber;
      if (this.refs.receiptDate) this.refs.receiptDate.textContent = receipt.saleDate;
      if (this.refs.receiptClient) this.refs.receiptClient.textContent = receipt.clientName;
      if (this.refs.receiptItemsBody) {
        this.refs.receiptItemsBody.innerHTML = this.buildReceiptItemsMarkup(receipt.items, 3, false);
      }
      if (this.refs.receiptTotal) this.refs.receiptTotal.textContent = app.formatCurrency(receipt.totals.total);
      if (this.refs.receiptPayment) this.refs.receiptPayment.textContent = receipt.paymentMethod;
      if (this.refs.receiptStatus) this.refs.receiptStatus.textContent = receipt.orderStatus;

      if (this.refs.printNumber) this.refs.printNumber.textContent = receipt.orderNumber;
      if (this.refs.printDate) this.refs.printDate.textContent = receipt.saleDate;
      if (this.refs.printClient) this.refs.printClient.textContent = receipt.clientName;
      if (this.refs.printItems) {
        this.refs.printItems.innerHTML = this.buildReceiptItemsMarkup(receipt.items, 4, true);
      }
      if (this.refs.printSubtotal) this.refs.printSubtotal.textContent = app.formatCurrency(receipt.totals.subtotal);
      if (this.refs.printDiscountTotal) this.refs.printDiscountTotal.textContent = app.formatCurrency(receipt.totals.discount);
      if (this.refs.printShippingTotal) this.refs.printShippingTotal.textContent = app.formatCurrency(receipt.totals.shippingFee);
      if (this.refs.printTotal) this.refs.printTotal.textContent = app.formatCurrency(receipt.totals.total);
      if (this.refs.printPayment) this.refs.printPayment.textContent = receipt.paymentMethod;
      if (this.refs.printFooterMessage) this.refs.printFooterMessage.textContent = receipt.footerMessage;
      if (this.refs.printCompanyLine) this.refs.printCompanyLine.textContent = receipt.showCompanyData ? receipt.contactLine : '';

      if (showToast) {
        app.showToast('Comprovante do cliente atualizado.', 'success');
      }
    },

    buildPrintReceiptHtml() {
      const receipt = this.getReceiptPayload();
      const logoUrl = new URL('assets/img/logo-husky.png', window.location.href).href;
      const mascotUrl = new URL('assets/img/mascote-3d.png', window.location.href).href;
      const itemLines = this.buildReceiptItemsMarkup(receipt.items, 4, true);
      const contactHtml = receipt.showCompanyData && receipt.contactLine
        ? `<p class="receipt-contact">${this.escapeHtml(receipt.contactLine)}</p>`
        : '';
      const mascotHtml = receipt.mascotEnabled
        ? `<img src="${mascotUrl}" alt="Mascote Husky" class="receipt-mascot" />`
        : '';
      const logoHtml = receipt.showLogo
        ? `<img src="${logoUrl}" alt="Logo Husky" class="receipt-logo" />`
        : '';

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprovante ${this.escapeHtml(receipt.orderNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #183247;
      --soft: #5b6d7a;
      --line: rgba(24, 50, 71, 0.12);
      --accent: #2d6f9b;
      --accent-soft: #e7f1f8;
      --cream: #f7efe7;
      --total: #103b57;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f4efe8;
      font-family: Inter, Arial, sans-serif;
      color: var(--ink);
    }
    body {
      padding: 18px;
      display: flex;
      justify-content: center;
    }
    .receipt-sheet {
      width: 100%;
      max-width: 380px;
      background: #fff;
      border-radius: 26px;
      border: 1px solid rgba(45, 111, 155, 0.12);
      box-shadow: 0 18px 42px rgba(24, 50, 71, 0.14);
      overflow: hidden;
    }
    .receipt-top {
      padding: 18px 18px 12px;
      background: linear-gradient(135deg, rgba(231, 241, 248, 0.95), rgba(247, 239, 231, 0.95));
      border-bottom: 1px solid rgba(45, 111, 155, 0.12);
    }
    .receipt-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .receipt-brand-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .receipt-logo {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 16px;
      background: #fff;
      border: 1px solid rgba(45, 111, 155, 0.12);
      padding: 4px;
      flex: 0 0 auto;
    }
    .receipt-mascot {
      width: 58px;
      height: 58px;
      object-fit: contain;
      filter: drop-shadow(0 10px 18px rgba(24, 50, 71, 0.16));
      flex: 0 0 auto;
    }
    .receipt-eyebrow {
      display: inline-flex;
      padding: 5px 9px;
      border-radius: 999px;
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
      font-weight: 800;
      background: rgba(45, 111, 155, 0.12);
      color: var(--accent);
      margin-bottom: 6px;
    }
    .receipt-title {
      margin: 0;
      font-size: 22px;
      line-height: 1;
      letter-spacing: -.03em;
    }
    .receipt-subtitle {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--soft);
    }
    .receipt-body {
      padding: 16px 18px 18px;
    }
    .receipt-orderline {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 12px;
      border-radius: 16px;
      background: var(--cream);
      font-size: 12px;
      color: var(--soft);
      margin-bottom: 12px;
    }
    .receipt-client {
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 16px;
      margin-bottom: 12px;
      background: #fff;
    }
    .receipt-client span,
    .receipt-items-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--soft);
      margin-bottom: 4px;
    }
    .receipt-client strong {
      font-size: 15px;
    }
    .receipt-items {
      list-style: none;
      padding: 0;
      margin: 0 0 14px;
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      background: #fff;
    }
    .receipt-item,
    .receipt-item-empty {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px dashed rgba(24, 50, 71, 0.12);
      font-size: 13px;
    }
    .receipt-item:last-child,
    .receipt-item-empty:last-child {
      border-bottom: 0;
    }
    .receipt-item div { min-width: 0; }
    .receipt-item strong {
      font-size: 14px;
    }
    .receipt-item span {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      color: var(--soft);
    }
    .receipt-summary {
      display: grid;
      gap: 10px;
    }
    .receipt-pill-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .receipt-pill,
    .receipt-total {
      border-radius: 16px;
      border: 1px solid var(--line);
      background: #fff;
      padding: 12px 14px;
    }
    .receipt-pill span,
    .receipt-total span {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--soft);
      margin-bottom: 4px;
    }
    .receipt-pill strong {
      font-size: 14px;
    }
    .receipt-total {
      background: linear-gradient(135deg, rgba(16, 59, 87, 0.96), rgba(45, 111, 155, 0.96));
      color: #fff;
      border: 0;
    }
    .receipt-total span { color: rgba(255,255,255,.74); }
    .receipt-total strong { font-size: 22px; }
    .receipt-footer {
      text-align: center;
      padding-top: 14px;
      margin-top: 14px;
      border-top: 1px solid var(--line);
    }
    .receipt-footer p {
      margin: 0;
      font-size: 12px;
      color: var(--soft);
    }
    .receipt-footer .receipt-thanks {
      color: var(--ink);
      font-weight: 700;
      margin-bottom: 6px;
    }
    .receipt-contact {
      margin-top: 6px !important;
      font-size: 11px !important;
    }
    @media print {
      @page {
        size: auto;
        margin: 8mm;
      }
      html, body {
        background: #fff;
      }
      body {
        padding: 0;
      }
      .receipt-sheet {
        max-width: 80mm;
        width: 80mm;
        border-radius: 0;
        border: 0;
        box-shadow: none;
      }
      .receipt-top {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-total {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <main class="receipt-sheet">
    <section class="receipt-top">
      <div class="receipt-brand">
        <div class="receipt-brand-main">
          ${logoHtml}
          <div>
            <span class="receipt-eyebrow">Comprovante de compra</span>
            <h1 class="receipt-title">${this.escapeHtml(receipt.companyName)}</h1>
            <p class="receipt-subtitle">Resumo da compra do cliente</p>
          </div>
        </div>
        ${mascotHtml}
      </div>
    </section>

    <section class="receipt-body">
      <div class="receipt-orderline">
        <strong>Pedido ${this.escapeHtml(receipt.orderNumber)}</strong>
        <span>${this.escapeHtml(receipt.saleDate)}</span>
      </div>

      <div class="receipt-client">
        <span>Cliente</span>
        <strong>${this.escapeHtml(receipt.clientName)}</strong>
      </div>

      <span class="receipt-items-label">Itens</span>
      <ul class="receipt-items">
        ${itemLines.replace(/sale-receipt-item/g, 'receipt-item').replace(/sale-receipt-empty/g, 'receipt-item-empty')}
      </ul>

      <div class="receipt-summary">
        <div class="receipt-pill-row">
          <div class="receipt-pill">
            <span>Pagamento</span>
            <strong>${this.escapeHtml(receipt.paymentMethod)}</strong>
          </div>
          <div class="receipt-pill">
            <span>Status</span>
            <strong>${this.escapeHtml(receipt.orderStatus)}</strong>
          </div>
        </div>
        <div class="receipt-total">
          <span>Total</span>
          <strong>${app.formatCurrency(receipt.totals.total)}</strong>
        </div>
      </div>

      <footer class="receipt-footer">
        <p class="receipt-thanks">${this.escapeHtml(receipt.footerMessage)}</p>
        ${contactHtml}
      </footer>
    </section>
  </main>
</body>
</html>`;
    },

    printReceipt() {
      this.prepareReceiptPreview(false);

      const receiptHtml = this.buildPrintReceiptHtml();
      const printWindow = window.open('', '_blank', 'width=460,height=820');

      if (!printWindow) {
        const printArea = document.getElementById('print-area');
        if (!printArea) {
          app.showToast('Não foi possível abrir o comprovante para impressão.', 'danger');
          return;
        }

        printArea.classList.remove('hidden');
        printArea.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            printArea.classList.add('hidden');
            printArea.setAttribute('aria-hidden', 'true');
          }, 300);
        }, 120);
        return;
      }

      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();

      let hasPrinted = false;
      const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        printWindow.focus();
        printWindow.print();
      };

      printWindow.onload = triggerPrint;
      setTimeout(triggerPrint, 350);
      printWindow.onafterprint = () => printWindow.close();
    },

    buildWhatsAppReceiptMessage() {
      const receipt = this.getReceiptPayload();
      const items = (receipt.items || []).slice(0, 10).map((item) => {
        const qty = Number(item.quantity || 0);
        return `• ${qty}x ${item.productName} — ${app.formatCurrency(item.total)}`;
      });

      if ((receipt.items || []).length > 10) {
        items.push(`• +${receipt.items.length - 10} item(ns)`);
      }

      return [
        `🐾 *${receipt.companyName}*`,
        '*Comprovante de compra*',
        '',
        `Pedido: ${receipt.orderNumber}`,
        `Data: ${receipt.saleDate}`,
        `Cliente: ${receipt.clientName}`,
        '',
        '*Itens:*',
        items.length ? items.join('\n') : '• Nenhum item informado',
        '',
        `Pagamento: ${receipt.paymentMethod}`,
        `Status: ${receipt.orderStatus}`,
        `Total: ${app.formatCurrency(receipt.totals.total)}`,
        '',
        receipt.footerMessage,
        receipt.showCompanyData && receipt.contactLine ? receipt.contactLine : ''
      ].filter(Boolean).join('\n');
    },

    normalizeWhatsAppPhone(value) {
      let digits = String(value || '').replace(/\D/g, '');
      if (!digits) return '';
      if (digits.startsWith('00')) digits = digits.slice(2);
      if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
      if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
        digits = `55${digits}`;
      }
      return digits;
    },

    sendReceiptToWhatsApp() {
      this.prepareReceiptPreview(false);

      const rawPhone = this.refs.saleClientPhone?.value || '';
      const phone = this.normalizeWhatsAppPhone(rawPhone);

      if (!phone) {
        app.showToast('Informe o telefone do cliente para enviar pelo WhatsApp.', 'warning');
        this.refs.saleClientPhone?.focus();
        return;
      }

      const message = this.buildWhatsAppReceiptMessage();
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.open(url, '_blank', 'noopener,noreferrer');
      app.showToast('WhatsApp aberto com o comprovante pronto para envio.', 'success');
    },

    generateSimpleInvoice() {
      this.prepareReceiptPreview(false);
      app.showToast('Nota simplificada preparada. Use a impressão para gerar o documento.', 'success');
    },

    saleNeedsPixProof(sale) {
      return (
        sale.paymentMethod === 'Pix' &&
        sale.orderStatus !== 'Cancelado' &&
        !sale.pixProof?.name
      );
    },

    findSaleById(id) {
      if (!id) return null;
      return this.getSales().find((sale) => sale.id === id) || null;
    },

    findProduct(id) {
      return this.getProducts().find((product) => product.id === id) || null;
    },

    toNumber(value) {
      return typeof app.toNumber === 'function'
        ? app.toNumber(value)
        : Number(value || 0);
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

  document.addEventListener('DOMContentLoaded', () => SALES_PAGE.init());
  window.HuskySales = SALES_PAGE;
})();
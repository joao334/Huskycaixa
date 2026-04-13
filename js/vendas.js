(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Vendas] HuskyApp não encontrado. Verifique se app.js foi carregado antes de vendas.js.');
    return;
  }

  const SALES_PAGE = {
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
      this.prepareInitialState();
      this.renderAll();
      app.log('Tela de vendas carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('sale-form'),
        saleId: document.getElementById('sale-id'),
        saleCode: document.getElementById('sale-code'),
        saleOrderNumber: document.getElementById('sale-order-number'),
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
      this.refs.btnSaveSale?.addEventListener('click', () => this.handleSaveSale());
      this.refs.btnUpdateSale?.addEventListener('click', () => this.handleSaveSale(true));
      this.refs.btnFinishSale?.addEventListener('click', () => this.handleFinishSale());
      this.refs.btnCancelSale?.addEventListener('click', () => this.handleCancelSale());
      this.refs.btnGenerateReceipt?.addEventListener('click', () => this.prepareReceiptPreview(true));
      this.refs.btnPrintReceipt?.addEventListener('click', () => this.printReceipt());
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
        this.refs.saleDate
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.salesTableBody?.addEventListener('click', (event) => this.handleSalesTableActions(event));
      this.refs.pixPendingSalesTable?.addEventListener('click', (event) => this.handlePixPendingActions(event));
      this.refs.finishedSalesTable?.addEventListener('click', (event) => this.handleFinishedActions(event));
    },

    prepareInitialState() {
      if (!this.getProducts().length) {
        app.showToast('Cadastre produtos para começar a vender.', 'warning');
      }

      this.resetForm(true);
    },

    renderAll() {
      this.renderMetrics();
      this.renderSalesTable();
      this.renderPixPendingTable();
      this.renderFinishedTable();
      this.updateLiveSummary();
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
    },

    getSales() {
      return this.getState().sales || [];
    },

    getProducts() {
      return this.getState().products || [];
    },

    getProofs() {
      return this.getState().proofs || [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    resetForm(keepAutoDefaults = false) {
      this.editingSaleId = null;
      this.pixProofDraft = null;

      if (this.refs.form) this.refs.form.reset();

      this.refs.saleId.value = '';
      this.refs.saleCode.value = app.createId('SALE');
      this.refs.saleOrderNumber.value = app.createOrderNumber('PED');
      this.refs.saleDate.value = keepAutoDefaults ? app.todayISO() : app.todayISO();
      this.refs.saleTime.value = app.currentTimeHHMM();
      this.refs.salePaymentMethod.value = 'Pix';
      this.refs.salePaymentStatus.value = 'Aguardando pagamento';
      this.refs.saleOrderStatus.value = 'Pendente';
      this.refs.saleDiscount.value = '';
      this.refs.saleExtraFee.value = '';
      this.refs.saleShippingFee.value = '';
      this.refs.salePixProofNote.value = '';
      if (this.refs.salePixProof) this.refs.salePixProof.value = '';

      this.refs.saleItemsContainer.innerHTML = '';
      this.renderSaleItemsHeader();
      this.addSaleItemRow();
      this.updatePixProofPreview();
      this.updateModeTag('Novo pedido');
      this.updateLiveSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    renderSaleItemsHeader() {
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
      const row = document.createElement('div');
      row.className = 'sale-item-row';
      row.dataset.rowId = crypto.randomUUID();

      const productsOptions = this.getProducts().map((product) => `
        <option value="${product.id}" ${item?.productId === product.id ? 'selected' : ''}>${product.name}</option>
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

      productSelect.addEventListener('change', () => {
        const product = this.findProduct(productSelect.value);
        if (product && !item?.unitPrice) {
          unitPriceInput.value = product.price || 0;
        }
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      quantityInput.addEventListener('input', () => {
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      unitPriceInput.addEventListener('input', () => {
        this.updateRowTotal(row);
        this.updateLiveSummary();
      });

      removeButton.addEventListener('click', () => {
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
      return Array.from(this.refs.saleItemsContainer.querySelectorAll('.sale-item-row')).filter((row) => !row.classList.contains('sale-item-row-header'));
    },

    updateRowTotal(row) {
      const quantity = app.toNumber(row.querySelector('.sale-item-quantity')?.value || 0);
      const unitPrice = app.toNumber(row.querySelector('.sale-item-unit-price')?.value || 0);
      const total = quantity * unitPrice;
      const totalCell = row.querySelector('.sale-item-total-cell strong');
      if (totalCell) totalCell.textContent = app.formatCurrency(total);
    },

    collectItemsFromForm() {
      return this.getSaleItemRows().map((row) => {
        const productId = row.querySelector('.sale-item-product')?.value || '';
        const quantity = app.toNumber(row.querySelector('.sale-item-quantity')?.value || 0);
        const unitPrice = app.toNumber(row.querySelector('.sale-item-unit-price')?.value || 0);
        const product = this.findProduct(productId);

        return {
          rowId: row.dataset.rowId,
          productId,
          productName: product?.name || 'Produto avulso',
          quantity,
          unitPrice,
          unitCost: app.toNumber(product?.cost || 0),
          total: quantity * unitPrice
        };
      }).filter((item) => item.productId && item.quantity > 0);
    },

    calculateSaleTotals(items) {
      const subtotal = app.sum(items, (item) => item.total);
      const cost = app.sum(items, (item) => item.unitCost * item.quantity);
      const discount = app.toNumber(this.refs.saleDiscount.value || 0);
      const extraFee = app.toNumber(this.refs.saleExtraFee.value || 0);
      const shippingFee = app.toNumber(this.refs.saleShippingFee.value || 0);
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

    updateLiveSummary() {
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const pixProofText = this.pixProofDraft?.name ? 'Enviado' : 'Não enviado';

      this.refs.saleSubtotal.textContent = app.formatCurrency(totals.subtotal);
      this.refs.saleCost.textContent = app.formatCurrency(totals.cost);
      this.refs.saleDiscountTotal.textContent = app.formatCurrency(totals.discount);
      this.refs.saleExtraTotal.textContent = app.formatCurrency(totals.extraFee);
      this.refs.saleShippingTotal.textContent = app.formatCurrency(totals.shippingFee);
      this.refs.saleTotal.textContent = app.formatCurrency(totals.total);
      this.refs.saleProfit.textContent = app.formatCurrency(totals.profit);

      this.refs.summaryPaymentMethod.textContent = this.refs.salePaymentMethod.value || '-';
      this.refs.summaryPaymentStatus.textContent = this.refs.salePaymentStatus.value || '-';
      this.refs.summaryOrderStatus.textContent = this.refs.saleOrderStatus.value || '-';
      this.refs.summaryPixProofStatus.textContent = this.refs.salePaymentMethod.value === 'Pix' ? pixProofText : 'Não obrigatório';

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

      if (!this.refs.saleClientName.value.trim()) {
        app.showToast('Informe o nome do cliente.', 'warning');
        this.refs.saleClientName.focus();
        return false;
      }

      if (!this.refs.saleDate.value) {
        app.showToast('Informe a data da venda.', 'warning');
        return false;
      }

      const previousSale = this.findSaleById(this.editingSaleId);
      const stockCheck = this.checkStockAvailability(items, previousSale);
      if (!stockCheck.ok) {
        app.showToast(stockCheck.message, 'danger');
        return false;
      }

      if (forFinalization && this.refs.salePaymentMethod.value === 'Pix' && !this.pixProofDraft && !previousSale?.pixProof?.name) {
        app.showToast('Para finalizar uma venda em Pix, anexe o comprovante.', 'warning');
        return false;
      }

      return true;
    },

    checkStockAvailability(newItems, previousSale = null) {
      const availableMap = new Map();
      this.getProducts().forEach((product) => {
        availableMap.set(product.id, app.toNumber(product.stock || 0));
      });

      if (previousSale && previousSale.orderStatus !== 'Cancelado') {
        previousSale.items.forEach((item) => {
          availableMap.set(item.productId, (availableMap.get(item.productId) || 0) + app.toNumber(item.quantity || 0));
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

    buildSalePayload(overrides = {}) {
      const existingSale = this.findSaleById(this.editingSaleId);
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const paymentMethod = this.refs.salePaymentMethod.value;
      const paymentStatus = overrides.paymentStatus || this.refs.salePaymentStatus.value;
      const orderStatus = overrides.orderStatus || this.refs.saleOrderStatus.value;
      const now = new Date().toISOString();

      const sale = {
        id: existingSale?.id || this.refs.saleId.value || app.createId('SALE'),
        code: existingSale?.code || this.refs.saleCode.value || app.createId('SALE'),
        orderNumber: this.refs.saleOrderNumber.value || existingSale?.orderNumber || app.createOrderNumber('PED'),
        date: this.refs.saleDate.value,
        time: this.refs.saleTime.value || app.currentTimeHHMM(),
        client: {
          name: this.refs.saleClientName.value.trim(),
          phone: this.refs.saleClientPhone.value.trim(),
          email: this.refs.saleClientEmail.value.trim()
        },
        delivery: {
          type: this.refs.saleDeliveryType.value,
          address: this.refs.saleDeliveryAddress.value.trim()
        },
        paymentMethod,
        paymentStatus,
        orderStatus,
        discount: totals.discount,
        extraFee: totals.extraFee,
        shippingFee: totals.shippingFee,
        notes: this.refs.saleNotes.value.trim(),
        items,
        subtotal: totals.subtotal,
        cost: totals.cost,
        total: totals.total,
        profit: totals.profit,
        pixProof: paymentMethod === 'Pix'
          ? (this.pixProofDraft || existingSale?.pixProof || null)
          : null,
        pixProofNote: this.refs.salePixProofNote.value.trim(),
        updatedAt: now,
        createdAt: existingSale?.createdAt || now,
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };

      return sale;
    },

    handleSaveSale(isUpdate = false) {
      if (!this.validateForm()) return;

      const sale = this.buildSalePayload();
      const previousSale = this.findSaleById(sale.id);
      const nextState = this.applySaleToState(sale, previousSale);
      this.setState(nextState);
      this.syncProofForSale(sale);
      this.renderAll();
      this.updateModeTag('Novo pedido');
      app.showToast(isUpdate || previousSale ? 'Venda atualizada com sucesso.' : 'Venda salva com sucesso.', 'success');
      app.log('Venda salva/atualizada.', { saleId: sale.id, orderNumber: sale.orderNumber });
      this.resetForm();
    },

    handleFinishSale() {
      if (!this.validateForm({ forFinalization: true })) return;

      const sale = this.buildSalePayload({
        paymentStatus: this.refs.salePaymentMethod.value === 'Pix' ? 'Pago' : this.refs.salePaymentStatus.value,
        orderStatus: 'Finalizado'
      });

      const previousSale = this.findSaleById(sale.id);
      const nextState = this.applySaleToState(sale, previousSale);
      this.setState(nextState);
      this.syncProofForSale(sale, true);
      this.renderAll();
      app.showToast('Pedido finalizado com sucesso.', 'success');
      app.log('Pedido finalizado.', { saleId: sale.id, orderNumber: sale.orderNumber });
      this.resetForm();
    },

    handleCancelSale() {
      const saleId = this.editingSaleId || this.refs.saleId.value;
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
      this.syncProofForSale(cancelledSale);
      this.renderAll();
      app.showToast('Pedido cancelado.', 'warning');
      app.log('Pedido cancelado.', { saleId: cancelledSale.id, orderNumber: cancelledSale.orderNumber });
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
            product.stock = app.toNumber(product.stock || 0) + app.toNumber(item.quantity || 0);
          }
        });
      }

      if (sale.orderStatus !== 'Cancelado') {
        sale.items.forEach((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          if (product) {
            product.stock = Math.max(0, app.toNumber(product.stock || 0) - app.toNumber(item.quantity || 0));
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
      return state;
    },

    syncProofForSale(sale, finalize = false) {
      const state = app.getAppState();
      const proofs = [...(state.proofs || [])];
      const index = proofs.findIndex((entry) => entry.relatedSaleId === sale.id);

      if (sale.paymentMethod !== 'Pix' || !sale.pixProof) {
        if (index >= 0) proofs.splice(index, 1);
      } else {
        const payload = {
          id: index >= 0 ? proofs[index].id : crypto.randomUUID(),
          relatedSaleId: sale.id,
          orderNumber: sale.orderNumber,
          clientName: sale.client.name,
          date: sale.date,
          time: sale.time,
          amount: sale.total,
          status: finalize ? 'Vinculado' : (sale.paymentStatus === 'Pago' ? 'Conferido' : 'Pendente de conferência'),
          origin: 'Cliente',
          paymentMethod: sale.paymentMethod,
          fileName: sale.pixProof.name,
          fileType: sale.pixProof.type,
          fileDataUrl: sale.pixProof.dataUrl,
          transactionId: sale.pixProof.transactionId || '',
          note: sale.pixProofNote || sale.pixProof.note || '',
          createdAt: index >= 0 ? proofs[index].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
          proofs[index] = payload;
        } else {
          proofs.unshift(payload);
        }
      }

      state.proofs = proofs;
      app.setAppState(state);
    },

    handlePixProofUpload(event) {
      const file = event.target.files?.[0];
      if (!file) {
        this.pixProofDraft = null;
        this.updatePixProofPreview();
        this.updateLiveSummary();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.pixProofDraft = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString(),
          note: this.refs.salePixProofNote.value.trim(),
          transactionId: ''
        };
        this.updatePixProofPreview();
        this.updateLiveSummary();
        app.showToast('Comprovante anexado com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler o comprovante.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    updatePixProofPreview() {
      const currentProof = this.pixProofDraft || this.findSaleById(this.editingSaleId)?.pixProof || null;
      if (!currentProof) {
        this.refs.salePixProofPreview.innerHTML = '<p>Nenhum comprovante anexado.</p>';
        return;
      }

      const isImage = String(currentProof.type || '').startsWith('image/');
      const sizeKb = currentProof.size ? `${Math.ceil(currentProof.size / 1024)} KB` : '-';

      this.refs.salePixProofPreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${currentProof.name || 'Comprovante Pix'}</strong>
            <p>Tipo: ${currentProof.type || '-'} • Tamanho: ${sizeKb}</p>
            <p>Observação: ${this.escapeHtml(this.refs.salePixProofNote.value.trim() || currentProof.note || 'Sem observação')}</p>
          </div>
          <span class="tag">${isImage ? 'Imagem' : 'Arquivo'}</span>
        </div>
        ${isImage && currentProof.dataUrl ? `<div style="margin-top: 12px;"><img src="${currentProof.dataUrl}" alt="Comprovante Pix" style="max-width: 100%; border-radius: 14px; border: 1px solid #ead9cd;" /></div>` : ''}
      `;
    },

    applyFilters() {
      this.filters.search = this.refs.salesSearch.value.trim();
      this.filters.start = this.refs.salesFilterStart.value;
      this.filters.end = this.refs.salesFilterEnd.value;
      this.filters.payment = this.refs.salesFilterPayment.value;
      this.filters.orderStatus = this.refs.salesFilterOrderStatus.value;
      this.filters.paymentStatus = this.refs.salesFilterPaymentStatus.value;
      this.renderSalesTable();
    },

    clearFilters() {
      this.filters = {
        search: '',
        start: '',
        end: '',
        payment: '',
        orderStatus: '',
        paymentStatus: ''
      };

      this.refs.salesSearch.value = '';
      this.refs.salesFilterStart.value = '';
      this.refs.salesFilterEnd.value = '';
      this.refs.salesFilterPayment.value = '';
      this.refs.salesFilterOrderStatus.value = '';
      this.refs.salesFilterPaymentStatus.value = '';
      this.renderSalesTable();
    },

    getFilteredSales() {
      return this.getSales().filter((sale) => {
        const searchTarget = [
          sale.orderNumber,
          sale.client?.name,
          sale.client?.phone,
          sale.client?.email,
          sale.code,
          sale.notes
        ].join(' ');

        const matchesSearch = !this.filters.search || app.includesText(searchTarget, this.filters.search);
        const matchesStart = !this.filters.start || sale.date >= this.filters.start;
        const matchesEnd = !this.filters.end || sale.date <= this.filters.end;
        const matchesPayment = !this.filters.payment || sale.paymentMethod === this.filters.payment;
        const matchesOrderStatus = !this.filters.orderStatus || sale.orderStatus === this.filters.orderStatus;
        const matchesPaymentStatus = !this.filters.paymentStatus || sale.paymentStatus === this.filters.paymentStatus;

        return matchesSearch && matchesStart && matchesEnd && matchesPayment && matchesOrderStatus && matchesPaymentStatus;
      }).sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    renderMetrics() {
      const today = app.todayISO();
      const sales = this.getSales();
      const todaySales = sales.filter((sale) => sale.date === today && sale.orderStatus !== 'Cancelado');
      const pending = sales.filter((sale) => sale.orderStatus !== 'Finalizado' && sale.orderStatus !== 'Cancelado');
      const finished = sales.filter((sale) => sale.orderStatus === 'Finalizado');
      const pixMissing = sales.filter((sale) => this.saleNeedsPixProof(sale));

      this.refs.salesTodayTotal.textContent = app.formatCurrency(app.sum(todaySales, (sale) => sale.total));
      this.refs.salesPendingCount.textContent = String(pending.length);
      this.refs.salesFinishedCount.textContent = String(finished.length);
      this.refs.salesPixMissingCount.textContent = String(pixMissing.length);
    },

    renderSalesTable() {
      const sales = this.getFilteredSales();

      if (!sales.length) {
        this.refs.salesTableBody.innerHTML = `
          <tr>
            <td colspan="9">Nenhuma venda encontrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.salesTableBody.innerHTML = sales.map((sale) => {
        const hasProof = sale.pixProof?.name ? 'Enviado' : (sale.paymentMethod === 'Pix' ? 'Sem arquivo' : 'N/A');
        return `
          <tr>
            <td>${sale.orderNumber}</td>
            <td>${app.formatDate(sale.date)}</td>
            <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
            <td>${sale.paymentMethod}</td>
            <td>${sale.paymentStatus}</td>
            <td>${sale.orderStatus}</td>
            <td>${app.formatCurrency(sale.total)}</td>
            <td>${hasProof}</td>
            <td>
              <div class="table-action-group">
                <button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">Editar</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="print-sale" data-id="${sale.id}">Imprimir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderPixPendingTable() {
      const pendingPixSales = this.getSales().filter((sale) => this.saleNeedsPixProof(sale)).slice(0, 10);

      if (!pendingPixSales.length) {
        this.refs.pixPendingSalesTable.innerHTML = `
          <tr>
            <td colspan="5">Nenhum pedido aguardando comprovante Pix.</td>
          </tr>
        `;
        return;
      }

      this.refs.pixPendingSalesTable.innerHTML = pendingPixSales.map((sale) => `
        <tr>
          <td>${sale.orderNumber}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total)}</td>
          <td>${sale.paymentStatus}</td>
          <td><button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">Anexar</button></td>
        </tr>
      `).join('');
    },

    renderFinishedTable() {
      const finishedSales = this.getSales().filter((sale) => sale.orderStatus === 'Finalizado').slice(0, 10);

      if (!finishedSales.length) {
        this.refs.finishedSalesTable.innerHTML = `
          <tr>
            <td colspan="5">Nenhum pedido finalizado ainda.</td>
          </tr>
        `;
        return;
      }

      this.refs.finishedSalesTable.innerHTML = finishedSales.map((sale) => `
        <tr>
          <td>${sale.orderNumber}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total)}</td>
          <td>${sale.pixProof?.name ? 'Enviado' : (sale.paymentMethod === 'Pix' ? 'Pendente' : 'N/A')}</td>
          <td><button type="button" class="btn btn-secondary btn-small" data-action="edit-sale" data-id="${sale.id}">Ver</button></td>
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

      if (action === 'print-sale') {
        this.loadSaleIntoForm(saleId, false);
        this.printReceipt();
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

      this.refs.saleId.value = sale.id;
      this.refs.saleCode.value = sale.code || '';
      this.refs.saleOrderNumber.value = sale.orderNumber || '';
      this.refs.saleDate.value = sale.date || app.todayISO();
      this.refs.saleTime.value = sale.time || app.currentTimeHHMM();
      this.refs.saleClientName.value = sale.client?.name || '';
      this.refs.saleClientPhone.value = sale.client?.phone || '';
      this.refs.saleClientEmail.value = sale.client?.email || '';
      this.refs.saleDeliveryType.value = sale.delivery?.type || 'Retirada';
      this.refs.saleDeliveryAddress.value = sale.delivery?.address || '';
      this.refs.salePaymentMethod.value = sale.paymentMethod || 'Pix';
      this.refs.salePaymentStatus.value = sale.paymentStatus || 'Aguardando pagamento';
      this.refs.saleOrderStatus.value = sale.orderStatus || 'Pendente';
      this.refs.saleDiscount.value = sale.discount || '';
      this.refs.saleExtraFee.value = sale.extraFee || '';
      this.refs.saleShippingFee.value = sale.shippingFee || '';
      this.refs.saleNotes.value = sale.notes || '';
      this.refs.salePixProofNote.value = sale.pixProofNote || sale.pixProof?.note || '';
      if (this.refs.salePixProof) this.refs.salePixProof.value = '';

      this.refs.saleItemsContainer.innerHTML = '';
      this.renderSaleItemsHeader();
      (sale.items || []).forEach((item) => this.addSaleItemRow(item));
      this.updateModeTag(`Editando ${sale.orderNumber}`);
      this.updatePixProofPreview();
      this.updateLiveSummary();

      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    prepareReceiptPreview(showToast = false) {
      const items = this.collectItemsFromForm();
      const totals = this.calculateSaleTotals(items);
      const orderNumber = this.refs.saleOrderNumber.value || 'PED-0000';
      const clientName = this.refs.saleClientName.value.trim() || 'Consumidor final';
      const saleDate = this.refs.saleDate.value ? app.formatDate(this.refs.saleDate.value) : app.formatDate(app.todayISO());
      const paymentMethod = this.refs.salePaymentMethod.value || 'Pix';
      const orderStatus = this.refs.saleOrderStatus.value || 'Pendente';

      this.refs.receiptNumber.textContent = orderNumber;
      this.refs.receiptDate.textContent = saleDate;
      this.refs.receiptClient.textContent = clientName;
      this.refs.receiptItemsBody.innerHTML = items.length
        ? items.map((item) => `
            <tr>
              <td>${this.escapeHtml(item.productName)}</td>
              <td>${item.quantity}</td>
              <td>${app.formatCurrency(item.total)}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="3">Nenhum item adicionado.</td></tr>';
      this.refs.receiptTotal.textContent = app.formatCurrency(totals.total);
      this.refs.receiptPayment.textContent = paymentMethod;
      this.refs.receiptStatus.textContent = orderStatus;

      this.refs.printNumber.textContent = orderNumber;
      this.refs.printDate.textContent = saleDate;
      this.refs.printClient.textContent = clientName;
      this.refs.printItems.innerHTML = items.length
        ? items.map((item) => `
            <tr>
              <td>${this.escapeHtml(item.productName)}</td>
              <td>${item.quantity}</td>
              <td>${app.formatCurrency(item.unitPrice)}</td>
              <td>${app.formatCurrency(item.total)}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="4">Nenhum item adicionado.</td></tr>';
      this.refs.printSubtotal.textContent = app.formatCurrency(totals.subtotal);
      this.refs.printDiscountTotal.textContent = app.formatCurrency(totals.discount);
      this.refs.printShippingTotal.textContent = app.formatCurrency(totals.shippingFee);
      this.refs.printTotal.textContent = app.formatCurrency(totals.total);
      this.refs.printPayment.textContent = paymentMethod;

      if (showToast) {
        app.showToast('Pré-visualização do comprovante atualizada.', 'success');
      }
    },

    printReceipt() {
      this.prepareReceiptPreview(false);
      window.print();
      app.log('Comprovante enviado para impressão.', {
        orderNumber: this.refs.saleOrderNumber.value || null
      });
    },

    generateSimpleInvoice() {
      this.prepareReceiptPreview(false);
      app.showToast('Nota simplificada preparada. Use a impressão para gerar o documento.', 'success');
    },

    saleNeedsPixProof(sale) {
      return sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado' && !sale.pixProof?.name;
    },

    findSaleById(id) {
      if (!id) return null;
      return this.getSales().find((sale) => sale.id === id) || null;
    },

    findProduct(id) {
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

  document.addEventListener('DOMContentLoaded', () => SALES_PAGE.init());
  window.HuskySales = SALES_PAGE;
})();

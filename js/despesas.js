(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Despesas] HuskyApp não encontrado. Verifique se app.js foi carregado antes de despesas.js.');
    return;
  }

  const EXPENSES_PAGE = {
    refs: {},
    filters: {
      search: '',
      start: '',
      end: '',
      category: '',
      status: '',
      payment: ''
    },
    editingExpenseId: null,
    attachmentDraft: null,

    init() {
      if (!document.getElementById('expense-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.prepareInitialState();
      this.renderAll();
      app.log('Tela de despesas carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('expense-form'),
        expenseId: document.getElementById('expense-id'),
        expenseDate: document.getElementById('expense-date'),
        expenseTime: document.getElementById('expense-time'),
        expenseStatus: document.getElementById('expense-status'),
        expenseTitle: document.getElementById('expense-title'),
        expenseCategory: document.getElementById('expense-category'),
        expenseValue: document.getElementById('expense-value'),
        expensePaymentMethod: document.getElementById('expense-payment-method'),
        expenseDueDate: document.getElementById('expense-due-date'),
        expenseInstallments: document.getElementById('expense-installments'),
        expenseSupplier: document.getElementById('expense-supplier'),
        expenseReference: document.getElementById('expense-reference'),
        expenseNote: document.getElementById('expense-note'),
        expenseAttachment: document.getElementById('expense-attachment'),
        expenseRelatedProduct: document.getElementById('expense-related-product'),
        expenseAffectsProfit: document.getElementById('expense-affects-profit'),
        expenseRepeatMonthly: document.getElementById('expense-repeat-monthly'),
        expenseAttachmentPreview: document.getElementById('expense-attachment-preview'),

        expenseModeTag: document.getElementById('expense-mode-tag'),
        btnSaveExpense: document.getElementById('btn-save-expense'),
        btnUpdateExpense: document.getElementById('btn-update-expense'),
        btnDeleteExpense: document.getElementById('btn-delete-expense'),
        btnNewExpenseTop: document.getElementById('btn-new-expense-top'),
        btnNewExpenseHero: document.getElementById('btn-new-expense-hero'),

        expensesDayTotal: document.getElementById('expenses-day-total'),
        expensesMonthTotal: document.getElementById('expenses-month-total'),
        expensesTopCategory: document.getElementById('expenses-top-category'),
        expensesLossTotal: document.getElementById('expenses-loss-total'),

        expenseSummaryValue: document.getElementById('expense-summary-value'),
        expenseSummaryCategory: document.getElementById('expense-summary-category'),
        expenseSummaryStatus: document.getElementById('expense-summary-status'),
        expenseSummaryPayment: document.getElementById('expense-summary-payment'),
        expenseSummaryProfitImpact: document.getElementById('expense-summary-profit-impact'),

        expenseStatusSupplier: document.getElementById('expense-status-supplier'),
        expenseStatusDueDate: document.getElementById('expense-status-due-date'),
        expenseStatusInstallments: document.getElementById('expense-status-installments'),
        expenseStatusAttachment: document.getElementById('expense-status-attachment'),

        expenseAlertList: document.getElementById('expense-alert-list'),

        expensesSearch: document.getElementById('expenses-search'),
        expensesFilterStart: document.getElementById('expenses-filter-start'),
        expensesFilterEnd: document.getElementById('expenses-filter-end'),
        expensesFilterCategory: document.getElementById('expenses-filter-category'),
        expensesFilterStatus: document.getElementById('expenses-filter-status'),
        expensesFilterPayment: document.getElementById('expenses-filter-payment'),
        btnFilterExpenses: document.getElementById('btn-filter-expenses'),
        btnClearExpensesFilter: document.getElementById('btn-clear-expenses-filter'),

        expensesTableBody: document.getElementById('expenses-table-body'),
        recurringExpensesTableBody: document.getElementById('recurring-expenses-table-body'),
        lossExpensesTableBody: document.getElementById('loss-expenses-table-body'),
        expensesAttachmentsPreviewList: document.getElementById('expenses-attachments-preview-list')
      };
    },

    bindEvents() {
      this.refs.btnSaveExpense?.addEventListener('click', () => this.handleSaveExpense());
      this.refs.btnUpdateExpense?.addEventListener('click', () => this.handleSaveExpense(true));
      this.refs.btnDeleteExpense?.addEventListener('click', () => this.handleDeleteExpense());
      this.refs.btnNewExpenseTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewExpenseHero?.addEventListener('click', () => this.resetForm());
      this.refs.expenseAttachment?.addEventListener('change', (event) => this.handleAttachmentUpload(event));

      [
        this.refs.expenseStatus,
        this.refs.expenseTitle,
        this.refs.expenseCategory,
        this.refs.expenseValue,
        this.refs.expensePaymentMethod,
        this.refs.expenseDueDate,
        this.refs.expenseInstallments,
        this.refs.expenseSupplier,
        this.refs.expenseReference,
        this.refs.expenseAffectsProfit,
        this.refs.expenseRepeatMonthly
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.btnFilterExpenses?.addEventListener('click', () => this.applyFilters());
      this.refs.btnClearExpensesFilter?.addEventListener('click', () => this.clearFilters());
      this.refs.expensesTableBody?.addEventListener('click', (event) => this.handleTableActions(event));
    },

    prepareInitialState() {
      this.populateProductSelect();
      this.resetForm(true);
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
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

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    resetForm(skipScroll = false) {
      this.editingExpenseId = null;
      this.attachmentDraft = null;

      if (this.refs.form) this.refs.form.reset();

      this.refs.expenseId.value = '';
      this.refs.expenseDate.value = app.todayISO();
      this.refs.expenseTime.value = app.currentTimeHHMM();
      this.refs.expenseStatus.value = 'Pago';
      this.refs.expenseCategory.value = 'Compras';
      this.refs.expensePaymentMethod.value = 'Pix';
      this.refs.expenseInstallments.value = 1;
      this.refs.expenseDueDate.value = app.todayISO();
      this.refs.expenseRelatedProduct.value = '';
      this.refs.expenseAffectsProfit.checked = true;
      this.refs.expenseRepeatMonthly.checked = false;
      if (this.refs.expenseAttachment) this.refs.expenseAttachment.value = '';

      this.updateModeTag('Novo lançamento');
      this.updateAttachmentPreview();
      this.updateLiveSummary();

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    updateModeTag(label) {
      if (this.refs.expenseModeTag) this.refs.expenseModeTag.textContent = label;
    },

    populateProductSelect() {
      const products = [...this.getProducts()].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
      this.refs.expenseRelatedProduct.innerHTML = `
        <option value="">Nenhum</option>
        ${products.map((product) => `<option value="${product.id}">${this.escapeHtml(product.name)} • ${this.escapeHtml(product.code || '-')}</option>`).join('')}
      `;
    },

    validateForm() {
      const title = this.refs.expenseTitle.value.trim();
      const value = app.toNumber(this.refs.expenseValue.value || 0);
      const installments = app.toNumber(this.refs.expenseInstallments.value || 1);

      if (!title) {
        app.showToast('Informe a descrição da despesa.', 'warning');
        this.refs.expenseTitle.focus();
        return false;
      }

      if (!this.refs.expenseDate.value) {
        app.showToast('Informe a data da despesa.', 'warning');
        return false;
      }

      if (value <= 0) {
        app.showToast('Informe um valor válido para a despesa.', 'warning');
        this.refs.expenseValue.focus();
        return false;
      }

      if (installments <= 0) {
        app.showToast('Informe uma quantidade válida de parcelas.', 'warning');
        this.refs.expenseInstallments.focus();
        return false;
      }

      return true;
    },

    buildExpensePayload() {
      const existing = this.findExpenseById(this.editingExpenseId);
      const now = new Date().toISOString();

      return {
        id: existing?.id || this.refs.expenseId.value || crypto.randomUUID(),
        relatedMovementId: existing?.relatedMovementId || null,
        date: this.refs.expenseDate.value,
        time: this.refs.expenseTime.value || app.currentTimeHHMM(),
        status: this.refs.expenseStatus.value,
        description: this.refs.expenseTitle.value.trim(),
        category: this.refs.expenseCategory.value,
        value: app.toNumber(this.refs.expenseValue.value || 0),
        paymentMethod: this.refs.expensePaymentMethod.value,
        dueDate: this.refs.expenseDueDate.value || this.refs.expenseDate.value,
        installments: Math.max(1, app.toNumber(this.refs.expenseInstallments.value || 1)),
        supplier: this.refs.expenseSupplier.value.trim(),
        reference: this.refs.expenseReference.value.trim(),
        note: this.refs.expenseNote.value.trim(),
        attachment: this.attachmentDraft || existing?.attachment || null,
        relatedProductId: this.refs.expenseRelatedProduct.value || '',
        affectsProfit: Boolean(this.refs.expenseAffectsProfit.checked),
        recurring: Boolean(this.refs.expenseRepeatMonthly.checked),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        createdBy: existing?.createdBy || this.getCurrentUser().email || 'admin@husky.com',
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    handleSaveExpense(isUpdate = false) {
      if (!this.validateForm()) return;

      const expense = this.buildExpensePayload();
      const state = this.getState();
      state.expenses = app.upsertItem(state.expenses || [], expense, 'id');
      this.setState(state);
      this.renderAll();
      app.showToast(isUpdate || this.editingExpenseId ? 'Despesa atualizada com sucesso.' : 'Despesa salva com sucesso.', 'success');
      app.log('Despesa salva/atualizada.', { expenseId: expense.id, category: expense.category, value: expense.value });
      this.resetForm();
    },

    handleDeleteExpense() {
      const expense = this.findExpenseById(this.editingExpenseId || this.refs.expenseId.value);
      if (!expense) {
        app.showToast('Selecione uma despesa para excluir.', 'warning');
        return;
      }

      if (expense.relatedMovementId) {
        app.showToast('Esta despesa foi gerada automaticamente pelo estoque. Exclua a movimentação correspondente para removê-la.', 'warning');
        return;
      }

      const confirmed = app.confirmAction(`Deseja excluir a despesa "${expense.description}"?`);
      if (!confirmed) return;

      const state = this.getState();
      state.expenses = app.removeById(state.expenses || [], expense.id);
      this.setState(state);
      this.renderAll();
      app.showToast('Despesa excluída com sucesso.', 'success');
      app.log('Despesa excluída.', { expenseId: expense.id, description: expense.description });
      this.resetForm();
    },

    handleAttachmentUpload(event) {
      const file = event.target.files?.[0];
      if (!file) {
        this.attachmentDraft = null;
        this.updateAttachmentPreview();
        this.updateLiveSummary();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.attachmentDraft = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString()
        };
        this.updateAttachmentPreview();
        this.updateLiveSummary();
        app.showToast('Anexo carregado com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler o anexo.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    updateAttachmentPreview() {
      const attachment = this.attachmentDraft || this.findExpenseById(this.editingExpenseId)?.attachment || null;

      if (!attachment) {
        this.refs.expenseAttachmentPreview.innerHTML = '<p>Nenhum anexo enviado.</p>';
        return;
      }

      const isImage = String(attachment.type || '').startsWith('image/');
      const sizeKb = attachment.size ? `${Math.ceil(attachment.size / 1024)} KB` : '-';

      this.refs.expenseAttachmentPreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(attachment.name || 'Anexo')}</strong>
            <p>Tipo: ${this.escapeHtml(attachment.type || '-')} • Tamanho: ${sizeKb}</p>
          </div>
          <span class="tag">${isImage ? 'Imagem' : 'Arquivo'}</span>
        </div>
        ${isImage && attachment.dataUrl ? `<div style="margin-top: 12px;"><img src="${attachment.dataUrl}" alt="Anexo da despesa" style="max-width: 100%; border-radius: 14px; border: 1px solid #ead9cd;" /></div>` : ''}
      `;
    },

    updateLiveSummary() {
      const value = app.toNumber(this.refs.expenseValue.value || 0);
      const category = this.refs.expenseCategory.value || '-';
      const status = this.refs.expenseStatus.value || 'Pago';
      const payment = this.refs.expensePaymentMethod.value || 'Pix';
      const dueDate = this.refs.expenseDueDate.value ? app.formatDate(this.refs.expenseDueDate.value) : '-';
      const installments = Math.max(1, app.toNumber(this.refs.expenseInstallments.value || 1));
      const supplier = this.refs.expenseSupplier.value.trim() || '-';
      const hasAttachment = Boolean(this.attachmentDraft || this.findExpenseById(this.editingExpenseId)?.attachment);
      const affectsProfit = this.refs.expenseAffectsProfit.checked ? 'Sim' : 'Não';

      this.refs.expenseSummaryValue.textContent = app.formatCurrency(value);
      this.refs.expenseSummaryCategory.textContent = category;
      this.refs.expenseSummaryStatus.textContent = status;
      this.refs.expenseSummaryPayment.textContent = payment;
      this.refs.expenseSummaryProfitImpact.textContent = affectsProfit;

      this.refs.expenseStatusSupplier.textContent = supplier;
      this.refs.expenseStatusDueDate.textContent = dueDate;
      this.refs.expenseStatusInstallments.textContent = String(installments);
      this.refs.expenseStatusAttachment.textContent = hasAttachment ? 'Enviado' : 'Não enviado';
    },

    applyFilters() {
      this.filters.search = this.refs.expensesSearch.value.trim();
      this.filters.start = this.refs.expensesFilterStart.value;
      this.filters.end = this.refs.expensesFilterEnd.value;
      this.filters.category = this.refs.expensesFilterCategory.value;
      this.filters.status = this.refs.expensesFilterStatus.value;
      this.filters.payment = this.refs.expensesFilterPayment.value;
      this.renderExpensesTable();
    },

    clearFilters() {
      this.filters = {
        search: '',
        start: '',
        end: '',
        category: '',
        status: '',
        payment: ''
      };

      this.refs.expensesSearch.value = '';
      this.refs.expensesFilterStart.value = '';
      this.refs.expensesFilterEnd.value = '';
      this.refs.expensesFilterCategory.value = '';
      this.refs.expensesFilterStatus.value = '';
      this.refs.expensesFilterPayment.value = '';
      this.renderExpensesTable();
    },

    getFilteredExpenses() {
      return this.getExpenses().filter((expense) => {
        const haystack = [
          expense.description,
          expense.supplier,
          expense.reference,
          expense.note,
          expense.category
        ].join(' ');

        const matchesSearch = !this.filters.search || app.includesText(haystack, this.filters.search);
        const matchesStart = !this.filters.start || expense.date >= this.filters.start;
        const matchesEnd = !this.filters.end || expense.date <= this.filters.end;
        const matchesCategory = !this.filters.category || expense.category === this.filters.category;
        const matchesStatus = !this.filters.status || expense.status === this.filters.status;
        const matchesPayment = !this.filters.payment || expense.paymentMethod === this.filters.payment;

        return matchesSearch && matchesStart && matchesEnd && matchesCategory && matchesStatus && matchesPayment;
      }).sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    renderAll() {
      this.populateProductSelect();
      this.renderMetrics();
      this.renderAlerts();
      this.renderExpensesTable();
      this.renderRecurringExpenses();
      this.renderLossExpenses();
      this.renderAttachmentsPreview();
      this.updateLiveSummary();
    },

    renderMetrics() {
      const today = app.todayISO();
      const currentMonth = today.slice(0, 7);
      const expenses = this.getExpenses();
      const todayExpenses = expenses.filter((expense) => expense.date === today && expense.status !== 'Cancelado');
      const monthExpenses = expenses.filter((expense) => expense.date?.startsWith(currentMonth) && expense.status !== 'Cancelado');
      const categoryMap = {};

      monthExpenses.forEach((expense) => {
        categoryMap[expense.category] = (categoryMap[expense.category] || 0) + app.toNumber(expense.value || 0);
      });

      const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
      const lossTotal = this.calculateLossExpensesTotal();

      this.refs.expensesDayTotal.textContent = app.formatCurrency(app.sum(todayExpenses, (expense) => expense.value || 0));
      this.refs.expensesMonthTotal.textContent = app.formatCurrency(app.sum(monthExpenses, (expense) => expense.value || 0));
      this.refs.expensesTopCategory.textContent = topCategory ? `${topCategory[0]} • ${app.formatCurrency(topCategory[1])}` : '-';
      this.refs.expensesLossTotal.textContent = app.formatCurrency(lossTotal);
    },

    calculateLossExpensesTotal() {
      const movements = this.getStockMovements();
      const lossMovementIds = new Set(movements.filter((movement) => movement.type === 'perda').map((movement) => movement.id));
      return app.sum(this.getExpenses().filter((expense) => expense.category === 'Perda de material' || lossMovementIds.has(expense.relatedMovementId)), (expense) => expense.value || 0);
    },

    renderAlerts() {
      const today = app.todayISO();
      const pending = this.getExpenses().filter((expense) => expense.status === 'Pendente' || expense.status === 'Parcelado');
      const overdue = pending.filter((expense) => expense.dueDate && expense.dueDate < today);

      if (!pending.length && !overdue.length) {
        this.refs.expenseAlertList.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Nenhum alerta crítico</strong>
              <p>Despesas vencidas ou pendentes aparecerão aqui.</p>
            </div>
            <span class="tag">OK</span>
          </div>
        `;
        return;
      }

      const cards = [];

      overdue.slice(0, 3).forEach((expense) => {
        cards.push(`
          <div class="pix-proof-card">
            <div>
              <strong>${this.escapeHtml(expense.description)}</strong>
              <p>Venceu em ${app.formatDate(expense.dueDate)} • ${app.formatCurrency(expense.value || 0)}</p>
            </div>
            <span class="tag">Vencida</span>
          </div>
        `);
      });

      if (!cards.length) {
        pending.slice(0, 3).forEach((expense) => {
          cards.push(`
            <div class="pix-proof-card">
              <div>
                <strong>${this.escapeHtml(expense.description)}</strong>
                <p>Status ${this.escapeHtml(expense.status)} • ${app.formatCurrency(expense.value || 0)}</p>
              </div>
              <span class="tag">Pendente</span>
            </div>
          `);
        });
      }

      this.refs.expenseAlertList.innerHTML = cards.join('');
    },

    renderExpensesTable() {
      const expenses = this.getFilteredExpenses();

      if (!expenses.length) {
        this.refs.expensesTableBody.innerHTML = `
          <tr>
            <td colspan="9">Nenhuma despesa encontrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.expensesTableBody.innerHTML = expenses.map((expense) => `
        <tr>
          <td>${app.formatDate(expense.date)}</td>
          <td>${this.escapeHtml(expense.description)}</td>
          <td>${this.escapeHtml(expense.category || '-')}</td>
          <td>${this.escapeHtml(expense.supplier || '-')}</td>
          <td>${this.escapeHtml(expense.paymentMethod || '-')}</td>
          <td>${this.escapeHtml(expense.status || '-')}</td>
          <td>${app.formatCurrency(expense.value || 0)}</td>
          <td>${expense.attachment?.name ? 'Sim' : 'Não'}</td>
          <td>
            <div class="table-action-group">
              <button type="button" class="btn btn-secondary btn-small" data-action="edit-expense" data-id="${expense.id}">Editar</button>
              <button type="button" class="btn btn-secondary btn-small" data-action="view-expense" data-id="${expense.id}">Ver</button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    renderRecurringExpenses() {
      const recurring = this.getExpenses().filter((expense) => expense.recurring).sort((a, b) => app.toNumber(b.value || 0) - app.toNumber(a.value || 0));

      if (!recurring.length) {
        this.refs.recurringExpensesTableBody.innerHTML = `
          <tr>
            <td colspan="4">Nenhuma despesa recorrente cadastrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.recurringExpensesTableBody.innerHTML = recurring.map((expense) => `
        <tr>
          <td>${this.escapeHtml(expense.description)}</td>
          <td>${this.escapeHtml(expense.category || '-')}</td>
          <td>${app.formatCurrency(expense.value || 0)}</td>
          <td>${expense.dueDate ? app.formatDate(expense.dueDate) : '-'}</td>
        </tr>
      `).join('');
    },

    renderLossExpenses() {
      const movements = this.getStockMovements();
      const lossMovementIds = new Set(movements.filter((movement) => movement.type === 'perda').map((movement) => movement.id));
      const lossExpenses = this.getExpenses()
        .filter((expense) => expense.category === 'Perda de material' || lossMovementIds.has(expense.relatedMovementId))
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`))
        .slice(0, 10);

      if (!lossExpenses.length) {
        this.refs.lossExpensesTableBody.innerHTML = `
          <tr>
            <td colspan="4">Nenhuma perda registrada.</td>
          </tr>
        `;
        return;
      }

      this.refs.lossExpensesTableBody.innerHTML = lossExpenses.map((expense) => {
        const relatedMovement = movements.find((movement) => movement.id === expense.relatedMovementId);
        const productName = relatedMovement?.productName || this.findProductById(expense.relatedProductId)?.name || 'Item não vinculado';
        const reason = relatedMovement?.reason || expense.note || expense.description;

        return `
          <tr>
            <td>${app.formatDate(expense.date)}</td>
            <td>${this.escapeHtml(productName)}</td>
            <td>${this.escapeHtml(reason || '-')}</td>
            <td>${app.formatCurrency(expense.value || 0)}</td>
          </tr>
        `;
      }).join('');
    },

    renderAttachmentsPreview() {
      const withAttachments = this.getExpenses().filter((expense) => expense.attachment?.name).sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`)).slice(0, 6);

      if (!withAttachments.length) {
        this.refs.expensesAttachmentsPreviewList.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Nenhum anexo recente</strong>
              <p>Os comprovantes das despesas aparecerão aqui.</p>
            </div>
            <span class="tag">Sem arquivo</span>
          </div>
        `;
        return;
      }

      this.refs.expensesAttachmentsPreviewList.innerHTML = withAttachments.map((expense) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(expense.description)}</strong>
            <p>${this.escapeHtml(expense.supplier || 'Sem fornecedor')} • ${this.escapeHtml(expense.paymentMethod || '-')}</p>
          </div>
          <span class="tag">${this.escapeHtml(expense.attachment?.name || 'Arquivo')}</span>
        </div>
      `).join('');
    },

    handleTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const expenseId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-expense' || action === 'view-expense') {
        this.loadExpenseIntoForm(expenseId, true);
      }
    },

    loadExpenseIntoForm(expenseId, scrollToTop = true) {
      const expense = this.findExpenseById(expenseId);
      if (!expense) {
        app.showToast('Despesa não encontrada.', 'danger');
        return;
      }

      this.editingExpenseId = expense.id;
      this.attachmentDraft = expense.attachment || null;

      this.refs.expenseId.value = expense.id;
      this.refs.expenseDate.value = expense.date || app.todayISO();
      this.refs.expenseTime.value = expense.time || app.currentTimeHHMM();
      this.refs.expenseStatus.value = expense.status || 'Pago';
      this.refs.expenseTitle.value = expense.description || '';
      this.refs.expenseCategory.value = expense.category || 'Compras';
      this.refs.expenseValue.value = expense.value || '';
      this.refs.expensePaymentMethod.value = expense.paymentMethod || 'Pix';
      this.refs.expenseDueDate.value = expense.dueDate || expense.date || app.todayISO();
      this.refs.expenseInstallments.value = expense.installments || 1;
      this.refs.expenseSupplier.value = expense.supplier || '';
      this.refs.expenseReference.value = expense.reference || '';
      this.refs.expenseNote.value = expense.note || '';
      this.refs.expenseRelatedProduct.value = expense.relatedProductId || '';
      this.refs.expenseAffectsProfit.checked = Boolean(expense.affectsProfit ?? true);
      this.refs.expenseRepeatMonthly.checked = Boolean(expense.recurring);
      if (this.refs.expenseAttachment) this.refs.expenseAttachment.value = '';

      this.updateModeTag(`Editando despesa`);
      this.updateAttachmentPreview();
      this.updateLiveSummary();

      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    findExpenseById(id) {
      if (!id) return null;
      return this.getExpenses().find((expense) => expense.id === id) || null;
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

  document.addEventListener('DOMContentLoaded', () => EXPENSES_PAGE.init());
  window.HuskyExpenses = EXPENSES_PAGE;
})();
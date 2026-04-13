(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Comprovantes] HuskyApp não encontrado. Verifique se app.js foi carregado antes de comprovantes.js.');
    return;
  }

  const PROOFS_PAGE = {
    refs: {},
    filters: {
      search: '',
      start: '',
      end: '',
      status: '',
      origin: ''
    },
    editingProofId: null,
    fileDraft: null,

    init() {
      if (!document.getElementById('proof-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.prepareInitialState();
      this.renderAll();
      app.log('Tela de comprovantes carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('proof-form'),
        proofId: document.getElementById('proof-id'),
        proofDate: document.getElementById('proof-date'),
        proofTime: document.getElementById('proof-time'),
        proofStatus: document.getElementById('proof-status'),
        proofOrderNumber: document.getElementById('proof-order-number'),
        proofClientName: document.getElementById('proof-client-name'),
        proofPaymentMethod: document.getElementById('proof-payment-method'),
        proofAmount: document.getElementById('proof-amount'),
        proofOrigin: document.getElementById('proof-origin'),
        proofFile: document.getElementById('proof-file'),
        proofTransactionId: document.getElementById('proof-transaction-id'),
        proofNote: document.getElementById('proof-note'),
        proofMarkOrderPaid: document.getElementById('proof-mark-order-paid'),
        proofFinishOrderWhenValid: document.getElementById('proof-finish-order-when-valid'),

        proofModeTag: document.getElementById('proof-mode-tag'),
        proofFilePreview: document.getElementById('proof-file-preview'),
        proofDocumentViewer: document.getElementById('proof-document-viewer'),

        btnSaveProof: document.getElementById('btn-save-proof'),
        btnUpdateProof: document.getElementById('btn-update-proof'),
        btnDeleteProof: document.getElementById('btn-delete-proof'),
        btnNewProofTop: document.getElementById('btn-new-proof-top'),
        btnNewProofHero: document.getElementById('btn-new-proof-hero'),

        proofsTotalCount: document.getElementById('proofs-total-count'),
        proofsPendingCount: document.getElementById('proofs-pending-count'),
        proofsMissingCount: document.getElementById('proofs-missing-count'),
        proofsFinishedPixCount: document.getElementById('proofs-finished-pix-count'),

        proofSummaryOrder: document.getElementById('proof-summary-order'),
        proofSummaryClient: document.getElementById('proof-summary-client'),
        proofSummaryAmount: document.getElementById('proof-summary-amount'),
        proofSummaryStatus: document.getElementById('proof-summary-status'),
        proofSummaryOrigin: document.getElementById('proof-summary-origin'),

        proofOrderPaymentStatus: document.getElementById('proof-order-payment-status'),
        proofOrderStatus: document.getElementById('proof-order-status'),
        proofFileStatus: document.getElementById('proof-file-status'),
        proofValidationStatus: document.getElementById('proof-validation-status'),

        proofsSearch: document.getElementById('proofs-search'),
        proofsFilterStart: document.getElementById('proofs-filter-start'),
        proofsFilterEnd: document.getElementById('proofs-filter-end'),
        proofsFilterStatus: document.getElementById('proofs-filter-status'),
        proofsFilterOrigin: document.getElementById('proofs-filter-origin'),
        btnFilterProofs: document.getElementById('btn-filter-proofs'),
        btnClearProofsFilter: document.getElementById('btn-clear-proofs-filter'),

        proofsTableBody: document.getElementById('proofs-table-body'),
        proofsMissingTableBody: document.getElementById('proofs-missing-table-body'),
        validatedProofsList: document.getElementById('validated-proofs-list'),
        finishedProofsTableBody: document.getElementById('finished-proofs-table-body'),
        proofsLogList: document.getElementById('proofs-log-list')
      };
    },

    bindEvents() {
      this.refs.btnSaveProof?.addEventListener('click', () => this.handleSaveProof());
      this.refs.btnUpdateProof?.addEventListener('click', () => this.handleSaveProof(true));
      this.refs.btnDeleteProof?.addEventListener('click', () => this.handleDeleteProof());
      this.refs.btnNewProofTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewProofHero?.addEventListener('click', () => this.resetForm());
      this.refs.proofFile?.addEventListener('change', (event) => this.handleFileUpload(event));
      this.refs.proofOrderNumber?.addEventListener('change', () => this.onOrderChange());

      [
        this.refs.proofStatus,
        this.refs.proofClientName,
        this.refs.proofPaymentMethod,
        this.refs.proofAmount,
        this.refs.proofOrigin,
        this.refs.proofTransactionId,
        this.refs.proofMarkOrderPaid,
        this.refs.proofFinishOrderWhenValid
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.btnFilterProofs?.addEventListener('click', () => this.applyFilters());
      this.refs.btnClearProofsFilter?.addEventListener('click', () => this.clearFilters());
      this.refs.proofsTableBody?.addEventListener('click', (event) => this.handleProofsTableActions(event));
      this.refs.proofsMissingTableBody?.addEventListener('click', (event) => this.handleMissingTableActions(event));
      this.refs.finishedProofsTableBody?.addEventListener('click', (event) => this.handleFinishedTableActions(event));
    },

    prepareInitialState() {
      this.populateOrderSelect();
      this.resetForm(true);
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
    },

    getProofs() {
      return this.getState().proofs || [];
    },

    getSales() {
      return this.getState().sales || [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    resetForm(skipScroll = false) {
      this.editingProofId = null;
      this.fileDraft = null;

      if (this.refs.form) this.refs.form.reset();

      this.refs.proofId.value = '';
      this.refs.proofDate.value = app.todayISO();
      this.refs.proofTime.value = app.currentTimeHHMM();
      this.refs.proofStatus.value = 'Pendente de conferência';
      this.refs.proofPaymentMethod.value = 'Pix';
      this.refs.proofOrigin.value = 'Cliente';
      this.refs.proofAmount.value = '';
      this.refs.proofOrderNumber.value = '';
      this.refs.proofClientName.value = '';
      this.refs.proofTransactionId.value = '';
      this.refs.proofNote.value = '';
      this.refs.proofMarkOrderPaid.checked = true;
      this.refs.proofFinishOrderWhenValid.checked = false;
      if (this.refs.proofFile) this.refs.proofFile.value = '';

      this.updateModeTag('Novo envio');
      this.updateFilePreview();
      this.updateDocumentViewer();
      this.updateLiveSummary();

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    updateModeTag(label) {
      if (this.refs.proofModeTag) this.refs.proofModeTag.textContent = label;
    },

    populateOrderSelect() {
      const pixSales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado')
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());

      this.refs.proofOrderNumber.innerHTML = `
        <option value="">Selecione o pedido</option>
        ${pixSales.map((sale) => `<option value="${sale.id}">${this.escapeHtml(sale.orderNumber)} • ${this.escapeHtml(sale.client?.name || 'Consumidor final')}</option>`).join('')}
      `;
    },

    onOrderChange() {
      const sale = this.findSaleById(this.refs.proofOrderNumber.value);
      if (!sale) {
        this.refs.proofClientName.value = '';
        this.refs.proofAmount.value = '';
        this.refs.proofPaymentMethod.value = 'Pix';
        this.updateLiveSummary();
        return;
      }

      this.refs.proofClientName.value = sale.client?.name || '';
      this.refs.proofPaymentMethod.value = sale.paymentMethod || 'Pix';
      this.refs.proofAmount.value = app.toNumber(sale.total || 0);
      this.refs.proofDate.value = sale.date || app.todayISO();
      this.updateLiveSummary();
    },

    validateForm() {
      const sale = this.findSaleById(this.refs.proofOrderNumber.value);
      const amount = app.toNumber(this.refs.proofAmount.value || 0);
      const proofFile = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!sale) {
        app.showToast('Selecione um pedido para vincular o comprovante.', 'warning');
        this.refs.proofOrderNumber.focus();
        return false;
      }

      if (sale.paymentMethod !== 'Pix' && this.refs.proofPaymentMethod.value === 'Pix') {
        app.showToast('O pedido selecionado não está como Pix.', 'warning');
        return false;
      }

      if (amount <= 0) {
        app.showToast('Informe um valor válido para o comprovante.', 'warning');
        this.refs.proofAmount.focus();
        return false;
      }

      if (!proofFile) {
        app.showToast('Anexe o arquivo do comprovante.', 'warning');
        this.refs.proofFile.focus();
        return false;
      }

      return true;
    },

    buildProofPayload() {
      const existing = this.findProofById(this.editingProofId);
      const sale = this.findSaleById(this.refs.proofOrderNumber.value);
      const now = new Date().toISOString();

      return {
        id: existing?.id || this.refs.proofId.value || crypto.randomUUID(),
        relatedSaleId: sale.id,
        orderNumber: sale.orderNumber,
        clientName: this.refs.proofClientName.value.trim() || sale.client?.name || 'Consumidor final',
        date: this.refs.proofDate.value,
        time: this.refs.proofTime.value || app.currentTimeHHMM(),
        amount: app.toNumber(this.refs.proofAmount.value || 0),
        status: this.refs.proofStatus.value,
        origin: this.refs.proofOrigin.value,
        paymentMethod: this.refs.proofPaymentMethod.value,
        attachment: this.fileDraft || existing?.attachment || null,
        fileName: (this.fileDraft || existing?.attachment || {}).name || '',
        fileType: (this.fileDraft || existing?.attachment || {}).type || '',
        fileDataUrl: (this.fileDraft || existing?.attachment || {}).dataUrl || '',
        transactionId: this.refs.proofTransactionId.value.trim(),
        note: this.refs.proofNote.value.trim(),
        markOrderPaid: Boolean(this.refs.proofMarkOrderPaid.checked),
        finishOrderWhenValid: Boolean(this.refs.proofFinishOrderWhenValid.checked),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        createdBy: existing?.createdBy || this.getCurrentUser().email || 'admin@husky.com',
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    handleSaveProof(isUpdate = false) {
      if (!this.validateForm()) return;

      const proof = this.buildProofPayload();
      const state = this.getState();
      state.proofs = app.upsertItem(state.proofs || [], proof, 'id');
      this.applyProofToSale(state, proof);
      this.writeProofLog(state, proof, isUpdate ? 'Comprovante atualizado' : 'Comprovante salvo');
      this.setState(state);
      this.populateOrderSelect();
      this.renderAll();
      app.showToast(isUpdate || this.editingProofId ? 'Comprovante atualizado com sucesso.' : 'Comprovante salvo com sucesso.', 'success');
      app.log('Comprovante salvo/atualizado.', { proofId: proof.id, orderNumber: proof.orderNumber, saleId: proof.relatedSaleId });
      this.resetForm();
    },

    handleDeleteProof() {
      const proof = this.findProofById(this.editingProofId || this.refs.proofId.value);
      if (!proof) {
        app.showToast('Selecione um comprovante para excluir.', 'warning');
        return;
      }

      const confirmed = app.confirmAction(`Deseja excluir o comprovante do pedido ${proof.orderNumber}?`);
      if (!confirmed) return;

      const state = this.getState();
      state.proofs = app.removeById(state.proofs || [], proof.id);
      this.removeProofFromSale(state, proof.relatedSaleId);
      this.writeProofLog(state, proof, 'Comprovante excluído');
      this.setState(state);
      this.populateOrderSelect();
      this.renderAll();
      app.showToast('Comprovante excluído com sucesso.', 'success');
      app.log('Comprovante excluído.', { proofId: proof.id, orderNumber: proof.orderNumber, saleId: proof.relatedSaleId });
      this.resetForm();
    },

    handleFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) {
        this.fileDraft = null;
        this.updateFilePreview();
        this.updateDocumentViewer();
        this.updateLiveSummary();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.fileDraft = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString()
        };
        this.updateFilePreview();
        this.updateDocumentViewer();
        this.updateLiveSummary();
        app.showToast('Arquivo do comprovante carregado com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler o arquivo do comprovante.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    updateFilePreview() {
      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!attachment) {
        this.refs.proofFilePreview.innerHTML = '<p>Nenhum comprovante anexado.</p>';
        return;
      }

      const isImage = String(attachment.type || '').startsWith('image/');
      const sizeKb = attachment.size ? `${Math.ceil(attachment.size / 1024)} KB` : '-';

      this.refs.proofFilePreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(attachment.name || 'Comprovante')}</strong>
            <p>Tipo: ${this.escapeHtml(attachment.type || '-')} • Tamanho: ${sizeKb}</p>
            <p>Transação: ${this.escapeHtml(this.refs.proofTransactionId.value.trim() || this.findProofById(this.editingProofId)?.transactionId || 'Não informada')}</p>
          </div>
          <span class="tag">${isImage ? 'Imagem' : 'Arquivo'}</span>
        </div>
      `;
    },

    updateDocumentViewer() {
      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!attachment) {
        this.refs.proofDocumentViewer.innerHTML = '<p>Nenhum documento selecionado.</p>';
        return;
      }

      const isImage = String(attachment.type || '').startsWith('image/');
      const isPdf = String(attachment.type || '').includes('pdf') || String(attachment.name || '').toLowerCase().endsWith('.pdf');

      if (isImage && attachment.dataUrl) {
        this.refs.proofDocumentViewer.innerHTML = `<img src="${attachment.dataUrl}" alt="Comprovante" style="max-width:100%; max-height:320px; border-radius:14px; border:1px solid #ead9cd;" />`;
        return;
      }

      if (isPdf && attachment.dataUrl) {
        this.refs.proofDocumentViewer.innerHTML = `
          <div style="display:grid; gap:12px; width:100%; text-align:center;">
            <strong style="color:#2f211b;">${this.escapeHtml(attachment.name)}</strong>
            <iframe src="${attachment.dataUrl}" title="Prévia do comprovante PDF" style="width:100%; min-height:320px; border:none; border-radius:14px; background:#fff;"></iframe>
          </div>
        `;
        return;
      }

      this.refs.proofDocumentViewer.innerHTML = `
        <div style="display:grid; gap:10px; text-align:center;">
          <strong style="color:#2f211b;">${this.escapeHtml(attachment.name || 'Arquivo')}</strong>
          <p>Pré-visualização não disponível para este tipo de arquivo.</p>
        </div>
      `;
    },

    updateLiveSummary() {
      const sale = this.findSaleById(this.refs.proofOrderNumber.value);
      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      this.refs.proofSummaryOrder.textContent = sale?.orderNumber || '-';
      this.refs.proofSummaryClient.textContent = this.refs.proofClientName.value.trim() || sale?.client?.name || '-';
      this.refs.proofSummaryAmount.textContent = app.formatCurrency(app.toNumber(this.refs.proofAmount.value || 0));
      this.refs.proofSummaryStatus.textContent = this.refs.proofStatus.value || 'Pendente de conferência';
      this.refs.proofSummaryOrigin.textContent = this.refs.proofOrigin.value || 'Cliente';

      this.refs.proofOrderPaymentStatus.textContent = sale?.paymentStatus || 'Aguardando pagamento';
      this.refs.proofOrderStatus.textContent = sale?.orderStatus || 'Pendente';
      this.refs.proofFileStatus.textContent = attachment ? 'Enviado' : 'Não enviado';
      this.refs.proofValidationStatus.textContent = this.refs.proofStatus.value || 'Pendente';
    },

    applyProofToSale(state, proof) {
      const sales = [...(state.sales || [])];
      const saleIndex = sales.findIndex((sale) => sale.id === proof.relatedSaleId);
      if (saleIndex < 0) return;

      const sale = { ...sales[saleIndex] };
      sale.pixProof = {
        name: proof.fileName || proof.attachment?.name || '',
        type: proof.fileType || proof.attachment?.type || '',
        size: proof.attachment?.size || 0,
        dataUrl: proof.fileDataUrl || proof.attachment?.dataUrl || '',
        uploadedAt: proof.updatedAt,
        transactionId: proof.transactionId || '',
        note: proof.note || ''
      };
      sale.pixProofNote = proof.note || '';

      if (proof.markOrderPaid || proof.status === 'Conferido' || proof.status === 'Vinculado') {
        sale.paymentStatus = 'Pago';
      }

      if ((proof.finishOrderWhenValid && (proof.status === 'Conferido' || proof.status === 'Vinculado')) || proof.status === 'Vinculado') {
        sale.orderStatus = 'Finalizado';
      }

      sale.updatedAt = new Date().toISOString();
      sale.updatedBy = this.getCurrentUser().email || 'admin@husky.com';
      sales[saleIndex] = sale;
      state.sales = sales;
    },

    removeProofFromSale(state, saleId) {
      const sales = [...(state.sales || [])];
      const saleIndex = sales.findIndex((sale) => sale.id === saleId);
      if (saleIndex < 0) return;

      const sale = { ...sales[saleIndex] };
      sale.pixProof = null;
      sale.pixProofNote = '';
      if (sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado') {
        sale.paymentStatus = 'Aguardando pagamento';
        if (sale.orderStatus === 'Finalizado') {
          sale.orderStatus = 'Pronto';
        }
      }
      sale.updatedAt = new Date().toISOString();
      sale.updatedBy = this.getCurrentUser().email || 'admin@husky.com';
      sales[saleIndex] = sale;
      state.sales = sales;
    },

    writeProofLog(state, proof, action) {
      const logs = state.proofLogs || [];
      logs.unshift({
        id: crypto.randomUUID(),
        proofId: proof.id,
        relatedSaleId: proof.relatedSaleId,
        orderNumber: proof.orderNumber,
        action,
        operator: this.getCurrentUser().name || 'Administrador',
        createdAt: new Date().toISOString()
      });
      state.proofLogs = logs.slice(0, 50);
    },

    applyFilters() {
      this.filters.search = this.refs.proofsSearch.value.trim();
      this.filters.start = this.refs.proofsFilterStart.value;
      this.filters.end = this.refs.proofsFilterEnd.value;
      this.filters.status = this.refs.proofsFilterStatus.value;
      this.filters.origin = this.refs.proofsFilterOrigin.value;
      this.renderProofsTable();
    },

    clearFilters() {
      this.filters = {
        search: '',
        start: '',
        end: '',
        status: '',
        origin: ''
      };

      this.refs.proofsSearch.value = '';
      this.refs.proofsFilterStart.value = '';
      this.refs.proofsFilterEnd.value = '';
      this.refs.proofsFilterStatus.value = '';
      this.refs.proofsFilterOrigin.value = '';
      this.renderProofsTable();
    },

    getFilteredProofs() {
      return this.getProofs().filter((proof) => {
        const haystack = [proof.orderNumber, proof.clientName, proof.transactionId, proof.note, proof.origin].join(' ');
        const matchesSearch = !this.filters.search || app.includesText(haystack, this.filters.search);
        const matchesStart = !this.filters.start || proof.date >= this.filters.start;
        const matchesEnd = !this.filters.end || proof.date <= this.filters.end;
        const matchesStatus = !this.filters.status || proof.status === this.filters.status;
        const matchesOrigin = !this.filters.origin || proof.origin === this.filters.origin;
        return matchesSearch && matchesStart && matchesEnd && matchesStatus && matchesOrigin;
      }).sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    renderAll() {
      this.populateOrderSelect();
      this.renderMetrics();
      this.renderProofsTable();
      this.renderMissingProofsTable();
      this.renderValidatedProofs();
      this.renderFinishedProofs();
      this.renderLogs();
      this.updateLiveSummary();
    },

    renderMetrics() {
      const proofs = this.getProofs();
      const pending = proofs.filter((proof) => proof.status === 'Pendente de conferência');
      const missing = this.getSales().filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado' && !sale.pixProof?.name);
      const finishedPix = this.getSales().filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus === 'Finalizado');

      this.refs.proofsTotalCount.textContent = String(proofs.length);
      this.refs.proofsPendingCount.textContent = String(pending.length);
      this.refs.proofsMissingCount.textContent = String(missing.length);
      this.refs.proofsFinishedPixCount.textContent = String(finishedPix.length);
    },

    renderProofsTable() {
      const proofs = this.getFilteredProofs();

      if (!proofs.length) {
        this.refs.proofsTableBody.innerHTML = '<tr><td colspan="8">Nenhum comprovante encontrado.</td></tr>';
        return;
      }

      this.refs.proofsTableBody.innerHTML = proofs.map((proof) => `
        <tr>
          <td>${this.escapeHtml(proof.orderNumber || '-')}</td>
          <td>${this.escapeHtml(proof.clientName || '-')}</td>
          <td>${app.formatDate(proof.date)}</td>
          <td>${app.formatCurrency(proof.amount || 0)}</td>
          <td>${this.escapeHtml(proof.status || '-')}</td>
          <td>${this.escapeHtml(proof.origin || '-')}</td>
          <td>${proof.fileName ? 'Sim' : 'Não'}</td>
          <td>
            <div class="table-action-group">
              <button type="button" class="btn btn-secondary btn-small" data-action="view-proof" data-id="${proof.id}">Ver</button>
              <button type="button" class="btn btn-secondary btn-small" data-action="validate-proof" data-id="${proof.id}">Conferir</button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    renderMissingProofsTable() {
      const sales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado' && !sale.pixProof?.name)
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 12);

      if (!sales.length) {
        this.refs.proofsMissingTableBody.innerHTML = '<tr><td colspan="5">Nenhum pedido aguardando comprovante.</td></tr>';
        return;
      }

      this.refs.proofsMissingTableBody.innerHTML = sales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>${this.escapeHtml(sale.paymentStatus || '-')}</td>
          <td><button type="button" class="btn btn-secondary btn-small" data-action="attach-proof" data-id="${sale.id}">Anexar</button></td>
        </tr>
      `).join('');
    },

    renderValidatedProofs() {
      const proofs = this.getProofs()
        .filter((proof) => proof.status === 'Conferido' || proof.status === 'Vinculado')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 6);

      if (!proofs.length) {
        this.refs.validatedProofsList.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Nenhum comprovante validado</strong>
              <p>Os comprovantes conferidos aparecerão aqui.</p>
            </div>
            <span class="tag">-</span>
          </div>
        `;
        return;
      }

      this.refs.validatedProofsList.innerHTML = proofs.map((proof) => `
        <div class="pix-proof-card">
          <div>
            <strong>Pedido ${this.escapeHtml(proof.orderNumber)}</strong>
            <p>${this.escapeHtml(proof.clientName)} • ${this.escapeHtml(proof.status)}</p>
          </div>
          <span class="tag">OK</span>
        </div>
      `).join('');
    },

    renderFinishedProofs() {
      const sales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus === 'Finalizado' && sale.pixProof?.name)
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
        .slice(0, 12);

      if (!sales.length) {
        this.refs.finishedProofsTableBody.innerHTML = '<tr><td colspan="5">Nenhum pedido finalizado com comprovante.</td></tr>';
        return;
      }

      this.refs.finishedProofsTableBody.innerHTML = sales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatDate(sale.date)}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td>${this.escapeHtml(sale.orderStatus || '-')}</td>
        </tr>
      `).join('');
    },

    renderLogs() {
      const logs = (this.getState().proofLogs || []).slice(0, 4);
      if (!logs.length) {
        this.refs.proofsLogList.innerHTML = `
          <div class="status-row"><span>Última ação</span><strong>Nenhuma ação registrada</strong></div>
          <div class="status-row"><span>Última conferência</span><strong>-</strong></div>
          <div class="status-row"><span>Último pedido vinculado</span><strong>-</strong></div>
          <div class="status-row"><span>Operador</span><strong>${this.escapeHtml(this.getCurrentUser().name || 'Administrador')}</strong></div>
        `;
        return;
      }

      const latest = logs[0];
      const lastValidated = logs.find((log) => /conferido|vinculado|atualizado/i.test(log.action)) || null;
      const lastLinked = logs.find((log) => /salvo|vinculado/i.test(log.action)) || null;

      this.refs.proofsLogList.innerHTML = `
        <div class="status-row"><span>Última ação</span><strong>${this.escapeHtml(latest.action)}</strong></div>
        <div class="status-row"><span>Última conferência</span><strong>${lastValidated ? `${this.escapeHtml(lastValidated.orderNumber)} • ${app.formatDateTime(lastValidated.createdAt)}` : '-'}</strong></div>
        <div class="status-row"><span>Último pedido vinculado</span><strong>${lastLinked ? this.escapeHtml(lastLinked.orderNumber) : '-'}</strong></div>
        <div class="status-row"><span>Operador</span><strong>${this.escapeHtml(latest.operator || 'Administrador')}</strong></div>
      `;
    },

    handleProofsTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const proofId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'view-proof') {
        this.loadProofIntoForm(proofId);
      }

      if (action === 'validate-proof') {
        this.quickValidateProof(proofId);
      }
    },

    handleMissingTableActions(event) {
      const button = event.target.closest('button[data-action="attach-proof"]');
      if (!button) return;
      this.prepareFormForSale(button.dataset.id);
    },

    handleFinishedTableActions(event) {
      const row = event.target.closest('tr');
      if (!row) return;
    },

    prepareFormForSale(saleId) {
      const sale = this.findSaleById(saleId);
      if (!sale) {
        app.showToast('Pedido não encontrado.', 'danger');
        return;
      }

      this.resetForm(true);
      this.refs.proofOrderNumber.value = sale.id;
      this.onOrderChange();
      this.updateModeTag(`Pedido ${sale.orderNumber}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    loadProofIntoForm(proofId) {
      const proof = this.findProofById(proofId);
      if (!proof) {
        app.showToast('Comprovante não encontrado.', 'danger');
        return;
      }

      this.editingProofId = proof.id;
      this.fileDraft = proof.attachment || null;

      this.refs.proofId.value = proof.id;
      this.refs.proofDate.value = proof.date || app.todayISO();
      this.refs.proofTime.value = proof.time || app.currentTimeHHMM();
      this.refs.proofStatus.value = proof.status || 'Pendente de conferência';
      this.refs.proofOrderNumber.value = proof.relatedSaleId || '';
      this.refs.proofClientName.value = proof.clientName || '';
      this.refs.proofPaymentMethod.value = proof.paymentMethod || 'Pix';
      this.refs.proofAmount.value = proof.amount || '';
      this.refs.proofOrigin.value = proof.origin || 'Cliente';
      this.refs.proofTransactionId.value = proof.transactionId || '';
      this.refs.proofNote.value = proof.note || '';
      this.refs.proofMarkOrderPaid.checked = Boolean(proof.markOrderPaid ?? true);
      this.refs.proofFinishOrderWhenValid.checked = Boolean(proof.finishOrderWhenValid);
      if (this.refs.proofFile) this.refs.proofFile.value = '';

      this.updateModeTag(`Editando ${proof.orderNumber}`);
      this.updateFilePreview();
      this.updateDocumentViewer();
      this.updateLiveSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    quickValidateProof(proofId) {
      const proof = this.findProofById(proofId);
      if (!proof) {
        app.showToast('Comprovante não encontrado.', 'danger');
        return;
      }

      const state = this.getState();
      const nextProof = {
        ...proof,
        status: 'Conferido',
        markOrderPaid: true,
        updatedAt: new Date().toISOString(),
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };

      state.proofs = app.upsertItem(state.proofs || [], nextProof, 'id');
      this.applyProofToSale(state, nextProof);
      this.writeProofLog(state, nextProof, 'Comprovante conferido');
      this.setState(state);
      this.renderAll();
      app.showToast('Comprovante conferido com sucesso.', 'success');
      app.log('Comprovante conferido.', { proofId: nextProof.id, orderNumber: nextProof.orderNumber });
    },

    findProofById(id) {
      if (!id) return null;
      return this.getProofs().find((proof) => proof.id === id) || null;
    },

    findSaleById(id) {
      if (!id) return null;
      return this.getSales().find((sale) => sale.id === id) || null;
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

  document.addEventListener('DOMContentLoaded', () => PROOFS_PAGE.init());
  window.HuskyProofs = PROOFS_PAGE;
})();
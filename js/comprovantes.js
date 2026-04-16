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
      this.refs.btnSaveProof?.addEventListener('click', () => this.handleSaveProof(false));
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

      this.refs.proofsSearch?.addEventListener('input', () => {
        this.filters.search = this.refs.proofsSearch.value.trim();
        this.renderProofsTable();
      });

      this.refs.proofsFilterStart?.addEventListener('change', () => {
        this.filters.start = this.refs.proofsFilterStart.value;
        this.renderProofsTable();
      });

      this.refs.proofsFilterEnd?.addEventListener('change', () => {
        this.filters.end = this.refs.proofsFilterEnd.value;
        this.renderProofsTable();
      });

      this.refs.proofsFilterStatus?.addEventListener('change', () => {
        this.filters.status = this.refs.proofsFilterStatus.value;
        this.renderProofsTable();
      });

      this.refs.proofsFilterOrigin?.addEventListener('change', () => {
        this.filters.origin = this.refs.proofsFilterOrigin.value;
        this.renderProofsTable();
      });

      this.refs.proofsTableBody?.addEventListener('click', (event) => this.handleProofsTableActions(event));
      this.refs.proofsMissingTableBody?.addEventListener('click', (event) => this.handleMissingTableActions(event));
      this.refs.finishedProofsTableBody?.addEventListener('click', (event) => this.handleFinishedTableActions(event));

      window.addEventListener('husky:state-changed', () => {
        this.populateOrderSelect();
        this.renderAll();
      });
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
      return Array.isArray(this.getState().proofs) ? this.getState().proofs : [];
    },

    getSales() {
      return Array.isArray(this.getState().sales) ? this.getState().sales : [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    resetForm(skipScroll = false) {
      app.revokeAttachmentPreview(this.fileDraft);
      this.editingProofId = null;
      this.fileDraft = null;

      if (this.refs.form) this.refs.form.reset();

      if (this.refs.proofId) this.refs.proofId.value = '';
      if (this.refs.proofDate) this.refs.proofDate.value = app.todayISO();
      if (this.refs.proofTime) this.refs.proofTime.value = app.currentTimeHHMM();
      if (this.refs.proofStatus) this.refs.proofStatus.value = 'Pendente de conferência';
      if (this.refs.proofPaymentMethod) this.refs.proofPaymentMethod.value = 'Pix';
      if (this.refs.proofOrigin) this.refs.proofOrigin.value = 'Cliente';
      if (this.refs.proofAmount) this.refs.proofAmount.value = '';
      if (this.refs.proofOrderNumber) this.refs.proofOrderNumber.value = '';
      if (this.refs.proofClientName) this.refs.proofClientName.value = '';
      if (this.refs.proofTransactionId) this.refs.proofTransactionId.value = '';
      if (this.refs.proofNote) this.refs.proofNote.value = '';
      if (this.refs.proofMarkOrderPaid) this.refs.proofMarkOrderPaid.checked = true;
      if (this.refs.proofFinishOrderWhenValid) this.refs.proofFinishOrderWhenValid.checked = false;
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
      if (!this.refs.proofOrderNumber) return;

      const pixSales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado')
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });

      this.refs.proofOrderNumber.innerHTML = `
        <option value="">Selecione o pedido</option>
        ${pixSales.map((sale) => `
          <option value="${sale.id}">
            ${this.escapeHtml(sale.orderNumber || '-')} • ${this.escapeHtml(sale.client?.name || 'Consumidor final')}
          </option>
        `).join('')}
      `;
    },

    onOrderChange() {
      const sale = this.findSaleById(this.refs.proofOrderNumber?.value);
      if (!sale) {
        if (this.refs.proofClientName) this.refs.proofClientName.value = '';
        if (this.refs.proofAmount) this.refs.proofAmount.value = '';
        if (this.refs.proofPaymentMethod) this.refs.proofPaymentMethod.value = 'Pix';
        this.updateLiveSummary();
        return;
      }

      if (this.refs.proofClientName) this.refs.proofClientName.value = sale.client?.name || '';
      if (this.refs.proofPaymentMethod) this.refs.proofPaymentMethod.value = sale.paymentMethod || 'Pix';
      if (this.refs.proofAmount) this.refs.proofAmount.value = app.toNumber(sale.total || 0);
      if (this.refs.proofDate) this.refs.proofDate.value = sale.date || app.todayISO();

      this.updateLiveSummary();
    },

    validateForm() {
      const sale = this.findSaleById(this.refs.proofOrderNumber?.value);
      const amount = app.toNumber(this.refs.proofAmount?.value || 0);
      const proofFile = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!sale) {
        app.showToast('Selecione um pedido para vincular o comprovante.', 'warning');
        this.refs.proofOrderNumber?.focus();
        return false;
      }

      if (sale.paymentMethod !== 'Pix' && this.refs.proofPaymentMethod?.value === 'Pix') {
        app.showToast('O pedido selecionado não está como Pix.', 'warning');
        return false;
      }

      if (amount <= 0) {
        app.showToast('Informe um valor válido para o comprovante.', 'warning');
        this.refs.proofAmount?.focus();
        return false;
      }

      if (!proofFile) {
        app.showToast('Anexe o arquivo do comprovante.', 'warning');
        this.refs.proofFile?.focus();
        return false;
      }

      return true;
    },

    async buildProofPayload() {
      const existing = this.findProofById(this.editingProofId);
      const sale = this.findSaleById(this.refs.proofOrderNumber?.value);
      const now = new Date().toISOString();
      const previousAttachment = existing?.attachment || null;
      let attachment = this.fileDraft || previousAttachment || null;

      if (attachment?.rawFile) {
        if (app.isCloudStorageReady()) {
          attachment = await app.uploadFileToCloud(attachment.rawFile, { folder: 'proofs' });
        } else {
          attachment = await this.readLocalAttachmentAsDataUrl(attachment.rawFile);
        }

        if (previousAttachment?.storagePath && previousAttachment.storagePath !== attachment.storagePath) {
          app.deleteCloudFile(previousAttachment);
        }
      }

      attachment = this.normalizeAttachmentForSave(attachment);

      return {
        id: existing?.id || this.refs.proofId?.value || crypto.randomUUID(),
        relatedSaleId: sale.id,
        orderNumber: sale.orderNumber,
        clientName: this.refs.proofClientName?.value.trim() || sale.client?.name || 'Consumidor final',
        date: this.refs.proofDate?.value || app.todayISO(),
        time: this.refs.proofTime?.value || app.currentTimeHHMM(),
        amount: app.toNumber(this.refs.proofAmount?.value || 0),
        status: this.refs.proofStatus?.value || 'Pendente de conferência',
        origin: this.refs.proofOrigin?.value || 'Cliente',
        paymentMethod: this.refs.proofPaymentMethod?.value || 'Pix',
        attachment,
        fileName: attachment?.name || '',
        fileType: attachment?.type || '',
        fileDataUrl: attachment?.dataUrl || '',
        transactionId: this.refs.proofTransactionId?.value.trim() || '',
        note: this.refs.proofNote?.value.trim() || '',
        markOrderPaid: Boolean(this.refs.proofMarkOrderPaid?.checked),
        finishOrderWhenValid: Boolean(this.refs.proofFinishOrderWhenValid?.checked),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        createdBy: existing?.createdBy || this.getCurrentUser().email || 'admin@husky.com',
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    async handleSaveProof(isUpdate = false) {
      if (!this.validateForm()) return;

      this.setSavingState(true);

      try {
        const proof = await this.buildProofPayload();
        const state = this.getState();

        state.proofs = app.upsertItem(state.proofs || [], proof, 'id');
        this.applyProofToSale(state, proof);
        this.writeProofLog(state, proof, isUpdate ? 'Comprovante atualizado' : 'Comprovante salvo');

        this.setState(state);
        this.populateOrderSelect();
        this.renderAll();

        app.showToast(
          isUpdate || this.editingProofId
            ? 'Comprovante atualizado com sucesso.'
            : 'Comprovante salvo com sucesso.',
          'success'
        );

        app.log('Comprovante salvo/atualizado.', {
          proofId: proof.id,
          orderNumber: proof.orderNumber,
          saleId: proof.relatedSaleId
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Comprovantes] erro ao salvar comprovante', error);
        app.showToast(`Não foi possível salvar o comprovante. ${error?.message || ''}`.trim(), 'danger');
      } finally {
        this.setSavingState(false);
      }
    },

    async handleDeleteProof() {
      const proof = this.findProofById(this.editingProofId || this.refs.proofId?.value);

      if (!proof) {
        app.showToast('Selecione um comprovante para excluir.', 'warning');
        return;
      }

      const confirmed = app.confirmAction(`Deseja excluir o comprovante do pedido ${proof.orderNumber}?`);
      if (!confirmed) return;

      this.setSavingState(true);

      try {
        const state = this.getState();
        state.proofs = app.removeById(state.proofs || [], proof.id);
        this.removeProofFromSale(state, proof.relatedSaleId);
        this.writeProofLog(state, proof, 'Comprovante excluído');

        this.setState(state);
        this.populateOrderSelect();
        this.renderAll();

        if (proof.attachment?.storagePath) {
          await app.deleteCloudFile(proof.attachment);
        }

        app.showToast('Comprovante excluído com sucesso.', 'success');
        app.log('Comprovante excluído.', {
          proofId: proof.id,
          orderNumber: proof.orderNumber,
          saleId: proof.relatedSaleId
        });

        this.resetForm();
      } finally {
        this.setSavingState(false);
      }
    },

    async handleFileUpload(event) {
      const file = event.target.files?.[0];

      if (!file) {
        app.revokeAttachmentPreview(this.fileDraft);
        this.fileDraft = null;
        this.updateFilePreview();
        this.updateDocumentViewer();
        this.updateLiveSummary();
        return;
      }

      try {
        app.revokeAttachmentPreview(this.fileDraft);
        this.fileDraft = await app.prepareLocalFileDraft(file);
        this.updateFilePreview();
        this.updateDocumentViewer();
        this.updateLiveSummary();
        app.showToast('Arquivo do comprovante pronto para envio.', 'success');
      } catch (error) {
        console.error('[Husky Comprovantes] erro ao preparar arquivo', error);
        app.showToast('Não foi possível preparar o arquivo do comprovante.', 'danger');
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

    normalizeAttachmentForSave(attachment) {
      if (!attachment) return null;

      return {
        name: attachment.name || '',
        type: attachment.type || 'application/octet-stream',
        size: attachment.size || 0,
        uploadedAt: attachment.uploadedAt || new Date().toISOString(),
        dataUrl: attachment.dataUrl || '',
        url: attachment.url || '',
        source: attachment.source || (attachment.url ? 'cloud' : 'local'),
        storageBucket: attachment.storageBucket || '',
        storagePath: attachment.storagePath || ''
      };
    },

    setSavingState(isSaving) {
      [this.refs.btnSaveProof, this.refs.btnUpdateProof, this.refs.btnDeleteProof].forEach((button) => {
        if (!button) return;
        button.disabled = Boolean(isSaving);
      });
    },

    updateFilePreview() {
      if (!this.refs.proofFilePreview) return;

      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!attachment) {
        this.refs.proofFilePreview.innerHTML = '<p>Nenhum comprovante anexado.</p>';
        return;
      }

      const isImage = String(attachment.type || '').startsWith('image/');
      const sizeKb = attachment.size ? `${Math.ceil(attachment.size / 1024)} KB` : '-';
      const transactionId =
        this.refs.proofTransactionId?.value.trim() ||
        this.findProofById(this.editingProofId)?.transactionId ||
        'Não informada';

      this.refs.proofFilePreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(attachment.name || 'Comprovante')}</strong>
            <p>Tipo: ${this.escapeHtml(attachment.type || '-')} • Tamanho: ${sizeKb}</p>
            <p>Transação: ${this.escapeHtml(transactionId)}</p>
          </div>
          <span class="tag">${isImage ? 'Imagem' : 'Arquivo'}</span>
        </div>
      `;
    },

    updateDocumentViewer() {
      if (!this.refs.proofDocumentViewer) return;

      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (!attachment) {
        this.refs.proofDocumentViewer.innerHTML = '<p>Nenhum documento selecionado.</p>';
        return;
      }

      const isImage = String(attachment.type || '').startsWith('image/');
      const isPdf =
        String(attachment.type || '').includes('pdf') ||
        String(attachment.name || '').toLowerCase().endsWith('.pdf');
      const previewUrl = app.getAttachmentPreviewUrl(attachment);

      if (isImage && previewUrl) {
        this.refs.proofDocumentViewer.innerHTML = `
          <img
            src="${previewUrl}"
            alt="Comprovante"
            style="max-width:100%; max-height:320px; border-radius:14px; border:1px solid rgba(45,111,155,0.12);"
          />
        `;
        return;
      }

      if (isPdf && previewUrl) {
        this.refs.proofDocumentViewer.innerHTML = `
          <div style="display:grid; gap:12px; width:100%; text-align:center;">
            <strong style="color:#183247;">${this.escapeHtml(attachment.name)}</strong>
            <iframe
              src="${previewUrl}"
              title="Prévia do comprovante PDF"
              style="width:100%; min-height:320px; border:none; border-radius:14px; background:#fff;"
            ></iframe>
          </div>
        `;
        return;
      }

      this.refs.proofDocumentViewer.innerHTML = `
        <div style="display:grid; gap:10px; text-align:center;">
          <strong style="color:#183247;">${this.escapeHtml(attachment.name || 'Arquivo')}</strong>
          <p>Pré-visualização não disponível para este tipo de arquivo.</p>
        </div>
      `;
    },

    updateLiveSummary() {
      const sale = this.findSaleById(this.refs.proofOrderNumber?.value);
      const attachment = this.fileDraft || this.findProofById(this.editingProofId)?.attachment || null;

      if (this.refs.proofSummaryOrder) {
        this.refs.proofSummaryOrder.textContent = sale?.orderNumber || '-';
      }
      if (this.refs.proofSummaryClient) {
        this.refs.proofSummaryClient.textContent =
          this.refs.proofClientName?.value.trim() || sale?.client?.name || '-';
      }
      if (this.refs.proofSummaryAmount) {
        this.refs.proofSummaryAmount.textContent = app.formatCurrency(app.toNumber(this.refs.proofAmount?.value || 0));
      }
      if (this.refs.proofSummaryStatus) {
        this.refs.proofSummaryStatus.textContent = this.refs.proofStatus?.value || 'Pendente de conferência';
      }
      if (this.refs.proofSummaryOrigin) {
        this.refs.proofSummaryOrigin.textContent = this.refs.proofOrigin?.value || 'Cliente';
      }

      if (this.refs.proofOrderPaymentStatus) {
        this.refs.proofOrderPaymentStatus.textContent = sale?.paymentStatus || 'Aguardando pagamento';
      }
      if (this.refs.proofOrderStatus) {
        this.refs.proofOrderStatus.textContent = sale?.orderStatus || 'Pendente';
      }
      if (this.refs.proofFileStatus) {
        this.refs.proofFileStatus.textContent = attachment ? 'Enviado' : 'Não enviado';
      }
      if (this.refs.proofValidationStatus) {
        this.refs.proofValidationStatus.textContent = this.refs.proofStatus?.value || 'Pendente';
      }
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
        url: proof.attachment?.url || '',
        storageBucket: proof.attachment?.storageBucket || '',
        storagePath: proof.attachment?.storagePath || '',
        uploadedAt: proof.updatedAt,
        transactionId: proof.transactionId || '',
        note: proof.note || ''
      };

      sale.pixProofNote = proof.note || '';

      if (proof.markOrderPaid || proof.status === 'Conferido' || proof.status === 'Vinculado') {
        sale.paymentStatus = 'Pago';
      }

      if (
        (proof.finishOrderWhenValid && (proof.status === 'Conferido' || proof.status === 'Vinculado')) ||
        proof.status === 'Vinculado'
      ) {
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
      this.filters.search = this.refs.proofsSearch?.value.trim() || '';
      this.filters.start = this.refs.proofsFilterStart?.value || '';
      this.filters.end = this.refs.proofsFilterEnd?.value || '';
      this.filters.status = this.refs.proofsFilterStatus?.value || '';
      this.filters.origin = this.refs.proofsFilterOrigin?.value || '';
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

      if (this.refs.proofsSearch) this.refs.proofsSearch.value = '';
      if (this.refs.proofsFilterStart) this.refs.proofsFilterStart.value = '';
      if (this.refs.proofsFilterEnd) this.refs.proofsFilterEnd.value = '';
      if (this.refs.proofsFilterStatus) this.refs.proofsFilterStatus.value = '';
      if (this.refs.proofsFilterOrigin) this.refs.proofsFilterOrigin.value = '';

      this.renderProofsTable();
    },

    getFilteredProofs() {
      return this.getProofs()
        .filter((proof) => {
          const haystack = [
            proof.orderNumber,
            proof.clientName,
            proof.transactionId,
            proof.note,
            proof.origin
          ].join(' ');

          const matchesSearch = !this.filters.search || app.includesText(haystack, this.filters.search);
          const matchesStart = !this.filters.start || proof.date >= this.filters.start;
          const matchesEnd = !this.filters.end || proof.date <= this.filters.end;
          const matchesStatus = !this.filters.status || proof.status === this.filters.status;
          const matchesOrigin = !this.filters.origin || proof.origin === this.filters.origin;

          return matchesSearch && matchesStart && matchesEnd && matchesStatus && matchesOrigin;
        })
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        });
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
      const missing = this.getSales().filter(
        (sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado' && !sale.pixProof?.name
      );
      const finishedPix = this.getSales().filter(
        (sale) => sale.paymentMethod === 'Pix' && sale.orderStatus === 'Finalizado'
      );

      if (this.refs.proofsTotalCount) this.refs.proofsTotalCount.textContent = String(proofs.length);
      if (this.refs.proofsPendingCount) this.refs.proofsPendingCount.textContent = String(pending.length);
      if (this.refs.proofsMissingCount) this.refs.proofsMissingCount.textContent = String(missing.length);
      if (this.refs.proofsFinishedPixCount) this.refs.proofsFinishedPixCount.textContent = String(finishedPix.length);
    },

    renderProofsTable() {
      if (!this.refs.proofsTableBody) return;

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
              <button type="button" class="btn btn-secondary btn-small" data-action="validate-proof" data-id="${proof.id}">
                ${proof.status === 'Conferido' || proof.status === 'Vinculado' ? 'Conferido' : 'Conferir'}
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    },

    renderMissingProofsTable() {
      if (!this.refs.proofsMissingTableBody) return;

      const sales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus !== 'Cancelado' && !sale.pixProof?.name)
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        })
        .slice(0, 12);

      if (!sales.length) {
        this.refs.proofsMissingTableBody.innerHTML = '<tr><td colspan="4">Nenhum pedido aguardando comprovante.</td></tr>';
        return;
      }

      this.refs.proofsMissingTableBody.innerHTML = sales.map((sale) => `
        <tr>
          <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
          <td>${this.escapeHtml(sale.client?.name || 'Consumidor final')}</td>
          <td>${app.formatCurrency(sale.total || 0)}</td>
          <td><button type="button" class="btn btn-secondary btn-small" data-action="attach-proof" data-id="${sale.id}">Anexar</button></td>
        </tr>
      `).join('');
    },

    renderValidatedProofs() {
      if (!this.refs.validatedProofsList) return;

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
      if (!this.refs.finishedProofsTableBody) return;

      const sales = this.getSales()
        .filter((sale) => sale.paymentMethod === 'Pix' && sale.orderStatus === 'Finalizado' && sale.pixProof?.name)
        .sort((a, b) => {
          const dateA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
          return dateB - dateA;
        })
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
      if (!this.refs.proofsLogList) return;

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
      const button = event.target.closest('button[data-action]');
      if (!button) return;
    },

    prepareFormForSale(saleId) {
      const sale = this.findSaleById(saleId);

      if (!sale) {
        app.showToast('Pedido não encontrado.', 'danger');
        return;
      }

      this.resetForm(true);

      if (this.refs.proofOrderNumber) this.refs.proofOrderNumber.value = sale.id;
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

      if (this.refs.proofId) this.refs.proofId.value = proof.id;
      if (this.refs.proofDate) this.refs.proofDate.value = proof.date || app.todayISO();
      if (this.refs.proofTime) this.refs.proofTime.value = proof.time || app.currentTimeHHMM();
      if (this.refs.proofStatus) this.refs.proofStatus.value = proof.status || 'Pendente de conferência';
      if (this.refs.proofOrderNumber) this.refs.proofOrderNumber.value = proof.relatedSaleId || '';
      if (this.refs.proofClientName) this.refs.proofClientName.value = proof.clientName || '';
      if (this.refs.proofPaymentMethod) this.refs.proofPaymentMethod.value = proof.paymentMethod || 'Pix';
      if (this.refs.proofAmount) this.refs.proofAmount.value = proof.amount || '';
      if (this.refs.proofOrigin) this.refs.proofOrigin.value = proof.origin || 'Cliente';
      if (this.refs.proofTransactionId) this.refs.proofTransactionId.value = proof.transactionId || '';
      if (this.refs.proofNote) this.refs.proofNote.value = proof.note || '';
      if (this.refs.proofMarkOrderPaid) this.refs.proofMarkOrderPaid.checked = Boolean(proof.markOrderPaid ?? true);
      if (this.refs.proofFinishOrderWhenValid) {
        this.refs.proofFinishOrderWhenValid.checked = Boolean(proof.finishOrderWhenValid);
      }
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
      app.log('Comprovante conferido.', {
        proofId: nextProof.id,
        orderNumber: nextProof.orderNumber
      });
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
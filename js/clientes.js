(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Clientes] HuskyApp não encontrado. Verifique se app.js foi carregado antes de clientes.js.');
    return;
  }

  const CLIENTS_PAGE = {
    refs: {},
    filters: {
      search: '',
      status: '',
      origin: '',
      profile: ''
    },
    editingClientId: null,
    selectedClientId: null,

    init() {
      if (!document.getElementById('client-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.prepareInitialState();
      this.renderAll();
      this.log('Tela de clientes carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('client-form'),
        clientId: document.getElementById('client-id'),
        clientCode: document.getElementById('client-code'),
        clientStatus: document.getElementById('client-status'),
        clientOrigin: document.getElementById('client-origin'),
        clientName: document.getElementById('client-name'),
        clientShortName: document.getElementById('client-short-name'),
        clientPhone: document.getElementById('client-phone'),
        clientEmail: document.getElementById('client-email'),
        clientBirthday: document.getElementById('client-birthday'),
        clientInstagram: document.getElementById('client-instagram'),
        clientCpf: document.getElementById('client-cpf'),
        clientAddress: document.getElementById('client-address'),
        clientDeliveryReference: document.getElementById('client-delivery-reference'),
        clientPaymentPreference: document.getElementById('client-payment-preference'),
        clientFavoriteProduct: document.getElementById('client-favorite-product'),
        clientTags: document.getElementById('client-tags'),
        clientNotes: document.getElementById('client-notes'),
        clientReceiveOffers: document.getElementById('client-receive-offers'),
        clientPriorityService: document.getElementById('client-priority-service'),

        clientModeTag: document.getElementById('client-mode-tag'),
        btnSaveClient: document.getElementById('btn-save-client'),
        btnUpdateClient: document.getElementById('btn-update-client'),
        btnDeleteClient: document.getElementById('btn-delete-client'),
        btnNewClientTop: document.getElementById('btn-new-client-top'),
        btnNewClientHero: document.getElementById('btn-new-client-hero'),

        clientsTotalCount: document.getElementById('clients-total-count'),
        clientsRecurringCount: document.getElementById('clients-recurring-count'),
        clientsBirthdayCount: document.getElementById('clients-birthday-count'),
        clientsBestCustomer: document.getElementById('clients-best-customer'),

        clientSummaryStatus: document.getElementById('client-summary-status'),
        clientSummaryOrigin: document.getElementById('client-summary-origin'),
        clientSummaryPayment: document.getElementById('client-summary-payment'),
        clientSummaryPriority: document.getElementById('client-summary-priority'),
        clientSummaryOffers: document.getElementById('client-summary-offers'),

        clientStatusPhone: document.getElementById('client-status-phone'),
        clientStatusEmail: document.getElementById('client-status-email'),
        clientStatusBirthday: document.getElementById('client-status-birthday'),
        clientStatusFavorite: document.getElementById('client-status-favorite'),

        clientOrdersCount: document.getElementById('client-orders-count'),
        clientTotalSpent: document.getElementById('client-total-spent'),
        clientLastOrder: document.getElementById('client-last-order'),
        clientAverageTicket: document.getElementById('client-average-ticket'),

        clientsSearch: document.getElementById('clients-search'),
        clientsFilterStatus: document.getElementById('clients-filter-status'),
        clientsFilterOrigin: document.getElementById('clients-filter-origin'),
        clientsFilterProfile: document.getElementById('clients-filter-profile'),
        btnFilterClients: document.getElementById('btn-filter-clients'),
        btnClearClientsFilter: document.getElementById('btn-clear-clients-filter'),

        clientsTableBody: document.getElementById('clients-table-body'),
        clientOrdersTableBody: document.getElementById('client-orders-table-body'),
        featuredClientsList: document.getElementById('featured-clients-list'),
        clientsBirthdayTableBody: document.getElementById('clients-birthday-table-body'),

        clientSelectedAddress: document.getElementById('client-selected-address'),
        clientSelectedReference: document.getElementById('client-selected-reference'),
        clientSelectedPayment: document.getElementById('client-selected-payment'),
        clientSelectedNotes: document.getElementById('client-selected-notes')
      };
    },

    bindEvents() {
      this.refs.btnSaveClient?.addEventListener('click', () => this.handleSaveClient());
      this.refs.btnUpdateClient?.addEventListener('click', () => this.handleSaveClient(true));
      this.refs.btnDeleteClient?.addEventListener('click', () => this.handleDeleteClient());
      this.refs.btnNewClientTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewClientHero?.addEventListener('click', () => this.resetForm());

      [
        this.refs.clientStatus,
        this.refs.clientOrigin,
        this.refs.clientName,
        this.refs.clientShortName,
        this.refs.clientPhone,
        this.refs.clientEmail,
        this.refs.clientBirthday,
        this.refs.clientPaymentPreference,
        this.refs.clientFavoriteProduct,
        this.refs.clientReceiveOffers,
        this.refs.clientPriorityService,
        this.refs.clientAddress,
        this.refs.clientDeliveryReference,
        this.refs.clientNotes
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLiveSummary());
        field?.addEventListener('change', () => this.updateLiveSummary());
      });

      this.refs.btnFilterClients?.addEventListener('click', () => this.applyFilters());
      this.refs.btnClearClientsFilter?.addEventListener('click', () => this.clearFilters());
      this.refs.clientsTableBody?.addEventListener('click', (event) => this.handleTableActions(event));
      this.refs.clientsBirthdayTableBody?.addEventListener('click', (event) => this.handleBirthdayActions(event));
    },

    prepareInitialState() {
      const state = this.getState();
      if (!Array.isArray(state.customers)) {
        state.customers = [];
        this.setState(state);
      }

      this.resetForm(true);

      const firstClient = this.getClients()[0] || null;
      if (firstClient) {
        this.selectedClientId = firstClient.id;
      }
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

    getClients() {
      return Array.isArray(this.getState().customers) ? this.getState().customers : [];
    },

    getSales() {
      return Array.isArray(this.getState().sales) ? this.getState().sales : [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    uuid() {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    },

    createId(prefix = 'CLI') {
      if (typeof app.createId === 'function') return app.createId(prefix);
      const stamp = Date.now().toString().slice(-6);
      return `${prefix}-${stamp}`;
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

    formatDate(value) {
      if (typeof app.formatDate === 'function') return app.formatDate(value);
      if (!value) return '-';
      return new Date(value).toLocaleDateString('pt-BR');
    },

    includesText(haystack, needle) {
      if (typeof app.includesText === 'function') return app.includesText(haystack, needle);
      return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
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

    resetForm(skipScroll = false) {
      this.editingClientId = null;
      if (this.refs.form) this.refs.form.reset();

      this.refs.clientId.value = '';
      this.refs.clientCode.value = this.createId('CLI');
      this.refs.clientStatus.value = 'Ativo';
      this.refs.clientOrigin.value = 'Instagram';
      this.refs.clientPaymentPreference.value = 'Pix';
      this.refs.clientReceiveOffers.checked = true;
      this.refs.clientPriorityService.checked = false;

      this.updateModeTag('Novo cadastro');
      this.updateLiveSummary();

      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    updateModeTag(label) {
      if (this.refs.clientModeTag) this.refs.clientModeTag.textContent = label;
    },

    validateForm() {
      const name = this.refs.clientName.value.trim();
      const phone = this.refs.clientPhone.value.trim();
      const email = this.refs.clientEmail.value.trim();

      if (!name) {
        this.showToast('Informe o nome do cliente.', 'warning');
        this.refs.clientName.focus();
        return false;
      }

      if (!phone && !email) {
        this.showToast('Informe ao menos telefone ou e-mail do cliente.', 'warning');
        this.refs.clientPhone.focus();
        return false;
      }

      const duplicatePhone = phone && this.getClients().find((client) => {
        return client.id !== this.editingClientId &&
          this.normalizePhone(client.phone) === this.normalizePhone(phone);
      });

      if (duplicatePhone) {
        this.showToast('Já existe um cliente com esse telefone.', 'warning');
        return false;
      }

      const duplicateEmail = email && this.getClients().find((client) => {
        return client.id !== this.editingClientId &&
          String(client.email || '').toLowerCase() === email.toLowerCase();
      });

      if (duplicateEmail) {
        this.showToast('Já existe um cliente com esse e-mail.', 'warning');
        return false;
      }

      return true;
    },

    buildClientPayload() {
      const existing = this.findClientById(this.editingClientId);
      const now = new Date().toISOString();

      return {
        id: existing?.id || this.refs.clientId.value || this.uuid(),
        code: existing?.code || this.refs.clientCode.value || this.createId('CLI'),
        status: this.refs.clientStatus.value,
        origin: this.refs.clientOrigin.value,
        name: this.refs.clientName.value.trim(),
        shortName: this.refs.clientShortName.value.trim(),
        phone: this.refs.clientPhone.value.trim(),
        email: this.refs.clientEmail.value.trim(),
        birthday: this.refs.clientBirthday.value,
        instagram: this.refs.clientInstagram.value.trim(),
        cpf: this.refs.clientCpf.value.trim(),
        address: this.refs.clientAddress.value.trim(),
        deliveryReference: this.refs.clientDeliveryReference.value.trim(),
        paymentPreference: this.refs.clientPaymentPreference.value,
        favoriteProduct: this.refs.clientFavoriteProduct.value.trim(),
        tags: this.parseTags(this.refs.clientTags.value),
        notes: this.refs.clientNotes.value.trim(),
        receiveOffers: Boolean(this.refs.clientReceiveOffers.checked),
        priorityService: Boolean(this.refs.clientPriorityService.checked),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        createdBy: existing?.createdBy || this.getCurrentUser().email || 'admin@husky.com',
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    handleSaveClient(isUpdate = false) {
      try {
        if (!this.validateForm()) return;

        const client = this.buildClientPayload();
        const state = this.getState();
        state.customers = this.upsertItem(state.customers || [], client, 'id');
        this.setState(state);

        this.selectedClientId = client.id;
        this.renderAll();

        this.showToast(
          isUpdate || this.editingClientId
            ? 'Cliente atualizado com sucesso.'
            : 'Cliente salvo com sucesso.',
          'success'
        );

        this.log('Cliente salvo/atualizado.', {
          clientId: client.id,
          code: client.code,
          name: client.name
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Clientes] erro ao salvar cliente', error);
        this.showToast('Não foi possível salvar o cliente.', 'danger');
      }
    },

    handleDeleteClient() {
      try {
        const client = this.findClientById(this.editingClientId || this.refs.clientId.value);

        if (!client) {
          this.showToast('Selecione um cliente para excluir.', 'warning');
          return;
        }

        const clientSales = this.getSalesByClient(client);
        if (clientSales.length) {
          this.showToast('Este cliente possui histórico de vendas e não pode ser excluído. Deixe-o inativo.', 'warning');
          return;
        }

        const confirmed = this.confirmAction(`Deseja excluir o cliente ${client.name}?`);
        if (!confirmed) return;

        const state = this.getState();
        state.customers = this.removeById(state.customers || [], client.id);
        this.setState(state);

        const remaining = this.getClients();
        this.selectedClientId = remaining[0]?.id || null;
        this.renderAll();

        this.showToast('Cliente excluído com sucesso.', 'success');
        this.log('Cliente excluído.', {
          clientId: client.id,
          code: client.code,
          name: client.name
        });

        this.resetForm();
      } catch (error) {
        console.error('[Husky Clientes] erro ao excluir cliente', error);
        this.showToast('Não foi possível excluir o cliente.', 'danger');
      }
    },

    updateLiveSummary() {
      const clientDraft = {
        status: this.refs.clientStatus.value || 'Ativo',
        origin: this.refs.clientOrigin.value || 'Instagram',
        paymentPreference: this.refs.clientPaymentPreference.value || 'Pix',
        priorityService: Boolean(this.refs.clientPriorityService.checked),
        receiveOffers: Boolean(this.refs.clientReceiveOffers.checked),
        phone: this.refs.clientPhone.value.trim(),
        email: this.refs.clientEmail.value.trim(),
        birthday: this.refs.clientBirthday.value,
        favoriteProduct: this.refs.clientFavoriteProduct.value.trim(),
        address: this.refs.clientAddress.value.trim(),
        deliveryReference: this.refs.clientDeliveryReference.value.trim(),
        notes: this.refs.clientNotes.value.trim(),
        name: this.refs.clientName.value.trim()
      };

      const history = this.getClientStats(clientDraft, true);

      this.refs.clientSummaryStatus.textContent = clientDraft.status;
      this.refs.clientSummaryOrigin.textContent = clientDraft.origin;
      this.refs.clientSummaryPayment.textContent = clientDraft.paymentPreference;
      this.refs.clientSummaryPriority.textContent = clientDraft.priorityService ? 'Prioritário / VIP' : 'Padrão';
      this.refs.clientSummaryOffers.textContent = clientDraft.receiveOffers ? 'Sim' : 'Não';

      this.refs.clientStatusPhone.textContent = clientDraft.phone || '-';
      this.refs.clientStatusEmail.textContent = clientDraft.email || '-';
      this.refs.clientStatusBirthday.textContent = clientDraft.birthday ? this.formatDate(clientDraft.birthday) : '-';
      this.refs.clientStatusFavorite.textContent = clientDraft.favoriteProduct || '-';

      this.refs.clientOrdersCount.textContent = String(history.ordersCount || 0);
      this.refs.clientTotalSpent.textContent = this.formatCurrency(history.totalSpent || 0);
      this.refs.clientLastOrder.textContent = history.lastOrderDate ? this.formatDate(history.lastOrderDate) : '-';
      this.refs.clientAverageTicket.textContent = this.formatCurrency(history.averageTicket || 0);

      this.refs.clientSelectedAddress.textContent = clientDraft.address || '-';
      this.refs.clientSelectedReference.textContent = clientDraft.deliveryReference || '-';
      this.refs.clientSelectedPayment.textContent = clientDraft.paymentPreference || '-';
      this.refs.clientSelectedNotes.textContent = clientDraft.notes || '-';
    },

    applyFilters() {
      this.filters.search = this.refs.clientsSearch.value.trim();
      this.filters.status = this.refs.clientsFilterStatus.value;
      this.filters.origin = this.refs.clientsFilterOrigin.value;
      this.filters.profile = this.refs.clientsFilterProfile.value;
      this.renderClientsTable();
    },

    clearFilters() {
      this.filters = {
        search: '',
        status: '',
        origin: '',
        profile: ''
      };

      this.refs.clientsSearch.value = '';
      this.refs.clientsFilterStatus.value = '';
      this.refs.clientsFilterOrigin.value = '';
      this.refs.clientsFilterProfile.value = '';
      this.renderClientsTable();
    },

    getFilteredClients() {
      return this.getClients()
        .filter((client) => {
          const haystack = [
            client.name,
            client.shortName,
            client.phone,
            client.email,
            client.cpf,
            client.instagram,
            client.origin,
            ...(client.tags || [])
          ].join(' ');

          const matchesSearch = !this.filters.search || this.includesText(haystack, this.filters.search);
          const matchesStatus = !this.filters.status || client.status === this.filters.status;
          const matchesOrigin = !this.filters.origin || client.origin === this.filters.origin;
          const matchesProfile = !this.filters.profile || this.matchesProfileFilter(client, this.filters.profile);

          return matchesSearch && matchesStatus && matchesOrigin && matchesProfile;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    matchesProfileFilter(client, profile) {
      const stats = this.getClientStats(client);

      if (profile === 'recorrente') return stats.ordersCount > 1;
      if (profile === 'vip') return client.status === 'VIP' || client.priorityService;
      if (profile === 'aniversario') return this.isBirthdaySoon(client.birthday);
      if (profile === 'semcompra') return stats.ordersCount === 0 || this.isWithoutRecentPurchase(stats.lastOrderDate);
      return true;
    },

    renderAll() {
      this.renderMetrics();
      this.renderClientsTable();
      this.renderFeaturedClients();
      this.renderBirthdays();
      this.renderSelectedClientPanels();
      this.updateLiveSummary();
    },

    renderMetrics() {
      const clients = this.getClients();
      const recurring = clients.filter((client) => this.getClientStats(client).ordersCount > 1);
      const birthdaysSoon = clients.filter((client) => this.isBirthdaySoon(client.birthday));
      const bestCustomer = [...clients].sort((a, b) => this.getClientStats(b).totalSpent - this.getClientStats(a).totalSpent)[0];
      const bestCustomerStats = bestCustomer ? this.getClientStats(bestCustomer) : null;

      this.refs.clientsTotalCount.textContent = String(clients.length);
      this.refs.clientsRecurringCount.textContent = String(recurring.length);
      this.refs.clientsBirthdayCount.textContent = String(birthdaysSoon.length);
      this.refs.clientsBestCustomer.textContent = bestCustomer
        ? `${bestCustomer.name} • ${this.formatCurrency(bestCustomerStats.totalSpent)}`
        : '-';
    },

    renderClientsTable() {
      const clients = this.getFilteredClients();

      if (!clients.length) {
        this.refs.clientsTableBody.innerHTML = `
          <tr>
            <td colspan="7">Nenhum cliente encontrado.</td>
          </tr>
        `;
        return;
      }

      this.refs.clientsTableBody.innerHTML = clients.map((client) => {
        const stats = this.getClientStats(client);

        return `
          <tr>
            <td>${this.escapeHtml(client.name)}</td>
            <td>${this.escapeHtml(client.phone || client.email || '-')}</td>
            <td>${this.escapeHtml(client.origin || '-')}</td>
            <td>${this.escapeHtml(client.status || '-')}</td>
            <td>${stats.lastOrderDate ? this.formatDate(stats.lastOrderDate) : '-'}</td>
            <td>${this.formatCurrency(stats.totalSpent || 0)}</td>
            <td>
              <div class="table-action-group">
                <button type="button" class="btn btn-secondary btn-small" data-action="edit-client" data-id="${client.id}">Editar</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="view-client" data-id="${client.id}">Ver</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderSelectedClientPanels() {
      const selected = this.findClientById(this.selectedClientId) || this.getClients()[0] || null;

      if (!selected) {
        this.refs.clientOrdersTableBody.innerHTML = '<tr><td colspan="5">Nenhum cliente selecionado.</td></tr>';
        this.refs.clientSelectedAddress.textContent = '-';
        this.refs.clientSelectedReference.textContent = '-';
        this.refs.clientSelectedPayment.textContent = '-';
        this.refs.clientSelectedNotes.textContent = '-';
        return;
      }

      this.selectedClientId = selected.id;
      const sales = this.getSalesByClient(selected).slice(0, 12);
      const stats = this.getClientStats(selected);

      this.refs.clientOrdersCount.textContent = String(stats.ordersCount || 0);
      this.refs.clientTotalSpent.textContent = this.formatCurrency(stats.totalSpent || 0);
      this.refs.clientLastOrder.textContent = stats.lastOrderDate ? this.formatDate(stats.lastOrderDate) : '-';
      this.refs.clientAverageTicket.textContent = this.formatCurrency(stats.averageTicket || 0);

      this.refs.clientSelectedAddress.textContent = selected.address || '-';
      this.refs.clientSelectedReference.textContent = selected.deliveryReference || '-';
      this.refs.clientSelectedPayment.textContent = selected.paymentPreference || '-';
      this.refs.clientSelectedNotes.textContent = selected.notes || '-';

      if (!sales.length) {
        this.refs.clientOrdersTableBody.innerHTML = '<tr><td colspan="5">Nenhum pedido vinculado a este cliente.</td></tr>';
      } else {
        this.refs.clientOrdersTableBody.innerHTML = sales.map((sale) => `
          <tr>
            <td>${this.escapeHtml(sale.orderNumber || '-')}</td>
            <td>${this.formatDate(sale.date)}</td>
            <td>${this.escapeHtml(sale.paymentMethod || '-')}</td>
            <td>${this.escapeHtml(sale.orderStatus || '-')}</td>
            <td>${this.formatCurrency(sale.total || 0)}</td>
          </tr>
        `).join('');
      }
    },

    renderFeaturedClients() {
      const featured = this.getClients()
        .map((client) => ({ client, stats: this.getClientStats(client) }))
        .filter((entry) => entry.stats.ordersCount > 0 || entry.client.status === 'VIP' || entry.client.priorityService)
        .sort((a, b) => {
          const aScore = (a.client.status === 'VIP' ? 1000000 : 0) +
            (a.client.priorityService ? 500000 : 0) +
            a.stats.totalSpent;
          const bScore = (b.client.status === 'VIP' ? 1000000 : 0) +
            (b.client.priorityService ? 500000 : 0) +
            b.stats.totalSpent;
          return bScore - aScore;
        })
        .slice(0, 6);

      if (!featured.length) {
        this.refs.featuredClientsList.innerHTML = `
          <div class="pix-proof-card">
            <div>
              <strong>Nenhum cliente em destaque</strong>
              <p>Os clientes com maior relacionamento aparecerão aqui.</p>
            </div>
            <span class="tag">-</span>
          </div>
        `;
        return;
      }

      this.refs.featuredClientsList.innerHTML = featured.map(({ client, stats }) => `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(client.name)}</strong>
            <p>${stats.ordersCount} pedido(s) • ${this.formatCurrency(stats.totalSpent)} acumulados</p>
          </div>
          <span class="tag">${client.status === 'VIP' || client.priorityService ? 'VIP' : 'Recorrente'}</span>
        </div>
      `).join('');
    },

    renderBirthdays() {
      const birthdays = this.getClients()
        .filter((client) => client.birthday)
        .map((client) => ({ client, distance: this.getBirthdayDistance(client.birthday) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12);

      if (!birthdays.length) {
        this.refs.clientsBirthdayTableBody.innerHTML = '<tr><td colspan="4">Nenhum aniversário cadastrado.</td></tr>';
        return;
      }

      this.refs.clientsBirthdayTableBody.innerHTML = birthdays.map(({ client, distance }) => `
        <tr>
          <td>${this.escapeHtml(client.name)}</td>
          <td>${client.birthday ? this.formatDate(client.birthday) : '-'}</td>
          <td>${this.escapeHtml(client.phone || client.email || '-')}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-small" data-action="select-client" data-id="${client.id}">
              ${distance <= 7 ? 'Priorizar' : 'Marcar'}
            </button>
          </td>
        </tr>
      `).join('');
    },

    handleTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const clientId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-client') {
        this.loadClientIntoForm(clientId);
      }

      if (action === 'view-client') {
        this.selectedClientId = clientId;
        this.renderSelectedClientPanels();
        window.scrollTo({
          top: document.querySelector('.content-grid.two-columns')?.offsetTop || 0,
          behavior: 'smooth'
        });
      }
    },

    handleBirthdayActions(event) {
      const button = event.target.closest('button[data-action="select-client"]');
      if (!button) return;

      this.selectedClientId = button.dataset.id;
      this.renderSelectedClientPanels();
      this.showToast('Cliente selecionado para acompanhamento.', 'success');
    },

    loadClientIntoForm(clientId) {
      const client = this.findClientById(clientId);

      if (!client) {
        this.showToast('Cliente não encontrado.', 'danger');
        return;
      }

      this.editingClientId = client.id;
      this.selectedClientId = client.id;

      this.refs.clientId.value = client.id;
      this.refs.clientCode.value = client.code || '';
      this.refs.clientStatus.value = client.status || 'Ativo';
      this.refs.clientOrigin.value = client.origin || 'Instagram';
      this.refs.clientName.value = client.name || '';
      this.refs.clientShortName.value = client.shortName || '';
      this.refs.clientPhone.value = client.phone || '';
      this.refs.clientEmail.value = client.email || '';
      this.refs.clientBirthday.value = client.birthday || '';
      this.refs.clientInstagram.value = client.instagram || '';
      this.refs.clientCpf.value = client.cpf || '';
      this.refs.clientAddress.value = client.address || '';
      this.refs.clientDeliveryReference.value = client.deliveryReference || '';
      this.refs.clientPaymentPreference.value = client.paymentPreference || 'Pix';
      this.refs.clientFavoriteProduct.value = client.favoriteProduct || '';
      this.refs.clientTags.value = (client.tags || []).join(', ');
      this.refs.clientNotes.value = client.notes || '';
      this.refs.clientReceiveOffers.checked = Boolean(client.receiveOffers ?? true);
      this.refs.clientPriorityService.checked = Boolean(client.priorityService);

      this.updateModeTag(`Editando ${client.code || client.name}`);
      this.updateLiveSummary();
      this.renderSelectedClientPanels();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    getSalesByClient(client) {
      if (!client) return [];

      return this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .filter((sale) => this.saleMatchesClient(sale, client))
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    getClientStats(client, isDraft = false) {
      if (!client) {
        return {
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          averageTicket: 0
        };
      }

      const sales = isDraft ? this.matchSalesToDraftClient(client) : this.getSalesByClient(client);
      const ordersCount = sales.length;
      const totalSpent = this.sum(sales, (sale) => sale.total || 0);
      const lastOrderDate = sales[0]?.date || null;
      const averageTicket = ordersCount ? totalSpent / ordersCount : 0;

      return {
        ordersCount,
        totalSpent,
        lastOrderDate,
        averageTicket
      };
    },

    matchSalesToDraftClient(draftClient) {
      const draftName = this.normalizeText(draftClient.name || '');
      const draftPhone = this.normalizePhone(draftClient.phone || '');
      const draftEmail = String(draftClient.email || '').toLowerCase().trim();

      return this.getSales()
        .filter((sale) => sale.orderStatus !== 'Cancelado')
        .filter((sale) => {
          const saleName = this.normalizeText(sale.client?.name || '');
          const salePhone = this.normalizePhone(sale.client?.phone || '');
          const saleEmail = String(sale.client?.email || '').toLowerCase().trim();

          return Boolean(
            (draftPhone && salePhone && draftPhone === salePhone) ||
            (draftEmail && saleEmail && draftEmail === saleEmail) ||
            (draftName && saleName && draftName === saleName)
          );
        })
        .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    },

    saleMatchesClient(sale, client) {
      const clientPhone = this.normalizePhone(client.phone || '');
      const salePhone = this.normalizePhone(sale.client?.phone || '');
      const clientEmail = String(client.email || '').toLowerCase().trim();
      const saleEmail = String(sale.client?.email || '').toLowerCase().trim();
      const clientName = this.normalizeText(client.name || '');
      const saleName = this.normalizeText(sale.client?.name || '');

      return Boolean(
        (clientPhone && salePhone && clientPhone === salePhone) ||
        (clientEmail && saleEmail && clientEmail === saleEmail) ||
        (clientName && saleName && clientName === saleName)
      );
    },

    isBirthdaySoon(birthday) {
      if (!birthday) return false;
      return this.getBirthdayDistance(birthday) <= 30;
    },

    getBirthdayDistance(birthday) {
      if (!birthday) return Number.POSITIVE_INFINITY;

      const today = new Date();
      const [year, month, day] = String(birthday).split('-').map(Number);

      if (!month || !day) return Number.POSITIVE_INFINITY;

      let nextBirthday = new Date(today.getFullYear(), month - 1, day);

      if (nextBirthday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
      }

      const diffMs = nextBirthday.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    },

    isWithoutRecentPurchase(lastOrderDate) {
      if (!lastOrderDate) return true;

      const today = new Date(typeof app.todayISO === 'function' ? app.todayISO() : new Date().toISOString().slice(0, 10));
      const last = new Date(lastOrderDate);
      const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 60;
    },

    findClientById(id) {
      if (!id) return null;
      return this.getClients().find((client) => client.id === id) || null;
    },

    parseTags(raw) {
      return String(raw || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    },

    normalizePhone(value) {
      return String(value || '').replace(/\D/g, '');
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

  document.addEventListener('DOMContentLoaded', () => CLIENTS_PAGE.init());
  window.HuskyClients = CLIENTS_PAGE;
})();
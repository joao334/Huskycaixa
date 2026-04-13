(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Produtos] HuskyApp não encontrado. Verifique se app.js foi carregado antes de produtos.js.');
    return;
  }

  const PRODUCTS_PAGE = {
    refs: {},
    filters: {
      search: '',
      category: '',
      status: '',
      stock: ''
    },
    editingProductId: null,
    imageDraft: null,

    init() {
      if (!document.getElementById('product-form')) return;
      this.cacheRefs();
      this.bindEvents();
      this.prepareInitialState();
      this.renderAll();
      app.log('Tela de produtos carregada.');
    },

    cacheRefs() {
      this.refs = {
        form: document.getElementById('product-form'),
        productId: document.getElementById('product-id'),
        productCode: document.getElementById('product-code'),
        productStatus: document.getElementById('product-status'),
        productCategory: document.getElementById('product-category'),
        productName: document.getElementById('product-name'),
        productShortName: document.getElementById('product-short-name'),
        productSalePrice: document.getElementById('product-sale-price'),
        productCostPrice: document.getElementById('product-cost-price'),
        productStock: document.getElementById('product-stock'),
        productMinStock: document.getElementById('product-min-stock'),
        productUnit: document.getElementById('product-unit'),
        productSku: document.getElementById('product-sku'),
        productProductionTime: document.getElementById('product-production-time'),
        productDescription: document.getElementById('product-description'),
        productImage: document.getElementById('product-image'),
        productTags: document.getElementById('product-tags'),
        productFeatured: document.getElementById('product-featured'),
        productAllowSale: document.getElementById('product-allow-sale'),
        productImagePreview: document.getElementById('product-image-preview'),

        productModeTag: document.getElementById('product-mode-tag'),
        btnSaveProduct: document.getElementById('btn-save-product'),
        btnUpdateProduct: document.getElementById('btn-update-product'),
        btnDuplicateProduct: document.getElementById('btn-duplicate-product'),
        btnDeleteProduct: document.getElementById('btn-delete-product'),
        btnNewProductTop: document.getElementById('btn-new-product-top'),
        btnNewProductHero: document.getElementById('btn-new-product-hero'),

        productsActiveCount: document.getElementById('products-active-count'),
        productsCategoryCount: document.getElementById('products-category-count'),
        productsLowStockCount: document.getElementById('products-low-stock-count'),
        productsBestMargin: document.getElementById('products-best-margin'),

        productSummaryPrice: document.getElementById('product-summary-price'),
        productSummaryCost: document.getElementById('product-summary-cost'),
        productSummaryProfit: document.getElementById('product-summary-profit'),
        productSummaryMargin: document.getElementById('product-summary-margin'),
        productSummaryStock: document.getElementById('product-summary-stock'),

        productPreviewImage: document.getElementById('product-preview-image'),
        productPreviewCategory: document.getElementById('product-preview-category'),
        productPreviewName: document.getElementById('product-preview-name'),
        productPreviewDescription: document.getElementById('product-preview-description'),
        productPreviewPrice: document.getElementById('product-preview-price'),
        productPreviewStatus: document.getElementById('product-preview-status'),

        productStatusSummary: document.getElementById('product-status-summary'),
        productCategorySummary: document.getElementById('product-category-summary'),
        productSaleSummary: document.getElementById('product-sale-summary'),
        productFeaturedSummary: document.getElementById('product-featured-summary'),

        productsSearch: document.getElementById('products-search'),
        productsFilterCategory: document.getElementById('products-filter-category'),
        productsFilterStatus: document.getElementById('products-filter-status'),
        productsFilterStock: document.getElementById('products-filter-stock'),
        btnFilterProducts: document.getElementById('btn-filter-products'),
        btnClearProductsFilter: document.getElementById('btn-clear-products-filter'),

        productsTableBody: document.getElementById('products-table-body'),
        featuredProductsGrid: document.getElementById('featured-products-grid'),
        lowStockProductsTable: document.getElementById('low-stock-products-table')
      };
    },

    bindEvents() {
      this.refs.btnSaveProduct?.addEventListener('click', () => this.handleSaveProduct());
      this.refs.btnUpdateProduct?.addEventListener('click', () => this.handleSaveProduct(true));
      this.refs.btnDuplicateProduct?.addEventListener('click', () => this.handleDuplicateProduct());
      this.refs.btnDeleteProduct?.addEventListener('click', () => this.handleDeleteProduct());
      this.refs.btnNewProductTop?.addEventListener('click', () => this.resetForm());
      this.refs.btnNewProductHero?.addEventListener('click', () => this.resetForm());
      this.refs.productImage?.addEventListener('change', (event) => this.handleImageUpload(event));

      [
        this.refs.productStatus,
        this.refs.productCategory,
        this.refs.productName,
        this.refs.productShortName,
        this.refs.productSalePrice,
        this.refs.productCostPrice,
        this.refs.productStock,
        this.refs.productMinStock,
        this.refs.productDescription,
        this.refs.productFeatured,
        this.refs.productAllowSale
      ].forEach((field) => {
        field?.addEventListener('input', () => this.updateLivePreview());
        field?.addEventListener('change', () => this.updateLivePreview());
      });

      this.refs.btnFilterProducts?.addEventListener('click', () => this.applyFilters());
      this.refs.btnClearProductsFilter?.addEventListener('click', () => this.clearFilters());
      this.refs.productsTableBody?.addEventListener('click', (event) => this.handleTableActions(event));
    },

    prepareInitialState() {
      this.resetForm(true);
    },

    getState() {
      return app.getAppState();
    },

    setState(nextState) {
      app.setAppState(nextState);
      return nextState;
    },

    getProducts() {
      return this.getState().products || [];
    },

    getCurrentUser() {
      return this.getState().currentUser || { name: 'Administrador', email: 'admin@husky.com' };
    },

    resetForm(keepDefaults = false) {
      this.editingProductId = null;
      this.imageDraft = null;

      if (this.refs.form) this.refs.form.reset();

      this.refs.productId.value = '';
      this.refs.productCode.value = app.createId('PRD');
      this.refs.productStatus.value = 'Ativo';
      this.refs.productUnit.value = 'un';
      this.refs.productCategory.value = '';
      this.refs.productFeatured.checked = false;
      this.refs.productAllowSale.checked = true;
      if (this.refs.productImage) this.refs.productImage.value = '';

      if (!keepDefaults) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      this.updateModeTag('Novo cadastro');
      this.updateImagePreview();
      this.updateLivePreview();
    },

    updateModeTag(label) {
      if (this.refs.productModeTag) this.refs.productModeTag.textContent = label;
    },

    validateForm() {
      if (!this.refs.productName.value.trim()) {
        app.showToast('Informe o nome do produto.', 'warning');
        this.refs.productName.focus();
        return false;
      }

      if (!this.refs.productCategory.value) {
        app.showToast('Selecione uma categoria.', 'warning');
        this.refs.productCategory.focus();
        return false;
      }

      const salePrice = app.toNumber(this.refs.productSalePrice.value || 0);
      const costPrice = app.toNumber(this.refs.productCostPrice.value || 0);
      const stock = app.toNumber(this.refs.productStock.value || 0);
      const minStock = app.toNumber(this.refs.productMinStock.value || 0);

      if (salePrice <= 0) {
        app.showToast('Informe um preço de venda válido.', 'warning');
        this.refs.productSalePrice.focus();
        return false;
      }

      if (costPrice < 0) {
        app.showToast('Informe um custo válido.', 'warning');
        this.refs.productCostPrice.focus();
        return false;
      }

      if (stock < 0 || minStock < 0) {
        app.showToast('Estoque e estoque mínimo não podem ser negativos.', 'warning');
        return false;
      }

      const duplicated = this.getProducts().find((product) => {
        const sameName = app.normalizeText(product.name) === app.normalizeText(this.refs.productName.value);
        const sameId = product.id === this.editingProductId;
        return sameName && !sameId;
      });

      if (duplicated) {
        app.showToast('Já existe um produto com esse nome.', 'warning');
        return false;
      }

      return true;
    },

    buildProductPayload({ duplicate = false } = {}) {
      const current = this.findProductById(this.editingProductId);
      const now = new Date().toISOString();
      const salePrice = app.toNumber(this.refs.productSalePrice.value || 0);
      const costPrice = app.toNumber(this.refs.productCostPrice.value || 0);

      return {
        id: duplicate ? crypto.randomUUID() : (current?.id || this.refs.productId.value || crypto.randomUUID()),
        code: duplicate ? app.createId('PRD') : (current?.code || this.refs.productCode.value || app.createId('PRD')),
        name: this.refs.productName.value.trim(),
        shortName: this.refs.productShortName.value.trim(),
        category: this.refs.productCategory.value,
        status: this.refs.productStatus.value,
        price: salePrice,
        cost: costPrice,
        stock: app.toNumber(this.refs.productStock.value || 0),
        minStock: app.toNumber(this.refs.productMinStock.value || 0),
        unit: this.refs.productUnit.value,
        sku: this.refs.productSku.value.trim(),
        productionTime: this.refs.productProductionTime.value.trim(),
        description: this.refs.productDescription.value.trim(),
        tags: this.parseTags(this.refs.productTags.value),
        featured: this.refs.productFeatured.checked,
        allowSale: this.refs.productAllowSale.checked,
        image: this.imageDraft || current?.image || null,
        createdAt: duplicate ? now : (current?.createdAt || now),
        updatedAt: now,
        createdBy: duplicate ? (this.getCurrentUser().email || 'admin@husky.com') : (current?.createdBy || this.getCurrentUser().email || 'admin@husky.com'),
        updatedBy: this.getCurrentUser().email || 'admin@husky.com'
      };
    },

    handleSaveProduct(isUpdate = false) {
      if (!this.validateForm()) return;

      const product = this.buildProductPayload();
      const state = this.getState();
      state.products = app.upsertItem(state.products || [], product, 'id');
      this.setState(state);
      this.renderAll();
      app.showToast(isUpdate || this.editingProductId ? 'Produto atualizado com sucesso.' : 'Produto salvo com sucesso.', 'success');
      app.log('Produto salvo/atualizado.', { productId: product.id, code: product.code, name: product.name });
      this.resetForm();
    },

    handleDuplicateProduct() {
      if (!this.validateForm()) return;

      const product = this.buildProductPayload({ duplicate: true });
      product.name = `${product.name} (Cópia)`;

      const state = this.getState();
      state.products = app.upsertItem(state.products || [], product, 'id');
      this.setState(state);
      this.renderAll();
      app.showToast('Produto duplicado com sucesso.', 'success');
      app.log('Produto duplicado.', { productId: product.id, code: product.code, name: product.name });
      this.resetForm();
    },

    handleDeleteProduct() {
      const productId = this.editingProductId || this.refs.productId.value;
      const product = this.findProductById(productId);

      if (!product) {
        app.showToast('Selecione um produto para excluir.', 'warning');
        return;
      }

      const isProductInSales = (this.getState().sales || []).some((sale) => (sale.items || []).some((item) => item.productId === product.id));
      if (isProductInSales) {
        app.showToast('Este produto já foi usado em vendas e não pode ser excluído. Deixe-o inativo.', 'warning');
        return;
      }

      const confirmed = app.confirmAction(`Deseja excluir o produto ${product.name}?`);
      if (!confirmed) return;

      const state = this.getState();
      state.products = app.removeById(state.products || [], product.id);
      state.stockMovements = (state.stockMovements || []).filter((movement) => movement.productId !== product.id);
      this.setState(state);
      this.renderAll();
      app.showToast('Produto excluído com sucesso.', 'success');
      app.log('Produto excluído.', { productId: product.id, code: product.code, name: product.name });
      this.resetForm();
    },

    handleImageUpload(event) {
      const file = event.target.files?.[0];
      if (!file) {
        this.imageDraft = null;
        this.updateImagePreview();
        this.updateLivePreview();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imageDraft = {
          name: file.name,
          type: file.type || 'image/*',
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString()
        };
        this.updateImagePreview();
        this.updateLivePreview();
        app.showToast('Imagem do produto carregada com sucesso.', 'success');
      };
      reader.onerror = () => {
        app.showToast('Não foi possível ler a imagem do produto.', 'danger');
      };
      reader.readAsDataURL(file);
    },

    updateImagePreview() {
      const image = this.imageDraft || this.findProductById(this.editingProductId)?.image || null;

      if (!image?.dataUrl) {
        this.refs.productImagePreview.innerHTML = '<p>Nenhuma imagem enviada.</p>';
        if (this.refs.productPreviewImage) this.refs.productPreviewImage.src = 'assets/img/logo-husky.png';
        return;
      }

      const sizeKb = image.size ? `${Math.ceil(image.size / 1024)} KB` : '-';
      this.refs.productImagePreview.innerHTML = `
        <div class="pix-proof-card">
          <div>
            <strong>${this.escapeHtml(image.name || 'Imagem do produto')}</strong>
            <p>Tipo: ${this.escapeHtml(image.type || '-') } • Tamanho: ${sizeKb}</p>
          </div>
          <span class="tag">Imagem</span>
        </div>
        <div style="margin-top: 12px;">
          <img src="${image.dataUrl}" alt="Imagem do produto" style="max-width: 100%; border-radius: 14px; border: 1px solid #ead9cd;" />
        </div>
      `;

      if (this.refs.productPreviewImage) this.refs.productPreviewImage.src = image.dataUrl;
    },

    updateLivePreview() {
      const salePrice = app.toNumber(this.refs.productSalePrice.value || 0);
      const costPrice = app.toNumber(this.refs.productCostPrice.value || 0);
      const stock = app.toNumber(this.refs.productStock.value || 0);
      const minStock = app.toNumber(this.refs.productMinStock.value || 0);
      const unitProfit = salePrice - costPrice;
      const margin = app.calculateMargin(salePrice, costPrice);
      const name = this.refs.productName.value.trim() || 'Nome do produto';
      const description = this.refs.productDescription.value.trim() || 'Descrição resumida do produto.';
      const category = this.refs.productCategory.value || 'Categoria';
      const status = this.refs.productStatus.value || 'Ativo';
      const allowSale = this.refs.productAllowSale.checked ? 'Sim' : 'Não';
      const featured = this.refs.productFeatured.checked ? 'Sim' : 'Não';

      this.refs.productSummaryPrice.textContent = app.formatCurrency(salePrice);
      this.refs.productSummaryCost.textContent = app.formatCurrency(costPrice);
      this.refs.productSummaryProfit.textContent = app.formatCurrency(unitProfit);
      this.refs.productSummaryMargin.textContent = `${app.formatNumber(margin, 1)}%`;
      this.refs.productSummaryStock.textContent = `${stock}`;

      this.refs.productPreviewCategory.textContent = category;
      this.refs.productPreviewName.textContent = name;
      this.refs.productPreviewDescription.textContent = description;
      this.refs.productPreviewPrice.textContent = app.formatCurrency(salePrice);
      this.refs.productPreviewStatus.textContent = status;

      this.refs.productStatusSummary.textContent = status;
      this.refs.productCategorySummary.textContent = category;
      this.refs.productSaleSummary.textContent = allowSale;
      this.refs.productFeaturedSummary.textContent = featured;

      const productImage = this.imageDraft || this.findProductById(this.editingProductId)?.image || null;
      if (productImage?.dataUrl && this.refs.productPreviewImage) {
        this.refs.productPreviewImage.src = productImage.dataUrl;
      } else if (this.refs.productPreviewImage) {
        this.refs.productPreviewImage.src = 'assets/img/logo-husky.png';
      }

      if (stock <= 0) {
        this.refs.productStatusSummary.textContent = 'Esgotado';
      } else if (stock <= minStock) {
        this.refs.productStatusSummary.textContent = `${status} • Baixo estoque`;
      }
    },

    applyFilters() {
      this.filters.search = this.refs.productsSearch.value.trim();
      this.filters.category = this.refs.productsFilterCategory.value;
      this.filters.status = this.refs.productsFilterStatus.value;
      this.filters.stock = this.refs.productsFilterStock.value;
      this.renderProductsTable();
    },

    clearFilters() {
      this.filters = {
        search: '',
        category: '',
        status: '',
        stock: ''
      };

      this.refs.productsSearch.value = '';
      this.refs.productsFilterCategory.value = '';
      this.refs.productsFilterStatus.value = '';
      this.refs.productsFilterStock.value = '';
      this.renderProductsTable();
    },

    getFilteredProducts() {
      return this.getProducts().filter((product) => {
        const haystack = [
          product.name,
          product.shortName,
          product.code,
          product.sku,
          product.category,
          ...(product.tags || [])
        ].join(' ');

        const matchesSearch = !this.filters.search || app.includesText(haystack, this.filters.search);
        const matchesCategory = !this.filters.category || product.category === this.filters.category;
        const matchesStatus = !this.filters.status || product.status === this.filters.status;
        const matchesStock = !this.filters.stock || this.matchStockFilter(product, this.filters.stock);

        return matchesSearch && matchesCategory && matchesStatus && matchesStock;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    },

    matchStockFilter(product, filter) {
      const stock = app.toNumber(product.stock || 0);
      const minStock = app.toNumber(product.minStock || 0);

      if (filter === 'zero') return stock <= 0;
      if (filter === 'low') return stock > 0 && stock <= minStock;
      if (filter === 'ok') return stock > minStock;
      return true;
    },

    renderAll() {
      this.renderMetrics();
      this.populateCategoryFilter();
      this.renderProductsTable();
      this.renderFeaturedProducts();
      this.renderLowStockProducts();
      this.updateLivePreview();
    },

    renderMetrics() {
      const products = this.getProducts();
      const activeProducts = products.filter((product) => product.status === 'Ativo' && product.allowSale);
      const categories = new Set(products.map((product) => product.category).filter(Boolean));
      const lowStock = products.filter((product) => {
        const stock = app.toNumber(product.stock || 0);
        const minStock = app.toNumber(product.minStock || 0);
        return stock <= minStock;
      });
      const bestMarginProduct = [...products].sort((a, b) => app.calculateMargin(b.price, b.cost) - app.calculateMargin(a.price, a.cost))[0];

      this.refs.productsActiveCount.textContent = String(activeProducts.length);
      this.refs.productsCategoryCount.textContent = String(categories.size);
      this.refs.productsLowStockCount.textContent = String(lowStock.length);
      this.refs.productsBestMargin.textContent = bestMarginProduct
        ? `${app.formatNumber(app.calculateMargin(bestMarginProduct.price, bestMarginProduct.cost), 1)}%`
        : '0%';
    },

    populateCategoryFilter() {
      const current = this.refs.productsFilterCategory.value;
      const categories = [...new Set(this.getProducts().map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      this.refs.productsFilterCategory.innerHTML = `
        <option value="">Todas as categorias</option>
        ${categories.map((category) => `<option value="${this.escapeHtml(category)}">${this.escapeHtml(category)}</option>`).join('')}
      `;

      if (categories.includes(current)) {
        this.refs.productsFilterCategory.value = current;
      }
    },

    renderProductsTable() {
      const products = this.getFilteredProducts();

      if (!products.length) {
        this.refs.productsTableBody.innerHTML = `
          <tr>
            <td colspan="8">Nenhum produto encontrado.</td>
          </tr>
        `;
        return;
      }

      this.refs.productsTableBody.innerHTML = products.map((product) => {
        const stockStatus = this.getStockStatusLabel(product);
        return `
          <tr>
            <td>${this.escapeHtml(product.name)}</td>
            <td>${this.escapeHtml(product.code || '-')}</td>
            <td>${this.escapeHtml(product.category || '-')}</td>
            <td>${app.formatCurrency(product.price || 0)}</td>
            <td>${app.formatCurrency(product.cost || 0)}</td>
            <td>${app.formatNumber(product.stock || 0)}</td>
            <td>${this.escapeHtml(product.status)} • ${stockStatus}</td>
            <td>
              <div class="table-action-group">
                <button type="button" class="btn btn-secondary btn-small" data-action="edit-product" data-id="${product.id}">Editar</button>
                <button type="button" class="btn btn-secondary btn-small" data-action="duplicate-product" data-id="${product.id}">Duplicar</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderFeaturedProducts() {
      const featured = this.getProducts().filter((product) => product.featured).slice(0, 6);

      if (!featured.length) {
        this.refs.featuredProductsGrid.innerHTML = `
          <article class="catalog-mini-card">
            <div class="catalog-mini-image">
              <img src="assets/img/logo-husky.png" alt="Sem produtos em destaque" />
            </div>
            <div class="catalog-mini-content">
              <h4>Nenhum produto em destaque</h4>
              <p>Marque produtos como destaque para vê-los aqui.</p>
              <strong>R$ 0,00</strong>
            </div>
          </article>
        `;
        return;
      }

      this.refs.featuredProductsGrid.innerHTML = featured.map((product) => `
        <article class="catalog-mini-card">
          <div class="catalog-mini-image">
            <img src="${product.image?.dataUrl || 'assets/img/logo-husky.png'}" alt="${this.escapeHtml(product.name)}" />
          </div>
          <div class="catalog-mini-content">
            <h4>${this.escapeHtml(product.name)}</h4>
            <p>${this.escapeHtml(product.category || 'Sem categoria')}</p>
            <strong>${app.formatCurrency(product.price || 0)}</strong>
          </div>
        </article>
      `).join('');
    },

    renderLowStockProducts() {
      const lowStockProducts = this.getProducts().filter((product) => {
        const stock = app.toNumber(product.stock || 0);
        const minStock = app.toNumber(product.minStock || 0);
        return stock <= minStock;
      }).sort((a, b) => app.toNumber(a.stock || 0) - app.toNumber(b.stock || 0));

      if (!lowStockProducts.length) {
        this.refs.lowStockProductsTable.innerHTML = `
          <tr>
            <td colspan="4">Nenhum produto com estoque baixo.</td>
          </tr>
        `;
        return;
      }

      this.refs.lowStockProductsTable.innerHTML = lowStockProducts.map((product) => `
        <tr>
          <td>${this.escapeHtml(product.name)}</td>
          <td>${app.formatNumber(product.stock || 0)}</td>
          <td>${app.formatNumber(product.minStock || 0)}</td>
          <td>${this.getStockStatusLabel(product)}</td>
        </tr>
      `).join('');
    },

    handleTableActions(event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const productId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'edit-product') {
        this.loadProductIntoForm(productId);
      }

      if (action === 'duplicate-product') {
        this.loadProductIntoForm(productId, false);
        this.handleDuplicateProduct();
      }
    },

    loadProductIntoForm(productId, scrollToTop = true) {
      const product = this.findProductById(productId);
      if (!product) {
        app.showToast('Produto não encontrado.', 'danger');
        return;
      }

      this.editingProductId = product.id;
      this.imageDraft = product.image || null;

      this.refs.productId.value = product.id;
      this.refs.productCode.value = product.code || '';
      this.refs.productStatus.value = product.status || 'Ativo';
      this.refs.productCategory.value = product.category || '';
      this.refs.productName.value = product.name || '';
      this.refs.productShortName.value = product.shortName || '';
      this.refs.productSalePrice.value = product.price || '';
      this.refs.productCostPrice.value = product.cost || '';
      this.refs.productStock.value = product.stock || 0;
      this.refs.productMinStock.value = product.minStock || 0;
      this.refs.productUnit.value = product.unit || 'un';
      this.refs.productSku.value = product.sku || '';
      this.refs.productProductionTime.value = product.productionTime || '';
      this.refs.productDescription.value = product.description || '';
      this.refs.productTags.value = (product.tags || []).join(', ');
      this.refs.productFeatured.checked = Boolean(product.featured);
      this.refs.productAllowSale.checked = Boolean(product.allowSale);
      if (this.refs.productImage) this.refs.productImage.value = '';

      this.updateModeTag(`Editando ${product.code || product.name}`);
      this.updateImagePreview();
      this.updateLivePreview();

      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    getStockStatusLabel(product) {
      const stock = app.toNumber(product.stock || 0);
      const minStock = app.toNumber(product.minStock || 0);
      if (stock <= 0) return 'Sem estoque';
      if (stock <= minStock) return 'Baixo';
      return 'OK';
    },

    findProductById(id) {
      if (!id) return null;
      return this.getProducts().find((product) => product.id === id) || null;
    },

    parseTags(raw) {
      return String(raw || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
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

  document.addEventListener('DOMContentLoaded', () => PRODUCTS_PAGE.init());
  window.HuskyProducts = PRODUCTS_PAGE;
})();

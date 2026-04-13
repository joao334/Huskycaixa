(() => {
  'use strict';

  const app = window.HuskyApp;

  if (!app) {
    console.error('[Husky Cloud Sync] HuskyApp não encontrado. Verifique se app.js foi carregado antes de cloud-sync.js.');
    return;
  }

  const SYNC_STATUS_KEY = 'cloud_sync_status';
  const SNAPSHOT_KEY = 'cloud_last_snapshot';
  const CHANNEL_NAME = 'husky-cloud-sync';
  const DEFAULT_DEBOUNCE_MS = 1200;

  const CloudSync = {
    syncTimer: null,
    isSyncing: false,
    initialized: false,
    channel: null,
    providerAdapter: null,
    lastLocalHash: '',
    lastRemoteHash: '',

    init() {
      if (this.initialized) return;

      this.providerAdapter = this.createProviderAdapter();
      this.bindOnlineOfflineEvents();
      this.bindCrossTabSync();
      this.watchLocalChanges();
      this.restoreLastSnapshotMetadata();
      this.initialized = true;

      if (this.isCloudEnabled()) {
        this.pullFromCloud({ silent: true });
      }

      this.updateSyncIndicators();
      app.log('Módulo de sincronização em nuvem carregado.');
    },

    getSettings() {
      return app.getAppState().settings || {};
    },

    getCloudSettings() {
      return this.getSettings().cloud || {};
    },

    isCloudEnabled() {
      const cloud = this.getCloudSettings();
      return Boolean(cloud.connected && cloud.url && cloud.apiKey && cloud.projectName);
    },

    isAutoSyncEnabled() {
      return Boolean(this.getCloudSettings().autoSync);
    },

    isOfflineCacheEnabled() {
      return Boolean(this.getCloudSettings().offlineCache);
    },

    getSyncStatus() {
      return app.getStorage(SYNC_STATUS_KEY) || {
        provider: this.getCloudSettings().provider || 'firebase',
        online: navigator.onLine,
        connected: Boolean(this.getCloudSettings().connected),
        lastPushAt: null,
        lastPullAt: null,
        lastError: null,
        pending: false,
        syncing: false
      };
    },

    setSyncStatus(partial) {
      const current = this.getSyncStatus();
      const next = {
        ...current,
        ...partial,
        provider: this.getCloudSettings().provider || current.provider || 'firebase',
        online: navigator.onLine,
        connected: Boolean(this.getCloudSettings().connected)
      };
      app.setStorage(SYNC_STATUS_KEY, next);
      this.updateSyncIndicators(next);
      return next;
    },

    updateSyncIndicators(status = null) {
      const syncStatus = status || this.getSyncStatus();
      const cloud = this.getCloudSettings();

      let label = 'Pronto para sincronização';
      if (!cloud.connected) {
        label = 'Pronto para sincronização';
      } else if (!navigator.onLine) {
        label = 'Sem internet • usando cache local';
      } else if (syncStatus.syncing) {
        label = 'Sincronizando em nuvem...';
      } else if (syncStatus.lastError) {
        label = 'Falha na sincronização';
      } else if (syncStatus.lastPushAt || syncStatus.lastPullAt) {
        const latest = syncStatus.lastPushAt || syncStatus.lastPullAt;
        label = `Sincronizado • ${app.formatDateTime(latest)}`;
      } else if (cloud.connected) {
        label = 'Conectada • aguardando sync';
      }

      document.querySelectorAll('#topbar-sync-status, #sidebar-cloud-status').forEach((el) => {
        el.textContent = label;
      });

      const cloudDot = document.querySelectorAll('.cloud-dot, .status-indicator');
      cloudDot.forEach((dot) => {
        if (!cloud.connected) {
          dot.style.background = '#c08a2b';
          dot.style.boxShadow = '0 0 0 6px rgba(192,138,43,0.12)';
        } else if (!navigator.onLine || syncStatus.lastError) {
          dot.style.background = '#bf4b4b';
          dot.style.boxShadow = '0 0 0 6px rgba(191,75,75,0.12)';
        } else {
          dot.style.background = '#2f8b57';
          dot.style.boxShadow = '0 0 0 6px rgba(47,139,87,0.12)';
        }
      });
    },

    bindOnlineOfflineEvents() {
      window.addEventListener('online', () => {
        this.setSyncStatus({ lastError: null });
        if (this.isCloudEnabled()) {
          this.pullFromCloud({ silent: true });
          this.scheduleAutoSync('network-online');
        }
      });

      window.addEventListener('offline', () => {
        this.setSyncStatus({ pending: true });
      });
    },

    bindCrossTabSync() {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener('message', (event) => {
          const payload = event.data || {};
          if (payload.type === 'REMOTE_STATE_APPLIED' && payload.snapshotHash && payload.snapshotHash !== this.lastLocalHash) {
            this.lastLocalHash = payload.snapshotHash;
            this.updateSyncIndicators();
          }

          if (payload.type === 'STATE_CHANGED' && payload.snapshotHash && payload.snapshotHash !== this.lastLocalHash) {
            this.lastLocalHash = payload.snapshotHash;
            if (this.isCloudEnabled() && this.isAutoSyncEnabled()) {
              this.scheduleAutoSync('cross-tab');
            }
          }
        });
      }

      window.addEventListener('storage', (event) => {
        if (event.key === app.getStorageKey('state') && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            const hash = this.createSnapshotHash(parsed);
            this.lastLocalHash = hash;
            this.setSyncStatus({ pending: true });
            if (this.isCloudEnabled() && this.isAutoSyncEnabled()) {
              this.scheduleAutoSync('storage-event');
            }
          } catch (error) {
            console.error('[Husky Cloud Sync] erro ao processar storage event', error);
          }
        }
      });
    },

    watchLocalChanges() {
      const originalSetAppState = app.setAppState.bind(app);
      const originalUpdateSettings = app.updateSettings ? app.updateSettings.bind(app) : null;

      app.setAppState = (nextState) => {
        const result = originalSetAppState(nextState);
        this.onLocalStateChanged(result, 'setAppState');
        return result;
      };

      if (originalUpdateSettings) {
        app.updateSettings = (partialSettings) => {
          const result = originalUpdateSettings(partialSettings);
          this.onLocalStateChanged(app.getAppState(), 'updateSettings');
          return result;
        };
      }
    },

    onLocalStateChanged(nextState, source = 'unknown') {
      const hash = this.createSnapshotHash(nextState);
      if (hash === this.lastLocalHash) return;

      this.lastLocalHash = hash;
      if (this.isOfflineCacheEnabled()) {
        this.saveLocalSnapshot(nextState, hash);
      }

      this.setSyncStatus({ pending: true });

      if (this.channel) {
        this.channel.postMessage({
          type: 'STATE_CHANGED',
          source,
          snapshotHash: hash,
          at: new Date().toISOString()
        });
      }

      if (this.isCloudEnabled() && this.isAutoSyncEnabled()) {
        this.scheduleAutoSync(source);
      }
    },

    scheduleAutoSync(source = 'auto') {
      if (!this.isCloudEnabled()) return;
      if (!navigator.onLine) return;

      clearTimeout(this.syncTimer);
      this.syncTimer = window.setTimeout(() => {
        this.pushToCloud({ source, silent: true });
      }, DEFAULT_DEBOUNCE_MS);
    },

    async pushToCloud({ source = 'manual', silent = false } = {}) {
      if (!this.isCloudEnabled()) {
        if (!silent) app.showToast('A nuvem ainda não está conectada.', 'warning');
        return { ok: false, reason: 'cloud-disabled' };
      }

      if (!navigator.onLine) {
        this.setSyncStatus({ pending: true, lastError: 'offline' });
        if (!silent) app.showToast('Sem internet. Os dados ficaram salvos localmente.', 'warning');
        return { ok: false, reason: 'offline' };
      }

      if (this.isSyncing) {
        return { ok: false, reason: 'busy' };
      }

      const snapshot = this.prepareSnapshot(app.getAppState());
      const snapshotHash = this.createSnapshotHash(snapshot);

      if (snapshotHash === this.lastRemoteHash && source !== 'force') {
        this.setSyncStatus({ pending: false, lastError: null });
        return { ok: true, skipped: true, reason: 'no-changes' };
      }

      this.isSyncing = true;
      this.setSyncStatus({ syncing: true, pending: true, lastError: null });

      try {
        const response = await this.providerAdapter.push(snapshot);
        const now = new Date().toISOString();
        this.lastRemoteHash = snapshotHash;
        this.lastLocalHash = snapshotHash;

        if (this.isOfflineCacheEnabled()) {
          this.saveLocalSnapshot(snapshot, snapshotHash);
        }

        this.updateCloudConfigStatus({
          connected: true,
          lastSyncAt: now
        });

        this.setSyncStatus({
          syncing: false,
          pending: false,
          lastPushAt: now,
          lastError: null,
          remoteMeta: response?.meta || null
        });

        if (this.channel) {
          this.channel.postMessage({
            type: 'REMOTE_STATE_APPLIED',
            snapshotHash,
            at: now
          });
        }

        if (!silent) app.showToast('Dados sincronizados com a nuvem.', 'success');
        app.log('Push para nuvem realizado.', { source, snapshotHash });
        return { ok: true, snapshotHash };
      } catch (error) {
        console.error('[Husky Cloud Sync] falha no push', error);
        this.setSyncStatus({ syncing: false, pending: true, lastError: error.message || 'push-error' });
        if (!silent) app.showToast('Não foi possível sincronizar os dados.', 'danger');
        return { ok: false, reason: 'push-error', error };
      } finally {
        this.isSyncing = false;
        this.updateSyncIndicators();
      }
    },

    async pullFromCloud({ silent = false } = {}) {
      if (!this.isCloudEnabled()) {
        if (!silent) app.showToast('A nuvem ainda não está conectada.', 'warning');
        return { ok: false, reason: 'cloud-disabled' };
      }

      if (!navigator.onLine) {
        if (!silent) app.showToast('Sem internet para buscar os dados da nuvem.', 'warning');
        return { ok: false, reason: 'offline' };
      }

      if (this.isSyncing) {
        return { ok: false, reason: 'busy' };
      }

      this.isSyncing = true;
      this.setSyncStatus({ syncing: true, lastError: null });

      try {
        const response = await this.providerAdapter.pull();
        const remoteState = response?.state || null;

        if (!remoteState || typeof remoteState !== 'object') {
          this.setSyncStatus({ syncing: false, lastError: null });
          if (!silent) app.showToast('Nenhum dado remoto encontrado para importar.', 'info');
          return { ok: true, reason: 'empty-remote' };
        }

        const currentState = app.getAppState();
        const mergedState = this.deepMerge(this.deepClone(currentState), remoteState);
        const snapshotHash = this.createSnapshotHash(mergedState);

        if (snapshotHash !== this.lastLocalHash) {
          app.setAppState(mergedState);
          this.lastLocalHash = snapshotHash;
          this.lastRemoteHash = snapshotHash;
          if (this.isOfflineCacheEnabled()) {
            this.saveLocalSnapshot(mergedState, snapshotHash);
          }
        }

        const now = new Date().toISOString();
        this.updateCloudConfigStatus({
          connected: true,
          lastSyncAt: now
        });

        this.setSyncStatus({
          syncing: false,
          pending: false,
          lastPullAt: now,
          lastError: null,
          remoteMeta: response?.meta || null
        });

        if (this.channel) {
          this.channel.postMessage({
            type: 'REMOTE_STATE_APPLIED',
            snapshotHash,
            at: now
          });
        }

        if (!silent) app.showToast('Dados da nuvem carregados com sucesso.', 'success');
        app.log('Pull da nuvem realizado.', { snapshotHash });
        return { ok: true, snapshotHash };
      } catch (error) {
        console.error('[Husky Cloud Sync] falha no pull', error);
        this.setSyncStatus({ syncing: false, lastError: error.message || 'pull-error' });
        if (!silent) app.showToast('Não foi possível carregar os dados da nuvem.', 'danger');
        return { ok: false, reason: 'pull-error', error };
      } finally {
        this.isSyncing = false;
        this.updateSyncIndicators();
      }
    },

    saveLocalSnapshot(state, snapshotHash = null) {
      const payload = {
        state,
        snapshotHash: snapshotHash || this.createSnapshotHash(state),
        savedAt: new Date().toISOString()
      };
      app.setStorage(SNAPSHOT_KEY, payload);
    },

    restoreLastSnapshotMetadata() {
      const snapshot = app.getStorage(SNAPSHOT_KEY);
      if (!snapshot) return;
      this.lastLocalHash = snapshot.snapshotHash || '';
      this.lastRemoteHash = snapshot.snapshotHash || '';
    },

    getLastLocalSnapshot() {
      return app.getStorage(SNAPSHOT_KEY);
    },

    prepareSnapshot(state) {
      const snapshot = this.deepClone(state);
      snapshot.__cloudMeta = {
        app: 'Husky Confeitaria',
        version: app.APP_VERSION || '1.0.0',
        exportedAt: new Date().toISOString(),
        provider: this.getCloudSettings().provider || 'firebase'
      };
      return snapshot;
    },

    createSnapshotHash(value) {
      const text = JSON.stringify(value || {});
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(index);
        hash |= 0;
      }
      return String(hash);
    },

    updateCloudConfigStatus(partialCloud) {
      const state = app.getAppState();
      state.settings = state.settings || {};
      state.settings.cloud = {
        ...(state.settings.cloud || {}),
        ...partialCloud
      };
      app.setAppState(state);
    },

    createProviderAdapter() {
      const provider = this.getCloudSettings().provider || 'firebase';
      const adapter = {
        async push(snapshot) {
          return CloudSync.pushViaHttp(snapshot, provider);
        },
        async pull() {
          return CloudSync.pullViaHttp(provider);
        }
      };
      return adapter;
    },

    async pushViaHttp(snapshot, provider) {
      const cloud = this.getCloudSettings();
      const endpoint = this.resolveCloudEndpoint('push');
      const payload = {
        provider,
        projectName: cloud.projectName,
        app: 'husky-system',
        snapshot,
        snapshotHash: this.createSnapshotHash(snapshot),
        clientTime: new Date().toISOString()
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await this.safeReadResponse(response);
        throw new Error(message || `Erro HTTP ${response.status}`);
      }

      const json = await this.safeReadJson(response);
      return {
        ok: true,
        meta: json?.meta || {
          endpoint,
          provider,
          status: response.status
        }
      };
    },

    async pullViaHttp(provider) {
      const cloud = this.getCloudSettings();
      const endpoint = this.resolveCloudEndpoint('pull');
      const query = new URL(endpoint, window.location.origin);
      query.searchParams.set('projectName', cloud.projectName || '');
      query.searchParams.set('provider', provider || 'firebase');
      query.searchParams.set('app', 'husky-system');

      const response = await fetch(query.toString(), {
        method: 'GET',
        headers: this.buildHeaders()
      });

      if (response.status === 404) {
        return { ok: true, state: null, meta: { empty: true } };
      }

      if (!response.ok) {
        const message = await this.safeReadResponse(response);
        throw new Error(message || `Erro HTTP ${response.status}`);
      }

      const json = await this.safeReadJson(response);
      return {
        ok: true,
        state: json?.snapshot || json?.state || null,
        meta: json?.meta || {
          endpoint: query.toString(),
          provider,
          status: response.status
        }
      };
    },

    resolveCloudEndpoint(mode) {
      const cloud = this.getCloudSettings();
      const baseUrl = String(cloud.url || '').trim().replace(/\/$/, '');
      if (!baseUrl) {
        throw new Error('URL da nuvem não configurada.');
      }

      const pushCandidates = [
        `${baseUrl}/sync/state`,
        `${baseUrl}/state`,
        `${baseUrl}`
      ];

      const pullCandidates = [
        `${baseUrl}/sync/state`,
        `${baseUrl}/state`,
        `${baseUrl}`
      ];

      return mode === 'push' ? pushCandidates[0] : pullCandidates[0];
    },

    buildHeaders() {
      const cloud = this.getCloudSettings();
      return {
        'Content-Type': 'application/json',
        'x-api-key': cloud.apiKey || '',
        'x-project-name': cloud.projectName || '',
        'x-provider': cloud.provider || 'firebase'
      };
    },

    async safeReadJson(response) {
      try {
        return await response.json();
      } catch (error) {
        return null;
      }
    },

    async safeReadResponse(response) {
      try {
        const json = await response.clone().json();
        return json?.message || JSON.stringify(json);
      } catch (error) {
        try {
          return await response.text();
        } catch (innerError) {
          return '';
        }
      }
    },

    getDiagnostics() {
      return {
        enabled: this.isCloudEnabled(),
        autoSync: this.isAutoSyncEnabled(),
        offlineCache: this.isOfflineCacheEnabled(),
        status: this.getSyncStatus(),
        cloudSettings: {
          provider: this.getCloudSettings().provider || 'firebase',
          projectName: this.getCloudSettings().projectName || '',
          url: this.getCloudSettings().url || '',
          connected: Boolean(this.getCloudSettings().connected)
        },
        lastLocalHash: this.lastLocalHash,
        lastRemoteHash: this.lastRemoteHash
      };
    },

    async forceSync() {
      const pull = await this.pullFromCloud({ silent: true });
      const push = await this.pushToCloud({ source: 'force', silent: false });
      return { pull, push };
    },

    deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    },

    deepMerge(target, source) {
      if (!source || typeof source !== 'object') return target;
      const output = Array.isArray(target) ? [...target] : { ...target };

      Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = output[key];

        if (Array.isArray(sourceValue)) {
          output[key] = [...sourceValue];
        } else if (sourceValue && typeof sourceValue === 'object') {
          output[key] = this.deepMerge(targetValue && typeof targetValue === 'object' ? targetValue : {}, sourceValue);
        } else {
          output[key] = sourceValue;
        }
      });

      return output;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    CloudSync.init();
  });

  window.HuskyCloudSync = CloudSync;
})();
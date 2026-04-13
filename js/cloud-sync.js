(() => {
  'use strict';

  const CLOUD_SYNC = {
    app: null,
    supabase: null,
    user: null,
    channel: null,
    started: false,
    applyingRemote: false,
    suppressSaveOnce: false,
    saveTimer: null,

    async init() {
      this.app = window.HuskyApp || null;
      this.supabase = await this.waitForSupabase();

      if (!this.app || !this.supabase) {
        console.warn('[Cloud Sync] App ou Supabase não encontrado.');
        return;
      }

      const session = await this.getSession();
      if (!session?.user) {
        this.setCloudStatus(false, null);
        return;
      }

      this.user = session.user;

      await this.loadOrCreateRemoteState();
      this.bindStateChanges();
      this.bindRealtime();
      this.bindAuthListener();

      this.started = true;
      this.setCloudStatus(true, new Date().toISOString());
      console.log('[Cloud Sync] Sincronização iniciada.');
    },

    async waitForSupabase() {
      if (window.HuskySupabase) return window.HuskySupabase;

      for (let i = 0; i < 80; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (window.HuskySupabase) return window.HuskySupabase;
      }

      return null;
    },

    async getSession() {
      try {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) {
          console.error('[Cloud Sync] erro ao obter sessão', error);
          return null;
        }
        return data?.session || null;
      } catch (error) {
        console.error('[Cloud Sync] erro inesperado de sessão', error);
        return null;
      }
    },

    async loadOrCreateRemoteState() {
      try {
        const { data, error } = await this.supabase
          .from('app_state')
          .select('state, updated_at')
          .eq('user_id', this.user.id)
          .maybeSingle();

        if (error) {
          console.error('[Cloud Sync] erro ao buscar estado remoto', error);
          this.setCloudStatus(false, null);
          return;
        }

        if (data?.state) {
          this.applyRemoteState(data.state);
          this.setCloudStatus(true, data.updated_at || new Date().toISOString());
          return;
        }

        await this.pushLocalState();
      } catch (error) {
        console.error('[Cloud Sync] erro ao carregar nuvem', error);
        this.setCloudStatus(false, null);
      }
    },

    bindStateChanges() {
      window.addEventListener('husky:state-changed', () => {
        if (!this.started) return;

        if (this.applyingRemote) return;

        if (this.suppressSaveOnce) {
          this.suppressSaveOnce = false;
          return;
        }

        this.schedulePush();
      });
    },

    bindAuthListener() {
      this.supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          this.user = null;
          this.setCloudStatus(false, null);
          this.removeRealtime();
          return;
        }

        if (!this.user || this.user.id !== session.user.id) {
          this.user = session.user;
          await this.loadOrCreateRemoteState();
          this.bindRealtime();
          this.setCloudStatus(true, new Date().toISOString());
        }
      });
    },

    bindRealtime() {
      if (!this.user) return;

      this.removeRealtime();

      this.channel = this.supabase
        .channel(`husky-app-state-${this.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_state',
            filter: `user_id=eq.${this.user.id}`
          },
          (payload) => {
            const remoteState = payload?.new?.state;
            const updatedAt = payload?.new?.updated_at || new Date().toISOString();

            if (!remoteState) return;

            this.applyRemoteState(remoteState);
            this.setCloudStatus(true, updatedAt);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setCloudStatus(true, new Date().toISOString());
          }
        });
    },

    removeRealtime() {
      if (this.channel && this.supabase) {
        this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
    },

    schedulePush() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.pushLocalState();
      }, 500);
    },

    sanitizeState(state) {
      const cloned = this.app.deepClone ? this.app.deepClone(state) : JSON.parse(JSON.stringify(state || {}));

      if (cloned?.settings?.cloud) {
        cloned.settings.cloud.connected = true;
        cloned.settings.cloud.provider = 'supabase';
        cloned.settings.cloud.lastSyncAt = new Date().toISOString();
      }

      return cloned;
    },

    async pushLocalState() {
      if (!this.user) return;

      try {
        const state = this.app.getAppState();
        const cleanState = this.sanitizeState(state);
        const updatedAt = new Date().toISOString();

        const { error } = await this.supabase
          .from('app_state')
          .upsert(
            {
              user_id: this.user.id,
              state: cleanState,
              updated_at: updatedAt
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('[Cloud Sync] erro ao salvar nuvem', error);
          this.setCloudStatus(false, null);
          return;
        }

        this.setCloudStatus(true, updatedAt);
      } catch (error) {
        console.error('[Cloud Sync] erro inesperado ao salvar', error);
        this.setCloudStatus(false, null);
      }
    },

    applyRemoteState(remoteState) {
      try {
        this.applyingRemote = true;

        const current = this.app.getAppState();
        const merged = this.app.deepMerge
          ? this.app.deepMerge(current, remoteState || {})
          : { ...current, ...(remoteState || {}) };

        this.app.setAppState(merged);
      } catch (error) {
        console.error('[Cloud Sync] erro ao aplicar estado remoto', error);
      } finally {
        this.applyingRemote = false;
      }
    },

    setCloudStatus(connected, lastSyncAt) {
      if (!this.app || typeof this.app.updateSettings !== 'function') return;

      const currentSettings = this.app.getSettings ? this.app.getSettings() : {};
      const currentCloud = currentSettings.cloud || {};

      this.suppressSaveOnce = true;

      this.app.updateSettings({
        cloud: {
          ...currentCloud,
          provider: 'supabase',
          connected: Boolean(connected),
          autoSync: true,
          offlineCache: true,
          lastSyncAt: lastSyncAt || null
        }
      });

      if (typeof this.app.refreshShell === 'function') {
        this.app.refreshShell();
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    CLOUD_SYNC.init();
  });

  window.HuskyCloudSync = CLOUD_SYNC;
})();
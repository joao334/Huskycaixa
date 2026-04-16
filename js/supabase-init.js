(() => {
  'use strict';

  const authMode = String(window.HUSKY_AUTH_MODE || 'local').toLowerCase();

  if (authMode !== 'supabase') {
    console.info('[Supabase] Inicialização ignorada: autenticação local ativa.');
    return;
  }

  if (!window.supabase) {
    console.error('[Supabase] Biblioteca não carregada.');
    return;
  }

  const supabaseUrl = window.HUSKY_SUPABASE_URL;
  const supabaseKey = window.HUSKY_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] URL ou chave não configuradas no env.js');
    return;
  }

  const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.HuskySupabase = client;
  console.log('[Supabase] Cliente iniciado com sucesso.');
})();

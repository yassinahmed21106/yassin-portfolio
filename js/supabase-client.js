// Shared Supabase client bootstrap.
// Loads supabase-js from CDN, fetches public config from /api/config,
// and returns one shared client.
(function (global) {
  'use strict';

  const CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (global.supabase && global.supabase.createClient) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load supabase-js'));
      document.head.appendChild(s);
    });
  }

  let clientPromise = null;

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = Promise.all([
      loadScript(CDN_URL),
      fetch('/api/config').then(async (r) => {
        if (!r.ok) throw new Error('Could not load Supabase config (' + r.status + ').');
        return r.json();
      })
    ]).then(([, config]) => {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('Supabase is not configured yet (missing env vars).');
      }
      return global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    });
    return clientPromise;
  }

  global.YASupabase = { getClient };
})(window);

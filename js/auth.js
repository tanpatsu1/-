/* Supabase Auth module — loaded after Supabase CDN script */
let _client = null;

async function _initClient() {
  if (_client) return _client;
  const cfg = await fetch('/api/config').then(r => r.json());
  _client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
  });
  return _client;
}

async function getSupabase() {
  return _initClient();
}

async function getCurrentUser() {
  const client = await _initClient();
  const { data: { session } } = await client.auth.getSession();
  return session?.user ?? null;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) { window.location.href = '/login'; return null; }
  return user;
}

async function sendMagicLink(email) {
  try {
    const client = await _initClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/' },
    });
    return !error;
  } catch {
    return false;
  }
}

async function signOut() {
  const client = await _initClient();
  await client.auth.signOut();
  window.location.href = '/login';
}

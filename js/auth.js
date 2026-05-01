/* Supabase Auth module — loaded after Supabase CDN script */
let _client = null;

async function _initClient() {
  if (_client) return _client;
  let cfg;
  try {
    cfg = await fetch('/api/config').then(r => r.json());
  } catch (e) {
    throw new Error('設定の取得に失敗しました (/api/config)');
  }
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new Error('Supabase環境変数が未設定です (SUPABASE_URL / SUPABASE_ANON_KEY)');
  }
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

async function signUp(email, password) {
  const client = await _initClient();
  const { error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

async function signInWithPassword(email, password) {
  const client = await _initClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

async function resetPasswordForEmail(email) {
  const client = await _initClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
  if (error) throw new Error(error.message);
}

async function updatePassword(password) {
  const client = await _initClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

async function signOut() {
  const client = await _initClient();
  await client.auth.signOut();
  window.location.href = '/login';
}

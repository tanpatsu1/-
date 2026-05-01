function AuthGate({ children }) {
  const [authState, setAuthState] = useState({ user: undefined, sb: null, error: null });

  useEffect(() => {
    getSupabase().then(sb => {
      sb.auth.getSession().then(({ data: { session } }) => {
        setAuthState({ user: session?.user ?? null, sb, error: null });
      });
      sb.auth.onAuthStateChange((_e, session) => {
        const user = session?.user ?? null;
        setAuthState(s => ({ ...s, user, sb }));
        if (!user) window.location.href = '/login';
      });
    }).catch(err => {
      console.error('[AuthGate] Supabase init failed:', err);
      setAuthState({ user: null, sb: null, error: err.message || 'init failed' });
    });
  }, []);

  const loadingView = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.08em' }}>
      MISE
    </div>
  );

  if (authState.error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <span>接続エラー</span>
        <a href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>ログインページへ</a>
      </div>
    );
  }
  if (authState.user === undefined) return loadingView;
  if (!authState.user) return loadingView;
  return children(authState.user, authState.sb);
}

Object.assign(window, { AuthGate });

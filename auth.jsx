function AuthGate({ children }) {
  const [authState, setAuthState] = useState({ user: undefined, sb: null });

  useEffect(() => {
    getSupabase().then(sb => {
      sb.auth.getSession().then(({ data: { session } }) => {
        setAuthState({ user: session?.user ?? null, sb });
      });
      sb.auth.onAuthStateChange((_e, session) => {
        const user = session?.user ?? null;
        setAuthState(s => ({ sb: s.sb || sb, user }));
        if (!user) window.location.href = '/login';
      });
    });
  }, []);

  if (authState.user === undefined || !authState.sb) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.08em' }}>
        MISE
      </div>
    );
  }
  if (!authState.user) return null;
  return children(authState.user, authState.sb);
}

Object.assign(window, { AuthGate });

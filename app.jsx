const { useReducer, useEffect, useState, useRef } = React;

const NAV_ITEMS = [
  { view: 'brands',    label: 'Brands' },
  { view: 'products',  label: 'Items' },
  { view: 'timeline',  label: 'Timeline' },
  { view: 'bookmarks', label: 'Saved' },
  { view: 'settings',  label: 'Settings' },
];

const DEFAULT_TWEAKS = { theme: 'light', density: 'standard', accent: 'ink' };

const LS_KEY = 'mise_v1';
function loadStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

const INITIAL = {
  view: 'brands',
  activeBrandId: null,
  brands:   window.SEED_BRANDS   || [],
  products: window.SEED_PRODUCTS || [],
  genres:   window.SEED_GENRES   || [],
  brandFilters: { search: '', genre: 'all', tag: 'all', sort: 'name', mode: 'grid' },
  modal: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'navigate':
      return { ...state, view: action.view, activeBrandId: null };
    case 'openBrand':
      return { ...state, view: 'brand', activeBrandId: action.id };
    case 'setBrandFilters':
      return { ...state, brandFilters: { ...state.brandFilters, ...action.patch } };
    case 'openBrandModal':
      return { ...state, modal: { kind: 'brand', brand: action.brand || null } };
    case 'closeBrandModal':
      return { ...state, modal: null };
    case 'saveBrand': {
      const b = action.brand;
      const brands = state.brands.find(x => x.id === b.id)
        ? state.brands.map(x => x.id === b.id ? b : x)
        : [...state.brands, b];
      return { ...state, brands, modal: null };
    }
    case 'deleteBrand':
      return {
        ...state,
        brands: state.brands.filter(b => b.id !== action.id),
        products: state.products.filter(p => p.brandId !== action.id),
        view: state.activeBrandId === action.id ? 'brands' : state.view,
        activeBrandId: state.activeBrandId === action.id ? null : state.activeBrandId,
      };
    case 'restoreBrand':
      return {
        ...state,
        brands: [...state.brands, action.snapshot.brand],
        products: [...state.products, ...action.snapshot.products],
      };
    case 'openProductModal':
      return { ...state, modal: { kind: 'product', brandId: action.brandId, product: action.product || null } };
    case 'closeProductModal':
      return { ...state, modal: null };
    case 'saveProduct': {
      const p = action.product;
      const products = state.products.find(x => x.id === p.id)
        ? state.products.map(x => x.id === p.id ? p : x)
        : [...state.products, p];
      return { ...state, products, modal: null };
    }
    case 'deleteProduct':
      return { ...state, products: state.products.filter(p => p.id !== action.id) };
    case 'restoreProduct':
      return { ...state, products: [...state.products, action.snapshot] };
    case 'toggleBookmark':
      return { ...state, products: state.products.map(p => p.id === action.id ? { ...p, bookmarked: !p.bookmarked } : p) };
    case 'setStatus':
      return { ...state, products: state.products.map(p => p.id === action.id ? { ...p, status: action.status } : p) };
    case 'addGenre': {
      const id = action.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
      return { ...state, genres: [...state.genres, { id, name: action.name }] };
    }
    case 'renameGenre':
      return { ...state, genres: state.genres.map(g => g.id === action.id ? { ...g, name: action.name } : g) };
    case 'deleteGenre':
      return {
        ...state,
        genres: state.genres.filter(g => g.id !== action.id),
        brands: state.brands.map(b => ({ ...b, genres: b.genres.filter(id => id !== action.id) })),
      };
    case 'importData':
      return { ...state, brands: action.data.brands, products: action.data.products, genres: action.data.genres || state.genres };
    case 'loadData':
      return {
        ...state,
        brands:   action.data.brands   || state.brands,
        products: action.data.products || state.products,
        genres:   action.data.genres   || state.genres,
      };
    default:
      return state;
  }
}

function TagInput({ value, onChange, allTags }) {
  const [show, setShow] = useState(false);
  const parts = value.split(',').map(t => t.trim()).filter(Boolean);
  const lastWord = value.split(',').pop().trim();
  const suggestions = allTags.filter(t =>
    !parts.includes(t) && (lastWord === '' || t.toLowerCase().startsWith(lastWord.toLowerCase()))
  );
  const addTag = (tag) => {
    const rest = value.split(',').slice(0, -1).map(t => t.trim()).filter(Boolean);
    onChange([...rest, tag].join(', ') + ', ');
  };
  return (
    <div className="tag-input-wrap">
      <input className="form-input" type="text" value={value}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder="アウター, シューズ, ..." />
      {show && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.slice(0, 8).map(t => (
            <button key={t} type="button" className="tag-suggestion-item"
              onMouseDown={e => { e.preventDefault(); addTag(t); }}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandModal({ modal, dispatch }) {
  const { state } = useApp();
  const brand = modal.brand;
  const [name, setName] = useState(brand?.name || '');
  const [url, setUrl] = useState(brand?.url || '');
  const [description, setDescription] = useState(brand?.description || '');
  const [selGenres, setSelGenres] = useState(brand?.genres || []);
  const [price, setPrice] = useState(brand?.price || 2);
  const [priceNote, setPriceNote] = useState(brand?.priceNote || '');
  const [tags, setTags] = useState(brand?.tags?.join(', ') || '');
  const [note, setNote] = useState(brand?.note || '');
  const [swatch, setSwatch] = useState(brand?.swatch || { bg: '#E8E6E1', fg: '#8A8882', style: 'paper' });
  const [fetching, setFetching] = useState(false);
  const toast = useToast();
  const toggleGenre = (id) => setSelGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  const fetchMeta = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const res = await fetch('/api/fetch-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const meta = await res.json();
      if (meta.title && !name.trim()) setName(meta.title);
      if (meta.description && !description.trim()) setDescription(meta.description);
      toast.show('情報を取得しました');
    } catch { toast.show('取得に失敗しました', { error: true }); }
    finally { setFetching(false); }
  };
  const save = () => {
    if (!name.trim()) { toast.show('ブランド名を入力してください', { error: true }); return; }
    dispatch({
      type: 'saveBrand',
      brand: {
        id: brand?.id || 'b' + Math.random().toString(36).slice(2),
        name: name.trim(), initial: name.trim().charAt(0).toUpperCase(),
        url: url.trim(), description: description.trim(),
        genres: selGenres, price, priceNote: priceNote.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        note: note.trim(),
        swatch,
        addedAt: brand?.addedAt || new Date().toISOString().slice(0, 10),
      },
    });
    toast.show(brand ? `${name.trim()} を更新しました` : `${name.trim()} を追加しました`);
  };
  return (
    <Modal open title={brand ? 'ブランドを編集' : 'ブランドを追加'} onClose={() => dispatch({ type: 'closeBrandModal' })}
      footer={<><button className="btn btn-ghost" onClick={() => dispatch({ type: 'closeBrandModal' })}>キャンセル</button><button className="btn btn-primary" onClick={save}>保存</button></>}>
      <div className="form-group"><label className="form-label">ブランド名 *</label>
        <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例: Atelier Nord" autoFocus /></div>
      <div className="form-group"><label className="form-label">カラー</label>
        <div className="swatch-picker-row">
          <Swatch swatch={swatch} initial={name.trim().charAt(0).toUpperCase() || '?'} size="md" style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8 }} />
          <SwatchPicker swatch={swatch} onChange={setSwatch} />
        </div>
      </div>
      <div className="form-group"><label className="form-label">公式サイト URL</label>
        <div className="url-input-row">
          <input className="form-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchMeta} disabled={!url.trim() || fetching}>{fetching ? '…' : '取得'}</button>
        </div>
      </div>
      <div className="form-group"><label className="form-label">説明</label>
        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
      <div className="form-group"><label className="form-label">ジャンル</label>
        <div className="genre-chips-wrap">{state.genres.map(g => (
          <button key={g.id} type="button" className={cx('genre-chip-btn', selGenres.includes(g.id) && 'is-active')} onClick={() => toggleGenre(g.id)}>{g.name}</button>
        ))}</div></div>
      <div className="form-group"><label className="form-label">価格帯</label>
        <div className="price-seg">{[1,2,3,4].map(n => (
          <button key={n} type="button" className={cx('price-seg__btn', price === n && 'is-active')} onClick={() => setPrice(n)}>{'¥'.repeat(n)}</button>
        ))}</div></div>
      <div className="form-group"><label className="form-label">価格目安</label>
        <input className="form-input" type="text" value={priceNote} onChange={e => setPriceNote(e.target.value)} placeholder="例: ¥15,000〜¥80,000" /></div>
      <div className="form-group"><label className="form-label">タグ（カンマ区切り）</label>
        <TagInput value={tags} onChange={setTags} allTags={[...new Set(state.brands.flatMap(b => b.tags))]} /></div>
      <div className="form-group"><label className="form-label">メモ</label>
        <textarea className="form-textarea" value={note} onChange={e => setNote(e.target.value)} rows={2} /></div>
    </Modal>
  );
}

function ProductModal({ modal, dispatch }) {
  const { state } = useApp();
  const { brandId, product } = modal;
  const [bId, setBId] = useState(brandId || state.brands[0]?.id || '');
  const [name, setName] = useState(product?.name || '');
  const [priceStr, setPriceStr] = useState(product?.price ? String(product.price) : '');
  const [tags, setTags] = useState(product?.tags?.join(', ') || '');
  const [status, setStatus] = useState(product?.status || 'wishlist');
  const [actedAt, setActedAt] = useState(product?.actedAt || new Date().toISOString().slice(0, 10));
  const [swatch, setSwatch] = useState(product?.swatch || { bg: '#E8E6E1', fg: '#8A8882', style: 'paper' });
  const toast = useToast();
  const save = () => {
    if (!name.trim()) { toast.show('商品名を入力してください', { error: true }); return; }
    dispatch({
      type: 'saveProduct',
      product: {
        id: product?.id || 'p' + Math.random().toString(36).slice(2),
        brandId: bId, name: name.trim(),
        price: Number(priceStr) || 0,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status, bookmarked: product?.bookmarked || false,
        swatch,
        actedAt,
      },
    });
    toast.show(product ? `${name.trim()} を更新しました` : `${name.trim()} を追加しました`);
  };
  return (
    <Modal open title={product ? 'アイテムを編集' : 'アイテムを追加'} onClose={() => dispatch({ type: 'closeProductModal' })}
      footer={<><button className="btn btn-ghost" onClick={() => dispatch({ type: 'closeProductModal' })}>キャンセル</button><button className="btn btn-primary" onClick={save}>保存</button></>}>
      {!brandId && (
        <div className="form-group"><label className="form-label">ブランド *</label>
          <select className="form-input" value={bId} onChange={e => setBId(e.target.value)}>
            {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></div>
      )}
      <div className="form-group"><label className="form-label">商品名 *</label>
        <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="form-group"><label className="form-label">カラー</label>
        <div className="swatch-picker-row">
          <Swatch swatch={swatch} initial={name.trim().charAt(0).toUpperCase() || '?'} size="md" style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8 }} />
          <SwatchPicker swatch={swatch} onChange={setSwatch} />
        </div>
      </div>
      <div className="form-group"><label className="form-label">価格（円）</label>
        <input className="form-input" type="number" value={priceStr} onChange={e => setPriceStr(e.target.value)} placeholder="例: 48000" /></div>
      <div className="form-group"><label className="form-label">タグ（カンマ区切り）</label>
        <input className="form-input" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="アウター, ニット, ..." /></div>
      <div className="form-group"><label className="form-label">ステータス</label>
        <div className="status-seg">{[['wishlist','★ ほしい'],['considering','？ 検討中'],['purchased','✓ 購入済み']].map(([v,l]) => (
          <button key={v} type="button" className={cx('status-seg__btn', status === v && 'is-active')} onClick={() => setStatus(v)}>{l}</button>
        ))}</div></div>
      <div className="form-group"><label className="form-label">日付</label>
        <input className="form-input" type="date" value={actedAt} onChange={e => setActedAt(e.target.value)} /></div>
    </Modal>
  );
}

const BOTTOM_NAV = [
  { view: 'brands',    label: 'Brands' },
  { view: 'products',  label: 'Items' },
  { view: 'timeline',  label: 'Timeline' },
  { view: 'bookmarks', label: 'Saved' },
  { view: 'settings',  label: 'Settings' },
];

function BottomNav({ view, dispatch }) {
  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV.map(({ view: v, label }) => (
        <button
          key={v}
          className={cx('bottom-nav__item', (view === v || (v === 'brands' && view === 'brand')) && 'is-active')}
          onClick={() => dispatch({ type: 'navigate', view: v })}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function Header({ view, dispatch }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <nav className="site-nav">
          {NAV_ITEMS.map(({ view: v, label }) => (
            <a key={v} className={cx('site-nav__link', (view === v || (v === 'brands' && view === 'brand')) && 'is-active')}
              onClick={() => dispatch({ type: 'navigate', view: v })}>{label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function App({ user, supabase }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL);
  const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);
  const [loaded, setLoaded] = useState(false);
  const saveRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme   = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.dataset.accent  = tweaks.accent;
  }, [tweaks]);

  // Load user data from Supabase on mount (migrate localStorage if first time)
  useEffect(() => {
    supabase.from('user_data').select('data').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data?.data?.brands?.length || data?.data?.products?.length) {
          dispatch({ type: 'loadData', data: data.data });
        } else {
          const ls = loadStorage();
          if (ls.brands?.length) dispatch({ type: 'loadData', data: ls });
        }
      })
      .catch(() => {
        const ls = loadStorage();
        if (ls.brands?.length) dispatch({ type: 'loadData', data: ls });
      })
      .finally(() => setLoaded(true));
  }, []);

  // Debounced save to Supabase on data changes
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      supabase.from('user_data').upsert({
        user_id: user.id,
        data: { brands: state.brands, products: state.products, genres: state.genres },
        updated_at: new Date().toISOString(),
      });
    }, 1000);
  }, [state.brands, state.products, state.genres, loaded]);

  const renderPage = () => {
    switch (state.view) {
      case 'brand':     return <BrandDetail brandId={state.activeBrandId} />;
      case 'products':  return <ProductsPage />;
      case 'timeline':  return <TimelinePage />;
      case 'bookmarks': return <BookmarksPage />;
      case 'settings':  return <SettingsPage />;
      default:          return <BrandsPage />;
    }
  };

  return (
    <UserCtx.Provider value={{ user, supabase }}>
      <AppCtx.Provider value={{ state, dispatch }}>
        <ToastProvider>
          <Header view={state.view} dispatch={dispatch} />
          <div className="main-container">
            {loaded ? renderPage() : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.06em' }}>
                …
              </div>
            )}
          </div>
          {state.modal?.kind === 'brand'   && <BrandModal   modal={state.modal} dispatch={dispatch} />}
          {state.modal?.kind === 'product' && <ProductModal modal={state.modal} dispatch={dispatch} />}
          <TweaksPanel title="MISE Tweaks">
            <TweakSection label="Appearance">
              <TweakRadio label="Theme"   value={tweaks.theme}
                options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}
                onChange={v => setTweak('theme', v)} />
              <TweakRadio label="Density" value={tweaks.density}
                options={[{value:'compact',label:'Compact'},{value:'standard',label:'Std'},{value:'relaxed',label:'Relaxed'}]}
                onChange={v => setTweak('density', v)} />
              <TweakRadio label="Accent"  value={tweaks.accent}
                options={[{value:'ink',label:'Ink'},{value:'warm',label:'Warm'},{value:'cool',label:'Cool'}]}
                onChange={v => setTweak('accent', v)} />
            </TweakSection>
          </TweaksPanel>
          <BottomNav view={state.view} dispatch={dispatch} />
        </ToastProvider>
      </AppCtx.Provider>
    </UserCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthGate>{(user, sb) => <App user={user} supabase={sb} />}</AuthGate>
);

const { useReducer, useEffect, useState } = React;

const NAV_ITEMS = [
  { view: 'brands',    label: 'Brands' },
  { view: 'products',  label: 'Items' },
  { view: 'timeline',  label: 'Timeline' },
  { view: 'bookmarks', label: 'Saved' },
  { view: 'settings',  label: 'Settings' },
];

const DEFAULT_TWEAKS = { theme: 'light', density: 'standard', accent: 'ink' };

const INITIAL = {
  view: 'brands',
  activeBrandId: null,
  brands: window.SEED_BRANDS || [],
  products: window.SEED_PRODUCTS || [],
  genres: window.SEED_GENRES || [],
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
    default:
      return state;
  }
}

function BrandModal({ modal, dispatch }) {
  const { state } = useApp();
  const brand = modal.brand;
  const [name, setName] = useState(brand?.name || '');
  const [url, setUrl] = useState(brand?.url || '');
  const [description, setDescription] = useState(brand?.description || '');
  const [selGenres, setSelGenres] = useState(brand?.genres || []);
  const [price, setPrice] = useState(brand?.price || 2);
  const [tags, setTags] = useState(brand?.tags?.join(', ') || '');
  const [note, setNote] = useState(brand?.note || '');
  const toast = useToast();
  const toggleGenre = (id) => setSelGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  const save = () => {
    if (!name.trim()) { toast.show('ブランド名を入力してください', { error: true }); return; }
    dispatch({
      type: 'saveBrand',
      brand: {
        id: brand?.id || 'b' + Math.random().toString(36).slice(2),
        name: name.trim(), initial: name.trim().charAt(0).toUpperCase(),
        url: url.trim(), description: description.trim(),
        genres: selGenres, price,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        note: note.trim(),
        swatch: brand?.swatch || { bg: '#E8E6E1', fg: '#8A8882', style: 'paper' },
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
      <div className="form-group"><label className="form-label">公式サイト URL</label>
        <input className="form-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div className="form-group"><label className="form-label">説明</label>
        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
      <div className="form-group"><label className="form-label">ジャンル</label>
        <div className="genre-chips">{state.genres.map(g => (
          <button key={g.id} type="button" className={cx('genre-chip-btn', selGenres.includes(g.id) && 'is-active')} onClick={() => toggleGenre(g.id)}>{g.name}</button>
        ))}</div></div>
      <div className="form-group"><label className="form-label">価格帯</label>
        <div className="price-seg">{[1,2,3,4].map(n => (
          <button key={n} type="button" className={cx('price-seg__btn', price === n && 'is-active')} onClick={() => setPrice(n)}>{'¥'.repeat(n)}</button>
        ))}</div></div>
      <div className="form-group"><label className="form-label">タグ（カンマ区切り）</label>
        <input className="form-input" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="アウター, シューズ, ..." /></div>
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
        swatch: product?.swatch || { bg: '#E8E6E1', fg: '#8A8882' },
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

function Header({ view, dispatch }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand" onClick={() => dispatch({ type: 'navigate', view: 'brands' })} style={{ cursor: 'pointer' }}>
          <span className="header-logo">服</span>
          <span className="header-wordmark">Brand Manager</span>
        </div>
        <nav className="header-nav">
          {NAV_ITEMS.map(({ view: v, label }) => (
            <button key={v} className={cx('nav-btn', (view === v || (v === 'brands' && view === 'brand')) && 'is-active')}
              onClick={() => dispatch({ type: 'navigate', view: v })}>{label}</button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function App() {
  const [state, dispatch] = useReducer(appReducer, INITIAL);
  const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);

  useEffect(() => {
    document.documentElement.dataset.theme   = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.dataset.accent  = tweaks.accent;
  }, [tweaks]);

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
    <AppCtx.Provider value={{ state, dispatch }}>
      <ToastProvider>
        <Header view={state.view} dispatch={dispatch} />
        <main className="main-content">
          <div className="container">
            {renderPage()}
          </div>
        </main>
        {state.modal?.kind === 'brand'   && <BrandModal   modal={state.modal} dispatch={dispatch} />}
        {state.modal?.kind === 'product' && <ProductModal modal={state.modal} dispatch={dispatch} />}
        <TweaksPanel title="Fuku Tweaks">
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
      </ToastProvider>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

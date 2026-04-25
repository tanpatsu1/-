function ProductCard({ product, showBrand }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const brand = state.brands.find(b => b.id === product.brandId);
  const toggleBookmark = (e) => {
    e.stopPropagation(); e.preventDefault();
    dispatch({ type: 'toggleBookmark', id: product.id });
    if (product.bookmarked) {
      toast.show('ブックマークを解除しました', {
        action: { label: '元に戻す', onClick: () => dispatch({ type: 'toggleBookmark', id: product.id }) }
      });
    }
  };
  const cycleStatus = (e) => {
    e.stopPropagation(); e.preventDefault();
    const order = ['wishlist', 'considering', 'purchased'];
    const next = order[(order.indexOf(product.status) + 1) % order.length];
    dispatch({ type: 'setStatus', id: product.id, status: next });
  };
  return (
    <article className="product-card">
      <button className={cx('product-card__bm', product.bookmarked && 'is-bm')} onClick={toggleBookmark} aria-label="ブックマーク">
        {product.bookmarked ? '♥' : '♡'}
      </button>
      <a onClick={e => { e.preventDefault(); dispatch({ type: 'openBrand', id: product.brandId }); }}>
        <div className="product-card__image">
          <Swatch swatch={product.swatch} initial={brand?.initial || '?'} size="md" />
        </div>
        <div className="product-card__body">
          {(showBrand && brand) && <p className="product-card__brand">{brand.name}</p>}
          <p className="product-card__name">{product.name}</p>
          <p className="product-card__price">{fmtYen(product.price)}</p>
          {product.tags.length > 0 && (
            <div className="tags-row">{product.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
          )}
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={product.status} onClick={cycleStatus} interactive />
          </div>
        </div>
      </a>
      <div className="product-card__actions">
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'openProductModal', brandId: product.brandId, product }); }}>編集</button>
        <button className="btn btn-danger-ghost btn-sm" onClick={e => {
          e.stopPropagation();
          const snap = product;
          dispatch({ type: 'deleteProduct', id: product.id });
          toast.show(`${product.name} を削除しました`, { action: { label: '元に戻す', onClick: () => dispatch({ type: 'restoreProduct', snapshot: snap }) } });
        }}>削除</button>
      </div>
    </article>
  );
}

function ProductsPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('all');
  const [status, setStatus] = useState('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('default');
  const allTags = Array.from(new Set(state.products.flatMap(p => p.tags)));
  const filtered = state.products.filter(p => {
    if (brandId !== 'all' && p.brandId !== brandId) return false;
    if (status !== 'all' && p.status !== status) return false;
    if (tag !== 'all' && !p.tags.includes(tag)) return false;
    if (search) {
      const q = search.toLowerCase();
      const brand = state.brands.find(b => b.id === p.brandId);
      if (!p.name.toLowerCase().includes(q) && !brand?.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorted = sort === 'price_asc' ? [...filtered].sort((a, b) => a.price - b.price)
    : sort === 'price_desc' ? [...filtered].sort((a, b) => b.price - a.price)
    : sort === 'newest' ? [...filtered].sort((a, b) => (b.actedAt || '').localeCompare(a.actedAt || ''))
    : filtered;
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title"><em>Items</em><span className="dot">.</span></h1>
          <p className="section-sub">
            <span>{sorted.length} of {state.products.length}</span>
            <span className="sub-sep">·</span>
            <span>across {state.brands.length} brands</span>
          </p>
        </div>
      </div>
      <div className="search-sort-row">
        <input className="search-input" type="search" placeholder="Search items · brands…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sort-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
          <option value="all">すべてのブランド</option>
          {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="default">デフォルト順</option>
          <option value="newest">日付: 新しい順</option>
          <option value="price_asc">価格: 低い順</option>
          <option value="price_desc">価格: 高い順</option>
        </select>
      </div>
      <div className="filter-row">
        {[['all','全ステータス'],['wishlist','★ ほしい'],['considering','？ 検討中'],['purchased','✓ 購入済み']].map(([v,l]) => (
          <button key={v} className={cx('filter-chip', status === v && 'is-active')} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      <div className="filter-row">
        <button className={cx('filter-chip filter-chip--ghost', tag === 'all' && 'is-active')} onClick={() => setTag('all')}>全タグ</button>
        {allTags.map(t => (
          <button key={t} className={cx('filter-chip filter-chip--ghost', tag === t && 'is-active')} onClick={() => setTag(t)}>{t}</button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon="◯" title="No items match" text="Adjust your filters or search." />
      ) : (
        <div className="products-grid">{sorted.map(p => <ProductCard key={p.id} product={p} showBrand />)}</div>
      )}
    </div>
  );
}

function TimelinePage() {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState('all');
  const brandById = Object.fromEntries(state.brands.map(b => [b.id, b]));
  const items = state.products
    .filter(p => filter === 'all' ? true : p.status === filter)
    .filter(p => p.actedAt)
    .sort((a, b) => a.actedAt < b.actedAt ? 1 : -1);
  const years = {};
  for (const p of items) {
    const [y, m] = p.actedAt.split('-');
    years[y] ||= {};
    years[y][`${y}-${m}`] ||= [];
    years[y][`${y}-${m}`].push(p);
  }
  const yearKeys = Object.keys(years).sort((a, b) => b.localeCompare(a));
  const stats = state.products.reduce((acc, p) => {
    if (!p.actedAt) return acc;
    acc.total += 1;
    if (p.status === 'purchased') { acc.purchased += 1; acc.spend += p.price || 0; }
    return acc;
  }, { total: 0, purchased: 0, spend: 0 });
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtMonth = (key) => MONTHS[+key.split('-')[1] - 1];
  const fmtDay   = (d) => d.split('-')[2].replace(/^0/, '');
  const statusDot = (s) => s === 'purchased' ? 'tl-dot--filled' : s === 'wishlist' ? 'tl-dot--ring' : 'tl-dot--open';
  const filters = [['all','All'],['purchased','Purchased'],['wishlist','Wishlist'],['considering','Considering']];
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title"><em>Timeline</em><span className="dot">.</span></h1>
          <p className="section-sub">
            <span>{stats.purchased} purchased</span>
            <span className="sub-sep">·</span>
            <span>{stats.total} tracked</span>
            <span className="sub-sep">·</span>
            <span>{fmtYen(stats.spend)} spent</span>
          </p>
        </div>
        <div className="section-header__right">
          <div className="tl-filter">
            {filters.map(([v, label]) => (
              <button key={v} className={cx('tl-filter__btn', filter === v && 'is-active')} onClick={() => setFilter(v)}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="◯" title="No entries" text="Adjust the filter to see items." />
      ) : (
        <div className="timeline">
          {yearKeys.map(year => {
            const monthKeys = Object.keys(years[year]).sort((a, b) => b.localeCompare(a));
            const yearCount = monthKeys.reduce((s, k) => s + years[year][k].length, 0);
            const yearSpend = monthKeys.reduce((sum, mk) =>
              sum + years[year][mk].filter(p => p.status === 'purchased').reduce((s, p) => s + (p.price || 0), 0)
            , 0);
            return (
              <section key={year} className="tl-year">
                <aside className="tl-year__label">
                  <div className="tl-year__digits">{year}</div>
                  <div className="tl-year__meta">{yearCount} {yearCount === 1 ? 'item' : 'items'}</div>
                  {yearSpend > 0 && <div className="tl-year__spend">{fmtYen(yearSpend)}</div>}
                </aside>
                <div className="tl-year__body">
                  {monthKeys.map(mk => (
                    <div key={mk} className="tl-month">
                      <div className="tl-month__header">
                        <span className="tl-month__name">{fmtMonth(mk)}</span>
                        <span className="tl-month__line" />
                        <span className="tl-month__count">{years[year][mk].length}</span>
                      </div>
                      <ul className="tl-list">
                        {years[year][mk].map(p => {
                          const b = brandById[p.brandId];
                          return (
                            <li key={p.id} className="tl-item" onClick={() => b && dispatch({ type: 'openBrand', id: b.id })}>
                              <div className="tl-item__day">{fmtDay(p.actedAt)}</div>
                              <div className={cx('tl-dot', statusDot(p.status))} />
                              <div className="tl-item__swatch" style={{ background: p.swatch?.bg, color: p.swatch?.fg }} aria-hidden="true" />
                              <div className="tl-item__body">
                                <div className="tl-item__title">{p.name}</div>
                                <div className="tl-item__meta">
                                  <span className="tl-item__brand">{b?.name || '—'}</span>
                                  {p.tags?.[0] && <><span className="tl-item__sep">·</span><span>{p.tags[0]}</span></>}
                                  <span className="tl-item__sep">·</span>
                                  <span className="tl-item__status">{p.status}</span>
                                </div>
                              </div>
                              <div className="tl-item__price">{fmtYen(p.price)}</div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookmarksPage() {
  const { state } = useApp();
  const [brandId, setBrandId] = useState('all');
  const [tag, setTag] = useState('all');
  const bookmarked = state.products.filter(p => p.bookmarked);
  const allTags = Array.from(new Set(bookmarked.flatMap(p => p.tags)));
  const filtered = bookmarked.filter(p => {
    if (brandId !== 'all' && p.brandId !== brandId) return false;
    if (tag !== 'all' && !p.tags.includes(tag)) return false;
    return true;
  });
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title"><em>Saved</em><span className="dot">.</span></h1>
          <p className="section-sub"><span>{filtered.length} bookmarked</span></p>
        </div>
      </div>
      {bookmarked.length === 0 ? (
        <EmptyState icon="♡" title="ブックマークがありません" text="商品一覧や各ブランドページから♡をタップしてブックマークできます。" />
      ) : (
        <>
          <div className="bm-filter-row">
            <select className="bm-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="all">すべてのブランド</option>
              {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="bm-select" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="all">すべてのタグ</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="◯" title="該当なし" text="フィルタ条件を変更してください。" />
          ) : (
            <div className="products-grid">{filtered.map(p => <ProductCard key={p.id} product={p} showBrand />)}</div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsPage() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const [newGenre, setNewGenre] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const add = () => {
    const name = newGenre.trim();
    if (!name) return;
    if (state.genres.some(g => g.name === name)) { toast.show('同名のジャンルが既に存在します', { error: true }); return; }
    dispatch({ type: 'addGenre', name });
    setNewGenre('');
    toast.show(`「${name}」を追加しました`);
  };
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title"><em>Settings</em><span className="dot">.</span></h1>
          <p className="section-sub"><span>Genres · Account</span></p>
        </div>
      </div>
      <div className="settings-section">
        <h2 className="settings-section-title">ジャンル管理</h2>
        <p className="settings-section-desc">ブランドに付けるジャンルを管理します。ブランドの追加・編集モーダルから選択できます。</p>
        <div className="genre-add-row">
          <input className="form-input" type="text" placeholder="新しいジャンル名（例：スポーツ）" value={newGenre} onChange={e => setNewGenre(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn btn-primary btn-sm" onClick={add}>追加</button>
        </div>
        <div className="genre-list">
          {state.genres.map(g => {
            const count = state.brands.filter(b => b.genres.includes(g.id)).length;
            return (
              <div key={g.id} className="genre-item">
                {editingId === g.id ? (
                  <>
                    <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (dispatch({ type: 'renameGenre', id: g.id, name: editName }), setEditingId(null))} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={() => { dispatch({ type: 'renameGenre', id: g.id, name: editName }); setEditingId(null); }}>保存</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <span className="genre-item__name">{g.name}</span>
                    <span className="genre-item__count">{count}ブランド</span>
                    <div className="genre-item__btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(g.id); setEditName(g.name); }}>編集</button>
                      <button className="btn btn-danger-ghost btn-sm" onClick={() => {
                        if (count > 0 && !confirm(`「${g.name}」は${count}件のブランドに付与されています。削除しますか？`)) return;
                        dispatch({ type: 'deleteGenre', id: g.id });
                        toast.show(`「${g.name}」を削除しました`);
                      }}>削除</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="settings-section" style={{ marginTop: 24 }}>
        <h2 className="settings-section-title">アカウント</h2>
        <p className="settings-section-desc">ログイン中のアカウント情報。</p>
        <div className="settings-row">
          <span className="settings-row__label">メール</span>
          <span className="settings-row__value">user@example.com</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">プラン</span>
          <span className="settings-row__value">Free</span>
        </div>
      </div>
    </div>
  );
}

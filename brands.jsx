function BrandsPage() {
  const { state, dispatch } = useApp();
  const { brands, products, genres, brandFilters } = state;
  const { search, genre, tag, sort, mode } = brandFilters;

  const filtered = useMemo(() => {
    let list = brands.slice();
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q)));
    }
    if (genre !== 'all') list = list.filter(b => b.genres.includes(genre));
    if (tag !== 'all') list = list.filter(b => b.tags.includes(tag));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'recent') list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return list;
  }, [brands, search, genre, tag, sort]);

  const tagOptions = useMemo(() => {
    const set = new Set();
    brands.forEach(b => b.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [brands]);

  const setFilter = (patch) => dispatch({ type: 'setBrandFilters', patch });

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title"><em>Brands</em><span className="dot">.</span></h1>
          <p className="section-sub">
            <span>{filtered.length} of {brands.length}</span>
            <span className="sub-sep">·</span>
            <span>{state.genres.length} genres</span>
          </p>
        </div>
        <div className="section-header__right">
          <div className="view-toggle">
            <button className={cx('view-btn', mode === 'grid' && 'is-active')} onClick={() => setFilter({ mode: 'grid' })} aria-label="カード表示">⊞</button>
            <button className={cx('view-btn', mode === 'list' && 'is-active')} onClick={() => setFilter({ mode: 'list' })} aria-label="リスト表示">☰</button>
          </div>
          <Button variant="primary" onClick={() => dispatch({ type: 'openBrandModal', brand: null })}>＋ New brand</Button>
        </div>
      </div>
      <div className="search-sort-row">
        <input className="search-input" type="search" placeholder="ブランド名・タグで検索…" value={search} onChange={e => setFilter({ search: e.target.value })} />
        <select className="sort-select" value={sort} onChange={e => setFilter({ sort: e.target.value })}>
          <option value="name">名前順</option>
          <option value="recent">登録が新しい順</option>
        </select>
      </div>
      <div className="genre-filter-row">
        <button className={cx('filter-chip', genre === 'all' && 'is-active')} onClick={() => setFilter({ genre: 'all' })}>すべて</button>
        {genres.map(g => (
          <button key={g.id} className={cx('filter-chip', genre === g.id && 'is-active')} onClick={() => setFilter({ genre: g.id })}>{g.name}</button>
        ))}
      </div>
      {tagOptions.length > 0 && (
        <div className="filter-row">
          <button className={cx('filter-chip filter-chip--ghost', tag === 'all' && 'is-active')} onClick={() => setFilter({ tag: 'all' })}>全タグ</button>
          {tagOptions.map(t => (
            <button key={t} className={cx('filter-chip filter-chip--ghost', tag === t && 'is-active')} onClick={() => setFilter({ tag: t })}>{t}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState
          icon="◯"
          title={brands.length === 0 ? 'ブランドが未登録です' : '該当するブランドがありません'}
          text={brands.length === 0 ? '最初のファッションブランドを追加してコレクションを始めましょう。' : '検索やフィルタ条件を調整してください。'}
          action={brands.length === 0 && <Button variant="primary" onClick={() => dispatch({ type: 'openBrandModal', brand: null })}>＋ New brand</Button>}
        />
      ) : mode === 'grid' ? (
        <div className="brands-grid">
          {filtered.map(b => <BrandCard key={b.id} brand={b} products={products.filter(p => p.brandId === b.id)} />)}
        </div>
      ) : (
        <div className="brands-list">
          {filtered.map(b => <BrandRow key={b.id} brand={b} products={products.filter(p => p.brandId === b.id)} />)}
        </div>
      )}
    </div>
  );
}

function BrandCard({ brand, products }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const genreNames = brand.genres.map(id => state.genres.find(g => g.id === id)?.name).filter(Boolean);
  const onDelete = (e) => {
    e.stopPropagation();
    const snapshot = { brand, products };
    dispatch({ type: 'deleteBrand', id: brand.id });
    toast.show(`${brand.name} を削除しました`, {
      action: { label: '元に戻す', onClick: () => dispatch({ type: 'restoreBrand', snapshot }) },
    });
  };
  return (
    <article className="brand-card" onClick={() => dispatch({ type: 'openBrand', id: brand.id })}>
      <div className="brand-card__image">
        <Swatch swatch={brand.swatch} initial={brand.initial} size="md" />
      </div>
      <div className="brand-card__body">
        <h2 className="brand-card__name">{brand.name}</h2>
        <div className="brand-card__meta">
          {genreNames.map(g => <Badge key={g} kind="genre">{g}</Badge>)}
          <Badge kind="price">{priceSymbol(brand.price)}</Badge>
        </div>
        {brand.tags.length > 0 && (
          <div className="tags-row">{brand.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
        )}
        <p className="brand-card__count">{products.length} items</p>
      </div>
      <div className="brand-card__actions">
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'openBrandModal', brand }); }}>編集</button>
        <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>削除</button>
      </div>
    </article>
  );
}

function BrandRow({ brand, products }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const genreNames = brand.genres.map(id => state.genres.find(g => g.id === id)?.name).filter(Boolean);
  return (
    <div className="brand-row" onClick={() => dispatch({ type: 'openBrand', id: brand.id })}>
      <div className="brand-row__logo">
        <Swatch swatch={brand.swatch} initial={brand.initial} size="sm" />
      </div>
      <span className="brand-row__name">{brand.name}</span>
      <div className="brand-row__meta">
        {genreNames.map(g => <Badge key={g} kind="genre">{g}</Badge>)}
        <Badge kind="price">{priceSymbol(brand.price)}</Badge>
        {brand.tags.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
      </div>
      <span className="brand-row__count">{products.length} items</span>
      <div className="brand-row__actions">
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'openBrandModal', brand }); }}>編集</button>
        <button className="btn btn-danger-ghost btn-sm" onClick={e => {
          e.stopPropagation();
          const snapshot = { brand, products };
          dispatch({ type: 'deleteBrand', id: brand.id });
          toast.show(`${brand.name} を削除しました`, { action: { label: '元に戻す', onClick: () => dispatch({ type: 'restoreBrand', snapshot }) } });
        }}>削除</button>
      </div>
    </div>
  );
}

function BrandDetail({ brandId }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const brand = state.brands.find(b => b.id === brandId);
  const [productSearch, setProductSearch] = useState('');
  const [productTag, setProductTag] = useState('all');
  if (!brand) return <EmptyState icon="◯" title="ブランドが見つかりません" text="削除されたか、存在しないブランドです。" action={<Button variant="primary" onClick={() => dispatch({ type: 'navigate', view: 'brands' })}>ブランド一覧へ</Button>} />;
  const genreNames = brand.genres.map(id => state.genres.find(g => g.id === id)?.name).filter(Boolean);
  const brandProducts = state.products.filter(p => p.brandId === brand.id);
  const tagOpts = Array.from(new Set(brandProducts.flatMap(p => p.tags)));
  const filtered = brandProducts.filter(p => {
    if (productTag !== 'all' && !p.tags.includes(productTag)) return false;
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });
  return (
    <div>
      <a className="back-link" onClick={() => dispatch({ type: 'navigate', view: 'brands' })}>← Back to Brands</a>
      <div className="brand-detail-header">
        <div className="brand-detail-image">
          <Swatch swatch={brand.swatch} initial={brand.initial} size="xl" />
        </div>
        <div className="brand-detail-info">
          <h1>{brand.name}</h1>
          <div className="brand-detail-meta">
            {genreNames.map(g => <Badge key={g} kind="genre">{g}</Badge>)}
            <Badge kind="price">{priceSymbol(brand.price)}</Badge>
          </div>
          {brand.tags.length > 0 && (
            <div className="tags-row" style={{ marginBottom: 16 }}>{brand.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
          )}
          <p className="brand-detail-description">{brand.description}</p>
          {brand.note && (
            <div className="notes-box">
              <div className="notes-box__label">メモ</div>
              <div className="notes-box__text">{brand.note}</div>
            </div>
          )}
          <a href={brand.url} className="brand-official-link" target="_blank" rel="noopener" onClick={e => e.preventDefault()}>公式サイト ↗</a>
          <div className="brand-detail-actions">
            <Button variant="secondary" onClick={() => dispatch({ type: 'openBrandModal', brand })}>編集</Button>
            <button className="btn btn-danger-ghost" onClick={() => {
              const snap = { brand, products: brandProducts };
              dispatch({ type: 'deleteBrand', id: brand.id });
              dispatch({ type: 'navigate', view: 'brands' });
              toast.show(`${brand.name} を削除しました`, { action: { label: '元に戻す', onClick: () => dispatch({ type: 'restoreBrand', snapshot: snap }) } });
            }}>削除</button>
          </div>
        </div>
      </div>
      <div className="products-section">
        <div className="products-section-header">
          <h2>Items <span className="muted">({brandProducts.length})</span></h2>
          <span className="last-sync-text">2時間前に同期</span>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'openProductModal', brandId: brand.id, product: null })}>＋ Add item</button>
        </div>
        <div className="product-filter-row">
          <input className="product-search-input" type="search" placeholder="Search items · tags…" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
          <button className={cx('filter-chip', productTag === 'all' && 'is-active')} onClick={() => setProductTag('all')}>全タグ</button>
          {tagOpts.map(t => (
            <button key={t} className={cx('filter-chip', productTag === t && 'is-active')} onClick={() => setProductTag(t)}>{t}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState compact icon="◯" title="No items yet" text="Tap '+ Add item' to register one." />
        ) : (
          <div className="products-grid">{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text, action, compact }) {
  return (
    <div className={cx('empty-state', compact && 'empty-state--compact')}>
      <div className="empty-state__icon">{icon}</div>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__text">{text}</p>
      {action}
    </div>
  );
}

Object.assign(window, { BrandsPage, BrandDetail, BrandCard, BrandRow, EmptyState });

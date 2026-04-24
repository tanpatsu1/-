let _allProducts  = [];
let _bookmarks    = new Set();
let _filterBrand  = '';
let _filterTag    = '';

function _parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

async function _load() {
  const sb   = await getSupabase();
  const user = await getCurrentUser();
  const grid = document.getElementById('products-grid');

  grid.innerHTML = Array(6).fill(
    '<div class="skeleton" style="height:240px;border-radius:10px"></div>'
  ).join('');

  const { data, error } = await sb
    .from('bookmarks')
    .select(`
      product_id,
      products (
        id, name, product_url, image_url, price, tags, brand_id,
        brands ( id, name, logo_url )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = '';
    showToast(error.message || 'ブックマークの読み込みに失敗しました', 'error');
    return;
  }

  _allProducts = (data || [])
    .map(bm => bm.products)
    .filter(Boolean);

  _bookmarks = new Set(_allProducts.map(p => p.id));

  const title = document.getElementById('page-title');
  if (title) title.textContent = `ブックマーク${_allProducts.length ? `（${_allProducts.length}件）` : ''}`;

  _buildFilters();
  _render();
}

function _buildFilters() {
  const brandSel = document.getElementById('brand-filter');
  const tagSel   = document.getElementById('tag-filter');

  const brands = [...new Map(_allProducts.map(p => [p.brand_id, p.brands?.name]).filter(([, n]) => n)).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'ja'));
  const allTags = [...new Set(_allProducts.flatMap(p => _parseTags(p.tags)))].sort();

  brandSel.innerHTML = '<option value="">すべてのブランド</option>' +
    brands.map(([id, name]) => `<option value="${escHtml(id)}">${escHtml(name)}</option>`).join('');

  tagSel.innerHTML = '<option value="">すべてのタグ</option>' +
    allTags.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');

  brandSel.value = _filterBrand;
  tagSel.value   = _filterTag;
}

function _getFiltered() {
  let list = _allProducts.slice();
  if (_filterBrand) list = list.filter(p => p.brand_id === _filterBrand);
  if (_filterTag)   list = list.filter(p => _parseTags(p.tags).includes(_filterTag));
  return list;
}

function _render() {
  const grid  = document.getElementById('products-grid');
  const empty = document.getElementById('empty-state');
  const list  = _getFiltered();
  grid.innerHTML = '';

  if (!list.length) {
    empty.hidden = _allProducts.length > 0;
    if (_allProducts.length) {
      empty.hidden = true;
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:24px 0">該当する商品が見つかりません</p>';
    }
    return;
  }
  empty.hidden = true;

  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const isBm      = _bookmarks.has(p.id);
    const brandName = p.brands?.name || '';
    const tags      = _parseTags(p.tags);

    card.innerHTML = `
      <button class="product-card__bm${isBm ? ' is-bm' : ''}" data-id="${p.id}" title="ブックマーク解除">${isBm ? '♥' : '♡'}</button>
      <a href="${escHtml(p.product_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="product-card__image">
          ${p.image_url ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy">` : ''}
        </div>
        <div class="product-card__body">
          ${brandName ? `<p class="product-card__brand"><a class="brand-link js-brand" href="/brand?id=${escHtml(p.brand_id)}">${escHtml(brandName)}</a></p>` : ''}
          <p class="product-card__name">${escHtml(p.name)}</p>
          ${p.price ? `<p class="product-card__price">${escHtml(p.price)}</p>` : ''}
          ${tags.length ? `<div class="tags-row">${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      </a>`;

    const img = card.querySelector('img');
    if (img) img.addEventListener('error', () => { img.parentElement.style.background = '#F0F0F0'; img.remove(); });

    card.querySelector('.product-card__bm').addEventListener('click', async e => {
      e.stopPropagation();
      await _removeBookmark(p.id);
    });

    card.querySelector('.js-brand')?.addEventListener('click', e => e.stopPropagation());

    grid.appendChild(card);
  });
}

async function _removeBookmark(productId) {
  const sb   = await getSupabase();
  const user = await getCurrentUser();
  if (!user) return;
  const { error } = await sb.from('bookmarks').delete().eq('user_id', user.id).eq('product_id', productId);
  if (error) { showToast('解除に失敗しました', 'error'); return; }
  _allProducts  = _allProducts.filter(p => p.id !== productId);
  _bookmarks.delete(productId);
  const title = document.getElementById('page-title');
  if (title) title.textContent = `ブックマーク${_allProducts.length ? `（${_allProducts.length}件）` : ''}`;
  _buildFilters();
  _render();
  showToast('ブックマークを解除しました');
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email || '';
  document.getElementById('logout-btn')?.addEventListener('click', signOut);

  document.getElementById('brand-filter')?.addEventListener('change', e => {
    _filterBrand = e.target.value;
    _render();
  });
  document.getElementById('tag-filter')?.addEventListener('change', e => {
    _filterTag = e.target.value;
    _render();
  });

  _load();
});

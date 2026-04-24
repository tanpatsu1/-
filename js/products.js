let _products  = [];
let _bookmarks = new Set();
let _filterTag = '';
let _filterQ   = '';

function _parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

async function _load() {
  const sb   = await getSupabase();
  const user = await getCurrentUser();
  const grid = document.getElementById('products-grid');

  grid.innerHTML = Array(8).fill(
    '<div class="skeleton" style="height:240px;border-radius:10px"></div>'
  ).join('');

  const [{ data: products, error }, { data: bms }] = await Promise.all([
    sb.from('products')
      .select('*, brands(id, name, logo_url)')
      .order('first_seen_at', { ascending: false }),
    user
      ? sb.from('bookmarks').select('product_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  if (error) {
    grid.innerHTML = '';
    showToast(error.message || '商品の読み込みに失敗しました', 'error');
    return;
  }

  _products  = products || [];
  _bookmarks = new Set((bms || []).map(b => b.product_id));

  const title = document.getElementById('page-title');
  if (title) title.textContent = `商品一覧${_products.length ? `（${_products.length}件）` : ''}`;

  _buildTagChips();
  _render();
}

function _buildTagChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  const allTags = [...new Set(_products.flatMap(p => _parseTags(p.tags)))].sort();
  if (!allTags.length) { row.innerHTML = ''; return; }

  row.innerHTML = [{ label: 'すべて', value: '' }, ...allTags.map(t => ({ label: t, value: t }))]
    .map(({ label, value }) =>
      `<button class="filter-chip${_filterTag === value && (value !== '' || _filterTag === '') ? ' is-active' : ''}" data-tag="${escHtml(value)}">${escHtml(label)}</button>`
    ).join('');

  row.querySelectorAll('.filter-chip').forEach(btn =>
    btn.addEventListener('click', () => {
      _filterTag = btn.dataset.tag;
      _buildTagChips();
      _render();
    })
  );
}

function _getFiltered() {
  let list = _products.slice();
  if (_filterQ) {
    const q = _filterQ.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brands?.name || '').toLowerCase().includes(q) ||
      _parseTags(p.tags).some(t => t.toLowerCase().includes(q))
    );
  }
  if (_filterTag) {
    list = list.filter(p => _parseTags(p.tags).includes(_filterTag));
  }
  return list;
}

function _render() {
  const grid  = document.getElementById('products-grid');
  const empty = document.getElementById('empty-state');
  const list  = _getFiltered();
  grid.innerHTML = '';

  if (!list.length) {
    empty.hidden = false;
    if (_products.length) {
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
    const brandId   = p.brand_id;
    const tags      = _parseTags(p.tags);

    card.innerHTML = `
      <button class="product-card__bm${isBm ? ' is-bm' : ''}" data-id="${p.id}" title="${isBm ? 'ブックマーク解除' : 'ブックマーク'}">${isBm ? '♥' : '♡'}</button>
      <a href="${escHtml(p.product_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="product-card__image">
          ${p.image_url ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy">` : ''}
        </div>
        <div class="product-card__body">
          ${brandName ? `<p class="product-card__brand"><a class="brand-link js-brand" href="/brand?id=${escHtml(brandId)}">${escHtml(brandName)}</a></p>` : ''}
          <p class="product-card__name">${escHtml(p.name)}</p>
          ${p.price ? `<p class="product-card__price">${escHtml(p.price)}</p>` : ''}
          ${tags.length ? `<div class="tags-row">${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      </a>`;

    const img = card.querySelector('img');
    if (img) img.addEventListener('error', () => { img.parentElement.style.background = '#F0F0F0'; img.remove(); });

    card.querySelector('.product-card__bm').addEventListener('click', e => {
      e.stopPropagation();
      _toggleBookmark(p.id, card.querySelector('.product-card__bm'));
    });

    card.querySelector('.js-brand')?.addEventListener('click', e => e.stopPropagation());

    grid.appendChild(card);
  });
}

async function _toggleBookmark(productId, btn) {
  const sb   = await getSupabase();
  const user = await getCurrentUser();
  if (!user) return;
  const isBm = _bookmarks.has(productId);
  if (isBm) {
    await sb.from('bookmarks').delete().eq('user_id', user.id).eq('product_id', productId);
    _bookmarks.delete(productId);
    btn.textContent = '♡'; btn.classList.remove('is-bm'); btn.title = 'ブックマーク';
  } else {
    await sb.from('bookmarks').insert({ user_id: user.id, product_id: productId });
    _bookmarks.add(productId);
    btn.textContent = '♥'; btn.classList.add('is-bm'); btn.title = 'ブックマーク解除';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email || '';
  document.getElementById('logout-btn')?.addEventListener('click', signOut);

  document.getElementById('search-input')?.addEventListener('input', e => {
    _filterQ = e.target.value.trim();
    _render();
  });

  _load();
});

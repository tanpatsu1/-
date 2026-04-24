let _brands = [];
let _user   = null;
let _filterTag  = '';
let _filterQ    = '';
let _sortKey    = 'name';
let _viewMode   = localStorage.getItem('brandView') || 'card';

const PRICE_ORDER = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };

async function loadBrands() {
  const sb    = await getSupabase();
  const grid  = document.getElementById('brands-grid');
  const empty = document.getElementById('empty-state');
  const title = document.getElementById('page-title');

  grid.innerHTML = Array(4).fill(
    '<div class="skeleton" style="height:220px;border-radius:10px"></div>'
  ).join('');

  const { data, error } = await sb.from('brands').select('*').order('name');

  if (error) {
    grid.innerHTML = '';
    showToast(error.message || 'ブランドの読み込みに失敗しました', 'error');
    return;
  }

  _brands = data || [];
  title.textContent = `ブランド一覧${_brands.length ? `（${_brands.length}件）` : ''}`;
  _buildFilterChips();
  _render();
  empty.hidden = _brands.length > 0;
}

function _parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

function _buildFilterChips() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  const allTags = [...new Set(_brands.flatMap(b => _parseTags(b.tags)))].sort();
  if (!allTags.length) { row.innerHTML = ''; return; }
  row.innerHTML = allTags.map(t =>
    `<button class="filter-chip${_filterTag === t ? ' is-active' : ''}" data-tag="${escHtml(t)}">${escHtml(t)}</button>`
  ).join('');
  row.querySelectorAll('.filter-chip').forEach(btn =>
    btn.addEventListener('click', () => {
      _filterTag = _filterTag === btn.dataset.tag ? '' : btn.dataset.tag;
      _buildFilterChips();
      _render();
    })
  );
}

function _getFiltered() {
  let list = _brands.slice();
  if (_filterQ) {
    const q = _filterQ.toLowerCase();
    list = list.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.style || '').toLowerCase().includes(q) ||
      (_parseTags(b.tags).some(t => t.toLowerCase().includes(q)))
    );
  }
  if (_filterTag) {
    list = list.filter(b => _parseTags(b.tags).includes(_filterTag));
  }
  list.sort((a, b) => {
    if (_sortKey === 'newest')     return new Date(b.created_at) - new Date(a.created_at);
    if (_sortKey === 'price_asc')  return (PRICE_ORDER[a.price_range] || 0) - (PRICE_ORDER[b.price_range] || 0);
    if (_sortKey === 'price_desc') return (PRICE_ORDER[b.price_range] || 0) - (PRICE_ORDER[a.price_range] || 0);
    return a.name.localeCompare(b.name, 'ja');
  });
  return list;
}

function _setView(mode) {
  _viewMode = mode;
  localStorage.setItem('brandView', mode);
  document.getElementById('view-card').classList.toggle('is-active', mode === 'card');
  document.getElementById('view-list').classList.toggle('is-active', mode === 'list');
  _render();
}

function _render() {
  const grid  = document.getElementById('brands-grid');
  const empty = document.getElementById('empty-state');
  const list  = _getFiltered();
  grid.innerHTML = '';
  grid.className = _viewMode === 'list' ? '' : 'brands-grid';

  if (!list.length) {
    empty.hidden = _brands.length > 0;
    if (_brands.length) grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:24px 0">該当するブランドが見つかりません</p>';
    return;
  }
  empty.hidden = true;

  if (_viewMode === 'list') {
    const ul = document.createElement('div');
    ul.className = 'brands-list';
    list.forEach(b => ul.appendChild(_buildRow(b)));
    grid.appendChild(ul);
  } else {
    list.forEach(b => grid.appendChild(_buildCard(b)));
  }
}

function _buildRow(brand) {
  const row = document.createElement('a');
  row.className = 'brand-row';
  row.href = `/brand?id=${brand.id}`;

  const imgUrl  = brand.logo_url || brand.og_image_url;
  const initial = escHtml(brand.name.charAt(0).toUpperCase());
  const tags    = _parseTags(brand.tags).slice(0, 3);

  row.innerHTML = `
    <div class="brand-row__logo">
      ${imgUrl
        ? `<img src="${escHtml(imgUrl)}" alt="${escHtml(brand.name)}" loading="lazy">`
        : `<span class="brand-row__initial">${initial}</span>`}
    </div>
    <span class="brand-row__name">${escHtml(brand.name)}</span>
    <div class="brand-row__meta">
      ${brand.style       ? `<span class="badge badge-style">${escHtml(brand.style)}</span>` : ''}
      ${brand.price_range ? `<span class="badge badge-price">${escHtml(brand.price_range)}</span>` : ''}
      ${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}
    </div>
    <div class="brand-row__actions">
      <button class="btn btn-ghost btn-sm js-edit" data-id="${brand.id}">編集</button>
      <button class="btn btn-danger-ghost btn-sm js-del" data-id="${brand.id}">削除</button>
    </div>
  `;

  const img = row.querySelector('img');
  if (img) img.addEventListener('error', () => {
    img.parentElement.innerHTML = `<span class="brand-row__initial">${initial}</span>`;
  });

  row.querySelector('.js-edit').addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    openModal('edit', _brands.find(x => x.id === brand.id), () => loadBrands());
  });
  row.querySelector('.js-del').addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    _confirmDelete(brand.id, brand.name);
  });

  return row;
}

function _buildCard(brand) {
  const article = document.createElement('article');
  article.className = 'brand-card';
  article.dataset.id = brand.id;

  const imgUrl  = brand.og_image_url || brand.logo_url;
  const initial = escHtml(brand.name.charAt(0).toUpperCase());
  const tags    = _parseTags(brand.tags);

  article.innerHTML = `
    <div class="brand-card__image js-nav">
      ${imgUrl
        ? `<img src="${escHtml(imgUrl)}" alt="${escHtml(brand.name)}" loading="lazy">`
        : `<div class="brand-card__placeholder">${initial}</div>`
      }
    </div>
    <div class="brand-card__body js-nav">
      <h2 class="brand-card__name">${escHtml(brand.name)}</h2>
      <div class="brand-card__meta">
        ${brand.style       ? `<span class="badge badge-style">${escHtml(brand.style)}</span>` : ''}
        ${brand.price_range ? `<span class="badge badge-price">${escHtml(brand.price_range)}</span>` : ''}
      </div>
      ${tags.length ? `<div class="tags-row" style="margin-top:6px">${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="brand-card__actions">
      <button class="btn btn-ghost btn-sm js-edit"   data-id="${brand.id}">編集</button>
      <button class="btn btn-danger-ghost btn-sm js-del" data-id="${brand.id}">削除</button>
    </div>
  `;

  const img = article.querySelector('img');
  if (img) img.addEventListener('error', () => {
    img.parentElement.innerHTML = `<div class="brand-card__placeholder">${initial}</div>`;
  });

  article.querySelectorAll('.js-nav').forEach(el =>
    el.addEventListener('click', () => { window.location.href = `/brand?id=${brand.id}`; })
  );
  article.querySelector('.js-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', _brands.find(x => x.id === brand.id), () => loadBrands());
  });
  article.querySelector('.js-del').addEventListener('click', (e) => {
    e.stopPropagation();
    _confirmDelete(brand.id, brand.name);
  });

  return article;
}

async function _confirmDelete(id, name) {
  if (!confirm(`「${name}」を削除しますか？\n\nこのブランドの商品情報もすべて削除されます。`)) return;
  const sb = await getSupabase();
  const { error } = await sb.from('brands').delete().eq('id', id);
  if (error) { showToast('削除に失敗しました', 'error'); return; }
  showToast('ブランドを削除しました');
  loadBrands();
}

document.addEventListener('DOMContentLoaded', async () => {
  _user = await requireAuth();
  if (!_user) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = _user.user_metadata?.full_name || _user.email || '';

  document.getElementById('logout-btn')?.addEventListener('click', signOut);
  document.getElementById('view-card')?.addEventListener('click', () => _setView('card'));
  document.getElementById('view-list')?.addEventListener('click', () => _setView('list'));
  _setView(_viewMode);
  document.getElementById('add-brand-btn').addEventListener('click', () => openModal('add', null, () => loadBrands()));
  document.getElementById('empty-add-btn')?.addEventListener('click', () => openModal('add', null, () => loadBrands()));

  document.getElementById('search-input')?.addEventListener('input', e => {
    _filterQ = e.target.value.trim();
    _render();
  });

  document.getElementById('sort-select')?.addEventListener('change', e => {
    _sortKey = e.target.value;
    _render();
  });

  loadBrands();
});

let _brands = [];
let _user   = null;

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
  grid.innerHTML = '';
  title.textContent = `ブランド一覧${_brands.length ? `（${_brands.length}件）` : ''}`;

  if (_brands.length === 0) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
    _brands.forEach(b => grid.appendChild(_buildCard(b)));
  }
}

function _buildCard(brand) {
  const article = document.createElement('article');
  article.className = 'brand-card';
  article.dataset.id = brand.id;

  const imgUrl  = brand.og_image_url || brand.logo_url;
  const initial = escHtml(brand.name.charAt(0).toUpperCase());

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

  // Show user name
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = _user.user_metadata?.full_name || _user.email || '';

  document.getElementById('logout-btn')?.addEventListener('click', signOut);
  document.getElementById('add-brand-btn').addEventListener('click', () => openModal('add', null, () => loadBrands()));
  document.getElementById('empty-add-btn')?.addEventListener('click', () => openModal('add', null, () => loadBrands()));

  loadBrands();
});

let _brand = null;

function _relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'たった今';
  if (m < 60) return `${m}分前`;
  if (h < 24) return `${h}時間前`;
  return `${d}日前`;
}

async function _load() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/'; return; }

  const loadingEl = document.getElementById('brand-loading');
  const detailEl  = document.getElementById('brand-detail');
  const errorEl   = document.getElementById('brand-error');

  try {
    const sb = await getSupabase();
    const [{ data: brand, error: e1 }, { data: products, error: e2 }] = await Promise.all([
      sb.from('brands').select('*').eq('id', id).single(),
      sb.from('products').select('*').eq('brand_id', id).order('first_seen_at', { ascending: false }).limit(50),
    ]);

    if (e1) throw e1;
    _brand = brand;
    document.title = `${brand.name} — Brand Manager`;
    _renderDetail(brand);
    _renderProducts(products || []);
    loadingEl.hidden = true;
    detailEl.hidden  = false;
  } catch {
    loadingEl.hidden = true;
    errorEl.hidden   = false;
  }
}

function _renderDetail(brand) {
  const wrap    = document.getElementById('detail-image-wrap');
  const imgUrl  = brand.og_image_url || brand.logo_url;
  const initial = escHtml(brand.name.charAt(0).toUpperCase());

  wrap.innerHTML = imgUrl
    ? `<img src="${escHtml(imgUrl)}" alt="${escHtml(brand.name)}" onerror="this.parentElement.innerHTML='<div class=\\"brand-detail-placeholder\\">${initial}</div>'">`
    : `<div class="brand-detail-placeholder">${initial}</div>`;

  document.getElementById('detail-name').textContent = brand.name;

  document.getElementById('detail-meta').innerHTML = [
    brand.style       ? `<span class="badge badge-style">${escHtml(brand.style)}</span>` : '',
    brand.price_range ? `<span class="badge badge-price">${escHtml(brand.price_range)}</span>` : '',
  ].join('');

  const desc = document.getElementById('detail-description');
  desc.textContent = brand.description || '';
  desc.hidden = !brand.description;

  const urlEl = document.getElementById('detail-url');
  urlEl.href   = brand.url;
  urlEl.hidden = !brand.url;
}

function _renderProducts(products) {
  const grid     = document.getElementById('products-grid');
  const emptyEl  = document.getElementById('products-empty');
  const syncText = document.getElementById('last-sync-text');

  if (!products.length) {
    grid.hidden = true; emptyEl.hidden = false; return;
  }

  if (products[0]?.first_seen_at) syncText.textContent = `${_relativeTime(products[0].first_seen_at)}に更新`;

  grid.innerHTML = ''; grid.hidden = false; emptyEl.hidden = true;
  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <a href="${escHtml(p.product_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="product-card__image">
          ${p.image_url ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy">` : ''}
        </div>
        <div class="product-card__body">
          <p class="product-card__name">${escHtml(p.name)}</p>
          ${p.price ? `<p class="product-card__price">${escHtml(p.price)}</p>` : ''}
        </div>
      </a>`;
    const img = card.querySelector('img');
    if (img) img.addEventListener('error', () => { img.parentElement.style.background = '#F0F0F0'; img.remove(); });
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email || '';
  document.getElementById('logout-btn')?.addEventListener('click', signOut);

  _load();

  document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
    if (!_brand) return;
    openModal('edit', _brand, updated => { _brand = updated; _renderDetail(updated); showToast('ブランドを更新しました'); });
  });

  document.getElementById('detail-delete-btn')?.addEventListener('click', async () => {
    if (!_brand || !confirm(`「${_brand.name}」を削除しますか？\n\nこのブランドの商品情報もすべて削除されます。`)) return;
    const sb = await getSupabase();
    const { error } = await sb.from('brands').delete().eq('id', _brand.id);
    if (error) { showToast('削除に失敗しました', 'error'); return; }
    showToast('ブランドを削除しました');
    setTimeout(() => { location.href = '/'; }, 900);
  });
});

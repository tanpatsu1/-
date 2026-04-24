let _brand = null;
let _bookmarks = new Set();

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

function _parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

async function _load() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = '/'; return; }

  const loadingEl = document.getElementById('brand-loading');
  const detailEl  = document.getElementById('brand-detail');
  const errorEl   = document.getElementById('brand-error');

  try {
    const sb   = await getSupabase();
    const user = await getCurrentUser();
    const [{ data: brand, error: e1 }, { data: products }, { data: bms }] = await Promise.all([
      sb.from('brands').select('*').eq('id', id).single(),
      sb.from('products').select('*').eq('brand_id', id).order('first_seen_at', { ascending: false }).limit(100),
      user ? sb.from('bookmarks').select('product_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);

    if (e1) throw e1;
    _brand = brand;
    _bookmarks = new Set((bms || []).map(b => b.product_id));
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

  const tagsEl = document.getElementById('detail-tags');
  const tags   = _parseTags(brand.tags);
  tagsEl.innerHTML = tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('');
  tagsEl.hidden = !tags.length;

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

  const latest = products.find(p => p.first_seen_at);
  if (latest) syncText.textContent = `${_relativeTime(latest.first_seen_at)}に更新`;

  grid.innerHTML = ''; grid.hidden = false; emptyEl.hidden = true;
  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const isBm = _bookmarks.has(p.id);
    card.innerHTML = `
      <button class="product-card__bm${isBm ? ' is-bm' : ''}" data-id="${p.id}" title="${isBm ? 'ブックマーク解除' : 'ブックマーク'}">${isBm ? '♥' : '♡'}</button>
      <a href="${escHtml(p.product_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="product-card__image">
          ${p.image_url ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy">` : ''}
        </div>
        <div class="product-card__body">
          <p class="product-card__name">${escHtml(p.name)}</p>
          ${p.price ? `<p class="product-card__price">${escHtml(p.price)}</p>` : ''}
          ${_parseTags(p.tags).length ? `<div class="tags-row" style="margin-top:4px">${_parseTags(p.tags).map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
          ${p.notes ? `<p class="product-card__price" style="color:var(--text-light);margin-top:2px">${escHtml(p.notes)}</p>` : ''}
        </div>
      </a>`;
    const img = card.querySelector('img');
    if (img) img.addEventListener('error', () => { img.parentElement.style.background = '#F0F0F0'; img.remove(); });
    card.querySelector('.product-card__bm').addEventListener('click', e => {
      e.stopPropagation();
      _toggleBookmark(p.id, card.querySelector('.product-card__bm'));
    });
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

const PRODUCT_TAG_PRESETS = ['トップス','ボトムス','アウター','ワンピース','シューズ','バッグ','アクセサリー','スポーツ','ストリート','ミニマル','ラグジュアリー','ヴィンテージ'];

function _buildProductTagPresets() {
  const wrap = document.getElementById('p-tag-presets');
  if (!wrap) return;
  wrap.innerHTML = PRODUCT_TAG_PRESETS.map(t =>
    `<button type="button" class="tag-preset-btn" data-tag="${t}">${t}</button>`
  ).join('');
  wrap.querySelectorAll('.tag-preset-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const el = document.getElementById('p-tags');
      if (!el) return;
      const current = el.value.split(',').map(t => t.trim()).filter(Boolean);
      if (!current.includes(btn.dataset.tag)) el.value = [...current, btn.dataset.tag].join(', ');
    })
  );
}

function _openProductModal() {
  ['p-url','p-name','p-price','p-image','p-tags','p-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('p-fetch-status').textContent = '';
  _buildProductTagPresets();
  document.getElementById('p-modal-overlay').classList.add('is-open');
  setTimeout(() => document.getElementById('p-url').focus(), 60);
}

function _closeProductModal() {
  document.getElementById('p-modal-overlay').classList.remove('is-open');
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
    openModal('edit', _brand, updated => { _brand = updated; _renderDetail(updated); });
  });

  document.getElementById('detail-delete-btn')?.addEventListener('click', async () => {
    if (!_brand || !confirm(`「${_brand.name}」を削除しますか？\n\nこのブランドの商品情報もすべて削除されます。`)) return;
    const sb = await getSupabase();
    const { error } = await sb.from('brands').delete().eq('id', _brand.id);
    if (error) { showToast('削除に失敗しました', 'error'); return; }
    showToast('ブランドを削除しました');
    setTimeout(() => { location.href = '/'; }, 900);
  });

  document.getElementById('add-product-btn')?.addEventListener('click', _openProductModal);
  document.getElementById('p-modal-close')?.addEventListener('click', _closeProductModal);
  document.getElementById('p-modal-cancel')?.addEventListener('click', _closeProductModal);
  document.getElementById('p-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'p-modal-overlay') _closeProductModal();
  });

  document.getElementById('p-fetch-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('p-url').value.trim();
    if (!url) return;
    const btn = document.getElementById('p-fetch-btn');
    const st  = document.getElementById('p-fetch-status');
    btn.disabled = true; btn.textContent = '取得中…'; st.textContent = ''; st.className = 'fetch-status';
    try {
      const meta = await API.post('/api/fetch-meta', { url });
      if (meta.title && !document.getElementById('p-name').value) document.getElementById('p-name').value = meta.title;
      if (meta.og_image_url) document.getElementById('p-image').value = meta.og_image_url;
      st.textContent = '情報を取得しました ✓'; st.className = 'fetch-status ok';
    } catch {
      st.textContent = '取得できませんでした。手動で入力してください'; st.className = 'fetch-status err';
    } finally {
      btn.disabled = false; btn.textContent = '情報を取得';
    }
  });

  document.getElementById('p-modal-save')?.addEventListener('click', async () => {
    const name = document.getElementById('p-name').value.trim();
    const url  = document.getElementById('p-url').value.trim();
    if (!name || !url) { showToast('商品名とURLを入力してください', 'error'); return; }
    const saveBtn = document.getElementById('p-modal-save');
    saveBtn.disabled = true; saveBtn.textContent = '追加中…';
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('products').insert({
        brand_id:    _brand.id,
        name,
        product_url: url,
        image_url:   document.getElementById('p-image').value.trim() || null,
        price:       document.getElementById('p-price').value.trim() || null,
        tags:        document.getElementById('p-tags').value.trim()  || null,
        notes:       document.getElementById('p-notes').value.trim() || null,
        is_manual:   true,
      });
      if (error) throw new Error(error.message);
      _closeProductModal();
      showToast('商品を追加しました');
      _load();
    } catch (err) {
      showToast(err.message || '追加に失敗しました', 'error');
      saveBtn.disabled = false; saveBtn.textContent = '追加';
    }
  });
});

let _brand         = null;
let _products      = [];
let _bookmarks     = new Set();
let _productFilterQ   = '';
let _productFilterTag = '';
let _editingProductId = null;

const STATUS_CONFIG = {
  wishlist:    { label: '★ ほしい',    next: 'considering' },
  considering: { label: '？ 検討中',   next: 'purchased'   },
  purchased:   { label: '✓ 購入済み', next: 'wishlist'    },
};

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
    const sb   = await getSupabase();
    const user = await getCurrentUser();
    const [{ data: brand, error: e1 }, { data: products }, { data: bms }] = await Promise.all([
      sb.from('brands').select('*').eq('id', id).single(),
      sb.from('products').select('*').eq('brand_id', id).order('first_seen_at', { ascending: false }),
      user ? sb.from('bookmarks').select('product_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);

    if (e1) throw e1;
    _brand     = brand;
    _products  = products || [];
    _bookmarks = new Set((bms || []).map(b => b.product_id));
    document.title = `${brand.name} — Brand Manager`;
    _renderDetail(brand);
    _renderProducts();
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
  const tags   = parseTags(brand.tags);
  tagsEl.innerHTML = tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('');
  tagsEl.hidden = !tags.length;

  const desc = document.getElementById('detail-description');
  desc.textContent = brand.description || '';
  desc.hidden = !brand.description;

  const notesBox  = document.getElementById('detail-notes');
  const notesText = document.getElementById('detail-notes-text');
  if (notesBox && notesText) {
    notesText.textContent = brand.notes || '';
    notesBox.hidden = !brand.notes;
  }

  const urlEl = document.getElementById('detail-url');
  urlEl.href   = brand.url;
  urlEl.hidden = !brand.url;
}

function _getFilteredProducts() {
  let list = _products.slice();
  if (_productFilterQ) {
    const q = _productFilterQ.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      parseTags(p.tags).some(t => t.toLowerCase().includes(q))
    );
  }
  if (_productFilterTag) {
    list = list.filter(p => parseTags(p.tags).includes(_productFilterTag));
  }
  return list;
}

function _buildProductTagFilter() {
  const row = document.getElementById('product-tag-filter');
  if (!row) return;
  const allTags = [...new Set(_products.flatMap(p => parseTags(p.tags)))].sort();
  row.innerHTML = allTags.map(t =>
    `<button class="filter-chip${_productFilterTag === t ? ' is-active' : ''}" data-tag="${escHtml(t)}">${escHtml(t)}</button>`
  ).join('');
  row.querySelectorAll('.filter-chip').forEach(btn =>
    btn.addEventListener('click', () => {
      _productFilterTag = _productFilterTag === btn.dataset.tag ? '' : btn.dataset.tag;
      _buildProductTagFilter();
      _renderProducts();
    })
  );
}

function _renderProducts() {
  const grid    = document.getElementById('products-grid');
  const emptyEl = document.getElementById('products-empty');
  const syncEl  = document.getElementById('last-sync-text');
  const filterRow = document.getElementById('product-filter-row');

  if (filterRow) filterRow.hidden = _products.length === 0;

  const list = _getFilteredProducts();

  if (!_products.length) {
    grid.hidden = true; emptyEl.hidden = false; return;
  }

  const latest = _products.find(p => p.first_seen_at);
  if (latest && syncEl) syncEl.textContent = `${_relativeTime(latest.first_seen_at)}に更新`;

  grid.innerHTML = ''; grid.hidden = false; emptyEl.hidden = true;

  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:16px 0">該当する商品が見つかりません</p>';
    return;
  }

  _buildProductTagFilter();

  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const isBm     = _bookmarks.has(p.id);
    const status   = p.status || 'wishlist';
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.wishlist;
    const tags     = parseTags(p.tags);

    card.innerHTML = `
      <button class="product-card__bm${isBm ? ' is-bm' : ''}" data-id="${p.id}" title="${isBm ? 'ブックマーク解除' : 'ブックマーク'}">${isBm ? '♥' : '♡'}</button>
      <a href="${escHtml(p.product_url || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="product-card__image">
          ${p.image_url
            ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy">`
            : `<div class="product-card__placeholder">${escHtml(p.name.charAt(0).toUpperCase())}</div>`}
        </div>
        <div class="product-card__body">
          <p class="product-card__name">${escHtml(p.name)}</p>
          ${p.price ? `<p class="product-card__price">${escHtml(p.price)}</p>` : ''}
          ${tags.length ? `<div class="tags-row" style="margin-top:4px">${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
          ${p.notes ? `<p class="product-card__price" style="color:var(--text-light);margin-top:2px">${escHtml(p.notes)}</p>` : ''}
          <div style="margin-top:6px">
            <button class="status-badge ${escHtml(status)}" data-id="${p.id}" data-status="${escHtml(status)}">${statusCfg.label}</button>
          </div>
        </div>
      </a>
      <div class="product-card__actions">
        <button class="btn btn-ghost btn-sm js-edit" data-id="${p.id}">編集</button>
        <button class="btn btn-danger-ghost btn-sm js-del" data-id="${p.id}">削除</button>
      </div>`;

    const img = card.querySelector('img');
    if (img) img.addEventListener('error', () => {
      img.parentElement.innerHTML = `<div class="product-card__placeholder">${escHtml(p.name.charAt(0).toUpperCase())}</div>`;
    });

    card.querySelector('.product-card__bm').addEventListener('click', e => {
      e.stopPropagation();
      _toggleBookmark(p.id, card.querySelector('.product-card__bm'));
    });

    card.querySelector('.status-badge').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      _cycleStatus(p.id, e.currentTarget);
    });

    card.querySelector('.js-edit').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      _openProductModal(_products.find(x => x.id === p.id));
    });

    card.querySelector('.js-del').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      _confirmDeleteProduct(p.id, p.name);
    });

    grid.appendChild(card);
  });
}

async function _cycleStatus(productId, btn) {
  const current = btn.dataset.status || 'wishlist';
  const next    = STATUS_CONFIG[current]?.next || 'wishlist';
  const sb      = await getSupabase();
  const { error } = await sb.from('products').update({ status: next }).eq('id', productId);
  if (error) { showToast('更新に失敗しました', 'error'); return; }
  const prod = _products.find(p => p.id === productId);
  if (prod) prod.status = next;
  btn.className  = `status-badge ${next}`;
  btn.dataset.status = next;
  btn.textContent = STATUS_CONFIG[next].label;
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
    showToast('ブックマークを解除しました', '', {
      label: '元に戻す',
      callback: async () => {
        await sb.from('bookmarks').insert({ user_id: user.id, product_id: productId });
        _bookmarks.add(productId);
        btn.textContent = '♥'; btn.classList.add('is-bm'); btn.title = 'ブックマーク解除';
      },
    });
  } else {
    await sb.from('bookmarks').insert({ user_id: user.id, product_id: productId });
    _bookmarks.add(productId);
    btn.textContent = '♥'; btn.classList.add('is-bm'); btn.title = 'ブックマーク解除';
    showToast('ブックマークしました');
  }
}

async function _confirmDeleteProduct(id, name) {
  if (!confirm(`「${name}」を削除しますか？`)) return;
  const sb = await getSupabase();
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) { showToast('削除に失敗しました', 'error'); return; }
  _products = _products.filter(p => p.id !== id);
  showToast('商品を削除しました');
  _renderProducts();
}

/* ── Product Modal ── */

const PRODUCT_TAG_PRESETS = ['トップス','ボトムス','アウター','ワンピース','シューズ','バッグ','アクセサリー','スポーツ','ストリート','ミニマル','ラグジュアリー','ヴィンテージ'];

const TAG_KEYWORDS = {
  'トップス':     ['tシャツ','t-shirt','shirt','シャツ','ニット','knit','カットソー','タンク','ブラウス','polo','ポロ','tops'],
  'ボトムス':     ['パンツ','デニム','jeans','スカート','skirt','ショーツ','shorts','スラックス','chino','チノ'],
  'アウター':     ['コート','coat','ジャケット','jacket','ブルゾン','blouson','パーカー','hoodie','カーディガン','cardigan','vest','ベスト','アウター'],
  'ワンピース':   ['ワンピース','dress','ドレス','サロペット'],
  'シューズ':     ['シューズ','スニーカー','sneaker','boots','ブーツ','サンダル','sandal','ローファー','loafer','靴','shoe'],
  'バッグ':       ['バッグ','bag','トート','tote','ショルダー','shoulder','リュック','backpack','クラッチ','財布','wallet'],
  'アクセサリー': ['アクセサリー','ネックレス','リング','ピアス','ベルト','belt','帽子','hat','cap','スカーフ','scarf','サングラス'],
};

function _suggestTags(text) {
  const lower = text.toLowerCase();
  return Object.entries(TAG_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => lower.includes(kw)))
    .map(([tag]) => tag);
}

function _applyTagSuggestions(name) {
  const el = document.getElementById('p-tags');
  if (!el) return;
  const suggested = _suggestTags(name);
  if (!suggested.length) return;
  const current = el.value.split(',').map(t => t.trim()).filter(Boolean);
  el.value = [...new Set([...current, ...suggested])].join(', ');
}

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

function _openProductModal(product = null) {
  _editingProductId = product?.id ?? null;
  const isEdit = !!_editingProductId;

  document.querySelector('#p-modal-overlay .modal__title').textContent = isEdit ? '商品を編集' : '商品を追加';
  document.getElementById('p-modal-save').textContent = isEdit ? '更新' : '追加';

  const fields = { 'p-url': 'product_url', 'p-name': 'name', 'p-price': 'price', 'p-image': 'image_url', 'p-tags': 'tags', 'p-notes': 'notes' };
  Object.entries(fields).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) el.value = (isEdit ? product?.[key] : '') ?? '';
  });

  document.getElementById('p-fetch-status').textContent = '';
  _buildProductTagPresets();
  document.getElementById('p-modal-overlay').classList.add('is-open');
  setTimeout(() => document.getElementById(isEdit ? 'p-name' : 'p-url').focus(), 60);
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

  document.getElementById('product-search')?.addEventListener('input', e => {
    _productFilterQ = e.target.value.trim();
    _renderProducts();
  });

  document.getElementById('add-product-btn')?.addEventListener('click', () => _openProductModal());
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
      const meta   = await API.post('/api/fetch-meta', { url });
      const nameEl = document.getElementById('p-name');
      if (meta.title && !nameEl.value) nameEl.value = meta.title;
      if (meta.og_image_url) document.getElementById('p-image').value = meta.og_image_url;
      _applyTagSuggestions(nameEl.value);
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
    if (!name) { showToast('商品名を入力してください', 'error'); return; }
    if (!url && !_editingProductId) { showToast('URLを入力してください', 'error'); return; }

    const saveBtn = document.getElementById('p-modal-save');
    saveBtn.disabled = true; saveBtn.textContent = _editingProductId ? '更新中…' : '追加中…';

    const payload = {
      name,
      product_url: url || null,
      image_url:   document.getElementById('p-image').value.trim() || null,
      price:       document.getElementById('p-price').value.trim() || null,
      tags:        document.getElementById('p-tags').value.trim()  || null,
      notes:       document.getElementById('p-notes').value.trim() || null,
    };

    try {
      const sb = await getSupabase();
      let error;
      if (_editingProductId) {
        ({ error } = await sb.from('products').update(payload).eq('id', _editingProductId));
        if (!error) {
          const idx = _products.findIndex(p => p.id === _editingProductId);
          if (idx !== -1) _products[idx] = { ..._products[idx], ...payload };
        }
      } else {
        ({ error } = await sb.from('products').insert({ ...payload, brand_id: _brand.id, is_manual: true }));
        if (!error) await _reloadProducts();
      }
      if (error) throw new Error(error.message);
      _closeProductModal();
      showToast(_editingProductId ? '商品を更新しました' : '商品を追加しました');
      _renderProducts();
    } catch (err) {
      showToast(err.message || '保存に失敗しました', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = _editingProductId ? '更新' : '追加';
    }
  });
});

async function _reloadProducts() {
  const sb = await getSupabase();
  const id = new URLSearchParams(location.search).get('id');
  const { data } = await sb.from('products').select('*').eq('brand_id', id).order('first_seen_at', { ascending: false });
  _products = data || [];
}

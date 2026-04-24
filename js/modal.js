let _modalMode = 'add';
let _editingId = null;
let _onSave    = null;
let _selectedGenreIds = new Set();

const TAG_PRESETS = ['トップス','ボトムス','アウター','ワンピース','シューズ','バッグ','アクセサリー','スポーツ','ストリート','ミニマル','ラグジュアリー','ヴィンテージ'];

async function openModal(mode, brand, onSave) {
  _modalMode = mode;
  _editingId = brand?.id ?? null;
  _onSave    = onSave ?? null;
  _selectedGenreIds = new Set();

  const title = document.getElementById('modal-title');
  if (title) title.textContent = mode === 'edit' ? 'ブランドを編集' : 'ブランドを追加';

  _resetForm();
  _buildTagPresets();

  if (mode === 'edit' && brand) {
    _set('f-url',         brand.url          ?? '');
    _set('f-name',        brand.name         ?? '');
    _set('f-description', brand.description  ?? '');
    _set('f-price',       brand.price_range  ?? '');
    _set('f-logo',        brand.logo_url     ?? '');
    _set('f-og-image',    brand.og_image_url ?? '');
    _set('f-tags',        brand.tags         ?? '');
    _set('f-notes',       brand.notes        ?? '');
  }

  document.getElementById('modal-overlay').classList.add('is-open');
  setTimeout(() => document.getElementById('f-url')?.focus(), 60);

  await _loadGenreChips(mode === 'edit' ? brand?.id : null);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('is-open');
}

function _resetForm() {
  _selectedGenreIds = new Set();
  document.getElementById('brand-form')?.reset();
  const fs = document.getElementById('fetch-status');
  if (fs) { fs.textContent = ''; fs.className = 'fetch-status'; }
  _set('f-og-image', '');
  _set('f-tags', '');
  _set('f-notes', '');
  const genreChips = document.getElementById('genre-chips');
  if (genreChips) genreChips.innerHTML = '<span style="font-size:12px;color:var(--text-light)">読み込み中...</span>';
}

function _buildTagPresets() {
  const wrap = document.getElementById('tag-presets');
  if (!wrap) return;
  wrap.innerHTML = TAG_PRESETS.map(t =>
    `<button type="button" class="tag-preset-btn" data-tag="${t}">${t}</button>`
  ).join('');
  wrap.querySelectorAll('.tag-preset-btn').forEach(btn =>
    btn.addEventListener('click', () => _addTag(btn.dataset.tag))
  );
}

function _addTag(tag) {
  const el = document.getElementById('f-tags');
  if (!el) return;
  const current = el.value.split(',').map(t => t.trim()).filter(Boolean);
  if (!current.includes(tag)) el.value = [...current, tag].join(', ');
}

async function _loadGenreChips(brandId) {
  const wrap = document.getElementById('genre-chips');
  if (!wrap) return;
  try {
    const sb   = await getSupabase();
    const user = await getCurrentUser();
    if (!user) { wrap.innerHTML = ''; return; }

    const [{ data: genres, error: ge }, { data: bgs }] = await Promise.all([
      sb.from('genres').select('id, name, sort_order').eq('user_id', user.id).order('sort_order').order('name'),
      brandId
        ? sb.from('brand_genres').select('genre_id').eq('brand_id', brandId)
        : Promise.resolve({ data: [] }),
    ]);

    if (ge) throw ge;
    _selectedGenreIds = new Set((bgs || []).map(bg => bg.genre_id));
    _renderGenreChips(genres || []);
  } catch {
    wrap.innerHTML = '<span style="font-size:12px;color:var(--text-light)">読み込みに失敗しました</span>';
  }
}

function _renderGenreChips(genres) {
  const wrap = document.getElementById('genre-chips');
  if (!wrap) return;
  if (!genres.length) {
    wrap.innerHTML = '<span style="font-size:12px;color:var(--text-light)">ジャンルがありません。<a href="/settings" target="_blank" style="color:var(--text-muted)">設定</a>から追加できます。</span>';
    return;
  }
  wrap.innerHTML = genres.map(g => {
    const sel = _selectedGenreIds.has(g.id);
    return `<button type="button" class="genre-chip-btn${sel ? ' is-selected' : ''}" data-id="${escHtml(g.id)}">${escHtml(g.name)}</button>`;
  }).join('');
  wrap.querySelectorAll('.genre-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (_selectedGenreIds.has(id)) {
        _selectedGenreIds.delete(id);
        btn.classList.remove('is-selected');
      } else {
        _selectedGenreIds.add(id);
        btn.classList.add('is-selected');
      }
    });
  });
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function _status(msg, type) {
  const el = document.getElementById('fetch-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = `fetch-status${type ? ' ' + type : ''}`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('fetch-btn')?.addEventListener('click', _handleFetch);
  document.getElementById('modal-save')?.addEventListener('click', _handleSave);
});

async function _handleFetch() {
  const url = document.getElementById('f-url')?.value.trim();
  if (!url) { _status('URLを入力してください', 'err'); return; }

  const btn = document.getElementById('fetch-btn');
  btn.disabled = true; btn.textContent = '取得中…';
  _status('情報を取得しています...', '');

  try {
    const meta = await API.post('/api/fetch-meta', { url });
    if (meta.title && !document.getElementById('f-name').value) _set('f-name', meta.title);
    if (meta.description && !document.getElementById('f-description').value) _set('f-description', meta.description);
    if (meta.logo_url)     _set('f-logo',     meta.logo_url);
    if (meta.og_image_url) _set('f-og-image', meta.og_image_url);
    _status('情報を取得しました ✓', 'ok');
  } catch {
    _status('自動取得できませんでした。手動で入力してください', 'err');
  } finally {
    btn.disabled = false; btn.textContent = '情報を取得';
  }
}

async function _handleSave() {
  const name = document.getElementById('f-name')?.value.trim();
  const url  = document.getElementById('f-url')?.value.trim();
  if (!name || !url) { showToast('ブランド名とURLを入力してください', 'error'); return; }

  const user = await getCurrentUser();
  if (!user) { window.location.href = '/login'; return; }

  const payload = {
    name,
    url,
    user_id:      user.id,
    description:  document.getElementById('f-description')?.value.trim() || null,
    price_range:  document.getElementById('f-price')?.value              || null,
    logo_url:     document.getElementById('f-logo')?.value.trim()        || null,
    og_image_url: document.getElementById('f-og-image')?.value.trim()    || null,
    tags:         document.getElementById('f-tags')?.value.trim()        || null,
    notes:        document.getElementById('f-notes')?.value.trim()       || null,
  };

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true; saveBtn.textContent = '保存中…';

  try {
    const sb = await getSupabase();
    let result, error;

    if (_modalMode === 'edit') {
      ({ data: result, error } = await sb.from('brands').update(payload).eq('id', _editingId).select().single());
    } else {
      ({ data: result, error } = await sb.from('brands').insert(payload).select().single());
    }

    if (error) throw new Error(error.message);

    // Sync genres
    const brandId = _modalMode === 'edit' ? _editingId : result?.id;
    if (brandId) {
      await sb.from('brand_genres').delete().eq('brand_id', brandId);
      if (_selectedGenreIds.size > 0) {
        const { error: ge } = await sb.from('brand_genres').insert(
          [..._selectedGenreIds].map(genre_id => ({ brand_id: brandId, genre_id }))
        );
        if (ge) showToast('ジャンルの保存に失敗しました', 'error');
      }
    }

    closeModal();
    showToast(_modalMode === 'edit' ? 'ブランドを更新しました' : 'ブランドを追加しました');
    if (_onSave) _onSave(result);
  } catch (err) {
    showToast(err.message || '保存に失敗しました', 'error');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = '保存';
  }
}

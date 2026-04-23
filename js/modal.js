let _modalMode = 'add';
let _editingId = null;
let _onSave = null;

function openModal(mode, brand, onSave) {
  _modalMode = mode;
  _editingId = brand?.id ?? null;
  _onSave    = onSave ?? null;

  const title = document.getElementById('modal-title');
  if (title) title.textContent = mode === 'edit' ? 'ブランドを編集' : 'ブランドを追加';

  _resetForm();

  if (mode === 'edit' && brand) {
    _setField('f-url',         brand.url         ?? '');
    _setField('f-name',        brand.name        ?? '');
    _setField('f-description', brand.description ?? '');
    _setField('f-style',       brand.style       ?? '');
    _setField('f-price',       brand.price_range ?? '');
    _setField('f-logo',        brand.logo_url    ?? '');
    _setField('f-og-image',    brand.og_image_url ?? '');
  }

  document.getElementById('modal-overlay').classList.add('is-open');
  setTimeout(() => document.getElementById('f-url')?.focus(), 60);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('is-open');
}

function _resetForm() {
  document.getElementById('brand-form')?.reset();
  const fs = document.getElementById('fetch-status');
  if (fs) { fs.textContent = ''; fs.className = 'fetch-status'; }
  _setField('f-og-image', '');
}

function _setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('fetch-btn')?.addEventListener('click', _handleFetch);
  document.getElementById('modal-save')?.addEventListener('click', _handleSave);
});

async function _handleFetch() {
  const url = document.getElementById('f-url')?.value.trim();
  if (!url) { _setStatus('URLを入力してください', 'err'); return; }

  const btn = document.getElementById('fetch-btn');
  btn.disabled = true;
  btn.textContent = '取得中…';
  _setStatus('情報を取得しています...', '');

  try {
    const meta = await API.post('/api/fetch-meta', { url });

    if (meta.title) {
      const nameEl = document.getElementById('f-name');
      if (!nameEl.value) nameEl.value = meta.title;
    }
    if (meta.description) {
      const descEl = document.getElementById('f-description');
      if (!descEl.value) descEl.value = meta.description;
    }
    if (meta.logo_url)     _setField('f-logo',     meta.logo_url);
    if (meta.og_image_url) _setField('f-og-image', meta.og_image_url);

    _setStatus('情報を取得しました ✓', 'ok');
  } catch (err) {
    _setStatus('自動取得できませんでした。手動で入力してください', 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '情報を取得';
  }
}

async function _handleSave() {
  const name = document.getElementById('f-name')?.value.trim();
  const url  = document.getElementById('f-url')?.value.trim();

  if (!name || !url) {
    showToast('ブランド名とURLを入力してください', 'error');
    return;
  }

  const payload = {
    name,
    url,
    description:  document.getElementById('f-description')?.value.trim() || null,
    style:        document.getElementById('f-style')?.value.trim()       || null,
    price_range:  document.getElementById('f-price')?.value              || null,
    logo_url:     document.getElementById('f-logo')?.value.trim()        || null,
    og_image_url: document.getElementById('f-og-image')?.value.trim()    || null,
  };

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中…';

  try {
    const result = _modalMode === 'edit'
      ? await API.put(`/api/brands/${_editingId}`, payload)
      : await API.post('/api/brands', payload);

    closeModal();
    showToast(_modalMode === 'edit' ? 'ブランドを更新しました' : 'ブランドを追加しました');
    if (_onSave) _onSave(result);
  } catch (err) {
    showToast(err.message || '保存に失敗しました', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
  }
}

function _setStatus(msg, type) {
  const el = document.getElementById('fetch-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `fetch-status${type ? ' ' + type : ''}`;
}

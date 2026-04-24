let _genres   = [];
let _countMap = {};

async function _load() {
  const sb   = await getSupabase();
  const user = await getCurrentUser();

  const [{ data: genres, error }, { data: bgs }] = await Promise.all([
    sb.from('genres').select('id, name, sort_order, created_at').eq('user_id', user.id).order('sort_order').order('created_at'),
    sb.from('brand_genres').select('genre_id'),
  ]);

  if (error) { showToast(error.message, 'error'); return; }

  _genres = genres || [];
  _countMap = {};
  (bgs || []).forEach(bg => { _countMap[bg.genre_id] = (_countMap[bg.genre_id] || 0) + 1; });

  _render();
}

function _render() {
  const list = document.getElementById('genre-list');
  if (!list) return;

  if (!_genres.length) {
    list.innerHTML = '<div class="genre-empty">ジャンルがありません。上のフォームから追加してください。</div>';
    return;
  }

  list.innerHTML = '';
  _genres.forEach(g => list.appendChild(_buildRow(g)));
}

function _buildRow(g) {
  const item = document.createElement('div');
  item.className = 'genre-item';
  item.dataset.id = g.id;

  const count = _countMap[g.id] || 0;
  item.innerHTML = `
    <span class="genre-item__name">${escHtml(g.name)}</span>
    <span class="genre-item__count">${count}ブランド</span>
    <div class="genre-item__btns">
      <button class="btn btn-ghost btn-sm js-edit">編集</button>
      <button class="btn btn-danger-ghost btn-sm js-del">削除</button>
    </div>`;

  item.querySelector('.js-edit').addEventListener('click', () => _startEdit(g.id, item));
  item.querySelector('.js-del').addEventListener('click', () => _deleteGenre(g.id, g.name));
  return item;
}

function _startEdit(id, item) {
  const genre = _genres.find(g => g.id === id);
  if (!genre) return;

  item.innerHTML = `
    <input class="genre-item__input" type="text" value="${escHtml(genre.name)}" maxlength="40">
    <div class="genre-item__btns">
      <button class="btn btn-primary btn-sm js-save">保存</button>
      <button class="btn btn-ghost btn-sm js-cancel">キャンセル</button>
    </div>`;

  const input = item.querySelector('input');
  input.focus();
  input.select();

  item.querySelector('.js-save').addEventListener('click', () => _saveEdit(id, input.value.trim()));
  item.querySelector('.js-cancel').addEventListener('click', _render);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') _saveEdit(id, input.value.trim());
    if (e.key === 'Escape') _render();
  });
}

async function _saveEdit(id, name) {
  if (!name) { showToast('名前を入力してください', 'error'); return; }
  const sb = await getSupabase();
  const { error } = await sb.from('genres').update({ name }).eq('id', id);
  if (error) { showToast(error.message, 'error'); return; }
  const g = _genres.find(x => x.id === id);
  if (g) g.name = name;
  showToast('更新しました');
  _render();
}

async function _deleteGenre(id, name) {
  const count = _countMap[id] || 0;
  const msg = count
    ? `「${name}」を削除しますか？\n\n${count}件のブランドからも削除されます。`
    : `「${name}」を削除しますか？`;
  if (!confirm(msg)) return;

  const sb = await getSupabase();
  const { error } = await sb.from('genres').delete().eq('id', id);
  if (error) { showToast(error.message, 'error'); return; }
  _genres = _genres.filter(g => g.id !== id);
  delete _countMap[id];
  showToast('削除しました');
  _render();
}

async function _addGenre(name) {
  if (!name) { showToast('ジャンル名を入力してください', 'error'); return; }
  if (_genres.some(g => g.name === name)) { showToast('同じ名前のジャンルが既にあります', 'error'); return; }

  const sb   = await getSupabase();
  const user = await getCurrentUser();
  const sortOrder = _genres.length > 0 ? Math.max(..._genres.map(g => g.sort_order)) + 1 : 0;

  const { data, error } = await sb.from('genres')
    .insert({ name, user_id: user.id, sort_order: sortOrder })
    .select('id, name, sort_order, created_at')
    .single();

  if (error) { showToast(error.message, 'error'); return; }
  _genres.push(data);
  showToast('追加しました');
  _render();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email || '';
  document.getElementById('logout-btn')?.addEventListener('click', signOut);

  const input  = document.getElementById('genre-input');
  const addBtn = document.getElementById('genre-add-btn');

  addBtn?.addEventListener('click', () => {
    const val = input?.value.trim() || '';
    if (!val) { input?.focus(); return; }
    _addGenre(val).then(() => { if (input) input.value = ''; });
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addBtn?.click();
  });

  _load();
});

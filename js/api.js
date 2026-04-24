const API = {
  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const e = new Error(err.error || 'Request failed');
      e.status = res.status;
      throw e;
    }
    if (res.status === 204) return null;
    return res.json();
  },
  get: (path)        => API.request('GET',    path),
  post: (path, body) => API.request('POST',   path, body),
  put:  (path, body) => API.request('PUT',    path, body),
  del:  (path)       => API.request('DELETE', path),
};

function parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

function showToast(message, type = '', action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return null;
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
  if (action) {
    const span = document.createElement('span');
    span.textContent = message;
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.callback(); toast.remove(); });
    toast.append(span, btn);
  } else {
    toast.textContent = message;
  }
  container.appendChild(toast);
  const timer = setTimeout(() => toast.remove(), 3500);
  return () => { clearTimeout(timer); toast.remove(); };
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


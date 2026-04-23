let _brands = [];

async function loadBrands() {
  const grid     = document.getElementById('brands-grid');
  const empty    = document.getElementById('empty-state');
  const title    = document.getElementById('page-title');

  grid.innerHTML = Array(4).fill(
    '<div class="skeleton" style="height:220px;border-radius:10px"></div>'
  ).join('');

  try {
    _brands = await API.get('/api/brands');
  } catch {
    grid.innerHTML = '';
    showToast('Failed to load brands', 'error');
    return;
  }

  grid.innerHTML = '';
  title.textContent = `Brands${_brands.length ? ` (${_brands.length})` : ''}`;

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
      <button class="btn btn-ghost btn-sm js-edit"   data-id="${brand.id}">Edit</button>
      <button class="btn btn-danger-ghost btn-sm js-del" data-id="${brand.id}">Delete</button>
    </div>
  `;

  // Image fallback
  const img = article.querySelector('img');
  if (img) {
    img.addEventListener('error', () => {
      img.parentElement.innerHTML = `<div class="brand-card__placeholder">${initial}</div>`;
    });
  }

  article.querySelectorAll('.js-nav').forEach(el =>
    el.addEventListener('click', () => { window.location.href = `/brand?id=${brand.id}`; })
  );

  article.querySelector('.js-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = _brands.find(x => x.id === brand.id);
    openModal('edit', b, (updated) => {
      const i = _brands.findIndex(x => x.id === updated.id);
      if (i !== -1) _brands[i] = updated;
      loadBrands();
    });
  });

  article.querySelector('.js-del').addEventListener('click', (e) => {
    e.stopPropagation();
    _confirmDelete(brand.id, brand.name);
  });

  return article;
}

async function _confirmDelete(id, name) {
  if (!confirm(`Delete "${name}"?\n\nThis will remove all saved products for this brand.`)) return;
  try {
    await API.del(`/api/brands/${id}`);
    showToast('Brand deleted');
    loadBrands();
  } catch {
    showToast('Failed to delete brand', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBrands();

  document.getElementById('add-brand-btn').addEventListener('click', () => {
    openModal('add', null, () => loadBrands());
  });
  document.getElementById('empty-add-btn')?.addEventListener('click', () => {
    openModal('add', null, () => loadBrands());
  });
});

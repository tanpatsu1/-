const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Vercel automatically adds Authorization: Bearer $CRON_SECRET for cron invocations
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }
  const secret = (req.headers['authorization'] ?? '').replace('Bearer ', '');
  if (secret !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data: brands, error: brandsErr } = await supabase
    .from('brands').select('id, url');
  if (brandsErr) return res.status(500).json({ error: brandsErr.message });

  const summary = { synced: 0, added: 0, errors: [] };

  // Process 5 brands concurrently to stay within function time limit
  const BATCH = 5;
  for (let i = 0; i < brands.length; i += BATCH) {
    const chunk = brands.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      chunk.map(b => _syncBrand(b.id, b.url))
    );
    settled.forEach((r, j) => {
      if (r.status === 'fulfilled') {
        summary.synced++;
        summary.added += r.value.added;
      } else {
        summary.errors.push({ brand_id: chunk[j].id, message: String(r.reason?.message ?? r.reason) });
      }
    });
  }

  await supabase.from('cron_log').insert({
    brands_synced:  summary.synced,
    products_added: summary.added,
    errors:         summary.errors,
  });

  return res.status(200).json(summary);
};

async function _syncBrand(brandId, brandUrl) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);

  let html;
  try {
    const resp = await fetch(brandUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  const products = _extract(html, brandUrl);
  if (products.length === 0) return { added: 0 };

  const rows = products.map(p => ({ ...p, brand_id: brandId }));

  const { error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'brand_id,product_url' });
  if (error) throw new Error(error.message);

  // Count products first seen today
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .gte('first_seen_at', today.toISOString());

  return { added: count ?? 0 };
}

function _extract(html, baseUrl) {
  const $ = cheerio.load(html);
  const origin = new URL(baseUrl).origin;

  const resolve = (u) => {
    if (!u) return null;
    try { return new URL(u, origin).href; } catch { return null; }
  };

  // ── Tier 1: JSON-LD ──
  const products = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try { data = JSON.parse($(el).text()); } catch { return; }

    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (item['@type'] === 'Product') {
        const p = _fromJsonLd(item, origin);
        if (p) products.push(p);
      } else if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
        for (const li of item.itemListElement) {
          const prod = li.item ?? li;
          if (prod['@type'] === 'Product') {
            const p = _fromJsonLd(prod, origin);
            if (p) products.push(p);
          }
        }
      }
    }
  });
  if (products.length > 0) return products.slice(0, 50);

  // ── Tier 2: OG image as single product ──
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogTitle = $('meta[property="og:title"]').attr('content') ?? $('title').text();
  if (ogImage && ogTitle) {
    const resolved = resolve(ogImage);
    if (resolved) return [{ name: ogTitle.trim().slice(0, 255), image_url: resolved, product_url: baseUrl, price: null }];
  }

  // ── Tier 3: Heuristic link + adjacent image ──
  const candidates = [];
  const PATTERNS = [/\/product[s]?\//i, /\/shop\//i, /\/item[s]?\//i, /\/collection[s]?\//i];

  $('a[href]').each((_, el) => {
    if (candidates.length >= 20) return false;
    const href = $(el).attr('href');
    if (!href || !PATTERNS.some(p => p.test(href))) return;
    const abs = resolve(href);
    if (!abs) return;

    const $p  = $(el).parent();
    const src = $p.find('img[src]').first().attr('src')
      ?? $(el).find('img[src]').first().attr('src');
    const name = $(el).text().trim() || $(el).attr('title') || '';
    if (!name && !src) return;

    candidates.push({
      name:        (name || 'Product').slice(0, 255),
      image_url:   resolve(src),
      product_url: abs,
      price:       null,
    });
  });

  return candidates;
}

function _fromJsonLd(item, origin) {
  const resolve = (u) => {
    if (!u) return null;
    try { return new URL(u, origin).href; } catch { return null; }
  };

  let image = null;
  if (typeof item.image === 'string')       image = item.image;
  else if (Array.isArray(item.image))       image = item.image[0];
  else if (item.image?.url)                 image = item.image.url;
  else if (item.image?.['@id'])             image = item.image['@id'];

  let price = null;
  if (item.offers) {
    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
    if (offer?.price != null) {
      price = offer.priceCurrency
        ? `${offer.priceCurrency} ${offer.price}`
        : String(offer.price);
    }
  }

  const url = resolve(item.url ?? item['@id']);
  if (!url) return null;

  return {
    name:        (item.name || 'Product').slice(0, 255),
    image_url:   resolve(image),
    product_url: url,
    price,
  };
}

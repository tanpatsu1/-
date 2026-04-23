const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const segments = req.query.params ?? [];
  const [id, sub] = segments;

  if (!id) {
    return handleBrandList(req, res);
  }
  if (sub === 'products') {
    return handleProducts(req, res, id);
  }
  return handleSingleBrand(req, res, id);
};

// GET /api/brands  POST /api/brands
async function handleBrandList(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, url, logo_url, og_image_url, description, style, price_range } = req.body ?? {};
    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

    const { data, error } = await supabase
      .from('brands')
      .insert({ name, url, logo_url, og_image_url, description, style, price_range })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/brands/:id  PUT /api/brands/:id  DELETE /api/brands/:id
async function handleSingleBrand(req, res, id) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brands').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'not found' });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const body = req.body ?? {};
    const allowed = ['name', 'url', 'logo_url', 'og_image_url', 'description', 'style', 'price_range'];
    const update = Object.fromEntries(
      allowed.filter(k => k in body).map(k => [k, body[k]])
    );
    const { data, error } = await supabase
      .from('brands').update(update).eq('id', id).select().single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'not found' });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/brands/:id/products
async function handleProducts(req, res, brandId) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0,   0);

  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('brand_id', brandId)
    .order('first_seen_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ products: data, total: count });
}

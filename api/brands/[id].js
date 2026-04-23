const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brands').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'ブランドが見つかりません' });
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
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'ブランドが見つかりません' });
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
};

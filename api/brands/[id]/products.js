const { createClient } = require('@supabase/supabase-js');

function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を Vercel に設定してください');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabase;
  try {
    supabase = getClient();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { id } = req.query;
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0,   0);

  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('brand_id', id)
    .order('first_seen_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ products: data, total: count });
};

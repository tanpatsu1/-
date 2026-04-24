const { createClient } = require('@supabase/supabase-js');

function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を Vercel に設定してください');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  let supabase;
  try {
    supabase = getClient();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, url, logo_url, og_image_url, description, style, price_range } = req.body ?? {};
    if (!name || !url) return res.status(400).json({ error: 'ブランド名とURLは必須です' });
    const { data, error } = await supabase
      .from('brands')
      .insert({ name, url, logo_url, og_image_url, description, style, price_range })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

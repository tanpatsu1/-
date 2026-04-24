module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  let origin, hostname;
  try {
    const parsed = new URL(url);
    origin   = parsed.origin;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  const blocked = ['localhost','127.0.0.1','0.0.0.0','::1'];
  if (
    blocked.includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')      ||
    hostname.startsWith('172.')     ||
    hostname === '169.254.169.254'
  ) {
    return res.status(400).json({ error: 'invalid url' });
  }

  let html;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    html = await resp.text();
  } catch (err) {
    return res.status(422).json({ error: 'failed to fetch url', details: err.message });
  }

  const meta = _parse(html, origin);
  return res.status(200).json(meta);
};

function _get(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null;
}

function _resolve(u, origin) {
  if (!u) return null;
  try { return new URL(u, origin).href; } catch { return null; }
}

function _parse(html, origin) {
  // og: tags — two attribute orderings
  const ogTitle = _get(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,300})["']/i)
    ?? _get(html, /<meta[^>]+content=["']([^"']{1,300})["'][^>]+property=["']og:title["']/i);
  const ogDesc = _get(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,500})["']/i)
    ?? _get(html, /<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:description["']/i);
  const ogImage = _get(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? _get(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  const pageTitle = _get(html, /<title[^>]*>([^<]{1,200})<\/title>/i);

  // favicon: prefer apple-touch-icon then regular icon
  const favicon = _get(html, /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
    ?? _get(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i)
    ?? _get(html, /<link[^>]+rel=["'][^"']*icon["'][^>]+href=["']([^"']+)["']/i)
    ?? _get(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon["']/i);

  const domain = new URL(origin).hostname.replace(/^www\./, '');

  return {
    title:        ogTitle ?? pageTitle,
    description:  ogDesc,
    logo_url:     _resolve(favicon, origin) ?? `https://logo.clearbit.com/${domain}`,
    og_image_url: _resolve(ogImage, origin),
  };
}

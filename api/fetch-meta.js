const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|::1|fd[\da-f]{2}:)/i;

function _isPrivateHost(hostname) {
  return PRIVATE_HOST.test(hostname)
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal');
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'only http/https urls are allowed' });
  }

  if (_isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'url not allowed' });
  }

  const origin = parsed.origin;

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

    if (!resp.ok) {
      return res.status(422).json({ error: `url returned ${resp.status}` });
    }

    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      return res.status(422).json({ error: 'url does not serve html' });
    }

    const raw = await resp.text();
    html = raw.slice(0, 1_000_000);
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

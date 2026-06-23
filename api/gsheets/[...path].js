export default async function handler(req, res) {
  // Reconstituer le chemin Google Docs à partir des segments
  const segments = req.query.path || [];
  const path = Array.isArray(segments) ? segments.join('/') : segments;
  const qs = new URLSearchParams(req.query);
  qs.delete('path');

  const url = `https://docs.google.com/${path}${qs.toString() ? '?' + qs.toString() : ''}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const contentType = upstream.headers.get('content-type') || 'text/plain';
    const body = await upstream.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

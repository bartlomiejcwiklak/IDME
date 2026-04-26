export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ── CORS preflight ────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // ── Spotify playlist scraper ──────────────────────────────────────────────
    // GET /spotify/:playlistId  →  returns the embed page's initial-state JSON
    if (url.pathname.startsWith('/spotify/')) {
      const playlistId = url.pathname.split('/')[2];
      if (!playlistId) {
        return new Response(JSON.stringify({ error: 'Missing playlist ID' }), {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        });
      }

      try {
        const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
        const resp = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        const html = await resp.text();

        // Spotify embeds ship the full track list in a base64-encoded JSON blob
        const match = html.match(/<script id="initial-state" type="text\/plain">([^<]+)<\/script>/);

        if (!match) {
          return new Response(
            JSON.stringify({ error: 'Could not find track data in embed page' }),
            { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
          );
        }

        // Decode base64 → UTF-8 JSON
        const jsonStr = decodeURIComponent(
          Array.from(atob(match[1]))
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
        );

        return new Response(jsonStr, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        });
      }
    }

    // ── iTunes / Apple RSS proxy ──────────────────────────────────────────────
    const allowed = ['/search', '/rss/', '/api/v2/'];
    if (!allowed.some((p) => url.pathname.startsWith(p))) {
      return new Response('Not found', { status: 404 });
    }

    // /search → iTunes, /api/v2/ → nowe Apple RSS API
    let targetUrl;
    if (url.pathname.startsWith('/api/v2/')) {
      targetUrl = `https://rss.applemarketingtools.com${url.pathname}${url.search}`;
    } else {
      targetUrl = `https://itunes.apple.com${url.pathname}${url.search}`;
    }

    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
};

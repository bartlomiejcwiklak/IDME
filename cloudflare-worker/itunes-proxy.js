export default {
  async fetch(request, env) {
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
    // GET /spotify/:playlistId  →  returns JSON with tracks array
    // Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET Worker secrets.
    if (url.pathname.startsWith('/spotify/')) {
      const playlistId = url.pathname.split('/')[2];
      if (!playlistId) {
        return new Response(JSON.stringify({ error: 'Missing playlist ID' }), {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        });
      }

      try {
        // 1. Get access token via Client Credentials flow (no user login needed)
        const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
          },
          body: 'grant_type=client_credentials',
        });

        if (!tokenResp.ok) {
          return new Response(JSON.stringify({ error: 'Spotify auth failed — check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET secrets' }), {
            status: 502,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          });
        }

        const { access_token } = await tokenResp.json();

        // 2. Fetch up to 100 tracks from the playlist
        const tracksResp = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(name,artists(name)))`,
          { headers: { 'Authorization': `Bearer ${access_token}` } }
        );

        if (!tracksResp.ok) {
          return new Response(JSON.stringify({ error: 'Playlist not found or is private' }), {
            status: tracksResp.status,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          });
        }

        const data = await tracksResp.json();
        return new Response(JSON.stringify(data), {
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

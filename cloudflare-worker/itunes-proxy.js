export default {
  async fetch(request, env, ctx) {
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

    // ── Spotify playlist ──────────────────────────────────────────────────────
    // GET /spotify/:playlistId
    //
    // Zamiast oficjalnego Spotify API (które wymaga Extended Quota Mode od 2024
    // i blokuje client_credentials przez 403), używamy nieoficjalnego endpointu
    // embed.spotify.com — zwraca dane publicznych playlist bez żadnego tokena.
    //
    // Format odpowiedzi celowo naśladuje strukturę oficjalnego API:
    //   { tracks: { items: [{ track: { name, artists: [{name}] } }] } }
    // żeby frontend (songs.ts) nie wymagał żadnych zmian.

    if (url.pathname.startsWith('/spotify/')) {
      const playlistId = url.pathname.split('/')[2];
      if (!playlistId) {
        return new Response(JSON.stringify({ error: 'Missing playlist ID' }), {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        });
      }

      // Sprawdź cache w KV (jeśli binding SPOTIFY_KV jest skonfigurowany)
      if (env.SPOTIFY_KV) {
        try {
          const cached = await env.SPOTIFY_KV.get(`playlist:${playlistId}`);
          if (cached) {
            console.log('[Spotify] Serving from KV cache:', playlistId);
            return new Response(cached, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'X-Cache': 'HIT',
              },
            });
          }
        } catch (e) {
          console.warn('[Spotify] KV read failed:', e.message);
        }
      }

      try {
        // Pobierz stronę embed Spotify — zawiera <script id="initial-state"> z JSON
        const embedUrl = `https://open.spotify.com/playlist/${playlistId}`;
        const resp = await fetch(embedUrl, {
          headers: {
            // Udajemy przeglądarkę, inaczej Spotify może zwrócić uproszczony HTML
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!resp.ok) {
          console.error('[Spotify] Embed fetch failed:', resp.status);
          return new Response(
            JSON.stringify({ error: `Spotify returned ${resp.status}. Make sure the playlist is public.` }),
            { status: resp.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
          );
        }

        const html = await resp.text();

        // Wyciągnij JSON z tagu <script id="initial-state">
        const match = html.match(/<script id="initial-state" type="text\/plain">([^<]+)<\/script>/);
        if (!match) {
          // Fallback: próbuj API z tokenem tylko jeśli są credentiale
          if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
            return await fetchViaApi(playlistId, env, ctx);
          }
          console.error('[Spotify] Could not find initial-state in embed HTML');
          return new Response(
            JSON.stringify({ error: 'Could not parse Spotify page. Playlist may be private.' }),
            { status: 422, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
          );
        }

        // initial-state jest zakodowany w base64
        const decoded = atob(match[1]);
        const state = JSON.parse(decoded);

        // Nawiguj po strukturze embed JSON do listy tracków
        // Struktura: state.entities.items -> szukamy typu "playlist"
        // albo state.data.content.items (zależy od wersji strony)
        let trackItems = [];

        // Próba 1: nowy format embed (2024+)
        const entities = state?.entities?.items;
        if (entities) {
          for (const key of Object.keys(entities)) {
            const entity = entities[key];
            if (entity?.type === 'track' && entity?.name && entity?.artists) {
              trackItems.push({
                track: {
                  name: entity.name,
                  artists: entity.artists.items?.map(a => ({ name: a.profile?.name || a.name })) || [],
                }
              });
            }
          }
        }

        // Próba 2: starszy format
        if (trackItems.length === 0) {
          const content = state?.data?.content;
          const items = content?.items || state?.playlist?.tracks?.items || [];
          trackItems = items.map(item => {
            const t = item.track || item.itemV2?.data || item;
            const artists = t.artists?.items || t.artists || [];
            return {
              track: {
                name: t.name,
                artists: artists.map(a => ({ name: a.profile?.name || a.name || (typeof a === 'string' ? a : '') })),
              }
            };
          }).filter(item => item.track.name);
        }

        if (trackItems.length === 0) {
          console.warn('[Spotify] Parsed state but found 0 tracks. Trying API fallback.');
          if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
            return await fetchViaApi(playlistId, env, ctx);
          }
          return new Response(
            JSON.stringify({ error: 'No tracks found. Playlist may be empty or private.' }),
            { status: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Spotify] Embed parsed OK — ${trackItems.length} tracks for playlist ${playlistId}`);

        const responseBody = JSON.stringify({ tracks: { items: trackItems } });

        // Zapisz w KV cache na 5 minut
        if (env.SPOTIFY_KV) {
          ctx.waitUntil(
            env.SPOTIFY_KV.put(`playlist:${playlistId}`, responseBody, { expirationTtl: 300 })
          );
        }

        return new Response(responseBody, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        });

      } catch (err) {
        console.error('[Spotify] Unexpected error:', err);
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

// ── Fallback: oficjalne Spotify API ──────────────────────────────────────────
// Używane tylko jeśli scraping embedu nie zadziała i są ustawione credentiale.
// Może zwrócić 403 jeśli aplikacja nie ma Extended Quota Mode.
async function fetchViaApi(playlistId, env, ctx) {
  try {
    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResp.ok) {
      return new Response(JSON.stringify({ error: 'Spotify API auth failed' }), {
        status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      });
    }

    const { access_token } = await tokenResp.json();

    const playlistResp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!playlistResp.ok) {
      const err = await playlistResp.text();
      console.error('[Spotify API] Playlist error:', playlistResp.status, err);
      return new Response(
        JSON.stringify({ error: `Spotify API ${playlistResp.status}. App may need Extended Quota Mode.`, details: err }),
        { status: playlistResp.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
      );
    }

    const data = await playlistResp.json();
    console.log(`[Spotify API] Got ${data?.tracks?.items?.length} tracks via official API`);

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
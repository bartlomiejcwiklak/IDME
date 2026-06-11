/**
 * Cloudflare Worker — iTunes Search API Proxy
 *
 * This proxies requests to the iTunes Search & RSS APIs server-side,
 * bypassing the iOS Apple Music app's URL interception of itunes.apple.com.
 *
 * It also caches every upstream response. Apple throttles the iTunes Search
 * API hard (~20 requests/min per IP), and all worker traffic exits from
 * shared Cloudflare IPs, so uncached proxying gets 429s very quickly. The
 * game's pool queries are static terms ("popular songs", "top hits", …), so
 * a long cache absorbs almost all of the traffic.
 *
 * Deploy for FREE at: https://workers.cloudflare.com
 * (Free tier: 100,000 requests/day — more than enough)
 *
 * Steps:
 *  1. Go to https://dash.cloudflare.com and sign up (free).
 *  2. Click "Workers & Pages" → "Create" → "Create Worker".
 *  3. Replace the default code with this file's contents.
 *  4. Click "Deploy".
 *  5. Copy the worker URL (e.g. https://idme-proxy.YOUR-SUBDOMAIN.workers.dev)
 *  6. Set VITE_ITUNES_PROXY in your GitHub repo secrets:
 *       Settings → Secrets → Actions → New repository secret
 *       Name: VITE_ITUNES_PROXY
 *       Value: https://idme-proxy.YOUR-SUBDOMAIN.workers.dev
 *  7. Redeploy your GitHub Pages build.
 */

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 500;

// In-memory cache, per isolate. An isolate stays warm on an edge node across
// many requests, so this absorbs repeat queries even on *.workers.dev where
// the Cache API is unavailable. Expired entries are kept until evicted so we
// can serve stale data when Apple throttles us.
const memCache = new Map(); // targetUrl -> { body, expires }

function putMem(targetUrl, body) {
  if (memCache.size >= MAX_ENTRIES) {
    memCache.delete(memCache.keys().next().value); // evict oldest
  }
  memCache.delete(targetUrl); // re-insert at the end of iteration order
  memCache.set(targetUrl, { body, expires: Date.now() + TTL_MS });
}

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=21600', // let browsers cache 6 h too
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only allow the iTunes endpoints we use
    const allowed = ['/search', '/lookup', '/rss/', '/api/v2/'];
    if (!allowed.some((p) => url.pathname.startsWith(p))) {
      return new Response('Not found', { status: 404 });
    }

    // The new RSS API lives on its own host; everything else is itunes.apple.com.
    const host = url.pathname.startsWith('/api/v2/')
      ? 'https://rss.applemarketingtools.com'
      : 'https://itunes.apple.com';
    const targetUrl = `${host}${url.pathname}${url.search}`;

    const hit = memCache.get(targetUrl);
    if (hit && hit.expires > Date.now()) {
      return new Response(hit.body, { status: 200, headers: RESPONSE_HEADERS });
    }

    // Edge cache — shared across isolates, but only available when the worker
    // runs on a custom domain (no-op on *.workers.dev).
    let cache = null;
    const cacheKey = new Request(targetUrl);
    try {
      cache = caches.default;
      const cached = await cache.match(cacheKey);
      if (cached) {
        const body = await cached.text();
        putMem(targetUrl, body);
        return new Response(body, { status: 200, headers: RESPONSE_HEADERS });
      }
    } catch {
      cache = null;
    }

    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await upstream.text();

    if (!upstream.ok) {
      // Apple is throttling or erroring — serve stale data if we have any.
      if (hit) {
        return new Response(hit.body, { status: 200, headers: RESPONSE_HEADERS });
      }
      return new Response(body, {
        status: upstream.status,
        headers: { ...RESPONSE_HEADERS, 'Cache-Control': 'no-store' },
      });
    }

    putMem(targetUrl, body);
    if (cache) {
      ctx.waitUntil(
        cache.put(
          cacheKey,
          new Response(body, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=21600',
            },
          }),
        ),
      );
    }

    return new Response(body, { status: 200, headers: RESPONSE_HEADERS });
  },
};

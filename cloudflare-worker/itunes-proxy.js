/**
 * Cloudflare Worker — iTunes Search API Proxy + Cache
 *
 * Proxies the iTunes Search & RSS APIs server-side. This serves two purposes:
 *
 *  1. Bypasses the iOS Apple Music app's interception of itunes.apple.com
 *     (which redirects fetch/script requests to the musics:// deep-link scheme).
 *  2. Caches every upstream response in Workers KV so we almost never hit Apple.
 *
 * Why the cache matters: Apple rate-limits the Search API *by IP*. A Worker
 * exits through shared Cloudflare datacenter IPs carrying traffic from ALL
 * visitors, so without caching it trips Apple's limit within seconds and gets
 * 429 / 403 responses. The game queries a small set of static terms
 * ("popular songs", "top hits", …), so a shared, durable cache means Apple is
 * hit only a handful of times per day regardless of how many people play.
 *
 * KV is REQUIRED for this to work on a *.workers.dev URL (the edge Cache API
 * is a no-op there). One-time setup:
 *
 *   1. dash.cloudflare.com → "Workers & Pages" → "KV" → "Create a namespace".
 *      Name it e.g. "idme-itunes-cache". (Free tier: 100k reads + 1k writes/day.)
 *   2. Open your worker → "Settings" → "Variables and Bindings" → "Add" →
 *      "KV Namespace". Variable name: IDME_CACHE. Namespace: the one you made.
 *   3. Paste this file as the worker code and "Deploy".
 *
 * If IDME_CACHE is not bound, the worker still runs but only caches in-memory
 * per-isolate, which does NOT survive cold starts — you will keep seeing 429s.
 *
 * Free tier: 100,000 requests/day — far more than enough.
 */

const FRESH_MS = 24 * 60 * 60 * 1000;       // serve from cache without revalidating
const STALE_MS = 7 * 24 * 60 * 60 * 1000;   // keep around to serve when Apple errors
const KV_TTL_S = Math.floor(STALE_MS / 1000);

const MAX_MEM_ENTRIES = 300;
// L1 in-isolate cache. Survives only while the isolate stays warm, but spares
// KV reads on hot paths. Map preserves insertion order → cheap LRU eviction.
const memCache = new Map(); // targetUrl -> { body, freshUntil, staleUntil }

function memGet(key) {
  return memCache.get(key) ?? null;
}
function memPut(key, entry) {
  if (memCache.size >= MAX_MEM_ENTRIES) {
    memCache.delete(memCache.keys().next().value);
  }
  memCache.delete(key);
  memCache.set(key, entry);
}

function jsonResponse(body, { revalidate = false } = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      // Browsers may reuse for an hour; the worker/KV holds the longer cache.
      'Cache-Control': revalidate ? 'no-store' : 'public, max-age=3600',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only allow the iTunes endpoints we use
    const allowed = ['/search', '/lookup', '/rss/', '/api/v2/'];
    if (!allowed.some((p) => url.pathname.startsWith(p))) {
      return new Response('Not found', { status: 404 });
    }

    // The new RSS charts API lives on its own host; everything else on itunes.
    const host = url.pathname.startsWith('/api/v2/')
      ? 'https://rss.applemarketingtools.com'
      : 'https://itunes.apple.com';
    const targetUrl = `${host}${url.pathname}${url.search}`;
    const now = Date.now();
    const kv = env && env.IDME_CACHE ? env.IDME_CACHE : null;

    // ── L1: in-isolate ────────────────────────────────────────────────────────
    const mem = memGet(targetUrl);
    if (mem && mem.freshUntil > now) {
      return jsonResponse(mem.body);
    }

    // ── L2: KV (durable, shared across all isolates worldwide) ─────────────────
    let kvEntry = null;
    if (kv) {
      const stored = await kv.get(targetUrl, { type: 'json' }).catch(() => null);
      if (stored && typeof stored.body === 'string') {
        kvEntry = stored;
        memPut(targetUrl, {
          body: stored.body,
          freshUntil: stored.freshUntil,
          staleUntil: stored.staleUntil,
        });
        if (stored.freshUntil > now) {
          return jsonResponse(stored.body);
        }
      }
    }

    // ── Cache miss or stale: go to Apple ───────────────────────────────────────
    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/123.0 Safari/537.36',
          Accept: 'application/json',
        },
      });
    } catch {
      upstream = null;
    }

    if (upstream && upstream.ok) {
      const body = await upstream.text();
      const entry = { body, freshUntil: now + FRESH_MS, staleUntil: now + STALE_MS };
      memPut(targetUrl, entry);
      if (kv) {
        ctx.waitUntil(
          kv.put(targetUrl, JSON.stringify(entry), { expirationTtl: KV_TTL_S }).catch(() => {}),
        );
      }
      return jsonResponse(body);
    }

    // ── Apple errored (429/403/5xx) — serve stale rather than failing ──────────
    const stale = mem ?? kvEntry;
    if (stale && stale.staleUntil > now) {
      return jsonResponse(stale.body);
    }

    const status = upstream ? upstream.status : 502;
    const body = upstream ? await upstream.text() : 'Upstream fetch failed';
    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  },
};

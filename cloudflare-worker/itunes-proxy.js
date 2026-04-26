/**
 * Cloudflare Worker — iTunes Search API Proxy
 *
 * This proxies requests to the iTunes Search & RSS APIs server-side,
 * bypassing the iOS Apple Music app's URL interception of itunes.apple.com.
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

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only allow the iTunes endpoints we use
    const allowed = ['/search', '/lookup', '/rss/', '/api/v2/'];
    if (!allowed.some((p) => url.pathname.startsWith(p))) {
      return new Response('Not found', { status: 404 });
    }

    const targetUrl = `https://itunes.apple.com${url.pathname}${url.search}`;

    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // cache 5 min on edge
      },
    });
  },
};

/**
 * iTunes Search / Lookup / RSS API client.
 *
 * Routing: every request goes straight from the browser to Apple first. Apple
 * rate-limits *per IP* (~20 req/min), and the visitor's own IP has a fresh
 * budget, while the Cloudflare Worker exits through shared datacenter IPs that
 * Apple throttles almost permanently (uncached terms come back 429).
 *
 * The Worker (VITE_ITUNES_PROXY, see cloudflare-worker/itunes-proxy.js) is kept
 * as a fallback for when the direct call fails: on iOS with the Apple Music
 * app installed the OS hijacks requests to itunes.apple.com and the fetch
 * errors out, and the Worker's KV cache can still answer common pool terms.
 * The RSS charts feed has no CORS headers, so browsers always use the Worker
 * for that one.
 */

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string; // 30-second preview — always present after filtering
  artworkUrl100: string;
  primaryGenreName: string;
  releaseDate?: string;
}

export interface RssTrack {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl100: string;
  primaryGenreName: string;
  releaseDate: string;
}

// ─── Transport ────────────────────────────────────────────────────────────────

// Normalise the proxy URL: the deploy secret may be set without a scheme or
// with a trailing slash. `env` is undefined when scripts/generate-static-pools.mjs
// runs this module under Node, hence the optional chaining.
const rawProxy = (import.meta.env?.VITE_ITUNES_PROXY as string | undefined)?.trim();
const PROXY = rawProxy
  ? (rawProxy.startsWith('http') ? rawProxy : `https://${rawProxy}`).replace(/\/+$/, '')
  : null;

const ITUNES_HOST = 'https://itunes.apple.com';
const RSS_HOST = 'https://rss.marketingtools.apple.com';
const DIRECT_TIMEOUT_MS = 8000;

// When the direct route fails at the network level (iOS interception, blocked
// domain) skip it for a while instead of paying the failure on every request.
const DIRECT_COOLDOWN_MS = 5 * 60 * 1000;
let directBlockedUntil = 0;

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** fetch() with a timeout that also honours an external abort signal. */
async function fetchWithTimeout(url: string, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    // Surface our own timeout as a network error, not as a user abort
    if (isAbortError(e) && !signal?.aborted) throw new TypeError(`Request timed out: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** One short retry on 429/5xx; callers have fallbacks, so don't stall them. */
async function fetchWithRetry(url: string, retries: number, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchWithTimeout(url, DIRECT_TIMEOUT_MS, signal);
    const retryable = res.status === 429 || res.status >= 500;
    if (res.ok || !retryable || attempt >= retries) return res;
    const delay = 600 * 2 ** attempt + Math.random() * 300;
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  retries?: number;
}

/**
 * GET an Apple endpoint and parse JSON. `path` is the part after the host,
 * e.g. `/search?term=…` or `/api/v2/us/music/…` — the Worker mirrors both.
 * `proxyOnly` is for endpoints without CORS headers (the RSS feed), which a
 * browser can only reach through the Worker.
 */
async function appleGet<T>(
  host: string,
  path: string,
  { signal, retries = 1, proxyOnly = false }: RequestOptions & { proxyOnly?: boolean } = {},
): Promise<T> {
  let lastError: unknown = null;

  if (!(proxyOnly && PROXY) && Date.now() >= directBlockedUntil) {
    try {
      const res = await fetchWithRetry(`${host}${path}`, PROXY ? 0 : retries, signal);
      if (res.ok) return (await res.json()) as T;
      lastError = new Error(`Apple API error ${res.status}`);
    } catch (e) {
      if (isAbortError(e)) throw e;
      lastError = e;
      if (PROXY) directBlockedUntil = Date.now() + DIRECT_COOLDOWN_MS;
    }
  }

  if (!PROXY) throw lastError ?? new Error('Apple API unavailable');

  const res = await fetchWithRetry(`${PROXY}${path}`, retries, signal);
  if (!res.ok) throw new Error(`Apple API error ${res.status} (proxy)`);
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  return qs.toString();
}

function isPlayableTrack(t: any): t is ItunesTrack {
  return !!t && !!t.trackId && !!t.trackName && !!t.artistName && !!t.previewUrl;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchOptions extends RequestOptions {
  limit?: number;
  country?: string;
  attribute?: string;
}

/** Search songs and return only tracks that have a preview URL. */
export async function searchItunes(term: string, options: SearchOptions = {}): Promise<ItunesTrack[]> {
  const { limit = 8, country = 'us', attribute, ...req } = options;
  if (!term.trim()) return [];
  // Ask for extra results: some come back without a preview and get dropped.
  const fetchLimit = Math.min(limit * 2, 200);
  const path = `/search?${query({ term, entity: 'song', media: 'music', limit: fetchLimit, country, attribute })}`;
  const data = await appleGet<{ results?: unknown[] }>(ITUNES_HOST, path, req);
  return (data.results ?? []).filter(isPlayableTrack).slice(0, limit);
}

// ─── Artist discography ───────────────────────────────────────────────────────

/** Resolve an artist name to their iTunes artistId (exact name match preferred). */
export async function lookupArtistId(artistName: string, country = 'us'): Promise<number | null> {
  const path = `/search?${query({ term: artistName, entity: 'musicArtist', attribute: 'artistTerm', limit: 5, country })}`;
  const data = await appleGet<{ results?: any[] }>(ITUNES_HOST, path).catch(() => null);
  const artists = data?.results ?? [];
  const lower = artistName.toLowerCase();
  const exact = artists.find((a) => (a.artistName ?? '').toLowerCase() === lower);
  return (exact ?? artists[0])?.artistId ?? null;
}

/** All album collectionIds for an artist. */
export async function lookupArtistAlbums(artistId: number, country = 'us'): Promise<number[]> {
  const path = `/lookup?${query({ id: artistId, entity: 'album', limit: 200, country })}`;
  const data = await appleGet<{ results?: any[] }>(ITUNES_HOST, path).catch(() => null);
  return (data?.results ?? [])
    .filter((r) => r.wrapperType === 'collection')
    .map((r) => r.collectionId as number);
}

/**
 * All playable tracks on the given albums. The Lookup API accepts several ids
 * per request (the 200-result limit is shared), so albums are fetched in small
 * batches with bounded concurrency — one request per album trips Apple's
 * per-IP rate limit for any artist with a big catalogue.
 */
export async function lookupAlbumsTracks(albumIds: number[], country = 'us'): Promise<ItunesTrack[]> {
  const BATCH = 6;
  const CONCURRENCY = 3;
  const batches: number[][] = [];
  for (let i = 0; i < albumIds.length; i += BATCH) batches.push(albumIds.slice(i, i + BATCH));

  const tracks: ItunesTrack[] = [];
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const ids = batches[next++];
      const path = `/lookup?${query({ id: ids.join(','), entity: 'song', limit: 200, country })}`;
      const data = await appleGet<{ results?: any[] }>(ITUNES_HOST, path).catch(() => null);
      for (const t of data?.results ?? []) {
        if (t.wrapperType === 'track' && isPlayableTrack(t)) tracks.push(t);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
  return tracks;
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const RSS_CACHE_TTL = 5 * 60 * 1000;
const rssCache = new Map<string, { at: number; tracks: RssTrack[] }>();

export async function fetchTopChartsMeta(
  limit = 100,
  country = 'us',
  genreId?: string,
  type: 'topsongs' | 'newreleases' = 'topsongs',
): Promise<RssTrack[]> {
  const feedType = type === 'topsongs' ? 'most-played' : 'new-music';
  const path = `/api/v2/${country}/music/${feedType}/${limit}/songs.json${genreId ? `?genreId=${genreId}` : ''}`;

  const cached = rssCache.get(path);
  if (cached && Date.now() - cached.at < RSS_CACHE_TTL) return cached.tracks;

  // The RSS feed sends no CORS headers: browsers need the Worker. Without a
  // proxy (local dev, Node scripts) try direct; the caller falls back to search.
  const data = await appleGet<{ feed?: { results?: any[] } }>(RSS_HOST, path, { proxyOnly: true });
  const tracks = (data.feed?.results ?? [])
    .map((entry): RssTrack => ({
      id: Number(entry.id),
      name: entry.name,
      artistName: entry.artistName,
      albumName: entry.albumName || '',
      artworkUrl100: entry.artworkUrl100 || '',
      primaryGenreName: entry.genres?.[0]?.name || '',
      releaseDate: entry.releaseDate || '',
    }))
    .filter((t) => !!t.id);

  rssCache.set(path, { at: Date.now(), tracks });
  return tracks;
}

/**
 * RSS chart entries carry no preview URL. Their ids are iTunes track ids, so
 * resolve them all with a single bulk lookup instead of one search per track.
 */
export async function resolveTracksWithPreview(tracks: RssTrack[], country = 'us'): Promise<ItunesTrack[]> {
  if (tracks.length === 0) return [];
  const path = `/lookup?${query({ id: tracks.map((t) => t.id).join(','), entity: 'song', country })}`;
  const data = await appleGet<{ results?: any[] }>(ITUNES_HOST, path).catch(() => null);
  return (data?.results ?? []).filter(isPlayableTrack);
}

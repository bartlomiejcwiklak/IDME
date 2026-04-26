/**
 * iTunes Search API service.
 *
 * On iOS with the Apple Music app installed, the OS intercepts ALL requests to
 * itunes.apple.com (including fetch AND script tags) and redirects them to the
 * musics:// deep-link scheme, which browsers cannot handle. The only fix is to
 * route requests through a proxy on a different domain.
 *
 * Set VITE_ITUNES_PROXY to your Cloudflare Worker URL (no trailing slash).
 * See cloudflare-worker/itunes-proxy.js for setup instructions.
 */

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string; // 30-second MP3 — always present when we filter
  artworkUrl100: string;
  primaryGenreName: string;
  releaseDate?: string;
}

interface ItunesResponse {
  resultCount: number;
  results: Partial<ItunesTrack>[];
}

// Use the proxy when deployed; fall back to direct for local dev.
// Set VITE_ITUNES_PROXY in your environment / GitHub Actions secret.
// Normalise: ensure the value always starts with https:// so it's never
// treated as a relative path (e.g. if the secret was set without the scheme).
const _rawProxy = (import.meta as any).env?.VITE_ITUNES_PROXY as string | undefined;
const PROXY = _rawProxy
  ? (_rawProxy.startsWith('http') ? _rawProxy : `https://${_rawProxy}`)
  : undefined;
const BASE_SEARCH = PROXY ? `${PROXY}/search` : 'https://itunes.apple.com/search';
const BASE_RSS = PROXY ? `${PROXY}/rss` : 'https://itunes.apple.com';

/** Search iTunes and return tracks that have a preview URL */
export async function searchItunes(
  term: string,
  limit = 8,
  country = 'us',
): Promise<ItunesTrack[]> {
  if (!term.trim()) return [];
  const url = `${BASE_SEARCH}?term=${encodeURIComponent(term)}&entity=song&media=music&limit=${limit * 2}&country=${country}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
  const data: ItunesResponse = await res.json();
  return data.results.filter(
    (t): t is ItunesTrack =>
      !!t.trackId && !!t.trackName && !!t.artistName && !!t.previewUrl,
  ).slice(0, limit);
}

/** Fetch a single track by exact search term (best-effort) */
export async function fetchSingleTrack(
  term: string,
  country = 'us',
): Promise<ItunesTrack | null> {
  const results = await searchItunes(term, 1, country);
  return results[0] ?? null;
}

/**
 * Fetch top charts via RSS feed.
 */
export async function fetchTopCharts(
  limit = 50,
  country = 'us',
  genreId?: string,
  type: 'topsongs' | 'newreleases' = 'topsongs'
): Promise<ItunesTrack[]> {
  const genreSegment = genreId ? `/genre=${genreId}` : '';
  const url = `${BASE_RSS}/${country}/rss/${type}/limit=${limit}${genreSegment}/json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes RSS error: ${res.status}`);

  const data = await res.json();
  const entries = data.feed?.entry || [];

  return entries.map((entry: any): ItunesTrack => {
    const audioLink = entry.link?.find((l: any) => l.attributes?.['im:assetType'] === 'preview');

    return {
      trackId: Number(entry.id.attributes?.['im:id']),
      trackName: entry['im:name'].label,
      artistName: entry['im:artist'].label,
      collectionName: entry['im:collection']?.['im:name']?.label || '',
      previewUrl: audioLink?.attributes?.href || '',
      artworkUrl100: entry['im:image']?.[entry['im:image'].length - 1]?.label || '',
      primaryGenreName: entry.category?.attributes?.label || '',
      releaseDate: entry['im:releaseDate']?.label || '',
    };
  }).filter((t: ItunesTrack) => !!t.previewUrl && !!t.trackId);
}

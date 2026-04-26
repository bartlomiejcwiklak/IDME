/**
 * iTunes Search API service.
 *
 * Uses JSONP instead of fetch for the Search API to work around an iOS bug
 * where the Apple Music app intercepts requests to itunes.apple.com and
 * redirects them to the musics:// custom scheme, which breaks browser fetch.
 * JSONP via <script> tags are not subject to this interception.
 *
 * The RSS feed endpoint is not affected and continues to use fetch.
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

const BASE = 'https://itunes.apple.com/search';

/**
 * Execute an iTunes API request via JSONP.
 * This bypasses iOS's musics:// redirect that breaks fetch.
 */
function jsonp<T>(url: string, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    // Create a unique global callback name
    const callbackName = `_itunesCallback_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('iTunes API request timed out'));
    }, timeoutMs);

    (window as any)[callbackName] = (data: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.src = `${url}&callback=${callbackName}`;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('iTunes API script load failed'));
    };

    document.head.appendChild(script);
  });
}

/** Search iTunes and return tracks that have a preview URL */
export async function searchItunes(
  term: string,
  limit = 8,
  country = 'us',
): Promise<ItunesTrack[]> {
  if (!term.trim()) return [];
  const url = `${BASE}?term=${encodeURIComponent(term)}&entity=song&media=music&limit=${limit * 2}&country=${country}`;
  const data = await jsonp<ItunesResponse>(url);
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
 * The RSS JSON endpoint (itunes.apple.com/{country}/rss/...) is a different
 * server path that is NOT intercepted by the iOS Apple Music app, so we
 * can continue using fetch here.
 */
export async function fetchTopCharts(
  limit = 50,
  country = 'us',
  genreId?: string,
  type: 'topsongs' | 'newreleases' = 'topsongs'
): Promise<ItunesTrack[]> {
  const genreSegment = genreId ? `/genre=${genreId}` : '';
  const url = `https://itunes.apple.com/${country}/rss/${type}/limit=${limit}${genreSegment}/json`;

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

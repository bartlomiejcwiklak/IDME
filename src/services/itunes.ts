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
const BASE_LOOKUP = PROXY ? `${PROXY}/lookup` : 'https://itunes.apple.com/lookup';

/** Resolve an artist name to their iTunes artistId (returns first match) */
export async function lookupArtistId(artistName: string, country = 'us'): Promise<number | null> {
  const url = `${BASE_SEARCH}?term=${encodeURIComponent(artistName)}&entity=musicArtist&attribute=artistTerm&limit=5&country=${country}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const artists: any[] = data.results ?? [];
  // Find the closest name match (case-insensitive exact match first)
  const lower = artistName.toLowerCase();
  const exact = artists.find((a: any) => (a.artistName ?? '').toLowerCase() === lower);
  return (exact ?? artists[0])?.artistId ?? null;
}

/** Fetch all album collectionIds for a given artistId */
export async function lookupArtistAlbums(artistId: number, country = 'us'): Promise<number[]> {
  const url = `${BASE_LOOKUP}?id=${artistId}&entity=album&limit=200&country=${country}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? [])
    .filter((r: any) => r.wrapperType === 'collection')
    .map((r: any) => r.collectionId as number);
}

/** Fetch all tracks with a preview URL for a given album collectionId */
export async function lookupAlbumTracks(albumId: number, country = 'us'): Promise<ItunesTrack[]> {
  const url = `${BASE_LOOKUP}?id=${albumId}&entity=song&limit=200&country=${country}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).filter(
    (t: any): t is ItunesTrack =>
      t.wrapperType === 'track' && !!t.trackId && !!t.trackName && !!t.artistName && !!t.previewUrl,
  );
}


/** Search iTunes and return tracks that have a preview URL */
export async function searchItunes(
  term: string,
  limit = 8,
  country = 'us',
  attribute?: string
): Promise<ItunesTrack[]> {
  if (!term.trim()) return [];
  const attrSegment = attribute ? `&attribute=${attribute}` : '';
  const fetchLimit = Math.min(limit * 2, 200);
  const url = `${BASE_SEARCH}?term=${encodeURIComponent(term)}&entity=song&media=music&limit=${fetchLimit}&country=${country}${attrSegment}`;
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

export interface RssTrack {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl100: string;
  primaryGenreName: string;
  releaseDate: string;
}

let rssCache: RssTrack[] = [];
let rssCacheTime = 0;
const RSS_CACHE_TTL = 5 * 60 * 1000;

export async function fetchTopChartsMeta(
  limit = 100,
  country = 'us',
  genreId?: string,
  type: 'topsongs' | 'newreleases' = 'topsongs'
): Promise<RssTrack[]> {
  if (rssCache.length > 0 && Date.now() - rssCacheTime < RSS_CACHE_TTL) {
    return rssCache;
  }

  const feedType = type === 'topsongs' ? 'most-played' : 'new-music';
  const genreSegment = genreId ? `?genreId=${genreId}` : '';

  // Nowe Apple RSS API — zupełnie inna struktura URL
  const newApiUrl = `https://rss.applemarketingtools.com/api/v2/${country}/music/${feedType}/${limit}/songs.json${genreSegment}`;

  // Przez proxy jeśli ustawione (dla iOS), bezpośrednio lokalnie
  const url = PROXY
    ? `${PROXY}/api/v2/${country}/music/${feedType}/${limit}/songs.json${genreSegment}`
    : newApiUrl;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes RSS error: ${res.status}`);

  const data = await res.json();
  const results = data.feed?.results || [];

  const tracks = results.map((entry: any): RssTrack => ({
    id: Number(entry.id),
    name: entry.name,
    artistName: entry.artistName,
    albumName: entry.albumName || '',
    artworkUrl100: entry.artworkUrl100 || '',
    primaryGenreName: entry.genres?.[0]?.name || '',
    releaseDate: entry.releaseDate || '',
  })).filter((t: RssTrack) => !!t.id);

  rssCache = tracks;
  rssCacheTime = Date.now();

  return tracks;
}

export async function resolveTracksWithPreview(tracks: RssTrack[], country = 'us'): Promise<ItunesTrack[]> {
  const resolved = await Promise.all(
    tracks.map(async (t) => {
      const results = await searchItunes(`${t.name} ${t.artistName}`, 1, country);
      return results[0] ?? null;
    })
  );
  return resolved.filter((t): t is ItunesTrack => t !== null);
}
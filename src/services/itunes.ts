/**
 * iTunes Search API service.
 *
 * No API key required. CORS is allowed by Apple's servers.
 * The `previewUrl` field contains a direct 30-second MP3 preview.
 */

export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string; // 30-second MP3 — always present when we filter
  artworkUrl100: string;
  primaryGenreName: string;
}

interface ItunesResponse {
  resultCount: number;
  results: Partial<ItunesTrack>[];
}

const BASE = 'https://itunes.apple.com/search';

/** Search iTunes and return tracks that have a preview URL */
export async function searchItunes(
  term: string,
  limit = 8,
  country = 'us',
): Promise<ItunesTrack[]> {
  if (!term.trim()) return [];
  const url = `${BASE}?term=${encodeURIComponent(term)}&entity=song&media=music&limit=${limit * 2}&country=${country}`;
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

import type { ItunesTrack } from '../services/itunes';
import type { Song, GameMode } from '../types';
import { MODE_CONFIG } from './modes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an iTunes API track to our Song model */
export function itunesToSong(track: ItunesTrack): Song {
  return {
    id: String(track.trackId),
    title: track.trackName,
    artist: track.artistName,
    album: track.collectionName,
    audioUrl: track.previewUrl,
    artworkUrl: track.artworkUrl100.replace('100x100', '300x300'),
    genre: track.primaryGenreName,
  };
}

/** The 6 unlock stages in seconds */
export const UNLOCK_STAGES: number[] = [1, 2, 4, 7, 11, 16];

export const MAX_GUESSES = 6;

// ─── Pool fetcher ─────────────────────────────────────────────────────────────

export async function fetchSongPool(mode: GameMode = 'global-all'): Promise<Song[]> {
  const queries = MODE_CONFIG[mode].queries;
  const country = MODE_CONFIG[mode].country;
  const BATCH    = 6;
  const songs: Song[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < queries.length; i += BATCH) {
    const batch = queries.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (q) => {
        const url =
          `https://itunes.apple.com/search` +
          `?term=${encodeURIComponent(q)}&entity=song&media=music&limit=1&country=${country}`;
        const res  = await fetch(url);
        const data = await res.json() as { results: Partial<ItunesTrack>[] };
        return data.results.find(
          (t): t is ItunesTrack =>
            !!t.trackId && !!t.trackName && !!t.artistName && !!t.previewUrl,
        ) ?? null;
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        const song = itunesToSong(r.value);
        if (!seen.has(song.id)) {
          seen.add(song.id);
          songs.push(song);
        }
      }
    }
  }

  return songs;
}

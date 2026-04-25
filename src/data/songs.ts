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

const HIPHOP_GENRE_KEYWORDS = [
  'hip-hop',
  'hip hop',
  'rap',
  'trap',
  'drill',
  'grime',
  'r&b/soul',
  'rnb/soul',
  'r&b',
  'rnb',
  'urban',
];

function isHipHopSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  return HIPHOP_GENRE_KEYWORDS.some((keyword) => genre.includes(keyword));
}

// ─── Pool fetcher ─────────────────────────────────────────────────────────────

export async function fetchSongPool(mode: GameMode = 'global-all'): Promise<Song[]> {
  const modeConfig = MODE_CONFIG[mode];
  const queries = modeConfig.queries;
  const country = modeConfig.country;
  const isHipHopMode = modeConfig.theme === 'hiphop';
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

        if (isHipHopMode && !isHipHopSong(song)) {
          continue;
        }

        if (!seen.has(song.id)) {
          seen.add(song.id);
          songs.push(song);
        }
      }
    }
  }

  return songs;
}

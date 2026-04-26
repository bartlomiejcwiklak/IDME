import { useState, useEffect, useCallback } from 'react';
import { fetchSongPool } from '../data/songs';
import type { Song, GameMode } from '../types';

export type PoolStatus = 'loading' | 'ready' | 'error';

export interface SongPool {
  songs: Song[];
  status: PoolStatus;
  error: string | null;
}

/**
 * Loads the game song pool from iTunes.
 * Re-fetches automatically whenever `mode` changes.
 */
export function useSongPool(mode: GameMode, artistQuery?: string, spotifyUrl?: string): SongPool {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<PoolStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setSongs([]);
    setStatus('loading');
    setError(null);

    // Don't fetch if it's spotify mode but no URL is provided yet
    if (mode === 'spotify-playlist' && !spotifyUrl) {
      return;
    }

    fetchSongPool(mode, artistQuery, spotifyUrl)
      .then((pool) => {
        if (cancelled) return;
        if (pool.length === 0) {
          setError('No songs found. Check your internet connection.');
          setStatus('error');
        } else {
          setSongs(pool);
          setStatus('ready');
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load songs.');
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [mode, artistQuery, spotifyUrl]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return { songs, status, error };
}

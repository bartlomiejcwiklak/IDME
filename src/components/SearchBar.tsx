import { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchBarProps, Song } from '../types';
import { searchItunes, isAbortError } from '../services/itunes';
import { itunesToSong } from '../data/songs';

const DEBOUNCE_MS = 300;
const MIN_REMOTE_QUERY = 2;
/** Results requested per store before merging and re-ranking. */
const REMOTE_FETCH_LIMIT = 25;

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

// ─── Matching helpers ─────────────────────────────────────────────────────────

/** Lowercase and strip diacritics so "dzem" finds "Dżem" and "lodz" finds "Łódź". */
function fold(s: string | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function scoreResult(song: Song, term: string): number {
  const q = fold(term);
  const title = fold(song.title);
  const artist = fold(song.artist);

  let score = 0;
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 60;
  else if (title.includes(q)) score += 30;

  if (artist === q) score += 50;
  else if (artist.startsWith(q)) score += 25;
  else if (artist.includes(q)) score += 10;

  // Multi-word queries like "blinding weeknd": reward every word matching somewhere
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    if (words.every((w) => title.includes(w))) score += 20;
    else if (words.every((w) => title.includes(w) || artist.includes(w))) score += 15;
  }
  return score;
}

// Cover / kids / karaoke catalogues that bury the original recording.
const KNOCKOFF_ARTIST = /kidz bop|rockabye baby|lullaby|karaoke|tribute|string quartet|8-bit|music box|twinkle twinkle|piano dreamers/i;
const KNOCKOFF_TITLE = /karaoke|instrumental|lullaby|8-bit|music box|made famous by|originally performed/i;

function rank(songs: Song[], term: string, limit: number, bonus?: (song: Song) => number): Song[] {
  return songs
    .map((song, i) => ({ song, i, score: scoreResult(song, term) + (bonus?.(song) ?? 0) }))
    // Stable: equal scores keep iTunes' own relevance order
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((r) => r.song);
}

/** Search a list of songs in memory; every query word must match title, artist or album. */
function searchLocal(pool: Song[], term: string, limit: number): Song[] {
  const words = fold(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const matches = pool.filter((s) => {
    const haystack = `${fold(s.title)} ${fold(s.artist)} ${fold(s.album)}`;
    return words.every((w) => haystack.includes(w));
  });
  return rank(matches, term, limit);
}

// Session-wide cache so retyping or backspacing never re-hits Apple's rate limit.
const remoteCache = new Map<string, Song[]>();

/**
 * Query the mode's store plus the other one (US ↔ PL) so both Polish and
 * international songs can be found. One store failing doesn't fail the search.
 */
async function searchRemote(term: string, country: string, limit: number, signal: AbortSignal): Promise<Song[]> {
  const key = `${country}|${fold(term)}`;
  const cached = remoteCache.get(key);
  if (cached) return cached.slice(0, limit);

  const otherCountry = country === 'pl' ? 'us' : 'pl';
  const settled = await Promise.allSettled([
    searchItunes(term, { limit: REMOTE_FETCH_LIMIT, country, retries: 0, signal }),
    searchItunes(term, { limit: REMOTE_FETCH_LIMIT, country: otherCountry, retries: 0, signal }),
  ]);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (settled.every((r) => r.status === 'rejected')) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }

  // The same recording usually exists in both stores and on several releases
  // (single, album, deluxe…) — dedupe by id and by name, but count the copies:
  // hits get re-released a lot, so it's a decent popularity signal that lets
  // "The Weeknd — Blinding Lights" outrank a dozen covers with the same title.
  const nameKey = (s: Song) => `${fold(s.title)}|${fold(s.artist)}`;
  const copies = new Map<string, number>();
  const seen = new Set<string>();
  const merged: Song[] = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const track of r.value) {
      const song = itunesToSong(track);
      const key = nameKey(song);
      copies.set(key, (copies.get(key) ?? 0) + 1);
      if (seen.has(song.id) || seen.has(key)) continue;
      seen.add(song.id);
      seen.add(key);
      merged.push(song);
    }
  }

  const bonus = (song: Song) => {
    const releases = Math.min((copies.get(nameKey(song)) ?? 1) - 1, 3) * 10;
    const knockoff = KNOCKOFF_ARTIST.test(song.artist) || KNOCKOFF_ARTIST.test(song.album ?? '') || KNOCKOFF_TITLE.test(song.title);
    return releases - (knockoff ? 40 : 0);
  };
  const ranked = rank(merged, term, REMOTE_FETCH_LIMIT, bonus);
  remoteCache.set(key, ranked);
  return ranked.slice(0, limit);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchBar({
  selectedSong,
  onSelect,
  onSkip,
  onSubmit,
  disabled,
  searchCountry = 'us',
  resetKey,
  songPool,
  localOnly = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [isFallback, setIsFallback] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultLimit, setResultLimit] = useState(8);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncLimit = () => setResultLimit(mediaQuery.matches ? 10 : 8);
    syncLimit();
    mediaQuery.addEventListener('change', syncLimit);
    return () => mediaQuery.removeEventListener('change', syncLimit);
  }, []);

  /** Drop any pending/in-flight search so its result can't land later. */
  const cancelPending = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    requestIdRef.current++;
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  const showResults = useCallback((songs: Song[], fallback: boolean, nextStatus: SearchStatus) => {
    setResults(songs);
    setIsFallback(fallback);
    setStatus(nextStatus);
    setActiveIndex(-1);
    setIsOpen(true);
  }, []);

  const doSearch = useCallback(async (term: string) => {
    cancelPending();
    const requestId = requestIdRef.current;
    const trimmed = term.trim();

    if (localOnly) {
      if (!trimmed) {
        setResults([]);
        setStatus('idle');
        setIsOpen(false);
        return;
      }
      showResults(searchLocal(songPool, trimmed, resultLimit), false, 'ready');
      return;
    }

    if (trimmed.length < MIN_REMOTE_QUERY) {
      setResults([]);
      setStatus('idle');
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');

    try {
      const songs = await searchRemote(trimmed, searchCountry, resultLimit, controller.signal);
      if (requestId !== requestIdRef.current) return;
      showResults(songs, false, 'ready');
    } catch (e) {
      if (isAbortError(e) || requestId !== requestIdRef.current) return;
      // iTunes is throttled or unreachable. The answer is always in the song
      // pool, so searching it keeps the game playable.
      console.warn('iTunes search failed, falling back to the local song pool:', e);
      const local = searchLocal(songPool, trimmed, resultLimit);
      showResults(local, true, local.length > 0 ? 'ready' : 'error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [cancelPending, showResults, localOnly, songPool, resultLimit, searchCountry]);

  // Clear everything when the mode or category changes
  useEffect(() => {
    cancelPending();
    setQuery('');
    setResults([]);
    setStatus('idle');
    setIsOpen(false);
    onSelect(null);
  }, [searchCountry, resetKey, onSelect, cancelPending]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSelect(null);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), localOnly ? 0 : DEBOUNCE_MS);
  };

  const handleSelect = useCallback((song: Song) => {
    cancelPending();
    onSelect(song);
    setQuery(`${song.title} — ${song.artist}`);
    setIsOpen(false);
    setResults([]);
    setStatus('idle');
  }, [onSelect, cancelPending]);

  const handleClear = () => {
    cancelPending();
    setQuery('');
    onSelect(null);
    setResults([]);
    setStatus('idle');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const canSubmit = selectedSong !== null && !disabled;

  const resetInput = () => {
    cancelPending();
    setQuery('');
    setResults([]);
    setStatus('idle');
    setIsOpen(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit();
    resetInput();
  };

  const handleSkip = () => {
    onSkip();
    resetInput();
  };

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const listVisible = isOpen && results.length > 0;

    if (e.key === 'Enter') {
      if (listVisible && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (canSubmit) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp' && listVisible) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  const isLoading = status === 'loading';
  const showEmpty = isOpen && !isLoading && results.length === 0 && (status === 'ready' || status === 'error');
  const footerText = localOnly
    ? "From this artist's discography"
    : isFallback
      ? "iTunes is busy — showing songs from this mode"
      : 'Powered by iTunes';

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search input */}
      <div ref={containerRef} className="relative w-full">
        <div
          className={`flex items-center gap-2 w-full glass rounded-xl px-3 py-2.5 transition-all duration-300 border-2 border-white/10 focus-within:border-acid focus-within:shadow-[0_0_15px_rgba(217,255,66,0.15)] ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {/* Icon: search or spinner */}
          {isLoading ? (
            <svg
              className="w-4 h-4 text-acid flex-shrink-0 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
              <path strokeWidth="1.5" strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
          )}

          <input
            ref={inputRef}
            id="song-search"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search any song or artist…"
            aria-label="Search for a song"
            aria-autocomplete="list"
            aria-controls="song-search-results"
            aria-expanded={isOpen && results.length > 0}
            role="combobox"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none min-w-0"
          />

          {query && (
            <button onClick={handleClear} aria-label="Clear" className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <div
            id="song-search-results"
            role="listbox"
            className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-72 lg:max-h-96 overflow-y-auto border-2 border-acid bg-black shadow-[6px_6px_0_#d9ff42]"
            style={{ animation: 'fadeIn 0.15s ease-out' }}
          >
            {results.map((song, idx) => (
              <button
                key={song.id}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(song); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                  idx === activeIndex ? 'bg-acid text-black' : 'hover:bg-white/5 text-gray-200'
                }`}
              >
                {song.artworkUrl ? (
                  <img
                    src={song.artworkUrl.replace('300x300', '60x60')}
                    alt=""
                    loading="lazy"
                    className="w-9 h-9 rounded-md flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md flex-shrink-0 bg-white/10 flex items-center justify-center text-base">🎵</div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate leading-tight">{song.title}</div>
                  <div className={`text-xs truncate ${idx === activeIndex ? 'text-black/60' : 'text-gray-500'}`}>{song.artist}</div>
                </div>
              </button>
            ))}
            <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-1.5">
              <svg className="w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
              <span className="text-[10px] text-gray-600">{footerText}</span>
            </div>
          </div>
        )}

        {/* No results / search unavailable */}
        {showEmpty && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 border-2 border-acid bg-black px-4 py-3 text-sm text-gray-400 shadow-[6px_6px_0_#d9ff42]">
            {status === 'error'
              ? 'Search is unavailable right now — try again in a moment.'
              : `No results for "${query.trim()}"`}
          </div>
        )}
      </div>

      {/* Hint */}
      {!selectedSong && query.length === 0 && (
        <p className="text-center text-xs text-gray-700">
          {localOnly ? "Search this artist's songs" : 'Search from millions of songs via iTunes'}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button id="skip-btn" onClick={handleSkip} disabled={disabled} className="btn-secondary flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
          </svg>
          Skip
        </button>
        <button id="submit-btn" onClick={handleSubmit} disabled={!canSubmit} className="btn-primary flex-[2]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M5 13l4 4L19 7"/>
          </svg>
          Submit Guess
        </button>
      </div>
    </div>
  );
}

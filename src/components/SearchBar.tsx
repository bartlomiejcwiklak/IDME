import { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchBarProps, Song } from '../types';
import { searchItunes } from '../services/itunes';
import { itunesToSong } from '../data/songs';


export default function SearchBar({
  selectedSong,
  onSelect,
  onSkip,
  onSubmit,
  disabled,
  searchCountry = 'us',
  resetKey,
  songPool,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultLimit, setResultLimit] = useState(8);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncLimit = () => {
      setResultLimit(mediaQuery.matches ? 10 : 8);
    };

    syncLimit();
    mediaQuery.addEventListener('change', syncLimit);
    return () => mediaQuery.removeEventListener('change', syncLimit);
  }, []);

  // ── Live iTunes search with 350ms debounce ─────────────────────────────────
  const scoreResult = (song: Song, term: string): number => {
    const q = term.toLowerCase().trim();
    const title = song.title.toLowerCase();
    const artist = song.artist.toLowerCase();

    let score = 0;
    if (title === q) score += 100;                      // exact title match
    else if (title.startsWith(q)) score += 60;          // title prefix match
    else if (title.includes(q)) score += 30;            // title contains query

    if (artist === q) score += 50;                      // exact artist match
    else if (artist.startsWith(q)) score += 25;         // artist prefix match
    else if (artist.includes(q)) score += 10;           // artist contains query

    // Bonus: query words all appear in title
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(w => title.includes(w))) score += 20;

    return score;
  };

  const doSearch = useCallback(async (term: string, country: string) => {
    if (!term.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      if (songPool) {
        // Artist mode: filter the loaded discography pool locally (instant, no API call)
        const q = term.toLowerCase().trim();
        const filtered = songPool
          .filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            (s.album ?? '').toLowerCase().includes(q)
          )
          .sort((a, b) => scoreResult(b, term) - scoreResult(a, term))
          .slice(0, resultLimit);
        setResults(filtered);
        setIsOpen(filtered.length > 0);
      } else {
        // Regular mode: run 4 parallel iTunes queries to maximise coverage
        const otherCountry = country === 'pl' ? 'us' : 'pl';
        const fetchLimit = resultLimit * 2;
        const [r1, r2, r3, r4] = await Promise.all([
          searchItunes(term, fetchLimit, country),
          searchItunes(term, fetchLimit, country, 'songTerm'),
          searchItunes(term, fetchLimit, otherCountry),
          searchItunes(term, fetchLimit, otherCountry, 'songTerm'),
        ]);

        // Merge, deduplicate by trackId, re-rank, then cap to resultLimit
        const seenIds = new Set<string>();
        const merged = [...r1, ...r2, ...r3, ...r4].filter(t => {
          const id = String(t.trackId);
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

        const songs = merged
          .map((t) => itunesToSong(t))
          .sort((a, b) => scoreResult(b, term) - scoreResult(a, term))
          .slice(0, resultLimit);

        setResults(songs);
        setIsOpen(songs.length > 0);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [resultLimit, songPool]);

  // Clear results when the country (mode) changes
  useEffect(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(null);
  }, [searchCountry, resetKey, onSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSelect(null);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, searchCountry), 350);
  };

  // ── Select a song from the dropdown ────────────────────────────────────────
  const handleSelect = useCallback((song: Song) => {
    onSelect(song);
    setQuery(`${song.title} — ${song.artist}`);
    setIsOpen(false);
    setResults([]);
  }, [onSelect]);

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setResults([]);
    setIsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
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

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const canSubmit = selectedSong !== null && !disabled;

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
            aria-expanded={isOpen}
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
                {/* Album art thumbnail */}
                {song.artworkUrl ? (
                  <img
                    src={song.artworkUrl.replace('300x300', '60x60')}
                    alt={song.album ?? song.title}
                    className="w-9 h-9 rounded-md flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md flex-shrink-0 bg-white/10 flex items-center justify-center text-base">🎵</div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate leading-tight">{song.title}</div>
                  <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                </div>
              </button>
            ))}
            <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-1.5">
              <svg className="w-3 h-3 opacity-40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
              <span className="text-[10px] text-gray-600">Powered by iTunes</span>
            </div>
          </div>
        )}

        {/* No results */}
        {isOpen && !isLoading && query.trim() && results.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 border-2 border-acid bg-black px-4 py-3 text-sm text-gray-400 shadow-[6px_6px_0_#d9ff42]">
            No results for "{query}"
          </div>
        )}
      </div>

      {/* Hint */}
      {!selectedSong && query.length === 0 && (
        <p className="text-center text-xs text-gray-700">
          Search from millions of songs via iTunes
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button id="skip-btn" onClick={onSkip} disabled={disabled} className="btn-secondary flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
          </svg>
          Skip
        </button>
        <button id="submit-btn" onClick={onSubmit} disabled={!canSubmit} className="btn-primary flex-[2]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M5 13l4 4L19 7"/>
          </svg>
          Submit Guess
        </button>
      </div>
    </div>
  );
}

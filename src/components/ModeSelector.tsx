import { getGameModeMeta } from '../data/modes';
import type { GameMode } from '../types';
import FlagIcon from './FlagIcon';

interface ModeSelectorProps {
  value: GameMode;
  onOpenMenu: () => void;
  isArtistMode?: boolean;
  onResetArtist?: () => void;
  artistQuery?: string;
}

export default function ModeSelector({ value, onOpenMenu, isArtistMode, onResetArtist, artistQuery }: ModeSelectorProps) {
  const selected = getGameModeMeta(value);

  // In Artist Fan mode, show the artist name alongside the mode label
  const displayLabel = isArtistMode && artistQuery
    ? `Artist Fan: ${artistQuery.charAt(0).toUpperCase() + artistQuery.slice(1)}`
    : selected.label;

  return (
    <div className="w-full flex items-center gap-3">
      {/* Active Mode Info */}
      <div className="flex-1 min-w-0 h-[64px] flex items-center gap-3 border rounded-2xl px-4 py-2 transition-all" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-primary)' }}>
        <div className="flex-shrink-0 text-xl">
          <FlagIcon mode={value} />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.3em] font-bold leading-none mb-1" style={{ color: 'var(--text-muted)' }}>
            Mode
          </div>
          <div className="font-bold text-sm truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {displayLabel}
          </div>
        </div>
      </div>

      {/* Reset Artist Button — only in Artist Fan mode */}
      {isArtistMode && onResetArtist && (
        <button
          onClick={onResetArtist}
          title="Pick a different artist"
          className="h-[64px] w-[64px] flex items-center justify-center rounded-2xl bg-acid hover:bg-[#c9eb3d] shadow-lg shadow-acid/10 transition-all flex-shrink-0"
        >
          <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Change Button */}
      <button
        onClick={onOpenMenu}
        className="h-[64px] px-5 bg-acid hover:bg-[#c9eb3d] text-black font-bold text-sm rounded-2xl shadow-lg shadow-acid/10 transition-all flex items-center gap-2 group"
      >
        <span className="hidden sm:inline">Change</span>
        <svg 
          className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
    </div>
  );
}

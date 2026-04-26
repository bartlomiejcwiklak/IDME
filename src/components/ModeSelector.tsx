import { getGameModeMeta } from '../data/modes';
import type { GameMode } from '../types';
import FlagIcon from './FlagIcon';

interface ModeSelectorProps {
  value: GameMode;
  onOpenMenu: () => void;
}

export default function ModeSelector({ value, onOpenMenu }: ModeSelectorProps) {
  const selected = getGameModeMeta(value);

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
            {selected.label}
          </div>
        </div>
      </div>

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

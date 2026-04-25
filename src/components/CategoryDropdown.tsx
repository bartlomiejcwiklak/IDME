import { useEffect, useRef, useState } from 'react';
import { GAME_MODE_OPTIONS, getGameModeMeta } from '../data/modes';
import type { GameMode } from '../types';

interface CategoryDropdownProps {
  value: GameMode;
  onChange: (mode: GameMode) => void;
}

export default function CategoryDropdown({ value, onChange }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = getGameModeMeta(value);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        aria-expanded={open}
        aria-label="Choose song category"
        className="w-full flex items-center justify-between gap-4 border-2 border-acid bg-black px-4 py-3 text-left shadow-[4px_4px_0_#d9ff42] transition-transform duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px]"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.35em] text-gray-500 font-bold">Song Pool</div>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none flex-shrink-0">{selected.flag}</span>
            <span className="truncate font-bold text-sm sm:text-base text-white">{selected.label}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500 truncate">{selected.description}</div>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden border-2 border-acid bg-black shadow-[6px_6px_0_#d9ff42]">
          {GAME_MODE_OPTIONS.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                  active ? 'bg-acid text-black' : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                <span className="text-lg leading-none flex-shrink-0">{option.flag}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{option.label}</span>
                  <span className={`block text-[11px] leading-tight ${active ? 'text-black/75' : 'text-gray-500'}`}>
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

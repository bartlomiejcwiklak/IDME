import { GAME_MODE_OPTIONS, GameModeMeta } from '../data/modes';
import type { GameMode } from '../types';
import FlagIcon from './FlagIcon';

interface ModeMenuProps {
  onSelect: (mode: GameMode) => void;
  onClose: () => void;
  currentMode: GameMode;
}

function ModeTile({ 
  mode, 
  currentMode, 
  onSelect, 
  onClose 
}: { 
  mode: GameModeMeta; 
  currentMode: GameMode; 
  onSelect: (m: GameMode) => void; 
  onClose: () => void;
}) {
  const isActive = mode.value === currentMode;
  return (
    <div className="h-full">
      <button
        onClick={() => {
          onSelect(mode.value);
          onClose();
        }}
        className={`group relative flex flex-col items-start w-full h-full p-5 rounded-2xl border transition-all duration-300 ${
          isActive 
            ? 'bg-acid border-acid text-black shadow-[0_0_20px_rgba(217,255,66,0.2)]' 
            : ''
        }`}
        style={!isActive ? {
          background: 'var(--glass-bg)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        } : undefined}
        onMouseEnter={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'var(--glass-dark-bg)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
          }
        }}
      >
        <div className="flex items-start gap-3 mb-3 w-full">
          <div className="flex-shrink-0 text-2xl pt-0.5">
            <FlagIcon mode={mode.value} />
          </div>
          <span className="font-bold text-base sm:text-lg leading-tight text-left pr-4">
            {mode.label}
          </span>
        </div>
        <p className={`text-xs text-left leading-relaxed mt-auto ${isActive ? 'text-black/70' : ''}`}
           style={!isActive ? { color: 'var(--text-muted)' } : undefined}>
          {mode.description}
        </p>
        
        {isActive && (
          <div className="absolute top-4 right-4">
            <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}

export default function ModeMenu({ onSelect, onClose, currentMode }: ModeMenuProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl p-6 sm:p-10 shadow-2xl animate-scale-up border"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Game Modes</h2>
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Choose your musical challenge</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-10">
          {/* Section: Global */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black whitespace-nowrap">Global Modes</h3>
              <div className="h-px w-full" style={{ background: 'var(--border-primary)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_MODE_OPTIONS.filter(m => m.region === 'global' && m.value !== 'artist-discography' && m.theme !== 'gaming' && m.theme !== 'decades').map((mode) => (
                <ModeTile key={mode.value} mode={mode} currentMode={currentMode} onSelect={onSelect} onClose={onClose} />
              ))}
            </div>
          </section>

          {/* Section: Polish */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black whitespace-nowrap">Polish Modes</h3>
              <div className="h-px w-full" style={{ background: 'var(--border-primary)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_MODE_OPTIONS.filter(m => m.region === 'polish').map((mode) => (
                <ModeTile key={mode.value} mode={mode} currentMode={currentMode} onSelect={onSelect} onClose={onClose} />
              ))}
            </div>
          </section>

          {/* Section: Decades */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black whitespace-nowrap">Decades</h3>
              <div className="h-px w-full" style={{ background: 'var(--border-primary)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_MODE_OPTIONS.filter(m => m.theme === 'decades').map((mode) => (
                <ModeTile key={mode.value} mode={mode} currentMode={currentMode} onSelect={onSelect} onClose={onClose} />
              ))}
            </div>
          </section>

          {/* Section: Other */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black whitespace-nowrap">Special Modes</h3>
              <div className="h-px w-full" style={{ background: 'var(--border-primary)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_MODE_OPTIONS.filter(m => m.value === 'artist-discography' || m.theme === 'gaming').map((mode) => (
                <ModeTile key={mode.value} mode={mode} currentMode={currentMode} onSelect={onSelect} onClose={onClose} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-10 pt-8 text-center" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 font-bold">
            More modes coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

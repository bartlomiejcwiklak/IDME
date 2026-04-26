import type { SettingsModalProps } from '../types';

export default function SettingsModal({ 
  volume, 
  onVolumeChange, 
  soundsEnabled,
  onSoundsToggle,
  theme,
  onThemeToggle,
  onClose 
}: SettingsModalProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md glass-dark rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 shadow-2xl shadow-black/80 animate-slide-up">
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-extrabold tracking-tight">Game Settings</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full" aria-label="Close settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors">
            <div>
              <div className="text-sm font-bold">Appearance</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </div>
            </div>
            <button
              onClick={() => onThemeToggle(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10"
            >
              <div className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white text-black' : 'text-gray-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
              <div className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-acid text-black' : 'text-gray-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
            </button>
          </div>

          {/* Master Volume Control */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">Master Volume</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Music & Previews</div>
              </div>
              <span className="text-acid font-bold text-sm">{Math.round(volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                aria-label="Master volume"
                className="volume-slider flex-1"
              />
            </div>
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors">
            <div>
              <div className="text-sm font-bold">Sound Effects</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Interface & Feedback</div>
            </div>
            <button
              onClick={() => onSoundsToggle(!soundsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                soundsEnabled ? 'bg-acid' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform shadow-sm ${
                  soundsEnabled ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
              Your settings and game progress are automatically saved to your browser's local storage.
            </p>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-8">
          Apply Settings
        </button>
      </div>
    </div>
  );
}

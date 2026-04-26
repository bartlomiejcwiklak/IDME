import type { SettingsModalProps } from '../types';

export default function SettingsModal({ volume, onVolumeChange, onClose }: SettingsModalProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

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

        <div className="space-y-8">
          {/* Volume control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-gray-500">
              <span className="font-bold">Master volume</span>
              <span className="text-acid font-bold tracking-normal">{Math.round(volume * 100)}%</span>
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

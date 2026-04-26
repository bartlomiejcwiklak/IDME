import type { HelpModalProps } from '../types';
import { UNLOCK_STAGES, MAX_GUESSES } from '../data/songs';

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md glass-dark rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 shadow-2xl shadow-black/80 animate-slide-up">
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold">How to Play</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full" aria-label="Close help">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <ol className="space-y-3 text-sm text-gray-300">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <span>Press <strong className="text-white">Play</strong> to hear the first <strong className="text-white">{UNLOCK_STAGES[0]} second</strong> of a mystery song.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <span>Search for the song and select it from the dropdown, then hit <strong className="text-white">Submit Guess</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>Each wrong guess or <strong className="text-white">Skip</strong> unlocks a longer clip: {UNLOCK_STAGES.map(s => s + 's').join(' → ')}.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            <span>You have <strong className="text-white">{MAX_GUESSES} attempts</strong> total. Good luck!</span>
          </li>
        </ol>

        {/* Legend */}
        <div className="mt-5 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Result Key</p>
          {[
            { color: 'bg-[#d9ff42]', label: 'Correct song' },
            { color: 'bg-amber-500', label: 'Correct artist' },
            { color: 'bg-red-600',   label: 'Wrong guess' },
            { color: 'bg-gray-600',  label: 'Skipped turn' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className={`w-4 h-4 rounded ${color}`} />
              <span className="text-gray-300">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">made by @ohhbaro</p>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-4">
          Got it — Let's Play!
        </button>
      </div>
    </div>
  );
}

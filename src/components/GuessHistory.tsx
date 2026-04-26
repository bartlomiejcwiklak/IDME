import type { GuessHistoryProps } from '../types';
import { MAX_GUESSES } from '../data/songs';

const SLOT_CLASSES: Record<string, string> = {
  empty:   'guess-slot-empty',
  skipped: 'guess-slot-skipped',
  wrong:   'guess-slot-wrong',
  correct:        'guess-slot-correct',
  'correct-artist': 'guess-slot-correct-artist',
};

export default function GuessHistory({ guesses }: Pick<GuessHistoryProps, 'guesses'>) {
  const slots = Array.from({ length: MAX_GUESSES }, (_, i) => guesses[i] ?? { status: 'empty' as const });

  return (
    <div className="w-full flex flex-col gap-2" role="list" aria-label="Guess history">
      {slots.map((guess, idx) => {
        const className = SLOT_CLASSES[guess.status];
        const isSkipped = guess.status === 'skipped';
        const hasText = guess.status === 'wrong' || guess.status === 'correct' || guess.status === 'correct-artist';

        return (
          <div
            key={idx}
            role="listitem"
            className={`${className} animate-fade-in`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Attempt number badge */}
            <span
              className={`mr-3 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors duration-300 ${
                guess.status === 'empty'
                  ? 'border-white/10 text-gray-600'
                  : guess.status === 'correct'
                  ? 'border-acid text-acid bg-[#0d1100]'
                  : guess.status === 'correct-artist'
                  ? 'border-amber-500 text-amber-500 bg-[#110d00]'
                  : guess.status === 'wrong'
                  ? 'border-red-700 text-red-400 bg-red-950/40'
                  : 'border-gray-700 text-gray-500'
              }`}
            >
              {idx + 1}
            </span>

            {/* Content */}
            {isSkipped && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
                </svg>
                Skipped
              </span>
            )}

            {hasText && (
              <div className="flex flex-col min-w-0">
                <span className="truncate font-semibold leading-tight">{guess.songTitle}</span>
                {guess.songArtist && (
                  <span className={`text-xs truncate leading-tight mt-0.5 ${
                      guess.status === 'correct' ? 'text-acid/80' : 
                      guess.status === 'correct-artist' ? 'text-amber-500/80' : 
                      'text-red-600/80'
                  }`}>
                    {guess.songArtist}
                  </span>
                )}
              </div>
            )}

            {/* Status icon */}
            {guess.status === 'correct' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto w-4 h-4 text-acid flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            )}
            {guess.status === 'correct-artist' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            )}
            {guess.status === 'wrong' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

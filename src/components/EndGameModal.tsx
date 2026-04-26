import type { EndGameModalProps } from '../types';
import { MAX_GUESSES } from '../data/songs';

export default function EndGameModal({ gameStatus, correctSong, guesses, onPlayNext }: EndGameModalProps) {
  const won = gameStatus === 'won';
  const triesUsed = guesses.filter((g) => g.status !== 'empty').length;
  const correctAttempt = guesses.findIndex((g) => g.status === 'correct') + 1;

  // Build share emoji string
  const emojiRow = guesses.map((g) => {
    if (g.status === 'correct') return '🟢';
    if (g.status === 'correct-artist') return '🟡';
    if (g.status === 'wrong')   return '🔴';
    if (g.status === 'skipped') return '⬜';
    return '';
  }).filter(Boolean).join('');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={won ? 'You won!' : 'Game over'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md glass-dark rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 shadow-2xl shadow-black/80 animate-slide-up">
        {/* Top handle (mobile) */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Result icon */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-1 ${
              won
                ? 'bg-acid/20 shadow-[0_0_30px_rgba(217,255,66,0.3)]'
                : 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            }`}
          >
            {won ? '🎉' : '😔'}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {won ? 'You got it!' : 'Better luck next time'}
          </h2>
          {won && correctAttempt > 0 && (
            <p className="text-sm text-gray-400">
              Guessed in <span className="text-acid font-semibold">{correctAttempt}</span> of {MAX_GUESSES} tries
            </p>
          )}
          {!won && (
            <p className="text-sm text-gray-400">
              Used all {triesUsed} guess{triesUsed !== 1 ? 'es' : ''}
            </p>
          )}
        </div>

        {/* Correct song card */}
        <div className="w-full glass rounded-xl p-4 mb-5 flex items-center gap-4"
          style={{ borderColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderStyle: 'solid' }}
        >
          {correctSong.artworkUrl ? (
            <img
              src={correctSong.artworkUrl}
              alt={correctSong.album ?? correctSong.title}
              className="w-14 h-14 rounded-xl flex-shrink-0 object-cover shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
              style={{ background: 'rgba(34,197,94,0.12)' }}>
              🎵
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base truncate">{correctSong.title}</div>
            <div className="text-sm text-gray-400 truncate">{correctSong.artist}</div>
            <div className="flex items-center justify-between gap-4 mt-0.5">
              {correctSong.album && (
                <div className="text-[10px] text-gray-600 truncate">{correctSong.album}</div>
              )}
              {correctSong.releaseDate && (
                <div className="text-[10px] text-gray-600 flex-shrink-0 ml-auto tabular-nums">
                  {new Date(correctSong.releaseDate).getFullYear()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emoji result row */}
        {emojiRow && (
          <div className="text-center mb-5">
            <div className="text-xl tracking-widest mb-1">{emojiRow}</div>
            <p className="text-xs text-gray-600">
                {won ? `${correctAttempt}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`} · IDME
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            id="play-next-btn"
            onClick={onPlayNext}
            className="btn-primary flex-1 py-3 text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            Play Next Song
          </button>
        </div>
      </div>
    </div>
  );
}

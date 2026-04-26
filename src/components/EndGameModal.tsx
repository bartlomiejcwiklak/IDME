import type { EndGameModalProps } from '../types';
import { MAX_GUESSES } from '../data/songs';

export default function EndGameModal({ 
  gameStatus, 
  correctSong, 
  guesses, 
  onPlayNext,
  isPlaying,
  onPlayPause
}: EndGameModalProps) {
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

        {/* Correct song card with player */}
        <div className="w-full glass rounded-xl p-4 mb-5 flex items-center gap-4 border border-white/10">
          {correctSong.artworkUrl ? (
            <div className="relative group flex-shrink-0">
              <img
                src={correctSong.artworkUrl}
                alt={correctSong.album ?? correctSong.title}
                className="w-16 h-16 rounded-xl object-cover shadow-lg"
              />
              <button
                onClick={onPlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-100 transition-opacity"
                aria-label={isPlaying ? "Pause preview" : "Play full preview"}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 text-acid" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-acid ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onPlayPause}
              className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="font-bold text-base truncate">{correctSong.title}</div>
            <div className="text-sm text-gray-400 truncate">{correctSong.artist}</div>
            
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {correctSong.album && (
                <div className="text-[10px] text-gray-600 truncate">{correctSong.album}</div>
              )}
              {correctSong.releaseDate && (
                <div className="text-[10px] text-gray-600 flex-shrink-0 ml-auto tabular-nums">
                  {new Date(correctSong.releaseDate).getFullYear()}
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] animate-pulse-glow text-acid">
                {isPlaying ? "Playing Full Preview" : "Click artwork to listen"}
              </div>
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

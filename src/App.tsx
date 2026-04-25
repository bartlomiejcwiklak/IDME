import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useSongPool } from './hooks/useSongPool';
import { MAX_GUESSES } from './data/songs';
import { getGameModeMeta } from './data/modes';
import type { Song, GameMode } from './types';

import logo from './logo.png';

import Header from './components/Header';
import AudioProgressBar from './components/AudioProgressBar';
import GuessHistory from './components/GuessHistory';
import SearchBar from './components/SearchBar';
import EndGameModal from './components/EndGameModal';
import HelpModal from './components/HelpModal';
import CategoryDropdown from './components/CategoryDropdown';

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen({ mode }: { mode: GameMode }) {
  const modeMeta = getGameModeMeta(mode);
  const isPolish = modeMeta.country === 'pl';
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src={logo} alt="IDME" className="block w-44 sm:w-56 h-auto" />
        <p className="text-sm text-gray-400 uppercase tracking-[0.28em]">
          {modeMeta.loadingText}
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: isPolish ? '#dc2626' : '#22c55e',
              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4">
      <div className="text-4xl">😔</div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-red-400">Couldn't load songs</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">{message}</p>
      </div>
      <button onClick={onRetry} className="btn-primary">Try Again</button>
    </div>
  );
}

// ── Game ──────────────────────────────────────────────────────────────────────
function Game({
  songs,
  mode,
  onModeChange,
}: {
  songs: Song[];
  mode: GameMode;
  onModeChange: (m: GameMode) => void;
}) {
  const game = useGameEngine(songs);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const modeMeta = getGameModeMeta(mode);

  const isPolish = modeMeta.country === 'pl';
  const searchCountry = modeMeta.country;

  const handleSubmit = () => {
    if (!selectedSong) return;
    game.submitGuess(selectedSong);
    setSelectedSong(null);
  };

  const handleSkip = () => {
    game.skip();
    setSelectedSong(null);
  };

  const handlePlayNext = () => {
    game.nextSong();
    setSelectedSong(null);
  };

  const attemptsLeft = MAX_GUESSES - game.currentAttempt;
  const gameOver = game.gameStatus !== 'playing';

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-6 py-0 flex flex-col lg:flex-row lg:flex-wrap gap-6">
        <div className="w-full flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Header */}
          <Header
            logoSrc={logo}
            onHelpOpen={() => setShowHelp(true)}
            onSettingsOpen={() => { /* future */ }}
          />
          <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* Mode dropdown — below the logo */}
          <div className="px-4 pt-3 pb-1 lg:px-0">
            <CategoryDropdown value={mode} onChange={onModeChange} />
          </div>

          {/* Main */}
          <main className="flex-1 flex flex-col gap-4 px-4 py-4 lg:px-0">

          {/* Attempts counter */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium tracking-wide uppercase">
              {game.gameStatus === 'playing'
                ? `Attempt ${game.currentAttempt + 1} of ${MAX_GUESSES}`
                : game.gameStatus === 'won'
                ? '🎉 You guessed it!'
                : '😔 Out of guesses'}
            </span>
            {game.gameStatus === 'playing' && (
              <span className={`font-semibold tabular-nums ${attemptsLeft <= 2 ? 'text-red-400' : 'text-gray-400'}`}>
                {attemptsLeft} left
              </span>
            )}
          </div>

          {/* Audio card */}
          <div className="glass rounded-2xl p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                {gameOver && game.currentSong.artworkUrl ? (
                  <img
                    src={game.currentSong.artworkUrl}
                    alt={game.currentSong.album ?? game.currentSong.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${game.isPlaying ? 'animate-pulse-glow' : ''}`}
                    style={{ background: isPolish ? 'rgba(220,38,38,0.12)' : 'rgba(34,197,94,0.12)' }}
                  >
                    {isPolish ? '🇵🇱' : '🎵'}
                  </div>
                )}
                <div>
                  {gameOver ? (
                    <>
                      <div className="text-sm font-bold leading-tight">{game.currentSong.title}</div>
                      <div className="text-xs text-gray-400 leading-tight">{game.currentSong.artist}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-300">Mystery Track</div>
                      <div className="text-xs text-gray-600">
                        {isPolish ? 'Zgadnij piosenkę!' : 'Guess the song!'}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {game.isPlaying && (
                <div className="flex items-center gap-1.5 text-acid text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acid opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-acid" />
                  </span>
                  Playing
                </div>
              )}
            </div>

            <AudioProgressBar
              currentTime={game.currentTime}
              unlockedDuration={game.unlockedDuration}
              isPlaying={game.isPlaying}
            />

            {/* Play / Pause */}
            <button
              id="play-pause-btn"
              onClick={game.isPlaying ? game.pause : game.play}
              aria-label={game.isPlaying ? 'Pause' : 'Play'}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95"
              style={{
                background: game.isPlaying
                  ? 'rgba(255,255,255,0.15)'
                  : isPolish ? '#dc2626' : '#22c55e',
                boxShadow: game.isPlaying
                  ? undefined
                  : `0 0 20px ${isPolish ? 'rgba(220,38,38,0.4)' : 'rgba(34,197,94,0.4)'}`,
              }}
            >
              {game.isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            <p className="text-xs text-gray-600 -mt-1">
              {game.isPlaying
                ? `${game.currentTime.toFixed(1)}s / ${game.unlockedDuration}s`
                : `${game.unlockedDuration}s unlocked`}
            </p>
          </div>

          {/* Guess history */}
          <GuessHistory guesses={game.guesses} />

        </main>
        </div>

        {!gameOver && (
          <aside className="w-full lg:w-[420px] lg:pt-[114px]">
            <div className="lg:sticky lg:top-4">
              <SearchBar
                selectedSong={selectedSong}
                onSelect={setSelectedSong}
                onSkip={handleSkip}
                onSubmit={handleSubmit}
                disabled={gameOver}
                searchCountry={searchCountry}
                resetKey={mode}
              />
            </div>
          </aside>
        )}

        <footer className="w-full lg:order-3 lg:basis-full px-4 py-3 text-center text-[10px] text-gray-700">
          IDME · {modeMeta.label} · Previews via iTunes
        </footer>
      </div>

      {gameOver && (
        <EndGameModal
          gameStatus={game.gameStatus}
          correctSong={game.currentSong}
          guesses={game.guesses}
          onPlayNext={handlePlayNext}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<GameMode>('global-all');
  const pool = useSongPool(mode);

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    // pool re-fetches automatically via useSongPool's useEffect
  };

  // Always render the header area even during loading
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md">

        {pool.status === 'loading' && <LoadingScreen mode={mode} />}

        {pool.status === 'error' && (
          <ErrorScreen
            message={pool.error ?? 'Unknown error'}
            onRetry={() => window.location.reload()}
          />
        )}

        {pool.status === 'ready' && (
          <Game songs={pool.songs} mode={mode} onModeChange={handleModeChange} />
        )}
      </div>
    </div>
  );
}

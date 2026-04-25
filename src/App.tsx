import { useState, type ChangeEvent } from 'react';
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

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    game.setVolume(Number(event.target.value));
  };

  const attemptsLeft = MAX_GUESSES - game.currentAttempt;
  const gameOver = game.gameStatus !== 'playing';

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-0">
        <Header
          logoSrc={logo}
          onHelpOpen={() => setShowHelp(true)}
          onSettingsOpen={() => { /* future */ }}
        />
      </div>

      <div className="w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="w-full min-w-0 flex flex-col">
            <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

            <div className="px-4 pb-1 lg:px-0">
              <div className="min-h-[82px] flex items-start">
                <CategoryDropdown value={mode} onChange={onModeChange} />
              </div>
            </div>

            <main className="flex-1 flex flex-col gap-4 px-4 py-4 lg:px-0">
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

                <button
                  id="play-pause-btn"
                  onClick={game.isPlaying ? game.pause : game.play}
                  aria-label={game.isPlaying ? 'Pause' : 'Play'}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95"
                  style={{
                    background: '#d9ff42',
                    color: '#000000',
                    boxShadow: '0 0 20px rgba(217,255,66,0.28)',
                  }}
                >
                  {game.isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
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

              <GuessHistory guesses={game.guesses} />
            </main>
          </div>

          {!gameOver && (
            <aside className="w-full">
              <div className="lg:sticky lg:top-4 flex flex-col gap-2">
                <div className="min-h-[82px] flex flex-col justify-start border-2 border-acid bg-black px-4 py-3 shadow-[4px_4px_0_#d9ff42]">
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-gray-500">
                    <span>Master volume</span>
                    <span className="text-acid font-semibold tracking-normal">{Math.round(game.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={game.volume}
                    onChange={handleVolumeChange}
                    aria-label="Master volume"
                    className="volume-slider mt-3 w-full"
                  />
                </div>
                <div className="lg:pt-[114px]">
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
              </div>
            </aside>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/85 px-4 py-3 text-center text-[10px] text-gray-700 backdrop-blur-sm">
        IDME · {modeMeta.label} · Previews via iTunes
      </footer>

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
      <div className="w-full">

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

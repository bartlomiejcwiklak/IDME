import { useState, type ChangeEvent, useEffect, useCallback } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useSongPool } from './hooks/useSongPool';
import { MAX_GUESSES, isBiasedArtist } from './data/songs';
import { getGameModeMeta } from './data/modes';
import type { Song, GameMode, CategoryState } from './types';

import logo from './logo.png';

import Header from './components/Header';
import AudioProgressBar from './components/AudioProgressBar';
import GuessHistory from './components/GuessHistory';
import SearchBar from './components/SearchBar';
import EndGameModal from './components/EndGameModal';
import HelpModal from './components/HelpModal';
import SettingsModal from './components/SettingsModal';
import CategoryDropdown from './components/CategoryDropdown';
import FlagIcon from './components/FlagIcon';

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
  initialState,
  onStateChange,
  onModeChange,
  onPlayNext,
  volume,
  onVolumeChange,
}: {
  songs: Song[];
  mode: GameMode;
  initialState: CategoryState;
  onStateChange: (state: CategoryState) => void;
  onModeChange: (m: GameMode) => void;
  onPlayNext: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  const game = useGameEngine();

  // Sync global volume to the engine
  useEffect(() => {
    game.setVolume(volume);
  }, [volume, game]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── Initialize or restore state ─────────────────────────────────────────────
  useEffect(() => {
    const seedIsInPool =
      !!initialState.currentSong && songs.some((s) => s.id === initialState.currentSong?.id);

    if (seedIsInPool && initialState.currentSong) {
      game.loadState(initialState);
    } else if (songs.length > 0) {
      // Apply the same bias logic for the initial pick
      const biasEligible = songs.filter(s => isBiasedArtist(s.artist));
      let initialSong;
      
      if (biasEligible.length > 0 && Math.random() < 0.4) {
        initialSong = biasEligible[Math.floor(Math.random() * biasEligible.length)];
      } else {
        initialSong = songs[Math.floor(Math.random() * songs.length)];
      }
      
      game.reset(initialSong);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs.length]);

  // ── Sync state back to App ──────────────────────────────────────────────────
  useEffect(() => {
    if (!game.currentSong.id) return;
    onStateChange({
      currentSong: game.currentSong,
      guesses: [...game.guesses],
      gameStatus: game.gameStatus,
      playedIds: initialState.playedIds || [],
    });
  }, [game.currentSong, game.guesses, game.gameStatus, onStateChange, initialState.playedIds]);

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

  const handlePlayNextGame = () => {
    onPlayNext();
    setSelectedSong(null);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(event.target.value));
  };

  const attemptsLeft = MAX_GUESSES - game.currentAttempt;
  const gameOver = game.gameStatus !== 'playing';

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-0">
        <Header
          logoSrc={logo}
          onHelpOpen={() => setShowHelp(true)}
          onSettingsOpen={() => setShowSettings(true)}
        />
      </div>

      <div className="w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="w-full min-w-0 flex flex-col">
            <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

            <div className="px-4 pb-1 lg:px-0">
              <div className="h-[82px] flex items-start">
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
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${game.isPlaying ? 'animate-pulse-glow' : ''}`}
                        style={{ background: isPolish ? 'rgba(220,38,38,0.12)' : 'rgba(34,197,94,0.12)' }}
                      >
                        {isPolish ? <FlagIcon mode={mode} className="w-6 h-4" /> : <span className="text-xl">🎵</span>}
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
              <div className="lg:sticky lg:top-4 flex flex-col gap-6">
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
          onPlayNext={handlePlayNextGame}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      
      {showSettings && (
        <SettingsModal
          volume={volume}
          onVolumeChange={onVolumeChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<GameMode>('global-all');
  const pool = useSongPool(mode);

  // Store full game state per category that persists across switches and refreshes
  const [categoryStates, setCategoryStates] = useState<Record<GameMode, CategoryState>>(() => {
    const saved = localStorage.getItem('idme-category-states');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved category states:', e);
      }
    }
    return {
      'global-all': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
      'global-hiphop': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
      'global-charts': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
      'polish-all': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
      'polish-hiphop': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
      'polish-charts': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [] },
    };
  });

  useEffect(() => {
    localStorage.setItem('idme-category-states', JSON.stringify(categoryStates));
  }, [categoryStates]);

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('idme-volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });

  useEffect(() => {
    localStorage.setItem('idme-volume', volume.toString());
  }, [volume]);

  const handleStateChange = useCallback((updatedState: CategoryState) => {
    setCategoryStates((prev) => ({
      ...prev,
      [mode]: updatedState,
    }));
  }, [mode]);

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
  };

  const handlePlayNext = () => {
    if (pool.status === 'ready' && pool.songs.length > 0) {
      const currentState = categoryStates[mode];
      const played = currentState.playedIds || [];
      
      // Update played IDs with the song we just finished
      const updatedPlayed = currentState.currentSong 
        ? Array.from(new Set([...played, currentState.currentSong.id]))
        : played;

      // Filter pool for unplayed songs
      let eligible = pool.songs.filter((s) => !updatedPlayed.includes(s.id));
      
      // If we've played everything, reset the played list
      if (eligible.length === 0) {
        eligible = pool.songs;
        // Start fresh played list with the next song
      }

      let newSong;
      const biasEligible = eligible.filter(s => isBiasedArtist(s.artist));
      
      // 40% chance to pick from biased artists if any are available
      if (biasEligible.length > 0 && Math.random() < 0.4) {
        newSong = biasEligible[Math.floor(Math.random() * biasEligible.length)];
      } else {
        newSong = eligible[Math.floor(Math.random() * eligible.length)];
      }

      const newState: CategoryState = { 
        currentSong: newSong, 
        guesses: [], 
        gameStatus: 'playing',
        playedIds: updatedPlayed.length >= pool.songs.length ? [newSong.id] : updatedPlayed
      };
      
      setCategoryStates((prev) => ({ ...prev, [mode]: newState }));
    }
  };

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
          <Game
            key={mode + (categoryStates[mode].currentSong?.id || '')}
            songs={pool.songs}
            mode={mode}
            initialState={categoryStates[mode]}
            onStateChange={handleStateChange}
            onModeChange={handleModeChange}
            onPlayNext={handlePlayNext}
            volume={volume}
            onVolumeChange={setVolume}
          />
        )}
      </div>
    </div>
  );
}

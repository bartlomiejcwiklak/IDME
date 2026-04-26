import { useState, useEffect, useCallback } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { useSongPool } from './hooks/useSongPool';
import { MAX_GUESSES, isBiasedArtist, isCuratedGamingAlbum } from './data/songs';
import { getGameModeMeta } from './data/modes';
import type { Song, GameMode, CategoryState } from './types';
import { soundService } from './services/sounds';

import logo from './logo.png';
import logoBlack from './logo_black.png';

import Header from './components/Header';
import AudioProgressBar from './components/AudioProgressBar';
import GuessHistory from './components/GuessHistory';
import SearchBar from './components/SearchBar';
import EndGameModal from './components/EndGameModal';
import HelpModal from './components/HelpModal';
import SettingsModal from './components/SettingsModal';
import ModeSelector from './components/ModeSelector';
import ModeMenu from './components/ModeMenu';
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

// ── Artist Setup screen ───────────────────────────────────────────────────────
function ArtistSetupScreen({ onSelect, onCancel }: { onSelect: (artist: string) => void, onCancel: () => void }) {
  const [query, setQuery] = useState('');
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onCancel} />
      
      <div className="relative w-full max-w-md bg-black border border-white/10 rounded-3xl p-8 shadow-2xl animate-scale-up">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
        >
          ✕
        </button>

        <div className="text-center space-y-2 mb-8">
          <div className="text-4xl mb-4">🎤</div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Pick Your Artist</h2>
          <p className="text-sm text-gray-500">We'll fetch their discography for you to guess.</p>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-acid/50 transition-all"
            placeholder="Artist name (e.g. Mata, Drake...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && query.trim() && onSelect(query.trim())}
            autoFocus
          />
          <button
            onClick={() => query.trim() && onSelect(query.trim())}
            className="w-full btn-primary py-4 text-lg"
            disabled={!query.trim()}
          >
            Start Playing
          </button>
          <button
            onClick={onCancel}
            className="w-full text-xs text-gray-600 hover:text-gray-400 py-2 transition-colors"
          >
            Cancel and go back
          </button>
        </div>
      </div>
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
  soundsEnabled,
  onSoundsToggle,
  theme,
  onThemeToggle,
}: {
  songs: Song[];
  mode: GameMode;
  initialState: CategoryState;
  onStateChange: (state: Partial<CategoryState>) => void;
  onModeChange: (m: GameMode) => void;
  onPlayNext: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  soundsEnabled: boolean;
  onSoundsToggle: (enabled: boolean) => void;
  theme: 'dark' | 'light';
  onThemeToggle: (t: 'dark' | 'light') => void;
}) {
  const game = useGameEngine();

  // Sync global volume to the engine
  useEffect(() => {
    game.setVolume(volume);
  }, [volume, game]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);

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
  }, [
    game.currentSong, 
    game.guesses, 
    game.gameStatus, 
    onStateChange, 
    initialState.playedIds
  ]);

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


  const attemptsLeft = MAX_GUESSES - game.currentAttempt;
  const gameOver = game.gameStatus !== 'playing';

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-0">
        <Header
          logoSrc={theme === 'light' ? logoBlack : logo}
          onHelpOpen={() => setShowHelp(true)}
          onSettingsOpen={() => setShowSettings(true)}
        />
      </div>

      <div className="w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="w-full min-w-0 flex flex-col">
            <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

            <div className="px-4 pb-4 lg:px-0">
              <ModeSelector 
                value={mode} 
                onOpenMenu={() => setShowModeMenu(true)} 
              />
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
                            Guess the song!
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

                {game.audioError ? (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="text-xs text-red-400 font-medium flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {game.audioError}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={game.retryLoad}
                        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Retry
                      </button>
                      <button 
                        onClick={handleSkip}
                        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Skip Song
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>

                    <p className="text-xs text-gray-600 -mt-1">
                      {game.isPlaying
                        ? `${game.currentTime.toFixed(1)}s / ${game.unlockedDuration}s`
                        : `${game.unlockedDuration}s unlocked`}
                    </p>
                  </>
                )}
              </div>

              <GuessHistory guesses={game.guesses} />
            </main>
          </div>

          {!gameOver && (
            <aside className="w-full">
              <div className="lg:sticky lg:top-4 flex flex-col gap-6">
                {/* Stats Box */}
                <div className="glass rounded-xl border border-white/5 shadow-xl overflow-hidden">
                  {/* Primary: Streaks */}
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Current Streak</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-acid tabular-nums leading-none">{initialState.currentStreak || 0}</span>
                        <span className="text-[9px] text-acid/60 font-bold">WINS</span>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Best Streak</span>
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="text-xl font-black text-white tabular-nums leading-none">{initialState.bestStreak || 0}</span>
                        <span className="text-[9px] text-white/40 font-bold">WINS</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary: Totals */}
                  <div className="grid grid-cols-2 bg-black/40">
                    <div className="px-4 py-2 flex items-center justify-between border-r border-white/5">
                      <span className="text-[9px] uppercase tracking-widest text-gray-600 font-bold">Solved</span>
                      <span className="text-sm font-bold text-gray-300 tabular-nums">{initialState.totalCorrect || 0}</span>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-widest text-gray-600 font-bold">Failed</span>
                      <span className="text-sm font-bold text-gray-300 tabular-nums">{initialState.totalWrong || 0}</span>
                    </div>
                  </div>
                </div>

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

      <footer
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/85 px-4 pt-3 text-center text-[10px] text-gray-700 backdrop-blur-sm"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        IDME · {modeMeta.label} · Previews via iTunes
      </footer>

      {gameOver && (
        <EndGameModal
          gameStatus={game.gameStatus}
          correctSong={game.currentSong}
          guesses={game.guesses}
          onPlayNext={handlePlayNextGame}
          isPlaying={game.isPlaying}
          onPlayPause={game.isPlaying ? game.pause : game.play}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {showModeMenu && (
        <ModeMenu
          currentMode={mode}
          onSelect={onModeChange}
          onClose={() => setShowModeMenu(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          volume={volume}
          onVolumeChange={onVolumeChange}
          soundsEnabled={soundsEnabled}
          onSoundsToggle={onSoundsToggle}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<GameMode>('global-all');
  const [prevMode, setPrevMode] = useState<GameMode>('global-all');
  const [artistQuery, setArtistQuery] = useState('');
  const pool = useSongPool(mode, artistQuery);

  // Global click sound effect
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') || 
        target.closest('a') || 
        target.closest('[role="button"]') ||
        target.closest('input[type="checkbox"]')
      ) {
        soundService.playClick();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Store full game state per category that persists across switches and refreshes
  const [categoryStates, setCategoryStates] = useState<Record<GameMode, CategoryState>>(() => {
    const saved = localStorage.getItem('idme-category-states');
    const DEFAULTS: Record<GameMode, CategoryState> = {
      'global-all': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-hiphop': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-charts': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-gaming': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-rock': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-electronic': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-pop': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'global-indie': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'polish-all': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'polish-hiphop': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'polish-charts': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'polish-classics': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'artist-discography': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'decades-80s': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'decades-90s': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'decades-00s': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
      'decades-10s': { currentSong: null, guesses: [], gameStatus: 'playing', playedIds: [], currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalWrong: 0 },
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deep merge parsed state with defaults to ensure all fields (like streaks) are present
        const merged = { ...DEFAULTS };
        (Object.keys(parsed) as GameMode[]).forEach((key) => {
          if (merged[key]) {
            merged[key] = { ...merged[key], ...parsed[key] };
          }
        });
        return merged;
      } catch (e) {
        console.warn('Failed to parse saved category states:', e);
      }
    }
    return DEFAULTS;
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

  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    const saved = localStorage.getItem('idme-sounds-enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('idme-sounds-enabled', soundsEnabled.toString());
    soundService.setEnabled(soundsEnabled);
  }, [soundsEnabled]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('idme-theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('idme-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const handleStateChange = useCallback((state: Partial<CategoryState>) => {
    setCategoryStates((prev) => {
      const old = prev[mode];
      const newState = { ...old, ...state };

      // Handle streak and totals update on game end
      if (old.gameStatus === 'playing' && state.gameStatus && state.gameStatus !== 'playing') {
        const won = state.gameStatus === 'won';
        newState.currentStreak = won ? (old.currentStreak || 0) + 1 : 0;
        newState.bestStreak = Math.max(old.bestStreak || 0, newState.currentStreak);
        
        if (won) {
          newState.totalCorrect = (old.totalCorrect || 0) + 1;
        } else {
          newState.totalWrong = (old.totalWrong || 0) + 1;
        }
      }

      return { ...prev, [mode]: newState as CategoryState };
    });
  }, [mode]);

  const handleModeChange = (newMode: GameMode) => {
    if (newMode !== mode) {
      setPrevMode(mode);
      setArtistQuery(''); // Clear artist search when switching modes
      setMode(newMode);
    }
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
        // When resetting, avoid picking the same song we just played if possible
        eligible = pool.songs.filter((s) => s.id !== (currentState.currentSong?.id || ''));
        if (eligible.length === 0) eligible = pool.songs; // Fallback for 1-song pools
      }

      let newSong;
      const modeConfig = getGameModeMeta(mode);
      const isGaming = modeConfig.theme === 'gaming';

      const curatedGamingEligible = isGaming
        ? eligible.filter(s => isCuratedGamingAlbum(s.album || ''))
        : [];

      const biasEligible = eligible.filter(s => isBiasedArtist(s.artist));

      // 1. If Gaming, 80% chance to pick from the curated legendary list
      if (isGaming && curatedGamingEligible.length > 0 && Math.random() < 0.8) {
        // GROUP BY ALBUM to avoid "album song count bias"
        const byAlbum: Record<string, Song[]> = {};
        curatedGamingEligible.forEach(s => {
          const albumKey = s.album || 'Unknown';
          if (!byAlbum[albumKey]) byAlbum[albumKey] = [];
          byAlbum[albumKey].push(s);
        });

        const albums = Object.keys(byAlbum);
        const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
        const albumSongs = byAlbum[randomAlbum];
        newSong = albumSongs[Math.floor(Math.random() * albumSongs.length)];
      }
      // 2. Otherwise, 40% chance to pick from VIP biased artists (for Hip-hop/All)
      else if (biasEligible.length > 0 && Math.random() < 0.4) {
        // GROUP BY ARTIST to avoid "artist song count bias"
        const byArtist: Record<string, Song[]> = {};
        biasEligible.forEach(s => {
          if (!byArtist[s.artist]) byArtist[s.artist] = [];
          byArtist[s.artist].push(s);
        });

        const artists = Object.keys(byArtist);
        const randomArtist = artists[Math.floor(Math.random() * artists.length)];
        const artistSongs = byArtist[randomArtist];
        newSong = artistSongs[Math.floor(Math.random() * artistSongs.length)];
      }
      // 3. Fallback to true random selection from the whole pool
      else {
        newSong = eligible[Math.floor(Math.random() * eligible.length)];
      }

      const newState: CategoryState = {
        ...currentState,
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
        {mode === 'artist-discography' && !artistQuery && (
          <ArtistSetupScreen 
            onSelect={setArtistQuery} 
            onCancel={() => handleModeChange(prevMode)}
          />
        )}

        {mode === 'artist-discography' && artistQuery && pool.status === 'loading' && (
          <LoadingScreen mode={mode} />
        )}

        {mode !== 'artist-discography' && pool.status === 'loading' && (
          <LoadingScreen mode={mode} />
        )}

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
            soundsEnabled={soundsEnabled}
            onSoundsToggle={setSoundsEnabled}
            theme={theme}
            onThemeToggle={setTheme}
          />
        )}
      </div>
    </div>
  );
}

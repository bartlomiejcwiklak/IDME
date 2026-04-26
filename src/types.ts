// ─── Domain Models ────────────────────────────────────────────────────────────

export type GameMode =
  | 'global-all'
  | 'global-hiphop'
  | 'global-charts'
  | 'global-gaming'
  | 'global-rock'
  | 'global-electronic'
  | 'global-pop'
  | 'global-indie'
  | 'polish-all'
  | 'polish-hiphop'
  | 'polish-charts'
  | 'polish-classics'
  | 'artist-discography'
  | 'decades-80s'
  | 'decades-90s'
  | 'decades-00s'
  | 'decades-10s';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  audioUrl: string;
  artworkUrl?: string;
  genre?: string;
  releaseDate?: string;
}

export type GuessStatus = 'empty' | 'skipped' | 'wrong' | 'correct' | 'correct-artist';

export interface GuessEntry {
  status: GuessStatus;
  songTitle?: string;
  songArtist?: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface CategoryState {
  currentSong: Song | null;
  guesses: GuessEntry[];
  gameStatus: GameStatus;
  playedIds: string[];
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalWrong: number;
}


// ─── Component Props ──────────────────────────────────────────────────────────

export interface AudioProgressBarProps {
  currentTime: number;
  unlockedDuration: number;
  isPlaying: boolean;
}

export interface GuessHistoryProps {
  guesses: GuessEntry[];
  maxGuesses: number;
}

export interface SearchBarProps {
  onSelect: (song: Song | null) => void;
  selectedSong: Song | null;
  onSkip: () => void;
  onSubmit: () => void;
  disabled: boolean;
  searchCountry?: string; // 'us' | 'pl' etc — defaults to 'us'
  resetKey?: string;
  songPool?: Song[]; // When provided, search filters this list locally (no iTunes call)
}

export interface EndGameModalProps {
  gameStatus: GameStatus;
  correctSong: Song;
  guesses: GuessEntry[];
  onPlayNext: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export interface HeaderProps {
  logoSrc: string;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
}

export interface HelpModalProps {
  onClose: () => void;
}

export interface SettingsModalProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  soundsEnabled: boolean;
  onSoundsToggle: (enabled: boolean) => void;
  theme: 'dark' | 'light';
  onThemeToggle: (theme: 'dark' | 'light') => void;
  onClose: () => void;
}

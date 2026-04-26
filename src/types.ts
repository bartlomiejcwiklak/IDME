// ─── Domain Models ────────────────────────────────────────────────────────────

export type GameMode =
  | 'global-all'
  | 'global-hiphop'
  | 'global-charts'
  | 'global-gaming'
  | 'polish-all'
  | 'polish-hiphop'
  | 'polish-charts'
  | 'artist-discography';

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
  onClose: () => void;
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export type GameMode =
  | 'global-all'
  | 'global-hiphop'
  | 'global-latest'
  | 'polish-all'
  | 'polish-hiphop'
  | 'polish-latest';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  audioUrl: string;
  artworkUrl?: string;
  genre?: string;
}

export type GuessStatus = 'empty' | 'skipped' | 'wrong' | 'correct';

export interface GuessEntry {
  status: GuessStatus;
  songTitle?: string;
  songArtist?: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

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
}

export interface HeaderProps {
  logoSrc: string;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
}

export interface HelpModalProps {
  onClose: () => void;
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { UNLOCK_STAGES, MAX_GUESSES } from '../data/songs';
import type { Song, GuessEntry, GameStatus } from '../types';

export interface GameState {
  currentSong: Song;
  guesses: GuessEntry[];
  currentAttempt: number;
  unlockedDuration: number;
  gameStatus: GameStatus;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

export interface GameActions {
  play: () => void;
  pause: () => void;
  submitGuess: (song: Song) => void;
  skip: () => void;
  nextSong: (song: Song) => void;
  setSong: (song: Song) => void;
  setVolume: (volume: number) => void;
}

export function useGameEngine(songPool: Song[]): GameState & GameActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedDurationRef = useRef<number>(UNLOCK_STAGES[0]);

  const [currentSong, setCurrentSong] = useState<Song>(() =>
    songPool.length > 0 ? songPool[Math.floor(Math.random() * songPool.length)] : ({} as Song),
  );
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [unlockedDuration, setUnlockedDuration] = useState(UNLOCK_STAGES[0]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  // ── Pick initial song only on first render if no song selected yet ────────────
  useEffect(() => {
    if (songPool.length > 0 && !currentSong.id) {
      const song = songPool[Math.floor(Math.random() * songPool.length)];
      setCurrentSong(song);
    }
  }, [songPool.length, currentSong.id]);

  // ── Bootstrap audio element ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!audioRef.current) return;
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      // Hard stop at the unlocked boundary
      if (t >= unlockedDurationRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
    };

    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onError = () => { setIsPlaying(false); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // ── Keep master volume synced to the audio element ──────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // ── Load new song into audio element ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.audioUrl) return;
    audio.pause();
    audio.src = currentSong.audioUrl;
    audio.load();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [currentSong]);

  // ── Sync unlocked duration ref ────────────────────────────────────────────────
  useEffect(() => {
    unlockedDurationRef.current = unlockedDuration;
  }, [unlockedDuration]);

  // ── Playback ──────────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= unlockedDurationRef.current) {
      audio.currentTime = 0;
    }
    audio.play().catch(() => {/* blocked by autoplay policy */});
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  // ── Advance attempt ───────────────────────────────────────────────────────────
  const advanceAttempt = useCallback((entry: GuessEntry) => {
    setGuesses((prev) => [...prev, entry]);
    setCurrentAttempt((prev) => {
      const next = prev + 1;
      if (next < MAX_GUESSES) {
        const dur = UNLOCK_STAGES[next];
        setUnlockedDuration(dur);
        unlockedDurationRef.current = dur;
      } else {
        const full = UNLOCK_STAGES[UNLOCK_STAGES.length - 1];
        setUnlockedDuration(full);
        unlockedDurationRef.current = full;
        setGameStatus('lost');
      }
      return next;
    });
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback((song: Song) => {
    if (gameStatus !== 'playing') return;
    // Match by trackId (id) or by normalised title+artist
    const normalise = (s: string) => s.toLowerCase().trim();
    const isCorrect =
      song.id === currentSong.id ||
      (normalise(song.title) === normalise(currentSong.title) &&
        normalise(song.artist) === normalise(currentSong.artist));

    const entry: GuessEntry = {
      status: isCorrect ? 'correct' : 'wrong',
      songTitle: song.title,
      songArtist: song.artist,
    };

    if (isCorrect) {
      setGuesses((prev) => [...prev, entry]);
      const full = UNLOCK_STAGES[UNLOCK_STAGES.length - 1];
      setUnlockedDuration(full);
      unlockedDurationRef.current = full;
      setGameStatus('won');
    } else {
      advanceAttempt(entry);
    }
    pause();
  }, [gameStatus, currentSong, advanceAttempt, pause]);

  // ── Skip ──────────────────────────────────────────────────────────────────────
  const skip = useCallback(() => {
    if (gameStatus !== 'playing') return;
    advanceAttempt({ status: 'skipped' });
  }, [gameStatus, advanceAttempt]);

  // ── Next song ─────────────────────────────────────────────────────────────────
  const nextSong = useCallback((song: Song) => {
    const initial = UNLOCK_STAGES[0];
    setCurrentSong(song);
    setGuesses([]);
    setCurrentAttempt(0);
    setUnlockedDuration(initial);
    unlockedDurationRef.current = initial;
    setGameStatus('playing');
    setCurrentTime(0);
  }, []);

  // ── Set song (for category switching) ──────────────────────────────────────────
  const setSong = useCallback((song: Song) => {
    setCurrentSong(song);
  }, []);

  return {
    currentSong, guesses, currentAttempt, unlockedDuration,
    gameStatus, isPlaying, currentTime, volume,
    play, pause, submitGuess, skip, nextSong, setSong, setVolume,
  };
}

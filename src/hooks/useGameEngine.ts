import { useState, useRef, useEffect, useCallback } from 'react';
import { UNLOCK_STAGES, MAX_GUESSES } from '../data/songs';
import type { Song, GuessEntry, GameStatus } from '../types';

function pickRandom(pool: Song[], excludeId?: string): Song {
  const eligible = excludeId ? pool.filter((s) => s.id !== excludeId) : pool;
  const source = eligible.length > 0 ? eligible : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export interface GameState {
  currentSong: Song;
  guesses: GuessEntry[];
  currentAttempt: number;
  unlockedDuration: number;
  gameStatus: GameStatus;
  isPlaying: boolean;
  currentTime: number;
}

export interface GameActions {
  play: () => void;
  pause: () => void;
  submitGuess: (song: Song) => void;
  skip: () => void;
  nextSong: () => void;
}

export function useGameEngine(songPool: Song[]): GameState & GameActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedDurationRef = useRef<number>(UNLOCK_STAGES[0]);
  const poolRef = useRef<Song[]>(songPool);

  // Keep poolRef current so nextSong() always uses the latest pool
  useEffect(() => { poolRef.current = songPool; }, [songPool]);

  const [currentSong, setCurrentSong] = useState<Song>(() =>
    songPool.length > 0 ? pickRandom(songPool) : ({} as Song),
  );
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [unlockedDuration, setUnlockedDuration] = useState(UNLOCK_STAGES[0]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // ── When the pool first loads, pick a song ────────────────────────────────────
  useEffect(() => {
    if (songPool.length > 0 && !currentSong.id) {
      setCurrentSong(pickRandom(songPool));
    }
  }, [songPool, currentSong.id]);

  // ── Bootstrap audio element ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
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
    pause();
    advanceAttempt({ status: 'skipped' });
  }, [gameStatus, advanceAttempt, pause]);

  // ── Next song ─────────────────────────────────────────────────────────────────
  const nextSong = useCallback(() => {
    pause();
    const next = pickRandom(poolRef.current, currentSong.id);
    const initial = UNLOCK_STAGES[0];
    setCurrentSong(next);
    setGuesses([]);
    setCurrentAttempt(0);
    setUnlockedDuration(initial);
    unlockedDurationRef.current = initial;
    setGameStatus('playing');
    setCurrentTime(0);
  }, [currentSong.id, pause]);

  return {
    currentSong, guesses, currentAttempt, unlockedDuration,
    gameStatus, isPlaying, currentTime,
    play, pause, submitGuess, skip, nextSong,
  };
}

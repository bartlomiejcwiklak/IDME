import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UNLOCK_STAGES, MAX_GUESSES } from '../data/songs';
import type { Song, GuessEntry, GameStatus, CategoryState } from '../types';
import { soundService } from '../services/sounds';

export interface GameState {
  currentSong: Song;
  guesses: GuessEntry[];
  currentAttempt: number;
  unlockedDuration: number;
  gameStatus: GameStatus;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  audioError: string | null;
}

export interface GameActions {
  play: () => void;
  pause: () => void;
  submitGuess: (song: Song) => void;
  skip: () => void;
  nextSong: (song: Song) => void;
  setSong: (song: Song) => void;
  loadState: (state: CategoryState) => void;
  reset: (song: Song) => void;
  setVolume: (volume: number) => void;
  retryLoad: () => void;
}

export function useGameEngine(): GameState & GameActions {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedDurationRef = useRef<number>(UNLOCK_STAGES[0]);

  const [currentSong, setCurrentSong] = useState<Song>({} as Song);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [unlockedDuration, setUnlockedDuration] = useState(UNLOCK_STAGES[0]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [audioError, setAudioError] = useState<string | null>(null);

  // ── Bootstrap audio element ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    // Removed crossOrigin = 'anonymous' to fix mobile Safari loading issues
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    let rafId: number;
    let lastAudioTime = 0;
    let lastSyncTime = 0;

    const syncTime = () => {
      if (!audioRef.current) return;

      const audioTime = audioRef.current.currentTime;
      const now = performance.now();

      // If the audio clock has advanced, reset our high-res interpolation anchor
      if (audioTime !== lastAudioTime) {
        lastAudioTime = audioTime;
        lastSyncTime = now;
      }

      // Calculate how many seconds have passed since the last audio clock update
      const dt = (now - lastSyncTime) / 1000;

      // Estimate the "real" current time. We clamp it to 0.3s ahead of the 
      // actual audio clock to prevent drifting too far if the audio stalls.
      const estimatedTime = Math.min(audioTime + dt, audioTime + 0.3);

      setCurrentTime(estimatedTime);

      // Hard stop at the unlocked boundary
      if (audioTime >= unlockedDurationRef.current || estimatedTime >= unlockedDurationRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      } else if (!audioRef.current.paused) {
        rafId = requestAnimationFrame(syncTime);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      lastAudioTime = audioRef.current?.currentTime || 0;
      lastSyncTime = performance.now();
      rafId = requestAnimationFrame(syncTime);
    };

    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafId);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(rafId);
    };

    const onError = (e: any) => {
      console.error('Audio load error:', e);
      setAudioError('Failed to load audio. Please check your connection.');
      setIsPlaying(false);
      cancelAnimationFrame(rafId);
    };

    const onTimeUpdate = () => {
      if (!audioRef.current) return;
      const t = audioRef.current.currentTime;
      // timeupdate is our safety net for background/throttled state.
      // It ensures we stop at the boundary even if RAF is suspended.
      if (t >= unlockedDurationRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.pause();
      cancelAnimationFrame(rafId);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // ── Keep master volume synced to the audio element ──────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    soundService.setVolume(volume);
  }, [volume]);

  // ── Load new song into audio element ─────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.audioUrl) return;
    audio.pause();
    setAudioError(null);
    audio.src = currentSong.audioUrl;
    // Removed explicit audio.load() as setting src is enough and more stable on mobile
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
    audio.play().catch(() => {/* blocked by autoplay policy */ });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
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
        setUnlockedDuration(30);
        unlockedDurationRef.current = 30;
        setGameStatus('lost');
      }
      return next;
    });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const normalise = (s: string) => (s || '').toLowerCase().trim();

  const getMainArtist = (artist: string) => {
    // Split by common feature separators and take the first part
    return normalise(artist.split(/ feat\. | ft\. | & | , | with /i)[0]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback((song: Song) => {
    if (gameStatus !== 'playing') return;
    // Match by trackId (id) or by normalised title+artist
    const normalise = (s: string) => s.toLowerCase().trim();
    const isCorrect =
      song.id === currentSong.id ||
      (normalise(song.title) === normalise(currentSong.title) &&
        getMainArtist(song.artist) === getMainArtist(currentSong.artist));

    const isCorrectArtist = getMainArtist(song.artist) === getMainArtist(currentSong.artist);

    const entry: GuessEntry = {
      status: isCorrect ? 'correct' : (isCorrectArtist ? 'correct-artist' : 'wrong'),
      songTitle: song.title,
      songArtist: song.artist,
    };

    if (isCorrect) {
      setGuesses((prev) => [...prev, entry]);
      setUnlockedDuration(30);
      unlockedDurationRef.current = 30;
      setGameStatus('won');
      soundService.playCorrect();
    } else {
      advanceAttempt(entry);
      soundService.playWrong();
    }
    pause();
  }, [gameStatus, currentSong, advanceAttempt, pause]);

  // ── Skip ──────────────────────────────────────────────────────────────────────
  const skip = useCallback(() => {
    if (gameStatus !== 'playing') return;
    advanceAttempt({ status: 'skipped' });
    soundService.playWrong();
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

  const setSong = useCallback((song: Song) => {
    setCurrentSong(song);
  }, []);

  // ── Load state (for restoring category progress) ─────────────────────────────
  const loadState = useCallback((state: CategoryState) => {
    if (state.currentSong) setCurrentSong(state.currentSong);
    setGuesses(state.guesses);
    setCurrentAttempt(state.guesses.length);
    setGameStatus(state.gameStatus);

    // Recalculate duration based on attempts
    const attempt = state.guesses.length;
    const isOver = state.gameStatus !== 'playing';
    const dur = isOver ? 30 : (attempt < MAX_GUESSES ? UNLOCK_STAGES[attempt] : 30);
    setUnlockedDuration(dur);
    unlockedDurationRef.current = dur;
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = useCallback((song: Song) => {
    const initial = UNLOCK_STAGES[0];
    setCurrentSong(song);
    setGuesses([]);
    setCurrentAttempt(0);
    setUnlockedDuration(initial);
    unlockedDurationRef.current = initial;
    setGameStatus('playing');
    setCurrentTime(0);
    setAudioError(null);
  }, []);

  const retryLoad = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.audioUrl) return;
    audio.pause();
    setAudioError(null);
    audio.src = currentSong.audioUrl;
    setCurrentTime(0);
  }, [currentSong]);

  return useMemo(() => ({
    currentSong, guesses, currentAttempt, unlockedDuration,
    gameStatus, isPlaying, currentTime, volume, audioError,
    play, pause, submitGuess, skip, nextSong, setSong, loadState, reset, setVolume, retryLoad,
  }), [
    currentSong, guesses, currentAttempt, unlockedDuration,
    gameStatus, isPlaying, currentTime, volume, audioError,
    play, pause, submitGuess, skip, nextSong, setSong, loadState, reset, setVolume, retryLoad,
  ]);
}

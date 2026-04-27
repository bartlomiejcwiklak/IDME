import { UNLOCK_STAGES } from '../data/songs';
import type { AudioProgressBarProps } from '../types';

const TOTAL_DURATION = UNLOCK_STAGES[UNLOCK_STAGES.length - 1]; // 16

export default function AudioProgressBar({
  currentTime,
  unlockedDuration,
  isPlaying,
}: AudioProgressBarProps) {
  const unlockedPct = (unlockedDuration / TOTAL_DURATION) * 100;
  const playedPct = Math.min((currentTime / TOTAL_DURATION) * 100, unlockedPct);

  return (
    <div className="w-full px-1 select-none" aria-label="Audio progress">
      {/* Main bar */}
      <div className="relative w-full h-3 rounded-full bg-white/[0.07] overflow-hidden">
        {/* Unlocked region */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/10 transition-all duration-500"
          style={{ width: `${unlockedPct}%` }}
        />

        {/* Played (progress head) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-acid ${
            isPlaying ? 'shadow-[0_0_12px_rgba(217,255,66,0.7)]' : ''
          }`}
          style={{ width: `${playedPct}%`, transition: 'none' }}
        />

        {/* Glowing tip when playing */}
        {isPlaying && playedPct > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-acid shadow-[0_0_15px_rgba(217,255,66,1)]"
            style={{ left: `calc(${playedPct}% - 8px)`, transition: 'none' }}
          />
        )}

        {/* Segment tick marks */}
        {UNLOCK_STAGES.slice(0, -1).map((sec) => {
          const pct = (sec / TOTAL_DURATION) * 100;
          const isUnlocked = sec <= unlockedDuration;
          return (
            <div
              key={sec}
              className={`absolute top-0 bottom-0 w-px transition-colors duration-500 ${
                isUnlocked ? 'bg-acid/60' : 'bg-white/[0.12]'
              }`}
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {UNLOCK_STAGES.map((sec) => {
          const isUnlocked = sec <= unlockedDuration;
          return (
            <span
              key={sec}
              className={`text-[9px] font-semibold tabular-nums transition-colors duration-500 ${
                isUnlocked ? 'text-progress-label' : 'text-gray-600'
              }`}
            >
              {sec}s
            </span>
          );
        })}
      </div>
    </div>
  );
}

import type { GameMode } from '../types';
import { getGameModeMeta } from '../data/modes';

interface FlagIconProps {
  mode: GameMode;
  className?: string;
}

export default function FlagIcon({ mode, className = "w-5 h-4" }: FlagIconProps) {
  const meta = getGameModeMeta(mode);
  
  if (meta.region === 'polish') {
    return (
      <div className={`inline-flex items-center justify-center overflow-hidden rounded-sm border border-white/10 ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10" className="w-full h-full">
          <rect width="16" height="10" fill="#fff"/>
          <rect width="16" height="5" y="5" fill="#dc221f"/>
        </svg>
      </div>
    );
  }

  // Use emojis for Global categories for a more vibrant look
  return (
    <span className="text-lg leading-none" role="img">
      {meta.flag}
    </span>
  );
}

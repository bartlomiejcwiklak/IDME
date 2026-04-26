import type { GameMode } from '../types';

export interface GameModeMeta {
  value: GameMode;
  label: string;
  description: string;
  loadingText: string;
  country: 'us' | 'pl';
  region: 'global' | 'polish';
  theme: 'all' | 'hiphop' | 'charts' | 'gaming';
  flag: string;
  genreId?: string;
}

interface ModeDefinition extends GameModeMeta { }

const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    value: 'global-all',
    label: 'Global: All',
    description: 'Popular tracks across genres',
    loadingText: 'Loading global songs',
    country: 'us',
    region: 'global',
    theme: 'all',
    flag: '🌍',
  },
  {
    value: 'global-hiphop',
    label: 'Global: Hip-hop',
    description: 'Rap, trap, pop-trap and adjacent',
    loadingText: 'Loading global hip-hop',
    country: 'us',
    region: 'global',
    theme: 'hiphop',
    flag: '🌍',
    genreId: '18',
  },
  {
    value: 'global-charts',
    label: 'Global: Chart Toppers',
    description: 'Top 200 most popular songs currently being bought and streamed on iTunes.',
    loadingText: 'Loading global charts',
    country: 'us',
    region: 'global',
    theme: 'charts',
    flag: '🌍',
  },
  {
    value: 'global-gaming',
    label: 'Gaming',
    description: 'Iconic soundtracks and gaming hits',
    loadingText: 'Loading gaming OSTs',
    country: 'us',
    region: 'global',
    theme: 'gaming',
    flag: '🎮',
  },
  {
    value: 'polish-all',
    label: 'Polish: All',
    description: 'Popular Polish tracks across genres',
    loadingText: 'Loading Polish songs',
    country: 'pl',
    region: 'polish',
    theme: 'all',
    flag: '🇵🇱',
  },
  {
    value: 'polish-hiphop',
    label: 'Polish: Hip-hop',
    description: 'Rap, trap, drill and friends',
    loadingText: 'Loading Polish hip-hop',
    country: 'pl',
    region: 'polish',
    theme: 'hiphop',
    flag: '🇵🇱',
    genreId: '18',
  },
  {
    value: 'polish-charts',
    label: 'Polish: Chart Toppers',
    description: 'Top 200 most popular songs currently being bought and streamed on iTunes in Poland.',
    loadingText: 'Loading Polish charts',
    country: 'pl',
    region: 'polish',
    theme: 'charts',
    flag: '🇵🇱',
  },
];

export const GAME_MODE_OPTIONS = MODE_DEFINITIONS.map((option) => option);

export const MODE_CONFIG = Object.fromEntries(
  MODE_DEFINITIONS.map((meta) => [meta.value, meta]),
) as Record<GameMode, GameModeMeta>;

export function getGameModeMeta(mode: GameMode): GameModeMeta {
  return MODE_CONFIG[mode];
}

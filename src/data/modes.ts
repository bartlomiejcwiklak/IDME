import type { GameMode } from '../types';

export interface GameModeMeta {
  value: GameMode;
  label: string;
  description: string;
  loadingText: string;
  country: 'us' | 'pl';
  region: 'global' | 'polish';
  theme: 'all' | 'hiphop' | 'charts' | 'gaming' | 'decades' | 'rock' | 'electronic' | 'pop' | 'indie' | 'classics';
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
    description: 'Top 200 most popular songs currently streamed globally.',
    loadingText: 'Loading global charts',
    country: 'us',
    region: 'global',
    theme: 'charts',
    flag: '🌍',
  },
  {
    value: 'global-rock',
    label: 'Global: Rock',
    description: 'The biggest rock anthems of all time',
    loadingText: 'Loading rock hits',
    country: 'us',
    region: 'global',
    theme: 'rock',
    flag: '🎸',
  },
  {
    value: 'global-electronic',
    label: 'Global: Electronic',
    description: 'EDM, house, techno & electronic bangers',
    loadingText: 'Loading electronic tracks',
    country: 'us',
    region: 'global',
    theme: 'electronic',
    flag: '🎛️',
  },
  {
    value: 'global-pop',
    label: 'Global: Pop',
    description: 'The biggest pop hits from around the world',
    loadingText: 'Loading pop hits',
    country: 'us',
    region: 'global',
    theme: 'pop',
    flag: '🌟',
  },
  {
    value: 'global-indie',
    label: 'Global: Indie/Alternative',
    description: 'Indie, alternative rock and art pop',
    loadingText: 'Loading indie tracks',
    country: 'us',
    region: 'global',
    theme: 'indie',
    flag: '🎵',
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
    description: 'WEYOO WEYOOOO',
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
    description: 'Top 200 most popular songs currently streamed in Poland.',
    loadingText: 'Loading Polish charts',
    country: 'pl',
    region: 'polish',
    theme: 'charts',
    flag: '🇵🇱',
  },
  {
    value: 'polish-classics',
    label: 'Polish: Classics',
    description: 'Nostalgiczne polskie klasyki sprzed 2014',
    loadingText: 'Loading Polish classics',
    country: 'pl',
    region: 'polish',
    theme: 'classics',
    flag: '🇵🇱',
  },
  {
    value: 'global-gaming',
    label: 'Gaming soundtracks',
    description: 'Iconic soundtracks and gaming hits',
    loadingText: 'Loading gaming OSTs',
    country: 'us',
    region: 'global',
    theme: 'gaming',
    flag: '🎮',
  },
  {
    value: 'artist-discography',
    label: 'Artist Fan',
    description: 'Guess songs from a specific artist',
    loadingText: 'Loading discography',
    country: 'us',
    region: 'global',
    theme: 'all',
    flag: '🎤',
  },
  {
    value: 'decades-80s',
    label: 'Top of 80s',
    description: '1980-1989',
    loadingText: 'Loading 80s hits',
    country: 'us',
    region: 'global',
    theme: 'decades',
    flag: '📼',
  },
  {
    value: 'decades-90s',
    label: 'Top of 90s',
    description: '1990-1999',
    loadingText: 'Loading 90s hits',
    country: 'us',
    region: 'global',
    theme: 'decades',
    flag: '💿',
  },
  {
    value: 'decades-00s',
    label: 'Top of 00s',
    description: '2000-2009',
    loadingText: 'Loading 00s hits',
    country: 'us',
    region: 'global',
    theme: 'decades',
    flag: '💽',
  },
  {
    value: 'decades-10s',
    label: 'Top of 2010s',
    description: '2010-2019',
    loadingText: 'Loading 2010s hits',
    country: 'us',
    region: 'global',
    theme: 'decades',
    flag: '📱',
  },
];

export const GAME_MODE_OPTIONS = MODE_DEFINITIONS.map((option) => option);

export const MODE_CONFIG = Object.fromEntries(
  MODE_DEFINITIONS.map((meta) => [meta.value, meta]),
) as Record<GameMode, GameModeMeta>;

export function getGameModeMeta(mode: GameMode): GameModeMeta {
  return MODE_CONFIG[mode];
}

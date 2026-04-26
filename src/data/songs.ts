import { fetchTopCharts, searchItunes, type ItunesTrack } from '../services/itunes';
import type { Song, GameMode } from '../types';
import { MODE_CONFIG } from './modes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an iTunes API track to our Song model */
export function itunesToSong(track: ItunesTrack): Song {
  return {
    id: String(track.trackId),
    title: track.trackName,
    artist: track.artistName,
    album: track.collectionName,
    audioUrl: track.previewUrl,
    artworkUrl: track.artworkUrl100.replace('100x100', '300x300'),
    genre: track.primaryGenreName,
    releaseDate: track.releaseDate,
  };
}

/** The 6 unlock stages in seconds */
export const UNLOCK_STAGES: number[] = [0.1, 0.5, 2, 4, 8, 16];

export const MAX_GUESSES = 6;

/** Artists that should appear more frequently (40% of games) */
export const BIASED_ARTISTS = [
  'Taco Hemingway', 'Mata', 'Bedoes', 'Kizo', 'White 2115', 'Oki', 'Szpaku',
  'Drake', 'Kanye West', 'Travis Scott', 'Kendrick Lamar', 'The Weeknd',
  'Future', 'Metro Boomin', 'Gunna', 'Playboi Carti', 'Central Cee', 'Tyler, The Creator',
  'A$AP Rocky', 'J. Cole', '21 Savage', 'Lil Uzi Vert', 'Nicki Minaj',
  'Cardi B', 'Megan Thee Stallion', 'Doja Cat', 'Rihanna', 'Beyoncé',
  'Post Malone', 'Juice WRLD', 'XXXTENTACION', 'Sfera Ebbasta', 'Pop Smoke', 'Ice Spice'
];

export function isBiasedArtist(artistName: string): boolean {
  const lower = artistName.toLowerCase();
  return BIASED_ARTISTS.some(name => {
    const lowerName = name.toLowerCase();
    const escaped = lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i');
    return regex.test(lower);
  });
}

const HIPHOP_GENRE_KEYWORDS = [
  'hip-hop',
  'hip hop',
  'rap',
  'trap',
  'drill',
  'grime',
];

function isHipHopSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const title = (song.title ?? '').toLowerCase();
  
  // Strict exclusion: No instrumentals, type beats, or karaoke versions.
  const isInstrumental = 
    title.includes('instrumental') || 
    title.includes('type beat') || 
    title.includes('beat only') ||
    title.includes('karaoke');

  if (isInstrumental) return false;

  // Must START with one of our keywords to be considered a primary hip-hop/rap track.
  return HIPHOP_GENRE_KEYWORDS.some((keyword) => genre.startsWith(keyword));
}

function isGamingSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const album = (song.album ?? '').toLowerCase();
  
  // Reject common movie soundtrack keywords
  if (album.includes('motion picture') || album.includes('movie soundtrack') || album.includes('from the film')) return false;
  
  // Stricter gaming indicators
  const isVideoGame = 
    genre.includes('video game') || 
    album.includes('video game') || 
    album.includes('game score') || 
    album.includes('ost') ||
    album.includes('soundtrack') ||
    album.includes('official soundtrack');

  return isVideoGame;
}

/** 
 * Heuristic to detect Polish songs/artists.
 */
function isPolishSong(song: Song): boolean {
  const polishChars = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  if (polishChars.test(song.title) || polishChars.test(song.artist)) {
    return true;
  }

  const polishArtists = [
    'Taco Hemingway', 'Quebonafide', 'Bedoes', 'Kizo', 'Malik Montana', 'Young Leosia', 
    'Mata', 'Sobel', 'Smolasty', 'White 2115', 'Oki', 'Szpaku', 'Gibbs', 'Sanah', 
    'Dawid Podsiadło', 'Mrozu', 'Brodka', 'Daria Zawiałow', 'Zalewski', 'Margaret',
    'Kult', 'Dżem', 'Lady Pank', 'Perfect', 'Myslovitz', 'Happysad', 'Pidżama Porno',
    'Strachy na Lachy', 'T.Love', 'Vito Bambino', 'PRO8L3M', 'Sokół', 'Pezet', 'Hemp Gru',
    'Paluch', 'Białas', 'ReTo', 'KęKę', 'Kali', 'O.S.T.R.', 'Fisz', 'Emade', 'Grubson',
    'Kuba Karaś', 'The Dumplings', 'Behemoth', 'Riverside', 'Turoń', 'Blanka',
    'Zipera', 'WWO', 'Molesta', 'Grammatik', 'Słoń', 'DonGURALesko', 'Borixon',
    'Avi', 'Louis Villain', 'Kaz Bałagane', 'Belmondo', 'Opał', 'Shellerini',
    'Guzior', 'Kukon', 'Miszel', 'Zdechły Osa', 'Jan-Rapowanie', 'Kacperczyk'
  ];

  const lowerArtist = song.artist.toLowerCase();
  return polishArtists.some(name => {
    const lowerName = name.toLowerCase();
    const escaped = lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i');
    return regex.test(lowerArtist);
  });
}

// ─── Pool fetcher ─────────────────────────────────────────────────────────────

export async function fetchSongPool(mode: GameMode = 'global-all'): Promise<Song[]> {
  const modeConfig = MODE_CONFIG[mode];
  const isCharts = modeConfig.theme === 'charts';
  
  try {
    let pool: Song[] = [];

    if (isCharts) {
      // "Chart Toppers" category: Strictly use the RSS Top 200 feed (Trending)
      const tracks = await fetchTopCharts(200, modeConfig.country);
      pool = tracks.map(itunesToSong);
    } else {
      // General/Hip-Hop categories: Use search for broader, "evergreen" popular variety
      // We search for multiple broad terms to get a massive pool of ~400+ songs
      const queries = modeConfig.theme === 'hiphop' 
        ? (modeConfig.region === 'polish' ? ['rap polski', 'hip hop pl', 'trap polska'] : ['best hip hop', 'rap hits', '90s rap'])
        : modeConfig.theme === 'gaming'
        ? ['official video game soundtrack', 'original game score', 'video game music', 'nintendo music ost', 'gaming ost']
        : (modeConfig.region === 'polish' ? ['polska muzyka', 'polskie hity', 'pop polska'] : ['popular songs', 'top hits', 'all time hits']);

      const results = await Promise.all(
        queries.map(q => searchItunes(q, 150, modeConfig.country))
      );
      
      const seenIds = new Set<string>();
      results.flat().forEach(t => {
        if (!seenIds.has(String(t.trackId))) {
          pool.push(itunesToSong(t));
          seenIds.add(String(t.trackId));
        }
      });
    }

    // Apply strict genre/language filters
    if (modeConfig.theme === 'hiphop') {
      pool = pool.filter(isHipHopSong);
    }
    if (modeConfig.theme === 'gaming') {
      pool = pool.filter(isGamingSong);
    }
    if (modeConfig.region === 'polish') {
      pool = pool.filter(isPolishSong);
    }

    // BIAS INJECTION: Ensure biased artists are always present
    const biasedInPool = pool.filter(s => isBiasedArtist(s.artist));
    if (modeConfig.theme !== 'gaming' && biasedInPool.length < 20) {
      const shuffleBias = [...BIASED_ARTISTS].sort(() => Math.random() - 0.5);
      const targets = shuffleBias.slice(0, 8); // Inject 8 random VIPs
      
      for (const artist of targets) {
        try {
          const extra = await searchItunes(artist, 5, modeConfig.country);
          const filteredExtra = extra.map(itunesToSong).filter(s => {
            if (modeConfig.theme === 'hiphop' && !isHipHopSong(s)) return false;
            if (modeConfig.region === 'polish' && !isPolishSong(s)) return false;
            return true;
          });
          
          const existingIds = new Set(pool.map(s => s.id));
          for (const s of filteredExtra) {
            if (!existingIds.has(s.id)) {
              pool.push(s);
              existingIds.add(s.id);
            }
          }
        } catch (e) {}
      }
    }
    
    if (pool.length === 0) throw new Error('No songs found matching the criteria.');

    // Fisher-Yates Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool;
  } catch (error) {
    console.error('Failed to fetch song pool:', error);
    throw error;
  }
}

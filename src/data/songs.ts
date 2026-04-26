import { fetchTopChartsMeta, resolveTracksWithPreview, searchItunes, type ItunesTrack } from '../services/itunes';
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
export const POLISH_VIP = [
  'Taco Hemingway', 'Mata', 'Bedoes', 'Kizo', 'White 2115', 'Oki', 'Szpaku',
  'Gibbs', 'Smolasty', 'Sobel', 'Quebonafide', 'Malik Montana', 'Young Leosia',
  'PRO8L3M', 'Pezet', 'Sokół', 'Avi', 'Guzior', 'Kukon', 'Miszel', 'Zdechły Osa'
];

export const GLOBAL_VIP = [
  'Drake', 'Kanye West', 'Travis Scott', 'Kendrick Lamar', 'The Weeknd',
  'Future', 'Metro Boomin', 'Gunna', 'Playboi Carti', 'Central Cee', 'Tyler, The Creator',
  'A$AP Rocky', 'J. Cole', '21 Savage', 'Lil Uzi Vert', 'Nicki Minaj',
  'Cardi B', 'Megan Thee Stallion', 'Doja Cat', 'Rihanna', 'Beyoncé',
  'Post Malone', 'Juice WRLD', 'XXXTENTACION', 'Sfera Ebbasta', 'Pop Smoke', 'Ice Spice'
];

export const BIASED_ARTISTS = [...POLISH_VIP, ...GLOBAL_VIP];

/** Curated gaming albums to ensure high-quality "Gaming" sessions */
export const GAMING_ALBUMS = [
  'The Witcher 3: Wild Hunt',
  'Cyberpunk 2077',
  'DOOM (Original Game Soundtrack)',
  'DOOM Eternal (Original Game Soundtrack)',
  'League of Legends',
  'Minecraft',
  'Minecraft - Volume Alpha',
  'Minecraft - Volume Beta',
  'Grand Theft Auto V',
  'Red Dead Redemption 2',
  'The Last of Us',
  'The Last of Us Part II',
  'God of War (Original Soundtrack)',
  'Elden Ring (Original Game Soundtrack)',
  'Final Fantasy VII Remake',
  'The Legend of Zelda: Breath of the Wild',
  'Super Mario Odyssey',
  'Skyrim (Original Game Soundtrack)',
  'Fallout 4 (Original Game Soundtrack)',
  'Halo: Combat Evolved',
  'Mass Effect',
  'Uncharted 4: A Thief\'s End',
  'Silent Hill 2',
  'Nier: Automata',
  'Hollow Knight',
  'Hollow Knight: Silksong'
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

export function isCuratedGamingAlbum(albumName: string): boolean {
  const lower = (albumName || '').toLowerCase();
  return GAMING_ALBUMS.some(curated => lower.includes(curated.toLowerCase()));
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

  // Reject common movie soundtrack keywords and streaming series
  if (
    album.includes('motion picture') ||
    album.includes('movie soundtrack') ||
    album.includes('from the film') ||
    album.includes('netflix')
  ) return false;

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

// Lista fraz, które dyskwalifikują utwór (mixy treningowe, karaoke, itp.)
const BANNED_KEYWORDS = [
  'workout',
  'fitness',
  'gym mix',
  'bpm',
  'karaoke',
  'instrumental version',
  'tribute to',
  'cover version',
  'unmixed',
  'lo-fi workout',
  'yoga music',
  'meditation music',
];

function isCleanTrack(song: Song): boolean {
  const title = song.title.toLowerCase();
  const album = (song.album || '').toLowerCase();
  const artist = song.artist.toLowerCase();

  return !BANNED_KEYWORDS.some(word =>
    title.includes(word) ||
    album.includes(word) ||
    artist.includes(word)
  );
}

// ─── Pool fetcher ─────────────────────────────────────────────────────────────

export async function fetchSongPool(mode: GameMode = 'global-all', artistQuery?: string): Promise<Song[]> {
  const modeConfig = MODE_CONFIG[mode];
  const isCharts = modeConfig.theme === 'charts';

  try {
    let pool: Song[] = [];

    if (mode === 'artist-discography') {
      if (!artistQuery) return [];
      // Fetch from both PL and US stores to get a comprehensive discography
      const [resultsPl, resultsUs] = await Promise.all([
        searchItunes(artistQuery, 200, 'pl', 'artistTerm'),
        searchItunes(artistQuery, 200, 'us', 'artistTerm')
      ]);
      
      const combined = [...resultsPl, ...resultsUs];
      const search = artistQuery.toLowerCase();
      
      const seenIds = new Set<number>();
      pool = combined
        .filter(t => {
          if (seenIds.has(t.trackId)) return false;
          seenIds.add(t.trackId);
          return true;
        })
        .map(itunesToSong)
        .filter(s => {
          const artist = s.artist.toLowerCase();
          const primaryArtist = artist.split(/&|,|\bfeat\.|\bft\.|\bwith\b/i)[0].trim();
          // Strict: the primary artist must be an EXACT match for the search term
          // This allows "Mata" and "Mata & White 2115", but rejects "Mata Mandir Singh"
          return primaryArtist === search;
        });
    } else if (isCharts) {
      // "Chart Toppers" category: Apple RSS only reliably serves 'topsongs' (max 100).
      // Supplement with search queries for variety and to pad the pool.
      const chartsQueries = modeConfig.region === 'polish'
        ? ['polskie przeboje', 'polska muzyka 2024']
        : ['top hits 2024', 'popular music'];

      const poolMeta = await fetchTopChartsMeta(100, modeConfig.country, undefined, 'topsongs');
      const selected = poolMeta.sort(() => Math.random() - 0.5).slice(0, 7);
      const gameTracks = await resolveTracksWithPreview(selected, modeConfig.country);

      const [rssResults, ...searchResults] = await Promise.all([
        Promise.resolve(gameTracks),
        ...chartsQueries.map(q => searchItunes(q, 100, modeConfig.country)),
      ]);

      const seenChartsIds = new Set<string>();
      [...rssResults, ...searchResults.flat()].forEach(t => {
        const id = String(t.trackId);
        if (!seenChartsIds.has(id)) {
          pool.push(itunesToSong(t));
          seenChartsIds.add(id);
        }
      });
    } else {
      // General/Hip-Hop/Gaming/Decades categories: Use search for broader, "evergreen" popular variety
      // We search for multiple broad terms to get a massive pool of ~400+ songs
      let queries: string[] = [];
      if (modeConfig.theme === 'decades') {
        if (mode === 'decades-80s') queries = ['80s smash hits', '1980s pop', '1980s rock', 'best of 80s', '80s classics'];
        else if (mode === 'decades-90s') queries = ['90s smash hits', '1990s pop', '90s r&b', 'best of 90s', '90s classics'];
        else if (mode === 'decades-00s') queries = ['2000s smash hits', '00s pop', '2000s r&b', 'best of 00s', '00s classics'];
        else if (mode === 'decades-10s') queries = ['2010s smash hits', '2010s pop', '2010s dance', 'best of 2010s'];
      } else if (modeConfig.theme === 'hiphop') {
        queries = modeConfig.region === 'polish' ? ['rap polski', 'hip hop pl', 'trap polska'] : ['best hip hop', 'rap hits', '90s rap'];
      } else if (modeConfig.theme === 'gaming') {
        queries = ['official video game soundtrack', 'original game score', 'video game music', 'nintendo music ost', 'gaming ost'];
      } else {
        queries = modeConfig.region === 'polish' ? ['polska muzyka', 'polskie hity', 'pop polska'] : ['popular songs', 'top hits', 'all time hits'];
      }

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
    pool = pool.filter(isCleanTrack);

    if (modeConfig.theme === 'hiphop') {
      pool = pool.filter(isHipHopSong);
    }
    if (modeConfig.theme === 'gaming') {
      pool = pool.filter(isGamingSong);
    }
    if (modeConfig.region === 'polish') {
      pool = pool.filter(isPolishSong);
    }

    // BIAS INJECTION: Ensure biased artists or curated albums are always present
    const biasedInPool = pool.filter(s => isBiasedArtist(s.artist));

    // For Gaming: Inject curated albums
    if (mode === 'artist-discography') {
      // No injection for artist-specific mode
    } else if (modeConfig.theme === 'gaming') {
      const shuffleAlbums = [...GAMING_ALBUMS].sort(() => Math.random() - 0.5);
      const targets = shuffleAlbums.slice(0, 10); // Inject 10 legendary albums

      for (const album of targets) {
        try {
          const extra = await searchItunes(album, 10, modeConfig.country);
          const filteredExtra = extra.map(itunesToSong).filter(s => isGamingSong(s) && isCleanTrack(s));

          const existingIds = new Set(pool.map(s => s.id));
          for (const s of filteredExtra) {
            if (!existingIds.has(s.id)) {
              pool.push(s);
              existingIds.add(s.id);
            }
          }
        } catch (e) { }
      }
    } else if (biasedInPool.length < 20) {
      // For Other: Inject biased artists
      const sourceList = modeConfig.region === 'polish' ? POLISH_VIP : GLOBAL_VIP;
      const shuffleBias = [...sourceList].sort(() => Math.random() - 0.5);
      const targets = shuffleBias.slice(0, 8); // Inject 8 random VIPs

      for (const artist of targets) {
        try {
          const extra = await searchItunes(artist, 5, modeConfig.country);
          const filteredExtra = extra.map(itunesToSong).filter(s => {
            if (!isCleanTrack(s)) return false;
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
        } catch (e) { }
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

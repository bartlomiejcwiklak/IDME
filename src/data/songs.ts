import { fetchTopChartsMeta, resolveTracksWithPreview, searchItunes, lookupArtistId, lookupArtistAlbums, lookupAlbumTracks, type ItunesTrack } from '../services/itunes';
import type { Song, GameMode } from '../types';
import { MODE_CONFIG } from './modes';

// ─── Banned Artists ───────────────────────────────────────────────────────────
// Artists listed here are NEVER included in any song pool.
// Add entries manually; matching is case-insensitive substring / word-boundary.
export const BANNED_ARTISTS: string[] = [
  // AI / generated music accounts — we never want these
  'AI',
  'A.I.',
];

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

/**
 * Curated VIP list for "Polish: Classics" mode.
 * 80% of picks are drawn from these legendary artists.
 * Add / remove artists here to tune the pool.
 */
export const POLISH_CLASSICS_VIP: string[] = [
  // Rock / Alternative
  'Dżem', 'Lady Pank', 'Strachy na Lachy', 'Kult', 'Perfect', 'T.Love',
  'Republika', 'Myslovitz', 'Happysad', 'Pidżama Porno', 'Wilki', 'Illusion',
  'Maanam', 'Budka Suflera', 'Lombard', 'Hey', 'Vader', 'Behemoth', 'Riverside',
  // Pop / Other
  'Czerwone Gitary', 'Maryla Rodowicz', 'Stanisław Sojka', 'Kayah',
  'Edyta Bartosiewicz', 'Anna Jantar', 'Bajm', 'Raz Dwa Trzy',
  // Hip-Hop classics (only the OGs)
  'Molesta Ewenement', 'WWO', 'Grammatik', 'Pezet', 'Sokół', 'Ostr',
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

/** Returns true if the artist matches any entry in BANNED_ARTISTS */
export function isBannedArtist(artistName: string): boolean {
  const lower = (artistName ?? '').toLowerCase();
  return BANNED_ARTISTS.some(banned => {
    const lowerBanned = banned.toLowerCase();
    // Exact word-boundary match so e.g. "AI" doesn't block "Billie"
    const escaped = lowerBanned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|\\()${escaped}(\\s|\\)|$)`, 'i');
    return regex.test(lower);
  });
}

export function isClassicsVIPArtist(artistName: string): boolean {
  const lower = (artistName ?? '').toLowerCase();
  return POLISH_CLASSICS_VIP.some(name => {
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

  const isInstrumental =
    title.includes('instrumental') ||
    title.includes('type beat') ||
    title.includes('beat only') ||
    title.includes('karaoke');

  if (isInstrumental) return false;

  return HIPHOP_GENRE_KEYWORDS.some((keyword) => genre.startsWith(keyword));
}

function isRockSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const title = (song.title ?? '').toLowerCase();
  if (title.includes('karaoke') || title.includes('instrumental')) return false;
  return genre.includes('rock') || genre.includes('metal') || genre.includes('punk') || genre.includes('alternative') || genre.includes('grunge');
}

function isElectronicSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const title = (song.title ?? '').toLowerCase();
  if (title.includes('karaoke') || title.includes('instrumental')) return false;
  return genre.includes('electronic') || genre.includes('dance') || genre.includes('house') || genre.includes('techno') || genre.includes('edm') || genre.includes('trance') || genre.includes('dubstep') || genre.includes('drum and bass');
}

function isPopSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const title = (song.title ?? '').toLowerCase();
  if (title.includes('karaoke') || title.includes('instrumental')) return false;
  return genre.startsWith('pop') || genre.includes('synth-pop') || genre.includes('k-pop') || genre.includes('dance pop');
}

function isIndieSong(song: Song): boolean {
  const genre = (song.genre ?? '').toLowerCase();
  const title = (song.title ?? '').toLowerCase();
  if (title.includes('karaoke') || title.includes('instrumental')) return false;
  return genre.includes('indie') || genre.includes('alternative') || genre.includes('art pop') || genre.includes('lo-fi') || genre.includes('shoegaze') || genre.includes('folk') || genre.includes('emo');
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
      const search = artistQuery.toLowerCase();

      // ── Strategy 1: iTunes Lookup API (complete discography) ──────────────────
      // Resolve artistId → all albumIds → all tracks per album.
      // This is the only way to guarantee full coverage regardless of popularity.
      const artistIdPl = await lookupArtistId(artistQuery, 'pl');
      const artistIdUs = await lookupArtistId(artistQuery, 'us');

      const albumIdSet = new Set<number>();
      if (artistIdPl) {
        const albums = await lookupArtistAlbums(artistIdPl, 'pl');
        albums.forEach(id => albumIdSet.add(id));
      }
      if (artistIdUs) {
        const albums = await lookupArtistAlbums(artistIdUs, 'us');
        albums.forEach(id => albumIdSet.add(id));
      }

      if (albumIdSet.size > 0) {
        // Fetch all tracks for every album in parallel
        const albumTrackArrays = await Promise.all(
          [...albumIdSet].map(albumId => lookupAlbumTracks(albumId, 'us').catch(() => [] as ItunesTrack[]))
        );
        const seenIds = new Set<number>();
        pool = albumTrackArrays
          .flat()
          .filter(t => {
            if (seenIds.has(t.trackId)) return false;
            seenIds.add(t.trackId);
            return true;
          })
          .map(itunesToSong)
          .filter(s => {
            const allArtists = s.artist
              .toLowerCase()
              .split(/&|,|\bfeat\.|\bft\.|\bwith\b/i)
              .map(a => a.trim());
            return allArtists.includes(search);
          });
      }

      // ── Strategy 2: Search fallback (catches features, fills gaps) ────────────
      // Search both "feat." and "ft." variants since iTunes is inconsistent in tagging.
      const [plFeat, usFeat, plFt, usFt] = await Promise.all([
        searchItunes(`feat. ${artistQuery}`, 200, 'pl'),
        searchItunes(`feat. ${artistQuery}`, 200, 'us'),
        searchItunes(`ft. ${artistQuery}`, 200, 'pl'),
        searchItunes(`ft. ${artistQuery}`, 200, 'us'),
      ]);

      const existingIds = new Set(pool.map(s => s.id));
      [...plFeat, ...usFeat, ...plFt, ...usFt].forEach(t => {
        if (existingIds.has(String(t.trackId))) return;
        const allArtists = (t.artistName ?? '')
          .toLowerCase()
          .split(/&|,|\bfeat\.|\bft\.|\bwith\b/i)
          .map(a => a.trim());
        if (allArtists.includes(search)) {
          pool.push(itunesToSong(t));
          existingIds.add(String(t.trackId));
        }
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
        if (mode === 'decades-80s') queries = ['80s greatest hits', '80s billboard', '1980s top 100', '1980s pop hits', '1980s rock hits'];
        else if (mode === 'decades-90s') queries = ['90s greatest hits', '90s billboard', '1990s top 100', '1990s pop hits', '1990s r&b hits'];
        else if (mode === 'decades-00s') queries = ['2000s greatest hits', '2000s billboard', '2000s top 100', '2000s pop hits', '2000s club hits'];
        else if (mode === 'decades-10s') queries = ['2010s greatest hits', '2010s billboard', '2010s top 100', '2010s pop hits', '2010s viral hits'];
      } else if (modeConfig.theme === 'hiphop') {
        queries = modeConfig.region === 'polish' ? ['rap polski', 'hip hop pl', 'trap polska'] : ['best hip hop', 'rap hits', '90s rap'];
      } else if (modeConfig.theme === 'gaming') {
        queries = ['official video game soundtrack', 'original game score', 'video game music', 'nintendo music ost', 'gaming ost'];
      } else if (modeConfig.theme === 'rock') {
        queries = ['classic rock hits', 'rock anthems', 'best rock songs', 'rock legends', 'arena rock hits', 'alternative rock hits'];
      } else if (modeConfig.theme === 'electronic') {
        queries = ['best edm songs', 'electronic dance music hits', 'house music classics', 'techno hits', 'dj hits', 'festival anthems'];
      } else if (modeConfig.theme === 'pop') {
        queries = ['best pop songs', 'pop hits all time', 'pop music classics', 'top pop songs', 'pop anthems', 'biggest pop hits'];
      } else if (modeConfig.theme === 'indie') {
        queries = ['indie hits', 'alternative indie songs', 'best indie rock', 'indie pop classics', 'alternative music hits', 'indie anthems'];
      } else if (modeConfig.theme === 'classics') {
        // Broad queries plus targeted VIP artist searches so we always have classics
        queries = [
          'polskie przeboje klasyki', 'polska muzyka lata 80', 'polska muzyka lata 90',
          'polska muzyka lata 2000', 'polskie hity retro', 'klasyki polskiej muzyki',
          'Dżem', 'Lady Pank', 'Strachy na Lachy', 'Kult', 'Perfect', 'Republika',
          'Maanam', 'Budka Suflera', 'T.Love', 'Happysad', 'Myslovitz', 'Hey',
        ];
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

    // Apply strict genre/language/date filters
    pool = pool.filter(isCleanTrack);

    // Remove any banned artists from the pool
    pool = pool.filter(s => !isBannedArtist(s.artist));

    if (modeConfig.theme === 'decades') {
      pool = pool.filter(s => {
        if (!s.releaseDate) return false;
        const year = new Date(s.releaseDate).getFullYear();
        if (mode === 'decades-80s') return year >= 1980 && year <= 1989;
        if (mode === 'decades-90s') return year >= 1990 && year <= 1999;
        if (mode === 'decades-00s') return year >= 2000 && year <= 2009;
        if (mode === 'decades-10s') return year >= 2010 && year <= 2019;
        return true;
      });
    }

    if (modeConfig.theme === 'hiphop') {
      pool = pool.filter(isHipHopSong);
    }
    if (modeConfig.theme === 'gaming') {
      pool = pool.filter(isGamingSong);
    }
    if (modeConfig.theme === 'rock') {
      pool = pool.filter(isRockSong);
    }
    if (modeConfig.theme === 'electronic') {
      pool = pool.filter(isElectronicSong);
    }
    if (modeConfig.theme === 'pop') {
      pool = pool.filter(isPopSong);
    }
    if (modeConfig.theme === 'indie') {
      pool = pool.filter(isIndieSong);
    }
    if (modeConfig.theme === 'classics') {
      // Polish Classics: Polish songs released before 2014
      pool = pool.filter(s => {
        if (!s.releaseDate) return false;
        const year = new Date(s.releaseDate).getFullYear();
        return year < 2014;
      });
    }
    if (modeConfig.region === 'polish') {
      pool = pool.filter(isPolishSong);
    }

    // BIAS INJECTION: Ensure biased artists or curated albums are always present
    const biasedInPool = pool.filter(s => isBiasedArtist(s.artist));

    // For Gaming: Inject curated albums
    if (mode === 'artist-discography' || modeConfig.theme === 'decades' || modeConfig.theme === 'classics'
      || modeConfig.theme === 'rock' || modeConfig.theme === 'electronic' || modeConfig.theme === 'pop' || modeConfig.theme === 'indie') {
      // No injection for artist-specific, decades, classics, or genre-specific modes
      // to preserve pool integrity and prevent cross-genre contamination
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

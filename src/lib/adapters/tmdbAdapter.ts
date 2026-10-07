import { ContentItem } from '@/types/content';

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export interface TmdbMovie {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }> | string[];
  popularity?: number;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export function tmdbAdapter(movie: TmdbMovie, isDemo = false): ContentItem {
  let genreNames: string[] = [];

  if (Array.isArray(movie.genres)) {
    genreNames = movie.genres.map((g) => (typeof g === 'string' ? g : g.name));
  } else if (Array.isArray(movie.genre_ids)) {
    genreNames = movie.genre_ids
      .map((id) => TMDB_GENRES[id])
      .filter((name): name is string => Boolean(name));
  }

  const primaryCategory = genreNames[0] || 'Entertainment';
  const ratingText = movie.vote_average ? ` ★ ${movie.vote_average.toFixed(1)}` : '';
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear().toString()
    : '';

  const imageUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : movie.backdrop_path
      ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}`
      : undefined;

  const hashtags = [
    'movies',
    primaryCategory.toLowerCase().replace(/[^a-z0-9]/g, ''),
    releaseYear ? `released${releaseYear}` : '',
  ].filter(Boolean);

  return {
    id: `movie-${movie.id}`,
    source: 'movie',
    title: `${movie.title}${releaseYear ? ` (${releaseYear})` : ''}`,
    description:
      movie.overview?.trim() ||
      'No overview available. Check out TMDB for complete cast and crew details.',
    imageUrl,
    url: `https://www.themoviedb.org/movie/${movie.id}`,
    category: primaryCategory.toLowerCase(),
    publishedAt: movie.release_date
      ? new Date(movie.release_date).toISOString()
      : new Date().toISOString(),
    author: `TMDB${ratingText}`,
    hashtags: Array.from(new Set(hashtags)),
    isDemo,
  };
}

export function mapTmdbMovies(movies: TmdbMovie[], isDemo = false): ContentItem[] {
  if (!Array.isArray(movies)) return [];
  return movies.filter((m) => m && m.title).map((m) => tmdbAdapter(m, isDemo));
}

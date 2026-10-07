import { tmdbAdapter, mapTmdbMovies, TmdbMovie } from '@/lib/adapters/tmdbAdapter';

describe('tmdbAdapter', () => {
  const sampleMovie: TmdbMovie = {
    id: 693134,
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with Chani and the Fremen.',
    poster_path: '/poster123.jpg',
    backdrop_path: '/backdrop456.jpg',
    release_date: '2024-02-27',
    vote_average: 8.245,
    vote_count: 5000,
    genre_ids: [878, 12],
    popularity: 450,
  };

  it('maps TmdbMovie to normalized ContentItem with full poster URL and genre names', () => {
    const item = tmdbAdapter(sampleMovie, false);

    expect(item.source).toBe('movie');
    expect(item.id).toBe('movie-693134');
    expect(item.title).toBe('Dune: Part Two (2024)');
    expect(item.description).toBe('Paul Atreides unites with Chani and the Fremen.');
    expect(item.imageUrl).toBe('https://image.tmdb.org/t/p/w500/poster123.jpg');
    expect(item.url).toBe('https://www.themoviedb.org/movie/693134');
    expect(item.category).toBe('science fiction');
    expect(item.author).toBe('TMDB ★ 8.2');
    expect(item.hashtags).toContain('movies');
    expect(item.hashtags).toContain('sciencefiction');
    expect(item.hashtags).toContain('released2024');
    expect(item.isDemo).toBe(false);
  });

  it('falls back to backdrop if poster is missing', () => {
    const movieWithoutPoster: TmdbMovie = {
      id: 99999,
      title: 'Indie Film',
      backdrop_path: '/backdrop_only.jpg',
      release_date: '2025-01-10',
    };

    const item = tmdbAdapter(movieWithoutPoster, true);
    expect(item.imageUrl).toBe('https://image.tmdb.org/t/p/w500/backdrop_only.jpg');
    expect(item.isDemo).toBe(true);
    expect(item.category).toBe('entertainment');
  });

  it('maps an array of movies safely', () => {
    const movies: TmdbMovie[] = [
      sampleMovie,
      // @ts-expect-error test invalid movie
      null,
      {
        id: 11111,
        title: 'Oppenheimer',
        genres: ['Drama', 'History'],
        release_date: '2023-07-21',
      },
    ];

    const results = mapTmdbMovies(movies);
    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('Dune: Part Two');
    expect(results[1].title).toContain('Oppenheimer');
  });
});

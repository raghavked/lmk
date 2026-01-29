import axios from 'axios';

interface TMDBSearchParams {
  query?: string;
  genre?: number;
  year?: number;
  page?: number;
}

export class TMDBAPI {
  private baseUrl = 'https://api.themoviedb.org/3';
  private apiKey: string;
  private imageBaseUrl = 'https://image.tmdb.org/t/p';
  
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY!;
  }
  
  async searchMovies(params: TMDBSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query: params.query,
          year: params.year,
          page: params.page || 1,
          include_adult: false,
        },
      });
      
      return response.data.results.map((m: any) => this.normalizeMovie(m));
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  }
  
  async searchTVShows(params: TMDBSearchParams) {
    try {
      const response = await axios.get(`${this.baseUrl}/search/tv`, {
        params: {
          api_key: this.apiKey,
          query: params.query,
          page: params.page || 1,
          include_adult: false,
        },
      });
      
      return response.data.results.map((tv: any) => this.normalizeTVShow(tv));
    } catch (error) {
      console.error('TMDB TV search error:', error);
      return [];
    }
  }
  
  async getPopularMovies(page: number = 1) {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/popular`, {
        params: {
          api_key: this.apiKey,
          page: page,
        },
      });
      
      return response.data.results.map((m: any) => this.normalizeMovie(m));
    } catch (error) {
      console.error('TMDB popular error:', error);
      return [];
    }
  }
  
  async getTrendingMovies() {
    try {
      const response = await axios.get(`${this.baseUrl}/trending/movie/week`, {
        params: {
          api_key: this.apiKey,
        },
      });
      
      return response.data.results.map((m: any) => this.normalizeMovie(m));
    } catch (error) {
      console.error('TMDB trending movies error:', error);
      return [];
    }
  }
  
  async getNowPlayingMovies() {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/now_playing`, {
        params: {
          api_key: this.apiKey,
          page: 1,
        },
      });
      
      return response.data.results.map((m: any) => this.normalizeMovie(m));
    } catch (error) {
      console.error('TMDB now playing error:', error);
      return [];
    }
  }
  
  async getTopRatedMovies() {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/top_rated`, {
        params: {
          api_key: this.apiKey,
          page: 1,
        },
      });
      
      return response.data.results.map((m: any) => this.normalizeMovie(m));
    } catch (error) {
      console.error('TMDB top rated movies error:', error);
      return [];
    }
  }
  
  async getAllMovieCategories() {
    const [trending, nowPlaying, popular, topRated] = await Promise.all([
      this.getTrendingMovies(),
      this.getNowPlayingMovies(),
      this.getPopularMovies(),
      this.getTopRatedMovies(),
    ]);
    
    return {
      trending: trending.slice(0, 10),
      nowPlaying: nowPlaying.slice(0, 10),
      popular: popular.slice(0, 10),
      topRated: topRated.slice(0, 10),
    };
  }
  
  async getPopularTVShows(page: number = 1) {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/popular`, {
        params: {
          api_key: this.apiKey,
          page: page,
        },
      });
      
      return response.data.results.map((tv: any) => this.normalizeTVShow(tv));
    } catch (error) {
      console.error('TMDB popular TV shows error:', error);
      return [];
    }
  }
  
  async getTrendingTVShows() {
    try {
      const response = await axios.get(`${this.baseUrl}/trending/tv/week`, {
        params: {
          api_key: this.apiKey,
        },
      });
      
      return response.data.results.map((tv: any) => this.normalizeTVShow(tv));
    } catch (error) {
      console.error('TMDB trending TV shows error:', error);
      return [];
    }
  }
  
  async getOnTheAirTVShows() {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/on_the_air`, {
        params: {
          api_key: this.apiKey,
          page: 1,
        },
      });
      
      return response.data.results.map((tv: any) => this.normalizeTVShow(tv));
    } catch (error) {
      console.error('TMDB on the air error:', error);
      return [];
    }
  }
  
  async getTopRatedTVShows() {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/top_rated`, {
        params: {
          api_key: this.apiKey,
          page: 1,
        },
      });
      
      return response.data.results.map((tv: any) => this.normalizeTVShow(tv));
    } catch (error) {
      console.error('TMDB top rated error:', error);
      return [];
    }
  }
  
  async getAllTVShowCategories() {
    const [trending, airing, popular, topRated] = await Promise.all([
      this.getTrendingTVShows(),
      this.getOnTheAirTVShows(),
      this.getPopularTVShows(),
      this.getTopRatedTVShows(),
    ]);
    
    return {
      trending: trending.slice(0, 10),
      airing: airing.slice(0, 10),
      popular: popular.slice(0, 10),
      topRated: topRated.slice(0, 10),
    };
  }
  
  async getMovieDetails(tmdbId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${tmdbId}`, {
        params: {
          api_key: this.apiKey,
          append_to_response: 'credits,images',
        },
      });
      
      return this.normalizeMovie(response.data, true);
    } catch (error) {
      console.error('TMDB movie details error:', error);
      return null;
    }
  }
  
  private normalizeMovie(movie: any, detailed = false) {
    const genres = movie.genres || [];
    const tags = genres.map((g: any) => g.name?.toLowerCase());
    
    return {
      id: `tmdb_movie_${movie.id}`, // Explicit ID for de-duplication
      category: 'movie',
      title: movie.title,
      description: movie.overview,
      primary_image: movie.poster_path ? {
        url: `${this.imageBaseUrl}/w500${movie.poster_path}`,
        width: 500,
        height: 750,
      } : null,
      secondary_images: detailed && movie.images?.backdrops ? 
        movie.images.backdrops.slice(0, 5).map((img: any) => ({
          url: `${this.imageBaseUrl}/w1280${img.file_path}`,
        })) : [],
      external_ids: {
        tmdb_id: movie.id,
        imdb_id: movie.imdb_id,
      },
      external_ratings: [{
        source: 'tmdb',
        score: movie.vote_average,
        count: movie.vote_count,
      }],
      vote_count: movie.vote_count,
      vote_average: movie.vote_average,
      genres: genres.map((g: any) => g.name),
      release_date: movie.release_date,
      tags,
      mood_tags: this.inferMoodTags(tags),
      time_commitment: movie.runtime ? {
        min_minutes: movie.runtime,
        max_minutes: movie.runtime,
        typical_minutes: movie.runtime,
      } : null,
      availability: {
        streaming_services: [],
      },
      source_links: [{
        type: 'website',
        url: `https://www.themoviedb.org/movie/${movie.id}`,
        label: 'View on TMDB',
      }],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
  
  private normalizeTVShow(tv: any, detailed = false) {
    const genres = tv.genres || [];
    const tags = genres.map((g: any) => g.name?.toLowerCase());
    
    return {
      id: `tmdb_tv_${tv.id}`, // Explicit ID for de-duplication
      category: 'tv_show',
      title: tv.name,
      description: tv.overview,
      primary_image: tv.poster_path ? {
        url: `${this.imageBaseUrl}/w500${tv.poster_path}`,
        width: 500,
        height: 750,
      } : null,
      secondary_images: detailed && tv.images?.backdrops ? 
        tv.images.backdrops.slice(0, 5).map((img: any) => ({
          url: `${this.imageBaseUrl}/w1280${img.file_path}`,
        })) : [],
      external_ids: {
        tmdb_id: tv.id,
      },
      external_ratings: [{
        source: 'tmdb',
        score: tv.vote_average,
        count: tv.vote_count,
      }],
      vote_count: tv.vote_count,
      vote_average: tv.vote_average,
      genres: genres.map((g: any) => g.name),
      first_air_date: tv.first_air_date,
      tags,
      mood_tags: this.inferMoodTags(tags),
      time_commitment: tv.episode_run_time?.[0] ? {
        min_minutes: tv.episode_run_time[0] * (tv.number_of_episodes || 1),
        max_minutes: tv.episode_run_time[0] * (tv.number_of_episodes || 1),
        typical_minutes: tv.episode_run_time[0],
      } : null,
      availability: {
        streaming_services: [],
      },
      source_links: [{
        type: 'website',
        url: `https://www.themoviedb.org/tv/${tv.id}`,
        label: 'View on TMDB',
      }],
      last_fetched: new Date().toISOString(),
      data_stale: false,
    };
  }
  
  private inferMoodTags(genres: string[]): string[] {
    const moodMap: Record<string, string[]> = {
      action: ['energetic', 'thrilling'],
      comedy: ['lighthearted', 'fun'],
      drama: ['thoughtful', 'emotional'],
      horror: ['scary', 'tense'],
      romance: ['romantic', 'cozy'],
      thriller: ['suspenseful', 'gripping'],
      documentary: ['educational', 'informative'],
      animation: ['fun', 'imaginative'],
      'science fiction': ['futuristic', 'thought-provoking'],
      fantasy: ['magical', 'adventurous'],
    };
    
    const moods = new Set<string>();
    for (const genre of genres) {
      const mapped = moodMap[genre?.toLowerCase()];
      if (mapped) {
        mapped.forEach(m => moods.add(m));
      }
    }
    
    return Array.from(moods);
  }
}

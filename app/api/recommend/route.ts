import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { YelpAPI } from '@/lib/api/yelp';
import { TMDBAPI } from '@/lib/api/tmdb';
import { YouTubeAPI } from '@/lib/api/youtube';
import { OpenLibraryAPI } from '@/lib/api/openLibrary';
import { AIRanker } from '@/lib/ranker';
import { Database } from '@/lib/types';

const yelpAPI = new YelpAPI();
const tmdbAPI = new TMDBAPI();
const youtubeAPI = new YouTubeAPI();
const openLibraryAPI = new OpenLibraryAPI();
const aiRanker = new AIRanker();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'restaurants';
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mode = searchParams.get('mode') || 'feed';

    // Location Parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius'); // in meters

    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const profile = profileData as any;

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let recommendations: any[] = [];

    // 1. Fetch raw data from APIs based on category
    switch (category) {
      case 'restaurants':
        recommendations = await yelpAPI.search({
          term: query || 'restaurants',
          latitude: lat ? parseFloat(lat) : (profile.location?.coordinates?.[0] || 37.7749),
          longitude: lng ? parseFloat(lng) : (profile.location?.coordinates?.[1] || -122.4194),
          radius: radius ? parseInt(radius) : 8000,
          limit,
          offset,
        });
        break;
      case 'movies':
        recommendations = await tmdbAPI.searchMovies({
          query: query || 'popular',
          page: Math.floor(offset / limit) + 1,
        });
        break;
      case 'tv_shows':
        recommendations = await tmdbAPI.searchTVShows({
          query: query || 'popular',
          page: Math.floor(offset / limit) + 1,
        });
        break;
      case 'youtube_videos':
        recommendations = await youtubeAPI.search({
          query: query || 'trending',
          maxResults: limit,
        });
        break;
      case 'reading':
        recommendations = await openLibraryAPI.getRecommendedBooks(
          profile.taste_profile || ['fiction'],
          limit
        );
        break;
      case 'activities':
        recommendations = await yelpAPI.search({
          term: query || 'activities',
          latitude: lat ? parseFloat(lat) : (profile.location?.coordinates?.[0] || 37.7749),
          longitude: lng ? parseFloat(lng) : (profile.location?.coordinates?.[1] || -122.4194),
          radius: radius ? parseInt(radius) : 8000,
          limit,
          offset,
          categories: 'active,arts,entertainment',
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // 2. Rank and score recommendations using AI
    const rankedRecommendations = await aiRanker.rank(
      recommendations,
      profile,
      {
        category,
        query,
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
        mode: mode as any,
      }
    );

    return NextResponse.json({ results: rankedRecommendations });

  } catch (error) {
    console.error('Recommendation API Error:', error);
    return NextResponse.json({ error: 'Error loading recommendations' }, { status: 500 });
  }
}

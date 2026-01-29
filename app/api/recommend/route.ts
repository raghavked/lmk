import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { YelpAPI } from '@/lib/api/yelp';
import { TMDBAPI } from '@/lib/api/tmdb';
import { YouTubeAPI } from '@/lib/api/youtube';
import { ArticlesAPI } from '@/lib/api/articles';
import { OpenLibraryAPI } from '@/lib/api/openLibrary';
import { AIRanker } from '@/lib/ai/ranker';
import { getSocialSignals } from '@/lib/socialSignals';
import { Database } from '@/lib/types';

const yelpAPI = new YelpAPI();
const tmdbAPI = new TMDBAPI();
const youtubeAPI = new YouTubeAPI();
const articlesAPI = new ArticlesAPI();
const openLibraryAPI = new OpenLibraryAPI();
const aiRanker = new AIRanker();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mode = searchParams.get('mode') || 'feed';

    // Location Parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius'); // in meters

    // FIX: Correctly use cookies() from next/headers and pass it to createRouteHandlerClient
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('taste_profile, preferences_completed')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.taste_profile) {
      return NextResponse.json({ error: 'User profile or taste profile not found' }, { status: 404 });
    }

    let recommendations: any[] = [];

    // 1. Fetch raw data from APIs based on category and user profile
    switch (category) {
      case 'restaurants':
        recommendations = await yelpAPI.getRecommendations({
          query,
          lat: lat ? parseFloat(lat) : undefined,
          lng: lng ? parseFloat(lng) : undefined,
          radius: radius ? parseInt(radius) : undefined,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
        });
        break;
      case 'movies':
        recommendations = await tmdbAPI.getRecommendations({
          query,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
        });
        break;
      case 'tv_shows':
        recommendations = await tmdbAPI.getRecommendations({
          query,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
          type: 'tv',
        });
        break;
      case 'youtube_videos':
        recommendations = await youtubeAPI.getRecommendations({
          query,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
        });
        break;
      case 'reading':
        recommendations = await openLibraryAPI.getRecommendations({
          query,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
        });
        break;
      case 'activities':
        recommendations = await articlesAPI.getRecommendations({
          query,
          limit,
          offset,
          tasteProfile: profile.taste_profile,
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // 2. Rank and score recommendations using AI
    const rankedRecommendations = await aiRanker.rankAndScore({
      recommendations,
      tasteProfile: profile.taste_profile,
      category: category as any,
    });

    // 3. Apply social signals (Friends mode logic)
    if (mode === 'friends') {
      for (const rec of rankedRecommendations) {
        rec.socialSignals = await getSocialSignals(supabase, user.id, rec.id);
      }
    }

    return NextResponse.json({ results: rankedRecommendations });

  } catch (error) {
    console.error('Recommendation API Error:', error);
    return NextResponse.json({ error: 'Error loading recommendations - The string did not match the expected pattern' }, { status: 500 });
  }
}

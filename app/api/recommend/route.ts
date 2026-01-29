import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { AIRanker } from '@/lib/ai/ranker';
import { YelpAPI } from '@/lib/api/yelp';
import { TMDBAPI } from '@/lib/api/tmdb';
import { YouTubeAPI } from '@/lib/api/youtube';
import { OpenLibraryAPI } from '@/lib/api/openLibrary';
import { ActivitiesAPI } from '@/lib/api/activities';

const API_MAP: Record<string, any> = {
  restaurants: YelpAPI,
  movies: TMDBAPI,
  tv_shows: TMDBAPI,
  youtube_videos: YouTubeAPI,
  reading: OpenLibraryAPI,
  activities: ActivitiesAPI,
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const category = requestUrl.searchParams.get('category') || 'restaurants';
  const limit = parseInt(requestUrl.searchParams.get('limit') || '10', 10);
  const offset = parseInt(requestUrl.searchParams.get('offset') || '0', 10);
  const tasteProfileParam = requestUrl.searchParams.get('taste_profile');
  let tasteProfile = [];
  
  try {
    tasteProfile = tasteProfileParam ? JSON.parse(tasteProfileParam) : [];
  } catch (e) {
    console.warn('Failed to parse taste_profile:', e);
    tasteProfile = [];
  }
  
  const seenIds = requestUrl.searchParams.get('seen_ids')?.split(',').filter(Boolean) || [];

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[Recommend API] Starting recommendation fetch for category: ${category}`);
    
    // 1. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    let finalProfile = profile;
    if (profileError && profileError.code === 'PGRST116') {
      console.warn('Profile not found, creating new profile...');
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, full_name: session.user.user_metadata?.full_name || '' })
        .select('*')
        .single();
      if (newProfileError) {
        console.error('Error creating profile:', newProfileError);
        return NextResponse.json({ error: 'Error creating user profile' }, { status: 500 });
      }
      finalProfile = newProfile;
    } else if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Error fetching user profile' }, { status: 500 });
    }

    // 2. Get Raw Recommendations
    const ApiClass = API_MAP[category];
    if (!ApiClass) {
      console.error(`Unsupported category: ${category}`);
      return NextResponse.json({ error: `Unsupported category: ${category}` }, { status: 400 });
    }

    console.log(`[Recommend API] Fetching raw recommendations from ${category} API...`);
    const apiInstance = new ApiClass();
    const profileWithTaste = { 
      ...finalProfile, 
      taste_profile: finalProfile?.taste_profile || tasteProfile 
    };

    let rawRecommendations = [];
    try {
      rawRecommendations = await apiInstance.getRecommendations({
        category,
        limit,
        offset,
        seenIds,
        profile: profileWithTaste as any,
      });
    } catch (apiError) {
      console.error(`Error fetching from ${category} API:`, apiError);
      // Return empty results instead of crashing
      rawRecommendations = [];
    }

    console.log(`[Recommend API] Got ${rawRecommendations.length} raw recommendations`);

    // If no raw recommendations, return empty results
    if (!rawRecommendations || rawRecommendations.length === 0) {
      console.warn(`[Recommend API] No recommendations found for category: ${category}`);
      return NextResponse.json({ results: [] });
    }

    // 3. Rank Recommendations
    console.log(`[Recommend API] Starting AI ranking...`);
    const ranker = new AIRanker();
    const lat = requestUrl.searchParams.get('lat');
    const lng = requestUrl.searchParams.get('lng');
    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    
    let rankedResults = [];
    try {
      rankedResults = await ranker.rank(
        rawRecommendations,
        profileWithTaste as any,
        {
          category,
          mode: (requestUrl.searchParams.get('mode') as any) || 'feed',
          location,
        }
      );
    } catch (rankError) {
      console.error('Error during AI ranking:', rankError);
      // Fallback to unranked results
      rankedResults = rawRecommendations.map((obj: any, idx: number) => ({
        rank: idx + 1,
        object: obj,
        personalized_score: 8.0,
        explanation: {
          hook: 'Recommended for you',
          why_youll_like: `A great match based on your interests.`,
          tagline: obj.title || 'Recommendation',
          tags: obj.tags || [],
        },
      }));
    }

    console.log(`[Recommend API] Returning ${rankedResults.length} ranked results`);
    return NextResponse.json({ results: rankedResults });
  } catch (error) {
    console.error('[Recommend API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

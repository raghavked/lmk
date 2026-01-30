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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const category = requestUrl.searchParams.get('category') || 'restaurants';
  const limit = parseInt(requestUrl.searchParams.get('limit') || '10', 10);
  const offset = parseInt(requestUrl.searchParams.get('offset') || '0', 10);
  const query = requestUrl.searchParams.get('query') || '';
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

    const lat = requestUrl.searchParams.get('lat');
    const lng = requestUrl.searchParams.get('lng');
    const radius = requestUrl.searchParams.get('radius');

    let rawRecommendations = [];
    try {
      rawRecommendations = await apiInstance.getRecommendations({
        category,
        limit,
        offset,
        seenIds,
        query,
        profile: profileWithTaste as any,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radius: radius ? parseInt(radius) : undefined,
      });
    } catch (apiError) {
      console.error(`Error fetching from ${category} API:`, apiError);
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
    const sortBy = requestUrl.searchParams.get('sort_by') || 'personalized_score';
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const location = (userLat !== null && userLng !== null) ? { lat: userLat, lng: userLng } : undefined;
    
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

    // Add distance to each result if user location is available
    const radiusInMiles = radius ? parseInt(radius) / 1609 : null;
    
    if (userLat !== null && userLng !== null) {
      rankedResults = rankedResults.map((result: any) => {
        const obj = result.object || result;
        const coords = obj.location?.coordinates;
        const objLat = obj.location?.lat;
        const objLng = obj.location?.lng;
        let distance = null;
        
        if (coords && coords[0] !== undefined && coords[1] !== undefined) {
          distance = calculateDistance(userLat, userLng, coords[0], coords[1]);
        } else if (objLat !== undefined && objLng !== undefined) {
          distance = calculateDistance(userLat, userLng, objLat, objLng);
        }
        
        return {
          ...result,
          distance,
        };
      });
      
      // Filter out results that exceed the user's distance filter (only for location-based categories)
      if (radiusInMiles !== null && (category === 'restaurants' || category === 'activities')) {
        const beforeCount = rankedResults.length;
        rankedResults = rankedResults.filter((result: any) => {
          if (result.distance === null) return true;
          return result.distance <= radiusInMiles;
        });
        console.log(`[Recommend API] Filtered by distance: ${beforeCount} -> ${rankedResults.length} (max ${radiusInMiles} mi)`);
      }
    }

    // Apply sorting based on sort_by parameter
    if (sortBy === 'distance' && userLat !== null && userLng !== null) {
      rankedResults.sort((a: any, b: any) => {
        const distA = a.distance ?? Infinity;
        const distB = b.distance ?? Infinity;
        return distA - distB;
      });
    } else if (sortBy === 'rating') {
      rankedResults.sort((a: any, b: any) => {
        const obj_a = a.object || a;
        const obj_b = b.object || b;
        const ratingA = obj_a.rating || obj_a.vote_average || obj_a.external_ratings?.[0]?.score || 0;
        const ratingB = obj_b.rating || obj_b.vote_average || obj_b.external_ratings?.[0]?.score || 0;
        return ratingB - ratingA;
      });
    } else if (sortBy === 'reviews') {
      rankedResults.sort((a: any, b: any) => {
        const obj_a = a.object || a;
        const obj_b = b.object || b;
        const countA = obj_a.review_count || obj_a.vote_count || obj_a.external_ratings?.[0]?.count || 0;
        const countB = obj_b.review_count || obj_b.vote_count || obj_b.external_ratings?.[0]?.count || 0;
        return countB - countA;
      });
    }
    // Default: personalized_score (already sorted by AI ranker)

    // Re-assign ranks after sorting
    rankedResults = rankedResults.map((result: any, idx: number) => ({
      ...result,
      rank: idx + 1,
    }));

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

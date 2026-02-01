import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
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

const recommendationCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(category: string, lat?: string | null, lng?: string | null, radius?: string | null, query?: string): string {
  return `${category}:${lat || ''}:${lng || ''}:${radius || ''}:${query || ''}`;
}

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

  // Support both cookie-based auth (web) and Bearer token auth (mobile)
  const authHeader = request.headers.get('Authorization');
  const xAuthToken = request.headers.get('X-Auth-Token');
  let supabase;
  let session;

  // Debug: Log all headers to see what's being sent
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-auth-token') {
      allHeaders[key] = `${value.substring(0, 20)}...`;
    } else {
      allHeaders[key] = value;
    }
  });
  console.log('[API] Request headers:', JSON.stringify(allHeaders));
  console.log('[API] Auth header:', authHeader ? `present` : 'missing');
  console.log('[API] X-Auth-Token:', xAuthToken ? `present (len: ${xAuthToken.length})` : 'missing');

  // Try Bearer token first, then X-Auth-Token as fallback
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;

  if (token) {
    // Mobile app authentication with Bearer token or X-Auth-Token
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Create client with service role for database access
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Validate the JWT token
    const { data, error } = await adminClient.auth.getUser(token);
    
    if (error) {
      console.error('[API] Token validation error:', error.message, error.status);
      return NextResponse.json({ error: 'Unauthorized', details: error.message }, { status: 401 });
    }
    
    if (!data.user) {
      console.error('[API] No user found in token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    supabase = adminClient;
    session = { user: data.user, access_token: token };
  } else {
    // Web app authentication with cookies
    const cookieStore = await cookies();
    supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  if (!session) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      debug: { 
        hasAuthHeader: !!authHeader,
        authHeaderStart: authHeader?.substring(0, 15) || 'none'
      }
    }, { status: 401 });
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

    const lat = requestUrl.searchParams.get('lat');
    const lng = requestUrl.searchParams.get('lng');
    const radius = requestUrl.searchParams.get('radius');
    const cacheKey = getCacheKey(category, lat, lng, radius, query);
    const cached = recommendationCache.get(cacheKey);
    const now = Date.now();

    const profileWithTaste = { 
      ...finalProfile, 
      taste_profile: finalProfile?.taste_profile || tasteProfile 
    };

    let rawRecommendations = [];
    
    const fetchFromAPI = async (fetchLimit: number) => {
      const apiInstance = new ApiClass();
      return await apiInstance.getRecommendations({
        category,
        limit: fetchLimit,
        offset: 0,
        seenIds: [],
        query,
        profile: profileWithTaste as any,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radius: radius ? parseInt(radius) : undefined,
      });
    };

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`[Recommend API] Using cached data for ${category}`);
      rawRecommendations = [...cached.data];
    } else {
      console.log(`[Recommend API] Fetching fresh recommendations from ${category} API...`);
      try {
        rawRecommendations = await fetchFromAPI(50);
        recommendationCache.set(cacheKey, { data: rawRecommendations, timestamp: now });
      } catch (apiError) {
        console.error(`Error fetching from ${category} API:`, apiError);
        rawRecommendations = [];
      }
    }

    if (seenIds.length > 0) {
      rawRecommendations = rawRecommendations.filter((r: any) => !seenIds.includes(r.id));
    }
    
    const seenSet = new Set(seenIds);
    const uniqueResults: any[] = [];
    const resultIds = new Set<string>();
    
    for (const item of rawRecommendations) {
      const itemId = String(item.id);
      if (!seenSet.has(itemId) && !resultIds.has(itemId)) {
        uniqueResults.push(item);
        resultIds.add(itemId);
      }
    }
    rawRecommendations = uniqueResults;

    console.log(`[Recommend API] Got ${rawRecommendations.length} recommendations after filtering (excluded ${seenIds.length} seen)`);
    
    if (rawRecommendations.length < limit) {
      console.log(`[Recommend API] Not enough items (${rawRecommendations.length}/${limit}), fetching more...`);
      try {
        const moreItems = await fetchFromAPI(50);
        for (const item of moreItems) {
          const itemId = String(item.id);
          if (!seenSet.has(itemId) && !resultIds.has(itemId)) {
            rawRecommendations.push(item);
            resultIds.add(itemId);
            if (rawRecommendations.length >= limit) break;
          }
        }
        recommendationCache.set(cacheKey, { data: moreItems, timestamp: now });
      } catch (e) {
        console.error('Error fetching more items:', e);
      }
    }
    
    rawRecommendations = rawRecommendations.slice(0, limit);

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
      console.log(`[Recommend API] User location: ${userLat}, ${userLng}`);
      
      rankedResults = rankedResults.map((result: any) => {
        const obj = result.object || result;
        const coords = obj.location?.coordinates;
        const objLat = obj.location?.lat;
        const objLng = obj.location?.lng;
        let distance = null;
        
        // Use lat/lng properties first (more reliable), then fall back to coordinates array
        if (objLat !== undefined && objLng !== undefined) {
          distance = calculateDistance(userLat, userLng, objLat, objLng);
        } else if (coords && coords[0] !== undefined && coords[1] !== undefined) {
          distance = calculateDistance(userLat, userLng, coords[0], coords[1]);
        }
        
        return {
          ...result,
          distance,
        };
      });
      
      // Log first result's location for debugging
      if (rankedResults.length > 0) {
        const firstObj = rankedResults[0].object || rankedResults[0];
        console.log(`[Recommend API] First result location: lat=${firstObj.location?.lat}, lng=${firstObj.location?.lng}, distance=${rankedResults[0].distance?.toFixed(2)} mi`);
      }
      
      // Filter by distance with generous tolerance (2x) since Yelp doesn't respect radius strictly
      // This ensures users don't see wildly out-of-range results while still showing nearby options
      if (radiusInMiles !== null && (category === 'restaurants' || category === 'activities')) {
        const beforeCount = rankedResults.length;
        const filterRadius = radiusInMiles * 2; // Allow 2x tolerance for Yelp's approximations
        rankedResults = rankedResults.filter((result: any) => {
          if (result.distance === null) return true;
          return result.distance <= filterRadius;
        });
        console.log(`[Recommend API] Filtered by distance: ${beforeCount} -> ${rankedResults.length} (requested ${radiusInMiles} mi, tolerance ${filterRadius.toFixed(1)} mi)`);
      } else {
        console.log(`[Recommend API] Distance calculated for ${rankedResults.length} results (no filtering applied)`);
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

    // Apply offset-based pagination
    const paginatedResults = rankedResults.slice(offset, offset + limit);

    console.log(`[Recommend API] Returning ${paginatedResults.length} results (offset: ${offset}, limit: ${limit}, total: ${rankedResults.length})`);
    return NextResponse.json({ 
      results: paginatedResults,
      total: rankedResults.length,
      offset,
      limit,
      hasMore: offset + limit < rankedResults.length,
    });
  } catch (error) {
    console.error('[Recommend API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

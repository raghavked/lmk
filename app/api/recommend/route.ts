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
		    const limit = parseInt(searchParams.get('limit') || '10'); // Default to 10 for faster initial load
	    const offset = parseInt(searchParams.get('offset') || '0'); // New offset parameter
	    const mode = searchParams.get('mode') || 'feed';
    
    // Location Parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius'); // in meters

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          taste_profile: []
        })
        .select()
        .single();
      profile = newProfile || { id: user.id, full_name: 'User', taste_profile: [] };
    }

    // Determine category
    let finalCategory: string | null = category;
    if (!finalCategory && query) {
      finalCategory = inferCategory(query) || null;
    }

    // Fetch objects
    let objects: any[] = [];
    const searchLat = lat ? parseFloat(lat) : profile.location?.coordinates?.[0] || 34.0522;
    const searchLng = lng ? parseFloat(lng) : profile.location?.coordinates?.[1] || -118.2437;
    const searchRadius = radius ? parseInt(radius) : 16090; // Default 10 miles

    try {
      // Over-fetch to ensure we have enough items after filtering out seen ones
      const fetchLimit = limit * 3; // Fetch 3x the requested limit
      
      if (finalCategory === 'restaurants' || finalCategory === 'restaurant') {
		        objects = await yelpAPI.search({
		          latitude: searchLat,
		          longitude: searchLng,
		          radius: Math.min(searchRadius, 40000), // Yelp max is 40km
		          term: query || 'restaurant',
		          limit: fetchLimit, // Over-fetch to account for filtering
		          offset: offset, // Use offset for pagination
		          sort_by: 'distance',
		        });
      } else if (finalCategory === 'movies' || finalCategory === 'movie') {
        objects = query 
          ? await tmdbAPI.searchMovies({ query, page: Math.floor(offset / fetchLimit) + 1 }) // Use fetchLimit for page calculation
          : await tmdbAPI.getPopularMovies(Math.floor(offset / fetchLimit) + 1);
      } else if (finalCategory === 'tv_shows' || finalCategory === 'tv_show' || finalCategory === 'shows') {
        objects = query 
          ? await tmdbAPI.searchTVShows({ query, page: Math.floor(offset / fetchLimit) + 1 })
          : await tmdbAPI.getPopularTVShows(Math.floor(offset / fetchLimit) + 1);
	      } else if (finalCategory === 'youtube_videos' || finalCategory === 'youtube') {
		        // YouTube API does not support offset, so we'll fetch a larger set and slice
		        objects = await youtubeAPI.search({ query: query || 'trending', maxResults: fetchLimit + offset }); // Over-fetch to account for filtering
      } else if (finalCategory === 'reading' || finalCategory === 'article') {
        // Mix articles and book recommendations based on user profile
        const tasteProfile = profile?.taste_profile || [];
	        const [articles, books] = await Promise.all([
		          query 
		            ? articlesAPI.search({ query, pageSize: Math.ceil(fetchLimit / 2) }) // Over-fetch to account for filtering
		            : articlesAPI.getTopHeadlines({ pageSize: Math.ceil(fetchLimit / 2) }),
		          openLibraryAPI.getRecommendedBooks(tasteProfile, Math.ceil(fetchLimit / 2)) // Over-fetch to account for filtering
	        ]);
	        objects = [...articles, ...books];
      } else if (finalCategory === 'activities' || finalCategory === 'activity') {
        objects = await yelpAPI.search({
          latitude: searchLat,
          longitude: searchLng,
          radius: Math.min(searchRadius, 40000),
		          term: query || 'activities',
		          categories: 'active',
		          limit: fetchLimit, // Over-fetch to account for filtering
		          offset: offset, // Use offset for pagination
		          sort_by: 'distance',
	        });
      } else {
	        // The 'all' category has been removed. This block should not be reached.
		        // Defaulting to movies if no category is specified.
		        objects = await tmdbAPI.getPopularMovies(Math.floor(offset / fetchLimit) + 1);
		        finalCategory = 'movies';
	      }
    } catch (apiError) {
      console.error('External API error:', apiError);
      objects = getMockData(finalCategory || 'movies');
    }

			    // Filter out objects already seen to prevent duplicates
			    const seenIds = searchParams.get('seen_ids')?.split(',').filter(Boolean) || [];
			    console.log('--- Filtering Debug ---');
			    console.log('Seen IDs from client:', seenIds);
			    console.log('Total objects fetched:', objects.length);
			    console.log('First 5 object IDs:', objects.slice(0, 5).map((o: any) => o.id));
			    let filteredObjects = objects.filter(obj => !seenIds.includes(obj.id));
			    console.log('Objects after filtering:', filteredObjects.length);
			    
			    // CRITICAL: Slice the objects *before* ranking to only rank the requested page
			    const objectsToRank = filteredObjects.slice(0, limit);
			    
			    if (objectsToRank.length === 0) {
			      filteredObjects = getMockData(finalCategory || 'movies');
			    }
			
				    // CRITICAL: Ensure the object structure is clean before passing to AIRanker
				    // The AIRanker now extracts factual data points itself from the object structure.
				    // We ensure the object is passed as is, with all its API-derived properties.
				    // No change needed here as the object already contains the necessary properties (price, review_count, genres, etc.)
				    // The new AIRanker is designed to pull the facts from the existing object structure.
			
			    // Get social signals concurrently (cached for performance)
			    let friendRatings = [];
			    let socialSignals = null;
			    
			    // Only fetch social signals on initial load (offset === 0) to improve pagination performance
			    if (offset === 0) {
			      [friendRatings, socialSignals] = await Promise.all([
			        getFriendRatings(supabase, user.id),
			        getSocialSignals(supabase, user.id, profile.taste_profile),
			      ]);
			    }
			    
			    // Use AIRanker
			    console.log('--- Data sent to AIRanker (First 2 objects) ---');
			    console.log(JSON.stringify(objectsToRank.slice(0, 2), null, 2));
			    console.log('-------------------------------------------------');
			    const rankedResults = await aiRanker.rank(objectsToRank, profile, {
			      category: finalCategory!,
			      query,
			      friendRatings,
			      socialSignals, // Pass social signals to the ranker
			      mode: mode as any,
			      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined
			    });
			
			    // The results are already sliced to the correct limit, no need for final slice
			    return NextResponse.json({ 
			      results: rankedResults,
			      category: finalCategory,
			      mode,
			    });

  } catch (error: any) {
    console.error('Recommend API GET error:', error);
    return NextResponse.json({ 
      results: getMockData('movies').map((obj, i) => ({
        rank: i + 1,
        object: obj,
        personalized_score: 8.5,
        explanation: { why_youll_like: "Recommended for you" }
      })),
      error: 'Internal server error', 
      message: error.message 
    }, { status: 200 });
  }
}

async function getFriendRatings(supabase: any, userId: string) {
  try {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .eq('status', 'accepted');
    
    if (!friendships || friendships.length === 0) return [];
    
    const friendIds = friendships.map((f: any) => 
      f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
    );
    
    const { data: ratings } = await supabase
      .from('ratings')
      .select(`
        id,
        object_id,
        user_id,
        score,
        feedback,
        profiles:user_id (full_name, profile_image)
      `)
      .in('user_id', friendIds)
      .eq('is_public', true);
    
    return ratings || [];
  } catch (e) {
    return [];
  }
}

function inferCategory(query: string): string | undefined {
  const q = query.toLowerCase();
  if (/(restaurant|food|eat|dinner|lunch|breakfast|pizza|sushi|burger)/i.test(q)) return 'restaurants';
  if (/(movie|film|watch|cinema)/i.test(q)) return 'movies';
  if (/(show|series|tv|episode|season)/i.test(q)) return 'tv_shows';
  if (/(article|read|blog|news)/i.test(q)) return 'reading';
  if (/(video|youtube|watch|channel)/i.test(q)) return 'youtube_videos';
  if (/(do|activity|things to|fun|experience)/i.test(q)) return 'activities';
  return undefined;
}

function getMockData(category: string): any[] {
  const mockMovies = [
    {
      category: 'movie',
      title: 'Inception',
      description: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
      primary_image: { url: 'https://image.tmdb.org/t/p/w500/9gk7Fn9sSAsS969O9oq6STo3mOV.jpg' },
      tags: ['Sci-Fi', 'Action', 'Thriller'],
      external_ratings: [{ source: 'tmdb', score: 8.4 }]
    }
  ];

  const mockRestaurants = [
    {
      category: 'restaurant',
      title: 'Pasta Palace',
      description: 'Authentic Italian pasta and wine.',
      primary_image: { url: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856' },
      tags: ['Italian', 'Pasta', 'Wine'],
      location: { city: 'Los Angeles', state: 'CA' },
      external_ratings: [{ source: 'yelp', score: 4.5 }]
    }
  ];

  if (category === 'restaurants' || category === 'restaurant') return mockRestaurants;
  return mockMovies;
}

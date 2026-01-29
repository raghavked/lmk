import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { AIRanker } from '@/lib/ai/ranker';
import { YelpAPI } from '@/lib/api/yelp';
import { TMDBAPI } from '@/lib/api/tmdb';
import { YouTubeAPI } from '@/lib/api/youtube';
import { OpenLibraryAPI } from '@/lib/api/openLibrary';
const API_MAP: Record<string, any> = {
  restaurants: YelpAPI,
  movies: TMDBAPI,
  tv_shows: TMDBAPI,
  youtube_videos: YouTubeAPI,
  reading: OpenLibraryAPI,
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const category = requestUrl.searchParams.get('category') || 'restaurants';
  const limit = parseInt(requestUrl.searchParams.get('limit') || '10', 10);
  const offset = parseInt(requestUrl.searchParams.get('offset') || '0', 10);
  const seenIds = requestUrl.searchParams.get('seen_ids')?.split(',') || [];

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    let finalProfile = profile;
    if (profileError && profileError.code === 'PGRST116') {
      console.warn('Profile not found in API, creating new profile...');
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, full_name: session.user.user_metadata.full_name || '' })
        .select('*')
        .single();
      if (newProfileError) {
        console.error('Error creating profile in API:', newProfileError);
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
      return NextResponse.json({ error: `Unsupported category: ${category}` }, { status: 400 });
    }

    const apiInstance = new ApiClass();
    const rawRecommendations = await apiInstance.getRecommendations({
      category,
      limit,
      offset,
      seenIds,
      profile: finalProfile as any,
    });

    // 3. Rank Recommendations
    const ranker = new AIRanker();
    const rankedResults = await ranker.rank(
      rawRecommendations,
      finalProfile as any,
      {
        category,
        mode: 'feed',
      }
    );

    return NextResponse.json({ results: rankedResults });
  } catch (error) {
    console.error('Recommendation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

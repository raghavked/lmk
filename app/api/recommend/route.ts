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

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<any>({ cookies: () => cookieStore });

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

    if (profileError) {
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
      profile: profile as any, // Use any to bypass the strict type check for now
    });

    // 3. Rank Recommendations
    const ranker = new AIRanker();
    const rankedResults = await ranker.rank(
      rawRecommendations,
      profile as any,
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

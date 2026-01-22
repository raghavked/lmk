import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get friend IDs
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .eq('status', 'accepted');
    
    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ feed: [], hasMore: false });
    }
    
    const friendIds = friendships.map((f: any) =>
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    );
    
    // Get friend activity (ratings)
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(`
        id,
        created_at,
        score,
        feedback,
        is_favorite,
        user_id,
        object_id,
        profiles:user_id (
          id,
          display_name,
          profile_image,
          username
        ),
        objects:object_id (
          id,
          category,
          title,
          description,
          primary_image,
          tags,
          external_ratings
        )
      `)
      .in('user_id', friendIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    // Format feed items
    const feed = (ratings || []).map((rating: any) => ({
      id: rating.id,
      type: rating.is_favorite ? 'favorite' : 'rating',
      created_at: rating.created_at,
      user: {
        id: rating.profiles.id,
        display_name: rating.profiles.display_name,
        username: rating.profiles.username,
        profile_image: rating.profiles.profile_image,
      },
      object: {
        id: rating.objects.id,
        category: rating.objects.category,
        title: rating.objects.title,
        description: rating.objects.description,
        image: rating.objects.primary_image,
        tags: rating.objects.tags,
      },
      rating: {
        score: rating.score,
        feedback: rating.feedback,
      },
    }));
    
    return NextResponse.json({
      feed,
      hasMore: ratings?.length === limit,
      offset: offset + limit,
    });
  } catch (error: any) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

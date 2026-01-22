import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { objectId, score, feedback, context, isPublic = true, isFavorite = false } = body;
    
    if (!objectId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if object exists
    const { data: object } = await supabase
      .from('objects')
      .select('id, category')
      .eq('id', objectId)
      .single();
    
    if (!object) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }
    
    // Upsert rating
    const { data: rating, error: ratingError } = await supabase
      .from('ratings')
      .upsert({
        user_id: user.id,
        object_id: objectId,
        score,
        feedback,
        context,
        is_public: isPublic,
        is_favorite: isFavorite,
      }, {
        onConflict: 'user_id,object_id',
      })
      .select()
      .single();
    
    if (ratingError) {
      return NextResponse.json({ error: ratingError.message }, { status: 500 });
    }
    
    // Update object's LMK score
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('score')
      .eq('object_id', objectId);
    
    if (allRatings && allRatings.length > 0) {
      const avgRating = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
      
      await supabase
        .from('objects')
        .update({
          lmk_avg_rating: avgRating,
          lmk_rating_count: allRatings.length,
          lmk_score: avgRating,
        })
        .eq('id', objectId);
    }
    
    // Update user stats
    const { data: userRatings } = await supabase
      .from('ratings')
      .select('score, objects!inner(category)')
      .eq('user_id', user.id);
    
    if (userRatings && userRatings.length > 0) {
      const statsByCategory = userRatings.reduce((acc: any, r: any) => {
        const cat = r.objects.category;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat]++;
        return acc;
      }, {});
      
      const avgRatingGiven = userRatings.reduce((sum, r) => sum + r.score, 0) / userRatings.length;
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('stats')
        .eq('id', user.id)
        .single();
      
      await supabase
        .from('profiles')
        .update({
          stats: {
            ...(currentProfile?.stats || {}),
            total_ratings: userRatings.length,
            ratings_by_category: Object.entries(statsByCategory).map(([category, count]) => ({
              category,
              count,
            })),
            avg_rating_given: avgRatingGiven,
          },
        })
        .eq('id', user.id);
    }
    
    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Rating API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let query = supabase
      .from('ratings')
      .select(`
        *,
        objects (
          id,
          category,
          title,
          primary_image,
          tags
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (type === 'favorites') {
      query = query.eq('is_favorite', true);
    }
    
    const { data: ratings, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

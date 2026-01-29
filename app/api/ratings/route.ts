import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { item_id, item_title, category, rating, review, is_favorite } = body;

    if (!item_id || !item_title || !category || rating === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    console.log(`[Ratings API] Creating/updating rating for user ${session.user.id}, item: ${item_title}`);

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('item_id', item_id)
      .single();

    let result;
    if (existingRating) {
      result = await supabase
        .from('ratings')
        .update({
          rating,
          review: review || null,
          is_favorite: is_favorite || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('ratings')
        .insert({
          user_id: session.user.id,
          item_id,
          item_title,
          category,
          rating,
          review: review || null,
          is_favorite: is_favorite || false,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving rating:', result.error);
      return NextResponse.json({ error: 'Error saving rating' }, { status: 500 });
    }

    console.log(`[Ratings API] Rating saved successfully`);
    return NextResponse.json({ rating: result.data });
  } catch (error) {
    console.error('[Ratings API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get('type') || 'all';

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`[Ratings API] Fetching ${type} ratings for user ${session.user.id}`);

    let query = supabase
      .from('ratings')
      .select('*')
      .eq('user_id', session.user.id);

    if (type === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    const { data: ratings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json({ error: 'Error fetching ratings' }, { status: 500 });
    }

    console.log(`[Ratings API] Returning ${ratings?.length || 0} ratings`);
    return NextResponse.json({ ratings: ratings || [] });
  } catch (error) {
    console.error('[Ratings API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

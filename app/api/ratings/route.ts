import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const xAuthToken = request.headers.get('X-Auth-Token');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : xAuthToken;

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      return { user, supabase: supabaseAdmin };
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return { user: session.user, supabase };
  }
  
  return null;
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { item_id, item_title, category, rating, review, is_favorite } = body;

    if (!item_id || !item_title || !category || rating === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Note: database column is 'object_id', not 'item_id'
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', user.id)
      .eq('object_id', item_id)
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
          user_id: user.id,
          object_id: item_id, // Map item_id to object_id column
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
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { user, supabase } = auth;
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get('type') || 'all';

  try {
    let query = supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id);

    if (type === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    const { data: ratings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json({ error: 'Error fetching ratings' }, { status: 500 });
    }

    return NextResponse.json({ ratings: ratings || [] });
  } catch (error) {
    console.error('[Ratings API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

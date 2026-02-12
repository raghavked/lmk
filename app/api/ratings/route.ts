import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function stringToUUID(input: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;

  const hash = createHash('sha256').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

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

function formatRatingResponse(row: any) {
  const ctx = row.context || {};
  return {
    id: row.id,
    user_id: row.user_id,
    object_id: ctx.original_id || row.object_id,
    item_title: row.item_title,
    category: row.category,
    rating: Number(row.score) || 0,
    description: row.description || null,
    metric1: ctx.metric1 ?? null,
    metric2: ctx.metric2 ?? null,
    metric3: ctx.metric3 ?? null,
    price_level: ctx.price_level ?? null,
    photos: row.photos || [],
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { item_id, item_title, category, rating, description, review, metric1, metric2, metric3, price_level, photos, is_favorite } = body;

    if (!item_id || !item_title || !category || rating === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 0 and 5' }, { status: 400 });
    }

    if (rating % 0.5 !== 0) {
      return NextResponse.json({ error: 'Rating must be in 0.5 increments' }, { status: 400 });
    }

    if (metric1 !== undefined && (metric1 < 1 || metric1 > 10)) {
      return NextResponse.json({ error: 'Metrics must be between 1 and 10' }, { status: 400 });
    }
    if (metric2 !== undefined && (metric2 < 1 || metric2 > 10)) {
      return NextResponse.json({ error: 'Metrics must be between 1 and 10' }, { status: 400 });
    }
    if (metric3 !== undefined && (metric3 < 1 || metric3 > 10)) {
      return NextResponse.json({ error: 'Metrics must be between 1 and 10' }, { status: 400 });
    }

    if (price_level !== undefined && (price_level < 1 || price_level > 4)) {
      return NextResponse.json({ error: 'Price level must be between 1 and 4' }, { status: 400 });
    }

    const objectId = stringToUUID(item_id);

    const { data: existingObj } = await supabase
      .from('lmk_objects')
      .select('id')
      .eq('id', objectId)
      .single();

    if (!existingObj) {
      const { error: objError } = await supabase
        .from('lmk_objects')
        .insert({
          id: objectId,
          category,
          title: item_title,
        });
      if (objError) {
        console.error('Error creating lmk_object:', objError);
      }
    }

    const contextData: any = {};
    if (metric1 !== undefined) contextData.metric1 = metric1;
    if (metric2 !== undefined) contextData.metric2 = metric2;
    if (metric3 !== undefined) contextData.metric3 = metric3;
    if (price_level !== undefined) contextData.price_level = price_level;
    contextData.original_id = item_id;
    const contextJson = contextData;

    const descriptionText = description || review || null;
    const photoArray = photos?.length > 0 ? photos : null;

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', user.id)
      .eq('object_id', objectId)
      .single();

    let result;
    if (existingRating) {
      result = await supabase
        .from('ratings')
        .update({
          score: rating,
          description: descriptionText,
          context: contextJson,
          photos: photoArray,
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
          object_id: objectId,
          item_title,
          category,
          score: rating,
          description: descriptionText,
          context: contextJson,
          photos: photoArray,
          is_favorite: is_favorite || false,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving rating:', result.error);
      return NextResponse.json({ error: 'Error saving rating' }, { status: 500 });
    }

    return NextResponse.json({ rating: formatRatingResponse(result.data) });
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
  const category = requestUrl.searchParams.get('category');
  const limit = Math.max(1, Math.min(parseInt(requestUrl.searchParams.get('limit') || '100', 10) || 100, 500));
  const offset = Math.max(0, parseInt(requestUrl.searchParams.get('offset') || '0', 10) || 0);

  try {
    let query = supabase
      .from('ratings')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (type === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: ratings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json({ error: 'Error fetching ratings' }, { status: 500 });
    }

    const formattedRatings = (ratings || []).map(formatRatingResponse);
    return NextResponse.json({ 
      ratings: formattedRatings,
      total: count || formattedRatings.length,
      offset,
      limit,
      hasMore: (offset + limit) < (count || 0),
    });
  } catch (error) {
    console.error('[Ratings API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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

interface RatingDetails {
  description?: string;
  metric1?: number;
  metric2?: number;
  metric3?: number;
  price_level?: number;
  photos?: string[];
}

function packReview(details: RatingDetails): string {
  return JSON.stringify(details);
}

function unpackReview(review: string | null): RatingDetails {
  if (!review) return {};
  try {
    const parsed = JSON.parse(review);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as RatingDetails;
    }
    return { description: review };
  } catch {
    return { description: review };
  }
}

function formatRatingResponse(row: any) {
  const details = unpackReview(row.review);
  return {
    id: row.id,
    user_id: row.user_id,
    object_id: row.object_id,
    item_title: row.item_title,
    category: row.category,
    rating: row.rating / 2,
    description: details.description || null,
    metric1: details.metric1 ?? null,
    metric2: details.metric2 ?? null,
    metric3: details.metric3 ?? null,
    price_level: details.price_level ?? null,
    photos: details.photos || [],
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

    const ratingStored = Math.round(rating * 2);

    const reviewData: RatingDetails = {
      description: description || review || undefined,
      metric1: metric1 || undefined,
      metric2: metric2 || undefined,
      metric3: metric3 || undefined,
      price_level: price_level || undefined,
      photos: photos?.length > 0 ? photos : undefined,
    };

    const reviewJson = Object.values(reviewData).some(v => v !== undefined) ? packReview(reviewData) : null;

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
          rating: ratingStored,
          review: reviewJson,
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
          object_id: item_id,
          item_title,
          category,
          rating: ratingStored,
          review: reviewJson,
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

  try {
    let query = supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id);

    if (type === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: ratings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json({ error: 'Error fetching ratings' }, { status: 500 });
    }

    const formattedRatings = (ratings || []).map(formatRatingResponse);
    return NextResponse.json({ ratings: formattedRatings });
  } catch (error) {
    console.error('[Ratings API] Fatal error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

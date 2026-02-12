import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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
      return user;
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user;
  }
  
  return null;
}

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const friendId = url.searchParams.get('friendId');
  const category = url.searchParams.get('category');

  if (!friendId) {
    return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
  }

  try {
    const { data: friendship1 } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .eq('status', 'accepted')
      .single();

    const { data: friendship2 } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user_id', friendId)
      .eq('friend_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!friendship1 && !friendship2) {
      return NextResponse.json({ error: 'You are not friends with this user' }, { status: 403 });
    }

    let query = supabaseAdmin
      .from('ratings')
      .select('*')
      .eq('user_id', friendId);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: ratings, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', friendId)
      .single();

    const formattedRatings = (ratings || []).map((row: any) => {
      let details: any = {};
      try {
        if (row.review) {
          const parsed = JSON.parse(row.review);
          if (typeof parsed === 'object') details = parsed;
          else details = { description: row.review };
        }
      } catch {
        details = { description: row.review };
      }

      return {
        id: row.id,
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
      };
    });

    return NextResponse.json({
      ratings: formattedRatings,
      friend: profile || { full_name: 'Unknown' },
    });
  } catch (error: any) {
    console.error('Error fetching friend ratings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

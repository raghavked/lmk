import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

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

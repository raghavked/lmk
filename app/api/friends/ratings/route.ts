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

    const { data: ratings, error } = await supabaseAdmin
      .from('ratings')
      .select('*')
      .eq('user_id', friendId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', friendId)
      .single();

    return NextResponse.json({
      ratings: ratings || [],
      friend: profile || { full_name: 'Unknown' },
    });
  } catch (error: any) {
    console.error('Error fetching friend ratings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

  try {
    const [
      { data: friendsData1 },
      { data: friendsData2 },
      { data: pendingData },
      { data: sentData },
    ] = await Promise.all([
      supabaseAdmin.from('friends').select('friend_id').eq('user_id', user.id).eq('status', 'accepted'),
      supabaseAdmin.from('friends').select('user_id').eq('friend_id', user.id).eq('status', 'accepted'),
      supabaseAdmin.from('friends').select('user_id').eq('friend_id', user.id).eq('status', 'pending'),
      supabaseAdmin.from('friends').select('friend_id').eq('user_id', user.id).eq('status', 'pending'),
    ]);

    const friendIds = [
      ...(friendsData1?.map(f => f.friend_id) || []),
      ...(friendsData2?.map(f => f.user_id) || [])
    ];

    const pendingIds = pendingData?.map(f => f.user_id) || [];
    const sentIds = sentData?.map(f => f.friend_id) || [];

    const allProfileIds = [...new Set([...friendIds, ...pendingIds])];
    let profileMap: Record<string, string> = {};
    
    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', allProfileIds);
      profiles?.forEach(p => { profileMap[p.id] = p.full_name || 'Unknown'; });
    }

    const friends = friendIds.map(id => ({ id, full_name: profileMap[id] || 'Unknown' }));
    const pending = pendingIds.map(id => ({ id, full_name: profileMap[id] || 'Unknown' }));

    return NextResponse.json({ friends, pending, sentRequests: sentIds });
  } catch (error: any) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, friendId } = body;

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    if (action === 'send') {
      const { error } = await supabaseAdmin
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Friend request sent' });
    }

    if (action === 'accept') {
      const { error } = await supabaseAdmin
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Friend request accepted' });
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Friend request rejected' });
    }

    if (action === 'unfriend') {
      // Delete friendship from both directions
      const { error: error1 } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      const { error: error2 } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error1 && error2) throw error1;
      return NextResponse.json({ success: true, message: 'Friend removed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error with friend action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

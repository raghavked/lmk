import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: friendsData1 } = await supabaseAdmin
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: friendsData2 } = await supabaseAdmin
      .from('friends')
      .select('user_id')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');

    const { data: pendingData } = await supabaseAdmin
      .from('friends')
      .select('user_id')
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    const { data: sentData } = await supabaseAdmin
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    const friendIds = [
      ...(friendsData1?.map(f => f.friend_id) || []),
      ...(friendsData2?.map(f => f.user_id) || [])
    ];

    const pendingIds = pendingData?.map(f => f.user_id) || [];
    const sentIds = sentData?.map(f => f.friend_id) || [];

    let friends: any[] = [];
    let pending: any[] = [];

    if (friendIds.length > 0) {
      const { data: friendProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', friendIds);
      friends = friendProfiles || [];
    }

    if (pendingIds.length > 0) {
      const { data: pendingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', pendingIds);
      pending = pendingProfiles || [];
    }

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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error with friend action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

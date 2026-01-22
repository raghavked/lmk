import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }
    
    // Check if user is part of this friendship
    if (friendship.user_id_1 !== user.id && friendship.user_id_2 !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Update status
    const { data: updated, error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    // Update friend counts
    const { count: count1 } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .or(`user_id_1.eq.${friendship.user_id_1},user_id_2.eq.${friendship.user_id_1}`)
      .eq('status', 'accepted');
    
    const { count: count2 } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .or(`user_id_1.eq.${friendship.user_id_2},user_id_2.eq.${friendship.user_id_2}`)
      .eq('status', 'accepted');
    
    // Update both users' stats
    const { data: profile1 } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', friendship.user_id_1)
      .single();
    
    const { data: profile2 } = await supabase
      .from('profiles')
      .select('stats')
      .eq('id', friendship.user_id_2)
      .single();
    
    await supabase
      .from('profiles')
      .update({
        stats: {
          ...(profile1?.stats || {}),
          friends_count: count1 || 0,
        },
      })
      .eq('id', friendship.user_id_1);
    
    await supabase
      .from('profiles')
      .update({
        stats: {
          ...(profile2?.stats || {}),
          friends_count: count2 || 0,
        },
      })
      .eq('id', friendship.user_id_2);
    
    return NextResponse.json({ friendship: updated });
  } catch (error) {
    console.error('Accept friend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

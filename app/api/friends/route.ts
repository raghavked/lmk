import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { identifier } = body;
    
    if (!identifier) {
      return NextResponse.json({ error: 'Identifier required' }, { status: 400 });
    }
    
    // Find friend by username or email
    const { data: friend } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .or(`username.eq.${identifier.toLowerCase()},email.eq.${identifier}`)
      .single();
    
    if (!friend) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (friend.id === user.id) {
      return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
    }
    
    // Ensure user_id_1 < user_id_2
    const [userId1, userId2] = [user.id, friend.id].sort();
    
    // Check if friendship exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_id_1', userId1)
      .eq('user_id_2', userId2)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: 'Friendship already exists' }, { status: 400 });
    }
    
    // Create friendship
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        initiated_by: user.id,
        status: 'pending',
      })
      .select()
      .single();
    
    if (friendshipError) {
      return NextResponse.json({ error: friendshipError.message }, { status: 500 });
    }
    
    return NextResponse.json({ friendship });
  } catch (error) {
    console.error('Add friend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let query = supabase
      .from('friendships')
      .select('*')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
    
    if (type === 'accepted') {
      query = query.eq('status', 'accepted');
    } else if (type === 'pending') {
      query = query.eq('status', 'pending');
    }
    
    const { data: friendships, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get friend details
    const friendIds = friendships?.map((f: any) => 
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    ) || [];
    
    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, profile_image, stats')
      .in('id', friendIds);
    
    // Attach compatibility scores
    const friends = await Promise.all(
      (profiles || []).map(async (profile: any) => {
        const friendship = friendships?.find((f: any) => 
          f.user_id_1 === profile.id || f.user_id_2 === profile.id
        );
        
        let compatibility = friendship?.taste_compatibility;
        
        if (!compatibility && friendship) {
          compatibility = await calculateCompatibility(supabase, user.id, profile.id);
          
          if (compatibility) {
            await supabase
              .from('friendships')
              .update({ taste_compatibility: compatibility })
              .eq('id', friendship.id);
          }
        }
        
        return {
          ...profile,
          compatibility,
          friendship_id: friendship?.id,
        };
      })
    );
    
    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function calculateCompatibility(supabase: any, userId1: string, userId2: string) {
  const { data: sharedRatings } = await supabase
    .from('ratings')
    .select(`
      object_id,
      score,
      objects!inner(category)
    `)
    .eq('user_id', userId1);
  
  if (!sharedRatings || sharedRatings.length === 0) return null;
  
  const { data: friendRatings } = await supabase
    .from('ratings')
    .select('object_id, score')
    .eq('user_id', userId2)
    .in('object_id', sharedRatings.map((r: any) => r.object_id));
  
  if (!friendRatings || friendRatings.length < 3) return null;
  
  // Calculate by category
  const byCategory: Record<string, { diffs: number[], count: number }> = {};
  
  for (const rating of sharedRatings) {
    const friendRating = friendRatings.find((fr: any) => fr.object_id === rating.object_id);
    if (!friendRating) continue;
    
    const category = rating.objects.category;
    if (!byCategory[category]) {
      byCategory[category] = { diffs: [], count: 0 };
    }
    byCategory[category].diffs.push(Math.abs(rating.score - friendRating.score));
    byCategory[category].count++;
  }
  
  const categoryScores = Object.entries(byCategory).map(([category, data]) => {
    const avgDiff = data.diffs.reduce((a, b) => a + b, 0) / data.diffs.length;
    const score = Math.max(0, 100 - avgDiff * 10);
    return { category, score: Math.round(score) };
  });
  
  // Overall score
  const allDiffs = Object.values(byCategory).flatMap(d => d.diffs);
  const avgDiff = allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length;
  const overallScore = Math.max(0, 100 - avgDiff * 10);
  const agreementRate = allDiffs.filter(d => d <= 2).length / allDiffs.length;
  
  return {
    overall_score: Math.round(overallScore),
    by_category: categoryScores,
    shared_ratings_count: friendRatings.length,
    agreement_rate: Math.round(agreementRate * 100),
  };
}

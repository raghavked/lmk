import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import GroupsClient from './GroupsClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Load user's friends for group invites
  const { data: friendsData1 } = await supabase
    .from('friends')
    .select('friend_id, profiles!friends_friend_id_fkey(id, full_name, avatar_url)')
    .eq('user_id', session.user.id)
    .eq('status', 'accepted');

  const { data: friendsData2 } = await supabase
    .from('friends')
    .select('user_id, profiles!friends_user_id_fkey(id, full_name, avatar_url)')
    .eq('friend_id', session.user.id)
    .eq('status', 'accepted');

  const friends: any[] = [];
  
  friendsData1?.forEach((f: any) => {
    if (f.profiles) {
      friends.push({
        id: f.profiles.id,
        full_name: f.profiles.full_name || 'Unknown User',
        avatar_url: f.profiles.avatar_url,
      });
    }
  });

  friendsData2?.forEach((f: any) => {
    if (f.profiles && !friends.find(af => af.id === f.profiles.id)) {
      friends.push({
        id: f.profiles.id,
        full_name: f.profiles.full_name || 'Unknown User',
        avatar_url: f.profiles.avatar_url,
      });
    }
  });

  return <GroupsClient profile={profile} friends={friends} />;
}

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import GroupsClient from '@/components/GroupsClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const supabase = createServerComponentClient({ cookies });

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

  return <GroupsClient profile={profile} friends={[]} />;
}

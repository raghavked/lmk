import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DiscoverClient from './DiscoverClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const supabase = createServerComponentClient({ cookies: () => cookies() });

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

  return <DiscoverClient profile={profile} />;
}

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // If session exists, redirect to the discover page
  redirect('/discover');
}

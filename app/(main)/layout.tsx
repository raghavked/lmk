'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth check timeout - redirecting to login');
        setIsLoading(false);
        router.push('/auth/login');
      }
    }, 10000);

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session) {
          console.log('No session found - redirecting to login');
          router.push('/auth/login');
          return;
        }

        console.log('Session found, fetching profile...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;

        if (profileError) {
          console.warn('Profile fetch error:', profileError);
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({ id: session.user.id, full_name: session.user.user_metadata?.full_name || '' })
            .select('*')
            .single();
          setProfile(newProfile);
        } else {
          setProfile(profileData);
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          setIsLoading(false);
          router.push('/auth/login');
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-300 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

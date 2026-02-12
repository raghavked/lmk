'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
export function useAuth() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureProfile = useCallback(async (sessionUser: any) => {
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (profileData) return profileData;

      if (profileError && profileError.code === 'PGRST116') {
        console.warn(`Profile not found (attempt ${retries + 1}), creating...`);
        try {
          const response = await fetch('/api/profile/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: sessionUser.id,
              full_name: sessionUser.user_metadata?.full_name || '',
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.profile) return result.profile;
          }
        } catch (e) {
          console.error('Profile creation via API failed:', e);
        }

        const { data: newProfileData, error: newProfileError } = await supabase
          .from('profiles')
          .insert({ id: sessionUser.id, full_name: sessionUser.user_metadata?.full_name || '' })
          .select('*')
          .single();

        if (newProfileData) return newProfileData;
        if (newProfileError && !newProfileError.message?.includes('duplicate')) {
          console.error('Profile insert error:', newProfileError);
        }

        retries++;
        if (retries <= maxRetries) {
          await new Promise(r => setTimeout(r, 500 * retries));
        }
      } else if (profileError) {
        throw profileError;
      }
    }

    return null;
  }, [supabase]);

  useEffect(() => {
    const getAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          return;
        }

        setUser(session.user);
        const finalProfile = await ensureProfile(session.user);
        setProfile(finalProfile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Auth error';
        setError(message);
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    getAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        router.push('/auth/login');
      } else if (session) {
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          try {
            const p = await ensureProfile(session.user);
            setProfile(p);
          } catch (e) {
            console.error('Profile ensure on sign-in error:', e);
          }
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router, ensureProfile]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return { user, profile, loading, error, logout };
}

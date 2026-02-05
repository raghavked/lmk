import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Initial session:', session ? 'exists' : 'null');
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session ? 'session exists' : 'no session');
      setSession(session);

      if (_event === 'SIGNED_IN' && session?.user) {
        ensureProfileExists(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AuthContext] App resumed, refreshing session...');
        try {
          const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[AuthContext] Session refresh error:', error.message);
            const { data: { session: newSession } } = await supabase.auth.refreshSession();
            if (newSession) {
              setSession(newSession);
            }
          } else if (refreshedSession) {
            setSession(refreshedSession);
          }
        } catch (e) {
          console.error('[AuthContext] Error refreshing session on resume:', e);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const ensureProfileExists = async (session: Session) => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Auth-Token': session.access_token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) return;
      }

      await fetch(`${apiUrl}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Auth-Token': session.access_token,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          full_name: session.user.user_metadata?.full_name || '',
        }),
      });
      console.log('[AuthContext] Profile ensured for user:', session.user.id);
    } catch (e) {
      console.error('[AuthContext] Error ensuring profile:', e);
    }
  };

  const signOut = async () => {
    try {
      const keysToRemove = [
        'lmk_onboarding_completed',
        'lmk_quiz_completed',
        'lmk_decision_history',
        'lmk_seen_ids',
        'lmk_last_category',
      ];
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('[AuthContext] Cleared local storage on sign out');
    } catch (error) {
      console.error('[AuthContext] Error clearing local storage:', error);
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (session?.access_token) {
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 > Date.now() + 60000) {
        return session.access_token;
      }

      console.log('[AuthContext] Token near expiry, refreshing...');
      try {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (refreshed?.access_token) {
          setSession(refreshed);
          return refreshed.access_token;
        }
      } catch (e) {
        console.error('[AuthContext] Token refresh error:', e);
      }
    }
    
    console.log('[AuthContext] Fetching fresh session...');
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[AuthContext] Error getting session:', error.message);
      return null;
    }
    
    if (freshSession?.access_token) {
      setSession(freshSession);
      return freshSession.access_token;
    }
    
    console.log('[AuthContext] No session available');
    return null;
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

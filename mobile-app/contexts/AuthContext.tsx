import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Initial session:', session ? 'exists' : 'null');
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session ? 'session exists' : 'no session');
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getAccessToken = async (): Promise<string | null> => {
    console.log('[AuthContext] getAccessToken called, current session:', session ? 'exists' : 'null');
    
    if (session?.access_token) {
      console.log('[AuthContext] Using cached token, length:', session.access_token.length);
      return session.access_token;
    }
    
    console.log('[AuthContext] No cached session, fetching fresh session...');
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[AuthContext] Error getting session:', error.message);
      return null;
    }
    
    if (freshSession?.access_token) {
      console.log('[AuthContext] Got fresh token, length:', freshSession.access_token.length);
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

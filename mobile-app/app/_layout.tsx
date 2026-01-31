import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.accent.coral} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background.primary} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background.primary },
          headerTintColor: Colors.text.primary,
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: Colors.background.primary },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="quiz" 
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }} 
            />
          </>
        ) : (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        )}
      </Stack>
    </>
  );
}

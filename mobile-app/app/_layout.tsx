import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
        <ActivityIndicator size="large" color={Colors.accent.coral} />
      </View>
    );
  }

  if (!session) {
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
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      </>
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="quiz" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

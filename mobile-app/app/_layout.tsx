import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

function RootLayoutNav() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent.coral} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" backgroundColor={Colors.background.primary} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background.primary },
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false, title: '' }} />
          <Stack.Screen name="auth" options={{ headerShown: false, title: '' }} />
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
          name="onboarding" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="quiz" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="plan" 
          options={{ 
            title: 'Plan My Day',
            headerBackTitle: 'Discover',
          }} 
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 14,
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary fallbackMessage="The app encountered an unexpected error. Please restart the app or try again.">
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  taste_profile?: any;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const hasPreferences = profile?.taste_profile && Object.keys(profile.taste_profile).length > 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          {hasPreferences ? (
            <View>
              <Text style={styles.cardText}>Your taste profile is set up!</Text>
              <Text style={styles.cardSubtext}>Your recommendations are personalized.</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.cardText}>No preferences set</Text>
              <Text style={styles.cardSubtext}>Complete the preference quiz for better recommendations.</Text>
              <TouchableOpacity 
                style={styles.quizButton} 
                onPress={() => router.push('/quiz')}
              >
                <Text style={styles.quizButtonText}>Take the Quiz</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon!')}>
          <Text style={styles.menuItemText}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Notifications', 'Notification settings coming soon!')}>
          <Text style={styles.menuItemText}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}>
          <Text style={styles.menuItemText}>Privacy</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {hasPreferences && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/quiz')}>
            <Text style={styles.menuItemText}>Retake Quiz</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>LMK v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent.coral,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.background.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  quizButton: {
    backgroundColor: Colors.accent.coral,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  quizButtonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.text.secondary,
  },
  signOutButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
});

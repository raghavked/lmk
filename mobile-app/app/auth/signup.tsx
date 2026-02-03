import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        }
        Alert.alert('Sign Up Failed', errorMessage);
        setLoading(false);
        return;
      }

      if (!data) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to connect. Please check your internet connection.');
      setLoading(false);
      return;
    }
    
    // Get the user data after signup
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData?.user) {
      // Create profile for new user - try direct insert first, then API fallback
      let profileCreated = false;
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userData.user.id,
            email: trimmedEmail,
            full_name: trimmedName,
            preferences_completed: false,
          });
        
        if (profileError) {
          console.error('Direct profile creation error:', JSON.stringify(profileError));
          // If it's a duplicate key error, profile already exists
          if (profileError.code === '23505') {
            profileCreated = true;
          }
        } else {
          console.log('Profile created successfully via direct insert');
          profileCreated = true;
        }
      } catch (e) {
        console.error('Direct profile creation exception:', e);
      }

      // Fallback: Try API endpoint if direct insert failed
      if (!profileCreated) {
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://6e0df1e5-2908-4c73-8a4c-a5e12f6fda83-00-5b7dipj1tt5q.worf.replit.dev';
          const response = await fetch(`${apiUrl}/api/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userData.user.id,
              email: trimmedEmail,
              full_name: trimmedName,
            }),
          });
          
          if (response.ok) {
            console.log('Profile created successfully via API');
            profileCreated = true;
          } else {
            const errorData = await response.json();
            console.error('API profile creation failed:', errorData);
          }
        } catch (apiError) {
          console.error('API profile creation exception:', apiError);
        }
      }
      
      if (!profileCreated) {
        console.warn('Profile creation failed, will retry on first login');
      }
      
      Alert.alert('Success', 'Account created! Please check your email to verify.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>LMK</Text>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Start your personalized journey</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.text.muted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.text.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
                placeholderTextColor={Colors.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.accent.coral,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  linkText: {
    fontSize: 14,
    color: Colors.accent.coral,
    fontWeight: '600',
  },
});

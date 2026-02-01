import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    title: 'Welcome to LMK',
    description: 'Get personalized recommendations tailored to your unique taste',
    emoji: '✨',
  },
  {
    title: 'Browse Categories',
    description: 'Explore Restaurants, Movies, TV Shows, Reading, and Activities',
    emoji: '🎯',
  },
  {
    title: 'Personalized for You',
    description: 'Each recommendation is curated based on your preferences and interests',
    emoji: '🎁',
  },
  {
    title: 'Rate & Refine',
    description: 'Your ratings help us improve future recommendations just for you',
    emoji: '⭐',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem('lmk_onboarding_completed', 'true');
      router.replace('/quiz');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('lmk_onboarding_completed', 'true');
    router.replace('/quiz');
  };

  const currentStep = STEPS[step];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>{currentStep.emoji}</Text>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.description}>{currentStep.description}</Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step ? styles.dotActive : styles.dotInactive
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.nextButton, step === 0 && styles.nextButtonFull]} 
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            {step === STEPS.length - 1 ? 'Set My Preferences' : 'Next'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.background.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: Colors.accent.coral,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  backText: {
    fontSize: 17,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.accent.coral,
    gap: 4,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 17,
    color: Colors.background.primary,
    fontWeight: '700',
  },
});

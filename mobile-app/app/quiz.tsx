import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

interface QuizOption {
  id: string;
  label: string;
  icon: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  emoji: string;
  stage: 1 | 2 | 3;
  options: QuizOption[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  // STAGE 1: QUICK TASTE SCAN (5 Questions)
  {
    id: 's1_mood',
    question: "What's your current mood for discovery?",
    emoji: '🧭',
    stage: 1,
    options: [
      { id: 's1_mood_chill', label: 'Chill & Cozy', icon: '🛋️' },
      { id: 's1_mood_adventure', label: 'Excited & Adventurous', icon: '🚀' },
      { id: 's1_mood_learn', label: 'Curious & Thoughtful', icon: '🧠' },
      { id: 's1_mood_social', label: 'Social & Lively', icon: '🎉' },
    ],
  },
  {
    id: 's1_pace',
    question: "When you go out, do you prefer a fast pace or a slow burn?",
    emoji: '⏱️',
    stage: 1,
    options: [
      { id: 's1_pace_fast', label: 'Fast-Paced & Efficient', icon: '⚡' },
      { id: 's1_pace_slow', label: 'Slow & Leisurely', icon: '🐌' },
    ],
  },
  {
    id: 's1_cuisine',
    question: "Pick a flavor profile that always hits the spot.",
    emoji: '👅',
    stage: 1,
    options: [
      { id: 's1_cuisine_spicy', label: 'Spicy & Bold', icon: '🌶️' },
      { id: 's1_cuisine_umami', label: 'Umami & Savory', icon: '🍄' },
      { id: 's1_cuisine_sweet', label: 'Sweet & Comforting', icon: '🍰' },
      { id: 's1_cuisine_fresh', label: 'Fresh & Bright', icon: '🍋' },
    ],
  },
  {
    id: 's1_media',
    question: "Which type of story draws you in the most?",
    emoji: '🎬',
    stage: 1,
    options: [
      { id: 's1_media_real', label: 'Grounded in Reality', icon: '🌍' },
      { id: 's1_media_fantasy', label: 'Escapist Fantasy', icon: '✨' },
      { id: 's1_media_thrill', label: 'High-Stakes Thriller', icon: '💥' },
      { id: 's1_media_comedy', label: 'Pure Comedy & Fun', icon: '😂' },
    ],
  },
  {
    id: 's1_activity',
    question: "When you have free time, what's your default setting?",
    emoji: '🎯',
    stage: 1,
    options: [
      { id: 's1_activity_home', label: 'Homebody (Cozy & Indoor)', icon: '🏠' },
      { id: 's1_activity_culture', label: 'Cultural (Museums, Shows)', icon: '🖼️' },
      { id: 's1_activity_nature', label: 'Nature (Hikes, Parks)', icon: '🌲' },
      { id: 's1_activity_city', label: 'City Explorer', icon: '🏙️' },
    ],
  },
  // STAGE 2: SCENARIO-BASED (6 Questions)
  {
    id: 's2_friday_night',
    question: "It's Friday night, you're tired. What's the takeout vibe?",
    emoji: '😴',
    stage: 2,
    options: [
      { id: 's2_friday_comfort', label: 'Comfort Food & Nostalgia', icon: '🍕' },
      { id: 's2_friday_healthy', label: 'Healthy & Fresh Reset', icon: '🥗' },
      { id: 's2_friday_exotic', label: 'Exotic & Adventurous', icon: '🍜' },
      { id: 's2_friday_fancy', label: 'Prestige & Treat Yourself', icon: '🥂' },
    ],
  },
  {
    id: 's2_movie_length',
    question: "You're starting a movie. How long is too long?",
    emoji: '⏳',
    stage: 2,
    options: [
      { id: 's2_movie_short', label: 'Under 90 mins (Quick Hit)', icon: '⏱️' },
      { id: 's2_movie_standard', label: '90 - 150 mins (Standard)', icon: '🍿' },
      { id: 's2_movie_epic', label: 'Over 150 mins (Epic)', icon: '🎬' },
    ],
  },
  {
    id: 's2_tv_genre',
    question: "What's the one TV genre you'll always give a chance?",
    emoji: '📺',
    stage: 2,
    options: [
      { id: 's2_tv_prestige', label: 'Prestige Drama', icon: '🏆' },
      { id: 's2_tv_procedural', label: 'Comfort Procedural', icon: '🚨' },
      { id: 's2_tv_sitcom', label: 'Classic Sitcom', icon: '🤣' },
      { id: 's2_tv_reality', label: 'Competition Reality', icon: '🏅' },
    ],
  },
  {
    id: 's2_youtube_topic',
    question: "Which YouTube rabbit hole are you most likely to fall down?",
    emoji: '🕳️',
    stage: 2,
    options: [
      { id: 's2_youtube_explain', label: 'Deep Explanations', icon: '🔬' },
      { id: 's2_youtube_craft', label: 'Creative Process', icon: '🎨' },
      { id: 's2_youtube_gaming', label: 'Gaming & Streaming', icon: '🎮' },
      { id: 's2_youtube_vlog', label: 'Lifestyle Vlogs', icon: '🤳' },
    ],
  },
  {
    id: 's2_reading_format',
    question: "When you read, what format is your go-to?",
    emoji: '📚',
    stage: 2,
    options: [
      { id: 's2_reading_book', label: 'Physical Book', icon: '📖' },
      { id: 's2_reading_article', label: 'Long-Form Articles', icon: '📰' },
      { id: 's2_reading_comic', label: 'Graphic Novels & Comics', icon: '🦸' },
      { id: 's2_reading_audio', label: 'Audiobooks & Podcasts', icon: '🎧' },
    ],
  },
  {
    id: 's2_activity_social',
    question: "When planning a group activity, what's your priority?",
    emoji: '🤝',
    stage: 2,
    options: [
      { id: 's2_activity_easy', label: 'Low-Effort & Easy', icon: '✅' },
      { id: 's2_activity_unique', label: 'Unique & Memorable', icon: '🌟' },
      { id: 's2_activity_active', label: 'Physically Active', icon: '💪' },
      { id: 's2_activity_food', label: 'Centered Around Food', icon: '🍻' },
    ],
  },
  // STAGE 3: FINE-GRAINED CONTROLS (6 Questions)
  {
    id: 's3_slider_price',
    question: "Price Sensitivity: How much does cost factor in?",
    emoji: '💰',
    stage: 3,
    options: [
      { id: 's3_slider_price_low', label: 'Value-Focused', icon: '💸' },
      { id: 's3_slider_price_high', label: 'Quality-Focused', icon: '💎' },
    ],
  },
  {
    id: 's3_slider_noise',
    question: "Noise Level: Quiet or lively environments?",
    emoji: '🔊',
    stage: 3,
    options: [
      { id: 's3_slider_noise_quiet', label: 'Quiet & Intimate', icon: '🤫' },
      { id: 's3_slider_noise_lively', label: 'Lively & Buzzing', icon: '🥳' },
    ],
  },
  {
    id: 's3_slider_risk',
    question: "Risk Tolerance: How often do you try something new?",
    emoji: '🎲',
    stage: 3,
    options: [
      { id: 's3_slider_risk_low', label: 'Stick to what I know', icon: '✅' },
      { id: 's3_slider_risk_high', label: 'Always try the wild card', icon: '🤯' },
    ],
  },
  {
    id: 's3_multi_food',
    question: "What kind of food experience do you enjoy? (Select all)",
    emoji: '🍽️',
    stage: 3,
    options: [
      { id: 's3_multi_food_street', label: 'Street Food & Food Trucks', icon: '🚚' },
      { id: 's3_multi_food_omakase', label: 'Omakase & Tasting Menus', icon: '🍣' },
      { id: 's3_multi_food_brunch', label: 'Brunch & Breakfast Spots', icon: '🍳' },
      { id: 's3_multi_food_vegan', label: 'Plant-Based & Vegan', icon: '🌱' },
    ],
  },
  {
    id: 's3_multi_movie',
    question: "What kind of movie tone do you seek? (Select all)",
    emoji: '🎭',
    stage: 3,
    options: [
      { id: 's3_multi_movie_oscar', label: 'Oscar Bait & Prestige', icon: '🏆' },
      { id: 's3_multi_movie_indie', label: 'Indie & Arthouse', icon: '📽️' },
      { id: 's3_multi_movie_horror', label: 'Horror & Suspense', icon: '👻' },
      { id: 's3_multi_movie_musical', label: 'Musical & Dance', icon: '🎶' },
    ],
  },
  {
    id: 's3_multi_activity',
    question: "What kind of activity appeals to you? (Select all)",
    emoji: '🤸',
    stage: 3,
    options: [
      { id: 's3_multi_activity_live', label: 'Live Music & Concerts', icon: '🎤' },
      { id: 's3_multi_activity_sport', label: 'Watching Live Sports', icon: '🏈' },
      { id: 's3_multi_activity_spa', label: 'Spa & Wellness', icon: '🧖' },
      { id: 's3_multi_activity_game', label: 'Board Games & Arcades', icon: '🎲' },
    ],
  },
];

export default function QuizScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const isMultiSelect = question.id.includes('multi');
  const currentStage = question.stage;
  const stageProgress = QUIZ_QUESTIONS.filter(q => q.stage === currentStage);
  const stageIndex = stageProgress.findIndex(q => q.id === question.id);

  const toggleAnswer = (value: string) => {
    const current = answers[question.id] || [];
    if (current.includes(value)) {
      setAnswers({ ...answers, [question.id]: current.filter(v => v !== value) });
    } else {
      if (isMultiSelect) {
        setAnswers({ ...answers, [question.id]: [...current, value] });
      } else {
        setAnswers({ ...answers, [question.id]: [value] });
      }
    }
  };

  const isSelected = (value: string) => (answers[question.id] || []).includes(value);

  const handleNext = async () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      await savePreferences();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in to save preferences');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ taste_profile: answers })
        .eq('id', session.user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your preferences have been saved!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/profile') }
      ]);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return 'Quick Taste Scan';
      case 2: return 'Scenario-Based';
      case 3: return 'Fine-Tuning';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressInfo}>
          <Text style={styles.stageLabel}>Stage {currentStage}: {getStageLabel(currentStage)}</Text>
          <Text style={styles.progress}>
            {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>{question.emoji}</Text>
        <Text style={styles.questionTitle}>{question.question}</Text>
        <Text style={styles.hint}>
          {isMultiSelect ? 'Select all that apply' : 'Select one'}
        </Text>

        <View style={styles.options}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.option, isSelected(option.id) && styles.optionSelected]}
              onPress={() => toggleAnswer(option.id)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionText, isSelected(option.id) && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {currentQuestion > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton, 
            saving && styles.buttonDisabled,
            (answers[question.id]?.length || 0) === 0 && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={saving || (answers[question.id]?.length || 0) === 0}
        >
          <Text style={styles.nextText}>
            {currentQuestion === QUIZ_QUESTIONS.length - 1 ? (saving ? 'Saving...' : 'Finish') : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  progressInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stageLabel: {
    fontSize: 12,
    color: Colors.accent.coral,
    fontWeight: '600',
    marginBottom: 2,
  },
  progress: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.background.secondary,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.coral,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  options: {
    gap: 12,
    paddingBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: Colors.accent.coral,
    backgroundColor: `${Colors.accent.coral}20`,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 18,
    color: Colors.background.primary,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

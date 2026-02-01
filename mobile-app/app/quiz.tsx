import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  type: 'single-select' | 'multiple-select';
  options: string[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'cuisine_preference',
    category: 'Restaurants',
    question: 'What cuisines excite you the most?',
    type: 'multiple-select',
    options: ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'French', 'American', 'Middle Eastern', 'Thai', 'Japanese'],
  },
  {
    id: 'dining_atmosphere',
    category: 'Restaurants',
    question: 'What dining atmosphere do you prefer?',
    type: 'single-select',
    options: ['Casual & Relaxed', 'Trendy & Modern', 'Fine Dining', 'Cozy & Intimate', 'Lively & Social', 'Quiet & Peaceful'],
  },
  {
    id: 'dietary_preferences',
    category: 'Restaurants',
    question: 'Do you have any dietary preferences?',
    type: 'multiple-select',
    options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Organic', 'Halal', 'Kosher', 'None'],
  },
  {
    id: 'movie_genres',
    category: 'Movies',
    question: 'Which movie genres captivate you?',
    type: 'multiple-select',
    options: ['Action', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy', 'Romance', 'Animation', 'Documentary'],
  },
  {
    id: 'movie_style',
    category: 'Movies',
    question: 'What type of movie experience do you prefer?',
    type: 'multiple-select',
    options: ['Blockbuster & Entertaining', 'Thought-Provoking', 'Emotional & Moving', 'Artistic & Experimental', 'Light & Fun', 'Intense & Gripping', 'No preference'],
  },
  {
    id: 'movie_era',
    category: 'Movies',
    question: 'What era of films do you enjoy?',
    type: 'multiple-select',
    options: ['Classic (Pre-1980)', 'Golden Age (1980-2000)', 'Modern (2000-2015)', 'Recent (2015+)', 'No preference'],
  },
  {
    id: 'tv_genres',
    category: 'TV Shows',
    question: 'Which TV show genres do you enjoy?',
    type: 'multiple-select',
    options: ['Drama', 'Comedy', 'Thriller', 'Reality', 'Documentary', 'Sci-Fi', 'Fantasy', 'Crime', 'Romance', 'Animation'],
  },
  {
    id: 'show_commitment',
    category: 'TV Shows',
    question: 'How do you prefer to watch shows?',
    type: 'single-select',
    options: ['Quick episodes (20-30 min)', 'Long episodes (45-60 min)', 'Mix of both', 'No preference'],
  },
  {
    id: 'show_tone',
    category: 'TV Shows',
    question: 'What tone appeals to you most?',
    type: 'multiple-select',
    options: ['Dark & Serious', 'Light & Humorous', 'Suspenseful', 'Heartwarming', 'Adventurous', 'Intellectual'],
  },
  {
    id: 'book_genres',
    category: 'Reading',
    question: 'Which book genres captivate you?',
    type: 'multiple-select',
    options: ['Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Non-Fiction', 'Biography', 'Self-Help', 'Thriller', 'Historical'],
  },
  {
    id: 'reading_pace',
    category: 'Reading',
    question: 'What reading pace do you prefer?',
    type: 'single-select',
    options: ['Fast-paced & Gripping', 'Slow & Thoughtful', 'Mix of both', 'No preference'],
  },
  {
    id: 'book_depth',
    category: 'Reading',
    question: 'How deep do you like your books to be?',
    type: 'single-select',
    options: ['Light & Easy', 'Moderately Complex', 'Intellectually Challenging', 'No preference'],
  },
  {
    id: 'activity_type',
    category: 'Activities',
    question: 'What types of activities excite you?',
    type: 'multiple-select',
    options: ['Outdoor & Adventure', 'Sports & Fitness', 'Arts & Culture', 'Social & Nightlife', 'Wellness & Relaxation', 'Learning & Workshops', 'Gaming & Entertainment', 'Travel & Exploration'],
  },
  {
    id: 'activity_energy',
    category: 'Activities',
    question: 'What energy level do you prefer?',
    type: 'single-select',
    options: ['High Energy & Active', 'Moderate & Balanced', 'Low Key & Relaxed', 'Varies by mood'],
  },
  {
    id: 'activity_group',
    category: 'Activities',
    question: 'Do you prefer activities solo or with others?',
    type: 'single-select',
    options: ['Solo', 'Small Group (2-4)', 'Large Group (5+)', 'Flexible'],
  },
  {
    id: 'discovery_style',
    category: 'General',
    question: 'How do you like to discover new things?',
    type: 'multiple-select',
    options: ['Recommendations from friends', 'Trending & Popular', 'Hidden gems & Niche', 'Curated by experts', 'Random discovery', 'Based on my history'],
  },
  {
    id: 'budget_range',
    category: 'General',
    question: 'What is your typical budget range?',
    type: 'single-select',
    options: ['Budget-Friendly', 'Moderate', 'Premium', 'Luxury', 'Varies'],
  },
];

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case 'Restaurants': return '🍽️';
    case 'Movies': return '🎬';
    case 'TV Shows': return '📺';
    case 'Reading': return '📚';
    case 'Activities': return '🎯';
    case 'General': return '✨';
    default: return '🎯';
  }
};

export default function QuizScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleSelectOption = (value: string) => {
    if (question.type === 'single-select') {
      setPreferences({
        ...preferences,
        [question.id]: value,
      });
    } else {
      const current = preferences[question.id] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      setPreferences({
        ...preferences,
        [question.id]: updated,
      });
    }
  };

  const isSelected = (value: string) => {
    if (question.type === 'single-select') {
      return preferences[question.id] === value;
    }
    return (preferences[question.id] || []).includes(value);
  };

  const isAnswered = () => {
    const answer = preferences[question.id];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    return true;
  };

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
        .update({ 
          taste_profile: preferences,
          preferences_completed: true,
        })
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={Colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.progressInfo}>
          <Text style={styles.categoryLabel}>{question.category}</Text>
          <Text style={styles.progress}>
            {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>{getCategoryEmoji(question.category)}</Text>
        <Text style={styles.questionTitle}>{question.question}</Text>
        <Text style={styles.hint}>
          {question.type === 'multiple-select' ? 'Select all that apply' : 'Choose the best option'}
        </Text>

        <View style={styles.options}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, isSelected(option) && styles.optionSelected]}
              onPress={() => handleSelectOption(option)}
            >
              <Text style={[styles.optionText, isSelected(option) && styles.optionTextSelected]}>
                {option}
              </Text>
              {question.type === 'multiple-select' && (
                <View style={[styles.checkbox, isSelected(option) && styles.checkboxSelected]}>
                  {isSelected(option) && (
                    <Ionicons name="checkmark" size={14} color={Colors.background.primary} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {currentQuestion > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton, 
            currentQuestion === 0 && styles.nextButtonFull,
            (saving || !isAnswered()) && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={saving || !isAnswered()}
        >
          <Text style={styles.nextText}>
            {currentQuestion === QUIZ_QUESTIONS.length - 1 
              ? (saving ? 'Saving...' : 'Complete') 
              : 'Next'}
          </Text>
          {!saving && currentQuestion < QUIZ_QUESTIONS.length - 1 && (
            <Ionicons name="chevron-forward" size={20} color={Colors.background.primary} />
          )}
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 22,
  },
  progressInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.accent.coral,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  progress: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
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
    fontSize: 56,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  questionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 34,
  },
  hint: {
    fontSize: 14,
    color: Colors.accent.coral,
    marginBottom: 28,
    textAlign: 'center',
    fontWeight: '600',
  },
  options: {
    gap: 12,
    paddingBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.accent.coral,
    backgroundColor: `${Colors.accent.coral}15`,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accent.coral,
    borderColor: Colors.accent.coral,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 17,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 17,
    color: Colors.background.primary,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

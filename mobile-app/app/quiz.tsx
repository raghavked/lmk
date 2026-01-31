import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

interface Question {
  id: string;
  title: string;
  options: { value: string; label: string }[];
  multiSelect?: boolean;
}

const questions: Question[] = [
  {
    id: 'cuisines',
    title: 'What cuisines do you enjoy?',
    options: [
      { value: 'italian', label: 'Italian' },
      { value: 'mexican', label: 'Mexican' },
      { value: 'asian', label: 'Asian' },
      { value: 'american', label: 'American' },
      { value: 'mediterranean', label: 'Mediterranean' },
      { value: 'indian', label: 'Indian' },
    ],
    multiSelect: true,
  },
  {
    id: 'dining_atmosphere',
    title: 'What dining atmosphere do you prefer?',
    options: [
      { value: 'casual', label: 'Casual & Relaxed' },
      { value: 'upscale', label: 'Upscale & Elegant' },
      { value: 'lively', label: 'Lively & Social' },
      { value: 'quiet', label: 'Quiet & Intimate' },
    ],
    multiSelect: true,
  },
  {
    id: 'movie_genres',
    title: 'What movie genres do you like?',
    options: [
      { value: 'action', label: 'Action' },
      { value: 'comedy', label: 'Comedy' },
      { value: 'drama', label: 'Drama' },
      { value: 'horror', label: 'Horror' },
      { value: 'scifi', label: 'Sci-Fi' },
      { value: 'romance', label: 'Romance' },
    ],
    multiSelect: true,
  },
  {
    id: 'dietary',
    title: 'Any dietary preferences?',
    options: [
      { value: 'none', label: 'No restrictions' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'gluten_free', label: 'Gluten-Free' },
      { value: 'halal', label: 'Halal' },
      { value: 'kosher', label: 'Kosher' },
    ],
    multiSelect: true,
  },
];

export default function QuizScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const question = questions[currentQuestion];

  const toggleAnswer = (value: string) => {
    const current = answers[question.id] || [];
    if (current.includes(value)) {
      setAnswers({ ...answers, [question.id]: current.filter(v => v !== value) });
    } else {
      if (question.multiSelect) {
        setAnswers({ ...answers, [question.id]: [...current, value] });
      } else {
        setAnswers({ ...answers, [question.id]: [value] });
      }
    }
  };

  const isSelected = (value: string) => (answers[question.id] || []).includes(value);

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
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
        { text: 'OK', onPress: () => router.back() }
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
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>
          {currentQuestion + 1} of {questions.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.questionTitle}>{question.title}</Text>
        <Text style={styles.hint}>
          {question.multiSelect ? 'Select all that apply' : 'Select one'}
        </Text>

        <View style={styles.options}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected(option.value) && styles.optionSelected]}
              onPress={() => toggleAnswer(option.value)}
            >
              <Text style={[styles.optionText, isSelected(option.value) && styles.optionTextSelected]}>
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
          style={[styles.nextButton, saving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          <Text style={styles.nextText}>
            {currentQuestion === questions.length - 1 ? (saving ? 'Saving...' : 'Finish') : 'Next'}
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
    justifyContent: 'space-between',
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
  progress: {
    fontSize: 16,
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
  questionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 20,
  },
  hint: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  option: {
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
  optionText: {
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: 'center',
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
    opacity: 0.6,
  },
});

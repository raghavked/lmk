'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PreferenceTestProps {
  onComplete: (preferences: any) => void;
}

export default function PreferenceTest({ onComplete }: PreferenceTestProps) {
  const supabase = createClientComponentClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, any>>({});

  const questions = [
    // Restaurants (3 questions)
    {
      id: 'cuisine_preference',
      category: 'restaurants',
      question: 'What cuisines excite you the most?',
      type: 'multiple-select',
      options: ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Indian', 'French', 'American', 'Middle Eastern', 'Thai', 'Japanese'],
    },
    {
      id: 'dining_atmosphere',
      category: 'restaurants',
      question: 'What dining atmosphere do you prefer?',
      type: 'single-select',
      options: ['Casual & Relaxed', 'Trendy & Modern', 'Fine Dining', 'Cozy & Intimate', 'Lively & Social', 'Quiet & Peaceful'],
    },
    {
      id: 'dietary_preferences',
      category: 'restaurants',
      question: 'Do you have any dietary preferences?',
      type: 'multiple-select',
      options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Organic', 'None'],
    },

    // Movies (3 questions)
    {
      id: 'movie_genres',
      category: 'movies',
      question: 'Which movie genres captivate you?',
      type: 'multiple-select',
      options: ['Action', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Fantasy', 'Romance', 'Animation', 'Documentary'],
    },
    {
      id: 'movie_style',
      category: 'movies',
      question: 'What type of movie experience do you prefer?',
      type: 'single-select',
      options: ['Blockbuster & Entertaining', 'Thought-Provoking', 'Emotional & Moving', 'Artistic & Experimental', 'Light & Fun', 'Intense & Gripping'],
    },
    {
      id: 'movie_era',
      category: 'movies',
      question: 'What era of films do you enjoy?',
      type: 'multiple-select',
      options: ['Classic (Pre-1980)', 'Golden Age (1980-2000)', 'Modern (2000-2015)', 'Recent (2015+)', 'No preference'],
    },

    // TV Shows (3 questions)
    {
      id: 'tv_genres',
      category: 'tv_shows',
      question: 'What TV show genres do you binge?',
      type: 'multiple-select',
      options: ['Drama', 'Comedy', 'Thriller', 'Reality', 'Documentary', 'Sci-Fi', 'Fantasy', 'Crime', 'Romance', 'Animation'],
    },
    {
      id: 'show_commitment',
      category: 'tv_shows',
      question: 'How do you prefer to watch shows?',
      type: 'single-select',
      options: ['Quick episodes (20-30 min)', 'Long episodes (45-60 min)', 'Mix of both', 'No preference'],
    },
    {
      id: 'show_tone',
      category: 'tv_shows',
      question: 'What tone appeals to you most?',
      type: 'multiple-select',
      options: ['Dark & Serious', 'Light & Humorous', 'Suspenseful', 'Heartwarming', 'Adventurous', 'Intellectual'],
    },

    // YouTube (2 questions)
    {
      id: 'youtube_content',
      category: 'youtube_videos',
      question: 'What YouTube content interests you?',
      type: 'multiple-select',
      options: ['Education', 'Entertainment', 'Music', 'Gaming', 'Vlogs', 'Tutorials', 'News', 'Comedy', 'Tech', 'Lifestyle'],
    },
    {
      id: 'youtube_length',
      category: 'youtube_videos',
      question: 'What video length do you prefer?',
      type: 'single-select',
      options: ['Short (under 5 min)', 'Medium (5-15 min)', 'Long (15-30 min)', 'Very Long (30+ min)', 'Any length'],
    },

    // Reading (3 questions)
    {
      id: 'book_genres',
      category: 'reading',
      question: 'Which book genres captivate you?',
      type: 'multiple-select',
      options: ['Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Non-Fiction', 'Biography', 'Self-Help', 'Thriller', 'Historical'],
    },
    {
      id: 'reading_pace',
      category: 'reading',
      question: 'What reading pace do you prefer?',
      type: 'single-select',
      options: ['Fast-paced & Gripping', 'Slow & Thoughtful', 'Mix of both', 'No preference'],
    },
    {
      id: 'book_depth',
      category: 'reading',
      question: 'How deep do you like your books to be?',
      type: 'single-select',
      options: ['Light & Easy', 'Moderately Complex', 'Intellectually Challenging', 'No preference'],
    },

    // Activities (3 questions)
    {
      id: 'activity_type',
      category: 'activities',
      question: 'What types of activities excite you?',
      type: 'multiple-select',
      options: ['Outdoor & Adventure', 'Sports & Fitness', 'Arts & Culture', 'Social & Nightlife', 'Wellness & Relaxation', 'Learning & Workshops', 'Gaming & Entertainment', 'Travel & Exploration'],
    },
    {
      id: 'activity_energy',
      category: 'activities',
      question: 'What energy level do you prefer?',
      type: 'single-select',
      options: ['High Energy & Active', 'Moderate & Balanced', 'Low Key & Relaxed', 'Varies by mood'],
    },
    {
      id: 'activity_group',
      category: 'activities',
      question: 'Do you prefer activities solo or with others?',
      type: 'single-select',
      options: ['Solo', 'Small Group (2-4)', 'Large Group (5+)', 'Flexible'],
    },

    // General Preferences (2 questions)
    {
      id: 'discovery_style',
      category: 'general',
      question: 'How do you like to discover new things?',
      type: 'multiple-select',
      options: ['Recommendations from friends', 'Trending & Popular', 'Hidden gems & Niche', 'Curated by experts', 'Random discovery', 'Based on my history'],
    },
    {
      id: 'budget_range',
      category: 'general',
      question: 'What is your typical budget range?',
      type: 'single-select',
      options: ['Budget-Friendly', 'Moderate', 'Premium', 'Luxury', 'Varies'],
    },
  ];

  const handleSelectOption = (value: string) => {
    const question = questions[currentQuestion];
    
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

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save preferences to Supabase
        await supabase
          .from('profiles')
          .update({
            taste_profile: preferences,
            preferences_completed: true,
          })
          .eq('id', user.id);
      }
      onComplete(preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      onComplete(preferences);
    } finally {
      setLoading(false);
    }
  };

  const question = questions[currentQuestion];
  const isAnswered = preferences[question.id];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1117] rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-400">
              Question {currentQuestion + 1} of {questions.length}
            </h3>
            <div className="text-sm font-semibold text-coral">{Math.round(progress)}%</div>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral to-coral/70 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Category Badge */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-coral/10 text-coral text-xs font-bold rounded-full">
            {question.category.charAt(0).toUpperCase() + question.category.slice(1).replace('_', ' ')}
          </span>
        </div>

        {/* Question */}
        <h2 className="text-3xl font-black text-gray-50 mb-8 leading-tight">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {question.options.map((option) => {
            const isSelected = question.type === 'single-select'
              ? preferences[question.id] === option
              : (preferences[question.id] || []).includes(option);

            return (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                className={`w-full p-4 rounded-2xl font-bold text-left transition-all ${
                  isSelected
                    ? 'bg-coral text-[#0D1117] shadow-lg shadow-coral/30'
                    : 'bg-gray-800 text-gray-50 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {question.type === 'multiple-select' && (
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0D1117] border-[#0D1117]'
                          : 'border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-coral" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex-1 py-3 bg-gray-800 text-gray-50 rounded-2xl font-bold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!isAnswered || loading}
            className="flex-1 py-3 bg-coral text-[#0D1117] rounded-2xl font-bold hover:bg-coral/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-coral/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : currentQuestion === questions.length - 1 ? (
              <>
                Complete
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Tip */}
        <p className="text-center text-gray-500 text-sm mt-6">
          💡 Your answers help us provide better personalized recommendations
        </p>
      </div>
    </div>
  );
}

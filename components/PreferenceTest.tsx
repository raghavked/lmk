'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Logo from './Logo';

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

    // Movies (3 questions)
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

    // TV Shows (3 questions)
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

    // Reading (3 questions)
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

    // Activities (3 questions)
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

    // General Preferences (2 questions)
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User error:', userError);
        onComplete(preferences);
        return;
      }

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            taste_profile: preferences,
            preferences_completed: true,
            onboarding_seen: true,
          });
        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      } else if (!fetchError) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            taste_profile: preferences,
            preferences_completed: true,
            onboarding_seen: true,
          })
          .eq('id', user.id);
        if (updateError) {
          console.error('Error updating profile:', updateError);
        }
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
    <div className="flex h-screen w-full flex-col lg:flex-row bg-[#230f10]">
      {/* Left Panel: Progress & Info */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#181011] overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#feafb0]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#feafb0]/5 rounded-full blur-[100px]"></div>

        <div className="relative z-10 flex items-center gap-3">
          <Logo className="text-[#8b3a3a]" size={40} />
          <h2 className="text-white text-2xl font-bold tracking-tight">LMK</h2>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">Tell us what you love.</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            We're learning your preferences to give you personalized recommendations that match your unique taste.
          </p>

          {/* Progress Indicator */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-400">Progress</span>
              <span className="text-sm font-bold text-[#feafb0]">{currentQuestion + 1}/{questions.length}</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#feafb0]/70 to-[#feafb0] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-4">
            {question.category} • Question {currentQuestion + 1}
          </p>
        </div>

        <div className="relative z-10 text-gray-600 text-sm">
          © 2024 LMK Recommendations. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Question */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-[#230f10] overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden w-full max-w-[420px] mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Logo className="text-[#8b3a3a]" size={32} />
            <h2 className="text-gray-50 text-xl font-bold tracking-tight">LMK</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-400">Progress</span>
            <span className="text-sm font-bold text-[#feafb0]">{currentQuestion + 1}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#feafb0]/70 to-[#feafb0] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="w-full max-w-[420px] flex flex-col">
          <div className="mb-10">
            <p className="text-gray-400 text-sm font-semibold mb-3">{question.category}</p>
            <h2 className="text-3xl font-bold text-gray-50">{question.question}</h2>
            <p className="text-[#feafb0] text-sm font-medium mt-2">
              {question.type === 'multiple-select' ? 'Select all that apply' : 'Choose the best option'}
            </p>
          </div>

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
                  className={`w-full p-4 rounded-2xl font-medium text-left transition-all ${
                    isSelected
                      ? 'bg-[#feafb0] text-[#230f10] shadow-lg shadow-[#feafb0]/30'
                      : 'bg-gray-800 text-gray-50 hover:bg-gray-700 border border-gray-700 hover:border-[#feafb0]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {question.type === 'multiple-select' && (
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#230f10] border-[#230f10]'
                            : 'border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-[#feafb0]" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="flex-1 py-3 bg-gray-800 text-gray-50 rounded-2xl font-bold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gray-700 hover:border-[#feafb0]/50"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!isAnswered || loading}
              className="flex-1 py-3 bg-[#feafb0] text-[#230f10] rounded-2xl font-bold hover:bg-[#feafb0]/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#feafb0]/30"
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
        </div>
      </div>
    </div>
  );
}

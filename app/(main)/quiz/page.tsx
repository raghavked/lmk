'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ChevronLeft, ChevronRight, X, Check, Loader2 } from 'lucide-react';

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
    type: 'multiple-select',
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

export default function QuizPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to save preferences');
        return;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            taste_profile: preferences,
          });
        if (insertError) throw insertError;
      } else if (fetchError) {
        throw fetchError;
      } else {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ taste_profile: preferences })
          .eq('id', session.user.id);
        if (updateError) throw updateError;
      }

      localStorage.setItem('lmk_quiz_completed', 'true');
      router.push('/discover');
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (confirm('Skip preferences? Setting up preferences helps us give you better recommendations. You can always do this later in your profile.')) {
      router.push('/discover');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={handleClose}
          className="w-11 h-11 flex items-center justify-center bg-[#21262D] rounded-full hover:bg-[#30363D] transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
        <div className="text-right">
          <p className="text-xs text-[#feafb0] font-bold uppercase tracking-wider mb-1">
            {question.category}
          </p>
          <p className="text-sm text-gray-400 font-semibold">
            {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
          </p>
        </div>
      </div>

      <div className="h-1 bg-[#21262D] mx-6 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#feafb0] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <span className="text-6xl mb-5 block">{getCategoryEmoji(question.category)}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
              {question.question}
            </h1>
            <p className="text-sm text-[#feafb0] font-semibold">
              {question.type === 'multiple-select' ? 'Select all that apply' : 'Choose the best option'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected(option)
                    ? 'border-[#feafb0] bg-[#feafb0]/10'
                    : 'border-[#30363D] bg-[#21262D] hover:border-[#feafb0]/50'
                }`}
              >
                <span
                  className={`text-base font-medium ${
                    isSelected(option) ? 'text-[#feafb0]' : 'text-white'
                  }`}
                >
                  {option}
                </span>
                {question.type === 'multiple-select' && (
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                      isSelected(option)
                        ? 'bg-[#feafb0] border-[#feafb0]'
                        : 'border-[#30363D]'
                    }`}
                  >
                    {isSelected(option) && (
                      <Check className="w-4 h-4 text-[#0D1117]" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 p-6 max-w-lg mx-auto w-full">
        {currentQuestion > 0 && (
          <button
            onClick={handleBack}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#21262D] border border-[#30363D] text-white font-semibold hover:bg-[#30363D] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={saving || !isAnswered()}
          className={`flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#feafb0] text-[#0D1117] font-bold transition-colors ${
            currentQuestion === 0 ? 'flex-1' : 'flex-[2]'
          } ${saving || !isAnswered() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#feafb0]/90'}`}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : currentQuestion === QUIZ_QUESTIONS.length - 1 ? (
            'Complete'
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

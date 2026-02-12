'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const STEPS = [
  {
    title: 'Welcome to LMK',
    description: 'Your personal AI-powered recommendation engine for discovering amazing restaurants, movies, TV shows, books, and activities',
    emoji: '✨',
  },
  {
    title: 'Discover Tab',
    description: 'Browse personalized recommendations across 5 categories. Search, filter by distance, and tap any item to see details and ratings',
    emoji: '🔍',
  },
  {
    title: 'Decide Tab',
    description: 'Swipe right to save items you love, left to skip. Build your personal favorites list with quick, fun swipe decisions',
    emoji: '👆',
  },
  {
    title: 'Plan My Day',
    description: 'Chat with AI to plan the perfect day. Get restaurant suggestions, activity ideas, and complete itineraries based on your preferences',
    emoji: '📅',
  },
  {
    title: 'Social Features',
    description: 'Connect with friends, share recommendations, create groups, and see what your friends are loving. Vote on group decisions with polls',
    emoji: '👥',
  },
  {
    title: 'Your Profile',
    description: 'View your ratings, favorites, and taste profile. Customize your preferences anytime to get even better recommendations',
    emoji: '⭐',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [step, setStep] = useState(0);

  const markOnboardingSeen = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_seen: true })
          .eq('id', user.id);
      }
    } catch (e) {
      console.error('Error marking onboarding seen:', e);
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await markOnboardingSeen();
      router.push('/quiz');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    await markOnboardingSeen();
    router.push('/quiz');
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col px-6 py-12">
      <button
        onClick={handleSkip}
        className="self-end text-gray-400 hover:text-gray-300 text-base font-medium transition-colors"
      >
        Skip
      </button>

      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto text-center">
        <span className="text-8xl mb-8">{currentStep.emoji}</span>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {currentStep.title}
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          {currentStep.description}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-10">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step
                ? 'w-8 bg-[#feafb0]'
                : 'w-2 bg-[#30363D]'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3 max-w-lg mx-auto w-full">
        {step > 0 && (
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
          className={`flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#feafb0] text-[#0D1117] font-bold hover:bg-[#feafb0]/90 transition-colors ${
            step === 0 ? 'flex-1' : 'flex-[2]'
          }`}
        >
          {step === STEPS.length - 1 ? 'Set My Preferences' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

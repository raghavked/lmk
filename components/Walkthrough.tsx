'use client';

import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import Logo from './Logo';

interface WalkthroughProps {
  onComplete: () => void;
}

export default function Walkthrough({ onComplete }: WalkthroughProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to LMK',
      description: 'Get personalized recommendations tailored to your taste',
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

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-[#230f10] rounded-[32px] p-8 max-w-md w-full animate-in scale-in duration-300 border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="text-5xl">{currentStep.emoji}</div>
          <button
            onClick={onComplete}
            className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-[#feafb0]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-3xl font-bold text-gray-50 mb-3">{currentStep.title}</h2>
        <p className="text-gray-400 text-base mb-8 leading-relaxed">{currentStep.description}</p>

        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'bg-[#feafb0] w-8' : 'bg-gray-700 w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-gray-800 text-gray-50 rounded-2xl font-bold hover:bg-gray-700 transition border border-gray-700 hover:border-[#feafb0]/50"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                onComplete();
              }
            }}
            className="flex-1 py-3 bg-[#feafb0] text-[#230f10] rounded-2xl font-bold hover:bg-[#feafb0]/90 transition flex items-center justify-center gap-2 shadow-lg shadow-[#feafb0]/30"
          >
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

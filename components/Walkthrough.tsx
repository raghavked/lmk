'use client';

import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

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
      description: 'Explore Restaurants, Movies, TV Shows, YouTube, and more',
      emoji: '🎯',
    },
    {
      title: 'AI-Powered Insights',
      description: 'Each recommendation includes personalized metrics and descriptions',
      emoji: '🤖',
    },
    {
      title: 'Rate & Refine',
      description: 'Your ratings help us improve future recommendations',
      emoji: '⭐',
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-[32px] p-8 max-w-md w-full animate-in scale-in duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="text-5xl">{currentStep.emoji}</div>
          <button
            onClick={onComplete}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-2xl font-black text-black mb-3">{currentStep.title}</h2>
        <p className="text-black/60 font-bold mb-8">{currentStep.description}</p>

        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'bg-black w-8' : 'bg-gray-200 w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-4">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-gray-100 text-black rounded-2xl font-black hover:bg-gray-200 transition"
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
            className="flex-1 py-3 bg-black text-white rounded-2xl font-black hover:bg-gray-900 transition flex items-center justify-center gap-2"
          >
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

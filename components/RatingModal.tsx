'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface RatingModalProps {
  object: any;
  onClose: () => void;
}

export default function RatingModal({ object, onClose }: RatingModalProps) {
  const supabase = createClientComponentClient();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in to rate');
        return;
      }

      const { error } = await supabase.from('ratings').insert({
        user_id: user.id,
        object_id: object.id,
        score: rating,
        feedback: feedback || null,
        is_public: true,
      });

      if (error) throw error;

      alert('Rating submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end z-50 animate-in fade-in"
      onClick={handleBackdropClick}
    >
      <div className="w-full bg-[#1a1a1a] rounded-t-[32px] p-8 animate-in slide-in-from-bottom duration-300 border-t border-gray-700">
        {/* Swipe handle indicator */}
        <div className="flex justify-center -mt-4 mb-4">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white">Rate this item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="mb-8">
          <p className="text-gray-300 font-bold mb-4">{object.title}</p>
          <div className="flex gap-4 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= rating
                      ? 'fill-[#feafb0] text-[#feafb0]'
                      : 'text-gray-500'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-black text-gray-400 mb-2 uppercase tracking-widest">
            Optional feedback
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full p-4 bg-gray-800 border border-gray-600 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#feafb0] focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-700 text-white rounded-2xl font-black hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-[#feafb0] text-gray-900 rounded-2xl font-black hover:bg-[#feafb0]/90 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}

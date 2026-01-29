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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-in fade-in">
      <div className="w-full bg-white rounded-t-[32px] p-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-black">Rate this item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-8">
          <p className="text-black/60 font-bold mb-4">{object.title}</p>
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
                      ? 'fill-brand-600 text-brand-600'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-black text-black/60 mb-2 uppercase tracking-widest">
            Optional feedback
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full p-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-100 text-black rounded-2xl font-black hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-900 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}

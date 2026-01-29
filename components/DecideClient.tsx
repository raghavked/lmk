'use client';

import { useState, useEffect } from 'react';
import { Loader2, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ObjectCard from '@/components/ObjectCard';

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'youtube_videos', 'reading', 'activities'];

export default function DecideClient({ profile }: { profile: any }) {
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('restaurants');
  const [decisions, setDecisions] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNextItem();
  }, [selectedCategory]);

  const loadNextItem = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recommend?category=${selectedCategory}&limit=1&mode=decide`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load item');
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setCurrentItem(data.results[0]);
      } else {
        setError('No more items to decide on');
        setCurrentItem(null);
      }
    } catch (err: any) {
      console.error('Error loading item:', err);
      setError(err.message || 'Failed to load item');
      setCurrentItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'yes' | 'no') => {
    if (!currentItem) return;

    try {
      // Log the decision (could be saved to database)
      console.log(`Decision: ${decision} for ${currentItem.object.title}`);

      // Update decision count
      setDecisions(prev => ({
        ...prev,
        [decision]: prev[decision as keyof typeof prev] + 1,
      }));

      // Load next item
      await loadNextItem();
    } catch (err) {
      console.error('Error recording decision:', err);
    }
  };

  const categoryLabels: Record<string, string> = {
    restaurants: '🍽️ Restaurants',
    movies: '🎬 Movies',
    tv_shows: '📺 TV Shows',
    youtube_videos: '🎥 YouTube',
    reading: '📚 Reading',
    activities: '🎯 Activities',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-black mb-2">
            Quick Decide
          </h1>
          <p className="text-black font-bold opacity-70 text-lg">
            Can't decide? Let us help you pick!
          </p>
        </div>

        {/* Category Selector */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-black mb-3">
            Choose a category:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'bg-white text-black border border-gray-200 hover:border-brand-300'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Decision Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-3xl font-extrabold text-green-600">{decisions.yes}</div>
            <div className="text-sm font-bold text-green-700">Yes Decisions</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-3xl font-extrabold text-red-600">{decisions.no}</div>
            <div className="text-sm font-bold text-red-700">No Decisions</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
              <p className="text-black font-bold opacity-70">Loading next item...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
            <p className="text-red-700 font-bold mb-4">{error}</p>
            <button
              onClick={loadNextItem}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Item Card */}
        {!loading && currentItem && (
          <div className="mb-8">
            <ObjectCard
              object={currentItem.object}
              rank={currentItem.rank}
              score={currentItem.personalized_score}
              explanation={currentItem.explanation}
            />
          </div>
        )}

        {/* Decision Buttons */}
        {!loading && currentItem && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => handleDecision('no')}
              className="flex-1 py-4 px-6 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl hover:bg-red-100 transition font-bold text-lg flex items-center justify-center gap-2"
            >
              <ThumbsDown className="w-6 h-6" />
              Not for me
            </button>
            <button
              onClick={() => handleDecision('yes')}
              className="flex-1 py-4 px-6 bg-green-50 border-2 border-green-300 text-green-700 rounded-xl hover:bg-green-100 transition font-bold text-lg flex items-center justify-center gap-2"
            >
              <ThumbsUp className="w-6 h-6" />
              I like it!
            </button>
          </div>
        )}

        {/* Reset Button */}
        {decisions.yes + decisions.no > 0 && (
          <div className="text-center">
            <button
              onClick={() => {
                setDecisions({ yes: 0, no: 0 });
                loadNextItem();
              }}
              className="px-6 py-3 bg-white border border-gray-200 text-black rounded-lg hover:bg-gray-50 transition font-bold flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !currentItem && !error && (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <div className="text-5xl mb-4">🤔</div>
            <h3 className="text-xl font-bold text-black mb-2">No items to decide on</h3>
            <p className="text-black font-bold opacity-70">
              Try a different category or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

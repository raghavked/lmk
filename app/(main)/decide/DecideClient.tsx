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
      const params = new URLSearchParams();
      params.append('category', selectedCategory);
      params.append('limit', '1');
      params.append('mode', 'decide');
      if (profile?.taste_profile) {
        params.append('taste_profile', JSON.stringify(profile.taste_profile));
      }

      const response = await fetch(`/api/recommend?${params.toString()}`, {
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
    <div className="min-h-screen bg-background-primary">
      <Navigation profile={profile} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-text-primary mb-2">
            Quick Decide
          </h1>
          <p className="text-text-secondary text-lg">
            Can't decide? Let us help you pick!
          </p>
        </div>

        {/* Category Selector */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-text-primary mb-3">
            Choose a category:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-coral text-background-primary shadow-lg'
                    : 'bg-background-secondary text-text-primary border border-border-color hover:border-coral'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Decision Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-coral/20 rounded-lg p-4 border border-coral/50">
            <div className="text-3xl font-extrabold text-coral">{decisions.yes}</div>
            <div className="text-sm font-bold text-coral-dark">Yes Decisions</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700">
            <div className="text-3xl font-extrabold text-red-500">{decisions.no}</div>
            <div className="text-sm font-bold text-red-400">No Decisions</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
              <p className="text-text-secondary">Loading next item...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center mb-8">
            <p className="text-red-700 font-bold mb-4">{error}</p>
            <button
              onClick={loadNextItem}
              className="px-4 py-2 bg-red-500 text-background-primary rounded-lg hover:bg-red-600 transition font-bold"
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
              className="flex-1 py-4 px-6 bg-red-900/20 border-2 border-red-700 text-red-400 rounded-xl hover:bg-red-900/30 transition font-bold text-lg flex items-center justify-center gap-2"
            >
              <ThumbsDown className="w-6 h-6" />
              Not for me
            </button>
            <button
              onClick={() => handleDecision('yes')}
              className="flex-1 py-4 px-6 bg-coral/20 border-2 border-coral/50 text-coral rounded-xl hover:bg-coral/30 transition font-bold text-lg flex items-center justify-center gap-2"
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
              className="px-6 py-3 bg-background-secondary border border-border-color text-text-primary rounded-lg hover:bg-background-tertiary transition font-bold flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !currentItem && !error && (
          <div className="bg-background-tertiary rounded-lg p-12 text-center border border-border-color">
            <div className="text-5xl mb-4">🤔</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No items to decide on</h3>
            <p className="text-text-secondary">
              Try a different category or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

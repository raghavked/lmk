'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ThumbsUp, ThumbsDown, RotateCcw, Shuffle, History, X, ChevronDown } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ModeNavigation from '@/components/ModeNavigation';
import ObjectCard from '@/components/ObjectCard';

const CATEGORIES = ['restaurants', 'movies', 'tv_shows', 'youtube_videos', 'reading', 'activities'];

interface DecisionItem {
  item: any;
  decision: 'yes' | 'no';
  timestamp: string;
}

export default function DecideClient({ profile }: { profile: any }) {
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('restaurants');
  const [decisions, setDecisions] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });
  const [decisionHistory, setDecisionHistory] = useState<DecisionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number>(25); // Default to 25 miles for Decide
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedItem, setMatchedItem] = useState<any>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationReady(true);
        },
        (err) => {
          console.error('Location error:', err);
          if (profile?.location?.coordinates) {
            setUserLocation({
              lat: profile.location.coordinates[0],
              lng: profile.location.coordinates[1]
            });
          }
          setLocationReady(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else if (profile?.location?.coordinates) {
      setUserLocation({
        lat: profile.location.coordinates[0],
        lng: profile.location.coordinates[1]
      });
      setLocationReady(true);
    } else {
      setLocationReady(true);
    }
  }, [profile]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(`lmk_decide_history_${selectedCategory}`);
    const savedSeenIds = localStorage.getItem(`lmk_decide_seen_${selectedCategory}`);
    
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setDecisionHistory(history);
      setDecisions({
        yes: history.filter((h: DecisionItem) => h.decision === 'yes').length,
        no: history.filter((h: DecisionItem) => h.decision === 'no').length,
      });
    } else {
      setDecisionHistory([]);
      setDecisions({ yes: 0, no: 0 });
    }

    if (savedSeenIds) {
      setSeenIds(JSON.parse(savedSeenIds));
    } else {
      setSeenIds([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (locationReady) {
      loadNextItem();
    }
  }, [selectedCategory, locationReady, distanceFilter]);

  const loadNextItem = async (excludeIds?: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('category', selectedCategory);
      params.append('limit', '1');
      params.append('mode', 'decide');
      
      const idsToExclude = excludeIds || seenIds;
      if (idsToExclude.length > 0) {
        params.append('seen_ids', idsToExclude.join(','));
      }
      
      if (profile?.taste_profile) {
        params.append('taste_profile', JSON.stringify(profile.taste_profile));
      }
      
      // Use userLocation or fallback to profile location
      const lat = userLocation?.lat ?? profile?.location?.coordinates?.[0];
      const lng = userLocation?.lng ?? profile?.location?.coordinates?.[1];
      if (lat !== undefined && lng !== undefined) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
        params.append('radius', (distanceFilter * 1609).toString());
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
        setError('No more items to decide on. Try reshuffling!');
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
      const itemId = currentItem.object?.id || currentItem.id;
      
      const newDecision: DecisionItem = {
        item: currentItem,
        decision,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...decisionHistory, newDecision];
      setDecisionHistory(updatedHistory);
      localStorage.setItem(`lmk_decide_history_${selectedCategory}`, JSON.stringify(updatedHistory));

      const updatedSeenIds = [...seenIds, itemId];
      setSeenIds(updatedSeenIds);
      localStorage.setItem(`lmk_decide_seen_${selectedCategory}`, JSON.stringify(updatedSeenIds));

      setDecisions(prev => ({
        ...prev,
        [decision]: prev[decision as keyof typeof prev] + 1,
      }));

      if (decision === 'yes') {
        setMatchedItem(currentItem);
        setShowMatchPopup(true);
      } else {
        await loadNextItem(updatedSeenIds);
      }
    } catch (err) {
      console.error('Error recording decision:', err);
    }
  };
  
  const handleCloseMatch = async () => {
    setShowMatchPopup(false);
    setMatchedItem(null);
    await loadNextItem(seenIds);
  };

  const handleReshuffle = () => {
    localStorage.removeItem(`lmk_decide_seen_${selectedCategory}`);
    setSeenIds([]);
    loadNextItem([]);
  };

  const handleStartOver = () => {
    localStorage.removeItem(`lmk_decide_history_${selectedCategory}`);
    localStorage.removeItem(`lmk_decide_seen_${selectedCategory}`);
    setDecisionHistory([]);
    setDecisions({ yes: 0, no: 0 });
    setSeenIds([]);
    loadNextItem([]);
  };

  const handleRevisit = (item: DecisionItem) => {
    setCurrentItem(item.item);
    setShowHistory(false);
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
      <ModeNavigation />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-text-primary mb-2">
              Quick Decide
            </h1>
            <p className="text-text-secondary text-lg">
              Swipe through personalized picks!
            </p>
          </div>
          {decisionHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="p-3 bg-background-secondary border border-border-color rounded-lg hover:bg-background-tertiary transition"
              title="View History"
            >
              <History className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-tertiary rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-border-color flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-text-primary">Decision History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-background-secondary rounded"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {decisionHistory.length === 0 ? (
                  <p className="text-text-secondary text-center py-8">No decisions yet</p>
                ) : (
                  <div className="space-y-3">
                    {decisionHistory.slice().reverse().map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border border-border-color">
                        <div className="flex-1">
                          <p className="font-bold text-text-primary">{item.item.object?.title || item.item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.decision === 'yes' 
                                ? 'bg-coral/20 text-coral' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {item.decision === 'yes' ? '👍 Liked' : '👎 Passed'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevisit(item)}
                          className="ml-3 px-3 py-1 bg-coral text-background-primary rounded text-sm font-bold hover:bg-coral/90 transition"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
          
          {(selectedCategory === 'restaurants' || selectedCategory === 'activities') && (
            <div className="mt-4 flex justify-center">
              <div className="relative">
                <select
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(parseInt(e.target.value))}
                  disabled={!userLocation}
                  className="appearance-none pl-4 pr-10 py-2 bg-background-tertiary border border-border-color rounded-full text-text-primary text-sm font-medium focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value={5}>Within 5 mi</option>
                  <option value={10}>Within 10 mi</option>
                  <option value={25}>Within 25 mi</option>
                  <option value={50}>Within 50 mi</option>
                  <option value={100}>Within 100 mi</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Decision Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-coral/20 rounded-lg p-4 border border-coral/50">
            <div className="text-3xl font-extrabold text-coral">{decisions.yes}</div>
            <div className="text-sm font-bold text-coral">Liked</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700">
            <div className="text-3xl font-extrabold text-red-500">{decisions.no}</div>
            <div className="text-sm font-bold text-red-400">Passed</div>
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
          <div className="bg-background-tertiary border border-border-color rounded-lg p-6 text-center mb-8">
            <p className="text-text-secondary font-bold mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReshuffle}
                className="px-4 py-2 bg-coral text-background-primary rounded-lg hover:bg-coral/90 transition font-bold flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Reshuffle
              </button>
              <button
                onClick={() => loadNextItem()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition font-bold"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Item Card */}
        {!loading && currentItem && (
          <div className="mb-8">
            <ObjectCard
              object={currentItem.object || currentItem}
              rank={currentItem.rank}
              score={currentItem.personalized_score || currentItem.score}
              explanation={currentItem.explanation}
              distance={currentItem.distance}
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
              Pass
            </button>
            <button
              onClick={() => handleDecision('yes')}
              className="flex-1 py-4 px-6 bg-coral/20 border-2 border-coral/50 text-coral rounded-xl hover:bg-coral/30 transition font-bold text-lg flex items-center justify-center gap-2"
            >
              <ThumbsUp className="w-6 h-6" />
              Like
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {(decisions.yes + decisions.no > 0 || seenIds.length > 0) && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReshuffle}
              className="px-6 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral/90 transition font-bold flex items-center justify-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Reshuffle
            </button>
            <button
              onClick={handleStartOver}
              className="px-6 py-3 bg-background-secondary border border-border-color text-text-primary rounded-lg hover:bg-background-tertiary transition font-bold flex items-center justify-center gap-2"
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
            <p className="text-text-secondary mb-4">
              Try a different category or reshuffle to see past items again
            </p>
            <button
              onClick={handleReshuffle}
              className="px-6 py-3 bg-coral text-background-primary rounded-lg hover:bg-coral/90 transition font-bold flex items-center justify-center gap-2 mx-auto"
            >
              <Shuffle className="w-4 h-4" />
              Reshuffle
            </button>
          </div>
        )}
      </div>

      {/* It's a Match Popup */}
      {showMatchPopup && matchedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-extrabold text-coral mb-2">It's a Match!</h2>
              <p className="text-text-secondary">
                You liked {matchedItem.object?.title || matchedItem.title}
              </p>
            </div>
            
            <div className="mb-6">
              <ObjectCard
                object={matchedItem.object || matchedItem}
                explanation={matchedItem.explanation}
                profile={profile}
              />
            </div>
            
            <button
              onClick={handleCloseMatch}
              className="w-full py-4 bg-coral text-background-primary rounded-xl font-bold text-lg hover:bg-coral/90 transition-all shadow-lg shadow-coral/30"
            >
              Continue Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

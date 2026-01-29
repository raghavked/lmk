'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, ArrowDown, MapPin, Navigation as NavIcon, Search, RefreshCw, Sliders, Zap, ChevronDown } from 'lucide-react';
import ObjectCard from '@/components/ObjectCard';
import Navigation from '@/components/Navigation';
import Walkthrough from '@/components/Walkthrough';
import PreferenceTest from '@/components/PreferenceTest';
import ModeNavigation from '@/components/ModeNavigation';
import haptics from '@/lib/haptics';

interface Section {
  title: string;
  emoji: string;
  items: any[];
}

export default function DiscoverClient({ profile }: { profile: any }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [sections, setSections] = useState<Record<string, Section> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showPreferenceTest, setShowPreferenceTest] = useState(false);
  const [category, setCategory] = useState<string>('restaurants');
  const [query, setQuery] = useState('');

  const [sortBy, setSortBy] = useState<string>('personalized_score');
  const [offset, setOffset] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  // Location & Distance State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<number>(10); // Default to 10 miles
  const [isLocating, setIsLocating] = useState(false);

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  // Swipe category state
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const categories = [
    { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
    { id: 'movies', label: 'Movies', icon: '🎬' },
    { id: 'tv_shows', label: 'TV Shows', icon: '📺' },
    { id: 'youtube_videos', label: 'YouTube', icon: '🎥' },
    { id: 'reading', label: 'Reading', icon: '📚' },
    { id: 'activities', label: 'Activities', icon: '🎯' },
  ];

  const detectLocation = useCallback(() => {
    haptics.impact();
    if (!navigator.geolocation) {
      // Fallback to profile location if geolocation is not available
      if (profile?.location?.coordinates) {
        setUserLocation({
          lat: profile.location.coordinates[0],
          lng: profile.location.coordinates[1]
        });
      }
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        haptics.notification('success');
      },
      (err) => {
        console.error('Location error:', err);
        setIsLocating(false);
        // Fallback to profile location on error
        if (profile?.location?.coordinates) {
          setUserLocation({
            lat: profile.location.coordinates[0],
            lng: profile.location.coordinates[1]
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [profile]);

  const loadRecommendations = useCallback(async (isRefresh = false, newOffset = 0) => {
    if (isRefresh) {
      setIsRefreshing(true);
      setOffset(0);
      setSeenIds(new Set());
      newOffset = 0;
    } else if (newOffset === 0) {
      setLoading(true);
      setSeenIds(new Set());
    }
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('category', category);
      params.append('mode', 'discover');
      if (query) params.append('query', query);
        // Always append location if available for personalization and distance sorting
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        // Use distanceFilter for radius in meters
        params.append('radius', (distanceFilter * 1609).toString());
      }
      params.append('sort_by', sortBy);
      params.append('limit', '10');
      params.append('offset', newOffset.toString());
      if (profile?.taste_profile) {
        params.append('taste_profile', JSON.stringify(profile.taste_profile));
      }
      if (seenIds.size > 0) {
        params.append('seen_ids', Array.from(seenIds).join(','));
      }
      
      const response = await fetch(`/api/recommend?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to load recommendations');
      
      if (data.sections) {
        setSections(data.sections);
        setRecommendations([]);
        setOffset(0);
      } else {
        const newResults = data.results || [];
        
        setRecommendations(prev => {
          const updatedRecs = newOffset === 0 ? newResults : [...prev, ...newResults];
          const newSeenIds = new Set<string>(updatedRecs.map((item: any) => (item.object?.id || item.id) as string));
          console.log('Seen IDs updated:', Array.from(newSeenIds));
          console.log('Total visible items:', updatedRecs.length);
          setSeenIds(newSeenIds);
          return updatedRecs;
        });
        setSections(null);
        setOffset(newOffset + newResults.length);
      }
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [category, query, userLocation, distanceFilter, sortBy]);

  useEffect(() => {
    const walkthroughCompleted = localStorage.getItem('lmk_walkthrough_completed');
    const preferencesCompleted = profile?.preferences_completed;
    
    if (!walkthroughCompleted) {
      setShowWalkthrough(true);
    } else if (preferencesCompleted === false) {
      // Only show if the profile explicitly says preferences are NOT completed
      setShowPreferenceTest(true);
    } else {
      detectLocation();
    }
  }, [profile, detectLocation]);

  useEffect(() => {
    if (!showWalkthrough && !showPreferenceTest) {
      loadRecommendations();
    }
  }, [category, showWalkthrough, showPreferenceTest, userLocation, distanceFilter, sortBy, loadRecommendations]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].pageY;
    touchStartX.current = e.touches[0].screenX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    if (window.scrollY === 0 && diff > 0 && !loading) {
      setPullDistance(Math.min(diff / 2, 80));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const swipeDistance = touchEndX.current - touchStartX.current;
    if (Math.abs(swipeDistance) > 100) {
      const currentIndex = categories.findIndex(c => c.id === category);
      if (swipeDistance < 0 && currentIndex < categories.length - 1) {
        setCategory(categories[currentIndex + 1].id);
      } else if (swipeDistance > 0 && currentIndex > 0) {
        setCategory(categories[currentIndex - 1].id);
      }
    }
    if (pullDistance >= 70) {
      loadRecommendations(true);
    } else {
      setPullDistance(0);
    }
  };

  const handleWalkthroughComplete = () => {
    setShowWalkthrough(false);
    // After walkthrough, check if preferences are already completed (e.g., if user logged in before)
    if (profile?.preferences_completed === false) {
      setShowPreferenceTest(true);
    } else {
      detectLocation();
    }
  };

  const handlePreferenceTestComplete = () => {
    setShowPreferenceTest(false);
    // The profile update handles the persistence, no need for local storage flag
    detectLocation();
  };



  if (showWalkthrough) {
    return <Walkthrough onComplete={handleWalkthroughComplete} />;
  }

  if (showPreferenceTest) {
    return <PreferenceTest onComplete={handlePreferenceTestComplete} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background-primary">
      <Navigation profile={profile} />
      <ModeNavigation />
      
      <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div className="flex justify-center pt-4 pb-2">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              {pullDistance >= 70 ? '↓ Release to refresh' : '↓ Pull to refresh'}
                  </div>
        
                          {/* Location Status */}
                          {userLocation && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-300 dark:border-gray-700 flex justify-between items-center">
                              <span>Location: Detected ({userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)})</span>
                              <span className="text-orange-500 font-medium">Radius: {distanceFilter} miles</span>
                            </div>
                          )}
                        </div>
                )}

        {/* Category Filters */}
                        <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-gray-300 dark:border-gray-700 px-4 py-4 z-10 shadow-xl">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

                  {/* Filtering and Sorting Bar */}
                  <div className="mt-4 flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <input
                        type="text"
                        placeholder={`Search ${categories.find(c => c.id === category)?.label || 'recommendations'}...`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none"
                      />
                    </div>
                    
                    {/* Location Button */}
                    <button
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="p-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition disabled:opacity-50 text-gray-500 dark:text-gray-400 hover:text-orange-500"
                      aria-label="Detect Location"
                    >
                      {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </button>
                  </div>
        
                  {/* Sort and Filter Dropdowns */}
                  <div className="mt-3 flex gap-3">
                    {/* Sort By Dropdown */}
                    <div className="relative flex-1">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none w-full pl-4 pr-8 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none cursor-pointer"
                      >
                        <option value="personalized_score">Best Match (AI Score)</option>
                        <option value="distance">Closest Distance</option>
                        <option value="rating">Highest External Rating</option>
                        <option value="reviews">Most Reviews</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                    </div>
        
                    {/* Distance Filter Dropdown */}
                    <div className="relative flex-1">
                      <select
                        value={distanceFilter}
                        onChange={(e) => setDistanceFilter(parseInt(e.target.value))}
                        disabled={!userLocation}
                        className="appearance-none w-full pl-4 pr-8 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value={5}>5 miles</option>
                        <option value={10}>10 miles</option>
                        <option value={25}>25 miles</option>
                        <option value={50}>50 miles</option>
                        <option value={100}>100 miles</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                    </div>
                  </div>
        </div>

        {/* Content */}
        {error && (
          <div className="m-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-medium">Error loading recommendations</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading && recommendations.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading recommendations...</p>
            </div>
          </div>
        ) : recommendations.length === 0 && !error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No recommendations found</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Try adjusting your filters or preferences</p>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, index) => (
              <ObjectCard
                key={`${rec.object?.id || rec.id}-${index}`}
                object={rec.object || rec}
                rank={index + 1}
                score={rec.score}
                explanation={rec.explanation}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {recommendations.length > 0 && !loading && (
          <div className="flex justify-center py-8">
            <button
              onClick={() => loadRecommendations(false, offset)}
              className="px-6 py-3 bg-coral text-background-primary rounded-full font-bold hover:bg-coral/90 transition flex items-center gap-2 shadow-lg shadow-coral/30"
            >
              <ArrowDown className="w-4 h-4" />
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

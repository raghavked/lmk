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
  const [locationReady, setLocationReady] = useState(false);

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
      if (profile?.location?.coordinates) {
        setUserLocation({
          lat: profile.location.coordinates[0],
          lng: profile.location.coordinates[1]
        });
      }
      setLocationReady(true);
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
        setLocationReady(true);
        haptics.notification('success');
      },
      (err) => {
        console.error('Location error:', err);
        setIsLocating(false);
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
      
      // Use userLocation or fallback to profile location
      const lat = userLocation?.lat ?? profile?.location?.coordinates?.[0];
      const lng = userLocation?.lng ?? profile?.location?.coordinates?.[1];
      if (lat !== undefined && lng !== undefined) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
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
      setShowPreferenceTest(true);
    } else {
      detectLocation();
    }
  }, [profile, detectLocation]);

  useEffect(() => {
    // Only load recommendations after location detection is complete (or confirmed unavailable)
    if (!showWalkthrough && !showPreferenceTest && locationReady) {
      loadRecommendations();
    }
  }, [category, showWalkthrough, showPreferenceTest, userLocation, distanceFilter, loadRecommendations, locationReady]);

  useEffect(() => {
    if (!showWalkthrough && !showPreferenceTest && locationReady && query.length >= 2) {
      const searchTimeout = setTimeout(() => {
        loadRecommendations(false, 0);
      }, 300);
      return () => clearTimeout(searchTimeout);
    }
  }, [query, locationReady]);

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
    if (profile?.preferences_completed === false) {
      setShowPreferenceTest(true);
    } else {
      detectLocation();
    }
  };

  const handlePreferenceTestComplete = () => {
    setShowPreferenceTest(false);
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
          <div className="flex flex-col justify-center items-center pt-4 pb-2">
            <div className="text-text-secondary text-sm">
              {pullDistance >= 70 ? '↓ Release to refresh' : '↓ Pull to refresh'}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="sticky top-0 bg-background-secondary border-b border-border-color px-4 py-4 z-10 shadow-xl">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-coral text-background-primary shadow-lg shadow-coral/30'
                    : 'bg-background-tertiary text-text-primary hover:bg-background-primary border border-border-color hover:border-coral/50'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Filtering and Sorting Bar */}
          <div className="mt-4 flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder={`Search ${categories.find(c => c.id === category)?.label || 'recommendations'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border-color rounded-full text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
              />
            </div>
            
            {/* Location Button */}
            <button
              onClick={detectLocation}
              disabled={isLocating}
              className="p-3 bg-background-tertiary border border-border-color rounded-full font-medium hover:bg-background-primary transition disabled:opacity-50 text-text-secondary hover:text-coral hover:border-coral/50"
              aria-label="Detect Location"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            </button>
          </div>

          {/* Distance Filter - Centered */}
          <div className="mt-3 flex justify-center">
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
              <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
              <p className="text-text-secondary">Loading recommendations...</p>
            </div>
          </div>
        ) : recommendations.length === 0 && !error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-text-secondary text-lg">No recommendations found</p>
              <p className="text-text-secondary text-sm mt-2">Try adjusting your filters or preferences</p>
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
                distance={rec.distance}
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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, ArrowDown, MapPin, Navigation as NavIcon, Search, RefreshCw, Sliders, Zap } from 'lucide-react';
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
  const [currentMode, setCurrentMode] = useState<string>('discover');
  const [offset, setOffset] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  // Location & Distance State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState<number>(10);
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
      params.append('mode', currentMode);
      if (query) params.append('query', query);
      if (userLocation && currentMode === 'map') {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', (radius * 1609).toString());
      }
      params.append('limit', '10');
      params.append('offset', newOffset.toString());
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
  }, [category, currentMode, query, userLocation, radius]);

  useEffect(() => {
    const walkthroughCompleted = localStorage.getItem('lmk_walkthrough_completed');
    const preferencesCompleted = profile?.preferences_completed;
    const hasTasteProfile = profile?.taste_profile && Object.keys(profile.taste_profile).length > 0;
    
    if (!walkthroughCompleted) {
      setShowWalkthrough(true);
    } else if (!preferencesCompleted && !hasTasteProfile) {
      setShowPreferenceTest(true);
    } else {
      detectLocation();
    }
  }, [profile, detectLocation]);

  useEffect(() => {
    if (!showWalkthrough && !showPreferenceTest) {
      loadRecommendations();
    }
  }, [category, currentMode, showWalkthrough, showPreferenceTest, userLocation, radius, loadRecommendations]);

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
    setShowPreferenceTest(true);
  };

  const handlePreferenceTestComplete = () => {
    setShowPreferenceTest(false);
    localStorage.setItem('lmk_preferences_completed', 'true');
    detectLocation();
  };

  const handleModeChange = (mode: string) => {
    setCurrentMode(mode);
    setOffset(0);
    setSeenIds(new Set());
  };

  if (showWalkthrough) {
    return <Walkthrough onComplete={handleWalkthroughComplete} />;
  }

  if (showPreferenceTest) {
    return <PreferenceTest onComplete={handlePreferenceTestComplete} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#230f10]">
      <Navigation profile={profile} />
      <ModeNavigation currentMode={currentMode} onModeChange={handleModeChange} />
      
      <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div className="flex justify-center pt-4 pb-2">
            <div className="text-gray-400 text-sm">
              {pullDistance >= 70 ? '↓ Release to refresh' : '↓ Pull to refresh'}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="sticky top-0 bg-[#230f10] border-b border-gray-700 px-4 py-4 z-10">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  category === cat.id
                    ? 'bg-[#fea4a7] text-[#230f10] shadow-lg shadow-[#fea4a7]/30'
                    : 'bg-gray-800 text-gray-50 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${categories.find(c => c.id === category)?.label || 'recommendations'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-[#fea4a7]/50 focus:border-[#fea4a7]/50 outline-none"
              />
            </div>
            {currentMode === 'map' && (
              <button
                onClick={detectLocation}
                disabled={isLocating}
                className="px-4 py-2 bg-[#fea4a7] text-[#230f10] rounded-full font-medium hover:bg-[#fea4a7]/90 transition disabled:opacity-50"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <NavIcon className="w-4 h-4" />}
              </button>
            )}
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
              <Loader2 className="w-8 h-8 animate-spin text-[#fea4a7] mx-auto mb-4" />
              <p className="text-gray-400">Loading recommendations...</p>
            </div>
          </div>
        ) : recommendations.length === 0 && !error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-gray-400 text-lg">No recommendations found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or preferences</p>
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
              className="px-6 py-3 bg-[#fea4a7] text-[#230f10] rounded-full font-bold hover:bg-[#fea4a7]/90 transition flex items-center gap-2 shadow-lg shadow-[#fea4a7]/30"
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

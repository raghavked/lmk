'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, ArrowDown, MapPin, Navigation as NavIcon, Search, RefreshCw, Sliders, Zap } from 'lucide-react';
import ObjectCard from '@/components/ObjectCard';
import Navigation from '@/components/Navigation';
import Walkthrough from '@/components/Walkthrough';
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
  const [category, setCategory] = useState<string>('restaurants'); // Default to first category
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'feed' | 'quick'>('feed'); // New state for mode
  const [offset, setOffset] = useState(0); // State for pagination offset
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set()); // Track seen item IDs to prevent duplicates
  
  // Location & Distance State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState<number>(10); // Default 10 miles
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
      setSeenIds(new Set()); // Clear seen IDs on refresh
      newOffset = 0;
    } else if (newOffset === 0) {
      setLoading(true);
      setSeenIds(new Set()); // Clear seen IDs when switching categories
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('category', category);
      if (query) params.append('query', query);
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', (radius * 1609).toString());
      }
      params.append('limit', '10');
      params.append('mode', mode);
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
        
        // Update seenIds BEFORE updating recommendations to avoid stale state
        setRecommendations(prev => {
          const updatedRecs = newOffset === 0 ? newResults : [...prev, ...newResults];
          // Extract IDs from all currently visible items
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
  }, [category, query, userLocation, radius, mode]);

  useEffect(() => {
    const walkthroughCompleted = localStorage.getItem('lmk_walkthrough_completed');
    const hasTasteProfile = profile?.taste_profile && profile.taste_profile.length > 0;
    
    if (!walkthroughCompleted && !hasTasteProfile) {
      setShowWalkthrough(true);
    } else {
      detectLocation();
    }
  }, [profile, detectLocation]);

  useEffect(() => {
    if (!showWalkthrough) {
      loadRecommendations(false, 0); // Load initial recommendations on category/location change
    }
  }, [category, showWalkthrough, userLocation, radius, loadRecommendations]);

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
  
  const showLocationFilter = category === 'restaurants' || category === 'activities';

  return (
    <div 
      className="min-h-screen bg-background-primary text-gray-50 pb-24"
      onTouchStart={mode === 'feed' ? handleTouchStart : undefined}
      onTouchMove={mode === 'feed' ? handleTouchMove : undefined}
      onTouchEnd={mode === 'feed' ? handleTouchEnd : undefined}
    >
      {showWalkthrough && <Walkthrough onComplete={() => setShowWalkthrough(false)} />}
      <Navigation profile={profile} />
      
      {/* Pull to Refresh Indicator */}
      <div 
        className="flex justify-center items-center overflow-hidden transition-all duration-200 bg-background-primary"
        style={{ height: `${pullDistance}px`, opacity: pullDistance / 80 }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 animate-spin text-coral" />
        ) : (
          <ArrowDown className={`w-6 h-6 text-coral transition-transform ${pullDistance > 60 ? 'rotate-180' : ''}`} />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 main-content-padding">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-50 tracking-tight">Discover Feed</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Personalized recommendations</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={detectLocation}
              className={`p-3 rounded-2xl transition-all ${userLocation ? 'bg-coral/20 text-coral' : 'bg-background-secondary text-gray-400 border border-gray-700'}`}
            >
              {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <NavIcon className={`w-5 h-5 ${userLocation ? 'fill-current' : ''}`} />}
            </button>
            <button 
              onClick={() => loadRecommendations(true)}
              className="p-3 bg-background-secondary border border-gray-700 text-gray-400 rounded-2xl active:rotate-180 transition-transform duration-500 hover:text-coral hover:border-coral/30"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input 
            type="text"
            placeholder={`Search ${category.replace('_', ' ')}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRecommendations()}
            className="w-full bg-background-secondary border border-gray-700 rounded-2xl py-4 pl-12 pr-4 font-medium text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 transition-all shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 scroll-touch">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                haptics.selection();
                setCategory(cat.id);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all touch-feedback no-select ${
                category === cat.id
                  ? 'bg-coral text-background-primary shadow-lg scale-105'
                  : 'bg-background-secondary border border-gray-700 text-gray-300 hover:border-coral/50 hover:text-coral'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-xs uppercase tracking-widest">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Location Slider */}
        {showLocationFilter && userLocation && (
          <div className="mb-8 bg-background-secondary p-6 rounded-[32px] border border-gray-700 shadow-sm animate-in fade-in slide-in-from-top duration-500">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-coral" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Search Radius</span>
              </div>
              <span className="text-coral font-semibold text-sm">{radius} miles</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-coral"
            />
          </div>
        )}

        {/* Loading State */}
        {loading && !isRefreshing && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-[400px] bg-background-secondary rounded-[32px] animate-pulse flex flex-col p-6 space-y-4 border border-gray-700">
                <div className="w-full h-48 bg-gray-700 rounded-2xl" />
                <div className="w-2/3 h-8 bg-gray-700 rounded-lg" />
                <div className="w-full h-20 bg-gray-700 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && recommendations.length === 0 && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-[32px] p-8 text-center mb-8">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-red-300 font-bold mb-6">{error}</p>
            <button
              onClick={() => loadRecommendations()}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition font-bold shadow-lg shadow-red-900/20"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Sections View */}
        {!loading && sections && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {Object.entries(sections).map(([key, section]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-50 flex items-center gap-2">
                    <span className="text-2xl">{section.emoji}</span>
                    <span className="uppercase tracking-tight">{section.title}</span>
                  </h2>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 scroll-touch">
                  {section.items.map((result: any, idx: number) => (
                    <div key={idx} className="flex-shrink-0 w-[320px]">
                      <ObjectCard
                        object={result.object}
                        rank={result.rank}
                        score={result.personalized_score}
                        explanation={result.explanation}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations Grid */}
        {!loading && !sections && recommendations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
              {recommendations.map((result, idx) => (
                <ObjectCard
                  key={idx}
                  object={result.object}
                  rank={result.rank}
                  score={result.personalized_score}
                  explanation={result.explanation}
                />
              ))}
            </div>
            
            <div className="flex justify-center mt-12">
              <button
                onClick={() => loadRecommendations(false, offset)}
                disabled={loading}
                className="px-8 py-4 bg-coral text-background-primary rounded-2xl hover:bg-coral/90 transition font-bold uppercase tracking-widest text-xs shadow-lg shadow-coral/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Show More'
                )}
              </button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !sections && recommendations.length === 0 && !error && (
          <div className="bg-background-secondary rounded-[40px] p-16 text-center border border-gray-700 shadow-sm">
            <div className="text-6xl mb-6">✨</div>
            <h3 className="text-2xl font-bold text-gray-50 mb-2">No results found</h3>
            <p className="text-gray-400 font-medium mb-8 max-w-xs mx-auto">
              Try increasing your search radius or switching categories to find more recommendations.
            </p>
            <button
              onClick={() => setRadius(radius + 10)}
              className="px-10 py-4 bg-coral text-background-primary rounded-2xl hover:bg-coral/90 transition font-bold uppercase tracking-widest text-xs shadow-lg shadow-coral/30"
            >
              Expand Radius
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

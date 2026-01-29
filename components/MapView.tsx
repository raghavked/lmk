'use client';

import { useState, useEffect } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface MapViewProps {
  recommendations: any[];
  userLocation?: { lat: number; lng: number };
  onSelectRecommendation?: (recommendation: any) => void;
}

export default function MapView({
  recommendations,
  userLocation,
  onSelectRecommendation,
}: MapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setMapReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!mapReady) {
    return (
      <div className="w-full h-96 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  // Filter recommendations with location data
  const locatedRecommendations = recommendations.filter(
    (rec) => rec.object?.location?.coordinates || rec.location?.coordinates
  );

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="w-full h-96 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden relative">
        {/* Placeholder Map */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-coral mx-auto mb-3 opacity-50" />
            <p className="text-gray-400 font-semibold">Interactive Map Coming Soon</p>
            <p className="text-gray-500 text-sm mt-1">
              {locatedRecommendations.length} recommendations nearby
            </p>
          </div>
        </div>

        {/* User Location Indicator */}
        {userLocation && (
          <div className="absolute top-4 right-4 bg-coral/20 border border-coral rounded-full p-2 text-coral">
            <Navigation className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-50">Nearby Recommendations</h3>
        {locatedRecommendations.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No recommendations with location data available
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locatedRecommendations.slice(0, 6).map((rec) => {
              const location = rec.object?.location || rec.location;
              const distance = calculateDistance(
                userLocation?.lat || 0,
                userLocation?.lng || 0,
                location?.coordinates?.[0] || 0,
                location?.coordinates?.[1] || 0
              );

              return (
                <button
                  key={rec.object?.id || rec.id}
                  onClick={() => {
                    setSelectedMarker(rec.object?.id || rec.id);
                    onSelectRecommendation?.(rec);
                  }}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    selectedMarker === (rec.object?.id || rec.id)
                      ? 'bg-coral/20 border-coral'
                      : 'bg-gray-800 border-gray-700 hover:border-coral/50'
                  }`}
                >
                  <p className="font-semibold text-gray-50 truncate">
                    {rec.object?.name || rec.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>{distance.toFixed(1)} miles away</span>
                  </div>
                  {rec.ai_match_score && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-coral"
                          style={{ width: `${rec.ai_match_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-coral">
                        {rec.ai_match_score}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

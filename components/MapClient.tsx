'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin, Phone, Globe, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';

const LOCATION_CATEGORIES = ['restaurants', 'activities'];

export default function MapClient({ profile }: { profile: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('restaurants');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        error => {
          console.warn('Geolocation error:', error);
          // Continue without location
        }
      );
    }
  }, []);

  useEffect(() => {
    loadLocationItems();
  }, [selectedCategory]);

  const loadLocationItems = async () => {
    setLoading(true);
    setError(null);
    setSelectedItem(null);

    try {
      const response = await fetch(`/api/recommend/?category=${selectedCategory}&limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load items');
      }

      const data = await response.json();
      const locationItems = data.results?.filter((r: any) => 
        r.object.location?.coordinates && r.object.location.coordinates[0] && r.object.location.coordinates[1]
      ) || [];
      
      setItems(locationItems);
      if (locationItems.length === 0) {
        setError('No location-based items found in this category');
      }
    } catch (err: any) {
      console.error('Error loading items:', err);
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    restaurants: '🍽️ Restaurants',
    activities: '🎯 Activities',
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-black mb-2">
            Location Discovery
          </h1>
          <p className="text-black font-bold opacity-70 text-lg">
            Find recommendations near you
          </p>
        </div>

        {/* Category Selector */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-black mb-3">
            Choose a category:
          </label>
          <div className="flex gap-2">
            {LOCATION_CATEGORIES.map(cat => (
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
              <p className="text-black font-bold opacity-70">Loading locations...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
            <p className="text-red-700 font-bold mb-4">{error}</p>
            <button
              onClick={loadLocationItems}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Map View */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-black">Nearby {categoryLabels[selectedCategory]}</h3>
                  <p className="text-sm text-black opacity-70">{items.length} locations</p>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {items.map((result, idx) => {
                    const distance = userLocation && result.object.location?.coordinates
                      ? calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          result.object.location.coordinates[0],
                          result.object.location.coordinates[1]
                        )
                      : null;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedItem(result)}
                        className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                          selectedItem?.object.id === result.object.id ? 'bg-brand-50' : ''
                        }`}
                      >
                        <div className="font-bold text-black line-clamp-1">
                          {result.object.title}
                        </div>
                        <div className="text-sm text-black opacity-70 flex items-center gap-1 mt-1">
                          {distance && (
                            <>
                              <MapPin className="w-3 h-3" />
                              {distance.toFixed(1)} mi away
                            </>
                          )}
                        </div>
                        {result.personalized_score && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3 h-3 fill-brand-600 text-brand-600" />
                            <span className="text-xs font-bold text-black">
                              {result.personalized_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-2">
              {selectedItem ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-extrabold text-black mb-4">
                    {selectedItem.object.title}
                  </h2>

                  {selectedItem.object.primary_image?.url && (
                    <img
                      src={selectedItem.object.primary_image.url}
                      alt={selectedItem.object.title}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="space-y-4">
                    {selectedItem.object.description && (
                      <div>
                        <h3 className="font-bold text-black mb-2">About</h3>
                        <p className="text-black opacity-70">{selectedItem.object.description}</p>
                      </div>
                    )}

                    {selectedItem.object.location?.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-brand-600 flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-bold text-black">{selectedItem.object.location.address}</div>
                          {selectedItem.object.location.coordinates && userLocation && (
                            <div className="text-sm text-black opacity-70 mt-1">
                              {calculateDistance(
                                userLocation.lat,
                                userLocation.lng,
                                selectedItem.object.location.coordinates[0],
                                selectedItem.object.location.coordinates[1]
                              ).toFixed(1)} miles away
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedItem.object.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-brand-600" />
                        <a href={`tel:${selectedItem.object.phone}`} className="text-brand-600 font-bold hover:underline">
                          {selectedItem.object.phone}
                        </a>
                      </div>
                    )}

                    {selectedItem.object.source_links && selectedItem.object.source_links[0] && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-brand-600" />
                        <a href={selectedItem.object.source_links[0].url} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-bold hover:underline">
                          Visit Website
                        </a>
                      </div>
                    )}

                    {selectedItem.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-2">Why recommended</h3>
                        <p className="text-blue-800 text-sm">{selectedItem.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-5xl mb-4">📍</div>
                  <p className="text-black font-bold opacity-70">
                    Select a location to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && !error && (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-black mb-2">No locations found</h3>
            <p className="text-black font-bold opacity-70">
              Try a different category or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

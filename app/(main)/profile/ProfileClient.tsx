'use client';

import { useState, useEffect } from 'react';
import { Star, Heart, TrendingUp } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Image from 'next/image';

export default function ProfileClient({ profile }: { profile: any }) {
  const [ratings, setRatings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ratings' | 'favorites' | 'stats'>('ratings');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRatings();
    loadFavorites();
  }, []);
  
  const loadRatings = async () => {
    try {
      const response = await fetch('/api/ratings');
      const data = await response.json();
      setRatings(data.ratings || []);
    } catch (err) {
      console.error('Error loading ratings:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/ratings?type=favorites');
      const data = await response.json();
      setFavorites(data.ratings || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };
  
  const renderStats = () => {
    const stats = profile.stats || {};
    const ratingsByCategory = stats.ratings_by_category || [];
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Ratings</span>
              <Star className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.total_ratings || 0}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Avg Rating</span>
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.avg_rating_given?.toFixed(1) || '0.0'}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Friends</span>
              <Heart className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.friends_count || 0}
            </div>
          </div>
        </div>
        
        {ratingsByCategory.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ratings by Category</h3>
            <div className="space-y-3">
              {ratingsByCategory.map((item: any) => (
                <div key={item.category} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{item.category.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / stats.total_ratings) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-gray-900 font-semibold min-w-[40px] text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderRatings = () => {
    if (loading) {
      return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }
    
    if (ratings.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No ratings yet. Start rating items to build your taste profile!</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ratings.map((rating) => (
          <div key={rating.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex">
              {rating.objects.primary_image && (
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image
                    src={rating.objects.primary_image.url}
                    alt={rating.objects.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {rating.objects.title}
                    </h3>
                    <p className="text-xs text-gray-600 capitalize">
                      {rating.objects.category.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 rounded ml-2">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm">{rating.score}</span>
                  </div>
                </div>
                
                {rating.feedback && (
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {rating.feedback}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{new Date(rating.created_at).toLocaleDateString()}</span>
                  {rating.is_favorite && (
                    <span className="flex items-center gap-1 text-red-600">
                      <Heart className="w-3 h-3 fill-current" />
                      Favorite
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderFavorites = () => {
    if (favorites.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No favorites yet. Mark items as favorites to see them here!</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favorites.map((rating) => (
          <div key={rating.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex">
              {rating.objects.primary_image && (
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image
                    src={rating.objects.primary_image.url}
                    alt={rating.objects.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {rating.objects.title}
                    </h3>
                    <p className="text-xs text-gray-600 capitalize">
                      {rating.objects.category.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 rounded ml-2">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm">{rating.score}</span>
                  </div>
                </div>
                
                {rating.feedback && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {rating.feedback}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-3xl">
                {profile.display_name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
              <p className="text-gray-600">@{profile.username}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('ratings')}
            className={`pb-3 px-2 font-medium transition ${
              activeTab === 'ratings'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Ratings ({ratings.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-2 font-medium transition ${
              activeTab === 'favorites'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-2 font-medium transition ${
              activeTab === 'stats'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Stats
          </button>
        </div>
        
        {activeTab === 'ratings' && renderRatings()}
        {activeTab === 'favorites' && renderFavorites()}
        {activeTab === 'stats' && renderStats()}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Star, Heart, TrendingUp, Settings, Grid, Award } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Image from 'next/image';
import PreferenceTest from '@/components/PreferenceTest';

export default function ProfileClient({ profile: initialProfile }: { profile: any }) {
  const [profile, setProfile] = useState(initialProfile);
  const [ratings, setRatings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ratings' | 'favorites' | 'stats' | 'preferences'>('ratings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadRatings();
    loadFavorites();
    
    // If no taste profile, default to preferences tab
    if (!profile?.taste_profile || profile.taste_profile.length === 0) {
      setActiveTab('preferences');
    }
  }, []);
  
  const loadRatings = async () => {
    try {
      const response = await fetch('/api/ratings');
      if (!response.ok) throw new Error('Failed to load ratings');
      const data = await response.json();
      setRatings(data.ratings || []);
    } catch (err) {
      console.error('Error loading ratings:', err);
      setError('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };
  
  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/ratings?type=favorites');
      if (!response.ok) throw new Error('Failed to load favorites');
      const data = await response.json();
      setFavorites(data.ratings || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const handlePreferenceComplete = async () => {
    // Refresh profile data
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
    setActiveTab('ratings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const renderStats = () => {
    if (!profile) return null;
    
    const stats = profile.stats || {};
    const ratingsByCategory = stats.ratings_by_category || [];
    
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-black opacity-40 uppercase tracking-wider">Total Ratings</span>
              <Star className="w-5 h-5 text-brand-600" />
            </div>
            <div className="text-3xl font-extrabold text-black">
              {stats.total_ratings || 0}
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-black opacity-40 uppercase tracking-wider">Avg Rating</span>
              <TrendingUp className="w-5 h-5 text-brand-600" />
            </div>
            <div className="text-3xl font-extrabold text-black">
              {stats.avg_rating_given?.toFixed(1) || '0.0'}
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-black opacity-40 uppercase tracking-wider">Friends</span>
              <Heart className="w-5 h-5 text-brand-600" />
            </div>
            <div className="text-3xl font-extrabold text-black">
              {stats.friends_count || 0}
            </div>
          </div>
        </div>
        
        {ratingsByCategory && ratingsByCategory.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-black mb-6">Ratings by Category</h3>
            <div className="space-y-4">
              {ratingsByCategory.map((item: any) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-black capitalize">{item.category?.replace('_', ' ')}</span>
                    <span className="text-sm font-extrabold text-brand-600">{item.count || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.total_ratings ? (item.count / stats.total_ratings) * 100 : 0}%`,
                      }}
                    />
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
      return (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 rounded-3xl p-8 text-center border border-red-100">
          <p className="text-red-600 font-bold">{error}</p>
        </div>
      );
    }
    
    if (ratings.length === 0) {
      return (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <Star className="w-16 h-16 text-gray-200 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-black mb-2">No ratings yet</h3>
          <p className="text-black font-bold opacity-40 mb-8 max-w-xs mx-auto">Start rating items to build your taste profile!</p>
          <button 
            onClick={() => window.location.href = '/discover'}
            className="w-full py-4 bg-brand-600 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-brand-100"
          >
            Go Discover
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
        {ratings.map((rating) => (
          <div key={rating.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex p-4 gap-4">
              {rating.objects?.primary_image?.url && (
                <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden">
                  <Image
                    src={rating.objects.primary_image.url}
                    alt={rating.objects?.title || 'Item'}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-black truncate">
                      {rating.objects?.title || 'Unknown'}
                    </h3>
                    <p className="text-[10px] font-bold text-black opacity-40 uppercase tracking-wider">
                      {rating.objects?.category?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-1 rounded-full flex-shrink-0">
                    <Star className="w-3 h-3 fill-brand-600 text-brand-600" />
                    <span className="font-extrabold text-xs">{rating.score || 0}</span>
                  </div>
                </div>
                
                {(rating.description || rating.feedback) && (
                  <p className="text-xs text-black opacity-60 line-clamp-2 mb-2 leading-relaxed">
                    {rating.description || rating.feedback}
                  </p>
                )}
                
                {rating.hashtags && rating.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {rating.hashtags.map((tag: string) => (
                      <span key={tag} className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-black opacity-30">{rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'N/A'}</span>
                  {rating.is_favorite && (
                    <span className="flex items-center gap-1 text-red-500">
                      <Heart className="w-3 h-3 fill-current" />
                      FAVORITE
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
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <Heart className="w-16 h-16 text-gray-200 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-black mb-2">No favorites yet</h3>
          <p className="text-black font-bold opacity-40 max-w-xs mx-auto">Mark items as favorites to see them here!</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
        {favorites.map((rating) => (
          <div key={rating.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex p-4 gap-4">
              {rating.objects?.primary_image?.url && (
                <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden">
                  <Image
                    src={rating.objects.primary_image.url}
                    alt={rating.objects?.title || 'Item'}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-black truncate">
                      {rating.objects?.title || 'Unknown'}
                    </h3>
                    <p className="text-[10px] font-bold text-black opacity-40 uppercase tracking-wider">
                      {rating.objects?.category?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-1 rounded-full flex-shrink-0">
                    <Star className="w-3 h-3 fill-brand-600 text-brand-600" />
                    <span className="font-extrabold text-xs">{rating.score || 0}</span>
                  </div>
                </div>
                
                {rating.feedback && (
                  <p className="text-xs text-black opacity-60 line-clamp-2 leading-relaxed">
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
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-black font-bold opacity-40 mb-6">Profile not found</p>
          <button 
            onClick={() => window.location.href = '/discover'}
            className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-extrabold shadow-lg shadow-brand-100"
          >
            Go to Discover
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Navigation profile={profile} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center border-2 border-brand-100">
                <span className="text-brand-700 font-extrabold text-3xl">
                  {profile.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-black leading-tight">
                  {profile.full_name || 'User'}
                </h1>
                <p className="text-sm font-bold text-black opacity-40">
                  @{profile.display_name || profile.full_name?.toLowerCase().replace(' ', '_') || 'user'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('preferences')}
              className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-black opacity-40 hover:opacity-100 transition-opacity"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2">
            {[
              { id: 'ratings', label: 'Ratings', icon: Grid },
              { id: 'favorites', label: 'Favorites', icon: Heart },
              { id: 'stats', label: 'Stats', icon: Award },
              { id: 'preferences', label: 'Preferences', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-100'
                    : 'bg-gray-50 text-black opacity-40 hover:opacity-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'ratings' && renderRatings()}
          {activeTab === 'favorites' && renderFavorites()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'preferences' && (
            <div className="animate-in fade-in slide-in-from-bottom duration-500">
              <PreferenceTest onComplete={handlePreferenceComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

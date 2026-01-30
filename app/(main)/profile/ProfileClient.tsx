'use client';

import { useState, useEffect } from 'react';
import { Star, Heart, TrendingUp, Settings, Grid, Award, Loader2, AlertCircle, Check, Trash2, User, Lock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ModeNavigation from '@/components/ModeNavigation';
import Image from 'next/image';
import PreferenceTest from '@/components/PreferenceTest';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ProfileClient({ profile: initialProfile }: { profile: any }) {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(initialProfile);
  const [ratings, setRatings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ratings' | 'favorites' | 'stats' | 'preferences' | 'settings'>('ratings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [settingsName, setSettingsName] = useState(initialProfile?.full_name || '');
  const [settingsDisplayName, setSettingsDisplayName] = useState(initialProfile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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

  const handleSaveProfile = async () => {
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: settingsName, 
          display_name: settingsDisplayName 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
      setSettingsMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSettingsMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setSettingsMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNewPassword('');
      setConfirmPassword('');
      setSettingsMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setSettingsMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const response = await fetch('/api/profile', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || 'Failed to delete account' });
      setSettingsSaving(false);
    }
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {settingsMessage && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 ${
            settingsMessage.type === 'success' 
              ? 'bg-green-900/20 border border-green-700 text-green-300'
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {settingsMessage.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{settingsMessage.text}</span>
          </div>
        )}

        <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-coral" />
            <h3 className="text-xl font-extrabold text-text-primary">Profile Information</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Full Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                className="w-full px-4 py-3 bg-background-secondary border border-border-color rounded-xl text-text-primary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Display Name</label>
              <input
                type="text"
                value={settingsDisplayName}
                onChange={(e) => setSettingsDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-background-secondary border border-border-color rounded-xl text-text-primary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
                placeholder="@username"
              />
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={settingsSaving}
              className="w-full py-3 bg-coral text-background-primary rounded-xl font-bold hover:bg-coral/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {settingsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-coral" />
            <h3 className="text-xl font-extrabold text-text-primary">Change Password</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background-secondary border border-border-color rounded-xl text-text-primary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background-secondary border border-border-color rounded-xl text-text-primary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              onClick={handleChangePassword}
              disabled={settingsSaving || !newPassword || !confirmPassword}
              className="w-full py-3 bg-coral text-background-primary rounded-xl font-bold hover:bg-coral/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {settingsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Update Password
            </button>
          </div>
        </div>

        <div className="bg-background-tertiary rounded-3xl border border-red-700/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
            <h3 className="text-xl font-extrabold text-red-400">Delete Account</h3>
          </div>
          
          <p className="text-text-secondary mb-4">
            This action is permanent and cannot be undone. All your data, ratings, and preferences will be deleted.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-red-900/30 border border-red-700 text-red-400 rounded-xl font-bold hover:bg-red-900/50 transition"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-red-400 mb-2">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 bg-background-secondary border border-red-700 rounded-xl text-text-primary focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none"
                  placeholder="DELETE"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 py-3 bg-background-secondary border border-border-color text-text-primary rounded-xl font-bold hover:bg-background-tertiary transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={settingsSaving || deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {settingsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderStats = () => {
    if (!profile) return null;
    
    const stats = profile.stats || {};
    const ratingsByCategory = stats.ratings_by_category || [];
    
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Total Ratings</span>
              <Star className="w-5 h-5 text-coral" />
            </div>
            <div className="text-3xl font-extrabold text-text-primary">
              {stats.total_ratings || 0}
            </div>
          </div>
          
          <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Avg Rating</span>
              <TrendingUp className="w-5 h-5 text-coral" />
            </div>
            <div className="text-3xl font-extrabold text-text-primary">
              {stats.avg_rating_given?.toFixed(1) || '0.0'}
            </div>
          </div>
          
          <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Friends</span>
              <Heart className="w-5 h-5 text-coral" />
            </div>
            <div className="text-3xl font-extrabold text-text-primary">
              {stats.friends_count || 0}
            </div>
          </div>
        </div>
        
        {ratingsByCategory && ratingsByCategory.length > 0 && (
          <div className="bg-background-tertiary rounded-3xl border border-border-color p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-text-primary mb-6">Ratings by Category</h3>
            <div className="space-y-4">
              {ratingsByCategory.map((item: any) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary capitalize">{item.category?.replace('_', ' ')}</span>
                    <span className="text-sm font-extrabold text-coral">{item.count || 0}</span>
                  </div>
                  <div className="w-full bg-background-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-coral h-full rounded-full transition-all duration-500"
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coral"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-900/20 rounded-3xl p-8 text-center border border-red-700">
          <p className="text-red-300 font-bold">{error}</p>
        </div>
      );
    }
    
    if (ratings.length === 0) {
      return (
        <div className="bg-background-tertiary rounded-3xl p-12 text-center border border-border-color shadow-sm">
          <Star className="w-16 h-16 text-text-secondary mx-auto mb-6" />
          <h3 className="text-xl font-bold text-text-primary mb-2">No ratings yet</h3>
          <p className="text-text-secondary mb-8 max-w-xs mx-auto">Start rating items to build your taste profile!</p>
          <button 
            onClick={() => window.location.href = '/discover'}
            className="w-full py-4 bg-coral text-background-primary rounded-2xl font-extrabold text-lg shadow-lg shadow-coral/30"
          >
            Go Discover
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
        {ratings.map((rating) => (
          <div key={rating.id} className="bg-background-secondary rounded-3xl border border-border-color overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
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
                    <h3 className="font-bold text-text-primary truncate">
                      {rating.objects?.title || 'Unknown'}
                    </h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      {rating.objects?.category?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-coral/20 text-coral px-2 py-1 rounded-full flex-shrink-0">
                    <Star className="w-3 h-3 fill-coral text-coral" />
                    <span className="font-extrabold text-xs">{rating.score || 0}</span>
                  </div>
                </div>
                
                {(rating.description || rating.feedback) && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2 leading-relaxed">
                    {rating.description || rating.feedback}
                  </p>
                )}
                
                {rating.hashtags && rating.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {rating.hashtags.map((tag: string) => (
                      <span key={tag} className="bg-coral/20 px-1.5 py-0.5 rounded-md text-coral text-[10px] font-bold uppercase tracking-wider">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-text-secondary">{rating.created_at ? new Date(rating.created_at).toLocaleDateString() : 'N/A'}</span>
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
        <div className="bg-background-tertiary rounded-3xl p-12 text-center border border-border-color shadow-sm">
          <Heart className="w-16 h-16 text-text-secondary mx-auto mb-6" />
          <h3 className="text-xl font-bold text-text-primary mb-2">No favorites yet</h3>
          <p className="text-text-secondary max-w-xs mx-auto">Mark items as favorites to see them here!</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
        {favorites.map((rating) => (
          <div key={rating.id} className="bg-background-secondary rounded-3xl border border-border-color overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
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
                    <h3 className="font-bold text-text-primary truncate">
                      {rating.objects?.title || 'Unknown'}
                    </h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      {rating.objects?.category?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-coral/20 text-coral px-2 py-1 rounded-full flex-shrink-0">
                    <Star className="w-3 h-3 fill-coral text-coral" />
                    <span className="font-extrabold text-xs">{rating.score || 0}</span>
                  </div>
                </div>
                
                {rating.feedback && (
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
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
      <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-text-secondary mb-6">Profile not found</p>
          <button 
            onClick={() => window.location.href = '/discover'}
            className="px-8 py-3 bg-coral text-background-primary rounded-2xl font-extrabold shadow-lg shadow-coral/30"
          >
            Go to Discover
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background-primary pb-24">
      <Navigation profile={profile} />
      <ModeNavigation />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-background-tertiary rounded-[32px] border border-border-color p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-coral/10 rounded-3xl flex items-center justify-center border-2 border-coral/20">
                <span className="text-coral font-extrabold text-3xl">
                  {profile.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-text-primary leading-tight">
                  {profile.full_name || 'User'}
                </h1>
                <p className="text-sm font-bold text-text-secondary">
                  @{profile.display_name || profile.full_name?.toLowerCase().replace(' ', '_') || 'user'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('settings')}
              className="w-12 h-12 flex items-center justify-center bg-background-secondary rounded-2xl text-text-secondary hover:text-coral transition-colors"
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
              { id: 'preferences', label: 'Preferences', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-coral text-background-primary shadow-md shadow-coral/20'
                    : 'bg-background-secondary text-text-secondary hover:text-text-primary'
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
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  );
}

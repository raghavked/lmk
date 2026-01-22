'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Users, Clock, Check } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function FriendsClient({ profile }: { profile: any }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [addFriendIdentifier, setAddFriendIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'pending'>('friends');
  
  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, []);
  
  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends?type=accepted');
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };
  
  const loadPendingRequests = async () => {
    try {
      const response = await fetch('/api/friends?type=pending');
      const data = await response.json();
      
      if (data.friends) {
        const pending = data.friends.filter((f: any) => 
          f.friendship_id && f.initiated_by !== profile.id
        );
        setPendingRequests(pending);
      }
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };
  
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: addFriendIdentifier,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSuccess('Friend request sent!');
      setAddFriendIdentifier('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendshipId}/accept`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      await loadFriends();
      await loadPendingRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation profile={profile} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Friends</h1>
          <p className="text-gray-600">
            Connect with friends to see their ratings and get better recommendations
          </p>
        </div>
        
        {/* Add Friend Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Friend</h2>
          
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="text"
              value={addFriendIdentifier}
              onChange={(e) => setAddFriendIdentifier(e.target.value)}
              placeholder="Enter username or email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !addFriendIdentifier.trim()}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add
            </button>
          </form>
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('friends')}
            className={`pb-3 px-2 font-medium transition flex items-center gap-2 ${
              activeTab === 'friends'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-2 font-medium transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-5 h-5" />
            Pending ({pendingRequests.length})
          </button>
        </div>
        
        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No friends yet. Add some to get started!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-bold text-lg">
                          {friend.display_name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{friend.display_name}</h3>
                        <p className="text-sm text-gray-600">@{friend.username}</p>
                      </div>
                    </div>
                    
                    {friend.compatibility && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                          {friend.compatibility.overall_score}%
                        </div>
                        <p className="text-xs text-gray-600">Taste Match</p>
                      </div>
                    )}
                  </div>
                  
                  {friend.stats && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Ratings: </span>
                        <span className="font-semibold text-gray-900">
                          {friend.stats.total_ratings || 0}
                        </span>
                      </div>
                      {friend.compatibility && friend.compatibility.shared_ratings_count > 0 && (
                        <div>
                          <span className="text-gray-600">Shared: </span>
                          <span className="font-semibold text-gray-900">
                            {friend.compatibility.shared_ratings_count}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending friend requests</p>
              </div>
            ) : (
              pendingRequests.map((friend) => (
                <div key={friend.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-bold text-lg">
                          {friend.display_name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{friend.display_name}</h3>
                        <p className="text-sm text-gray-600">@{friend.username}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAcceptFriend(friend.friendship_id)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-medium flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

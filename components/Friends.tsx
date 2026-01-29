'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserPlus, UserCheck, UserX, Search, Loader2 } from 'lucide-react';

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  status: 'pending' | 'accepted' | 'blocked';
}

export default function Friends() {
  const supabase = createClientComponentClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load accepted friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id, profiles(id, full_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      // Load pending requests
      const { data: pendingData } = await supabase
        .from('friends')
        .select('user_id, profiles(id, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      setFriends(friendsData?.map((f: any) => ({
        id: f.profiles.id,
        full_name: f.profiles.full_name,
        avatar_url: f.profiles.avatar_url,
        status: 'accepted',
      })) || []);

      setPendingRequests(pendingData?.map((f: any) => ({
        id: f.profiles.id,
        full_name: f.profiles.full_name,
        avatar_url: f.profiles.avatar_url,
        status: 'pending',
      })) || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      loadFriends();
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      loadFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      loadFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setTab('friends')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'friends'
              ? 'border-coral text-coral'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-coral text-coral'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'search'
              ? 'border-coral text-coral'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Find Friends
        </button>
      </div>

      {/* Friends List */}
      {tab === 'friends' && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No friends yet. Find some friends!</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  {friend.avatar_url && (
                    <img src={friend.avatar_url} alt={friend.full_name} className="w-10 h-10 rounded-full" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-50">{friend.full_name}</p>
                  </div>
                </div>
                <UserCheck className="w-5 h-5 text-coral" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Requests */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  {request.avatar_url && (
                    <img src={request.avatar_url} alt={request.full_name} className="w-10 h-10 rounded-full" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-50">{request.full_name}</p>
                    <p className="text-xs text-gray-400">Sent you a friend request</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="p-2 bg-coral text-[#0D1117] rounded-full hover:bg-coral/90 transition"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="p-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-2xl py-3 pl-12 pr-4 text-gray-50 placeholder:text-gray-500 focus:ring-2 focus:ring-coral/50"
            />
          </div>
          <p className="text-gray-400 text-center py-8">Search functionality coming soon</p>
        </div>
      )}
    </div>
  );
}

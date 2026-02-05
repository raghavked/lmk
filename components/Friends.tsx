'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserPlus, UserCheck, UserX, Search, Loader2, Star, Eye, X } from 'lucide-react';

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  status: 'pending' | 'accepted' | 'blocked';
}

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface FriendRating {
  id: string;
  item_title: string;
  category: string;
  rating: number;
  review?: string;
  created_at: string;
}

export default function Friends() {
  const supabase = createClientComponentClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendRatings, setFriendRatings] = useState<FriendRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load accepted friends (both directions)
      const { data: friendsData1 } = await supabase
        .from('friends')
        .select('friend_id, profiles!friends_friend_id_fkey(id, full_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const { data: friendsData2 } = await supabase
        .from('friends')
        .select('user_id, profiles!friends_user_id_fkey(id, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted');

      // Load pending requests sent to me
      const { data: pendingData } = await supabase
        .from('friends')
        .select('user_id, profiles!friends_user_id_fkey(id, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      // Load requests I've sent
      const { data: sentData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const allFriends: Friend[] = [];
      
      friendsData1?.forEach((f: any) => {
        if (f.profiles) {
          allFriends.push({
            id: f.profiles.id,
            full_name: f.profiles.full_name || 'Unknown User',
            avatar_url: f.profiles.avatar_url,
            status: 'accepted',
          });
        }
      });

      friendsData2?.forEach((f: any) => {
        if (f.profiles && !allFriends.find(af => af.id === f.profiles.id)) {
          allFriends.push({
            id: f.profiles.id,
            full_name: f.profiles.full_name || 'Unknown User',
            avatar_url: f.profiles.avatar_url,
            status: 'accepted',
          });
        }
      });

      setFriends(allFriends);

      setPendingRequests(pendingData?.map((f: any) => ({
        id: f.profiles?.id || f.user_id,
        full_name: f.profiles?.full_name || 'Unknown User',
        avatar_url: f.profiles?.avatar_url,
        status: 'pending',
      })) || []);

      setSentRequests(sentData?.map((r: any) => r.friend_id) || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(20);

      // Filter out existing friends
      const friendIds = friends.map(f => f.id);
      const filtered = data?.filter(u => !friendIds.includes(u.id)) || [];
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if request already exists
      const { data: existing } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .single();

      if (existing) {
        console.log('Friend request already exists');
        return;
      }

      await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      setSentRequests([...sentRequests, friendId]);
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

      // Also create reverse friendship
      await supabase
        .from('friends')
        .upsert({
          user_id: user.id,
          friend_id: friendId,
          status: 'accepted',
        });

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

  const loadFriendRatings = async (friendId: string) => {
    try {
      setLoadingRatings(true);
      const { data } = await supabase
        .from('ratings')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })
        .limit(20);

      setFriendRatings(data || []);
    } catch (error) {
      console.error('Error loading friend ratings:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const viewFriendProfile = (friend: Friend) => {
    setSelectedFriend(friend);
    loadFriendRatings(friend.id);
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
      {/* Friend Profile Modal */}
      {selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border-color flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedFriend.avatar_url ? (
                  <img src={selectedFriend.avatar_url} alt={selectedFriend.full_name} className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-coral/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-coral">{selectedFriend.full_name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-extrabold text-text-primary">{selectedFriend.full_name}</h2>
                  <p className="text-text-secondary">Friend's Ratings & Recommendations</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFriend(null)}
                className="p-2 hover:bg-background-secondary rounded-full transition"
              >
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingRatings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-coral" />
                </div>
              ) : friendRatings.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No ratings yet from this friend</p>
              ) : (
                <div className="space-y-4">
                  {friendRatings.map((rating) => (
                    <div key={rating.id} className="bg-background-secondary p-4 rounded-lg border border-border-color">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-text-primary">{rating.item_title}</h3>
                          <p className="text-sm text-coral capitalize">{rating.category?.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-text-primary">{rating.rating}/10</span>
                        </div>
                      </div>
                      {rating.review && (
                        <p className="text-text-secondary mt-2">{rating.review}</p>
                      )}
                      <p className="text-xs text-text-secondary mt-2">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-color">
        <button
          onClick={() => setTab('friends')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'friends'
              ? 'border-coral text-coral'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-coral text-coral'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            tab === 'search'
              ? 'border-coral text-coral'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Find Friends
        </button>
      </div>

      {/* Friends List */}
      {tab === 'friends' && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary text-lg">No friends yet</p>
              <p className="text-text-secondary text-sm mt-1">Search for friends to connect with!</p>
              <button
                onClick={() => setTab('search')}
                className="mt-4 px-6 py-2 bg-coral text-background-primary rounded-lg font-bold hover:bg-coral/90 transition"
              >
                Find Friends
              </button>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-background-secondary rounded-2xl border border-border-color">
                <div className="flex items-center gap-3">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt={friend.full_name} className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-coral">{friend.full_name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-text-primary">{friend.full_name}</p>
                    <p className="text-xs text-text-secondary">Friend</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewFriendProfile(friend)}
                    className="p-2 bg-background-tertiary text-coral rounded-lg hover:bg-coral/20 transition flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Ratings</span>
                  </button>
                  <UserCheck className="w-5 h-5 text-coral" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Requests */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <p className="text-text-secondary text-center py-8">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-background-secondary rounded-2xl border border-border-color">
                <div className="flex items-center gap-3">
                  {request.avatar_url ? (
                    <img src={request.avatar_url} alt={request.full_name} className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-coral">{request.full_name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-text-primary">{request.full_name}</p>
                    <p className="text-xs text-text-secondary">Sent you a friend request</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="p-2 bg-coral text-background-primary rounded-full hover:bg-coral/90 transition"
                    title="Accept"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="p-2 bg-background-tertiary text-text-secondary rounded-full hover:bg-red-500/20 hover:text-red-500 transition"
                    title="Reject"
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-secondary border border-border-color rounded-2xl py-3 pl-12 pr-4 text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
          
          {searching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-coral" />
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary">Type at least 2 characters to search</p>
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-text-secondary text-center py-8">No users found matching "{searchQuery}"</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => {
                const isPending = sentRequests.includes(user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-background-secondary rounded-2xl border border-border-color">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-coral">{user.full_name?.charAt(0) || '?'}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-text-primary">{user.full_name || 'Unknown'}</p>
                      </div>
                    </div>
                    {isPending ? (
                      <span className="px-4 py-2 bg-background-tertiary text-text-secondary rounded-lg text-sm font-medium">
                        Request Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(user.id)}
                        className="px-4 py-2 bg-coral text-background-primary rounded-lg hover:bg-coral/90 transition font-bold flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserPlus, UserCheck, UserX, Search, Loader2, Star, Eye, X, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ModeNavigation from '@/components/ModeNavigation';

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
  item_id: string;
  item_title: string;
  category: string;
  rating: number;
  review?: string;
  created_at: string;
}

export default function FriendsClient({ profile }: { profile: any }) {
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

      const { data: pendingData } = await supabase
        .from('friends')
        .select('user_id, profiles!friends_user_id_fkey(id, full_name, avatar_url)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

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

      const pending: Friend[] = [];
      pendingData?.forEach((f: any) => {
        if (f.profiles) {
          pending.push({
            id: f.profiles.id,
            full_name: f.profiles.full_name || 'Unknown User',
            avatar_url: f.profiles.avatar_url,
            status: 'pending',
          });
        }
      });

      setFriends(allFriends);
      setPendingRequests(pending);
      setSentRequests(sentData?.map((s: any) => s.friend_id) || []);
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
        .limit(50);

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

  return (
    <div className="min-h-screen bg-background-primary">
      <Navigation profile={profile} />
      <ModeNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-text-primary mb-2">
              Friends
            </h1>
            <p className="text-text-secondary text-lg">
              Connect and share recommendations
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background-tertiary px-4 py-2 rounded-full border border-border-color">
            <Users className="w-5 h-5 text-coral" />
            <span className="font-bold text-text-primary">{friends.length}</span>
          </div>
        </div>

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
                    <p className="text-text-secondary">Ratings & Recommendations</p>
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
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= rating.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`}
                              />
                            ))}
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

        <div className="flex gap-2 border-b border-border-color mb-6">
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              tab === 'friends'
                ? 'border-coral text-coral'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              tab === 'pending'
                ? 'border-coral text-coral'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              tab === 'search'
                ? 'border-coral text-coral'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Find Friends
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-coral" />
          </div>
        ) : (
          <>
            {tab === 'friends' && (
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                    <p className="text-text-secondary text-lg mb-2">No friends yet</p>
                    <p className="text-text-secondary text-sm">Search for friends to connect with!</p>
                    <button
                      onClick={() => setTab('search')}
                      className="mt-4 px-6 py-2 bg-coral text-background-primary rounded-full font-bold hover:bg-coral/90 transition"
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
                          <p className="font-bold text-text-primary">{friend.full_name}</p>
                          <p className="text-sm text-text-secondary">Friend</p>
                        </div>
                      </div>
                      <button
                        onClick={() => viewFriendProfile(friend)}
                        className="flex items-center gap-2 px-4 py-2 bg-coral text-background-primary rounded-lg font-bold hover:bg-coral/90 transition"
                      >
                        <Eye className="w-4 h-4" />
                        View Ratings
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

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
                          <p className="font-bold text-text-primary">{request.full_name}</p>
                          <p className="text-sm text-text-secondary">Wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          title="Accept"
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          title="Reject"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'search' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-background-tertiary border border-border-color rounded-xl text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none"
                  />
                  {searching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coral animate-spin" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map((user) => (
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
                            <p className="font-bold text-text-primary">{user.full_name || 'Unknown User'}</p>
                          </div>
                        </div>
                        {sentRequests.includes(user.id) ? (
                          <span className="px-4 py-2 bg-background-tertiary text-text-secondary rounded-lg font-bold">
                            Request Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(user.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-coral text-background-primary rounded-lg font-bold hover:bg-coral/90 transition"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add Friend
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-text-secondary text-center py-8">No users found matching "{searchQuery}"</p>
                )}

                {searchQuery.length < 2 && (
                  <p className="text-text-secondary text-center py-8">Type at least 2 characters to search</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

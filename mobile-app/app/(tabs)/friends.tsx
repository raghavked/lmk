import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface Friend {
  id: string;
  full_name: string;
  avatar_url?: string;
  status: 'pending' | 'accepted';
}

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
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
        if (f.profiles) {
          allFriends.push({
            id: f.profiles.id,
            full_name: f.profiles.full_name || 'Unknown User',
            avatar_url: f.profiles.avatar_url,
            status: 'accepted',
          });
        }
      });

      setFriends(allFriends);

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
      setPendingRequests(pending);

      setSentRequests(sentData?.map((s: any) => s.friend_id) || []);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);

      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: userId,
        status: 'pending',
      });

      setSentRequests([...sentRequests, userId]);
      Alert.alert('Success', 'Friend request sent!');
    } catch (err) {
      console.error('Error sending request:', err);
    }
  };

  const acceptRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', userId)
        .eq('friend_id', user.id);

      loadFriends();
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('friends')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', user.id);

      loadFriends();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const isFriend = (userId: string) => friends.some(f => f.id === userId);
  const hasSentRequest = (userId: string) => sentRequests.includes(userId);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['friends', 'pending', 'search'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'friends' ? `Friends (${friends.length})` : 
               t === 'pending' ? `Pending (${pendingRequests.length})` : 
               'Search'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent.coral} style={styles.loader} />
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet. Search to add friends!</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{friend.full_name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.friendName}>{friend.full_name}</Text>
              </View>
            ))
          )
        ) : tab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests</Text>
          ) : (
            pendingRequests.map((request) => (
              <View key={request.id} style={styles.friendCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{request.full_name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.friendName}>{request.full_name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(request.id)}>
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(request.id)}>
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          searching ? (
            <ActivityIndicator size="large" color={Colors.accent.coral} style={styles.loader} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
            </Text>
          ) : (
            searchResults.map((user) => (
              <View key={user.id} style={styles.friendCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.full_name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.friendName}>{user.full_name}</Text>
                {isFriend(user.id) ? (
                  <Text style={styles.statusText}>Already friends</Text>
                ) : hasSentRequest(user.id) ? (
                  <Text style={styles.statusText}>Request sent</Text>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => sendFriendRequest(user.id)}>
                    <Text style={styles.btnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent.coral,
  },
  tabText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  activeTabText: {
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    color: Colors.text.primary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 40,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectBtn: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtn: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnText: {
    color: Colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  statusText: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
});

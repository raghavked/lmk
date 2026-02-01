import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { FriendListSkeleton } from '../../components/SkeletonLoader';
import { ErrorView, NetworkError } from '../../components/ErrorBoundary';
import * as Haptics from 'expo-haptics';

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
  const { getAccessToken } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadFriends();
    setRefreshing(false);
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
      if (!refreshing) setLoading(true);
      setError(null);
      
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('Please sign in to view friends');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/friends`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        const allFriends: Friend[] = (data.friends || []).map((f: any) => ({
          id: f.id,
          full_name: f.full_name || 'Unknown User',
          avatar_url: f.avatar_url,
          status: 'accepted' as const,
        }));
        setFriends(allFriends);

        const pending: Friend[] = (data.pending || []).map((f: any) => ({
          id: f.id,
          full_name: f.full_name || 'Unknown User',
          avatar_url: f.avatar_url,
          status: 'pending' as const,
        }));
        setPendingRequests(pending);

        setSentRequests(data.sentRequests || []);
      } else {
        const errorText = await response.text();
        console.error('Error loading friends:', errorText);
        setError('Could not load friends. Please try again.');
      }
    } catch (err: any) {
      console.error('Error loading friends:', err);
      if (err.message?.includes('network') || err.message?.includes('Network')) {
        setError('network');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please sign in to send friend requests');
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/friends`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'send',
          friendId: userId,
        }),
      });

      if (response.ok) {
        setSentRequests([...sentRequests, userId]);
        Alert.alert('Success', 'Friend request sent!');
      } else {
        const errorData = await response.json();
        console.error('Error sending request:', errorData);
        Alert.alert('Error', errorData.error || 'Could not send friend request. Please try again.');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const acceptRequest = async (userId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/friends`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'accept',
          friendId: userId,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Friend request accepted!');
        loadFriends();
      }
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/friends`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
        body: JSON.stringify({
          action: 'reject',
          friendId: userId,
        }),
      });

      if (response.ok) {
        loadFriends();
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const isFriend = (userId: string) => friends.some(f => f.id === userId);
  const hasSentRequest = (userId: string) => sentRequests.includes(userId);

  if (loading && !refreshing) {
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
                {t === 'friends' ? 'Friends' : t === 'pending' ? 'Pending' : 'Search'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FriendListSkeleton count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {error === 'network' ? (
          <NetworkError onRetry={loadFriends} />
        ) : (
          <ErrorView message={error} onRetry={loadFriends} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['friends', 'pending', 'search'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab(t);
            }}
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
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={Colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor={Colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent.coral}
          />
        }
      >
        {tab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.text.secondary} />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Search to add friends!</Text>
            </View>
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
    paddingTop: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
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

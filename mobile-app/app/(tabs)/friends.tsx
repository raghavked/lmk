import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert, RefreshControl, Modal, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { FriendListSkeleton } from '../../components/SkeletonLoader';
import { ErrorView, NetworkError } from '../../components/ErrorBoundary';
import * as Haptics from 'expo-haptics';

interface Friend {
  id: string;
  full_name: string;
  status: 'pending' | 'accepted';
}

interface SearchResult {
  id: string;
  full_name: string;
}

interface FriendRating {
  id: string;
  object_id: string;
  item_title: string;
  category: string;
  rating: number;
  description?: string;
  metric1?: number;
  metric2?: number;
  metric3?: number;
  price_level?: number;
  photos?: string[];
  is_favorite: boolean;
  created_at: string;
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
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendRatings, setFriendRatings] = useState<FriendRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [ratingsCategoryFilter, setRatingsCategoryFilter] = useState('all');

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
      const response = await fetch(`${apiUrl}/api/friends/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      console.log('[Friends] Loading friends, status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Friends] Loaded:', { friends: data.friends?.length || 0, pending: data.pending?.length || 0, sent: data.sentRequests?.length || 0 });
        
        const allFriends: Friend[] = (data.friends || []).map((f: any) => ({
          id: f.id,
          full_name: f.full_name || 'Unknown User',
          status: 'accepted' as const,
        }));
        setFriends(allFriends);

        const pending: Friend[] = (data.pending || []).map((f: any) => ({
          id: f.id,
          full_name: f.full_name || 'Unknown User',
          status: 'pending' as const,
        }));
        setPendingRequests(pending);

        setSentRequests(data.sentRequests || []);
      } else {
        const errorText = await response.text();
        console.error('[Friends] Error loading friends:', response.status, errorText);
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
      const response = await fetch(`${apiUrl}/api/users/search/?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      console.log('[Friends] Search response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Friends] Search found:', data.users?.length || 0, 'users');
        setSearchResults(data.users || []);
      } else {
        const errorText = await response.text();
        console.error('[Friends] Search error:', response.status, errorText);
      }
    } catch (err) {
      console.error('[Friends] Error searching users:', err);
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
      const response = await fetch(`${apiUrl}/api/friends/`, {
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
      const response = await fetch(`${apiUrl}/api/friends/`, {
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
      const response = await fetch(`${apiUrl}/api/friends/`, {
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

  const unfriend = async (userId: string, userName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${userName} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const accessToken = await getAccessToken();
              if (!accessToken) return;

              const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
              const response = await fetch(`${apiUrl}/api/friends/`, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                  'X-Auth-Token': accessToken,
                },
                body: JSON.stringify({
                  action: 'unfriend',
                  friendId: userId,
                }),
              });

              if (response.ok) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                loadFriends();
              }
            } catch (err) {
              console.error('Error removing friend:', err);
            }
          },
        },
      ]
    );
  };

  const viewFriendRatings = async (friend: Friend, categoryFilter: string = 'all') => {
    setSelectedFriend(friend);
    setLoadingRatings(true);
    setFriendRatings([]);
    setRatingsCategoryFilter(categoryFilter);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      let url = `${apiUrl}/api/friends/ratings/?friendId=${friend.id}`;
      if (categoryFilter && categoryFilter !== 'all') {
        url += `&category=${categoryFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRatings(data.ratings || []);
      }
    } catch (err) {
      console.error('Error loading friend ratings:', err);
    } finally {
      setLoadingRatings(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
  };

  const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];
  const METRIC_LABELS: Record<string, string[]> = {
    restaurants: ['Food', 'Service', 'Ambiance'],
    movies: ['Acting', 'Story', 'Cinematography'],
    tv_shows: ['Acting', 'Plot', 'Production'],
    reading: ['Writing', 'Story', 'Engagement'],
    activities: ['Fun', 'Value', 'Access'],
  };
  const CATEGORY_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'restaurants', label: 'Restaurants' },
    { key: 'movies', label: 'Movies' },
    { key: 'tv_shows', label: 'TV' },
    { key: 'reading', label: 'Books' },
    { key: 'activities', label: 'Activities' },
  ];

  const getCategoryIcon = (category: string, size: number = 18, color: string = Colors.accent.coral) => {
    switch (category) {
      case 'restaurants':
        return <Ionicons name="restaurant" size={size} color={color} />;
      case 'movies':
        return <MaterialCommunityIcons name="movie-open" size={size} color={color} />;
      case 'tv_shows':
        return <Ionicons name="tv" size={size} color={color} />;
      case 'reading':
        return <Ionicons name="book" size={size} color={color} />;
      case 'activities':
        return <MaterialCommunityIcons name="star-four-points" size={size} color={color} />;
      default:
        return <Ionicons name="ellipse" size={size} color={color} />;
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
                <TouchableOpacity style={styles.friendCardMain} onPress={() => viewFriendRatings(friend)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{friend.full_name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{friend.full_name}</Text>
                    <Text style={styles.tapHint}>Tap to see ratings</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.unfriendBtn} 
                  onPress={() => unfriend(friend.id, friend.full_name)}
                >
                  <Ionicons name="person-remove-outline" size={18} color="#F44336" />
                </TouchableOpacity>
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
                <View style={styles.searchResultInfo}>
                  <Text style={styles.friendName} numberOfLines={1}>{user.full_name}</Text>
                </View>
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

      <Modal visible={!!selectedFriend} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedFriend?.full_name}'s Ratings</Text>
              <TouchableOpacity onPress={() => setSelectedFriend(null)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterRow}>
              {CATEGORY_FILTERS.map((cf) => {
                const isActive = ratingsCategoryFilter === cf.key;
                return (
                  <TouchableOpacity
                    key={cf.key}
                    style={[styles.categoryFilterBtn, isActive && styles.categoryFilterBtnActive]}
                    onPress={() => {
                      if (selectedFriend) viewFriendRatings(selectedFriend, cf.key);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      {cf.key !== 'all' && getCategoryIcon(cf.key, 14, isActive ? Colors.background.primary : Colors.text.secondary)}
                      <Text style={[styles.categoryFilterText, isActive && styles.categoryFilterTextActive]}>
                        {cf.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingRatings ? (
              <ActivityIndicator size="large" color={Colors.accent.coral} style={{ marginTop: 40 }} />
            ) : friendRatings.length === 0 ? (
              <View style={styles.emptyRatings}>
                <Ionicons name="star-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.emptyRatingsText}>No ratings yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.ratingsList}>
                {friendRatings.map((r) => {
                  const metricLabels = METRIC_LABELS[r.category] || ['Metric 1', 'Metric 2', 'Metric 3'];
                  return (
                    <View key={r.id} style={styles.ratingCard}>
                      <View style={styles.ratingHeader}>
                        <View style={styles.ratingIconContainer}>
                          {getCategoryIcon(r.category, 20, Colors.accent.coral)}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ratingTitle}>{r.item_title}</Text>
                          <View style={styles.ratingStarsRow}>
                            <Text style={styles.ratingStars}>{renderStars(r.rating)}</Text>
                            <Text style={styles.ratingValue}>{r.rating}/5</Text>
                          </View>
                        </View>
                        {r.price_level ? (
                          <Text style={styles.priceTag}>{PRICE_LABELS[r.price_level - 1]}</Text>
                        ) : null}
                      </View>

                      {(r.metric1 || r.metric2 || r.metric3) ? (
                        <View style={styles.metricsRow}>
                          {r.metric1 ? <Text style={styles.metricChip}>{metricLabels[0]}: {r.metric1}/10</Text> : null}
                          {r.metric2 ? <Text style={styles.metricChip}>{metricLabels[1]}: {r.metric2}/10</Text> : null}
                          {r.metric3 ? <Text style={styles.metricChip}>{metricLabels[2]}: {r.metric3}/10</Text> : null}
                        </View>
                      ) : null}

                      {r.description ? (
                        <Text style={styles.ratingReview}>"{r.description}"</Text>
                      ) : null}

                      {r.photos && r.photos.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                          {r.photos.map((photo, i) => (
                            <Image key={i} source={{ uri: photo }} style={styles.ratingPhoto} />
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  friendCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendName: {
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
  unfriendBtn: {
    padding: 8,
    marginLeft: 'auto',
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
  tapHint: {
    color: Colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  emptyRatings: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRatingsText: {
    color: Colors.text.secondary,
    marginTop: 12,
    fontSize: 16,
  },
  ratingsList: {
    maxHeight: 500,
  },
  ratingCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(254, 175, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingTitle: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ratingStars: {
    color: '#FFD700',
    fontSize: 14,
  },
  ratingValue: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
  priceTag: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 34,
  },
  metricChip: {
    backgroundColor: Colors.background.primary,
    color: Colors.text.secondary,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  ratingReview: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 34,
  },
  photosScroll: {
    marginTop: 8,
    paddingLeft: 34,
  },
  ratingPhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 6,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxHeight: 40,
  },
  categoryFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
  },
  categoryFilterBtnActive: {
    backgroundColor: Colors.accent.coral,
  },
  categoryFilterText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  categoryFilterTextActive: {
    color: Colors.background.primary,
    fontWeight: '600',
  },
});

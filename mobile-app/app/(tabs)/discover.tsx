import { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, 
  RefreshControl, Image, Modal, TextInput, Dimensions, Linking, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type Category = 'restaurants' | 'movies' | 'tv_shows' | 'reading' | 'activities';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  personalized_score?: number;
  distance?: number;
  rating?: number;
  review_count?: number;
  price?: string;
  category: string;
  location?: { city?: string; state?: string; address?: string; lat?: number; lng?: number };
  genres?: string[];
  runtime?: number;
  release_date?: string;
  channel_title?: string;
  view_count?: number;
  like_count?: number;
  external_url?: string;
  explanation?: {
    why_youll_like?: string;
    hook?: string;
    tagline?: string;
  };
}

const getCategoryIcon = (id: Category, isActive: boolean) => {
  const color = isActive ? Colors.background.primary : Colors.accent.coral;
  const size = 18;
  
  switch (id) {
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
      return null;
  }
};

const getCategoryEmoji = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurants': return '🍽️';
    case 'movies': return '🎬';
    case 'tv_shows': return '📺';
    case 'reading': return '📚';
    case 'activities': return '🎯';
    default: return '✨';
  }
};

const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'restaurants', name: 'Restaurants' },
  { id: 'movies', name: 'Movies' },
  { id: 'tv_shows', name: 'TV Shows' },
  { id: 'reading', name: 'Reading' },
  { id: 'activities', name: 'Activities' },
];

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

export default function DiscoverScreen() {
  const { session, getAccessToken } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('restaurants');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [offset, setOffset] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkOnboardingAndPreferences();
  }, [session]);

  const checkOnboardingAndPreferences = async () => {
    if (!session) {
      setOnboardingChecked(true);
      return;
    }

    try {
      const onboardingCompleted = await AsyncStorage.getItem('lmk_onboarding_completed');
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('taste_profile, preferences_completed')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);

      const hasPreferences = profileData?.preferences_completed || 
        (profileData?.taste_profile && Object.keys(profileData.taste_profile).length > 0);

      if (!onboardingCompleted) {
        router.push('/onboarding');
        return;
      }

      if (!hasPreferences) {
        router.push('/quiz');
        return;
      }

      setOnboardingChecked(true);
      getLocation();
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setOnboardingChecked(true);
      getLocation();
    }
  };

  useEffect(() => {
    if (onboardingChecked) {
      getLocation();
    }
  }, [onboardingChecked]);

  useFocusEffect(
    useCallback(() => {
      if (location && session && onboardingChecked) {
        fetchRecommendations();
      }
    }, [selectedCategory, location, distanceFilter, session, onboardingChecked])
  );

  useEffect(() => {
    if (location && session && onboardingChecked) {
      // Reset pagination when category, location, or filter changes
      setOffset(0);
      setSeenIds(new Set());
      setHasMore(true);
      fetchRecommendations(true);
    }
  }, [selectedCategory, location, distanceFilter, session, onboardingChecked]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (error) {
      console.warn('Location error:', error);
    }
  };

  const fetchRecommendations = async (reset: boolean = true, currentOffset: number = 0, customRadius?: number): Promise<number> => {
    if (reset) {
      setLoading(true);
    }
    try {
      const accessToken = await getAccessToken();
      
      console.log('[Discover] Session check:', {
        hasSession: !!session,
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
      });
      
      if (!accessToken) {
        console.log('[Discover] No valid session, showing login message');
        setError('Please log in to see recommendations');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        category: selectedCategory,
        limit: '20',
        offset: currentOffset.toString(),
        sort_by: 'personalized_score',
        mode: 'discover',
      });

      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        const radiusToUse = customRadius || distanceFilter;
        params.append('radius', (radiusToUse * 1609).toString());
      }

      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const fullUrl = `${apiUrl}/api/recommend?${params}`;
      
      console.log('[Discover] Making API request:', {
        url: fullUrl.substring(0, 60),
        tokenLength: accessToken.length,
        offset: currentOffset
      });
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Auth-Token': accessToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawItems = (data.results || []).map((r: any) => ({
          id: r.object?.id || r.id || Math.random().toString(),
          title: r.object?.title || r.title || 'Untitled',
          description: r.object?.description || '',
          image_url: r.object?.image_url || r.object?.primary_image?.url,
          personalized_score: r.personalized_score,
          distance: r.object?.distance,
          rating: r.object?.rating || r.object?.external_rating,
          review_count: r.object?.review_count || r.object?.vote_count,
          price: r.object?.price,
          category: selectedCategory,
          location: r.object?.location,
          genres: r.object?.genres,
          runtime: r.object?.runtime,
          release_date: r.object?.release_date || r.object?.first_air_date,
          channel_title: r.object?.channel_title,
          view_count: r.object?.view_count,
          like_count: r.object?.like_count,
          external_url: r.object?.external_url || r.object?.url,
          explanation: r.explanation,
        }));
        
        // Filter out duplicates based on seenIds
        const currentSeenIds = reset ? new Set<string>() : seenIds;
        const newItems = rawItems.filter((item: RecommendationItem) => !currentSeenIds.has(item.id));
        
        // Update seenIds with new item IDs
        const updatedSeenIds = new Set(currentSeenIds);
        newItems.forEach((item: RecommendationItem) => updatedSeenIds.add(item.id));
        setSeenIds(updatedSeenIds);
        
        // Use API's hasMore flag or check if we got items
        const apiHasMore = data.hasMore ?? (rawItems.length >= 20);
        if (!apiHasMore && newItems.length === 0) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        
        if (reset) {
          setRecommendations(newItems);
        } else {
          setRecommendations(prev => [...prev, ...newItems]);
        }
        setError(null);
        return newItems.length;
      } else {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        setError(`Unable to load recommendations`);
        return 0;
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Network error. Please check your connection.');
      return 0;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreRecommendations = async () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newOffset = offset + 20;
    setOffset(newOffset);
    await fetchRecommendations(false, newOffset);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOffset(0);
    setSeenIds(new Set());
    setHasMore(true);
    await fetchRecommendations(true, 0, distanceFilter);
    setRefreshing(false);
  }, [selectedCategory, location, distanceFilter]);

  const handleSearch = () => {
    fetchRecommendations();
  };

  const handleItemPress = (item: RecommendationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
  };

  const handleOpenExternal = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleOpenMap = (item: RecommendationItem) => {
    if (item.location?.lat && item.location?.lng) {
      const url = `https://maps.google.com/?q=${item.location.lat},${item.location.lng}`;
      Linking.openURL(url);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedItem || userRating < 1) return;
    
    setIsSubmittingRating(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/ratings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          item_title: selectedItem.title,
          category: selectedItem.category,
          rating: userRating,
          review: userReview || null,
          is_favorite: false,
        }),
      });

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowRatingModal(false);
        setUserRating(0);
        setUserReview('');
        Alert.alert('Success', 'Your rating has been saved!');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to save rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const formatDistance = (dist?: number) => {
    if (!dist) return null;
    if (dist < 0.01) return 'Nearby';
    if (dist < 1) return `${Math.round(dist * 5280)} ft`;
    return `${dist.toFixed(1)} mi`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderMetrics = (item: RecommendationItem) => {
    const metrics: { label: string; value: string }[] = [];
    
    if (item.rating) {
      const ratingDisplay = item.category === 'restaurants' || item.category === 'activities' 
        ? `${item.rating.toFixed(1)}/5` 
        : `${item.rating.toFixed(1)}/10`;
      metrics.push({ label: 'Rating', value: ratingDisplay });
    }
    
    if (item.review_count) {
      metrics.push({ label: 'Reviews', value: formatNumber(item.review_count) || '' });
    }
    
    if (item.price) {
      metrics.push({ label: 'Price', value: item.price });
    }
    
    if (item.view_count) {
      metrics.push({ label: 'Views', value: formatNumber(item.view_count) || '' });
    }
    
    if (item.runtime) {
      const hours = Math.floor(item.runtime / 60);
      const mins = item.runtime % 60;
      metrics.push({ label: 'Runtime', value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` });
    }
    
    return metrics.slice(0, 3);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchRecommendations(); }}>
              <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat.id);
              }}
            >
              <View style={styles.categoryIcon}>
                {getCategoryIcon(cat.id, isActive)}
              </View>
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {(selectedCategory === 'restaurants' || selectedCategory === 'activities') && (
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowDistancePicker(true)}>
            <Ionicons name="location" size={16} color={Colors.accent.coral} />
            <Text style={styles.filterText}>{distanceFilter} mi</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.coral} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent.coral} />
            <Text style={styles.loadingText}>Finding recommendations...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRecommendations}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : recommendations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No recommendations found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            {recommendations.map((item, index) => (
              <TouchableOpacity key={`${item.id}-${index}`} style={styles.card} onPress={() => handleItemPress(item)}>
                {item.image_url && (
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                    <View style={styles.cardOverlay} />
                  </View>
                )}
                <View style={styles.categoryBadgeStandalone}>
                  <Text style={styles.categoryBadgeText}>{item.category.replace('_', ' ')}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.explanation?.tagline && (
                    <Text style={styles.cardTagline}>{item.explanation.tagline}</Text>
                  )}
                  {(item.location?.city || formatDistance(item.distance)) && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color={Colors.accent.coral} />
                      <Text style={styles.locationText}>
                        {item.location?.city ? `${item.location.city}${item.location.state ? `, ${item.location.state}` : ''}` : ''}
                      </Text>
                      {item.distance !== undefined && (
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.explanation?.why_youll_like || item.description}
                  </Text>
                  <View style={styles.metricsRow}>
                    {renderMetrics(item).map((metric, i) => (
                      <View key={i} style={styles.metric}>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                        <Text style={styles.metricValue}>{metric.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Show More Button */}
            {recommendations.length > 0 && (
              <TouchableOpacity 
                style={styles.showMoreButton} 
                onPress={loadMoreRecommendations}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={Colors.accent.coral} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.accent.coral} />
                    <Text style={styles.showMoreText}>Show More</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showDistancePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDistancePicker(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Distance Filter</Text>
            {DISTANCE_OPTIONS.map((dist) => (
              <TouchableOpacity
                key={dist}
                style={[styles.pickerOption, distanceFilter === dist && styles.pickerOptionActive]}
                onPress={() => {
                  setDistanceFilter(dist);
                  setShowDistancePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.pickerOptionText, distanceFilter === dist && styles.pickerOptionTextActive]}>
                  {dist} miles
                </Text>
                {distanceFilter === dist && <Ionicons name="checkmark" size={20} color={Colors.accent.coral} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModal}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedItem.image_url && (
                  <Image source={{ uri: selectedItem.image_url }} style={styles.detailImage} />
                )}
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                  {selectedItem.explanation?.tagline && (
                    <Text style={styles.detailTagline}>{selectedItem.explanation.tagline}</Text>
                  )}
                  
                  {(selectedItem.location?.city || selectedItem.location?.address) && (
                    <TouchableOpacity style={styles.detailLocation} onPress={() => handleOpenMap(selectedItem)}>
                      <Ionicons name="location" size={18} color={Colors.accent.coral} />
                      <Text style={styles.detailLocationText}>
                        {selectedItem.location?.address || `${selectedItem.location?.city}, ${selectedItem.location?.state}`}
                      </Text>
                      {selectedItem.distance && (
                        <Text style={styles.detailDistance}>{formatDistance(selectedItem.distance)}</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={styles.detailMetrics}>
                    {renderMetrics(selectedItem).map((metric, i) => (
                      <View key={i} style={styles.detailMetric}>
                        <Text style={styles.detailMetricLabel}>{metric.label}</Text>
                        <Text style={styles.detailMetricValue}>{metric.value}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedItem.explanation?.why_youll_like && (
                    <View style={styles.explanationSection}>
                      <Text style={styles.sectionTitle}>Why You'll Like It</Text>
                      <Text style={styles.explanationText}>{selectedItem.explanation.why_youll_like}</Text>
                    </View>
                  )}

                  {selectedItem.description && selectedItem.description !== selectedItem.explanation?.why_youll_like && (
                    <View style={styles.explanationSection}>
                      <Text style={styles.sectionTitle}>Description</Text>
                      <Text style={styles.explanationText}>{selectedItem.description}</Text>
                    </View>
                  )}

                  {selectedItem.genres && selectedItem.genres.length > 0 && (
                    <View style={styles.tagsSection}>
                      {selectedItem.genres.map((genre, i) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{genre}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.rateButton} 
                      onPress={() => setShowRatingModal(true)}
                    >
                      <Ionicons name="star" size={18} color={Colors.background.primary} />
                      <Text style={styles.rateButtonText}>Rate</Text>
                    </TouchableOpacity>
                    {selectedItem.external_url && (
                      <TouchableOpacity 
                        style={styles.openButton} 
                        onPress={() => handleOpenExternal(selectedItem.external_url)}
                      >
                        <Ionicons name="open-outline" size={18} color={Colors.accent.coral} />
                        <Text style={styles.openButtonText}>Open</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRatingModal(false)}>
          <View style={styles.ratingModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.ratingTitle}>Rate {selectedItem?.title}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Ionicons 
                    name={star <= userRating ? "star" : "star-outline"} 
                    size={36} 
                    color={Colors.accent.coral} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Add a review (optional)"
              placeholderTextColor={Colors.text.secondary}
              value={userReview}
              onChangeText={setUserReview}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity 
              style={[styles.submitRatingButton, userRating < 1 && styles.submitRatingButtonDisabled]}
              onPress={handleSubmitRating}
              disabled={userRating < 1 || isSubmittingRating}
            >
              {isSubmittingRating ? (
                <ActivityIndicator size="small" color={Colors.background.primary} />
              ) : (
                <Text style={styles.submitRatingText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: Colors.text.primary,
    fontSize: 16,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: Colors.accent.coral,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.background.primary,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImageContainer: {
    position: 'relative',
    height: 180,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.tertiary,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(13, 17, 23, 0.6)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeStandalone: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 16,
    marginTop: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.background.primary,
    textTransform: 'uppercase',
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.background.primary,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cardTagline: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.accent.coral,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.accent.coral,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.accent.coral,
    gap: 8,
  },
  showMoreText: {
    fontSize: 16,
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  endOfListText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    width: width - 64,
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  pickerOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  pickerOptionTextActive: {
    color: Colors.accent.coral,
    fontWeight: '600',
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  detailModal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    padding: 8,
  },
  detailImage: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.background.tertiary,
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPlaceholderEmoji: {
    fontSize: 72,
  },
  detailContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  detailTagline: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  detailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  detailLocationText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  detailDistance: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.accent.coral,
  },
  detailMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  detailMetric: {
    alignItems: 'flex-start',
  },
  detailMetricLabel: {
    fontSize: 11,
    color: Colors.accent.coral,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailMetricValue: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  aiScoreSection: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  aiScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiScoreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.accent.coral,
  },
  aiScoreBar: {
    height: 8,
    backgroundColor: Colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  aiScoreFill: {
    height: '100%',
    backgroundColor: Colors.accent.coral,
    borderRadius: 4,
  },
  aiScoreValue: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  explanationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.coral,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rateButtonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accent.coral,
  },
  openButtonText: {
    color: Colors.accent.coral,
    fontSize: 16,
    fontWeight: '600',
  },
  ratingModal: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    width: width - 48,
    maxWidth: 360,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  reviewInput: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    color: Colors.text.primary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitRatingButton: {
    backgroundColor: Colors.accent.coral,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  submitRatingButtonDisabled: {
    opacity: 0.5,
  },
  submitRatingText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

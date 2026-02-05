import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, 
  Dimensions, Modal, ScrollView, Alert, PanResponder, Animated, SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { ErrorView, NetworkError } from '../../components/ErrorBoundary';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type Category = 'restaurants' | 'movies' | 'tv_shows' | 'reading' | 'activities';

interface DecideItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  category: string;
  personalized_score?: number;
  distance?: number;
  rating?: number;
  price?: string;
  location?: { city?: string; state?: string };
  explanation?: {
    why_youll_like?: string;
    tagline?: string;
  };
}

interface DecisionRecord {
  item: DecideItem;
  decision: 'yes' | 'no';
  timestamp: string;
}

const getCategoryIcon = (id: Category, isActive: boolean) => {
  const color = isActive ? Colors.background.primary : Colors.accent.coral;
  const size = 16;
  
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

export default function DecideScreen() {
  const { session, getAccessToken } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('restaurants');
  const [currentItem, setCurrentItem] = useState<DecideItem | null>(null);
  const [itemQueue, setItemQueue] = useState<DecideItem[]>([]); // Pre-fetched items queue
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // Track background fetching
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFilter, setDistanceFilter] = useState(25);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [decisionHistory, setDecisionHistory] = useState<DecisionRecord[]>([]);
  const [decisions, setDecisions] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedItem, setMatchedItem] = useState<DecideItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExpandedCard, setShowExpandedCard] = useState(false);
  const [expandedItem, setExpandedItem] = useState<DecideItem | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  
  // Swipe animation values
  const swipeAnim = useRef(new Animated.ValueXY()).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Refs to hold latest values for use in panResponder
  const currentItemRef = useRef<DecideItem | null>(null);
  const handleDecisionRef = useRef<((decision: 'yes' | 'no') => Promise<void>) | undefined>(undefined);

  // Initialize location on mount
  useEffect(() => {
    let isMounted = true;
    
    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && isMounted) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else if (isMounted) {
          // Use default location (Los Angeles) if permission denied
          console.log('[Decide] Location permission denied, using default');
          setLocation({ lat: 34.0522, lng: -118.2437 });
        }
      } catch (error) {
        console.warn('[Decide] Location error:', error);
        if (isMounted) {
          // Use default location on error
          setLocation({ lat: 34.0522, lng: -118.2437 });
        }
      }
    };
    
    initLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Load stored data when category changes
  useEffect(() => {
    loadStoredData();
  }, [selectedCategory]);

  // Track if we've done initial load
  const hasInitializedRef = useRef(false);
  const categoryRef = useRef(selectedCategory);
  const locationRef = useRef(location);
  const distanceRef = useRef(distanceFilter);
  
  // Update refs
  useEffect(() => {
    categoryRef.current = selectedCategory;
  }, [selectedCategory]);
  
  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  
  useEffect(() => {
    distanceRef.current = distanceFilter;
  }, [distanceFilter]);

  // Track session-seen IDs (resets on category change or reshuffle)
  const [sessionSeenIds, setSessionSeenIds] = useState<string[]>([]);
  const sessionSeenIdsRef = useRef<string[]>([]);
  
  // Keep ref updated
  useEffect(() => {
    sessionSeenIdsRef.current = sessionSeenIds;
  }, [sessionSeenIds]);
  
  // Reset session seen IDs when category changes
  useEffect(() => {
    setSessionSeenIds([]);
  }, [selectedCategory]);

  // Fetch items when location is ready or when category/filters change
  useEffect(() => {
    if (!location) return;
    
    // Clear queue and fetch new items
    setItemQueue([]);
    setCurrentItem(null);
    setLoading(true);
    setSessionSeenIds([]); // Reset session seen IDs
    
    const fetchItems = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setLoading(false);
          setError('Please sign in');
          return;
        }
        
        const params = new URLSearchParams({
          category: selectedCategory,
          limit: '10',
          mode: 'decide',
        });
        
        // Combine stored seenIds with any session seen IDs
        const allSeenIds = [...new Set([...seenIds])];
        if (allSeenIds.length > 0) {
          params.append('seen_ids', allSeenIds.join(','));
        }
        
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', (distanceFilter * 1609).toString());
        
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
        console.log('[Decide] Fetching items for category:', selectedCategory, 'excluding', allSeenIds.length, 'seen IDs');
        
        const response = await fetch(`${apiUrl}/api/recommend?${params}`, {
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
          if (data.results && data.results.length > 0) {
            let items = data.results.map((r: any) => ({
              id: r.object?.id || r.id || Math.random().toString(),
              title: r.object?.title || r.title || 'Untitled',
              description: r.object?.description || '',
              image_url: r.object?.image_url || r.object?.primary_image?.url,
              category: selectedCategory,
              personalized_score: r.personalized_score,
              distance: r.distance || r.object?.distance,
              rating: r.object?.rating || r.object?.external_rating,
              price: r.object?.price,
              location: r.object?.location,
              explanation: r.explanation,
            }));
            
            // Shuffle items when shuffleSeed > 0 (after reshuffle)
            if (shuffleSeed > 0) {
              items = [...items].sort(() => Math.random() - 0.5);
            }
            
            const [first, ...rest] = items;
            setCurrentItem(first);
            setItemQueue(rest);
            // Track all fetched items as session-seen
            setSessionSeenIds(items.map((i: DecideItem) => i.id));
            setError(null);
            console.log('[Decide] Loaded', items.length, 'items');
          } else {
            setCurrentItem(null);
            setError('No items found');
          }
        } else {
          setError('Failed to load items');
        }
      } catch (err) {
        console.error('[Decide] Fetch error:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [selectedCategory, location, distanceFilter, seenIds, shuffleSeed]);

  const loadStoredData = async () => {
    try {
      const historyKey = `lmk_decide_history_${selectedCategory}`;
      const seenKey = `lmk_decide_seen_${selectedCategory}`;
      
      const savedHistory = await AsyncStorage.getItem(historyKey);
      const savedSeenIds = await AsyncStorage.getItem(seenKey);
      
      if (savedHistory) {
        const history: DecisionRecord[] = JSON.parse(savedHistory);
        setDecisionHistory(history);
        setDecisions({
          yes: history.filter(h => h.decision === 'yes').length,
          no: history.filter(h => h.decision === 'no').length,
        });
      } else {
        setDecisionHistory([]);
        setDecisions({ yes: 0, no: 0 });
      }
      
      if (savedSeenIds) {
        setSeenIds(JSON.parse(savedSeenIds));
      } else {
        setSeenIds([]);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  const saveStoredData = async (history: DecisionRecord[], seen: string[]) => {
    try {
      const historyKey = `lmk_decide_history_${selectedCategory}`;
      const seenKey = `lmk_decide_seen_${selectedCategory}`;
      
      const limitedHistory = history.slice(0, 50);
      const limitedSeen = seen.slice(-200);
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(limitedHistory));
      await AsyncStorage.setItem(seenKey, JSON.stringify(limitedSeen));
    } catch (error) {
      console.error('Error saving stored data:', error);
    }
  };

  // Handle yes/no decision
  const handleDecision = useCallback(async (decision: 'yes' | 'no') => {
    const item = currentItem;
    if (!item) {
      console.log('[Decide] No current item to decide on');
      return;
    }
    
    console.log('[Decide] Decision:', decision, 'for item:', item.title);
    
    try {
      await Haptics.impactAsync(
        decision === 'yes' 
          ? Haptics.ImpactFeedbackStyle.Heavy 
          : Haptics.ImpactFeedbackStyle.Medium
      );
    } catch (e) {
      // Haptics might fail on some devices
    }

    const newRecord: DecisionRecord = {
      item: item,
      decision,
      timestamp: new Date().toISOString(),
    };

    // Update all state
    const newHistory = [newRecord, ...decisionHistory].slice(0, 50);
    const newSeenIds = [...seenIds, item.id];
    
    setDecisionHistory(newHistory);
    setSeenIds(newSeenIds);
    setDecisions(prev => ({
      ...prev,
      [decision]: prev[decision] + 1,
    }));

    // Save to storage
    saveStoredData(newHistory, newSeenIds);

    // Save "yes" decisions as ratings (only save likes, not skips)
    if (decision === 'yes') {
      try {
        const accessToken = await getAccessToken();
        if (accessToken) {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
          fetch(`${apiUrl}/api/ratings`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Auth-Token': accessToken,
            },
            body: JSON.stringify({
              item_id: item.id,
              item_title: item.title,
              category: item.category,
              rating: 5,
              is_favorite: true,
            }),
          }).catch(err => console.log('[Decide] Rating save error:', err));
        }
      } catch (e) {
        console.log('[Decide] Could not save rating:', e);
      }
    }

    if (decision === 'yes') {
      setMatchedItem(item);
      setShowMatchPopup(true);
    }

    // Move to next item from queue
    if (itemQueue.length > 0) {
      const [nextItem, ...rest] = itemQueue;
      setCurrentItem(nextItem);
      setItemQueue(rest);
      
      // Reset animation for new card
      swipeAnim.setValue({ x: 0, y: 0 });
      setSwipeDirection(null);
    } else {
      // Queue empty, need to fetch more
      setCurrentItem(null);
      setLoading(true);
      
      // Fetch more items
      const fetchMore = async () => {
        try {
          const accessToken = await getAccessToken();
          if (!accessToken || !locationRef.current) return;
          
          // Combine stored seenIds with session seenIds to exclude all seen items
          const allExcludeIds = [...new Set([...newSeenIds, ...sessionSeenIdsRef.current])];
          
          const params = new URLSearchParams({
            category: categoryRef.current,
            limit: '10',
            mode: 'decide',
          });
          
          if (allExcludeIds.length > 0) {
            params.append('seen_ids', allExcludeIds.join(','));
          }
          
          params.append('lat', locationRef.current.lat.toString());
          params.append('lng', locationRef.current.lng.toString());
          params.append('radius', (distanceRef.current * 1609).toString());
          
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
          console.log('[Decide] Fetching more items, excluding', allExcludeIds.length, 'IDs');
          
          const response = await fetch(`${apiUrl}/api/recommend?${params}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Auth-Token': accessToken,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.results?.length > 0) {
              const items = data.results.map((r: any) => ({
                id: r.object?.id || r.id || Math.random().toString(),
                title: r.object?.title || r.title || 'Untitled',
                description: r.object?.description || '',
                image_url: r.object?.image_url || r.object?.primary_image?.url,
                category: categoryRef.current,
                personalized_score: r.personalized_score,
                distance: r.distance || r.object?.distance,
                rating: r.object?.rating || r.object?.external_rating,
                price: r.object?.price,
                location: r.object?.location,
                explanation: r.explanation,
              }));
              
              const [first, ...rest] = items;
              setCurrentItem(first);
              setItemQueue(rest);
              
              // Add new items to session seen IDs
              setSessionSeenIds(prev => [...prev, ...items.map((i: DecideItem) => i.id)]);
            } else {
              setError('No more items');
            }
          }
        } catch (err) {
          console.error('[Decide] Fetch more error:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchMore();
    }
  }, [currentItem, itemQueue, decisionHistory, seenIds, swipeAnim, getAccessToken]);
  
  // Keep handleDecision ref updated for panResponder
  useEffect(() => {
    handleDecisionRef.current = handleDecision;
  }, [handleDecision]);

  // Reset swipe animation when item changes
  useEffect(() => {
    swipeAnim.stopAnimation();
    swipeAnim.setOffset({ x: 0, y: 0 });
    swipeAnim.setValue({ x: 0, y: 0 });
    rotateAnim.setValue(0);
    setSwipeDirection(null);
  }, [currentItem?.id]);

  // Swipe gesture handler
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const decision = direction === 'right' ? 'yes' : 'no';
    
    swipeAnim.flattenOffset();
    
    Animated.timing(swipeAnim, {
      toValue: { x: direction === 'right' ? width * 1.5 : -width * 1.5, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      if (handleDecisionRef.current) {
        handleDecisionRef.current(decision);
      }
    });
  }, [swipeAnim]);

  // Ref to hold latest swipe handler
  const swipeHandlerRef = useRef(handleSwipeComplete);
  useEffect(() => {
    swipeHandlerRef.current = handleSwipeComplete;
  }, [handleSwipeComplete]);

  // Pan responder for swipe gestures
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderGrant: () => {
      swipeAnim.stopAnimation();
      swipeAnim.extractOffset();
    },
    onPanResponderMove: (_, gestureState) => {
      swipeAnim.x.setValue(gestureState.dx);
      if (gestureState.dx > 50) {
        setSwipeDirection('right');
      } else if (gestureState.dx < -50) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection(null);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      swipeAnim.flattenOffset();
      const swipeThreshold = width * 0.25;
      const velocityThreshold = 0.3;
      
      if (gestureState.dx > swipeThreshold || gestureState.vx > velocityThreshold) {
        swipeHandlerRef.current('right');
      } else if (gestureState.dx < -swipeThreshold || gestureState.vx < -velocityThreshold) {
        swipeHandlerRef.current('left');
      } else {
        setSwipeDirection(null);
        Animated.spring(swipeAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      swipeAnim.flattenOffset();
      setSwipeDirection(null);
      Animated.spring(swipeAnim, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 6,
        tension: 40,
      }).start();
    },
  }), [swipeAnim]);

  // Calculate card rotation based on swipe position
  const cardRotation = swipeAnim.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const handleReshuffle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Reshuffle',
      'This will clear your seen items and start fresh. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reshuffle', 
          onPress: async () => {
            setSeenIds([]);
            setSessionSeenIds([]); // Reset session seen IDs
            setDecisionHistory([]);
            setDecisions({ yes: 0, no: 0 });
            setItemQueue([]);
            setCurrentItem(null);
            await AsyncStorage.removeItem(`lmk_decide_history_${selectedCategory}`);
            await AsyncStorage.removeItem(`lmk_decide_seen_${selectedCategory}`);
            // Increment shuffle seed to trigger refetch with shuffled order
            setShuffleSeed(prev => prev + 1);
          }
        },
      ]
    );
  };

  const formatDistance = (dist?: number) => {
    if (!dist) return null;
    if (dist < 0.01) return 'Nearby';
    if (dist < 1) return `${Math.round(dist * 5280)} ft`;
    return `${dist.toFixed(1)} mi`;
  };

  if (loading && !currentItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonContainer}>
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.id);
                }}
              >
                {getCategoryIcon(cat.id, isActive)}
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <View style={styles.controlsRow}>
          {(selectedCategory === 'restaurants' || selectedCategory === 'activities') && (
            <TouchableOpacity style={styles.controlButton} onPress={() => setShowDistancePicker(true)}>
              <Ionicons name="location" size={16} color={Colors.accent.coral} />
              <Text style={styles.controlText}>{distanceFilter} mi</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.controlButton} onPress={handleReshuffle}>
            <Ionicons name="shuffle" size={16} color={Colors.accent.coral} />
            <Text style={styles.controlText}>Reshuffle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowHistory(true)}>
            <Ionicons name="time" size={16} color={Colors.accent.coral} />
            <Text style={styles.controlText}>History</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.stat} 
            onPress={() => {
              if (decisions.yes > 0) {
                setShowMatches(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.statText}>{decisions.yes} Yes</Text>
            {decisions.yes > 0 && (
              <Ionicons name="chevron-forward" size={14} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>
          <View style={styles.stat}>
            <Ionicons name="close-circle" size={16} color="#F44336" />
            <Text style={styles.statText}>{decisions.no} No</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {error && !currentItem ? (
          error.includes('Network') ? (
            <NetworkError onRetry={handleReshuffle} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{getCategoryEmoji(selectedCategory)}</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.reshuffleButton} onPress={handleReshuffle}>
                <Ionicons name="shuffle" size={18} color={Colors.background.primary} />
                <Text style={styles.reshuffleText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )
        ) : currentItem ? (
          <View style={styles.cardWrapper}>
            <Animated.View 
              {...panResponder.panHandlers}
              style={[
                styles.decideCard,
                {
                  transform: [
                    { translateX: swipeAnim.x },
                    { rotate: cardRotation },
                  ],
                },
              ]}
            >
              {/* Swipe direction indicators */}
              {swipeDirection === 'right' && (
                <View style={[styles.swipeIndicator, styles.swipeIndicatorRight]}>
                  <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                  <Text style={styles.swipeIndicatorText}>YES</Text>
                </View>
              )}
              {swipeDirection === 'left' && (
                <View style={[styles.swipeIndicator, styles.swipeIndicatorLeft]}>
                  <Ionicons name="close-circle" size={48} color="#F44336" />
                  <Text style={styles.swipeIndicatorText}>NO</Text>
                </View>
              )}
              
              {currentItem.image_url && (
                <View style={styles.cardImageContainer}>
                  <Image source={{ uri: currentItem.image_url }} style={styles.cardImage} />
                  <View style={styles.cardOverlay} />
                  <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => {
                      setExpandedItem(currentItem);
                      setShowExpandedCard(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="information-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{currentItem.title}</Text>
                
                {currentItem.explanation?.tagline && (
                  <Text style={styles.cardTagline}>{currentItem.explanation.tagline}</Text>
                )}
                
                <View style={styles.metaRow}>
                  {currentItem.location?.city && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location" size={14} color={Colors.accent.coral} />
                      <Text style={styles.metaText}>
                        {currentItem.location.city}{currentItem.location.state ? `, ${currentItem.location.state}` : ''}
                      </Text>
                    </View>
                  )}
                  {currentItem.distance !== undefined && (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{formatDistance(currentItem.distance)}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.metricsRow}>
                  {currentItem.rating && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Rating</Text>
                      <Text style={styles.metricValue}>
                        {selectedCategory === 'restaurants' || selectedCategory === 'activities' 
                          ? `${currentItem.rating.toFixed(1)}/5` 
                          : `${currentItem.rating.toFixed(1)}/10`}
                      </Text>
                    </View>
                  )}
                  {currentItem.price && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Price</Text>
                      <Text style={styles.metricValue}>{currentItem.price}</Text>
                    </View>
                  )}
                </View>
                
                {currentItem.explanation?.why_youll_like && (
                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {currentItem.explanation.why_youll_like}
                  </Text>
                )}
              </View>
          </Animated.View>
          
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>Swipe right for Yes, left for No</Text>
          </View>
        </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent.coral} />
          </View>
        )}
      </View>

      <Modal visible={showMatchPopup} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <ScrollView contentContainerStyle={styles.matchScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.matchHeader}>
              <Text style={styles.matchEmoji}>🎉</Text>
              <Text style={styles.matchTitle}>It's a Match!</Text>
              <Text style={styles.matchSubtitle}>Added to your favorites</Text>
            </View>
            
            {matchedItem && (
              <View style={styles.matchCard}>
                {matchedItem.image_url && (
                  <Image source={{ uri: matchedItem.image_url }} style={styles.matchCardImage} />
                )}
                <View style={styles.matchCardContent}>
                  <Text style={styles.matchCardTitle}>{matchedItem.title}</Text>
                  
                  {matchedItem.explanation?.tagline && (
                    <Text style={styles.matchCardTagline}>{matchedItem.explanation.tagline}</Text>
                  )}
                  
                  <View style={styles.matchMetaRow}>
                    {matchedItem.location?.city && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={14} color={Colors.accent.coral} />
                        <Text style={styles.metaText}>
                          {matchedItem.location.city}{matchedItem.location.state ? `, ${matchedItem.location.state}` : ''}
                        </Text>
                      </View>
                    )}
                    {matchedItem.distance !== undefined && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>{formatDistance(matchedItem.distance)}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.matchMetricsRow}>
                    {matchedItem.rating && (
                      <View style={styles.matchMetric}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.matchMetricText}>
                          {selectedCategory === 'restaurants' || selectedCategory === 'activities' 
                            ? matchedItem.rating.toFixed(1) 
                            : matchedItem.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {matchedItem.price && (
                      <View style={styles.matchMetric}>
                        <Text style={styles.matchMetricText}>{matchedItem.price}</Text>
                      </View>
                    )}
                  </View>
                  
                  {matchedItem.explanation?.why_youll_like && (
                    <Text style={styles.matchCardDescription}>{matchedItem.explanation.why_youll_like}</Text>
                  )}
                  
                  {matchedItem.description && !matchedItem.explanation?.why_youll_like && (
                    <Text style={styles.matchCardDescription}>{matchedItem.description}</Text>
                  )}
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.matchButton} 
              onPress={() => {
                setShowMatchPopup(false);
                setMatchedItem(null);
              }}
            >
              <Text style={styles.matchButtonText}>Continue Swiping</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showExpandedCard} transparent animationType="slide">
        <View style={styles.expandedOverlay}>
          <View style={styles.expandedModal}>
            <TouchableOpacity 
              style={styles.expandedCloseButton} 
              onPress={() => {
                setShowExpandedCard(false);
                setExpandedItem(null);
              }}
            >
              <Ionicons name="close" size={28} color={Colors.text.primary} />
            </TouchableOpacity>
            
            {expandedItem && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.expandedScrollContent}>
                {expandedItem.image_url && (
                  <Image source={{ uri: expandedItem.image_url }} style={styles.expandedImage} />
                )}
                
                <View style={styles.expandedContent}>
                  <Text style={styles.expandedTitle}>{expandedItem.title}</Text>
                  
                  {expandedItem.explanation?.tagline && (
                    <Text style={styles.expandedTagline}>{expandedItem.explanation.tagline}</Text>
                  )}
                  
                  <View style={styles.expandedMetaRow}>
                    {expandedItem.location?.city && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={16} color={Colors.accent.coral} />
                        <Text style={styles.expandedMetaText}>
                          {expandedItem.location.city}{expandedItem.location.state ? `, ${expandedItem.location.state}` : ''}
                        </Text>
                      </View>
                    )}
                    {expandedItem.distance !== undefined && (
                      <View style={styles.expandedDistanceBadge}>
                        <Text style={styles.distanceText}>{formatDistance(expandedItem.distance)}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.expandedMetricsRow}>
                    {expandedItem.rating && (
                      <View style={styles.expandedMetric}>
                        <Ionicons name="star" size={20} color="#FFD700" />
                        <Text style={styles.expandedMetricValue}>
                          {selectedCategory === 'restaurants' || selectedCategory === 'activities' 
                            ? `${expandedItem.rating.toFixed(1)}/5` 
                            : `${expandedItem.rating.toFixed(1)}/10`}
                        </Text>
                      </View>
                    )}
                    {expandedItem.price && (
                      <View style={styles.expandedMetric}>
                        <Text style={styles.expandedMetricLabel}>Price</Text>
                        <Text style={styles.expandedMetricValue}>{expandedItem.price}</Text>
                      </View>
                    )}
                    {expandedItem.personalized_score && (
                      <View style={styles.expandedMetric}>
                        <Text style={styles.expandedMetricLabel}>Match</Text>
                        <Text style={styles.expandedMetricValue}>{Math.round(expandedItem.personalized_score * 100)}%</Text>
                      </View>
                    )}
                  </View>
                  
                  {expandedItem.explanation?.why_youll_like && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Why You'll Love It</Text>
                      <Text style={styles.expandedSectionText}>{expandedItem.explanation.why_youll_like}</Text>
                    </View>
                  )}
                  
                  {expandedItem.description && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>About</Text>
                      <Text style={styles.expandedSectionText}>{expandedItem.description}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showMatches} transparent animationType="slide">
        <View style={styles.matchesModalContainer}>
          <View style={styles.matchesModal}>
            <View style={styles.matchesHeader}>
              <View>
                <Text style={styles.matchesTitle}>Your Matches</Text>
                <Text style={styles.matchesSubtitle}>
                  {decisionHistory.filter(d => d.decision === 'yes').length} items you loved
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMatches(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
              {decisionHistory.filter(d => d.decision === 'yes').length === 0 ? (
                <View style={styles.emptyMatches}>
                  <Text style={styles.emptyMatchesEmoji}>💔</Text>
                  <Text style={styles.emptyMatchesText}>No matches yet</Text>
                  <Text style={styles.emptyMatchesSubtext}>Swipe right on items you like!</Text>
                </View>
              ) : (
                decisionHistory
                  .filter(d => d.decision === 'yes')
                  .reverse()
                  .map((record, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.matchItem}
                      onPress={() => {
                        setExpandedItem(record.item);
                        setShowMatches(false);
                        setShowExpandedCard(true);
                      }}
                    >
                      {record.item.image_url && (
                        <Image 
                          source={{ uri: record.item.image_url }} 
                          style={styles.matchItemImage} 
                        />
                      )}
                      <View style={styles.matchItemContent}>
                        <Text style={styles.matchItemTitle} numberOfLines={1}>
                          {record.item.title}
                        </Text>
                        {record.item.explanation?.tagline && (
                          <Text style={styles.matchItemTagline} numberOfLines={1}>
                            {record.item.explanation.tagline}
                          </Text>
                        )}
                        <View style={styles.matchItemMeta}>
                          {record.item.rating && (
                            <View style={styles.matchItemRating}>
                              <Ionicons name="star" size={12} color="#FFD700" />
                              <Text style={styles.matchItemRatingText}>
                                {record.item.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                          {record.item.distance !== undefined && (
                            <Text style={styles.matchItemDistance}>
                              {formatDistance(record.item.distance)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showHistory} transparent animationType="slide">
        <View style={styles.historyModalContainer}>
          <View style={styles.historyModal}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Decision History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.historyList}>
              {decisionHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>No decisions yet</Text>
                </View>
              ) : (
                decisionHistory.map((record, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {record.item.title}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {new Date(record.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.historyDecision,
                      record.decision === 'yes' ? styles.historyYes : styles.historyNo
                    ]}>
                      <Ionicons 
                        name={record.decision === 'yes' ? 'checkmark' : 'close'} 
                        size={16} 
                        color={record.decision === 'yes' ? '#4CAF50' : '#F44336'} 
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDistancePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowDistancePicker(false)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    marginRight: 8,
    gap: 4,
  },
  categoryPillActive: {
    backgroundColor: Colors.accent.coral,
  },
  categoryPillText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: Colors.background.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    gap: 32,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  reshuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reshuffleText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardWrapper: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  swipeHint: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  swipeHintText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  decideCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '40%',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  swipeIndicatorRight: {
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  swipeIndicatorLeft: {
    left: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  swipeIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardImageContainer: {
    position: 'relative',
    height: height * 0.3,
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
    fontSize: 64,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(13, 17, 23, 0.6)',
  },
  scoreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.background.primary,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cardTagline: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  distanceBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.accent.coral,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
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
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  matchScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  matchHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  matchCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    overflow: 'hidden',
    width: width - 48,
    maxWidth: 380,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.accent.coral,
  },
  matchCardImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.background.tertiary,
  },
  matchCardContent: {
    padding: 20,
  },
  matchCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  matchCardTagline: {
    fontSize: 15,
    color: Colors.accent.coral,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  matchMetricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  matchMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchMetricText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  matchCardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  matchButton: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  matchButtonText: {
    color: Colors.background.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  infoButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  expandedModal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  expandedCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedScrollContent: {
    paddingBottom: 40,
  },
  expandedImage: {
    width: '100%',
    height: height * 0.35,
    backgroundColor: Colors.background.tertiary,
  },
  expandedContent: {
    padding: 24,
  },
  expandedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  expandedTagline: {
    fontSize: 17,
    color: Colors.accent.coral,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  expandedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  expandedMetaText: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  expandedDistanceBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  expandedMetricsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expandedMetric: {
    alignItems: 'center',
    gap: 4,
  },
  expandedMetricLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  expandedMetricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  expandedSection: {
    marginBottom: 20,
  },
  expandedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.coral,
    marginBottom: 8,
  },
  expandedSectionText: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  historyModal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginTop: 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  historyList: {
    flex: 1,
    padding: 16,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  historyItemTime: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  historyDecision: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyYes: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  historyNo: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  pickerOverlay: {
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
  matchesModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  matchesModal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginTop: 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  matchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  matchesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  matchesSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  matchesList: {
    flex: 1,
    padding: 16,
  },
  emptyMatches: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyMatchesEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMatchesText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyMatchesSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  matchItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  matchItemContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  matchItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  matchItemTagline: {
    fontSize: 13,
    color: Colors.accent.coral,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  matchItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchItemRatingText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  matchItemDistance: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
});

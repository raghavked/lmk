import { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, 
  Dimensions, Modal, ScrollView, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type Category = 'restaurants' | 'movies' | 'tv_shows' | 'youtube_videos' | 'reading' | 'activities';

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
    case 'youtube_videos':
      return <Ionicons name="play-circle" size={size} color={color} />;
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
    case 'youtube_videos': return '🎥';
    case 'reading': return '📚';
    case 'activities': return '🎯';
    default: return '✨';
  }
};

const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'restaurants', name: 'Restaurants' },
  { id: 'movies', name: 'Movies' },
  { id: 'tv_shows', name: 'TV Shows' },
  { id: 'youtube_videos', name: 'YouTube' },
  { id: 'reading', name: 'Reading' },
  { id: 'activities', name: 'Activities' },
];

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

export default function DecideScreen() {
  const { session, getAccessToken } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('restaurants');
  const [currentItem, setCurrentItem] = useState<DecideItem | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [selectedCategory]);

  useEffect(() => {
    if (location) {
      loadNextItem();
    }
  }, [selectedCategory, location, distanceFilter]);

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

  const loadNextItem = async (excludeIds?: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('Please log in');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        category: selectedCategory,
        limit: '1',
        mode: 'decide',
      });
      
      const idsToExclude = excludeIds || seenIds;
      if (idsToExclude.length > 0) {
        params.append('seen_ids', idsToExclude.join(','));
      }
      
      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
        params.append('radius', (distanceFilter * 1609).toString());
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      console.log('[Decide] Making API request with token length:', accessToken.length);
      
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
          const r = data.results[0];
          setCurrentItem({
            id: r.object?.id || r.id || Math.random().toString(),
            title: r.object?.title || r.title || 'Untitled',
            description: r.object?.description || '',
            image_url: r.object?.image_url || r.object?.primary_image?.url,
            category: selectedCategory,
            personalized_score: r.personalized_score,
            distance: r.object?.distance,
            rating: r.object?.rating || r.object?.external_rating,
            price: r.object?.price,
            location: r.object?.location,
            explanation: r.explanation,
          });
        } else {
          setCurrentItem(null);
          setError('No more items to decide on');
        }
      } else {
        console.error('API Error:', response.status);
        setError('Failed to load item');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'yes' | 'no') => {
    if (!currentItem) return;
    
    await Haptics.impactAsync(
      decision === 'yes' 
        ? Haptics.ImpactFeedbackStyle.Heavy 
        : Haptics.ImpactFeedbackStyle.Medium
    );

    const newRecord: DecisionRecord = {
      item: currentItem,
      decision,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [newRecord, ...decisionHistory].slice(0, 50);
    const newSeenIds = [...seenIds, currentItem.id];

    setDecisionHistory(newHistory);
    setSeenIds(newSeenIds);
    setDecisions(prev => ({
      ...prev,
      [decision]: prev[decision] + 1,
    }));

    await saveStoredData(newHistory, newSeenIds);

    if (decision === 'yes') {
      setMatchedItem(currentItem);
      setShowMatchPopup(true);
    }

    loadNextItem(newSeenIds);
  };

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
            setDecisionHistory([]);
            setDecisions({ yes: 0, no: 0 });
            await AsyncStorage.removeItem(`lmk_decide_history_${selectedCategory}`);
            await AsyncStorage.removeItem(`lmk_decide_seen_${selectedCategory}`);
            loadNextItem([]);
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent.coral} />
          <Text style={styles.loadingText}>Finding something for you...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.statText}>{decisions.yes} Yes</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="close-circle" size={16} color="#F44336" />
            <Text style={styles.statText}>{decisions.no} No</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {error && !currentItem ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{getCategoryEmoji(selectedCategory)}</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.reshuffleButton} onPress={handleReshuffle}>
              <Ionicons name="shuffle" size={18} color={Colors.background.primary} />
              <Text style={styles.reshuffleText}>Reshuffle</Text>
            </TouchableOpacity>
          </View>
        ) : currentItem ? (
          <View style={styles.cardWrapper}>
            <View style={styles.decideCard}>
            <View style={styles.cardImageContainer}>
              {currentItem.image_url ? (
                <Image source={{ uri: currentItem.image_url }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Text style={styles.placeholderEmoji}>{getCategoryEmoji(currentItem.category)}</Text>
                </View>
              )}
              <View style={styles.cardOverlay} />
            </View>
            
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
          </View>
          
          <View style={styles.decisionButtons}>
            <TouchableOpacity 
              style={[styles.decisionButton, styles.noButton]} 
              onPress={() => handleDecision('no')}
            >
              <Ionicons name="close" size={32} color="#F44336" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.decisionButton, styles.yesButton]} 
              onPress={() => handleDecision('yes')}
            >
              <Ionicons name="checkmark" size={32} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent.coral} />
          </View>
        )}
      </ScrollView>

      <Modal visible={showMatchPopup} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={styles.matchModal}>
            <Text style={styles.matchEmoji}>🎉</Text>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchItemTitle}>{matchedItem?.title}</Text>
            <TouchableOpacity 
              style={styles.matchButton} 
              onPress={() => {
                setShowMatchPopup(false);
                setMatchedItem(null);
              }}
            >
              <Text style={styles.matchButtonText}>Continue</Text>
            </TouchableOpacity>
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
    </View>
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
  header: {
    paddingTop: 8,
    paddingBottom: 12,
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
    paddingTop: 12,
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  decideCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
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
  decisionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 24,
  },
  decisionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  noButton: {
    backgroundColor: Colors.background.secondary,
    borderColor: '#F44336',
  },
  yesButton: {
    backgroundColor: Colors.background.secondary,
    borderColor: '#4CAF50',
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModal: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: width - 64,
    maxWidth: 320,
  },
  matchEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    marginBottom: 8,
  },
  matchItemTitle: {
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  matchButton: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  matchButtonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
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
});

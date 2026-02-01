import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import * as Location from 'expo-location';

type Category = 'restaurants' | 'movies' | 'tv_shows' | 'youtube_videos' | 'reading' | 'activities';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  personalized_score?: number;
  distance?: number;
  rating?: number;
  category: string;
}

interface CategoryConfig {
  id: Category;
  name: string;
  icon: React.ReactNode;
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

const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'restaurants', name: 'Restaurants' },
  { id: 'movies', name: 'Movies' },
  { id: 'tv_shows', name: 'TV Shows' },
  { id: 'youtube_videos', name: 'YouTube' },
  { id: 'reading', name: 'Reading' },
  { id: 'activities', name: 'Activities' },
];

export default function DiscoverScreen() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('restaurants');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [selectedCategory, location]);

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

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, user needs to log in');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        category: selectedCategory,
        limit: '10',
      });

      if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/recommend?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map API response to our format
        const items = (data.results || []).map((r: any) => ({
          id: r.object?.id || r.id,
          title: r.object?.title || r.title,
          description: r.explanation?.why_youll_like || r.object?.description || '',
          image_url: r.object?.image_url,
          personalized_score: r.personalized_score,
          distance: r.object?.distance,
          rating: r.object?.rating,
          category: selectedCategory,
        }));
        setRecommendations(items);
        setError(null);
      } else {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        setError(`Unable to load recommendations (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  }, [selectedCategory, location]);

  return (
    <View style={styles.container}>
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
              onPress={() => setSelectedCategory(cat.id)}
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
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            {recommendations.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card}>
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
                  <View style={styles.cardMeta}>
                    {item.personalized_score && (
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>{Math.round(item.personalized_score)}%</Text>
                      </View>
                    )}
                    {item.distance && (
                      <Text style={styles.distanceText}>{item.distance.toFixed(1)} mi</Text>
                    )}
                    {item.rating && (
                      <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  categoryScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
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
    flex: 1,
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
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.background.tertiary,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBadge: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.background.primary,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});

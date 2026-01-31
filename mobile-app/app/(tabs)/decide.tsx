import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface DecideItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  category: string;
}

export default function DecideScreen() {
  const [items, setItems] = useState<DecideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchItem, setMatchItem] = useState<DecideItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/recommend?category=restaurants&limit=10`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'yes' | 'no') => {
    if (!items[currentIndex]) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (decision === 'yes') {
      setMatchItem(items[currentIndex]);
    }

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      fetchItems();
      setCurrentIndex(0);
    }
  };

  const currentItem = items[currentIndex];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent.coral} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyText}>No more items</Text>
          <TouchableOpacity style={styles.reshuffleButton} onPress={fetchItems}>
            <Text style={styles.reshuffleText}>Reshuffle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matchItem && (
        <View style={styles.matchOverlay}>
          <View style={styles.matchModal}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <Text style={styles.matchItemTitle}>{matchItem.title}</Text>
            <TouchableOpacity style={styles.matchButton} onPress={() => setMatchItem(null)}>
              <Text style={styles.matchButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.cardStack}>
        <View style={styles.card}>
          {currentItem.image_url && (
            <Image source={{ uri: currentItem.image_url }} style={styles.cardImage} />
          )}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{currentItem.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={4}>{currentItem.description}</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.decisionButton, styles.noButton]} onPress={() => handleDecision('no')}>
          <Text style={styles.buttonEmoji}>👎</Text>
          <Text style={styles.buttonLabel}>Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.decisionButton, styles.yesButton]} onPress={() => handleDecision('yes')}>
          <Text style={styles.buttonEmoji}>👍</Text>
          <Text style={styles.buttonLabel}>Like</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{currentIndex + 1} / {items.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  reshuffleButton: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  reshuffleText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardStack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: width - 40,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.background.tertiary,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  decisionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noButton: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  yesButton: {
    backgroundColor: Colors.accent.coral,
  },
  buttonEmoji: {
    fontSize: 28,
  },
  buttonLabel: {
    fontSize: 12,
    color: Colors.text.primary,
    marginTop: 4,
  },
  progressContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  progressText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  matchModal: {
    backgroundColor: Colors.background.secondary,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: width - 60,
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.accent.coral,
    marginBottom: 16,
  },
  matchItemTitle: {
    fontSize: 20,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  matchButton: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  matchButtonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

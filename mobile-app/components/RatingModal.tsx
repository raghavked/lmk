import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const CATEGORY_METRICS: Record<string, { label1: string; label2: string; label3: string }> = {
  restaurants: { label1: 'Food Quality', label2: 'Service', label3: 'Ambiance' },
  movies: { label1: 'Acting', label2: 'Story', label3: 'Cinematography' },
  tv_shows: { label1: 'Acting', label2: 'Plot', label3: 'Production' },
  reading: { label1: 'Writing', label2: 'Story', label3: 'Engagement' },
  activities: { label1: 'Fun Factor', label2: 'Value', label3: 'Accessibility' },
};

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

interface RatingModalProps {
  visible: boolean;
  itemTitle: string;
  category: string;
  onClose: () => void;
  onSubmit: (data: {
    rating: number;
    description: string;
    metric1: number;
    metric2: number;
    metric3: number;
    price_level: number;
    photos: string[];
  }) => Promise<void>;
  uploadPhoto: (uri: string) => Promise<string | null>;
}

function HalfStarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const stars = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  return (
    <View style={starStyles.container}>
      <View style={starStyles.starsRow}>
        {[1, 2, 3, 4, 5].map((starNum) => {
          const filled = value >= starNum;
          const halfFilled = !filled && value >= starNum - 0.5;

          return (
            <View key={starNum} style={starStyles.starContainer}>
              <TouchableOpacity
                style={starStyles.halfTouchLeft}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onChange(starNum - 0.5);
                }}
              />
              <TouchableOpacity
                style={starStyles.halfTouchRight}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onChange(starNum);
                }}
              />
              <Ionicons
                name={filled ? 'star' : halfFilled ? 'star-half' : 'star-outline'}
                size={36}
                color={Colors.accent.coral}
                style={starStyles.starIcon}
                pointerEvents="none"
              />
            </View>
          );
        })}
      </View>
      <Text style={starStyles.valueText}>{value > 0 ? `${value} / 5` : 'Tap to rate'}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 4 },
  starContainer: { position: 'relative', width: 36, height: 36 },
  halfTouchLeft: { position: 'absolute', left: 0, top: 0, width: 18, height: 36, zIndex: 2 },
  halfTouchRight: { position: 'absolute', right: 0, top: 0, width: 18, height: 36, zIndex: 2 },
  starIcon: { position: 'absolute', left: 0, top: 0 },
  valueText: { color: Colors.text.secondary, fontSize: 14, marginTop: 8 },
});

function MetricSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={metricStyles.container}>
      <View style={metricStyles.header}>
        <Text style={metricStyles.label}>{label}</Text>
        <Text style={metricStyles.value}>{value}/10</Text>
      </View>
      <View style={metricStyles.dotsRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <TouchableOpacity
            key={n}
            style={[metricStyles.dot, n <= value && metricStyles.dotActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(n);
            }}
          >
            <Text style={[metricStyles.dotText, n <= value && metricStyles.dotTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  value: { color: Colors.accent.coral, fontSize: 14, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: Colors.accent.coral,
    borderColor: Colors.accent.coral,
  },
  dotText: { color: Colors.text.secondary, fontSize: 11 },
  dotTextActive: { color: Colors.background.primary, fontWeight: '600' },
});

export default function RatingModal({ visible, itemTitle, category, onClose, onSubmit, uploadPhoto }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [metric1, setMetric1] = useState(5);
  const [metric2, setMetric2] = useState(5);
  const [metric3, setMetric3] = useState(5);
  const [priceLevel, setPriceLevel] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const metrics = CATEGORY_METRICS[category] || CATEGORY_METRICS.activities;

  useEffect(() => {
    if (visible) {
      setRating(0);
      setDescription('');
      setMetric1(5);
      setMetric2(5);
      setMetric3(5);
      setPriceLevel(0);
      setPhotos([]);
      setPhotoUris([]);
    }
  }, [visible]);

  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can upload up to 3 photos per rating.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUris(prev => [...prev, uri]);
      setUploading(true);

      const url = await uploadPhoto(uri);
      if (url) {
        setPhotos(prev => [...prev, url]);
      } else {
        setPhotoUris(prev => prev.filter(u => u !== uri));
        Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
      }
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating < 0.5) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        description,
        metric1,
        metric2,
        metric3,
        price_level: priceLevel,
        photos,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>Rate {itemTitle}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Overall Rating</Text>
            <HalfStarSelector value={rating} onChange={setRating} />

            <Text style={styles.sectionLabel}>Detailed Scores</Text>
            <MetricSlider label={metrics.label1} value={metric1} onChange={setMetric1} />
            <MetricSlider label={metrics.label2} value={metric2} onChange={setMetric2} />
            <MetricSlider label={metrics.label3} value={metric3} onChange={setMetric3} />

            <Text style={styles.sectionLabel}>Price Range</Text>
            <View style={styles.priceRow}>
              {PRICE_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.priceBtn, priceLevel === i + 1 && styles.priceBtnActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPriceLevel(priceLevel === i + 1 ? 0 : i + 1);
                  }}
                >
                  <Text style={[styles.priceBtnText, priceLevel === i + 1 && styles.priceBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Share your thoughts..."
              placeholderTextColor={Colors.text.secondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.sectionLabel}>Photos (up to 3)</Text>
            <View style={styles.photosRow}>
              {photoUris.map((uri, i) => (
                <View key={i} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                    <Ionicons name="close-circle" size={22} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < 3 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={Colors.accent.coral} />
                  ) : (
                    <Ionicons name="camera-outline" size={28} color={Colors.text.secondary} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (rating < 0.5 || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={rating < 0.5 || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.background.primary} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  priceBtnActive: {
    backgroundColor: Colors.accent.coral,
    borderColor: Colors.accent.coral,
  },
  priceBtnText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  priceBtnTextActive: {
    color: Colors.background.primary,
  },
  descriptionInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    color: Colors.text.primary,
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  photoContainer: {
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.background.secondary,
    borderRadius: 11,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: Colors.accent.coral,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

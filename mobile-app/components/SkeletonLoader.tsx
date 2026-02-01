import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={160} borderRadius={12} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={20} style={styles.mb8} />
        <Skeleton width="50%" height={14} style={styles.mb12} />
        <Skeleton width="100%" height={40} style={styles.mb8} />
        <View style={styles.metricsRow}>
          <Skeleton width={60} height={32} />
          <Skeleton width={60} height={32} />
          <Skeleton width={60} height={32} />
        </View>
      </View>
    </View>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array(count).fill(0).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function FriendCardSkeleton() {
  return (
    <View style={styles.friendCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.friendInfo}>
        <Skeleton width={120} height={16} />
      </View>
      <Skeleton width={60} height={28} borderRadius={6} />
    </View>
  );
}

export function FriendListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array(count).fill(0).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function GroupMessageSkeleton() {
  return (
    <View style={styles.messageSkeleton}>
      <Skeleton width="60%" height={40} borderRadius={12} />
      <Skeleton width="45%" height={40} borderRadius={12} style={{ alignSelf: 'flex-end' }} />
      <Skeleton width="70%" height={40} borderRadius={12} />
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={150} height={24} style={styles.mt16} />
        <Skeleton width={200} height={14} style={styles.mt8} />
      </View>
      <View style={styles.profileSection}>
        <Skeleton width={80} height={14} style={styles.mb12} />
        <Skeleton height={100} borderRadius={12} />
      </View>
      <View style={styles.profileSection}>
        <Skeleton width={80} height={14} style={styles.mb12} />
        <Skeleton height={56} borderRadius={12} style={styles.mb8} />
        <Skeleton height={56} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.background.tertiary,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mt8: {
    marginTop: 8,
  },
  mt16: {
    marginTop: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  messageSkeleton: {
    padding: 16,
    gap: 12,
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileSection: {
    padding: 20,
  },
});

export default Skeleton;

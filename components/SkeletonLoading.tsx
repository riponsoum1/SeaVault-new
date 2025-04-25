import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

// Simple skeleton loading component
export const SkeletonPlaceholder = ({ style }: { style: ViewStyle }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBase, style, { opacity }]} />;
};

// Stats skeleton component
export const StatsSkeleton = () => {
  return (
    <>
      <View style={styles.statItem}>
        <SkeletonPlaceholder style={styles.skeletonStatValue} />
        <SkeletonPlaceholder style={styles.skeletonStatLabel} />
      </View>
      <View style={styles.statItem}>
        <SkeletonPlaceholder style={styles.skeletonStatValue} />
        <SkeletonPlaceholder style={styles.skeletonStatLabel} />
      </View>
      <View style={styles.statItem}>
        <SkeletonPlaceholder style={styles.skeletonStatValue} />
        <SkeletonPlaceholder style={styles.skeletonStatLabel} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Base styles
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  // Skeleton styles
  skeletonBase: {
    backgroundColor: '#333333',
  },
  skeletonStatValue: {
    width: 40,
    height: 20,
    borderRadius: 4,
    marginBottom: 5,
  },
  skeletonStatLabel: {
    width: 70,
    height: 14,
    borderRadius: 4,
  },
});

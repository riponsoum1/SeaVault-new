import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

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

// Profile skeleton component
export const ProfileSkeleton = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SkeletonPlaceholder style={styles.avatarContainer} />
        <SkeletonPlaceholder style={styles.skeletonName} />
        <SkeletonPlaceholder style={styles.skeletonEmail} />
        <SkeletonPlaceholder style={styles.skeletonMembership} />
      </View>

      <View style={styles.statsContainer}>
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
      </View>

      <View style={styles.section}>
        <SkeletonPlaceholder style={styles.skeletonSectionTitle} />
        <SkeletonPlaceholder style={styles.skeletonButton} />
      </View>

      <View style={styles.section}>
        <SkeletonPlaceholder style={styles.skeletonSectionTitle} />
        <SkeletonPlaceholder style={styles.skeletonMenuItem} />
        <SkeletonPlaceholder style={styles.skeletonMenuItem} />
        <SkeletonPlaceholder style={styles.skeletonMenuItem} />
      </View>

      <SkeletonPlaceholder style={styles.skeletonLogoutButton} />
    </ScrollView>
  );
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Skeleton styles
  skeletonBase: {
    backgroundColor: '#333333',
  },
  skeletonName: {
    width: 150,
    height: 24,
    borderRadius: 4,
    marginBottom: 5,
  },
  skeletonEmail: {
    width: 180,
    height: 16,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonMembership: {
    width: 120,
    height: 26,
    borderRadius: 20,
    marginTop: 5,
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
  skeletonSectionTitle: {
    width: 100,
    height: 18,
    borderRadius: 4,
    marginBottom: 15,
  },
  skeletonButton: {
    height: 45,
    borderRadius: 10,
    marginBottom: 10,
  },
  skeletonMenuItem: {
    height: 45,
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonLogoutButton: {
    height: 45,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 20,
  },
});

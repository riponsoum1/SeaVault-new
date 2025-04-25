import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import {
  LogOut,
  User as UserIcon,
  Award,
  Heart,
  BookOpen,
  Settings,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { checkAndUpdateAchievements } from '../../lib/achievements';
import Purchases from 'react-native-purchases';
import React from 'react'; // 👈 fixes UMD global error
import {
  ProfileSkeleton,
  StatsSkeleton,
} from '../../components/SkeletonLoading';

export default function ProfileScreen() {
  const { user, userProfile, signOut, loading } = useAuth();
  const [stats, setStats] = useState({
    discovered: 0,
    favorites: 0,
    points: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState('Loading...');

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchMembershipStatus();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setStatsLoading(true);
      const { data: sightingsData = [] } = await supabase
        .from('sightings')
        .select('creature_id')
        .eq('user_id', user!.id);

      const uniqueCreaturesSighted = [
        ...new Set(sightingsData!.map((s) => s.creature_id)),
      ];
      const { data: wishlistData = [] } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user!.id);

      let totalPoints = 0;
      if (uniqueCreaturesSighted.length > 0) {
        const { data: pointsData = [] } = await supabase
          .from('creatures')
          .select('points')
          .in('id', uniqueCreaturesSighted);

        totalPoints =
          pointsData?.reduce((sum, creature) => sum + creature.points, 0) ?? 0;
      }

      setStats({
        discovered: uniqueCreaturesSighted.length,
        favorites: wishlistData?.length ?? 0,
        points: totalPoints,
      });

      await checkAndUpdateAchievements(user!.id);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMembershipStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const pro = customerInfo.entitlements.active['pro'];
      if (pro?.willRenew) {
        setMembershipStatus('Paid Subscription');
      } else if (pro?.isSandbox && pro?.periodType === 'TRIAL') {
        setMembershipStatus('Free Trial');
      } else {
        setMembershipStatus('Free Account');
      }
    } catch (err) {
      setMembershipStatus('Free Account');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserStats();
    await fetchMembershipStatus();
    setRefreshing(false);
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {userProfile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {userProfile?.full_name?.[0] || user.email?.[0]}
            </Text>
          )}
        </View>
        <Text style={styles.name}>
          {userProfile?.full_name || 'Sea Explorer'}
        </Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.membershipBadge}>
          <Text style={styles.membershipText}>{membershipStatus}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {statsLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.discovered}</Text>
              <Text style={styles.statLabel}>Discovered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.points}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push('/account/edit-profile')}
        >
          <Settings size={20} color="white" />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collections</Text>

        <TouchableOpacity
          onPress={() => router.push('/wishlist')}
          style={styles.menuItem}
        >
          <Heart size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/achievements')}
          style={styles.menuItem}
        >
          <Award size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Achievements</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/sightings')}
          style={styles.menuItem}
        >
          <BookOpen size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Your Sightings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <LogOut size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 10,
  },
  membershipBadge: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 5,
  },
  membershipText: {
    color: 'white',
    fontWeight: 'bold',
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
  statsLoading: {
    flex: 1,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077B6',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#333',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#DDDDDD',
  },
  editProfileButton: {
    flexDirection: 'row',
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  editProfileText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoutText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});

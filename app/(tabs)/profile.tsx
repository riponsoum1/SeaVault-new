import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { LogOut, CreditCard, Settings, User as UserIcon, Award, Heart, BookOpen, Share2 } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { checkAndUpdateAchievements } from '../../lib/achievements';

export default function ProfileScreen() {
  const { user, userProfile, signOut, loading } = useAuth();
  const [stats, setStats] = useState({
    discovered: 0,
    favorites: 0,
    points: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setStatsLoading(true);
      
      // Fetch sightings count
      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('creature_id')
        .eq('user_id', user.id);
        
      if (sightingsError) throw sightingsError;
      
      // Get unique creatures sighted
      const uniqueCreaturesSighted = [...new Set(sightingsData.map(s => s.creature_id))];
      
      // Fetch wishlist count
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id);
        
      if (wishlistError) throw wishlistError;
      
      // Calculate total points from sighted creatures
      let totalPoints = 0;
      if (uniqueCreaturesSighted.length > 0) {
        const { data: pointsData, error: pointsError } = await supabase
          .from('creatures')
          .select('points')
          .in('id', uniqueCreaturesSighted);
          
        if (pointsError) throw pointsError;
        
        totalPoints = pointsData.reduce((sum, creature) => sum + creature.points, 0);
      }
      
      setStats({
        discovered: uniqueCreaturesSighted.length,
        favorites: wishlistData.length,
        points: totalPoints
      });

      // Check and update achievements
      const newAchievements = await checkAndUpdateAchievements(user.id);
      if (newAchievements > 0) {
        // Optionally show a notification that new achievements were unlocked
        console.log(`Unlocked ${newAchievements} new achievements!`);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await fetchUserStats();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  // If loading, show a loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  // If no user is logged in, redirect to login
  if (!user) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0077B6"
          colors={['#0077B6']}
          progressBackgroundColor="#2A2A2A"
        />
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
              {userProfile?.full_name 
                ? userProfile.full_name.charAt(0).toUpperCase() 
                : user.email?.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{userProfile?.full_name || 'Sea Explorer'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        
        <View style={styles.membershipBadge}>
          <Text style={styles.membershipText}>
            {userProfile?.membership_tier === 'premium' ? 'Premium Member' : 'Free Account'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.shareProfileButton}
          onPress={() => router.push('/share-profile')}
        >
          <Share2 size={16} color="white" />
          <Text style={styles.shareProfileText}>Share Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        {statsLoading ? (
          <ActivityIndicator size="small" color="#0077B6" style={styles.statsLoading} />
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.discovered}</Text>
              <Text style={styles.statLabel}>Discovered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
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
          style={styles.menuItem}
          onPress={() => router.push('/account/edit-profile')}
        >
          <UserIcon size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <CreditCard size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Membership</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Settings size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collections</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/wishlist')}
        >
          <Heart size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Favorites</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/achievements')}
        >
          <Award size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Achievements</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/sightings')}
        >
          <BookOpen size={20} color="#0077B6" />
          <Text style={styles.menuItemText}>Your Sightings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={signOut}
      >
        <LogOut size={20} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
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
  shareProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  shareProfileText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
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
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#0077B6',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Creature } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Search, CircleCheck as CheckCircle, Heart, Plus, Eye, X, Trophy, Medal } from 'lucide-react-native';

type LeaderboardUser = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  rank: number;
  discovered: number;
};

export default function HomeScreen() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sightedCreatures, setSightedCreatures] = useState<string[]>([]);
  const [wishlistCreatures, setWishlistCreatures] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    initialLoad();
  }, [user]);

  const initialLoad = async () => {
    try {
      setInitialLoading(true);
      await Promise.all([
        fetchCreatures(),
        user && fetchSightedCreatures(),
        user && fetchWishlistCreatures(),
        user && fetchLeaderboard()
      ]);
    } catch (error) {
      console.error('Error in initial load:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchCreatures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('creatures')
        .select('*')
        .order('name');

      if (error) throw error;
      setCreatures(data as Creature[]);
    } catch (error: any) {
      console.error('Error fetching creatures:', error);
      setError(error.message || 'Failed to load creatures');
    } finally {
      setLoading(false);
    }
  };

  const fetchSightedCreatures = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('sightings')
        .select('creature_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const sightedIds = [...new Set(data.map(sighting => sighting.creature_id))];
      setSightedCreatures(sightedIds);
    } catch (error) {
      console.error('Error fetching sighted creatures:', error);
    }
  };

  const fetchWishlistCreatures = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('creature_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const wishlistIds = data.map(item => item.creature_id);
      setWishlistCreatures(wishlistIds);
    } catch (error) {
      console.error('Error fetching wishlist creatures:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');

      if (profilesError) throw profilesError;

      const { data: sightingsWithPoints, error: sightingsError } = await supabase
        .from('sightings')
        .select(`
          user_id,
          creature_id,
          creatures (
            points
          )
        `);

      if (sightingsError) throw sightingsError;

      const userStats = sightingsWithPoints.reduce((acc: { [key: string]: { points: number, discovered: Set<string> } }, sighting: any) => {
        const userId = sighting.user_id;
        if (!acc[userId]) {
          acc[userId] = { points: 0, discovered: new Set() };
        }
        
        if (!acc[userId].discovered.has(sighting.creature_id)) {
          acc[userId].points += sighting.creatures.points;
          acc[userId].discovered.add(sighting.creature_id);
        }
        
        return acc;
      }, {});

      const leaderboardData = profiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        points: userStats[profile.id]?.points || 0,
        discovered: userStats[profile.id]?.discovered?.size || 0,
        rank: 0
      }));

      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.points - a.points || b.discovered - a.discovered)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));

      setLeaderboard(sortedLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCreatures(),
        user && fetchSightedCreatures(),
        user && fetchWishlistCreatures(),
        user && fetchLeaderboard()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const hasBeenSighted = (creatureId: string) => sightedCreatures.includes(creatureId);
  const isInWishlist = (creatureId: string) => wishlistCreatures.includes(creatureId);

  const getBackgroundColor = (categoryId: string) => {
    switch (categoryId) {
      case 'b7c83fd5-3729-4620-92e5-a3a6452300f5': return '#0077B6';
      case '48169dbe-0f42-4059-a6fb-842184ae60e2': return '#0096C7';
      case '50d44a97-ec72-4c4f-9f66-e41c1621ded5': return '#00B4D8';
      case '8d2f3964-9332-4032-9bc1-815e3f72836b': return '#48CAE4';
      case '4fe5e0c2-d60d-49d2-9854-ed7bde02ec63': return '#90E0EF';
      case 'bdc2d112-78b2-47d6-9181-8e5ba48d7d7c': return '#ADE8F4';
      default: return '#0077B6';
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#0077B6';
    }
  };

  const renderCreatureItem = ({ item }: { item: Creature }) => (
    <TouchableOpacity
      style={styles.creatureCard}
      onPress={() => router.push(`/creature/${item.id}`)}
    >
      <View style={[styles.creatureHeader, { backgroundColor: getBackgroundColor(item.category_id) }]}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.creatureImage} resizeMode="contain" />
        ) : (
          <Text style={styles.creatureEmoji}>🐋</Text>
        )}
        {hasBeenSighted(item.id) && (
          <View style={styles.sightedBadge}>
            <CheckCircle size={16} color="white" fill="#0077B6" />
          </View>
        )}
        {isInWishlist(item.id) && (
          <View style={[styles.sightedBadge, styles.wishlistBadge]}>
            <Heart size={16} color="white" fill="#FF6B6B" />
          </View>
        )}
      </View>
      <View style={styles.creatureInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.creatureName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.scientificName} numberOfLines={1}>{item.scientific_name}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.points}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLeaderboardItem = ({ item }: { item: LeaderboardUser }) => (
    <View style={[styles.leaderboardItem, item.id === user?.id && styles.currentUserItem]}>
      <View style={styles.rankContainer}>
        {item.rank <= 3 ? (
          <Medal size={24} color={getRankColor(item.rank)} />
        ) : (
          <Text style={styles.rankNumber}>#{item.rank}</Text>
        )}
      </View>

      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <Text style={styles.avatarText}>
            {item.full_name ? item.full_name.charAt(0).toUpperCase() : '?'}
          </Text>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.full_name || 'Anonymous Explorer'}
          {item.id === user?.id && <Text style={styles.youTag}> (You)</Text>}
        </Text>
        <Text style={styles.userStats}>{item.discovered} creatures discovered</Text>
      </View>

      <View style={[styles.pointsContainer, { backgroundColor: getRankColor(item.rank) }]}>
        <Text style={styles.points}>{item.points}</Text>
        <Text style={styles.pointsLabel}>PTS</Text>
      </View>
    </View>
  );

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
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
        <Text style={styles.title}>Sea Creatures</Text>
        <Text style={styles.subtitle}>Discover amazing marine life</Text>
      </View>

      <View style={styles.statsSection}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/sightings')}
          activeOpacity={0.7}
        >
          <Eye size={24} color="#0077B6" />
          <Text style={styles.statValue}>{sightedCreatures.length}</Text>
          <Text style={styles.statLabel}>Discovered</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/wishlist')}
          activeOpacity={0.7}
        >
          <Heart size={24} color="#FF6B6B" />
          <Text style={styles.statValue}>{wishlistCreatures.length}</Text>
          <Text style={styles.statLabel}>Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
        >
          <Trophy size={24} color="#FFD700" />
          <Text style={styles.statValue}>
            {leaderboard.find(u => u.id === user?.id)?.points || 0}
          </Text>
          <Text style={styles.statLabel}>Points</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Trophy size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Top Explorers</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/leaderboard')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.inlineLoadingContainer}>
            <ActivityIndicator size="small" color="#0077B6" />
          </View>
        ) : (
          <View style={styles.leaderboardList}>
            {leaderboard.slice(0, 3).map(user => (
              <View key={user.id}>
                {renderLeaderboardItem({ item: user })}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Eye size={20} color="#0077B6" />
            <Text style={styles.sectionTitle}>Recent Discoveries</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/sightings')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.recentDiscoveries}
        >
          {creatures
            .filter(creature => hasBeenSighted(creature.id))
            .slice(0, 5)
            .map(creature => (
              <View key={creature.id} style={styles.recentDiscoveryCard}>
                {renderCreatureItem({ item: creature })}
              </View>
            ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Creatures</Text>
        </View>
        
        <View style={styles.featuredGrid}>
          {creatures.slice(0, 4).map(creature => (
            <View key={creature.id} style={styles.gridItem}>
              {renderCreatureItem({ item: creature })}
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => router.push('/creatures')}
        >
          <Text style={styles.viewAllButtonText}>View All Creatures</Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1E1E1E',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    margin: 15,
    marginTop: 0,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  seeAllText: {
    color: '#0077B6',
    fontWeight: '600',
  },
  leaderboardLoading: {
    padding: 20,
  },
  leaderboardList: {
    marginBottom: 5,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  currentUserItem: {
    backgroundColor: '#1E3A8A',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    color: '#0077B6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  youTag: {
    color: '#0077B6',
    fontStyle: 'italic',
  },
  userStats: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 2,
  },
  pointsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
  },
  points: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pointsLabel: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
  recentDiscoveries: {
    marginHorizontal: -5,
  },
  recentDiscoveryCard: {
    width: 200,
    marginHorizontal: 5,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 15,
  },
  creatureCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  creatureHeader: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  creatureEmoji: {
    fontSize: 60,
  },
  sightedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  wishlistBadge: {
    left: 35,
  },
  creatureInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  creatureName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  scientificName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#AAAAAA',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 30,
    alignItems: 'center',
  },
  pointsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  viewAllButton: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllButtonText: {
    color: '#0077B6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inlineLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
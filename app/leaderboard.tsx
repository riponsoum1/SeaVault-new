import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';
import { ChevronLeft, Medal } from 'lucide-react-native';

type LeaderboardUser = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  rank: number;
  discovered: number;
};

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get all sightings with creature points
      const { data: sightings, error: sightingsError } = await supabase
        .from('sightings')
        .select(`
          user_id,
          creature_id,
          creatures (
            points
          )
        `);

      if (sightingsError) {
        console.error('Error fetching sightings:', sightingsError);
        throw sightingsError;
      }

      // Calculate stats for each user
      const userStats = new Map();

      // Initialize stats for all profiles
      profiles.forEach(profile => {
        userStats.set(profile.id, {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          points: 0,
          discovered: new Set(),
        });
      });

      // Process sightings
      sightings?.forEach(sighting => {
        const userStat = userStats.get(sighting.user_id);
        if (userStat && !userStat.discovered.has(sighting.creature_id)) {
          userStat.points += (sighting.creatures?.points || 0);
          userStat.discovered.add(sighting.creature_id);
        }
      });

      // Convert to array and format for leaderboard
      const leaderboardData = Array.from(userStats.values())
        .map(stat => ({
          id: stat.id,
          full_name: stat.full_name,
          avatar_url: stat.avatar_url,
          points: stat.points,
          discovered: stat.discovered.size,
          rank: 0
        }))
        .sort((a, b) => b.points - a.points || b.discovered - a.discovered)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));

      setLeaderboard(leaderboardData);
    } catch (error: any) {
      console.error('Error in fetchLeaderboard:', error);
      setError(error.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#0077B6'; // Blue
    }
  };

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
        <Text style={styles.userStats}>
          {item.discovered} {item.discovered === 1 ? 'creature' : 'creatures'} discovered
        </Text>
      </View>

      <View style={[styles.pointsContainer, { backgroundColor: getRankColor(item.rank) }]}>
        <Text style={styles.points}>{item.points}</Text>
        <Text style={styles.pointsLabel}>PTS</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.placeholder} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLeaderboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 34,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
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
});
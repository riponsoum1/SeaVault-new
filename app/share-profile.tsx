import { View, Text, StyleSheet, TouchableOpacity, Share, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Share2 } from 'lucide-react-native';

export default function ShareProfileScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState({
    discovered: 0,
    favorites: 0,
    points: 0,
    rank: 'Novice Explorer'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    } else {
      router.replace('/auth/login');
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
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
      
      // Determine rank based on points
      let rank = 'Novice Explorer';
      if (totalPoints >= 1000) {
        rank = 'Master Marine Biologist';
      } else if (totalPoints >= 750) {
        rank = 'Expert Diver';
      } else if (totalPoints >= 500) {
        rank = 'Seasoned Explorer';
      } else if (totalPoints >= 250) {
        rank = 'Ocean Enthusiast';
      }
      
      setStats({
        discovered: uniqueCreaturesSighted.length,
        favorites: wishlistData.length,
        points: totalPoints,
        rank
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareProfile = async () => {
    try {
      const message = `Check out my DiveDex profile!\n\n🏆 Rank: ${stats.rank}\n🔍 Creatures Discovered: ${stats.discovered}\n⭐ Favorites: ${stats.favorites}\n✨ Total Points: ${stats.points}\n\nDownload DiveDex and start your underwater adventure!`;
      
      await Share.share({
        message,
        title: 'My DiveDex Profile'
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Profile</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.appName}>DiveDex</Text>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userProfile?.full_name 
                  ? userProfile.full_name.charAt(0).toUpperCase() 
                  : user?.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{userProfile?.full_name || 'Sea Explorer'}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{stats.rank}</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
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
          </View>
          
          <View style={styles.achievements}>
            <Text style={styles.achievementsTitle}>Achievements</Text>
            <View style={styles.achievementsList}>
              {stats.discovered > 0 && (
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>🔍</Text>
                  <Text style={styles.achievementText}>First Discovery</Text>
                </View>
              )}
              {stats.points >= 100 && (
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>⭐</Text>
                  <Text style={styles.achievementText}>Century Club</Text>
                </View>
              )}
              {stats.discovered >= 5 && (
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>🏆</Text>
                  <Text style={styles.achievementText}>Dedicated Explorer</Text>
                </View>
              )}
              {stats.favorites >= 3 && (
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementEmoji}>❤️</Text>
                  <Text style={styles.achievementText}>Creature Enthusiast</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Join me on DiveDex!</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareProfile}
        >
          <Share2 size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 16,
    color: '#0077B6',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 119, 182, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0077B6',
  },
  rankText: {
    color: '#0077B6',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
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
  achievements: {
    marginBottom: 20,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    width: '48%',
  },
  achievementEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  achievementText: {
    color: '#DDDDDD',
    fontSize: 14,
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontStyle: 'italic',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});
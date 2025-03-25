import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Trophy, Medal, MapPin, Globe, Globe as Globe2, Star, Swords, Fish, Heart, Scale as Whale } from 'lucide-react-native';
import { Achievement, UserAchievement } from '../lib/types';

type AchievementWithStatus = Achievement & {
  unlocked: boolean;
  unlocked_at?: string;
};

type AchievementCategory = {
  name: string;
  title: string;
  icon: React.ReactNode;
  achievements: AchievementWithStatus[];
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    } else {
      router.replace('/auth/login');
    }
  }, [user]);

  const getIconComponent = (iconName: string, color: string = 'currentColor', size: number = 24) => {
    const icons: { [key: string]: React.ReactNode } = {
      Trophy: <Trophy size={size} color={color} />,
      Medal: <Medal size={size} color={color} />,
      MapPin: <MapPin size={size} color={color} />,
      Globe: <Globe size={size} color={color} />,
      Globe2: <Globe2 size={size} color={color} />,
      Star: <Star size={size} color={color} />,
      Swords: <Swords size={size} color={color} />,
      Fish: <Fish size={size} color={color} />,
      Heart: <Heart size={size} color={color} />,
      Whale: <Whale size={size} color={color} />
    };
    return icons[iconName] || <Trophy size={size} color={color} />;
  };

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user?.id);

      if (userAchievementsError) throw userAchievementsError;

      // Create a map of unlocked achievements
      const unlockedMap = new Map(
        userAchievements?.map(ua => [ua.achievement_id, ua.unlocked_at])
      );

      // Calculate total points and unlocked count
      let points = 0;
      let unlocked = 0;

      // Process achievements and group by category
      const achievementsByCategory = achievementsData.reduce((acc: { [key: string]: AchievementWithStatus[] }, achievement) => {
        const isUnlocked = unlockedMap.has(achievement.id);
        if (isUnlocked) {
          points += achievement.points;
          unlocked++;
        }

        const achievementWithStatus = {
          ...achievement,
          unlocked: isUnlocked,
          unlocked_at: unlockedMap.get(achievement.id)
        };

        if (!acc[achievement.category]) {
          acc[achievement.category] = [];
        }
        acc[achievement.category].push(achievementWithStatus);
        return acc;
      }, {});

      setTotalPoints(points);
      setUnlockedCount(unlocked);

      // Transform into final format
      const categories: AchievementCategory[] = [
        {
          name: 'beginner',
          title: 'Beginner Achievements',
          icon: <Trophy size={24} color="#FFD700" />,
          achievements: achievementsByCategory['beginner'] || []
        },
        {
          name: 'collection',
          title: 'Collection Achievements',
          icon: <Medal size={24} color="#C0C0C0" />,
          achievements: achievementsByCategory['collection'] || []
        },
        {
          name: 'location',
          title: 'Location Achievements',
          icon: <Globe size={24} color="#0077B6" />,
          achievements: achievementsByCategory['location'] || []
        },
        {
          name: 'rare',
          title: 'Rare Encounters',
          icon: <Star size={24} color="#FFD700" />,
          achievements: achievementsByCategory['rare'] || []
        }
      ];

      setAchievements(categories);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      setError(error.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unlockedCount}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          achievements.map((category) => (
            <View key={category.name} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                {category.icon}
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>

              {category.achievements.map((achievement) => (
                <View 
                  key={achievement.id} 
                  style={[
                    styles.achievementCard,
                    achievement.unlocked && styles.achievementCardUnlocked
                  ]}
                >
                  <View style={styles.achievementIcon}>
                    {getIconComponent(achievement.icon_name, 
                      achievement.unlocked ? '#FFD700' : '#666666'
                    )}
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={[
                      styles.achievementName,
                      achievement.unlocked && styles.achievementNameUnlocked
                    ]}>
                      {achievement.name}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    {achievement.unlocked && (
                      <Text style={styles.achievementDate}>
                        Unlocked: {new Date(achievement.unlocked_at!).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.achievementPoints}>
                    <Text style={[
                      styles.pointsText,
                      achievement.unlocked && styles.pointsTextUnlocked
                    ]}>
                      {achievement.points}
                    </Text>
                    <Text style={styles.pointsLabel}>PTS</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
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
    marginHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  achievementCardUnlocked: {
    backgroundColor: '#1E3A8A',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
    marginRight: 10,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#AAAAAA',
    marginBottom: 4,
  },
  achievementNameUnlocked: {
    color: 'white',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: '#0077B6',
    fontStyle: 'italic',
  },
  achievementPoints: {
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  pointsTextUnlocked: {
    color: '#FFD700',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
});
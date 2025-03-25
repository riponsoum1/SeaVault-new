import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  ScrollView,
  Share,
  Platform,
  ViewStyle
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Share2, Award, Eye, Heart, Trophy, Download } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

type UserStats = {
  discovered: number;
  favorites: number;
  points: number;
  rarest: {
    name: string;
    points: number;
  } | null;
  categories: {
    name: string;
    count: number;
    total: number;
  }[];
};

export default function ShareProfileScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    discovered: 0,
    favorites: 0,
    points: 0,
    rarest: null,
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      checkMediaLibraryPermissions();
    } else {
      router.replace('/auth/login');
    }
  }, [user]);

  const checkMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
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
        .select('creature_id')
        .eq('user_id', user.id);
        
      if (wishlistError) throw wishlistError;
      
      // Calculate total points from sighted creatures
      let totalPoints = 0;
      let rarestCreature = null;
      
      if (uniqueCreaturesSighted.length > 0) {
        const { data: creaturesData, error: creaturesError } = await supabase
          .from('creatures')
          .select('id, name, points, category_id')
          .in('id', uniqueCreaturesSighted);
          
        if (creaturesError) throw creaturesError;
        
        totalPoints = creaturesData.reduce((sum, creature) => sum + creature.points, 0);
        
        // Find rarest creature (highest points)
        if (creaturesData.length > 0) {
          const highest = creaturesData.reduce((prev, current) => 
            (prev.points > current.points) ? prev : current
          );
          
          rarestCreature = {
            name: highest.name,
            points: highest.points
          };
        }
        
        // Get category stats
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
          
        if (categoriesError) throw categoriesError;
        
        // Count creatures by category
        const categoryStats = categoriesData.map(category => {
          const creaturesByCategory = creaturesData.filter(c => c.category_id === category.id);
          return {
            name: category.name,
            count: creaturesByCategory.length,
            total: 0 // Will be updated next
          };
        });
        
        // Get total creatures per category
        for (let i = 0; i < categoryStats.length; i++) {
          const { count, error: countError } = await supabase
            .from('creatures')
            .select('id', { count: 'exact' })
            .eq('category_id', categoriesData[i].id);
            
          if (countError) throw countError;
          
          categoryStats[i].total = count || 0;
        }
        
        // Sort categories by completion percentage
        const sortedCategories = categoryStats
          .filter(cat => cat.total > 0)
          .sort((a, b) => (b.count / b.total) - (a.count / a.total));
        
        setStats({
          discovered: uniqueCreaturesSighted.length,
          favorites: wishlistData.length,
          points: totalPoints,
          rarest: rarestCreature,
          categories: sortedCategories.slice(0, 3) // Top 3 categories
        });
      } else {
        setStats({
          discovered: 0,
          favorites: wishlistData.length,
          points: 0,
          rarest: null,
          categories: []
        });
      }
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      setError(error.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    
    try {
      setSharing(true);
      
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'web') {
        // Web sharing
        const blob = await (await fetch(uri)).blob();
        const file = new File([blob], 'divedex-profile.png', { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            title: 'My DiveDex Profile',
            text: 'Check out my marine creature collection!',
            files: [file]
          });
        } else {
          // Fallback for browsers that don't support Web Share API
          const link = document.createElement('a');
          link.href = uri;
          link.download = 'divedex-profile.png';
          link.click();
        }
      } else {
        // Native sharing
        await Share.share({
          url: uri,
          title: 'My DiveDex Profile',
          message: 'Check out my marine creature collection in DiveDex!'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    if (!viewShotRef.current || Platform.OS === 'web') return;
    
    try {
      setSaving(true);
      
      if (!permissionGranted) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need media library permissions to save the image');
          setSaving(false);
          return;
        }
        setPermissionGranted(true);
      }
      
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'android') {
        const filename = `divedex-profile-${Date.now()}.png`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri
        });
        
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('DiveDex', asset, false);
      } else {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      
      alert('Profile card saved to your gallery!');
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image');
    } finally {
      setSaving(false);
    }
  };

  // Get rank based on points
  const getRank = (points: number) => {
    if (points >= 5000) return 'Master Explorer';
    if (points >= 3000) return 'Expert Diver';
    if (points >= 1500) return 'Advanced Diver';
    if (points >= 500) return 'Intermediate Diver';
    if (points >= 100) return 'Novice Diver';
    return 'Beginner';
  };

  // Get color based on rank
  const getRankColor = (points: number): string => {
    if (points >= 5000) return '#FFD700'; // Gold
    if (points >= 3000) return '#C0C0C0'; // Silver
    if (points >= 1500) return '#CD7F32'; // Bronze
    if (points >= 500) return '#0077B6'; // Blue
    if (points >= 100) return '#48CAE4'; // Light Blue
    return '#90E0EF'; // Very Light Blue
  };

  // Get progress percentage for a category
  const getCategoryProgress = (count: number, total: number): number => {
    return total > 0 ? (count / total) * 100 : 0;
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
        <Text style={styles.headerTitle}>Share Profile</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Your Shareable Profile Card</Text>
        <Text style={styles.sectionSubtitle}>
          Share your diving achievements with friends or save to your device
        </Text>
        
        <View style={styles.cardContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={styles.cardWrapper}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>DiveDex</Text>
                </View>
                
                <View style={styles.profileSection}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                      {userProfile?.full_name 
                        ? userProfile.full_name.charAt(0).toUpperCase() 
                        : user?.email?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                      {userProfile?.full_name || 'Sea Explorer'}
                    </Text>
                    <View style={[
                      styles.rankBadge, 
                      { backgroundColor: getRankColor(stats.points) } as ViewStyle
                    ]}>
                      <Text style={styles.rankText}>{getRank(stats.points)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Eye size={20} color="#0077B6" />
                  <Text style={styles.statValue}>{stats.discovered}</Text>
                  <Text style={styles.statLabel}>Discovered</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Heart size={20} color="#FF6B6B" />
                  <Text style={styles.statValue}>{stats.favorites}</Text>
                  <Text style={styles.statLabel}>Favorites</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Trophy size={20} color="#FFD700" />
                  <Text style={styles.statValue}>{stats.points}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
              
              {stats.rarest && (
                <View style={styles.rarestCreature}>
                  <Text style={styles.rarestTitle}>Rarest Creature Spotted</Text>
                  <View style={styles.rarestContent}>
                    <Award size={24} color="#FFD700" />
                    <Text style={styles.rarestName}>{stats.rarest.name}</Text>
                    <Text style={styles.rarestPoints}>{stats.rarest.points} pts</Text>
                  </View>
                </View>
              )}
              
              {stats.categories.length > 0 && (
                <View style={styles.categoriesSection}>
                  <Text style={styles.categoriesTitle}>Top Categories</Text>
                  
                  {stats.categories.map((category, index) => (
                    <View key={index} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>
                          {category.count}/{category.total}
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${getCategoryProgress(category.count, category.total)}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>divedex.app</Text>
              </View>
            </View>
          </ViewShot>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Share2 size={20} color="white" />
                <Text style={styles.actionButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
          
          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Download size={20} color="white" />
                  <Text style={styles.actionButtonText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
  errorContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 20,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 0,
  },
  cardHeader: {
    backgroundColor: '#0077B6',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0077B6',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    padding: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#444',
    marginTop: 5,
  },
  rarestCreature: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  rarestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  rarestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
  },
  rarestName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  rarestPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  categoriesSection: {
    padding: 15,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 14,
    color: 'white',
  },
  categoryCount: {
    fontSize: 14,
    color: '#0077B6',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0077B6',
  },
  cardFooter: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  footerText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#2A2A2A',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
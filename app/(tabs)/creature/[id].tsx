import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Creature, Sighting } from '../../../lib/types';
import { ChevronLeft, Heart, Plus, Camera, MapPin, Calendar, CreditCard as Edit } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';

export default function CreatureDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [creature, setCreature] = useState<Creature | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [sightingsLoading, setSightingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCreature(),
        user && fetchSightings(),
        user && checkIfFavorite()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchCreature();
    if (user) {
      fetchSightings();
      checkIfFavorite();
    }
  }, [id, user]);

  const fetchCreature = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Creature ID is required');
      }

      const { data, error } = await supabase
        .from('creatures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setCreature(data as Creature);
    } catch (error: any) {
      console.error('Error fetching creature:', error);
      setError(error.message || 'Failed to load creature');
    } finally {
      setLoading(false);
    }
  };

  const fetchSightings = async () => {
    try {
      setSightingsLoading(true);
      
      if (!id || !user) return;

      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .eq('creature_id', id)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching sightings:', error);
        return;
      }

      console.log('Fetched sightings:', data);
      setSightings(data as Sighting[]);
    } catch (error) {
      console.error('Error in fetchSightings:', error);
    } finally {
      setSightingsLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('creature_id', id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
        return;
      }
      
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error in checkIfFavorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !creature) {
      Alert.alert('Sign In Required', 'Please sign in to add to favorites.');
      return;
    }
    
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('creature_id', creature.id);
          
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, creature_id: creature.id }]);
          
        if (error) throw error;
      }
      
      // Toggle state
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  // Get emoji based on category
  const getEmojiForCreature = (categoryId?: string) => {
    if (!categoryId) return '🐋';
    
    switch (categoryId) {
      case 'b7c83fd5-3729-4620-92e5-a3a6452300f5': // Sharks
        return '🦈';
      case '48169dbe-0f42-4059-a6fb-842184ae60e2': // Turtles
        return '🐢';
      case '50d44a97-ec72-4c4f-9f66-e41c1621ded5': // Reef Fish
        return '🐠';
      case '8d2f3964-9332-4032-9bc1-815e3f72836b': // Cephalopods
        return '🦑';
      case '4fe5e0c2-d60d-49d2-9854-ed7bde02ec63': // Rays
        return '🐡';
      case 'bdc2d112-78b2-47d6-9181-8e5ba48d7d7c': // Mammals
        return '🐬';
      default:
        return '🐋';
    }
  };

  // Get background color based on category
  const getBackgroundColor = (categoryId?: string) => {
    if (!categoryId) return '#0077B6';
    
    switch (categoryId) {
      case 'b7c83fd5-3729-4620-92e5-a3a6452300f5': // Sharks
        return '#0077B6'; // Blue
      case '48169dbe-0f42-4059-a6fb-842184ae60e2': // Turtles
        return '#0096C7'; // Blue-green
      case '50d44a97-ec72-4c4f-9f66-e41c1621ded5': // Reef Fish
        return '#00B4D8'; // Light blue
      case '8d2f3964-9332-4032-9bc1-815e3f72836b': // Cephalopods
        return '#48CAE4'; // Cyan
      case '4fe5e0c2-d60d-49d2-9854-ed7bde02ec63': // Rays
        return '#90E0EF'; // Very light blue
      case 'bdc2d112-78b2-47d6-9181-8e5ba48d7d7c': // Mammals
        return '#ADE8F4'; // Pale blue
      default:
        return '#0077B6';
    }
  };

  const navigateToAddSighting = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add a sighting.');
      return;
    }
    
    if (creature) {
      router.push({
        pathname: '/sighting/add',
        params: { creatureId: creature.id, creatureName: creature.name }
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  if (error || !creature) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Creature not found'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header with favorite button */}
      <View style={[styles.header, { backgroundColor: getBackgroundColor(creature.category_id) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.placeholder} />
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
          <Heart color="white" fill={isFavorite ? "white" : "none"} size={28} />
        </TouchableOpacity>
      </View>

      {/* Creature image section */}
      <View style={[styles.imageContainer, { backgroundColor: getBackgroundColor(creature.category_id) }]}>
        {creature.image_url ? (
          <Image 
            source={{ uri: creature.image_url }} 
            style={styles.creatureImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.fallbackEmoji}>{getEmojiForCreature(creature.category_id)}</Text>
        )}
      </View>

      {/* Creature name and info */}
      <View style={styles.nameContainer}>
        <Text style={styles.name}>{creature.name}</Text>
        <Text style={styles.scientificName}>{creature.scientific_name}</Text>
        
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Marine</Text>
          </View>
          <View style={styles.pointsTag}>
            <Text style={styles.pointsTagText}>{creature.points} pts</Text>
          </View>
        </View>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'about' && styles.activeTab]} 
          onPress={() => setActiveTab('about')}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'sightings' && styles.activeTab]} 
          onPress={() => setActiveTab('sightings')}
        >
          <Text style={[styles.tabText, activeTab === 'sightings' && styles.activeTabText]}>Sightings</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <ScrollView 
        style={styles.contentContainer}
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
        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <Text style={styles.description}>{creature.description}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{creature.length}</Text>
                <Text style={styles.statLabel}>Length</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{creature.weight}</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Diet</Text>
              <Text style={styles.infoText}>{creature.diet}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Lifespan</Text>
              <Text style={styles.infoText}>{creature.lifespan}</Text>
            </View>
          </View>
        )}

        {activeTab === 'sightings' && (
          <View style={styles.tabContent}>
            <View style={styles.sightingsHeader}>
              <Text style={styles.sightingsTitle}>Your Sightings</Text>
              <TouchableOpacity 
                style={styles.addSightingButton}
                onPress={navigateToAddSighting}
              >
                <Plus size={20} color="white" />
                <Text style={styles.addSightingText}>Add Sighting</Text>
              </TouchableOpacity>
            </View>

            {sightingsLoading ? (
              <ActivityIndicator size="small" color="#0077B6" style={styles.sightingsLoading} />
            ) : sightings.length === 0 ? (
              <View style={styles.noSightingsContainer}>
                <Text style={styles.noSightingsText}>
                  You haven't recorded any sightings of this creature yet.
                </Text>
                <TouchableOpacity 
                  style={styles.addFirstSightingButton}
                  onPress={navigateToAddSighting}
                >
                  <Text style={styles.addFirstSightingText}>Record Your First Sighting</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sightings.map((sighting) => (
                <View key={sighting.id} style={styles.sightingCard}>
                  {sighting.image_url ? (
                    <Image 
                      source={{ uri: sighting.image_url }} 
                      style={styles.sightingImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.sightingImagePlaceholder}>
                      <Camera size={30} color="#AAAAAA" />
                    </View>
                  )}
                  
                  <View style={styles.sightingInfo}>
                    <View style={styles.sightingHeader}>
                      <View style={styles.sightingMeta}>
                        <View style={styles.sightingMetaItem}>
                          <Calendar size={14} color="#0077B6" style={styles.sightingIcon} />
                          <Text style={styles.sightingDate}>{formatDate(sighting.date)}</Text>
                        </View>
                        <View style={styles.sightingMetaItem}>
                          <MapPin size={14} color="#0077B6" style={styles.sightingIcon} />
                          <Text style={styles.sightingLocation} numberOfLines={1}>{sighting.location}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.editButton}>
                        <Edit size={16} color="#0077B6" />
                      </TouchableOpacity>
                    </View>
                    
                    {sighting.notes && (
                      <Text style={styles.sightingNotes} numberOfLines={3}>{sighting.notes}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  errorText: {
    fontSize: 18,
    color: '#c62828',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  button: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 28,
  },
  favoriteButton: {
    padding: 5,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    paddingBottom: 20,
  },
  creatureImage: {
    width: '100%',
    height: 180,
  },
  fallbackEmoji: {
    fontSize: 120,
  },
  nameContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 20,
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#AAAAAA',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  tag: {
    backgroundColor: 'rgba(0, 119, 182, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#0077B6',
  },
  tagText: {
    color: '#0077B6',
    fontWeight: '600',
  },
  pointsTag: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsTagText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0077B6',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  tabContent: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#DDDDDD',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 15,
    width: '45%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077B6',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  infoSection: {
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 15,
    color: '#BBBBBB',
    lineHeight: 22,
  },
  // Sightings tab styles
  sightingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sightingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  addSightingButton: {
    flexDirection: 'row',
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addSightingText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  sightingsLoading: {
    marginTop: 20,
  },
  noSightingsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
  },
  noSightingsText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 15,
  },
  addFirstSightingButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstSightingText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sightingCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  sightingImage: {
    width: '100%',
    height: 150,
  },
  sightingImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sightingInfo: {
    padding: 15,
  },
  sightingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sightingMeta: {
    flex: 1,
  },
  sightingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sightingIcon: {
    marginRight: 5,
  },
  sightingDate: {
    fontSize: 14,
    color: '#DDDDDD',
  },
  sightingLocation: {
    fontSize: 14,
    color: '#DDDDDD',
    flex: 1,
  },
  editButton: {
    padding: 5,
  },
  sightingNotes: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 20,
  },
});
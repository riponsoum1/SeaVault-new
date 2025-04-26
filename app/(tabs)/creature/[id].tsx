import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Creature as CreatureType,
  Sighting as SightingType,
} from '../../../lib/types';
import {
  ChevronLeft,
  Heart,
  Plus,
  Camera,
  MapPin,
  Calendar,
  CreditCard as Edit,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { database } from '../../../database';
import { synchronize } from '../../../database/sync';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Creature } from '../../../database/models/Creature';
import { Sighting } from '../../../database/models/Sighting';

export default function CreatureDetailScreen() {
  const { id, category } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [creature, setCreature] = useState<CreatureType | null>(null);
  const [sightings, setSightings] = useState<SightingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sightingsLoading, setSightingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncTime, setSyncTime] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCreatureFromDatabase(),
        user && fetchSightingsFromDatabase(),
        user && checkIfFavorite(),
      ]);

      // Try to sync with server if online
      if (user) {
        try {
          const result = await synchronize(user.id);
          console.log('Sync result on refresh:', result);
          if (result.success) {
            // Reload data after sync
            await Promise.all([
              fetchCreatureFromDatabase(),
              fetchSightingsFromDatabase(),
              checkIfFavorite(),
            ]);

            // Update sync time
            const currentTime = Date.now();
            setSyncTime(new Date(currentTime).toLocaleString());
          }
        } catch (syncError) {
          console.error('Error syncing on refresh:', syncError);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, id]);

  useEffect(() => {
    // Load last sync time
    AsyncStorage.getItem('@last_sync_time').then((time) => {
      if (time) {
        const syncDate = new Date(parseInt(time));
        setSyncTime(syncDate.toLocaleString());
      }
    });

    fetchCreatureFromDatabase();
    if (user) {
      fetchSightingsFromDatabase();
      checkIfFavorite();
    }
  }, [id, user]);

  const fetchCreatureFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Creature ID is required');
      }

      // Try to get creature from WatermelonDB
      const creaturesCollection = database.get<Creature>('creatures');
      const dbCreatures = await creaturesCollection
        .query(Q.where('id', String(id)))
        .fetch();

      if (dbCreatures.length > 0) {
        const creature = dbCreatures[0];
        const formattedCreature = {
          id: creature.id,
          name: (creature as any).name,
          scientific_name: (creature as any).scientificName,
          description: (creature as any).description,
          image_url: (creature as any).imageUrl,
          category_id: (creature as any).categoryId,
          rarity: (creature as any).rarity,
          class: (creature as any).class,
          points: (creature as any).points || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Add default values for other fields that might be needed but not in our model
          length: 'Unknown',
          weight: 'Unknown',
          diet: 'Unknown',
          lifespan: 'Unknown',
          habitat: 'Unknown',
          conservation_status: 'Unknown',
        };
        setCreature(formattedCreature as unknown as CreatureType);
      } else {
        // Fallback to AsyncStorage
        const storedCreatures = await AsyncStorage.getItem('@creatures');
        if (storedCreatures) {
          const creatures = JSON.parse(storedCreatures) as CreatureType[];
          const foundCreature = creatures.find((c) => c.id === String(id));
          if (foundCreature) {
            setCreature(foundCreature);
          } else {
            // If not found in AsyncStorage, try Supabase
            await fetchCreatureFromSupabase();
          }
        } else {
          // If not in AsyncStorage, try Supabase
          await fetchCreatureFromSupabase();
        }
      }
    } catch (error: any) {
      console.error('Error fetching creature from database:', error);

      // Fallback to Supabase
      try {
        await fetchCreatureFromSupabase();
      } catch (supabaseError) {
        setError((error as Error).message || 'Failed to load creature');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatureFromSupabase = async () => {
    try {
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

      setCreature(data as CreatureType);

      // Store in AsyncStorage for offline use
      const storedCreatures = await AsyncStorage.getItem('@creatures');
      if (storedCreatures) {
        let creatures = JSON.parse(storedCreatures) as CreatureType[];
        // Update or add the creature
        const index = creatures.findIndex((c) => c.id === String(id));
        if (index >= 0) {
          creatures[index] = data as CreatureType;
        } else {
          creatures.push(data as CreatureType);
        }
        await AsyncStorage.setItem('@creatures', JSON.stringify(creatures));
      } else {
        await AsyncStorage.setItem('@creatures', JSON.stringify([data]));
      }
    } catch (error: any) {
      console.error('Error fetching creature from Supabase:', error);
      setError(error.message || 'Failed to load creature');
      throw error;
    }
  };

  const fetchSightingsFromDatabase = async () => {
    try {
      setSightingsLoading(true);

      if (!id || !user) return;

      // Try to get sightings from WatermelonDB
      const sightingsCollection = database.get<Sighting>('sightings');
      const dbSightings = await sightingsCollection
        .query(Q.where('user_id', user.id), Q.where('creature_id', String(id)))
        .fetch();

      if (dbSightings.length > 0) {
        const formattedSightings = dbSightings.map((s) => ({
          id: s.id,
          user_id: (s as any).userId,
          creature_id: (s as any).creatureId,
          dive_id: (s as any).diveId,
          date: new Date((s as any).sightedAt).toISOString(),
          location: (s as any).location || '',
          notes: (s as any).notes || '',
          image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        setSightings(formattedSightings as SightingType[]);
      } else {
        // Fallback to Supabase
        await fetchSightingsFromSupabase();
      }
    } catch (error) {
      console.error('Error fetching sightings from database:', error);

      // Fallback to Supabase
      try {
        await fetchSightingsFromSupabase();
      } catch (supabaseError) {
        console.error('Error fetching sightings from Supabase:', supabaseError);
      }
    } finally {
      setSightingsLoading(false);
    }
  };

  const fetchSightingsFromSupabase = async () => {
    try {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .eq('creature_id', id)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching sightings from Supabase:', error);
        return;
      }

      console.log('Fetched sightings from Supabase:', data);
      setSightings(data as SightingType[]);

      // Store sightings in local database
      storeSightingsInDatabase(data as SightingType[]);
    } catch (error) {
      console.error('Error in fetchSightingsFromSupabase:', error);
    }
  };

  const storeSightingsInDatabase = async (sightings: SightingType[]) => {
    if (!user || sightings.length === 0) return;

    try {
      const sightingsCollection = database.get<Sighting>('sightings');

      // Get existing sightings
      const existingSightings = await sightingsCollection
        .query(Q.where('user_id', user.id), Q.where('creature_id', String(id)))
        .fetch();

      const existingIds = new Set(existingSightings.map((s) => s.id));

      await database.write(async () => {
        for (const sighting of sightings) {
          try {
            if (!existingIds.has(sighting.id)) {
              await sightingsCollection.create((record) => {
                record._raw.id = sighting.id;

                const typedRecord = record as any;
                typedRecord.userId = sighting.user_id;
                typedRecord.creatureId = sighting.creature_id;
                typedRecord.sightedAt = new Date(sighting.date).getTime();
                if (sighting.location) typedRecord.location = sighting.location;
                if (sighting.notes) typedRecord.notes = sighting.notes;
                if ((sighting as any).dive_id) {
                  if ('diveId' in typedRecord) {
                    typedRecord.diveId = (sighting as any).dive_id;
                  }
                }
                typedRecord.isSynced = true;
              });
              console.log(`Created sighting: ${sighting.id}`);
            } else {
              // Update existing sighting
              const existingSighting = existingSightings.find(
                (s) => s.id === sighting.id
              );
              if (existingSighting) {
                await existingSighting.update((s) => {
                  const typedRecord = s as any;
                  typedRecord.sightedAt = new Date(sighting.date).getTime();
                  if (sighting.location)
                    typedRecord.location = sighting.location;
                  if (sighting.notes) typedRecord.notes = sighting.notes;
                  if ((sighting as any).dive_id) {
                    if ('diveId' in typedRecord) {
                      typedRecord.diveId = (sighting as any).dive_id;
                    }
                  }
                  typedRecord.isSynced = true;
                });
                console.log(`Updated sighting: ${sighting.id}`);
              }
            }
          } catch (error) {
            console.error(`Error storing sighting ${sighting.id}:`, error);
          }
        }
      });
    } catch (error) {
      console.error('Error storing sightings in database:', error);
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

      // Store favorite status in AsyncStorage
      await storeFavoriteStatus(!!data);
    } catch (error) {
      console.error('Error in checkIfFavorite:', error);

      // Try to get from AsyncStorage
      try {
        const favoriteStatus = await getFavoriteStatus();
        if (favoriteStatus !== null) {
          setIsFavorite(favoriteStatus);
        }
      } catch (storageError) {
        console.error(
          'Error getting favorite status from storage:',
          storageError
        );
      }
    }
  };

  const storeFavoriteStatus = async (isFavorite: boolean) => {
    if (!user || !id) return;

    try {
      const key = `@favorite_${user.id}_${id}`;
      await AsyncStorage.setItem(key, isFavorite ? 'true' : 'false');
    } catch (error) {
      console.error('Error storing favorite status:', error);
    }
  };

  const getFavoriteStatus = async (): Promise<boolean | null> => {
    if (!user || !id) return null;

    try {
      const key = `@favorite_${user.id}_${id}`;
      const value = await AsyncStorage.getItem(key);
      return value === 'true';
    } catch (error) {
      console.error('Error getting favorite status:', error);
      return null;
    }
  };

  const toggleFavorite = async () => {
    if (!user || !creature) {
      Alert.alert('Sign In Required', 'Please sign in to add to favorites.');
      return;
    }

    try {
      // Toggle favorite status locally first for immediate feedback
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      await storeFavoriteStatus(newStatus);

      // Then try to update on server
      if (newStatus) {
        // Add to favorites
        const { error } = await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, creature_id: creature.id }]);

        if (error) throw error;
      } else {
        // Remove from favorites
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('creature_id', creature.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert(
        'Error',
        'Failed to update favorites. The change will be synced when you are online.'
      );
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

  // Get color based on creature class
  const getClassColor = (creatureClass?: string) => {
    if (!creatureClass) return '#0077B6';

    switch (creatureClass.toLowerCase()) {
      case 'common':
        return '#4CAF50'; // Green
      case 'uncommon':
        return '#2196F3'; // Blue
      case 'rare':
        return '#9C27B0'; // Purple
      case 'epic':
        return '#FF9800'; // Orange
      case 'legendary':
        return '#F44336'; // Red
      case 'mythical':
        return '#E91E63'; // Pink
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
        params: { creatureId: creature.id, creatureName: creature.name },
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (category) {
                  router.replace({
                    pathname: '/(tabs)/creatures',
                    params: { category },
                  });
                } else {
                  router.back();
                }
              }}
              style={[styles.backButton, { marginLeft: 10 }]}
            >
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={[styles.favoriteButton, { marginRight: 10 }]}
              onPress={toggleFavorite}
            >
              <Heart
                color="white"
                fill={isFavorite ? 'white' : 'none'}
                size={24}
              />
            </TouchableOpacity>
          ),
          headerTitle: '',
        }}
      />

      {/* Header with image */}
      <View style={styles.imageSection}>
        {creature.image_url ? (
          <Image
            source={{ uri: creature.image_url }}
            style={styles.creatureImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.fallbackContainer,
              { backgroundColor: getBackgroundColor(creature.category_id) },
            ]}
          >
            <Text style={styles.fallbackEmoji}>
              {getEmojiForCreature(creature.category_id)}
            </Text>
          </View>
        )}

        {syncTime && (
          <View style={styles.syncTimeContainer}>
            <Text style={styles.syncTimeText}>Last sync: {syncTime}</Text>
          </View>
        )}
      </View>

      {/* Creature name and info */}
      <View style={styles.nameContainer}>
        <Text style={styles.name}>{creature.name}</Text>
        <Text style={styles.scientificName}>{creature.scientific_name}</Text>

        <View style={styles.tagContainer}>
          <View
            style={[
              styles.tag,
              { backgroundColor: getClassColor(creature.class) },
            ]}
          >
            <Text style={styles.tagText}>{creature.class}</Text>
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
          <Text
            style={[
              styles.tabText,
              activeTab === 'about' && styles.activeTabText,
            ]}
          >
            About
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sightings' && styles.activeTab]}
          onPress={() => setActiveTab('sightings')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'sightings' && styles.activeTabText,
            ]}
          >
            Sightings
          </Text>
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
              <ActivityIndicator
                size="small"
                color="#0077B6"
                style={styles.sightingsLoading}
              />
            ) : sightings.length === 0 ? (
              <View style={styles.noSightingsContainer}>
                <Text style={styles.noSightingsText}>
                  You haven't recorded any sightings of this creature yet.
                </Text>
                <TouchableOpacity
                  style={styles.addFirstSightingButton}
                  onPress={navigateToAddSighting}
                >
                  <Text style={styles.addFirstSightingText}>
                    Record Your First Sighting
                  </Text>
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
                          <Calendar
                            size={14}
                            color="#0077B6"
                            style={styles.sightingIcon}
                          />
                          <Text style={styles.sightingDate}>
                            {formatDate(sighting.date)}
                          </Text>
                        </View>
                        <View style={styles.sightingMetaItem}>
                          <MapPin
                            size={14}
                            color="#0077B6"
                            style={styles.sightingIcon}
                          />
                          <Text
                            style={styles.sightingLocation}
                            numberOfLines={1}
                          >
                            {sighting.location}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.editButton}>
                        <Edit size={16} color="#0077B6" />
                      </TouchableOpacity>
                    </View>

                    {sighting.notes && (
                      <Text style={styles.sightingNotes} numberOfLines={3}>
                        {sighting.notes}
                      </Text>
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
  imageSection: {
    height: 350,
    width: '100%',
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  favoriteButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    zIndex: 1,
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
    borderColor: 'white',
  },
  tagText: {
    color: 'white',
    fontWeight: '600',
  },
  pointsTag: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
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
  syncTimeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 5,
  },
  syncTimeText: {
    color: 'white',
    fontSize: 12,
  },
});

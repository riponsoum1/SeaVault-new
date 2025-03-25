import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Creature, Sighting } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';
import { ChevronLeft, Camera, Calendar, MapPin } from 'lucide-react-native';

type SightingWithCreature = Sighting & {
  creature: Creature;
};

export default function SightingsScreen() {
  const [sightings, setSightings] = useState<SightingWithCreature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSightings();
    } else {
      router.replace('/auth/login');
    }
  }, [user]);

  const fetchSightings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get all sightings for the user
      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
        
      if (sightingsError) throw sightingsError;
      
      if (sightingsData.length === 0) {
        setSightings([]);
        return;
      }
      
      // Get all creature IDs from the sightings
      const creatureIds = [...new Set(sightingsData.map(s => s.creature_id))];
      
      // Fetch creature details for those IDs
      const { data: creaturesData, error: creaturesError } = await supabase
        .from('creatures')
        .select('*')
        .in('id', creatureIds);
        
      if (creaturesError) throw creaturesError;
      
      // Create a map of creature IDs to creature objects for quick lookup
      const creaturesMap = new Map<string, Creature>();
      creaturesData.forEach(creature => {
        creaturesMap.set(creature.id, creature as Creature);
      });
      
      // Combine sightings with their creature data
      const sightingsWithCreatures = sightingsData.map(sighting => ({
        ...sighting,
        creature: creaturesMap.get(sighting.creature_id) as Creature
      }));
      
      setSightings(sightingsWithCreatures as SightingWithCreature[]);
    } catch (error: any) {
      console.error('Error fetching sightings:', error);
      setError(error.message || 'Failed to load sightings');
    } finally {
      setLoading(false);
    }
  };

  const navigateToCreatureDetail = (creatureId: string) => {
    router.push(`/creature/${creatureId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get background color based on category
  const getBackgroundColor = (categoryId: string) => {
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

  const renderSightingItem = ({ item }: { item: SightingWithCreature }) => (
    <View style={styles.sightingCard}>
      <TouchableOpacity
        style={styles.creatureSection}
        onPress={() => navigateToCreatureDetail(item.creature_id)}
      >
        <View 
          style={[
            styles.imageContainer, 
            { backgroundColor: getBackgroundColor(item.creature.category_id) }
          ]}
        >
          {item.creature.image_url ? (
            <Image 
              source={{ uri: item.creature.image_url }} 
              style={styles.creatureImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emoji}>🐋</Text>
          )}
        </View>
        <View style={styles.creatureInfo}>
          <Text style={styles.creatureName}>{item.creature.name}</Text>
          <Text style={styles.scientificName}>{item.creature.scientific_name}</Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.sightingDetails}>
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.sightingImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.sightingImagePlaceholder}>
            <Camera size={30} color="#AAAAAA" />
          </View>
        )}
        
        <View style={styles.sightingInfo}>
          <View style={styles.sightingMetaItem}>
            <Calendar size={14} color="#0077B6" style={styles.sightingIcon} />
            <Text style={styles.sightingDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.sightingMetaItem}>
            <MapPin size={14} color="#0077B6" style={styles.sightingIcon} />
            <Text style={styles.sightingLocation} numberOfLines={1}>{item.location}</Text>
          </View>
          
          {item.notes && (
            <Text style={styles.sightingNotes} numberOfLines={2}>{item.notes}</Text>
          )}
        </View>
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
        <Text style={styles.headerTitle}>Your Sightings</Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sightings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't recorded any sightings yet</Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/creatures')}
          >
            <Text style={styles.exploreButtonText}>Explore Creatures</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sightings}
          renderItem={renderSightingItem}
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
    width: 34, // Same width as back button for centering
  },
  errorContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#AAAAAA',
    marginBottom: 20,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    padding: 15,
  },
  sightingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  creatureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  imageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 30,
  },
  creatureInfo: {
    marginLeft: 15,
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
  },
  sightingDetails: {
    padding: 15,
  },
  sightingImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  sightingImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sightingInfo: {
    marginTop: 5,
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
  },
  sightingNotes: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 5,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
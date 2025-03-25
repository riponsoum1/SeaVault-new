import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Creature } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';
import { ChevronLeft, Heart } from 'lucide-react-native';

export default function WishlistScreen() {
  const [wishlistCreatures, setWishlistCreatures] = useState<Creature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWishlistCreatures();
    } else {
      router.replace('/auth/login');
    }
  }, [user]);

  const fetchWishlistCreatures = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // First get all wishlist items for the user
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('creature_id')
        .eq('user_id', user.id);

      if (wishlistError) {
        throw new Error(wishlistError.message);
      }

      if (wishlistData.length === 0) {
        setWishlistCreatures([]);
        setLoading(false);
        return;
      }

      // Extract creature IDs
      const creatureIds = wishlistData.map(item => item.creature_id);
      
      // Then fetch the creature details
      const { data: creaturesData, error: creaturesError } = await supabase
        .from('creatures')
        .select('*')
        .in('id', creatureIds);

      if (creaturesError) {
        throw new Error(creaturesError.message);
      }

      setWishlistCreatures(creaturesData as Creature[]);
    } catch (error: any) {
      console.error('Error fetching wishlist creatures:', error);
      setError(error.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (creatureId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('creature_id', creatureId);

      if (error) {
        throw new Error(error.message);
      }

      // Update the local state
      setWishlistCreatures(wishlistCreatures.filter(creature => creature.id !== creatureId));
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      setError(error.message || 'Failed to remove from wishlist');
    }
  };

  const navigateToCreatureDetail = (creatureId: string) => {
    router.push(`/creature/${creatureId}`);
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

  const renderCreatureItem = ({ item }: { item: Creature }) => (
    <TouchableOpacity
      style={styles.creatureItem}
      onPress={() => navigateToCreatureDetail(item.id)}
    >
      <View 
        style={[
          styles.imageContainer, 
          { backgroundColor: getBackgroundColor(item.category_id) }
        ]}
      >
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.creatureImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.fallbackEmoji}>🐋</Text>
        )}
      </View>
      <View style={styles.creatureInfo}>
        <View style={styles.textContainer}>
          <Text style={styles.creatureName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.scientificName} numberOfLines={1}>{item.scientific_name}</Text>
        </View>
        <View style={styles.actionContainer}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.points}</Text>
          </View>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => removeFromWishlist(item.id)}
          >
            <Heart size={20} color="#FF6B6B" fill="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Your Wishlist</Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWishlistCreatures}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && wishlistCreatures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>Add creatures to your wishlist to keep track of what you want to see</Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/creatures')}
          >
            <Text style={styles.exploreButtonText}>Explore Creatures</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistCreatures}
          renderItem={renderCreatureItem}
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
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 15,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  creatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  fallbackEmoji: {
    fontSize: 40,
  },
  creatureInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
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
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    backgroundColor: '#0077B6',
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 10,
  },
  pointsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#2A2A2A',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
});
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Category, Creature } from '../../lib/types';
import { router } from 'expo-router';
import { Search, Filter, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function CreaturesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [sightedCreatures, setSightedCreatures] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Creature[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    initialLoad();
  }, [user]);

  const initialLoad = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchCreatures(),
        user && fetchSightedCreatures()
      ]);
    } catch (error) {
      console.error('Error in initial load:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchCreatures(),
        user && fetchSightedCreatures()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setCategories(data as Category[]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCreatures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('creatures')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setCreatures(data as Creature[]);
    } catch (error) {
      console.error('Error fetching creatures:', error);
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

      if (error) {
        throw error;
      }

      // Extract unique creature IDs from sightings
      const sightedIds = [...new Set(data.map(sighting => sighting.creature_id))];
      setSightedCreatures(sightedIds);
    } catch (error) {
      console.error('Error fetching sighted creatures:', error);
    }
  };

  // Get emoji based on category
  const getEmojiForCategory = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'sharks':
        return '🦈';
      case 'turtles':
        return '🐢';
      case 'reef fish':
        return '🐠';
      case 'cephalopods':
        return '🦑';
      case 'rays':
        return '🐡';
      case 'mammals':
        return '🐬';
      case 'deep-sea creatures':
        return '👀';
      case 'eels & sea snakes':
        return '🐍';
      case 'invertebrates':
        return '🦀';
      case 'jellyfish & soft-bodied':
        return '🌊';
      case 'pelagic fish':
        return '🎣';
      case 'rays & skates':
        return '🌊';
      case 'turtles & reptiles':
        return '🐢';
      default:
        return '🐋';
    }
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

  const filteredCreatures = selectedCategory
    ? creatures.filter(creature => creature.category_id === selectedCategory)
    : creatures;

  const navigateToCreatureDetail = (creatureId: string) => {
    router.push(`/creature/${creatureId}`);
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowCategories(false);
  };

  // Check if a creature has been sighted
  const hasBeenSighted = (creatureId: string) => {
    return sightedCreatures.includes(creatureId);
  };

  // Count sighted creatures in a category
  const countSightedInCategory = (categoryId: string) => {
    return creatures
      .filter(c => c.category_id === categoryId)
      .filter(c => hasBeenSighted(c.id))
      .length;
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setShowCategories(true);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const filtered = creatures.filter(creature => 
      creature.name.toLowerCase().includes(text.toLowerCase()) ||
      creature.scientific_name.toLowerCase().includes(text.toLowerCase())
    );
    
    setSearchResults(filtered);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    // Count creatures in this category
    const creatureCount = creatures.filter(c => c.category_id === item.id).length;
    const sightedCount = countSightedInCategory(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.categoryCard}
        onPress={() => selectCategory(item.id)}
      >
        <Text style={styles.categoryEmoji}>{getEmojiForCategory(item.name)}</Text>
        <Text style={styles.categoryTitle}>{item.name}</Text>
        <Text style={styles.categoryProgress}>{sightedCount}/{creatureCount}</Text>
      </TouchableOpacity>
    );
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
          <Text style={styles.fallbackEmoji}>
            {getEmojiForCategory(categories.find(c => c.id === item.category_id)?.name || '')}
          </Text>
        )}
        {hasBeenSighted(item.id) && (
          <View style={styles.sightedBadge}>
            <CheckCircle size={16} color="white" fill="#0077B6" />
          </View>
        )}
      </View>
      <View style={styles.creatureInfo}>
        <View style={styles.textContainer}>
          <Text style={styles.creatureName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.scientificName} numberOfLines={1}>{item.scientific_name}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.points}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>DiveDex</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={toggleSearch}
        >
          {isSearchActive ? 
            <Filter size={20} color="#0077B6" /> :
            <Search size={20} color="#0077B6" />
          }
        </TouchableOpacity>
      </View>
      
      {isSearchActive ? (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#777777" style={styles.searchInputIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search creatures..."
              placeholderTextColor="#777777"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <X size={18} color="#777777" />
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={searchResults}
            renderItem={renderCreatureItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.searchResultsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery.trim() !== '' ? (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No creatures found matching "{searchQuery}"</Text>
                </View>
              ) : (
                <View style={styles.searchPromptContainer}>
                  <Text style={styles.searchPromptText}>Search for creatures by name or scientific name</Text>
                </View>
              )
            }
          />
        </View>
      ) : showCategories ? (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.categoriesGrid}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0077B6"
              colors={['#0077B6']}
              progressBackgroundColor="#2A2A2A"
            />
          }
        />
      ) : (
        <>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderText}>
              {categories.find(c => c.id === selectedCategory)?.name || 'All Creatures'}
            </Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowCategories(true)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filteredCreatures}
            renderItem={renderCreatureItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0077B6"
                colors={['#0077B6']}
                progressBackgroundColor="#2A2A2A"
              />
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInputIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  searchResultsList: {
    paddingBottom: 20,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#AAAAAA',
    fontSize: 16,
    textAlign: 'center',
  },
  searchPromptContainer: {
    padding: 20,
    alignItems: 'center',
  },
  searchPromptText: {
    color: '#777777',
    fontSize: 16,
    textAlign: 'center',
  },
  categoriesGrid: {
    padding: 10,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    margin: 8,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  categoryProgress: {
    fontSize: 14,
    color: '#8B5CF6', // Purple color for progress
    fontWeight: '500',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0077B6',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '500',
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
    overflow: 'hidden',
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  fallbackEmoji: {
    fontSize: 40,
  },
  sightedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
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
  pointsBadge: {
    backgroundColor: '#0077B6',
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pointsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
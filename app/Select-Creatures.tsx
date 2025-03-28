import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Creature, Category } from '../lib/types';
import { CheckCircle, Search, X } from 'lucide-react-native';
import { DiveLogContext } from '../context/DiveLogContext'; // <- Make sure this exists and is imported

export default function SelectCreaturesScreen() {
  const router = useRouter();
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCreatures, setSelectedCreatures] = useState<Creature[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { setSelectedCreatures: setContextCreatures } = useContext(DiveLogContext)!;

  useEffect(() => {
    fetchCategories();
    fetchCreatures();
  }, []);

  const fetchCreatures = async () => {
    const { data, error } = await supabase.from('creatures').select('*').order('name');
    if (!error && data) setCreatures(data);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) setCategories(data);
  };

  const toggleCreature = (creature: Creature) => {
    setSelectedCreatures((prev) =>
      prev.find((c) => c.id === creature.id)
        ? prev.filter((c) => c.id !== creature.id)
        : [...prev, creature]
    );
  };

  const filteredCreatures = creatures
    .filter((c) => (selectedCategory ? c.category_id === selectedCategory.id : true))
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.scientific_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  const confirmAndGoBack = () => {
    // Convert selected creatures to include required imageUri property
    const creaturesWithImageUri = selectedCreatures.map(creature => ({
      ...creature,
      imageUri: null // Use null instead of undefined to match Creature type
    }));
    setContextCreatures(creaturesWithImageUri);
    router.back();
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const count = creatures.filter((c) => c.category_id === item.id).length;
    const selected = selectedCreatures.filter((c) => c.category_id === item.id).length;

    return (
      <TouchableOpacity style={styles.categoryCard} onPress={() => setSelectedCategory(item)}>
        <Image source={{ uri: item.image_url || undefined }} style={styles.categoryImage} />
        <View style={styles.categoryOverlay}>
          <Text style={styles.categoryTitle}>{item.name}</Text>
          <View style={styles.categoryProgress}>
            <Text style={styles.categoryProgressText}>
              {selected}/{count}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreature = ({ item }: { item: Creature }) => {
    const isSelected = selectedCreatures.some((c) => c.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.creatureItem, isSelected && styles.selectedCard]}
        onPress={() => toggleCreature(item)}
      >
        <Image source={{ uri: item.image_url || undefined }} style={styles.creatureImage} />
        <View style={styles.creatureInfo}>
          <Text style={styles.creatureName}>{item.name}</Text>
          <Text style={styles.creatureSub}>{item.scientific_name}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedCheck}>
            <CheckCircle size={20} color="white" fill="#0077B6" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Search size={18} color="#aaa" />
        <TextInput
          style={styles.search}
          placeholder="Search creatures..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {selectedCreatures.length > 0 && (
        <View style={styles.selectionPreview}>
          <Text style={styles.selectionText}>Selected: {selectedCreatures.length}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCreatures.map((c) => (
              <Image key={c.id} source={{ uri: c.image_url || undefined }} style={styles.thumbnail} />
            ))}
          </ScrollView>
        </View>
      )}

      {selectedCategory ? (
        <>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>{selectedCategory.name}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredCreatures}
            renderItem={renderCreature}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.creatureList}
          />
        </>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.categoryGrid}
        />
      )}

      {selectedCreatures.length > 0 && (
        <TouchableOpacity style={styles.confirmButton} onPress={confirmAndGoBack}>
          <Text style={styles.confirmText}>Confirm Selection</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 50 },
  searchWrapper: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    gap: 8,
  },
  search: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  selectionPreview: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectionText: {
    color: 'white',
    marginBottom: 6,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryGrid: {
    padding: 10,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    margin: 8,
    borderRadius: 16,
    minHeight: 160,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    padding: 12,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  categoryTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  categoryProgress: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryProgressText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  categoryName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0077B6',
    borderRadius: 8,
  },
  backText: {
    color: 'white',
    fontWeight: '500',
  },
  creatureList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  creatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#0077B6',
    borderWidth: 2,
  },
  creatureImage: {
    width: 70,
    height: 70,
  },
  creatureInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  creatureName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  creatureSub: {
    color: '#AAA',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  confirmButton: {
    backgroundColor: '#0077B6',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  confirmText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
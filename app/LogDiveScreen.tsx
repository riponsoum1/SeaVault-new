import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Plus,
  Camera,
  X,
  MapPin,
  Search,
} from 'lucide-react-native';
import { useDiveLog } from '../context/DiveLogContext';
import { Creature } from '@/lib/types';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIVE_TYPES = ['Shore', 'Boat', 'Wreck', 'Drift', 'Cave', 'Night', 'Deep'];

interface CreatureSighting extends Creature {
  imageUri?: string;
  notes?: string;
}

export default function LogDiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCreatures: initialCreatures, setSelectedCreatures } =
    useDiveLog();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [diveType, setDiveType] = useState('');
  const [depth, setDepth] = useState('');
  const [globalNotes, setGlobalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diveSites, setDiveSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiveTypePicker, setShowDiveTypePicker] = useState(false);
  const [creatureSightings, setCreatureSightings] = useState<
    CreatureSighting[]
  >([]);
  const [creatureImages, setCreatureImages] = useState<Record<string, string>>(
    {}
  );

  // Dive site state
  const [showDiveSiteModal, setShowDiveSiteModal] = useState(false);
  const [filteredDiveSites, setFilteredDiveSites] = useState<any[]>([]);
  const [selectedDiveSite, setSelectedDiveSite] = useState<any>(null);

  // For custom dive site
  const [isCustomDiveSite, setIsCustomDiveSite] = useState(false);
  const [customDiveSiteName, setCustomDiveSiteName] = useState('');
  const [customDiveSiteLocation, setCustomDiveSiteLocation] = useState('');

  useEffect(() => {
    fetchDiveSites();
  }, []);

  const fetchDiveSites = async () => {
    try {
      // Try to get dive sites from Supabase first
      const { data: supabaseDiveSites, error } = await supabase
        .from('dive_sites')
        .select('*');

      if (supabaseDiveSites && supabaseDiveSites.length > 0 && !error) {
        setDiveSites(supabaseDiveSites);
        setFilteredDiveSites(supabaseDiveSites);
      } else {
        // Fallback to AsyncStorage
        const storedDiveSites = await AsyncStorage.getItem('@dive_sites');
        if (storedDiveSites) {
          const parsedSites = JSON.parse(storedDiveSites);
          setDiveSites(parsedSites);
          setFilteredDiveSites(parsedSites);
        } else {
          // If no stored sites, create some default ones
          createDefaultDiveSites();
        }
      }
    } catch (error) {
      console.error('Error fetching dive sites:', error);
      createDefaultDiveSites();
    }
  };

  const createDefaultDiveSites = () => {
    const defaultDiveSites = [
      {
        id: '1',
        name: 'Great Blue Hole',
        location: 'Lighthouse Reef Atoll, Belize',
        type: 'blue hole',
      },
      {
        id: '2',
        name: 'Barracuda Point',
        location: 'Sipadan Island, Malaysia',
        type: 'wall',
      },
      {
        id: '3',
        name: 'SS Thistlegorm',
        location: 'Red Sea, Egypt',
        type: 'wreck',
      },
      {
        id: '4',
        name: 'Blue Corner Wall',
        location: 'Palau, Micronesia',
        type: 'wall',
      },
      {
        id: '5',
        name: 'Manta Ray Night Dive',
        location: 'Kailua Kona, Hawaii',
        type: 'night',
      },
    ];
    setDiveSites(defaultDiveSites);
    setFilteredDiveSites(defaultDiveSites);
    AsyncStorage.setItem('@dive_sites', JSON.stringify(defaultDiveSites));
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    if (text) {
      const filtered = diveSites.filter(
        (site) =>
          site.name.toLowerCase().includes(text.toLowerCase()) ||
          site.location.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDiveSites(filtered);
    } else {
      setFilteredDiveSites(diveSites);
    }
  };

  const selectDiveSite = (site: any) => {
    setSelectedDiveSite(site);
    setShowDiveSiteModal(false);
    setIsCustomDiveSite(false);
  };

  const addCustomDiveSite = () => {
    if (!customDiveSiteName || !customDiveSiteLocation) {
      Alert.alert(
        'Please enter both name and location for the custom dive site'
      );
      return;
    }

    const newSite = {
      id: `custom-${Date.now()}`,
      name: customDiveSiteName,
      location: customDiveSiteLocation,
      type: 'custom',
    };

    // Add to current list and select it
    const updatedSites = [...diveSites, newSite];
    setDiveSites(updatedSites);
    setFilteredDiveSites(updatedSites);
    setSelectedDiveSite(newSite);

    // Store for future use
    AsyncStorage.setItem('@dive_sites', JSON.stringify(updatedSites));

    // Clear form and close modal
    setCustomDiveSiteName('');
    setCustomDiveSiteLocation('');
    setIsCustomDiveSite(false);
    setShowDiveSiteModal(false);
  };

  const fetchCreatureImage = async (creatureId: string) => {
    const { data, error } = await supabase
      .from('creatures')
      .select('image_url')
      .eq('id', creatureId)
      .single();

    if (!error && data) {
      setCreatureImages((prev) => ({
        ...prev,
        [creatureId]: data.image_url,
      }));
    }
  };

  useEffect(() => {
    if (initialCreatures.length > 0) {
      const newSightings = initialCreatures.map(
        (creature) =>
          ({
            ...creature,
            creature_id: creature.id,
            notes: '',
            imageUri: undefined,
          } as CreatureSighting)
      );
      setCreatureSightings(newSightings);

      // Fetch images for all creatures
      initialCreatures.forEach((creature) => {
        fetchCreatureImage(creature.id);
      });
    }
  }, [initialCreatures]);

  const pickImage = async (creatureId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setCreatureSightings((prevSightings) =>
        prevSightings.map((creature) =>
          creature.id === creatureId
            ? { ...creature, imageUri: result.assets[0].uri }
            : creature
        )
      );
    }
  };

  const updateCreatureNotes = (creatureId: string, notes: string) => {
    setCreatureSightings((prevSightings) =>
      prevSightings.map((creature) =>
        creature.id === creatureId ? { ...creature, notes } : creature
      )
    );
  };

  const removeCreature = (creatureId: string) => {
    setCreatureSightings((prev) => prev.filter((c) => c.id !== creatureId));
  };

  const saveDive = async () => {
    if (!user) return Alert.alert('Login required');
    if (!selectedDiveSite) return setError('Please select a dive site');
    if (!date) return setError('Please enter a date');
    if (creatureSightings.length === 0)
      return setError('Please select at least one creature');

    try {
      setLoading(true);
      const formattedTime =
        timeOfDay && timeOfDay.length === 5
          ? `${timeOfDay}:00`
          : timeOfDay || '12:00:00';

      let successes = 0;
      let lastError = null;

      // For each creature, create a sighting entry
      for (const creature of creatureSightings) {
        try {
          // Try with the new schema first
          const newSchemaData = {
            user_id: user.id,
            creature_id: creature.id,
            dive_site_id: selectedDiveSite.id,
            dive_site_name: selectedDiveSite.name,
            dive_site_location: selectedDiveSite.location,
            dive_type: diveType || null,
            time_of_day: formattedTime,
            depth: depth ? Number(depth) : null,
            date,
            dive_notes: globalNotes || null,
            creature_notes: creature.notes || null,
            image_url: creature.imageUri || null,
            // Provide location for compatibility
            location: `${selectedDiveSite.name}, ${selectedDiveSite.location}`,
          };

          const { error } = await supabase
            .from('sightings')
            .insert([newSchemaData]);

          if (error) {
            console.log('Error with new schema:', error);

            if (
              error.code === 'PGRST204' &&
              error.message.includes('creature_notes')
            ) {
              // Fall back to old schema if creature_notes column doesn't exist
              console.log('Falling back to old schema');
              // Combine notes into a single field
              const combinedNotes = `${
                globalNotes ? globalNotes + '\n\n' : ''
              }${creature.notes || ''}`;

              const oldSchemaData = {
                user_id: user.id,
                creature_id: creature.id,
                location: `${selectedDiveSite.name}, ${selectedDiveSite.location}`,
                date,
                notes: combinedNotes,
                image_url: creature.imageUri || null,
              };

              const { error: oldError } = await supabase
                .from('sightings')
                .insert([oldSchemaData]);
              if (oldError) {
                console.log('Error with old schema:', oldError);
                lastError = oldError;
                // Continue to try with next creature
                continue;
              }
            } else if (
              error.code === 'PGRST204' &&
              error.message.includes('dive_site_id')
            ) {
              // If dive_site_id column doesn't exist
              console.log('Falling back to location-only schema');

              const locationSchemaData = {
                user_id: user.id,
                creature_id: creature.id,
                location: `${selectedDiveSite.name}, ${selectedDiveSite.location}`,
                date,
                notes: globalNotes || null,
                image_url: creature.imageUri || null,
              };

              const { error: locError } = await supabase
                .from('sightings')
                .insert([locationSchemaData]);
              if (locError) {
                console.log('Error with location schema:', locError);
                lastError = locError;
                // Continue to try with next creature
                continue;
              }
            } else {
              lastError = error;
              // Continue to try with next creature
              continue;
            }
          }

          // If we got here, the insert succeeded
          successes++;
        } catch (creatureError: any) {
          console.error('Error adding creature sighting:', creatureError);
          lastError = creatureError;
          // Continue to try with next creature
        }
      }

      if (successes > 0) {
        if (successes < creatureSightings.length) {
          Alert.alert(
            'Partial Success',
            `${successes} out of ${creatureSightings.length} creatures were logged successfully.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Alert.alert('Success', 'Dive logged successfully!');
          router.back();
        }
        setSelectedCreatures([]); // Clear the selected creatures
      } else {
        // No creatures were added successfully
        throw lastError || new Error('Failed to add any creatures');
      }
    } catch (e: any) {
      console.error('Final error:', e);
      let errorMessage = 'Failed to log dive';

      if (e?.message) {
        errorMessage = e.message;
      }

      if (e?.code === 'PGRST204') {
        errorMessage =
          'Database schema issue. Please update your database or contact support.';
      }

      if (
        e?.code === '42702' ||
        (e?.message && e?.message.includes('ambiguous'))
      ) {
        errorMessage =
          'Database trigger issue. The system needs to be updated to handle achievement tracking correctly.';
      }

      if (String(e).includes('Cannot read property')) {
        errorMessage =
          'There was a problem with the data format. Please try again or contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Dive</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {error && <Text style={styles.error}>{error}</Text>}

          {/* Dive Site Selector */}
          <Text style={styles.label}>Dive Site</Text>
          <TouchableOpacity
            style={styles.siteSelector}
            onPress={() => setShowDiveSiteModal(true)}
          >
            <MapPin size={20} color="#0077B6" style={styles.selectorIcon} />
            <Text style={styles.selectorText}>
              {selectedDiveSite ? selectedDiveSite.name : 'Select a dive site'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Dive Type</Text>
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => setShowDiveTypePicker(true)}
          >
            <Text style={styles.pickerText}>
              {diveType || 'Select dive type'}
            </Text>
            <View style={styles.pickerArrow}>
              <ChevronLeft
                size={20}
                color="white"
                style={{ transform: [{ rotate: '90deg' }] }}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Time of Day</Text>
          <TextInput
            style={styles.input}
            placeholder="12:00"
            value={timeOfDay}
            onChangeText={setTimeOfDay}
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Depth (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Depth in meters"
            keyboardType="numeric"
            value={depth}
            onChangeText={setDepth}
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Dive Notes (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            multiline
            placeholder="Notes about this dive..."
            value={globalNotes}
            onChangeText={setGlobalNotes}
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Creatures</Text>
          {creatureSightings.map((creature) => (
            <View key={creature.id} style={styles.creatureCard}>
              <View style={styles.creatureHeader}>
                <View style={styles.creatureInfo}>
                  <View style={styles.creatureNameRow}>
                    <View style={styles.creatureAvatar}>
                      <Image
                        source={{
                          uri:
                            creatureImages[creature.id] ||
                            'https://via.placeholder.com/50',
                        }}
                        style={styles.creatureAvatarImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.nameContainer}>
                      <Text style={styles.creatureName}>{creature.name}</Text>
                      <Text style={styles.scientificName}>
                        {creature.scientific_name}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeCreature(creature.id)}
                >
                  <X size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.imageSection}>
                {creature.imageUri ? (
                  <TouchableOpacity onPress={() => pickImage(creature.id)}>
                    <Image
                      source={{ uri: creature.imageUri }}
                      style={styles.creatureImage}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={() => pickImage(creature.id)}
                  >
                    <Camera size={24} color="#0077B6" />
                    <Text style={styles.addImageText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={[styles.input, styles.creatureNotes]}
                multiline
                placeholder={`Notes about this ${creature.name.toLowerCase()}...`}
                value={creature.notes}
                onChangeText={(text) => updateCreatureNotes(creature.id, text)}
                placeholderTextColor="#666"
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/Select-Creatures')}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Plus size={20} color="#0077B6" />
              <Text style={styles.addButtonText}>Add Creatures</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={saveDive}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Dive Log</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Dive Type Picker Modal */}
        <Modal
          visible={showDiveTypePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDiveTypePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Dive Type</Text>
                <TouchableOpacity onPress={() => setShowDiveTypePicker(false)}>
                  <Text style={styles.modalDoneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={diveType}
                onValueChange={(itemValue) => setDiveType(itemValue)}
                style={{ color: 'white' }}
                dropdownIconColor="white"
              >
                <Picker.Item label="Select dive type" value="" color="white" />
                {DIVE_TYPES.map((type) => (
                  <Picker.Item
                    key={type}
                    label={type}
                    value={type}
                    color="white"
                  />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>

        {/* Dive Site Selection Modal */}
        <Modal
          visible={showDiveSiteModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDiveSiteModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.siteModalContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Dive Site</Text>
                <TouchableOpacity
                  onPress={() => setShowDiveSiteModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#0077B6" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Search size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search dive sites..."
                  value={searchTerm}
                  onChangeText={handleSearch}
                  placeholderTextColor="#666"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <X size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {isCustomDiveSite ? (
                <View style={styles.customSiteForm}>
                  <Text style={styles.customFormTitle}>
                    Add Custom Dive Site
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dive Site Name"
                    value={customDiveSiteName}
                    onChangeText={setCustomDiveSiteName}
                    placeholderTextColor="#666"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Location (e.g. Bahamas, Caribbean)"
                    value={customDiveSiteLocation}
                    onChangeText={setCustomDiveSiteLocation}
                    placeholderTextColor="#666"
                  />
                  <View style={styles.customFormButtons}>
                    <TouchableOpacity
                      style={[styles.customFormButton, styles.cancelButton]}
                      onPress={() => setIsCustomDiveSite(false)}
                    >
                      <Text style={styles.customButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.customFormButton, styles.addButton]}
                      onPress={addCustomDiveSite}
                    >
                      <Text style={styles.customButtonText}>Add Site</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <FlatList
                    data={filteredDiveSites}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.siteItem}
                        onPress={() => selectDiveSite(item)}
                      >
                        <View style={styles.siteInfo}>
                          <Text style={styles.siteName}>{item.name}</Text>
                          <Text style={styles.siteLocation}>
                            {item.location}
                          </Text>
                          {item.type && (
                            <View style={styles.siteTypeTag}>
                              <Text style={styles.siteTypeText}>
                                {item.type}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noResultsText}>
                        No dive sites found
                      </Text>
                    }
                    style={styles.siteList}
                  />

                  <TouchableOpacity
                    style={styles.addCustomButton}
                    onPress={() => setIsCustomDiveSite(true)}
                  >
                    <Text style={styles.addCustomText}>
                      Add Custom Dive Site
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 8,
  },
  sublabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 8,
  },
  creatureCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  creatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  creatureInfo: {
    flex: 1,
  },
  creatureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatureAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  creatureAvatarImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    flex: 1,
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
  removeButton: {
    padding: 5,
  },
  imageSection: {
    marginBottom: 15,
  },
  creatureImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  addImageButton: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0077B6',
    borderStyle: 'dashed',
  },
  addImageText: {
    color: '#0077B6',
    marginTop: 8,
    fontSize: 14,
  },
  creatureNotes: {
    minHeight: 80,
    backgroundColor: '#2A2A2A',
  },
  pickerContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    color: 'white',
    fontSize: 16,
  },
  pickerArrow: {
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  modalDoneButton: {
    color: '#0077B6',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  addButtonText: {
    color: '#0077B6',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#0077B6',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#3A3A3A',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  selectorIcon: {
    marginRight: 10,
  },
  selectorText: {
    color: '#CCC',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  siteList: {
    flex: 1,
    marginBottom: 15,
  },
  siteItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  siteLocation: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  siteTypeTag: {
    backgroundColor: '#0077B6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  siteTypeText: {
    color: 'white',
    fontSize: 12,
  },
  noResultsText: {
    color: '#AAAAAA',
    textAlign: 'center',
    padding: 20,
  },
  addCustomButton: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  addCustomText: {
    color: 'white',
    fontWeight: 'bold',
  },
  customSiteForm: {
    flex: 1,
  },
  customFormTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  customFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  customFormButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444444',
    marginRight: 10,
  },
  customButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  siteModalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
});

import React, { useState, useEffect } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, uploadSightingImage } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { checkAndUpdateAchievements } from '../../lib/achievements';
import {
  ChevronLeft,
  Camera,
  Calendar,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';
import { database } from '../../database';
import { DiveSite } from '../../database/models/DiveSite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';

const DIVE_TYPES = ['Shore', 'Boat', 'Wreck', 'Drift', 'Cave', 'Night', 'Deep'];

export default function AddSightingScreen() {
  const { creatureId, creatureName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creature_notes, setCreatureNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiveTypePicker, setShowDiveTypePicker] = useState(false);
  const [showDiveSiteModal, setShowDiveSiteModal] = useState(false);

  const [diveSites, setDiveSites] = useState<any[]>([]);
  const [filteredDiveSites, setFilteredDiveSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiveSite, setSelectedDiveSite] = useState<any>(null);

  const [diveType, setDiveType] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [depth, setDepth] = useState('');

  // For custom dive site
  const [isCustomDiveSite, setIsCustomDiveSite] = useState(false);
  const [customDiveSiteName, setCustomDiveSiteName] = useState('');
  const [customDiveSiteLocation, setCustomDiveSiteLocation] = useState('');

  useEffect(() => {
    fetchDiveSites();
  }, []);

  const fetchDiveSites = async () => {
    try {
      // Try to get dive sites from WatermelonDB
      const diveSitesCollection = database.get<DiveSite>('dive_sites');
      const dbDiveSites = await diveSitesCollection.query().fetch();

      if (dbDiveSites.length > 0) {
        const formattedDiveSites = dbDiveSites.map((site) => ({
          id: site.id,
          name: (site as any).name,
          location: (site as any).location,
          country: (site as any).country,
          region: (site as any).region,
          description: (site as any).description,
          depth: (site as any).depth,
          type: (site as any).type,
        }));
        setDiveSites(formattedDiveSites);
        setFilteredDiveSites(formattedDiveSites);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const saveSighting = async () => {
    if (!user) return Alert.alert('Login required');
    if (!selectedDiveSite) return setError('Please select a dive site');
    if (!date) return setError('Please enter a date');

    try {
      setLoading(true);
      let imageUrl = imageUri ? await uploadImage(imageUri) : null;

      const formattedTime =
        timeOfDay && timeOfDay.length === 5
          ? `${timeOfDay}:00`
          : timeOfDay || '12:00:00';

      // First save offline
      await saveSightingOffline({
        id: `local-${Date.now()}`,
        user_id: user.id,
        creature_id: creatureId as string,
        dive_site_id: selectedDiveSite.id,
        dive_site_name: selectedDiveSite.name,
        dive_site_location: selectedDiveSite.location,
        dive_type: diveType || null,
        time_of_day: formattedTime,
        depth: depth ? Number(depth) : null,
        date,
        notes: creature_notes,
        image_url: imageUri, // Store local URI for now
        is_synced: false,
        created_at: new Date().getTime(),
        updated_at: new Date().getTime(),
      });

      // Try to save online if possible
      try {
        const { error } = await supabase.from('sightings').insert([
          {
            user_id: user.id,
            creature_id: creatureId,
            dive_site_id: selectedDiveSite.id,
            dive_site_name: selectedDiveSite.name,
            dive_site_location: selectedDiveSite.location,
            dive_type: diveType || null,
            time_of_day: formattedTime,
            depth: depth ? Number(depth) : null,
            date,
            notes: creature_notes,
            image_url: imageUrl,
          },
        ]);

        if (error) throw error;

        // If successful, update the local record as synced
        try {
          await database.write(async () => {
            const sightingsCollection = database.get('sightings');
            const sightings = await sightingsCollection
              .query(
                Q.where('user_id', user.id),
                Q.where('creature_id', creatureId as string)
              )
              .fetch();

            if (sightings.length > 0) {
              const lastSighting = sightings[sightings.length - 1];
              await lastSighting.update((record: any) => {
                record.isSynced = true;
                if (imageUrl) record.imageUrl = imageUrl;
              });
            }
          });
        } catch (dbError) {
          console.error('Failed to update sync status:', dbError);
        }

        await checkAndUpdateAchievements(user.id);
      } catch (onlineError) {
        console.error('Failed to save sighting online:', onlineError);
        // Continue anyway since we've saved offline
      }

      Alert.alert('Success', 'Sighting saved!');
      router.back();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save sighting');
    } finally {
      setLoading(false);
    }
  };

  const saveSightingOffline = async (sighting: any) => {
    try {
      // Save to WatermelonDB
      const sightingsCollection = database.get('sightings');

      await database.write(async () => {
        await sightingsCollection.create((record) => {
          record._raw.id = sighting.id;

          const typedRecord = record as any;
          typedRecord.userId = sighting.user_id;
          typedRecord.creatureId = sighting.creature_id;
          typedRecord.location = `${sighting.dive_site_name}, ${sighting.dive_site_location}`;
          typedRecord.notes = sighting.notes;
          typedRecord.sightedAt = new Date(sighting.date).getTime();
          typedRecord.isSynced = sighting.is_synced;
        });
      });

      console.log('Sighting saved offline in WatermelonDB');
    } catch (dbError) {
      console.error('Error saving to WatermelonDB:', dbError);

      // Fallback to AsyncStorage
      try {
        const storedSightings = await AsyncStorage.getItem('@sightings');
        const sightings = storedSightings ? JSON.parse(storedSightings) : [];
        sightings.push(sighting);
        await AsyncStorage.setItem('@sightings', JSON.stringify(sightings));
        console.log('Sighting saved offline in AsyncStorage');
      } catch (storageError) {
        console.error('Failed to save sighting in AsyncStorage:', storageError);
        throw storageError;
      }
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return null;
    try {
      return await uploadSightingImage(uri, user.id);
    } catch (error) {
      console.error('Error uploading sighting image:', error);
      Alert.alert(
        'Error',
        'Failed to upload image, but sighting will still be saved.'
      );
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Sighting</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.creatureName}>{creatureName}</Text>

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

        {/* Dive Type */}
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

        {/* Time of Day */}
        <Text style={styles.label}>Time of Day</Text>
        <TextInput
          style={styles.input}
          placeholder="12:00"
          value={timeOfDay}
          onChangeText={setTimeOfDay}
          placeholderTextColor="#666"
        />

        {/* Depth */}
        <Text style={styles.label}>Depth (optional)</Text>
        <TextInput
          value={depth}
          onChangeText={setDepth}
          placeholder="Enter depth in meters"
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#666"
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={creature_notes}
          onChangeText={setCreatureNotes}
          placeholder="Add notes about your sighting..."
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#666"
        />

        {/* Image Upload */}
        <Text style={styles.label}>Photo</Text>
        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imageUploadPlaceholder}>
              <Camera size={24} color="#0077B6" />
              <Text style={styles.imageUploadText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
          <Camera size={20} color="white" />
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={saveSighting}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Sighting</Text>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dive Site</Text>
              <TouchableOpacity onPress={() => setShowDiveSiteModal(false)}>
                <Text style={styles.modalDoneButton}>Done</Text>
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
                <Text style={styles.customFormTitle}>Add Custom Dive Site</Text>
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
                        <Text style={styles.siteLocation}>{item.location}</Text>
                        {item.type && (
                          <View style={styles.siteTypeTag}>
                            <Text style={styles.siteTypeText}>{item.type}</Text>
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
                  <Text style={styles.addCustomText}>Add Custom Dive Site</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  creatureName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: '#FF4E4E',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    color: 'white',
    marginBottom: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
  imageUploadButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  imageUploadPlaceholder: {
    alignItems: 'center',
  },
  imageUploadText: {
    color: '#0077B6',
    marginTop: 10,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraButton: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 20,
  },
  cameraButtonText: {
    color: 'white',
    marginLeft: 10,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
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
    padding: 20,
    height: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalDoneButton: {
    color: '#0077B6',
    fontWeight: 'bold',
  },
  siteModalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '80%',
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
  addButton: {
    backgroundColor: '#0077B6',
  },
  customButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

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
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Plus, Camera, X } from 'lucide-react-native';
import { useDiveLog } from '../context/DiveLogContext';
import { Creature } from '@/lib/types';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DiveSiteSelector from '../components/DiveSiteSelector';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';

// Define interface for dive site
interface DiveSite {
  id: string;
  name: string;
  location: string;
  type?: string;
}

// Define interfaces for dive details
interface DiveDetails {
  date: string;
  timeOfDay: string;
  diveType: string | null;
  depth: number | null;
  globalNotes: string | null;
}

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
  const [showDiveTypePicker, setShowDiveTypePicker] = useState(false);
  const [creatureSightings, setCreatureSightings] = useState<
    CreatureSighting[]
  >([]);
  const [creatureImages, setCreatureImages] = useState<Record<string, string>>(
    {}
  );
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Dive site state
  const [selectedDiveSite, setSelectedDiveSite] = useState<DiveSite | null>(
    null
  );

  // Custom fetch function for dive sites from Supabase
  const fetchDiveSites = async (): Promise<DiveSite[]> => {
    try {
      const { data: supabaseDiveSites, error } = await supabase
        .from('dive_sites')
        .select('*');

      if (supabaseDiveSites && supabaseDiveSites.length > 0 && !error) {
        return supabaseDiveSites;
      } else {
        // Fallback to AsyncStorage
        const storedDiveSites = await AsyncStorage.getItem('@dive_sites');
        if (storedDiveSites) {
          return JSON.parse(storedDiveSites);
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching dive sites:', error);
      return [];
    }
  };

  useEffect(() => {
    // Check network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

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

    return () => {
      unsubscribe();
    };
  }, [initialCreatures]);

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

  const saveDiveToLocalDB = async (
    creatureSighting: CreatureSighting,
    diveDetails: DiveDetails
  ) => {
    try {
      // Generate a unique ID
      const localId = `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Get the sightings collection from WatermelonDB
      const sightingsCollection = database.get('sightings');

      // Save to WatermelonDB
      await database.write(async () => {
        await sightingsCollection.create((record) => {
          // Set raw ID to ensure it's unique
          record._raw.id = localId;

          // Get available fields from the model schema
          const availableFields = Object.keys(record);

          // Helper to safely set fields
          const setField = (field: string, value: any) => {
            if (availableFields.includes(field)) {
              // Only set the field if it exists and is not a function
              const anyRecord = record as any;
              if (typeof anyRecord[field] !== 'function') {
                anyRecord[field] = value;
              }
            }
          };

          // User info
          setField('userId', user?.id || '');

          // Creature info
          setField('creatureId', creatureSighting.id);

          // Dive site info
          setField('diveSiteId', selectedDiveSite?.id || null);
          setField('diveSiteName', selectedDiveSite?.name || '');
          setField('diveSiteLocation', selectedDiveSite?.location || '');
          setField(
            'location',
            `${selectedDiveSite?.name || ''}, ${
              selectedDiveSite?.location || ''
            }`
          );

          // Dive details
          setField('diveType', diveDetails.diveType);
          setField('timeOfDay', diveDetails.timeOfDay);
          setField('depth', diveDetails.depth);
          setField('date', diveDetails.date);
          setField('sightedAt', new Date(diveDetails.date).getTime());

          // Notes and image
          setField('notes', creatureSighting.notes || null);
          setField('diveNotes', diveDetails.globalNotes);
          setField('imageUrl', creatureSighting.imageUri || null);

          // Sync status
          setField('isSynced', false);
        });
      });

      console.log(`Saved creature ${creatureSighting.name} to local database`);
      return localId;
    } catch (error) {
      console.error('Error saving to local database:', error);
      throw error;
    }
  };

  const syncWithServer = async (localId: string) => {
    if (!isConnected) return false;

    try {
      // Find the local record
      const sightingsCollection = database.get('sightings');
      const localRecord = await sightingsCollection.find(localId);

      if (!localRecord) {
        console.error('Could not find local record to sync');
        return false;
      }

      // Cast to access fields
      const record = localRecord as any;

      // Get user ID - ensure it's valid
      const userId =
        record.userId && record.userId.trim() ? record.userId : user?.id;
      if (!userId) {
        console.error('Missing user ID for sync, cannot proceed');
        return false;
      }

      // Try with the simplified schema first (less likely to have column issues)
      const simplifiedData: Record<string, any> = {
        user_id: userId,
        creature_id: record.creatureId,
        location:
          record.location ||
          `${record.diveSiteName || ''}, ${record.diveSiteLocation || ''}`,
        date: record.date,
        notes: record.notes,
        // Only include fields that have values
        ...(record.diveNotes ? { dive_notes: record.diveNotes } : {}),
        ...(record.diveType ? { dive_type: record.diveType } : {}),
        ...(record.depth ? { depth: Number(record.depth) } : {}),
        ...(record.imageUrl ? { image_url: record.imageUrl } : {}),
      };

      // Only add the dive_site_id if it's a valid UUID
      if (
        record.diveSiteId &&
        typeof record.diveSiteId === 'string' &&
        record.diveSiteId.length > 10 && // Simple validation - UUIDs are long
        record.diveSiteId.includes('-')
      ) {
        // UUIDs typically have hyphens
        simplifiedData['dive_site_id'] = record.diveSiteId;
      }

      console.log(
        'Attempting to sync with data:',
        JSON.stringify(simplifiedData)
      );

      const { error } = await supabase
        .from('sightings')
        .insert([simplifiedData]);

      if (error) {
        console.error('Error syncing with server:', error);
        return false;
      }

      // Update local record as synced safely
      await database.write(async () => {
        await localRecord.update((record) => {
          // Use the safer approach to only update fields that exist
          const availableFields = Object.keys(record);
          const anyRecord = record as any;

          if (availableFields.includes('isSynced')) {
            anyRecord.isSynced = true;
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Error in sync process:', error);
      return false;
    }
  };

  const scheduleSyncJob = async (localIds: string[]) => {
    try {
      // Get any existing sync jobs
      const existingJobs = await AsyncStorage.getItem('@sync_jobs');
      const syncJobs = existingJobs ? JSON.parse(existingJobs) : [];

      // Add new IDs to sync
      const updatedJobs = [...syncJobs, ...localIds];

      // Save back to storage
      await AsyncStorage.setItem('@sync_jobs', JSON.stringify(updatedJobs));

      console.log('Scheduled sync jobs for later:', localIds);
    } catch (error) {
      console.error('Error scheduling sync jobs:', error);
    }
  };

  const saveDive = async () => {
    if (!user) return Alert.alert('Login required');
    if (!selectedDiveSite) return setError('Please select a dive site');
    if (!date) return setError('Please enter a date');
    if (creatureSightings.length === 0)
      return setError('Please select at least one creature');

    try {
      setLoading(true);
      setError(null);

      const formattedTime =
        timeOfDay && timeOfDay.length === 5
          ? `${timeOfDay}:00`
          : timeOfDay || '12:00:00';

      const diveDetails: DiveDetails = {
        date,
        timeOfDay: formattedTime,
        diveType: diveType || null,
        depth: depth ? Number(depth) : null,
        globalNotes: globalNotes || null,
      };

      // Track successful saves and sync attempts
      let localSuccesses = 0;
      let syncSuccesses = 0;
      let localIds: string[] = [];

      // First, save all creatures to local database
      for (const creature of creatureSightings) {
        try {
          const localId = await saveDiveToLocalDB(creature, diveDetails);
          localIds.push(localId);
          localSuccesses++;
        } catch (error) {
          console.error('Error saving creature locally:', error);
        }
      }

      // If network available, try to sync with server
      if (isConnected) {
        for (const localId of localIds) {
          const success = await syncWithServer(localId);
          if (success) {
            syncSuccesses++;
          }
        }
      }

      // If not all records synced, schedule them for later
      if (syncSuccesses < localIds.length) {
        const unsynced = localIds.filter((_, index) => index >= syncSuccesses);
        await scheduleSyncJob(unsynced);
      }

      // Show appropriate message based on outcome
      if (localSuccesses === 0) {
        throw new Error('Failed to save any dive logs');
      } else if (isConnected && syncSuccesses === 0) {
        Alert.alert(
          'Saved Locally',
          `All ${localSuccesses} creatures were saved to your device but could not be uploaded to the server. They will sync automatically when connection is available.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (isConnected && syncSuccesses < localSuccesses) {
        Alert.alert(
          'Partial Sync',
          `All ${localSuccesses} creatures were saved locally, but only ${syncSuccesses} were synced with the server. The rest will sync when connection improves.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (isConnected && syncSuccesses === localSuccesses) {
        Alert.alert('Success', 'Dive log saved and synced successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          'Saved Offline',
          'Your dive log has been saved to your device and will sync when you have internet connection.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

      // Clear selected creatures
      setSelectedCreatures([]);
    } catch (e: any) {
      console.error('Final error:', e);
      setError(e.message || 'Failed to log dive');
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

        {isConnected === false && (
          <View style={styles.offlineBar}>
            <Text style={styles.offlineText}>
              You are offline. Dive logs will be saved locally.
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {error && <Text style={styles.error}>{error}</Text>}

          {/* Dive Site Selector */}
          <Text style={styles.label}>Dive Site</Text>
          <DiveSiteSelector
            selectedDiveSite={selectedDiveSite}
            onSelectDiveSite={setSelectedDiveSite}
            customFetchFunction={fetchDiveSites}
          />

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
              <Text style={styles.saveButtonText}>
                {isConnected ? 'Save Dive Log' : 'Save Offline'}
              </Text>
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
  offlineBar: {
    backgroundColor: '#FF4444',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

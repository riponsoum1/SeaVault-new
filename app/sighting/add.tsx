import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, uploadSightingImage } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { checkAndUpdateAchievements } from '../../lib/achievements';
import { ChevronLeft, Camera, Calendar, MapPin } from 'lucide-react-native';
import CustomMap from '../components/CustomMap';

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

  const [diveSites, setDiveSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiveSiteId, setSelectedDiveSiteId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);

  const [diveType, setDiveType] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [depth, setDepth] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 20,
        longitudeDelta: 20,
      });
    })();

    supabase.from('dive_sites').select('*').then(({ data }) => {
      if (data) setDiveSites(data);
    });
  }, []);

  const filteredDiveSites = diveSites.filter(site =>
    site.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const saveSighting = async () => {
    if (!user) return Alert.alert('Login required');
    if (!selectedDiveSiteId) return setError('Please select a dive site');
    if (!date) return setError('Please enter a date');

    try {
      setLoading(true);
      let imageUrl = imageUri ? await uploadImage(imageUri) : null;

      const formattedTime = timeOfDay && timeOfDay.length === 5
        ? `${timeOfDay}:00`
        : timeOfDay || '12:00:00';

      const { error } = await supabase.from('sightings').insert([{
        user_id: user.id,
        creature_id: creatureId,
        dive_site_id: selectedDiveSiteId,
        dive_type: diveType || null,
        time_of_day: formattedTime,
        depth: depth ? Number(depth) : null,
        date,
        creature_notes,
        image_url: imageUrl,
      }]);

      if (error) throw error;

      await checkAndUpdateAchievements(user.id);
      Alert.alert('Success', 'Sighting saved!');
      router.back();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save sighting');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return null;
    try {
      return await uploadSightingImage(uri, user.id);
    } catch (error) {
      console.error('Error uploading sighting image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Sighting</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.creatureName}>{creatureName}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Search Bar */}
        <TextInput
          placeholder="Search dive site..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.input}
          placeholderTextColor="#666"
        />

        {/* Map */}
        {mapRegion && (
          <CustomMap
            diveSites={filteredDiveSites}
            selectedDiveSiteId={selectedDiveSiteId}
            onDiveSiteSelect={setSelectedDiveSiteId}
            initialRegion={mapRegion}
          />
        )}

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
            <ChevronLeft size={20} color="white" style={{ transform: [{ rotate: '90deg' }] }} />
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

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveSighting}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Sighting</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
                <Picker.Item key={type} label={type} value={type} color="white" />
              ))}
            </Picker>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 30,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  creatureName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: 'white',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 8,
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
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0077B6',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  imageUploadPlaceholder: {
    alignItems: 'center',
  },
  imageUploadText: {
    color: '#0077B6',
    marginTop: 8,
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#0077B6',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#3A3A3A',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
});
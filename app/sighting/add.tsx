import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { checkAndUpdateAchievements } from '../../lib/achievements';
import { ChevronLeft, Camera, Calendar, MapPin } from 'lucide-react-native';
import CustomMap from '../components/CustomMap';

export default function AddSightingScreen() {
  const { creatureId, creatureName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { error } = await supabase.from('sightings').insert([{
        user_id: user.id,
        creature_id: creatureId,
        dive_site_id: selectedDiveSiteId,
        dive_type: diveType || null,
        time_of_day: timeOfDay || null,
        depth: depth ? Number(depth) : null,
        date,
        notes,
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
    return uri; // placeholder
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
        <Picker selectedValue={diveType} onValueChange={setDiveType} style={styles.picker}>
          <Picker.Item label="Select dive type..." value="" />
          <Picker.Item label="Shore dive" value="shore" />
          <Picker.Item label="Boat dive" value="boat" />
          <Picker.Item label="Wreck dive" value="wreck" />
        </Picker>

        {/* Time of Day */}
        <Text style={styles.label}>Time of Day</Text>
        <Picker selectedValue={timeOfDay} onValueChange={setTimeOfDay} style={styles.picker}>
          <Picker.Item label="Select time..." value="" />
          <Picker.Item label="Morning" value="morning" />
          <Picker.Item label="Afternoon" value="afternoon" />
          <Picker.Item label="Night" value="night" />
        </Picker>

        {/* Depth */}
        <Text style={styles.label}>Depth (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Depth in meters"
          keyboardType="numeric"
          value={depth}
          onChangeText={setDepth}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          multiline
          placeholder="Extra details..."
          value={notes}
          onChangeText={setNotes}
        />

        {/* Photo */}
        <Text style={styles.label}>Photo</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.imageButton} onPress={takePicture}>
            <Text style={styles.imageButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Text style={styles.imageButtonText}>Choose</Text>
          </TouchableOpacity>
        </View>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={{ marginTop: 10, height: 200, borderRadius: 10 }} />
        )}
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={saveSighting} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Sighting</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backButton: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 30 },
  content: { padding: 20 },
  creatureName: { fontSize: 24, color: 'white', fontWeight: 'bold', marginBottom: 10 },
  error: { color: 'red', marginBottom: 10 },
  label: { color: 'white', fontSize: 16, marginTop: 15, marginBottom: 5 },
  input: { backgroundColor: '#2A2A2A', color: 'white', borderRadius: 8, padding: 10 },
  picker: { backgroundColor: '#2A2A2A', color: 'white', borderRadius: 8 },
  imageButton: { backgroundColor: '#0077B6', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  imageButtonText: { color: 'white', fontWeight: '500' },
  saveButton: { backgroundColor: '#0077B6', padding: 15, alignItems: 'center', margin: 20, borderRadius: 8 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
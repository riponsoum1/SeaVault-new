import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft } from 'lucide-react-native';

export default function LogDiveScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay, setTimeOfDay] = useState(new Date());
  const [diveType, setDiveType] = useState('');
  const [depth, setDepth] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCreatures, setSelectedCreatures] = useState<any[]>([]); // Add creatures context here
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diveSites, setDiveSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiveSiteId, setSelectedDiveSiteId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 10,
        longitudeDelta: 10,
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const saveDive = async () => {
    if (!user) return Alert.alert('Login required');
    if (!selectedDiveSiteId) return setError('Please select a dive site');
    if (!date) return setError('Please enter a date');
    if (selectedCreatures.length === 0) return setError('Please select at least one creature');

    try {
      setLoading(true);
      const formattedTime = timeOfDay.toTimeString().split(':').slice(0, 2).join(':');
      let imageUrl = imageUri ? await uploadImage(imageUri) : null;

      const { error } = await supabase.from('sightings').insert([{
        user_id: user.id,
        creature_id: selectedCreatures[0].id, // Assuming first selected creature
        dive_site_id: selectedDiveSiteId,
        dive_type: diveType || null,
        time_of_day: formattedTime,
        depth: depth ? Number(depth) : null,
        date,
        notes,
        image_url: imageUrl,
      }]);

      if (error) throw error;

      Alert.alert('Success', 'Dive logged successfully!');
      router.back();
      setSelectedCreatures([]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to log dive');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    return uri; // Placeholder for future uploads
  };
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { marginTop: Platform.OS === 'ios' ? 60 : 30 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Dive</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 200 }}>
        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput placeholder="Search dive site..." value={searchTerm} onChangeText={setSearchTerm} style={styles.input} />

        {mapRegion && (
          <MapView style={{ height: 300, marginVertical: 10 }} initialRegion={mapRegion}>
            {filteredDiveSites.filter(site => site.latitude && site.longitude).map(site => (
              <Marker
                key={site.id}
                coordinate={{ latitude: Number(site.latitude), longitude: Number(site.longitude) }}
                title={site.name}
                onPress={() => setSelectedDiveSiteId(site.id)}
                pinColor={selectedDiveSiteId === site.id ? 'blue' : 'red'}
              />
            ))}
          </MapView>
        )}

        <Text style={styles.label}>Dive Type</Text>
        <TextInput style={styles.input} placeholder="Dive type" value={diveType} onChangeText={setDiveType} />

        <Text style={styles.label}>Time of Day</Text>
        <TouchableOpacity style={styles.input} onPress={() => {/* Add time picker logic */}}>
          <Text>{timeOfDay.toTimeString().split(':').slice(0, 2).join(':')}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Depth (optional)</Text>
        <TextInput style={styles.input} placeholder="Depth in meters" keyboardType="numeric" value={depth} onChangeText={setDepth} />

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Extra details..." value={notes} onChangeText={setNotes} />

        <Text style={styles.label}>Creatures</Text>
        {selectedCreatures.map(creature => (
          <View key={creature.id} style={styles.creatureCard}>
            <Image source={{ uri: creature.imageUri }} style={styles.cardImage} />
            <Text style={styles.cardName}>{creature.name}</Text>
            <TouchableOpacity onPress={() => {/* Add image upload logic */}}>
              <Text style={styles.uploadButton}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={saveDive} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Dive</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
      paddingTop: 20, // adjust this based on your design
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
      width: 30, // for spacing
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 200, // adjust based on your content
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
    },
    // Add the missing styles here (creatureCard, cardImage, cardName, etc.)
    creatureCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardImage: {
      width: 50,
      height: 50,
      borderRadius: 10,
      marginRight: 12,
    },
    cardName: {
      color: 'white',
      fontWeight: 'bold',
    },
    uploadButton: {
      color: '#0077B6',
      fontSize: 16,
      textDecorationLine: 'underline',
    },
    saveButton: {
      backgroundColor: '#0077B6',
      padding: 15,
      alignItems: 'center',
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      borderRadius: 8,
    },
    saveButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    // More styles as needed
  });
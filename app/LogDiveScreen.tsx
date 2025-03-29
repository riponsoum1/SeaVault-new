import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Plus } from 'lucide-react-native';
import CustomMap from './components/CustomMap';
import { Picker } from '@react-native-picker/picker';
import { useDiveLog } from '../context/DiveLogContext';

const DIVE_TYPES = ['Shore', 'Boat', 'Wreck', 'Drift', 'Cave', 'Night', 'Deep'];

export default function LogDiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCreatures, setSelectedCreatures } = useDiveLog();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [diveType, setDiveType] = useState('');
  const [depth, setDepth] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diveSites, setDiveSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiveSiteId, setSelectedDiveSiteId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [showDiveTypePicker, setShowDiveTypePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,  // Adjust to zoom into a smaller area
        longitudeDelta: 0.1,
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
      const formattedTime = timeOfDay && timeOfDay.length === 5 
       ? `${timeOfDay}:00`  // If timeOfDay is in HH:MM format, append :00
       : timeOfDay || '12:00:00';  // Default to '12:00:00' if timeOfDay is empty or invalid

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
      setSelectedCreatures(selectedCreatures.filter(c => c.id !== selectedCreatures[0].id));
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
          <CustomMap
            diveSites={filteredDiveSites}
            selectedDiveSiteId={selectedDiveSiteId}
            onDiveSiteSelect={setSelectedDiveSiteId}
            initialRegion={mapRegion}
          />
        )}

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
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={diveType}
                onValueChange={(itemValue) => setDiveType(itemValue)}
                style={styles.modalPicker}
                itemStyle={styles.modalPickerItem}
              >
                <Picker.Item label="Select dive type" value="" />
                {DIVE_TYPES.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Time of Day</Text>
        <TextInput 
          style={styles.input} 
          placeholder="12:00"
          value={timeOfDay}
          onChangeText={setTimeOfDay}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Depth (optional)</Text>
        <TextInput style={styles.input} placeholder="Depth in meters" keyboardType="numeric" value={depth} onChangeText={setDepth} />

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Extra details..." value={notes} onChangeText={setNotes} />

        <Text style={styles.label}>Creatures</Text>
        {selectedCreatures.length > 0 && (
          <View style={styles.selectedCreaturesContainer}>
            {selectedCreatures.map(creature => (
              <View key={creature.id} style={styles.creatureCard}>
                <View style={styles.creatureLeftSection}>
                  <Image 
                    source={{ uri: creature.imageUri || 'https://via.placeholder.com/50' }} 
                    style={styles.creatureImage} 
                  />
                  <Text style={styles.creatureName}>{creature.name}</Text>
                </View>
                <View style={styles.rightSection}>
                  <TouchableOpacity onPress={pickImage}>
                    <Plus size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setSelectedCreatures(selectedCreatures.filter(c => c.id !== creature.id))}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={styles.addCreatureButton}
          onPress={() => router.push('/Select-Creatures')}
        >
          <Text style={styles.addCreatureText}>+ Add Creatures</Text>
        </TouchableOpacity>

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
    creatureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#2A2A2A',
      padding: 15,
      borderRadius: 12,
      marginBottom: 8,
    },
    creatureLeftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    creatureImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: '#1E1E1E', // Add a background color for loading state
    },
    creatureName: {
      color: 'white',
      fontSize: 16,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emptyImageCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#1E1E1E',
      marginRight: 8,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#3A3A3A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      color: '#666',
      fontSize: 20,
      lineHeight: 24,
      textAlign: 'center',
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
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    modalClose: {
      color: '#0077B6',
      fontSize: 16,
    },
    modalPicker: {
      backgroundColor: '#2A2A2A',
      borderRadius: 8,
      color: 'white',
    },
    modalPickerItem: {
      color: 'white',
    },
    addCreatureButton: {
      backgroundColor: 'transparent',
      padding: 12,
      borderRadius: 8,
      marginBottom: 15,
    },
    addCreatureText: {
      color: '#0077B6',
      fontSize: 16,
    },
    selectedCreaturesContainer: {
      marginBottom: 15,
    },
  });
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Camera, Calendar, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Sighting } from '../../lib/types';

export default function EditSightingScreen() {
  const { sightingId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [sighting, setSighting] = useState<Sighting | null>(null);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sightingId && user) {
      fetchSighting();
    }
  }, [sightingId, user]);

  const fetchSighting = async () => {
    try {
      setFetchLoading(true);
      
      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .eq('id', sightingId)
        .eq('user_id', user?.id)
        .single();
        
      if (error) throw error;
      
      setSighting(data as Sighting);
      setLocation(data.location);
      setDate(data.date);
      setNotes(data.notes || '');
      setImageUri(data.image_url);
    } catch (error: any) {
      console.error('Error fetching sighting:', error);
      setError('Failed to load sighting details');
    } finally {
      setFetchLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access media library is required!');
        return;
      }

      // Open image library with correct mediaTypes parameter
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Using the correct enum value
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera to take pictures.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const updateSighting = async () => {
    if (!user || !sighting) {
      Alert.alert('Error', 'You must be logged in to update a sighting.');
      return;
    }
    
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }
    
    if (!date) {
      setError('Please select a date');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Updating sighting with data:', {
        id: sightingId,
        location,
        date,
        notes,
        image_url: imageUri,
      });
      
      const { error } = await supabase
        .from('sightings')
        .update({
          location,
          date,
          notes,
          image_url: imageUri,
        })
        .eq('id', sightingId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Sighting updated successfully');
      
      Alert.alert(
        'Success',
        'Sighting updated successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error updating sighting:', error);
      setError(error.message || 'Failed to update sighting');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  if (!sighting) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sighting not found or you don't have permission to edit it.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Sighting</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <MapPin size={18} color="#0077B6" />
            <Text style={styles.label}>Location</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Where did you see it?"
            placeholderTextColor="#777777"
            value={location}
            onChangeText={setLocation}
          />
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Calendar size={18} color="#0077B6" />
            <Text style={styles.label}>Date</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#777777"
            value={date}
            onChangeText={setDate}
          />
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Notes</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any details about your sighting..."
            placeholderTextColor="#777777"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.imageSection}>
          <Text style={styles.imageTitle}>Photo</Text>
          
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePicture}>
              <Camera size={24} color="white" />
              <Text style={styles.imageButtonText}>Take New Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
          
          {imageUri && (
            <View style={styles.selectedImageContainer}>
              <Text style={styles.selectedImageText}>Image selected</Text>
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={updateSighting}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Update Sighting</Text>
          )}
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 20,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 10,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
    flexDirection: 'row',
  },
  imageButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 5,
  },
  selectedImageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
  },
  selectedImageText: {
    color: '#AAAAAA',
  },
  removeImageButton: {
    padding: 5,
  },
  removeImageText: {
    color: '#ff6b6b',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    backgroundColor: '#0077B6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
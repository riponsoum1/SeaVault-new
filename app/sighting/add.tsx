import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Camera, Calendar, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function AddSightingScreen() {
  const { creatureId, creatureName } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to add images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        mediaTypes: ['images'],
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

  const uploadImage = async (uri: string) => {
    try {
      // For demo purposes, we'll just return the URI
      // In a real app, you would upload to Supabase storage
      return uri;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const saveSighting = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a sighting.');
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
      
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }
      
      console.log('Saving sighting with data:', {
        user_id: user.id,
        creature_id: creatureId,
        location,
        date,
        notes,
        image_url: imageUrl,
      });
      
      const { data, error } = await supabase
        .from('sightings')
        .insert([
          {
            user_id: user.id,
            creature_id: creatureId,
            location,
            date,
            notes,
            image_url: imageUrl,
          }
        ]);
        
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Sighting saved successfully:', data);
      
      Alert.alert(
        'Success',
        'Sighting added successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error saving sighting:', error);
      setError(error.message || 'Failed to save sighting');
    } finally {
      setLoading(false);
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
          <Text style={styles.imageTitle}>Add Photo</Text>
          
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePicture}>
              <Camera size={24} color="white" />
              <Text style={styles.imageButtonText}>Take Photo</Text>
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
          onPress={saveSighting}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Sighting</Text>
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
    width: 34, // Same width as back button for centering
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
  },
  errorContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
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
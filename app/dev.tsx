import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useOnboardingStore } from '../stores/onboardingStore';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DevScreen() {
  const { resetOnboarding, hasSeenOnboarding } = useOnboardingStore();

  const handleResetOnboarding = () => {
    resetOnboarding();
    Alert.alert(
      'Onboarding Reset',
      'Onboarding state has been reset. You will see the onboarding screens next time you restart the app or navigate to the home screen.',
      [
        {
          text: 'Go to Onboarding Now',
          onPress: () => router.replace('/onboarding'),
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]
    );
  };

  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Storage Cleared', 'All AsyncStorage data has been cleared.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear storage: ' + e);
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
        <Text style={styles.headerTitle}>Developer Tools</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Onboarding Status</Text>
          <Text style={styles.infoText}>
            Has seen onboarding: {hasSeenOnboarding ? 'Yes' : 'No'}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleResetOnboarding}>
          <Text style={styles.buttonText}>Reset Onboarding</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={() => {
            Alert.alert(
              'Clear Storage',
              'This will clear ALL AsyncStorage data. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Clear All',
                  onPress: clearAllStorage,
                  style: 'destructive',
                },
              ]
            );
          }}
        >
          <Text style={styles.buttonText}>Clear All Storage</Text>
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
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  button: {
    backgroundColor: '#0077B6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  dangerButton: {
    backgroundColor: '#E53935',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

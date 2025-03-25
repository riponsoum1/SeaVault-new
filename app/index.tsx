import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '../lib/supabase';

export default function Page() {
  const { user, loading: authLoading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('Checking Supabase connection...');
      setConnectionStatus('checking');
      setErrorMessage(null);
      
      const isConnected = await testSupabaseConnection();
      console.log('Connection test result:', isConnected);
      
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      if (!isConnected) {
        setErrorMessage('Could not connect to the database. Please check your connection and environment variables.');
      }
    } catch (error: any) {
      console.error('Connection check error:', error);
      setConnectionStatus('failed');
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator while checking authentication and connection
  if (authLoading || connectionStatus === 'checking') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>
          {connectionStatus === 'checking' ? 'Checking database connection...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // If connection failed, show error
  if (connectionStatus === 'failed') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{errorMessage || 'Could not connect to the database'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  // If user is logged in, redirect to home tab
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0077B6',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#DDDDDD',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function Page() {
  const { user, loading: authLoading } = useAuth();

  // Show loading indicator while checking authentication
  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Loading...</Text>
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
});

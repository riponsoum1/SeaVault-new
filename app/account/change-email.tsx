import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { user, signOut, updateUserEmail, updateUserProfile } = useAuth();
  
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    if (!newEmail || !password) {
      setError('All fields are required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleChangeEmail = async () => {
    if (!user) {
      setError('You must be logged in to change your email');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // First verify the password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });
      
      if (signInError) {
        setError('Password is incorrect');
        return;
      }
      
      // Update the email
      await updateUserEmail(newEmail);
      
      // Update the email in the profiles table
      await updateUserProfile({ email: newEmail });
      
      setSuccess(true);
      setNewEmail('');
      setPassword('');
      
      // Sign out after a delay (since email change usually requires verification)
      setTimeout(() => {
        signOut();
      }, 3000);
    } catch (error: any) {
      console.error('Error changing email:', error);
      setError(error.message || 'Failed to change email');
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
        <Text style={styles.headerTitle}>Change Email</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Email change request sent! Please check your new email for verification.
              You will be signed out.
            </Text>
          </View>
        )}
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Email</Text>
          <View style={styles.currentEmailContainer}>
            <Text style={styles.currentEmailText}>{user?.email}</Text>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>New Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new email address"
            placeholderTextColor="#777777"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#777777"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#777777" />
              ) : (
                <Eye size={20} color="#777777" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.noteText}>
          Note: You will need to verify your new email address before the change takes effect.
          You will be signed out after requesting the change.
        </Text>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleChangeEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Change Email</Text>
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
  successContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  successText: {
    color: '#4caf50',
    fontSize: 14,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
  },
  currentEmailContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
  },
  currentEmailText: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: 'white',
  },
  eyeButton: {
    padding: 10,
  },
  noteText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
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
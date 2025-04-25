import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, uploadAvatar, deleteOldAvatar } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft,
  Camera,
  Upload,
  User as UserIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Purchases from 'react-native-purchases';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, userProfile, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState('Checking...');

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setAvatarUrl(userProfile.avatar_url);
    }
    fetchSubscriptionStatus();
  }, [userProfile]);

  const fetchSubscriptionStatus = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      if (info.entitlements.active['pro']) {
        const entitlement = info.entitlements.active['pro'];
        setPlan(
          entitlement.periodType === 'trial'
            ? 'Free Trial'
            : 'Active Subscription'
        );
      } else {
        setPlan('Free Account');
      }
    } catch (error) {
      console.error('Failed to fetch subscription info:', error);
      setPlan('Error fetching plan');
    }
  };

  const openManageSubscription = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        await Linking.openURL(
          'https://play.google.com/store/account/subscriptions'
        );
      }
    } catch (error) {
      console.error('Failed to open subscription settings:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to add images.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatarUrl(result.assets[0].uri);
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
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to take pictures.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const updateProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      let finalAvatarUrl = userProfile?.avatar_url;

      // Only handle avatar upload if a new image was selected
      if (avatarUrl && avatarUrl !== userProfile?.avatar_url) {
        try {
          // Delete old avatar if it exists
          if (userProfile?.avatar_url) {
            const oldFilePath = userProfile.avatar_url;
            await deleteOldAvatar(oldFilePath);
          }

          // Upload new avatar
          console.log('Starting avatar upload process...');
          finalAvatarUrl = await uploadAvatar(avatarUrl, user.id);
          console.log('Avatar upload completed, URL:', finalAvatarUrl);
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          Alert.alert(
            'Error',
            'Failed to upload profile picture. Please try again.'
          );
          return;
        }
      }

      console.log('Updating profile with avatar URL:', finalAvatarUrl);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated in database successfully');

      // Update local state
      if (updateUserProfile) {
        await updateUserProfile({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
        });
        console.log('Local profile state updated');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Profile updated successfully!
              </Text>
            </View>
          )}

          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {fullName
                      ? fullName.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={takePicture}
              >
                <Camera size={20} color="white" />
                <Text style={styles.avatarButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
                <Upload size={20} color="white" />
                <Text style={styles.avatarButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#777777"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.emailContainer}>
              <Text style={styles.emailText}>{user?.email}</Text>
              <TouchableOpacity
                style={styles.changeEmailButton}
                onPress={() => router.push('/account/change-email')}
              >
                <Text style={styles.changeEmailText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() => router.push('/account/change-password')}
          >
            <Text style={styles.passwordButtonText}>Change Password</Text>
          </TouchableOpacity>

          <View style={styles.membershipSection}>
            <Text style={styles.membershipTitle}>Membership</Text>
            <Text style={styles.planText}>Current Plan: {plan}</Text>
            <TouchableOpacity
              style={styles.manageSubscriptionButton}
              onPress={openManageSubscription}
            >
              <Text style={styles.manageSubscriptionText}>
                Manage Subscription
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={updateProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
    width: 34,
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
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077B6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  avatarButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
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
  emailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
  },
  emailText: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  changeEmailButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  changeEmailText: {
    color: '#0077B6',
    fontWeight: '500',
  },
  passwordButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  passwordButtonText: {
    color: '#0077B6',
    fontSize: 16,
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
  membershipSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  membershipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  planText: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 15,
  },
  manageSubscriptionButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageSubscriptionText: {
    color: '#0077B6',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
});

import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Use secure storage for native platforms, localStorage for web
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Get environment variables with fallbacks to prevent undefined errors
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Add console logs to debug connection issues
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

// Check if environment variables are properly set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const uploadAvatar = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('Starting avatar upload for URI:', uri);
    
    // Get the file name and extension
    const fileName = uri.split('/').pop();
    const fileExt = fileName?.split('.').pop();
    const newFileName = `${new Date().getTime()}.${fileExt}`;
    console.log('Generated filename:', newFileName);

    // Read the file as base64
    console.log('Reading file as base64...');
    const base64File = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('File read complete, converting...');

    // Upload the image to Supabase Storage
    console.log('Starting Supabase upload...');
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`${userId}/${newFileName}`, decode(base64File), {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error.message);
      console.error('Error details:', error);
      throw error;
    }

    if (!data) {
      console.error('Upload succeeded but no data returned');
      throw new Error('Upload failed - no data returned');
    }

    console.log('Upload successful, data:', data);

    // Get the public URL
    console.log('Getting public URL...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/${newFileName}`);

    if (!urlData.publicUrl) {
      console.error('Failed to get public URL from:', urlData);
      throw new Error('Failed to get public URL');
    }

    console.log('Successfully generated public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Avatar upload failed with error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to decode base64
function decode(base64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75,
      len = base64.length,
      i, p = 0,
      encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arraybuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arraybuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = chars.indexOf(base64[i]);
    encoded2 = chars.indexOf(base64[i + 1]);
    encoded3 = chars.indexOf(base64[i + 2]);
    encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
}

// Helper function to delete old avatar
export const deleteOldAvatar = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting old avatar:', error);
    // Don't throw here as this is a cleanup operation
  }
};

// Add a simple test query to verify connection
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('categories').select('count');
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection successful:', data);
    return true;
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return false;
  }
};

export const uploadSightingImage = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('Starting sighting image upload for URI:', uri);
    
    // Get the file name and extension
    const fileName = uri.split('/').pop();
    const fileExt = fileName?.split('.').pop();
    const newFileName = `${new Date().getTime()}.${fileExt}`;
    console.log('Generated filename:', newFileName);

    // Read the file as base64
    console.log('Reading file as base64...');
    const base64File = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('File read complete, converting...');

    // Upload the image to Supabase Storage
    console.log('Starting Supabase upload...');
    const { data, error } = await supabase.storage
      .from('sightings')
      .upload(`${userId}/${newFileName}`, decode(base64File), {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error.message);
      console.error('Error details:', error);
      throw error;
    }

    if (!data) {
      console.error('Upload succeeded but no data returned');
      throw new Error('Upload failed - no data returned');
    }

    console.log('Upload successful, data:', data);

    // Get the public URL
    console.log('Getting public URL...');
    const { data: urlData } = supabase.storage
      .from('sightings')
      .getPublicUrl(`${userId}/${newFileName}`);

    if (!urlData.publicUrl) {
      console.error('Failed to get public URL from:', urlData);
      throw new Error('Failed to get public URL');
    }

    console.log('Successfully generated public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Sighting image upload failed with error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to upload sighting image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to delete old sighting image
export const deleteOldSightingImage = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from('sightings')
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting old sighting image:', error);
    // Don't throw here as this is a cleanup operation
  }
};
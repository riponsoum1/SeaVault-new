import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Maximum size for each chunk (slightly less than 2048 to be safe)
const MAX_CHUNK_SIZE = 2000;

// Use secure storage for native platforms, localStorage for web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    // Check if this item is stored in chunks
    const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);

    if (numChunksStr) {
      // Item is stored in chunks, need to reassemble
      const numChunks = parseInt(numChunksStr);
      let value = '';

      for (let i = 0; i < numChunks; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk) {
          value += chunk;
        } else {
          console.warn(`Missing chunk ${i} for key ${key}`);
        }
      }

      return value;
    } else {
      // Regular item, retrieve normally
      return SecureStore.getItemAsync(key);
    }
  },

  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    if (value.length > MAX_CHUNK_SIZE) {
      // Value is too large, need to split into chunks
      const numChunks = Math.ceil(value.length / MAX_CHUNK_SIZE);

      // Store the number of chunks
      await SecureStore.setItemAsync(`${key}_chunks`, numChunks.toString());

      // Store each chunk
      for (let i = 0; i < numChunks; i++) {
        const start = i * MAX_CHUNK_SIZE;
        const end = Math.min(start + MAX_CHUNK_SIZE, value.length);
        const chunk = value.substring(start, end);
        await SecureStore.setItemAsync(`${key}_${i}`, chunk);
      }

      return;
    } else {
      // Value is small enough, store normally
      return SecureStore.setItemAsync(key, value);
    }
  },

  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    // Check if this item is stored in chunks
    const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);

    if (numChunksStr) {
      // Item is stored in chunks, need to remove all chunks
      const numChunks = parseInt(numChunksStr);

      // Remove each chunk
      for (let i = 0; i < numChunks; i++) {
        await SecureStore.deleteItemAsync(`${key}_${i}`);
      }

      // Remove the chunks metadata
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }

    // Also try to remove the key directly (in case it exists or for backward compatibility)
    return SecureStore.deleteItemAsync(key);
  },
};

// Get environment variables with fallbacks to prevent undefined errors
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

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

export const uploadAvatar = async (
  uri: string,
  userId: string
): Promise<string> => {
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
        upsert: false,
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
    throw new Error(
      `Failed to upload avatar: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

// Helper function to decode base64
function decode(base64: string) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i,
    p = 0,
    encoded1,
    encoded2,
    encoded3,
    encoded4;

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
    let path = filePath;

    // If it's a full URL, extract the path after 'avatars/'
    if (filePath.includes('avatars/')) {
      const parts = filePath.split('avatars/');
      if (parts.length > 1) {
        path = parts[1];
      }
    } else if (!filePath.includes('/')) {
      console.error(
        'Cannot delete avatar: file path does not include user ID',
        filePath
      );
      return;
    }

    console.log('Deleting avatar at path:', path);
    const { error } = await supabase.storage.from('avatars').remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting old avatar:', error);
    // Don't throw here as this is a cleanup operation
  }
};

export const uploadSightingImage = async (
  uri: string,
  userId: string
): Promise<string> => {
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
        upsert: false,
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
    throw new Error(
      `Failed to upload sighting image: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

// Helper function to delete old sighting image
export const deleteOldSightingImage = async (
  filePath: string
): Promise<void> => {
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

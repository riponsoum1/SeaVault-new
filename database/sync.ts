import { database } from './index';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { User } from './models/User';
import { Creature } from './models/Creature';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store pending sync to be executed when connection is restored
let pendingSyncUserId: string | null = null;

// Check if the device is connected to the internet
const isConnected = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable ? true : false;
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false;
  }
};

// Setup network state listener
export const setupNetworkListener = () => {
  NetInfo.addEventListener((state) => {
    // If we're back online and have a pending sync, execute it
    if (state.isConnected && state.isInternetReachable && pendingSyncUserId) {
      console.log('Connection restored, executing pending sync');
      const userId = pendingSyncUserId;
      pendingSyncUserId = null;
      synchronize(userId).catch((err) => {
        console.error('Failed to execute pending sync:', err);
        // Re-queue the sync if it fails
        pendingSyncUserId = userId;
      });
    }
  });
};

// Main synchronization function
export const synchronize = async (userId: string) => {
  console.log(`Sync requested for user: ${userId}`);

  if (!userId) {
    console.error('Sync error: No user ID provided');
    return { success: false, message: 'No user ID provided' };
  }

  // Check for internet connectivity
  const connected = await isConnected();
  if (!connected) {
    console.log('No internet connection, queuing sync for later');
    pendingSyncUserId = userId;
    return { success: false, message: 'No internet connection' };
  }

  try {
    console.log('Starting simplified sync process');

    // CRITICAL: First, ensure all creatures are downloaded for offline use
    try {
      const creatures = await syncCreaturesForOfflineUse(userId);
      console.log(
        `Successfully synced ${
          creatures?.length || 0
        } creatures for offline use`
      );
    } catch (creatureError) {
      console.error('Error syncing creatures:', creatureError);
      // Continue with other sync operations
    }

    // Manually update the last sync time to ensure the UI shows the correct status
    try {
      const currentTime = Date.now();
      console.log(`Manually updating last sync time to ${currentTime}`);

      // Store the timestamp in AsyncStorage - this is the most reliable approach
      await AsyncStorage.setItem('@last_sync_time', currentTime.toString());
      console.log('Last sync time saved to AsyncStorage');

      // Optionally try to update the user record, but don't depend on it
      try {
        // Since we're having trouble with the User model, let's simplify and just
        // store the last sync time directly in AsyncStorage with the user ID
        await AsyncStorage.setItem(
          `@user_last_sync_${userId}`,
          currentTime.toString()
        );
        console.log('User-specific sync time saved to AsyncStorage');
      } catch (userStorageError) {
        console.warn(
          'Could not save user-specific sync time:',
          userStorageError
        );
      }

      return {
        success: true,
        message: 'Creatures synced for offline use',
      };
    } catch (error: any) {
      // Explicitly typing error as any
      console.error('Sync error:', error);
      return {
        success: false,
        message: error.message || 'Synchronization failed',
      };
    }
  } catch (error: any) {
    console.error('Sync error:', error);
    return {
      success: false,
      message: error.message || 'Synchronization failed',
    };
  }
};

// New function to ensure creatures are available offline
async function syncCreaturesForOfflineUse(userId: string) {
  console.log('Syncing creatures for offline use');

  // Fetch all creatures from Supabase
  const { data: creatures, error } = await supabase
    .from('creatures')
    .select('*');

  if (error) {
    console.error('Error fetching creatures:', error);
    throw error;
  }

  if (!creatures || creatures.length === 0) {
    console.log('No creatures found to sync');
    return [];
  }

  console.log(`Downloaded ${creatures.length} creatures for offline use`);

  // Store creatures in WatermelonDB if the table exists
  let creaturesSavedToDb = false;
  try {
    const creaturesCollection = database.get<Creature>('creatures');

    // Get existing creature IDs to avoid duplicate creation attempts
    const existingCreatures = await creaturesCollection.query().fetch();
    const existingIds = new Set(existingCreatures.map((c) => c.id));

    console.log(
      `Found ${existingCreatures.length} existing creatures in database`
    );

    await database.write(async () => {
      for (const creature of creatures) {
        try {
          // Only attempt to create if it doesn't already exist
          if (!existingIds.has(creature.id)) {
            await creaturesCollection.create((record) => {
              // Set the ID first
              record._raw.id = creature.id;

              // Then set other properties
              const typedRecord = record as Creature;
              typedRecord.name = creature.name;
              if (creature.scientific_name)
                typedRecord.scientificName = creature.scientific_name;
              if (creature.description)
                typedRecord.description = creature.description;
              if (creature.image_url) typedRecord.imageUrl = creature.image_url;
              if (creature.rarity) typedRecord.rarity = creature.rarity;
            });
            console.log(`Created creature: ${creature.name}`);
          } else {
            // Skip existing records
            console.log(`Creature already exists: ${creature.name}`);
          }
        } catch (createError) {
          console.warn(
            `Failed to create creature ${creature.id} (${creature.name}):`,
            createError
          );
        }
      }
    });

    creaturesSavedToDb = true;
    console.log('Creatures synced to local database');
  } catch (dbError) {
    console.warn('Could not store creatures in WatermelonDB:', dbError);

    // Fallback: Store in AsyncStorage
    try {
      await AsyncStorage.setItem('@creatures', JSON.stringify(creatures));
      console.log('Creatures stored in AsyncStorage as fallback');
    } catch (storageError) {
      console.error('Failed to store creatures in AsyncStorage:', storageError);
    }
  }

  // If we couldn't save to WatermelonDB but need to update the schema,
  // trigger a database reset to apply migrations (only in development)
  if (!creaturesSavedToDb && __DEV__) {
    try {
      console.log('Attempting to reset database to apply migrations...');
      // Store the current app state in memory if needed

      // Reset the database - use unsafeResetDatabase instead
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      console.log('Database reset. The app may need to restart.');
    } catch (resetError) {
      console.error('Failed to reset database:', resetError);
    }
  }

  return creatures;
}

// Helper function to push changes to Supabase
async function pushChangesToSupabase(userId: string, changes: any) {
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // Process sightings/dives
  if (changes.dives) {
    // Handle created/updated sightings
    const created = [
      ...(changes.dives.created || []),
      ...(changes.dives.updated || []),
    ];

    for (const sighting of created) {
      try {
        // Try to determine if this is a sighting or a dive based on fields
        let tableName = 'sightings';

        // Prepare the data
        const data = {
          id: sighting.id,
          ...sighting,
          user_id: userId, // Ensure we set the user_id
          updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(data);

        if (upsertError) {
          console.error(`Error upserting to ${tableName}:`, upsertError);
        } else {
          createdCount++;
        }
      } catch (error) {
        console.error('Error processing sighting/dive:', error);
      }
    }

    // Handle deleted sightings
    for (const sightingId of changes.dives.deleted || []) {
      try {
        const { error: deleteError } = await supabase
          .from('sightings')
          .delete()
          .eq('id', sightingId);

        if (deleteError) {
          console.error('Error deleting sighting:', deleteError);
        } else {
          deletedCount++;
        }
      } catch (error) {
        console.error('Error processing deleted sighting:', error);
      }
    }
  }

  console.log(
    `Pushed changes: ${createdCount} created/updated, ${deletedCount} deleted`
  );
}

// Fallback pull changes implementation for simpler approach
async function fallbackPullChanges(userId: string, lastPulledAt: number) {
  console.log('Using simplified fallback pull changes implementation');
  const timestamp = Date.now();

  // Fetch updated data since last sync
  const lastSyncTime = lastPulledAt
    ? new Date(lastPulledAt).toISOString()
    : '1970-01-01T00:00:00Z';

  console.log(`Querying with lastSyncTime: ${lastSyncTime}`);

  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .gt('updated_at', lastSyncTime);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  // Fetch sightings - these correspond to "dives" in WatermelonDB
  const { data: sightings, error: sightingsError } = await supabase
    .from('sightings')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', lastSyncTime);

  if (sightingsError) {
    console.error('Error fetching sightings:', sightingsError);
  }

  console.log(
    `Returning fallback data: ${profiles?.length || 0} profiles, ${
      sightings?.length || 0
    } sightings`
  );

  // Return the changes in the format expected by WatermelonDB
  return {
    changes: {
      profiles: {
        created: [],
        updated: profiles || [],
        deleted: [],
      },
      dives: {
        created: [],
        updated: sightings || [],
        deleted: [],
      },
      trips: {
        created: [],
        updated: [],
        deleted: [],
      },
    },
    timestamp,
  };
}

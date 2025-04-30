import { database } from './index';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { User } from './models/User';
import { Creature } from './models/Creature';
import { Sighting } from './models/Sighting';
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
    if (state.isConnected && state.isInternetReachable) {
      console.log('Connection restored, checking for pending sync');

      // If we have a pending user sync, execute it
      if (pendingSyncUserId) {
        console.log('Executing pending user sync');
        const userId = pendingSyncUserId;
        pendingSyncUserId = null;
        synchronize(userId).catch((err: any) => {
          console.error('Failed to execute pending sync:', err);
          // Re-queue the sync if it fails
          pendingSyncUserId = userId;
        });
      }

      // Check for unsaved sightings from any user session
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data?.session?.user?.id) {
            syncLocalSightings(data.session.user.id).catch((err: any) => {
              console.error('Failed to sync local sightings:', err);
            });
          }
        })
        .catch((err: any) => {
          console.error('Failed to get current session:', err);
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

    // CRITICAL: Ensure all data is downloaded for offline use
    try {
      await syncCategoriesForOfflineUse();
      await syncDiveSitesForOfflineUse();
      const creatures = await syncCreaturesForOfflineUse(userId);
      console.log(
        `Successfully synced ${
          creatures?.length || 0
        } creatures for offline use`
      );

      // Sync any local sightings that haven't been uploaded yet
      try {
        const sightingsSynced = await syncLocalSightings(userId);
        console.log(
          `Sightings sync ${sightingsSynced ? 'successful' : 'failed'}`
        );
      } catch (sightingsError) {
        console.error('Failed to sync local sightings:', sightingsError);
      }
    } catch (syncError) {
      console.error('Error syncing data:', syncError);
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

// New function to sync local sightings to Supabase when online
export const syncLocalSightings = async (userId: string): Promise<boolean> => {
  console.log('Syncing local sightings to Supabase');

  // Check for internet connectivity
  const connected = await isConnected();
  if (!connected) {
    console.log('No internet connection for syncing sightings');
    return false;
  }

  try {
    // First try WatermelonDB
    try {
      const sightingsCollection = database.get<Sighting>('sightings');
      const unsyncedSightings = await sightingsCollection
        .query(Q.where('isSynced', false))
        .fetch();

      console.log(
        `Found ${unsyncedSightings.length} unsynced sightings in WatermelonDB`
      );

      if (unsyncedSightings.length > 0) {
        for (const sighting of unsyncedSightings) {
          try {
            // Extract the needed fields from the WatermelonDB record
            const sightingData = {
              user_id: sighting.userId,
              creature_id: sighting.creatureId,
              dive_site_id: sighting.diveId || null, // Using diveId from the model
              dive_type: (sighting as any).dive_type || null,
              time_of_day: (sighting as any).time_of_day || null,
              depth: (sighting as any).depth || null,
              date: new Date(sighting.sightedAt).toISOString().split('T')[0],
              notes: sighting.notes || null,
              image_url: null, // Handle image upload separately
            };

            // If there's a local image, upload it first
            if (
              (sighting as any).imageUrl &&
              (sighting as any).imageUrl.startsWith('file://')
            ) {
              try {
                const { uploadSightingImage } = require('../lib/supabase');
                sightingData.image_url = await uploadSightingImage(
                  (sighting as any).imageUrl,
                  userId
                );
              } catch (imageError) {
                console.error('Failed to upload sighting image:', imageError);
              }
            }

            // Insert the sighting into Supabase
            const { error } = await supabase
              .from('sightings')
              .insert([sightingData]);

            if (error) {
              console.error('Error syncing sighting to Supabase:', error);
              continue;
            }

            // Update the local record as synced
            await database.write(async () => {
              await sighting.update((record: any) => {
                record.isSynced = true;
                if (sightingData.image_url)
                  record.imageUrl = sightingData.image_url;
              });
            });

            console.log('Successfully synced sighting to Supabase');
          } catch (sightingError) {
            console.error(
              'Error processing individual sighting:',
              sightingError
            );
          }
        }
      }
    } catch (dbError) {
      console.warn('Error accessing WatermelonDB sightings:', dbError);
    }

    // Then check AsyncStorage for any sightings that might be stored there
    try {
      const storedSightings = await AsyncStorage.getItem('@sightings');
      if (storedSightings) {
        const sightings = JSON.parse(storedSightings);
        const unsyncedSightings = sightings.filter(
          (s: any) => !s.is_synced && s.user_id === userId
        );

        console.log(
          `Found ${unsyncedSightings.length} unsynced sightings in AsyncStorage`
        );

        if (unsyncedSightings.length > 0) {
          const updatedSightings = [...sightings];

          for (let i = 0; i < unsyncedSightings.length; i++) {
            const sighting = unsyncedSightings[i];
            try {
              // Prepare sighting data for Supabase
              const sightingData = {
                user_id: sighting.user_id,
                creature_id: sighting.creature_id,
                dive_site_id: sighting.dive_site_id,
                dive_type: sighting.dive_type,
                time_of_day: sighting.time_of_day,
                depth: sighting.depth,
                date: sighting.date,
                notes: sighting.notes,
                image_url: null,
              };

              // If there's a local image, upload it first
              if (
                sighting.image_url &&
                sighting.image_url.startsWith('file://')
              ) {
                try {
                  const { uploadSightingImage } = require('../lib/supabase');
                  sightingData.image_url = await uploadSightingImage(
                    sighting.image_url,
                    userId
                  );
                } catch (imageError) {
                  console.error('Failed to upload sighting image:', imageError);
                }
              } else {
                sightingData.image_url = sighting.image_url;
              }

              // Insert the sighting into Supabase
              const { error } = await supabase
                .from('sightings')
                .insert([sightingData]);

              if (error) {
                console.error('Error syncing sighting to Supabase:', error);
                continue;
              }

              // Update the sighting in the array
              const index = updatedSightings.findIndex(
                (s: any) => s.id === sighting.id
              );
              if (index !== -1) {
                updatedSightings[index] = {
                  ...updatedSightings[index],
                  is_synced: true,
                  image_url:
                    sightingData.image_url || updatedSightings[index].image_url,
                };
              }

              console.log(
                'Successfully synced sighting from AsyncStorage to Supabase'
              );
            } catch (sightingError) {
              console.error(
                'Error processing AsyncStorage sighting:',
                sightingError
              );
            }
          }

          // Update AsyncStorage with the synced status
          await AsyncStorage.setItem(
            '@sightings',
            JSON.stringify(updatedSightings)
          );
        }
      }
    } catch (storageError) {
      console.error('Error accessing AsyncStorage sightings:', storageError);
    }

    return true;
  } catch (error) {
    console.error('Error syncing local sightings:', error);
    return false;
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
              if (creature.category_id)
                typedRecord.categoryId = creature.category_id;
              if (creature.rarity) typedRecord.rarity = creature.rarity;
              if (creature.class) typedRecord.class = creature.class;
              if (creature.points) typedRecord.points = creature.points;
            });
            console.log(`Created creature: ${creature.name}`);
          } else {
            // Update existing creature
            const existingCreature = existingCreatures.find(
              (c) => c.id === creature.id
            );
            if (existingCreature) {
              await existingCreature.update((c) => {
                c.name = creature.name;
                if (creature.scientific_name)
                  c.scientificName = creature.scientific_name;
                if (creature.description) c.description = creature.description;
                if (creature.image_url) c.imageUrl = creature.image_url;
                if (creature.category_id) c.categoryId = creature.category_id;
                if (creature.rarity) c.rarity = creature.rarity;
                if (creature.class) c.class = creature.class;
                if (creature.points) c.points = creature.points;
              });
              console.log(`Updated creature: ${creature.name}`);
            }
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

// New function to ensure categories are available offline
async function syncCategoriesForOfflineUse() {
  console.log('Syncing categories for offline use');

  try {
    // Fetch all categories from Supabase
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    if (!categories || categories.length === 0) {
      console.log('No categories found to sync');
      return [];
    }

    console.log(`Downloaded ${categories.length} categories for offline use`);

    // Store categories in WatermelonDB
    try {
      const categoriesCollection = database.get('categories');

      // Get existing category IDs to avoid duplicate creation attempts
      const existingCategories = await categoriesCollection.query().fetch();
      const existingIds = new Set(existingCategories.map((c) => c.id));

      console.log(
        `Found ${existingCategories.length} existing categories in database`
      );

      await database.write(async () => {
        for (const category of categories) {
          try {
            // Only attempt to create if it doesn't already exist
            if (!existingIds.has(category.id)) {
              await categoriesCollection.create((record) => {
                // Set the ID first
                record._raw.id = category.id;

                // Then set other properties
                const typedRecord = record as any;
                typedRecord.name = category.name;
                if (category.description)
                  typedRecord.description = category.description;
                if (category.image_url)
                  typedRecord.imageUrl = category.image_url;

                // Set default emoji based on name if not provided
                typedRecord.emoji = getEmojiForCategory(category.name);
                typedRecord.isSynced = true;
              });
              console.log(`Created category: ${category.name}`);
            } else {
              // Update existing record
              const existingCategory = existingCategories.find(
                (c) => c.id === category.id
              );
              if (existingCategory) {
                await existingCategory.update((c) => {
                  const typedRecord = c as any;
                  typedRecord.name = category.name;
                  if (category.description)
                    typedRecord.description = category.description;
                  if (category.image_url)
                    typedRecord.imageUrl = category.image_url;
                  typedRecord.emoji = getEmojiForCategory(category.name);
                  typedRecord.isSynced = true;
                });
                console.log(`Updated category: ${category.name}`);
              }
            }
          } catch (createError) {
            console.warn(
              `Failed to create/update category ${category.id} (${category.name}):`,
              createError
            );
          }
        }
      });

      console.log('Categories synced to local database');
      return categories;
    } catch (dbError) {
      console.warn('Could not store categories in WatermelonDB:', dbError);

      // Fallback: Store in AsyncStorage
      try {
        await AsyncStorage.setItem('@categories', JSON.stringify(categories));
        console.log('Categories stored in AsyncStorage as fallback');
        return categories;
      } catch (storageError) {
        console.error(
          'Failed to store categories in AsyncStorage:',
          storageError
        );
        throw storageError;
      }
    }
  } catch (error) {
    console.error('Error in syncCategoriesForOfflineUse:', error);
    throw error;
  }
}

// Helper function to get emoji for a category
function getEmojiForCategory(categoryName: string): string {
  switch (categoryName.toLowerCase()) {
    case 'sharks':
      return '🦈';
    case 'turtles':
      return '🐢';
    case 'reef fish':
      return '🐠';
    case 'cephalopods':
      return '🦑';
    case 'rays':
      return '🐡';
    case 'mammals':
      return '🐬';
    case 'deep-sea creatures':
      return '👀';
    case 'eels & sea snakes':
      return '🐍';
    case 'invertebrates':
      return '🦀';
    case 'jellyfish & soft-bodied':
      return '🌊';
    case 'pelagic fish':
      return '🎣';
    case 'rays & skates':
      return '🌊';
    case 'turtles & reptiles':
      return '🐢';
    default:
      return '🐋';
  }
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

// Function to ensure dive sites are available offline
async function syncDiveSitesForOfflineUse() {
  console.log('Syncing dive sites for offline use');

  try {
    // Fetch popular dive sites from Supabase
    const { data: diveSites, error } = await supabase
      .from('dive_sites')
      .select('*');

    if (error) {
      console.error('Error fetching dive sites:', error);
      // If server fetch fails, use predefined dive sites
      return await seedDefaultDiveSites();
    }

    if (!diveSites || diveSites.length === 0) {
      console.log('No dive sites found in database, using default sites');
      return await seedDefaultDiveSites();
    }

    console.log(`Downloaded ${diveSites.length} dive sites for offline use`);
    return await storeDiveSitesInDatabase(diveSites);
  } catch (error) {
    console.error('Error in syncDiveSitesForOfflineUse:', error);
    // Fall back to predefined dive sites
    return await seedDefaultDiveSites();
  }
}

// Store dive sites in local database
async function storeDiveSitesInDatabase(diveSites: any[]) {
  try {
    const diveSitesCollection = database.get('dive_sites');

    // Get existing dive sites
    const existingDiveSites = await diveSitesCollection.query().fetch();
    const existingIds = new Set(existingDiveSites.map((site) => site.id));

    console.log(
      `Found ${existingDiveSites.length} existing dive sites in database`
    );

    await database.write(async () => {
      for (const site of diveSites) {
        try {
          if (!existingIds.has(site.id)) {
            await diveSitesCollection.create((record) => {
              // Set the ID first
              record._raw.id = site.id;

              // Then set other properties
              const typedRecord = record as any;
              typedRecord.name = site.name;
              typedRecord.location = site.location;
              if (site.country) typedRecord.country = site.country;
              if (site.region) typedRecord.region = site.region;
              if (site.description) typedRecord.description = site.description;
              if (site.depth) typedRecord.depth = site.depth;
              if (site.latitude) typedRecord.latitude = site.latitude;
              if (site.longitude) typedRecord.longitude = site.longitude;
              if (site.type) typedRecord.type = site.type;
              typedRecord.isSynced = true;
            });
            console.log(`Created dive site: ${site.name}`);
          } else {
            // Update existing dive site
            const existingSite = existingDiveSites.find(
              (s) => s.id === site.id
            );
            if (existingSite) {
              await existingSite.update((s) => {
                const typedRecord = s as any;
                typedRecord.name = site.name;
                typedRecord.location = site.location;
                if (site.country) typedRecord.country = site.country;
                if (site.region) typedRecord.region = site.region;
                if (site.description)
                  typedRecord.description = site.description;
                if (site.depth) typedRecord.depth = site.depth;
                if (site.latitude) typedRecord.latitude = site.latitude;
                if (site.longitude) typedRecord.longitude = site.longitude;
                if (site.type) typedRecord.type = site.type;
                typedRecord.isSynced = true;
              });
              console.log(`Updated dive site: ${site.name}`);
            }
          }
        } catch (createError) {
          console.warn(
            `Failed to create/update dive site ${site.id} (${site.name}):`,
            createError
          );
        }
      }
    });

    console.log('Dive sites synced to local database');
    return diveSites;
  } catch (dbError) {
    console.warn('Could not store dive sites in WatermelonDB:', dbError);

    // Fallback: Store in AsyncStorage
    try {
      await AsyncStorage.setItem('@dive_sites', JSON.stringify(diveSites));
      console.log('Dive sites stored in AsyncStorage as fallback');
      return diveSites;
    } catch (storageError) {
      console.error(
        'Failed to store dive sites in AsyncStorage:',
        storageError
      );
      throw storageError;
    }
  }
}

// Seed default dive sites when offline and no data available
async function seedDefaultDiveSites() {
  const defaultDiveSites = [
    {
      id: '1',
      name: 'Great Blue Hole',
      location: 'Lighthouse Reef Atoll',
      country: 'Belize',
      region: 'Caribbean',
      description:
        'A giant marine sinkhole and UNESCO World Heritage Site, famous for its deep blue color and crystal-clear waters.',
      depth: 124,
      type: 'blue hole',
    },
    {
      id: '2',
      name: 'Barracuda Point',
      location: 'Sipadan Island',
      country: 'Malaysia',
      region: 'Borneo',
      description:
        'Famous for its strong currents and large schools of barracuda that form tornado-like formations.',
      depth: 30,
      type: 'wall',
    },
    {
      id: '3',
      name: 'SS Thistlegorm',
      location: 'Straits of Gubal',
      country: 'Egypt',
      region: 'Red Sea',
      description:
        'WWII shipwreck with cargo including motorcycles, trucks, and railway cars.',
      depth: 30,
      type: 'wreck',
    },
    {
      id: '4',
      name: 'Blue Corner Wall',
      location: 'Palau',
      country: 'Micronesia',
      region: 'Pacific Ocean',
      description:
        'Famous for its strong currents that attract large pelagic fish like sharks and barracuda.',
      depth: 25,
      type: 'wall',
    },
    {
      id: '5',
      name: 'Shark and Yolanda Reef',
      location: 'Ras Muhammad National Park',
      country: 'Egypt',
      region: 'Red Sea',
      description:
        'Multiple dive sites featuring stunning coral formations and remnants of the Yolanda shipwreck.',
      depth: 40,
      type: 'reef',
    },
    {
      id: '6',
      name: 'Manta Ray Night Dive',
      location: 'Kailua Kona',
      country: 'Hawaii, USA',
      region: 'Pacific Ocean',
      description:
        'Famous night dive where lights attract plankton, which in turn attracts manta rays.',
      depth: 10,
      type: 'night',
    },
    {
      id: '7',
      name: 'Richelieu Rock',
      location: 'Surin Islands',
      country: 'Thailand',
      region: 'Andaman Sea',
      description:
        'Horseshoe-shaped reef famous for whale shark sightings and vibrant marine life.',
      depth: 35,
      type: 'reef',
    },
    {
      id: '8',
      name: 'Gordon Rocks',
      location: 'Santa Cruz Island',
      country: 'Galapagos, Ecuador',
      region: 'Pacific Ocean',
      description:
        'Known as "The Washing Machine" due to strong currents, famous for schooling hammerhead sharks.',
      depth: 30,
      type: 'reef',
    },
    {
      id: '9',
      name: 'The Yongala',
      location: 'Great Barrier Reef',
      country: 'Australia',
      region: 'Pacific Ocean',
      description:
        'Historic shipwreck with abundant marine life including sea turtles, rays, and bull sharks.',
      depth: 30,
      type: 'wreck',
    },
    {
      id: '10',
      name: 'Tubbataha Reefs',
      location: 'Sulu Sea',
      country: 'Philippines',
      region: 'Southeast Asia',
      description:
        'UNESCO World Heritage site with pristine coral reefs and rich biodiversity.',
      depth: 40,
      type: 'reef',
    },
    {
      id: '11',
      name: 'James Bond Beach',
      location: 'Nassau',
      country: 'Bahamas',
      region: 'Caribbean',
      description:
        'Featured in several James Bond films, with underwater movie props and wrecks.',
      depth: 20,
      type: 'wreck',
    },
    {
      id: '12',
      name: 'Navy Pier',
      location: 'Exmouth',
      country: 'Western Australia',
      region: 'Indian Ocean',
      description:
        'A shore dive with an amazing variety of marine life under a naval pier.',
      depth: 15,
      type: 'pier',
    },
  ];

  try {
    await storeDiveSitesInDatabase(defaultDiveSites);
    console.log('Default dive sites seeded to database');
    return defaultDiveSites;
  } catch (error) {
    console.error('Error seeding default dive sites:', error);

    // Last resort: Store in AsyncStorage
    try {
      await AsyncStorage.setItem(
        '@dive_sites',
        JSON.stringify(defaultDiveSites)
      );
      console.log('Default dive sites stored in AsyncStorage');
      return defaultDiveSites;
    } catch (storageError) {
      console.error(
        'Failed to store default dive sites in AsyncStorage:',
        storageError
      );
      return defaultDiveSites;
    }
  }
}

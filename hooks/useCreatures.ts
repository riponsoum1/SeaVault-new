import { useState, useEffect } from 'react';
import { database } from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import { Creature } from '../database/models/Creature';

export interface CreatureType {
  id: string;
  name: string;
  scientific_name?: string;
  description?: string;
  image_url?: string;
  rarity?: string;
  is_favorite?: boolean;
}

export const useCreatures = () => {
  const [creatures, setCreatures] = useState<CreatureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreatures();
  }, []);

  const loadCreatures = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get creatures from WatermelonDB first
      try {
        console.log('Attempting to load creatures from WatermelonDB...');
        const creaturesCollection = database.get<Creature>('creatures');
        const dbCreatures = await creaturesCollection.query().fetch();

        if (dbCreatures && dbCreatures.length > 0) {
          console.log(`Found ${dbCreatures.length} creatures in WatermelonDB`);

          // Convert from Watermelon models to plain objects
          const formattedCreatures = dbCreatures.map((creature) => ({
            id: creature.id,
            name: creature.name,
            scientific_name: creature.scientificName,
            description: creature.description,
            image_url: creature.imageUrl,
            rarity: creature.rarity,
          }));

          setCreatures(formattedCreatures);
          setLoading(false);
          return;
        }
      } catch (dbError) {
        console.warn('Could not read creatures from WatermelonDB:', dbError);
      }

      // Fallback to AsyncStorage
      try {
        console.log('Attempting to load creatures from AsyncStorage...');
        const storedCreatures = await AsyncStorage.getItem('@creatures');

        if (storedCreatures) {
          const parsedCreatures = JSON.parse(storedCreatures) as CreatureType[];
          console.log(
            `Found ${parsedCreatures.length} creatures in AsyncStorage`
          );
          setCreatures(parsedCreatures);
          setLoading(false);
          return;
        }
      } catch (storageError) {
        console.warn(
          'Could not read creatures from AsyncStorage:',
          storageError
        );
      }

      // If we couldn't get creatures from either source, we need to fetch from server
      console.log(
        'No local creatures found, check if online and fetch from server'
      );
      setError('No creatures found locally. Please sync when online.');
    } catch (e) {
      console.error('Error loading creatures:', e);
      setError('Failed to load creatures');
    } finally {
      setLoading(false);
    }
  };

  // Function to favorite/unfavorite a creature
  const toggleFavorite = async (creatureId: string) => {
    try {
      const creaturesCollection = database.get<Creature>('creatures');
      await database.write(async () => {
        try {
          const creature = await creaturesCollection.find(creatureId);
          await creature.update((record) => {
            record.isFavorite = !(record.isFavorite || false);
          });

          // Update state to reflect the change
          setCreatures((prev) =>
            prev.map((c) =>
              c.id === creatureId ? { ...c, is_favorite: !c.is_favorite } : c
            )
          );
        } catch (error) {
          console.error('Failed to toggle favorite status:', error);

          // Fallback to updating just the state if DB update fails
          setCreatures((prev) =>
            prev.map((c) =>
              c.id === creatureId ? { ...c, is_favorite: !c.is_favorite } : c
            )
          );
        }
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);

      // Always update the state even if DB operations fail
      setCreatures((prev) =>
        prev.map((c) =>
          c.id === creatureId ? { ...c, is_favorite: !c.is_favorite } : c
        )
      );
    }
  };

  return {
    creatures,
    loading,
    error,
    refreshCreatures: loadCreatures,
    toggleFavorite,
  };
};

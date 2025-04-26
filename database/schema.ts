import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'supabase_id', type: 'string', isIndexed: true },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'full_name', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'membership_tier', type: 'string', isOptional: true },
        { name: 'last_synced_at', type: 'number' },
      ],
    }),
    // Add more tables for your app's data models
    // Example: Dives, Trips, Equipment, etc.
    tableSchema({
      name: 'dives',
      columns: [
        { name: 'dive_date', type: 'number' },
        { name: 'location', type: 'string' },
        { name: 'depth', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'trip_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number' },
        { name: 'location', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    // Add creatures table for offline use
    tableSchema({
      name: 'creatures',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'scientific_name', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'rarity', type: 'string', isOptional: true },
        { name: 'class', type: 'string', isOptional: true },
        { name: 'points', type: 'number', isOptional: true },
        { name: 'is_favorite', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add categories table for offline use
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'emoji', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add sightings table to track user creature sightings
    tableSchema({
      name: 'sightings',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'creature_id', type: 'string', isIndexed: true },
        { name: 'dive_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'sighted_at', type: 'number' },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add dive_sites table for offline use
    tableSchema({
      name: 'dive_sites',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'country', type: 'string', isOptional: true },
        { name: 'region', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'depth', type: 'number', isOptional: true },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'type', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

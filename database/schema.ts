import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
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
        { name: 'rarity', type: 'string', isOptional: true },
        { name: 'is_favorite', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

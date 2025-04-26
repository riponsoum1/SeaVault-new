import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { tableSchema } from '@nozbe/watermelondb';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        // Add any previous migration steps here
      ],
    },
    {
      toVersion: 3,
      steps: [
        // Add the categories table
        {
          type: 'create_table',
          schema: tableSchema({
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
        },
        // Add sightings table
        {
          type: 'create_table',
          schema: tableSchema({
            name: 'sightings',
            columns: [
              { name: 'user_id', type: 'string', isIndexed: true },
              { name: 'creature_id', type: 'string', isIndexed: true },
              {
                name: 'dive_id',
                type: 'string',
                isIndexed: true,
                isOptional: true,
              },
              { name: 'sighted_at', type: 'number' },
              { name: 'location', type: 'string', isOptional: true },
              { name: 'notes', type: 'string', isOptional: true },
              { name: 'is_synced', type: 'boolean' },
              { name: 'created_at', type: 'number' },
              { name: 'updated_at', type: 'number' },
            ],
          }),
        },
        // Add new columns to creatures table
        {
          type: 'add_columns',
          table: 'creatures',
          columns: [
            { name: 'category_id', type: 'string', isIndexed: true },
            { name: 'class', type: 'string', isOptional: true },
            { name: 'points', type: 'number', isOptional: true },
          ],
        },
      ],
    },
    {
      toVersion: 4,
      steps: [
        // Add dive_sites table
        {
          type: 'create_table',
          schema: tableSchema({
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
        },
      ],
    },
  ],
});

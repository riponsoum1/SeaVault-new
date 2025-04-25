import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
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
    },
  ],
});

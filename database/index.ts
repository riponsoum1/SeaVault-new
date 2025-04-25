import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { User } from './models/User';
import { Profile } from './models/Profile';
import { Dive } from './models/Dive';
import { Trip } from './models/Trip';
import { Creature } from './models/Creature';
// Import other models as needed

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'seavaultApp',
  jsi: true, // Enable JSI for better performance (optional)
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error);
  },
});

// Create the database
export const database = new Database({
  adapter,
  modelClasses: [
    User,
    Profile,
    Dive,
    Trip,
    Creature,
    // Add other models here
  ],
});

// Function to reset the database (useful for debugging/development)
export const resetDatabase = async () => {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};

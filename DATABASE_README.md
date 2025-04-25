# Offline Support with WatermelonDB

This app uses WatermelonDB for robust offline support, allowing users to continue using the app even when they're on boats or in remote dive locations without internet connectivity for 5-7 days.

## Overview

WatermelonDB is a high-performance reactive database for React Native that provides:

- Offline-first experience
- Efficient data synchronization
- Robust TypeScript support
- High performance even with large datasets

## Architecture

The database implementation consists of:

1. **Models**: Define the data structure for entities like Users, Profiles, Dives, and Trips
2. **Schema**: Define the database schema
3. **Sync**: Logic to synchronize data between local database and Supabase backend
4. **Hooks**: Custom hooks to interact with the database

## Key Features

### Offline Data Persistence

- All dive logs, trip information, and user data are stored locally
- Users can create, read, update, and delete records without internet connectivity
- Changes are queued for synchronization when connectivity is restored

### Synchronization

- Two-way sync between local database and Supabase
- Automatic sync when internet connectivity is detected
- Manual sync option via the SyncIndicator component
- Intelligent conflict resolution

### Network Status Monitoring

- Real-time monitoring of network connectivity
- Visual indicators showing online/offline status
- Last sync timestamp displayed to users

## Usage

### Database Hook

Use the `useDatabase` hook to interact with the local database:

```tsx
const { createDive, getDives, updateDive, deleteDive, sync, syncStatus } =
  useDatabase();

// Create a new dive
await createDive({
  diveDate: new Date(),
  location: 'Great Barrier Reef',
  depth: 18,
  duration: 45,
  notes: 'Saw a turtle!',
});

// Get all dives
const dives = await getDives();

// Update a dive
await updateDive(diveId, { notes: 'Updated notes about the dive' });

// Delete a dive
await deleteDive(diveId);

// Manually trigger synchronization
await sync();
```

### SyncIndicator Component

Add the `SyncIndicator` component to your UI to display sync status and allow manual synchronization:

```tsx
import SyncIndicator from '../components/SyncIndicator';

function MyScreen() {
  return (
    <View>
      <SyncIndicator />
      {/* Your screen content */}
    </View>
  );
}
```

## Adding New Models

To add a new data model:

1. Add a new table to the schema in `database/schema.ts`
2. Create a new model file in `database/models/`
3. Add the model to the database setup in `database/index.ts`
4. Update the sync logic in `database/sync.ts` to handle the new model

## Best Practices

- Always use the database hooks rather than directly accessing the database
- Let the synchronization handle data consistency between local and remote
- Design your UI to work seamlessly in both online and offline modes
- Show clear visual indicators of network status to users

## Troubleshooting

If you encounter issues with the database:

- Check network connectivity status
- Verify Supabase credentials and API access
- Look for console errors during synchronization
- Use the `resetDatabase()` function in development (with caution)

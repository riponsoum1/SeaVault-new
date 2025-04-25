# Implementing Supabase Synchronization for WatermelonDB

This guide explains how to set up synchronization between your WatermelonDB local database and Supabase backend.

## Supabase Database Setup

1. Create the necessary tables in your Supabase database that will mirror your local WatermelonDB models.
2. Add `deleted_at` timestamps to all tables to support soft deletes for synchronization.
3. Deploy the SQL migration in `supabase/migrations/001_watermelon_sync.sql`.

## Synchronization Functions

The synchronization implementation uses two main Postgres functions:

### 1. `pull_changes`

This function receives the user ID and the timestamp of the last sync and returns all changes since that time:

- New records
- Updated records
- Deleted records (soft-deleted)

### 2. `push_changes`

This function receives changes from the client and applies them to the database:

- Creates or updates records
- Soft-deletes records that were deleted locally

## How Synchronization Works

1. When a user gets online, or manually triggers a sync, the `synchronize` function in `database/sync.ts` is called.
2. The function uses WatermelonDB's sync engine to:
   - Pull changes from Supabase
   - Push local changes to Supabase
   - Resolve conflicts (last-write-wins strategy)
3. After sync completes, the user's `lastSyncedAt` timestamp is updated.

## Using Synchronization in Your App

### Automatic Sync

Synchronization happens automatically in several scenarios:

1. When the app comes online
2. When the user logs in
3. After creating, updating, or deleting records while online

### Manual Sync

Users can manually trigger synchronization using the SyncIndicator component:

```tsx
<SyncIndicator />
```

## Customizing Sync Behavior

You can customize how sync works by modifying:

1. The SQL functions in Supabase:

   - Change conflict resolution strategies
   - Add validation rules
   - Implement business logic

2. The `synchronize` function in `database/sync.ts`:
   - Add transaction batching for large datasets
   - Implement more sophisticated conflict resolution
   - Add sync progress indicators

## Troubleshooting

### Common Issues

1. **Sync conflicts**: By default, the last change wins. You may want to implement more nuanced conflict resolution.

2. **Missing data**: Ensure your schema matches between WatermelonDB and Supabase.

3. **Performance**: For very large datasets, consider:
   - Adding pagination to sync
   - Using incremental sync strategies
   - Implementing delta encoding

### Debugging Sync

To debug sync issues:

1. Check the console.log outputs for errors
2. Use the `resetDatabase()` function for testing (with caution!)
3. Analyze the Supabase logs for backend errors

## Security Considerations

The current implementation relies on client-side filtering by user_id. For production use, you should:

1. Add Row Level Security (RLS) policies in Supabase
2. Ensure the sync functions respect these policies
3. Add proper authentication to all sync operations

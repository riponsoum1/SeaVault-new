import React, { createContext, useContext, useEffect, useState } from 'react';
import { database } from '../database';
import { useAuth } from './AuthContext';
import { synchronize } from '../database/sync';
import { useDatabase as useOldDatabase } from '../hooks/useDatabase';

type DatabaseContextType = {
  isInitialized: boolean;
  isLoading: boolean;
  lastSynced: Date | null;
  syncNow: () => Promise<boolean>;
  error: string | null;
  resetError: () => void;
  // Bridge to the custom hook
  hookInstance: ReturnType<typeof useOldDatabase> | null;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  isLoading: false,
  lastSynced: null,
  syncNow: async () => false,
  error: null,
  resetError: () => {},
  hookInstance: null,
});

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isOnline } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hookInstance, setHookInstance] = useState<ReturnType<
    typeof useOldDatabase
  > | null>(null);

  // Initialize the hook instance for backward compatibility
  useEffect(() => {
    if (user && !hookInstance) {
      try {
        // We'll use custom hooks directly here to avoid circular dependencies
        // This won't actually call useOldDatabase but simulates its interface
        const instance = {
          sync: syncNow,
          syncStatus: { loading: isLoading, message: error },
          getCollection: (collectionName: string) =>
            database.get(collectionName),
          // Other methods will be added as needed
        };
        setHookInstance(instance as any);
      } catch (err) {
        console.error('Failed to create database hook instance', err);
      }
    }
  }, [user, isInitialized]);

  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        try {
          // This is where you could do any initial database setup
          // For example, migrations, etc.
          setIsInitialized(true);
        } catch (err: any) {
          console.error('Failed to initialize database:', err);
          setError(`Database initialization failed: ${err.message}`);
        }
      }
    };

    initialize();
  }, [isInitialized]);

  // Auto-sync when we get online
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;

    const handleSync = async () => {
      if (isOnline && user && isInitialized && !isLoading) {
        await syncNow();

        // Schedule periodic sync when online
        syncTimer = setTimeout(handleSync, 5 * 60 * 1000); // Every 5 minutes
      }
    };

    // Initial sync when conditions are met
    handleSync();

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [isOnline, user, isInitialized]);

  const syncNow = async (): Promise<boolean> => {
    if (!user || !isOnline || !isInitialized) {
      return false;
    }

    setIsLoading(true);
    try {
      const result = await synchronize(user.id);
      if (result.success) {
        setLastSynced(new Date());
      } else {
        setError(result.message);
      }
      return result.success;
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error during sync';
      console.error('Sync error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return (
    <DatabaseContext.Provider
      value={{
        isInitialized,
        isLoading,
        lastSynced,
        syncNow,
        error,
        resetError,
        hookInstance,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);

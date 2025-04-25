import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export const useLastSyncTime = () => {
  const { user } = useAuth();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLastSyncTime();
  }, [user?.id]);

  const loadLastSyncTime = async () => {
    setLoading(true);
    try {
      // Try to get user-specific sync time first
      if (user?.id) {
        const userSyncTime = await AsyncStorage.getItem(
          `@user_last_sync_${user.id}`
        );
        if (userSyncTime) {
          setLastSyncTime(new Date(parseInt(userSyncTime)));
          setLoading(false);
          return;
        }
      }

      // Fall back to global sync time
      const globalSyncTime = await AsyncStorage.getItem('@last_sync_time');
      if (globalSyncTime) {
        setLastSyncTime(new Date(parseInt(globalSyncTime)));
      } else {
        setLastSyncTime(null);
      }
    } catch (error) {
      console.error('Error loading last sync time:', error);
      setLastSyncTime(null);
    } finally {
      setLoading(false);
    }
  };

  // Format the last sync time for display
  const formatLastSyncTime = (): string => {
    if (!lastSyncTime) return 'Never';

    // Format as "Today at 12:34 PM" or "Jan 1, 2023 at 12:34 PM"
    const now = new Date();
    const isToday =
      lastSyncTime.getDate() === now.getDate() &&
      lastSyncTime.getMonth() === now.getMonth() &&
      lastSyncTime.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today at ${lastSyncTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return lastSyncTime.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return {
    lastSyncTime,
    lastSyncTimeFormatted: formatLastSyncTime(),
    loading,
    refreshLastSyncTime: loadLastSyncTime,
  };
};

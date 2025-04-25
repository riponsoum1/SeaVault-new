import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';

export default function SyncIndicator() {
  const { isOnline, lastSynced } = useAuth();
  const { isLoading, syncNow, error } = useDatabase();

  const formatLastSynced = () => {
    if (!lastSynced) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSynced.getTime();

    // Less than a minute
    if (diff < 60 * 1000) {
      return 'Just now';
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Format date
    return lastSynced.toLocaleDateString();
  };

  const handleSync = async () => {
    if (isOnline && !isLoading) {
      await syncNow();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.indicator,
            { backgroundColor: isOnline ? '#4CAF50' : '#F44336' },
          ]}
        />
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>

      <View style={styles.syncContainer}>
        <Text style={styles.syncText}>
          {isLoading ? 'Syncing...' : `Last synced: ${formatLastSynced()}`}
        </Text>

        <TouchableOpacity
          onPress={handleSync}
          disabled={!isOnline || isLoading}
          style={[
            styles.syncButton,
            (!isOnline || isLoading) && styles.syncButtonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="sync"
                size={18}
                color={!isOnline || isLoading ? '#999' : '#fff'}
              />
              <Text
                style={[
                  styles.syncButtonText,
                  (!isOnline || isLoading) && styles.syncButtonTextDisabled,
                ]}
              >
                Sync
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncText: {
    fontSize: 12,
    color: '#777',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  syncButtonTextDisabled: {
    color: '#999',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
});

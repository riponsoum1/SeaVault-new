import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { useSyncNotification } from '../context/SyncNotificationContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';

const SyncStatus: React.FC = () => {
  const { isOnline } = useAuth();
  const { lastSynced, isLoading, syncNow, error } = useDatabase();
  const { showNotification } = useSyncNotification();
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSynced) {
        setTimeAgo('Never');
        return;
      }

      const now = new Date();
      const synced = new Date(lastSynced);
      const diffMs = now.getTime() - synced.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        setTimeAgo(`${diffDays}d ago`);
      } else if (diffHours > 0) {
        setTimeAgo(`${diffHours}h ago`);
      } else if (diffMin > 0) {
        setTimeAgo(`${diffMin}m ago`);
      } else {
        setTimeAgo('Just now');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSynced]);

  const handleManualSync = async () => {
    if (!isOnline) {
      showNotification('Cannot sync while offline', 'error');
      return;
    }

    if (isLoading) {
      showNotification('Sync already in progress', 'info');
      return;
    }

    await syncNow();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        {isOnline ? (
          <Wifi size={16} color="#4caf50" style={styles.icon} />
        ) : (
          <WifiOff size={16} color="#f44336" style={styles.icon} />
        )}
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>

      <View style={styles.syncContainer}>
        <Text style={styles.syncLabel}>Last Sync: </Text>
        <Text style={styles.syncTime}>{timeAgo}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.syncButton,
          (!isOnline || isLoading) && styles.disabledButton,
        ]}
        onPress={handleManualSync}
        disabled={!isOnline || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <RefreshCw size={14} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Sync</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#121212',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncLabel: {
    fontSize: 14,
    color: '#999',
  },
  syncTime: {
    fontSize: 14,
    color: '#fff',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SyncStatus;

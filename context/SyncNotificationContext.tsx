import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

// Define the notification types
export type NotificationType = 'success' | 'error' | 'info';

// Define the context type
type SyncNotificationContextType = {
  showNotification: (message: string, type?: NotificationType) => void;
  hideNotification: () => void;
  isVisible: boolean;
};

// Create the context
const SyncNotificationContext = createContext<SyncNotificationContextType>({
  showNotification: () => {},
  hideNotification: () => {},
  isVisible: false,
});

// Default auto-hide duration
const DEFAULT_DURATION = 3000;

// Notification component
export const SyncNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<NotificationType>('info');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { isOnline } = useAuth();
  const { isLoading, lastSynced, error } = useDatabase();

  // Animation value
  const translateY = new Animated.Value(-100);

  // Function to show notification
  const showNotification = (
    newMessage: string,
    notificationType: NotificationType = 'info'
  ) => {
    setMessage(newMessage);
    setType(notificationType);
    setIsVisible(true);

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Auto-hide after duration
    const newTimeoutId = setTimeout(() => {
      hideNotification();
    }, DEFAULT_DURATION);

    setTimeoutId(newTimeoutId);

    // Animate in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  // Function to hide notification
  const hideNotification = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // Monitor connection status and sync state
  useEffect(() => {
    // Notify when connection changes
    if (isOnline) {
      showNotification('Online - Syncing data...', 'info');
    } else {
      showNotification(
        'Working offline - Changes will sync when online',
        'info'
      );
    }
  }, [isOnline]);

  // Monitor sync status
  useEffect(() => {
    if (isLoading) {
      showNotification('Syncing with server...', 'info');
    } else if (error) {
      showNotification(`Sync error: ${error}`, 'error');
    } else if (lastSynced && isOnline) {
      const formattedTime = new Date(lastSynced).toLocaleTimeString();
      showNotification(`Last synced at ${formattedTime}`, 'success');
    }
  }, [isLoading, error, lastSynced]);

  // Background color based on notification type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50'; // Green
      case 'error':
        return '#f44336'; // Red
      case 'info':
      default:
        return '#2196f3'; // Blue
    }
  };

  return (
    <SyncNotificationContext.Provider
      value={{
        showNotification,
        hideNotification,
        isVisible,
      }}
    >
      {children}

      {isVisible && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              transform: [{ translateY }],
              backgroundColor: getBackgroundColor(),
            },
          ]}
        >
          <Text style={styles.notificationText}>{message}</Text>
        </Animated.View>
      )}
    </SyncNotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 40, // Account for status bar
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  notificationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

// Hook to use the notification context
export const useSyncNotification = () => useContext(SyncNotificationContext);

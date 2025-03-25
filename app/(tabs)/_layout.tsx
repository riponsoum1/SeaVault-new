import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Chrome as Home, Search, Plus, List, User } from 'lucide-react-native';
import { useSubscription } from '../../hooks/useSubscription';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { supabase } from '../../lib/supabase'; // update if needed

export default function TabLayout() {
  const { loading, hasPro } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    const enforceProAccess = async () => {
      if (hasPro) return;

      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'pro',
      });

      const customerInfo = await Purchases.getCustomerInfo();
      const hasProNow = !!customerInfo.entitlements.active['pro'];

      if (!hasProNow) {
        await supabase.auth.signOut();
        await Purchases.logOut();
        router.replace('/auth/login'); // or '/auth/signup' if that's your main entry
      }
    };

    if (!loading) {
      enforceProAccess();
    }
  }, [loading, hasPro]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="creatures"
        options={{
          title: 'Collection',
          tabBarIcon: ({ size, color }) => (
            <List size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="creature"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
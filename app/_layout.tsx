import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { supabase } from '@/lib/supabase';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { DiveLogProvider } from '../context/DiveLogContext';

function InnerLayout() {
  const { user, loading: authLoading } = useAuth();
  const [checkingSub, setCheckingSub] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const isAuthRoute = segments[0] === 'auth';

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || isAuthRoute) {
        setCheckingSub(false);
        return;
      }

      try {
        // Ensure Purchases is tied to logged-in Supabase user
        await Purchases.logIn(user.id);

        const info = await Purchases.getCustomerInfo();
        const hasPro = !!info.entitlements.active['pro'];

        if (!hasPro) {
          await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: 'pro',
          });

          const updated = await Purchases.getCustomerInfo();
          const stillNoPro = !updated.entitlements.active['pro'];

          if (stillNoPro) {
            await supabase.auth.signOut();
            await Purchases.logOut();
            router.replace('/auth/login');
            return;
          }
        }
      } catch (err) {
        console.warn('Access check failed:', err);
        router.replace('/auth/login');
      } finally {
        setCheckingSub(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [user, authLoading, isAuthRoute]);

  if (authLoading || checkingSub) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="creature/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="Select-Creatures" options={{ headerShown: false }} />
      <Stack.Screen name="account/edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="sightings" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function AppLayout() {
  useEffect(() => {
    const apiKey =
      Platform.OS === 'ios'
        ? Constants.expoConfig?.extra?.REVENUECAT_IOS_API_KEY
        : Constants.expoConfig?.extra?.REVENUECAT_ANDROID_API_KEY;

    if (apiKey) {
      Purchases.configure({ apiKey });
    } else {
      console.warn('RevenueCat API key not found in Constants');
    }
  }, []);

  return (
    <AuthProvider>
      <DiveLogProvider>
        <InnerLayout />
      </DiveLogProvider>
    </AuthProvider>
  );
}
import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter, useSegments, Slot } from 'expo-router';
import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { supabase } from '../lib/supabase';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { DiveLogProvider } from '../context/DiveLogContext';
import { DatabaseProvider } from '../context/DatabaseContext';
import { useOnboardingStore } from '../stores/onboardingStore';
import { setupNetworkListener } from '../database/sync';
import { SyncNotificationProvider } from '@/context/SyncNotificationContext';

// Set this to false before production
const IS_DEVELOPMENT = true;

function InnerLayout() {
  const { user, loading: authLoading } = useAuth();
  const hasSeenOnboarding = useOnboardingStore(
    (state) => state.hasSeenOnboarding
  );
  const [checkingSub, setCheckingSub] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const isAuthRoute = segments[0] === 'auth';
  const isOnboardingRoute = segments[0] === 'onboarding';
  const isDevRoute = segments[0] === 'dev';

  useEffect(() => {
    if (authLoading || isAuthRoute || isOnboardingRoute) return;

    const checkAccess = async () => {
      if (!user) {
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
      } finally {
        setCheckingSub(false);
      }
    };

    checkAccess();
  }, [user, authLoading, isAuthRoute, isOnboardingRoute, router]);

  useEffect(() => {
    if (authLoading || isDevRoute) return;

    // Delay navigation until after initial render
    const timer = setTimeout(() => {
      // First-time user flow: Show onboarding first
      if (!hasSeenOnboarding && !isOnboardingRoute) {
        router.replace('/onboarding');
        return;
      }

      // User has seen onboarding but not logged in: go to signup/login
      if (hasSeenOnboarding && !user && !isAuthRoute) {
        router.replace('/auth/signup');
        return;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [
    authLoading,
    user,
    hasSeenOnboarding,
    isOnboardingRoute,
    isAuthRoute,
    isDevRoute,
    router,
  ]);

  if (authLoading || checkingSub) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Slot />
      {IS_DEVELOPMENT && (
        <TouchableOpacity
          style={styles.devButton}
          onPress={() => router.push('/dev')}
        >
          <Text style={styles.devButtonText}>DEV</Text>
        </TouchableOpacity>
      )}
    </>
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

    // Initialize network listener for offline-to-online sync
    setupNetworkListener();
  }, []);

  return (
    <AuthProvider>
      <DatabaseProvider>
        <SyncNotificationProvider>
          <DiveLogProvider>
            <InnerLayout />
          </DiveLogProvider>
        </SyncNotificationProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  devButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  devButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

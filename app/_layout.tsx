import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter, useSegments, Slot } from 'expo-router';
import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { supabase } from '@/lib/supabase';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { DiveLogProvider } from '../context/DiveLogContext';
import {
  OnboardingProvider,
  useOnboarding,
} from '../context/OnboardingContext';

function InnerLayout() {
  const { user, loading: authLoading } = useAuth();
  const { hasSeenOnboarding } = useOnboarding();
  const [checkingSub, setCheckingSub] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const isAuthRoute = segments[0] === 'auth';
  const isOnboardingRoute = segments[0] === 'onboarding';

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
    if (
      !authLoading &&
      !user &&
      !hasSeenOnboarding &&
      !isOnboardingRoute &&
      !isAuthRoute
    ) {
      // Delay navigation until after initial render
      const timer = setTimeout(() => {
        router.replace('/onboarding');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [
    authLoading,
    user,
    hasSeenOnboarding,
    isOnboardingRoute,
    isAuthRoute,
    router,
  ]);

  if (authLoading || checkingSub) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
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
      <OnboardingProvider>
        <DiveLogProvider>
          <InnerLayout />
        </DiveLogProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

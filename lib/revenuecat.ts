import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const configureRevenueCat = () => {
  const apiKey =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.extra?.REVENUECAT_IOS_API_KEY
      : Constants.expoConfig?.extra?.REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('🚨 RevenueCat API Key not found!');
    return;
  }

  Purchases.configure({ apiKey });
};
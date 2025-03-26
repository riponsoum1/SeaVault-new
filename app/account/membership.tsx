import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Purchases from 'react-native-purchases';

export default function MembershipScreen() {
  const [plan, setPlan] = useState('Checking...');

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        if (info.entitlements.active['pro']) {
          const entitlement = info.entitlements.active['pro'];
          setPlan(entitlement.periodType === 'trial' ? 'Free Trial' : 'Active Subscription');
        } else {
          setPlan('Free Account');
        }
      } catch (error) {
        console.error('Failed to fetch subscription info:', error);
        setPlan('Error fetching plan');
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const openManageSubscription = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch (error) {
      console.error('Failed to open subscription settings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Membership</Text>
      <Text style={styles.planText}>Current Plan: {plan}</Text>

      <TouchableOpacity style={styles.button} onPress={openManageSubscription}>
        <Text style={styles.buttonText}>Manage Subscription</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  planText: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
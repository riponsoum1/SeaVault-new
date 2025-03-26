import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';

export const useSubscription = () => {
  const [loading, setLoading] = useState(true);
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active["pro"]; // 👈 must match your RevenueCat dashboard
        setHasPro(!!entitlement);
      } catch (err) {
        console.warn("Error checking subscription", err);
        setHasPro(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  return { loading, hasPro };
};
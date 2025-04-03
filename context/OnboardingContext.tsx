import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type OnboardingContextType = {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { user } = useAuth();

  // When user logs in, sync their onboarding status from Supabase
  useEffect(() => {
    if (user) {
      syncOnboardingStatus();
    }
  }, [user]);

  const syncOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_seen_onboarding')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      // Only update local state if user hasn't seen onboarding locally
      if (!hasSeenOnboarding) {
        setHasSeenOnboarding(data?.has_seen_onboarding ?? false);
      } else if (!data?.has_seen_onboarding) {
        // If they've seen it locally but not in DB, update DB
        await updateOnboardingStatus(true);
      }
    } catch (error) {
      console.error('Error syncing onboarding status:', error);
    }
  };

  const updateOnboardingStatus = async (value: boolean) => {
    // Always update local state immediately
    setHasSeenOnboarding(value);
    
    // If user is logged in, also update Supabase
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ has_seen_onboarding: value })
          .eq('id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
  };

  return (
    <OnboardingContext.Provider 
      value={{ 
        hasSeenOnboarding, 
        setHasSeenOnboarding: updateOnboardingStatus 
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
} 
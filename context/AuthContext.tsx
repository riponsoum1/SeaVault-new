import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { database } from '../database';
import { synchronize } from '../database/sync';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { User as WatermelonUser } from '../database/models/User';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  userProfile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  syncData: () => Promise<{ success: boolean; message: string }>;
  isOnline: boolean;
  lastSynced: Date | null;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  membership_tier: 'free' | 'premium' | null;
  created_at: string;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  error: null,
  clearError: () => {},
  userProfile: null,
  refreshProfile: async () => {},
  updateUserProfile: async () => {},
  updateUserEmail: async () => {},
  updateUserPassword: async () => {},
  syncData: async () => ({ success: false, message: 'Not implemented' }),
  isOnline: false,
  lastSynced: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const clearError = () => setError(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== null ? state.isConnected : false);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected !== null ? state.isConnected : false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync data with Supabase when connectivity changes
  useEffect(() => {
    const handleSync = async () => {
      if (isOnline && user) {
        await syncData();
      }
    };

    handleSync();
  }, [isOnline, user]);

  const syncData = async () => {
    if (!user) {
      return { success: false, message: 'No user logged in' };
    }

    if (!isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      const result = await synchronize(user.id);
      if (result.success) {
        setLastSynced(new Date());
      }
      return result;
    } catch (error: any) {
      console.error('Sync error:', error);
      return { success: false, message: error.message || 'Sync error' };
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const updateUserEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Failed to update email');
      throw error;
    }
  };

  const updateUserPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        await Purchases.logIn(userId);
        await Purchases.syncPurchases();
      }

      // Don't navigate immediately - let the layout handle it
      // router.replace('/');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        await Purchases.logIn(userId);
        await Purchases.syncPurchases();

        // Initialize local database with user data
        try {
          // Check if user already exists in local DB
          const usersCollection = database.get<WatermelonUser>('users');
          const existingUser = await usersCollection
            .query(Q.where('supabase_id', userId))
            .fetch();

          if (existingUser.length === 0) {
            // Create user in local DB
            await database.write(async () => {
              await usersCollection.create((record) => {
                record.supabaseId = userId;
                record.email = email;
                record.lastSyncedAt = Date.now();
              });
            });
          }

          // Sync data from Supabase
          await syncData();
        } catch (dbError: any) {
          console.error('Error initializing offline database:', dbError);
        }
      }

      // Don't navigate immediately - let the layout handle it
      // router.replace('/');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      clearError();

      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return;
      }

      await Purchases.logOut();
      // Navigation will be handled by the layout
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);

          // Re-sync data when auth state changes
          if (isOnline) {
            await syncData();
          }
        } else {
          setUserProfile(null);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);

        // Initial sync
        if (isOnline) {
          await syncData();
        }
      }

      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUp,
        signIn,
        signOut,
        error,
        clearError,
        userProfile,
        refreshProfile,
        updateUserProfile,
        updateUserEmail,
        updateUserPassword,
        syncData,
        isOnline,
        lastSynced,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

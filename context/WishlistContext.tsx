import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Wishlist } from '../lib/types';

type WishlistContextType = {
  wishlistItems: string[];
  loading: boolean;
  error: string | null;
  addToWishlist: (creatureId: string) => Promise<void>;
  removeFromWishlist: (creatureId: string) => Promise<void>;
  isInWishlist: (creatureId: string) => boolean;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType>({
  wishlistItems: [],
  loading: false,
  error: null,
  addToWishlist: async () => {},
  removeFromWishlist: async () => {},
  isInWishlist: () => false,
  refreshWishlist: async () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshWishlist = async () => {
    if (!user) {
      setWishlistItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('wishlists')
        .select('creature_id')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const wishlistIds = data.map((item: Wishlist) => item.creature_id);
      setWishlistItems(wishlistIds);
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      setError(error.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (creatureId: string) => {
    if (!user) {
      setError('You must be logged in to add to wishlist');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if already in wishlist
      if (wishlistItems.includes(creatureId)) {
        return;
      }

      const { error } = await supabase
        .from('wishlists')
        .insert([
          {
            user_id: user.id,
            creature_id: creatureId,
          },
        ]);

      if (error) {
        throw error;
      }

      // Update local state
      setWishlistItems([...wishlistItems, creatureId]);
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      setError(error.message || 'Failed to add to wishlist');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (creatureId: string) => {
    if (!user) {
      setError('You must be logged in to remove from wishlist');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('creature_id', creatureId);

      if (error) {
        throw error;
      }

      // Update local state
      setWishlistItems(wishlistItems.filter(id => id !== creatureId));
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      setError(error.message || 'Failed to remove from wishlist');
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (creatureId: string) => {
    return wishlistItems.includes(creatureId);
  };

  // Load wishlist when user changes
  useEffect(() => {
    refreshWishlist();
  }, [user]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        error,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
/*
  # Fix wishlist policies

  This migration checks if the wishlists table exists and if not, creates it.
  It also adds policies only if they don't already exist.
*/

-- Check if table exists and create if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wishlists') THEN
    -- Create the wishlists table
    CREATE TABLE wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, creature_id)
    );

    -- Enable Row Level Security
    ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists(user_id);
    CREATE INDEX IF NOT EXISTS wishlists_creature_id_idx ON wishlists(creature_id);
  END IF;
END $$;

-- Check if policies exist and create if not
DO $$ 
BEGIN
  -- Check for select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wishlists' 
    AND policyname = 'Users can view their own wishlist'
  ) THEN
    CREATE POLICY "Users can view their own wishlist"
      ON wishlists
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Check for insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wishlists' 
    AND policyname = 'Users can insert into their own wishlist'
  ) THEN
    CREATE POLICY "Users can insert into their own wishlist"
      ON wishlists
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Check for delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wishlists' 
    AND policyname = 'Users can delete from their own wishlist'
  ) THEN
    CREATE POLICY "Users can delete from their own wishlist"
      ON wishlists
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
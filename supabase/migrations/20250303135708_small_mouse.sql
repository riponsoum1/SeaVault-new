/*
  # Create wishlist table

  1. New Tables
    - `wishlists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `creature_id` (uuid, references creatures)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `wishlists` table
    - Add policies for authenticated users to manage their wishlist
*/

-- Check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'wishlists') THEN
    CREATE TABLE wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, creature_id)
    );
  END IF;
END $$;

-- Enable Row Level Security if not already enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'wishlists' 
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'wishlists'
      AND n.nspname = 'public'
      AND c.relrowsecurity = true
    )
  ) THEN
    ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlists;
  DROP POLICY IF EXISTS "Users can insert into their own wishlist" ON wishlists;
  DROP POLICY IF EXISTS "Users can delete from their own wishlist" ON wishlists;
  
  -- Create policies
  CREATE POLICY "Users can view their own wishlist" 
    ON wishlists
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert into their own wishlist"
    ON wishlists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete from their own wishlist"
    ON wishlists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'wishlists' AND indexname = 'wishlists_user_id_idx'
  ) THEN
    CREATE INDEX wishlists_user_id_idx ON wishlists(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'wishlists' AND indexname = 'wishlists_creature_id_idx'
  ) THEN
    CREATE INDEX wishlists_creature_id_idx ON wishlists(creature_id);
  END IF;
END $$;
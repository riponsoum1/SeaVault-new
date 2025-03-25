/*
  # Enable public read access for profiles

  1. Changes
    - Enable RLS on profiles table
    - Add policy for public read access to all profiles
    - Remove existing restrictive policies
    - Add verification query

  2. Security
    - Maintains write protection
    - Only allows reading profile data
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policies
CREATE POLICY "Allow public read access for profiles"
ON profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify the changes
SELECT COUNT(*) FROM profiles;
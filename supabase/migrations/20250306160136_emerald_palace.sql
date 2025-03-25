/*
  # Enable public read access for sightings

  1. Changes
    - Enable RLS on sightings table
    - Add policy for public read access to sightings (for leaderboard)
    - Maintain existing write policies

  2. Security
    - Allows anyone to read sighting data (needed for leaderboard)
    - Maintains write protection
*/

-- Enable RLS
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can insert their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can update their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can delete their own sightings" ON sightings;

-- Create new policies
CREATE POLICY "Allow public read access for sightings"
ON sightings
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own sightings"
ON sightings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sightings"
ON sightings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sightings"
ON sightings
FOR DELETE
USING (auth.uid() = user_id);

-- Verify the changes
SELECT COUNT(*) FROM sightings;
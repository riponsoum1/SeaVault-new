/*
  # Add achievements system

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `icon_name` (text)
      - `points` (integer)
      - `created_at` (timestamp)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `achievement_id` (uuid, references achievements)
      - `unlocked_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access to achievements
    - Add policies for authenticated users to read their achievements
*/

-- Create achievements table if it doesn't exist
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_achievements table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access for achievements" ON achievements;
  DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Allow public read access for achievements"
  ON achievements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view their own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON user_achievements(achievement_id);

-- Insert achievements data
-- First, clear existing achievements to avoid conflicts
DELETE FROM achievements;

INSERT INTO achievements (code, name, description, category, icon_name, points) VALUES
  -- Beginner Achievements
  ('first_catch', 'First Catch', 'Log your first marine animal', 'beginner', 'Trophy', 10),
  ('getting_feet_wet', 'Getting Your Feet Wet', 'Log 5 different species', 'beginner', 'Trophy', 25),
  ('underwater_explorer', 'Underwater Explorer', 'Log 10 different species', 'beginner', 'Trophy', 50),
  
  -- Collection-Based Achievements
  ('marine_enthusiast', 'Marine Enthusiast', 'Log 25 different species', 'collection', 'Medal', 100),
  ('ocean_archivist', 'Ocean Archivist', 'Log 50 different species', 'collection', 'Medal', 200),
  ('sea_vault_master', 'Sea Vault Master', 'Log 100 different species', 'collection', 'Medal', 500),
  
  -- Location-Based Achievements
  ('local_diver', 'Local Diver', 'Log an animal in your home country', 'location', 'MapPin', 25),
  ('world_traveler', 'World Traveler', 'Log an animal in a different country', 'location', 'Globe', 50),
  ('deep_sea_voyager', 'Deep-Sea Voyager', 'Log animals in 3 different regions', 'location', 'Globe2', 100),
  
  -- Rare Encounters
  ('elusive_spotter', 'Elusive Spotter', 'Log a rare species', 'rare', 'Star', 100),
  ('shark_whisperer', 'Shark Whisperer', 'Log any species of shark', 'rare', 'Swords', 75),
  ('manta_mania', 'Manta Mania', 'Log a manta ray', 'rare', 'Fish', 75),
  ('dolphin_friend', 'Dolphin Friend', 'Log any species of dolphin', 'rare', 'Heart', 75),
  ('whale_watcher', 'Whale Watcher', 'Log any whale species', 'rare', 'Whale', 100);
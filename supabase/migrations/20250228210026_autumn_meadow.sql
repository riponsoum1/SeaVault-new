/*
  # Create sightings table

  1. New Tables
    - `sightings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `creature_id` (uuid, references creatures)
      - `location` (text)
      - `date` (date)
      - `notes` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `sightings` table
    - Add policies for authenticated users to manage their own sightings
*/

CREATE TABLE IF NOT EXISTS sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sightings"
  ON sightings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sightings"
  ON sightings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sightings"
  ON sightings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sightings"
  ON sightings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS sightings_user_id_idx ON sightings(user_id);
CREATE INDEX IF NOT EXISTS sightings_creature_id_idx ON sightings(creature_id);
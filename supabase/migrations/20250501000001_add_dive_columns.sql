/*
  # Update sightings table for dive functionality

  1. Changes
    - Add dive_site_id column (replacing location)
    - Add creature_notes column
    - Add dive_notes column
    - Add time_of_day column
    - Add depth column
    - Add dive_type column
*/

-- Add new columns if they don't exist
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS dive_site_id UUID REFERENCES dive_sites(id);
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS creature_notes TEXT;
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS dive_notes TEXT;
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS time_of_day TEXT;
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS depth NUMERIC;
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS dive_type TEXT;

-- Make location column nullable since we're using dive_site_id now
ALTER TABLE sightings ALTER COLUMN location DROP NOT NULL; 
/*
  # Create dive_sites table and add sample data

  1. Changes
    - Create dive_sites table if it doesn't exist
    - Add sample dive sites with coordinates for testing
    - Set up RLS policies for the table
*/

-- Check if the table exists and create it if not
CREATE TABLE IF NOT EXISTS dive_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country TEXT,
  region TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE dive_sites ENABLE ROW LEVEL SECURITY;

-- Create policies for dive_sites
CREATE POLICY "Allow public read access for dive_sites"
  ON dive_sites
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert dive_sites"
  ON dive_sites
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update dive_sites"
  ON dive_sites
  FOR UPDATE
  TO authenticated
  USING (true);

-- Insert sample dive sites with coordinates
INSERT INTO dive_sites (name, description, latitude, longitude, country, region, difficulty)
VALUES
  ('Great Barrier Reef', 'The world''s largest coral reef system', -16.7505, 146.5153, 'Australia', 'Queensland', 'Beginner to Advanced'),
  ('Blue Hole', 'Famous dive site with a huge underwater sinkhole', 17.3162, -87.5351, 'Belize', 'Lighthouse Reef', 'Advanced'),
  ('Tubbataha Reefs', 'UNESCO World Heritage site with pristine coral reefs', 8.8167, 119.8833, 'Philippines', 'Sulu Sea', 'Intermediate'),
  ('Manta Ray Bay', 'Known for frequent manta ray sightings', -17.6709, 177.6383, 'Fiji', 'Yasawa Islands', 'Beginner'),
  ('SS Thistlegorm', 'Famous WWII shipwreck', 27.8119, 33.9207, 'Egypt', 'Red Sea', 'Intermediate'),
  ('Molokini Crater', 'Crescent-shaped, partially submerged volcanic crater', 20.6347, -156.4983, 'USA', 'Hawaii', 'Beginner'),
  ('Richelieu Rock', 'Horseshoe-shaped reef known for whale shark sightings', 9.3626, 98.3026, 'Thailand', 'Andaman Sea', 'Intermediate'),
  ('Poor Knights Islands', 'Marine reserve with caves and arches', -35.4483, 174.7397, 'New Zealand', 'North Island', 'Beginner to Intermediate'),
  ('Silfra Fissure', 'Dive between tectonic plates in crystal clear water', 64.2558, -21.1230, 'Iceland', 'Þingvellir National Park', 'Intermediate'),
  ('Raja Ampat', 'Epicenter of marine biodiversity', -0.5000, 130.5000, 'Indonesia', 'West Papua', 'Intermediate to Advanced');

-- Verify the inserts
SELECT COUNT(*) FROM dive_sites; 
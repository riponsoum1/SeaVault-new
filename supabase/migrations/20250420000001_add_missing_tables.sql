-- Create creatures table
CREATE TABLE IF NOT EXISTS creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scientific_name TEXT,
  description TEXT,
  rarity TEXT DEFAULT 'common',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sightings table
CREATE TABLE IF NOT EXISTS sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, creature_id)
);

-- Enable Row Level Security
ALTER TABLE creatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creatures are viewable by all users" ON creatures;
DROP POLICY IF EXISTS "Sightings are viewable by all users" ON sightings;
DROP POLICY IF EXISTS "Users can insert their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can update their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can delete their own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can view their wishlist items" ON wishlists;
DROP POLICY IF EXISTS "Users can insert their own wishlist items" ON wishlists;
DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON wishlists;

-- Create RLS policies
CREATE POLICY "Creatures are viewable by all users"
  ON creatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sightings are viewable by all users"
  ON sightings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own sightings"
  ON sightings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sightings"
  ON sightings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sightings"
  ON sightings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their wishlist items"
  ON wishlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items"
  ON wishlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
  ON wishlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id); 
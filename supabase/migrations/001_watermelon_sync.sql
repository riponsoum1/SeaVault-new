-- Helper function to convert epoch timestamps to PostgreSQL timestamps
CREATE OR REPLACE FUNCTION epoch_to_timestamp(epoch text) 
RETURNS timestamp with time zone AS $$
BEGIN
  RETURN timestamp with time zone 'epoch' + ((epoch::bigint) / 1000) * interval '1 second';
END;
$$ LANGUAGE plpgsql;

-- Helper function to convert PostgreSQL timestamps to epoch timestamps
CREATE OR REPLACE FUNCTION timestamp_to_epoch(ts timestamp with time zone) 
RETURNS bigint AS $$
BEGIN
  RETURN (
    extract(
      epoch
      from ts
    ) * 1000
  )::bigint;
END;
$$ LANGUAGE plpgsql;

-- Add required columns to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create view for syncing profiles
CREATE OR REPLACE VIEW sync_profiles_view AS
SELECT 
  id,
  email,
  full_name,
  avatar_url,
  membership_tier,
  created_at,
  updated_at,
  deleted_at,
  COALESCE(deleted_at, updated_at, created_at) as last_modified_at
FROM profiles;

-- First, let's create the necessary tables that are missing
-- Creating dives table if it doesn't exist
CREATE TABLE IF NOT EXISTS dives (
  id UUID PRIMARY KEY,
  dive_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  depth NUMERIC,
  duration NUMERIC,
  notes TEXT,
  profile_id UUID REFERENCES profiles(id),
  trip_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Creating trips table if it doesn't exist
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY,
  name TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create view for syncing dives
CREATE OR REPLACE VIEW sync_dives_view AS
SELECT 
  id,
  dive_date,
  location,
  depth,
  duration,
  notes,
  profile_id,
  trip_id,
  created_at,
  updated_at,
  deleted_at,
  COALESCE(deleted_at, updated_at, created_at) as last_modified_at
FROM dives;

-- Create view for syncing trips
CREATE OR REPLACE VIEW sync_trips_view AS
SELECT 
  id,
  name,
  start_date,
  end_date,
  location,
  notes,
  profile_id,
  created_at,
  updated_at,
  deleted_at,
  COALESCE(deleted_at, updated_at, created_at) as last_modified_at
FROM trips;

-- Function to pull changes since the last sync
CREATE OR REPLACE FUNCTION pull_changes(user_id uuid, last_pulled_at bigint DEFAULT 0)
RETURNS jsonb AS $$
DECLARE
  _ts timestamp with time zone;
  _profiles jsonb;
  _dives jsonb;
  _trips jsonb;
BEGIN
  -- Convert last_pulled_at to timestamp
  _ts := to_timestamp(last_pulled_at / 1000);
  
  -- Get changed profiles
  SELECT jsonb_build_object(
    'created', '[]'::jsonb,
    'updated', 
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'email', p.email,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'membership_tier', p.membership_tier,
          'created_at', timestamp_to_epoch(p.created_at),
          'updated_at', timestamp_to_epoch(COALESCE(p.updated_at, p.created_at))
        )
      ) FILTER (WHERE p.deleted_at IS NULL AND p.last_modified_at > _ts),
      '[]'::jsonb
    ),
    'deleted',
    COALESCE(
      jsonb_agg(p.id) FILTER (WHERE p.deleted_at IS NOT NULL AND p.last_modified_at > _ts),
      '[]'::jsonb
    )
  ) INTO _profiles
  FROM sync_profiles_view p
  WHERE p.id = user_id;
  
  -- Get changed dives
  SELECT jsonb_build_object(
    'created', '[]'::jsonb,
    'updated', 
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'dive_date', timestamp_to_epoch(d.dive_date),
          'location', d.location,
          'depth', d.depth,
          'duration', d.duration,
          'notes', d.notes,
          'profile_id', d.profile_id,
          'trip_id', d.trip_id,
          'created_at', timestamp_to_epoch(d.created_at),
          'updated_at', timestamp_to_epoch(COALESCE(d.updated_at, d.created_at))
        )
      ) FILTER (WHERE d.deleted_at IS NULL AND d.last_modified_at > _ts),
      '[]'::jsonb
    ),
    'deleted',
    COALESCE(
      jsonb_agg(d.id) FILTER (WHERE d.deleted_at IS NOT NULL AND d.last_modified_at > _ts),
      '[]'::jsonb
    )
  ) INTO _dives
  FROM sync_dives_view d
  WHERE d.profile_id = user_id;
  
  -- Get changed trips
  SELECT jsonb_build_object(
    'created', '[]'::jsonb,
    'updated', 
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'start_date', timestamp_to_epoch(t.start_date),
          'end_date', timestamp_to_epoch(t.end_date),
          'location', t.location,
          'notes', t.notes,
          'profile_id', t.profile_id,
          'created_at', timestamp_to_epoch(t.created_at),
          'updated_at', timestamp_to_epoch(COALESCE(t.updated_at, t.created_at))
        )
      ) FILTER (WHERE t.deleted_at IS NULL AND t.last_modified_at > _ts),
      '[]'::jsonb
    ),
    'deleted',
    COALESCE(
      jsonb_agg(t.id) FILTER (WHERE t.deleted_at IS NOT NULL AND t.last_modified_at > _ts),
      '[]'::jsonb
    )
  ) INTO _trips
  FROM sync_trips_view t
  WHERE t.profile_id = user_id;
  
  -- Return all changes
  RETURN jsonb_build_object(
    'changes', jsonb_build_object(
      'profiles', _profiles,
      'dives', _dives,
      'trips', _trips
    ),
    'timestamp', timestamp_to_epoch(now())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to push changes from the client
CREATE OR REPLACE FUNCTION push_changes(user_id uuid, changes jsonb)
RETURNS void AS $$
DECLARE
  -- Variables for iterating through records
  profile_record jsonb;
  dive_record jsonb;
  trip_record jsonb;
  profile_id text;
  dive_id text;
  trip_id text;
BEGIN
  -- Process profile changes
  -- Created and updated profiles
  FOR profile_record IN SELECT jsonb_array_elements(
    COALESCE(changes->'profiles'->'created', '[]'::jsonb) || 
    COALESCE(changes->'profiles'->'updated', '[]'::jsonb)
  )
  LOOP
    -- Upsert the profile
    INSERT INTO profiles (
      id, 
      email, 
      full_name, 
      avatar_url, 
      membership_tier, 
      created_at, 
      updated_at
    ) VALUES (
      (profile_record->>'id')::uuid,
      profile_record->>'email',
      profile_record->>'full_name',
      profile_record->>'avatar_url',
      profile_record->>'membership_tier',
      epoch_to_timestamp(profile_record->>'created_at'),
      epoch_to_timestamp(profile_record->>'updated_at')
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      membership_tier = EXCLUDED.membership_tier,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
  
  -- Deleted profiles
  FOR profile_id IN SELECT jsonb_array_elements_text(
    COALESCE(changes->'profiles'->'deleted', '[]'::jsonb)
  )
  LOOP
    UPDATE profiles 
    SET deleted_at = now() 
    WHERE id = profile_id::uuid;
  END LOOP;

  -- Process trip changes
  -- Created and updated trips
  FOR trip_record IN SELECT jsonb_array_elements(
    COALESCE(changes->'trips'->'created', '[]'::jsonb) || 
    COALESCE(changes->'trips'->'updated', '[]'::jsonb)
  )
  LOOP
    -- Upsert the trip
    INSERT INTO trips (
      id, 
      name, 
      start_date, 
      end_date, 
      location, 
      notes, 
      profile_id, 
      created_at, 
      updated_at
    ) VALUES (
      (trip_record->>'id')::uuid,
      trip_record->>'name',
      epoch_to_timestamp(trip_record->>'start_date'),
      epoch_to_timestamp(trip_record->>'end_date'),
      trip_record->>'location',
      trip_record->>'notes',
      (trip_record->>'profile_id')::uuid,
      epoch_to_timestamp(trip_record->>'created_at'),
      epoch_to_timestamp(trip_record->>'updated_at')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      location = EXCLUDED.location,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
  
  -- Deleted trips
  FOR trip_id IN SELECT jsonb_array_elements_text(
    COALESCE(changes->'trips'->'deleted', '[]'::jsonb)
  )
  LOOP
    UPDATE trips 
    SET deleted_at = now() 
    WHERE id = trip_id::uuid;
  END LOOP;

  -- Process dive changes
  -- Created and updated dives
  FOR dive_record IN SELECT jsonb_array_elements(
    COALESCE(changes->'dives'->'created', '[]'::jsonb) || 
    COALESCE(changes->'dives'->'updated', '[]'::jsonb)
  )
  LOOP
    -- Upsert the dive
    INSERT INTO dives (
      id, 
      dive_date, 
      location, 
      depth, 
      duration, 
      notes, 
      profile_id, 
      trip_id, 
      created_at, 
      updated_at
    ) VALUES (
      (dive_record->>'id')::uuid,
      epoch_to_timestamp(dive_record->>'dive_date'),
      dive_record->>'location',
      (dive_record->>'depth')::numeric,
      (dive_record->>'duration')::numeric,
      dive_record->>'notes',
      (dive_record->>'profile_id')::uuid,
      (dive_record->>'trip_id')::uuid,
      epoch_to_timestamp(dive_record->>'created_at'),
      epoch_to_timestamp(dive_record->>'updated_at')
    )
    ON CONFLICT (id) DO UPDATE SET
      dive_date = EXCLUDED.dive_date,
      location = EXCLUDED.location,
      depth = EXCLUDED.depth,
      duration = EXCLUDED.duration,
      notes = EXCLUDED.notes,
      trip_id = EXCLUDED.trip_id,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
  
  -- Deleted dives
  FOR dive_id IN SELECT jsonb_array_elements_text(
    COALESCE(changes->'dives'->'deleted', '[]'::jsonb)
  )
  LOOP
    UPDATE dives 
    SET deleted_at = now() 
    WHERE id = dive_id::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 
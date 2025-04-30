/*
  Offline-first sync functions for WatermelonDB
  This file defines the push and pull functions needed for WatermelonDB sync
*/

-- Helper function to convert epoch milliseconds to timestamp
CREATE OR REPLACE FUNCTION epoch_to_timestamp(epoch_ms BIGINT) 
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN to_timestamp(epoch_ms / 1000.0);
END;
$$ LANGUAGE plpgsql;

-- Helper function to convert timestamp to epoch milliseconds
CREATE OR REPLACE FUNCTION timestamp_to_epoch(ts TIMESTAMP WITH TIME ZONE) 
RETURNS BIGINT AS $$
BEGIN
  RETURN (EXTRACT(EPOCH FROM ts) * 1000)::BIGINT;
END;
$$ LANGUAGE plpgsql;

/*
 * PULL FUNCTION
 * Returns changes since last_pulled_at
 */
CREATE OR REPLACE FUNCTION pull_changes(last_pulled_at BIGINT)
RETURNS JSONB AS $$
DECLARE
  _ts TIMESTAMP WITH TIME ZONE;
  _changes JSONB;
BEGIN
  -- Convert the epoch time to timestamp
  _ts := epoch_to_timestamp(last_pulled_at);
  
  -- Build changes object for sightings
  WITH 
    created_sightings AS (
      SELECT 
        s.id,
        s.user_id,
        s.creature_id,
        s.dive_site_id,
        s.location,
        s.dive_type,
        s.time_of_day,
        s.depth,
        s.date,
        s.notes,
        s.image_url,
        s.created_at,
        s.updated_at
      FROM sightings s
      WHERE 
        s.created_at > _ts AND
        s.deleted_at IS NULL
    ),
    updated_sightings AS (
      SELECT 
        s.id,
        s.user_id,
        s.creature_id,
        s.dive_site_id,
        s.location,
        s.dive_type,
        s.time_of_day,
        s.depth,
        s.date,
        s.notes,
        s.image_url,
        s.created_at,
        s.updated_at
      FROM sightings s
      WHERE 
        s.updated_at > _ts AND
        s.created_at <= _ts AND
        s.deleted_at IS NULL
    ),
    deleted_sightings AS (
      SELECT s.id
      FROM sightings s
      WHERE 
        s.deleted_at > _ts AND
        s.deleted_at IS NOT NULL
    )
  SELECT
    jsonb_build_object(
      'sightings', jsonb_build_object(
        'created', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'user_id', c.user_id,
              'creature_id', c.creature_id,
              'dive_site_id', c.dive_site_id,
              'location', c.location,
              'dive_type', c.dive_type,
              'time_of_day', c.time_of_day,
              'depth', c.depth,
              'date', c.date,
              'notes', c.notes,
              'image_url', c.image_url,
              'created_at', timestamp_to_epoch(c.created_at),
              'updated_at', timestamp_to_epoch(c.updated_at)
            )
          ) FROM created_sightings c),
          '[]'::jsonb
        ),
        'updated', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', u.id,
              'user_id', u.user_id,
              'creature_id', u.creature_id,
              'dive_site_id', u.dive_site_id,
              'location', u.location,
              'dive_type', u.dive_type,
              'time_of_day', u.time_of_day,
              'depth', u.depth,
              'date', u.date,
              'notes', u.notes,
              'image_url', u.image_url,
              'created_at', timestamp_to_epoch(u.created_at),
              'updated_at', timestamp_to_epoch(u.updated_at)
            )
          ) FROM updated_sightings u),
          '[]'::jsonb
        ),
        'deleted', COALESCE(
          (SELECT jsonb_agg(d.id) FROM deleted_sightings d),
          '[]'::jsonb
        )
      )
    ) INTO _changes;

  -- Return the changes and current timestamp
  RETURN jsonb_build_object(
    'changes', _changes,
    'timestamp', timestamp_to_epoch(now())
  );
END;
$$ LANGUAGE plpgsql;

/*
 * PUSH FUNCTION
 * Applies changes from the client to the server
 */
CREATE OR REPLACE FUNCTION push_changes(changes JSONB)
RETURNS VOID AS $$
DECLARE
  sighting JSONB;
BEGIN
  -- Process created sightings
  IF (changes->'sightings'->'created') IS NOT NULL THEN
    FOR sighting IN SELECT * FROM jsonb_array_elements(changes->'sightings'->'created')
    LOOP
      INSERT INTO sightings (
        id,
        user_id,
        creature_id,
        dive_site_id,
        location,
        dive_type,
        time_of_day,
        depth,
        date,
        notes,
        image_url,
        created_at,
        updated_at
      ) VALUES (
        (sighting->>'id')::UUID,
        (sighting->>'user_id')::UUID,
        (sighting->>'creature_id')::UUID,
        (sighting->>'dive_site_id')::UUID,
        sighting->>'location',
        sighting->>'dive_type',
        sighting->>'time_of_day',
        (sighting->>'depth')::NUMERIC,
        (sighting->>'date')::DATE,
        sighting->>'notes',
        sighting->>'image_url',
        epoch_to_timestamp((sighting->>'created_at')::BIGINT),
        epoch_to_timestamp((sighting->>'updated_at')::BIGINT)
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- Process updated sightings
  IF (changes->'sightings'->'updated') IS NOT NULL THEN
    FOR sighting IN SELECT * FROM jsonb_array_elements(changes->'sightings'->'updated')
    LOOP
      UPDATE sightings
      SET
        user_id = (sighting->>'user_id')::UUID,
        creature_id = (sighting->>'creature_id')::UUID,
        dive_site_id = (sighting->>'dive_site_id')::UUID,
        location = sighting->>'location',
        dive_type = sighting->>'dive_type',
        time_of_day = sighting->>'time_of_day',
        depth = (sighting->>'depth')::NUMERIC,
        date = (sighting->>'date')::DATE,
        notes = sighting->>'notes',
        image_url = sighting->>'image_url',
        updated_at = epoch_to_timestamp((sighting->>'updated_at')::BIGINT)
      WHERE id = (sighting->>'id')::UUID;
    END LOOP;
  END IF;

  -- Process deleted sightings
  IF (changes->'sightings'->'deleted') IS NOT NULL THEN
    FOR sighting IN SELECT * FROM jsonb_array_elements_text(changes->'sightings'->'deleted')
    LOOP
      UPDATE sightings
      SET deleted_at = NOW()
      WHERE id = sighting::UUID;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql; 
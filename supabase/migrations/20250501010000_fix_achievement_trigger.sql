/*
  # Fix ambiguous achievement_id reference

  1. Changes
    - Update the handle_achievement_unlock trigger function to specify which table achievement_id comes from
*/

-- First drop the existing trigger if it exists
DROP TRIGGER IF EXISTS check_achievements_on_sighting ON sightings;

-- Now redefine the function with qualified column names
CREATE OR REPLACE FUNCTION handle_achievement_unlock()
RETURNS TRIGGER AS $$
DECLARE
  sightings_count INTEGER;
  unique_locations INTEGER;
  achievement_id UUID;
  achievement_code TEXT;
  should_unlock BOOLEAN;
BEGIN
  -- Get the count of unique creatures sighted by the user
  SELECT COUNT(DISTINCT creature_id) INTO sightings_count
  FROM sightings
  WHERE user_id = NEW.user_id;

  -- Get the count of unique locations
  SELECT COUNT(DISTINCT location) INTO unique_locations
  FROM sightings
  WHERE user_id = NEW.user_id;

  -- Check each achievement
  FOR achievement_id, achievement_code IN
    SELECT achievements.id, achievements.code FROM achievements
    WHERE achievements.id NOT IN (
      SELECT user_achievements.achievement_id FROM user_achievements WHERE user_achievements.user_id = NEW.user_id
    )
  LOOP
    should_unlock := CASE achievement_code
      WHEN 'first_catch' THEN sightings_count >= 1
      WHEN 'getting_feet_wet' THEN sightings_count >= 5
      WHEN 'underwater_explorer' THEN sightings_count >= 10
      WHEN 'marine_enthusiast' THEN sightings_count >= 25
      WHEN 'ocean_archivist' THEN sightings_count >= 50
      WHEN 'sea_vault_master' THEN sightings_count >= 100
      WHEN 'local_diver' THEN unique_locations >= 1
      WHEN 'world_traveler' THEN unique_locations >= 2
      WHEN 'deep_sea_voyager' THEN unique_locations >= 3
      WHEN 'shark_whisperer' THEN EXISTS (
        SELECT 1 FROM sightings
        WHERE user_id = NEW.user_id
        AND creature_id = 'b7c83fd5-3729-4620-92e5-a3a6452300f5'
      )
      WHEN 'manta_mania' THEN EXISTS (
        SELECT 1 FROM sightings
        WHERE user_id = NEW.user_id
        AND creature_id = 'dbc8a507-15ae-4227-93ef-054847f0e636'
      )
      WHEN 'dolphin_friend' THEN EXISTS (
        SELECT 1 FROM sightings
        WHERE user_id = NEW.user_id
        AND creature_id = '802ed0c6-3d09-41ba-afa5-f5012a93203d'
      )
      WHEN 'whale_watcher' THEN EXISTS (
        SELECT 1 FROM sightings
        WHERE user_id = NEW.user_id
        AND creature_id = '101e1c40-1b91-4968-bd23-e1e2160e6b3d'
      )
      ELSE false
    END;

    IF should_unlock THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.user_id, achievement_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger again
CREATE TRIGGER check_achievements_on_sighting
  AFTER INSERT ON sightings
  FOR EACH ROW
  EXECUTE FUNCTION handle_achievement_unlock(); 
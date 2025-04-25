/*
  # Remove has_seen_onboarding column from profiles

  1. Changes
    - Drop the has_seen_onboarding column from profiles table
    - This column was accidentally added and is not needed
*/

-- Remove the has_seen_onboarding column if it exists
ALTER TABLE IF EXISTS profiles
DROP COLUMN IF EXISTS has_seen_onboarding; 
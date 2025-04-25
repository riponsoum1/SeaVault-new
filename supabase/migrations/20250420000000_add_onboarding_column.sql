-- Add onboarding column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT false; 
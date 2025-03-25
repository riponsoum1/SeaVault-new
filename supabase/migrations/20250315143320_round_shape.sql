/*
  # Fix user achievements policies

  1. Changes
    - Add INSERT policy for user_achievements table
    - Ensure authenticated users can add their own achievements

  2. Security
    - Only allows users to insert their own achievements
    - Maintains existing read protection
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;

-- Recreate policies
CREATE POLICY "Users can view their own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Verify the changes
SELECT * FROM pg_policies WHERE tablename = 'user_achievements';
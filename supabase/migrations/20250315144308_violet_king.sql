/*
  # Update achievements table policies

  1. Changes
    - Add policies for full CRUD operations on achievements table
    - Maintain existing read access
    - Allow authenticated users to manage achievements

  2. Security
    - Maintains public read access
    - Adds insert/update/delete capabilities for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access for achievements" ON achievements;

-- Recreate policies with full CRUD access
CREATE POLICY "Allow public read access for achievements"
  ON achievements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert achievements"
  ON achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update achievements"
  ON achievements
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete achievements"
  ON achievements
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify the changes
SELECT * FROM pg_policies WHERE tablename = 'achievements';
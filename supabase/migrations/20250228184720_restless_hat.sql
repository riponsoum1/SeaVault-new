/*
  # Create marine animals database tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamptz, default now())
    - `creatures`
      - `id` (uuid, primary key)
      - `creature_id` (text, not null)
      - `name` (text, not null)
      - `scientific_name` (text, not null)
      - `category_id` (uuid, references categories.id)
      - `points` (integer, not null)
      - `description` (text, not null)
      - `habitat` (text, not null)
      - `diet` (text, not null)
      - `conservation_status` (text, not null)
      - `depth_range` (text, not null)
      - `length` (text, not null)
      - `weight` (text, not null)
      - `lifespan` (text, not null)
      - `image_url` (text)
      - `created_at` (timestamptz, default now())
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create creatures table
CREATE TABLE IF NOT EXISTS creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  habitat TEXT NOT NULL,
  diet TEXT NOT NULL,
  conservation_status TEXT NOT NULL,
  depth_range TEXT NOT NULL,
  length TEXT NOT NULL,
  weight TEXT NOT NULL,
  lifespan TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatures ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access for categories"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access for creatures"
  ON creatures
  FOR SELECT
  TO public
  USING (true);

-- Insert categories data
INSERT INTO categories (id, name, created_at)
VALUES
  ('48169dbe-0f42-4059-a6fb-842184ae60e2', 'Turtles', '2025-02-28 17:23:07.071451+00'),
  ('4fe5e0c2-d60d-49d2-9854-ed7bde02ec63', 'Rays', '2025-02-28 17:23:07.071451+00'),
  ('50d44a97-ec72-4c4f-9f66-e41c1621ded5', 'Reef Fish', '2025-02-28 17:23:07.071451+00'),
  ('8d2f3964-9332-4032-9bc1-815e3f72836b', 'Cephalopods', '2025-02-28 17:23:07.071451+00'),
  ('b7c83fd5-3729-4620-92e5-a3a6452300f5', 'Sharks', '2025-02-28 17:23:07.071451+00'),
  ('bdc2d112-78b2-47d6-9181-8e5ba48d7d7c', 'Mammals', '2025-02-28 17:23:07.071451+00');

-- Insert creatures data
INSERT INTO creatures (id, creature_id, name, scientific_name, category_id, points, description, habitat, diet, conservation_status, depth_range, length, weight, lifespan, image_url, created_at)
VALUES
  ('30aa90ae-d498-451c-9b51-a6a5448031c5', '001', 'Great White Shark', 'Carcharodon carcharias', 'b7c83fd5-3729-4620-92e5-a3a6452300f5', 500, 'The great white shark is a species of large mackerel shark which can be found in the coastal surface waters of all the major oceans.', 'Coastal and offshore waters', 'Carnivore - primarily seals, sea lions, and small whales', 'Vulnerable', '0-1200m', 'Up to 6.1m', 'Up to 1,905kg', '70+ years', 'https://images.unsplash.com/photo-1560275619-4cc5fa59d3ae?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('e2d01ae0-ae39-45e5-80b9-ffdf88742a3d', '002', 'Green Sea Turtle', 'Chelonia mydas', '48169dbe-0f42-4059-a6fb-842184ae60e2', 200, 'The green sea turtle is a large sea turtle and a member of the family Cheloniidae. Its distribution extends throughout tropical and subtropical seas around the world.', 'Tropical and subtropical seas', 'Herbivore - primarily seagrasses and algae', 'Endangered', '0-40m', 'Up to 1.5m', 'Up to 315kg', '80+ years', 'https://images.unsplash.com/photo-1591025207163-942350e47db2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('2eed2234-63e8-4288-86de-b330d8e2e894', '003', 'Clownfish', 'Amphiprion ocellaris', '50d44a97-ec72-4c4f-9f66-e41c1621ded5', 50, 'Clownfish or anemonefish are fishes from the subfamily Amphiprioninae in the family Pomacentridae. They form symbiotic mutualisms with sea anemones.', 'Coral reefs', 'Omnivore - algae, zooplankton, and invertebrates', 'Least Concern', '1-15m', 'Up to 11cm', 'Up to 120g', '6-10 years', 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('802ed0c6-3d09-41ba-afa5-f5012a93203d', '004', 'Bottlenose Dolphin', 'Tursiops truncatus', 'bdc2d112-78b2-47d6-9181-8e5ba48d7d7c', 300, 'Bottlenose dolphins are the most common members of the family Delphinidae, the family of oceanic dolphins. They are widespread, and can be found in most tropical and temperate oceans.', 'Coastal and offshore waters', 'Carnivore - primarily fish and squid', 'Least Concern', '0-300m', 'Up to 4m', 'Up to 650kg', '40-60 years', 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('dbc8a507-15ae-4227-93ef-054847f0e636', '005', 'Manta Ray', 'Mobula birostris', '4fe5e0c2-d60d-49d2-9854-ed7bde02ec63', 250, 'Manta rays are large rays belonging to the genus Mobula. They are circumglobal and are typically found in tropical and subtropical waters.', 'Tropical and subtropical waters', 'Filter feeder - primarily zooplankton', 'Vulnerable', '0-120m', 'Up to 7m wingspan', 'Up to 1,350kg', '40+ years', 'https://images.unsplash.com/photo-1621911864149-fc37d01a9326?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('fd5d9e54-f5f7-4df8-a00c-92fe76457e00', '006', 'Moray Eel', 'Muraenidae', '50d44a97-ec72-4c4f-9f66-e41c1621ded5', 150, 'Moray eels are a family of eels in the order Anguilliformes. They are cosmopolitan, found in warm and temperate seas, and are mainly marine.', 'Coral reefs and rocky areas', 'Carnivore - primarily fish and crustaceans', 'Not Evaluated', '0-100m', 'Up to 3m', 'Up to 30kg', '10-30 years', 'https://images.unsplash.com/photo-1545930952-e6c0462cda7b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('101e1c40-1b91-4968-bd23-e1e2160e6b3d', '007', 'Humpback Whale', 'Megaptera novaeangliae', 'bdc2d112-78b2-47d6-9181-8e5ba48d7d7c', 400, 'The humpback whale is a species of baleen whale. It is one of the larger rorqual species, with adults ranging in length from 12–16 m and weighing around 25–30 metric tons.', 'All major oceans', 'Filter feeder - primarily krill and small fish', 'Least Concern', '0-200m', 'Up to 16m', 'Up to 30,000kg', '45-100 years', 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00'),
  ('20a3de5d-c4f0-4c3b-9b92-8b4324577902', '008', 'Octopus', 'Octopus vulgaris', '8d2f3964-9332-4032-9bc1-815e3f72836b', 200, 'The common octopus is a mollusc belonging to the class Cephalopoda. Octopuses have two eyes and four pairs of arms and are bilaterally symmetric.', 'Coral reefs and rocky areas', 'Carnivore - primarily crustaceans and molluscs', 'Not Evaluated', '0-200m', 'Up to 1m', 'Up to 10kg', '1-2 years', 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80', '2025-02-28 17:23:07.071451+00');
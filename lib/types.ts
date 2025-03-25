export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Creature = {
  id: string;
  creature_id: string;
  name: string;
  scientific_name: string;
  category_id: string;
  points: number;
  description: string;
  habitat: string;
  diet: string;
  conservation_status: string;
  depth_range: string;
  length: string;
  weight: string;
  lifespan: string;
  image_url: string | null;
  created_at: string;
};

export type Sighting = {
  id: string;
  user_id: string;
  creature_id: string;
  location: string;
  date: string;
  notes: string;
  image_url: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  membership_tier: 'free' | 'premium' | null;
  created_at: string;
};

export type Wishlist = {
  id: string;
  user_id: string;
  creature_id: string;
  created_at: string;
};

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  points: number;
  created_at: string;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  created_at: string;
  achievement?: Achievement;
};
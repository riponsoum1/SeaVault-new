import { supabase } from './supabase';

export async function checkAndUpdateAchievements(userId: string) {
  try {
    // Get user's sightings
    const { data: sightings, error: sightingsError } = await supabase
      .from('sightings')
      .select('creature_id, location')
      .eq('user_id', userId);

    if (sightingsError) throw sightingsError;

    // Get unique creatures sighted
    const uniqueCreatures = [...new Set(sightings?.map(s => s.creature_id) || [])];
    const sightingsCount = uniqueCreatures.length;

    // Get unique locations
    const uniqueLocations = [...new Set(sightings?.map(s => s.location) || [])];
    const locationsCount = uniqueLocations.length;

    // Get user's current achievements
    const { data: currentAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (achievementsError) throw achievementsError;

    const unlockedAchievements = new Set(currentAchievements?.map(a => a.achievement_id));

    // Get all achievements
    const { data: allAchievements, error: allAchievementsError } = await supabase
      .from('achievements')
      .select('*');

    if (allAchievementsError) throw allAchievementsError;

    // Check for new achievements
    const achievementsToUnlock = [];

    for (const achievement of allAchievements) {
      if (unlockedAchievements.has(achievement.id)) continue;

      // Check beginner achievements
      if (achievement.code === 'first_catch' && sightingsCount >= 1) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'getting_feet_wet' && sightingsCount >= 5) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'underwater_explorer' && sightingsCount >= 10) {
        achievementsToUnlock.push(achievement.id);
      }

      // Check collection achievements
      else if (achievement.code === 'marine_enthusiast' && sightingsCount >= 25) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'ocean_archivist' && sightingsCount >= 50) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'sea_vault_master' && sightingsCount >= 100) {
        achievementsToUnlock.push(achievement.id);
      }

      // Check location achievements
      else if (achievement.code === 'local_diver' && locationsCount >= 1) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'world_traveler' && locationsCount >= 2) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'deep_sea_voyager' && locationsCount >= 3) {
        achievementsToUnlock.push(achievement.id);
      }

      // Check creature-specific achievements
      else if (achievement.code === 'shark_whisperer' && 
        sightings?.some(s => s.creature_id === 'b7c83fd5-3729-4620-92e5-a3a6452300f5')) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'manta_mania' && 
        sightings?.some(s => s.creature_id === 'dbc8a507-15ae-4227-93ef-054847f0e636')) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'dolphin_friend' && 
        sightings?.some(s => s.creature_id === '802ed0c6-3d09-41ba-afa5-f5012a93203d')) {
        achievementsToUnlock.push(achievement.id);
      }
      else if (achievement.code === 'whale_watcher' && 
        sightings?.some(s => s.creature_id === '101e1c40-1b91-4968-bd23-e1e2160e6b3d')) {
        achievementsToUnlock.push(achievement.id);
      }
    }

    // Unlock new achievements
    if (achievementsToUnlock.length > 0) {
      const achievementsToInsert = achievementsToUnlock.map(achievementId => ({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert(achievementsToInsert);

      if (insertError) throw insertError;
    }

    return achievementsToUnlock.length;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return 0;
  }
}
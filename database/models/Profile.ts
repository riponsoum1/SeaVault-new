import { Model } from '@nozbe/watermelondb';
import {
  field,
  relation,
  date,
  readonly,
} from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Profile extends Model {
  static table = 'profiles';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
  };

  @field('user_id') userId!: string;
  @field('full_name') fullName?: string;
  @field('avatar_url') avatarUrl?: string;
  @field('membership_tier') membershipTier?: string;
  @field('last_synced_at') lastSyncedAt!: number;

  @relation('users', 'user_id') user!: any;

  // Helper methods
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

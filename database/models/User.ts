import { Model } from '@nozbe/watermelondb';
import {
  field,
  relation,
  children,
  date,
  readonly,
} from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class User extends Model {
  static table = 'users';

  static associations: Associations = {
    profiles: { type: 'has_many', foreignKey: 'user_id' },
    dives: { type: 'has_many', foreignKey: 'user_id' },
    trips: { type: 'has_many', foreignKey: 'user_id' },
  };

  @field('supabase_id') supabaseId!: string;
  @field('email') email!: string;
  @field('last_synced_at') lastSyncedAt!: number;

  @children('profiles') profiles: any;
  @children('dives') dives: any;
  @children('trips') trips: any;

  // Helper methods
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

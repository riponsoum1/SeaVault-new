import { Model } from '@nozbe/watermelondb';
import {
  field,
  relation,
  date,
  readonly,
} from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Dive extends Model {
  static table = 'dives';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    trips: { type: 'belongs_to', key: 'trip_id' },
  };

  @field('dive_date') diveDate!: number;
  @field('location') location!: string;
  @field('depth') depth!: number;
  @field('duration') duration!: number;
  @field('notes') notes?: string;
  @field('user_id') userId!: string;
  @field('trip_id') tripId?: string;
  @field('is_synced') isSynced!: boolean;

  @relation('users', 'user_id') user!: any;
  @relation('trips', 'trip_id') trip?: any;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

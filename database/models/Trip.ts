import { Model } from '@nozbe/watermelondb';
import {
  field,
  relation,
  children,
  date,
  readonly,
} from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Trip extends Model {
  static table = 'trips';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    dives: { type: 'has_many', foreignKey: 'trip_id' },
  };

  @field('name') name!: string;
  @field('start_date') startDate!: number;
  @field('end_date') endDate!: number;
  @field('location') location!: string;
  @field('notes') notes?: string;
  @field('user_id') userId!: string;
  @field('is_synced') isSynced!: boolean;

  @relation('users', 'user_id') user!: any;
  @children('dives') dives: any;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

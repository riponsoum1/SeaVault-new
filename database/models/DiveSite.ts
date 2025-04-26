import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class DiveSite extends Model {
  static table = 'dive_sites';

  @field('name') name!: string;
  @field('location') location!: string;
  @field('country') country?: string;
  @field('region') region?: string;
  @field('description') description?: string;
  @field('depth') depth?: number;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('type') type?: string; // 'reef', 'wall', 'wreck', etc.
  @field('is_synced') isSynced!: boolean;

  @readonly @date('created_at') createdAt?: Date;
  @readonly @date('updated_at') updatedAt?: Date;
}

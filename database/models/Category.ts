import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Category extends Model {
  static table = 'categories';

  @field('name') name!: string;
  @field('description') description?: string;
  @field('image_url') imageUrl?: string;
  @field('emoji') emoji?: string;
  @field('is_synced') isSynced?: boolean;

  @readonly @date('created_at') createdAt?: Date;
  @readonly @date('updated_at') updatedAt?: Date;
}

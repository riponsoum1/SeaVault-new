import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Creature extends Model {
  static table = 'creatures';

  @field('name') name!: string;
  @field('scientific_name') scientificName?: string;
  @field('description') description?: string;
  @field('image_url') imageUrl?: string;
  @field('rarity') rarity?: string;
  @field('is_favorite') isFavorite?: boolean;

  @readonly @date('updated_at') updatedAt?: Date;
  @readonly @date('created_at') createdAt?: Date;
}

import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';
import { relation } from '@nozbe/watermelondb/decorators';
import { Creature } from './Creature';
import { Dive } from './Dive';

export class Sighting extends Model {
  static table = 'sightings';

  @field('user_id') userId!: string;
  @field('creature_id') creatureId!: string;
  @field('dive_id') diveId?: string;
  @field('sighted_at') sightedAt!: number;
  @field('location') location?: string;
  @field('notes') notes?: string;
  @field('is_synced') isSynced!: boolean;

  @relation('creatures', 'creature_id') creature!: Relation<Creature>;
  @relation('dives', 'dive_id') dive?: Relation<Dive>;

  @readonly @date('created_at') createdAt?: Date;
  @readonly @date('updated_at') updatedAt?: Date;
}

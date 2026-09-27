// src/modules/web-search/entities/search-cache.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('search_results_cache')
export class SearchResultsCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cache_key', type: 'varchar', length: 64, unique: true })
  cacheKey!: string;

  @Column({ type: 'text' })
  query!: string;

  @Column({ type: 'jsonb' })
  results!: Array<{ title: string; url: string; snippet: string }>;

  @Column({ name: 'hit_count', type: 'integer', default: 0 })
  hitCount!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

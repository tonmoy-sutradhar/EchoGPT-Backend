// src/modules/web-search/entities/search-suggestion.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('search_suggestions')
export class SearchSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  suggestion!: string;

  @Column({ name: 'normalized_text', type: 'text', unique: true })
  normalizedText!: string;

  @Column({ name: 'popularity_score', type: 'integer', default: 1 })
  popularityScore!: number;

  @Column({ name: 'last_searched_at', type: 'timestamptz' })
  lastSearchedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

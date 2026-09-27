// src/modules/web-search/entities/web-search.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AiProvider } from '../../ai-providers/entities/ai-provider.entity';

@Entity('web_searches')
export class WebSearch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text' })
  query!: string;

  @Column({ name: 'normalized_query', type: 'text' })
  normalizedQuery!: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId?: string | null;

  @ManyToOne(() => AiProvider, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider?: AiProvider;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'result_count', type: 'integer', default: 0 })
  resultCount!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  results!: Array<{ title: string; url: string; snippet: string }>;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

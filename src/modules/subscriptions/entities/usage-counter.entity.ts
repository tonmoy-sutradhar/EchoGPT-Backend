// src/modules/subscriptions/entities/usage-counter.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('usage_counters')
export class UsageCounter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'subscription_id' })
  subscriptionId!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'chat_requests_used', type: 'integer', default: 0 })
  chatRequestsUsed!: number;

  @Column({ name: 'search_requests_used', type: 'integer', default: 0 })
  searchRequestsUsed!: number;

  @Column({ name: 'tokens_used', type: 'bigint', default: 0 })
  tokensUsed!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

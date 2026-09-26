// src/modules/subscriptions/entities/plan.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanTier } from '../../../common/enums/plan-tier.enum';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: PlanTier })
  tier!: PlanTier;

  @Column({ name: 'billing_interval', type: 'varchar' })
  billingInterval!: 'monthly' | 'yearly' | 'lifetime';

  @Column({ name: 'price_cents', type: 'integer', default: 0 })
  priceCents!: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'chat_request_limit', type: 'integer' })
  chatRequestLimit!: number;

  @Column({ name: 'search_request_limit', type: 'integer' })
  searchRequestLimit!: number;

  @Column({ name: 'max_tokens_per_request', type: 'integer', default: 4096 })
  maxTokensPerRequest!: number;

  @Column({
    name: 'stripe_price_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePriceId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  features!: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

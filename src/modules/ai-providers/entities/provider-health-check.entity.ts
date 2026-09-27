// src/modules/ai-providers/entities/provider-health-check.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiProvider } from './ai-provider.entity';
import { HealthStatus } from '../../../common/enums/health-status.enum';

@Entity('provider_health_checks')
export class ProviderHealthCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => AiProvider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: AiProvider;

  @Column({ type: 'enum', enum: HealthStatus })
  status!: HealthStatus;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs?: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ name: 'checked_at', type: 'timestamptz' })
  checkedAt!: Date;
}

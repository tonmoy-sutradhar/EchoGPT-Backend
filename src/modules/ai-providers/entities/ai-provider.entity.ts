// src/modules/ai-providers/entities/ai-provider.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AiProviderName } from '../../../common/enums/ai-provider-name.enum';
import { HealthStatus } from '../../../common/enums/health-status.enum';
// import { ProviderModel } from './provider-model.entity';
import { ProviderModel } from './provider-model.entity';

@Entity('ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AiProviderName })
  name!: AiProviderName;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ name: 'api_base_url', type: 'text' })
  apiBaseUrl!: string;

  @Column({ name: 'api_key_encrypted', type: 'text' })
  apiKeyEncrypted!: string;

  @Column({ name: 'api_key_last4', type: 'char', length: 4, nullable: true })
  apiKeyLast4?: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config!: Record<string, unknown>;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({
    name: 'health_status',
    type: 'enum',
    enum: HealthStatus,
    default: HealthStatus.UNKNOWN,
  })
  healthStatus!: HealthStatus;

  @Column({ name: 'last_health_check_at', type: 'timestamptz', nullable: true })
  lastHealthCheckAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => ProviderModel, (model) => model.provider)
  models?: ProviderModel[];
}
